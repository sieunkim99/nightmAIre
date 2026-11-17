// Versioned research records. Taxonomy coverage is distinct from reviewed mechanisms.
export const LIBRARY_VERSION = "2026-11-17.1";
export const TAXONOMY = {
  source: "https://www.usenix.org/system/files/soups2025-yu.pdf",
  version: "SOUPS 2025, Table 3",
  discrepancy: "Table 3 lists 14 medium items; Figure 1 caption says 15. Earlier project snapshot used 13.",
  items: [["bias.hate", "혐오·극단주의 콘텐츠"], ["bias.stereotypes", "암묵적 편향·고정관념"], ["toxicity.content", "시스템의 유해 콘텐츠 생성"], ["toxicity.interaction", "유해 상호작용의 시뮬레이션"], ["misuse.unintentional", "비의도적 오용"], ["misuse.malicious", "악의적 악용"], ["wellbeing.overreliance", "과도한 의존"], ["wellbeing.response", "정신적 어려움에 대한 부적절한 대응"], ["wellbeing.bonding", "일방적 관계 유대"], ["privacy.system", "시스템 개인정보 위험"], ["privacy.interaction", "상호작용 개인정보 위험"], ["development.behavior", "유해 행동에 대한 영향"], ["development.boundary", "동의·경계 침해"], ["development.social", "사회·정서 발달 위험"]].map(([id, label]) => ({
    id,
    label
  })),
  pathways: ["reciprocal", "intrapersonal", "interpersonal", "system_initiated"]
};
export const SOURCES = [{
  id: "R-learning",
  title: "Bastani et al. (2025)",
  url: "https://www.pnas.org/doi/10.1073/pnas.2422633122",
  method: "고등학교 수학 현장실험",
  location: "Results: independent exam performance",
  reviewStatus: "scoped_for_prototype"
}, {
  id: "R-yair",
  title: "Yu et al. (SOUPS 2025)",
  url: TAXONOMY.source,
  method: "청소년 대화·온라인 논의·사건 보고의 질적 분류",
  location: "§4.4 and Tables 1, 3",
  reviewStatus: "scoped_for_prototype"
}, {
  id: "R-social",
  title: "Fang et al. (2025), v2",
  url: "https://arxiv.org/html/2503.17473v2",
  method: "성인 대상 4주 무작위 배정 연구와 실제 사용량의 관찰적 분석",
  location: "Results; Participants and Recruitment",
  reviewStatus: "scoped_for_prototype"
}];
export const CLAIMS = [{
  id: "C-learning",
  sourceId: "R-learning",
  finding: "완성 답안에 접근하는 일반형 도움과 학습 보호형 도움의 독립 수행 결과가 달랐다.",
  limits: "특정 고등학교 수학·단기 결과. 초등학생 개인의 장기 능력 상실이나 매개 과정 전체를 입증하지 않는다."
}, {
  id: "C-information",
  sourceId: "R-yair",
  finding: "부정확한 AI 출력에 의존해 판단하는 비의도적 오용이 위험 분류와 사례에 포함된다.",
  limits: "위험 사례의 분류이지 인과 효과 크기·발생 확률·장기 발달 실험이 아니다."
}, {
  id: "C-social",
  sourceId: "R-social",
  finding: "대화 방식·사용량·개인차에 따라 관계 및 의존 지표의 양상이 달랐고, 사용량 관련 분석은 관찰적이다.",
  limits: "성인 표본. 사용량과 결과의 연관을 사용량의 무작위 배정 효과로 해석하거나 아동에게 일반화하지 않는다. 친밀감 자체가 항상 해롭다는 결론이 아니다."
}];
export const MECHANISMS = [{
  id: "practice-substitution",
  label: "독립적으로 시도할 기회의 대체",
  taxonomyIds: ["wellbeing.overreliance"],
  claimIds: ["C-learning"],
  status: "conditional_interpretation",
  conditions: ["완성 답을 자신의 시도 대신 사용"],
  process: "단기 편리함이 독립적 시도의 기회를 대체할 수 있음",
  counterConditions: ["먼저 시도", "힌트 중심", "별도의 독립 연습"],
  limits: "조건부 해석. 기억 삭제·성인기 퇴화를 사실로 예측하지 않음"
}, {
  id: "unchecked-acceptance",
  label: "검증 없이 출력에 의존하는 판단",
  taxonomyIds: ["misuse.unintentional"],
  claimIds: ["C-information"],
  status: "case_grounded_hypothesis",
  conditions: ["출력을 확인하지 않고 판단의 근거로 이용"],
  process: "그럴듯한 출력과 확인 부재가 잘못된 믿음·결정으로 이어질 가능성",
  counterConditions: ["다른 출처 확인", "오류 발견·수정", "불확실성 표시"],
  limits: "사례를 바탕으로 한 가능성. 이 아이의 실제 피해를 추정하지 않음"
}, {
  id: "relationship-displacement",
  label: "실제 사람과의 활동을 대체하는 사용",
  taxonomyIds: ["wellbeing.bonding", "development.social"],
  claimIds: ["C-social"],
  status: "adjacent_evidence_hypothesis",
  conditions: ["사람과의 대화·활동을 대신하는 사용"],
  process: "상호작용의 시간·기회 배분이 변할 가능성",
  counterConditions: ["사람과 대화하는 연습", "보완적 사용", "지속되는 주변 관계"],
  limits: "성인 연구 참고. 아이의 관계 상실을 인과적으로 입증한 기제가 아님"
}];
export function bundleFor(matches) {
  const mechanisms = matches.map(m => ({
    ...MECHANISMS.find(x => x.id === m.mechanismId),
    match: m
  }));
  const claimIds = new Set(mechanisms.flatMap(m => m.claimIds));
  const claims = CLAIMS.filter(c => claimIds.has(c.id));
  return {
    libraryVersion: LIBRARY_VERSION,
    mechanisms,
    claims,
    sources: SOURCES.filter(s => claims.some(c => c.sourceId === s.id))
  };
}
