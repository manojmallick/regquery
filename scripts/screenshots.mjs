// Capture the Devpost/README gallery via Chrome DevTools Protocol.
// Usage: start the app (MOCK=true PORT=8096 npm start), launch headless Chrome with
//   --remote-debugging-port=9222, then: node scripts/screenshots.mjs
// Saves crisp 2x PNGs to ./screenshots.
import { writeFile, mkdir } from "node:fs/promises";

const APP = process.env.APP_URL || "http://localhost:8096";
const CDP = process.env.CDP_URL || "http://localhost:9222";
const W = 1440, H = 900, SCALE = 2;
await mkdir("screenshots", { recursive: true });

const t = await (await fetch(`${CDP}/json/new?${encodeURIComponent(APP)}`, { method: "PUT" })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const send = (m, p = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise((r) => pend.set(i, r)); };
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
await new Promise((r) => ws.addEventListener("open", r));
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: SCALE, mobile: false });

const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.result?.value; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function shot(name) {
  await wait(700);
  const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(`screenshots/${name}.png`, Buffer.from(r.result.data, "base64"));
  console.log("  ✓ screenshots/" + name + ".png");
}
async function nav() { await send("Page.navigate", { url: APP }); await wait(2600); }

console.log("Capturing gallery…");
// 1) Welcome + proof strip
await nav(); await shot("01-welcome");

// 2) Answer (citations + obligations + overlap)
await ev(`document.getElementById('q').value='What is the DORA major-incident reporting timeline and threshold?'; ask()`);
await wait(1800); await ev("window.scrollTo(0,0)"); await shot("02-answer");

// 3) Trace ("How Atlas found this answer") expanded
await ev(`document.querySelector('.trace')?.setAttribute('open','');`);
await ev(`document.querySelector('.trace')?.scrollIntoView({block:'center'})`); await shot("03-atlas-trace");

// 4) Point-in-time compare (the hero)
await ev(`document.getElementById('asof').value='2026-03-01'; compareTime()`);
await wait(1800); await ev("window.scrollTo(0,0)"); await shot("04-point-in-time");

// 5) Abstention
await ev(`document.getElementById('asof').value=''; document.getElementById('q').value='What is the maximum carbon tax for almond farming on Mars in 2031?'; ask()`);
await wait(1600); await ev("window.scrollTo(0,0)"); await shot("05-abstention");

// 6) Approval bar (human-in-the-loop)
await ev(`document.getElementById('q').value='What is the DORA major-incident reporting timeline and threshold?'; ask()`);
await wait(1700); await ev("window.scrollTo(0,document.body.scrollHeight)"); await shot("06-approval");

// 7) Obligation ledger
await ev(`approve && approve()`); await wait(800); await ev(`loadObligations()`); await wait(900);
await ev("window.scrollTo(0,0)"); await shot("07-ledger");

// 8) Judge Mode coach
await nav(); await ev(`JudgeMode.start()`); await wait(900); await shot("08-judge-mode");

ws.close();
console.log("Done.");
process.exit(0);
