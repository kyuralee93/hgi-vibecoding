# Global Risk Atlas — 해외 재보험 관리시스템

해외수재·누적위험·사고계약·재보험 프로그램을 관리하는 웹 시스템입니다.
기존 브라우저 단독 프로토타입을 **서버 + DB 기반 실제 웹 시스템**으로 전환하고 있습니다.

## 아키텍처

```
브라우저(client/)  ──fetch──▶  Express API 서버(server/)  ──▶  PostgreSQL (Prisma ORM)
                                                          ──▶  파일 저장소(uploads/)
                                                          ──▶  Claude API (요약·번역, 5단계)
```

- **client/** — 화면(`index.html`, `styles.css`, `app.js`, `assets/`)
- **server/** — Node.js + Express API, Prisma 스키마, 시드 스크립트
- **docker-compose.yml** — PostgreSQL + 서버를 한 번에 기동

## 실행 방법 (Docker, 권장)

Docker Desktop만 있으면 한 줄로 기동됩니다.

```bash
docker compose up -d --build
```

- 접속: http://localhost:3000
- 최초 기동 시 DB 스키마 반영(`prisma db push`) → 기존 데이터 시드 적재가 자동 수행됩니다.
- 데이터 강제 재적재: `docker compose exec -e SEED_FORCE=1 server node prisma/seed.js`
- 종료: `docker compose down` (데이터 유지) / `docker compose down -v` (DB 볼륨까지 삭제)

## 적재되는 기존 데이터

| 테이블 | 건수 | 비고 |
|---|---|---|
| contracts(기간계 수재계약) | 240 | |
| facInward(임의수재) | 85 | |
| accidents(사고계약) | 113 | `policyNo` → contracts FK |
| inwardClaims(해외수재 클레임) | 35 | `inwardRef` → facInward FK |
| documents / treaties / treatyLayers | 10 / 4 / 15 | |
| layerStatus / layerClaims / fxRates | 11 / 8 / 5 | |

## 현재 API

- `GET /api/health` — 서버·DB 상태
- `GET /api/summary` — 적재 데이터 건수
- `GET /api/meta` — 마감일자 등 메타
- `GET /api/contracts?q=&take=&skip=` — 계약 검색/페이지네이션
- `GET /api/bootstrap.js` — 전체 데이터셋을 `window.__SERVER_DATA__`로 주입(화면이 app.js보다 먼저 로드)
- `GET /api/bootstrap` — 동일 데이터의 JSON
- `POST /api/sync` — 가변 컬렉션(fac/accidents/inwardClaims/docs/layers/meta) 서버 반영
- `GET /api/ai/status` — AI 활성화 여부(키 설정 시 true)
- `POST /api/ai/survey-summary` · `doc-summary` · `doc-translate` · `extract-slip` — Claude API. 키 미설정 시 "시연 샘플" 목업으로 자동 폴백

화면은 더 이상 인라인 데이터를 쓰지 않고, 페이지 로드 시 `/api/bootstrap.js`로 DB의 데이터를 받아 렌더링합니다(모든 PC에서 동일 데이터). 등록/수정/삭제는 `localStorage.setItem`을 가로채는 단일 훅에서 디바운스(500ms)로 `/api/sync`에 전송되어 DB에 영속됩니다.

## 구축 로드맵

1. ✅ **서버 골격 + DB 스키마 + 시드 + Docker Compose**
2. ✅ **읽기: 화면을 서버 데이터로 전환**(부트스트랩 주입, 240/113/85/35건 브라우저 검증)
3. ✅ **쓰기: 등록/수정/삭제를 서버 동기화**(UI 등록→새로고침 후 DB 유지 브라우저 검증)
5. ✅ **Claude API 연동**(서베이 요약·약관 PDF 요약·번역·Slip 추출). 키 없으면 시연 샘플 목업 폴백
4. 인증·권한(RBAC) + 승인 워크플로 ← 다음
6. 감사로그 + 계산검증 + 코드 정리

### AI 기능 사용 (선택)

기본은 키 없이 "시연 샘플"로 동작합니다. **실제 Claude로 전환**하려면:

```bash
cp .env.example .env     # 루트에 .env 생성
# .env 의 ANTHROPIC_API_KEY= 뒤에 실제 키 입력 (sk-ant-...)
docker compose up -d     # .env를 읽어 서버 재생성
```

`GET /api/ai/status` 가 `{"enabled":true}` 면 실제 Claude로 동작합니다. 비용 절감 시 `.env`의 `AI_MODEL=claude-haiku-4-5`.

> 참고: 사용자가 임의 증권번호로 사고를 등록하는 프로토타입 동작을 수용하기 위해 사고↔계약, 클레임↔수재계약은 하드 외래키 대신 인덱스 참조로 운영합니다. 정합성 검증은 4~6단계에서 애플리케이션 레벨로 추가합니다.

## 로컬(비-Docker) 실행

PostgreSQL이 설치돼 있다면:

```bash
cd server
cp .env.example .env   # DATABASE_URL 수정
npm install
npm run setup          # prisma generate + db push + seed
npm run dev
```
