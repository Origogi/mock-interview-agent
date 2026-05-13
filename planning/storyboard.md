# 🎨 UI 스토리보드 및 유저 플로우 (User Flow)

본 문서는 사용자가 앱에 접속한 후 면접을 마치고 결과를 확인할 때까지의 4단계 화면 전환(Routing) 흐름을 정의합니다. v2 (Apple-style) 디자인을 기준으로 작성되었습니다.

## 디자인 컨셉 (전체)
- **Apple-style minimalism**: 큰 디스플레이 타이포(Inter Display급), 절제된 단일 accent 컬러, 넓은 여백
- 다크 모드 베이스 (`--bg: #000`, `--accent: #6e74ff`), 채도 0.02 이하의 뉴트럴 표면
- 그라데이션·이모지 남용 금지. accent는 액션·강조점에만
- 페이지 전환은 zoom + blur cross-fade (0.28s out → 0.5s in)
- `prefers-reduced-motion: reduce` 시 모든 모션 자동 비활성화

## 📱 Page 1: Home (이력서 업로드) [v2 적용 완료]
> 💡 **UI 와이어프레임:** `../design/assets/wireframe/wireframe_page1.png`
> 💡 **v2 프로토타입:** `../design/assets/redesign/v1-redesign.html`

* **목적:** 서비스 첫인상 및 이력서 업로드

**Hero 섹션**
- 큰 디스플레이 타이포: "당신의 이력서가 / **면접관의 무기가 됩니다.**"
- 서브 카피: 1~2줄, lede 스타일
- accent radial glow (배경)

**Drop Zone**
- 빈 상태: 업로드 아이콘 + "이력서 PDF를 여기에 놓아 주세요" + 파일 선택 버튼
- 파일 부착 상태: PDF 글리프 + 파일명/크기 + 제거(×) 버튼 + "분석 시작 →" CTA + "다른 파일 선택" 링크
- 드래그 오버 상태 시각 피드백

**Proof 스트립**
- 하단에 3개 지표 (`5` 평균 질문 / `6` 역량 진단 / `~3min` 분석 시간)

**How it works**
- 3-up 카드: 01 이력서 분석 / 02 동적 꼬리 질문 / 03 종합 리포트

**인터랙션:** 파일 업로드 후 CTA 클릭 시 즉시 Page 2로 라우팅되며, 백그라운드에서 분석 요청이 진행됨.

## 📱 Page 2: Summary (이력서 요약 확인) [v2 적용 완료]
> 💡 **UI 와이어프레임:** `../design/assets/wireframe/wireframe_page2.png`

* **목적:** AI가 파악한 이력서의 핵심 내용 확인 및 면접 진입 준비

**로딩 상태**
- 3-dot pulse loader + "이력서를 정밀 분석하는 중" + 진행 바
- 분석 완료 시 로더 fade-out → 결과 fade-in (`is-leaving` 패턴, 400ms)

**결과 화면 구조** (위에서부터)
1. 헤더: "분석 완료" eyebrow + "면접관이 {이름}님의 이력서를 모두 읽었습니다." 디스플레이 + 한줄 bio
2. **Stat row**: `경력 / 기술 스택 / 주요 프로젝트 / 공격 포인트` 4개 큰 숫자 — 공격 포인트만 accent 컬러
3. 경력: 시간순 타임라인 (period · company · role)
4. 파악된 기술 스택: chip 그리드
5. 주목할 만한 프로젝트: 카드 그리드 (idx, name, desc, tech tags)
6. **2컬럼 split**: `강점 / 면접관이 노릴 약점` (약점 컬럼 accent 강조)
7. CTA: "준비됐다면 시작하세요. → 실전 면접 시작"

## 📱 Page 3: Interview (실전 면접) [v2 적용 완료]
* **목적:** 실제 기술 면접과 동일한 긴장감과 몰입감을 제공하는 실시간 채팅 인터페이스

**2-pane 레이아웃**
- 좌측 레일 (28%, `--split` CSS variable): 진행 상태 + 실시간 평가 카드 리스트
- 중앙 스테이지: 면접관 헤더 + 채팅 스레드 + 입력창

**좌측 레일**
- 상단: accent 점 + "실전 면접 진행 중" eyebrow
- 큰 숫자 진행 표시: `1/5` + 진행 바 (3px height)
- 면접 조기 종료 버튼 (red outline, hover 시 red 강조)
- 실시간 평가 리스트: Q번호 + 질문 미리보기 + 점수, 클릭 시 `grid-template-rows: 0fr → 1fr` 아코디언으로 피드백 펼침
- 빈 상태: dashed 원형 글리프 + "아직 답변이 없습니다 / 첫 답변을 입력해보세요"

**중앙 스테이지 — 면접관 헤더**
- 아바타 (이모지 반응: 점수 ≥8 😌 / ≥6 🤔 / 그 외 😐) + 펄스 링 (busy 시)
- "시니어 엔지니어 면접관" + 동적 상태 텍스트 ("답변 생성 중…" / "분석 중…" / "Tech-Interviewer AI · gpt-4o-mini")
- 우측 Q번호 pill (mono font)

**채팅 스레드** (핵심 변경)
- **면접관 답변은 버블/배경 없음** — Claude처럼 캔버스에 직접 텍스트 (18px / line-height 1.65)
- **사용자 답변만 accent 색 버블** (오른쪽 정렬, border-bottom-right-radius 6px)
- 면접관 응답은 **백엔드 NDJSON 토큰 스트림 + 프론트 로컬 reveal 큐**로 토큰 단위 fade-in
- 스트리밍 중 끝에 **블록 캐럿** 깜박임
- "분석 중" typing dots 인디케이터 (점 3개)

**스크롤 동작**
- 사용자가 답변 전송 시 **자신의 버블이 viewport 상단에 pin** (24px 여유)
- AI 응답은 핀 아래로 자연스럽게 흘러나옴 (재스크롤 없음)
- 스레드 하단 70vh 스페이서로 짧은 응답에서도 pin이 실제로 동작
- 단일 `useLayoutEffect[messages]`에서 detect + scroll 일괄 처리 (paint flash 방지)

**평가 토스트**
- 답변 분석 완료 시 우측 상단에 점수 카드 슬라이드 인 (2.6초 자동 사라짐)
- 점수 ≥ 7: accent / 점수 < 7: red
- 동시에 좌측 레일의 해당 카드는 `is-fresh` 클래스로 highlight 페이드아웃

**입력창**
- 멀티라인 textarea (Enter 전송 / Shift+Enter 줄바꿈 / Tab 2-space 들여쓰기)
- 전송 버튼 + Enter/Shift+Enter/Tab hint
- 면접관이 응답 중일 때 자동 잠금 + placeholder 컨텍스트 변경 ("면접관이 분석 중이에요…" / "면접관이 말하는 중이에요…")
- 한글 IME composition 가드 (`isComposing` + `onCompositionEnd`)로 자모 분리 방지

**인터랙션**
- Page 3 진입 시 첫 질문이 토큰 단위 fade-in
- 약속된 횟수(5회) 답변 종료 시 "면접이 모두 완료되었습니다…" 후 Page 4로 자동 라우팅
- **면접 조기 종료 (F-29):** 좌측 레일의 조기 종료 버튼 클릭 → 확인 모달(질문 N개 기준 리포트 생성 안내) → 승인 시 부분 응답으로 Page 4 리포트 즉시 생성·전환

## 📱 Page 4: Report (최종 결과) [v2 적용 완료]
> 💡 **UI 와이어프레임:** `../design/assets/wireframe/wireframe_page4.png`

* **목적:** 면접 결과 분석 및 피드백 시각화
* **현재 상태:** Apple-style CSS-only 리디자인 적용 완료. `ReportPage.jsx` 컴포넌트와 `HeroScore.jsx`로 분리되어 Page 1~3과 동일한 v2 톤을 사용.

**현재 구조 (v2)**
- 상단 헤더: "면접 결과 리포트" + 조기 종료 시 `조기 종료 N/5 문항` 배지
- Hero: 종합 점수 카운트업 큰 숫자 + 부분 리포트 disclaimer
- KPI row: 4대 역량 점수 카드
- 2컬럼 그리드: 좌 커스텀 SVG 레이더 차트 / 우 종합 피드백 (강점/약점/개선)
- 하단: 문항별 상세 CSS 아코디언 (`grid-template-rows` 전환)
- "새로운 면접 시작하기" 버튼 (세션 초기화 → Page 1)

---

## 화면 전환 (전체) [완료]
- Apple Keynote 스타일 zoom + blur cross-fade
- out: scale(0.985), translateY(-4px), blur(4px), opacity 0 (0.28s)
- in: scale(1.02 → 1), translateY(8 → 0), blur(6 → 0), opacity 0 → 1 (0.5s, ease-out cubic)
- `prefers-reduced-motion: reduce` 시 자동 비활성화
