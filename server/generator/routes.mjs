import crypto from "node:crypto";
import { prepareDream, generateDream } from "./pipeline.mjs";
import { demoPrepared, demoGenerated } from "./demo.mjs";
import { normalizeSeed, ContractError } from "./contracts.mjs";
import { storyToDream } from "../dreamShape.mjs";

// Opaque capabilities, memory only, bounded retention. No child text in persistent logs.
export function createMemoryStore({
  ttl = 30 * 60_000,
  max = 200,
  now = Date.now
} = {}) {
  const records = new Map();
  function prune() {
    for (const [key, r] of records) if (r.expires <= now()) records.delete(key);
  }
  // Reclaim expired records even when nobody sends another request.
  const sweep = setInterval(prune, Math.min(ttl, 60_000));
  sweep.unref?.();
  return {
    set(value) {
      prune();
      if (records.size >= max) throw new Error("잠시 후 다시 시도해 주세요.");
      const id = crypto.randomBytes(24).toString("base64url");
      records.set(id, {
        value,
        expires: now() + ttl
      });
      return id;
    },
    get(id) {
      prune();
      return typeof id === "string" ? records.get(id)?.value : undefined;
    },
    delete(id) {
      records.delete(id);
    }
  };
}
export function mountGenerator(app, {
  requireCode,
  liveMode,
  callModel,
  imagesEnabled,
  drawScenes,
  imageDir,
  record = () => {},
  store = createMemoryStore()
}) {
  const endpoint = fn => async (req, res) => {
    const controller = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) controller.abort();
    });
    try {
      await fn(req, res, controller.signal);
    } catch (e) {
      if (controller.signal.aborted) return;
      const status = e instanceof ContractError ? 422 : 502;
      record({
        type: "generator_error",
        stage: req.path,
        errorType: e.name
      });
      if (!res.headersSent) res.status(status).json({
        error: e instanceof ContractError ? e.message : "꿈을 만드는 도중에 멈췄어요. 다시 시도할 수 있어요.",
        retryable: true
      });
    }
  };
  app.post("/api/prepare", requireCode, endpoint(async (req, res, signal) => {
    normalizeSeed(req.body?.material);
    const mode = liveMode() ? "live" : "demo";
    const prepared = mode === "live" ? await prepareDream({
      material: req.body.material,
      allowUnknown: req.body.allowUnknown,
      callModel,
      signal
    }) : demoPrepared();
    if (prepared.action !== "continue") return res.json({
      ...prepared,
      mode
    });
    const preparedId = store.set({
      type: "prepared",
      prepared,
      mode
    });
    record({
      type: "prepared",
      mode,
      version: 3,
      candidateCount: prepared.futures.candidates.length
    });
    res.json({
      action: "continue",
      preparedId,
      mode,
      candidates: prepared.futures.candidates.map(({
        id,
        title,
        preview
      }) => ({
        id,
        title,
        preview
      })),
      notice: mode === "demo" ? "준비된 예시 꿈이에요. 입력을 분석한 결과가 아니에요." : "함께 만드는 상상이며, 실제 미래의 예고가 아니에요."
    });
  }));
  app.post("/api/dream", requireCode, endpoint(async (req, res, signal) => {
    const entry = store.get(req.body?.preparedId);
    if (!entry || entry.type !== "prepared") return res.status(410).json({
      error: "재료의 보관 시간이 끝났어요. 다시 골라 주세요."
    });
    const story = entry.mode === "live" ? await generateDream({
      prepared: entry.prepared,
      selection: req.body.selection,
      callModel,
      signal
    }) : demoGenerated(entry.prepared, req.body.selection);
    const dream = storyToDream(story, {});
    const job = {
      type: "dream",
      story,
      dream,
      mode: entry.mode,
      files: story.scenes.map(() => null),
      imageState: entry.mode === "live" && imagesEnabled() ? "not_started" : "disabled",
      busy: false
    };
    const dreamId = store.set(job);
    record({
      type: "dream_complete",
      mode: entry.mode,
      version: 3,
      sceneCount: story.scenes.length,
      worldCount: story.blueprint.worlds.length
    });
    res.json({
      dream,
      dreamId,
      mode: entry.mode,
      imageState: job.imageState
    });
  }));
  app.post("/api/dream/:id/images", requireCode, endpoint(async (req, res, signal) => {
    const job = store.get(req.params.id);
    if (!job || job.type !== "dream") return res.status(410).json({
      error: "그림을 만들 시간이 끝났어요."
    });
    if (job.imageState === "disabled") return res.json({
      status: "disabled",
      files: job.files
    });
    if (job.busy) return res.status(409).json({
      error: "그림을 만들고 있어요."
    });
    if (job.files.every(Boolean)) return res.json({
      status: "complete",
      files: job.files.map(f => `/api/img/${f}`)
    });
    job.busy = true;
    try {
      job.files = await drawScenes({
        story: job.story,
        material: {
          objects: [job.story.provenance.selection.object].filter(Boolean)
        },
        dir: imageDir,
        existingFiles: job.files,
        signal
      });
      job.imageState = job.files.every(Boolean) ? "complete" : "partial";
      res.json({
        status: job.imageState,
        files: job.files.map(f => f ? `/api/img/${f}` : null)
      });
    } finally {
      job.busy = false;
    }
  }));
  app.post("/api/discard", requireCode, (req, res) => {
    for (const id of [req.body?.preparedId, req.body?.dreamId]) if (typeof id === "string") store.delete(id);
    res.json({
      ok: true
    });
  });
}
