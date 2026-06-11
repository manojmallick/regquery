// Shared Gemini client. Two supported paths, auto-selected:
//   • AI Studio (Gemini Developer API) — when GEMINI_API_KEY is set. This is the
//     path that has Gemini 3.x access on this project (generativelanguage API).
//   • Vertex AI — fallback when no key (uses GOOGLE_CLOUD_PROJECT/LOCATION + ADC).
// Keeping both lets the same code run locally, on Cloud Run, and in CI.

import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
export const USING_AISTUDIO = Boolean(API_KEY);

// Gemini synthesis client. When a key is present, force the AI Studio path
// (vertexai:false) so a stray GOOGLE_GENAI_USE_VERTEXAI=true can't route us back to
// Vertex (where Gemini 3 isn't available for this project).
export const ai = USING_AISTUDIO
  ? new GoogleGenAI({ apiKey: API_KEY, vertexai: false })
  : new GoogleGenAI({ vertexai: true });

// Embedding client — ALWAYS Vertex text-embedding-004 (768-dim), so the query vector
// space matches the ingested corpus regardless of the synthesis path. AI Studio does
// not serve text-embedding-004; switching embedding models would silently break
// $vectorSearch (query vectors wouldn't match the indexed ones).
export const embedClient = new GoogleGenAI({ vertexai: true });

// Model ids are env-driven so we can flip to the latest Gemini without a code change.
// Default to the confirmed-working flash; override with GEMINI_MODEL (e.g. the latest
// Gemini 3.x id, set after verifying it against ListModels).
export const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
export const EMBED = process.env.EMBEDDING_MODEL || "text-embedding-004";
