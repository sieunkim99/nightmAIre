// 생성 경로 3단계 폴백:
// 1) 로컬 Express 서버 (/api — ANTHROPIC_API_KEY, 워크숍 현장용)
// 2) claude.ai 아티팩트로 열렸을 때: 뷰어의 Claude에게 직접 질의 (sample capability)
// 3) 내장 데모 엔진 (서버도 Claude도 없는 정적 호스팅/오프라인)
// prompts.mjs와 demo.mjs는 순수 JS라 브라우저에서 그대로 동작한다.
import { demoDream, demoJudge } from "../../server/demo.mjs";
import { judgeSystemPrompt, judgeUserPrompt } from "../../server/prompts.mjs";
import { writeSystemPrompt, writeUserPrompt } from "../../server/storyPrompts.mjs";
import { isStory, storyToDream } from "../../server/dreamShape.mjs";

// 공개 배포 서버의 접속 코드 (ACCESS_CODE가 설정된 서버에서만 사용됨)
function getCode() {
  try {
    return localStorage.getItem("nightmaire_code") || "";
  } catch {
    return "";
  }
}
function setCode(c) {
  try {
    localStorage.setItem("nightmaire_code", c);
  } catch {
    /* 저장 불가 환경 무시 */
  }
}
function codeHeaders() {
  const c = getCode();
  return c ? { "x-access-code": c } : {};
}

async function post(url, body) {
  const doFetch = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...codeHeaders() },
      body: JSON.stringify(body),
    });
  let res = await doFetch();
  if (res.status === 401) {
    const c = window.prompt("접속 코드를 입력해줘 (워크숍 진행자에게 받은 코드)");
    if (c && c.trim()) {
      setCode(c.trim());
      res = await doFetch();
    }
  }
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

// 접속 코드 저장소 (첫 입력 후 이 기기에 저장)
export const accessCode = {
  get: getCode,
  set: setCode,
};

export const api = {
  // 저장된 코드가 서버에서 통하는지 확인 (코드가 필요 없는 서버면 항상 true)
  checkCode: async () => {
    try {
      const res = await fetch("/api/events", { headers: codeHeaders() });
      return res.ok;
    } catch {
      return false;
    }
  },

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
        const story = await sample.json(
          writeSystemPrompt({ withPlan: false }) +
            "\n\n" +
            writeUserPrompt({
              material: payload.material,
              dials: payload.dials,
              critiques: payload.critiques || [],
            }),
          { modelTier: "default" },
        );
        if (isStory(story)) {
          return { dream: storyToDream(story, payload.material), mode: "claude" };
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
      let res = await fetch("/api/events", { headers: codeHeaders() });
      if (res.status === 401) {
        const c = window.prompt("접속 코드를 입력해줘 (워크숍 진행자에게 받은 코드)");
        if (c && c.trim()) {
          setCode(c.trim());
          res = await fetch("/api/events", { headers: codeHeaders() });
        }
      }
      if (!res.ok) throw new Error("no server");
      return await res.json();
    } catch {
      return { events: [] };
    }
  },
};
