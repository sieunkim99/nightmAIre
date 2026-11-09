// 모델 호출 — Anthropic(SDK) / OpenAI(Chat Completions REST)를 같은 모양으로 감싼다.
// 평가에서는 fallback을 쓰지 않는다: 어떤 모델이 썼는지가 흐려지면 비교가 안 되므로
// 거절(refusal)은 그대로 실패로 기록한다.
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

// 1M 토큰당 USD. OpenAI 가격은 확인 전이라 null(토큰만 기록).
export const MODELS = {
  "claude-opus-5-5": { provider: "anthropic", price: [4, 20] },
  "claude-sonnet-5-5": { provider: "anthropic", price: [2, 10] },
  "claude-haiku-5-5": { provider: "anthropic", price: [0.1, 0.5] },
  "claude-fable-5-1": { provider: "anthropic", price: [10, 50] },
  "gpt-5.5": { provider: "openai", price: null },
  "gpt-6.1-sol": { provider: "openai", price: null },
  "gpt-5.4-mini": { provider: "openai", price: null },
};

const EFFORT = process.env.EVAL_EFFORT || "medium";

let anthropic = null;
function getAnthropic() {
  if (!anthropic) anthropic = new Anthropic();
  return anthropic;
}

export function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON in model output");
  return JSON.parse(candidate.slice(start, end + 1));
}

async function callAnthropic(model, system, user) {
  const stream = getAnthropic().messages.stream({
    model,
    max_tokens: 32000,
    output_config: { effort: EFFORT },
    system,
    messages: [{ role: "user", content: user }],
  });
  const res = await stream.finalMessage();
  if (res.stop_reason === "refusal") throw new Error("refusal: " + (res.stop_details?.category || ""));
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return { text, usage: { input: res.usage.input_tokens, output: res.usage.output_tokens } };
}

async function callOpenAI(model, system, user) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      reasoning_effort: EFFORT,
      max_completion_tokens: 32000,
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`openai ${r.status}: ${d.error?.message || JSON.stringify(d)}`);
  const c = d.choices[0];
  if (c.message.refusal) throw new Error("refusal: " + c.message.refusal);
  return { text: c.message.content || "", usage: { input: d.usage.prompt_tokens, output: d.usage.completion_tokens } };
}

// 한 번 호출 → { json, usage, ms }. JSON 파싱 실패 시 1회 재시도.
export async function callJSON(model, system, user) {
  const cfg = MODELS[model];
  if (!cfg) throw new Error("unknown model " + model);
  const fn = cfg.provider === "anthropic" ? callAnthropic : callOpenAI;
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const t0 = Date.now();
    try {
      const { text, usage } = await fn(model, system, user);
      return { json: extractJson(text), usage, ms: Date.now() - t0 };
    } catch (err) {
      lastErr = err;
      if (String(err.message).startsWith("refusal")) break;
    }
  }
  throw lastErr;
}

export function costOf(model, usage) {
  const p = MODELS[model]?.price;
  if (!p || !usage) return null;
  return (usage.input * p[0] + usage.output * p[1]) / 1e6;
}
