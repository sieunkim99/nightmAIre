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

## 생성 경로 (3단계 자동 폴백)

1. **로컬 서버 라이브**: `.env`에 `ANTHROPIC_API_KEY`가 있으면 Express 서버가 Claude API로 악몽 생성·판정 (워크숍 현장용, 연구 로그 수집 포함)
2. **claude.ai 뷰어 라이브**: claude.ai 아티팩트로 열면 뷰어 본인의 Claude 계정으로 생성 (첫 생성 시 1회 허용 필요, 사용량은 뷰어 부담) — 서버·키 배포 없이 라이브 공유 가능
3. **내장 데모**: 둘 다 없으면 사전 제작 악몽 2종을 입력에 맞춰 개인화, 판정은 키워드 휴리스틱

```bash
cp .env.example .env   # 로컬 라이브 모드: 키 입력
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

## 공개 배포 (내 API 키로 돌아가는 라이브 서버)

[Render](https://render.com) 무료 티어 기준 (리포에 `render.yaml` 블루프린트 포함):

1. Render 가입 → **New → Blueprint** → 이 GitHub 리포 연결 → 자동 인식된 설정으로 생성
2. 서비스의 **Environment** 탭에서 입력:
   - `ANTHROPIC_API_KEY`: 내 Anthropic API 키 (리포에는 절대 커밋하지 않는다)
   - `ACCESS_CODE`: 동료에게만 알려줄 접속 코드 — **공개 서버는 소유자 키로 과금되므로 꼭 설정 권장.** 설정하면 생성/판정 시 코드를 한 번 묻고 기기에 저장된다.
3. 배포 완료 후 `https://<서비스명>.onrender.com` 링크를 접속 코드와 함께 공유

주의: 무료 티어는 15분 유휴 시 잠들었다가 첫 접속에 ~1분 걸리고, 디스크가 임시라 서버 로그(`events.jsonl`)는 재배포 시 사라진다 — 워크숍 후 콘솔에서 "서버 로그 내보내기"로 즉시 백업할 것.

## 연구 데이터

- 모든 입력·생성·비판·원칙·판정이 `server/data/events.jsonl`에 기록됨
- 우상단 "콘솔" → 교사/연구자 화면: 악몽 갤러리, 최악의 악몽 투표, JSON 내보내기
- 생성된 악몽마다 `riskCardIds`로 근거 문헌 construct가 태깅되어 분석 시 자동 코딩 가능

## Method — 연구 방법 관점의 시스템 설계

nightmAIre는 "악몽"이라는 사변적 꿈을 PD stimuli로 쓰는 **RtD 프로브**다. 아이의 실제 AI 사용 경험을 재료로, 그 사용이 발전할 수 있는 위험을 개인화된 악몽으로 체험하게 하고, 이를 되돌리는 과정에서 아이의 인식·지식 공백을 데이터로 남긴다.

### 1. 세션 흐름 (아이 1인 기준 4단계)

1. **악몽 재료 넣기** — 실제 AI 사용 상황을 구조화 입력: 서비스, 상황, AI와의 대화 재연(채팅 UI), AI 말의 반영 방식, 그때의 감정. *어른이 만든 시나리오가 아니라 아이 자신의 경험이 시나리오의 씨앗.*
2. **악몽 다이얼** — 위험의 시간 지평(Futures Wheel 깊이)·범위·상실 가치·으스스함을 아이가 직접 조절. 다이얼 선택 자체가 문헌 construct에 매핑된 코딩 데이터이며, 으스스함 다이얼은 공포 수위의 자기결정권(윤리 장치)을 겸한다.
3. **꿈 감상 → 이야기 쓰기** — 꿈은 자막 없이 재생되고(해석의 여지), 아이가 장면마다 이야기를 직접 쓴다(social story). 완성 후 '꿈 기록원의 해몽'(시스템이 문헌 기반으로 지은 서사)과 나란히 비교할 수 있다. 터무니없다고 느끼면 비판을 적고 재생성시킨다(*Questionable Concepts* — 비판을 설계 자원으로).
4. **악몽 되돌리기** — 행동 원칙을 하나씩 적으면 시스템이 원칙이 악몽의 원인을 끊는지 관대하게 판정하고, 끊긴 만큼 꿈을 밝게 다시 짓는다(악몽→반쯤→예쁜 꿈). *어떤 원칙을 넣어도 꿈이 안 바뀌는 지점 = 아이가 모르는 예방 지식.*

### 2. 악몽 생성 엔진 — 하이브리드 Futures Wheel

"Agent-Supported Foresight for AI Systemic Risks" (AI agents for breadth, experts for judgment)의 워크플로우를 단일 LLM 호출 안에 3단계로 구현:

1. **Breadth** — 아이의 사용 사례를 중심에 놓고 1차(3개)→2차(3~4개)→3차(2개) 파급 효과를 여러 갈래로 넓게 전개. 모든 노드는 악몽 카드 덱의 construct와 그 실증 근거에 연결되어야 한다 (*terrifying but true* — 근거 없는 공포 생성 금지).
2. **Judgment** — 갈래 중 한 경로를 세 기준으로 선별: plausibility(그 아이의 재료에서 출발 가능한가) · groundedness(연구에서 관찰된 결과인가) · educational(되돌리기를 떠올릴 수 있는가). 선택 이유가 기록된다.
3. **렌더링** — 선택된 경로만 4컷(기승전결: 일상→뒤틀림→상실의 정점→열린 여운)의 꿈으로. 각 컷은 쇼트 스펙(무대 6종 × 인물 포즈 × 사건 8종 × 카메라 무빙)으로 연출되어 캔버스 렌더러가 단편영화처럼 그린다. 인물은 얼굴 없는 역광 실루엣 — 구체성과 해석의 여지의 균형.

### 3. 문헌 Grounding — 악몽 카드 덱

위험 construct 6종(sycophancy, overreliance, cognitive offloading, emotional dependence, epistemic trust in AI informants, source misattribution)을 아이 언어로 번역한 카드 덱([server/riskDeck.mjs](server/riskDeck.mjs)). 각 카드는 Related Works의 실증 결과(총 12건, 출처 논문 명시)를 evidence로 보유하며, 생성된 악몽의 모든 원인 노드에 근거 논문이 태깅되어 분석 시 자동 코딩된다.

### 4. 수집되는 데이터 (연구 질문 매핑)

| 데이터 | 수집 시점 | 답하는 연구 질문 |
|---|---|---|
| 재료(서비스·상황·대화 재연·감정) | 1단계 | 아이들의 실제 AI 사용 실태, 교사 인식과의 gap |
| 다이얼 선택 | 2단계 | 아이가 지각하는 위험의 시간·범위·가치 차원 |
| 아이가 쓴 장면별 이야기 | 3단계 | 같은 자극에서 아이가 읽어내는(못 읽는) 위험 서사 |
| 비판 + 재생성 이력 | 3단계 | 어떤 위험을 터무니없다고 여기는가(risk dismissal) |
| 행동 원칙 + 판정 결과 | 4단계 | 아이가 아는/모르는 예방 지식 → 교육 내용 identify |
| wheel 전체·selectedPath·judgment·evidence | 생성 시 | 입력→문헌 construct 매핑의 추적 가능성 |

모든 이벤트는 서버 `server/data/events.jsonl`(append-only)과 기기 localStorage에 이중 기록되고, 교사/연구자 콘솔에서 갤러리·최악의 악몽 투표·JSON 내보내기를 제공한다.

### 5. 안전·윤리 장치

- 악몽은 은유적·몽환적으로만: 자해·죽음·사실적 폭력 금지, 공포는 '상실과 낯섦'으로 표현 (프롬프트에 강제)
- 으스스함 수위를 아이가 직접 선택
- 악몽은 절망이 아닌 열린 여운(되돌릴 수 있다는 암시)으로 끝남
- 아이의 사용을 평가·훈계하지 않음, 판정은 관대하고 격려 중심

## 설계 근거 (노션 11/3 미팅 페이지와 매핑)

| 화면 | 연구 질문 / 기대효과 |
|---|---|
| 악몽 재료 넣기 (채팅 재연) | 아이들의 실제 AI 사용과 교사 인식의 gap 파악 |
| 악몽 다이얼 | risk 차원(문헌 construct)을 아이 말로 번역 + 으스스함 다이얼로 윤리 수위 아이가 직접 조절 |
| 악몽 생성 (Futures Wheel) | 개인화된 speculative harm 경험, 카드 덱으로 문헌 grounding |
| 말도 안 돼! (비판→재생성) | 어떤 위험을 터무니없다고 여기는지 수집 (Questionable Concepts) |
| 해석 쓰기 | social story 기법 |
| 악몽 되돌리기 (원칙→판정→재생성) | 아이가 모르는 예방 지식 식별 → 무엇을 가르쳐야 할지 identify |
