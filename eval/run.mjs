// 사용법:
//   node eval/run.mjs --run smoke --fixtures math-copy --models claude-opus-5-5,gpt-5.5
//   옵션: --models --pipelines --fixtures --judges (쉼표 구분, 생략 시 전부/기본값) --concurrency 4
// 같은 --run 이름으로 다시 돌리면 이미 성공한 조합은 건너뛴다(이어하기).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FIXTURES } from "./fixtures.mjs";
import { MODELS, costOf } from "./providers.mjs";
import { PIPELINES, toReadable } from "./pipelines.mjs";
import { judge } from "./judge.mjs";
import { buildReport } from "./report.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i === -1 ? def : process.argv[i + 1];
}
const list = (v, all) => (v ? v.split(",").map((s) => s.trim()) : all);

const runName = arg("run", new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-"));
const models = list(arg("models"), Object.keys(MODELS));
const pipelines = list(arg("pipelines"), Object.keys(PIPELINES));
const fixtures = FIXTURES.filter((f) => list(arg("fixtures"), FIXTURES.map((x) => x.id)).includes(f.id));
const judges = list(arg("judges"), ["claude-opus-5-5", "gpt-5.5"]);
const concurrency = Number(arg("concurrency", 4));

const dir = path.join(here, "runs", runName);
fs.mkdirSync(dir, { recursive: true });
const resultsFile = path.join(dir, "results.jsonl");
const judgeFile = path.join(dir, "judgments.jsonl");

const readJsonl = (f) =>
  fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const append = (f, o) => fs.appendFileSync(f, JSON.stringify(o) + "\n");

async function pool(tasks, n) {
  let i = 0;
  const workers = Array.from({ length: n }, async () => {
    while (i < tasks.length) await tasks[i++]();
  });
  await Promise.all(workers);
}

const key = (r) => `${r.fixtureId}|${r.pipeline}|${r.model}`;
const done = new Set(readJsonl(resultsFile).filter((r) => !r.error).map(key));

const genTasks = [];
for (const fx of fixtures)
  for (const p of pipelines)
    for (const m of models) {
      const k = `${fx.id}|${p}|${m}`;
      if (done.has(k)) continue;
      genTasks.push(async () => {
        const t0 = Date.now();
        try {
          const r = await PIPELINES[p](m, fx);
          append(resultsFile, {
            fixtureId: fx.id, pipeline: p, model: m, format: r.format,
            output: r.output, stages: r.stages, readable: toReadable(r.output, r.format),
            usage: r.usage, cost: costOf(m, r.usage), ms: r.ms,
          });
          console.log(`✓ gen ${k} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
        } catch (err) {
          append(resultsFile, { fixtureId: fx.id, pipeline: p, model: m, error: String(err.message || err) });
          console.log(`✗ gen ${k}: ${err.message}`);
        }
      });
    }

console.log(`[eval] run=${runName} generate ${genTasks.length} (skipped ${done.size})`);
await pool(genTasks, concurrency);

// 판정: 성공한 생성물 × 판정 모델, 아직 없는 것만
const results = readJsonl(resultsFile).filter((r) => !r.error);
const latest = new Map(results.map((r) => [key(r), r]));
const judged = new Set(readJsonl(judgeFile).filter((j) => !j.error).map((j) => `${j.key}|${j.judge}`));
const judgeTasks = [];
for (const r of latest.values())
  for (const jm of judges) {
    const k = key(r);
    if (judged.has(`${k}|${jm}`)) continue;
    const fx = FIXTURES.find((f) => f.id === r.fixtureId);
    judgeTasks.push(async () => {
      try {
        const j = await judge(jm, fx, r.readable);
        append(judgeFile, { key: k, judge: jm, ...j });
        console.log(`✓ judge ${k} by ${jm}: ${j.overall}`);
      } catch (err) {
        append(judgeFile, { key: k, judge: jm, error: String(err.message || err) });
        console.log(`✗ judge ${k} by ${jm}: ${err.message}`);
      }
    });
  }
console.log(`[eval] judge ${judgeTasks.length}`);
await pool(judgeTasks, concurrency);

const out = buildReport(dir);
console.log(`[eval] report → ${out}`);
