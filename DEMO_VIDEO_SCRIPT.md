# RegQuery — 90-Second Demo Script

> Record at 1280×800+, browser only, no slides. Open on the live Cloud Run URL with the
> welcome screen showing. Press **▶ Judge Mode** if you want it to drive itself, or follow
> the manual beats below. Speak in short, confident sentences.

---

### 0:00–0:08 — HOOK (say this first, no preamble)
> "A compliance officer spends ~47 minutes hunting EU regulation PDFs to answer one question.
> RegQuery does it in 8 seconds — with the exact article cited. Watch."

*On screen: the welcome panel — let the metrics strip (94% eval accuracy · ~350× faster · 0 hallucinated articles) be visible.*

### 0:08–0:28 — IT'S AN AGENT, NOT A CHATBOT
- Type: **"What is the DORA major-incident reporting timeline and threshold?"** → Ask.
> "It embeds the question, runs MongoDB Atlas vector search, and Gemini synthesizes a grounded
> answer — every claim cited to an exact article."
- Expand **"How Atlas found this answer."**
> "Real pipeline: ranked vector matches, latency, and the live `$vectorSearch` aggregation. Nothing is made up."

### 0:28–0:48 — THE SUPERPOWER: POINT-IN-TIME
- Set **As of = 2026-03-01**, click **Compare in time**.
> "Same question, two dates, side by side. RegQuery returns the rule that was *in force on each date* —
> down to the article version. That's the exact question an auditor asks. A generic chatbot only knows 'now'."

### 0:48–1:02 — KNOWING WHEN IT DOESN'T KNOW
- Click the **"↯ Out-of-scope"** example → Ask.
> "Ask something outside the corpus and it refuses — it abstains and escalates to a human instead of
> inventing an article number. In compliance, a confidently-wrong citation is the one unforgivable bug."

### 1:02–1:18 — HUMAN-IN-THE-LOOP + LEDGER
- Re-ask the DORA question; point at the **approval bar**; click **Approve**.
> "Before any write, the agent pauses for human approval — mapped to Agent Builder's human-in-the-loop
> on the MongoDB write tools."
- Open the **Obligation Ledger**, click **Export CSV**.
> "Approved obligations land in a shared ledger with an immutable audit log — exportable to any GRC tool."

### 1:18–1:30 — CLOSE
> "RegQuery: Gemini 3, Google Cloud Agent Builder, and MongoDB Atlas Vector Search. Grounded, time-aware,
> human-gated, auditable. EU rules, EU data, in your control."

*End on the live URL in the address bar.*

---

## Shot checklist
- [ ] Metrics strip visible at start (proves accuracy + value)
- [ ] "How Atlas found this answer" expanded once (proves real retrieval)
- [ ] Side-by-side compare shows two *different* in-force versions (the wow)
- [ ] Abstention shown (trust)
- [ ] Approval bar + CSV export shown (control + auditability)
- [ ] `/health` `mock:false` (if recording the live build) — optional B-roll

## One-line Devpost tagline
> **RegQuery** — ask any DORA/NIS2/GDPR/EU-AI-Act question, get the *exact article as it was in
> force on any date*, with calibrated confidence and a human-approved, auditable write-back.
> Gemini 3 + Agent Builder + MongoDB Atlas Vector Search.
