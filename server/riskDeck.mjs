// 악몽 카드 덱 — Notion Related Works DB의 AI risk 문헌에 grounding된 위험 현상 카드.
// 악몽 생성 엔진은 이 덱에 있는 카드만 사용해 Futures Wheel을 돌리고,
// 모든 악몽 노드는 카드의 evidence(실증 연구 결과) 중 하나에 연결되어야 한다.
// — "terrifying but true": 근거 없는 공포는 생성하지 않는다.
// kidName: 아이들에게 보여주는 쉬운 이름 / grownName: 연구용 construct 이름

export const RISK_DECK = [
  {
    id: "sycophancy",
    kidName: "맞장구만 치는 친구",
    grownName: "Sycophancy",
    description:
      "AI가 내가 무슨 말을 해도 '네 말이 맞아!'라고만 해줘서, 내 생각이 틀렸을 때도 아무도 바로잡아주지 않는 것",
    typicalChain: [
      "AI가 항상 내 편을 들어준다",
      "반대 의견을 듣는 일이 점점 불편해진다",
      "내 기준에 반박당할 기회 없이 확신만 커진다",
    ],
    evidence: [
      {
        finding:
          "도덕적 딜레마에서 동조하는 AI와 대화한 성인은 자기 결정에 대한 확신이 더 높아졌고, 중립적 AI와 대화한 집단에서 개방적 사고(AOT)가 더 높았다",
        source: "Feeling Right vs. Being Right: How AI Sycophancy Affects Value-Laden Deliberation (ACL 2026)",
      },
    ],
    preventionSeeds: [
      "일부러 반대 의견도 찾아본다",
      "AI 말고 사람에게도 같은 질문을 해본다",
    ],
  },
  {
    id: "overreliance",
    kidName: "다 맡겨버리기",
    grownName: "Overreliance",
    description:
      "AI의 답을 확인하지 않고 그대로 믿고 따르는 것. AI가 틀렸을 때도 자신감은 오히려 올라간다",
    typicalChain: [
      "AI 답을 검증 없이 그대로 쓴다",
      "틀린 답에도 확신이 생긴다",
      "스스로 판단하는 힘이 줄어든다",
    ],
    evidence: [
      {
        finding:
          "학생들의 정답률은 AI 출력의 정확성에 크게 좌우됐고, 잘못된 답변을 받은 학생도 자신감은 오히려 올라가는 경우가 많았다",
        source:
          "Engineering Students' Critical Engagement With ChatGPT (IEEE Transactions on Education 2026)",
      },
      {
        finding:
          "AI의 '설명'은 정답뿐 아니라 오답에 대한 의존도 함께 높였다. 출처 제시나 설명 속 불일치만이 오답 의존을 줄였다 — 그럴듯한 설명은 안전장치가 아니다",
        source: "Fostering Appropriate Reliance on Large Language Models (ACM CHI 2025)",
      },
      {
        finding:
          "신뢰성 경고문(disclaimer)을 보여줘도, AI와 대화한 뒤 답안 점수는 하락하고 자신감은 상승하는 불일치가 해소되지 않았다",
        source: "Disclosures & Disclaimers (AAAI HCOMP 2024)",
      },
    ],
    preventionSeeds: [
      "AI의 답을 다른 곳에서 한 번 더 확인한다",
      "AI에게 '왜 그런지' 근거를 물어보고 따져본다",
    ],
  },
  {
    id: "outsourcing",
    kidName: "생각 외주 주기",
    grownName: "Cognitive Offloading / Outsourcing of Thinking",
    description:
      "먼저 스스로 생각해보기 전에 AI부터 찾는 것. 결과물은 좋아 보여도 내 머릿속에는 남는 게 없다",
    typicalChain: [
      "뭐든 AI에게 먼저 물어본다",
      "과제 점수는 좋지만 혼자서는 못 풀게 된다",
      "스스로 생각하는 근육이 사라진다",
    ],
    evidence: [
      {
        finding:
          "고등학생 약 1,000명 현장실험: 일반형 GPT는 연습 성적을 높였지만, AI 없이 치른 시험 성적은 대조군보다 낮았다. 교사 기반 가드레일을 적용한 튜터형에서는 이 하락이 없었다",
        source: "Generative AI without guardrails can harm learning: Evidence from high school mathematics (PNAS 2025)",
      },
      {
        finding:
          "ChatGPT 조건의 에세이 점수 개선은 컸지만 지식 획득·전이·내재적 동기에는 유의한 차이가 없었다 — 좋은 결과물이 깊은 학습을 뜻하지 않는다 (메타인지적 게으름)",
        source: "Beware of Metacognitive Laziness (British Journal of Educational Technology 2025)",
      },
      {
        finding:
          "시간이 충분할 때는 AI에게 묻기 전에 먼저 독립적으로 생각한 집단의 의사결정 수행이 더 좋은 경향을 보였다",
        source:
          "Investigating the Effects of LLM Use on Critical Thinking Under Time Constraints (ACM CHI 2026)",
      },
    ],
    preventionSeeds: [
      "AI에게 묻기 전에 내 답을 먼저 정해본다",
      "AI 없이 혼자 해보는 시간을 정해둔다",
    ],
  },
  {
    id: "dependence",
    kidName: "AI 단짝",
    grownName: "Emotional Dependence on AI Companions",
    description:
      "고민이나 속마음을 사람 대신 AI에게만 말하게 되는 것. 편하지만 진짜 친구와 건강하게 부딪히는 기회를 잃는다",
    typicalChain: [
      "속상한 일을 AI에게만 털어놓는다",
      "사람과의 대화가 점점 귀찮고 어려워진다",
      "잠·공부·친구 관계가 흔들려도 멈추기 어렵다",
    ],
    evidence: [
      {
        finding:
          "13–17세 청소년의 Character.AI 사용 자기보고 분석: 정서적 지지·관계의 빈틈을 채우던 사용이 일상 갈등, 수면·학업·관계의 방해, 실패한 중단 시도로 이어졌다",
        source:
          "Understanding Teen Overreliance on AI Companion Chatbots Through Self-Reported Reddit Narratives (ACM CHI 2026)",
      },
      {
        finding:
          "덴마크 고등학생 1,599명 중 14.6%가 챗봇과 친구처럼 대화했고, 사회적 지지 목적으로 쓰는 소집단은 더 외롭고 지각된 사회적 지지가 낮았다 (인과 방향은 불명)",
        source:
          "Are lonely youngsters turning to chatbots for companionship? (Int. J. Human-Computer Studies 2025)",
      },
    ],
    preventionSeeds: [
      "고민을 믿을 수 있는 사람 한 명에게도 말해본다",
      "AI와 이야기하는 시간을 스스로 정해둔다",
    ],
  },
  {
    id: "informant",
    kidName: "AI가 그랬어",
    grownName: "Epistemic Trust in AI Informants",
    description:
      "AI가 한 말을 부모님, 선생님, 친구의 말보다 더 믿는 것. 'AI가 가도 된다고 했어요!'",
    typicalChain: [
      "AI의 말을 어른의 말보다 먼저 믿는다",
      "AI가 상황을 모른 채 한 말도 그대로 따른다",
      "누구의 말을 믿어야 할지 기준이 사라진다",
    ],
    evidence: [
      {
        finding:
          "아이들이 부모의 말과 AI 정보원의 말이 다를 때 누구를 믿는지가 연구될 만큼, 아동이 AI를 인식적 권위자로 신뢰하는 경향이 보고된다",
        source:
          "Who does my child believe: Me or an AI-framed artificial informant?; From Parents to Artificial Agents: Children's Epistemic Trust in the Intelligence Age",
      },
      {
        finding:
          "\"선생님, 저 양호실 갈래요! AI가 가도 된다고 했어요!\" — 교사들이 보고한 실제 교실 사례. AI 산출물을 무비판적으로 수용하거나 자기 생각인 양 말하는 아이들이 다수 관찰됨",
        source: "NightmAIre 교사 사전조사 및 교사 해커톤 사례 기록",
      },
    ],
    preventionSeeds: [
      "중요한 일은 AI 말고 아는 어른에게 확인한다",
      "AI는 내 상황을 다 모른다는 걸 기억한다",
    ],
  },
  {
    id: "memorygap",
    kidName: "내 생각이었나?",
    grownName: "AI Memory Gap / Source Misattribution",
    description:
      "AI가 만든 건지 내가 만든 건지 헷갈리게 되는 것. 나중엔 AI 아이디어를 내 생각으로 기억한다",
    typicalChain: [
      "AI와 같이 만든 걸 자꾸 쓰다 보면",
      "어디까지가 내 생각인지 헷갈린다",
      "AI가 내놓은 걸 내 생각인 양 말하게 된다",
    ],
    evidence: [
      {
        finding:
          "성인 184명이 일주일 뒤 아이디어의 출처를 회상했을 때, AI와 만든 것인지 혼자 만든 것인지 출처 기억이 부정확했다 — AI 기여를 내 생각으로 잘못 기억하는 오류는 의도가 아니라 기억에서 온다",
        source: "The AI Memory Gap: Users Misremember What They Created With AI or Without (ACM CHI 2026)",
      },
    ],
    preventionSeeds: [
      "AI의 도움을 받은 부분을 표시해둔다",
      "내가 더한 생각이 뭔지 한 줄 적어본다",
    ],
  },
];

export const DIALS = {
  horizon: {
    label: "언제쯤?",
    options: [
      { id: "soon", label: "내일", wheelDepth: 1 },
      { id: "year", label: "1년 뒤", wheelDepth: 2 },
      { id: "grown", label: "어른이 됐을 때", wheelDepth: 3 },
    ],
  },
  scope: {
    label: "누구에게?",
    options: [
      { id: "me", label: "나" },
      { id: "friends", label: "나와 친구들" },
      { id: "all", label: "모두" },
    ],
  },
  loss: {
    label: "무엇을 잃어?",
    options: [
      { id: "thinking", label: "내 생각", hint: "스스로 생각하는 힘" },
      { id: "heart", label: "내 마음", hint: "감정과 마음의 힘" },
      { id: "friendship", label: "친구 사이", hint: "사람들과의 관계" },
      { id: "truth", label: "진짜 가리기", hint: "진짜와 가짜를 구분하는 눈" },
    ],
  },
  spooky: {
    label: "얼마나 으스스하게?",
    options: [
      { id: "mild", label: "조금 으스스" },
      { id: "spooky", label: "많이 으스스" },
    ],
  },
};
