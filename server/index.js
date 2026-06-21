// 해외 재보험 관리시스템 API 서버 (gra 최신 프론트 + v62 백엔드 아키텍처)
// - 정적 프론트엔드(client/) 서빙
// - 부트스트랩: DB → window.__SERVER_DATA__ (gra DATA 형태, 12개 컬렉션)
// - 쓰기 동기화(/api/sync), 인증·권한, AI(/api/ai)

const path = require('path');
const fs = require('fs');

// 의존성 없는 .env 로더 (로컬 비-Docker 실행 시 server/.env 사용)
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();

const express = require('express');
const cors = require('cors');
const prisma = require('./db');
const auth = require('./services/auth');
const ai = require('./services/ai');

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_DIR = process.env.CLIENT_DIR || path.join(__dirname, '..', 'client');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- 상태 / 요약 -------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: 'connected' });
  } catch (e) {
    res.status(500).json({ ok: false, db: 'error', message: e.message });
  }
});

app.get('/api/summary', async (req, res) => {
  try {
    const [contracts, facInward, accidents, inwardClaims, treaties, layerStatus, documents, intake, cessions] =
      await Promise.all([
        prisma.contract.count(), prisma.facInward.count(), prisma.accident.count(),
        prisma.inwardClaim.count(), prisma.treaty.count(), prisma.layerStatus.count(),
        prisma.document.count(), prisma.intake.count(), prisma.cession.count(),
      ]);
    res.json({ contracts, facInward, accidents, inwardClaims, treaties, layerStatus, documents, intake, cessions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- 부트스트랩 (DB → gra DATA 형태) -----------------------------------
function stripNulls(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== null && v !== undefined) out[k] = v;
  return out;
}

async function buildBootstrapData() {
  const [contracts, facInward, accidents, inwardClaims, docs, treatiesRaw, layerStatus, layerClaims, intake, cessions, fxRows, metaRows] =
    await Promise.all([
      prisma.contract.findMany({ orderBy: { policyNo: 'asc' } }),
      prisma.facInward.findMany({ orderBy: { inwardRef: 'asc' } }),
      prisma.accident.findMany({ orderBy: { claimNo: 'asc' } }),
      prisma.inwardClaim.findMany({ orderBy: { claimNo: 'asc' } }),
      prisma.document.findMany({ orderBy: { docId: 'asc' } }),
      prisma.treaty.findMany({ include: { layers: { orderBy: { from: 'asc' } } }, orderBy: { treatyId: 'asc' } }),
      prisma.layerStatus.findMany({ orderBy: { statusId: 'asc' } }),
      prisma.layerClaim.findMany(),
      prisma.intake.findMany(),
      prisma.cession.findMany({ orderBy: { cessionNo: 'asc' } }),
      prisma.fxRate.findMany(),
      prisma.appMeta.findMany(),
    ]);

  const treaties = treatiesRaw.map((t) => ({
    treatyId: t.treatyId, name: t.name, type: t.type, description: t.description,
    exclusions: JSON.parse(t.exclusions || '[]'),
    layers: t.layers.map((l) => stripNulls({ layer: l.layer, from: l.from, to: l.to, lead: l.lead })),
  }));

  // 내부 컬럼(id 등) 제거 후 반환
  const dropId = (r) => { const { id, ...rest } = r; return stripNulls(rest); };

  return {
    meta: Object.fromEntries(metaRows.map((r) => [r.key, r.value])),
    contracts: contracts.map(stripNulls),
    facInward: facInward.map(stripNulls),
    accidents: accidents.map(stripNulls),
    inwardClaims: inwardClaims.map(stripNulls),
    docs: docs.map(stripNulls),
    treaties,
    layerStatus: layerStatus.map(stripNulls),
    fxRates: Object.fromEntries(fxRows.map((r) => [r.currency, r.rate])),
    layerClaims: layerClaims.map(dropId),
    intake: intake.map(stripNulls),
    cessions: cessions.map(stripNulls),
  };
}

app.get('/api/bootstrap.js', async (req, res) => {
  try {
    const data = await buildBootstrapData();
    res.type('application/javascript');
    res.set('Cache-Control', 'no-store');
    res.send('window.__SERVER_DATA__=' + JSON.stringify(data) + ';');
  } catch (e) {
    res.status(500).type('application/javascript').send('window.__SERVER_DATA__=null;/* ' + e.message + ' */');
  }
});

app.get('/api/bootstrap', async (req, res) => {
  try { res.json(await buildBootstrapData()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 쓰기 동기화 -------------------------------------------------------
const STR = (v) => (v === undefined || v === null ? '' : String(v));
const NUM = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const OPT = (v) => (v === undefined || v === null || v === '' ? null : String(v));
const JSV = (v) => (v === undefined ? null : v); // Json 값(배열/객체) 보존

function sanFac(r) {
  return { inwardRef: STR(r.inwardRef), intakeNo: OPT(r.intakeNo), insured: STR(r.insured), country: STR(r.country), city: STR(r.city),
    lat: r.lat == null ? null : NUM(r.lat), lng: r.lng == null ? null : NUM(r.lng), line: STR(r.line), industry: OPT(r.industry),
    tsiEok: NUM(r.tsiEok), premiumOriginal: NUM(r.premiumOriginal), currency: STR(r.currency) || 'USD',
    fxRate: r.fxRate == null ? null : NUM(r.fxRate), premiumEok: NUM(r.premiumEok), cedant: OPT(r.cedant),
    slipSummary: OPT(r.slipSummary), memo: OPT(r.memo), ppwDate: OPT(r.ppwDate), receivableStatus: OPT(r.receivableStatus),
    owner: OPT(r.owner), receivableOwner: OPT(r.receivableOwner), receivableUpdatedAt: OPT(r.receivableUpdatedAt),
    sourceType: OPT(r.sourceType), sourceSystem: OPT(r.sourceSystem), status: OPT(r.status),
    reviewStatus: OPT(r.reviewStatus), reviewOwner: OPT(r.reviewOwner), requestSource: OPT(r.requestSource),
    confirmNote: OPT(r.confirmNote), statusHistory: JSV(r.statusHistory), createdAt: OPT(r.createdAt) };
}
function sanAccident(r) {
  const paid = NUM(r.paidLossEok), os = NUM(r.outstandingLossEok);
  return { claimNo: STR(r.claimNo), policyNo: STR(r.policyNo), insured: STR(r.insured), country: OPT(r.country),
    city: OPT(r.city), line: OPT(r.line), cause: OPT(r.cause), paidLossEok: paid, outstandingLossEok: os,
    grossLossEok: r.grossLossEok == null ? paid + os : NUM(r.grossLossEok), claimDate: OPT(r.claimDate),
    status: OPT(r.status), sourceType: OPT(r.sourceType), sourceSystem: OPT(r.sourceSystem), memo: OPT(r.memo),
    uploadBatch: OPT(r.uploadBatch), eventId: OPT(r.eventId), eventName: OPT(r.eventName) };
}
function sanInwardClaim(r) {
  return { claimNo: STR(r.claimNo), inwardRef: STR(r.inwardRef), policyNo: OPT(r.policyNo), insured: STR(r.insured),
    cedant: OPT(r.cedant), country: OPT(r.country), city: OPT(r.city), line: OPT(r.line), cause: OPT(r.cause),
    paidLossEok: NUM(r.paidLossEok), outstandingLossEok: NUM(r.outstandingLossEok), estimatedLossEok: NUM(r.estimatedLossEok),
    grossLossEok: NUM(r.grossLossEok), claimDate: OPT(r.claimDate), noticeDate: OPT(r.noticeDate), portalStatus: OPT(r.portalStatus),
    surveyStatus: OPT(r.surveyStatus), surveyPdf: OPT(r.surveyPdf), status: OPT(r.status), owner: OPT(r.owner),
    memo: OPT(r.memo), sourceType: OPT(r.sourceType), updatedBy: OPT(r.updatedBy), updatedAt: OPT(r.updatedAt) };
}
function sanDoc(r) {
  return { docId: STR(r.docId), title: STR(r.title), type: OPT(r.type), keywords: OPT(r.keywords),
    file: OPT(r.file), sourceType: OPT(r.sourceType), treatyId: OPT(r.treatyId), platformFeature: OPT(r.platformFeature) };
}
function sanIntake(r) {
  return { id: STR(r.id), source: OPT(r.source), owner: OPT(r.owner), insured: OPT(r.insured), country: OPT(r.country),
    city: OPT(r.city), line: OPT(r.line), tsiEok: NUM(r.tsiEok), premiumOriginal: NUM(r.premiumOriginal), currency: OPT(r.currency),
    fxRate: r.fxRate == null ? null : NUM(r.fxRate), premiumEok: NUM(r.premiumEok), partner: OPT(r.partner), due: OPT(r.due),
    stage: OPT(r.stage), lossHistory: OPT(r.lossHistory), lossAmountEok: NUM(r.lossAmountEok), lossDesc: OPT(r.lossDesc),
    memo: OPT(r.memo), rawText: OPT(r.rawText), createdAt: OPT(r.createdAt), updatedAt: OPT(r.updatedAt), createdBy: OPT(r.createdBy) };
}

function dedupe(rows, idKey) {
  const map = new Map();
  for (const r of rows) if (r[idKey]) map.set(r[idKey], r);
  return [...map.values()];
}

app.post('/api/sync', async (req, res) => {
  try {
    const b = req.body || {};
    const has = (k) => Array.isArray(b[k]);
    const coreKeys = ['fac', 'accidents', 'inwardClaims', 'docs', 'intake'];
    if (!coreKeys.some(has) && !has('layers') && !(b.meta && typeof b.meta === 'object')) {
      return res.status(400).json({ error: '동기화할 컬렉션이 없습니다.' });
    }
    // 핵심 컬렉션이 전부 비면(부트스트랩 실패 등) 안전상 거부
    const anyProvided = ['fac', 'accidents', 'inwardClaims', 'docs'].some(has);
    const totalLen = ['fac', 'accidents', 'inwardClaims', 'docs'].reduce((a, k) => a + (has(k) ? b[k].length : 0), 0);
    if (anyProvided && totalLen === 0) {
      return res.status(400).json({ error: '핵심 컬렉션이 모두 비어 있어 안전상 동기화를 거부합니다.' });
    }

    const ops = [];
    if (has('fac')) {
      const data = dedupe(b.fac.map(sanFac).filter((r) => r.inwardRef), 'inwardRef');
      ops.push(prisma.facInward.deleteMany());
      if (data.length) ops.push(prisma.facInward.createMany({ data }));
    }
    if (has('accidents')) {
      const data = dedupe(b.accidents.map(sanAccident).filter((r) => r.claimNo), 'claimNo');
      ops.push(prisma.accident.deleteMany());
      if (data.length) ops.push(prisma.accident.createMany({ data }));
    }
    if (has('inwardClaims')) {
      const data = dedupe(b.inwardClaims.map(sanInwardClaim).filter((r) => r.claimNo), 'claimNo');
      ops.push(prisma.inwardClaim.deleteMany());
      if (data.length) ops.push(prisma.inwardClaim.createMany({ data }));
    }
    if (has('docs')) {
      const data = dedupe(b.docs.map(sanDoc).filter((r) => r.docId), 'docId');
      ops.push(prisma.document.deleteMany());
      if (data.length) ops.push(prisma.document.createMany({ data }));
    }
    if (has('intake')) {
      const data = dedupe(b.intake.map(sanIntake).filter((r) => r.id), 'id');
      ops.push(prisma.intake.deleteMany());
      if (data.length) ops.push(prisma.intake.createMany({ data }));
    }
    // layerStatus: 자식(layerClaims) 보존 위해 statusId 업서트
    if (has('layers')) {
      for (const r of b.layers) {
        if (!r.statusId) continue;
        const d = { treatyId: STR(r.treatyId), treatyName: OPT(r.treatyName), layer: STR(r.layer),
          baseLimitEok: NUM(r.baseLimitEok), paidUsedEok: NUM(r.paidUsedEok), outstandingUsedEok: NUM(r.outstandingUsedEok),
          reinstatedLimitEok: NUM(r.reinstatedLimitEok), updatedBy: OPT(r.updatedBy), updatedAt: OPT(r.updatedAt) };
        ops.push(prisma.layerStatus.upsert({ where: { statusId: STR(r.statusId) }, update: d, create: { statusId: STR(r.statusId), ...d } }));
      }
    }
    if (b.meta && typeof b.meta === 'object' && !Array.isArray(b.meta)) {
      for (const [key, value] of Object.entries(b.meta)) {
        ops.push(prisma.appMeta.upsert({ where: { key }, update: { value: STR(value) }, create: { key, value: STR(value) } }));
      }
    }

    await prisma.$transaction(ops);
    res.json({ ok: true, applied: ops.length });
  } catch (e) {
    console.error('[sync] 실패:', e);
    res.status(500).json({ error: e.message });
  }
});

// --- 인증·권한 ---------------------------------------------------------
function safeUser(u) {
  return { id: u.id, empNo: u.empNo, name: u.name, role: u.role, approved: u.approved, createdAt: u.createdAt };
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const empNo = String((req.body || {}).empNo || '').trim();
    const password = String((req.body || {}).password || '');
    const name = String((req.body || {}).name || '').trim();
    if (!empNo || !password) return res.status(400).json({ error: '사번과 패스워드를 입력하세요.' });
    if (password.length < 4) return res.status(400).json({ error: '패스워드는 4자 이상이어야 합니다.' });
    const dup = await prisma.user.findUnique({ where: { empNo } });
    if (dup) return res.status(409).json({ error: '이미 등록된 사번입니다.' });
    const user = await prisma.user.create({
      data: { empNo, name, passwordHash: auth.hashPassword(password), role: 'USER', approved: false },
    });
    await prisma.auditLog.create({ data: { entity: 'User', entityId: user.id, action: 'register', actor: empNo, detail: name } });
    res.json({ ok: true, message: '가입 신청 완료. 관리자 승인 후 로그인할 수 있습니다.', user: safeUser(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const empNo = String((req.body || {}).empNo || '').trim();
    const password = String((req.body || {}).password || '');
    const user = await prisma.user.findUnique({ where: { empNo } });
    if (!user || !auth.verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: '사번 또는 패스워드가 올바르지 않습니다.' });
    }
    if (!user.approved) return res.status(403).json({ error: '승인 대기 중인 계정입니다. 관리자 승인 후 이용하세요.' });
    res.json({ token: auth.signToken(user), user: safeUser(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', auth.requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) return res.status(404).json({ error: '사용자 없음' });
  res.json({ user: safeUser(user) });
});

app.get('/api/users', auth.requireRole('ADMIN'), async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: [{ approved: 'asc' }, { createdAt: 'asc' }] });
  res.json({ users: users.map(safeUser), roles: auth.ROLES });
});

app.post('/api/users/:id/approve', auth.requireRole('ADMIN'), async (req, res) => {
  try {
    const approved = (req.body || {}).approved !== false;
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { approved } });
    await prisma.auditLog.create({ data: { entity: 'User', entityId: user.id, action: approved ? 'approve' : 'unapprove', actor: req.user.empNo } });
    res.json({ user: safeUser(user) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/users/:id/role', auth.requireRole('ADMIN'), async (req, res) => {
  try {
    const role = String((req.body || {}).role || '');
    if (!auth.ROLES.includes(role)) return res.status(400).json({ error: '유효하지 않은 역할입니다.' });
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
    await prisma.auditLog.create({ data: { entity: 'User', entityId: user.id, action: 'role', actor: req.user.empNo, detail: role } });
    res.json({ user: safeUser(user) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/users/:id', auth.requireRole('ADMIN'), async (req, res) => {
  try {
    if (req.params.id === req.user.sub) return res.status(400).json({ error: '본인 계정은 삭제할 수 없습니다.' });
    const user = await prisma.user.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({ data: { entity: 'User', entityId: user.id, action: 'delete', actor: req.user.empNo, detail: user.empNo } });
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- AI (Claude) — gra 프론트의 단일 /api/ai task 라우터 ----------------
app.get('/api/ai/status', (req, res) => {
  res.json({ enabled: ai.enabled(), model: ai.MODEL });
});

app.post('/api/ai', async (req, res) => {
  const { task, context, targetLang } = req.body || {};
  try {
    const out = await ai.handleTask({ task, context, targetLang });
    res.json(out);
  } catch (e) {
    if (e.code === 'NO_API_KEY') {
      return res.status(503).json({ error: '서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다. 관리자에게 문의하세요.' });
    }
    if (e.code === 'BAD_REQUEST') return res.status(400).json({ error: e.message });
    if (e instanceof SyntaxError) return res.status(502).json({ error: 'AI 응답을 JSON으로 해석하지 못했습니다.' });
    console.error('[ai] 실패:', e);
    res.status(500).json({ error: e.message || 'AI 처리 중 오류가 발생했습니다.' });
  }
});

// --- 정적 프론트엔드 ---------------------------------------------------
app.use(express.static(CLIENT_DIR));
app.get('/', (req, res) => res.sendFile(path.join(CLIENT_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}  (client: ${CLIENT_DIR})`);
  console.log(`[server] AI: ${ai.enabled() ? 'ON' : 'OFF(키 미설정)'} / model=${ai.MODEL}`);
});
