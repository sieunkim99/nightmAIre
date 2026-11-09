// 결과 리포트(HTML) — 요약 표 + 블라인드 읽기/채점.
//   node eval/report.mjs <runs/이름>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FIXTURES } from "./fixtures.mjs";
import { CRITERIA } from "./judge.mjs";

const readJsonl = (f) =>
  fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmt = (x, d = 1) => (x == null ? "–" : x.toFixed(d));

export function summarize(dir) {
  const all = readJsonl(path.join(dir, "results.jsonl"));
  const key = (r) => `${r.fixtureId}|${r.pipeline}|${r.model}`;
  // 같은 키는 마지막 성공본 기준
  const ok = new Map();
  const errors = [];
  for (const r of all) (r.error ? errors.push(r) : ok.set(key(r), r));
  const judgments = readJsonl(path.join(dir, "judgments.jsonl")).filter((j) => !j.error);
  const byKey = {};
  for (const j of judgments) (byKey[j.key] ||= {})[j.judge] = j;
  const results = [...ok.values()].map((r) => ({ ...r, key: key(r), judgments: byKey[key(r)] || {} }));
  const judges = [...new Set(judgments.map((j) => j.judge))];
  return { results, errors: errors.filter((e) => !ok.has(key(e))), judges };
}

function groupRows(results, judges, by) {
  const groups = {};
  for (const r of results) (groups[by(r)] ||= []).push(r);
  return Object.entries(groups).map(([name, rs]) => {
    const js = rs.flatMap((r) => Object.values(r.judgments));
    const row = {
      name,
      n: rs.length,
      overall: mean(js.map((j) => j.overall)),
      perJudge: Object.fromEntries(judges.map((jm) => [jm, mean(rs.map((r) => r.judgments[jm]?.overall).filter((x) => x != null))])),
      crit: Object.fromEntries(Object.keys(CRITERIA).map((c) => [c, mean(js.map((j) => j.scores?.[c]).filter((x) => x != null))])),
      unsafe: js.filter((j) => j.safety === false).length,
      preachy: js.filter((j) => j.preachy).length,
      cost: mean(rs.map((r) => r.cost).filter((x) => x != null)),
      outTok: mean(rs.map((r) => r.usage?.output || 0)),
      sec: mean(rs.map((r) => r.ms / 1000)),
    };
    return row;
  }).sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
}

function table(rows, judges, label) {
  const crit = Object.keys(CRITERIA);
  const head = `<tr><th>${label}</th><th>n</th><th>종합</th>${judges.map((j) => `<th>${j}</th>`).join("")}${crit
    .map((c) => `<th title="${CRITERIA[c]}">${c}</th>`)
    .join("")}<th>안전✗</th><th>훈계</th><th>$/편</th><th>출력토큰</th><th>초</th></tr>`;
  const body = rows
    .map(
      (r) =>
        `<tr><td>${r.name}</td><td>${r.n}</td><td><b>${fmt(r.overall)}</b></td>${judges
          .map((j) => `<td>${fmt(r.perJudge[j])}</td>`)
          .join("")}${crit.map((c) => `<td>${fmt(r.crit[c])}</td>`).join("")}<td>${r.unsafe}</td><td>${r.preachy}</td><td>${fmt(
          r.cost,
          3,
        )}</td><td>${fmt(r.outTok, 0)}</td><td>${fmt(r.sec, 0)}</td></tr>`,
    )
    .join("");
  return `<table>${head}${body}</table>`;
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function buildReport(dir) {
  const { results, errors, judges } = summarize(dir);
  const runName = path.basename(dir);

  const combos = groupRows(results, judges, (r) => `${r.pipeline} · ${r.model}`);
  const byPipe = groupRows(results, judges, (r) => r.pipeline);
  const byModel = groupRows(results, judges, (r) => r.model);

  // 블라인드 읽기용 데이터 (재료별로 섞음, 시드 고정)
  const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const blind = FIXTURES.map((fx) => {
    const items = results
      .filter((r) => r.fixtureId === fx.id)
      .sort((a, b) => hash(a.key + runName) - hash(b.key + runName))
      .map((r, i) => ({
        label: String.fromCharCode(65 + i),
        key: r.key,
        pipeline: r.pipeline,
        model: r.model,
        readable: r.readable,
        judges: Object.fromEntries(Object.entries(r.judgments).map(([k, j]) => [k, { overall: j.overall, weakness: j.weakness, bestLine: j.bestLine }])),
      }));
    return { id: fx.id, material: fx.material, dials: fx.dials, items };
  }).filter((f) => f.items.length);

  // 종류별 보기용 데이터 (정체 공개)
  const PIPE_ORDER = ["baseline", "single", "staged", "critic"];
  const modelOrder = [...new Set(results.map((r) => r.model))];
  const browse = results
    .map((r) => {
      const o = r.output || {};
      return {
        key: r.key,
        fixtureId: r.fixtureId,
        pipeline: r.pipeline,
        model: r.model,
        readable: r.readable,
        meta: r.format === "v2" ? { logline: o.logline, rule: o.rule, refrain: o.refrain, trace: o.trace } : {},
        cost: r.cost,
        sec: r.ms != null ? Math.round(r.ms / 1000) : null,
        outTok: r.usage?.output,
        judges: Object.fromEntries(
          Object.entries(r.judgments).map(([k, j]) => [k, { overall: j.overall, weakness: j.weakness, bestLine: j.bestLine, preachy: j.preachy, safety: j.safety }]),
        ),
      };
    })
    .sort(
      (a, b) =>
        FIXTURES.findIndex((f) => f.id === a.fixtureId) - FIXTURES.findIndex((f) => f.id === b.fixtureId) ||
        PIPE_ORDER.indexOf(a.pipeline) - PIPE_ORDER.indexOf(b.pipeline) ||
        modelOrder.indexOf(a.model) - modelOrder.indexOf(b.model),
    );
  const materials = Object.fromEntries(FIXTURES.map((f) => [f.id, { material: f.material, dials: f.dials }]));

  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>악몽 평가 ${esc(runName)}</title>
<style>
:root{--bg:#f6f4ef;--ink:#1d1b18;--dim:#6b665d;--line:#d9d4c8;--mark:#fff3b0}
@media (prefers-color-scheme:dark){:root{--bg:#171614;--ink:#ece8df;--dim:#9a948a;--line:#3a3732;--mark:#4a4220}}
body{background:var(--bg);color:var(--ink);font:15px/1.65 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;margin:0;padding:24px 16px 80px}
main{max-width:1100px;margin:0 auto}
h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:40px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}
.dim{color:var(--dim);font-size:13px}
.scroll{overflow-x:auto}
table{border-collapse:collapse;font-size:12.5px;white-space:nowrap}
th,td{border-bottom:1px solid var(--line);padding:4px 8px;text-align:right}th:first-child,td:first-child{text-align:left}
th{font-weight:600;color:var(--dim)}
.fx{margin-top:28px}
.mat{font-size:13px;color:var(--dim);border-left:3px solid var(--line);padding-left:10px;margin:8px 0 12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
.story{border:1px solid var(--line);padding:12px 14px;background:color-mix(in srgb,var(--bg) 85%,#fff 15%)}
.story pre{white-space:pre-wrap;font:inherit;margin:6px 0 10px;font-size:14px}
.story .lab{font-weight:700}
.rate button{border:1px solid var(--line);background:none;color:var(--ink);padding:2px 9px;margin-right:3px;cursor:pointer;font:inherit;font-size:13px}
.rate button.on{background:var(--ink);color:var(--bg)}
.best.on{background:var(--mark)!important;color:var(--ink)!important}
textarea{width:100%;box-sizing:border-box;margin-top:6px;font:inherit;font-size:13px;background:none;color:var(--ink);border:1px solid var(--line);padding:4px}
.who{display:none;font-size:12px;color:var(--dim);margin-top:6px}
body.reveal .who{display:block}
.bar{position:sticky;top:0;background:var(--bg);padding:8px 0;border-bottom:1px solid var(--line);z-index:1;display:flex;gap:8px;flex-wrap:wrap}
.bar button{font:inherit;font-size:13px;padding:4px 10px;border:1px solid var(--ink);background:none;color:var(--ink);cursor:pointer}
.err{font-size:12px;color:#b33}
.tabs{display:flex;gap:0;margin:20px 0 0;border-bottom:1px solid var(--ink)}
.tabs button{font:inherit;font-size:14px;padding:6px 14px;border:1px solid var(--line);border-bottom:none;background:none;color:var(--dim);cursor:pointer;margin-right:-1px}
.tabs button.on{color:var(--ink);border-color:var(--ink);background:var(--bg);font-weight:600;position:relative;top:1px}
.pane{display:none}.pane.on{display:block}
.ctl{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;font-size:13px;padding:10px 0;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--bg);z-index:1}
.ctl label{color:var(--dim)}
.ctl select{font:inherit;font-size:13px;background:none;color:var(--ink);border:1px solid var(--line);padding:2px 4px}
.chip{font:inherit;font-size:12.5px;padding:1px 8px;border:1px solid var(--line);background:none;color:var(--dim);cursor:pointer}
.chip.on{border-color:var(--ink);color:var(--ink);background:var(--mark)}
.grp{margin-top:26px}.grp>h3{font-size:15px;margin:0 0 4px}
.tag{font-size:12px;color:var(--dim)}
.score{font-weight:700;font-variant-numeric:tabular-nums}
.meta{font-size:12.5px;color:var(--dim);margin:4px 0 0}
.jd{font-size:12px;color:var(--dim);border-top:1px dashed var(--line);margin-top:8px;padding-top:6px}
</style></head><body><main>
<h1>악몽 평가 — ${esc(runName)}</h1>
<p class="dim">생성 ${results.length}편 · 판정 모델 ${judges.join(", ") || "없음"} · 점수는 1~5(종합은 1~10). 판정 모델은 이야기 텍스트만 보고 채점했다.</p>

<div class="tabs"><button data-tab="sum">요약 표</button><button data-tab="browse">종류별 보기</button><button data-tab="blind">블라인드 읽기</button></div>
<section class="pane" id="pane-sum">
<h2>파이프라인별</h2><div class="scroll">${table(byPipe, judges, "파이프라인")}</div>
<h2>모델별</h2><div class="scroll">${table(byModel, judges, "모델")}</div>
<h2>조합별</h2><div class="scroll">${table(combos, judges, "파이프라인 · 모델")}</div>
${errors.length ? `<h2>실패</h2>${errors.map((e) => `<div class="err">${esc(e.fixtureId)} · ${esc(e.pipeline)} · ${esc(e.model)} — ${esc(e.error)}</div>`).join("")}` : ""}

</section>

<section class="pane" id="pane-browse">
<div class="ctl">
<label>묶기</label><select id="groupBy"><option value="fixtureId">재료</option><option value="pipeline">파이프라인</option><option value="model">모델</option></select>
<label>정렬</label><select id="sortBy"><option value="default">기본</option><option value="score">점수 높은 순</option></select>
<span id="filters"></span><span class="dim" id="bcount"></span>
</div>
<p class="dim">누가 썼는지 보이는 화면이다. 블라인드 채점을 할 거라면 그쪽을 먼저 끝내자.</p>
<div id="browse"></div>
</section>

<section class="pane" id="pane-blind">
<h2>블라인드 읽기</h2>
<p class="dim">누가 썼는지 가린 채 읽고 1~5점, 재료마다 가장 좋은 것 하나(★)를 고른다. 기록은 이 브라우저에 저장되고, 다 끝나면 내보내기로 JSON을 받는다.</p>
<div class="bar"><button id="reveal">정체 보기</button><button id="export">내 채점 내보내기</button><span class="dim" id="count"></span></div>
<div id="blind"></div>
</section>
</main>
<script>
const DATA = ${JSON.stringify(blind).replace(/</g, "\\u003c")};
const RUN = ${JSON.stringify(runName)};
const BROWSE = ${JSON.stringify(browse).replace(/</g, "\\u003c")};
const MATS = ${JSON.stringify(materials).replace(/</g, "\\u003c")};
const SKEY = "nightmaire-eval-" + RUN;
let S = {};
try { S = JSON.parse(localStorage.getItem(SKEY) || "{}"); } catch {}
const save = () => { try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch {} count(); };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function count(){ const n = Object.values(S).filter(v => v.score).length; const t = DATA.reduce((a,f)=>a+f.items.length,0); document.getElementById("count").textContent = n + " / " + t + " 채점"; }
function render(){
  document.getElementById("blind").innerHTML = DATA.map(fx => {
    const m = fx.material;
    const chat = (m.chat||[]).map(c => (c.role==="me"?"나":"AI")+": "+c.text).join(" / ");
    return '<section class="fx"><b>' + esc(fx.id) + '</b>' +
      '<div class="mat">' + esc(m.nickname) + ' · ' + esc(m.service) + ' · ' + esc(m.situation) + '<br>' + esc(chat) + '<br>→ ' + esc(m.applied) +
      '<br>다이얼: ' + esc(Object.entries(fx.dials).map(([k,v])=>k+"="+v).join(", ")) + '</div><div class="grid">' +
      fx.items.map(it => {
        const s = S[it.key] || {};
        const best = S["best|"+fx.id] === it.key;
        return '<div class="story"><span class="lab">' + it.label + '</span><pre>' + esc(it.readable) + '</pre>' +
          '<div class="rate">' + [1,2,3,4,5].map(n => '<button data-k="'+it.key+'" data-n="'+n+'" class="'+(s.score===n?"on":"")+'">'+n+'</button>').join("") +
          '<button class="best '+(best?"on":"")+'" data-best="'+fx.id+'" data-k="'+it.key+'">★</button></div>' +
          '<textarea data-memo="'+it.key+'" rows="2" placeholder="메모">' + esc(s.memo||"") + '</textarea>' +
          '<div class="who">' + esc(it.pipeline) + ' · ' + esc(it.model) + '<br>' +
          Object.entries(it.judges).map(([j,v]) => esc(j)+': '+v.overall+'/10 — '+esc(v.weakness)).join('<br>') + '</div></div>';
      }).join("") + '</div></section>';
  }).join("");
  count();
}
document.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "reveal") { document.body.classList.toggle("reveal"); return; }
  if (b.id === "export") {
    const blob = new Blob([JSON.stringify({ run: RUN, ratings: S }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "human-ratings-" + RUN + ".json"; a.click(); return;
  }
  if (b.dataset.best) { S["best|"+b.dataset.best] = b.dataset.k; save(); render(); return; }
  if (b.dataset.n) { S[b.dataset.k] = { ...(S[b.dataset.k]||{}), score: Number(b.dataset.n) }; save(); render(); }
});
document.addEventListener("input", e => { const k = e.target.dataset.memo; if (k) { S[k] = { ...(S[k]||{}), memo: e.target.value }; save(); } });
render();

// ── 탭
const TKEY = "nightmaire-eval-tab";
function tab(t){ document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("on",b.dataset.tab===t)); document.querySelectorAll(".pane").forEach(p=>p.classList.toggle("on",p.id==="pane-"+t)); try{localStorage.setItem(TKEY,t)}catch{} }
document.querySelectorAll(".tabs button").forEach(b=>b.addEventListener("click",()=>tab(b.dataset.tab)));
let t0 = "sum"; try { t0 = localStorage.getItem(TKEY) || "sum"; } catch {}
tab(t0);

// ── 종류별 보기
const DIMS = { fixtureId: "재료", pipeline: "파이프라인", model: "모델" };
const uniq = (k) => [...new Set(BROWSE.map(r => r[k]))];
const F = { fixtureId: new Set(uniq("fixtureId")), pipeline: new Set(uniq("pipeline")), model: new Set(uniq("model")) };
const avg = (r) => { const v = Object.values(r.judges).map(j=>j.overall).filter(x=>x!=null); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; };
function renderFilters(){
  document.getElementById("filters").innerHTML = Object.entries(DIMS).map(([k,lab]) =>
    '<span><label>'+lab+'</label> ' + uniq(k).map(v => '<button class="chip '+(F[k].has(v)?"on":"")+'" data-f="'+k+'" data-v="'+esc(v)+'">'+esc(v)+'</button>').join(" ") + '</span>').join(" ");
}
function renderBrowse(){
  const g = document.getElementById("groupBy").value, sort = document.getElementById("sortBy").value;
  let rows = BROWSE.filter(r => F.fixtureId.has(r.fixtureId) && F.pipeline.has(r.pipeline) && F.model.has(r.model));
  if (sort === "score") rows = [...rows].sort((a,b) => (avg(b)??-1) - (avg(a)??-1));
  document.getElementById("bcount").textContent = rows.length + "편";
  const groups = new Map();
  for (const r of rows) { if (!groups.has(r[g])) groups.set(r[g], []); groups.get(r[g]).push(r); }
  const others = Object.keys(DIMS).filter(k => k !== g);
  document.getElementById("browse").innerHTML = [...groups].map(([name, rs]) => {
    const sc = rs.map(avg).filter(x=>x!=null);
    let head = '<h3>' + esc(name) + ' <span class="tag">' + rs.length + '편 · 평균 ' + (sc.length ? (sc.reduce((a,b)=>a+b,0)/sc.length).toFixed(1) : "–") + '</span></h3>';
    if (g === "fixtureId" && MATS[name]) {
      const m = MATS[name].material;
      const chat = (m.chat||[]).map(c => (c.role==="me"?"나":"AI")+": "+c.text).join(" / ");
      head += '<div class="mat">' + esc(m.nickname) + ' · ' + esc(m.service) + ' · ' + esc(m.situation) + '<br>' + esc(chat) + '<br>→ ' + esc(m.applied) +
        '<br>다이얼: ' + esc(Object.entries(MATS[name].dials).map(([k,v])=>k+"="+v).join(", ")) + '</div>';
    }
    return '<section class="grp">' + head + '<div class="grid">' + rs.map(r => {
      const a = avg(r);
      const meta = Object.entries(r.meta).filter(([,v])=>v).map(([k,v]) => '<div class="meta"><b>'+k+'</b> '+esc(v)+'</div>').join("");
      const jd = Object.entries(r.judges).map(([j,v]) => esc(j)+': <b>'+v.overall+'</b>/10'+(v.preachy?' · 훈계':'')+(v.safety===false?' · 안전✗':'')+'<br>약점: '+esc(v.weakness)+(v.bestLine?'<br>좋은 줄: '+esc(v.bestLine):'')).join('<br><br>');
      return '<div class="story"><div><span class="score">' + (a!=null?a.toFixed(1):"–") + '</span> <span class="tag">' +
        others.map(k => esc(r[k])).join(' · ') + (r.cost!=null?' · $'+r.cost.toFixed(3):'') + (r.sec!=null?' · '+r.sec+'초':'') + '</span></div>' +
        meta + '<pre>' + esc(r.readable) + '</pre>' + (jd ? '<div class="jd">'+jd+'</div>' : '') + '</div>';
    }).join("") + '</div></section>';
  }).join("") || '<p class="dim">조건에 맞는 이야기가 없다.</p>';
}
document.getElementById("filters").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  const set = F[b.dataset.f], v = b.dataset.v;
  if (e.altKey || e.metaKey) { set.clear(); set.add(v); } else if (set.has(v)) { if (set.size > 1) set.delete(v); } else set.add(v);
  renderFilters(); renderBrowse();
});
document.getElementById("groupBy").addEventListener("change", renderBrowse);
document.getElementById("sortBy").addEventListener("change", renderBrowse);
renderFilters(); renderBrowse();
</script></body></html>`;
  const out = path.join(dir, "report.html");
  fs.writeFileSync(out, html);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const d = process.argv[2];
  if (!d) {
    console.error("usage: node eval/report.mjs eval/runs/<name>");
    process.exit(1);
  }
  console.log(buildReport(path.resolve(d)));
}
