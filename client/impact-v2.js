/* impact-v2.js — '사고·재보험 영향분석' (설정연동, 실데이터 기반)
 * 데이터 단일 원천 = 앱의 state.treaties(재보험 프로그램 설정) + state.layers(layerStatus).
 *  → 영향분석 추천/배분, Layer 소진 현황, 대시보드가 모두 같은 데이터를 사용해 항상 일치한다.
 *  → '이 결과를 Layer 소진에 반영' 시 state.layers를 갱신하고 renderDashboard()로 대시보드까지 반영.
 * app.js 로직은 무수정. onclick 핸들러는 iv* 로 노출(전역 충돌 방지). */
(function () {
  'use strict';
  var won = function (v) { return Math.round(v).toLocaleString('ko-KR') + '억'; };
  var won1 = function (v) { return (Math.round(v * 10) / 10).toLocaleString('ko-KR') + '억'; };
  var $ = function (id) { return document.getElementById(id); };
  var PAL = ['#2563eb', '#16a34a', '#7c3aed', '#ea580c', '#0891b2', '#db2777'];
  var CAT_PERILS = ['태풍', '홍수', '지진', '침수', '폭풍', '대설'];
  // 연간재보험료(억) 임의 배분 규칙 — 한도 대비 요율(상위 Layer일수록 저렴). 재보험 프로그램 설정과 공유.
  window.graDefaultLayerAp = window.graDefaultLayerAp || function (idx, limit) { if (idx <= 0) return 0; var r = idx === 1 ? 0.08 : idx === 2 ? 0.055 : idx === 3 ? 0.04 : 0.03; return Math.round((+limit || 0) * r); };
  // 설정 데이터(state.treaties) 레이어에 연간재보험료(ap)가 없으면 자동 배분 채움(단일 원천)
  function ensureLayerPremiums() {
    var ts = (typeof state !== 'undefined' && state.treaties) ? state.treaties : null;
    if (!ts) return;
    ts.forEach(function (t) { (t.layers || []).forEach(function (L, li) { if (L.ap == null || L.ap === '') { L.ap = window.graDefaultLayerAp(li, (+L.to || 0) - (+L.from || 0)); } }); });
  }
  var PREM_KEY = 'gra_impact_prem';

  function getPrem() { try { var p = JSON.parse(localStorage.getItem(PREM_KEY) || 'null'); if (p && p.period) return p; } catch (e) {} return { period: 365, remain: 180, rrate: 100 }; }
  function setPrem(p) { try { localStorage.setItem(PREM_KEY, JSON.stringify(p)); } catch (e) {} }

  function appTreaties() { try { if (typeof getTreaties === 'function') { var t = getTreaties(); if (t && t.length) return t; } } catch (e) {} if (typeof state !== 'undefined' && state.treaties && state.treaties.length) return state.treaties; return (window.__SERVER_DATA__ && window.__SERVER_DATA__.treaties) || []; }
  function appLayers() { if (typeof state !== 'undefined' && Array.isArray(state.layers)) return state.layers; return (window.__SERVER_DATA__ && window.__SERVER_DATA__.layerStatus) || []; }
  function coversFor(t) { var s = (t.name || '') + ' ' + (t.type || ''); if (/marine|해상|cargo/i.test(s)) return ['해상적하']; if (/casualty|배상/i.test(s)) return ['배상책임']; return ['재물', 'Package', '기술보험']; }
  function exclFor(t) { if (Array.isArray(t.exclusions) && t.exclusions.length) return t.exclusions.join('·'); var s = (t.name || '') + ' ' + (t.type || ''); if (/marine|해상/i.test(s)) return '포장불량·고유하자·지연·전쟁'; if (/casualty|배상/i.test(s)) return '고의·전쟁·제재·중과실'; if (/cat/i.test(s)) return '전쟁·핵·제재·사이버'; return '노후화·마모·고의·전쟁·테러'; }

  var PROGS = [], PROG = {}, CLAIMS = [];
  var IV = { progKey: null, lastResult: null };

  function buildPrograms() {
    ensureLayerPremiums();
    PROGS = appTreaties().map(function (t, idx) {
      var isCat = /cat/i.test(t.type || '') || /cat/i.test(t.name || '');
      var lyrs = (t.layers || []).map(function (L, li) { var lo = +L.from || 0, hi = +L.to || 0, lim = hi - lo; var ap = (L.ap != null && L.ap !== '') ? +L.ap : window.graDefaultLayerAp(li, lim); return { n: L.layer, lead: L.lead || '', lo: lo, hi: hi, limit: lim, idx: li, ap: ap }; });
      return { key: t.treatyId, name: t.name, type: t.type || '', isCat: isCat, apply: isCat ? 'Event 합산 적용' : '사고별 적용', color: PAL[idx % PAL.length], coversLines: coversFor(t), excl: exclFor(t), layers: lyrs };
    }).filter(function (P) { return P.layers.length >= 2; });
    PROG = {}; PROGS.forEach(function (P) { PROG[P.key] = P; });
  }
  // layerStatus 매칭(라이브 참조 — 변경 시 대시보드와 공유)
  function lsFor(treatyId, layerName) { return appLayers().find(function (s) { return s.treatyId === treatyId && s.layer === layerName; }); }
  function usedOf(ls) { return ls ? ((+ls.paidUsedEok || 0) + (+ls.outstandingUsedEok || 0)) : 0; }
  function baseOf(treatyId, L) { var ls = lsFor(treatyId, L.n); return ls ? (+ls.baseLimitEok || L.limit) : L.limit; }
  function reinstOf(treatyId, L) { var ls = lsFor(treatyId, L.n); return ls ? (+ls.reinstatedLimitEok || 0) : 0; }
  function apOf(P, L) { return (L.ap != null) ? +L.ap : window.graDefaultLayerAp(L.idx || 0, L.limit); }

  function buildClaims() {
    var acc = (typeof state !== 'undefined' && Array.isArray(state.accidents)) ? state.accidents : ((window.__SERVER_DATA__ && window.__SERVER_DATA__.accidents) || []);
    var arr = acc.slice(0, 80).map(function (a) {
      var g = (a.grossLossEok != null) ? +a.grossLossEok : ((+a.paidLossEok || 0) + (+a.outstandingLossEok || 0));
      return { id: a.claimNo || '사고', insured: a.insured || '-', line: a.line || '재물', cause: a.cause || '화재', date: a.claimDate || '-', gross: +g || 0 };
    }).filter(function (c) { return c.gross > 0; });
    arr.push({ id: '__manual', insured: '직접 입력(가상 시나리오)', line: '', cause: '', date: '', gross: 0 });
    return arr;
  }

  function recommend(line, cause) {
    if (line === '사이버') return { key: null, reason: '사이버 손해는 다수 Treaty에서 <b>면책</b>입니다(설정의 Exclusion 기준). 적용 재보험 프로그램이 없습니다.' };
    var cover = PROGS.filter(function (P) { return P.coversLines.indexOf(line) >= 0; });
    if (!cover.length) return { key: null, reason: '보험종목 <b>' + (line || '미지정') + '</b>을(를) 담보하는 프로그램이 설정에 없습니다.' };
    if (CAT_PERILS.indexOf(cause) >= 0) { var cat = cover.find(function (P) { return P.isCat; }); if (cat) return { key: cat.key, reason: '<b>' + line + '</b> + <b>' + cause + '</b>(자연재해) → 설정상 Event 합산 프로그램 <b>' + cat.name + '</b>을 추천합니다.' }; }
    var single = cover.find(function (P) { return !P.isCat; }) || cover[0];
    return { key: single.key, reason: '<b>' + line + '</b> + <b>' + (cause || '단일사고') + '</b> → 설정상 사고별 적용 프로그램 <b>' + single.name + '</b>을 추천합니다.' };
  }
  function allocate(P, gross, excl, ded) {
    var n = P.layers.length, R = Math.max(0, gross - excl - ded);
    var ret = Math.min(R, P.layers[0].hi);
    var layerRec = P.layers.map(function () { return 0; });
    for (var i = 1; i < n; i++) { var L = P.layers[i]; layerRec[i] = Math.max(0, Math.min(R, L.hi) - L.lo); }
    var top = P.layers[n - 1].hi, excess = Math.max(0, R - top);
    var recovery = layerRec.reduce(function (a, b) { return a + b; }, 0);
    return { R: R, ret: ret, layerRec: layerRec, excess: excess, recovery: recovery, net: gross - recovery };
  }

  /* ---------- 뷰 전환 ---------- */
  function ivShow(v) {
    $('view-impact').classList.toggle('hidden', v !== 'impact');
    $('view-layer').classList.toggle('hidden', v !== 'layer');
    $('ivTabImpact').classList.toggle('on', v === 'impact');
    $('ivTabLayer').classList.toggle('on', v === 'layer');
    if (v === 'layer') { renderSettings(); renderLayer(); }
  }
  function toggleAdv() { var a = $('adv'); a.classList.toggle('open'); $('advArrow').textContent = a.classList.contains('open') ? '▾' : '▸'; }
  function toggleSet() { var b = $('setbody'); b.classList.toggle('open'); $('setArrow').textContent = b.classList.contains('open') ? '▾ 설정값 접기' : '▸ 설정값 보기'; }
  function toast(m) { var t = $('ivToast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 2200); }

  /* ---------- 영향분석 ---------- */
  function initClaims() {
    CLAIMS = buildClaims();
    var s = $('claimSel'); if (!s) return;
    s.innerHTML = CLAIMS.map(function (c, i) { return '<option value="' + i + '">' + (c.id === '__manual' ? c.insured : (c.id + ' · ' + c.insured + ' · ' + (c.cause || '-') + ' · Gross ' + c.gross + '억')) + '</option>'; }).join('');
    var best = 0, bg = -1; CLAIMS.forEach(function (c, i) { if (c.id !== '__manual' && c.gross > bg) { bg = c.gross; best = i; } });
    s.value = best;
  }
  function curClaim() {
    var i = +$('claimSel').value, c = CLAIMS[i];
    if (c && c.id === '__manual') return { id: '가상', insured: '직접 입력', line: $('mLine').value, cause: $('mCause').value, date: '-', gross: +$('mGross').value || 0 };
    return c || { id: '-', insured: '-', line: '', cause: '', gross: 0 };
  }
  function onClaim() {
    if (!$('claimSel')) return;
    var i = +$('claimSel').value;
    $('manualWrap').classList.toggle('hidden', !(CLAIMS[i] && CLAIMS[i].id === '__manual'));
    var c = curClaim();
    $('claimInfo').innerHTML = [['피보험자', c.insured], ['보험종목', c.line || '-'], ['사고유형', c.cause || '-'], ['Gross 손해액', won(c.gross)]]
      .map(function (x) { return '<div class="b"><div class="l">' + x[0] + '</div><div class="v">' + x[1] + '</div></div>'; }).join('');
    var rec = recommend(c.line, c.cause); IV.progKey = rec.key;
    $('recBox').innerHTML = rec.key
      ? '<span class="tag">추천</span><div class="why"><b>' + PROG[rec.key].name + '</b> · ' + PROG[rec.key].apply + '<br>' + rec.reason + '</div>'
      : '<span class="tag" style="background:var(--red)">면책</span><div class="why">' + rec.reason + '</div>';
    $('progRow').innerHTML = PROGS.map(function (P) { return '<div class="prog-opt ' + (P.key === IV.progKey ? 'sel' : '') + '" onclick="ivPick(\'' + P.key + '\')"><div class="nm"><span class="dot" style="background:' + P.color + '"></span>' + P.name + '</div><div class="ap">' + P.apply + '</div></div>'; }).join('');
    calc();
  }
  function pickProg(k) { IV.progKey = k; document.querySelectorAll('#impact .prog-opt').forEach(function (e) { e.classList.toggle('sel', e.querySelector('.nm').textContent.indexOf(PROG[k].name) >= 0); }); calc(); }
  function calc() {
    var c = curClaim();
    var excl = +$('aExcl').value || 0, ded = +$('aDed').value || 0;
    $('aApply').value = IV.progKey ? PROG[IV.progKey].apply : '—';
    if (!IV.progKey) {
      $('headline').innerHTML = '이 사고는 적용 재보험이 없어 <span class="net-amt">전액 회사 보유</span>입니다.';
      $('sumchips').innerHTML = ''; $('waterfall').innerHTML = ''; $('wfLeg').innerHTML = '';
      $('explain').innerHTML = '<div class="ai">● 계산 근거</div>적용 가능한 재보험 프로그램이 없어 Gross ' + won(c.gross) + ' 전액을 회사가 보유합니다.';
      IV.lastResult = null; return;
    }
    var P = PROG[IV.progKey], r = allocate(P, c.gross, excl, ded), n = P.layers.length;
    IV.lastResult = { P: P, c: c, r: r, excl: excl, ded: ded };
    $('headline').innerHTML = won(c.gross) + ' 사고 → 재보험 회수 <span class="rec-amt">약 ' + won(r.recovery) + '</span> · 회사 보유 <span class="net-amt">약 ' + won(r.net) + '</span>';
    $('sumchips').innerHTML = [['Gross 손해액', won(c.gross), ''], ['회수가능손해', won(r.R), ''], ['재보험 회수액', won(r.recovery), 'kpi-rec'], ['회사 최종 보유', won(r.net), 'kpi-net']]
      .map(function (x) { return '<div class="c ' + x[2] + '"><div class="l">' + x[0] + '</div><div class="v">' + x[1] + '</div></div>'; }).join('');
    drawWaterfall(P, c.gross, excl + ded, r);
    var hit = P.layers.map(function (L, i) { return i > 0 && r.layerRec[i] > 0.001 ? L.n + '에서 ' + won(r.layerRec[i]) : null; }).filter(Boolean);
    var full = P.layers.map(function (L, i) { return i > 0 && r.layerRec[i] >= L.limit - 0.001 && L.limit > 0 ? L.n : null; }).filter(Boolean);
    var exp = '<div class="ai">● 이렇게 계산했어요 (설정값 기준)</div>';
    exp += 'Gross ' + won(c.gross) + ((excl + ded) > 0 ? '에서 면책·자기부담 ' + won(excl + ded) + '을 빼면' : '은') + ' 회수가능손해 <b>' + won(r.R) + '</b>입니다. ';
    exp += '이 중 <b>Company Retention</b>(' + won(P.layers[0].hi) + ')까지 <b>' + won(r.ret) + '</b>은 회사가 보유합니다. ';
    exp += hit.length ? '초과분은 ' + hit.join(', ') + ' 회수되어 <b>재보험 회수 ' + won(r.recovery) + '</b>. ' : 'Company Retention을 넘지 않아 작동하는 Layer가 없습니다(재보험 회수 0). ';
    if (r.excess > 0) exp += '최상단 한도(' + won(P.layers[n - 1].hi) + ')를 ' + won(r.excess) + ' 초과해 이 초과분도 회사가 부담합니다. ';
    exp += '결과적으로 <b>회사 최종 보유손해는 ' + won(r.net) + '</b>입니다.';
    if (full.length) exp += '<br><span class="warn">⚠ 이 사고만으로 ' + full.join(', ') + '가 100% 소진됩니다 → Layer 소진 현황에서 복원을 검토하세요.</span>';
    $('explain').innerHTML = exp;
  }
  function drawWaterfall(P, gross, exclTot, r) {
    var n = P.layers.length, segs = [];
    if (exclTot > 0) segs.push({ v: exclTot, c: '#9aa3b5', l: '면책·자기부담' });
    if (r.ret > 0) segs.push({ v: r.ret, c: '#34406b', l: '회사 보유 (Retention)' });
    for (var i = 1; i < n; i++) if (r.layerRec[i] > 0.001) segs.push({ v: r.layerRec[i], c: shade(P.color, 1 - (i - 1) * 0.22), l: P.layers[i].n + ' 회수' });
    if (r.excess > 0) segs.push({ v: r.excess, c: '#c2410c', l: '한도초과 (회사부담)' });
    var total = Math.max(gross, segs.reduce(function (a, s) { return a + s.v; }, 0)) || 1;
    var W = 1000, H = 58, pad = 2, x = 0;
    var rects = segs.map(function (s) { var w = (s.v / total) * W; var g = '<g><rect x="' + (x + pad) + '" y="6" width="' + Math.max(0, w - pad * 2) + '" height="' + (H - 12) + '" rx="6" fill="' + s.c + '"/>' + (w > 70 ? '<text x="' + (x + w / 2) + '" y="' + (H / 2 + 1) + '" font-size="13" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">' + won(s.v) + '</text>' : '') + '</g>'; x += w; return g; }).join('');
    $('waterfall').innerHTML = '<div style="font-size:12px;color:var(--mut);margin:2px 0 6px;display:flex;justify-content:space-between"><span>0</span><span>Gross ' + won(gross) + ' · 손해가 한도를 통과하는 흐름</span></div><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" preserveAspectRatio="none" style="display:block">' + rects + '</svg>';
    $('wfLeg').innerHTML = segs.map(function (s) { return '<span><span class="dot" style="background:' + s.c + '"></span>' + s.l + ' · ' + won(s.v) + '</span>'; }).join('');
  }
  function shade(hex, f) { var n = parseInt(hex.slice(1), 16); var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; r = Math.round(r + (255 - r) * (1 - f)); g = Math.round(g + (255 - g) * (1 - f)); b = Math.round(b + (255 - b) * (1 - f)); return 'rgb(' + r + ',' + g + ',' + b + ')'; }

  /* ---------- 반영 → state.layers + 대시보드 ---------- */
  function reflect() {
    if (!IV.lastResult) { toast('적용 재보험이 없어 반영할 내용이 없습니다'); return; }
    var P = IV.lastResult.P, c = IV.lastResult.c, r = IV.lastResult.r;
    var applied = 0;
    P.layers.forEach(function (L, i) {
      if (i === 0 || !(r.layerRec[i] > 0.001)) return;
      var ls = lsFor(P.key, L.n);
      if (ls) { ls.paidUsedEok = (+ls.paidUsedEok || 0) + r.layerRec[i]; ls.updatedBy = '영향분석 반영'; ls.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' '); applied++; }
    });
    if (!applied) { toast('회수 구간이 없어 반영할 Layer가 없습니다'); return; }
    persist();
    try { if (typeof renderDashboard === 'function') renderDashboard(); } catch (e) {}
    renderLayer();
    toast(P.name + '에 반영 · Layer 소진 + 대시보드 자동 갱신');
  }
  function persist() { try { if (typeof saveAll === 'function') saveAll(); else if (typeof state !== 'undefined') localStorage.setItem('gra_v34_layers', JSON.stringify(state.layers)); } catch (e) {} }
  // 최초 1회: 모든 Layer 복원 적용 해제(기본 미적용). 이후 사용자가 토글하면 유지.
  var _reinstReset = false;
  function resetAllReinstatementsOnce() {
    if (_reinstReset) return;
    if (typeof state === 'undefined' || !Array.isArray(state.layers)) return;
    var changed = false;
    state.layers.forEach(function (l) { if ((+l.reinstatedLimitEok || 0) !== 0) { l.reinstatedLimitEok = 0; changed = true; } });
    _reinstReset = true;
    if (changed) { persist(); try { if (typeof renderDashboard === 'function') renderDashboard(); } catch (e) {} }
  }
  window.addEventListener('load', function () { setTimeout(resetAllReinstatementsOnce, 3200); });

  /* ---------- 설정값(연동 원천) ---------- */
  function renderSettings() {
    var prem = getPrem();
    syncPremBar();
    $('setProgs').innerHTML = PROGS.map(function (P) {
      var rows = P.layers.map(function (L, li) {
        if (li === 0) return '<tr><td style="font-weight:700">' + L.n + ' <span class="mini">(회사보유)</span></td><td>' + won(L.limit) + '</td><td class="mini">—</td><td class="mini">—</td></tr>';
        return '<tr><td style="font-weight:700">' + L.n + '</td><td>' + won(baseOf(P.key, L)) + '</td><td>' + won(apOf(P, L)) + '</td><td>' + prem.rrate + '%</td></tr>';
      }).join('');
      return '<div class="setprog"><div class="pn"><span class="dot" style="background:' + P.color + '"></span>' + P.name + ' <span class="mini">· ' + (P.type || '') + ' · 대상: ' + P.coversLines.join('·') + (P.isCat ? ' · Cat' : '') + '</span></div>'
        + '<table class="stbl"><thead><tr><th>Layer</th><th>한도</th><th>연간 재보험료</th><th>복원료율</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }).join('');
  }
  function setGlobal() { var prem = getPrem(); if ($('gPeriod')) prem.period = +$('gPeriod').value || 365; if ($('gRemain')) prem.remain = +$('gRemain').value || 0; if ($('gRrate')) prem.rrate = +$('gRrate').value || 0; setPrem(prem); renderLayer(); }
  function syncPremBar() { var prem = getPrem(); if ($('gPeriod')) $('gPeriod').value = prem.period; if ($('gRemain')) $('gRemain').value = prem.remain; if ($('gRrate')) $('gRrate').value = (prem.rrate != null ? prem.rrate : 100); }
  function resetCfg() { setPrem({ period: 365, remain: 180, rrate: 100 }); renderSettings(); renderLayer(); toast('복원보험료 기본값으로 초기화'); }

  /* ---------- Layer 소진 현황 (state.layers 기반 = 대시보드와 동일) ---------- */
  function reinstPremium(P, L) { var prem = getPrem(); var base = baseOf(P.key, L), used = usedOf(lsFor(P.key, L.n)), ap = apOf(P, L); if (!base || !ap) return 0; return ap * (Math.min(used, base) / base) * ((prem.rrate || 0) / 100) * (prem.remain / prem.period); }
  function renderLayer() {
    resetAllReinstatementsOnce();
    var maxPct = 0, recTotal = 0, needReinst = 0, premTotal = 0;
    PROGS.forEach(function (P) { P.layers.forEach(function (L, i) { if (i === 0) return; var base = baseOf(P.key, L), reinst = reinstOf(P.key, L), eff = base + reinst, used = usedOf(lsFor(P.key, L.n)); var pct = eff ? used / eff * 100 : 0; maxPct = Math.max(maxPct, pct); recTotal += used; if (used >= eff * 0.999 && eff > 0) needReinst++; if (reinst > 0) premTotal += reinstPremium(P, L); }); });
    $('layerKpis').innerHTML = [['최고 Layer 소진율', Math.round(maxPct) + '%'], ['누적 재보험 사용액', won(recTotal)], ['복원 필요 Layer', needReinst + '개'], ['복원보험료(적용 합계)', premTotal > 0 ? won1(premTotal) : '0억']]
      .map(function (x) { return '<div class="k"><div class="l">' + x[0] + '</div><div class="v">' + x[1] + '</div></div>'; }).join('');
    $('progCards').innerHTML = PROGS.map(function (P) {
      var layers = P.layers.map(function (L, i) {
        if (i === 0) return '<div class="layer"><div class="lr"><div><span class="lname">' + L.n + '</span><span class="lrange">' + L.lo + '~' + L.hi + '억 · ' + L.lead + '</span></div><div class="lstat">회사 보유 구간</div></div></div>';
        var base = baseOf(P.key, L), reinst = reinstOf(P.key, L), eff = base + reinst, used = usedOf(lsFor(P.key, L.n)), rem = Math.max(0, eff - used), pct = eff ? Math.min(100, used / eff * 100) : 0;
        var col = pct >= 85 ? 'var(--red)' : pct >= 60 ? 'var(--amber)' : 'var(--green)';
        var on = reinst > 0, prem = reinstPremium(P, L);
        var premTxt = on ? ' · 복원보험료 <span class="pm">약 ' + won1(prem) + '</span>' : (apOf(P, L) ? ' · 복원 시 약 ' + won1(prem) : '');
        return '<div class="layer"><div class="lr"><div><span class="lname">' + L.n + '</span><span class="lrange">한도 ' + won(base) + (reinst > 0 ? ' (+복원 ' + won(reinst) + ')' : '') + ' · ' + L.lead + '</span></div>'
          + '<div class="lstat">사용 <b>' + won(used) + '</b> / 한도 ' + won(eff) + ' · 잔여 <b>' + won(rem) + '</b></div></div>'
          + '<div class="bar"><i style="width:' + pct + '%;background:' + col + '"></i></div>'
          + '<div class="foot"><span class="pct" style="color:' + col + '">' + Math.round(pct) + '% 소진' + (on ? ' · 복원 적용' : '') + premTxt + '</span>'
          + '<span class="reinst ' + (on ? 'on' : '') + '" onclick="ivToggleReinst(\'' + P.key + '\',\'' + L.n.replace(/'/g, "\\'") + '\')"><span class="sw"></span>복원 적용</span></div></div>';
      }).join('');
      return '<div class="progcard"><div class="top" style="background:' + P.color + '"></div><div class="pad">'
        + '<div class="ph"><div class="nm">' + P.name + ' <span class="ap">· ' + (P.type || '') + ' · ' + P.apply + '</span></div></div>'
        + '<div style="font-size:11.5px;color:var(--mut);margin-bottom:6px">대상 보험종목: ' + (P.coversLines.join('·') || '—') + ' · Exclusion: ' + P.excl + '</div>'
        + '<div style="margin-top:4px">' + layers + '</div></div></div>';
    }).join('');
  }
  function toggleReinst(treatyId, layerName) {
    var ls = lsFor(treatyId, layerName); if (!ls) { toast('해당 Layer 데이터가 없습니다'); return; }
    ls.reinstatedLimitEok = (+ls.reinstatedLimitEok || 0) > 0 ? 0 : (+ls.baseLimitEok || 0);
    ls.updatedBy = '영향분석 복원'; ls.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    persist();
    try { if (typeof renderDashboard === 'function') renderDashboard(); } catch (e) {}
    renderLayer();
    toast((+ls.reinstatedLimitEok > 0) ? layerName + ' 복원 적용 · 대시보드 갱신' : layerName + ' 복원 해제 · 대시보드 갱신');
  }

  // onclick 핸들러 노출
  window.ivShow = ivShow; window.ivClaim = onClaim; window.ivToggleAdv = toggleAdv; window.ivCalc = calc;
  window.ivPick = pickProg; window.ivReflect = reflect; window.ivToggleSet = toggleSet;
  window.ivSetGlobal = setGlobal; window.ivResetCfg = resetCfg; window.ivToggleReinst = toggleReinst;

  // 재보험 프로그램 설정 화면 렌더 시 연간재보험료 자동배분 보장(단일 원천 정렬)
  (function () { var orig = window.renderReinsuranceAdmin; if (typeof orig === 'function' && !orig.__apWrapped) { var w = function () { ensureLayerPremiums(); return orig.apply(this, arguments); }; w.__apWrapped = true; window.renderReinsuranceAdmin = w; } })();
  function initImpact() { if (!$('claimSel')) return; buildPrograms(); initClaims(); onClaim(); }
  window.renderTreatyChoices = function () { initImpact(); }; // 탭 진입 시 최신 설정으로 재구성
  if (document.readyState !== 'loading') initImpact(); else window.addEventListener('DOMContentLoaded', initImpact);
})();
