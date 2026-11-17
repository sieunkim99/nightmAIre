// 장면 그림 생성 (OpenAI 이미지 모델, eval/images.mjs 비교 후 gpt-image-2.6-flare 채택).
// 1번 장면을 먼저 그리고, 나머지는 1번 그림을 참고 이미지로 넘겨 주인공 모습과 화풍을 맞춘다.
// 참고 이미지 방식이 실패하면 그 장면은 참고 없이 다시 그린다.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { scenePrompt } from "./imagePrompts.mjs";
export const IMAGE_MODEL = process.env.NIGHTMAIRE_IMAGE_MODEL || "gpt-image-2.6-flare";
const QUALITY = process.env.NIGHTMAIRE_IMAGE_QUALITY || "medium";
const SIZE = "1536x1024";
const API = "https://api.openai.com/v1/images";
export function imagesEnabled() {
  return Boolean(process.env.OPENAI_API_KEY) && process.env.NIGHTMAIRE_IMAGES !== "0";
}
async function call(endpoint, init, signal) {
  const r = await fetch(`${API}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      ...(init.headers || {})
    },
    body: init.body,
    signal
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${endpoint} ${r.status}: ${j.error?.message || "unknown"}`);
  return Buffer.from(j.data[0].b64_json, "base64");
}
function generate(prompt, signal) {
  return call("generations", {
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      size: SIZE,
      quality: QUALITY,
      output_format: "jpeg"
    })
  }, signal);
}
function editWithReference(prompt, ref, signal) {
  const form = new FormData();
  form.append("model", IMAGE_MODEL);
  form.append("prompt", prompt);
  form.append("size", SIZE);
  form.append("quality", QUALITY);
  form.append("output_format", "jpeg");
  form.append("image[]", new Blob([ref], {
    type: "image/jpeg"
  }), "reference.jpg");
  return call("edits", {
    body: form
  }, signal);
}
const REF_NOTE = "The attached image is a reference from earlier in the same picture book. Keep the same main character (face, hair, mustard-yellow hoodie) and the same art style, but draw a completely new scene as described below. Do not copy the reference composition.\n\n";

// story: v2/v3 이야기, material: 아이 재료, dir: 저장 폴더. 장면별 파일 이름 배열을 돌려준다 (실패한 장면은 null).
export async function drawScenes({
  story,
  material,
  dir,
  existingFiles = [],
  signal
}) {
  fs.mkdirSync(dir, {
    recursive: true
  });
  const id = crypto.randomBytes(9).toString("base64url");
  const scenes = story.scenes || [];
  const prompts = scenes.map((scene, index) => scenePrompt({
    scene,
    material,
    title: story.title,
    index,
    total: scenes.length,
    blueprint: story.blueprint,
    veto: story.provenance?.seed?.veto || ""
  }));
  const save = (i, buf) => {
    const name = `${id}-${i + 1}.jpg`;
    fs.writeFileSync(path.join(dir, name), buf);
    return name;
  };
  const files = scenes.map((_, i) => existingFiles[i] || null);
  if (!scenes.length) return files;
  let ref = null;
  try {
    if (files[0]) ref = fs.readFileSync(path.join(dir, files[0]));else {
      ref = await generate(prompts[0], signal);
      files[0] = save(0, ref);
    }
  } catch (err) {
    if (signal?.aborted) throw err;
    console.error("[images] scene 1 failed:", err.name);
  }
  let next = 1;
  await Promise.all(Array.from({
    length: Math.min(2, scenes.length - 1)
  }, async () => {
    while (next < scenes.length) {
      const i = next++;
      signal?.throwIfAborted();
      if (files[i]) continue;
      try {
        let buf;
        if (ref) {
          try {
            buf = await editWithReference(REF_NOTE + prompts[i], ref, signal);
          } catch (err) {
            if (signal?.aborted) throw err;
            console.error(`[images] scene ${i + 1} reference edit failed, drawing without it:`, err.name);
          }
        }
        files[i] = save(i, buf || (await generate(prompts[i], signal)));
      } catch (err) {
        if (signal?.aborted) throw err;
        console.error(`[images] scene ${i + 1} failed:`, err.name);
      }
    }
  }));
  return files;
}
