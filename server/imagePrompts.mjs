// 장면 그림 프롬프트 — 6장면이 한 권의 그림책처럼 보이도록 화풍·주인공을 고정하고,
// 장면마다 storyPrompts의 scene.image(화면에 보이는 것)와 장소·분위기만 바꾼다.

const STYLE = `Style: a handmade, slightly surreal picture-book illustration for Korean 11-year-olds — paper cut-outs, clay and felt textures, like a stop-motion dream set. Muted night palette (indigo, violet, deep plum) with one small warm light source. Soft film grain. Simple faces with small dot eyes, gentle expressions. Calm, strange and quiet rather than scary.
Never: blood, injury, monsters, weapons, horror gore, realistic photo style, written words, letters, captions, speech bubbles or UI text.`;

const BEAT_MOOD = {
  opening: "An ordinary, real-life moment. Cozy but a little lonely.",
  rule: "The first small impossible thing appears. Curious and odd.",
  wish: "A wish comes true. Warm, glowing, genuinely appealing.",
  cost: "Something is quietly missing. The warmth feels slightly wrong.",
  climax: "The decisive moment. Empty space, held breath, one strong contrast.",
  wake: "Early morning after waking. Pale dawn light, one leftover trace of the dream.",
};

export function hero(material) {
  const name = material?.nickname || "the child";
  return `Main character: ${name}, a Korean 5th-grade child in a mustard-yellow hoodie, short dark hair. Keep them recognizable in every picture.`;
}

export function scenePrompt({ scene, material, title, index, total }) {
  const people = (material?.people || []).length ? `Other people who may appear: ${material.people.join(", ")} (Korean, everyday clothes).` : "";
  return `Illustration ${index + 1} of ${total} for a short dream story titled "${title}".
${hero(material)}
${people}
Place: ${scene.place || "a dream space"}.
What we see: ${scene.image || scene.text}
Mood: ${BEAT_MOOD[scene.beat] || ""}
Story for context (do not write any of it in the image): ${scene.text}

${STYLE}`;
}
