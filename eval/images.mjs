// 장면 그림 모델 비교: 이야기 몇 편 × 6장면 × 이미지 모델 → images.html
//   node eval/images.mjs --run img1 --models gpt-image-2.6-flare,gpt-image-2 --quality medium
// 이야기 출처: 서버 로그(server/data/events.jsonl)의 최근 라이브 꿈 + 스모크 런의 single·opus.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scenePrompt } from "../server/imagePrompts.mjs";
import { FIXTURES } from "./fixtures.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => {
  const i = process.argv.indexOf("--" + n);
  return i === -1 ? d : process.argv[i + 1];
};
const run = arg("run", "img1");
const models = arg("models", "gpt-image-2.6-flare,gpt-image-2.6-sunburst,gpt-image-2").split(",");
const quality = arg("quality", "medium");
const PRICE_OUT = 30 / 1e6; // $/image output token (공식 가격표 기준, gpt-image-2.6)
const PRICE_IN = 5 / 1e6;

const dir = path.join(here, "runs", run);
fs.mkdirSync(dir, { recursive: true });

const readJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

// 이야기 모으기
const stories = [];
const ev = readJsonl(path.join(here, "..", "server", "data", "events.jsonl"));
const lastLive = [...ev].reverse().find((e) => e.type === "dream_result" && e.mode === "live" && e.dream?.scenes);
if (lastLive) {
  const req = [...ev].reverse().find((e) => e.type === "dream_request" && e.sessionId === lastLive.sessionId);
  stories.push({ id: "live", story: lastLive.dream, material: req?.material || {} });
}
const smoke = readJsonl(path.join(here, "runs", "smoke", "results.jsonl")).find(
  (r) => r.pipeline === "single" && r.model === "claude-opus-5-5" && !r.error,
);
if (smoke) stories.push({ id: "math-copy", story: smoke.output, material: FIXTURES.find((f) => f.id === "math-copy").material });

async function gen(model, prompt) {
  const t0 = Date.now();
  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.OPENAI_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, size: "1536x1024", quality, output_format: "jpeg" }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${j.error?.message || ""}`);
  return { b64: j.data[0].b64_json, usage: j.usage, ms: Date.now() - t0 };
}

const resultsFile = path.join(dir, "images.jsonl");
const done = new Set(readJsonl(resultsFile).filter((r) => !r.error).map((r) => `${r.story}|${r.model}|${r.scene}`));
const tasks = [];
for (const s of stories)
  for (const m of models)
    s.story.scenes.forEach((scene, i) => {
      const k = `${s.id}|${m}|${i}`;
      if (done.has(k)) return;
      tasks.push(async () => {
        const prompt = scenePrompt({ scene, material: s.material, title: s.story.title, index: i, total: s.story.scenes.length });
        try {
          const r = await gen(m, prompt);
          const file = `${s.id}-${m}-${i + 1}.jpg`;
          fs.writeFileSync(path.join(dir, file), Buffer.from(r.b64, "base64"));
          const cost = (r.usage?.output_tokens || 0) * PRICE_OUT + (r.usage?.input_tokens || 0) * PRICE_IN;
          fs.appendFileSync(resultsFile, JSON.stringify({ story: s.id, model: m, scene: i, file, ms: r.ms, usage: r.usage, cost, prompt }) + "\n");
          console.log(`✓ ${k} ${(r.ms / 1000).toFixed(0)}s $${cost.toFixed(3)}`);
        } catch (e) {
          fs.appendFileSync(resultsFile, JSON.stringify({ story: s.id, model: m, scene: i, error: String(e.message) }) + "\n");
          console.log(`✗ ${k} ${e.message}`);
        }
      });
    });

console.log(`[images] ${stories.length} stories × ${models.length} models, ${tasks.length} to generate`);
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => { while (next < tasks.length) await tasks[next++](); }));

// 리포트
const rows = readJsonl(resultsFile).filter((r) => !r.error);
const get = (s, m, i) => rows.findLast((r) => r.story === s && r.model === m && r.scene === i);
const esc = (x) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const sumBy = (m) => {
  const rs = rows.filter((r) => r.model === m);
  const ms = rs.map((r) => r.ms).sort((a, b) => a - b);
  return { n: rs.length, cost: rs.reduce((a, r) => a + r.cost, 0) / (rs.length || 1), med: ms[Math.floor(ms.length / 2)] / 1000 };
};
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>장면 그림 비교 ${esc(run)}</title><style>
:root{--bg:#f6f4ef;--ink:#1d1b18;--dim:#6b665d;--line:#d9d4c8}
@media (prefers-color-scheme:dark){:root{--bg:#171614;--ink:#ece8df;--dim:#9a948a;--line:#3a3732}}
body{background:var(--bg);color:var(--ink);font:15px/1.6 -apple-system,"Apple SD Gothic Neo",sans-serif;margin:0;padding:24px 16px 80px}
main{max-width:1500px;margin:0 auto}h1{font-size:20px}h2{font-size:17px;margin-top:40px;border-bottom:1px solid var(--line)}
.dim{color:var(--dim);font-size:13px}table{border-collapse:collapse;font-size:13px}td,th{padding:4px 10px;border-bottom:1px solid var(--line);text-align:right}td:first-child,th:first-child{text-align:left}
.row{display:grid;grid-template-columns:minmax(200px,1fr) repeat(${models.length},minmax(0,2fr));gap:10px;margin:14px 0;align-items:start}
.row img{width:100%;display:block;cursor:zoom-in}.txt{font-size:13px}.cap{font-size:11.5px;color:var(--dim)}
.head{position:sticky;top:0;background:var(--bg);font-weight:600;padding:6px 0;z-index:1}
@media (max-width:800px){.row{grid-template-columns:1fr}}
dialog{padding:0;border:0;background:none;max-width:96vw}dialog img{max-width:96vw;max-height:92vh}
</style></head><body><main>
<h1>장면 그림 비교 — ${esc(run)}</h1>
<p class="dim">quality=${esc(quality)}, 1536×1024. 비용은 공식 토큰 가격($30/1M 출력) 기준 추정.</p>
<table><tr><th>모델</th><th>장수</th><th>$/장</th><th>$/꿈(6장)</th><th>중간 소요(초)</th></tr>
${models.map((m) => { const s = sumBy(m); return `<tr><td>${esc(m)}</td><td>${s.n}</td><td>${s.cost.toFixed(3)}</td><td>${(s.cost * 6).toFixed(2)}</td><td>${s.med?.toFixed(0) ?? "–"}</td></tr>`; }).join("")}</table>
${stories.map((s) => `<h2>「${esc(s.story.title)}」 <span class="dim">${esc(s.id)}</span></h2>
<div class="row head"><div>장면</div>${models.map((m) => `<div>${esc(m)}</div>`).join("")}</div>
${s.story.scenes.map((sc, i) => `<div class="row"><div class="txt"><b>${i + 1}. ${esc(sc.beat)}</b> · ${esc(sc.place)}<br>${esc(sc.text)}<br><span class="cap">image: ${esc(sc.image)}</span></div>
${models.map((m) => { const r = get(s.id, m, i); return r ? `<div><img src="${esc(r.file)}" loading="lazy"><div class="cap">${(r.ms / 1000).toFixed(0)}초 · $${r.cost.toFixed(3)}</div></div>` : `<div class="cap">실패/없음</div>`; }).join("")}</div>`).join("")}`).join("")}
</main><dialog id="z" onclick="this.close()"><img></dialog>
<script>document.addEventListener("click",e=>{if(e.target.matches(".row img")){const d=document.getElementById("z");d.querySelector("img").src=e.target.src;d.showModal();}})</script>
</body></html>`;
fs.writeFileSync(path.join(dir, "images.html"), html);
console.log("[images] report →", path.join(dir, "images.html"));
