import { MECHANISMS } from "./library.mjs";
export class ContractError extends Error {
  constructor(message) {
    super(message);
    this.name = "ContractError";
  }
}
export function requireThat(ok, message) {
  if (!ok) throw new ContractError(message);
}
const text = (x, max = 2000) => typeof x === "string" && x.trim().length > 0 && x.length <= max;
const list = (x, min = 0, max = 30) => Array.isArray(x) && x.length >= min && x.length <= max;
function unique(records, label) {
  requireThat(records.every(r => text(r.id, 80)) && new Set(records.map(r => r.id)).size === records.length, `${label}: invalid or duplicate IDs`);
}
function refs(values, allowed, label, min = 0) {
  requireThat(list(values, min) && values.every(v => allowed.has(v)) && new Set(values).size === values.length, `${label}: invalid references`);
}
export function normalizeSeed(material) {
  requireThat(material && material.confirmed === true, "재료를 확인한 뒤 진행해 주세요.");
  requireThat(["experience", "imagination", "example"].includes(material.kind), "재료 종류를 골라 주세요.");
  requireThat(text(material.situation, 1500), "꿈의 출발점이 될 이야기를 적어 주세요.");
  const fields = ["situation", "want", "applied", "feeling", "object", "veto", "clarification"];
  const values = Object.fromEntries(fields.map(key => {
    const v = material[key] ?? "";
    requireThat(typeof v === "string" && v.length <= 1500, "재료가 너무 길어요.");
    return [key, v.trim()];
  }));
  return {
    id: "E1",
    kind: material.kind,
    confirmed: true,
    ...values,
    records: fields.filter(k => values[k]).map(k => ({
      id: `E-${k}`,
      field: k,
      value: values[k],
      provenance: "user_confirmed",
      sourceKind: material.kind
    })),
    unknown: fields.filter(k => !values[k])
  };
}
export function validateGrounding(x, seed) {
  requireThat(x && ["continue", "clarify", "change_material"].includes(x.action), "grounding: invalid action");
  if (x.action !== "continue") {
    requireThat(text(x.question, 300), "grounding: missing message");
    return x;
  }
  requireThat(list(x.matches, 1, MECHANISMS.length), "grounding: no supported mechanism");
  requireThat(new Set(x.matches.map(m => m.mechanismId)).size === x.matches.length, "grounding: duplicate mechanism");
  for (const m of x.matches) {
    requireThat(MECHANISMS.some(a => a.id === m.mechanismId), "grounding: unknown mechanism");
    requireThat(["observed_condition", "hypothetical", "uncertain"].includes(m.applicability), "grounding: missing applicability");
    requireThat(text(m.reason) && text(m.transferLimit), "grounding: missing conditions/limits");
    refs(m.seedRefs, new Set(seed.records.map(r => r.id)), "grounding seed", 1);
  }
  return x;
}
export function validateFutures(x, grounding, {
  minCandidates = 2
} = {}) {
  requireThat(x && list(x.candidates, minCandidates, 6), "futures: expected distinct candidates");
  unique(x.candidates, "candidates");
  const allIds = [];
  const mechanismIds = new Set(grounding.mechanisms.map(m => m.id)),
    claimIds = new Set(grounding.claims.map(c => c.id));
  for (const c of x.candidates) {
    requireThat(text(c.title, 100) && text(c.preview, 500), "future: missing preview");
    refs(c.mechanismIds, mechanismIds, "future mechanism", 1);
    requireThat(list(c.assumptions, 1, 8) && c.assumptions.every(a => text(a.text)), "future: missing assumptions");
    unique(c.assumptions, "assumptions");
    requireThat(list(c.events, 2, 8), "future: missing events");
    unique(c.events, "events");
    for (const e of c.events) {
      requireThat(text(e.text) && ["child", "ai", "peer", "institution", "environment"].includes(e.actor), "future: invalid actor/event");
      requireThat(Number.isInteger(e.order) && e.order >= 1 && e.order <= 6 && text(e.timeframe, 100), "future: distinguish order and time");
      requireThat(["benefit", "risk", "neutral", "uncertain"].includes(e.outcome), "future: invalid outcome");
    }
    requireThat(c.events.some(e => e.actor !== "child"), "future: include AI or context");
    requireThat(list(c.edges, 1, 16), "future: missing edges");
    const eventIds = new Set(c.events.map(e => e.id)),
      assumptions = new Set(c.assumptions.map(a => a.id));
    const adjacency = new Map([...eventIds].map(id => [id, []]));
    for (const e of c.edges) {
      requireThat(eventIds.has(e.from) && eventIds.has(e.to) && e.from !== e.to, "future: dangling edge");
      requireThat(["hypothesis", "association", "moderation"].includes(e.relation), "future: unsupported causal claim");
      requireThat(text(e.rationale), "future: edge rationale required");
      refs(e.claimIds, claimIds, "edge claim");
      refs(e.assumptionIds, assumptions, "edge assumption", 1);
      adjacency.get(e.from).push(e.to);
      adjacency.get(e.to).push(e.from);
    }
    const connected = new Set(),
      pending = [c.events[0].id];
    while (pending.length) {
      const id = pending.pop();
      if (connected.has(id)) continue;
      connected.add(id);
      pending.push(...adjacency.get(id));
    }
    requireThat([...eventIds].every(id => connected.has(id)), "future: unconnected event");
    allIds.push(...c.events.map(e => e.id), ...c.assumptions.map(a => a.id));
  }
  requireThat(new Set(allIds).size === allIds.length, "futures: IDs must be globally unique");
  requireThat(x.candidates.some(c => c.events.some(e => e.outcome !== "risk")), "futures: missing alternative outcomes");
  return x;
}
export function normalizeSelection(input, prepared) {
  requireThat(input && list(input.candidateIds, 1, 3), "꿈의 세계를 하나 이상 골라 주세요.");
  refs(input.candidateIds, new Set(prepared.futures.candidates.map(c => c.id)), "selection", 1);
  const note = input.note ?? "",
    object = input.object ?? "";
  requireThat(typeof note === "string" && note.length <= 1000 && typeof object === "string" && object.length <= 200, "선택한 재료가 너무 길어요.");
  requireThat(["mild", "spooky"].includes(input.intensity || "mild"), "invalid intensity");
  return {
    candidateIds: input.candidateIds,
    note: note.trim(),
    object: object.trim(),
    intensity: input.intensity || "mild",
    delegated: input.delegated === true,
    userAssumptions: note.trim() ? [{
      id: "K-assumption",
      text: note.trim(),
      origin: "child"
    }] : [],
    objectSource: object.trim() ? "child" : "none"
  };
}
export function validatePackage(x, prepared, selection) {
  const b = x?.blueprint,
    story = x?.story;
  requireThat(b && story && text(story.title, 100), "dream: missing blueprint/story");
  const selected = prepared.futures.candidates.filter(c => selection.candidateIds.includes(c.id));
  const eventIds = new Set(selected.flatMap(c => c.events.map(e => e.id)));
  requireThat(list(b.worlds, 1, 8), "dream: missing worlds");
  unique(b.worlds, "worlds");
  for (const w of b.worlds) {
    requireThat(text(w.rule), "world: missing rule");
    refs(w.candidateIds, new Set(selection.candidateIds), "world candidate", 1);
  }
  const covered = new Set(b.worlds.flatMap(w => w.candidateIds));
  requireThat(selection.candidateIds.every(id => covered.has(id)), "dream: selected world was dropped");
  requireThat(list(b.scenes, 1, 20) && list(story.scenes, 1, 20), "dream: scene budget exceeded");
  unique(b.scenes, "blueprint scenes");
  unique(story.scenes, "story scenes");
  const sceneIds = new Set(b.scenes.map(s => s.id)),
    worldIds = new Set(b.worlds.map(w => w.id));
  refs(b.defaultPath, sceneIds, "default path", 1);
  requireThat(b.defaultPath.length === b.scenes.length && story.scenes.length === b.scenes.length, "dream: reading path must cover scenes");
  for (const s of b.scenes) {
    requireThat(worldIds.has(s.worldId), "scene: unknown world");
    refs(s.eventIds, eventIds, "scene event", 1);
  }
  const representedEvents = new Set(b.scenes.flatMap(s => s.eventIds));
  requireThat(selected.every(c => c.events.some(e => representedEvents.has(e.id))), "dream: selected future has no scene");
  requireThat(list(b.transitions, Math.max(0, b.scenes.length - 1), 40), "dream: missing transitions");
  for (const t of b.transitions) {
    requireThat(sceneIds.has(t.from) && sceneIds.has(t.to) && t.from !== t.to && text(t.anchor), "dream: invalid transition");
    requireThat(["continuation", "world_jump", "overlap", "time_fold", "role_reversal"].includes(t.kind), "dream: transition is not a causal edge");
  }
  b.defaultPath.slice(1).forEach((id, i) => requireThat(b.transitions.some(t => t.from === b.defaultPath[i] && t.to === id), "dream: broken reading path"));
  for (const s of story.scenes) requireThat(sceneIds.has(s.id) && text(s.text, 2500) && text(s.image, 1500) && text(s.place, 200), "story: invalid scene");
  requireThat(text(b.childContribution, 1000), "dream: explain how choices changed events");
  return x;
}
export function reviewPassed(r) {
  const keys = ["inputFaithful", "evidenceBounded", "choicesReflected", "coherent", "ageAppropriate", "vetoRespected"];
  requireThat(r && keys.every(k => typeof r[k] === "boolean") && list(r.issues, 0, 12) && r.issues.every(t => text(t)), "review: invalid result");
  return keys.every(k => r[k]) && r.issues.length === 0;
}
