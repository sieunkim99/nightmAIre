import { useState } from "react";

// riskDeck.mjs의 DIALS와 동일한 구조 (서버 /api/deck에서 받아올 수도 있지만
// 데모 안정성을 위해 프론트에도 내장)
const DIALS = [
  {
    key: "horizon",
    label: "언제쯤의 악몽을 볼까?",
    options: [
      { id: "soon", label: "내일" },
      { id: "year", label: "1년 뒤" },
      { id: "grown", label: "어른이 됐을 때" },
    ],
  },
  {
    key: "scope",
    label: "누구에게 일어나는 악몽일까?",
    options: [
      { id: "me", label: "나" },
      { id: "friends", label: "나와 친구들" },
      { id: "all", label: "모두" },
    ],
  },
  {
    key: "loss",
    label: "무엇을 잃어버리는 악몽일까?",
    options: [
      { id: "thinking", label: "내 생각", hint: "스스로 생각하는 힘" },
      { id: "heart", label: "내 마음", hint: "감정과 마음의 힘" },
      { id: "friendship", label: "친구 사이", hint: "사람들과의 관계" },
      { id: "truth", label: "진짜 가리기", hint: "진짜와 가짜를 구분하는 눈" },
    ],
  },
  {
    key: "spooky",
    label: "얼마나 으스스하게 볼래?",
    options: [
      { id: "mild", label: "조금 으스스 🌙" },
      { id: "spooky", label: "많이 으스스 🌑" },
    ],
  },
];

export default function Dials({ onDone, onBack }) {
  const [values, setValues] = useState({});
  const ready = DIALS.every((d) => values[d.key]);

  return (
    <div>
      <h2 className="step-title">2. 악몽 다이얼 돌리기</h2>
      <p className="step-sub">네가 넣은 재료로 어떤 악몽을 만들지 직접 정해봐.</p>

      {DIALS.map((d) => (
        <div className="card" key={d.key}>
          <label className="field-label" style={{ marginTop: 0 }}>
            {d.label}
          </label>
          <div className="chips">
            {d.options.map((o) => (
              <button
                key={o.id}
                className={"chip" + (values[d.key] === o.id ? " on" : "")}
                onClick={() => setValues({ ...values, [d.key]: o.id })}
              >
                {o.label}
                {o.hint && <span className="hint">{o.hint}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="nav-row">
        <button className="btn ghost" onClick={onBack}>
          ← 재료 고치기
        </button>
        <button className="btn" disabled={!ready} onClick={() => onDone(values)}>
          악몽 만들기 🌙
        </button>
      </div>
    </div>
  );
}
