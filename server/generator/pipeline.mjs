import { bundleFor } from "./library.mjs";
import { normalizeSeed, validateGrounding, validateFutures, normalizeSelection, validatePackage, reviewPassed, ContractError, requireThat } from "./contracts.mjs";
import { groundingPrompt, futuresPrompt, reviseFuturesPrompt, dreamPrompt, reviewPrompt } from "./prompts.mjs";
const json = x => JSON.stringify(x);
export async function prepareDream({
  material,
  allowUnknown = false,
  callModel,
  signal
}) {
  const seed = {
    ...normalizeSeed(material),
    allowUnknown: Boolean(allowUnknown)
  };
  const match = validateGrounding(await callModel(groundingPrompt(), json({
    seed
  }), {
    signal
  }), seed);
  if (match.action !== "continue") return {
    action: match.action === "clarify" && allowUnknown ? "change_material" : match.action,
    question: match.action === "change_material" || allowUnknown ? "이 이야기는 지금 꿈으로 크게 만들지 않을게. 다른 상상이나 준비된 예시로 바꿀 수 있어. 실제로 도움이 필요한 일이면 믿을 만한 어른에게 이야기해도 좋아." : match.question
  };
  const grounding = bundleFor(match.matches);
  const futures = validateFutures(await callModel(futuresPrompt(), json({
    seed,
    grounding
  }), {
    signal
  }), grounding);
  return {
    action: "continue",
    version: 3,
    seed,
    grounding,
    futures
  };
}
export async function generateDream({
  prepared,
  selection: input,
  callModel,
  signal
}) {
  const selection = normalizeSelection(input, prepared);
  const originalFutures = prepared.futures;
  let candidates = prepared.futures.candidates.filter(c => selection.candidateIds.includes(c.id));
  if (selection.note) {
    const revised = validateFutures(await callModel(reviseFuturesPrompt(), json({
      seed: prepared.seed,
      grounding: prepared.grounding,
      candidates,
      selection
    }), {
      signal
    }), prepared.grounding, {
      minCandidates: 1
    });
    requireThat(revised.candidates.length === candidates.length && revised.candidates.every(c => selection.candidateIds.includes(c.id)), "수정 과정에서 선택한 세계가 바뀌었어요. 다시 시도해 주세요.");
    for (const c of revised.candidates) {
      const id = `${c.id}-K`;
      requireThat(c.assumptions.some(a => a.id === id && a.text === selection.note && a.origin === "child") && c.edges.some(e => e.assumptionIds.includes(id)), "아이의 새 가정이 미래에 연결되지 않았어요.");
    }
    candidates = revised.candidates;
    prepared = {
      ...prepared,
      futures: validateFutures({
        candidates: prepared.futures.candidates.map(c => candidates.find(r => r.id === c.id) || c)
      }, prepared.grounding)
    };
  }
  const context = {
    seed: prepared.seed,
    grounding: prepared.grounding,
    candidates,
    selection
  };
  let pkg = validatePackage(await callModel(dreamPrompt(), json(context), {
    signal
  }), prepared, selection);
  let review = await callModel(reviewPrompt(), json({
    ...context,
    package: pkg
  }), {
    signal
  });
  if (!reviewPassed(review)) {
    pkg = validatePackage(await callModel(dreamPrompt(), json({
      ...context,
      previousDraft: pkg,
      revisionNotes: review.issues
    }), {
      signal
    }), prepared, selection);
    review = await callModel(reviewPrompt(), json({
      ...context,
      package: pkg
    }), {
      signal
    });
    if (!reviewPassed(review)) throw new ContractError("꿈의 연결이나 표현을 아직 확인하지 못했어요. 재료를 수정하거나 다시 시도해 주세요.");
  }
  const scenes = pkg.blueprint.defaultPath.map(id => ({
    ...pkg.story.scenes.find(s => s.id === id),
    ...pkg.blueprint.scenes.find(s => s.id === id)
  }));
  return {
    ...pkg.story,
    scenes,
    pipelineVersion: 3,
    format: "story",
    blueprint: pkg.blueprint,
    causes: [],
    riskCardIds: [],
    provenance: {
      seed: prepared.seed,
      grounding: prepared.grounding,
      futures: prepared.futures,
      originalFutures,
      selection,
      review,
      reviewIsScientificValidation: false
    }
  };
}
