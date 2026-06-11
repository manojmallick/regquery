# RegQuery — Architecture

EU regulatory Q&A agent. Built for the **Google Cloud Rapid Agent Hackathon** (MongoDB bucket).
Required stack: **Gemini 3 · Google Cloud Agent Builder · MongoDB Atlas Vector Search (MCP)**.

![Architecture](architecture.png)

---

## 1. The two faces of RegQuery

RegQuery exists as **two synchronized surfaces** over the *same* capability (Atlas vector search +
Gemini synthesis), so it is both judge-runnable and demoable:

| Surface | What it is | Where |
|---|---|---|
| **Judged agent** | A Google Cloud **Agent Builder** agent: Gemini 3 + the **MongoDB MCP server** as its tool source, with **human approval** required on `insert`/`update`. | [`agent-builder/agent.json`](agent-builder/agent.json) |
| **Hosted demo** | An Express app that mirrors the same loop with a UI (Judge Mode, point-in-time compare, obligation ledger), reaching Atlas via the official driver. | [`src/`](src/) · Cloud Run |

> The Express health field reports **driver** connectivity, not an MCP handshake — the MCP server is
> the tool source for the *judged* Agent Builder agent, not the Express process.

---

## 2. Request flow (the agent loop)

```
Browser (public/index.html)
   │  POST /api/ask  { question, regulation?, asOf? }
   ▼
Express  src/server.js
   ▼
Agent    src/agent.js ──────────────────────────────────────────────┐
   1. EMBED      question  → Vertex AI text-embedding-004 (768-dim)  │ read-only,
   2. RETRIEVE   MongoDB Atlas $vectorSearch (src/mongo.js)          │ runs
                 └─ optional POINT-IN-TIME filter (effective/superseded)│ automatically
   3. GATE       calibrated ABSTENTION (top score < ABSTAIN_THRESHOLD)│
   4. SYNTHESIZE Gemini 3.5-flash → grounded answer + citations +    │
                 confidence + obligations + cross-reg overlaps       │
   5. PROPOSE    a consequential write — NOT executed ───────────────┘
   ▼
ApprovalBar (human clicks Approve)
   │  POST /api/execute  { approved:true, payload }
   ▼
MongoDB Atlas  ── insert sessions · insert obligations · append audit_log
```

Steps 1–4 are read-only and run automatically; step 5 is consequential and only fires after a human
approves (the "keep you in control" requirement).

---

## 3. Components

| Layer | Tech | File |
|---|---|---|
| UI | Vanilla JS + Tailwind (vendored, no CDN) | [`public/index.html`](public/index.html) |
| HTTP API | Express | [`src/server.js`](src/server.js) |
| Agent loop | `@google/genai` | [`src/agent.js`](src/agent.js) |
| Model clients | Gemini (AI Studio) + embeddings (Vertex) | [`src/ai.js`](src/ai.js) |
| Vector search + ledger | MongoDB driver | [`src/mongo.js`](src/mongo.js) |
| Ingestion | article-boundary chunking + embeddings | [`scripts/ingest.js`](scripts/ingest.js) |
| Eval harness | golden-set grounded-answer scoring | [`scripts/eval.js`](scripts/eval.js) |
| Judged agent | Agent Builder + MongoDB MCP | [`agent-builder/agent.json`](agent-builder/agent.json) |

### Model routing (important)
`src/ai.js` uses **two clients on purpose**:
- **Synthesis → AI Studio** (`gemini-3.5-flash`) via API key. Gemini 3 is served by the Gemini
  Developer API, not Vertex, for this project.
- **Embeddings → Vertex** (`text-embedding-004`, 768-dim) via ADC. The corpus is embedded with this
  model; query vectors must share the same space or `$vectorSearch` silently returns nothing.

---

## 4. Data model (MongoDB Atlas, db `regquery`)

| Collection | Purpose | Key fields |
|---|---|---|
| `regulations` | the indexed corpus | `regulation, article_number, article_title, text, text_embedding[768], version, effective_date, superseded_date, status` |
| `sessions` | persisted Q&A turns | `company_id, question, answer, citations, as_of` |
| `obligations` | the cross-app ledger | `company_id, regulation, article, who, what, deadline, authority, trigger, status, confidence` |
| `audit_log` | immutable trail | `actor, action, company_id, question, at` |

**Vector index** `regulatory_vector_index` on `regulations`:
```json
{ "fields": [
  { "type": "vector", "path": "text_embedding", "numDimensions": 768, "similarity": "cosine" },
  { "type": "filter", "path": "regulation" },
  { "type": "filter", "path": "effective_date" },
  { "type": "filter", "path": "superseded_date" }
]}
```

### Point-in-time retrieval
Each article can be ingested in multiple **versions** with `@effective` / `@superseded` tags. With
`asOf`, the pipeline over-fetches candidates then `$match`es the time window
(`effective_date ≤ asOf < superseded_date`) before trimming to top-k — returning the rule that was
in force on that date.

---

## 5. Trust & safety controls

| Control | Mechanism |
|---|---|
| **No hallucinated law** | Answers only from retrieved excerpts; cite exact articles or say "not found". |
| **Calibrated abstention** | Top similarity `< ABSTAIN_THRESHOLD (0.75)` → refuse + escalate to a human. |
| **Human-in-the-loop** | Every consequential write is gated on an explicit Approve click. |
| **Auditability** | Every approved write appends an immutable `audit_log` entry. |
| **Resilience** | Retry-with-backoff on transient Vertex/Gemini 4xx/5xx; serverless-safe Mongo reconnect. |

---

## 6. Deployment

- **Hosting:** Google **Cloud Run** (`europe-west1`), container from [`Dockerfile`](Dockerfile).
- **Secrets:** `ATLAS_CONNECTION_STRING` + `GEMINI_API_KEY` in **Secret Manager**, mounted at runtime.
- **One-shot go-live:** [`scripts/golive.sh`](scripts/golive.sh) — secrets → ingest → ensure index →
  live eval → deploy with `MOCK` off.
- **Config:** see [`.env.example`](.env.example). Set `MOCK=true` to run the full UI on canned data
  with no credentials.

---

## 7. Reuse across the 6 partner buckets
RegQuery is the reference shape. To spin up another bucket: swap the MCP server in `agent.json`,
replace `src/mongo.js` with the partner's read/write capability, change the accent color, and keep
the agent loop + approval gate + obligation ledger identical.
