import { useState } from "react";
import DreamCanvas from "./DreamCanvas.jsx";

const STATE_PCT = { nightmare: 8, half: 55, good: 100 };
const STATE_LABEL = { nightmare: "아직 악몽이야…", half: "꿈이 반쯤 밝아졌어!", good: "예쁜 꿈이 됐어! ✨" };

export default function ReversePanel({ dream, judge, judging, onJudge, onFinish }) {
  const [principles, setPrinciples] = useState([]);
  const [draft, setDraft] = useState("");
  const [cut, setCut] = useState(0);

  const cuts = judge?.revisedCuts || dream.cuts;
  const c = cuts[Math.min(cut, cuts.length - 1)];
  const state = judge?.dreamState || "nightmare";
  const img = dream.cuts[Math.min(cut, dream.cuts.length - 1)]?.img;
  const nodeState = Object.fromEntries((judge?.nodes || []).map((n) => [n.id, n]));

  function addPrinciple() {
    if (!draft.trim()) return;
    const next = [...principles, draft.trim()];
    setPrinciples(next);
    setDraft("");
    onJudge(next);
  }

  return (
    <div>
      <h2 className="step-title">3. 악몽 되돌리기</h2>
      <p className="step-sub">
        악몽이 벌어지지 않게 하려면 나는 어떻게 해야 할까?
        <br />
        행동 원칙을 하나씩 적어봐 — 원칙이 원인을 끊으면 꿈이 조금씩 밝아져.
      </p>

      <div className="dream-stage" style={{ aspectRatio: "16/8" }}>
        {img ? (
          // 원래 꿈의 그림 위에, 끊어낸 원인만큼 새벽빛이 번진다
          <>
            <img className={"scene-img lit-" + state} src={img} alt="" />
            <div className={"dawn lit-" + state} />
          </>
        ) : (
          <DreamCanvas palette={c.palette} mood={c.mood} scene={c.scene || null} motifs={c.motifs || []} />
        )}
        <div className="grain" />
        {!img && <div className="scanlines" />}
        <div className="vignette" />
        <div className="scene-tag">장면 {Math.min(cut, cuts.length - 1) + 1} / {cuts.length}</div>
      </div>
      <div className="cut-dots">
        {cuts.map((_, i) => (
          <span key={i} className={i === cut ? "on" : ""} onClick={() => setCut(i)} style={{ cursor: "pointer" }} />
        ))}
      </div>
      <p className="scene-text" style={{ fontSize: 16, minHeight: "3.6em" }}>{c.narration}</p>

      <div className="state-meter">
        <span>악몽</span>
        <div className="state-bar">
          <div className="state-fill" style={{ width: STATE_PCT[state] + "%" }} />
        </div>
        <span>예쁜 꿈</span>
      </div>
      <p style={{ textAlign: "center", fontFamily: "Gowun Dodum", margin: "4px 0 18px" }}>{STATE_LABEL[state]}</p>

      <div className="card">
        <label className="field-label" style={{ marginTop: 0 }}>
          이 악몽의 원인들
        </label>
        {dream.causeNodes.map((n) => {
          const js = nodeState[n.id];
          return (
            <div key={n.id} className={"node" + (js?.broken ? " broken" : "")}>
              <div className="orb" />
              <div>
                {n.label}
                {js && <span className="comment">{js.comment}</span>}
              </div>
            </div>
          );
        })}
        {judge?.encouragement && (
          <p style={{ color: "var(--accent-2)", fontSize: 14, margin: "10px 2px 0" }}>💫 {judge.encouragement}</p>
        )}
      </div>

      <div className="card">
        <label className="field-label" style={{ marginTop: 0 }}>
          나의 행동 원칙
        </label>
        {principles.length > 0 && (
          <ol className="principles">
            {principles.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        )}
        <div className="chat-input-row">
          <input
            type="text"
            placeholder="예: AI 답을 쓰기 전에 내 답을 먼저 정한다"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && !judging) addPrinciple();
            }}
          />
          <button className="btn small" disabled={judging || !draft.trim()} onClick={addPrinciple}>
            {judging ? "판정 중…" : "원칙 추가"}
          </button>
        </div>
      </div>

      <div className="nav-row" style={{ justifyContent: "center" }}>
        <button className="btn" onClick={() => onFinish(principles)} disabled={!principles.length}>
          {state === "good" ? "꿈 저장하고 마치기 ✨" : "여기까지 하고 마치기"}
        </button>
      </div>
    </div>
  );
}
