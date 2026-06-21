# 글로벌 리스크 아틀라스 — 프로덕션 빌드 (gra-prod)

gra 최신 프로토타입의 **화면·기능**을 그대로 살리면서, v62에서 검증한
**서버 + PostgreSQL + 인증 + AI** 아키텍처로 재구성한 버전입니다.

## 구성

```
gra-prod/
├── client/                 # 프론트엔드 (gra 최신 프로토타입 그대로)
│   ├── app.js              # 원본 유지 (DATA만 서버 주입으로 1줄 교체)
│   ├── server-state.js     # ★ localStorage 캐시 비움 → 서버가 권위 소스
│   ├── db-sync.js          # ★ 저장 가로채 /api/sync 로 서버 영속
│   ├── auth-overlay.js     # ★ 가짜 로그인 → 서버 인증(JWT)+RBAC
│   ├── ai-integration.js   # AI 호출(서버 /api/ai 경유) — 원본 유지
│   └── config.js           # useDirect:false, 키 없음(키는 서버에만)
├── server/                 # 백엔드 (Express + Prisma)
│   ├── index.js            # 부트스트랩 / 동기화 / 인증 / AI 라우트
│   ├── prisma/schema.prisma# 14개 모델 (gra의 Intake·Cession 포함)
│   ├── prisma/seed.js      # gra DATA(seed-data.json) 적재
│   └── services/{ai,auth}.js
└── docker-compose.yml      # web + db 한 번에 기동
```

## 실행 (Docker)

```bash
cp .env.example .env        # ANTHROPIC_API_KEY 등 채우기(키 없어도 기동됨)
docker compose up -d --build
# → http://localhost:3000
```

종료: `docker compose down` (데이터 유지) / `docker compose down -v` (DB 초기화)

## 데모 계정

| 사번 | 비밀번호 | 역할 |
|---|---|---|
| `admin` | `admin1234` | ADMIN (전체 + 사용자관리) |
| `111` | `demo1234` | GLOBAL (글로벌사업부) |

신규 사번은 [사번 등록] → 관리자 승인 후 로그인됩니다.

## 데이터 흐름

1. 페이지 로드 → `/api/bootstrap.js` 가 DB 전체를 `window.__SERVER_DATA__` 로 주입
2. `server-state.js` 가 localStorage 캐시를 비워 화면이 **서버 데이터**로 렌더
3. 등록/수정/삭제 → `db-sync.js` 가 500ms 디바운스로 `/api/sync` 전송 → DB 영속
4. 다른 PC/새로고침에서도 동일 데이터 표시

동기화 대상(가변): `fac · accidents · inwardClaims · docs · layers · meta · intake`
(cessions/contracts/treaties/layerClaims 는 시드 기준 — 필요 시 후속 확장)

## AI

- 클라이언트는 항상 서버 `POST /api/ai` 를 호출(브라우저 직접호출 없음)
- 키는 서버 환경변수 `ANTHROPIC_API_KEY` 에만 존재
- 키 미설정 시 503 안내(`/api/ai/status` 로 상태 확인)

## 로컬(비-Docker) 개발

```bash
cd server
cp .env.example .env        # DATABASE_URL 을 로컬 Postgres(5433)로
npm install
npm run setup               # prisma generate + db push + seed
npm run dev
```

## AWS 배포 (단일 인스턴스 — 가장 간소)

`docker-compose.prod.yml`(Caddy 자동 HTTPS + server + db)을 인스턴스 한 대에서 실행합니다.
단계별 절차는 **[DEPLOY.md](DEPLOY.md)** 참고.

```bash
cp .env.prod.example .env   # 비밀값·SITE_ADDRESS 채우기
docker compose -f docker-compose.prod.yml up -d --build
```

| 파일 | 용도 |
|---|---|
| `docker-compose.prod.yml` | 프로덕션 스택(Caddy+server+db, 포트 비노출) |
| `Caddyfile` | 리버스프록시 + 도메인 시 HTTPS 자동 |
| `.env.prod.example` | 운영 환경변수 템플릿 |
| `DEPLOY.md` | Lightsail/EC2 배포 가이드 |

규모가 커지면 매니지드로 이전: App Runner(서버) + RDS(Postgres) + Secrets Manager(키).
