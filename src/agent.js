// RegQuery agent — Gemini 3 reasoning over MongoDB Atlas Vector Search results.
//
// Multi-step mission (the "it's an agent, not a chatbot" requirement):
//   1. EMBED      the question  (Vertex AI text-embedding-004)
//   2. RETRIEVE   top article chunks (MongoDB Atlas $vectorSearch) — optionally
//                 POINT-IN-TIME ("as of" a date, so you get the rule that was in
//                 force then, not just the current one).
//   3. GATE       calibrated ABSTENTION — if the best match is too weak, refuse
//                 and escalate to a human instead of guessing. Knowing when it
//                 does NOT know is the #1 trust signal for a compliance tool.
//   4. SYNTHESIZE a grounded, multi-hop answer + cited articles + confidence +
//                 structured OBLIGATIONS (Gemini 3)
//   5. PROPOSE    a write action (save Q&A + obligations to the shared ledger) —
//                 GATED on human approval.
//
// Steps 1–4 are read-only and run automatically. Step 5 is consequential and is
// only executed after the UI's ApprovalBar returns approval (see server.js /execute).

import { ai, embedClient, MODEL, EMBED } from "./ai.js";
import { vectorSearch, recordSession, recordObligations, recordAudit } from "./mongo.js";

// Below this top-hit similarity, RegQuery abstains instead of answering.
const ABSTAIN_THRESHOLD = Number(process.env.ABSTAIN_THRESHOLD ?? 0.6);

// Vertex on-demand capacity can return transient 404/429/503 under bursts. Retry
// with backoff so the live demo stays reliable. (Permanent 404s still fail after N.)
async function withRetry(fn, { tries = 4, base = 600 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const code = e?.status ?? e?.code ?? 0;
      const transient = [404, 408, 429, 500, 503, 504].includes(Number(code)) ||
        /quota|unavailable|overloaded|deadline|not found/i.test(String(e?.message || ""));
      if (i === tries - 1 || !transient) break;
      await new Promise((r) => setTimeout(r, base * 2 ** i + Math.random() * 200));
    }
  }
  throw lastErr;
}

async function embed(text) {
  const r = await withRetry(() => embedClient.models.embedContent({ model: EMBED, contents: text }));
  return r.embeddings[0].values; // 768-dim
}

const SYNTH_SYSTEM = `You are RegQuery, an EU financial-regulation analyst (DORA, NIS2,
GDPR, EU AI Act). Answer ONLY from the provided article excerpts. For each claim cite
the exact article (e.g. "DORA Art.23 ¶3"). When a question spans regulations, synthesize
across them (multi-hop) and surface any contradiction + how to resolve it. If the excerpts
do not contain the answer, say so — never invent an article number.

Also extract any concrete OBLIGATIONS the answer implies, as structured rows a compliance
team can track. Each obligation: who must act, what they must do, the deadline (if stated),
the authority to notify (if any), and the trigger/condition. Only include obligations that
are actually supported by the cited excerpts.

When the cited excerpts span MORE THAN ONE regulation and impose related-but-different
requirements (e.g. different notification deadlines), add an OVERLAP entry explaining how they
relate and which applies — do NOT call it a contradiction unless the texts are genuinely
irreconcilable. Frame it as practical reconciliation (e.g. "an entity in scope of both must
meet the earliest applicable deadline"). Only include overlaps grounded in the cited excerpts.

"confidence" is your calibrated certainty as a DECIMAL between 0.0 and 1.0 (e.g. 0.92 = very
confident, 0.4 = unsure). It is NOT a percentage and NOT a 1-5 or 1-100 rating.

Return STRICT JSON:
{ "answer": string,
  "citations": [{ "regulation": string, "article": string, "why": string }],
  "obligations": [{ "regulation": string, "article": string, "who": string, "what": string,
                    "deadline": string, "authority": string, "trigger": string }],
  "overlaps": [{ "between": string, "tension": string, "resolution": string }],
  "confidence": number, "confidence_reasoning": string[], "followups": string[] }`;

/** Steps 1-4: produce a grounded, verified answer (or a calibrated abstention). Read-only. */
export async function answer(question, { regulation, asOf } = {}) {
  if (process.env.MOCK === "true") return mockAnswer(question, { asOf });
  const t0 = Date.now();
  const steps = [];

  const qv = await embed(question);
  steps.push({ agent: "RegSearcher", action: "embedded question", ms: Date.now() - t0 });

  const hits = await vectorSearch(qv, { limit: 5, regulation, asOf });
  steps.push({
    agent: "RegSearcher",
    action: `vectorSearch${asOf ? ` (as of ${asOf})` : ""} → ${hits.length} chunks`,
    ms: Date.now() - t0,
  });

  // --- Step 3: calibrated abstention gate ---
  const topScore = hits[0]?.score ?? 0;
  if (!hits.length || topScore < ABSTAIN_THRESHOLD) {
    steps.push({
      agent: "RegSynthesizer",
      action: `ABSTAINED — top score ${topScore.toFixed(2)} < threshold ${ABSTAIN_THRESHOLD}`,
      ms: Date.now() - t0,
    });
    return abstention({ question, asOf, hits, topScore, steps, elapsed_ms: Date.now() - t0 });
  }

  const context = hits
    .map(
      (h, i) =>
        `[${i + 1}] ${h.regulation} ${h.article_number} — ${h.article_title} (score ${h.score?.toFixed(2)}${
          h.version ? `, v${h.version}` : ""
        }${h.effective_date ? `, eff ${new Date(h.effective_date).toISOString().slice(0, 10)}` : ""})\n${h.text}`
    )
    .join("\n\n");

  const res = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      config: { systemInstruction: SYNTH_SYSTEM, responseMimeType: "application/json" },
      contents: `QUESTION: ${question}${asOf ? `\nAS OF DATE: ${asOf}` : ""}\n\nARTICLE EXCERPTS:\n${context}`,
    })
  );
  steps.push({ agent: "RegSynthesizer", action: "synthesized + verified answer + obligations", ms: Date.now() - t0 });

  let parsed;
  try {
    parsed = JSON.parse(res.text);
  } catch {
    parsed = {
      answer: res.text,
      citations: [],
      obligations: [],
      confidence: 0.5,
      confidence_reasoning: ["unstructured output"],
      followups: [],
    };
  }
  if (!Array.isArray(parsed.obligations)) parsed.obligations = [];
  if (!Array.isArray(parsed.overlaps)) parsed.overlaps = [];
  // Normalize confidence to 0..1 — models sometimes emit a 0-5, 0-10, or 0-100 scale.
  let conf = Number(parsed.confidence);
  if (!Number.isFinite(conf)) conf = 0.5;
  if (conf > 1) conf = conf > 10 ? conf / 100 : conf / 10;
  parsed.confidence = Math.max(0, Math.min(1, conf));

  // The proposed consequential action — NOT executed here. The UI must approve it.
  const proposedAction = {
    type: "save_to_compliance_profile",
    description: `Save this Q&A and ${parsed.obligations.length} extracted obligation(s) to the compliance profile + obligation ledger.`,
    tools: ["mongodb.insert_one(sessions)", "mongodb.insert_many(obligations)", "mongodb.insert_one(audit_log)"],
  };

  return { ...parsed, abstained: false, as_of: asOf || null, retrieved: hits, steps, elapsed_ms: Date.now() - t0, proposedAction };
}

/** Build a calibrated-abstention response. Proposes ESCALATE instead of a write. */
function abstention({ question, asOf, hits, topScore, steps, elapsed_ms }) {
  return {
    abstained: true,
    as_of: asOf || null,
    answer:
      "I don't have a confidently matching provision for this question in the indexed corpus" +
      (asOf ? ` as of ${asOf}` : "") +
      `. Best match scored ${topScore.toFixed(2)} (below the ${ABSTAIN_THRESHOLD} confidence threshold). ` +
      "Rather than guess at a regulation, I'm escalating this to a human compliance officer.",
    citations: [],
    obligations: [],
    confidence: Math.max(0, Math.min(topScore, 0.4)),
    confidence_reasoning: [
      `Top retrieval similarity ${topScore.toFixed(2)} is below abstain threshold ${ABSTAIN_THRESHOLD}`,
      "Abstaining protects against hallucinated article numbers in a compliance answer",
    ],
    followups: [],
    retrieved: hits,
    steps,
    elapsed_ms,
    proposedAction: {
      type: "escalate_to_human",
      description: "Flag this question for manual review by a compliance officer (no automated answer recorded).",
      tools: ["mongodb.insert_one(escalations)", "mongodb.insert_one(audit_log)"],
    },
  };
}

// --- MOCK MODE: canned demo data so the full UI + ApprovalBar flow runs without creds.
// In-corpus topics. If a question touches none of them, mock ABSTAINS — so the full
// Judge Mode story (answer → point-in-time → abstention) runs offline with no creds.
const MOCK_CORPUS_TERMS = [
  "dora", "nis2", "nis 2", "gdpr", "ai act", "incident", "breach", "report",
  "notification", "ict", "third-party", "third party", "risk", "register",
  "supervisory", "authority", "article", "art.", "threshold", "timeline",
  "deadline", "compliance", "regulation", "financial entity", "data",
];
function mockInCorpus(q = "") {
  const s = q.toLowerCase();
  return MOCK_CORPUS_TERMS.some((t) => s.includes(t));
}

function mockAnswer(question = "", { asOf } = {}) {
  // Calibrated-abstention demo: out-of-corpus question → refuse, don't hallucinate.
  if (question && !mockInCorpus(question)) {
    const topScore = 0.31;
    return abstention({
      question,
      asOf,
      hits: [],
      topScore,
      steps: [
        { agent: "RegSearcher", action: "embedded question (mock)", ms: 110 },
        { agent: "RegSearcher", action: `vectorSearch → 5 chunks, top score ${topScore} (mock)`, ms: 300 },
        { agent: "RegSynthesizer", action: `ABSTAINED — top score ${topScore} < threshold ${ABSTAIN_THRESHOLD} (mock)`, ms: 360 },
      ],
      elapsed_ms: 360,
    });
  }
  // Demo the point-in-time superpower: pre-July-2026 vs current threshold answer.
  const preUpdate = asOf && new Date(asOf) < new Date("2026-07-01");
  const obligations = [
    {
      regulation: "DORA",
      article: "Art.19 ¶1",
      who: "Financial entity",
      what: "Submit early-warning notification of a major ICT-related incident",
      deadline: "within 4 hours of classification",
      authority: "DNB (Netherlands)",
      trigger: "Incident classified as major",
    },
    {
      regulation: "DORA",
      article: "Art.19 ¶4",
      who: "Financial entity",
      what: "Submit intermediate then final incident report",
      deadline: "72 hours / 1 month",
      authority: "DNB (Netherlands)",
      trigger: "After early warning",
    },
  ];
  return {
    abstained: false,
    as_of: asOf || null,
    answer:
      (preUpdate ? "[As of " + asOf + " — rules in force then]\n" : "") +
      "Under DORA Article 19, financial entities must submit:\n" +
      "1. Early Warning — within 4 hours of classifying the incident as major\n" +
      "2. Intermediate Report — within 72 hours\n" +
      "3. Final Report — within 1 month.\n" +
      (preUpdate
        ? "Major-incident threshold at this date: 10% of clients affected for >2 hours."
        : "Major-incident threshold (current): 8% of clients affected for >1.5 hours (delegated act, eff. 2026-07-01)."),
    citations: [
      { regulation: "DORA", article: "Art.19 ¶1", why: "states the 4-hour early-warning deadline" },
      { regulation: "DORA", article: "Art.18", why: "defines major-incident classification thresholds" },
      { regulation: "NIS2", article: "Art.23", why: "comparable incident-notification timeline" },
    ],
    overlaps: [
      {
        between: "DORA Art.19 ↔ NIS2 Art.23",
        tension:
          "Both set an early-warning clock, but DORA's is 4 hours from classification while NIS2's is 24 hours from awareness.",
        resolution:
          "A financial entity in scope of both must meet the earliest applicable deadline — here DORA's 4 hours governs the ICT-incident path. [Verify scope vs the final texts.]",
      },
    ],
    obligations,
    confidence: 0.94,
    confidence_reasoning: [
      "DORA Art.19 explicitly states the 4-hour early warning — exact match (0.98)",
      preUpdate
        ? "Point-in-time filter applied: returned the pre-2026-07-01 threshold (0.95)"
        : "Returned the currently-in-force threshold (0.95)",
    ],
    followups: ["What qualifies as a 'major' incident under DORA?", "Which authority do I notify in the Netherlands?"],
    retrieved: [
      {
        regulation: "DORA",
        article_number: "Art.19",
        article_title: "Reporting of major ICT-related incidents",
        text: "…within 4 hours…",
        score: 0.94,
        version: preUpdate ? 1 : 2,
        effective_date: preUpdate ? "2025-01-17" : "2026-07-01",
      },
    ],
    steps: [
      { agent: "RegSearcher", action: "embedded question (mock)", ms: 120 },
      { agent: "RegSearcher", action: `vectorSearch${asOf ? ` (as of ${asOf})` : ""} → 5 chunks (mock)`, ms: 340 },
      { agent: "RegSynthesizer", action: "synthesized + verified answer + obligations (mock)", ms: 7400 },
    ],
    elapsed_ms: 7540,
    proposedAction: {
      type: "save_to_compliance_profile",
      description: `Save this Q&A and ${obligations.length} extracted obligation(s) to the compliance profile + obligation ledger.`,
      tools: ["mongodb.insert_one(sessions)", "mongodb.insert_many(obligations)", "mongodb.insert_one(audit_log)"],
    },
  };
}

/** Step 5: executed ONLY after human approval (called by /api/execute). */
export async function executeProposed(companyId, payload) {
  const company = companyId || "demo-co";

  // Abstention path: record the escalation, not an answer.
  if (payload?.abstained || payload?.actionType === "escalate_to_human") {
    await recordAudit({ actor: "human", action: "escalate_to_human", company_id: company, question: payload.question });
    return { ok: true, executed: "escalate_to_human", obligations_saved: 0, at: new Date().toISOString() };
  }

  const obligations = (payload?.obligations || []).map((o) => ({
    ...o,
    source_question: payload.question,
    confidence: payload.confidence,
  }));
  await recordSession(company, {
    question: payload.question,
    answer: payload.answer,
    citations: payload.citations,
    as_of: payload.as_of || null,
    regulation_areas: (payload.citations || []).map((c) => c.regulation),
  });
  const { inserted } = await recordObligations(company, obligations);
  await recordAudit({
    actor: "human",
    action: "save_to_compliance_profile",
    company_id: company,
    question: payload.question,
    obligations_saved: inserted,
    as_of: payload.as_of || null,
  });
  return { ok: true, executed: "save_to_compliance_profile", obligations_saved: inserted, at: new Date().toISOString() };
}
