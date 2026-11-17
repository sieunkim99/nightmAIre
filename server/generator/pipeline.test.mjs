import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSeed, validateFutures, validatePackage, normalizeSelection } from "./contracts.mjs";
import { prepareDream, generateDream } from "./pipeline.mjs";
import { demoPrepared, demoGenerated, DEMO_MATERIAL } from "./demo.mjs";
import { createMemoryStore, mountGenerator } from "./routes.mjs";
import { storyToDream } from "../dreamShape.mjs";
import express from "express";
const copy = x => structuredClone(x);
const selection = {
  candidateIds: ["F1", "F2"],
  object: "지우개",
  note: "",
  intensity: "mild"
};
const passed = {
  inputFaithful: true,
  evidenceBounded: true,
  choicesReflected: true,
  coherent: true,
  ageAppropriate: true,
  vetoRespected: true,
  issues: []
};
test("confirmed source kind and unknown fields survive without invented feelings", () => {
  const s = normalizeSeed({
    ...DEMO_MATERIAL,
    feeling: ""
  });
  assert.equal(s.kind, "example");
  assert.ok(s.unknown.includes("feeling"));
  assert.ok(!s.records.some(r => r.field === "feeling"));
  assert.throws(() => normalizeSeed({
    ...DEMO_MATERIAL,
    confirmed: false
  }));
});
test("one, two, and three selected futures produce variable-length readable stories", () => {
  const p = demoPrepared();
  const counts = [];
  for (const ids of [["F1"], ["F1", "F2"], ["F1", "F2", "F3"]]) {
    const story = demoGenerated(p, {
      ...selection,
      candidateIds: ids
    });
    const d = storyToDream(story, {});
    counts.push(d.cuts.length);
    assert.equal(d.blueprint.worlds.length, ids.length);
    assert.deepEqual(d.blueprint.defaultPath, d.scenes.map(s => s.id));
    assert.equal(d.causeNodes.length, 0);
  }
  assert.deepEqual(counts, [3, 4, 5]);
});
test("fabricated evidence and dangling future edges are rejected", () => {
  const p = demoPrepared(),
    f = copy(p.futures);
  f.candidates[0].edges[0].claimIds = ["made-up-paper"];
  assert.throws(() => validateFutures(f, p.grounding), /claim/);
  const g = copy(p.futures);
  g.candidates[0].edges[0].to = "missing";
  assert.throws(() => validateFutures(g, p.grounding), /dangling/);
});
test("a writer cannot drop selected futures or silently invent scene references", () => {
  const p = demoPrepared(),
    s = demoGenerated(p, selection),
    pkg = {
      blueprint: copy(s.blueprint),
      story: copy(s)
    };
  pkg.blueprint.worlds = pkg.blueprint.worlds.slice(0, 1);
  assert.throws(() => validatePackage(pkg, p, selection), /selected world/);
  const bad = {
    blueprint: copy(s.blueprint),
    story: copy(s)
  };
  bad.blueprint.scenes[0].eventIds = ["imaginary-citation"];
  assert.throws(() => validatePackage(bad, p, selection), /scene event/);
});
test("unselected candidates, duplicate selection, and broken reading routes fail", () => {
  const p = demoPrepared();
  assert.throws(() => normalizeSelection({
    ...selection,
    candidateIds: ["F99"]
  }, p));
  assert.throws(() => normalizeSelection({
    ...selection,
    candidateIds: ["F1", "F1"]
  }, p));
  const s = demoGenerated(p, selection);
  s.blueprint.transitions[0].to = "S-ending";
  assert.throws(() => validatePackage({
    blueprint: s.blueprint,
    story: s
  }, p, selection), /reading path/);
});
test("grounding precedes futures and carries limits/counterconditions into generation", async () => {
  const p = demoPrepared(),
    calls = [];
  const out = await prepareDream({
    material: {
      ...DEMO_MATERIAL,
      applied: "먼저 풀고 힌트로 확인했어"
    },
    callModel: async (system, input) => {
      const data = JSON.parse(input);
      calls.push(data);
      return calls.length === 1 ? {
        action: "continue",
        matches: [{
          ...p.grounding.mechanisms[0].match,
          applicability: "hypothetical",
          reason: "현재는 먼저 시도했으므로 대행은 새 가정"
        }]
      } : p.futures;
    }
  });
  assert.equal(calls[0].seed.applied, "먼저 풀고 힌트로 확인했어");
  assert.ok(calls[1].grounding.mechanisms[0].counterConditions.includes("먼저 시도"));
  assert.equal(out.grounding.mechanisms[0].match.applicability, "hypothetical");
  assert.ok(out.grounding.claims[0].limits);
});
test("clarification and sensitive-material redirection stop before future generation", async () => {
  for (const action of ["clarify", "change_material"]) {
    let calls = 0;
    const out = await prepareDream({
      material: DEMO_MATERIAL,
      callModel: async () => {
        calls++;
        return {
          action,
          question: "다른 재료로 이어 갈까요?"
        };
      }
    });
    assert.equal(calls, 1);
    assert.equal(out.action, action);
    assert.equal(out.futures, undefined);
  }
});
test("failed semantic review triggers one revision with the same selection", async () => {
  const p = demoPrepared(),
    s = demoGenerated(p, selection),
    requests = [];
  let i = 0;
  const output = await generateDream({
    prepared: p,
    selection,
    callModel: async (system, input) => {
      requests.push(JSON.parse(input));
      return [{
        blueprint: s.blueprint,
        story: s
      }, {
        ...passed,
        choicesReflected: false,
        issues: ["지우개의 역할을 명확히"]
      }, {
        blueprint: s.blueprint,
        story: s
      }, passed][i++];
    }
  });
  assert.equal(requests.length, 4);
  assert.deepEqual(requests[2].selection.candidateIds, selection.candidateIds);
  assert.deepEqual(requests[2].revisionNotes, ["지우개의 역할을 명확히"]);
  assert.equal(output.provenance.reviewIsScientificValidation, false);
});
test("persistent review failure and provider failure never return demo", async () => {
  const p = demoPrepared(),
    s = demoGenerated(p, selection);
  let i = 0;
  await assert.rejects(generateDream({
    prepared: p,
    selection,
    callModel: async () => ++i % 2 ? {
      blueprint: s.blueprint,
      story: s
    } : {
      ...passed,
      ageAppropriate: false,
      issues: ["연령 부적합"]
    }
  }));
  await assert.rejects(prepareDream({
    material: DEMO_MATERIAL,
    callModel: async () => {
      throw new Error("provider unavailable");
    }
  }), /provider unavailable/);
});
test("a child's new assumption updates the future graph before the writer", async () => {
  const p = demoPrepared(),
    chosen = {
      ...selection,
      note: "학교가 점수 대신 질문을 모은다면"
    };
  const revised = {
    candidates: copy(p.futures.candidates.filter(c => chosen.candidateIds.includes(c.id)))
  };
  for (const c of revised.candidates) {
    c.assumptions.push({
      id: `${c.id}-K`,
      text: chosen.note,
      origin: "child"
    });
    c.edges[0].assumptionIds.push(`${c.id}-K`);
    c.events[1].text = "질문이 새로운 평가의 재료가 될 수 있음";
  }
  const changed = {
    ...p,
    futures: {
      candidates: p.futures.candidates.map(c => revised.candidates.find(r => r.id === c.id) || c)
    }
  };
  const story = demoGenerated(changed, chosen);
  const inputs = [];
  let n = 0;
  const out = await generateDream({
    prepared: p,
    selection: chosen,
    callModel: async (_sys, input) => {
      inputs.push(JSON.parse(input));
      return [revised, {
        blueprint: story.blueprint,
        story
      }, passed][n++];
    }
  });
  assert.equal(inputs.length, 3);
  assert.equal(inputs[1].candidates[0].events[1].text, "질문이 새로운 평가의 재료가 될 수 있음");
  assert.equal(out.provenance.futures.candidates[0].assumptions.at(-1).origin, "child");
  assert.notEqual(out.provenance.originalFutures.candidates[0].events[1].text, out.provenance.futures.candidates[0].events[1].text);
});
test("ephemeral preparation expires and can be discarded", () => {
  let time = 0;
  const s = createMemoryStore({
    ttl: 10,
    max: 2,
    now: () => time
  });
  const id = s.set({
    a: 1
  });
  assert.equal(s.get(id).a, 1);
  time = 11;
  assert.equal(s.get(id), undefined);
  const k = s.set(2);
  s.delete(k);
  assert.equal(s.get(k), undefined);
});
test("HTTP flow returns explicit demo, validates selections, and supports discard", async t => {
  const app = express();
  app.use(express.json());
  mountGenerator(app, {
    requireCode: (_q, _s, n) => n(),
    liveMode: () => false,
    imagesEnabled: () => false
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const post = (path, data) => fetch(url + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  const p = await (await post("/api/prepare", {
    material: DEMO_MATERIAL
  })).json();
  assert.equal(p.mode, "demo");
  assert.equal(p.candidates.length, 3);
  assert.equal((await post("/api/dream", {
    preparedId: p.preparedId,
    selection: {
      candidateIds: ["wrong"]
    }
  })).status, 422);
  const r = await (await post("/api/dream", {
    preparedId: p.preparedId,
    selection
  })).json();
  assert.equal(r.dream.pipelineVersion, 3);
  assert.equal(r.imageState, "disabled");
  assert.equal(r.dream.scenes.length, 4);
  await post("/api/discard", {
    preparedId: p.preparedId,
    dreamId: r.dreamId
  });
  assert.equal((await post("/api/dream", {
    preparedId: p.preparedId,
    selection
  })).status, 410);
});
test("future candidates cannot contain disconnected event groups", () => {
  const p = demoPrepared(),
    f = copy(p.futures),
    c = f.candidates[0];
  c.events.push({
    ...c.events[0],
    id: 'F1-E3'
  }, {
    ...c.events[1],
    id: 'F1-E4'
  });
  c.edges.push({
    ...c.edges[0],
    from: 'F1-E3',
    to: 'F1-E4'
  });
  assert.throws(() => validateFutures(f, p.grounding), /unconnected/);
});
test("skipping clarification cannot loop into more questions", async () => {
  const result = await prepareDream({
    material: DEMO_MATERIAL,
    allowUnknown: true,
    callModel: async () => ({
      action: 'clarify',
      question: '한 번 더?'
    })
  });
  assert.equal(result.action, 'change_material');
});
test("live HTTP response delivers text before images and retries only missing image slots", async t => {
  const p = demoPrepared(),
    story = demoGenerated(p, selection),
    draws = [];
  let n = 0;
  const app = express();
  app.use(express.json());
  mountGenerator(app, {
    requireCode: (_q, _s, next) => next(),
    liveMode: () => true,
    imagesEnabled: () => true,
    callModel: async () => [{
      action: 'continue',
      matches: p.grounding.mechanisms.map(m => m.match)
    }, p.futures, {
      blueprint: story.blueprint,
      story
    }, passed][n++],
    drawScenes: async ({
      existingFiles
    }) => {
      draws.push([...existingFiles]);
      return existingFiles.map((file, i) => file || (draws.length === 1 && i === 2 ? null : `scene-${i}.jpg`));
    }
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const post = async (path, data) => (await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })).json();
  const prep = await post('/api/prepare', {
    material: DEMO_MATERIAL
  });
  const result = await post('/api/dream', {
    preparedId: prep.preparedId,
    selection
  });
  assert.equal(result.mode, 'live');
  assert.equal(result.imageState, 'not_started');
  assert.equal(result.dream.scenes.length, 4);
  assert.equal(draws.length, 0);
  const first = await post(`/api/dream/${result.dreamId}/images`, {});
  assert.equal(first.status, 'partial');
  assert.equal(first.files[2], null);
  const second = await post(`/api/dream/${result.dreamId}/images`, {});
  assert.equal(second.status, 'complete');
  assert.equal(draws[1][0], 'scene-0.jpg');
  assert.equal(draws[1][2], null);
  await post(`/api/dream/${result.dreamId}/images`, {});
  assert.equal(draws.length, 2);
});
