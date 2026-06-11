# RegQuery — Pitch Deck

> EU Regulatory Intelligence Agent · Google Cloud Rapid Agent Hackathon (MongoDB bucket)
> Live: https://regquery-908307939543.europe-west1.run.app · PDF: [DECK.pdf](DECK.pdf)

---

## 1 — Title

# ◆ RegQuery
### EU Regulatory Intelligence Agent
Ask any **DORA · NIS2 · GDPR · EU AI Act** question → grounded answer, **exact citations**, point-in-time accuracy, human-approved write-back.

**Gemini 3 · Google Cloud Agent Builder · MongoDB Atlas Vector Search**

---

## 2 — Problem

**Answering one compliance question today = ~47 minutes.**

- Open a 300-page regulation PDF, ctrl-F, cross-check NIS2/GDPR.
- A generic chatbot **hallucinates article numbers** — fatal in compliance.
- It only knows **today's** rules, not what applied when the incident happened.

---

## 3 — Solution

**A multi-step agent, not a chatbot. ~8 seconds.**

1. **Embed** the question (Vertex `text-embedding-004`)
2. **Retrieve** real article text — MongoDB Atlas `$vectorSearch`
3. **Gate** — abstain if unsure (no hallucinated law)
4. **Synthesize** — Gemini 3.5 → cited answer + confidence + obligations
5. **Propose** a write-back → **human approves** → audited

---

## 4 — The superpower: point-in-time

**Same question, two dates — the rule as it was in force on each.**

> "What was the DORA major-incident threshold on 2026-03-01?" → returns the *historical* version
> (v1, 10%, eff 2025-01-17), not today's (v2, 8%, eff 2026-07-01).

This is the exact question an auditor asks. **No generic chatbot can do this.**

---

## 5 — Differentiators

- **Point-in-time retrieval** — version-aware corpus, "as of" any date.
- **Calibrated abstention** — refuses + escalates below a confidence threshold.
- **Cross-regulation overlap** — reconciles DORA ↔ NIS2 conflicts.
- **Obligation ledger + audit log** — structured, exportable (CSV), immutable trail.
- **Human-in-the-loop** — no write without an Approve click.
- **Judge Mode** — a 90-second self-driving demo.

---

## 6 — Tech & architecture

**Gemini 3.5-flash** (AI Studio) · **Agent Builder + MongoDB MCP** · **Atlas Vector Search** (768-dim) ·
**Vertex** embeddings · **Cloud Run** + Secret Manager.

Read-only steps run automatically; consequential writes are gated on human approval.
See `ARCHITECTURE.md`.

---

## 7 — Proof

- ✅ **Live on Cloud Run** — real Atlas + real Gemini 3.5.
- ✅ **Grounded eval 100% (6/6)** on the golden set, incl. correct abstention.
- ✅ **Judge Mode** maps each beat to the judging criteria.

---

## 8 — Close

# RegQuery
**Grounded. Time-aware. Human-gated. Auditable.**

EU rules · EU data · in your control.

*Gemini 3 + Agent Builder + MongoDB Atlas Vector Search.*
