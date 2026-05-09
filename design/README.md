# 🎨 Design — UI/UX 가이드라인 및 에셋

본 폴더는 Tech-Interviewer AI 프로젝트의 디자인 원칙, 검수 체크리스트, 와이어프레임 및 프로토타입 에셋을 모아둡니다.

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

> Page 1/2/3는 v2 적용 완료. Page 4는 v1(MUI Glassmorphism) 잔존 — `planning/todo.md` 5.2 참고.

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
