# 🐙 GitHub Setup — publish, About, topics

The project isn't a git repo yet. This is the exact, copy-paste path to publish it and set the
**About** blurb + **topics** (tags) the way judges expect.

> `.gitignore` already excludes `.env`, `node_modules/`, and `data/*.txt`, so **no secrets or the
> Atlas password get pushed.** Verify with `git status` before the first push.

## 1. Initialize + first commit
```bash
cd regquery-starter
git init -b main
git add .
git commit -m "RegQuery — EU regulatory intelligence agent (Gemini 3 + Agent Builder + MongoDB Atlas)"
```

## 2. Create the GitHub repo and push (gh CLI — you're logged in as manojmallick)
```bash
# public (recommended for a hackathon submission):
gh repo create regquery --public --source=. --remote=origin --push \
  --description "EU regulatory Q&A agent — grounded citations, point-in-time retrieval, calibrated abstention, human-approved writes. Gemini 3 + Agent Builder + MongoDB Atlas Vector Search."
```

## 3. Set the About: description, website, topics (tags)
```bash
# website = the live Cloud Run URL
gh repo edit manojmallick/regquery \
  --homepage "https://regquery-908307939543.europe-west1.run.app" \
  --add-topic gemini --add-topic google-cloud --add-topic agent-builder \
  --add-topic mongodb --add-topic mongodb-atlas --add-topic vector-search \
  --add-topic rag --add-topic ai-agent --add-topic compliance --add-topic regtech \
  --add-topic dora --add-topic nis2 --add-topic gdpr --add-topic eu-ai-act \
  --add-topic cloud-run --add-topic hackathon
```

## Copy-paste values

**About / description** (≤350 chars):
> EU regulatory Q&A agent (DORA · NIS2 · GDPR · EU AI Act) — grounded answers with exact article
> citations, point-in-time retrieval, calibrated abstention, and human-approved, auditable
> write-backs. Gemini 3 + Google Cloud Agent Builder + MongoDB Atlas Vector Search.

**Website:** `https://regquery-908307939543.europe-west1.run.app`

**Topics (tags):**
`gemini` · `google-cloud` · `agent-builder` · `mongodb` · `mongodb-atlas` · `vector-search` ·
`rag` · `ai-agent` · `compliance` · `regtech` · `dora` · `nis2` · `gdpr` · `eu-ai-act` ·
`cloud-run` · `hackathon`

## 4. (Optional) Pretty repo social preview
Settings → General → Social preview → upload `architecture.png` (or `screenshots/04-point-in-time.png`).

---

### Pre-push safety checklist
- [ ] `git status` shows **no** `.env`, no `data/*.txt`, no `node_modules/`.
- [ ] `LICENSE` present (MIT). ✅
- [ ] README renders (badges, architecture image, gallery). ✅
- [ ] Rotate the Atlas password + Gemini key after the hackathon if the repo is public and they were
      ever pasted anywhere outside Secret Manager / `.env`.
