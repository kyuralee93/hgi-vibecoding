/* cession-admin.js — 관리자: 기간계 출재계약 데이터 추출(CSV) + 업로드
 * 수재계약 업로드와 대칭. state.cessions(출재계약) 단일 데이터에 반영 → 출재·수재계약 조회(출재) 갱신. */
(function () {
  // [시연] 출재계약 조회는 기본적으로 비어 있고, 관리자 화면의 업로드로만 채워진다.
  // 시드의 출재계약(원본)은 화면에 노출하지 않고, "현재 출재계약 CSV 추출"(마감 양식) 용도로만 보관한다.
  var ORIGINAL_CESSIONS = [];
  try { ORIGINAL_CESSIONS = ((window.__SERVER_DATA__ && window.__SERVER_DATA__.cessions) || (typeof DATA !== 'undefined' && DATA.cessions) || []).slice(); } catch (e) {}
  function clearDefaultCessions() {
    try { if (window.__SERVER_DATA__) window.__SERVER_DATA__.cessions = []; } catch (e) {}
    try { if (typeof DATA !== 'undefined' && DATA) DATA.cessions = []; } catch (e) {}
    try { if (typeof state !== 'undefined' && state && !state.__cessionsUploaded) state.cessions = []; } catch (e) {}
  }
  clearDefaultCessions();
  window.addEventListener('DOMContentLoaded', function () { clearDefaultCessions(); try { if (typeof renderContractTable === 'function') renderContractTable(); } catch (e) {} });

  function cessionsArr() {
    if (typeof state !== 'undefined' && state.cessions && state.cessions.length) return state.cessions;
    return ORIGINAL_CESSIONS;
  }
  var H = ['출재번호', '재보험자', '유형', '원수피보험자', '국가', '도시', '보험종목', '출재가입금액(억원)', '출재보험료(원통화)', '통화', '출재보험료(억원)', 'PPW일', '납입상태', '인수일', '연결증권번호'];
  function toRow(c) { return [c.cessionNo, c.reinsurer, c.type, c.originalInsured, c.country, c.city, c.line, c.cededTsiEok, c.cededPremiumOriginal, c.currency, c.cededPremiumEok, c.ppwDate, c.paymentStatus, c.inceptionDate, c.linkedPolicyNo]; }
  function csvCell(v) { v = (v == null ? '' : String(v)); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

  window.downloadCessionSampleCsv = function () {
    var data = [H].concat(cessionsArr().map(toRow));
    var csv = data.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = '기간계_출재계약_02_Cessions_System.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    var msg = document.getElementById('adminCessionMsg'); if (msg) msg.innerHTML = '<span class="doc-index-ok">현재 출재계약 ' + cessionsArr().length + '건을 CSV로 추출했습니다.</span> 이 양식대로 수정 후 업로드하세요.';
  };

  function pick(r, keys) { for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (r[k] != null && r[k] !== '') return r[k]; } return ''; }
  function mapRow(r) {
    return {
      cessionNo: String(pick(r, ['출재번호', 'cessionNo'])), reinsurer: String(pick(r, ['재보험자', 'reinsurer'])), type: String(pick(r, ['유형', 'type'])),
      originalInsured: String(pick(r, ['원수피보험자', 'originalInsured', '피보험자'])), country: String(pick(r, ['국가', 'country'])), city: String(pick(r, ['도시', 'city'])),
      line: String(pick(r, ['보험종목', 'line'])), cededTsiEok: Number(pick(r, ['출재가입금액(억원)', 'cededTsiEok', '출재가입금액'])) || 0,
      cededPremiumOriginal: Number(pick(r, ['출재보험료(원통화)', 'cededPremiumOriginal'])) || 0, currency: String(pick(r, ['통화', 'currency']) || 'USD'),
      cededPremiumEok: Number(pick(r, ['출재보험료(억원)', 'cededPremiumEok'])) || 0, ppwDate: String(pick(r, ['PPW일', 'ppwDate'])),
      paymentStatus: String(pick(r, ['납입상태', 'paymentStatus'])), inceptionDate: String(pick(r, ['인수일', 'inceptionDate'])),
      linkedPolicyNo: String(pick(r, ['연결증권번호', 'linkedPolicyNo'])), sourceType: '기간계 업로드', sourceSystem: '출재 마감 DB'
    };
  }
  function normKeys(r) { var o = {}; for (var k in r) { if (Object.prototype.hasOwnProperty.call(r, k)) o[String(k).replace(/^﻿/, '').trim()] = r[k]; } return o; }
  function splitCsvLine(line) { var res = [], cur = '', q = false; for (var i = 0; i < line.length; i++) { var ch = line[i]; if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; } else { if (ch === '"') q = true; else if (ch === ',') { res.push(cur); cur = ''; } else cur += ch; } } res.push(cur); return res; }
  function parseCsvText(text) {
    text = text.replace(/^﻿/, '');
    var lines = text.split(/\r\n|\n|\r/).filter(function (l) { return l.length; });
    if (lines.length < 2) return [];
    var hdr = splitCsvLine(lines[0]).map(function (h) { return h.replace(/^﻿/, '').trim(); });
    var out = [];
    for (var i = 1; i < lines.length; i++) { var c = splitCsvLine(lines[i]); var o = {}; hdr.forEach(function (h, j) { o[h] = (c[j] != null ? c[j] : ''); }); out.push(o); }
    return out;
  }
  function parse(file, cb) {
    var rd = new FileReader();
    var isCsv = /\.csv$/i.test(file.name || '');
    rd.onload = function (e) {
      try {
        if (isCsv) { cb(parseCsvText(String(e.target.result))); return; }
        if (typeof XLSX === 'undefined') { cb(null, new Error('스프레드시트 파서가 로드되지 않았습니다.')); return; }
        var wb = XLSX.read(e.target.result, { type: 'binary', cellDates: false });
        var sh = wb.Sheets['02_Cessions_System'] || wb.Sheets[wb.SheetNames[0]];
        cb(XLSX.utils.sheet_to_json(sh, { defval: '', raw: false }).map(normKeys));
      } catch (err) { cb(null, err); }
    };
    if (isCsv) rd.readAsText(file, 'utf-8'); else rd.readAsBinaryString(file);
  }
  window.importSystemCessionsFromFile = function () {
    var fi = document.getElementById('adminCessionFile'), msg = document.getElementById('adminCessionMsg');
    var file = fi && fi.files && fi.files[0];
    if (!file) { if (msg) msg.innerText = 'CSV/엑셀 파일을 선택하세요.'; return; }
    parse(file, function (arr, err) {
      if (err || !arr) { if (msg) msg.innerHTML = '<span class="match-warn">파일을 읽지 못했습니다: ' + ((err && err.message) || '') + '</span>'; return; }
      var rows = arr.map(mapRow).filter(function (c) { return c.cessionNo; });
      if (!rows.length) { if (msg) msg.innerHTML = '<span class="match-warn">유효한 출재계약 행이 없습니다. 헤더(출재번호·재보험자·보험종목 등)를 확인하세요.</span>'; return; }
      if (typeof state !== 'undefined') { state.cessions = rows; state.contractBasis = 'outward'; state.__cessionsUploaded = true; }
      try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
      try { if (typeof renderContractTable === 'function') renderContractTable(); } catch (e) {}
      try { if (typeof renderDashboard === 'function') renderDashboard(); } catch (e) {}
      if (msg) msg.innerHTML = '<span class="doc-index-ok">출재계약 ' + rows.length + '건 업로드 반영 완료</span><br>원천 파일: ' + file.name + ' · [출재·수재계약 조회]에서 <b>출재계약</b> 탭으로 확인하세요.';
    });
  };
})();
