/* =====================================================================
 * v49 고도화 모듈 — 진짜 AI Copilot(Claude API) + E2E 시나리오 투어
 *  - app.js는 건드리지 않고 뒤에서 로드되어 동작을 덧입힙니다(기존 패치 관행).
 *  - Copilot: 화면에서 API 키를 입력하면 실제 포트폴리오 데이터로 자연어 질의응답.
 *             키가 없으면 기존 규칙기반 엔진(buildInsuranceAnswer)으로 자동 폴백.
 *  - 시나리오 투어: Intake→누적위험→사고→재보험 영향→Layer 소진→손익을
 *             하나의 가이드 흐름으로 연결.
 * ===================================================================== */
(function () {
  'use strict';

  const LS_KEY = 'gra_v49_apikey';
  const LS_MODEL = 'gra_v49_model';
  const API_URL = 'https://api.anthropic.com/v1/messages';
  const DEFAULT_MODEL = 'claude-opus-4-8';

  const MODELS = [
    { id: 'claude-opus-4-8', label: 'Opus 4.8 · 정밀' },
    { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 · 균형' },
    { id: 'claude-haiku-4-5', label: 'Haiku 4.5 · 빠름' }
  ];

  // 대화 히스토리(스트리밍 멀티턴). 최근 20개로 제한.
  let conversation = [];

  /* ---------------- 유틸 ---------------- */
  const el = (id) => document.getElementById(id);
  const getKey = () => (localStorage.getItem(LS_KEY) || '').trim();
  const getModel = () => localStorage.getItem(LS_MODEL) || DEFAULT_MODEL;
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------------- 아주 가벼운 Markdown → HTML ---------------- */
  function inline(s) {
    // s는 이미 escape된 상태
    return s
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }
  function mdToHtml(md) {
    const lines = String(md || '').replace(/\r/g, '').split('\n');
    let out = [];
    let i = 0;
    while (i < lines.length) {
      const raw = lines[i];
      const line = escapeHtml(raw);
      // 표: |...| 행 + 다음 줄이 구분선
      if (/^\s*\|.*\|\s*$/.test(raw) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
        const header = raw.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
          i++;
        }
        let t = '<table class="gra49-table"><thead><tr>' +
          header.map(h => `<th>${inline(escapeHtml(h))}</th>`).join('') + '</tr></thead><tbody>';
        t += rows.map(r => '<tr>' + r.map(c => `<td>${inline(escapeHtml(c))}</td>`).join('') + '</tr>').join('');
        t += '</tbody></table>';
        out.push(t);
        continue;
      }
      // 헤더
      const h = raw.match(/^(#{1,4})\s+(.*)$/);
      if (h) { out.push(`<b class="gra49-h">${inline(escapeHtml(h[2]))}</b>`); i++; continue; }
      // 불릿 리스트
      if (/^\s*[-*]\s+/.test(raw)) {
        const items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push('<li>' + inline(escapeHtml(lines[i].replace(/^\s*[-*]\s+/, ''))) + '</li>');
          i++;
        }
        out.push('<ul class="gra49-ul">' + items.join('') + '</ul>');
        continue;
      }
      // 번호 리스트
      if (/^\s*\d+\.\s+/.test(raw)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push('<li>' + inline(escapeHtml(lines[i].replace(/^\s*\d+\.\s+/, ''))) + '</li>');
          i++;
        }
        out.push('<ol class="gra49-ol">' + items.join('') + '</ol>');
        continue;
      }
      if (raw.trim() === '') { i++; continue; }
      out.push('<p>' + inline(line) + '</p>');
      i++;
    }
    return out.join('');
  }

  /* ---------------- 컨텍스트(시스템 프롬프트) 빌드 ---------------- */
  function safeArr(v) { return Array.isArray(v) ? v : []; }
  function buildContext() {
    const D = (typeof DATA !== 'undefined') ? DATA : {};
    const S = (typeof state !== 'undefined') ? state : {};
    const ctx = {};
    try { ctx.기준정보 = D.meta || {}; } catch (e) {}
    try { ctx.환율 = D.fxRates || D.fx || {}; } catch (e) {}

    // 기간계 계약(공식) + 수기 임의수재(fac)
    ctx.계약_기간계 = safeArr(D.contracts).map(c => ({
      증권: c.policyNo, 피보험자: c.insured, 국가: c.country, 도시: c.city,
      종목: c.line, 산업: c.industry, TSI억: c.tsiEok, 보험료억: c.premiumEok,
      손해율: c.lossRatio, 갱신일: c.renewalDate, 상태: c.status
    }));
    ctx.임의수재_수기 = safeArr(S.fac).map(f => ({
      관리번호: f.inwardRef, 피보험자: f.insured, 국가: f.country, 도시: f.city,
      종목: f.line, TSI억: f.tsiEok, 보험료억: f.premiumEok,
      PPW: f.ppwDate, 미수상태: f.receivableStatus, 담당: f.owner
    }));
    ctx.해외계약_Intake = safeArr(S.intake).map(x => ({
      id: x.id, 피보험자: x.insured, 출재사: x.partner, 국가: x.country, 도시: x.city,
      종목: x.line, TSI억: x.tsiEok, 사고이력: x.lossHistory, 단계: x.stage
    }));
    ctx.사고 = safeArr(S.accidents).map(a => ({
      사고번호: a.claimNo, 증권: a.policyNo, 피보험자: a.insured, 국가: a.country,
      원인: a.cause, GrossLoss억: a.grossLossEok, Paid억: a.paidLossEok,
      OS억: a.outstandingLossEok, 상태: a.status
    }));
    ctx.해외수재클레임 = safeArr(S.inwardClaims).map(c => ({
      사고번호: c.claimNo, 수재참조: c.inwardRef, 피보험자: c.insured,
      원인: c.cause, Paid억: c.paidLossEok, OS억: c.outstandingLossEok, 상태: c.status
    }));
    ctx.재보험_Treaty = safeArr(D.treaties).map(t => ({
      프로그램: t.name, 종류: t.type,
      Layer: safeArr(t.layers).map(l => ({
        layer: l.layer, retention억: l.retentionEok || l.attachmentEok,
        한도억: l.limitEok, 복원: l.reinstatements
      }))
    }));
    ctx.Layer_소진 = safeArr(S.layers).map(l => ({
      프로그램: l.treatyName, layer: l.layer, 기본한도억: l.baseLimitEok,
      복원한도억: l.reinstatedLimitEok, Paid사용억: l.paidUsedEok, OS사용억: l.outstandingUsedEok
    }));
    ctx.문서 = safeArr(S.docs.length ? S.docs : D.docs).map(d => ({ 제목: d.title, 종류: d.type }));
    try {
      ctx.마감기준 = (S.closeMeta && S.closeMeta.basis) || 'operational';
      ctx.마감월 = (S.closeMeta && S.closeMeta.closeMonth) || '';
    } catch (e) {}
    return ctx;
  }

  function buildSystemPrompt() {
    let json = '{}';
    try { json = JSON.stringify(buildContext()); } catch (e) {}
    return [
      "당신은 '글로벌 리스크 아틀라스(GRA)'의 AI Copilot입니다.",
      "보험사 글로벌사업부의 해외계약·재보험 리스크 관리 실무자를 돕는 분석 어시스턴트입니다.",
      "",
      "아래 <data>는 현재 이 시스템(브라우저)에 적재된 실제 포트폴리오 데이터입니다.",
      "모든 답변은 반드시 이 데이터에 근거해야 합니다.",
      "",
      "규칙:",
      "- 한국어로 답합니다.",
      "- 데이터에 근거해 구체적인 숫자/증권번호/지역/Treaty명을 인용합니다.",
      "- 금액 단위는 '억원'입니다(필드명 ...억). TSI는 가입금액입니다.",
      "- 표로 보여주는 편이 좋은 경우 마크다운 표를 사용합니다.",
      "- 데이터에 없는 내용은 추측하지 말고, 어떤 메뉴에서 등록/확인하는지 안내합니다.",
      "  (메뉴: 계약조회, 해외계약 Intake, 소재지 누적위험, 임의수재 계약관리,",
      "   사고데이터 관리, 해외수재 클레임, 재보험 프로그램, 사고·재보험 영향분석,",
      "   Layer 소진 관리, 복원보험료 계산, 손익·PML 분석, 약관·특약 문서관리)",
      "- 재보험 회수 검토 시 순서: 사고원인/담보·면책 → Gross에서 자기부담/면책 차감 →",
      "  Retention 초과분 → 해당 Treaty Layer 회수 → Layer 소진 반영.",
      "- 간결하게, 실무자가 바로 행동할 수 있도록 답합니다.",
      "",
      "<data>",
      json,
      "</data>"
    ].join('\n');
  }

  /* ---------------- Claude API 스트리밍 호출 ---------------- */
  async function callClaude(messages, onDelta) {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': getKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: getModel(),
        max_tokens: 2048,
        stream: true,
        system: [{ type: 'text', text: buildSystemPrompt(), cache_control: { type: 'ephemeral' } }],
        messages: messages
      })
    });
    if (!resp.ok || !resp.body) {
      let detail = '';
      try { detail = await resp.text(); } catch (e) {}
      throw new Error('HTTP ' + resp.status + (detail ? ' · ' + detail.slice(0, 300) : ''));
    }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '', full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const ev = JSON.parse(data);
          if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
            full += ev.delta.text;
            onDelta(full);
          } else if (ev.type === 'error') {
            throw new Error((ev.error && ev.error.message) || '스트림 오류');
          }
        } catch (e) { /* keep-alive 등 무시 */ }
      }
    }
    return full;
  }

  /* ---------------- Copilot UI ---------------- */
  function buildCopilotUI() {
    const sec = el('copilot');
    if (!sec) return;
    const model = getModel();
    const hasKey = !!getKey();
    sec.innerHTML = `
      <div class="panel gra49-panel">
        <div class="gra49-head">
          <h3>AI Copilot <span id="gra49Badge" class="gra49-badge ${hasKey ? 'on' : 'off'}">${hasKey ? '실시간 AI' : '오프라인 데모'}</span></h3>
          <p class="muted">계약·사고·수재·재보험·약관 데이터를 자연어로 질의합니다. API 키를 입력하면 실제 포트폴리오 데이터로 Claude가 답합니다.</p>
        </div>

        <details class="gra49-settings" ${hasKey ? '' : 'open'}>
          <summary>🔑 API 설정 ${hasKey ? '(연결됨)' : '(키 입력 필요)'}</summary>
          <div class="gra49-settings-body">
            <label>Anthropic API Key
              <input id="gra49Key" type="password" placeholder="sk-ant-..." value="${getKey()}" autocomplete="off"/>
            </label>
            <label>모델
              <select id="gra49Model">
                ${MODELS.map(m => `<option value="${m.id}" ${m.id === model ? 'selected' : ''}>${m.label}</option>`).join('')}
              </select>
            </label>
            <div class="gra49-settings-actions">
              <button id="gra49Save" class="save-btn">저장</button>
              <button id="gra49Clear" class="secondary-btn">키 삭제</button>
              <span id="gra49SaveMsg" class="gra49-savemsg"></span>
            </div>
            <p class="gra49-hint">키는 이 브라우저 localStorage에만 저장되며 서버로 전송되지 않습니다(요청은 브라우저→Anthropic 직접). 데모/PoC 용도입니다.</p>
          </div>
        </details>

        <div id="gra49Log" class="gra49-log"></div>

        <div class="gra49-chips" id="gra49Chips"></div>

        <div class="gra49-inputrow">
          <textarea id="gra49Input" rows="2" placeholder="예: 인도 지역 누적 TSI가 가장 큰 계약 3건과 손해율을 표로 보여줘 (Ctrl+Enter 전송)"></textarea>
          <button id="gra49Send" class="save-btn">전송</button>
        </div>
      </div>`;

    // 빠른 질문 칩
    const chips = [
      '갱신 임박(30일 이내) 계약 중 손해율 60% 넘는 건을 표로',
      '소재지별 누적 TSI 상위 3개 지역은?',
      '최근 사고 중 Gross 손해액 큰 상위 3건',
      '현재 소진율이 가장 높은 Layer는?',
      'PPW 임박/미수 우선점검 대상 요약'
    ];
    el('gra49Chips').innerHTML = chips.map(c => `<button class="gra49-chip">${escapeHtml(c)}</button>`).join('');
    el('gra49Chips').querySelectorAll('.gra49-chip').forEach(b => {
      b.addEventListener('click', () => { el('gra49Input').value = b.textContent; send(); });
    });

    el('gra49Save').addEventListener('click', () => {
      localStorage.setItem(LS_KEY, (el('gra49Key').value || '').trim());
      localStorage.setItem(LS_MODEL, el('gra49Model').value);
      const msg = el('gra49SaveMsg'); msg.textContent = '저장되었습니다.';
      setTimeout(() => { msg.textContent = ''; }, 2000);
      refreshBadge();
    });
    el('gra49Clear').addEventListener('click', () => {
      localStorage.removeItem(LS_KEY); el('gra49Key').value = '';
      refreshBadge();
    });
    el('gra49Send').addEventListener('click', send);
    el('gra49Input').addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); send(); }
    });

    renderLog();
  }

  function refreshBadge() {
    const badge = el('gra49Badge');
    if (!badge) return;
    const on = !!getKey();
    badge.textContent = on ? '실시간 AI' : '오프라인 데모';
    badge.className = 'gra49-badge ' + (on ? 'on' : 'off');
  }

  function renderLog() {
    const log = el('gra49Log');
    if (!log) return;
    if (!conversation.length) {
      log.innerHTML = `<div class="gra49-msg ai"><div class="gra49-bubble">안녕하세요. GRA Copilot입니다. 계약·사고·수재·재보험·약관에 대해 물어보세요.<br>위 칩을 누르거나 직접 질문을 입력하면 됩니다. ${getKey() ? '' : '<b>API 키를 입력하면 실제 데이터로 답합니다.</b>'}</div></div>`;
      return;
    }
    log.innerHTML = conversation.map(m =>
      `<div class="gra49-msg ${m.role === 'user' ? 'user' : 'ai'}"><div class="gra49-bubble">${m.role === 'user' ? escapeHtml(m.content) : mdToHtml(m.content)}</div></div>`
    ).join('');
    scrollLog();
  }
  function scrollLog() { const l = el('gra49Log'); if (l) l.scrollTop = l.scrollHeight; }

  function appendBubble(role, html) {
    const log = el('gra49Log');
    if (!log) return null;
    if (conversation.length === 0 && log.querySelector('.gra49-msg.ai')) log.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'gra49-msg ' + (role === 'user' ? 'user' : 'ai');
    wrap.innerHTML = `<div class="gra49-bubble">${html}</div>`;
    log.appendChild(wrap);
    scrollLog();
    return wrap.querySelector('.gra49-bubble');
  }

  async function send() {
    const input = el('gra49Input');
    const q = (input.value || '').trim();
    if (!q) return;
    input.value = '';
    appendBubble('user', escapeHtml(q));

    // 키 없으면 기존 규칙기반 엔진으로 폴백
    if (!getKey()) {
      let html;
      try {
        html = (typeof window.buildInsuranceAnswer === 'function')
          ? window.buildInsuranceAnswer(q)
          : '규칙 기반 엔진을 찾을 수 없습니다.';
      } catch (e) { html = '오류: ' + escapeHtml(e.message); }
      appendBubble('ai', html + '<div class="gra49-note">⚠ 오프라인 데모 답변(규칙 기반)입니다. 상단 [API 설정]에 키를 입력하면 실시간 AI가 실제 데이터로 답합니다.</div>');
      return;
    }

    conversation.push({ role: 'user', content: q });
    if (conversation.length > 20) conversation = conversation.slice(-20);
    const bubble = appendBubble('ai', '<span class="gra49-typing">생각 중…</span>');
    try {
      const full = await callClaude(conversation, (txt) => { bubble.innerHTML = mdToHtml(txt); scrollLog(); });
      bubble.innerHTML = mdToHtml(full);
      conversation.push({ role: 'assistant', content: full });
    } catch (e) {
      bubble.innerHTML = `<span class="gra49-err">호출 실패: ${escapeHtml(e.message)}</span>` +
        `<div class="gra49-note">키가 올바른지, 잔액/권한이 있는지 확인하세요. CORS 오류라면 브라우저 직접 호출이 차단된 환경일 수 있습니다.</div>`;
    }
  }

  // 투어 등에서 호출: Copilot 탭으로 이동 후 자동 질문
  window.gra49Ask = function (text) {
    if (typeof window.switchTab === 'function') window.switchTab('copilot');
    setTimeout(() => {
      const input = el('gra49Input');
      if (input) { input.value = text; send(); }
    }, 120);
  };

  /* ---------------- E2E 시나리오 투어 ---------------- */
  const TOUR = [
    {
      tab: 'intake', title: '① 해외계약 Intake',
      body: '브로커가 보낸 <b>메일/Slip 원문</b>을 붙여넣으면 피보험자·소재지·TSI·보험료 등을 자동 정제해 표준 Intake로 등록합니다. 재입력 없이 임의수재 등록폼으로 바로 전송됩니다.',
      ask: '현재 Intake에 등록된 건수와 주요 출재사, 단계 분포를 요약해줘'
    },
    {
      tab: 'location', title: '② 소재지 누적위험',
      body: '등록된 계약들을 <b>지도 위 소재지별로 누적</b>해 위험 집중을 시각화합니다. 한 지역에 가입금액(TSI)이 몰리면 단일 사고의 잠재 손실이 커집니다.',
      ask: '소재지(국가)별 누적 TSI 상위 3개 지역과 대표 피보험자를 표로 보여줘'
    },
    {
      tab: 'accident', title: '③ 사고 발생',
      body: '사고가 발생하면 <b>사고데이터</b>로 Gross/Paid/Outstanding을 구분해 관리합니다. 메일·파일 업로드로 사고이력을 일괄 반영할 수 있습니다.',
      ask: '등록된 사고 중 Gross 손해액이 큰 상위 3건을 원인과 함께 보여줘'
    },
    {
      tab: 'impact', title: '④ 사고·재보험 영향분석',
      body: '사고가 <b>어떤 Treaty의 어느 Layer</b>에 닿는지 분석합니다. Retention 초과분부터 Layer별 회수액을 시뮬레이션합니다.',
      ask: '가장 큰 사고가 어떤 재보험 Treaty의 어느 Layer에 영향을 주는지, Retention 초과분과 회수 흐름을 분석해줘'
    },
    {
      tab: 'layer', title: '⑤ Layer 소진 관리',
      body: '회수가 발생하면 해당 <b>Layer의 소진율(Paid+OS / 한도)</b>을 추적합니다. 소진이 높아지면 복원보험료와 잔여 담보를 점검해야 합니다.',
      ask: '현재 소진율이 가장 높은 Layer 상위 3개를 소진율과 함께 알려줘'
    },
    {
      tab: 'pnl', title: '⑥ 손익·PML 분석',
      body: '마지막으로 사고·재보험 효과를 반영한 <b>손익과 최대예상손실(PML)</b>을 봅니다. 손해율이 높은 계약이 포트폴리오 손익을 끌어내립니다.',
      ask: '손해율이 높은 계약 위주로 포트폴리오 손익 영향을 요약해줘'
    }
  ];
  let tourIdx = 0;

  function buildTourDom() {
    if (el('gra49TourBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'gra49TourBtn';
    btn.className = 'gra49-tour-btn';
    btn.innerHTML = '🎬 시나리오 투어';
    btn.addEventListener('click', () => openTour(0));
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'gra49TourPanel';
    panel.className = 'gra49-tour-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="gra49-tour-head">
        <span id="gra49TourStep" class="gra49-tour-step"></span>
        <button id="gra49TourClose" class="gra49-tour-x">✕</button>
      </div>
      <div id="gra49TourTitle" class="gra49-tour-title"></div>
      <div id="gra49TourBody" class="gra49-tour-body"></div>
      <div id="gra49TourDots" class="gra49-tour-dots"></div>
      <div class="gra49-tour-actions">
        <button id="gra49TourPrev" class="secondary-btn">이전</button>
        <button id="gra49TourAsk" class="gra49-tour-ask">🤖 AI에게 물어보기</button>
        <button id="gra49TourNext" class="save-btn">다음</button>
      </div>`;
    document.body.appendChild(panel);

    el('gra49TourClose').addEventListener('click', closeTour);
    el('gra49TourPrev').addEventListener('click', () => openTour(tourIdx - 1));
    el('gra49TourNext').addEventListener('click', () => {
      if (tourIdx >= TOUR.length - 1) closeTour();
      else openTour(tourIdx + 1);
    });
    el('gra49TourAsk').addEventListener('click', () => {
      const step = TOUR[tourIdx];
      closeTour();
      window.gra49Ask(step.ask);
    });
  }

  function openTour(idx) {
    tourIdx = Math.max(0, Math.min(TOUR.length - 1, idx));
    const step = TOUR[tourIdx];
    if (typeof window.switchTab === 'function') {
      try { window.switchTab(step.tab); } catch (e) {}
    }
    el('gra49TourPanel').style.display = 'block';
    el('gra49TourStep').textContent = `시나리오 ${tourIdx + 1} / ${TOUR.length}`;
    el('gra49TourTitle').textContent = step.title;
    el('gra49TourBody').innerHTML = step.body;
    el('gra49TourDots').innerHTML = TOUR.map((_, i) =>
      `<span class="gra49-dot ${i === tourIdx ? 'on' : ''}"></span>`).join('');
    el('gra49TourPrev').disabled = tourIdx === 0;
    el('gra49TourNext').textContent = tourIdx === TOUR.length - 1 ? '완료' : '다음';
  }
  function closeTour() { const p = el('gra49TourPanel'); if (p) p.style.display = 'none'; }

  /* ---------------- 스타일 ---------------- */
  function injectStyles() {
    if (el('gra49Style')) return;
    const css = `
    .gra49-panel{display:flex;flex-direction:column;gap:12px}
    .gra49-head h3{display:flex;align-items:center;gap:10px;margin:0 0 4px}
    .gra49-badge{font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px}
    .gra49-badge.on{background:#dcfce7;color:#166534}
    .gra49-badge.off{background:#fef3c7;color:#92400e}
    .gra49-settings{border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}
    .gra49-settings summary{cursor:pointer;padding:10px 14px;font-weight:600;font-size:13px;color:#334155}
    .gra49-settings-body{padding:0 14px 14px;display:flex;flex-direction:column;gap:10px}
    .gra49-settings-body label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#475569;font-weight:600}
    .gra49-settings-body input,.gra49-settings-body select{padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px}
    .gra49-settings-actions{display:flex;align-items:center;gap:8px}
    .gra49-savemsg{font-size:12px;color:#166534}
    .gra49-hint{font-size:11px;color:#94a3b8;margin:0}
    .gra49-log{min-height:220px;max-height:48vh;overflow-y:auto;border:1px solid #e2e8f0;border-radius:10px;padding:14px;background:#fff;display:flex;flex-direction:column;gap:12px}
    .gra49-msg{display:flex}
    .gra49-msg.user{justify-content:flex-end}
    .gra49-msg.ai{justify-content:flex-start}
    .gra49-bubble{max-width:88%;padding:11px 14px;border-radius:14px;font-size:13.5px;line-height:1.6;word-break:break-word}
    .gra49-msg.user .gra49-bubble{background:#2563eb;color:#fff;border-bottom-right-radius:4px}
    .gra49-msg.ai .gra49-bubble{background:#f1f5f9;color:#1e293b;border-bottom-left-radius:4px}
    .gra49-bubble p{margin:0 0 7px}
    .gra49-bubble p:last-child{margin-bottom:0}
    .gra49-bubble .gra49-h{display:block;margin:8px 0 4px;font-size:13.5px}
    .gra49-bubble code{background:rgba(100,116,139,.18);padding:1px 5px;border-radius:5px;font-size:12px}
    .gra49-bubble .gra49-ul,.gra49-bubble .gra49-ol{margin:4px 0 8px;padding-left:20px}
    .gra49-table{border-collapse:collapse;width:100%;margin:6px 0;font-size:12.5px}
    .gra49-table th,.gra49-table td{border:1px solid #cbd5e1;padding:5px 8px;text-align:left}
    .gra49-table th{background:#e2e8f0;font-weight:700}
    .gra49-note{margin-top:8px;font-size:11.5px;color:#b45309;background:#fffbeb;border-radius:8px;padding:6px 9px}
    .gra49-err{color:#dc2626;font-weight:600}
    .gra49-typing{color:#64748b;font-style:italic}
    .gra49-chips{display:flex;flex-wrap:wrap;gap:7px}
    .gra49-chip{font-size:12px;padding:6px 11px;border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#334155;cursor:pointer}
    .gra49-chip:hover{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
    .gra49-inputrow{display:flex;gap:8px;align-items:flex-end}
    .gra49-inputrow textarea{flex:1;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:13.5px;resize:vertical;font-family:inherit}
    .gra49-inputrow .save-btn{height:44px;padding:0 20px}

    .gra49-tour-btn{position:fixed;right:22px;bottom:22px;z-index:9000;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:none;border-radius:999px;padding:12px 18px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(79,70,229,.4)}
    .gra49-tour-btn:hover{transform:translateY(-2px)}
    .gra49-tour-panel{position:fixed;right:22px;bottom:78px;z-index:9001;width:340px;max-width:calc(100vw - 44px);background:#fff;border-radius:16px;box-shadow:0 18px 50px rgba(15,23,42,.28);border:1px solid #e2e8f0;padding:16px;animation:gra49pop .18s ease}
    @keyframes gra49pop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    .gra49-tour-head{display:flex;justify-content:space-between;align-items:center}
    .gra49-tour-step{font-size:11px;font-weight:700;color:#7c3aed;letter-spacing:.04em}
    .gra49-tour-x{background:none;border:none;font-size:15px;color:#94a3b8;cursor:pointer}
    .gra49-tour-title{font-size:16px;font-weight:800;color:#1e293b;margin:6px 0 8px}
    .gra49-tour-body{font-size:13px;line-height:1.65;color:#475569}
    .gra49-tour-dots{display:flex;gap:6px;margin:14px 0}
    .gra49-dot{width:8px;height:8px;border-radius:50%;background:#e2e8f0}
    .gra49-dot.on{background:#7c3aed;width:20px;border-radius:5px}
    .gra49-tour-actions{display:flex;gap:8px;align-items:center}
    .gra49-tour-actions button{font-size:12.5px;padding:8px 12px;border-radius:9px;cursor:pointer;border:none}
    .gra49-tour-actions .secondary-btn{background:#f1f5f9;color:#475569}
    .gra49-tour-ask{flex:1;background:#ede9fe;color:#6d28d9;font-weight:700}
    .gra49-tour-actions .save-btn{background:#7c3aed;color:#fff}
    `;
    const style = document.createElement('style');
    style.id = 'gra49Style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ---------------- 초기화 ---------------- */
  function init() {
    injectStyles();
    buildCopilotUI();
    buildTourDom();
    // 사이드바 메뉴를 눌러 Copilot 탭으로 올 때 UI가 보장되도록 보강
    document.querySelectorAll('nav button[data-tab="copilot"]').forEach(b => {
      b.addEventListener('click', () => { if (!el('gra49Log')) buildCopilotUI(); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


/* =====================================================================
 * v50: 사이드바 아코디언 + 대시보드 재구성
 * ===================================================================== */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const setText = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  const num = (v) => Number(v || 0);
  function dd(dateStr) {
    try { if (typeof dayDiff === 'function') return dayDiff(dateStr); } catch (e) {}
    if (!dateStr) return 9999;
    const t = new Date(dateStr).getTime();
    if (isNaN(t)) return 9999;
    return Math.round((t - Date.now()) / 86400000);
  }
  function eokFmt(v) {
    try { if (typeof eok === 'function') return eok(v); } catch (e) {}
    return Math.round(num(v)).toLocaleString() + '억원';
  }

  /* ---------- 아코디언 ---------- */
  function openGroup(group) { if (group) group.classList.add('open'); }
  function setupNav() {
    $$('.nav-group-head').forEach(head => {
      head.addEventListener('click', () => head.parentElement.classList.toggle('open'));
    });
    // 하위 메뉴 클릭 시 소속 그룹 자동 펼침(app.js가 switchTab은 이미 연결)
    $$('nav .nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const g = item.closest('.nav-group');
        if (g) openGroup(g);
      });
    });
    // 첫 진입 시 '해외계약 관리' 그룹을 펼쳐 둠
    const first = $('.nav-group');
    if (first && !first.querySelector('.nav-item.top')) openGroup(first);
    // 현재 활성 탭이 속한 그룹 펼침
    const active = $('nav .nav-item.active');
    if (active) { const g = active.closest('.nav-group'); if (g) openGroup(g); }
  }

  /* ---------- 대시보드 ---------- */
  function activeContracts() {
    try { if (typeof allContracts === 'function') return allContracts(); } catch (e) {}
    return (typeof DATA !== 'undefined' && DATA.contracts) ? DATA.contracts : [];
  }
  function renderLayerBars() {
    const box = document.getElementById('dashboardLayerBars');
    if (!box) return;
    const layers = (typeof state !== 'undefined' && state.layers) ? state.layers : [];
    if (!layers.length) { box.innerHTML = '<p class="muted" style="display:block">등록된 Layer 소진 데이터가 없습니다.</p>'; return; }
    box.innerHTML = layers.slice(0, 8).map(l => {
      const limit = Math.max(1, num(l.baseLimitEok) + num(l.reinstatedLimitEok));
      const burn = (num(l.paidUsedEok) + num(l.outstandingUsedEok)) / limit * 100;
      return `<div class="layer-row"><b>${l.treatyName} / ${l.layer}</b><br>` +
        `Paid ${eokFmt(l.paidUsedEok)} + OS ${eokFmt(l.outstandingUsedEok)} / 한도 ${eokFmt(num(l.baseLimitEok) + num(l.reinstatedLimitEok))}` +
        `<div class="track"><span style="width:${Math.min(100, burn)}%"></span></div></div>`;
    }).join('');
  }

  function buildTasks() {
    const S = (typeof state !== 'undefined') ? state : {};
    const fac = Array.isArray(S.fac) ? S.fac : [];
    const claims = Array.isArray(S.inwardClaims) ? S.inwardClaims : [];
    const tasks = [];

    // 1) PPW 미수/도래
    let ppw = [];
    try { if (typeof ppwRows === 'function') ppw = ppwRows(); } catch (e) {}
    ppw.forEach(f => {
      const overdue = f.receivableStatus && f.receivableStatus !== '정상';
      const d = dd(f.ppwDate);
      tasks.push({
        weight: overdue ? 0 : 1, dday: d, tag: 'PPW', cls: 'ppw', tab: 'intake',
        title: `PPW ${overdue ? '미수 회수' : '도래 점검'} — ${f.insured || '-'}`,
        meta: `${f.inwardRef || ''} · PPW ${f.ppwDate || '-'} · ${f.receivableStatus || ''}`
      });
    });

    // 2) 수재 중 기간계 미반영
    fac.filter(f => f.closeStatus !== '대사완료' && !f.policyNoLinked).forEach(f => {
      tasks.push({
        weight: 2, dday: 50, tag: '수재', cls: 'intake', tab: 'intake',
        title: `기간계 미반영 수재 등록 — ${f.insured || '-'}`,
        meta: `${f.inwardRef || ''} · ${f.country || ''} ${f.city || ''} · ${f.line || ''}`
      });
    });

    // 3) Claim Survey 진행중
    claims.filter(c => {
      const st = c.status || '';
      return st && !/완결|종결|완료|closed/i.test(st);
    }).forEach(c => {
      tasks.push({
        weight: 2, dday: 60, tag: 'Claim', cls: 'claim', tab: 'inwardClaim',
        title: `Survey 진행 점검 — ${c.insured || '-'}`,
        meta: `${c.claimNo || ''} · ${c.cause || ''} · ${c.status || ''}`
      });
    });

    // 4) 30일 이내 갱신 도래
    let renew = [];
    try { if (typeof renewRows === 'function') renew = renewRows(); } catch (e) {}
    renew.forEach(c => {
      tasks.push({
        weight: 3, dday: dd(c.renewalDate), tag: '갱신', cls: 'renew', tab: 'contract',
        title: `갱신 도래 계약 검토 — ${c.insured || '-'}`,
        meta: `${c.policyNo || ''} · ${c.country || ''} · 만기 ${c.renewalDate || '-'}`
      });
    });

    tasks.sort((a, b) => (a.weight - b.weight) || (a.dday - b.dday));
    return tasks;
  }

  function renderMyTasks() {
    const box = document.getElementById('myTasks');
    if (!box) return;
    const tasks = buildTasks().slice(0, 12);
    if (!tasks.length) { box.innerHTML = '<div class="todo-empty">처리할 우선 업무가 없습니다. 👍</div>'; return; }
    box.innerHTML = tasks.map((t, i) => {
      const urgent = t.dday <= 7;
      const ddText = t.dday >= 9000 ? '' : (t.dday >= 0 ? `D-${t.dday}` : `D+${-t.dday}`);
      return `<div class="todo-item" onclick="switchTab('${t.tab}')">` +
        `<div class="todo-rank">${i + 1}</div>` +
        `<span class="todo-tag ${t.cls}">${t.tag}</span>` +
        `<div class="todo-main"><div class="todo-title">${t.title}</div><div class="todo-meta">${t.meta}</div></div>` +
        `<div class="todo-dday ${urgent ? 'urgent' : ''}">${ddText}</div></div>`;
    }).join('');
  }

  function renderDashboardV50() {
    try { if (typeof setMetaText === 'function') setMetaText(); } catch (e) {}
    const S = (typeof state !== 'undefined') ? state : {};
    const contracts = activeContracts();
    const fac = Array.isArray(S.fac) ? S.fac : [];
    const accidents = Array.isArray(S.accidents) ? S.accidents : [];

    const premium = contracts.reduce((s, c) => s + num(c.premiumEok), 0);
    setText('d_premium', Math.round(premium).toLocaleString() + '억원');
    setText('d_contracts', contracts.length.toLocaleString() + '건');

    let renewN = 0;
    try { if (typeof renewRows === 'function') renewN = renewRows().length; } catch (e) {}
    setText('d_renew', renewN + '건');

    const unreflected = fac.filter(f => f.closeStatus !== '대사완료' && !f.policyNoLinked).length;
    setText('d_unreflected', unreflected + '건');

    const paid = accidents.reduce((s, a) => s + num(a.paidLossEok != null ? a.paidLossEok : a.grossLossEok), 0);
    setText('d_paid', Math.round(paid).toLocaleString() + '억원');

    renderLayerBars();
    renderMyTasks();
  }

  function init() {
    setupNav();
    // app.js의 renderDashboard를 v50 버전으로 교체(switchTab에서도 이 함수가 호출됨)
    window.renderDashboard = renderDashboardV50;
    try { renderDashboardV50(); } catch (e) { /* 데이터 준비 전이면 무시 */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
