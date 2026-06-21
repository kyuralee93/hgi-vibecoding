/* auth-overlay.js — 실제 인증 + 권한(RBAC) + 승인 워크플로
 * gra 프로토타입의 가짜 로그인을 서버 인증(bcrypt+JWT)으로 교체한다.
 * app.js 원본은 수정하지 않고, login/register/logout/switchTab/renderUsers 를
 * EOF에서 오버라이드한다(가장 마지막 로드). */
(function () {
  var TKEY = 'gra_token';
  function getToken() { return sessionStorage.getItem(TKEY) || ''; }
  function setToken(t) { if (t) sessionStorage.setItem(TKEY, t); else sessionStorage.removeItem(TKEY); }
  function authHeaders() { var t = getToken(); return t ? { 'Authorization': 'Bearer ' + t } : {}; }
  function jhdr() { return Object.assign({ 'Content-Type': 'application/json' }, authHeaders()); }
  window.__graAuthHeaders = authHeaders;

  // 역할별 접근 가능한 탭 ('*' = 전체). gra 탭 구성 기준.
  var ROLE_TABS = {
    ADMIN: '*',
    GLOBAL: ['dashboard', 'intake', 'inward', 'contract', 'location', 'inwardClaim', 'treaty', 'docs'],
    UW: ['dashboard', 'inward', 'contract', 'location', 'accident', 'treaty', 'impact', 'layer', 'reinstatement', 'reinsAdmin', 'docs'],
    CLAIM: ['dashboard', 'contract', 'location', 'inwardClaim', 'accident', 'treaty', 'docs'],
    USER: ['dashboard', 'contract', 'location', 'treaty', 'docs'],
  };
  function allowedTabs(role) { var t = ROLE_TABS[role]; return t === '*' ? null : (t || ROLE_TABS.USER); }
  window.__graAllowedTab = function (tab) {
    var u = (typeof state !== 'undefined' && state.user) ? state.user : null;
    var allow = allowedTabs(u && u.role);
    return !allow || allow.indexOf(tab) >= 0;
  };

  function applyRoleMenu(role) {
    var allow = allowedTabs(role);
    document.querySelectorAll('.sidebar nav button[data-tab]').forEach(function (b) {
      if (b.classList.contains('nav-hidden')) return; // 대시보드(배너로 이동) 항상 숨김
      var ok = !allow || allow.indexOf(b.getAttribute('data-tab')) >= 0;
      b.style.display = ok ? '' : 'none';
    });
    // 표시할 버튼이 하나도 없는 카테고리는 제목까지 숨김
    document.querySelectorAll('.sidebar nav .nav-group').forEach(function (g) {
      var anyVisible = [].slice.call(g.querySelectorAll('button[data-tab]')).some(function (b) {
        return !b.classList.contains('nav-hidden') && b.style.display !== 'none';
      });
      g.style.display = anyVisible ? '' : 'none';
    });
  }

  // switchTab 권한 가드 (마지막으로 정의된 switchTab을 감싼다)
  if (typeof window.switchTab === 'function') {
    var _origSwitch = window.switchTab;
    window.switchTab = function (tab) {
      if (typeof state !== 'undefined' && state.user && !window.__graAllowedTab(tab)) {
        alert('이 메뉴에 접근할 권한이 없습니다.');
        return;
      }
      return _origSwitch.apply(this, arguments);
    };
  }

  function showApp(user) {
    if (typeof state !== 'undefined') state.user = user;
    var ls = document.getElementById('loginScreen'); if (ls) ls.style.display = 'none';
    var ub = document.getElementById('userBadge'); if (ub) ub.innerText = user.empNo + ' · ' + user.role;
    applyRoleMenu(user.role);
    try { if (typeof window.renderUsers === 'function') window.renderUsers(); } catch (e) {}
  }
  function showLogin(msg) {
    if (typeof state !== 'undefined') state.user = null;
    setToken('');
    var ls = document.getElementById('loginScreen'); if (ls) ls.style.display = 'flex';
    var ub = document.getElementById('userBadge'); if (ub) ub.innerText = '미로그인';
    var m = document.getElementById('loginMsg'); if (m) m.innerHTML = msg ? '<span class="required-warn">' + msg + '</span>' : '';
  }

  window.login = async function () {
    var empNo = (document.getElementById('loginEmpNo').value || '').trim();
    var password = (document.getElementById('loginPassword') || {}).value || '';
    var m = document.getElementById('loginMsg'); if (m) m.innerText = '';
    if (!empNo || !password) { if (m) m.innerHTML = '<span class="required-warn">사번과 패스워드를 입력하세요.</span>'; return; }
    try {
      var r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empNo: empNo, password: password }) });
      var d = await r.json();
      if (!r.ok) throw new Error(d.error || '로그인 실패');
      setToken(d.token); showApp(d.user);
    } catch (e) { if (m) m.innerHTML = '<span class="required-warn">' + e.message + '</span>'; }
  };

  window.register = async function () {
    var wrap = document.getElementById('loginNameWrap');
    var m = document.getElementById('loginMsg');
    if (wrap && wrap.style.display === 'none') { wrap.style.display = ''; if (m) m.innerHTML = '<span class="muted">이름을 입력하고 다시 [사번 등록]을 누르세요.</span>'; return; }
    var empNo = (document.getElementById('loginEmpNo').value || '').trim();
    var password = (document.getElementById('loginPassword') || {}).value || '';
    var nameEl = document.getElementById('loginName');
    var name = (nameEl ? nameEl.value : '').trim();
    if (!empNo || !password) { if (m) m.innerHTML = '<span class="required-warn">사번과 패스워드를 입력하세요.</span>'; return; }
    try {
      var r = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empNo: empNo, password: password, name: name }) });
      var d = await r.json();
      if (!r.ok) throw new Error(d.error || '등록 실패');
      if (m) m.innerHTML = '<span style="color:#2e7d32">' + d.message + '</span>';
    } catch (e) { if (m) m.innerHTML = '<span class="required-warn">' + e.message + '</span>'; }
  };

  window.logout = function () { showLogin(); };

  // 관리자 사용자관리 (#userTable)
  window.renderUsers = async function () {
    var tb = document.querySelector('#userTable tbody'); if (!tb) return;
    var u = (typeof state !== 'undefined' && state.user) ? state.user : null;
    if (!u || u.role !== 'ADMIN') { tb.innerHTML = '<tr><td colspan="4" class="muted">관리자만 사용자 관리를 볼 수 있습니다.</td></tr>'; return; }
    try {
      var r = await fetch('/api/users', { headers: authHeaders() });
      var d = await r.json();
      if (!r.ok) throw new Error(d.error || '목록 조회 실패');
      var roles = d.roles || ['ADMIN', 'GLOBAL', 'UW', 'CLAIM', 'USER'];
      tb.innerHTML = d.users.map(function (x) {
        var roleSel = '<select onchange="setUserRole(\'' + x.id + '\',this.value)">' + roles.map(function (rr) { return '<option ' + (rr === x.role ? 'selected' : '') + '>' + rr + '</option>'; }).join('') + '</select>';
        var approveBtn = x.approved
          ? '<button class="secondary-btn" onclick="approveUser(\'' + x.id + '\',false)">승인취소</button>'
          : '<button onclick="approveUser(\'' + x.id + '\',true)">승인</button>';
        var delBtn = (x.empNo === u.empNo) ? '' : ' <button class="danger-btn" onclick="deleteUser(\'' + x.id + '\')">삭제</button>';
        return '<tr><td>' + x.empNo + (x.name ? (' / ' + x.name) : '') + '</td><td>' + roleSel + '</td><td>' + (x.approved ? '승인됨' : '<b>승인대기</b>') + '</td><td>' + approveBtn + delBtn + '</td></tr>';
      }).join('');
    } catch (e) { tb.innerHTML = '<tr><td colspan="4" class="required-warn">' + e.message + '</td></tr>'; }
  };
  window.approveUser = async function (id, approved) { await fetch('/api/users/' + id + '/approve', { method: 'POST', headers: jhdr(), body: JSON.stringify({ approved: approved }) }); window.renderUsers(); };
  window.setUserRole = async function (id, role) { await fetch('/api/users/' + id + '/role', { method: 'POST', headers: jhdr(), body: JSON.stringify({ role: role }) }); window.renderUsers(); };
  window.deleteUser = async function (id) { if (!confirm('이 사용자를 삭제할까요?')) return; await fetch('/api/users/' + id, { method: 'DELETE', headers: authHeaders() }); window.renderUsers(); };

  // 초기화: 토큰 검증 후 앱/로그인 화면 결정
  window.addEventListener('load', function () {
    var t = getToken();
    if (!t) { showLogin(); return; }
    fetch('/api/auth/me', { headers: authHeaders() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.user) showApp(d.user); else showLogin('세션이 만료되었습니다. 다시 로그인하세요.'); })
      .catch(function () { showLogin(); });
  });
})();
