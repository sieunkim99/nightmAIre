// 생성 경로 3단계 폴백:
// 1) 로컬 Express 서버 (/api — ANTHROPIC_API_KEY, 워크숍 현장용)
// 2) claude.ai 아티팩트로 열렸을 때: 뷰어의 Claude에게 직접 질의 (sample capability)
// 3) 내장 데모 엔진 (서버도 Claude도 없는 정적 호스팅/오프라인)
// prompts.mjs와 demo.mjs는 순수 JS라 브라우저에서 그대로 동작한다.
import { demoDream, demoJudge } from "../../server/demo.mjs";
import {
  dreamSystemPrompt,
  dreamUserPrompt,
  judgeSystemPrompt,
  judgeUserPrompt,
} from "../../server/prompts.mjs";

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return res.json(); // 정적 호스트가 HTML을 돌려주면 여기서 throw → 다음 경로
}

let samplePromise = null;
function claudeSample() {
  // claude.ai 뷰어 안에서만 window.claude가 존재한다. 없으면 즉시 포기 (10초 대기 방지).
  if (!globalThis.window?.claude?.use) return Promise.resolve(null);
  if (!samplePromise) {
    samplePromise = window.claude.use("sample").catch(() => null);
  }
  return samplePromise;
}

export const api = {
  health: async () => {
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error("no server");
      return await res.json();
    } catch {
      if (globalThis.window?.claude?.use) return { ok: true, mode: "claude.ai", model: null };
      return { ok: true, mode: "demo·내장", model: null };
    }
  },

  dream: async (payload) => {
    try {
      return await post("/api/dream", payload);
    } catch {
      /* 서버 없음 → 다음 경로 */
    }
    const sample = await claudeSample();
    if (sample) {
      try {
        const dream = await sample.json(
          dreamSystemPrompt() +
            "\n\n" +
            dreamUserPrompt({
              material: payload.material,
              dials: payload.dials,
              critiques: payload.critiques || [],
            }),
          { modelTier: "default" },
        );
        if (dream && Array.isArray(dream.cuts) && dream.cuts.length && Array.isArray(dream.causeNodes)) {
          return { dream, mode: "claude" };
        }
      } catch (e) {
        console.warn("[nightmAIre] viewer-Claude dream failed, falling back to demo:", e?.code || e);
      }
    }
    return { dream: demoDream(payload), mode: "demo" };
  },

  judge: async (payload) => {
    try {
      return await post("/api/judge", payload);
    } catch {
      /* 서버 없음 → 다음 경로 */
    }
    const sample = await claudeSample();
    if (sample) {
      try {
        const result = await sample.json(
          judgeSystemPrompt() +
            "\n\n" +
            judgeUserPrompt({ dream: payload.dream, principles: payload.principles }),
          { modelTier: "default" },
        );
        if (result && Array.isArray(result.nodes) && result.dreamState) {
          return { result, mode: "claude" };
        }
      } catch (e) {
        console.warn("[nightmAIre] viewer-Claude judge failed, falling back to demo:", e?.code || e);
      }
    }
    return { result: demoJudge(payload), mode: "demo" };
  },

  events: async () => {
    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("no server");
      return await res.json();
    } catch {
      return { events: [] };
    }
  },
};
