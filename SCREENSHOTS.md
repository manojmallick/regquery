# 📸 Screenshot & Gallery Guide

Everything you need to populate the **Devpost gallery** and the README. Eight crisp 2× shots are
already captured in [`screenshots/`](screenshots/) — regenerate anytime with one command.

## The captured set (Devpost upload order)

Upload in **this order** — it tells the 4-beat story judges look for, hero first.

| # | File | Devpost caption (copy-paste) |
|---|---|---|
| 1 | `04-point-in-time.png` | **Point-in-time superpower** — same question, two dates, the rule as it was in force on each. |
| 2 | `02-answer.png` | **Grounded answer** — exact article citations, calibrated confidence, extracted obligations. |
| 3 | `03-atlas-trace.png` | **"How Atlas found this answer"** — live `$vectorSearch` pipeline, ranked matches, latency. |
| 4 | `05-abstention.png` | **Calibrated abstention** — refuses out-of-scope questions instead of hallucinating an article. |
| 5 | `06-approval.png` | **Human-in-the-loop** — no database write fires without an explicit Approve. |
| 6 | `07-ledger.png` | **Obligation ledger** — structured, trackable, CSV-exportable for any GRC tool. |
| 7 | `08-judge-mode.png` | **Judge Mode** — a built-in 90-second self-driving tour. |
| 8 | `01-welcome.png` | **Landing** — proof metrics (100% eval, ~350× faster) + example questions. |

> The first image becomes the Devpost thumbnail — keep `04-point-in-time.png` first; it's the most
> differentiated, screenshot-friendly moment.

## Regenerate the screenshots

```bash
# 1) start the app (MOCK = clean, deterministic demo data; or omit MOCK for live)
MOCK=true PORT=8096 npm start &

# 2) launch headless Chrome with the debugging port
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --remote-debugging-port=9222 \
  --user-data-dir=/tmp/cdp-ss --force-device-scale-factor=2 &

# 3) capture → writes 2× PNGs to ./screenshots
node scripts/screenshots.mjs
```

- **Mock vs live:** the captured set uses `MOCK=true` for clean, repeatable data (badge reads
  "Demo data"). Once Atlas Network Access is fixed and the site is fully live, re-run **without**
  `MOCK` to capture the "Live · Atlas + Vertex" badge for extra authenticity.
- **Resolution:** shots are 1440×900 @2× (2880×1800) — crisp on Devpost and Retina READMEs.
- **Edit a beat:** tweak the `steps` in [`scripts/screenshots.mjs`](scripts/screenshots.mjs).

## Manual capture (if you prefer)
Open the live URL, press **▶ Judge Mode**, and screenshot each step (`Cmd+Shift+4` on macOS, or a
full-page tool). Judge Mode walks the exact 7 beats above in order.

## Recommended Devpost media
- **Cover image:** `architecture.png` or `04-point-in-time.png`.
- **Video:** record the 90-second flow in [`DEMO_VIDEO_SCRIPT.md`](DEMO_VIDEO_SCRIPT.md) (hook → live
  compare → abstention → approval → CSV). First 5 seconds decide whether judges keep watching.
