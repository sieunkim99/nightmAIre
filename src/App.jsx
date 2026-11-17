import { useEffect, useRef, useState } from "react";
import { api, accessCode } from "./lib/api.js";
import { DEMO_MATERIAL } from "../server/generator/demo.mjs";
import DreamCanvas from "./components/DreamCanvas.jsx";
const blank = () => ({
  kind: "experience",
  situation: "",
  want: "",
  applied: "",
  feeling: "",
  object: "",
  veto: "",
  clarification: ""
});
const questions = [["situation", "AI랑 있었던 일이나, AI가 있는 미래를 이야기해 줄래?", "사람의 진짜 이름이나 학교 이름은 쓰지 않아도 돼."], ["want", "그때 무엇을 하고 싶었어?", "편리했던 점이나 이루고 싶었던 일을 써도 좋아. 잘 모르겠으면 넘겨도 돼."], ["applied", "AI가 무엇을 했고, 그다음에는 어떤 일이 있었어?", "네가 직접 한 일이나 상상한 일을 적어 줘. 달라진 게 없어도 괜찮아."]];
export default function App() {
  const [phase, setPhase] = useState("start"),
    [health, setHealth] = useState(null),
    [error, setError] = useState("");
  const [code, setCode] = useState(""),
    [needCode, setNeedCode] = useState(false);
  const [material, setMaterial] = useState(blank),
    [step, setStep] = useState(0),
    [prepared, setPrepared] = useState(null);
  const [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState([]),
    [note, setNote] = useState(""),
    [object, setObject] = useState(""),
    [intensity, setIntensity] = useState("mild"),
    [delegated, setDelegated] = useState(false);
  const [result, setResult] = useState(null),
    [cut, setCut] = useState(0),
    [imageState, setImageState] = useState("disabled");
  const work = useRef(null),
    imageWork = useRef(null),
    ids = useRef({});
  useEffect(() => {
    let active = true;
    api.health().then(async h => {
      const needs = h.accessRequired && !(await api.checkCode());
      if (active) {
        setHealth(h);
        setNeedCode(needs);
      }
    }).catch(() => {
      if (active) setError("꿈 제작소 서버에 연결하지 못했어요. 연결한 뒤 새로고침해 주세요.");
    });
    return () => {
      active = false;
      work.current?.abort();
      imageWork.current?.abort();
    };
  }, []);
  const update = (key, value) => setMaterial(m => ({
    ...m,
    [key]: value,
    clarification: ""
  }));
  function exit() {
    work.current?.abort();
    imageWork.current?.abort();
    api.discard(ids.current);
    ids.current = {};
    setPhase("start");
    setMaterial(blank());
    setPrepared(null);
    setResult(null);
    setSelected([]);
    setError("");
    setNote("");
    setObject("");
    setIntensity("mild");
    setDelegated(false);
    setStep(0);
  }
  function start() {
    setError("");
    setStep(0);
    setMaterial(health?.mode === "demo" ? {
      ...DEMO_MATERIAL
    } : blank());
    if (health?.mode === "demo") void prepare(DEMO_MATERIAL);else setPhase("material");
  }
  async function prepare(m = material, allowUnknown = false) {
    work.current?.abort();
    const controller = new AbortController();
    work.current = controller;
    setError("");
    setPhase("preparing");
    try {
      const p = await api.prepare({
        material: {
          ...m,
          confirmed: true
        },
        allowUnknown
      }, controller.signal);
      if (controller.signal.aborted) return;
      if (p.action === "clarify") {
        setQuestion(p.question);
        setAnswer("");
        setPhase("clarify");
        return;
      }
      if (p.action === "change_material") {
        setError(p.question);
        setPhase("confirm");
        return;
      }
      if (ids.current.preparedId) api.discard({
        preparedId: ids.current.preparedId
      });
      ids.current = {
        ...ids.current,
        preparedId: p.preparedId
      };
      setPrepared(p);
      setObject(m.object || "");
      setSelected([]);
      setNote("");
      setDelegated(false);
      setPhase("choose");
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e.message);
        setPhase("confirm");
      }
    }
  }
  async function images(r) {
    if (r.imageState === "disabled") return;
    imageWork.current?.abort();
    const controller = new AbortController();
    imageWork.current = controller;
    setImageState("loading");
    try {
      const data = await api.images(r.dreamId, controller.signal);
      if (controller.signal.aborted) return;
      setResult(current => current?.dreamId !== r.dreamId ? current : {
        ...current,
        dream: {
          ...current.dream,
          cuts: current.dream.cuts.map((c, i) => ({
            ...c,
            ...(data.files[i] ? {
              img: data.files[i]
            } : {})
          }))
        }
      });
      setImageState(data.status);
    } catch {
      if (!controller.signal.aborted) setImageState("partial");
    }
  }
  async function generate(gentle = false) {
    work.current?.abort();
    imageWork.current?.abort();
    const controller = new AbortController();
    work.current = controller;
    setPhase("generating");
    setError("");
    const level = gentle ? "mild" : intensity;
    try {
      const r = await api.dream({
        preparedId: prepared.preparedId,
        selection: {
          candidateIds: selected,
          note,
          object,
          intensity: level,
          delegated
        }
      }, controller.signal);
      if (controller.signal.aborted) return;
      if (ids.current.dreamId) api.discard({
        dreamId: ids.current.dreamId
      });
      ids.current = {
        ...ids.current,
        dreamId: r.dreamId
      };
      setIntensity(level);
      setResult(r);
      setCut(0);
      setImageState(r.imageState);
      setPhase("reading");
      void images(r);
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e.message);
        setPhase("choose");
      }
    }
  }
  async function unlock() {
    accessCode.set(code.trim());
    if (await api.checkCode()) {
      setNeedCode(false);
      setError("");
    } else setError("접속 코드가 맞는지 확인해 주세요.");
  }
  const busy = ["preparing", "generating"].includes(phase),
    scene = result?.dream.scenes[cut],
    shot = result?.dream.cuts[cut];
  return <div className="app generator-app">
    <header className="brand"><span>nightm<b style={{
          color: "var(--accent)"
        }}>AI</b>re · 꿈 제작소</span>{phase !== "start" && <button className="btn small ghost" onClick={exit}>그만하고 나오기</button>}</header>
    {error && <div className="generator-error" role="alert">{error}</div>}
    {phase === "start" && <div className="hero"><div className="moon" /><h1>꿈에 무엇을 데려갈까?</h1><p>네 이야기와 ‘만약’을 섞어서 기묘한 꿈을 만들자.<br />이건 네 미래의 예고가 아니라 함께 만드는 상상이야.<br />마음에 안 드는 재료는 빼고, 언제든 나올 수 있어.</p>{health?.mode === "demo" && <p className="generator-notice">지금은 준비된 예시를 둘러볼 수 있어. 네 경험을 분석한 꿈은 아니야.</p>}{needCode ? <div className="card"><label htmlFor="access-code">접속 코드</label><input id="access-code" value={code} onChange={e => setCode(e.target.value)} autoComplete="off" /><button className="btn" onClick={unlock} disabled={!code.trim()}>확인</button></div> : <button className="btn" onClick={start} disabled={!health}>{health?.mode === "demo" ? "예시 꿈 둘러보기" : "재료 이야기하기"}</button>}</div>}
    {phase === "material" && <div><h2 className="step-title">재료 이야기하기</h2><p className="step-sub">꿈 제작 도우미에게 조각 하나씩 건네줘.</p>{step === 0 && <div className="chips">{[["experience", "내가 겪은 일"], ["imagination", "상상한 미래"], ["example", "준비된 예시"]].map(([key, label]) => <button key={key} className={"chip" + (material.kind === key ? " on" : "")} aria-pressed={material.kind === key} onClick={() => key === "example" ? (setMaterial({
          ...DEMO_MATERIAL
        }), setPhase("confirm")) : update("kind", key)}>{label}</button>)}</div>}<div className="card"><label className="field-label" htmlFor="material-answer">{questions[step][1]}</label><p className="step-sub">{questions[step][2]}</p><textarea id="material-answer" maxLength={1500} rows={4} value={material[questions[step][0]]} onChange={e => update(questions[step][0], e.target.value)} /></div><div className="nav-row"><button className="btn ghost" onClick={() => step ? setStep(step - 1) : exit()}>이전</button><button className="btn" disabled={step === 0 && !material.situation.trim()} onClick={() => step < 2 ? setStep(step + 1) : setPhase("confirm")}>{step === 2 ? "내 재료 확인" : "다음"}</button>{step > 0 && <button className="btn ghost" onClick={() => {
          update(questions[step][0], "");
          step < 2 ? setStep(step + 1) : setPhase("confirm");
        }}>이 질문은 넘기기</button>}</div></div>}
    {phase === "confirm" && <div><h2 className="step-title">네가 남긴 재료, 맞아?</h2><p className="step-sub">네 말 그대로 모았어. 고치거나 비워 둬도 괜찮아.</p><div className="card">{[["situation", "이야기의 출발점"], ["want", "바랐던 것"], ["applied", "AI와 내가 한 일"], ["feeling", "그때 기분 · 선택"], ["object", "꿈에 데려갈 것 · 선택"], ["veto", "꿈에 넣고 싶지 않은 것 · 선택"]].map(([key, label]) => <label className="generator-field" key={key}>{label}<textarea maxLength={key === "object" ? 200 : 1500} rows={key === "situation" ? 3 : 2} value={material[key] || ""} onChange={e => update(key, e.target.value)} /></label>)}</div><p className="generator-notice">{material.kind === "experience" ? "실제 경험으로 남길게." : material.kind === "example" ? "가상 예시로 남길게." : "네가 상상한 미래로 남길게."}</p><div className="nav-row"><button className="btn ghost" onClick={() => {
          setStep(0);
          setPhase("material");
        }}>다른 재료</button><button className="btn" disabled={!material.situation.trim()} onClick={() => prepare()}>이 재료로 세계 씨앗 만들기</button></div></div>}
    {busy && <div className="hero" role="status"><div className="moon" /><h2>{phase === "preparing" ? "서로 다른 ‘만약’을 찾고 있어" : "고른 세계들을 꿈으로 엮고 있어"}</h2><p>조금 기다려 줘. 기다리는 동안에도 나올 수 있어.</p><button className="btn ghost" onClick={exit}>멈추고 나오기</button></div>}
    {phase === "clarify" && <div className="card"><h2 className="step-title">이 부분만 더 알려줄래?</h2><label className="generator-field">{question}<textarea value={answer} maxLength={1500} onChange={e => setAnswer(e.target.value)} /></label><div className="nav-row"><button className="btn ghost" onClick={() => prepare(material, true)}>잘 모르겠어 · 넘기기</button><button className="btn" disabled={!answer.trim()} onClick={() => {
          const m = {
            ...material,
            clarification: answer
          };
          setMaterial(m);
          prepare(m, true);
        }}>이야기 이어가기</button></div></div>}
    {phase === "choose" && prepared && <div><h2 className="step-title">꿈에 넣을 세계를 골라줘</h2><p className="step-sub">하나를 고르거나 여러 개를 섞어도 좋아.</p><p className="generator-notice">{prepared.notice}</p><div className="generator-worlds">{prepared.candidates.map(c => <button key={c.id} className={"card generator-world" + (selected.includes(c.id) ? " selected" : "")} aria-pressed={selected.includes(c.id)} onClick={() => {
          setDelegated(false);
          setSelected(a => a.includes(c.id) ? a.filter(id => id !== c.id) : a.length < 3 ? [...a, c.id] : a);
        }}><strong>{c.title}</strong><span>{c.preview}</span><span className="generator-choice-mark">{selected.includes(c.id) ? "꿈에 넣었어" : "이 세계 담기"}</span></button>)}</div><button className="btn ghost small" onClick={() => {
        setSelected(prepared.candidates.slice(0, 2).map(c => c.id));
        setDelegated(true);
      }}>고르는 건 맡길래</button><div className="card"><h3>베개 밑에 넣을 쪽지</h3><label className="generator-field">바꾸고 싶은 ‘만약’ · 선택<textarea value={note} maxLength={1000} onChange={e => setNote(e.target.value)} placeholder="예: 두 학교가 하나로 겹친다면?" /></label><label className="generator-field">꿈에 꼭 데려갈 것 · 선택<input value={object} maxLength={200} onChange={e => setObject(e.target.value)} placeholder="물건이나 상상 조각 하나" /></label><p className="step-sub">빈 쪽지여도 괜찮아. 골라 준 세계는 꿈에 반영할게.</p><fieldset className="generator-intensity"><legend>꿈의 느낌</legend>{[["mild", "낯설고 기묘하게"], ["spooky", "조금 으스스하게"]].map(([key, label]) => <label key={key}><input type="radio" name="intensity" checked={intensity === key} onChange={() => setIntensity(key)} />{label}</label>)}</fieldset></div>{prepared.mode === "demo" && <p className="generator-notice">예시에서는 고른 세계와 물건을 연결해 보여줘. 새 ‘만약’ 쪽지로 다른 이야기를 만드는 기능은 실제 생성 모드에서 작동해.</p>}<div className="nav-row">{prepared.mode !== "demo" && <button className="btn ghost" onClick={() => setPhase("confirm")}>재료 고치기</button>}<button className="btn" disabled={!selected.length} onClick={() => generate()}>이 재료를 넣고 꿈 만들기</button></div></div>}
    {phase === "reading" && result && scene && <div><div className="dream-title">「{result.dream.title}」 <span className="badge">{result.mode === "demo" ? "준비된 예시" : "함께 만든 상상"}</span></div><div className="dream-stage">{shot.img ? <img className="scene-img" src={shot.img} alt={scene.image} /> : <DreamCanvas palette={shot.palette} mood={shot.mood} scene={shot.scene} />}<div className="scene-tag">장면 {cut + 1} / {result.dream.scenes.length}</div></div><div className="card scene-card"><div className="scene-place">{scene.place}</div><p className="scene-text">{scene.text}</p><div className="nav-row"><button className="btn ghost small" disabled={cut === 0} onClick={() => setCut(cut - 1)}>앞 장면</button>{cut < result.dream.scenes.length - 1 ? <button className="btn small" onClick={() => setCut(cut + 1)}>다음 장면</button> : <button className="btn small" onClick={() => setPhase("done")}>꿈에서 나오기</button>}</div></div><div className="nav-row">{intensity === "spooky" && <button className="btn ghost small" onClick={() => generate(true)}>덜 무섭게 다시 만들기</button>}<button className="btn ghost small" onClick={() => {
          imageWork.current?.abort();
          setPhase("choose");
        }}>세계와 쪽지 바꾸기</button>{imageState === "partial" && <button className="btn ghost small" onClick={() => images(result)}>준비되지 않은 그림 다시 만들기</button>}</div>{imageState === "loading" && <p className="generator-notice" role="status">그림을 준비하고 있어. 이야기는 먼저 읽어도 돼.</p>}</div>}
    {phase === "done" && <div className="hero"><div className="moon" /><h2>오늘의 꿈은 여기까지</h2><p>네가 고른 세계와 재료로 만든 상상이야.<br />앞으로 꼭 이렇게 된다는 뜻은 아니야.</p><div className="nav-row"><button className="btn ghost" onClick={() => {
          setCut(0);
          setPhase("reading");
        }}>다시 읽기</button><button className="btn" onClick={exit}>마치기</button></div></div>}
  </div>;
}
