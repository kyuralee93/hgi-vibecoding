/* data-reset.js — 대시보드 우측 상단 '데이터 초기화' 버튼(관리자 전용)
 * 시연 중 입력·변경한 데이터를 모두 무시하고, 서버 재기동 시 초기 적재하는 시드와
 * 동일하게 되돌린다.
 *  - gra-prod: POST /api/admin/reset 으로 DB를 시드로 재적재(관리자 권한)
 *  - gra-local: 서버가 없어 fetch 실패 → 무시. 비즈니스 localStorage(gra_*) 정리 후
 *    리로드하면 seed-reset.js + seed-data.js 가 시드로 복원.
 * 로그인 세션(gra_local_* / sessionStorage 토큰)은 보존한다. app.js 무수정. */
(function () {
  function isAdmin() {
    return (typeof state !== 'undefined') && state.user && state.user.role === 'ADMIN';
  }
  function clearBusinessKeys() {
    try {
      Object.keys(localStorage)
        .filter(function (k) { return k.indexOf('gra_') === 0 && k.indexOf('gra_local_') !== 0; })
        .forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* localStorage 비가용 무시 */ }
  }
  function doReset() {
    if (!confirm('시연 중 입력·변경한 모든 데이터를 무시하고 초기 적재 데이터로 되돌립니다.\n계속할까요?')) return;
    var btn = document.getElementById('btnDataReset');
    if (btn) { btn.disabled = true; btn.textContent = '초기화 중…'; }
    var hdrs = (typeof window.__graAuthHeaders === 'function') ? window.__graAuthHeaders() : {};
    var p;
    try { p = fetch('/api/admin/reset', { method: 'POST', headers: hdrs }).then(function (r) { return r.ok; }, function () { return false; }); }
    catch (e) { p = Promise.resolve(false); }
    p.then(function () {
      clearBusinessKeys();
      location.reload();
    });
  }
  function ensureButton() {
    var dash = document.getElementById('dashboard');
    if (!dash) return;
    var bar = document.getElementById('dataResetBar');
    if (!isAdmin()) { if (bar && bar.parentNode) bar.parentNode.removeChild(bar); return; }
    if (bar) return; // 이미 존재
    bar = document.createElement('div');
    bar.id = 'dataResetBar';
    bar.style.cssText = 'display:flex;justify-content:flex-end;align-items:center;margin:0 0 10px';
    var b = document.createElement('button');
    b.id = 'btnDataReset'; b.type = 'button'; b.textContent = '데이터 초기화';
    b.title = '시연 입력값을 모두 무시하고 초기 적재 데이터로 되돌립니다';
    b.style.cssText = 'display:inline-flex;align-items:center;gap:6px;border:1px solid #F8552F;color:#F8552F;background:#fff;border-radius:9px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer';
    b.onmouseenter = function () { b.style.background = '#F8552F'; b.style.color = '#fff'; };
    b.onmouseleave = function () { b.style.background = '#fff'; b.style.color = '#F8552F'; };
    b.addEventListener('click', doReset);
    bar.appendChild(b);
    dash.insertBefore(bar, dash.firstChild);
  }
  // 대시보드가 그려질 때마다(로그인·탭전환·데이터변경) 버튼 상태 보장
  var orig = window.renderDashboard;
  window.renderDashboard = function () {
    var out = (typeof orig === 'function') ? orig.apply(this, arguments) : undefined;
    try { ensureButton(); } catch (e) {}
    return out;
  };
  window.addEventListener('load', function () { setTimeout(ensureButton, 900); setTimeout(ensureButton, 2600); });
})();
