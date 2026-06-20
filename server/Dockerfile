FROM node:20-slim

# Prisma 엔진 구동에 필요한 openssl
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 먼저 설치 (레이어 캐시 활용)
COPY package.json ./
RUN npm install

# Prisma 스키마 + 소스
COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3000

# DB 스키마 반영 → 시드 적재 → 서버 기동
CMD ["sh", "-c", "npx prisma db push --skip-generate && node prisma/seed.js && node index.js"]
