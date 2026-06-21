/* server-state.js — 서버를 데이터의 권위 소스로 만든다.
 * app.js 보다 먼저 로드되어, 브라우저 localStorage의 gra_* 캐시를 비운다.
 * 그러면 app.js의 state 초기화가 localStorage 대신 window.__SERVER_DATA__
 * (= /api/bootstrap.js 가 주입한 DB 데이터)를 사용하게 된다.
 * 사용자의 변경은 db-sync.js가 /api/sync 로 서버에 보내고, 재로딩 시 서버에서
 * 다시 내려오므로 모든 PC에서 동일한 데이터가 보인다. */
(function () {
  try {
    Object.keys(localStorage)
      .filter(function (k) { return k.indexOf('gra_') === 0; })
      .forEach(function (k) { localStorage.removeItem(k); });
  } catch (e) { /* localStorage 비가용 환경 무시 */ }
})();
