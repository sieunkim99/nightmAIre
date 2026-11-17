import { bundleFor } from "./library.mjs";
import { normalizeSeed, normalizeSelection, validateFutures, validatePackage } from "./contracts.mjs";
export const DEMO_MATERIAL = {
  kind: "example",
  situation: "수학 숙제를 끝내고 게임하고 싶은 아이가 있는 학교",
  want: "빨리 끝내고 놀고 싶어",
  applied: "완성 답을 그대로 옮겼다는 가상 설정",
  feeling: "",
  object: "지우개",
  veto: "",
  confirmed: true
};
export function demoPrepared() {
  const seed = normalizeSeed(DEMO_MATERIAL);
  const grounding = bundleFor([{
    mechanismId: "practice-substitution",
    applicability: "hypothetical",
    reason: "검토용 가상 설정이며 사용자 경험을 분석한 것이 아님",
    transferLimit: "고등학교 단기 실험과 초등학생의 상상 사이의 차이",
    seedRefs: ["E-applied"]
  }]);
  const data = [["F1", "저절로 완성되는 공책", "만약 모든 숙제를 AI가 대신한다면?", "완성 답이 모든 과제를 대신함", "숙제를 끝낼 시간을 얻음", "설명할 기회에 자기 풀이가 필요해질 수 있음"], ["F2", "도장 계단 학교", "만약 제출 속도만 점수가 된다면?", "학교가 이해보다 속도를 보상함", "빨리 낼수록 평가에서 유리함", "질문하는 시간의 가치가 줄어들 수 있음"], ["F3", "한 줄씩 자라는 발판", "만약 먼저 시도한 뒤 힌트를 받는다면?", "먼저 풀고 필요한 만큼만 도움을 받음", "자기 풀이와 도움을 함께 이용함", "독립적 시도의 기회를 유지할 수 있음"]];
  const futures = {
    candidates: data.map(([id, title, preview, assumption, benefit, result]) => ({
      id,
      title,
      preview,
      mechanismIds: ["practice-substitution"],
      assumptions: [{
        id: `${id}-A`,
        text: assumption
      }],
      events: [{
        id: `${id}-E1`,
        text: benefit,
        actor: "ai",
        order: 1,
        timeframe: "상상한 학교의 하루",
        outcome: "benefit"
      }, {
        id: `${id}-E2`,
        text: result,
        actor: "institution",
        order: 2,
        timeframe: "이 조건이 이어질 때",
        outcome: id === "F3" ? "uncertain" : "risk"
      }],
      edges: [{
        from: `${id}-E1`,
        to: `${id}-E2`,
        relation: "hypothesis",
        rationale: "이 제도·지원 조건이 유지된다는 창작 가정",
        claimIds: ["C-learning"],
        assumptionIds: [`${id}-A`]
      }]
    }))
  };
  validateFutures(futures, grounding);
  return {
    action: "continue",
    version: 3,
    seed,
    grounding,
    futures
  };
}
export function demoGenerated(prepared, input) {
  const selection = normalizeSelection(input, prepared);
  const selected = prepared.futures.candidates.filter(c => selection.candidateIds.includes(c.id));
  const object = selection.object || "지우개";
  const texts = {
    F1: "공책을 펼치자 답이 저절로 채워졌다. 나는 운동장 쪽으로 몸을 돌렸다. 누군가 풀이를 묻자, 완성된 글자들이 입가에서 종이 조각으로 흩어졌다.",
    F2: "제출 도장이 계단처럼 솟았다. 빨리 낼수록 교실은 높아졌다. 질문하는 친구의 발밑에서는 계단이 잠깐 멈췄다.",
    F3: "풀이를 한 줄 써 보자 작은 발판이 생겼다. 막힌 곳에는 힌트가 빛났다. 아직 비어 있는 다음 칸은 내가 디딜 자리를 기다렸다."
  };
  const scenes = [{
    id: "S-entry",
    worldId: `W-${selected[0].id}`,
    eventIds: [selected[0].events[0].id],
    beat: "entry",
    place: "꿈의 교실",
    text: `꿈의 교실에 들어선 내 손에는 ${object} 하나가 들려 있었다. 창밖에는 쉬는 시간이 기다리고 있었다.`,
    image: `작은 ${object}을 든 아이와 기묘한 교실`
  }];
  for (const c of selected) scenes.push({
    id: `S-${c.id}`,
    worldId: `W-${c.id}`,
    eventIds: c.events.map(e => e.id),
    beat: "crossing",
    place: c.title,
    text: texts[c.id],
    image: `${c.title}의 창작 규칙을 표현한 조용한 그림책 장면`
  });
  scenes.push({
    id: "S-ending",
    worldId: `W-${selected.at(-1).id}`,
    eventIds: [selected.at(-1).events[1].id],
    beat: "ending",
    place: "베개 옆",
    text: `손에 든 물건으로 교실의 경계를 문질렀다. ${selected.length > 1 ? "서로 다른 학교의 조각이 잠깐 겹쳤다." : "교실은 작은 종이처럼 접혔다."} 눈을 뜨니 베개 옆에 빈 쪽지 한 장이 놓여 있었다.`,
    image: `베개와 ${object}, 접힌 교실 모양의 종이 조각. 글자 없음`
  });
  const blueprint = {
    worlds: selected.map(c => ({
      id: `W-${c.id}`,
      rule: c.preview,
      candidateIds: [c.id]
    })),
    scenes: scenes.map(({
      id,
      worldId,
      eventIds
    }) => ({
      id,
      worldId,
      eventIds
    })),
    transitions: scenes.slice(1).map((s, i) => ({
      from: scenes[i].id,
      to: s.id,
      kind: i === 0 ? "continuation" : "world_jump",
      anchor: object
    })),
    defaultPath: scenes.map(s => s.id),
    childContribution: `선택한 세계 ${selected.map(c => c.title).join(", ")}만 연결. ${object}이 이동을 매개함. 추가 쪽지 ${selection.note ? "있음(데모에서는 자유 가정의 실제 생성은 하지 않음)" : "없음"}.`
  };
  const story = {
    title: "접힌 교실",
    logline: "서로 다른 학교의 꿈",
    trace: "베개 옆의 빈 쪽지",
    scenes
  };
  validatePackage({
    blueprint,
    story
  }, prepared, selection);
  return {
    ...story,
    pipelineVersion: 3,
    format: "story",
    blueprint,
    causes: [],
    riskCardIds: [],
    provenance: {
      seed: prepared.seed,
      grounding: prepared.grounding,
      futures: prepared.futures,
      selection,
      review: {
        type: "authored_demo"
      },
      reviewIsScientificValidation: false
    }
  };
}
