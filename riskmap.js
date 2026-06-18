/* =====================================================================
 * v52: 누적위험 조회 — MapLibre GL 벡터 지도 + 대륙→국가 코로플레스
 *  - 최초: 세계 지도 + 대륙별 누적 계약금액(빨강=큼, 연함=작음)
 *  - 마우스오버: 해당 영역 테두리 강조 + 툴팁(총 건수, 국가별 건수/금액)
 *  - 확대(zoom>=임계): 국가별 색상으로 전환, 툴팁은 도시별 세부로 전환
 *  - 키 불필요(CARTO 벡터 베이스맵). app.js의 renderMap을 오버라이드.
 * ===================================================================== */
(function () {
  'use strict';

  const GEO_URL = 'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson';
  const STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
  const ZOOM_SWITCH = 3.3;

  // 데이터의 한글 국가명 → ISO_A3 (필요 시 확장)
  const KOR2ISO = {
    '베트남': 'VNM', '미국': 'USA', '일본': 'JPN', '인도': 'IND', '한국': 'KOR', '대한민국': 'KOR',
    '인도네시아': 'IDN', '중국': 'CHN', '태국': 'THA', '싱가포르': 'SGP', '말레이시아': 'MYS',
    '필리핀': 'PHL', '대만': 'TWN', '홍콩': 'HKG', '독일': 'DEU', '영국': 'GBR', '프랑스': 'FRA',
    '호주': 'AUS', '캐나다': 'CAN', '브라질': 'BRA', '멕시코': 'MEX', '아랍에미리트': 'ARE', '사우디아라비아': 'SAU'
  };
  const CONT_KO = {
    'Asia': '아시아', 'Europe': '유럽', 'Africa': '아프리카', 'North America': '북아메리카',
    'South America': '남아메리카', 'Oceania': '오세아니아', 'Antarctica': '남극'
  };

  let map = null, geo = null, geoPromise = null;
  let iso2cont = {}, aggCountry = {}, aggCont = {};
  let mode = 'continent', tooltipEl = null, badgeEl = null, layersAdded = false;

  const eokFmt = (v) => { try { return eok(v); } catch (e) { return Math.round(Number(v || 0)).toLocaleString() + '억원'; } };
  const isoOf = (p) => { const a = p.ISO_A3 || p.ADM0_A3 || p.SOV_A3; return (a && a !== '-99') ? a : (p.ADM0_A3 || p.SOV_A3 || a); };

  /* ---------- 데이터 집계 ---------- */
  function riskRows() {
    try { if (typeof allRiskContracts === 'function') return allRiskContracts(); } catch (e) {}
    const D = (typeof DATA !== 'undefined' && DATA.contracts) ? DATA.contracts : [];
    const F = (typeof state !== 'undefined' && state.fac) ? state.fac : [];
    return D.concat(F);
  }
  function buildIso(g) {
    iso2cont = {};
    g.features.forEach(f => { const p = f.properties; const iso = isoOf(p); if (iso) iso2cont[iso] = p.CONTINENT; });
  }
  function aggregate() {
    aggCountry = {}; aggCont = {};
    riskRows().forEach(c => {
      const iso = KOR2ISO[c.country]; if (!iso) return;
      const amt = Number(c.tsiEok || 0);
      const cc = aggCountry[iso] || (aggCountry[iso] = { iso, ko: c.country, cnt: 0, tsi: 0, cities: {} });
      cc.cnt++; cc.tsi += amt;
      const city = c.city || '기타';
      const ci = cc.cities[city] || (cc.cities[city] = { cnt: 0, tsi: 0 });
      ci.cnt++; ci.tsi += amt;
      const cont = iso2cont[iso] || 'Asia';
      const ct = aggCont[cont] || (aggCont[cont] = { cont, cnt: 0, tsi: 0, countries: {} });
      ct.cnt++; ct.tsi += amt;
      const ctc = ct.countries[iso] || (ct.countries[iso] = { iso, ko: c.country, cnt: 0, tsi: 0 });
      ctc.cnt++; ctc.tsi += amt;
    });
  }

  /* ---------- 색상 스케일 ---------- */
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  function scaleColor(t) {
    t = Math.max(0, Math.min(1, t));
    const s = [[255, 231, 220], [255, 150, 90], [200, 30, 10]];
    let c;
    if (t < 0.5) { const u = t / 0.5; c = [lerp(s[0][0], s[1][0], u), lerp(s[0][1], s[1][1], u), lerp(s[0][2], s[1][2], u)]; }
    else { const u = (t - 0.5) / 0.5; c = [lerp(s[1][0], s[2][0], u), lerp(s[1][1], s[2][1], u), lerp(s[1][2], s[2][2], u)]; }
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  function continentFill() {
    const vals = Object.values(aggCont).map(c => c.tsi); const max = Math.max(1, ...vals);
    const expr = ['match', ['get', 'CONTINENT']];
    Object.values(aggCont).forEach(c => { expr.push(c.cont, scaleColor(Math.sqrt(c.tsi / max))); });
    expr.push('#e8ebef'); return expr;
  }
  function countryFill() {
    const vals = Object.values(aggCountry).map(c => c.tsi); const max = Math.max(1, ...vals);
    const expr = ['match', ['get', 'ISO_A3']];
    Object.values(aggCountry).forEach(c => { expr.push(c.iso, scaleColor(Math.sqrt(c.tsi / max))); });
    expr.push('#e8ebef'); return expr;
  }

  /* ---------- 툴팁 ---------- */
  function contTooltip(cont) {
    const a = aggCont[cont]; const ko = CONT_KO[cont] || cont;
    if (!a) return `<div class="rm-tip-h">${ko}</div><div class="rm-tip-sub">보유 계약 없음</div>`;
    const rows = Object.values(a.countries).sort((x, y) => y.tsi - x.tsi)
      .map(c => `<tr><td>${c.ko}</td><td>${c.cnt}건</td><td>${eokFmt(c.tsi)}</td></tr>`).join('');
    return `<div class="rm-tip-h">${ko}</div><div class="rm-tip-kpi">총 ${a.cnt}건 · 누적 ${eokFmt(a.tsi)}</div>` +
      `<table class="rm-tip-tbl"><thead><tr><th>국가</th><th>건수</th><th>누적금액</th></tr></thead><tbody>${rows}</tbody></table>` +
      `<div class="rm-tip-foot">확대하면 국가별 보기로 전환됩니다</div>`;
  }
  function countryTooltip(iso, p) {
    const a = aggCountry[iso]; const ko = (a && a.ko) || p.NAME || p.ADMIN || iso;
    if (!a) return `<div class="rm-tip-h">${ko}</div><div class="rm-tip-sub">보유 계약 없음</div>`;
    const rows = Object.entries(a.cities).sort((x, y) => y[1].tsi - x[1].tsi)
      .map(([city, v]) => `<tr><td>${city}</td><td>${v.cnt}건</td><td>${eokFmt(v.tsi)}</td></tr>`).join('');
    return `<div class="rm-tip-h">${ko}</div><div class="rm-tip-kpi">총 ${a.cnt}건 · 누적 ${eokFmt(a.tsi)}</div>` +
      `<table class="rm-tip-tbl"><thead><tr><th>도시</th><th>건수</th><th>누적금액</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function showTooltip(pt, html) {
    if (!tooltipEl) return;
    tooltipEl.innerHTML = html; tooltipEl.style.display = 'block';
    const cont = document.getElementById('leafletMap');
    const w = tooltipEl.offsetWidth, h = tooltipEl.offsetHeight;
    let x = pt.x + 16, y = pt.y + 16;
    if (x + w > cont.clientWidth - 8) x = pt.x - w - 16;
    if (y + h > cont.clientHeight - 8) y = pt.y - h - 16;
    tooltipEl.style.left = Math.max(8, x) + 'px';
    tooltipEl.style.top = Math.max(8, y) + 'px';
  }
  function hideTooltip() { if (tooltipEl) tooltipEl.style.display = 'none'; }

  /* ---------- 지도 ---------- */
  function loadGeo() {
    if (geoPromise) return geoPromise;
    geoPromise = fetch(GEO_URL).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(g => { geo = g; buildIso(g); return g; });
    return geoPromise;
  }

  function setHover(filter) { if (map && map.getLayer('risk-hover')) map.setFilter('risk-hover', filter); }
  function clearHover() { setHover(['==', ['get', 'ISO_A3'], '___none___']); }

  function setModeBadge() {
    if (badgeEl) badgeEl.textContent = mode === 'continent' ? '🌍 대륙별 보기' : '📍 국가별 보기';
  }

  function addLayers() {
    if (layersAdded) return;
    map.addSource('risk', { type: 'geojson', data: geo, promoteId: 'ISO_A3' });
    const style = map.getStyle();
    let firstSymbol;
    if (style && style.layers) { for (const l of style.layers) { if (l.type === 'symbol') { firstSymbol = l.id; break; } } }
    map.addLayer({ id: 'risk-fill', type: 'fill', source: 'risk', paint: { 'fill-color': continentFill(), 'fill-opacity': 0.78 } }, firstSymbol);
    map.addLayer({ id: 'risk-line', type: 'line', source: 'risk', paint: { 'line-color': 'rgba(120,124,134,0.35)', 'line-width': 0.5 } }, firstSymbol);
    map.addLayer({ id: 'risk-hover', type: 'line', source: 'risk', paint: { 'line-color': '#fa4616', 'line-width': 3 }, filter: ['==', ['get', 'ISO_A3'], '___none___'] }, firstSymbol);
    layersAdded = true;
    wireEvents();
  }

  function wireEvents() {
    map.on('mousemove', 'risk-fill', (e) => {
      const f = e.features && e.features[0]; if (!f) return;
      map.getCanvas().style.cursor = 'pointer';
      const p = f.properties;
      if (mode === 'continent') {
        const cont = p.CONTINENT;
        setHover(['==', ['get', 'CONTINENT'], cont]);
        showTooltip(e.point, contTooltip(cont));
      } else {
        const iso = p.ISO_A3;
        setHover(['==', ['get', 'ISO_A3'], iso]);
        showTooltip(e.point, countryTooltip(iso, p));
      }
    });
    map.on('mouseleave', 'risk-fill', () => { map.getCanvas().style.cursor = ''; clearHover(); hideTooltip(); });

    map.on('click', 'risk-fill', (e) => {
      const f = e.features && e.features[0]; if (!f) return;
      if (mode === 'continent') {
        map.easeTo({ center: e.lngLat, zoom: 3.9, duration: 800 });
      } else {
        map.easeTo({ center: e.lngLat, zoom: Math.max(map.getZoom(), 5), duration: 700 });
        const iso = f.properties.ISO_A3; const a = aggCountry[iso];
        if (a) {
          const top = Object.entries(a.cities).sort((x, y) => y[1].tsi - x[1].tsi)[0];
          if (top && typeof selectRegion === 'function') { try { selectRegion(a.ko, top[0]); } catch (er) {} }
        }
      }
    });

    map.on('zoom', () => {
      const nm = map.getZoom() >= ZOOM_SWITCH ? 'country' : 'continent';
      if (nm !== mode) {
        mode = nm;
        map.setPaintProperty('risk-fill', 'fill-color', mode === 'continent' ? continentFill() : countryFill());
        clearHover(); hideTooltip(); setModeBadge();
      }
    });
  }

  function createMap() {
    const cont = document.getElementById('leafletMap');
    if (!cont) return;
    map = new maplibregl.Map({
      container: 'leafletMap', style: STYLE_URL,
      center: [50, 18], zoom: 1.3, attributionControl: true, dragRotate: false
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    // 오버레이(툴팁/배지/범례) 1회 생성
    tooltipEl = document.createElement('div'); tooltipEl.className = 'rm-tooltip'; cont.appendChild(tooltipEl);
    badgeEl = document.createElement('div'); badgeEl.className = 'rm-mode-badge'; cont.appendChild(badgeEl); setModeBadge();
    const legend = document.createElement('div'); legend.className = 'rm-legend';
    legend.innerHTML = '<b>누적 계약금액</b><div class="rm-legend-bar"></div><div class="rm-legend-scale"><span>적음</span><span>많음</span></div>';
    cont.appendChild(legend);

    const tryAdd = () => {
      if (layersAdded) return;
      try { addLayers(); } catch (err) { return; } // 스타일이 아직이면 다음 이벤트에서 재시도
      removeLoading();
      setTimeout(() => map.resize(), 50);
    };
    // isStyleLoaded()가 일부 외부 스타일에서 영구 false인 케이스 대비 → 여러 이벤트에서 재시도
    map.on('style.load', tryAdd);
    map.on('load', tryAdd);
    map.on('idle', tryAdd);
    map.on('error', () => { /* 타일/스타일 부분 오류 무시 */ });
  }

  function removeLoading() { const l = document.querySelector('#leafletMap .rm-loading'); if (l) l.remove(); }
  function showLoading(msg) {
    const cont = document.getElementById('leafletMap'); if (!cont) return;
    let l = cont.querySelector('.rm-loading');
    if (!l) { l = document.createElement('div'); l.className = 'rm-loading'; cont.appendChild(l); }
    l.textContent = msg;
  }

  function ensureMap() {
    const cont = document.getElementById('leafletMap'); if (!cont) return;
    if (typeof maplibregl === 'undefined') { showLoading('지도 라이브러리를 불러오지 못했습니다.'); return; }
    showLoading('지도를 불러오는 중…');
    loadGeo().then(() => {
      aggregate();
      if (!map) { createMap(); }
      else {
        if (map.getLayer('risk-fill')) map.setPaintProperty('risk-fill', 'fill-color', mode === 'continent' ? continentFill() : countryFill());
        removeLoading();
        setTimeout(() => map.resize(), 60);
      }
    }).catch(err => showLoading('지도 경계 데이터를 불러오지 못했습니다. (' + err.message + ')'));
  }

  /* ---------- renderMap 오버라이드 ---------- */
  function renderMapV52() {
    try { const r = document.getElementById('riskAsOf'); if (r && typeof DATA !== 'undefined') r.innerText = '기준일: ' + DATA.meta.asOfDate + ' / 단위: 억원'; } catch (e) {}
    // 우측 지역 카드 + Drill-down(기존 UI 재사용)
    try {
      if (typeof regionAgg === 'function') {
        const regs = regionAgg();
        const cards = document.getElementById('regionCards');
        if (cards) cards.innerHTML = regs.slice(0, 12).map(r =>
          `<div class="region-card" onclick="selectRegion('${r.country}','${r.city}')"><b>${r.country} / ${r.city}</b><br>누적 가입금액 ${eokFmt(r.tsi)} · 계약 ${r.cnt}건</div>`).join('');
        if (regs[0] && typeof selectRegion === 'function') selectRegion(regs[0].country, regs[0].city);
      }
    } catch (e) {}
    ensureMap();
  }

  function init() {
    window.renderMap = renderMapV52;
    // 이미 누적위험 탭이 활성화된 채 로드된 경우 대비
    const loc = document.getElementById('location');
    if (loc && loc.classList.contains('active')) renderMapV52();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
