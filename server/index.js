// 해외 재보험 관리시스템 API 서버 (1단계 골격)
// - 정적 프론트엔드(client/) 서빙
// - 데이터 적재 검증용 읽기 API (health / summary / meta / contracts)
// 2단계에서 화면별 CRUD API를 채워 나갑니다.

const path = require('path');
const fs = require('fs');

// 의존성 없는 .env 로더 (로컬 비-Docker 실행 시 server/.env 사용)
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
})();

const express = require('express');
const cors = require('cors');
const prisma = require('./db');
const auth = require('./services/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_DIR = process.env.CLIENT_DIR || path.join(__dirname, '..', 'client');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- API ---------------------------------------------------------------

// 서버/DB 상태
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: 'connected' });
  } catch (e) {
    res.status(500).json({ ok: false, db: 'error', message: e.message });
  }
});

// 적재 데이터 요약 (대시보드/관리자 검증용)
app.get('/api/summary', async (req, res) => {
  try {
    const [contracts, facInward, accidents, inwardClaims, treaties, layerStatus, documents] =
      await Promise.all([
        prisma.contract.count(),
        prisma.facInward.count(),
        prisma.accident.count(),
        prisma.inwardClaim.count(),
        prisma.treaty.count(),
        prisma.layerStatus.count(),
        prisma.document.count(),
      ]);
    res.json({ contracts, facInward, accidents, inwardClaims, treaties, layerStatus, documents });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 메타(마감일자 등)
app.get('/api/meta', async (req, res) => {
  const rows = await prisma.appMeta.findMany();
  const meta = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json(meta);
});

// 계약 조회 (검색 q, 페이지네이션) — 프론트 전환의 첫 대상
app.get('/api/contracts', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const take = Math.min(Number(req.query.take) || 10, 100);
  const skip = Number(req.query.skip) || 0;
  const where = q
    ? {
        OR: [
          { policyNo: { contains: q, mode: 'insensitive' } },
          { insured: { contains: q, mode: 'insensitive' } },
          { country: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};
  const [total, rows] = await Promise.all([
    prisma.contract.count({ where }),
    prisma.contract.findMany({ where, take, skip, orderBy: { policyNo: 'asc' } }),
  ]);
  res.json({ total, rows });
});

// 부트스트랩: 모든 컬렉션을 기존 프로토타입의 DATA 형태로 재구성해
// window.__SERVER_DATA__ 전역으로 주입하는 JS를 반환.
// index.html이 app.js보다 먼저 이 스크립트를 로드한다.
function stripNulls(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

async function buildBootstrapData() {
  const [contracts, facInward, accidents, inwardClaims, docs, treatiesRaw, layerStatus, layerClaims, fxRows, metaRows] =
    await Promise.all([
      prisma.contract.findMany({ orderBy: { policyNo: 'asc' } }),
      prisma.facInward.findMany({ orderBy: { inwardRef: 'asc' } }),
      prisma.accident.findMany({ orderBy: { claimNo: 'asc' } }),
      prisma.inwardClaim.findMany({ orderBy: { claimNo: 'asc' } }),
      prisma.document.findMany({ orderBy: { docId: 'asc' } }),
      prisma.treaty.findMany({ include: { layers: { orderBy: { from: 'asc' } } }, orderBy: { treatyId: 'asc' } }),
      prisma.layerStatus.findMany({ orderBy: { statusId: 'asc' } }),
      prisma.layerClaim.findMany(),
      prisma.fxRate.findMany(),
      prisma.appMeta.findMany(),
    ]);

  const treaties = treatiesRaw.map((t) => ({
    treatyId: t.treatyId,
    name: t.name,
    type: t.type,
    description: t.description,
    exclusions: JSON.parse(t.exclusions || '[]'),
    layers: t.layers.map((l) => stripNulls({ layer: l.layer, from: l.from, to: l.to, lead: l.lead })),
  }));

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
    layerClaims: layerClaims.map((c) => stripNulls({
      statusId: c.statusId, claimNo: c.claimNo, policyNo: c.policyNo,
      insured: c.insured, paidLossEok: c.paidLossEok, outstandingLossEok: c.outstandingLossEok, note: c.note,
    })),
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

// JSON 형태도 함께 제공(향후 부분 갱신용)
app.get('/api/bootstrap', async (req, res) => {
  try {
    res.json(await buildBootstrapData());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- 쓰기 동기화 -------------------------------------------------------
// 프론트엔드가 state의 가변 컬렉션을 통째로 보내면 DB에 반영한다.
// 프로토타입의 자유로운 입력을 수용하기 위해 컬렉션 단위 교체(upsert) 방식.
const STR = (v) => (v === undefined || v === null ? '' : String(v));
const NUM = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const OPT = (v) => (v === undefined || v === null || v === '' ? null : String(v));

// 컬렉션별 허용 필드 (스키마 컬럼만 추림 — 프론트가 덧붙인 UI 필드는 제외)
function sanContract(r) {
  return { policyNo: STR(r.policyNo), insured: STR(r.insured), country: STR(r.country), city: STR(r.city),
    lat: r.lat == null ? null : NUM(r.lat), lng: r.lng == null ? null : NUM(r.lng), line: STR(r.line),
    industry: OPT(r.industry), tsiEok: NUM(r.tsiEok), premiumEok: NUM(r.premiumEok), currency: STR(r.currency) || 'KRW',
    sourceType: OPT(r.sourceType), sourceSystem: OPT(r.sourceSystem), renewalDate: OPT(r.renewalDate),
    status: OPT(r.status), lossRatio: r.lossRatio == null ? null : NUM(r.lossRatio), expenseRatio: r.expenseRatio == null ? null : NUM(r.expenseRatio) };
}
function sanFac(r) {
  return { inwardRef: STR(r.inwardRef), insured: STR(r.insured), country: STR(r.country), city: STR(r.city),
    lat: r.lat == null ? null : NUM(r.lat), lng: r.lng == null ? null : NUM(r.lng), line: STR(r.line), industry: OPT(r.industry),
    tsiEok: NUM(r.tsiEok), premiumOriginal: NUM(r.premiumOriginal), currency: STR(r.currency) || 'USD',
    fxRate: r.fxRate == null ? null : NUM(r.fxRate), premiumEok: NUM(r.premiumEok), cedant: OPT(r.cedant),
    slipSummary: OPT(r.slipSummary), memo: OPT(r.memo), ppwDate: OPT(r.ppwDate), receivableStatus: OPT(r.receivableStatus),
    owner: OPT(r.owner), receivableOwner: OPT(r.receivableOwner), receivableUpdatedAt: OPT(r.receivableUpdatedAt),
    sourceType: OPT(r.sourceType), sourceSystem: OPT(r.sourceSystem), status: OPT(r.status) };
}
function sanAccident(r) {
  const paid = NUM(r.paidLossEok), os = NUM(r.outstandingLossEok);
  return { claimNo: STR(r.claimNo), policyNo: STR(r.policyNo), insured: STR(r.insured), country: OPT(r.country),
    city: OPT(r.city), line: OPT(r.line), cause: OPT(r.cause), paidLossEok: paid, outstandingLossEok: os,
    grossLossEok: r.grossLossEok == null ? paid + os : NUM(r.grossLossEok), claimDate: OPT(r.claimDate),
    status: OPT(r.status), sourceType: OPT(r.sourceType), sourceSystem: OPT(r.sourceSystem), memo: OPT(r.memo), uploadBatch: OPT(r.uploadBatch) };
}
function sanInwardClaim(r) {
  return { claimNo: STR(r.claimNo), inwardRef: STR(r.inwardRef), insured: STR(r.insured), cedant: OPT(r.cedant),
    country: OPT(r.country), city: OPT(r.city), line: OPT(r.line), cause: OPT(r.cause), estimatedLossEok: NUM(r.estimatedLossEok),
    noticeDate: OPT(r.noticeDate), surveyStatus: OPT(r.surveyStatus), surveyPdf: OPT(r.surveyPdf), status: OPT(r.status), sourceType: OPT(r.sourceType) };
}
function sanDoc(r) {
  return { docId: STR(r.docId), title: STR(r.title), type: OPT(r.type), keywords: OPT(r.keywords),
    file: OPT(r.file), sourceType: OPT(r.sourceType), treatyId: OPT(r.treatyId), platformFeature: OPT(r.platformFeature) };
}

// id 기준 중복 제거(마지막 값 우선) — createMany unique 충돌 방지
function dedupe(rows, idKey) {
  const map = new Map();
  for (const r of rows) if (r[idKey]) map.set(r[idKey], r);
  return [...map.values()];
}

app.post('/api/sync', async (req, res) => {
  try {
    const b = req.body || {};
    const has = (k) => Array.isArray(b[k]);
    if (!has('fac') && !has('accidents') && !has('inwardClaims') && !has('docs') && !has('layers') && !has('meta')) {
      return res.status(400).json({ error: '동기화할 컬렉션이 없습니다.' });
    }
    // 전체가 비어있으면(부트스트랩 실패 등) 안전상 거부
    const totalLen = ['fac', 'accidents', 'inwardClaims', 'docs'].reduce((a, k) => a + (has(k) ? b[k].length : 0), 0);
    const anyProvided = ['fac', 'accidents', 'inwardClaims', 'docs'].some(has);
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
    // layerStatus: 자식(layerClaims) 보존 위해 삭제 대신 statusId 업서트
    if (has('layers')) {
      for (const r of b.layers) {
        if (!r.statusId) continue;
        const d = { treatyId: STR(r.treatyId), treatyName: OPT(r.treatyName), layer: STR(r.layer),
          baseLimitEok: NUM(r.baseLimitEok), paidUsedEok: NUM(r.paidUsedEok), outstandingUsedEok: NUM(r.outstandingUsedEok),
          reinstatedLimitEok: NUM(r.reinstatedLimitEok), updatedBy: OPT(r.updatedBy), updatedAt: OPT(r.updatedAt) };
        ops.push(prisma.layerStatus.upsert({ where: { statusId: STR(r.statusId) }, update: d, create: { statusId: STR(r.statusId), ...d } }));
      }
    }
    // meta: key-value 업서트
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

// --- 인증·권한 (auth) --------------------------------------------------
function safeUser(u) {
  return { id: u.id, empNo: u.empNo, name: u.name, role: u.role, approved: u.approved, createdAt: u.createdAt };
}

// 회원가입(승인대기) — 사번/비번/이름
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

// 로그인 — 승인된 계정만 토큰 발급
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

// 현재 사용자
app.get('/api/auth/me', auth.requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) return res.status(404).json({ error: '사용자 없음' });
  res.json({ user: safeUser(user) });
});

// --- 사용자 관리 (ADMIN 전용) ------------------------------------------
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

// --- AI (Claude API) ---------------------------------------------------
const ai = require('./services/ai');

function aiError(res, e) {
  if (e && e.code === 'NO_API_KEY') {
    return res.status(503).json({ error: 'AI 미설정', message: '서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다. 관리자에게 문의하세요.' });
  }
  console.error('[ai] 실패:', e);
  return res.status(500).json({ error: 'AI 처리 실패', message: e.message });
}

app.get('/api/ai/status', (req, res) => {
  res.json({ enabled: !!process.env.ANTHROPIC_API_KEY, model: ai.MODEL });
});

app.post('/api/ai/survey-summary', async (req, res) => {
  const { reportText, context } = req.body || {};
  if (!ai.enabled()) return res.json({ text: ai.mockSurvey(context), mock: true });
  try {
    res.json({ text: await ai.summarizeSurvey({ reportText, context }) });
  } catch (e) { aiError(res, e); }
});

app.post('/api/ai/doc-summary', async (req, res) => {
  const { title, text, file, keywords } = req.body || {};
  if (!ai.enabled()) return res.json({ text: ai.mockDoc(title, keywords), mock: true });
  try {
    const pdfBase64 = !text ? ai.readDocPdfBase64(file, CLIENT_DIR) : null;
    res.json({ text: await ai.summarizeDoc({ title, text, pdfBase64 }) });
  } catch (e) { aiError(res, e); }
});

app.post('/api/ai/doc-translate', async (req, res) => {
  const { title, text, file, target } = req.body || {};
  if (!ai.enabled()) return res.json({ text: ai.mockTranslate(title, target), mock: true });
  try {
    const pdfBase64 = !text ? ai.readDocPdfBase64(file, CLIENT_DIR) : null;
    res.json({ text: await ai.translateDoc({ title, text, pdfBase64, target }) });
  } catch (e) { aiError(res, e); }
});

app.post('/api/ai/extract-slip', async (req, res) => {
  const { text } = req.body || {};
  if (!ai.enabled()) return res.json({ mock: true }); // 프론트가 로컬 추출기로 폴백
  try {
    res.json({ fields: await ai.extractSlip({ text }) });
  } catch (e) { aiError(res, e); }
});

// --- 정적 프론트엔드 ---------------------------------------------------
app.use(express.static(CLIENT_DIR));
app.get('/', (req, res) => res.sendFile(path.join(CLIENT_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}  (client: ${CLIENT_DIR})`);
});
