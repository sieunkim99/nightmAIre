import { useEffect, useState } from "react";

const LINES = [
  "눈을 감아봐…",
  "네가 넣은 재료가 꿈의 재봉틀로 들어가고 있어",
  "미래의 실 가닥들을 하나씩 당겨보는 중…",
  "꿈이 거의 다 지어졌어…",
];

export default function SleepRitual({ label = "악몽을 만드는 중" }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % LINES.length), 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="sleep">
      <div className="breath" />
      <div>
        <h2 style={{ margin: "0 0 10px" }}>{label}</h2>
        <p key={i}>{LINES[i]}</p>
      </div>
    </div>
  );
}
