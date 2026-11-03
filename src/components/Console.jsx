import { useEffect, useState } from "react";
import { loadSessions } from "../lib/store.js";
import { api } from "../lib/api.js";

// 교사/연구자 콘솔: 이 기기에서 만들어진 세션 요약 + 투표 + 데이터 내보내기
export default function Console({ onBack }) {
  const [sessions, setSessions] = useState([]);
  const [votes, setVotes] = useState({});

  useEffect(() => {
    setSessions(loadSessions());
    try {
      setVotes(JSON.parse(localStorage.getItem("nightmaire_votes") || "{}"));
    } catch {
      setVotes({});
    }
  }, []);

  function vote(id) {
    const next = { ...votes, [id]: (votes[id] || 0) + 1 };
    setVotes(next);
    localStorage.setItem("nightmaire_votes", JSON.stringify(next));
  }

  function exportLocal() {
    download("nightmaire-sessions.json", JSON.stringify({ sessions, votes }, null, 2));
  }

  async function exportServer() {
    try {
      const { events } = await api.events();
      download("nightmaire-server-events.json", JSON.stringify(events, null, 2));
    } catch {
      alert("서버 로그를 가져오지 못했어요 (서버가 꺼져 있나요?)");
    }
  }

  function download(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = name;
    a.click();
  }

  return (
    <div className="console">
      <h2 className="step-title">교사/연구자 콘솔</h2>
      <p className="step-sub">
        이 기기에서 만들어진 악몽 {sessions.length}개. 투표는 '악몽 전시회'에서 최악의 악몽을 고를 때 사용하세요.
      </p>

      <div className="card" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>악몽</th>
              <th>재료 (AI / 상황)</th>
              <th>위험 카드</th>
              <th>원칙 수</th>
              <th>결과</th>
              <th>투표</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>「{s.dream?.title}」</td>
                <td>
                  {s.material?.service}
                  <br />
                  <span style={{ color: "var(--ink-dim)" }}>{s.material?.situation}</span>
                </td>
                <td>
                  {(s.dream?.riskCardIds || []).map((r) => (
                    <span className="riskTag" key={r}>
                      {r}
                    </span>
                  ))}
                </td>
                <td>{s.principles?.length || 0}</td>
                <td>{s.finalState === "good" ? "✨ 되돌림" : s.finalState === "half" ? "🌗 절반" : "🌑 악몽"}</td>
                <td>
                  <button className="btn small ghost" onClick={() => vote(s.id)}>
                    👻 {votes[s.id] || 0}
                  </button>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--ink-dim)", textAlign: "center", padding: 24 }}>
                  아직 만들어진 악몽이 없어요
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="nav-row">
        <button className="btn ghost" onClick={onBack}>
          ← 돌아가기
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn small ghost" onClick={exportLocal}>
            기기 데이터 내보내기
          </button>
          <button className="btn small ghost" onClick={exportServer}>
            서버 로그 내보내기
          </button>
        </div>
      </div>
    </div>
  );
}
