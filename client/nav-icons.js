/* nav-icons.js — 사이드바 메뉴 아이콘 보장
 * app.js 일부 코드가 메뉴 버튼 라벨을 textContent로 다시 써서 아이콘(<i>)을
 * 지우는 경우가 있어, 아이콘이 없으면 자동으로 다시 붙인다(app.js 무수정).
 * MutationObserver로 라벨이 다시 덮어써져도 즉시 복원한다. */
(function () {
  var ICONS = {
    intake: 'ti-inbox', inward: 'ti-clipboard', contract: 'ti-search',
    location: 'ti-map-pin', inwardClaim: 'ti-alert-triangle', treaty: 'ti-shield',
    accident: 'ti-bolt', impact: 'ti-affiliate', layer: 'ti-stack-2',
    reinstatement: 'ti-calculator', docs: 'ti-file-text', reinsAdmin: 'ti-settings', admin: 'ti-users'
  };
  function apply() {
    document.querySelectorAll('.sidebar nav button[data-tab]').forEach(function (b) {
      var ic = ICONS[b.getAttribute('data-tab')];
      if (!ic) return;
      if (b.querySelector('i.ti')) return; // 이미 아이콘 있음 → 무한루프 방지
      var label = b.textContent.trim();
      b.innerHTML = '<i class="ti ' + ic + '"></i>' + label;
    });
  }
  apply();
  window.addEventListener('load', function () { setTimeout(apply, 300); setTimeout(apply, 1200); });
  var nav = document.querySelector('.sidebar nav');
  if (nav && window.MutationObserver) {
    new MutationObserver(apply).observe(nav, { childList: true, subtree: true, characterData: true });
  }
})();
