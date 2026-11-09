// v2 이야기(storyPrompts.mjs 출력)를 앱이 쓰는 꿈 객체로 바꾼다.
// - scenes → cuts: 캔버스 렌더러(DreamCanvas)의 쇼트 어휘로 결정적으로 매핑한다.
//   모델에게 쇼트까지 쓰게 하면 평가한 프롬프트가 바뀌므로, 장면의 beat·place·text에서 고른다.
// - causes → causeNodes: 되돌리기 판정기와 호환.
// 순수 JS라 브라우저(아티팩트 폴백)에서도 그대로 쓴다.

const BEAT_STYLE = {
  opening: { mood: "fog", palette: ["#0b0718", "#221338", "#5a3f8a"], camera: "push", events: [] },
  rule: { mood: "swirl", palette: ["#0a0616", "#2f1850", "#8a44c0"], camera: "pan-right", events: ["screenFloat"] },
  wish: { mood: "glow", palette: ["#0e0a24", "#3a2a6a", "#c8a0e8"], camera: "static", events: ["soundRings-phone"] },
  cost: { mood: "echo", palette: ["#0a0616", "#331a55", "#8a4ad0"], camera: "pan-left", events: ["soundRings-friends"] },
  climax: { mood: "maze", palette: ["#090512", "#3d1040", "#c03468"], camera: "push", events: ["shadowGrow"] },
  wake: { mood: "sink", palette: ["#070410", "#241038", "#e8c878"], camera: "pull", events: ["crackLight"] },
};
const BEATS = Object.keys(BEAT_STYLE);
const FRIENDS_BY_BEAT = { opening: "normal", rule: "normal", wish: "normal", cost: "turn", climax: "blur", wake: "none" };

function settingOf(place, text, beat) {
  const s = `${place || ""} ${text || ""}`;
  if (/거울|화장실/.test(place || "")) return "mirrorRoom";
  if (/복도|계단|현관|신발장/.test(place || "")) return "corridor";
  if (/운동장|놀이터|공원|골목|길|버스|밖/.test(place || "")) return "playground";
  if (/교실|학교|칠판|방송실|급식실|과학실|도서관/.test(place || "")) return "classroom";
  if (/방|침대|이불|집|거실|부엌|식탁/.test(place || "")) return "bedroom";
  if (/교실|칠판|책상|선생님/.test(s)) return "classroom";
  if (/침대|이불|베개/.test(s)) return "bedroom";
  return beat === "wake" ? "bedroom" : "void";
}

function shotOf(scene, i, people) {
  const beat = BEAT_STYLE[scene.beat] ? scene.beat : BEATS[Math.min(i, BEATS.length - 1)];
  const style = BEAT_STYLE[beat];
  const text = `${scene.text || ""} ${scene.image || ""}`;
  const names = (people || []).filter(Boolean);
  const hasPeople =
    names.some((n) => text.includes(n)) || /친구|짝꿍|짝|선생님|엄마|아빠|언니|오빠|형|누나|동생|아이들/.test(text);

  const events = new Set(style.events);
  if (/숙제|공책|익힘책|시험|종이|문제집|학습지|독후감|원고지/.test(text)) events.add("paper");
  if (/글자|글씨|문장이|숫자/.test(text) && beat !== "opening") events.add("lettersFall");
  if (/그림자/.test(text)) events.add("shadowGrow");
  if (!hasPeople) events.delete("soundRings-friends");

  const setting = settingOf(scene.place, scene.text, beat);
  // 방 장면에 이름이 나오는 건 대개 화면 속 대화나 문밖 목소리 — 친구 실루엣을 세우지 않는다
  const friends = hasPeople && setting !== "bedroom" ? FRIENDS_BY_BEAT[beat] : "none";
  if (friends === "none") events.delete("soundRings-friends");

  return {
    narration: scene.text || "",
    mood: style.mood,
    palette: style.palette,
    scene: {
      setting,
      me: /폰|휴대폰|핸드폰|화면|태블릿|노트북|채팅|앱/.test(text) ? "phone" : /손을 들|발표/.test(text) ? "raise" : beat === "opening" ? "sit" : "stand",
      friends,
      events: [...events].slice(0, 3),
      camera: style.camera,
    },
  };
}

export function isStory(x) {
  return Boolean(x && Array.isArray(x.scenes) && x.scenes.length >= 3 && Array.isArray(x.causes) && x.causes.length);
}

export function storyToDream(story, material) {
  if (!isStory(story)) throw new Error("story output missing scenes/causes");
  return {
    ...story,
    format: "story",
    causeNodes: story.causes.map((c, i) => ({ ...c, id: c.id || `n${i + 1}` })),
    cuts: story.scenes.map((s, i) => shotOf(s, i, material?.people)),
  };
}
