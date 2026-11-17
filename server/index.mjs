import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { RISK_DECK, DIALS } from "./riskDeck.mjs";
import { mountGenerator } from "./generator/routes.mjs";
import { LIBRARY_VERSION, TAXONOMY, MECHANISMS, CLAIMS, SOURCES } from "./generator/library.mjs";
import { drawScenes, imagesEnabled, IMAGE_MODEL } from "./images.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(here, "data");
fs.mkdirSync(DATA_DIR, {
  recursive: true
});
const IMG_DIR = path.join(DATA_DIR, "images");
const MODEL = process.env.NIGHTMAIRE_MODEL || "claude-opus-5-5";
const EFFORT = process.env.NIGHTMAIRE_EFFORT || "medium";
const FORCE_DEMO = process.env.DEMO_MODE === "1";
const PROD = process.env.NODE_ENV === "production";
const app = express();
app.use(express.json({
  limit: "1mb"
}));

// 공개 배포 보호: ACCESS_CODE가 설정돼 있으면 생성/라이브러리 API에 접속 코드를 요구한다.
// (공개 서버는 소유자의 API 키로 과금되므로, 코드 없이 열어두지 않는 것을 권장)
const ACCESS_CODE = process.env.ACCESS_CODE || "";
function requireCode(req, res, next) {
  if (!ACCESS_CODE) return next();
  if (req.get("x-access-code") === ACCESS_CODE) return next();
  res.status(401).json({
    error: "access code required"
  });
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
async function callModel(system, user, {
  signal
} = {}) {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: {
      effort: EFFORT
    },
    system: [{
      type: "text",
      text: system,
      cache_control: {
        type: "ephemeral"
      }
    }],
    messages: [{
      role: "user",
      content: user
    }]
  }, {
    signal
  });
  if (response.stop_reason === "refusal") {
    throw new Error("model refused: " + (response.stop_details?.explanation || ""));
  }
  const text = response.content.filter(b => b.type === "text").map(b => b.text).join("\n");
  return extractJson(text);
}

// Optional aggregate metadata only. Generator routes never pass raw child material.
function logEvent(event) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ...event
  }) + "\n";
  fs.appendFileSync(path.join(DATA_DIR, "events.jsonl"), line);
}
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mode: liveMode() ? "live" : "demo",
    pipelineVersion: 3,
    model: MODEL,
    imageModel: imagesEnabled() ? IMAGE_MODEL : null,
    accessRequired: Boolean(ACCESS_CODE)
  });
});

// 장면 그림: 파일 이름이 추측 불가능한 무작위 id라 <img>로 바로 불러온다 (헤더를 붙일 수 없음)
app.use("/api/img", express.static(IMG_DIR, {
  maxAge: "7d",
  fallthrough: false
}));
app.get("/api/deck", (_req, res) => {
  res.json({
    deck: RISK_DECK,
    dials: DIALS
  });
});
app.get("/api/access", requireCode, (_req, res) => res.json({
  ok: true
}));
app.get("/api/library", requireCode, (_req, res) => res.json({
  version: LIBRARY_VERSION,
  taxonomy: TAXONOMY,
  mechanisms: MECHANISMS,
  claims: CLAIMS,
  sources: SOURCES
}));
mountGenerator(app, {
  requireCode,
  liveMode,
  callModel,
  imagesEnabled,
  drawScenes,
  imageDir: IMG_DIR,
  record: process.env.NIGHTMAIRE_RECORD_METADATA === "1" ? logEvent : () => {}
});

// Research/design documentation is separate from the child's experience.
app.use("/docs/pipeline", express.static(path.join(here, "..", "docs", "pipeline")));

// 프로덕션(호스팅)에서는 빌드된 프론트도 이 서버가 함께 서빙한다 → 단일 서비스 배포
if (PROD) {
  const dist = path.join(here, "..", "dist");
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// 포트: 호스팅(프로덕션)에서는 플랫폼이 주는 PORT를 따른다.
// 개발에서는 일반 PORT를 무시한다 — 프리뷰 런처가 PORT=5173(프론트 포트)을 주입해
// Vite와 충돌한 적이 있음. 개발용 API 포트는 전용 변수(NIGHTMAIRE_API_PORT)로만 바꾼다.
const PORT = process.env.NIGHTMAIRE_API_PORT || PROD && process.env.PORT || 5799;
app.listen(PORT, () => {
  console.log(`[nightmAIre] server on http://localhost:${PORT} (${liveMode() ? "LIVE" : "DEMO"} mode, model: ${MODEL}${imagesEnabled() ? `, images: ${IMAGE_MODEL}` : ""}${ACCESS_CODE ? ", access code ON" : ""})`);
});
