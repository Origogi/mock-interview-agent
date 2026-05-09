# F-28 디버그 모드: 샘플 답변 채우기 UI 사양서

## 개요
InterviewPage(Page 3) 채팅 영역의 composer 상단 좌측에 "✨" 버튼을 배치하여, 클릭 시 3개 난이도별 샘플 답변을 동기 호출(1~3초)한 후 textarea에 일괄 채우는 디버그 기능.

**핵심 전제:**
- 위치: `iv-input-wrap` > textarea 바로 위, 좌측
- 형태: 아이콘 단일 버튼 + 위로 솟는 드롭업 (downward × / **upward O**)
- 동작: 호출 → composer disable → 채움 → **자동 전송 X**
- 톤: DebugMenu 톤 준용 (약한 강조, 디버그 표시)

---

## 1. 버튼 시각 사양

### 위치 & 크기
- **위치:** `iv-input` 내부 좌상단, textarea 바로 위
- **높이:** `28px` (기존 DebugMenu 버튼과 동일)
- **너비:** `28px` (아이콘만, 정사각형)
- **Padding:** 좌측 `4px` margin (textarea 시작점과 맞춤)

### 라벨
- **표시:** ✨ 아이콘만 (텍스트 라벨 없음)
- **폰트 크기:** `16px`
- **line-height:** `1`

### 색상 & 상태

| 상태 | 배경 | 텍스트/아이콘 | Border |
|------|------|---------|--------|
| **Normal** | `rgba(255, 255, 255, 0.06)` | `rgba(255, 255, 255, 0.56)` | `1px rgba(255, 255, 255, 0.04)` |
| **Hover** | `rgba(255, 255, 255, 0.12)` | `rgba(255, 255, 255, 0.72)` | same |
| **Active (pressed)** | `rgba(255, 255, 255, 0.16)` | `rgba(255, 255, 255, 0.9)` | 1px + focus ring `2px rgba(110, 116, 255, 0.3)` |
| **Disabled** (finished/isAiTyping) | `rgba(255, 255, 255, 0.04)` | `rgba(255, 255, 255, 0.3)` | same as normal |

### 스타일 디테일
- **Border Radius:** `8px` (compact)
- **Transition:** `all 0.15s cubic-bezier(0.22, 0.61, 0.36, 1)` (--ease-soft 토큰 재사용)
- **Cursor:** `pointer` (normal) / `default` (disabled)
- **Focus Ring:** `box-shadow: 0 0 0 2px rgba(110, 116, 255, 0.3)` (accent 색상, --accent 토큰 사용)

---

## 2. 드롭업 시각 사양

### 위치 & 크기
- **위치:** 버튼의 **위쪽**, 버튼의 bottom에서 `-8px` offset (위로 떠 있는 듯)
- **수평 정렬:** 버튼 좌측 정렬 (`left: 0`)
- **폭:** `240px`
- **Max-height:** `320px` (3개 항목 + 헤더 -> 실제로는 fit-content)

### 항목 구조 (3개)

```
┌──────────────────────┐
│ ✨ 샘플 답변          │  (헤더, 글자크기 12px, 추가 조작 없음)
├──────────────────────┤
│ ✨ Best (8~10)       │  (호버 bg, 클릭 → 호출)
├──────────────────────┤
│ 🙂 Good (4~7)        │  (호버 bg)
├──────────────────────┤
│ 🥲 Bad (1~3)         │  (호버 bg)
└──────────────────────┘
```

### 항목 디테일
- **높이:** `44px` (균형잡힌 클릭 영역)
- **Padding:** `12px 16px`
- **Font-size:** `14px`
- **Font-weight:** `400`
- **Text color:** `rgba(255, 255, 255, 0.8)` (normal)
- **Hover text color:** `rgba(255, 255, 255, 0.95)` (약간 밝음)
- **Item separator:** `1px solid rgba(255, 255, 255, 0.04)` (divider)
- **Hover background:** `rgba(255, 255, 255, 0.08)` (subtle)
- **Transition:** `background-color 0.12s ease` (빠른 응답)

### 헤더 스타일
- **Text:** "✨ 샘플 답변"
- **Font-size:** `12px`
- **Font-weight:** `600`
- **Color:** `rgba(255, 255, 255, 0.9)`
- **Padding:** `12px 16px`
- **Border-bottom:** `1px solid rgba(255, 255, 255, 0.04)`

### 컨테이너 스타일
- **배경:** `rgba(24, 24, 27, 0.95)` (DebugMenu 톤 준용)
- **Backdrop-filter:** `blur(12px)`
- **Border:** `1px solid rgba(255, 255, 255, 0.08)` (hairline)
- **Border-radius:** `14px` (DebugMenu보다 약간 축소, compact 느낌)
- **Box-shadow:** `0 20px 60px rgba(0, 0, 0, 0.5)` (적절한 depth)
- **Z-index:** `1001` (DebugMenu `1000`보다 위)
- **Overflow:** `hidden` (border-radius 적용)

---

## 3. 드롭업 닫힘 트리거

| 트리거 | 동작 |
|--------|------|
| **ESC 키** | 드롭업 닫기 |
| **외부 클릭** | 드롭업 닫기 (mousedown on document, 컨테이너 외) |
| **항목 선택** | 항목 클릭 → 호출 시작 → **즉시 닫기** (로딩 중에도) |
| **자동 닫기** | 없음 (호출 완료 후 수동 ESC/외부클릭으로만 닫기) |

---

## 4. 로딩 UI 결정: **(c) 둘 다**

### 근거
- **(a)만 선택 시:** 버튼 자리에 스피너는 버튼 가시성↓, 사용자가 로딩 중임을 놓칠 수 있음
- **(b)만 선택 시:** 버튼 상태 미표시, 중복 클릭 위험
- **(c) 추천:** textarea 위 로딩 상태 + 버튼 인라인 피드백 = **명확한 진행상황**

### 구현 상세

#### (i) 버튼 상태 (로딩 중)
```
✨ → [spinner icon]  (버튼 내 아이콘 교체, 너비 유지)
```
- **스피너:** 6px × 6px, 800ms 회전 애니메이션 (smooth)
- **색상:** `rgba(110, 116, 255, 1)` (accent)
- **회전:** `360deg` via `@keyframes` (ease-in-out)
- **Button disabled:** `pointer-events: none`, opacity 변화 없음 (명확성)

#### (ii) Textarea 자리 (로딩 중)
```
┌─────────────────────────┐
│ 🔄 샘플 답변 생성 중...  │ ← placeholder 스타일 텍스트 + 인라인 스피너
│                         │
└─────────────────────────┘
```
- **표시 방식:** 기존 placeholder를 임시 replace하거나, 투명 overlay div
- **텍스트:** "🔄 샘플 답변 생성 중..." (좌측 정렬)
- **색상:** `rgba(255, 255, 255, 0.4)` (muted)
- **Font-size:** `15px` (textarea 본문 크기와 동일)
- **Spinner:** 우측, 12px × 12px, 800ms (버튼 스피너와 동기)
- **진입:** fade-in `0.2s ease-out`
- **퇴장:** fade-out `0.15s ease-in` + 텍스트 한 줄 clear

#### (iii) Textarea disabled 상태
- **배경 투명도 조정:** 기존 투명도 유지, 커서만 막기
- **Pointer-events:** `none`
- **Opacity:** 변화 없음 (컨트래스트 유지)

---

## 5. finished / isAiTyping 중 버튼 상태: **HIDDEN**

### 근거
- **Finished:** 면접 종료, 더 이상 질문 없음 → 샘플 답변 불필요 (UI 깔끔)
- **isAiTyping:** AI가 다음 질문 생성 중 → 사용자가 답변 작성할 수 없음 → 샘플 버튼 숨김 (논리적)
- **disabled 대신 hidden:** UI 복잡도↓, "사용 불가능한 상태"가 명확

### 구현
```javascript
{!finished && !isAiTyping && (
  <button className="iv-sample-btn" onClick={handleSampleAnswer}>
    ✨
  </button>
)}
```

### CSS (숨김 처리)
```css
.iv-sample-btn {
  /* 기본 스타일 */
}

.iv-sample-btn[aria-hidden="true"],
.interview.finished .iv-sample-btn,
.interview.is-ai-typing .iv-sample-btn {
  display: none;
}
```

---

## 6. 모션 토큰

### 기존 토큰 재사용

```css
/* from frontend/src/theme/tokens.css */

/* Easing */
--ease-soft: cubic-bezier(0.22, 0.61, 0.36, 1);     /* 버튼 호버, 드롭업 진입 */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);   /* 선택사항: 항목 hover 바운스 */

/* Duration */
--dur-quick: 0.15s;  /* 버튼 상태 전환 */
--dur-fast: 0.2s;    /* 드롭업 fade-in (선택사항) */
--dur-medium: 0.3s;  /* 드롭업 scale 진입 (권장) */
```

### 신규 정의 (필요시)

```css
/* 드롭업 진입 */
@keyframes sample-dropdown-in {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.94);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.sample-dropdown {
  animation: sample-dropdown-in var(--dur-medium) var(--ease-soft) both;
}

/* 로딩 스피너 회전 */
@keyframes spinner-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spinner-spin 0.8s linear infinite;
}
```

### prefers-reduced-motion 분기

```css
@media (prefers-reduced-motion: reduce) {
  .sample-dropdown {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .spinner {
    animation: none;
  }
}
```

---

## 마크업 시안 (HTML + CSS)

### 구조

```html
<!-- textarea 바로 위, iv-input 내부 -->
<div class="iv-input">
  <!-- Sample Answer 버튼 + 드롭업 -->
  <div class="iv-sample-wrapper">
    <button class="iv-sample-btn" id="sampleBtn">
      ✨
    </button>
    
    <!-- 드롭업 (동적 생성/표시) -->
    <div class="iv-sample-dropdown" id="sampleDropdown" style="display: none;">
      <div class="sample-dropdown-header">✨ 샘플 답변</div>
      <button class="sample-item" data-level="best">
        ✨ Best (8~10)
      </button>
      <button class="sample-item" data-level="good">
        🙂 Good (4~7)
      </button>
      <button class="sample-item" data-level="bad">
        🥲 Bad (1~3)
      </button>
    </div>
  </div>
  
  <!-- 텍스트에리어 -->
  <textarea ref={textareaRef} class="iv-textarea" />
  
  <!-- Footer (기존) -->
  <div class="iv-input-foot">...</div>
</div>
```

### CSS

```css
.iv-sample-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 12px;
}

.iv-sample-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.56);
  cursor: pointer;
  transition: all 0.15s var(--ease-soft);
}

.iv-sample-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.72);
}

.iv-sample-btn:active {
  background: rgba(255, 255, 255, 0.16);
  box-shadow: 0 0 0 2px rgba(110, 116, 255, 0.3);
}

.iv-sample-btn:disabled {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.3);
  cursor: default;
  opacity: 1;
}

/* 드롭업 */
.iv-sample-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  width: 240px;
  background: rgba(24, 24, 27, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  z-index: 1001;
  animation: sample-dropdown-in var(--dur-medium) var(--ease-soft) both;
}

.sample-dropdown-header {
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.sample-item {
  width: 100%;
  padding: 12px 16px;
  height: 44px;
  display: flex;
  align-items: center;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.sample-item:last-child {
  border-bottom: none;
}

.sample-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.95);
}

.sample-item:active {
  background: rgba(255, 255, 255, 0.12);
}

/* 진입 애니메이션 */
@keyframes sample-dropdown-in {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.94);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 로딩 중 텍스트에리어 상태 */
.iv-textarea.is-loading {
  pointer-events: none;
}

.loading-placeholder {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.4);
  animation: fade-in 0.2s ease-out both;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(110, 116, 255, 0.3);
  border-top-color: rgba(110, 116, 255, 1);
  border-radius: 50%;
  animation: spinner-spin 0.8s linear infinite;
}

@keyframes spinner-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .iv-sample-dropdown {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .spinner {
    animation: none;
  }
}
```

---

## 요약표: 6가지 핵심 결정

| # | 항목 | 결정 | 근거 |
|---|------|------|------|
| **1** | 버튼 시각 | 28px × 28px 아이콘전용, ✨, bg `rgba(255,255,255,0.06)`, border-radius 8px | DebugMenu 톤 준용, 컴팩트한 composer 상단 배치 |
| **2** | 드롭업 시각 | 240px 폭, 3개 항목, 위로 솟음 (bottom: 100%), bg `rgba(24,24,27,0.95)`, border-radius 14px, blur 12px | Apple-style glassmorphism, 하단 메뉴와 구분, 명확한 계층 |
| **3** | 닫힘 트리거 | ESC + 외부클릭 + 항목선택시 즉시닫기 | 표준 드롭다운 UX, 로딩 중에도 닫혀서 composer 사용 불가 방지 X |
| **4** | 로딩 UI | **(c) 둘 다** (버튼 스피너 + textarea 위 로딩 메시지) | 이중 피드백으로 진행상황 명확화, 중복 클릭 방지 |
| **5** | 버튼 숨김 조건 | finished \|\| isAiTyping 시 display: none | 논리적 컨텍스트, UI 정리, disabled 상태 혼동 방지 |
| **6** | 모션 토큰 | --ease-soft (버튼) / --dur-medium (드롭업 진입) + @keyframes spinner-spin | 기존 토큰 재사용, 일관된 디자인 언어, prefers-reduced-motion 지원 |

---

## 다음 단계 (FE 구현용)

1. **마크업 생성:** `iv-input` 내부 상단에 `.iv-sample-wrapper` 추가
2. **상태 관리:** `isLoading`, `isDropdownOpen`, `finished`, `isAiTyping` 상태 체크
3. **API 호출:** level 선택 → POST `/api/sample-answer?level={best|good|bad}` → textarea에 fill
4. **애니메이션:** CSS 토큰 활용, prefers-reduced-motion 대응
5. **접근성:** 버튼 `aria-haspopup="true"`, 드롭업 `role="menu"`, 항목 `role="menuitem"`
6. **테스트:** ESC 닫기, 외부클릭, 로딩 상태, 자동전송 X 검증

---

**작성일:** 2026-05-10  
**설계자:** UI Designer (Claude Code)  
**참조 토큰 파일:** `frontend/src/theme/tokens.css`  
**참조 컴포넌트:** `frontend/src/debug/DebugMenu.jsx` (popover 스타일)  
**참조 레이아웃:** `frontend/src/pages/InterviewPage.jsx` (`.iv-input-wrap`)
