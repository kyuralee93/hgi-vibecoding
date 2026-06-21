/* db-sync.js — 쓰기 동기화 (서버 영속)
 * localStorage 저장을 단일 지점에서 가로채, 가변 컬렉션을 서버(/api/sync)로
 * 디바운스 전송한다. app.js의 saveAll/등록/삭제 코드는 한 줄도 고치지 않는다
 * (setItem 레벨에서 처리하므로 버전·실행순서에 의존하지 않음).
 *
 * 동기화 대상(가변): fac · accidents · inwardClaims · docs · layers · meta · intake
 *   (cessions/contracts/treaties/layerClaims 는 부트스트랩 시드 기준 — 후속 확장 예정) */
(function () {
  if (window.__GRA_SYNC_HOOKED__) return;
  window.__GRA_SYNC_HOOKED__ = true;

  // gra_* 데이터 키 쓰기를 감지(버전 키 제외)
  function watched(k) { return k.indexOf('gra_') === 0 && k !== 'gra_data_version'; }

  var origSet = localStorage.setItem.bind(localStorage);
  var timer = null;
  localStorage.setItem = function (k, v) {
    origSet(k, v);
    if (watched(k)) schedule();
  };
  function schedule() { if (timer) clearTimeout(timer); timer = setTimeout(push, 500); }

  function push() {
    timer = null;
    try {
      var s = (typeof state !== 'undefined' && state) ? state : {};
      var payload = {
        fac: s.fac || [],
        accidents: s.accidents || [],
        inwardClaims: s.inwardClaims || [],
        docs: s.docs || [],
        layers: s.layers || [],
        meta: s.meta || {},
        intake: s.intake || [],
      };
      var headers = { 'Content-Type': 'application/json' };
      if (typeof window.__graAuthHeaders === 'function') Object.assign(headers, window.__graAuthHeaders());
      fetch('/api/sync', { method: 'POST', headers: headers, body: JSON.stringify(payload) })
        .then(function (r) { return r.json(); })
        .then(function (res) { if (res && res.error) console.warn('[sync]', res.error); })
        .catch(function (e) { console.warn('[sync] 네트워크 실패', e); });
    } catch (e) { console.warn('[sync] 예외', e); }
  }
  window.__graForceSync = push;
})();
