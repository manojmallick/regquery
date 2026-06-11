# RegQuery — Devpost Submission Pack

Everything to paste into the Devpost form. Fill the `‹...›` blanks before submitting.

---

## Project name
**RegQuery — EU Regulatory Q&A Agent**

## Tagline (≤ 1 line)
Ask any DORA / NIS2 / GDPR / EU AI Act question → get a cited, confidence-scored answer
**as the rule stood on any date**, with an approval-gated write-back to your compliance ledger.

## Partner track
**MongoDB** (Atlas Vector Search via the MongoDB MCP server).

---

## Inspiration
A compliance officer asking "what's the DORA major-incident reporting deadline?" spends ~45 minutes
grepping regulation PDFs — and in this domain a *wrong article number* is itself a reportable error.
Generic chatbots make it worse: they hallucinate plausible-looking article numbers with total
confidence, and they only know the *current* text of a rule — useless when an auditor asks "what
applied when the incident actually happened?" We built RegQuery to answer regulatory questions the
way a careful analyst does: grounded in the exact source text, cited, time-aware, and honest about
what it doesn't know.

## What it does
- **Grounded, cited answers.** Embeds the question (Vertex AI), retrieves the top regulation
  article chunks from MongoDB Atlas Vector Search, and Gemini synthesizes an answer **only** from
  those chunks — every claim cited to an exact article (e.g. "DORA Art.19 ¶1").
- **Point-in-time retrieval (the superpower).** Pass an `asOf` date and Atlas returns the provision
  that was *in force on that date* (`effective_date ≤ asOf < superseded_date`) — the exact question
  an auditor asks. Same question, March 2026 vs today, returns two correctly different thresholds.
- **Calibrated abstention.** If the best retrieval similarity is below threshold, RegQuery refuses
  and escalates to a human instead of inventing an article number. Knowing when it doesn't know is
  the #1 trust signal for a compliance tool.
- **Human-gated write-back + audit trail.** It extracts structured obligations
  (who · what · deadline · authority · trigger) and proposes a write — but persists nothing until a
  human approves. Every approved write lands in a shared obligation ledger plus an immutable audit
  log, exportable to CSV for a GRC tool.

## How we built it
- **Gemini (Vertex AI)** — multi-hop synthesis, citation discipline, structured obligation
  extraction (strict JSON), and confidence + reasoning.
- **Google Cloud Agent Builder** — the judged agent (`agent-builder/agent.json`): Gemini model +
  MongoDB MCP as the tool source, with `insert_one`/`update_one` gated behind human approval.
- **MongoDB Atlas Vector Search via the MongoDB MCP server** — semantic retrieval over the
  regulation corpus, the obligation ledger, and the audit log.
- **Cloud Run** — hosts the Express demo UI that mirrors the agent end-to-end.
- **Vertex AI `text-embedding-004`** — 768-dim embeddings for retrieval.

## Challenges we ran into
- **Article-number accuracy is non-negotiable.** A single wrong citation discredits the whole tool,
  so we constrained Gemini to answer strictly from retrieved excerpts and built the abstention gate.
- **Point-in-time correctness.** Modeling `effective_date`/`superseded_date` versioning and a
  retrieval pipeline that over-fetches, filters by the time window, then trims — robust even when the
  vector index has no filter fields.
- **Consequential-action safety.** Wiring a hard human-approval gate so no write to a compliance
  profile ever happens autonomously.

## What we learned
- For high-stakes domains, **abstention and citation discipline beat raw fluency** — trust is the
  product.
- **Time-awareness** ("as of" retrieval) is what separates a regulatory assistant from a chatbot.
- A clean **propose → approve → execute → audit** loop is reusable across every partner bucket.

## What's next
Expand the corpus to full DORA RTS/ITS, add cross-regulation contradiction detection, and reuse the
obligation/audit spine across the other partner agents.

---

## Required links (fill before submitting)
- **Hosted URL (must show `/health` → `"mock":false`):** https://regquery-908307939543.europe-west1.run.app
- **Public GitHub repo (MIT license in About):** ‹add after `git init` + push›
- **Demo video (public, ≤ 3 min):** ‹YouTube/Vimeo URL — script in DEMO.md›
- **Team members:** ‹list everyone›
- **New or existing:** New (created during the contest window, ≥ May 5 2026)

---

## Deploy command — go live (non-mock), pre-filled from project memory
> Drops `MOCK`, points Vertex at `us-central1`, runs `gemini-2.5-flash`. Replace the secret name
> if yours differs. Run from the repo root.

```bash
# One-time: store the Atlas connection string as a secret (skip if it already exists)
gcloud secrets create regquery-atlas --replication-policy=automatic 2>/dev/null
printf '%s' 'YOUR_ATLAS_SRV_CONNECTION_STRING' | gcloud secrets versions add regquery-atlas --data-file=-

gcloud config set project gen-lang-client-0466757449

gcloud run deploy regquery \
  --source . \
  --region=europe-west1 \
  --allow-unauthenticated \
  --set-secrets="ATLAS_CONNECTION_STRING=regquery-atlas:latest" \
  --set-env-vars="GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=gen-lang-client-0466757449,GOOGLE_CLOUD_LOCATION=us-central1,GEMINI_MODEL=gemini-2.5-flash,EMBEDDING_MODEL=text-embedding-004,ATLAS_DB=regquery,ATLAS_COLLECTION=regulations,ATLAS_VECTOR_INDEX=regulatory_vector_index,NODE_ENV=production"
  # NOTE: no MOCK var → real Gemini + Atlas at runtime.

# Verify after deploy:
curl -s https://regquery-908307939543.europe-west1.run.app/health
#   expect: "mock":false , "partner_connected":true , "model":"gemini-2.5-flash"
```

> ⚠️ Before recording: confirm the Atlas Vector Search index `regulatory_vector_index` exists and the
> corpus is ingested (`npm run ingest`), or the live `/api/ask` will abstain on everything.
