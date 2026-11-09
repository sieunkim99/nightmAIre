import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { RISK_DECK, DIALS } from "./riskDeck.mjs";
import { judgeSystemPrompt, judgeUserPrompt } from "./prompts.mjs";
import { writeSystemPrompt, writeUserPrompt } from "./storyPrompts.mjs";
import { storyToDream } from "./dreamShape.mjs";
import { demoDream, demoJudge } from "./demo.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(here, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const MODEL = process.env.NIGHTMAIRE_MODEL || "claude-opus-5-5";
const EFFORT = process.env.NIGHTMAIRE_EFFORT || "medium";
const FORCE_DEMO = process.env.DEMO_MODE === "1";

const PROD = process.env.NODE_ENV === "production";

const app = express();
app.use(express.json({ limit: "1mb" }));

// 공개 배포 보호: ACCESS_CODE가 설정돼 있으면 생성/판정/로그 API에 접속 코드를 요구한다.
// (공개 서버는 소유자의 API 키로 과금되므로, 코드 없이 열어두지 않는 것을 권장)
const ACCESS_CODE = process.env.ACCESS_CODE || "";
function requireCode(req, res, next) {
  if (!ACCESS_CODE) return next();
  if (req.get("x-access-code") === ACCESS_CODE) return next();
  res.status(401).json({ error: "access code required" });
}

let client = null;
function getClient() {
  if (!client) client = new Anthropic(); // ANTHROPIC_API_KEY / ant 프로필 자동 인식
  return client;
}
function hasCredentials() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
function liveMode() {
  return !FORCE_DEMO && hasCredentials();
}

function extractJson(text) {
  // 모델이 코드펜스로 감싸거나 앞뒤에 말을 붙여도 JSON을 복원
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON in model output");
  return JSON.parse(candidate.slice(start, end + 1));
}

async function callModel(system, user) {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: EFFORT },
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  if (response.stop_reason === "refusal") {
    throw new Error("model refused: " + (response.stop_details?.explanation || ""));
  }
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return extractJson(text);
}

// 세션 로그: 연구 데이터 수집용 append-only JSONL
function logEvent(event) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n";
  fs.appendFileSync(path.join(DATA_DIR, "events.jsonl"), line);
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mode: liveMode() ? "live" : "demo",
    model: MODEL,
    accessRequired: Boolean(ACCESS_CODE),
  });
});

app.get("/api/deck", (_req, res) => {
  res.json({ deck: RISK_DECK, dials: DIALS });
});

app.post("/api/dream", requireCode, async (req, res) => {
  const { material, dials, critiques = [], sessionId } = req.body || {};
  if (!material || !dials) return res.status(400).json({ error: "material and dials required" });
  logEvent({ type: "dream_request", sessionId, material, dials, critiques });
  try {
    let dream;
    let mode = "demo";
    if (liveMode()) {
      try {
        // v2 이야기 엔진 (eval/에서 고른 single 파이프라인: 기획까지 한 번의 호출로)
        const story = await callModel(writeSystemPrompt({ withPlan: false }), writeUserPrompt({ material, dials, critiques }));
        dream = storyToDream(story, material);
        mode = "live";
      } catch (err) {
        console.error("[dream] live generation failed, falling back to demo:", err.message);
        dream = demoDream({ material, dials });
      }
    } else {
      dream = demoDream({ material, dials });
    }
    logEvent({ type: "dream_result", sessionId, mode, dream });
    res.json({ dream, mode });
  } catch (err) {
    console.error("[dream] error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.post("/api/judge", requireCode, async (req, res) => {
  const { dream, principles = [], sessionId } = req.body || {};
  if (!dream || !principles.length)
    return res.status(400).json({ error: "dream and principles required" });
  logEvent({ type: "judge_request", sessionId, principles });
  try {
    let result;
    let mode = "demo";
    if (liveMode()) {
      try {
        result = await callModel(judgeSystemPrompt(), judgeUserPrompt({ dream, principles }));
        mode = "live";
      } catch (err) {
        console.error("[judge] live judging failed, falling back to demo:", err.message);
        result = demoJudge({ dream, principles });
      }
    } else {
      result = demoJudge({ dream, principles });
    }
    logEvent({ type: "judge_result", sessionId, mode, result });
    res.json({ result, mode });
  } catch (err) {
    console.error("[judge] error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

// 수집된 연구 데이터 내보내기 (교사/연구자 콘솔용)
app.get("/api/events", requireCode, (_req, res) => {
  const file = path.join(DATA_DIR, "events.jsonl");
  if (!fs.existsSync(file)) return res.json({ events: [] });
  const events = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  res.json({ events });
});

// 프로덕션(호스팅)에서는 빌드된 프론트도 이 서버가 함께 서빙한다 → 단일 서비스 배포
if (PROD) {
  const dist = path.join(here, "..", "dist");
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// 포트: 호스팅(프로덕션)에서는 플랫폼이 주는 PORT를 따른다.
// 개발에서는 일반 PORT를 무시한다 — 프리뷰 런처가 PORT=5173(프론트 포트)을 주입해
// Vite와 충돌한 적이 있음. 개발용 API 포트는 전용 변수(NIGHTMAIRE_API_PORT)로만 바꾼다.
const PORT =
  process.env.NIGHTMAIRE_API_PORT || (PROD && process.env.PORT) || 5799;
app.listen(PORT, () => {
  console.log(
    `[nightmAIre] server on http://localhost:${PORT} (${liveMode() ? "LIVE" : "DEMO"} mode, model: ${MODEL}${ACCESS_CODE ? ", access code ON" : ""})`,
  );
});
