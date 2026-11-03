import { useEffect, useState } from "react";
import DreamCanvas from "./DreamCanvas.jsx";

// 꿈은 자막 없이 재생되고, 이야기는 아이가 쓴다.
// watch(감상) → write(장면마다 이야기 쓰기) → review(내 이야기 완성 + 꿈 기록원의 해몽과 비교)
// 시스템이 만든 내레이션은 숨겨진 '해몽'으로만 존재한다 — 아이의 해석이 먼저다.

const CUT_MS = 7000;

export default function DreamPlayer({ dream, mode, onStory, onCritique }) {
  const [phase, setPhase] = useState("watch"); // watch | write | review
  const [cut, setCut] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [story, setStory] = useState(() => dream.cuts.map(() => ""));
  const [reveal, setReveal] = useState(false);
  const [critique, setCritique] = useState("");
  const [showCritique, setShowCritique] = useState(false);

  useEffect(() => {
    if (phase !== "watch" || !playing) return;
    const t = setTimeout(() => {
      if (cut < dream.cuts.length - 1) setCut(cut + 1);
      else {
        setPlaying(false);
        setPhase("write");
        setCut(0);
      }
    }, CUT_MS);
    return () => clearTimeout(t);
  }, [cut, playing, phase, dream]);

  const c = dream.cuts[cut];
  const storyDone = story.every((s) => s.trim());

  return (
    <div>
      <div className="dream-title">
        「{dream.title}」
        <span className={"badge " + (mode === "demo" ? "demo" : "live")}>{mode === "demo" ? "데모" : "AI 생성"}</span>
      </div>

      <div className="dream-stage" style={phase === "review" ? { aspectRatio: "16/7" } : undefined}>
        <DreamCanvas palette={c.palette} mood={c.mood} scene={c.scene || null} motifs={c.motifs || []} />
        <div className="grain" />
        <div className="scanlines" />
        <div className="vignette" />
        <div className="scene-tag">장면 {cut + 1} / {dream.cuts.length}</div>
        {phase === "write" && story[cut].trim() && (
          <div className="narration" style={{ fontSize: 16 }}>{story[cut]}</div>
        )}
        {phase === "review" && (
          <div className="narration" style={{ fontSize: 16 }}>{story[cut]}</div>
        )}
      </div>

      <div className="cut-dots">
        {dream.cuts.map((_, i) => (
          <span
            key={i}
            className={i === cut ? "on" : ""}
            onClick={() => {
              setCut(i);
              if (phase === "watch") setPlaying(false);
            }}
            style={{ cursor: "pointer" }}
          />
        ))}
      </div>

      {phase === "watch" && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <p className="step-sub" style={{ marginBottom: 12 }}>
            네 재료로 지어진 악몽이야. 소리 없는 꿈처럼, 일단 끝까지 봐봐.
          </p>
          <button
            className="btn small ghost"
            onClick={() => {
              setPlaying(false);
              setPhase("write");
              setCut(0);
            }}
          >
            다 봤어, 이야기 쓰러 가기 ✍️
          </button>
        </div>
      )}

      {phase === "write" && (
        <div className="card" style={{ marginTop: 14 }}>
          <label className="field-label" style={{ marginTop: 0 }}>
            이 꿈의 이야기는 네가 쓰는 거야. <b>장면 {cut + 1}</b>에선 무슨 일이 일어나고 있을까?
          </label>
          <textarea
            value={story[cut]}
            onChange={(e) => setStory(story.map((s, i) => (i === cut ? e.target.value : s)))}
            placeholder={cut === 0 ? "예: 밤마다 나는 화면 앞에 앉아서…" : "이 장면에서는…"}
          />
          <div className="nav-row">
            <button className="btn ghost small" disabled={cut === 0} onClick={() => setCut(cut - 1)}>
              ← 앞 장면
            </button>
            {cut < dream.cuts.length - 1 ? (
              <button className="btn small" disabled={!story[cut].trim()} onClick={() => setCut(cut + 1)}>
                다음 장면 →
              </button>
            ) : (
              <button className="btn small" disabled={!storyDone} onClick={() => { setPhase("review"); setCut(0); }}>
                이야기 완성 →
              </button>
            )}
          </div>
        </div>
      )}

      {phase === "review" && (
        <div style={{ marginTop: 14 }}>
          <div className="card">
            <label className="field-label" style={{ marginTop: 0 }}>
              네가 쓴 악몽 이야기
            </label>
            <ol className="principles">
              {story.map((s, i) => (
                <li key={i} onClick={() => setCut(i)} style={{ cursor: "pointer" }}>
                  {s}
                  {reveal && (
                    <span style={{ display: "block", color: "var(--ink-dim)", fontSize: 13, marginTop: 2 }}>
                      🌙 꿈 기록원의 해몽: {dream.cuts[i].narration}
                    </span>
                  )}
                </li>
              ))}
            </ol>
            <button className="btn small ghost" onClick={() => setReveal(!reveal)}>
              {reveal ? "해몽 접기" : "🌙 꿈 기록원의 해몽과 비교해보기"}
            </button>
          </div>

          {!showCritique ? (
            <div className="nav-row" style={{ justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn small ghost" onClick={() => { setPhase("watch"); setPlaying(true); setCut(0); }}>
                🔁 꿈 다시 보기
              </button>
              <button className="btn small danger" onClick={() => setShowCritique(true)}>
                이 꿈은 말도 안 돼! 😤
              </button>
              <button className="btn small" onClick={() => onStory(story)}>
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
