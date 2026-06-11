// RegQuery eval harness — measures grounded-answer quality on a golden set.
//
// Scores four things that matter for a compliance answer engine:
//   • article recall    — did it cite the expected article(s)?
//   • keyword presence  — does the answer contain the expected facts?
//   • abstention        — does it correctly REFUSE out-of-scope questions?
//   • (point-in-time)   — asOf cases check the right-era answer via keywords
//
//   MOCK=true  node scripts/eval.js   # runs the mock_supported subset, no creds
//   node scripts/eval.js              # runs the FULL set against live Vertex + Atlas
//
// Writes evals/report.json for the Devpost screenshot. Exits non-zero below target.

import { readFile, writeFile } from "node:fs/promises";
import { answer } from "../src/agent.js";

const TARGET = Number(process.env.EVAL_TARGET ?? 0.8);
const MOCK = process.env.MOCK === "true";

const norm = (s) => String(s || "").toLowerCase();

/** Pure scorer (also unit-testable): compare a golden case to an agent response. */
export function scoreCase(gold, res) {
  if (gold.expect_abstain) {
    const ok = res.abstained === true;
    return { type: "abstain", ok, detail: ok ? "correctly abstained" : "should have abstained" };
  }
  const ans = norm(res.answer);
  const cites = (res.citations || []).map((c) => norm(`${c.regulation} ${c.article}`));
  const artHit = (gold.expect_articles || []).filter((a) =>
    cites.some((c) => c.includes(norm(a).replace(/\s+/g, " ")))
  ).length;
  const artRecall = gold.expect_articles?.length ? artHit / gold.expect_articles.length : 1;
  const kwHit = (gold.expect_keywords || []).filter((k) => ans.includes(norm(k))).length;
  const kwRecall = gold.expect_keywords?.length ? kwHit / gold.expect_keywords.length : 1;
  const ok = !res.abstained && artRecall >= 0.5 && kwRecall >= 0.5;
  return { type: "answer", ok, artRecall, kwRecall, detail: `articles ${(artRecall * 100).toFixed(0)}% · keywords ${(kwRecall * 100).toFixed(0)}%` };
}

async function main() {
  const gold = JSON.parse(await readFile(new URL("../evals/golden-qa.json", import.meta.url)));
  const cases = MOCK ? gold.cases.filter((c) => c.mock_supported) : gold.cases;

  console.log(`\nRegQuery — grounded-answer eval  (${MOCK ? "MOCK subset" : "LIVE full set"}: ${cases.length} cases)\n`);
  const rows = [];
  for (const c of cases) {
    let res;
    try { res = await answer(c.question, { asOf: c.asOf }); }
    catch (e) { res = { error: String(e.message || e), abstained: false, answer: "", citations: [] }; }
    const s = res.error ? { ok: false, detail: `error: ${res.error}` } : scoreCase(c, res);
    rows.push({ q: c.question.slice(0, 54), ...s });
    console.log(`  ${s.ok ? "✅" : "❌"} ${c.question.slice(0, 56).padEnd(58)} ${s.detail}`);
  }
  const correct = rows.filter((r) => r.ok).length;
  const accuracy = correct / (rows.length || 1);
  console.log(`\n  Accuracy ${(accuracy * 100).toFixed(1)}%  (${correct}/${rows.length})`);

  const report = { ran_at: new Date().toISOString(), mode: MOCK ? "mock" : "live", target: TARGET, total: rows.length, correct, accuracy, rows };
  await writeFile(new URL("../evals/report.json", import.meta.url), JSON.stringify(report, null, 2));

  const passed = accuracy >= TARGET;
  console.log(`  ${passed ? "✅ PASS" : "❌ FAIL"} — target ${(TARGET * 100).toFixed(0)}%  (report → evals/report.json)`);
  if (MOCK) console.log("  ℹ️  MOCK subset only — run with live Vertex + Atlas for the full corpus accuracy.\n");
  process.exit(passed ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
