# nightmAIre — 악몽 공장 (프로토타입)

초등 고학년이 자신의 실제 AI 사용 경험을 재료로 넣으면, 그 사용이 먼 미래에 발전할 수 있는 위험을 '악몽'으로 보여주고, 행동 원칙으로 악몽을 되돌리는 PD stimuli 프로토타입.

**체험 데모**: https://claude.ai/artifact/EkmCJYVrTc78wzNv8po1dD (설치 없이 브라우저에서 내장 데모 엔진으로 동작)

## 실행

```bash
npm install
npm run dev
```

- 웹: http://localhost:5173 (프론트, Vite)
- API: http://localhost:5799 (Express)

## 모드

- **데모 모드** (기본): API 키 없이 동작. 사전 제작된 악몽 2종(공부/생활)을 입력에 맞춰 개인화. 판정은 키워드 휴리스틱.
- **라이브 모드**: `.env`에 `ANTHROPIC_API_KEY`를 넣으면 Claude가 Futures Wheel 기반으로 악몽을 생성하고 원칙을 판정. 실패 시 자동으로 데모로 폴백.

```bash
cp .env.example .env   # 키 입력
```

## 구조

```
server/
  riskDeck.mjs   # 악몽 카드 덱 — Related Works 문헌에 grounding된 위험 construct 6종
  prompts.mjs    # Futures Wheel 생성 프롬프트 + 되돌리기 판정 프롬프트 (안전 수칙 포함)
  demo.mjs       # 오프라인 데모 콘텐츠/판정기
  index.mjs      # API + 연구 데이터 로그 (server/data/events.jsonl, append-only)
src/
  components/    # 재료입력(채팅 재연) → 다이얼 → 수면의식 → 꿈 플레이어 → 되돌리기 → 콘솔
  lib/           # API 클라이언트, localStorage 세션 저장
```

## 연구 데이터

- 모든 입력·생성·비판·원칙·판정이 `server/data/events.jsonl`에 기록됨
- 우상단 "콘솔" → 교사/연구자 화면: 악몽 갤러리, 최악의 악몽 투표, JSON 내보내기
- 생성된 악몽마다 `riskCardIds`로 근거 문헌 construct가 태깅되어 분석 시 자동 코딩 가능

## 설계 근거 (노션 11/3 미팅 페이지와 매핑)

| 화면 | 연구 질문 / 기대효과 |
|---|---|
| 악몽 재료 넣기 (채팅 재연) | 아이들의 실제 AI 사용과 교사 인식의 gap 파악 |
| 악몽 다이얼 | risk 차원(문헌 construct)을 아이 말로 번역 + 으스스함 다이얼로 윤리 수위 아이가 직접 조절 |
| 악몽 생성 (Futures Wheel) | 개인화된 speculative harm 경험, 카드 덱으로 문헌 grounding |
| 말도 안 돼! (비판→재생성) | 어떤 위험을 터무니없다고 여기는지 수집 (Questionable Concepts) |
| 해석 쓰기 | social story 기법 |
| 악몽 되돌리기 (원칙→판정→재생성) | 아이가 모르는 예방 지식 식별 → 무엇을 가르쳐야 할지 identify |
