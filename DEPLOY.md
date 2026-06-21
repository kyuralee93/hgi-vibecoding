# AWS 배포 가이드 — 단일 인스턴스 (가장 간소)

AWS 인스턴스 **한 대**에서 `docker-compose.prod.yml`(Caddy + server + PostgreSQL)을
실행하는 방법입니다. Lightsail 기준이며, EC2도 동일합니다(맨 아래 참고).

검증됨: prod 스택이 Caddy(:80) 경유로 health·summary·로그인까지 정상 동작.

---

## 0. 준비물

- AWS 계정
- (선택) 도메인 1개 — 있으면 HTTPS 자동. 없으면 공인 IP로 HTTP 접속(시연용).
- 새로 발급한 Anthropic API 키 (이전 노출 키는 폐기)

---

## 1. Lightsail 인스턴스 생성

1. AWS 콘솔 → **Lightsail** → Create instance
2. 리전: **Seoul (ap-northeast-2)**
3. 플랫폼: **Linux/Unix** → 블루프린트: **OS Only → Ubuntu 22.04 LTS**
4. 플랜: **2 GB RAM / 2 vCPU** (월 약 $12, 첫 달 무료 플랜 가능) — 1GB도 동작하나 2GB 권장
5. 인스턴스 이름 `gra-prod` → Create

## 2. 네트워크 설정

1. 인스턴스 → **Networking** 탭
2. **Static IP** 생성 후 인스턴스에 연결 (재부팅해도 IP 고정)
3. **IPv4 Firewall**에 규칙 추가:
   - HTTP **80** (기본 있음)
   - HTTPS **443** ← 추가
   - SSH **22** (기본 있음)

## 3. 접속 + Docker 설치

브라우저 SSH(인스턴스 카드의 터미널 아이콘) 또는 SSH 클라이언트로 접속 후:

```bash
sudo apt-get update -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker          # 또는 로그아웃 후 재접속
docker --version && docker compose version
```

## 4. 소스 올리기

GitHub에 올려둔 경우:
```bash
git clone https://github.com/kyuralee93/hgi-vibecoding.git
cd hgi-vibecoding         # gra-prod 가 이 안에 있다면 cd gra-prod
```
또는 로컬에서 직접 복사(도메인/키 없이 시연만 빠르게):
```bash
# (로컬 PC에서) scp 로 gra-prod 폴더 전체를 인스턴스로 전송
scp -r -i <키.pem> gra-prod ubuntu@<STATIC_IP>:~/
# (인스턴스에서)
cd ~/gra-prod
```

## 5. 환경변수 설정

```bash
cp .env.prod.example .env
nano .env
```
채울 값:
```
SITE_ADDRESS=gra.example.com      # 도메인 있으면 도메인, 없으면 :80
POSTGRES_PASSWORD=<강한 비밀번호>   # openssl rand -hex 16
JWT_SECRET=<랜덤 32자+>            # openssl rand -hex 32
ANTHROPIC_API_KEY=<새 키>          # 비우면 AI만 비활성
```

## 6. 실행

```bash
docker compose -f docker-compose.prod.yml up -d --build
```
첫 기동 시 자동으로: DB 스키마 반영 → 시드 적재(120/57/… + 사용자) → 서버 기동.

확인:
```bash
docker compose -f docker-compose.prod.yml ps
curl -s http://localhost/api/health     # {"ok":true,"db":"connected"}
```

## 7. 도메인 + HTTPS (도메인 있을 때)

1. 도메인 DNS에 **A 레코드**: `gra.example.com → <STATIC_IP>`
2. `.env`의 `SITE_ADDRESS`를 그 도메인으로 설정했는지 확인
3. 재기동: `docker compose -f docker-compose.prod.yml up -d`
4. Caddy가 Let's Encrypt 인증서를 자동 발급 → `https://gra.example.com` 접속

도메인이 없으면 `http://<STATIC_IP>` 로 바로 접속됩니다(HTTPS 없음, 시연용).

## 8. 첫 로그인 + 계정 정리

- 데모 계정: `admin / admin1234` (ADMIN), `111 / demo1234` (GLOBAL)
- **운영 전 반드시**: admin으로 로그인 → 관리자 화면에서 실제 사용자 등록/승인,
  데모 계정 비밀번호 변경 또는 삭제. (비밀번호 변경 기능이 없으면 신규 ADMIN 생성 후
  기존 데모 계정 삭제)

---

## 운영

**로그 보기**
```bash
docker compose -f docker-compose.prod.yml logs -f server
```

**업데이트 배포**
```bash
git pull                                   # 또는 새 파일 scp
docker compose -f docker-compose.prod.yml up -d --build
```

**백업 (중요)**
- Lightsail 콘솔 → Snapshots → **자동 스냅샷 활성화**(매일). 인스턴스 통째 복구 가능.
- DB만 따로 덤프:
  ```bash
  docker compose -f docker-compose.prod.yml exec -T db pg_dump -U gra gra > backup_$(date +%F).sql
  ```

**롤백**: 자동 스냅샷에서 새 인스턴스 생성, 또는 이전 git 커밋으로 `up -d --build`.

**중지/재시작**
```bash
docker compose -f docker-compose.prod.yml down    # 중지(데이터 유지)
docker compose -f docker-compose.prod.yml up -d    # 재시작
```

---

## EC2로 할 경우 (대안)

거의 동일합니다.
1. EC2 → Ubuntu 22.04, **t3.small**(2GB) 인스턴스 시작
2. **보안 그룹** 인바운드: 22, 80, 443 허용
3. **Elastic IP** 할당·연결(고정 IP)
4. 3~8단계 동일
5. 백업: EBS 스냅샷(AWS Backup으로 일정 등록)

---

## 비용 (대략, 월)

| 항목 | Lightsail | EC2 |
|---|---|---|
| 인스턴스(2GB) | ~$12 정액 | ~$15 (t3.small) |
| 고정 IP | 포함 | 연결 시 무료 |
| 스냅샷 | 사용량 소액 | EBS 스냅샷 소액 |
| **합계** | **~$12~15** | **~$15~20** |

트래픽/사용자가 늘면 `README.md`의 매핑표대로 App Runner + RDS(매니지드)로 이전.
