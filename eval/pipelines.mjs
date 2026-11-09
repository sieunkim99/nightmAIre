// 비교할 생성 파이프라인 4종.
//  baseline  — 지금 앱의 프롬프트 그대로 (v1 입력, 4컷)
//  single    — v2 이야기 구조를 한 번의 호출로 (컨텍스트 엔지니어링만의 효과)
//  staged    — plan → write 두 단계 (단계 분리의 효과)
//  critic    — plan → write → critic → revise (편집 루프의 효과)
import { callJSON } from "./providers.mjs";
import { toV1 } from "./fixtures.mjs";
import { dreamSystemPrompt, dreamUserPrompt } from "../server/prompts.mjs";
import * as S from "../server/storyPrompts.mjs";

function addUsage(acc, u) {
  acc.input += u.input;
  acc.output += u.output;
  return acc;
}

async function runStages(model, steps) {
  const usage = { input: 0, output: 0 };
  const stages = {};
  let ms = 0;
  for (const [name, fn] of steps) {
    const { system, user } = fn(stages);
    const r = await callJSON(model, system, user);
    stages[name] = r.json;
    addUsage(usage, r.usage);
    ms += r.ms;
  }
  return { stages, usage, ms };
}

export const PIPELINES = {
  async baseline(model, fx) {
    const v1 = toV1(fx);
    const r = await runStages(model, [
      ["dream", () => ({ system: dreamSystemPrompt(), user: dreamUserPrompt({ ...v1, critiques: [] }) })],
    ]);
    return { ...r, output: r.stages.dream, format: "v1" };
  },

  async single(model, fx) {
    const r = await runStages(model, [
      ["story", () => ({ system: S.writeSystemPrompt({ withPlan: false }), user: S.writeUserPrompt(fx) })],
    ]);
    return { ...r, output: r.stages.story, format: "v2" };
  },

  async staged(model, fx) {
    const r = await runStages(model, [
      ["plan", () => ({ system: S.planSystemPrompt(), user: S.planUserPrompt(fx) })],
      ["story", (st) => ({ system: S.writeSystemPrompt(), user: S.writeUserPrompt({ ...fx, plan: st.plan }) })],
    ]);
    return { ...r, output: r.stages.story, format: "v2" };
  },

  async critic(model, fx) {
    const r = await runStages(model, [
      ["plan", () => ({ system: S.planSystemPrompt(), user: S.planUserPrompt(fx) })],
      ["draft", (st) => ({ system: S.writeSystemPrompt(), user: S.writeUserPrompt({ ...fx, plan: st.plan }) })],
      ["critique", (st) => ({ system: S.criticSystemPrompt(), user: S.criticUserPrompt({ material: fx.material, draft: st.draft }) })],
      [
        "story",
        (st) => ({
          system: S.writeSystemPrompt(),
          user: S.reviseUserPrompt({ ...fx, plan: st.plan, draft: st.draft, critique: st.critique }),
        }),
      ],
    ]);
    return { ...r, output: r.stages.story, format: "v2" };
  },
};

// 판정·사람 평가용으로 형식 차이를 지운 읽을거리
export function toReadable(output, format) {
  if (!output) return "";
  if (format === "v1") {
    return [`# ${output.title || ""}`, ...(output.cuts || []).map((c, i) => `${i + 1}. ${c.narration}`)].join("\n\n");
  }
  // line·trace는 앱 표시용 메타데이터(본문 중복)라 읽을거리에서 뺀다
  const scenes = (output.scenes || []).map((s, i) => `${i + 1}. ${s.text}`);
  return [`# ${output.title || ""}`, ...scenes].join("\n\n");
}
