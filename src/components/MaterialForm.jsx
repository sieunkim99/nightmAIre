import { useState } from "react";

const SERVICES = ["ChatGPT", "Gemini", "제타(캐릭터 챗)", "유튜브 추천", "검색 AI", "숙제 도우미 앱"];
const FEELINGS = ["😌 편했어", "😆 신났어", "🤔 찜찜했어", "😳 뜨끔했어", "😐 아무렇지 않았어"];

export default function MaterialForm({ onDone, onBack }) {
  const [service, setService] = useState("");
  const [customService, setCustomService] = useState("");
  const [situation, setSituation] = useState("");
  const [chat, setChat] = useState([]);
  const [who, setWho] = useState("me");
  const [draft, setDraft] = useState("");
  const [applied, setApplied] = useState("");
  const [feeling, setFeeling] = useState("");

  const svc = service === "직접 입력" ? customService : service;
  const ready = svc && situation.trim() && applied.trim() && feeling;

  function addBubble() {
    if (!draft.trim()) return;
    setChat([...chat, { role: who, text: draft.trim() }]);
    setDraft("");
    setWho(who === "me" ? "ai" : "me");
  }

  return (
    <div>
      <h2 className="step-title">1. 악몽 재료 넣기</h2>
      <p className="step-sub">
        진짜 있었던 일을 넣을수록 진짜 같은 악몽이 만들어져.
        <br />
        정답은 없어 — 네가 AI를 쓰는 진짜 모습이 재료야.
      </p>

      <div className="card">
        <label className="field-label">어떤 AI를 썼어?</label>
        <div className="chips">
          {[...SERVICES, "직접 입력"].map((s) => (
            <button key={s} className={"chip" + (service === s ? " on" : "")} onClick={() => setService(s)}>
              {s}
            </button>
          ))}
        </div>
        {service === "직접 입력" && (
          <div style={{ marginTop: 10 }}>
            <input
              type="text"
              placeholder="서비스 이름을 적어줘"
              value={customService}
              onChange={(e) => setCustomService(e.target.value)}
            />
          </div>
        )}

        <label className="field-label">어떤 상황이었어?</label>
        <input
          type="text"
          placeholder="예: 수학 숙제가 너무 어려웠을 때 / 친구랑 싸우고 속상했을 때"
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
        />
      </div>

      <div className="card">
        <label className="field-label" style={{ marginTop: 0 }}>
          그때 {svc || "AI"}와 나눈 이야기를 재연해봐 <span style={{ opacity: 0.6 }}>(선택)</span>
        </label>
        <div className="chat-box">
          {chat.length === 0 && (
            <span style={{ color: "var(--ink-dim)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
              기억나는 대로 몇 마디만 적어도 좋아
            </span>
          )}
          {chat.map((m, i) => (
            <div key={i} className={"bubble " + m.role}>
              {m.text}
              <button className="del" onClick={() => setChat(chat.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="chat-input-row">
          <button className={"who" + (who === "me" ? " me" : "")} onClick={() => setWho(who === "me" ? "ai" : "me")}>
            {who === "me" ? "🙋 나" : "🤖 AI"}
          </button>
          <input
            type="text"
            placeholder={who === "me" ? "내가 한 말…" : "AI가 한 말…"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // 한글 IME 조합 중의 Enter는 무시 — 조합 확정 Enter가 중복 처리되어
              // 마지막 글자만 담긴 말풍선이 하나 더 생기는 버그 방지
              if (e.key === "Enter" && !e.nativeEvent.isComposing) addBubble();
            }}
          />
          <button className="btn small ghost" onClick={addBubble}>
            추가
          </button>
        </div>
      </div>

      <div className="card">
        <label className="field-label" style={{ marginTop: 0 }}>
          AI의 말을 듣고 실제로 어떻게 했어?
        </label>
        <input
          type="text"
          placeholder="예: AI가 알려준 답을 그대로 숙제에 썼어"
          value={applied}
          onChange={(e) => setApplied(e.target.value)}
        />

        <label className="field-label">그때 내 마음은?</label>
        <div className="chips">
          {FEELINGS.map((f) => (
            <button key={f} className={"chip" + (feeling === f ? " on" : "")} onClick={() => setFeeling(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="nav-row">
        <button className="btn ghost" onClick={onBack}>
          ← 처음으로
        </button>
        <button className="btn" disabled={!ready} onClick={() => onDone({ service: svc, situation, chat, applied, feeling })}>
          다음: 악몽 다이얼 →
        </button>
      </div>
    </div>
  );
}
