import { Fragment, useState } from "react";
import DreamCanvas from "./DreamCanvas.jsx";

// 꿈 읽기 → 깨어나기.
// read: 장면마다 그림 아래에 이야기를 읽는다 (아이가 넘긴다 — 읽는 속도는 아이마다 다르다)
// wake: 꿈에서 깬 뒤 남은 흔적을 보고, "깨어난 나는…" 한 줄을 쓴다.
//       이야기의 마지막 장면은 주인공이 무엇을 할지 비워두므로, 그 빈칸을 아이가 채운다.
// 데모 꿈(v1, scenes 없음)은 cuts의 narration을 이야기로 읽는다.

function SceneText({ text, refrain }) {
  // 되풀이되는 AI의 말을 표시해서, 세 번 나올 때마다 뜻이 바뀌는 걸 알아보게 한다
  if (!refrain || !text.includes(refrain)) return text;
  const parts = text.split(refrain);
  return parts.map((p, i) => (
    <Fragment key={i}>
      {p}
      {i < parts.length - 1 && <span className="refrain">{refrain}</span>}
    </Fragment>
  ));
}

export default function DreamPlayer({ dream, mode, nickname, onReaction, onCritique }) {
  const [phase, setPhase] = useState("read"); // read | wake
  const [cut, setCut] = useState(0);
  const [reaction, setReaction] = useState("");
  const [critique, setCritique] = useState("");
  const [showCritique, setShowCritique] = useState(false);

  const cuts = dream.cuts;
  const last = cuts.length - 1;
  const c = cuts[phase === "wake" ? last : cut];
  const who = nickname || "나";

  return (
    <div>
      <div className="dream-title">
        「{dream.title}」
        <span className={"badge " + (mode === "demo" ? "demo" : "live")}>{mode === "demo" ? "데모" : "AI 생성"}</span>
      </div>

      <div className="dream-stage">
        <DreamCanvas palette={c.palette} mood={c.mood} scene={c.scene || null} motifs={c.motifs || []} />
        <div className="grain" />
        <div className="scanlines" />
        <div className="vignette" />
        <div className="scene-tag">{phase === "wake" ? "깨어남" : `장면 ${cut + 1} / ${cuts.length}`}</div>
      </div>

      {phase === "read" && (
        <>
          <div className="cut-dots">
            {cuts.map((_, i) => (
              <span key={i} className={i === cut ? "on" : ""} onClick={() => setCut(i)} style={{ cursor: "pointer" }} />
            ))}
          </div>
          <div className="card scene-card">
            {dream.scenes?.[cut]?.place && <div className="scene-place">{dream.scenes[cut].place}</div>}
            <p className="scene-text">
              <SceneText text={c.narration} refrain={dream.refrain} />
            </p>
            <div className="nav-row">
              <button className="btn ghost small" disabled={cut === 0} onClick={() => setCut(cut - 1)}>
                ← 앞 장면
              </button>
              {cut < last ? (
                <button className="btn small" onClick={() => setCut(cut + 1)}>
                  다음 장면 →
                </button>
              ) : (
                <button className="btn small" onClick={() => setPhase("wake")}>
                  꿈에서 깨기 →
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {phase === "wake" && (
        <div style={{ marginTop: 14 }}>
          {dream.trace && (
            <div className="card">
              <label className="field-label" style={{ marginTop: 0 }}>
                꿈이 남긴 흔적
              </label>
              <p className="scene-text" style={{ margin: 0 }}>{dream.trace}</p>
            </div>
          )}

          <div className="card">
            <label className="field-label" style={{ marginTop: 0 }}>
              꿈에서 깨어난 {who}는 어떻게 할까? 이어서 한 줄 써봐.
            </label>
            <textarea
              value={reaction}
              onChange={(e) => setReaction(e.target.value)}
              placeholder="예: 일어나자마자 제일 먼저 …했다"
            />
          </div>

          {!showCritique ? (
            <div className="nav-row" style={{ justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn small ghost" onClick={() => { setPhase("read"); setCut(0); }}>
                🔁 처음부터 다시 읽기
              </button>
              <button className="btn small danger" onClick={() => setShowCritique(true)}>
                이 꿈은 말도 안 돼! 😤
              </button>
              <button className="btn small" disabled={!reaction.trim()} onClick={() => onReaction(reaction.trim())}>
                악몽 되돌리러 가기 →
              </button>
            </div>
          ) : (
            <div className="card">
              <label className="field-label" style={{ marginTop: 0 }}>
                왜 말이 안 된다고 생각해? 적어주면 꿈 공장이 다시 짓는다.
              </label>
              <textarea
                value={critique}
                onChange={(e) => setCritique(e.target.value)}
                placeholder="예: 나는 하루에 한 번밖에 안 쓰는데 이렇게까지 되는 건 이상해"
              />
              <div className="nav-row">
                <button className="btn ghost small" onClick={() => setShowCritique(false)}>
                  취소
                </button>
                <button className="btn small" disabled={!critique.trim()} onClick={() => onCritique(critique.trim())}>
                  다시 만들어줘 🔄
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
