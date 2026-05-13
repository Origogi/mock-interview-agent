# F-29 면접 조기 종료 (Early Termination) UI 사양서

## 개요
면접 진행 중 사용자가 `[× 면접 조기 종료]` 버튼을 클릭하면, 답변 누적 수(`answered_count`)를 기준으로 다음 두 경로를 분기한다.

- **Case A** (`answered_count >= 3`): 부분 리포트 생성 → Page 4 (`is_partial = true`) + "조기 종료 N/5" 배지 + disclaimer
- **Case B** (`answered_count < 3`): 폐기 후 Page 1 복귀 + Toast 안내

실수 클릭 방지를 위해 **확인 모달**을 반드시 거치고, 분기 메시지는 `answered_count`에 따라 미리 사전 안내한다.

**참조 토큰 파일:** `frontend/src/theme/tokens.css`
**참조 컴포넌트:** `frontend/src/components/Toast.jsx`, `frontend/src/components/HeroScore.jsx`
**참조 레이아웃:** `frontend/src/pages/InterviewPage.jsx` (`.iv-rail-top` > `.iv-end`), `frontend/src/pages/ReportPage.jsx` (`.report-head`, `.hero-score`)

---

## 1. 확인 모달 사양

### 1.1 정보 구조

```
┌─────────────────────────────────────────┐
│  면접을 종료하시겠어요?               (×)│  ← 헤더 타이틀 + 닫기 아이콘 (옵션)
│                                         │
│  지금까지의 답변 3/5으로                │  ← 본문 (answered_count 분기)
│  부분 리포트를 받을 수 있어요.          │
│  면접을 다시 시작하면 결과는 사라집니다.│
│                                         │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │ 계속 면접보기 │  │  결과 보기 →     │ │  ← Secondary / Primary
│  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────┘
```

**헤더 타이틀** (고정)
- 카피: **"면접을 종료하시겠어요?"**
- 분기 케이스와 무관 — 메인 결정 행위에 집중

**본문** (`answered_count` 분기)

| 케이스 | 카피 |
|--------|------|
| `answered_count >= 3` | `"지금까지의 답변 {N}/5으로 부분 리포트를 받을 수 있어요.\n면접을 다시 시작하면 결과는 사라집니다."` |
| `answered_count < 3` | `"답변이 {N}개로 부족해 리포트가 생성되지 않습니다.\n그래도 종료하시겠어요?"` |
| `answered_count == 0` | `"아직 답변이 없어 리포트가 생성되지 않습니다.\n그래도 종료하시겠어요?"` (0 표기 회피) |

> 본문 내 `{N}`은 강조 색상(`var(--accent)`) 또는 폰트 weight 600으로 분리해 가독성↑.

**CTA 카피 분기**

| 케이스 | Primary (우측) | Secondary (좌측) |
|--------|---------------|-----------------|
| `answered_count >= 3` | **"결과 보기"** (긍정 destructive — 부분 리포트 진입) | "계속 면접보기" |
| `answered_count < 3` | **"그래도 종료"** (warning destructive — 폐기 인지) | "계속 면접보기" |

> Secondary가 좌측, Primary가 우측 (서양식 OK/Cancel 표준 + iOS Human Interface Guidelines 준수).
> Tab 순서는 Secondary → Primary (안전한 기본값 선택 유도).

---

### 1.2 시각 스펙 (다크 모드 Glassmorphism)

#### 모달 컨테이너 (`.early-end-modal`)
- **Width:** `min(440px, calc(100vw - 32px))`
- **Padding:** `28px 28px 24px`
- **Background:** `rgba(24, 24, 27, 0.92)` — `--surface` 톤 + 알파 (글래스 효과 강화)
- **Backdrop-filter:** `blur(20px) saturate(180%)`
- **Border:** `1px solid rgba(255, 255, 255, 0.1)` (Case 무관 — neutral hairline)
  - PM v0 가합의 `border: 1px solid rgba(239, 68, 68, 0.3)`는 **채택하지 않음.** 근거: 모달 자체는 정보 전달이 중립이고, destructive 의미는 Primary CTA가 단독으로 책임진다. 컨테이너에까지 적색 테두리가 들어가면 사용자가 "이건 위험한 화면"으로 과민 반응 → 일반 종료 흐름도 거부감 발생.
- **Border-radius:** `20px` (card 18px보다 약간 ↑ — overlay의 분리감 강조, design system "12px 전후" 범위는 인터랙티브 컴포넌트 기준)
- **Box-shadow:** `0 24px 80px -20px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(0,0,0,0.4)` (depth + 외곽 명료)
- **Z-index:** `10000` (Toast 9999 위, Page transition overlay 위)

#### 배경 dim (`.early-end-backdrop`)
- **Background:** `rgba(0, 0, 0, 0.55)`
- **Backdrop-filter:** `blur(4px)` (배경 컨텐츠 약간 흐리게 — 모달 집중도↑)
- **Position:** `fixed; inset: 0;`
- **Z-index:** `9999`

#### 헤더 타이포
- **Font-family:** `var(--font-display)` (Pretendard Variable)
- **Font-size:** `19px`
- **Font-weight:** `600`
- **Letter-spacing:** `-0.015em`
- **Color:** `var(--fg)` = `#f5f5f7`
- **Line-height:** `1.4`
- **Margin-bottom:** `12px`

#### 본문 타이포
- **Font-family:** `var(--font-text)`
- **Font-size:** `14px`
- **Font-weight:** `400`
- **Line-height:** `1.6` (한국어 가독성)
- **Color:** `var(--fg-muted)` = `#a1a1aa`
- **Margin-bottom:** `24px`
- **White-space:** `pre-line` (백엔드 `\n` 또는 본문 내 줄바꿈 허용)
- **{N} 강조:** `font-weight: 600; color: var(--fg);` (case A) / `color: #ffb86b` (case B — warning amber)

#### Primary CTA (`.early-end-cta-primary`)

| Case | 시맨틱 | Background | Color | Border | Hover bg |
|------|--------|-----------|-------|--------|----------|
| **A (≥3, "결과 보기")** | confirm destructive | `rgba(110, 116, 255, 0.16)` | `#a4a8ff` | `1px solid rgba(110, 116, 255, 0.32)` | `rgba(110, 116, 255, 0.22)` |
| **B (<3, "그래도 종료")** | warning destructive | `rgba(255, 107, 107, 0.14)` | `#ffb3b3` | `1px solid rgba(255, 107, 107, 0.32)` | `rgba(255, 107, 107, 0.2)` |

> **PM v0 가합의 (`background: rgba(239, 68, 68, 0.15)`, `color: #fca5a5`) 조정 사유:**
> - 코드베이스 적색 토큰이 이미 `#ff6b6b` (`.iv-end`, `eval-toast` error)로 통일돼 있음. `#ef4444` 도입 시 토큰 분기 발생 → 마이그레이션 노트 §4 참조.
> - Case A는 "부분 리포트 받기"라는 **긍정 행동**에 가까우므로 적색이 과함. accent 컬러(`#6e74ff`)로 톤 다운하고, Case B만 적색을 유지해 위험도 차별화.

- **Padding:** `12px 20px`
- **Border-radius:** `12px`
- **Font-size:** `14px`, **Font-weight:** `600`
- **Min-width:** `120px`
- **Transition:** `all var(--dur-quick) var(--ease-soft)`
- **Focus ring:** `box-shadow: 0 0 0 3px rgba(110, 116, 255, 0.3)` (case A) / `rgba(255, 107, 107, 0.3)` (case B)

#### Secondary CTA (`.early-end-cta-secondary`, "계속 면접보기")
- **Background:** `transparent`
- **Color:** `var(--fg-muted)` (`#a1a1aa`)
- **Border:** `1px solid var(--border)` (`rgba(255, 255, 255, 0.08)`)
- **Hover:** `background: rgba(255, 255, 255, 0.06); color: var(--fg);`
- **Padding/radius/font:** Primary와 동일 (사이즈 일관성)
- **Focus ring:** `box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.12)`

#### CTA 컨테이너 (`.early-end-actions`)
- **Display:** `flex`
- **Gap:** `10px`
- **Justify-content:** `flex-end` (우측 정렬 — Primary가 마지막)
- **Margin-top:** `24px`

#### 닫기 아이콘 (`.early-end-close`, 옵션)
- **권장:** 우상단 absolute 배치 (디자인적 cleanliness — 사용자 escape 경로 추가 명시)
- **Size:** `28x28px`, **Border-radius:** `8px`
- **Color:** `var(--fg-dim)` → hover `var(--fg)`
- **Font-size:** `18px` (×)
- **Position:** `position: absolute; top: 16px; right: 16px;`
- **동작:** Secondary CTA와 동일 ("계속 면접보기")

---

### 1.3 인터랙션 / 모션

#### 진입 애니메이션
```css
@keyframes early-end-backdrop-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes early-end-modal-in {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.early-end-backdrop { animation: early-end-backdrop-in var(--dur-fast) var(--ease-soft) both; }
.early-end-modal    { animation: early-end-modal-in    var(--dur-medium) var(--ease-soft) both; }
```

- **Backdrop:** 200ms fade-in
- **Modal:** 300ms fade-up + scale(0.96 → 1.0), `--ease-soft`

#### 퇴장 애니메이션
- Framer Motion `AnimatePresence` 사용 권장 (`exit` 대칭) — 또는 React 상태 분기 + `.early-end-modal.is-exiting` 클래스로 `var(--dur-fast)` 역방향
- **Backdrop exit:** 150ms fade-out
- **Modal exit:** 200ms fade-down (`translateY(0 → 6px) + opacity 1 → 0`)

#### Esc 닫기 정책
- **동작:** Esc → Secondary CTA와 동일 ("계속 면접보기" = 모달 닫기, 면접 유지)
- **구현:** `useEffect`로 `keydown` 리스너, 모달 열렸을 때만 등록
- **로딩 중 (API 요청 진행 중):** Esc **무시** (이중 종료 방지 — 1.4 더블 클릭 가드 참조)

#### 배경 클릭 정책
- **동작:** 백드롭 클릭 → Esc와 동일 (모달 닫기)
- **이유:** 실수 클릭으로 들어왔을 때 빠른 escape — destructive 행동은 명시적 CTA에서만 발화 → 안전성↑
- **구현:** `.early-end-backdrop` onClick에서 `e.target === e.currentTarget` 가드
- **로딩 중:** 무시

#### Focus Trap (a11y)
- **진입 시:** Secondary CTA에 자동 포커스 (안전한 기본 선택)
- **Tab 순서:** Secondary → Primary → (close 아이콘 존재 시) Close → Secondary (loop)
- **Shift+Tab:** 역방향 loop
- **구현 권고:** `react-focus-lock` 또는 수동 구현 (모달 진입 직전 `document.activeElement` 저장 → 닫힐 때 복원)
- **포커스 비주얼:** 모든 인터랙티브 요소에 `:focus-visible` outline 표시 (해당 컴포넌트 색상 토큰 적용)

#### Primary CTA 더블 클릭 가드
- **상태:** `isEnding: boolean` (호출 시작 시 true, 응답 후 false)
- **시각:**
  - Primary CTA `pointer-events: none; opacity: 0.7;`
  - 텍스트 우측에 12px 인라인 스피너 추가 (F-28 `.spinner` 스타일 재사용 — `border-top-color`만 CTA 텍스트 색에 맞춰 조정)
  - 카피: `"결과 보기"` → `"결과 생성 중..."` (Case A) / `"종료 중..."` (Case B)
- **Secondary, Close, Esc, Backdrop:** 로딩 중 비활성 (이탈 시 race condition 위험)

```css
.early-end-cta-primary.is-loading {
  pointer-events: none;
  opacity: 0.7;
  display: inline-flex; align-items: center; gap: 8px;
}
.early-end-cta-primary.is-loading .spinner {
  width: 12px; height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spinner-spin 0.8s linear infinite;
}
```

#### prefers-reduced-motion
```css
@media (prefers-reduced-motion: reduce) {
  .early-end-backdrop,
  .early-end-modal { animation: none; }
  .early-end-cta-primary.is-loading .spinner { animation: none; }
}
```

---

### 1.4 키보드 / a11y

| 항목 | 사양 |
|------|------|
| **Role** | `<div role="dialog" aria-modal="true">` |
| **Labelledby** | 헤더에 `id="early-end-title"` → `aria-labelledby="early-end-title"` |
| **Describedby** | 본문에 `id="early-end-desc"` → `aria-describedby="early-end-desc"` |
| **초기 포커스** | Secondary CTA (안전한 기본) |
| **Esc** | 모달 닫기 (Secondary와 동일) |
| **Tab 순서** | Secondary → Primary → Close → Secondary (focus trap) |
| **Backdrop 클릭** | 모달 닫기 (로딩 중 제외) |
| **Live region** | Case B 폐기 케이스 Toast는 `aria-live="polite"` (Toast.jsx의 `role="alert"` 활용) |
| **콘트라스트** | 모든 텍스트/CTA WCAG AA (4.5:1) 이상 — 위 색상 토큰 모두 통과 |

---

## 2. Page 4 부분 리포트 시각 분기 (`is_partial === true`)

### 2.1 "조기 종료" 배지 (`.report-partial-badge`)

#### 위치
- **부모:** `.report-head` 내부, `.eyebrow` (현재 "면접 결과 리포트") **바로 다음 줄, 동일 컨테이너**
- **권장 마크업:**
  ```jsx
  <header className="report-head">
    <div className="eyebrow-row">
      <div className="eyebrow">
        <span className="dot" style={{ background: accent }} />
        면접 결과 리포트
      </div>
      {isPartial && (
        <span className="report-partial-badge">
          조기 종료 · {answeredCount}/5 문항
        </span>
      )}
    </div>
    <h1 className="report-title">...</h1>
    ...
  </header>
  ```
- `.eyebrow-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }`

#### 시각 스펙
- **Background:** `rgba(255, 184, 107, 0.12)` (amber soft tint — `#ffb86b` 기반)
  - PM v0 가합의 `rgba(245, 158, 11, 0.15)` → **유사 톤 유지하되 코드베이스 톤(`#ffb86b`)에 맞춰 16진수 미세 조정.** 마이그레이션 노트 §4 참조.
- **Color:** `#ffb86b` (warning amber — `#fbbf24`보다 다크 모드 가시성↑ 및 채도↓로 신뢰감)
- **Border:** `1px solid rgba(255, 184, 107, 0.28)`
- **Padding:** `4px 10px`
- **Border-radius:** `999px` (`var(--radius-pill)`) — eyebrow chip 톤 통일
- **Font-size:** `12px`
- **Font-weight:** `600`
- **Letter-spacing:** `0.01em`
- **Line-height:** `1.5`
- **Display:** `inline-flex; align-items: center; gap: 6px;`
- **점 아이콘(옵션):** `::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: #ffb86b; }` — eyebrow `.dot` 패턴 유지

#### 카피
- 형식: `"조기 종료 · {answered_count}/5 문항"`
- 예: `"조기 종료 · 3/5 문항"`, `"조기 종료 · 4/5 문항"`
- · (middle dot, U+00B7) 사용 — `-`(하이픈)이나 `/`보다 시각적으로 깔끔

#### 미세 인터랙션 (옵셔널, 권고)
- 초기 진입 시 0.4s 지연 후 fade-in + slight scale (헤더가 먼저 자리잡은 뒤 강조)
  ```css
  .report-partial-badge {
    animation: partial-badge-in var(--dur-medium) var(--ease-spring) 0.4s both;
  }
  @keyframes partial-badge-in {
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
  }
  ```
- Hover 효과: **없음** (정보성 배지 — 클릭 가능 인터랙션 아님)

---

### 2.2 Disclaimer 텍스트 배치

#### 위치 (권고)
- **HeroScore 카드 하단 (외부)** — `.hero-score` 컴포넌트 자체는 건드리지 않고, 그 직후에 별도 텍스트 슬롯
- 마크업:
  ```jsx
  <HeroScore finalScore={avgScore} accent={accent} />
  {isPartial && (
    <p className="report-disclaimer">{disclaimer}</p>
  )}
  ```

#### 카피
- 백엔드 `disclaimer` 필드 그대로 출력 — fallback 카피:
  - `"총 {N}개 답변을 바탕으로 작성된 부분 리포트입니다."`
- 신뢰도 추가 안내(옵셔널, 한 줄 추가):
  - `"답변 수가 적어 평가 신뢰도가 제한적일 수 있습니다."`
- 두 줄 합본 권장:
  ```
  총 3개 답변을 바탕으로 작성된 부분 리포트입니다.
  답변 수가 적어 평가 신뢰도가 제한적일 수 있습니다.
  ```

#### 시각 스펙 (`.report-disclaimer`)
- **Font-family:** `var(--font-text)`
- **Font-size:** `13px`
- **Font-weight:** `400`
- **Line-height:** `1.6`
- **Color:** `var(--fg-dim)` (`#6e6e73`) — 충분히 muted, 본 컨텐츠 방해 X
- **Text-align:** `center` (HeroScore 자체가 center alignment이므로 통일)
- **Margin:** `12px 0 0` (HeroScore 하단 12px gap)
- **Max-width:** `560px; margin-left: auto; margin-right: auto;` (긴 줄 방지)
- **White-space:** `pre-line` (백엔드 `\n` 또는 줄바꿈 허용)
- **Opacity 진입:** HeroScore 카운트업 완료 후 fade-in (1.2s 지연)
  ```css
  .report-disclaimer { animation: report-fade-in var(--dur-slow) var(--ease-soft) 1.2s both; }
  ```

---

### 2.3 미답변 문항 슬롯 (옵셔널 — **권고: v1에서 채택하지 않음**)

#### 권고 결론
**채택하지 않음.** 근거:
1. evaluations 카드 영역 자체가 "평가 받은 답변"의 시각화이므로, 미답변 placeholder가 들어가면 평가 신호의 일관성이 깨짐.
2. 헤더 영역에 "조기 종료 N/5 문항" 배지로 이미 정보가 충분히 전달됨 (중복 강조 회피).
3. dashed border placeholder는 "기능 미완성"처럼 보일 수 있어 학습자 인상이 위축될 가능성.

#### 만약 미래에 채택한다면 (참고 사양)
- `.eval-row-empty` 변형 추가
- **Border:** `1px dashed rgba(255, 255, 255, 0.12)`
- **Background:** `transparent`
- **Padding:** `12px 14px` (`.iv-eval-row` 동일)
- **Color:** `var(--fg-dim)`
- **Text:** `"Q{idx+1}. 답변하지 않은 문항"`
- **Cursor:** `default` (클릭 X)
- **Border-radius:** `12px` (기존 `.iv-eval` 동일)

---

### 2.4 레이더 차트 처리

#### 정책
- **차트 자체는 변경 없음** — 참여 문항 데이터만으로 평가 (백엔드 책임)
- 추가 면책 텍스트는 **2.2 Disclaimer에 통합** (한 줄 추가)
- 레이더 차트 카드 내부에 추가 disclaimer **노출 X** (중복 회피)

#### 회귀 가드
- `is_partial === false` (자연 종료 5턴) 시:
  - `.report-partial-badge` **노출 X**
  - `.report-disclaimer` **노출 X**
  - 레이더 차트 라벨/스케일 변경 X

---

## 3. 폐기 케이스 (Page 1 복귀 + Toast)

### 3.1 Toast 카피

- **권장 카피:** `"답변이 부족해 리포트를 만들지 못했어요. 다시 시도해 주세요."`
- 톤: 격려 + 비난 회피 ("실패"라는 단어 회피, "다시 시도"로 행동 유도)
- **{N} 표기 옵션:** `"답변({N}개)이 부족해 리포트를 만들지 못했어요. 다시 시도해 주세요."` (디버깅·투명성 강화 — FE에서 선택)

### 3.2 Toast 시각 스펙

**기존 `<Toast>` 컴포넌트 재사용.** severity 처리:

| 옵션 | 결정 | 시각 효과 |
|------|------|----------|
| A. severity=`error` | `--toast-accent: #ff6b6b` | 적색 좌측 보더 — "에러" 인상 강함 |
| B. severity=`info` | `--toast-accent: #6e74ff` | accent 보더 — 너무 약함 |
| **C. severity=`warning` (신규)** | `--toast-accent: #ffb86b` | **amber 좌측 보더 — "경고/주의" 톤이 의미와 정확히 매치 ★** |

**권고: 옵션 C** — `Toast.jsx`에 `SEVERITY_COLOR.warning = '#ffb86b'` 추가 (1줄 변경). 폐기 케이스의 "사용자 잘못이 아니라 데이터 부족" 뉘앙스와 일치.

#### Toast 위치 / 시간 (기존 `.app-toast` 스타일 그대로)
- **Position:** bottom-center (`left: 50%; bottom: 32px;` — 기존 스타일 유지)
- **Duration:** `5000ms` (기본 6000ms보다 약간 짧게 — 종료 안내는 즉시성 중요, 페이지 복귀 후 너무 오래 잔존 X)
- **Z-index:** `9999` (모달 10000보다 아래 — 폐기 시점에는 모달 이미 닫힘, 충돌 없음)
- **Close 버튼:** 기존 그대로 노출 (사용자가 즉시 닫을 수 있어야 함)

#### Toast 진입 타이밍
- **순서:** 모달 [그래도 종료] 클릭 → API 응답 → 모달 fade-out 200ms → Page 1 transition 시작 → Page 1 진입 완료 직후 Toast fade-in
- **Page transition 도중 노출 X** (시각 노이즈 회피)

### 3.3 Page 1 진입 시 추가 안내 배너 (옵셔널 — **권고: 도입하지 않음**)

#### 권고 결론
**도입하지 않음.** Toast 5초로 충분히 메시지 전달. 추가 배너는:
1. Page 1의 메인 행동(이력서 업로드)을 방해
2. 사용자가 "왜 다시 처음으로?"에 대한 답을 Toast에서 이미 받음
3. 배너 닫기 인터랙션 추가 → UI 부담↑

만약 채택한다면 `.home-banner-info` 형태로 Page 1 상단 16px 슬롯 — 사양 별도 정의 필요.

---

## 4. v0 토큰 → v1 사양 마이그레이션 노트

FE가 사양서 도착 전 PM v0 가합의 토큰을 이미 적용했다면, 아래 표대로 **v1 사양이 덮어쓴다.**

| 영역 | PM v0 가합의 (참고) | v1 사양 (확정) | 변경 사유 |
|------|---------------------|---------------|----------|
| **모달 컨테이너 border** | `1px solid rgba(239, 68, 68, 0.3)` | `1px solid rgba(255, 255, 255, 0.1)` (neutral hairline) | 컨테이너 자체는 중립 — destructive 의미는 Primary CTA가 단독 책임 (1.2 참조) |
| **모달 Primary CTA bg (Case A)** | `rgba(239, 68, 68, 0.15)` | `rgba(110, 116, 255, 0.16)` (accent purple) | Case A는 "부분 리포트 받기" 긍정 행동 — 적색 과함 |
| **모달 Primary CTA color (Case A)** | `#fca5a5` | `#a4a8ff` | accent 톤 통일 |
| **모달 Primary CTA bg (Case B)** | `rgba(239, 68, 68, 0.15)` | `rgba(255, 107, 107, 0.14)` | `#ef4444` 대신 코드베이스 적색 토큰 `#ff6b6b` 사용 (`.iv-end`, `eval-toast` 와 통일) |
| **모달 Primary CTA color (Case B)** | `#fca5a5` | `#ffb3b3` | `#ff6b6b` 계열 lightness 조정값 |
| **Page 4 배지 bg** | `rgba(245, 158, 11, 0.15)` | `rgba(255, 184, 107, 0.12)` | amber 톤 동일 의미 — 채도/명도를 다크 모드 시인성에 맞춰 `#ffb86b`로 미세 조정 |
| **Page 4 배지 color** | `#fbbf24` | `#ffb86b` | 다크 배경에서 `#fbbf24`(채도↑)는 눈을 찌르는 인상 — `#ffb86b`로 톤 다운하면서 신뢰감 유지 |
| **Page 4 배지 border** | (미정) | `1px solid rgba(255, 184, 107, 0.28)` | 명시 (chip 외곽선) |
| **Toast severity** | (미정) | `warning` 신규 (`#ffb86b`) | Toast.jsx의 SEVERITY_COLOR에 한 줄 추가 |

> **FE 작업자에게:** v0 토큰을 빠르게 v1으로 마이그레이션하려면, 위 9개 항목만 search-replace하면 충분. 그 외 spacing/radius/font는 모두 v0와 호환.

---

## 5. 회귀 점검 포인트

### 5.1 자연 종료 5턴 완주 (`is_partial !== true`)
- [ ] HeroScore 영역에 `.report-partial-badge` 노출되지 않는지
- [ ] `.report-disclaimer` 노출되지 않는지
- [ ] `.report-head` 레이아웃 변화 없는지 (eyebrow-row wrapper 추가가 기존 마진/패딩 깨뜨리지 않는지)
- [ ] 레이더 차트 라벨/스케일 변경 없는지

### 5.2 부분 종료 (`is_partial === true`)
- [ ] 배지가 `.eyebrow` 우측에 자연스럽게 배치 (좁은 화면에서 flex-wrap 작동)
- [ ] HeroScore 카운트업이 완료된 후 disclaimer가 fade-in (시각 우선순위)
- [ ] `answered_count` 값이 배지 카피와 disclaimer 카피에 모두 일치
- [ ] 답변하지 않은 문항이 evaluations 카드 영역에 노출되지 않음 (placeholder 추가 X)

### 5.3 모달 / Toast 회귀
- [ ] 모달 진입 시 첫 포커스가 Secondary CTA에 위치
- [ ] Esc / Backdrop 클릭 시 모달 닫힘 (로딩 중 제외)
- [ ] 모달 닫힌 후 원래 active 요소(보통 `.iv-end` 버튼)로 포커스 복귀
- [ ] 로딩 중 Primary CTA 더블 클릭 시 API 단 1회 호출
- [ ] 폐기 케이스 Toast가 Page 1 transition 완료 후 노출 (도중 X)
- [ ] Toast가 5초 후 자동 닫힘 + 닫기 버튼 동작

### 5.4 a11y 회귀
- [ ] 스크린리더가 모달 진입 시 헤더 + 본문 모두 읽음 (labelledby + describedby)
- [ ] Tab 키가 모달 외부로 빠지지 않음 (focus trap)
- [ ] `prefers-reduced-motion: reduce` 시 모든 진입/스피너 애니메이션 정지
- [ ] 모달 색상 contrast WCAG AA 통과 (특히 muted body text)

---

## 6. 모션 토큰 요약

```css
/* 재사용 토큰 (frontend/src/theme/tokens.css) */
--ease-soft: cubic-bezier(0.22, 0.61, 0.36, 1);  /* 모든 모달/배지 진입 */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* 배지 진입 (slight overshoot) */
--dur-quick: 0.15s;   /* CTA hover */
--dur-fast: 0.2s;     /* backdrop fade, modal exit */
--dur-medium: 0.3s;   /* modal entry, badge entry */
--dur-slow: 0.4s;     /* disclaimer fade-in (HeroScore 이후) */

/* 신규 keyframes */
@keyframes early-end-backdrop-in { /* §1.3 */ }
@keyframes early-end-modal-in    { /* §1.3 */ }
@keyframes partial-badge-in      { /* §2.1 */ }
/* spinner-spin은 F-28 기존 keyframe 재사용 */
```

---

## 7. 마크업 시안 (FE 구현 참고)

### 7.1 모달 컴포넌트 구조

```jsx
// frontend/src/components/EarlyEndModal.jsx (신규)
export default function EarlyEndModal({
  open,
  answeredCount,
  onConfirm,    // → POST /api/interview/end
  onCancel,
  isEnding,     // loading flag (parent state)
}) {
  const isSufficient = answeredCount >= 3;
  const title = '면접을 종료하시겠어요?';
  const body = isSufficient
    ? `지금까지의 답변 ${answeredCount}/5으로 부분 리포트를 받을 수 있어요.\n면접을 다시 시작하면 결과는 사라집니다.`
    : answeredCount === 0
      ? '아직 답변이 없어 리포트가 생성되지 않습니다.\n그래도 종료하시겠어요?'
      : `답변이 ${answeredCount}개로 부족해 리포트가 생성되지 않습니다.\n그래도 종료하시겠어요?`;
  const primaryLabel = isSufficient ? '결과 보기' : '그래도 종료';
  const primaryLoadingLabel = isSufficient ? '결과 생성 중...' : '종료 중...';
  const primaryVariant = isSufficient ? 'accent' : 'danger';
  // ... focus trap, esc, backdrop 핸들러
}
```

### 7.2 CSS 클래스 요약

```
.early-end-backdrop          /* 배경 dim + blur */
.early-end-modal             /* 모달 컨테이너 */
  .early-end-close           /* 우상단 × (옵션) */
  .early-end-title           /* 헤더 */
  .early-end-body            /* 본문 */
  .early-end-body-emph       /* {N} 강조 */
  .early-end-actions         /* CTA 컨테이너 */
    .early-end-cta-secondary /* "계속 면접보기" */
    .early-end-cta-primary   /* "결과 보기" / "그래도 종료" */
      .early-end-cta-primary.is-accent
      .early-end-cta-primary.is-danger
      .early-end-cta-primary.is-loading
        .spinner             /* F-28과 공유 */

.report-head
  .eyebrow-row               /* 신규 wrapper */
    .eyebrow
    .report-partial-badge    /* 신규 — is_partial 시 노출 */
  .report-title (기존)
  .report-sub (기존)

.report-disclaimer           /* 신규 — HeroScore 직후, is_partial 시 노출 */
```

---

## 8. 요약표: 8가지 핵심 결정

| # | 항목 | 결정 | 근거 |
|---|------|------|------|
| **1** | 모달 컨테이너 색상 | neutral hairline (`rgba(255,255,255,0.1)`), bg `rgba(24,24,27,0.92)` + blur 20px | destructive 의미는 CTA 단독 책임, 컨테이너까지 적색이면 과민 반응 |
| **2** | Primary CTA 분기 (≥3) | accent purple (`#a4a8ff` on `rgba(110,116,255,0.16)`) | "부분 리포트 받기"는 긍정 행동 — 적색 부적합 |
| **3** | Primary CTA 분기 (<3) | warning red (`#ffb3b3` on `rgba(255,107,107,0.14)`) | 코드베이스 적색 토큰(`#ff6b6b`) 통일, `#ef4444` 미사용 |
| **4** | 모달 진입/퇴장 | backdrop 200ms fade + modal 300ms scale(0.96→1.0) + 역방향 exit | Apple-style overlay, `--ease-soft` 토큰 재사용 |
| **5** | Esc / Backdrop 정책 | 둘 다 닫기 = Secondary 동작, 로딩 중 무시 | 실수 escape 경로 확보 + race condition 가드 |
| **6** | Page 4 배지 톤 | amber `#ffb86b` (PM v0 `#fbbf24`에서 톤 다운) | 다크 모드 가시성 + 신뢰감, 채도 과함 회피 |
| **7** | 미답변 슬롯 / 배너 | 둘 다 도입 X | 정보 중복, 학습자 인상 위축 우려 |
| **8** | Toast severity | `warning` 신규 추가 (`#ffb86b`) | "에러"가 아닌 "데이터 부족" 뉘앙스 정확 매치, Toast.jsx 1줄 변경 |

---

## 9. 다음 단계 (FE 구현용)

1. **컴포넌트 신규:**
   - `EarlyEndModal.jsx` (모달 + focus trap + esc/backdrop)
   - `App.jsx` 또는 `InterviewPage.jsx`에 모달 상태 + onConfirm 핸들러 (API 호출 → response.is_partial 분기)
2. **마크업 수정:**
   - `ReportPage.jsx`: `.report-head` → `.eyebrow-row` wrapper 추가 + `.report-partial-badge` 조건부 렌더
   - `ReportPage.jsx`: `<HeroScore>` 직후 `.report-disclaimer` 조건부 렌더
3. **상태 흐름:**
   - `iv-end` onClick → `setEarlyEndModalOpen(true)` (현재의 직접 abort 동작 대체)
   - `EarlyEndModal` Primary onClick → `isEnding=true` + API 호출 → response 분기 → 모달 닫기 → 라우팅
4. **CSS:** §7.2 클래스 트리 그대로 `index.css`에 추가
5. **Toast.jsx 수정:** `SEVERITY_COLOR.warning = '#ffb86b'` 1줄 추가
6. **a11y 검증:** axe-core 또는 수동 (focus trap, labelledby, contrast)
7. **회귀 검증:** §5 체크리스트 통과
8. **prefers-reduced-motion 검증:** 시스템 설정 토글 후 모든 진입 애니메이션 정지 확인

---

**작성일:** 2026-05-13
**설계자:** UI Designer (Claude Code)
**참조:** `F28-sample-answer-spec.md` (사양서 구조), `frontend/src/theme/tokens.css`, `frontend/src/components/Toast.jsx`, `frontend/src/components/HeroScore.jsx`, `frontend/src/pages/ReportPage.jsx`, `frontend/src/pages/InterviewPage.jsx`
