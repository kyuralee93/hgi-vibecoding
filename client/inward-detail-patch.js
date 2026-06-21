/* =====================================================================
 * inward-detail-patch.js
 * ---------------------------------------------------------------------
 * app.js / ai-integration.js / docs-reinstatement-patch.js 다음에 로드되는
 * 마지막 보정 시트입니다. 원본 app.js는 수정하지 않습니다.
 *
 * 하는 일
 *  1) 이 플랫폼을 "임의재보험(Fac)"에 국한:
 *     - 출재계약(cessions)에서 Treaty(비례출재/초과손해) 건을 제거하고
 *       임의재보험(Fac)만 남깁니다.
 *  2) 수재계약(contracts) 데이터 보강(출재 데이터 수준으로 상세화):
 *     - 출재사(cedant), 경유처(intermediary), 유형(임의재보험),
 *       수재보험료 원통화 금액/통화/구분, 수금상태를 각 계약에 추가합니다.
 *  3) 출재·수재계약 조회 표(window.renderContractTable)를 교체:
 *     - 수재 탭을 출재 탭과 동일한 수준의 컬럼으로 상세 표시
 *       (출재사/경유처 · 유형 · 수재보험료(원통화) · 수재 PPW · 수금상태)
 *     - 출재 탭은 임의재보험(Fac) 기준으로 안내문구를 갱신.
 *
 * 연결 화면: 대시보드 PPW 알림 / 출재 PPW 패널은 cessions 를 그대로 읽으므로
 *           자동으로 임의재보험(Fac) 기준으로 반영됩니다. 소재지 누적위험·
 *           손익(PML) 등은 기존 필드를 사용하므로 영향 없이 동작합니다.
 *
 * 되돌리기: 이 파일과 index.html의 <script ...inward-detail-patch.js> 한 줄만
 *          지우면 원상복구됩니다.
 * ===================================================================== */
(function () {
  'use strict';

  var FAC = '임의재보험(Fac)';
  var FX = { USD: 1450, EUR: 1580, JPY: 9.8, GBP: 1850, KRW: 1 };
  var CEDANTS = ['Pacific Insurance', 'Global Fronting Co.', 'Korean Re', 'Asean Re Brokers', 'Tokio Marine 출재', 'AXA 출재'];
  var BROKERS = ['직접 수재', 'Aon Re 경유', 'Guy Carpenter 경유', 'Gallagher Re 경유', '현지 프론팅 경유'];
  var RECV = ['수금완료', '수금예정', '미수', '부분수금', '확인중'];
  var CUR = ['USD', 'EUR', 'GBP', 'JPY', 'KRW'];

  // ---- 안전 헬퍼(전역 의존 최소화) ----
  function q(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function won(n) { return Math.round(Number(n || 0)).toLocaleString() + '억원'; }
  function num(n) { return Number(n || 0).toLocaleString(); }

  function getDATA() { try { return DATA; } catch (e) { return (window.DATA || null); } }
  function getState() { try { return state; } catch (e) { return (window.state || null); } }

  // ---- 1) 출재계약: 임의재보험(Fac)만 남김 ----
  function limitToFac() {
    var D = getDATA(), S = getState();
    if (D && Array.isArray(D.cessions)) {
      var fac = D.cessions.filter(function (c) { return c && c.type === FAC; });
      if (fac.length !== D.cessions.length) { D.cessions.length = 0; Array.prototype.push.apply(D.cessions, fac); }
    }
    if (S) {
      if (Array.isArray(S.cessions)) {
        var facS = S.cessions.filter(function (c) { return c && c.type === FAC; });
        S.cessions.length = 0; Array.prototype.push.apply(S.cessions, facS);
      } else if (D && Array.isArray(D.cessions)) {
        S.cessions = D.cessions.slice();
      }
    }
  }

  // ---- 2) 수재계약 데이터 보강(결정적·멱등) ----
  function enrichInward() {
    var D = getDATA(), S = getState();
    var lists = [];
    if (D && Array.isArray(D.contracts)) lists.push(D.contracts);
    if (S && Array.isArray(S.contracts) && S.contracts !== (D && D.contracts)) lists.push(S.contracts);
    lists.forEach(function (arr) {
      arr.forEach(function (c, i) {
        if (!c || c._inwardEnriched) return;
        c.cedant = CEDANTS[i % CEDANTS.length];
        c.intermediary = BROKERS[i % BROKERS.length];
        c.inwardType = FAC;
        c.premiumType = '수재보험료';                 // 우리가 출재사로부터 받는 재보험료
        var cur = CUR[i % CUR.length];
        c.premiumCurrency = cur;
        c.premiumOriginal = Math.max(0, Math.round((Number(c.premiumEok) || 0) * 1e8 / (FX[cur] || 1)));
        c.receivableStatus = RECV[i % RECV.length];   // 수재보험료 수금상태
        c._inwardEnriched = true;
      });
    });
  }

  // ---- 표시 헬퍼 ----
  function typePill(t) {
    return '<span style="background:#eef2ff;color:#3730a3;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600;white-space:nowrap">' + esc(t || FAC) + '</span>';
  }
  function recvPill(s) {
    var bg = '#f1f5f9', fg = '#475569';
    if (s === '수금완료') { bg = '#dcfce7'; fg = '#166534'; }
    else if (s === '미수') { bg = '#fee2e2'; fg = '#b91c1c'; }
    else if (s === '수금예정' || s === '부분수금') { bg = '#fef3c7'; fg = '#b45309'; }
    return '<span style="background:' + bg + ';color:' + fg + ';padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600;white-space:nowrap">' + esc(s || '-') + '</span>';
  }

  function contractsList() {
    var D = getDATA(), S = getState();
    return (S && S.contracts && S.contracts.length) ? S.contracts : ((D && D.contracts) || []);
  }
  function cessionsList() {
    var D = getDATA(), S = getState();
    return (S && S.cessions && S.cessions.length) ? S.cessions : ((D && D.cessions) || []);
  }

  // ---- 3) 출재·수재 조회 표 교체 ----
  function renderContractTablePatched() {
    var S = getState(); if (!S) return;
    if (typeof setMetaText === 'function') { try { setMetaText(); } catch (e) {} }
    var basis = S.contractBasis || 'inward';
    var qstr = ((q('contractSearch') && q('contractSearch').value) || '').toLowerCase();
    var line = (q('contractLineFilter') && q('contractLineFilter').value) || '전체';
    var thead = document.querySelector('#contractTable thead tr');
    var tbody = document.querySelector('#contractTable tbody'); if (!tbody) return;
    var PAGE_SIZE = (typeof PAGE !== 'undefined' ? PAGE : 10);
    S.pages = S.pages || {}; S.pages.contract = S.pages.contract || 1;

    function match(c) { return (!qstr || JSON.stringify(c).toLowerCase().indexOf(qstr) >= 0) && (line === '전체' || c.line === line); }

    if (basis === 'outward') {
      var rowsO = cessionsList().filter(match);
      var totalO = Math.max(1, Math.ceil(rowsO.length / PAGE_SIZE));
      S.pages.contract = Math.min(S.pages.contract, totalO);
      var pageO = rowsO.slice((S.pages.contract - 1) * PAGE_SIZE, S.pages.contract * PAGE_SIZE);
      if (thead) thead.innerHTML = '<th>출재번호</th><th>재보험자</th><th>유형</th><th>원수 피보험자</th><th>국가/종목</th><th>출재 가입금액</th><th>출재 보험료</th><th>출재 PPW</th><th>납입상태</th>';
      tbody.innerHTML = pageO.map(function (c) {
        return '<tr>'
          + '<td>' + esc(c.cessionNo) + '<br><span class="source-pill outward">기간계 출재</span></td>'
          + '<td>' + esc(c.reinsurer) + '</td><td>' + typePill(c.type) + '</td><td>' + esc(c.originalInsured) + '</td>'
          + '<td>' + esc(c.country) + ' / ' + esc(c.line) + '</td>'
          + '<td>' + won(c.cededTsiEok) + '</td>'
          + '<td>' + won(c.cededPremiumEok) + '<br><small>출재보험료 · ' + esc(c.currency) + ' ' + num(c.cededPremiumOriginal) + '</small></td>'
          + '<td>' + esc(c.ppwDate) + '</td>'
          + '<td><span class="pay-pill ' + esc(c.paymentStatus) + '">' + esc(c.paymentStatus) + '</span></td></tr>';
      }).join('') || '<tr><td colspan="9">출재계약 데이터가 없습니다.</td></tr>';
      var ccO = q('contractCount'); if (ccO) ccO.innerHTML = '출재계약 ' + rowsO.length + '건 · <b>임의재보험(Fac)</b> 출재만 관리 · 출재 PPW = 우리가 재보험자에게 출재보험료를 낼 기한';
      var pgO = q('contractPage'); if (pgO) pgO.innerText = S.pages.contract + ' / ' + totalO;
      return;
    }

    // 수재(보강된 상세 컬럼)
    var rowsI = contractsList().filter(match);
    var totalI = Math.max(1, Math.ceil(rowsI.length / PAGE_SIZE));
    S.pages.contract = Math.min(S.pages.contract, totalI);
    var pageI = rowsI.slice((S.pages.contract - 1) * PAGE_SIZE, S.pages.contract * PAGE_SIZE);
    if (thead) thead.innerHTML = '<th>증권번호</th><th>출재사 / 경유처</th><th>유형</th><th>피보험자</th><th>국가/종목</th><th>수재 가입금액</th><th>수재 보험료</th><th>수재 PPW</th><th>수금상태</th>';
    tbody.innerHTML = pageI.map(function (c) {
      var inter = (c.intermediary && c.intermediary !== '직접 수재') ? esc(c.intermediary) : '직접 수재(경유처 없음)';
      var prem = won(c.premiumEok) + '<br><small>' + esc(c.premiumType || '수재보험료') + ' · ' + esc(c.premiumCurrency || c.currency || 'KRW') + ' ' + num(c.premiumOriginal) + '</small>';
      return '<tr>'
        + '<td>' + esc(c.policyNo) + '<br><span class="source-pill official">기간계 수재계약</span></td>'
        + '<td>' + esc(c.cedant || '-') + '<br><small>' + inter + '</small></td>'
        + '<td>' + typePill(c.inwardType) + '</td>'
        + '<td>' + esc(c.insured) + '</td>'
        + '<td>' + esc(c.country) + ' / ' + esc(c.line) + '</td>'
        + '<td>' + won(c.tsiEok) + '</td>'
        + '<td>' + prem + '</td>'
        + '<td>' + esc(c.ppwDate || '-') + '<br><small>만기 ' + esc(c.renewalDate || '-') + '</small></td>'
        + '<td>' + recvPill(c.receivableStatus) + '</td></tr>';
    }).join('') || '<tr><td colspan="9">수재계약 데이터가 없습니다.</td></tr>';
    var ccI = q('contractCount'); if (ccI) ccI.innerHTML = '수재계약 ' + rowsI.length + '건 · <b>임의재보험(Fac)</b> 인수 · 출재사·경유처·수재보험료(원통화)·수금상태 포함';
    var pgI = q('contractPage'); if (pgI) pgI.innerText = S.pages.contract + ' / ' + totalI;
  }

  // ---- 토글 버튼 라벨을 임의재보험 기준으로 정리 ----
  function relabelToggle() {
    var btn = document.querySelector('.contract-basis-btn[data-basis="outward"]');
    if (btn) btn.textContent = '출재계약 (임의재보험)';
    var btn2 = document.querySelector('.contract-basis-btn[data-basis="inward"]');
    if (btn2) btn2.textContent = '수재계약 (임의재보험 인수)';
  }

  // ---- 4) 임의수재 계약 등록 폼 확장: 경유처/수금상태/유형 연결 ----
  function enrichFacRecords() {
    var S = getState(), D = getDATA(), changed = false;
    var arrs = [];
    if (S && Array.isArray(S.fac)) arrs.push(S.fac);
    if (D && Array.isArray(D.facInward)) arrs.push(D.facInward);
    arrs.forEach(function (arr) {
      arr.forEach(function (f, i) {
        if (!f) return;
        if (f.intermediary == null) { f.intermediary = BROKERS[i % BROKERS.length]; changed = true; }
        if (f.inwardType == null) { f.inwardType = FAC; changed = true; }
        if (f.premiumType == null) { f.premiumType = '수재보험료'; changed = true; }
      });
    });
    if (changed && typeof saveAll === 'function') { try { saveAll(); } catch (e) {} }
  }

  function decorateFacTable() {
    var S = getState(); if (!S) return;
    var rows = document.querySelectorAll('#facTable tbody tr');
    rows.forEach(function (tr) {
      var chk = tr.querySelector('.fac-check'); if (!chk) return;
      var ref = chk.value;
      var f = (S.fac || []).find(function (x) { return x.inwardRef === ref; });
      if (!f || !f.intermediary) return;
      var cells = tr.querySelectorAll('td');
      if (cells.length < 8) return;            // 8컬럼(계약 정보=index 3) 렌더에만 적용
      var infoCell = cells[3];
      if (infoCell && !infoCell.querySelector('.via-tag')) {
        var via = (f.intermediary === '직접 수재') ? '직접 수재' : ('경유: ' + f.intermediary);
        infoCell.insertAdjacentHTML('beforeend', '<br><small class="via-tag" style="color:#7c3aed">' + esc(via) + '</small>');
      }
    });
  }

  function wireFacForm() {
    if (window.__inwardFacWired) return;
    enrichFacRecords();

    var origReg = window.registerFac;
    if (typeof origReg === 'function') {
      window.registerFac = function () {
        var inter = ((q('facIntermediary') && q('facIntermediary').value) || '').trim();
        var recv = ((q('facReceivable') && q('facReceivable').value) || '').trim();
        var before = (getState().fac || []).slice();
        var ret = origReg.apply(this, arguments);
        try {
          var S = getState();
          var rec = (S.fac || []).find(function (r) { return before.indexOf(r) < 0; });
          if (rec) {
            rec.intermediary = inter || '직접 수재';
            rec.inwardType = FAC;
            rec.premiumType = '수재보험료';
            if (recv) rec.receivableStatus = recv;
            if (typeof saveAll === 'function') saveAll();
            if (typeof window.renderFacTable === 'function') window.renderFacTable();
            if (typeof window.renderPPW === 'function') window.renderPPW();
            if (q('facIntermediary')) q('facIntermediary').value = '';
            if (q('facReceivable')) q('facReceivable').value = '미수';
          }
        } catch (e) {}
        return ret;
      };
    }

    var origEdit = window.editFacV50;
    if (typeof origEdit === 'function') {
      window.editFacV50 = function (ref) {
        var ret = origEdit.apply(this, arguments);
        try {
          var f = (getState().fac || []).find(function (x) { return x.inwardRef === ref; });
          if (f) {
            if (q('facIntermediary')) q('facIntermediary').value = f.intermediary || '';
            if (q('facReceivable')) q('facReceivable').value = f.receivableStatus || '미수';
          }
        } catch (e) {}
        return ret;
      };
    }

    var origRenderFac = window.renderFacTable;
    if (typeof origRenderFac === 'function') {
      window.renderFacTable = function () {
        var ret = origRenderFac.apply(this, arguments);
        try { decorateFacTable(); } catch (e) {}
        return ret;
      };
    }

    window.__inwardFacWired = true;
  }

  function apply() {
    limitToFac();
    enrichInward();
    window.renderContractTable = renderContractTablePatched;
    relabelToggle();
    var tab = document.getElementById('contract');
    if (tab && tab.classList.contains('active')) {
      try { renderContractTablePatched(); } catch (e) {}
      if (typeof window.renderPPW === 'function') { try { window.renderPPW(); } catch (e) {} }
    }
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    apply();
    wireFacForm();
    // app.js의 지연 초기화/스위치 래퍼 이후에도 우위 유지
    setTimeout(function () { apply(); wireFacForm(); }, 350);
    setTimeout(function () { window.renderContractTable = renderContractTablePatched; }, 1800);
  });
})();
