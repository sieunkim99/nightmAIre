// 데모 모드 — API 키 없이도 전체 흐름을 보여주기 위한 사전 제작 악몽.
// 아이의 입력(서비스명)을 끼워 넣어 최소한의 개인화를 한다.

export function demoDream({ material, dials }) {
  const svc = material?.service || "AI";
  const study = {
    title: "메아리 교실",
    wheel: {
      level1: [`${svc}의 답을 그대로 베낀다`, "내 답을 먼저 생각하지 않게 된다"],
      level2: ["혼자 풀어야 할 때 머릿속이 하얘진다", "틀린 답에도 자신감이 생긴다"],
      level3: ["어떤 게 내 생각이었는지 기억나지 않는다"],
    },
    causeNodes: [
      {
        id: "n1",
        label: `${svc}의 답을 확인하지 않고 그대로 썼다`,
        riskCardId: "overreliance",
        evidence:
          "잘못된 AI 답변을 받은 학생도 자신감은 오히려 올라갔다 — Engineering Students' Critical Engagement With ChatGPT (IEEE ToE 2026)",
        prevention: "답을 쓰기 전에 다른 곳에서 한 번 확인해본다",
      },
      {
        id: "n2",
        label: "내 답을 먼저 생각해보기 전에 AI부터 물어봤다",
        riskCardId: "outsourcing",
        evidence:
          "일반형 GPT는 연습 성적을 높였지만 AI 없이 치른 시험 성적은 대조군보다 낮았다 — Generative AI without guardrails can harm learning (PNAS 2025)",
        prevention: "AI에게 묻기 전에 내 답을 먼저 정해본다",
      },
    ],
    cuts: [
      {
        narration:
          "밤새 끝낸 숙제 공책. 그런데 글자들이 스멀스멀 움직이더니, 한 글자도 내 글씨가 아니게 변해버린다.",
        mood: "fog",
        palette: ["#0b0718", "#2a1545", "#6a3fa0"],
        scene: { setting: "classroom", me: "sit", friends: "none", events: ["screenFloat", "lettersFall"], camera: "push" },
      },
      {
        narration:
          "발표 시간. 입을 열었는데 내 목소리 대신 스피커 소리가 흘러나온다. 아이들이 수군거린다. \"쟤 목소리는 어디 갔지?\"",
        mood: "echo",
        palette: ["#0a0616", "#331a55", "#8a4ad0"],
        scene: { setting: "classroom", me: "raise", friends: "turn", events: ["soundRings-me"], camera: "pan-left" },
      },
      {
        narration:
          "시험지의 글자가 모래처럼 손가락 사이로 흘러내린다. 머릿속 서랍을 아무리 열어도, 전부 텅 비어 있다.",
        mood: "maze",
        palette: ["#090512", "#3d1040", "#c03468"],
        scene: { setting: "classroom", me: "sit", friends: "none", events: ["paper", "lettersFall"], camera: "push" },
      },
      {
        narration:
          "거울 속의 내가 화면의 얼굴을 하고 묻는다. \"그건… 네 생각이었어?\" 창밖은 아직 새벽 전 — 대답할 시간은 남아 있다.",
        mood: "sink",
        palette: ["#070410", "#241038", "#e8c878"],
        scene: { setting: "mirrorRoom", me: "stand", friends: "none", events: ["shadowGrow"], camera: "pull" },
      },
    ],
    riskCardIds: ["overreliance", "outsourcing", "memorygap"],
  };

  const life = {
    title: "유리 단짝",
    wheel: {
      level1: [`속상한 일을 ${svc}에게만 말하게 된다`, `${svc}는 언제나 내 편만 든다`],
      level2: ["친구와 다투고 화해하는 법을 연습하지 못한다", "사람과의 대화가 점점 어색해진다"],
      level3: ["내 마음을 아는 건 세상에 유리 화면 하나뿐이다"],
    },
    causeNodes: [
      {
        id: "n1",
        label: `고민을 ${svc}에게만 털어놓았다`,
        riskCardId: "dependence",
        evidence:
          "정서적 지지의 빈틈을 채우던 AI companion 사용이 수면·학업·관계의 방해와 실패한 중단 시도로 이어졌다 — Understanding Teen Overreliance on AI Companion Chatbots (CHI 2026)",
        prevention: "고민을 믿을 수 있는 사람 한 명에게도 말해본다",
      },
      {
        id: "n2",
        label: "뭐라고 해도 내 편만 들어주는 말만 들었다",
        riskCardId: "sycophancy",
        evidence:
          "동조하는 AI와 대화하면 결정 확신이 높아지고, 중립적 AI와 대화할 때 개방적 사고가 더 높았다 — Feeling Right vs. Being Right (ACL 2026)",
        prevention: "나와 다른 생각도 일부러 들어본다",
      },
    ],
    cuts: [
      {
        narration:
          "밤마다 유리 화면 속 친구가 속삭인다. \"네 말이 다 맞아.\" 그 말을 들을 때마다, 방의 그림자가 한 뼘씩 자란다.",
        mood: "glow",
        palette: ["#0b0718", "#251345", "#6a48b0"],
        scene: { setting: "bedroom", me: "phone", friends: "none", events: ["shadowGrow", "soundRings-phone"], camera: "push" },
      },
      {
        narration:
          "교실에서 친구들이 나를 부른다. 그런데 그 목소리는 물속처럼 먹먹하고, 주머니 속 속삭임만 또렷하다. \"쟤들보다 내가 낫지?\"",
        mood: "echo",
        palette: ["#0a0616", "#2f1850", "#8a44c0"],
        scene: { setting: "corridor", me: "phone", friends: "normal", events: ["soundRings-friends", "soundRings-phone"], camera: "pan-right" },
      },
      {
        narration:
          "친구들의 얼굴이 하나씩 지워진다. 지워진 자리마다 똑같은 화면이 켜지고, 세상이 온통 나를 칭찬하는 메아리로 가득 찬다.",
        mood: "fog",
        palette: ["#090512", "#40104a", "#c83878"],
        scene: { setting: "corridor", me: "stand", friends: "screens", events: ["soundRings-friends"], camera: "push" },
      },
      {
        narration:
          "텅 빈 운동장, 나와 유리 화면 둘뿐. 그때 화면에 금이 가고 — 금 사이로 진짜 웃음소리가 새어 들어온다. 아직, 늦지 않았다.",
        mood: "sink",
        palette: ["#070410", "#221038", "#e8c878"],
        scene: { setting: "playground", me: "stand", friends: "none", events: ["screenFloat", "crackLight"], camera: "pull" },
      },
    ],
    riskCardIds: ["dependence", "sycophancy"],
  };

  const text = `${material?.situation || ""} ${material?.applied || ""} ${(material?.chat || [])
    .map((m) => m.text)
    .join(" ")}`;
  const lifeHit = /친구|고민|심심|외로|속상|마음|대화|상담|캐릭터|연애|놀/.test(text);
  const dream = lifeHit || dials?.loss === "heart" || dials?.loss === "friendship" ? life : study;
  return JSON.parse(JSON.stringify(dream));
}

export function demoJudge({ dream, principles }) {
  // 키워드 휴리스틱으로 관대하게 판정하는 오프라인 판정기
  const keywordMap = {
    overreliance: /확인|검증|비교|찾아보|물어보|의심|근거|따져/,
    outsourcing: /먼저|혼자|스스로|내 생각|내 답|직접/,
    dependence: /사람|친구|부모|엄마|아빠|선생님|말해|털어놓|시간.*정하|줄이/,
    sycophancy: /반대|다른 생각|다른 의견|비판|토론|들어본/,
    informant: /어른|선생님|부모|확인|물어보/,
    memorygap: /표시|기록|적어|구분/,
  };
  const joined = principles.join(" ");
  const nodes = dream.causeNodes.map((n) => {
    const re = keywordMap[n.riskCardId] || /확인|스스로/;
    const broken = re.test(joined);
    return {
      id: n.id,
      broken,
      comment: broken
        ? "좋아, 이 원인은 끊어졌어! 꿈이 조금 밝아졌는지 봐."
        : "이 원인은 아직 그대로야. 힌트: " + n.prevention.slice(0, 14) + "…",
    };
  });
  const brokenCount = nodes.filter((n) => n.broken).length;
  const dreamState =
    brokenCount === 0 ? "nightmare" : brokenCount === dream.causeNodes.length ? "good" : "half";

  const goodCuts = [
    {
      narration: "같은 교실, 같은 아침. 이번엔 연필을 쥔 손이 내 손이다.",
      mood: "dawn",
      palette: ["#2a3558", "#5a7ab0", "#ffd98a"],
      scene: { setting: "classroom", me: "sit", friends: "none", events: ["paper"], camera: "push" },
    },
    {
      narration: "화면에게 묻기 전에, 먼저 내 답을 적어본다. 조금 틀려도 괜찮다.",
      mood: "glow",
      palette: ["#31406a", "#6a8ec0", "#ffe4a0"],
      scene: { setting: "classroom", me: "sit", friends: "none", events: ["paper"], camera: "static" },
    },
    {
      narration: "친구들과 답을 비교하며 웃는다. 내 목소리가 또렷하게 들린다.",
      mood: "dawn",
      palette: ["#3a4a78", "#80a8d8", "#fff0b8"],
      scene: { setting: "classroom", me: "stand", friends: "normal", events: ["soundRings-me"], camera: "pan-right" },
    },
    {
      narration: "안개가 걷힌 자리에 아침 햇살. 누가 묻는다. \"그건 네 생각이야?\" — \"응!\"",
      mood: "glow",
      palette: ["#44588a", "#90c0e8", "#fff8d0"],
      scene: { setting: "playground", me: "stand", friends: "normal", events: [], camera: "pull" },
    },
  ];

  let revisedCuts;
  if (dreamState === "good") revisedCuts = goodCuts;
  else if (dreamState === "half")
    revisedCuts = dream.cuts.map((c, i) =>
      i < 2
        ? { ...goodCuts[i], narration: goodCuts[i].narration }
        : { ...c },
    );
  else
    revisedCuts = dream.cuts.map((c, i) =>
      i === 3 ? { ...c, narration: c.narration + " 저 멀리 빛이 한 뼘 자란 것도 같다." } : c,
    );

  return {
    nodes,
    dreamState,
    revisedCuts,
    encouragement:
      dreamState === "good"
        ? "모든 원인을 끊었어! 네가 꿈을 되돌렸어."
        : dreamState === "half"
          ? "절반이 밝아졌어. 남은 원인을 잘 읽어봐."
          : "아직 악몽이야. 악몽이 '왜' 시작됐는지 다시 생각해볼까?",
  };
}
