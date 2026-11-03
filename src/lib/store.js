// 워크숍 세션 기록: localStorage에 보관 (서버 JSONL 로그와 별개로,
// 기기 단위 갤러리/투표용. 서버가 꺼져도 남는다.)
const KEY = "nightmaire_sessions_v1";

export function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function saveSession(session) {
  const all = loadSessions();
  const i = all.findIndex((s) => s.id === session.id);
  if (i >= 0) all[i] = session;
  else all.push(session);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* 저장 불가 환경이어도 앱은 계속 동작 */
  }
}

export function newSessionId() {
  return "s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
