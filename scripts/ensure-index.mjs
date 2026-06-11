// Ensure the Atlas Vector Search index exists and is queryable. Idempotent.
// Creates `regulatory_vector_index` on the regulations collection (768-dim cosine,
// with point-in-time filter fields), then polls until Atlas reports it queryable.
import { MongoClient } from "mongodb";
import { readFile } from "node:fs/promises";

const env = Object.fromEntries(
  (await readFile(new URL("../.env", import.meta.url), "utf8"))
    .split("\n").filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const URI = process.env.ATLAS_CONNECTION_STRING || env.ATLAS_CONNECTION_STRING;
const DB = process.env.ATLAS_DB || env.ATLAS_DB || "regquery";
const COL = process.env.ATLAS_COLLECTION || env.ATLAS_COLLECTION || "regulations";
const NAME = process.env.ATLAS_VECTOR_INDEX || env.ATLAS_VECTOR_INDEX || "regulatory_vector_index";

const definition = {
  fields: [
    { type: "vector", path: "text_embedding", numDimensions: 768, similarity: "cosine" },
    { type: "filter", path: "regulation" },
    { type: "filter", path: "effective_date" },
    { type: "filter", path: "superseded_date" },
  ],
};

const c = new MongoClient(URI, { serverSelectionTimeoutMS: 10000 });
await c.connect();
const col = c.db(DB).collection(COL);

// Make sure the collection exists (createSearchIndex needs it).
await c.db(DB).createCollection(COL).catch(() => {});

const existing = await col.listSearchIndexes().toArray();
if (!existing.find((i) => i.name === NAME)) {
  console.log(`▸ Creating vector index "${NAME}"…`);
  await col.createSearchIndex({ name: NAME, type: "vectorSearch", definition });
} else {
  console.log(`▸ Index "${NAME}" already exists.`);
}

process.stdout.write("▸ Waiting for index to become queryable");
const deadline = Date.now() + 5 * 60 * 1000;
let ready = false;
while (Date.now() < deadline) {
  const idx = (await col.listSearchIndexes().toArray()).find((i) => i.name === NAME);
  if (idx?.queryable) { ready = true; break; }
  process.stdout.write(".");
  await new Promise((r) => setTimeout(r, 5000));
}
console.log(ready ? "\n✓ Index is queryable." : "\n⚠️ Index not queryable within 5 min — it may still be building.");
await c.close();
process.exit(ready ? 0 : 1);
