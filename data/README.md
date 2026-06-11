# Seed corpus — RegQuery

⚠️ **SEED / DEMO CORPUS — not legal advice and not authoritative.**

These four files are a *small, hand-written seed* so live MongoDB Atlas Vector Search returns
real results for the demo. Every article was drawn from well-established public summaries of the
named regulations, but **you must verify every article number and figure against the official
EUR-Lex text before any real use** — a wrong article number is the one unforgivable bug in a
compliance tool.

- Lines tagged `[VERIFY: …]` flag claims to confirm against the official text.
- Lines tagged `[ILLUSTRATIVE FIGURE …]` are placeholder numbers used only to demonstrate the
  point-in-time retrieval feature (DORA Art.19 has two versions). Replace with official RTS values.

## Format
- Article boundaries: a line starting `ARTICLE <n> — <Title>`.
- Point-in-time metadata (optional), one per line inside an article block:
  - `@effective YYYY-MM-DD` — date this version came into force
  - `@superseded YYYY-MM-DD` — date a newer version replaced it (omit if current)
  - `@version <n>` — monotonic version number

## Point-in-time demo
`DORA Art.19` is seeded twice: v1 (`@effective 2025-01-17`, `@superseded 2026-07-01`) and v2
(`@effective 2026-07-01`). Ask the major-incident question with `asOf=2026-03-01` vs blank to get
two correctly-different threshold answers.

> Note: `data/*.txt` is gitignored by default. Replacing these with official text is encouraged.
