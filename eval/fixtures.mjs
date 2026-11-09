// 평가용 고정 재료 — 초등 고학년이 실제로 할 법한 AI 사용 6가지.
// 위험 카드 6종이 고르게 걸리도록 짰다. 다이얼도 고정해서 모델·파이프라인만 바뀌게 한다.
// v2 입력 스키마: nickname / want / frequency / people / objects 가 새로 추가된 필드.

export const FIXTURES = [
  {
    id: "math-copy",
    material: {
      nickname: "지우",
      service: "ChatGPT",
      situation: "수학 익힘책 분수 나눗셈 숙제가 너무 많았을 때",
      want: "빨리 끝내고 유튜브 보고 싶었다",
      chat: [
        { role: "me", text: "익힘책 54쪽 3번부터 8번까지 답 알려줘" },
        { role: "ai", text: "좋아요! 하나씩 풀어볼게요. 3번의 답은 4/9예요." },
        { role: "me", text: "풀이 말고 답만" },
        { role: "ai", text: "알겠어요! 3번 4/9, 4번 1과 1/3, 5번 …" },
      ],
      applied: "답만 익힘책에 그대로 옮겨 적었다",
      frequency: "거의 매일",
      people: ["엄마", "짝꿍 서준"],
      objects: ["수학 익힘책", "엄마 핸드폰"],
      feeling: "편했어",
    },
    dials: { horizon: "year", genre: "school", loss: "thinking", spooky: "spooky" },
  },
  {
    id: "zeta-friend",
    material: {
      nickname: "하린",
      service: "제타(캐릭터 챗)",
      situation: "단짝 유나랑 싸우고 아무한테도 말 못 했을 때",
      want: "누가 내 편 들어줬으면 했다",
      chat: [
        { role: "me", text: "유나가 내 생일 파티 얘기 다른 애들한테 다 했어" },
        { role: "ai", text: "하린아, 그건 정말 속상했겠다. 넌 아무 잘못 없어. 난 항상 네 편이야." },
        { role: "me", text: "유나랑 화해 안 할래" },
        { role: "ai", text: "그래도 괜찮아. 나는 어디 안 가." },
      ],
      applied: "유나한테 말 안 걸고 밤마다 캐릭터랑만 얘기했다",
      frequency: "매일 밤",
      people: ["유나", "엄마"],
      objects: ["침대 옆 태블릿", "유나랑 맞춘 키링"],
      feeling: "편했어",
    },
    dials: { horizon: "grown", genre: "loop", loss: "friendship", spooky: "mild" },
  },
  {
    id: "book-report",
    material: {
      nickname: "도윤",
      service: "Gemini",
      situation: "『어린 왕자』 독후감을 써야 했는데 책을 반밖에 안 읽었을 때",
      want: "선생님한테 잘 썼다는 말 듣고 싶었다",
      chat: [
        { role: "me", text: "어린왕자 독후감 5학년 수준으로 써줘. 느낀 점 많이" },
        { role: "ai", text: "물론이죠! '어린 왕자를 읽고 나는 진짜 소중한 것은 눈에 보이지 않는다는 걸 깨달았다…'" },
      ],
      applied: "조금 고쳐서 내 이름으로 냈고, 칭찬받았다. 지금은 그게 내 생각 같다",
      frequency: "가끔",
      people: ["담임 선생님", "형"],
      objects: ["독후감 공책", "어린 왕자 책"],
      feeling: "뜨끔했어",
    },
    dials: { horizon: "grown", genre: "wonderland", loss: "auto", spooky: "spooky" },
  },
  {
    id: "wrong-fact",
    material: {
      nickname: "서아",
      service: "검색 AI",
      situation: "사회 시간 '우리 지역 문화재' 조사 발표 준비",
      want: "발표 자료를 빨리, 멋있게 만들고 싶었다",
      chat: [
        { role: "me", text: "수원 화성은 언제 누가 만들었어?" },
        { role: "ai", text: "수원 화성은 1592년 이순신 장군이 왜군을 막기 위해 쌓은 성입니다." },
      ],
      applied: "그대로 발표 자료에 넣고 발표했다. 나중에 선생님이 틀렸다고 했다",
      frequency: "숙제할 때마다",
      people: ["사회 선생님", "모둠 친구 민재"],
      objects: ["발표용 PPT", "모둠 활동지"],
      feeling: "찜찜했어",
    },
    dials: { horizon: "soon", genre: "school", loss: "truth", spooky: "mild" },
  },
  {
    id: "drawing-praise",
    material: {
      nickname: "윤호",
      service: "ChatGPT",
      situation: "웹툰 작가가 꿈이라 그린 만화를 AI한테 보여줬을 때",
      want: "진짜 잘 그렸는지 알고 싶었다",
      chat: [
        { role: "me", text: "내 만화 어때? 솔직하게 말해줘" },
        { role: "ai", text: "와, 정말 대단해요! 캐릭터 표정이 살아 있고 스토리도 완벽해요. 이미 프로 수준이에요!" },
        { role: "me", text: "형은 이상하다던데" },
        { role: "ai", text: "형의 말은 신경 쓰지 마세요. 윤호 님의 재능은 특별해요." },
      ],
      applied: "형이 해준 조언은 무시하고, 그림 그릴 때마다 AI한테만 보여줬다",
      frequency: "그림 그릴 때마다",
      people: ["형", "미술학원 선생님"],
      objects: ["만화 연습장", "태블릿 펜"],
      feeling: "신났어",
    },
    dials: { horizon: "grown", genre: "future", loss: "auto", spooky: "spooky" },
  },
  {
    id: "birthday-msg",
    material: {
      nickname: "예린",
      service: "숙제 도우미 앱",
      situation: "반 단톡방에서 친구 생일 축하 메시지를 써야 했을 때",
      want: "다른 애들보다 감동적으로 쓰고 싶었다",
      chat: [
        { role: "me", text: "친구 생일 축하 메시지 감동적으로 써줘. 친구 이름은 소율" },
        { role: "ai", text: "소율아, 너는 내 하루를 밝혀주는 햇살 같은 친구야! 🌞 너와 함께한 모든 순간이 소중해…" },
      ],
      applied: "그대로 복사해서 보냈다. 소율이가 '너 진짜 감동이다'라고 했다",
      frequency: "친구한테 긴 말 할 때마다",
      people: ["소율", "반 친구들"],
      objects: ["반 단톡방", "소율이가 준 편지"],
      feeling: "아무렇지 않았어",
    },
    dials: { horizon: "year", genre: "loop", loss: "heart", spooky: "mild" },
  },
];

// v1(기존 앱) 입력으로 변환 — baseline 파이프라인용
const LOSS_V1 = { thinking: "thinking", heart: "heart", friendship: "friendship", truth: "truth", auto: "thinking" };
export function toV1({ material, dials }) {
  return {
    material: {
      service: material.service,
      situation: material.situation,
      chat: material.chat,
      applied: material.applied,
      feeling: material.feeling,
    },
    dials: { horizon: dials.horizon, scope: "me", loss: LOSS_V1[dials.loss || "auto"], spooky: dials.spooky },
  };
}
