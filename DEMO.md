# RegQuery — Demo Video Script (≤ 3:00)

Target: **under 3 minutes**, public on YouTube/Vimeo. Screen recording + voiceover.
Record against the **live, non-mock** Cloud Run URL so judges see real Gemini + Atlas calls
(`/health` must show `"mock":false`). Mock mode is for rehearsal only.

**Golden question (in-corpus, reliable):**
> "What is the DORA major-incident reporting timeline and threshold?"

---

## Shot list & narration

### 0:00–0:20 — Hook (the problem)
**Screen:** Title card → the RegQuery UI loaded.
> "A compliance officer asking 'what's the DORA incident-reporting deadline?' spends ~45 minutes
> grepping PDFs — and a wrong article number is a reportable error. RegQuery answers in ~8 seconds,
> with exact article citations, a confidence score, and a human-approved write-back."

### 0:20–0:55 — Beat 1: grounded, cited answer (the core)
**Screen:** Type the golden question, hit Ask. Show the answer streaming in with citations + confidence.
> "It embeds the question with Vertex AI, runs MongoDB Atlas Vector Search over the regulation corpus,
> and Gemini synthesizes an answer **only** from the retrieved articles — here, DORA Article 19:
> 4-hour early warning, 72-hour intermediate, one-month final. Every claim is cited. Confidence: 0.94."
**Point at:** the `RegSearcher → RegSynthesizer` step trace and the citation chips.

### 0:55–1:30 — Beat 2: the superpower (point-in-time) ⭐
**Screen:** Set **As-of date = 2026-03-01**, re-ask the same question. Put the two answers side by side.
> "Now the auditor's real question: *what rule applied when the incident happened?* I set the as-of date
> to March 2026 — and the threshold changes. Atlas filters to the provision **in force on that date**:
> 10% of clients for 2 hours, not today's 8% for 1.5. Same question, correctly different, correctly cited.
> A generic chatbot can't do this."

### 1:30–1:55 — Beat 3: calibrated abstention (trust)
**Screen:** Ask something out-of-corpus, e.g. *"What's the carbon tax rate for almond farming?"*
> "And when it doesn't know, it doesn't guess. Retrieval similarity falls below threshold, so RegQuery
> **abstains and escalates to a human** instead of hallucinating an article number. Knowing when it
> doesn't know is the #1 trust signal for a compliance tool."

### 1:55–2:30 — Beat 4: human-gated write + audit trail
**Screen:** On the good answer, click the **ApprovalBar → Approve**. Show the obligation ledger update,
then open `/api/obligations/demo-co.csv`.
> "Consequential writes are gated. I approve, and only then does it persist the structured obligations —
> who must act, what, by when, which authority — to the shared ledger, with an immutable audit-log entry.
> Export to CSV and hand it straight to a GRC tool."

### 2:30–2:55 — Required stack proof
**Screen:** Show `/health` JSON, then the Agent Builder console with the imported agent + MongoDB MCP
tools connected and the approval pause.
> "Under the hood: Gemini on Vertex AI, the judged agent in Google Cloud Agent Builder reaching MongoDB
> Atlas through the MongoDB MCP server, human approval required on every write. Hosted on Cloud Run."

### 2:55–3:00 — Close
**Screen:** Title card + URL.
> "RegQuery — grounded EU regulatory answers your auditors can trust. Thanks for watching."

---

## Pre-record checklist
- [ ] Live URL `/health` shows `"mock":false`, `"partner_connected":true`, `"model":"gemini-2.5-flash"`.
- [ ] Golden question returns a real cited answer (not the canned mock text).
- [ ] As-of toggle visibly changes the threshold.
- [ ] Out-of-corpus question visibly abstains.
- [ ] Agent Builder shows the MongoDB MCP tools connected + the approval pause (this is the required-tech money shot).
- [ ] Total runtime **under 3:00**. Upload public. Paste the URL into Devpost.

> Honesty guardrail: do **not** claim the live Express UI *is* Agent Builder. Show the Express UI for the
> product story, and show the actual Agent Builder console for the required-stack proof. They are two
> surfaces over the same capability — say so.
