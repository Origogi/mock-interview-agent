# Page 4 리디자인 사양서 (v1) — Apple-style CSS-only

**작성일:** 2026-05-10 | **마감:** 2026-05-19 (D-9) | **상태:** M1 구현 플랜  
**목표:** Page 1~3과 동일한 Apple-style(다크 Glassmorphism, CSS-only) 톤으로 Page 4 통일. Hero 카운트업 + 2-컬럼 + 문항별 아코디언으로 최종 리포트 시각화.

---

## 1. 현 상태 분석 (Visual Audit)

### 1.1 톤 단절 현황
- **Page 1~3:** v2 Apple-style (Pretendard/Inter, 다크 배경 #000, accent #6e74ff, radius 18px, CSS-only)
- **Page 4 현재:** v1 MUI Glassmorphism 잔존 (커밋 7c9f7b1에서 MUI 의존 제거 완료했지만, 디자인 토큰과 인터랙션 체계는 일관성 부족)

### 1.2 주요 갭 포인트
1. **Hero 영역:** 현재는 단순 타이틀만 있음 → 종합 점수를 크게 표시하고 0에서 최종값으로 카운트업되는 애니메이션 필요
2. **2-컬럼 레이아웃:** 현재는 순차적 나열 → 데스크탑에서 좌측(차트) / 우측(피드백)으로 나란히 배치 필요
3. **아코디언 펼침:** 현재 grid-template-rows로 구현했으나, padding/opacity 전환 미흡 → F-26 패턴 정의 필요
4. **차트 진입 애니메이션:** 레이더 폴리곤·꼭지점·범례가 순차적으로 페이드인·팝 애니메이션 미보완 (F-24)

### 1.3 구조적 현황
- JSX: `ReportPage.jsx` (비교적 깔끔, 서브컴포넌트 분리됨)
- CSS: `index.css` 라인 899~1255 (Report 관련 스타일 통합)
- 상태 관리: 상위 컴포넌트에서 `report`, `evaluations` props 받음 (LangGraph 백엔드와 연동)
- 피드백 데이터 형식: `{ strengths, weaknesses, improvements[] }`
- 아코디언 상태: 각 문항별로 `useState(false)` 로컬 상태

---

## 2. 신규 레이아웃 와이어프레임

### 2.1 데스크탑 레이아웃 (≥1024px)

```
┌─────────────────────────────────────────────────────┐
│  [Eyebrow: 면접 결과 리포트]                           │
│  [Title: 고생하셨습니다]                              │
│  [Sub: 지원자님의 역량 분석 결과입니다]                │
└─────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  [Hero Countdown] ← 종합 점수 Big Display            │
│  예: 73/100 (0 → 73으로 카운트업, 1.1초, ease-out)   │
└──────────────────────────────────────────────────────┘

┌───────────────────────────┬──────────────────────────┐
│  [Radar 카드]             │  [Feedback 카드]          │
│  - 레이더 차트 (애니)     │  - 강점                  │
│  - Legend bars (애니)     │  - 약점                  │
│                           │  - 개선 방향             │
└───────────────────────────┴──────────────────────────┘
  (좌 비율 48% / 우 비율 52%, gap 20px)

┌─────────────────────────────────────────────────────┐
│  [Q&A 섹션] — 상세 문항 피드백                       │
│  [Accordion 1] (Q1 이름 짤림, Score Badge)          │
│    └─ [expand arrow]                               │
│       내 답변 / 면접관의 피드백                      │
│  [Accordion 2]                                     │
│  [Accordion 3]                                     │
│  ...                                               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                 [Restart Button]                     │
└─────────────────────────────────────────────────────┘
```

### 2.2 모바일 레이아웃 (≤768px)

```
┌──────────────────────────┐
│  [Eyebrow]               │
│  [Title]                 │
│  [Sub]                   │
└──────────────────────────┘

┌──────────────────────────┐
│  [Hero Countdown]        │
└──────────────────────────┘

┌──────────────────────────┐
│  [Radar 카드]            │
│  - 차트                  │
│  - Legend bars           │
└──────────────────────────┘

┌──────────────────────────┐
│  [Feedback 카드]         │
│  - 강점                  │
│  - 약점                  │
│  - 개선 방향             │
└──────────────────────────┘

┌──────────────────────────┐
│  [Q&A 섹션]              │
│  [Accordion들]           │
└──────────────────────────┘

┌──────────────────────────┐
│  [Restart Button]        │
└──────────────────────────┘
```

---

## 3. 컴포넌트 사양 (Component Specs)

### 3.1 Hero Countdown 영역

**목적:** 종합 점수를 강조하고 카운트업 애니메이션으로 결과 도달의 카타르시스 강화.

**위치:** Header 아래 / KPI 카드 위  
**크기:** 풀 폭, 높이 약 160px  
**배경:** `var(--surface)` (rgba(255,255,255,0.08) 이상) / border 1px `var(--border)`  
**Border radius:** `18px`

**디스플레이 엘리먼트:**
```
┌────────────────────────────────────┐
│                                    │
│      종합 점수 텍스트 (라벨)        │
│                                    │
│              73                     │  ← 카운트업 애니메이션
│            /100                     │  ← 고정 텍스트
│                                    │
└────────────────────────────────────┘
```

**타이포그래피:**
- **라벨 ("종합 점수"):** 
  - 폰트: `var(--font-display)` (Pretendard)
  - 크기: 14px
  - 무게: 500
  - 색상: `var(--fg-muted)` (#a1a1aa)
  - 자간: 0.08em (uppercase 아님, 일반 case)

- **카운트업 숫자:**
  - 폰트: `var(--font-display)`
  - 크기: **clamp(64px, 12vw, 96px)** (반응형)
  - 무게: 700
  - 색상: `var(--accent)` (#6e74ff) — accent 강조
  - 자간: -0.04em
  - 줄높이: 1

- **단위 ("/100"):**
  - 크기: 28px
  - 무게: 500
  - 색상: `var(--fg-dim)` (#6e6e73)
  - 기준선: baseline (숫자와 같은 높이)

**애니메이션:**
- **트리거:** ReportPage mount 시 즉시 시작
- **타입:** JavaScript `rAF` 카운트업 (현재 구현 유지, `useCountUp` hook)
- **이징:** cubic-bezier(0.22, 0.61, 0.36, 1) — `var(--ease-soft)` 적용
- **지속:** 1100ms
- **지연:** 0ms (모든 다른 애니메이션보다 먼저 시작)
- **범위:** 0 → 실제 최종값 (예: 73)

**접근성:**
- `prefers-reduced-motion: reduce` 시 카운트업 비활성화, 최종값 즉시 표시

---

### 3.2 KPI 카드 (기존 유지, 색상/간격만 정밀화)

**현재 구현:** `KpiCard` 서브컴포넌트 (4개 카드 그리드)  
**변경 사항:** 최소

**간격 확인:**
- 그리드 gap: **16px** (현재 유지)
- 카드 padding: **22px 24px** (현재 유지)

**모바일 breakpoint (≤880px):**
- 그리드: 4 컬럼 → 2 컬럼

---

### 3.3 2-컬럼 영역 (Radar + Feedback)

**컨테이너 속성:**
```css
.report-grid {
  display: grid;
  grid-template-columns: 48% 1fr;  /* 또는 1.1fr 1fr 비율 검토 */
  gap: 20px;  /* 현재값 유지 */
  /* 모바일: 1fr / 1fr */
}
```

#### 3.3.1 Radar 카드 (좌측)

**컨텐츠:**
- **카드 헤더:** "역량 다이어그램" (uppercase, 13px, `var(--fg-dim)`)
- **차트:** SVG `RadarChart` 컴포넌트 (현재 유지)
- **범례:** 4개 KPI별 bar chart (현재 구현 유지)

**차트 진입 애니메이션 (F-24):**

**(1) 레이더 링(Grid):**
- 애니메이션 이름: `radar-ring-enter`
- 시작 상태: `stroke-dasharray` 설정, dash-offset로 그리기 단계적 표현 또는 opacity 0
- 종료: opacity 0.6 (현재)
- 지속: 0.5s
- 이징: `ease-out`
- 지연: 각 링마다 stagger
  - Ring 1: 100ms
  - Ring 2: 180ms
  - Ring 3: 260ms

**(2) 축선 (Axis lines):**
- 타입: opacity fade-in
- 지속: 0.5s
- 이징: ease-out
- 지연: 250ms + (index × 60ms)

**(3) 폴리곤 (Polygon fill):**
- 타입: `transform: scale(0 → 1)` (중심에서 부풀어 오름)
- 지속: **0.85s** (느린 템포로 카타르시스 강화)
- 이징: `var(--ease-soft)`
- 지연: **550ms** (링·축 완성 후 시작)
- `transform-origin: 50% 50%`

**(4) 꼭지점 (Vertices):**
- 타입: `transform: scale(0 → 1)` (팝 애니메이션)
- 이징: **cubic-bezier(0.34, 1.56, 0.64, 1)** — spring, 살짝 튀어오름
- 지속: 0.4s
- 지연: 각 꼭지점마다 stagger
  - Pt 1: 1100ms
  - Pt 2: 1190ms
  - Pt 3: 1280ms
  - Pt 4: 1370ms

**(5) 축 라벨 (Axis labels):**
- 타입: opacity fade-in
- 지속: 0.5s
- 이징: ease-out
- 지연: 500ms + (index × 70ms)

**범례 바 애니메이션:**
- 타입: `width: 0 → [value]%` (fill animation)
- 이징: `var(--ease-soft)`
- 지속: 0.9s
- 지연: 900ms + (index × 90ms) (현재 구현)

---

#### 3.3.2 Feedback 카드 (우측)

**컨텐츠:**
- **카드 헤더:** "종합 피드백" (uppercase, 13px, `var(--fg-dim)`)
- **Block 1 — 강점:**
  - 소제목: "강점" (14px, 600, `var(--fg)`)
  - 본문: 텍스트 (14px, `var(--fg-muted)`, line-height 1.65)
  
- **Block 2 — 약점:**
  - 소제목: "약점"
  - 본문: 텍스트

- **Block 3 — 개선 방향:**
  - 소제목: "개선 방향"
  - 목록: `<ul>` with dot marker
    - 각 li: 14px, `var(--fg-muted)`, line-height 1.6
    - 마커: 4px 원 dot, `var(--accent)` 색상
    - 패딩: left 14px

**Block 간격:**
- 각 block 사이: 22px (gap)
- Block 내 제목·본문 사이: 8px

**Empty state:**
- 데이터 없을 시: "분석된 강점이 없습니다." (italic, `var(--fg-dim)`)

---

### 3.4 Q&A 아코디언 섹션 (문항별 상세 피드백)

**컨테이너:**
```css
.qa-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 56px;  /* 피드백 카드와의 간격 */
}
```

**섹션 제목:** "상세 문항 피드백" (22px, 600, `var(--font-display)`)

#### 3.4.1 아코디언 항목 (각 문항)

**닫힌 상태 (collapsed):**
```
┌──────────────────────────────────────────────┐
│  [Score Badge]  [Q1 텍스트...]  [Chevron ▼] │
└──────────────────────────────────────────────┘
```

**펼친 상태 (expanded):**
```
┌──────────────────────────────────────────────┐
│  [Score Badge]  [Q1 텍스트...]  [Chevron ▲] │
├──────────────────────────────────────────────┤
│                                              │
│  내 답변                                     │
│  [답변 텍스트 박스]                         │
│                                              │
│  면접관의 피드백                             │
│  [피드백 텍스트]                             │
│                                              │
└──────────────────────────────────────────────┘
```

**구조:**
```jsx
<div className="qa-item {open ? 'is-open' : ''}">
  <button className="qa-summary">
    <span className="qa-badge qa-badge-{tone}">73</span>
    <span className="qa-q">
      <span className="qa-num">Q1</span>
      <span className="qa-text">[질문 텍스트 80자 제한]…</span>
    </span>
    <ChevronDown className="qa-chev" />
  </button>
  <div className="qa-detail-wrap">
    <div className="qa-detail">
      <div className="qa-block">
        <div className="qa-h">내 답변</div>
        <p className="qa-answer">[답변]</p>
      </div>
      <div className="qa-block">
        <div className="qa-h">면접관의 피드백</div>
        <p className="qa-feedback">[피드백]</p>
      </div>
    </div>
  </div>
</div>
```

**헤더 스타일 (qa-summary):**
- 배경: transparent (기본)
- Hover: `rgba(255,255,255,0.03)` (미세한 highlight)
- 패딩: 16px 20px
- 그리드: 44px(badge) / 1fr(text) / 24px(chevron)
- 버튼 스타일: border: none, cursor: pointer

**Score Badge (qa-badge):**
- 크기: 36px × 36px
- Border radius: 10px
- 폰트: 600, 15px, tabular-nums
- Tone별 배경·색상:
  - `good` (≥7): bg `rgba(74, 222, 128, 0.12)`, color `#4ade80`
  - `mid` (5~6): bg `rgba(234, 179, 8, 0.12)`, color `#facc15`
  - `low` (<5): bg `rgba(239, 68, 68, 0.12)`, color `#f87171`

**Question (qa-q):**
- 레이아웃: flex column, gap 2px
- Min-width: 0 (text overflow 처리)
- **qa-num:** 11px, `var(--fg-dim)`, letter-spacing 0.05em
- **qa-text:** 14px, `var(--fg)`, overflow: ellipsis (한 줄, 80자 제한)

**Chevron (qa-chev):**
- 색상: `var(--fg-muted)`
- 변환: `rotate(0deg)` → `rotate(180deg)` (열림 시)
- 전환: `transform var(--dur-medium) var(--ease-soft)`

#### 3.4.2 아코디언 펼침 애니메이션 (F-26)

**전체 상세 래퍼 (qa-detail-wrap):**
```css
.qa-detail-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.35s var(--ease-soft);
}
.qa-item.is-open .qa-detail-wrap {
  grid-template-rows: 1fr;
}
```

**내부 컨텐츠 (qa-detail):**
- 기본: `padding: 0 20px` (숨겨짐)
- 펼침 시: `padding: 4px 20px 22px` (내용 표시)
- Opacity/Transform 애니메이션:
  ```css
  .qa-detail {
    opacity: 0;
    transform: translateY(-4px);
    transition: opacity 0.28s ease 0.06s, transform 0.28s ease 0.06s;
  }
  .qa-item.is-open .qa-detail {
    opacity: 1;
    transform: translateY(0);
  }
  ```

**상세 블록 (qa-block):**
- Layout: flex column, gap 6px
- 제목 (qa-h): 12px, `var(--fg-dim)`, uppercase, letter-spacing 0.05em
- 본문 (qa-answer, qa-feedback):
  - 크기: 14px
  - 색상: (answer는 `var(--fg)`, feedback는 `var(--fg-muted)`)
  - Line-height: 1.6
  - White-space: pre-wrap (줄 바꿈 보존)

**답변 박스 (qa-answer):**
- 배경: `rgba(255,255,255,0.03)`
- Border radius: 12px
- 패딩: 14px 16px
- 마진: 0 (리셋)

**피드백 텍스트 (qa-feedback):**
- 배경: 없음
- 마진: 0
- Line-height: 1.65

---

### 3.5 Restart Button

**위치:** 섹션 하단, 풀 폭 중 중앙 정렬  
**스타일:**
- 타입: Outline button
- 배경: transparent
- Border: 1px solid `var(--accent)` (#6e74ff)
- 텍스트 색상: `var(--accent)`
- 패딩: 14px 28px
- Border radius: `var(--radius-pill)` (999px)
- 폰트: 15px, 500, `var(--font-text)`

**Icon:** Sparkles (lucide-react, 18px)

**인터랙션:**
- Hover: `background: color-mix(in srgb, var(--accent) 12%, transparent)`
- Active: `transform: scale(0.98)`
- 전환: `background var(--dur-fast), transform var(--dur-quick)`

---

## 4. 디자인 토큰 매핑

### 4.1 색상 및 배경

| 용도 | 토큰 | 값 | 현재 |
|------|------|-----|------|
| Page 배경 | `--bg` | #000 | ✓ |
| 카드 배경 | `--surface` | #18181b | ✓ |
| 테두리 | `--border` | rgba(255,255,255,0.08) | ✓ |
| 강한 테두리 | `--border-strong` | rgba(255,255,255,0.14) | ✓ |
| 주 텍스트 | `--fg` | #f5f5f7 | ✓ |
| 부 텍스트 | `--fg-muted` | #a1a1aa | ✓ |
| 약한 텍스트 | `--fg-dim` | #6e6e73 | ✓ |
| Accent | `--accent` | #6e74ff | ✓ |

### 4.2 타이포그래피

| 용도 | 값 | 현재 |
|------|-----|------|
| Display (제목) | `var(--font-display)` — Pretendard 700 | ✓ |
| Body (본문) | `var(--font-text)` — Pretendard 400~600 | ✓ |
| Mono (숫자/코드) | `var(--font-mono)` — SF Mono / JetBrains Mono | ✓ |

### 4.3 간격 (Spacing)

| 항목 | 값 |
|------|-----|
| 페이지 padding | 56px 40px 80px (데스크탑) / 36px 20px 64px (모바일) |
| Section gap | 56px |
| Card gap | 20px |
| Block gap | 22px (feedback), 18px (qa-section) |
| Accordion gap | 10px |

### 4.4 Border Radius

| 대상 | 값 |
|------|-----|
| 카드 | 18px (`--radius-card`) |
| 버튼 | 999px (`--radius-pill`) |
| 아코디언 항목 | 14px |
| 이미지/아이콘 박스 | 12px |

### 4.5 Motion

| 항목 | 값 |
|------|-----|
| Easing (소프트) | cubic-bezier(0.22, 0.61, 0.36, 1) — `var(--ease-soft)` |
| Easing (스프링) | cubic-bezier(0.34, 1.56, 0.64, 1) — `var(--ease-spring)` |
| Duration (빠름) | 0.2s — `var(--dur-fast)` |
| Duration (중간) | 0.3s — `var(--dur-medium)` |
| Duration (느림) | 0.4s — `var(--dur-slow)` |

---

## 5. 인터랙션 및 마이크로 디테일

### 5.1 Hover & Focus 상태

**아코디언 헤더 (qa-summary):**
- Hover: 배경 `rgba(255,255,255,0.03)` (미세 highlight)
- Focus: outline 2px solid `var(--accent)`, outline-offset 2px (accessibility)

**Chevron 회전:**
- 기본: `rotate(0deg)`
- 열림: `rotate(180deg)` (0.3s ease)

**Restart Button:**
- Hover: 배경 `color-mix(in srgb, var(--accent) 12%, transparent)`
- Focus: outline (위와 동일)
- Active: `scale(0.98)`

**Score Badge:**
- Static (인터랙션 없음), 배경색으로만 차등

### 5.2 스크롤 진입 (Scroll-triggered Animation)

**Option 1 (권장):** CSS 애니메이션만 사용 (라이브러리 미사용)
- 페이지 로드 시 모든 애니메이션이 자동으로 트리거됨
- `animation-delay` + `forwards` fill-mode로 최종 상태 유지

**Option 2 (선택):** IntersectionObserver로 viewport 진입 시점 제어
- Q&A 섹션이 많을 경우 성능 최적화
- "이 섹션이 보일 때" 아코디언 애니메이션 시작

**현재 권장:** Option 1 (Hero + Radar는 페이지 로드 즉시, Q&A는 지연 로딩 안 함)

### 5.3 Prefers Reduced Motion (접근성)

```css
@media (prefers-reduced-motion: reduce) {
  /* Hero 카운트업: 즉시 최종값 표시 */
  .report-wrap { animation: none; }
  .kpi-card { animation: none; }
  .radar-ring, .radar-axis, .radar-polygon, .radar-vertex, .radar-label { animation: none; }
  .legend-fill { animation: none; width: [final-value]%; }
  
  /* 아코디언 펼침: 즉시 펼침 */
  .qa-detail-wrap { transition: none; grid-template-rows: 1fr; }
  .qa-detail { opacity: 1; transform: none; transition: none; }
  
  /* Chevron: 즉시 회전 */
  .qa-chev { transition: none; transform: rotate(180deg); }
  .qa-item.is-open .qa-chev { transform: rotate(180deg); }
}
```

---

## 6. 반응형 디자인 (Responsive)

### 6.1 Breakpoints

| 범위 | 상태 | 변경 사항 |
|------|------|---------|
| ≥1024px | Desktop | 기본 2-컬럼, 4 KPI 카드 |
| 768px~1023px | Tablet | 2-컬럼 유지, KPI 카드 2×2 그리드 |
| ≤767px | Mobile | 1-컬럼 (Radar / Feedback / Q&A 순차), KPI 카드 1×4 또는 2×2 |

### 6.2 Mobile-specific (≤880px)

```css
@media (max-width: 880px) {
  .report-wrap { padding: 36px 20px 64px; gap: 40px; }
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .report-grid { grid-template-columns: 1fr; }
  .legend-row { grid-template-columns: 110px 1fr 32px; }
  
  .radar-svg { max-width: 280px; }
  .qa-summary { grid-template-columns: 40px 1fr 20px; padding: 14px 16px; }
}
```

### 6.3 Very Small (≤480px)

```css
@media (max-width: 480px) {
  .report-wrap { padding: 24px 16px 48px; gap: 32px; }
  .report-title { font-size: 28px; }
  .qa-badge { width: 32px; height: 32px; font-size: 14px; }
  .qa-q { gap: 0px; }
  .qa-text { font-size: 13px; }
}
```

---

## 7. 구현 우선순위 및 일정 (M1 내 분할)

### 7.1 Must (데모데이 전 필수)

| 항목 | 예상 시간 | 담당 | 우선순위 |
|------|---------|------|---------|
| Hero 카운트업 영역 추가 | 1시간 | FE | P0 |
| 2-컬럼 레이아웃 (grid 재구성) | 1시간 | FE | P0 |
| 아코디언 펼침 패턴 정밀화 (F-26) | 1.5시간 | FE | P0 |
| 레이더 진입 애니메이션 (F-24) | 1.5시간 | FE | P0 |
| CSS 토큰 검증 및 일관성 | 0.5시간 | FE | P1 |
| 모바일 반응형 테스트 | 1시간 | FE | P1 |
| **소계** | **6.5시간** | | |

### 7.2 Should (여유 있으면, 아니면 Defer)

| 항목 | 예상 시간 | 우선순위 |
|------|---------|---------|
| 페이지 enter 애니메이션 (더블체크) | 0.5시간 | P2 |
| Empty state 스타일 개선 | 0.5시간 | P2 |
| 다크 모드 외 라이트 모드 스키마 (미래용) | 2시간 | P3 |

### 7.3 일정 (2026-05-10 ~ 2026-05-19)

```
Mon 5/10  [사양서 작성] ← 지금
Tue 5/11  [FE 구현 시작 — Hero + 2-컬럼]
Wed 5/12  [FE 구현 — 아코디언 + 레이더 애니메이션]
Thu 5/13  [FE 반응형 테스트 + 버그 잡기]
Fri 5/14  [디자이너 검수 + 피드백 반영]
Sat 5/15  [버그 픽스, 최종 보정]
Sun 5/16  [여유 (SSE 토큰 스트리밍 or M2/M3 병행)]
Mon 5/17  [최종 테스트 + 배포 준비]
Tue 5/18  [데모데이 리허설]
Wed 5/19  **[데모데이]**
```

---

## 8. 파일 구조 및 구현 가이드

### 8.1 파일 변경 범위

| 파일 | 변경 사항 |
|------|---------|
| `frontend/src/pages/ReportPage.jsx` | 구조 유지, Hero 섹션 추가 (optional: 별도 Hero 컴포넌트화) |
| `frontend/src/index.css` | `.report-*` 선택자 확장 (애니메이션 추가, 레이아웃 미세조정) |
| `frontend/src/theme/tokens.css` | 변경 불필요 (기존 토큰 재사용) |

### 8.2 React 구현 패턴 (권장)

**Hero 컴포넌트 분리 (선택):**
```jsx
function HeroScore({ finalScore, accent }) {
  const display = useCountUp(finalScore, 1100, 0);
  return (
    <section className="hero-score">
      <div className="score-label">종합 점수</div>
      <div className="score-display">
        <span className="score-value">{display}</span>
        <span className="score-unit">/100</span>
      </div>
    </section>
  );
}
```

**기존 `useCountUp` 훅 재사용:**
- 현재 구현이 충분함 (cubic ease-out, rAF 기반)
- Hero에만 별도 delay 0 적용

**Accordion 상태 관리:**
- 현재 `useState(false)` 패턴 유지
- onClick → toggle state (이미 구현됨)

### 8.3 CSS 추가/수정 항목

**신규 규칙:**
- `.hero-score` 컨테이너
- `.score-label`, `.score-value`, `.score-unit` 타이포그래피
- 레이더 애니메이션 정의 (@keyframes 확장)
- `@media (max-width: 880px)` 모바일 조정

**기존 규칙 미세조정:**
- `.report-grid` 비율 재검토 (현재 1.1fr 1fr → 48% 1fr 권장)
- `.qa-detail-wrap` transition 재확인 (0.35s 유지)
- `.radar-svg` max-width 조정 (반응형)

---

## 9. 검수 체크리스트 (완료 전)

### 9.1 시각 일관성

- [ ] Pretendard 폰트가 모든 타이틀에 적용되었는가?
- [ ] 색상 대비 (WCAG AA 최소)가 충분한가? (다크 배경 #000 위 텍스트)
- [ ] Border radius 12~18px 범위가 일관적인가?
- [ ] 여백(padding/gap)이 8/16/24/32/56 단위 척도를 따르는가?

### 9.2 인터랙션

- [ ] Hero 카운트업이 자연스럽게 0→최종값으로 보이는가?
- [ ] 레이더 폴리곤·꼭지점이 stagger 순서대로 나타나는가?
- [ ] 아코디언 펼침/접힘 transition이 매끄러운가? (>0.3s)
- [ ] Chevron 회전이 180도 정확히 이루어지는가?

### 9.3 반응형

- [ ] 데스크탑 (1400px): 2-컬럼 레이아웃 정렬
- [ ] 태블릿 (768px): 1-컬럼으로 전환, KPI 2×2 유지
- [ ] 모바일 (375px): 한 줄씩 정렬, 폰트 크기 조정

### 9.4 접근성

- [ ] `prefers-reduced-motion: reduce`에서 애니메이션 비활성화
- [ ] Focus outline이 visible한가? (`outline: 2px solid`)
- [ ] 색상만으로 정보 전달하지 않는가? (badge, score 텍스트 포함)
- [ ] ARIA labels (`aria-expanded` 등) 추가되었는가?

### 9.5 성능

- [ ] 애니메이션이 60fps에서 부드러운가? (DevTools Timeline 확인)
- [ ] 불필요한 리플로우/리페인트는 없는가?
- [ ] 라이브러리 추가 (Intersection Observer 등)는 필요한가?

---

## 10. 참고 자료

- **설계 시스템:** `design/README.md`
- **현재 구현:** `frontend/src/pages/ReportPage.jsx`
- **CSS 토큰:** `frontend/src/theme/tokens.css`
- **Wireframe:** `design/assets/wireframe/wireframe_page4.png`
- **Page 1~3 스크린샷:** `design/assets/prod_screentshot/`
- **마이그레이션 가이드:** `design/migration.md`

---

**작성:** UI/UX Designer  
**상태:** 검수 대기 (FE 개발자 리뷰 필요)  
**다음 단계:** 사양서 승인 → FE 구현 시작 (목표: 2026-05-12)
