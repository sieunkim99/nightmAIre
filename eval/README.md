# 악몽 평가 하네스

악몽을 "분위기"에서 "이야기"로 바꾸기 위한 실험 장치. 같은 재료로 **파이프라인 × 모델** 조합을 돌리고, LLM 판정기 2개와 사람 블라인드 채점으로 비교한다.

```bash
npm run eval -- --run smoke --fixtures math-copy             # 재료 1개로 전 조합
npm run eval -- --run r1 --models claude-opus-5-5,gpt-5.5    # 재료 6개, 모델 2개
npm run eval:report -- eval/runs/r1                          # 리포트만 다시 만들기
```

옵션: `--models` `--pipelines` `--fixtures` `--judges` (쉼표 구분) `--concurrency`. 같은 `--run` 이름으로 다시 돌리면 성공한 조합은 건너뛴다. 결과는 `eval/runs/<이름>/`(git 제외)에 `results.jsonl`, `judgments.jsonl`, `report.html`로 남는다. `.env`에 `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`가 필요하다. `EVAL_EFFORT`(기본 medium)로 추론 강도를 바꾼다.

## 무엇을 비교하나

| 파이프라인 | 호출 | 확인하려는 것 |
|---|---|---|
| `baseline` | 1 | 지금 앱 프롬프트(`server/prompts.mjs`), 4컷 |
| `single` | 1 | 새 이야기 구조(`server/storyPrompts.mjs`)를 한 번에 — 프롬프트만 바꾼 효과 |
| `staged` | 2 | plan → write — 기획을 따로 떼어낸 효과 |
| `critic` | 4 | plan → write → 편집자 메모 → 고쳐쓰기 — 편집 루프의 효과 |

모델: `claude-opus-5-5` `claude-sonnet-5-5` `claude-haiku-5-5` `claude-fable-5-1` `gpt-5.5` `gpt-6.1-sol` `gpt-5.4-mini` ([providers.mjs](providers.mjs)에서 추가/제거).

## v2 이야기 구조 (storyPrompts.mjs)

1. **소원이 먼저** — 꿈은 처음에 아이가 원하던 걸 들어준다. 부러워야 대가가 아프다.
2. **아이의 말 그대로** — 재연한 AI의 말이 리프레인으로 세 번 나오며 뜻이 바뀐다.
3. **대가는 장면으로** — "생각하는 힘이 사라진다" 대신 "짝꿍이 내 이름을 두 번 묻는다".
4. **꿈의 규칙 하나** — 아이 습관을 과장한 규칙이 꿈을 움직인다.
5. **깬 뒤의 흔적** — 현실 물건 하나에 꿈이 남고, 아직 바꿀 수 있다는 여운.

6장면: opening → rule → wish → cost → climax → wake.

### 바뀐 입력 / 레버

- 입력 추가: `nickname`(주인공 이름), `want`(그때 진짜 원한 것), `frequency`(얼마나 자주), `people`, `objects`
- 다이얼: `horizon`(유지) · `genre`(새로: 학교 괴담 / 반복되는 하루 / 이상한 나라 / 미래의 하루) · `loss`(auto 추가) · `spooky`(유지). `scope`는 people 입력으로 대체.
- 출력: `title, logline, rule, refrain, scenes[6]{beat, place, text, line, image}, trace, causes[], riskCardIds`. `causes`는 기존 되돌리기 판정과 호환.

## 채점

[judge.mjs](judge.mjs) — 구체성 · 이야기 · 뜨끔함 · 꿈다움 · 근거 · 되돌릴 여지 · 읽힘 (각 1~5), 안전/훈계 여부, 종합 1~10. 판정기는 텍스트만 보고 누가 썼는지 모른다. 자기 선호 편향 때문에 Claude와 GPT 판정을 따로 보여준다.

주의: v2는 6장면이라 baseline(4컷)보다 길다. 판정 프롬프트에 "길이로 점수 주지 말 것"을 넣었지만, 결론은 리포트의 **블라인드 읽기**(사람 채점)로 확인할 것.
