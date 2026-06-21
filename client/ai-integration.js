/* ===================================================================
 * ai-integration.js
 * -------------------------------------------------------------------
 * app.js가 모두 로드된 뒤 실행되며, 기존의 "가짜 AI"(정규식/템플릿)
 * 함수들을 실제 Claude(Anthropic) 호출로 교체합니다.
 * app.js 원본은 전혀 수정하지 않습니다.
 *
 * 호출 방식 (config.js의 useDirect로 선택):
 *   - useDirect=true  : 브라우저에서 Claude API 직접 호출 (서버 불필요, 시연용)
 *   - useDirect=false : server.js 백엔드(/api/ai)를 통해 호출 (배포용)
 *
 * 교체 대상:
 *   summarizeSurvey, draftClaimMemo, analyzeSlipOffer,
 *   normalizeIntake, summarizeSelectedDoc, translateSelectedDoc, sendCopilot
 * =================================================================== */
(function () {
  'use strict';

  var CFG = window.GRA_CONFIG || {};
  var ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

  // ---- 작업별 시스템 프롬프트 (클라이언트 보관) ----
  var PROMPTS = {
    survey_summary:
      '당신은 손해보험사 해외수재 클레임 담당자를 보조하는 AI입니다.\n' +
      '주어진 서베이리포트(손해사정/현장조사 보고서) 원문을 읽고, 다음 항목으로 한국어로 간결하게 요약하세요.\n' +
      '① 사고 개요(언제/어디서/무엇이) ② 손상 범위 ③ 추정 사고 원인 ④ 손해액 수치(Paid/Outstanding/추산, 통화 포함) ⑤ 담보·면책 검토 포인트 ⑥ 추가 요청 자료\n' +
      '원문에 없는 내용은 추측하지 말고 "원문에서 확인되지 않음"으로 표기하세요. 결과는 HTML(<br>, <b> 등)로 출력하세요.',
    claim_memo:
      '당신은 손해보험사 해외수재 클레임 담당자를 보조하는 AI입니다.\n' +
      '주어진 클레임/계약/서베이 정보로 내부 보고용 "클레임 처리메모 초안"을 작성하세요.\n' +
      '1) 대상계약(증권번호/피보험자/보험종목) 2) 사고개요(사고일/원인/추산손해액) 3) 담보·면책 확인사항 4) 재보험 검토 필요사항(영향 프로그램/Layer) 5) 출재사에 요청할 자료\n' +
      '실무에서 바로 다듬어 쓸 수 있는 어조로, 과장 없이 작성하세요. 결과는 HTML로 출력하세요.',
    doc_summary:
      '당신은 보험 약관·특약·Treaty 문서를 검토하는 AI입니다.\n' +
      '주어진 문서 원문을 업무 검토용으로 한국어로 요약하세요. 담보조건, 적용범위, 면책/제외(Exclusion), 특약, 적용 한도, 주의 조항 중심으로 핵심만 정리합니다.\n' +
      '원문에 없는 내용은 만들지 마세요. 결과는 HTML로 출력하세요.',
    copilot_chat:
      '당신은 손해보험사 해외수재·재보험 실무자를 돕는 사내 AI 어시스턴트입니다.\n' +
      '계약, 사고, 수재, 재보험(Risk XL / Cat XL / Hours Clause), 약관·특약, 클레임 처리 절차에 대해 정확하고 실무적인 한국어 답변을 제공합니다.\n' +
      '제공된 참고자료가 있으면 우선 근거로 삼고, 근거가 부족하면 추측하지 말고 어떤 자료가 더 필요한지 안내하세요. 결과는 HTML로 출력하세요.',
  };

  var JSON_PROMPTS = {
    slip_extract:
      '당신은 해외수재 오퍼 Slip/이메일에서 핵심 인수조건을 추출하는 AI입니다.\n' +
      '주어진 텍스트에서 아래 필드를 추출해 JSON으로만 응답하세요. 코드블록 표시 없이 순수 JSON만 출력합니다.\n' +
      '{ "insured":"", "country":"", "city":"", "line":"(Package/기술보험/해상적하/배상책임 중 가까운 것)", ' +
      '"tsiEok":가입금액을 억원 단위 정수로(없으면 0), "premiumOriginal":계약통화 보험료 숫자(없으면 0), ' +
      '"currency":"(USD/EUR/JPY/GBP/KRW)", "ppwDate":"YYYY-MM-DD(없으면 빈문자열)", "cedant":"출재사/프론팅사/브로커", ' +
      '"slipSummary":"한 줄 요약", "confidence":0~100 정수, "memo":"확인 필요 메모" }\n' +
      '원문에 없으면 문자열은 "", 숫자는 0. 금액 환산은 보수적으로.',
    intake_normalize:
      '당신은 주재원/브로커 메일을 표준 해외계약 Intake 항목으로 정제하는 AI입니다.\n' +
      '아래 필드를 추출해 JSON으로만 응답하세요. 코드블록 없이 순수 JSON만.\n' +
      '{ "insured":"", "country":"", "city":"", "line":"(재물/특종/해상/기술보험/배상책임/Package 중 가까운 것)", ' +
      '"tsiEok":억원 정수(없으면 0), "premiumOriginal":숫자(없으면 0), "currency":"(USD/KRW/EUR/JPY/GBP)", ' +
      '"partner":"현지 파트너/브로커", "due":"YYYY-MM-DD(없으면 빈문자열)", "lossHistory":"(있음/없음/확인필요)", ' +
      '"lossAmountEok":억원 정수(없으면 0), "lossDesc":"사고내용 요약", "confidence":0~100 정수, "memo":"확인 필요 메모" }\n' +
      '원문에 없으면 문자열은 "", 숫자는 0.',
  };

  function translatePrompt(lang) {
    return lang === 'en'
      ? 'You translate insurance policy/treaty documents. Translate the given text into natural, professional English, preserving insurance terminology. No commentary. Output as HTML with simple tags like <br>.'
      : '당신은 보험 약관·Treaty 문서를 번역하는 AI입니다. 주어진 원문을 자연스럽고 정확한 한국어로 번역하세요. 전문용어를 정확히 옮기고 부연 설명은 달지 마세요. 결과는 <br> 등 간단한 HTML로 출력하세요.';
  }

  // ---- JSON 안전 파싱 ----
  function safeParseJSON(text) {
    var t = String(text || '').trim();
    t = t.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    var s = t.indexOf('{'), e = t.lastIndexOf('}');
    if (s >= 0 && e > s) t = t.slice(s, e + 1);
    return JSON.parse(t);
  }

  // ---- Claude 직접 호출 ----
  function systemForTask(task, extra) {
    if (task === 'doc_translate') return translatePrompt(extra && extra.targetLang === 'en' ? 'en' : 'ko');
    if (JSON_PROMPTS[task]) return JSON_PROMPTS[task] + '\n\n반드시 유효한 JSON 객체 하나만 출력하세요.';
    return PROMPTS[task] || '당신은 보험 실무를 돕는 AI입니다. 한국어로 간결히 답하세요.';
  }

  async function callAnthropicDirect(task, context, extra) {
    var key = CFG.anthropicApiKey || '';
    if (!key || /여기에_Claude_API_키_입력/.test(key)) {
      throw new Error('config.js에 Claude API 키가 설정되지 않았습니다.');
    }
    var res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CFG.model || 'claude-sonnet-4-6',
        max_tokens: 2000,
        temperature: 0.2,
        system: systemForTask(task, extra),
        messages: [{ role: 'user', content: String(context || '').slice(0, 24000) }],
      }),
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      var m = (data && data.error && data.error.message) || ('HTTP ' + res.status);
      throw new Error('Claude API 오류: ' + m);
    }
    var txt = (data.content || []).map(function (b) { return b.text || ''; }).join('').trim();
    if (JSON_PROMPTS[task]) return { json: safeParseJSON(txt) };
    return { text: txt };
  }

  // ---- 백엔드(/api/ai) 호출 ----
  async function callBackend(task, context, extra) {
    var headers = { 'Content-Type': 'application/json' };
    if (window.__APP_TOKEN) headers['x-app-token'] = window.__APP_TOKEN;
    var res = await fetch('/api/ai', {
      method: 'POST', headers: headers,
      body: JSON.stringify(Object.assign({ task: task, context: context }, extra || {})),
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error((data && data.error) || ('AI 호출 실패 (HTTP ' + res.status + ')'));
    return data;
  }

  // ---- 공통 진입점 ----
  async function callAI(task, context, extra) {
    var hasKey = CFG.anthropicApiKey && !/여기에_Claude_API_키_입력/.test(CFG.anthropicApiKey);
    if (CFG.useDirect !== false && hasKey) return callAnthropicDirect(task, context, extra);
    return callBackend(task, context, extra);
  }

  // =================== UI 헬퍼 ===================
  function $(id) { return document.getElementById(id); }
  function setBox(id, html) { var b = $(id); if (b) b.innerHTML = html; }
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmtErr(e) {
    var raw = (e && e.message) ? e.message : '알 수 없는 오류';
    var msg = escapeHtml(raw);
    var hint;
    if (/Failed to fetch|NetworkError|load failed|ERR_/i.test(raw)) {
      hint = '브라우저가 Claude 서버에 연결하지 못했습니다(키 내용 문제가 아닐 가능성이 큽니다). 다음을 확인하세요: '
           + '① 광고차단·보안 확장프로그램을 끄거나 시크릿(인코그니토) 창으로 시도 '
           + '② 파일을 더블클릭이 아니라 http://localhost(Live Server 등)로 열었는지 '
           + '③ 사내망·VPN 등에서 api.anthropic.com 접속이 막혀있지 않은지 '
           + '④ console.anthropic.com에서 키가 유효하고 크레딧 잔액이 있는지';
    } else if (/API 키|x-api-key|401|403|authentication|credit|balance/i.test(raw)) {
      hint = 'config.js의 Claude API 키가 올바른지 확인하세요(공백·줄바꿈 없이 sk-ant- 로 시작). '
           + '키가 유효한데도 실패하면 console.anthropic.com에서 크레딧 잔액을 확인하세요.';
    } else {
      hint = 'config.js의 Claude API 키 설정과 네트워크 상태를 확인하세요. 자세한 원인은 브라우저 개발자도구(F12) → Console/Network 탭에서 볼 수 있습니다.';
    }
    return '<span class="required-warn">AI 처리 중 오류: ' + msg + '</span><br><small>' + hint + '</small>';
  }
  function won(n) { return (typeof eok === 'function') ? eok(n) : (Math.round(Number(n || 0)).toLocaleString() + '억원'); }

  // =================== 기능 오버라이드 ===================

  async function summarizeSurvey() {
    var c = (state.inwardClaims || []).find(function (x) { return x.claimNo === state.selectedIC; });
    if (!c) { alert('먼저 클레임 Queue에서 클레임을 선택하세요.'); return; }
    setBox('surveySummary', '<b>AI 서베이리포트 요약 중...</b><br><small>문서를 읽고 분석하고 있습니다.</small>');
    var extracted = '', fileMsg = '';
    try {
      var file = $('surveyFile') && $('surveyFile').files && $('surveyFile').files[0];
      if (file && typeof extractFileText === 'function') {
        var r = await extractFileText(file);
        extracted = (r && r.text) || ''; fileMsg = (r && r.message) || '';
      }
    } catch (e) {}
    var head =
      '대상 클레임: ' + c.claimNo + ' / 증권번호: ' + (c.policyNo || c.inwardRef || '-') + ' / 피보험자: ' + c.insured + '\n' +
      '사고유형: ' + (c.cause || '-') + ' / Paid: ' + won(c.paidLossEok || 0) + ' / Outstanding: ' + won(c.outstandingLossEok || 0) + ' / 추산: ' + won(c.estimatedLossEok || c.grossLossEok || 0) + '\n' +
      '사고일: ' + (c.claimDate || '-') + ' / 통지일: ' + (c.noticeDate || '-') + '\n';
    var context = extracted
      ? '[클레임 정보]\n' + head + '\n[서베이리포트 원문]\n' + extracted
      : '서베이리포트 원문이 없습니다. 아래 클레임 정보만으로 검토 요약과 추가 요청자료를 정리하세요.\n\n[클레임 정보]\n' + head;
    try {
      var out = await callAI('survey_summary', context);
      setBox('surveySummary', '<b>AI 서베이리포트 요약</b>' + (fileMsg ? '<br><small>' + escapeHtml(fileMsg) + '</small>' : '') + '<br>' + ((out && out.text) || '(빈 응답)'));
      var idx = state.inwardClaims.findIndex(function (x) { return x.claimNo === c.claimNo; });
      if (idx >= 0) {
        state.inwardClaims[idx].surveyStatus = '요약완료';
        state.inwardClaims[idx].surveySummary = ($('surveySummary') || {}).innerText || '';
        if (typeof saveAll === 'function') saveAll();
        if (typeof renderInwardClaims === 'function') renderInwardClaims();
      }
    } catch (e) { setBox('surveySummary', fmtErr(e)); }
  }

  async function draftClaimMemo() {
    var c = (state.inwardClaims || []).find(function (x) { return x.claimNo === state.selectedIC; });
    if (!c) { alert('먼저 클레임을 선택하세요.'); return; }
    setBox('surveySummary', '<b>처리메모 초안 작성 중...</b>');
    var contract = null;
    try { if (typeof findContractByPolicyNo === 'function') contract = findContractByPolicyNo(c.policyNo || c.inwardRef); } catch (e) {}
    var context =
      '다음 해외수재 클레임에 대한 내부 보고용 처리메모 초안을 작성하세요.\n\n' +
      '증권번호: ' + (c.policyNo || c.inwardRef || '-') + '\n피보험자: ' + (c.insured || '-') + '\n' +
      '보험종목: ' + ((contract && contract.line) || c.line || '-') + '\n출재사: ' + (c.cedant || '-') + '\n' +
      '사고유형: ' + (c.cause || '-') + '\n사고일: ' + (c.claimDate || '-') + ' / 통지일: ' + (c.noticeDate || '-') + '\n' +
      'Paid: ' + won(c.paidLossEok || 0) + ' / Outstanding: ' + won(c.outstandingLossEok || 0) + ' / 추산손해액: ' + won(c.estimatedLossEok || c.grossLossEok || 0) + '\n' +
      '담당자: ' + (c.owner || '-') + '\n기존 메모: ' + (c.memo || '없음') + '\n';
    try {
      var out = await callAI('claim_memo', context);
      setBox('surveySummary', '<b>클레임 처리메모 초안</b><br>' + ((out && out.text) || '(빈 응답)'));
    } catch (e) { setBox('surveySummary', fmtErr(e)); }
  }

  async function analyzeSlipOffer() {
    var pasted = (($('slipEmailText') && $('slipEmailText').value) || '').trim();
    var combined = [state.slipOfferText || '', pasted].filter(Boolean).join('\n\n');
    if (!combined) { setBox('slipExtractResult', '<span class="required-warn">Slip 파일을 업로드하거나 이메일 본문을 붙여넣으세요.</span>'); return; }
    setBox('slipExtractResult', '<b>AI 자동추출 중...</b><br><small>핵심 조건을 추출하고 있습니다.</small>');
    try {
      var out = await callAI('slip_extract', combined);
      var j = (out && out.json) || {};
      state.slipExtract = {
        fields: {
          insured: j.insured || '', country: j.country || '', city: j.city || '', line: j.line || '',
          tsiEok: Number(j.tsiEok || 0), premiumOriginal: Number(j.premiumOriginal || 0),
          currency: j.currency || 'USD', ppwDate: j.ppwDate || '', cedant: j.cedant || '',
          slipSummary: j.slipSummary || '', memo: j.memo || '',
        },
        confidence: Math.max(0, Math.min(100, Number(j.confidence || 60))),
        raw: combined,
      };
      if (typeof renderSlipExtractResult === 'function') {
        renderSlipExtractResult();
        var box = $('slipExtractResult');
        if (box) box.insertAdjacentHTML('beforeend', '<div class="extract-note">AI 추출 초안입니다. 원문과 대조 후 등록화면에 반영하세요.</div>');
      }
    } catch (e) { setBox('slipExtractResult', fmtErr(e)); }
  }

  async function normalizeIntake() {
    var raw = (($('rawIntakeText') && $('rawIntakeText').value) || '').trim();
    if (!raw) { setBox('normalizeResult', '메일 본문 또는 Slip 주요조건을 먼저 입력하세요.'); return; }
    var box = $('normalizeResult'); if (box) box.textContent = 'AI 정제 중...';
    function setVal(id, v) { var el = $(id); if (el) el.value = (v == null ? '' : v); }
    try {
      var out = await callAI('intake_normalize', raw);
      var f = (out && out.json) || {};
      setVal('intakeInsured', f.insured); setVal('intakeCountry', f.country); setVal('intakeCity', f.city);
      setVal('intakeLine', f.line || '재물'); setVal('intakeTsi', f.tsiEok || ''); setVal('intakePremiumOriginal', f.premiumOriginal || '');
      setVal('intakeCurrency', f.currency || 'USD'); setVal('intakePartner', f.partner); setVal('intakeDue', f.due);
      setVal('intakeLossHistory', f.lossHistory || '확인필요'); setVal('intakeLossAmount', f.lossAmountEok || 0);
      setVal('intakeLossDesc', f.lossDesc); setVal('intakeMemo', f.memo);
      var conf = Math.max(0, Math.min(100, Number(f.confidence || 60)));
      if (box) box.textContent =
        'AI 정제 완료 · 신뢰도 ' + conf + '%\n피보험자: ' + (f.insured || '확인필요') +
        '\n소재지: ' + (f.country || '확인필요') + ' / ' + (f.city || '확인필요') +
        '\n보험종목: ' + (f.line || '재물') + '\n가입금액: ' + (f.tsiEok ? won(f.tsiEok) : '확인필요') +
        '\n사고이력: ' + (f.lossHistory || '확인필요') + ' / 사고금액: ' + (f.lossAmountEok ? won(f.lossAmountEok) : '확인필요') +
        '\n\n정제 결과를 원문과 대조한 뒤 저장하세요.';
    } catch (e) { if (box) box.innerHTML = fmtErr(e); }
  }

  function selectedDocFor(id) {
    var sel = $(id), docId = sel && sel.value;
    return (state.docs || []).find(function (d) { return d.docId === docId; }) || (state.docs || [])[0];
  }
  function docFullText(d) { return (d && (d.text || d.summary || '')) || ''; }

  async function summarizeSelectedDoc() {
    var d = selectedDocFor('docAiSelect');
    if (!d) { setBox('docAiResult', '먼저 문서를 선택하세요.'); return; }
    setBox('docAiResult', '<b>문서 AI 요약 중...</b>');
    var text = docFullText(d);
    var context = text
      ? '문서명: ' + d.title + '\n구분: ' + (d.type || '-') + '\n키워드: ' + (d.keywords || '-') + '\n\n[원문]\n' + text
      : '문서명: ' + d.title + '\n구분: ' + (d.type || '-') + '\n키워드: ' + (d.keywords || '-') + '\n\n원문 텍스트가 아직 없습니다. 제목/구분/키워드 기반으로 이 문서가 어떤 검토에 쓰이는지, 어떤 항목을 확인해야 하는지 안내하세요.';
    try {
      var out = await callAI('doc_summary', context);
      setBox('docAiResult', '<b>' + escapeHtml(d.title) + ' 요약</b><br>' + ((out && out.text) || '(빈 응답)'));
    } catch (e) { setBox('docAiResult', fmtErr(e)); }
  }

  async function translateSelectedDoc() {
    var d = selectedDocFor('docAiSelect');
    if (!d) { setBox('docAiResult', '먼저 문서를 선택하세요.'); return; }
    var lang = ($('docTranslateLang') && $('docTranslateLang').value) || 'ko';
    var text = docFullText(d);
    if (!text) { setBox('docAiResult', '<span class="required-warn">번역할 원문 텍스트가 없습니다. 텍스트가 추출된 문서를 선택하세요.</span>'); return; }
    setBox('docAiResult', '<b>문서 AI 번역 중...</b>');
    try {
      var out = await callAI('doc_translate', text, { targetLang: lang });
      var title = lang === 'en' ? 'English translation' : '한국어 번역';
      setBox('docAiResult', '<b>' + escapeHtml(d.title) + ' — ' + title + '</b><br>' + ((out && out.text) || '(빈 응답)'));
    } catch (e) { setBox('docAiResult', fmtErr(e)); }
  }

  async function sendCopilot() {
    var input = $('copilotQ'), log = $('chatLog');
    if (!input || !log) return;
    var q = (input.value || '').trim(); if (!q) return;
    state.chat = state.chat || [];
    state.chat.push({ role: 'user', text: escapeHtml(q) });
    input.value = '';
    state.chat.push({ role: 'ai', text: '<span class="muted">생각 중...</span>' });
    renderChat();
    var claims = (state.inwardClaims || []).slice(0, 5).map(function (c) {
      return '- ' + c.claimNo + ' ' + c.insured + ' ' + c.cause + ' 추산 ' + won(c.estimatedLossEok || 0) + ' (' + c.status + ')';
    }).join('\n');
    var docs = (state.docs || []).slice(0, 6).map(function (d) { return '- ' + d.title + ' (' + d.type + ')'; }).join('\n');
    var context = '질문:\n' + q + '\n\n[참고 - 최근 클레임]\n' + (claims || '없음') + '\n\n[참고 - 등록 문서]\n' + (docs || '없음');
    try {
      var out = await callAI('copilot_chat', context);
      state.chat[state.chat.length - 1] = { role: 'ai', text: (out && out.text) || '(빈 응답)' };
    } catch (e) {
      state.chat[state.chat.length - 1] = { role: 'ai', text: fmtErr(e) };
    }
    renderChat();
  }
  function renderChat() {
    var log = $('chatLog'); if (!log) return;
    log.innerHTML = (state.chat || []).map(function (m) { return '<div class="msg ' + m.role + '">' + m.text + '</div>'; }).join('');
    log.scrollTop = log.scrollHeight;
  }

  // ---- 오버라이드 적용 ----
  function applyOverrides() {
    window.summarizeSurvey = summarizeSurvey;
    window.draftClaimMemo = draftClaimMemo;
    window.analyzeSlipOffer = analyzeSlipOffer;
    window.normalizeIntake = normalizeIntake;
    window.summarizeSelectedDoc = summarizeSelectedDoc;
    window.translateSelectedDoc = translateSelectedDoc;
    window.sendCopilot = sendCopilot;
  }
  applyOverrides();
  window.addEventListener('load', function () { setTimeout(applyOverrides, 1500); });

  // 키 설정 여부 안내(콘솔)
  var hasKey = CFG.anthropicApiKey && !/여기에_Claude_API_키_입력/.test(CFG.anthropicApiKey);
  if (CFG.useDirect !== false) {
    if (hasKey) console.log('[GRA] Claude 직접 호출 모드 (model=' + (CFG.model || 'claude-sonnet-4-6') + ')');
    else console.warn('[GRA] config.js에 Claude API 키가 없습니다. public/config.js를 열어 키를 입력하세요.');
  } else {
    console.log('[GRA] 백엔드(/api/ai) 호출 모드');
  }
})();
