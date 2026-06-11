#!/usr/bin/env bash
# RegQuery — one-shot go-live. Wires real MongoDB Atlas + real Gemini, ingests the
# corpus, runs a live eval, and redeploys Cloud Run with MOCK off.
#
# Reads secrets from .env (or the environment). Two Gemini paths, auto-detected:
#   • GEMINI_API_KEY set   → AI Studio (Gemini 3.x); auto-picks the latest model.
#   • no key               → Vertex AI (gemini-2.5-flash, via ADC). Works today.
#
# Usage:  bash scripts/golive.sh        (after filling ATLAS_CONNECTION_STRING in .env)
set -euo pipefail
cd "$(dirname "$0")/.."

# Load .env if present (without clobbering already-exported vars)
if [ -f .env ]; then set -a; . ./.env; set +a; fi

PROJECT="$(gcloud config get-value project 2>/dev/null)"
REGION="europe-west1"; SERVICE="regquery"

: "${ATLAS_CONNECTION_STRING:?Set ATLAS_CONNECTION_STRING in .env}"
case "$ATLAS_CONNECTION_STRING" in
  *"<db_password>"*|*"USER:PASS"*|*"<password>"*)
    echo "✗ ATLAS_CONNECTION_STRING still has a placeholder password — paste the real one into .env"; exit 1;;
esac

echo "▸ Project: $PROJECT   Region: $REGION"

# ── Gemini path selection ───────────────────────────────────────────────────────────
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
if [ -n "$GEMINI_API_KEY" ]; then
  USE_AISTUDIO=1
  MODEL="${GEMINI_MODEL:-}"
  if [ -z "$MODEL" ]; then
    echo "▸ AI Studio key detected — querying ListModels for the latest Gemini…"
    MODEL="$(curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}&pageSize=200" \
      | python3 -c "
import sys,json,re
d=json.load(sys.stdin); gen=[m['name'].split('/')[-1] for m in d.get('models',[]) if 'generateContent' in m.get('supportedGenerationMethods',[])]
def ver(n):
    m=re.search(r'gemini-(\d+(?:\.\d+)?)',n); return float(m.group(1)) if m else 0
flash=[n for n in gen if 'flash' in n and not any(x in n for x in ('lite','image','audio','tts','thinking','exp','preview'))]
print((sorted(flash or gen,key=ver) or [''])[-1])
")"
  fi
  echo "▸ Using AI Studio model: ${MODEL:-(unset!)}"
  echo "▸ Smoke-testing a real Gemini call…"
  curl -s "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}" \
    -H 'content-type: application/json' -d '{"contents":[{"parts":[{"text":"Reply with the single word LIVE"}]}]}' \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print('  →',d['candidates'][0]['content']['parts'][0]['text'].strip()[:20])"
else
  USE_AISTUDIO=0
  MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"
  echo "▸ No API key — using Vertex AI model: $MODEL (us-central1, via ADC)"
fi

# ── Secret Manager ──────────────────────────────────────────────────────────────────
upsert_secret(){ if gcloud secrets describe "$1" >/dev/null 2>&1; then printf '%s' "$2" | gcloud secrets versions add "$1" --data-file=- >/dev/null; else printf '%s' "$2" | gcloud secrets create "$1" --replication-policy=automatic --data-file=- >/dev/null; fi; echo "  ✓ secret $1"; }
echo "▸ Storing secrets in Secret Manager…"
upsert_secret regquery-atlas "$ATLAS_CONNECTION_STRING"
[ "$USE_AISTUDIO" = 1 ] && upsert_secret regquery-gemini-key "$GEMINI_API_KEY"
SA="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
for S in regquery-atlas $([ "$USE_AISTUDIO" = 1 ] && echo regquery-gemini-key); do
  gcloud secrets add-iam-policy-binding "$S" --member="serviceAccount:${SA}" --role=roles/secretmanager.secretAccessor >/dev/null 2>&1 || true
done
# Embeddings always run on Vertex (text-embedding-004) — the Cloud Run SA needs Vertex access.
echo "  ✓ granting Vertex access to ${SA}"
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:${SA}" --role=roles/aiplatform.user >/dev/null 2>&1 || true

# ── Ingest corpus → Atlas (real 768-dim vectors) ────────────────────────────────────
echo "▸ Ingesting corpus → Atlas…"; npm run ingest

# ── Ensure the vector index exists and is queryable ─────────────────────────────────
node scripts/ensure-index.mjs

# ── Live eval (writes evals/report.json for the proof strip) ────────────────────────
echo "▸ Running live eval…"; npm run eval || echo "  (eval below target — see evals/report.json)"

# ── Deploy Cloud Run, MOCK off ──────────────────────────────────────────────────────
echo "▸ Deploying live to Cloud Run…"
COMMON_ENV="GEMINI_MODEL=${MODEL},GOOGLE_CLOUD_PROJECT=${PROJECT},ATLAS_DB=regquery,ATLAS_COLLECTION=regulations,ATLAS_VECTOR_INDEX=regulatory_vector_index,ABSTAIN_THRESHOLD=${ABSTAIN_THRESHOLD:-0.75}"
if [ "$USE_AISTUDIO" = 1 ]; then
  # Synthesis via AI Studio key; embeddings still via Vertex → keep the location.
  ENV_VARS="${COMMON_ENV},GOOGLE_CLOUD_LOCATION=us-central1"
  SECRETS="ATLAS_CONNECTION_STRING=regquery-atlas:latest,GEMINI_API_KEY=regquery-gemini-key:latest"
else
  ENV_VARS="${COMMON_ENV},GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_LOCATION=us-central1"
  SECRETS="ATLAS_CONNECTION_STRING=regquery-atlas:latest"
fi
gcloud run deploy "$SERVICE" --source . --region="$REGION" --allow-unauthenticated --memory=512Mi --quiet \
  --set-env-vars="$ENV_VARS" --update-secrets="$SECRETS" --remove-env-vars=MOCK 2>/dev/null || \
gcloud run deploy "$SERVICE" --source . --region="$REGION" --allow-unauthenticated --memory=512Mi --quiet \
  --set-env-vars="$ENV_VARS" --update-secrets="$SECRETS"

URL="$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')"
echo "▸ Verifying…"
curl -s "$URL/health" | python3 -c "import sys,json;d=json.load(sys.stdin);print('  health:',d['status'],'| mock=',d['mock'],'| model=',d['model'],'| db=',d['partner_connected'])"
echo "✅ LIVE: $URL"
