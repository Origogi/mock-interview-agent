# 🎨 Design — UI/UX 가이드라인 및 에셋

본 폴더는 Tech-Interviewer AI 프로젝트의 디자인 원칙, 검수 체크리스트, 와이어프레임 및 프로토타입 에셋을 모아둡니다.

## 문서 목차

- [디자인 원칙](#디자인-원칙)
- [디자인 시스템 (v2 Apple-style)](#디자인-시스템-v2-apple-style)
- [20문항 / 4세션 확정 UI 사양](#20문항--4세션-확정-ui-사양)
- [검수 체크리스트](#검수-체크리스트)
- [에셋 인덱스](#에셋-인덱스)
- [핸드오프 가이드](#핸드오프-가이드)

## 디자인 원칙

| 항목 | 기준 |
|-----|------|
| **타이포그래피** | 시스템 폰트 지양, `Pretendard`(한글) + `Inter`(영문). 크기·두께·행간으로 계층구조를 명확히 구분 |
| **곡률 & 여백** | Border Radius `12px` 전후 모던 수치. 일관된 spacing 토큰, 충분한 숨 쉴 공간 |
| **색상 & 대비** | v2 Apple-style 다크 베이스(`--bg: #000`) + 단일 accent(`--accent: #6e74ff`). 그라데이션·이모지 남용 금지 |
| **마이크로 인터랙션** | 호버/트랜지션/로더가 매끄럽게 동작. `cubic-bezier(0.22, 0.61, 0.36, 1)` 일관 적용 |
| **빈 상태** | 텍스트만 두지 않고 dashed 글리프 등 시각 보조로 허전함 채움 |
| **입력 폼** | 다크 배경과 명도 차이 충분(`rgba(255,255,255,0.08)` 이상), Focus 시 accent 외곽선 |
| **모션 접근성** | `prefers-reduced-motion: reduce` 시 모든 모션 자동 비활성화 |

## 디자인 시스템 (v2 Apple-style)

| 토큰 | 값 |
|------|---|
| `--bg` | `#000` |
| `--accent` | `#6e74ff` |
| `--font-display` | Inter Display 계열 |
| `--font-mono` | system-ui mono |
| Border Radius | `12px` (카드) / `18px` (input/bubble) / pill (버튼) |
| 페이지 트랜지션 | zoom + blur cross-fade (out 0.28s → in 0.5s) |

> Page 1/2/3/4는 v2 Apple-style CSS-only 기준으로 적용 완료되었습니다. Page 4 상세 사양은 `design/specs/page4_redesign_v1.md`를 참고하세요.

## 20문항 / 4세션 확정 UI 사양

이 섹션은 FE 구현자가 Page 3/4 및 타임머신 UI를 수정할 때 우선 확인해야 하는 확정 사양이다. 기존 `5개 답변` 기준의 카피, 진행률, 종료 조건은 20문항 정책으로 교체한다.

### 공통 정보 구조

| 세션 순서 | 세션명 | 문항 범위 | 문항 수 |
|----------|--------|----------|--------|
| 1 | CS Fundamentals | Q1~Q5 | 5 |
| 2 | Framework Usage | Q6~Q10 | 5 |
| 3 | Problem Solving | Q11~Q15 | 5 |
| 4 | Communication | Q16~Q20 | 5 |

검수 기준:
- 전체 진행률은 항상 `Qn / Q20` 기준으로 표시한다.
- Page 3, Page 4, 타임머신 모달의 세션 순서는 위 표와 동일해야 한다.
- 각 세션은 정확히 5문항을 가진다. 빈 문항은 임의 점수나 placeholder feedback으로 채우지 않는다.
- 세션 평균은 완료된 유효 문항만 계산한다. 완료 문항이 없으면 `--` 또는 `미완료`로 표시한다.
- 다크 글래스모피즘 톤을 유지하되, 강조 색은 Primary `#7c3aed`와 Secondary `#06b6d4`를 액션과 현재 위치에만 제한적으로 사용한다.

### Page 3 사이드바 상태 토큰

Page 3 사이드바는 4개 세션 그룹/아코디언을 기본 구조로 한다. 각 그룹 헤더에는 `세션명`, `Q 범위`, `완료 수/5`, `평균 점수 또는 미완료`를 표시한다.

| 상태 토큰 | 적용 대상 | 표시 라벨 | 시각 기준 | 인터랙션 기준 |
|----------|----------|----------|----------|--------------|
| 완료 | 답변과 평가가 모두 확정된 문항 | `완료` | 일반 glass surface, 점수 배지 노출, 텍스트 대비 높음 | 상세 열람 및 타임머신 진입 가능 |
| 현재 | 사용자가 지금 답변해야 하는 문항 | `현재` | Primary border `rgba(124,58,237,0.52)`, Cyan focus dot, 그룹 자동 펼침 | keyboard focus와 스크린 리더 현재 위치가 일치해야 함 |
| 대기 | 아직 도달하지 않은 미래 문항 | `대기` | 낮은 대비 `rgba(255,255,255,0.42)`, 점수 미노출 | 클릭 비활성 또는 읽기 전용 |
| 무효화 예정 | 타임머신 확인 중 Qn~Q20에 포함되는 문항 | `무효화 예정` | amber warning tint + 얇은 dashed border, 기존 점수는 muted 처리 | 모달이 닫히면 즉시 원래 상태로 복귀 |
| 미완료 세션 | 완료 문항이 0개이거나 세션 평균을 낼 수 없는 세션 헤더 | `미완료` | subdued glass header, 평균 점수 자리에 `--` | 아코디언은 열 수 있으나 문항 row는 대기/현재 상태를 따른다 |

검수 기준:
- `무효화 예정`은 선택 문항 Qn을 포함한다. 예: Q7을 선택하면 Q7~Q20 전체가 같은 preview 범위다.
- 같은 문항에 `현재`와 `무효화 예정`이 동시에 걸리면 모달 preview 중에는 `무효화 예정`을 우선 표시한다.
- 완료 문항의 Best/Good/Bad 점수 톤은 유지하되, 세션 그룹 색과 경쟁하지 않도록 배지 내부에서만 강하게 쓴다.
- 모바일에서는 사이드바가 drawer 또는 상단 요약으로 접혀도 세션 그룹, 완료 수, 현재 Qn 정보가 사라지면 안 된다.

### Page 4 세션 요약 카드

Page 4는 종합 점수 영역 다음에 4개 세션 요약 카드를 고정 순서로 배치한다.

레이아웃 기준:
- Desktop `>=1200px`: 4열 그리드, 카드 간격 16~20px.
- Tablet `768~1199px`: 2열 그리드.
- Mobile `<768px`: 1열 스택, 카드 내부 텍스트는 2줄 이상 자연스럽게 wrap.
- 카드 높이는 세션 간 균형을 맞춘다. 권장 `min-height: 156px`, 과도한 본문 삽입 금지.
- 카드 안에 또 다른 카드형 박스를 중첩하지 않는다. 필요한 정보는 row, chip, divider로 분리한다.

카드 정보 밀도:
- 필수: `세션명`, `Q 범위`, `평균 점수`, `완료 수/5`, 대표 강점 1개, 개선 포인트 1개.
- 선택: 세션별 Best/Good/Bad 분포 mini bar. 단, 차트가 본문 피드백을 밀어내면 생략한다.
- 미완료 세션은 평균 점수를 만들지 않고 `미완료`와 `완료 0/5`를 명확히 표시한다.

검수 기준:
- 4개 세션 카드가 Page 4 첫 화면에서 최소 1행 이상 보이도록 Hero 영역을 과도하게 키우지 않는다.
- Primary/Cyan은 현재 선택, CTA, 핵심 score highlight에만 사용한다. 4개 카드 전체를 보라/청록으로 채우지 않는다.
- 점수 숫자, 세션명, Q 범위의 계층이 분명해야 한다. 점수만 커지고 세션명이 묻히면 실패다.

### Page 4 상세 피드백 그룹

상세 문항 피드백은 세션별 그룹으로 묶고, 각 그룹 안에 Q row 5개를 둔다.

레이아웃 기준:
- 그룹 순서: CS Fundamentals -> Framework Usage -> Problem Solving -> Communication.
- 그룹 헤더: `세션명`, `Q 범위`, `완료 수/5`, `평균 점수/미완료`를 한 줄에 배치한다.
- 문항 row collapsed 높이는 56~64px를 권장한다. `Qn`, 질문 요약, 상태/점수 배지, expand affordance를 포함한다.
- expanded 영역은 `질문`, `내 답변`, `피드백`, `개선 방향`, `이 질문 다시 답변하기` action 순서로 둔다.
- Desktop에서는 action을 우측 하단에 정렬하고, Mobile에서는 본문 아래 full-width 또는 right-aligned row로 내려 보낸다.

검수 기준:
- 한 화면에 보이는 정보량을 위해 collapsed row는 질문을 1~2줄로 제한하고, 상세 텍스트는 펼침 상태에서만 보여준다.
- 미완료/무효화된 문항은 상세 피드백을 생성하지 않는다. 대신 상태 설명만 보여준다.
- `이 질문 다시 답변하기` 버튼은 보조 CTA다. Primary filled 버튼처럼 보이면 안 된다.
- 모바일에서 질문 요약, 점수 배지, chevron, CTA가 서로 겹치거나 overflow되면 실패다.

### 타임머신 모달 카피 기준

타임머신은 선택 문항을 포함한 이후 전체 타임라인을 다시 만드는 파괴적 되감기다. 모달 본문에는 아래 문장을 독립된 강조 라인으로 반드시 표시한다.

```text
Q{n} 이후 Q20까지 전체 무효화됩니다. (Q{n} 포함)
```

권장 모달 카피:
- 제목: `이 질문으로 되감기`
- 강조 라인: `Q{n} 이후 Q20까지 전체 무효화됩니다. (Q{n} 포함)`
- 보조 문구: `Q1~Q{n-1}의 답변과 평가는 유지됩니다.`
- 설명 문구: `되감기 후 Q{n}부터 새 답변 기준으로 질문, 평가, 최종 리포트가 다시 생성됩니다.`
- Primary CTA: `되감기 실행`
- Secondary CTA: `취소`

검수 기준:
- `Q{n} 이후 Q20까지 전체 무효화` 문장이 다른 설명 문장에 묻히면 실패다. 별도 warning band 또는 굵은 강조 라인으로 분리한다.
- 경고 의미는 amber tint와 명확한 카피로 전달한다. Red full destructive 톤은 사용하지 않는다.
- 모달 preview가 있다면 Page 3 사이드바와 같은 `무효화 예정` 토큰으로 Qn~Q20 범위를 보여준다.
- Primary CTA의 초기 focus는 금지한다. 초기 focus는 `취소`에 둔다.

## 검수 체크리스트

새 화면 구현 또는 UI 변경 시 다음을 통과해야 합니다.

### 1. 타이포그래피
- [ ] `Pretendard` 폰트가 올바르게 적용되었는가?
- [ ] 크기·두께·행간이 계층구조를 명확히 구분하는가?

### 2. 곡률 및 여백
- [ ] Border Radius가 `12px` 전후로 모던하게 적용되었는가?
- [ ] 여백 규칙이 일관적이고 숨 쉴 공간이 충분한가?

### 3. 색상 및 대비
- [ ] 브랜드 accent가 액션·강조점에만 적절히 사용되었는가?
- [ ] 다크 배경과 텍스트/요소 간 명도 대비가 충분한가?

### 4. 마이크로 인터랙션
- [ ] 버튼 호버 효과가 자연스러운가?
- [ ] 화면 전환이 매끄러운가?
- [ ] 로딩 인디케이터가 적절히 표시되는가?

### 5. 빈 화면 및 입력 폼
- [ ] 빈 상태에 아이콘/글리프로 허전함을 채웠는가?
- [ ] 텍스트 입력 필드가 다크 배경과 구분되는가?
- [ ] Focus 시 accent 외곽선이 강조되는가?

### 6. 접근성
- [ ] `prefers-reduced-motion: reduce` 가드가 적용되었는가?

## 에셋 인덱스

### 와이어프레임 (`assets/wireframe/`)
| 파일 | 설명 |
|------|------|
| [`wireframe_page1.png`](./assets/wireframe/wireframe_page1.png) | Page 1 — 홈 (이력서 업로드) |
| [`wireframe_page2.png`](./assets/wireframe/wireframe_page2.png) | Page 2 — 이력서 요약 확인 |
| [`wireframe_page3_collapsed.png`](./assets/wireframe/wireframe_page3_collapsed.png) | Page 3 — 면접 채팅 (히스토리 접힘) |
| [`wireframe_page3_expanded.png`](./assets/wireframe/wireframe_page3_expanded.png) | Page 3 — 면접 채팅 (히스토리 펼침) |
| [`wireframe_page4.png`](./assets/wireframe/wireframe_page4.png) | Page 4 — 최종 결과 리포트 |

### v2 프로토타입 (`assets/redesign/`)
| 파일 | 설명 |
|------|------|
| [`v1-redesign.html`](./assets/redesign/v1-redesign.html) | v2 Apple-style 디자인 standalone HTML 프로토타입 (Page 1~4 전체) |
| [`F28-sample-answer-spec.md`](./assets/redesign/F28-sample-answer-spec.md) | Page 3 — 샘플 답변 채우기 UI 사양 |
| [`F29-early-termination-spec.md`](./assets/redesign/F29-early-termination-spec.md) | Page 3/4 — 면접 조기 종료 UI 사양 |
| [`F30-time-machine-spec.md`](./assets/redesign/F30-time-machine-spec.md) | Page 3/4 — 타임머신 되감기 UI 사양 |

### 상세 사양 (`specs/`)
| 파일 | 설명 |
|------|------|
| [`page4_redesign_v1.md`](./specs/page4_redesign_v1.md) | Page 4 — 최종 결과 리포트 리디자인 상세 사양 |

### 목업 (`assets/mockups/`)
| 파일 | 설명 |
|------|------|
| [`page3_question_journey_mockup.html`](./assets/mockups/page3_question_journey_mockup.html) | Page 3 — 질문 여정 지도 + Question Inspector standalone HTML 목업 |

### 실제 구현 스크린샷 (`assets/prod_screentshot/`)
| 파일 | 설명 |
|------|------|
| `page_1.png` | Page 1 — 기본 상태 |
| `page_1_attached.png` | Page 1 — 파일 첨부 후 상태 |
| `page_1_loading.png` | Page 1 — 업로드 로딩 중 |
| `page_2.png` | Page 2 — 이력서 요약 완료 |
| `Page_3.png` | Page 3 — 면접 채팅 화면 |

## 핸드오프 가이드

v1 → v2 마이그레이션 시 참고할 코드 패턴은 [`migration.md`](./migration.md) 에 정리되어 있습니다.
