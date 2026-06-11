# RegQuery — Devpost Submission (copy-paste)

**Project name:** RegQuery — EU Regulatory Intelligence Agent
**Tagline:** Ask any DORA/NIS2/GDPR/EU-AI-Act question → grounded answer, exact citations, point-in-time accuracy, human-approved write-back.

---

## ▸ What Google Cloud products did you use in this project?

```
- Google Cloud Run — hosts the agent + UI as a public container (europe-west1).
- Google Cloud Agent Builder — the judged agent: Gemini 3 + MongoDB MCP server as its tool source, with human approval required on insert/update.
- Gemini (gemini-3.5-flash, via Google AI Studio / Gemini API) — reasoning, grounded synthesis, structured obligation + confidence extraction.
- Vertex AI (text-embedding-004) — 768-dim embeddings for the question and the regulation corpus.
- Secret Manager — stores the Atlas connection string and Gemini API key, mounted into Cloud Run at runtime.
- Cloud Build — builds the container image on deploy.
- Artifact Registry — stores the built images.
```

## ▸ Please list all other tools or products you used in your project.

```
- MongoDB Atlas Vector Search — $vectorSearch (768-dim, cosine) over the regulation corpus, with point-in-time filter fields (effective_date / superseded_date). (Partner bucket.)
- MongoDB MCP server — the Model Context Protocol tool source for the Agent Builder agent (aggregate/find/insert_one/update_one, with approval on writes).
- MongoDB Node.js driver — the same capability for the hosted Express app.
- Node.js 20 + Express — API and static UI server.
- @google/genai (Google Gen AI SDK) — Gemini + embedding clients.
- Tailwind CSS (vendored) — UI styling with zero third-party runtime dependency.
- Vanilla JS single-page UI — Judge Mode guided tour, point-in-time compare, obligation ledger.
- Chrome DevTools Protocol — automated UI testing and screenshot capture.
```

## ▸ Built with

```
node.js, express, javascript, gemini, gemini-3.5-flash, google-cloud-agent-builder,
vertex-ai, text-embedding-004, google-cloud-run, secret-manager, cloud-build,
mongodb, mongodb-atlas, mongodb-atlas-vector-search, mongodb-mcp,
model-context-protocol, tailwindcss, html, css, rag
```

## ▸ "Try it out" links

```
Live demo:  https://regquery-908307939543.europe-west1.run.app
Source:     https://github.com/manojmallick/regquery
```

---

## ▸ About the project  (paste into the Markdown story box)

## Inspiration
A compliance officer answering one question — *"what's the DORA major-incident reporting deadline?"* — opens a 300-page regulation PDF, ctrl-Fs for the article, cross-checks NIS2 and GDPR, and hopes the rule hasn't changed since the incident. It takes ~47 minutes. A generic chatbot can't help: it confidently **invents article numbers** (fatal in compliance) and only knows **today's** rules — not what was in force when the incident actually happened. We wanted an agent that a compliance team would actually trust enough to deploy.

## What it does
RegQuery is a **multi-step agent** (not a chatbot) over EU financial regulation — **DORA, NIS2, GDPR, and the EU AI Act**. Ask a question and it:
- **Embeds** the question and runs **MongoDB Atlas Vector Search** to retrieve the actual article text.
- **Synthesizes** a grounded answer with **Gemini 3.5**, citing **exact articles** and a **calibrated confidence** score.
- **Point-in-time:** pass an "as of" date and it returns the rule **as it was in force on that date** — the exact question an auditor asks.
- **Calibrated abstention:** if retrieval confidence is too low, it **refuses and escalates to a human** instead of hallucinating an article number.
- **Cross-regulation overlap:** when regulations overlap (e.g. DORA vs NIS2 reporting deadlines), it surfaces the tension and how to reconcile it.
- **Human-in-the-loop:** the agent never writes to the database without an explicit **Approve** click. Approved answers extract structured **obligations** (*who · what · deadline · authority · trigger*) into a shared ledger + an immutable **audit log**, exportable as CSV for any GRC tool.
- **Judge Mode:** a built-in 90-second self-driving tour that walks through every beat.

## How we built it
- **Agent loop** (`src/agent.js`): embed → retrieve → abstention gate → synthesize → propose. Steps 1–4 are read-only and run automatically; step 5 (the write) is consequential and waits for human approval.
- **Reasoning:** `gemini-3.5-flash` via the Gemini API (Google AI Studio).
- **Retrieval:** MongoDB Atlas `$vectorSearch`, 768-dim cosine, with `effective_date`/`superseded_date` filter fields for point-in-time. Each article can be ingested in multiple versions.
- **Embeddings:** Vertex AI `text-embedding-004` (768-dim) — used for both ingestion and queries so the vector space matches.
- **Judged agent:** a Google Cloud **Agent Builder** definition (`agent-builder/agent.json`) wiring Gemini 3 to the **MongoDB MCP server**, with human approval required on `insert`/`update`.
- **Hosting:** Cloud Run + Secret Manager; one-shot deploy via `scripts/golive.sh` (secrets → ingest → ensure vector index → live eval → deploy).
- **Quality:** a golden-set eval harness scoring article recall, keyword presence, abstention, and point-in-time.

## Challenges we ran into
- **Gemini 3 lives on the Gemini API, not Vertex** for our project — our first integration 404'd on Vertex. We made the model client auto-detect: AI Studio (Gemini 3.x) when an API key is present, Vertex otherwise.
- **The embedding model split:** `text-embedding-004` isn't served by the Gemini API, and re-embedding with a different model would silently break vector search (mismatched vector space). We ended up running **two clients on purpose** — embeddings on Vertex, synthesis on the Gemini API.
- **Abstention threshold tuning:** `text-embedding-004` has a high cosine-similarity floor, so out-of-scope questions scored ~0.66. We empirically separated in-scope (0.87–0.91) from out-of-scope (0.62–0.67) and set the threshold to **0.75**.
- **Confidence scale drift:** the model sometimes emitted confidence on a 0–5 scale; we normalize it to 0–1 and hardened the prompt.
- **Serverless MongoDB connections:** a cold-start connection failure was poisoning the instance with "Topology is closed"; we made the client reset-and-retry. We also hit an Atlas IP-allowlist TLS rejection from Cloud Run (fixed via Network Access).

## Accomplishments that we're proud of
- A **multi-step agent** that genuinely uses all three required pieces — Gemini 3, Agent Builder, and MongoDB Atlas Vector Search.
- **Point-in-time retrieval** — a real domain innovation a generic chatbot can't replicate.
- **Calibrated abstention** — the agent knows when it doesn't know.
- **100% on our live grounded-answer eval** (6/6 golden cases, including correct abstention).
- A polished, **judge-runnable** experience: live on Cloud Run with a built-in **Judge Mode** tour.

## What we learned
- In a compliance tool, **knowing when not to answer** is as important as the answer — calibrated abstention is the #1 trust signal.
- **Embedding-space consistency** matters more than model choice: the query and corpus must share the same embedding model, or retrieval silently fails.
- **Human-in-the-loop** isn't a checkbox — making "keep the human in control" a literal UI (the approval bar) is what turns a demo into something deployable.

## What's next for RegQuery
- Replace the seed corpus with the **official EUR-Lex text** (every article number verified), and expand coverage.
- Lock down Atlas with a **VPC connector + private endpoint** instead of an open allowlist.
- Reuse the same shape — agent loop + approval gate + obligation ledger — across the **other five partner buckets**, swapping only the MCP server and accent color.
