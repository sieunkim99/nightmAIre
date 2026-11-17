// No fallback: server failure must not become an unrelated demo.
export const accessCode = {
  get() {
    try {
      return sessionStorage.getItem("nightmaire_code") || "";
    } catch {
      return "";
    }
  },
  set(value) {
    try {
      sessionStorage.setItem("nightmaire_code", value);
    } catch {}
  }
};
async function request(url, body, signal) {
  const code = accessCode.get();
  const res = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(code ? {
        "x-access-code": code
      } : {})
    },
    ...(body === undefined ? {} : {
      body: JSON.stringify(body)
    }),
    signal
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("꿈 제작소에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
  if (!res.ok) throw new Error(data.error || (res.status === 401 ? "접속 코드를 확인해 주세요." : "잠시 후 다시 시도해 주세요."));
  return data;
}
export const api = {
  health: () => request("/api/health"),
  checkCode: async () => {
    try {
      await request("/api/access");
      return true;
    } catch {
      return false;
    }
  },
  prepare: (payload, signal) => request("/api/prepare", payload, signal),
  dream: (payload, signal) => request("/api/dream", payload, signal),
  images: (id, signal) => request(`/api/dream/${encodeURIComponent(id)}/images`, {}, signal),
  discard: payload => request("/api/discard", payload).catch(() => {})
};
