# F-30 타임머신 — 질문 시점 되감기 & 재답변 UI 사양서

## 개요
특정 질문을 다시 답변하고 싶을 때, 해당 질문의 **답변 전 상태**로 돌아가는 기능이다. 기능명은 **타임머신**, 사용자 동작명은 **되감기**로 고정한다.

**확정 방식:** B-Lite
- FE는 `target_question_index`만 전송한다.
- BE는 LangGraph 체크포인트 히스토리에서 선택 질문의 답변 전 상태를 복원한다.
- UI에는 `checkpoint_id`를 노출하지 않는다.

**MVP 정책:** 파괴적 되감기
- Qn으로 되감으면 Q1~Q(n-1)의 답변/평가는 유지한다.
- Qn의 기존 답변/평가와 Q(n+1) 이후 질문/평가/최종 리포트는 무효화한다.
- 새 답변 제출 이후의 질문, 평가, 리포트는 새 타임라인 기준으로 다시 생성한다.

**핵심 UX 흐름**
1. Page 3 완료 평가 카드 또는 Page 4 상세 피드백에서 되감기 진입점을 클릭한다.
2. 확인 모달에서 파괴적 되감기 범위를 명확히 안내한다.
3. 승인 즉시 전역 full-cover 타임머신 오버레이를 표시한다.
4. Page 4에서 실행한 경우 오버레이 뒤에서 Page 3으로 라우팅한다.
5. 되감기 완료 후 오버레이를 fade out하고, Page 3의 Qn 질문을 현재 질문으로 보여준다.

---

## 1. Page 3 완료 평가 카드 버튼

### 1.1 위치
- **대상:** Page 3 좌측 레일의 완료된 질문/평가 카드.
- **배치:** 카드 헤더 우측 action 영역. 기존 질문 번호/점수/상태 배지의 정보 위계를 방해하지 않도록 가장 우측에 compact icon button으로 둔다.
- **정렬:** 질문 번호와 점수 배지가 있는 첫 줄에서 `margin-left: auto`로 우측 정렬.
- **크기:** `32px x 32px`.
- **간격:** 점수 배지 또는 펼침 chevron과 최소 `8px` gap.
- **우선순위:** 평가 카드의 주 정보는 점수와 피드백이므로, 버튼은 보조 action으로 낮은 대비를 사용한다.

### 1.2 라벨 / 툴팁
- **시각 라벨:** icon-only 권장. 아이콘은 `RotateCcw` 또는 `Clock3` 계열의 lucide 아이콘 사용.
- **ARIA label:** `답변 전으로 되감기`
- **Tooltip:** `답변 전으로 되감기`
- **Tooltip 위치:** 버튼 상단 또는 우상단. 좌측 레일 폭이 좁으면 `right: 0` 기준으로 카드 내부에 걸치지 않게 표시한다.

### 1.3 상태별 시각 사양

| 상태 | 배경 | 아이콘 | Border | 동작 |
|------|------|--------|--------|------|
| Normal | `rgba(255, 255, 255, 0.06)` | `rgba(255, 255, 255, 0.62)` | `1px solid rgba(255, 255, 255, 0.08)` | 클릭 가능 |
| Hover | `rgba(124, 58, 237, 0.16)` | `#c4b5fd` | `1px solid rgba(124, 58, 237, 0.28)` | tooltip 표시 |
| Active | `rgba(124, 58, 237, 0.22)` | `#ede9fe` | same | 버튼 살짝 `translateY(1px)` |
| Focus | Normal 유지 | `#ede9fe` | `1px solid rgba(124, 58, 237, 0.42)` | `box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.24)` |
| Disabled | `rgba(255, 255, 255, 0.035)` | `rgba(255, 255, 255, 0.28)` | `1px solid rgba(255, 255, 255, 0.05)` | 클릭 불가 |

### 1.4 Disabled 조건
다음 조건에서는 버튼을 disabled 처리하고 tooltip은 원인 안내용으로 유지한다. 단, UI가 과밀해지면 disabled 대신 숨김도 허용하되, 완료 평가 카드에는 가능한 한 일관적으로 자리를 유지한다.

- 현재 답변 대기 중인 질문 카드. 아직 답변 전 상태라 되감기 대상이 아니다.
- 평가가 아직 도착하지 않은 질문.
- AI 질문 스트리밍 중.
- 사용자 답변 평가 중.
- 샘플 답변 생성 중.
- 조기 종료 확인 모달 또는 타임머신 확인 모달이 열려 있는 중.
- 타임머신 오버레이 실행 중.
- 인터뷰 세션 ID가 없거나 `target_question_index`를 확정할 수 없는 상태.
- Page 4 리포트 생성 또는 라우팅 전환 중.

**Disabled tooltip 예시**
- `평가가 끝난 질문만 되감을 수 있어요.`
- `진행 중인 응답이 끝난 뒤 사용할 수 있어요.`

---

## 2. Page 4 상세 피드백 버튼

### 2.1 위치 / 위계
- **대상:** Page 4 문항별 상세 피드백 아코디언의 각 Qn 상세 영역.
- **배치:** 상세 피드백 본문 하단 action row의 우측.
- **위계:** 결과 리포트의 주 CTA가 아니라 특정 문항의 보조 수정 action이다. Primary filled 버튼은 사용하지 않고, glass outline 또는 soft accent 버튼을 사용한다.
- **같은 행 구성:** 좌측에는 별도 설명 텍스트를 두지 않는다. 버튼만 우측 정렬해 리포트 읽기 흐름을 방해하지 않는다.

### 2.2 라벨
- **버튼 라벨:** `이 질문 다시 답변하기`
- **ARIA label:** `Qn 이 질문 다시 답변하기`
- **아이콘:** 라벨 좌측에 `RotateCcw` 16px. 텍스트와 `8px` gap.

### 2.3 시각 사양
- **Height:** `36px`
- **Padding:** `0 14px`
- **Border-radius:** `12px`
- **Font-size:** `13px`
- **Font-weight:** `600`
- **Background:** `rgba(124, 58, 237, 0.12)`
- **Color:** `#ddd6fe`
- **Border:** `1px solid rgba(124, 58, 237, 0.28)`
- **Hover:** `background: rgba(124, 58, 237, 0.18); border-color: rgba(6, 182, 212, 0.34); color: #f5f3ff;`
- **Focus ring:** `0 0 0 3px rgba(6, 182, 212, 0.18)`

### 2.4 Disabled 조건
- 리포트가 로딩 중이거나 상세 피드백 데이터가 불완전한 경우.
- 해당 문항의 `target_question_index`를 확정할 수 없는 경우.
- 타임머신 확인 모달 또는 오버레이가 이미 실행 중인 경우.
- 네트워크 요청 진행 중인 경우.

---

## 3. 확인 모달

### 3.1 정보 구조

```
┌────────────────────────────────────────────┐
│ 이 질문으로 되감기                       × │
│                                            │
│ Q3 답변 전으로 돌아갑니다.                 │
│ Q3의 기존 답변과 평가, 이후 질문과         │
│ 최종 리포트는 다시 생성됩니다.             │
│                                            │
│     [취소]            [되감기 실행]         │
└────────────────────────────────────────────┘
```

### 3.2 카피
- **제목:** `이 질문으로 되감기`
- **본문 예시:** `Q{n} 답변 전으로 돌아갑니다. Q{n}의 기존 답변과 평가, 이후 질문과 최종 리포트는 다시 생성됩니다.`
- **보조 문구 선택:** 공간이 허용되면 두 번째 문단으로 `Q1~Q{n-1}의 답변과 평가는 유지됩니다.`를 추가한다.

### 3.3 CTA
- **Primary CTA:** `되감기 실행`
- **Secondary CTA:** `취소`
- **닫기 아이콘:** 우상단 `X`, Secondary CTA와 동일 동작.
- **Tab 순서:** Secondary -> Primary -> Close -> Secondary.
- **초기 포커스:** Secondary CTA. 파괴적 되감기이므로 안전한 선택을 먼저 포커스한다.
- **Primary 로딩 카피:** `되감는 중...`

### 3.4 시각 사양
- **Backdrop:** `rgba(0, 0, 0, 0.58)` + `backdrop-filter: blur(4px)`.
- **Modal width:** `min(440px, calc(100vw - 32px))`.
- **Background:** `rgba(15, 23, 42, 0.88)`.
- **Backdrop-filter:** `blur(20px) saturate(160%)`.
- **Border:** `1px solid rgba(255, 255, 255, 0.10)`.
- **Border-radius:** `16px`.
- **Padding:** `28px 28px 24px`.
- **Shadow:** `0 24px 80px -20px rgba(0, 0, 0, 0.72)`.
- **Title:** `19px / 600 / line-height 1.4 / #f8fafc`.
- **Body:** `14px / 400 / line-height 1.65 / rgba(226, 232, 240, 0.76)`.
- **Qn 강조:** `font-weight: 700; color: #22d3ee;`.

### 3.5 CTA 시각 사양

| CTA | Background | Color | Border | Hover |
|-----|------------|-------|--------|-------|
| Secondary | `transparent` | `rgba(226, 232, 240, 0.72)` | `1px solid rgba(255, 255, 255, 0.10)` | `rgba(255, 255, 255, 0.07)` |
| Primary | `rgba(124, 58, 237, 0.22)` | `#ede9fe` | `1px solid rgba(124, 58, 237, 0.38)` | `rgba(124, 58, 237, 0.30)` |

Primary는 위험색 red를 쓰지 않는다. 이 액션은 파괴적이지만 목적은 재학습이며, 위험성은 모달 문구와 명시 CTA로 전달한다. Red는 에러/폐기 계열에 남겨 색상 의미를 흐리지 않는다.

---

## 4. Full-cover 타임머신 오버레이

### 4.1 표시 타이밍
- 확인 모달 Primary CTA 클릭 직후 모달을 닫고 오버레이를 전역으로 띄운다.
- Page 3에서 실행하면 현재 Page 3 위를 덮은 상태로 되감기 요청을 처리한다.
- Page 4에서 실행하면 오버레이를 먼저 띄운 뒤, 오버레이 뒤에서 Page 3으로 라우팅한다.
- 라우팅과 state 복원이 끝난 뒤 최소 `450ms` 이상 완료 상태를 보여주고 fade out한다.

### 4.2 정보 구조

```
┌────────────────────────────────────────────┐
│                                            │
│                 [clock]                    │
│                                            │
│             타임머신 실행 중               │
│        Q3 답변 전으로 되감고 있어요        │
│                                            │
│              Q5  Q4  Q3                    │
│                                            │
└────────────────────────────────────────────┘
```

### 4.3 카피
- **타이틀:** `타임머신 실행 중`
- **서브텍스트:** `Q{n} 답변 전으로 되감고 있어요`
- **완료 카피:** `다시 답변할 준비가 되었어요.`
- **에러 카피:** `되감기에 실패했어요. 잠시 후 다시 시도해 주세요.`

### 4.4 시각 사양
- **Position:** `fixed; inset: 0;`
- **Z-index:** `11000` 이상. 모달, Toast, Page transition보다 위.
- **Background:** `rgba(2, 6, 23, 0.78)`.
- **Backdrop-filter:** `blur(18px) saturate(150%)`.
- **Content layout:** 전체 화면 중앙 정렬. `display: grid; place-items: center;`.
- **Inner wrapper:** 카드처럼 보이는 중첩 컨테이너 금지. 별도 카드 배경 없이 아이콘/텍스트만 중앙에 배치한다.
- **Clock size:** desktop `92px`, mobile `72px`.
- **Title:** `24px / 700 / #f8fafc`, mobile `21px`.
- **Subtitle:** `15px / 500 / rgba(226, 232, 240, 0.72)`.
- **Question number row:** `13px / 700 / letter-spacing 0 / color #22d3ee`.
- **Spacing:** clock -> title `22px`, title -> subtitle `8px`, subtitle -> question row `20px`.

### 4.5 Dark overlay 톤
- Page 3/Page 4 화면이 배경에 희미하게 남아 맥락은 유지하되, 텍스트를 읽을 수 있을 정도로 어둡게 덮는다.
- 배경 위에 gradient blob, orb, 별가루 같은 장식은 추가하지 않는다.
- 시계와 질문 번호만 움직이며, 화면 전체가 흔들리거나 줌되는 연출은 사용하지 않는다.

---

## 5. 애니메이션

### 5.1 시계 반시계 회전
- **대상:** clock icon wrapper.
- **방향:** 반시계 방향.
- **Duration:** `900ms`.
- **Timing:** `cubic-bezier(0.22, 0.61, 0.36, 1)`.
- **반복:** 요청 처리 중 infinite. 완료 상태 진입 시 회전을 멈추고 opacity를 안정화한다.

```css
@keyframes time-machine-rewind {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}
```

### 5.2 질문 번호 역재생
- **표현:** 현재 마지막 질문 번호에서 target Qn까지 `Q5 -> Q4 -> Q3`처럼 역방향으로 표시한다.
- **방식:** 번호 pill 3개 이내만 노출한다. 전체 히스토리를 모두 보여주지 않는다.
- **모션:** 각 번호가 `translateY(6px) -> 0`, `opacity 0 -> 1 -> 0.45`로 순차 등장.
- **Duration:** 번호당 `180ms`, 전체 `600~900ms` 내.
- **완료 상태:** target Qn만 cyan으로 남기고 완료 카피로 전환한다.

### 5.3 Overlay 진입 / 퇴장
- **진입:** backdrop `180ms fade-in`, content `260ms fade-up`.
- **완료 전환:** title 유지, subtitle을 완료 카피로 cross-fade `180ms`.
- **퇴장:** backdrop `220ms fade-out`, content `160ms fade-out`.

### 5.4 prefers-reduced-motion 대체
`prefers-reduced-motion: reduce`에서는 회전/번호 순차 재생을 제거한다.

- Overlay는 단순 fade-in/out만 사용한다.
- Clock은 정지 아이콘으로 표시한다.
- 질문 번호 row는 `Q{n}` 하나만 정적으로 표시한다.
- 완료 카피 전환은 즉시 또는 `opacity 120ms` 이하로 처리한다.

```css
@media (prefers-reduced-motion: reduce) {
  .time-machine-clock,
  .time-machine-question-step {
    animation: none;
    transform: none;
  }

  .time-machine-overlay,
  .time-machine-content {
    animation-duration: 120ms;
  }
}
```

---

## 6. 디자인 토큰 / 톤 가이드

### 6.1 토큰

| 목적 | 값 |
|------|-----|
| Base background | `#0f172a` |
| Overlay background | `rgba(2, 6, 23, 0.78)` |
| Glass surface | `rgba(15, 23, 42, 0.88)` |
| Hairline border | `rgba(255, 255, 255, 0.10)` |
| Primary purple | `#7c3aed` |
| Purple text | `#ddd6fe`, `#ede9fe` |
| Secondary cyan | `#06b6d4` |
| Cyan active | `#22d3ee` |
| Main text | `#f8fafc` |
| Muted text | `rgba(226, 232, 240, 0.72)` |
| Danger text | 기존 에러 토큰만 사용, 타임머신 기본 UI에는 미사용 |

### 6.2 사용 원칙
- Purple은 CTA와 버튼 hover에만 사용한다.
- Cyan은 target Qn, 진행 상태, focus ring 같은 보조 포인트로 제한한다.
- Red는 사용하지 않는다. 파괴적 정책은 카피와 확인 모달 구조로 전달한다.
- Glassmorphism은 modal/backdrop에만 적용한다. 버튼 안에 또 다른 glass card를 중첩하지 않는다.
- full-cover 오버레이 내부에는 카드 컨테이너를 두지 않는다. 화면을 덮는 하나의 전환 레이어로 취급한다.
- Border radius는 버튼 `12px`, 모달 `16px`, tooltip `10px` 수준으로 유지한다.
- Letter spacing은 `0`을 기본으로 한다.
- 모바일에서 버튼 텍스트가 줄바꿈되면 Page 4 버튼은 `width: 100%`로 전환하고, Page 3은 icon-only를 유지한다.

---

## 7. 접근성 / 키보드

- 확인 모달은 `role="dialog"`와 `aria-modal="true"`를 사용한다.
- 모달 제목은 `aria-labelledby`, 본문은 `aria-describedby`로 연결한다.
- 모달 오픈 시 기존 포커스를 저장하고, 닫힐 때 원래 버튼으로 복원한다.
- Esc는 확인 모달에서 Secondary CTA와 동일하게 동작한다. 되감기 요청 진행 중에는 Esc를 무시한다.
- 오버레이 실행 중에는 배경 인터랙션을 모두 막고, body scroll을 lock한다.
- 오버레이 카피 변경은 `aria-live="polite"` 영역으로 전달한다.
- icon-only 버튼은 반드시 `aria-label="답변 전으로 되감기"`를 가진다.

---

## 8. 에러 / 실패 상태

- 되감기 요청 실패 시 오버레이를 즉시 닫지 않는다.
- 오버레이 중앙 카피를 에러 상태로 전환한다.
  - Title: `되감기에 실패했어요`
  - Body: `잠시 후 다시 시도해 주세요.`
  - CTA: `닫기`
- 실패 상태 CTA는 soft outline 버튼으로 표시한다.
- Page 4에서 실패한 경우 라우팅을 이미 시작했다면 Page 3에서 Toast를 함께 표시한다. 라우팅 전 실패라면 Page 4에 머문다.
- 실패 시 Qn 상태를 낙관적으로 변경하지 않는다.

---

## 9. 수용 기준 체크리스트

- [ ] Page 3 완료된 질문/평가 카드에 icon-only `답변 전으로 되감기` 버튼이 표시된다.
- [ ] Page 3 버튼은 현재 답변 대기 질문, 미평가 질문, 스트리밍/평가/모달/오버레이 진행 중 상태에서 disabled 또는 hidden 처리된다.
- [ ] Page 3 버튼 tooltip과 `aria-label`은 `답변 전으로 되감기`로 노출된다.
- [ ] Page 4 각 상세 피드백 하단 우측에 `이 질문 다시 답변하기` 버튼이 표시된다.
- [ ] 확인 모달 제목은 `이 질문으로 되감기`로 표시된다.
- [ ] 확인 모달 본문은 Qn의 기존 답변/평가와 이후 질문/평가/리포트가 무효화됨을 안내한다.
- [ ] 확인 모달 CTA는 Secondary `취소`, Primary `되감기 실행` 순서와 위계를 가진다.
- [ ] Primary 승인 후 full-cover 오버레이가 표시되고 타이틀은 `타임머신 실행 중`이다.
- [ ] 오버레이 서브텍스트는 `Qn 답변 전으로 되감고 있어요`로 표시된다.
- [ ] 완료 상태에서는 `다시 답변할 준비가 되었어요.` 카피가 표시된다.
- [ ] Page 4에서 실행 시 오버레이가 먼저 뜨고, 오버레이 뒤에서 Page 3으로 라우팅된다.
- [ ] FE 요청 payload에는 `target_question_index`만 포함되며 UI에는 `checkpoint_id`가 노출되지 않는다.
- [ ] Qn으로 되감은 후 Q1~Q(n-1)의 답변/평가는 유지되고, Qn 이후 답변/평가/리포트는 무효화된다.
- [ ] 되감기 완료 후 Page 3의 현재 질문은 기존 Qn 질문이며 textarea는 비어 있다.
- [ ] 새 답변 제출 이후 질문/평가/리포트는 새 타임라인 기준으로 생성된다.
- [ ] 시계는 반시계 방향으로 회전하고, 질문 번호는 역재생된다.
- [ ] `prefers-reduced-motion: reduce`에서는 회전과 번호 순차 애니메이션 없이 fade 중심으로 대체된다.
- [ ] 오버레이 내부에 별도 카드 중첩, 과한 장식, gradient orb가 없다.
- [ ] Purple/Cyan은 CTA, focus, target Qn 강조에만 제한적으로 사용된다.
- [ ] 모바일에서도 버튼 텍스트가 잘리지 않고, Page 3 icon-only 버튼의 터치 영역은 최소 `32px` 이상이다.
