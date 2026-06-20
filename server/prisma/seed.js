// 기존 프로토타입의 DATA(seed-data.json)를 DB에 적재합니다.
// 멱등성: 이미 적재되어 있으면(계약 데이터 존재) 건너뜁니다.
// 강제 재적재: SEED_FORCE=1 환경변수로 전체 삭제 후 재적재.

const fs = require('fs');
const path = require('path');
const prisma = require('../db');

const DATA = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'seed-data.json'), 'utf8')
);

async function clearAll() {
  // 자식 → 부모 순서로 삭제
  await prisma.layerClaim.deleteMany();
  await prisma.layerStatus.deleteMany();
  await prisma.treatyLayer.deleteMany();
  await prisma.treaty.deleteMany();
  await prisma.inwardClaim.deleteMany();
  await prisma.accident.deleteMany();
  await prisma.facInward.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.document.deleteMany();
  await prisma.fxRate.deleteMany();
  await prisma.appMeta.deleteMany();
}

async function main() {
  const force = process.env.SEED_FORCE === '1';
  const existing = await prisma.contract.count();

  if (existing > 0 && !force) {
    console.log(`[seed] 이미 ${existing}건의 계약이 존재 — 건너뜀 (재적재: SEED_FORCE=1)`);
    return;
  }
  if (force) {
    console.log('[seed] SEED_FORCE=1 — 기존 데이터 전체 삭제');
    await clearAll();
  }

  // 부모 테이블
  await prisma.contract.createMany({ data: DATA.contracts });
  await prisma.facInward.createMany({ data: DATA.facInward });

  // 자식 테이블 (FK 부모가 먼저 존재해야 함)
  await prisma.accident.createMany({ data: DATA.accidents });
  await prisma.inwardClaim.createMany({ data: DATA.inwardClaims });

  // 문서
  await prisma.document.createMany({ data: DATA.docs });

  // 재보험 프로그램 + Layer (nested layers 분리 적재)
  for (const t of DATA.treaties) {
    await prisma.treaty.create({
      data: {
        treatyId: t.treatyId,
        name: t.name,
        type: t.type,
        description: t.description,
        exclusions: JSON.stringify(t.exclusions || []),
        layers: {
          create: (t.layers || []).map((l) => ({
            layer: l.layer,
            from: l.from ?? 0,
            to: l.to ?? 0,
            lead: l.lead || null,
          })),
        },
      },
    });
  }

  // Layer 소진 현황
  await prisma.layerStatus.createMany({ data: DATA.layerStatus });

  // Layer-사고 연결
  await prisma.layerClaim.createMany({
    data: DATA.layerClaims.map((c) => ({
      statusId: c.statusId,
      claimNo: c.claimNo,
      policyNo: c.policyNo || null,
      insured: c.insured || null,
      paidLossEok: c.paidLossEok ?? 0,
      outstandingLossEok: c.outstandingLossEok ?? 0,
      note: c.note || null,
    })),
  });

  // 환율 (object → rows)
  await prisma.fxRate.createMany({
    data: Object.entries(DATA.fxRates).map(([currency, rate]) => ({
      currency,
      rate: Number(rate),
    })),
  });

  // 메타 (object → key-value rows)
  await prisma.appMeta.createMany({
    data: Object.entries(DATA.meta).map(([key, value]) => ({
      key,
      value: String(value),
    })),
  });

  const counts = {
    contracts: await prisma.contract.count(),
    facInward: await prisma.facInward.count(),
    accidents: await prisma.accident.count(),
    inwardClaims: await prisma.inwardClaim.count(),
    documents: await prisma.document.count(),
    treaties: await prisma.treaty.count(),
    treatyLayers: await prisma.treatyLayer.count(),
    layerStatus: await prisma.layerStatus.count(),
    layerClaims: await prisma.layerClaim.count(),
    fxRates: await prisma.fxRate.count(),
  };
  console.log('[seed] 적재 완료:', counts);
}

main()
  .catch((e) => {
    console.error('[seed] 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
