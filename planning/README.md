# Planning — 기획 및 비전

본 폴더는 Tech-Interviewer AI 프로젝트의 기획 산출물을 모아둡니다. 현재 제품 설명, 구현된 기능, 남은 Todo는 `features.md` 하나로 통합해 관리합니다. 프론트엔드/백엔드 구현 세부사항은 각 영역의 README에서 관리합니다.

## 프로덕트 핵심 가치 (Core Values)

기능 우선순위와 범위 결정의 기준이 되는 3가지 가치입니다.

1. **개인화 (Personalization):** 정형화된 질문이 아닌, 사용자 이력서 기반의 맞춤형 경험 제공
2. **긴장감 (Tension):** 실제 면접과 유사한 꼬리 질문 압박 경험 제공
3. **직관적 피드백 (Actionable Feedback):** 면접 후 무엇을 어떻게 고쳐야 할지 시각적(레이더 차트)이고 구체적인 피드백 제공

## 우선순위 판단 기준
- **Must Have (MVP):** 없으면 서비스가 동작하지 않는 것
- **Should Have:** 사용자 경험을 크게 높이는 것
- **Nice to Have:** 여유 있을 때 추가하는 것

Over-engineering을 지양하고 MVP 핵심 기능 완성에 집중합니다.

## 문서 인덱스

| 파일 | 용도 |
|------|------|
| [`features.md`](./features.md) | 제품 개요, 구현된 기능 상세, 남은 Todo |
| [`storyboard.md`](./storyboard.md) | 화면 단위 UI 레이아웃 및 사용자 흐름 (v2 Apple-style 기준) |
| [`deployment.md`](./deployment.md) | Railway FE/BE 분리 배포 절차와 환경 변수 |

## 와이어프레임 위치
화면별 와이어프레임 PNG는 `../design/assets/wireframe/` 에 있고, v2 디자인 프로토타입은 `../design/assets/redesign/v1-redesign.html` 에 있습니다.
