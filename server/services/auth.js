// 인증·권한 (bcrypt 해시 + JWT)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'gra-dev-secret-change-me';
const ROLES = ['ADMIN', 'GLOBAL', 'UW', 'CLAIM', 'USER'];

function hashPassword(pw) {
  return bcrypt.hashSync(String(pw), 10);
}
function verifyPassword(pw, hash) {
  return bcrypt.compareSync(String(pw), String(hash || ''));
}
function signToken(user) {
  return jwt.sign(
    { sub: user.id, empNo: user.empNo, role: user.role, name: user.name || '' },
    SECRET,
    { expiresIn: '12h' }
  );
}
function verifyToken(token) {
  try { return jwt.verify(token, SECRET); } catch (e) { return null; }
}

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

// 토큰이 있으면 req.user 설정(없어도 통과)
function optionalAuth(req, res, next) {
  const t = bearer(req);
  if (t) { const p = verifyToken(t); if (p) req.user = p; }
  next();
}

// 유효한 토큰 필수
function requireAuth(req, res, next) {
  const t = bearer(req);
  const p = t && verifyToken(t);
  if (!p) return res.status(401).json({ error: '인증 필요', message: '로그인이 필요합니다.' });
  req.user = p;
  next();
}

// 특정 역할 필수
function requireRole(...roles) {
  return (req, res, next) => {
    const t = bearer(req);
    const p = t && verifyToken(t);
    if (!p) return res.status(401).json({ error: '인증 필요', message: '로그인이 필요합니다.' });
    if (!roles.includes(p.role)) return res.status(403).json({ error: '권한 없음', message: '이 작업은 ' + roles.join('/') + ' 권한이 필요합니다.' });
    req.user = p;
    next();
  };
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, optionalAuth, requireAuth, requireRole, ROLES };
