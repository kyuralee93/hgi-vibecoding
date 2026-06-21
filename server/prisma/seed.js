// gra 최신 프로토타입의 DATA(seed-data.json)를 DB에 적재합니다.
// 멱등성: 이미 계약이 있으면 건너뜁니다. 강제 재적재: SEED_FORCE=1
//
// createMany는 스키마에 없는 키가 있으면 실패하므로, 컬렉션별 허용 컬럼만 추려
// 적재합니다(프로토타입이 덧붙인 UI 전용 필드는 무시).

const fs = require('fs');
const path = require('path');
const prisma = require('../db');
const auth = require('../services/auth');

const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-data.json'), 'utf8'));

// --- 컬럼 화이트리스트 ---------------------------------------------------
const COLS = {
  contracts: ['policyNo', 'insured', 'country', 'city', 'lat', 'lng', 'line', 'industry', 'tsiEok', 'premiumEok', 'currency', 'sourceType', 'sourceSystem', 'renewalDate', 'ppwDate', 'status', 'lossRatio', 'expenseRatio'],
  facInward: ['inwardRef', 'intakeNo', 'insured', 'country', 'city', 'lat', 'lng', 'line', 'industry', 'tsiEok', 'premiumOriginal', 'currency', 'fxRate', 'premiumEok', 'cedant', 'slipSummary', 'memo', 'ppwDate', 'receivableStatus', 'owner', 'receivableOwner', 'receivableUpdatedAt', 'sourceType', 'sourceSystem', 'status', 'reviewStatus', 'reviewOwner', 'requestSource', 'confirmNote', 'statusHistory', 'createdAt'],
  accidents: ['claimNo', 'policyNo', 'insured', 'country', 'city', 'line', 'cause', 'paidLossEok', 'outstandingLossEok', 'grossLossEok', 'claimDate', 'status', 'sourceType', 'sourceSystem', 'memo', 'uploadBatch', 'eventId', 'eventName'],
  inwardClaims: ['claimNo', 'inwardRef', 'policyNo', 'insured', 'cedant', 'country', 'city', 'line', 'cause', 'paidLossEok', 'outstandingLossEok', 'estimatedLossEok', 'grossLossEok', 'claimDate', 'noticeDate', 'portalStatus', 'surveyStatus', 'surveyPdf', 'status', 'owner', 'memo', 'sourceType', 'updatedBy', 'updatedAt'],
  docs: ['docId', 'title', 'type', 'keywords', 'file', 'sourceType', 'treatyId', 'platformFeature'],
  layerStatus: ['statusId', 'treatyId', 'treatyName', 'layer', 'baseLimitEok', 'paidUsedEok', 'outstandingUsedEok', 'reinstatedLimitEok', 'updatedBy', 'updatedAt'],
  layerClaims: ['statusId', 'treatyId', 'layer', 'claimNo', 'policyNo', 'insured', 'paidLossEok', 'outstandingLossEok', 'grossLossEok', 'allocPaidEok', 'allocOutstandingEok', 'allocGrossEok', 'note', 'eventKey'],
  intake: ['id', 'source', 'owner', 'insured', 'country', 'city', 'line', 'tsiEok', 'premiumOriginal', 'currency', 'fxRate', 'premiumEok', 'partner', 'due', 'stage', 'lossHistory', 'lossAmountEok', 'lossDesc', 'memo', 'rawText', 'createdAt', 'updatedAt', 'createdBy'],
  cessions: ['cessionNo', 'reinsurer', 'type', 'originalInsured', 'country', 'city', 'line', 'cededTsiEok', 'cededPremiumOriginal', 'currency', 'cededPremiumEok', 'ppwDate', 'paymentStatus', 'inceptionDate', 'linkedPolicyNo', 'sourceType', 'sourceSystem'],
};

function pick(row, cols) {
  const out = {};
  for (const c of cols) if (row[c] !== undefined) out[c] = row[c];
  return out;
}
const rows = (key) => (DATA[key] || []).map((r) => pick(r, COLS[key]));

// --- 기본 사용자(항상 보장) ---------------------------------------------
async function seedUsers() {
  const defaults = [
    { empNo: 'admin', name: '시스템 관리자', role: 'ADMIN', approved: true, password: 'admin1234' },
    { empNo: '111', name: '글로벌사업부 데모', role: 'GLOBAL', approved: true, password: 'demo1234' },
  ];
  for (const u of defaults) {
    const exists = await prisma.user.findUnique({ where: { empNo: u.empNo } });
    if (!exists) {
      await prisma.user.create({
        data: { empNo: u.empNo, name: u.name, role: u.role, approved: u.approved, passwordHash: auth.hashPassword(u.password) },
      });
      console.log(`[seed] 사용자 생성: ${u.empNo} (${u.role})`);
    }
  }
}

async function clearAll() {
  await prisma.layerClaim.deleteMany();
  await prisma.layerStatus.deleteMany();
  await prisma.treatyLayer.deleteMany();
  await prisma.treaty.deleteMany();
  await prisma.inwardClaim.deleteMany();
  await prisma.accident.deleteMany();
  await prisma.facInward.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.document.deleteMany();
  await prisma.intake.deleteMany();
  await prisma.cession.deleteMany();
  await prisma.fxRate.deleteMany();
  await prisma.appMeta.deleteMany();
}

async function main() {
  const force = process.env.SEED_FORCE === '1';
  await seedUsers();

  const existing = await prisma.contract.count();
  if (existing > 0 && !force) {
    console.log(`[seed] 이미 ${existing}건의 계약 존재 — 데이터 시드 건너뜀 (재적재: SEED_FORCE=1)`);
    return;
  }
  if (force) {
    console.log('[seed] SEED_FORCE=1 — 기존 데이터 전체 삭제');
    await clearAll();
  }

  await prisma.contract.createMany({ data: rows('contracts') });
  await prisma.facInward.createMany({ data: rows('facInward') });
  await prisma.accident.createMany({ data: rows('accidents') });
  await prisma.inwardClaim.createMany({ data: rows('inwardClaims') });
  await prisma.document.createMany({ data: rows('docs') });

  // 재보험 프로그램 + Layer (nested)
  for (const t of DATA.treaties || []) {
    await prisma.treaty.create({
      data: {
        treatyId: t.treatyId,
        name: t.name,
        type: t.type || null,
        description: t.description || null,
        exclusions: JSON.stringify(t.exclusions || []),
        layers: {
          create: (t.layers || []).map((l) => ({
            layer: String(l.layer || ''),
            from: l.from ?? 0,
            to: l.to ?? 0,
            lead: l.lead || null,
          })),
        },
      },
    });
  }

  await prisma.layerStatus.createMany({ data: rows('layerStatus') });
  await prisma.layerClaim.createMany({ data: rows('layerClaims') });
  await prisma.intake.createMany({ data: rows('intake') });
  await prisma.cession.createMany({ data: rows('cessions') });

  await prisma.fxRate.createMany({
    data: Object.entries(DATA.fxRates || {}).map(([currency, rate]) => ({ currency, rate: Number(rate) })),
  });
  await prisma.appMeta.createMany({
    data: Object.entries(DATA.meta || {}).map(([key, value]) => ({ key, value: String(value) })),
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
    intake: await prisma.intake.count(),
    cessions: await prisma.cession.count(),
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
