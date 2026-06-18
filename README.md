# hgi-vibecoding
한화손보 바이브코딩 경진대회

---

# Global Risk Atlas v48

v45를 기본 구조로 유지하고, v46의 해외계약 Intake 기능만 선별 반영한 버전입니다.

## 주요 변경사항
- 주재원 사용 메뉴 제거: 주재원은 메일/Slim/업무요청으로 글로벌사업부에 전달, 글로벌사업부가 Intake 등록
- 사용자 범위 재정의: 글로벌사업부 + 재물/특종/해상 UW + 클레임 담당자
- 해외계약 Intake 메뉴 추가
  - 메일/Slip 원문 붙여넣기 또는 파일 업로드
  - 기본정제 후 표준 Intake 등록
  - 사고이력, 사고금액, 사고내용 필드 추가
  - Intake 목록 조회/수정/삭제
  - Intake 내용을 임의수재 계약 등록폼으로 전송
- 화면 설명은 우측 상단 [설명] Hover로 정리
- v45의 기간계 공식원천/마감 전 수기관리/대사관리 구조 유지

## v49 고도화 (enhance.js)
기존 app.js는 그대로 두고, 뒤에서 로드되는 `enhance.js` 모듈로 두 가지 기능을 추가했습니다.

### 1. 진짜 AI Copilot (Claude API 연동)
- 기존의 하드코딩 규칙기반 Copilot을 실제 LLM 연동으로 교체
- AI Copilot 메뉴 상단 [API 설정]에 Anthropic API 키 입력 → 현재 화면에 적재된 실제 포트폴리오 데이터(계약·사고·수재·재보험·Layer·문서)를 컨텍스트로 넘겨 자연어 질의응답
- 모델 선택(Opus 4.8 / Sonnet 4.6 / Haiku 4.5), 스트리밍 응답, 마크다운 표 렌더링
- 키가 없으면 기존 규칙기반 엔진으로 자동 폴백(오프라인 데모로도 동작)
- API 키는 브라우저 localStorage에만 저장되며, 요청은 브라우저→Anthropic 직접 호출(`anthropic-dangerous-direct-browser-access`). 데모/PoC 용도

### 2. E2E 시나리오 투어
- 우측 하단 [🎬 시나리오 투어] 버튼 → Intake → 소재지 누적위험 → 사고 → 재보험 영향분석 → Layer 소진 → 손익까지 하나의 흐름으로 안내
- 각 단계에서 [🤖 AI에게 물어보기]로 해당 메뉴 데이터를 Copilot에 자동 질의

## 실행 방법
index.html을 브라우저에서 실행하면 됩니다. 시연용 데이터는 브라우저 localStorage에 저장됩니다.
AI Copilot 실시간 응답을 보려면 Anthropic API 키가 필요합니다(키 없이도 규칙기반 데모로 동작).
