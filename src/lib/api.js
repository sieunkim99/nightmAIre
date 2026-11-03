// API 클라이언트 — 서버가 없으면(정적 호스팅 공유본) 내장 데모 엔진으로 폴백한다.
// server/demo.mjs는 순수 JS라 브라우저에서도 그대로 동작한다.
import { demoDream, demoJudge } from "../../server/demo.mjs";

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return res.json(); // 정적 호스트가 HTML을 돌려주면 여기서 throw → 폴백
}

export const api = {
  health: async () => {
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error("no server");
      return await res.json();
    } catch {
      return { ok: true, mode: "demo·내장", model: null };
    }
  },
  dream: async (payload) => {
    try {
      return await post("/api/dream", payload);
    } catch {
      return { dream: demoDream(payload), mode: "demo" };
    }
  },
  judge: async (payload) => {
    try {
      return await post("/api/judge", payload);
    } catch {
      return { result: demoJudge(payload), mode: "demo" };
    }
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
