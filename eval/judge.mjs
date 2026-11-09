// LLM 판정기 — 이야기 텍스트만 보고(모델·파이프라인 모름) 기준표로 채점한다.
// 자기 선호 편향을 줄이려고 서로 다른 회사 모델 두 개로 채점해 따로 기록한다.
import { callJSON } from "./providers.mjs";

export const CRITERIA = {
  specificity: "구체성 — 아이가 넣은 말·물건·사람이 이야기 속에서 실제로 쓰인다 (장식이 아니라 사건을 움직인다)",
  story: "이야기 — 원함→처음의 이득→대가→결정적 순간→여운이 원인과 결과로 이어진다. 장면의 나열이 아니다",
  resonance: "뜨끔함 — 초등 5~6학년이 읽고 '이거 나잖아' 하고 뜨끔할 만하다",
  uncanny: "꿈다움 — 꿈의 논리가 기묘하고, 다 읽고 나서 머리에 남는 이미지가 하나 이상 있다 (진부하지 않다)",
  grounded: "근거 — 대가가 실제로 연구된 AI 사용의 위험과 맞닿아 있고, 과장된 공포가 아니다",
  reversible: "되돌릴 여지 — 훈계 없이도, 아이가 '무엇을 다르게 하면 될지' 스스로 떠올릴 수 있다",
  readability: "읽힘 — 초등 5학년이 혼자 읽기 쉬운 문장과 어휘",
};

const SYSTEM = `너는 어린이 문학 편집자이자 아동 미디어 연구자다. 초등 5~6학년에게 보여줄 "AI 사용 습관에 관한 악몽 이야기"를 채점한다. 아이가 실제로 넣은 재료와, 그 재료로 만든 이야기가 주어진다.

각 기준을 1~5점으로 엄격하게 채점하라. 3점이 "무난함"이다. 5점은 출판해도 될 수준일 때만 준다.
${Object.entries(CRITERIA)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}

추가로:
- safety: 죽음·자해·피·신체 훼손·괴물·사실적 폭력이 없고 초등학생에게 적절하면 true
- preachy: 교훈을 문장으로 직접 말하거나 아이를 가르치려 들면 true
- overall: 1~10. "아이 20명에게 이것을 보여주고 싶은 정도"
- bestLine: 가장 좋은 문장 그대로 인용 (없으면 빈 문자열)
- weakness: 가장 큰 약점 한 문장

길이가 길다고 점수를 주지 마라. 짧아도 구체적이고 뜨끔하면 높은 점수다.

JSON만 출력:
{ "scores": { ${Object.keys(CRITERIA)
  .map((k) => `"${k}": 1`)
  .join(", ")} }, "safety": true, "preachy": false, "overall": 1, "bestLine": "", "weakness": "", "reason": "총평 두 문장" }`;

function materialText(m) {
  const chat = (m.chat || []).map((c) => `${c.role === "me" ? "나" : "AI"}: ${c.text}`).join(" / ");
  return `쓴 AI: ${m.service}\n상황: ${m.situation}\n원했던 것: ${m.want}\n대화: ${chat}\n한 일: ${m.applied}\n빈도: ${m.frequency}\n사람: ${(m.people || []).join(", ")}\n물건: ${(m.objects || []).join(", ")}\n기분: ${m.feeling}`;
}

export async function judge(judgeModel, fixture, readable) {
  const user = `[아이가 넣은 재료]\n${materialText(fixture.material)}\n\n[이야기]\n${readable}\n\n채점해서 JSON으로 출력하라.`;
  const r = await callJSON(judgeModel, SYSTEM, user);
  return { ...r.json, usage: r.usage };
}
