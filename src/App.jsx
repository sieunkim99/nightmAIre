import { useEffect, useMemo, useRef, useState } from "react";
import { accessCode, api } from "./lib/api.js";
import { newSessionId, saveSession } from "./lib/store.js";
import MaterialForm from "./components/MaterialForm.jsx";
import Dials from "./components/Dials.jsx";
import SleepRitual from "./components/SleepRitual.jsx";
import DreamPlayer from "./components/DreamPlayer.jsx";
import ReversePanel from "./components/ReversePanel.jsx";
import Console from "./components/Console.jsx";

export default function App() {
  const [phase, setPhase] = useState("start"); // start | material | dials | sleeping | dream | reverse | done | console
  const [serverMode, setServerMode] = useState("…");
  const [material, setMaterial] = useState(null);
  const [dials, setDials] = useState(null);
  const [dream, setDream] = useState(null);
  const [dreamMode, setDreamMode] = useState("demo");
  const [critiques, setCritiques] = useState([]);
  const [story, setStory] = useState(null); // 아이가 쓴 장면별 이야기
  const [judge, setJudge] = useState(null);
  const [judging, setJudging] = useState(false);
  const [toast, setToast] = useState("");
  const session = useRef(null);

  // 되돌리기 단계에서는 아이가 쓴 이야기가 꿈의 내레이션이 된다
  const reverseDream = useMemo(() => {
    if (!dream) return null;
    if (!story) return dream;
    return {
      ...dream,
      cuts: dream.cuts.map((c, i) => ({ ...c, narration: story[i]?.trim() || c.narration })),
    };
  }, [dream, story]);

  const [needCode, setNeedCode] = useState(false);
  const [codeDraft, setCodeDraft] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);

  useEffect(() => {
    api
      .health()
      .then(async (h) => {
        setServerMode(h.mode);
        if (h.accessRequired) {
          // 저장된 코드가 있으면 그대로 통과, 없거나 틀리면 첫 화면에서 한 번 입력
          setNeedCode(!(accessCode.get() && (await api.checkCode())));
        }
      })
      .catch(() => setServerMode("offline"));
  }, []);

  async function saveCode() {
    const c = codeDraft.trim();
    if (!c) return;
    setCodeBusy(true);
    accessCode.set(c);
    const ok = await api.checkCode();
    setCodeBusy(false);
    if (ok) {
      setNeedCode(false);
      showToast("접속 코드 확인 완료! 이 기기에 저장됐어요.");
    } else {
      showToast("코드가 맞지 않아요. 다시 확인해줘!");
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function generate(mat, dls, crits) {
    setPhase("sleeping");
    try {
      const { dream: d, mode } = await api.dream({
        material: mat,
        dials: dls,
        critiques: crits,
        sessionId: session.current.id,
      });
      setDream(d);
      setDreamMode(mode);
      session.current = { ...session.current, material: mat, dials: dls, critiques: crits, dream: d, mode };
      saveSession(session.current);
      setPhase("dream");
    } catch (e) {
      showToast("꿈 공장에 문제가 생겼어요: " + e.message);
      setPhase("dials");
    }
  }

  async function runJudge(principles) {
    setJudging(true);
    try {
      const { result } = await api.judge({ dream: reverseDream, principles, sessionId: session.current.id });
      setJudge(result);
      session.current = { ...session.current, principles, judge: result, finalState: result.dreamState };
      saveSession(session.current);
    } catch (e) {
      showToast("판정에 문제가 생겼어요: " + e.message);
    } finally {
      setJudging(false);
    }
  }

  function start() {
    session.current = { id: newSessionId(), startedAt: new Date().toISOString() };
    setMaterial(null);
    setDials(null);
    setDream(null);
    setJudge(null);
    setCritiques([]);
    setStory(null);
    setPhase("material");
  }

  return (
    <div className="app">
      <div className="brand">
        <span>
          nightm<b style={{ color: "var(--accent)" }}>AI</b>re · 악몽 공장
        </span>
        <button className="mode-chip" onClick={() => setPhase(phase === "console" ? "start" : "console")}>
          {phase === "console" ? "닫기" : `콘솔 · ${serverMode}`}
        </button>
      </div>

      {phase === "start" && (
        <div className="hero">
          <div className="moon" />
          <h1>
            nightm<span className="ai">AI</span>re
          </h1>
          <p>
            네가 AI를 쓰는 진짜 이야기를 재료로 넣으면,
            <br />
            그 이야기가 자라서 만들어질 수 있는 <b>먼 미래의 악몽</b>을 보여주는 꿈 공장이야.
            <br />
            그리고 — 악몽은 되돌릴 수 있어.
          </p>
          {needCode ? (
            <div className="card" style={{ width: "min(340px, 90%)", textAlign: "left" }}>
              <label className="field-label" style={{ marginTop: 0 }}>
                🔑 접속 코드 (한 번만 입력하면 이 기기에 저장돼요)
              </label>
              <div className="chat-input-row" style={{ marginTop: 0 }}>
                <input
                  type="text"
                  placeholder="진행자에게 받은 코드"
                  value={codeDraft}
                  onChange={(e) => setCodeDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) saveCode();
                  }}
                />
                <button className="btn small" disabled={codeBusy || !codeDraft.trim()} onClick={saveCode}>
                  {codeBusy ? "확인 중…" : "확인"}
                </button>
              </div>
            </div>
          ) : (
            <button className="btn" onClick={start}>
              악몽 만들러 가기 🌙
            </button>
          )}
        </div>
      )}

      {phase === "material" && <MaterialForm onBack={() => setPhase("start")} onDone={(m) => { setMaterial(m); setPhase("dials"); }} />}

      {phase === "dials" && (
        <Dials
          onBack={() => setPhase("material")}
          onDone={(d) => {
            setDials(d);
            setCritiques([]);
            generate(material, d, []);
          }}
        />
      )}

      {phase === "sleeping" && <SleepRitual />}

      {phase === "dream" && dream && (
        <DreamPlayer
          key={`${dream.title}-${critiques.length}`}
          dream={dream}
          mode={dreamMode}
          onCritique={(c) => {
            const next = [...critiques, c];
            setCritiques(next);
            session.current = { ...session.current, critiques: next };
            saveSession(session.current);
            generate(material, dials, next);
          }}
          onStory={(arr) => {
            setStory(arr);
            session.current = { ...session.current, story: arr };
            saveSession(session.current);
            setPhase("reverse");
          }}
        />
      )}

      {phase === "reverse" && reverseDream && (
        <ReversePanel
          dream={reverseDream}
          judge={judge}
          judging={judging}
          onJudge={runJudge}
          onFinish={() => setPhase("done")}
        />
      )}

      {phase === "done" && (
        <div className="hero">
          <div className="moon" style={{ background: "radial-gradient(circle at 35% 35%, #fff8d0, #ffd98a 45%, #b8862a 100%)", boxShadow: "0 0 60px 10px rgba(255,217,138,.35)" }} />
          <h1 style={{ fontSize: 30 }}>
            {judge?.dreamState === "good" ? "네가 꿈을 되돌렸어 ✨" : "오늘의 꿈 기록 완료"}
          </h1>
          <p>
            「{dream?.title}」{story?.[story.length - 1] && <><br />네 이야기의 마지막 장면: “{story[story.length - 1]}”</>}
            <br />
            네가 쓴 이야기 {story?.length || 0}장면과 원칙 {session.current?.principles?.length || 0}개가 기록됐어.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn ghost" onClick={() => setPhase("console")}>
              악몽 전시회 보기
            </button>
            <button className="btn" onClick={start}>
              새 악몽 만들기
            </button>
          </div>
        </div>
      )}

      {phase === "console" && <Console onBack={() => setPhase("start")} />}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
