// Ingest EU regulation text into MongoDB Atlas with embeddings.
//
// Usage:
//   1. Put plain-text regulations in ./data/<REGULATION>.txt  (e.g. data/DORA.txt)
//      Split articles with a line starting "ARTICLE <n> — <title>".
//      OPTIONAL point-in-time metadata — add tag lines anywhere in an article block:
//        @effective 2025-01-17     (date this version came into force)
//        @superseded 2026-07-01    (date a newer version replaced it; omit if current)
//        @version 1                (monotonic version number)
//      Provisions with no @effective are treated as "always in force".
//   2. Create the Atlas Vector Search index named by ATLAS_VECTOR_INDEX on
//      field "text_embedding" (768 dims, cosine). To make point-in-time filtering
//      fast, also add filter fields effective_date + superseded_date to the index.
//   3. node scripts/ingest.js
//
// This is intentionally simple (article-boundary chunking) — good enough for a
// grounded demo over DORA / NIS2 / GDPR / EU AI Act, now with version history so
// "what was the rule on <date>?" works.

import { readFile, readdir } from "node:fs/promises";
import { MongoClient } from "mongodb";
import { embedClient as ai, EMBED } from "../src/ai.js";

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s.trim());
  return isNaN(d.getTime()) ? null : d;
}

function chunkByArticle(text, regulation) {
  // Split on lines like: ARTICLE 23 — Reporting of major ICT-related incidents
  const parts = text.split(/\n(?=ARTICLE\s+\d+)/i);
  return parts
    .map((block) => {
      const m = block.match(/ARTICLE\s+(\d+)\s*[—-]\s*(.*)/i);
      const eff = block.match(/@effective\s+(\S+)/i);
      const sup = block.match(/@superseded\s+(\S+)/i);
      const ver = block.match(/@version\s+(\d+)/i);
      const effective_date = parseDate(eff?.[1]);
      const superseded_date = parseDate(sup?.[1]);
      // strip the @tags out of the indexed text so they don't pollute embeddings
      const clean = block.replace(/^@(effective|superseded|version)\b.*$/gim, "").trim();
      return {
        regulation,
        article_number: m ? `Art.${m[1]}` : "preamble",
        article_title: m ? m[2].trim() : "",
        text: clean,
        version: ver ? Number(ver[1]) : 1,
        effective_date,
        superseded_date,
        status: superseded_date ? "superseded" : "active",
      };
    })
    .filter((c) => c.text.length > 40);
}

async function embed(text) {
  // Retry transient Vertex 404/429/503 (on-demand capacity) so ingest doesn't abort mid-corpus.
  let lastErr;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await ai.models.embedContent({ model: EMBED, contents: text });
      return r.embeddings[0].values;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 600 * 2 ** i));
    }
  }
  throw lastErr;
}

async function main() {
  const client = new MongoClient(process.env.ATLAS_CONNECTION_STRING);
  await client.connect();
  const col = client.db(process.env.ATLAS_DB || "regquery").collection(process.env.ATLAS_COLLECTION || "regulations");

  const files = (await readdir("./data")).filter((f) => f.endsWith(".txt"));
  let total = 0;
  for (const file of files) {
    const regulation = file.replace(/\.txt$/, "");
    const raw = await readFile(`./data/${file}`, "utf8");
    const chunks = chunkByArticle(raw, regulation);
    for (const c of chunks) {
      c.text_embedding = await embed(`${c.regulation} ${c.article_number} ${c.article_title}\n${c.text}`);
      // Key by (regulation, article, version) so multiple versions of an article coexist.
      await col.updateOne(
        { regulation: c.regulation, article_number: c.article_number, version: c.version },
        { $set: c },
        { upsert: true }
      );
      total++;
    }
    console.log(`Indexed ${chunks.length} chunks from ${regulation}`);
  }
  console.log(`Done. ${total} article chunks indexed.`);
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
