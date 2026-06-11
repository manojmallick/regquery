// MongoDB Atlas Vector Search — the partner integration.
//
// NOTE on the hackathon requirement: the *judged* agent runs in Google Cloud
// Agent Builder and reaches MongoDB through the MongoDB MCP server (see
// agent-builder/agent.json). This module is the same capability exposed to the
// hosted web app / local dev via the official driver, so you can run and demo
// end-to-end. Keep both in sync (same DB, collection, and vector index).
//
// v2 adds three things from APP_IMPROVEMENT_PLAN.md:
//   • point-in-time retrieval  — vectorSearch({ asOf })  filters to provisions
//     that were in force on a given date (effective_date <= asOf < superseded_date).
//   • shared Obligation model  — recordObligations / listObligations (the spine
//     the other five agents reuse).
//   • shared audit ledger      — recordAudit (who/what/why/when for every
//     consequential, approval-gated write).
//
// MOCK=true keeps the whole module working in-memory with NO Atlas credentials,
// so the full UI + ApprovalBar + obligations flow can be rehearsed for the demo.

import { MongoClient } from "mongodb";

const {
  ATLAS_CONNECTION_STRING,
  ATLAS_DB = "regquery",
  ATLAS_COLLECTION = "regulations",
  ATLAS_VECTOR_INDEX = "regulatory_vector_index",
} = process.env;

const MOCK = process.env.MOCK === "true";

// --- MOCK in-memory stores (only used when MOCK=true) ---
const mem = { obligations: [], audit: [], sessions: [] };

// Robust lazy connect for serverless (Cloud Run): never cache a *failed* client —
// otherwise one cold-start failure poisons the instance with "Topology is closed"
// on every later request. Reset on failure so the next call retries cleanly.
let client, connecting;
async function db() {
  if (!ATLAS_CONNECTION_STRING) throw new Error("ATLAS_CONNECTION_STRING not set");
  if (client) return client.db(ATLAS_DB);
  if (!connecting) {
    const c = new MongoClient(ATLAS_CONNECTION_STRING, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    connecting = c
      .connect()
      .then(() => { client = c; return c; })
      .catch((e) => { client = null; throw e; })
      .finally(() => { connecting = null; });
  }
  await connecting;
  return client.db(ATLAS_DB);
}
async function collection() {
  return (await db()).collection(ATLAS_COLLECTION);
}

/**
 * Semantic retrieval over the regulatory corpus, optionally point-in-time.
 * @param {number[]} queryVector  768-dim embedding of the user's question
 * @param {object}   opts         { limit, regulation, asOf }
 *   asOf — ISO date string ("2026-03-12"). When set, only provisions in force on
 *          that date are returned (effective_date <= asOf < superseded_date).
 * @returns {Promise<Array>} top chunks:
 *   { regulation, article_number, article_title, text, score, effective_date, version, status }
 */
export async function vectorSearch(queryVector, { limit = 5, regulation, asOf } = {}) {
  const col = await collection();
  // When filtering by date we over-fetch candidates, then $match the time window,
  // then trim to `limit` — robust even if the vector index has no filter fields.
  const wantDate = Boolean(asOf);
  const pipeline = [
    {
      $vectorSearch: {
        index: ATLAS_VECTOR_INDEX,
        path: "text_embedding",
        queryVector,
        numCandidates: wantDate ? 300 : 100,
        limit: wantDate ? Math.max(limit * 6, 30) : limit,
        ...(regulation ? { filter: { regulation } } : {}),
      },
    },
    {
      $project: {
        _id: 0,
        regulation: 1,
        article_number: 1,
        article_title: 1,
        text: 1,
        effective_date: 1,
        superseded_date: 1,
        version: 1,
        status: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];

  if (wantDate) {
    const d = new Date(asOf);
    pipeline.push({
      $match: {
        $and: [
          // in force on/before asOf (missing effective_date = assume always in force)
          { $or: [{ effective_date: { $lte: d } }, { effective_date: { $exists: false } }, { effective_date: null }] },
          // not yet superseded as of asOf
          { $or: [{ superseded_date: { $gt: d } }, { superseded_date: { $exists: false } }, { superseded_date: null }] },
        ],
      },
    });
    pipeline.push({ $limit: limit });
  }

  return col.aggregate(pipeline).toArray();
}

/**
 * Persist extracted obligations to the shared Obligation ledger.
 * This is the cross-app spine: { obligation_id, regulation, article, who, what,
 * deadline, authority, trigger, source_question, confidence }.
 */
export async function recordObligations(companyId, obligations = []) {
  const now = new Date();
  const docs = obligations.map((o) => ({
    company_id: companyId,
    obligation_id:
      o.obligation_id ||
      `${o.regulation || "?"}-${o.article || "?"}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    regulation: o.regulation || null,
    article: o.article || null,
    who: o.who || null,
    what: o.what || null,
    deadline: o.deadline || null,
    authority: o.authority || null,
    trigger: o.trigger || null,
    source_question: o.source_question || null,
    confidence: o.confidence ?? null,
    status: "open",
    created_at: now,
  }));
  if (!docs.length) return { inserted: 0 };
  if (MOCK) { mem.obligations.push(...docs); return { inserted: docs.length }; }
  await (await db()).collection("obligations").insertMany(docs);
  return { inserted: docs.length };
}

/** Read the tracked obligations for a company (the exportable checklist). */
export async function listObligations(companyId) {
  if (MOCK) return mem.obligations.filter((o) => o.company_id === companyId);
  return (await db())
    .collection("obligations")
    .find({ company_id: companyId })
    .sort({ created_at: -1 })
    .toArray();
}

/** Append an immutable audit entry for every consequential, approved write. */
export async function recordAudit(entry) {
  const doc = { ...entry, at: new Date() };
  if (MOCK) { mem.audit.push(doc); return doc; }
  await (await db()).collection("audit_log").insertOne(doc);
  return doc;
}

/** Persist a Q&A turn — basis for the longitudinal compliance profile (beat 4). */
export async function recordSession(companyId, doc) {
  const entry = { company_id: companyId, ...doc, created_at: new Date() };
  if (MOCK) { mem.sessions.push(entry); return; }
  await (await db()).collection("sessions").insertOne(entry);
}

export async function pingMongo() {
  if (MOCK) return true;
  try {
    await (await collection()).estimatedDocumentCount();
    return true;
  } catch {
    return false;
  }
}
