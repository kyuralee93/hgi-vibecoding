// Claude(Anthropic) 연동 — gra 프로토타입의 task 기반 /api/ai 라우터를 서버로 이식.
// 클라이언트(ai-integration.js)는 useDirect=false 일 때 { task, context, targetLang }을
// POST /api/ai 로 보내고, 여기서 작업별 시스템 프롬프트로 Claude를 호출한다.
// API 키는 환경변수 ANTHROPIC_API_KEY 로만 주입(코드/프론트에 하드코딩 금지).

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.ANTHROPIC_MODEL || process.env.AI_MODEL || 'claude-sonnet-4-6';

function enabled() { return !!process.env.ANTHROPIC_API_KEY; }

// 텍스트 생성형 작업
const SYSTEM_PROMPTS = {
  survey_summary: `당신은 손해보험사 해외수재 클레임 담당자를 보조하는 AI입니다.
주어진 서베이리포트(손해사정/현장조사 보고서) 원문을 읽고, 다음 항목으로 한국어로 간결하게 요약하세요.
① 사고 개요(언제/어디서/무엇이) ② 손상 범위 ③ 추정 사고 원인 ④ 손해액 수치(Paid/Outstanding/추산, 통화 포함) ⑤ 담보·면책 검토 포인트 ⑥ 추가 요청 자료
원문에 없는 내용은 추측하지 말고 "원문에서 확인되지 않음"으로 표기하세요. 결과는 HTML(<br>, <b> 등)로 출력하세요.`,
  claim_memo: `당신은 손해보험사 해외수재 클레임 담당자를 보조하는 AI입니다.
주어진 클레임/계약/서베이 정보로 내부 보고용 "클레임 처리메모 초안"을 작성하세요.
1) 대상계약(증권번호/피보험자/보험종목) 2) 사고개요(사고일/원인/추산손해액) 3) 담보·면책 확인사항 4) 재보험 검토 필요사항(영향 프로그램/Layer) 5) 출재사에 요청할 자료
실무에서 바로 다듬어 쓸 수 있는 어조로, 과장 없이 작성하세요. 결과는 HTML로 출력하세요.`,
  doc_summary: `당신은 보험 약관·특약·Treaty 문서를 검토하는 AI입니다.
주어진 문서 원문을 업무 검토용으로 한국어로 요약하세요. 담보조건, 적용범위, 면책/제외(Exclusion), 특약, 적용 한도, 주의 조항 중심으로 핵심만 정리합니다.
원문에 없는 내용은 만들지 마세요. 결과는 HTML로 출력하세요.`,
  copilot_chat: `당신은 손해보험사 해외수재·재보험 실무자를 돕는 사내 AI 어시스턴트입니다.
계약, 사고, 수재, 재보험(Risk XL / Cat XL / Hours Clause), 약관·특약, 클레임 처리 절차에 대해 정확하고 실무적인 한국어 답변을 제공합니다.
제공된 참고자료가 있으면 우선 근거로 삼고, 근거가 부족하면 추측하지 말고 어떤 자료가 더 필요한지 안내하세요. 결과는 HTML로 출력하세요.`,
};

// JSON 추출형 작업
const JSON_PROMPTS = {
  slip_extract: `당신은 해외수재 오퍼 Slip/이메일에서 핵심 인수조건을 추출하는 AI입니다.
주어진 텍스트에서 아래 필드를 추출해 JSON으로만 응답하세요. 코드블록 없이 순수 JSON만 출력합니다.
{ "insured":"", "country":"", "city":"", "line":"(Package/기술보험/해상적하/배상책임 중 가까운 것)", "tsiEok":가입금액 억원 정수(없으면 0), "premiumOriginal":계약통화 보험료 숫자(없으면 0), "currency":"(USD/EUR/JPY/GBP/KRW)", "ppwDate":"YYYY-MM-DD(없으면 빈문자열)", "cedant":"출재사/프론팅사/브로커", "slipSummary":"한 줄 요약", "confidence":0~100 정수, "memo":"확인 필요 메모" }
원문에 없으면 문자열은 "", 숫자는 0. 금액 환산은 보수적으로.`,
  intake_normalize: `당신은 주재원/브로커 메일을 표준 해외계약 Intake 항목으로 정제하는 AI입니다.
아래 필드를 추출해 JSON으로만 응답하세요. 코드블록 없이 순수 JSON만.
{ "insured":"", "country":"", "city":"", "line":"(재물/특종/해상/기술보험/배상책임/Package 중 가까운 것)", "tsiEok":억원 정수(없으면 0), "premiumOriginal":숫자(없으면 0), "currency":"(USD/KRW/EUR/JPY/GBP)", "partner":"현지 파트너/브로커", "due":"YYYY-MM-DD(없으면 빈문자열)", "lossHistory":"(있음/없음/확인필요)", "lossAmountEok":억원 정수(없으면 0), "lossDesc":"사고내용 요약", "confidence":0~100 정수, "memo":"확인 필요 메모" }
원문에 없으면 문자열은 "", 숫자는 0.`,
};

function translatePrompt(lang) {
  return lang === 'en'
    ? 'You translate insurance policy/treaty documents. Translate the given text into natural, professional English, preserving insurance terminology. No commentary. Output as HTML with simple tags like <br>.'
    : '당신은 보험 약관·Treaty 문서를 번역하는 AI입니다. 주어진 원문을 자연스럽고 정확한 한국어로 번역하세요. 전문용어를 정확히 옮기고 부연 설명은 달지 마세요. 결과는 <br> 등 간단한 HTML로 출력하세요.';
}

function safeParseJSON(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  const s = t.indexOf('{'), e = t.lastIndexOf('}');
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

async function callAnthropic({ system, user, json }) {
  if (!enabled()) {
    const err = new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.');
    err.code = 'NO_API_KEY';
    throw err;
  }
  const sys = json ? `${system}\n\n반드시 유효한 JSON 객체 하나만 출력하세요. 다른 텍스트는 출력하지 마세요.` : system;
  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      temperature: 0.2,
      system: sys,
      messages: [{ role: 'user', content: String(user || '').slice(0, 24000) }],
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic API 오류 (${resp.status}): ${errText.slice(0, 300)}`);
  }
  const data = await resp.json();
  return (data.content || []).map((b) => b.text || '').join('').trim();
}

// 단일 진입점: { task, context, targetLang } → { text } 또는 { json }
async function handleTask({ task, context, targetLang }) {
  const ctx = String(context || '');
  if (!task) { const e = new Error('task가 필요합니다.'); e.code = 'BAD_REQUEST'; throw e; }
  if (!ctx.trim()) { const e = new Error('분석할 내용(context)이 비어 있습니다.'); e.code = 'BAD_REQUEST'; throw e; }

  if (JSON_PROMPTS[task]) {
    const raw = await callAnthropic({ system: JSON_PROMPTS[task], user: ctx, json: true });
    return { json: safeParseJSON(raw) };
  }
  if (task === 'doc_translate') {
    const text = await callAnthropic({ system: translatePrompt(targetLang === 'en' ? 'en' : 'ko'), user: ctx });
    return { text };
  }
  if (SYSTEM_PROMPTS[task]) {
    const text = await callAnthropic({ system: SYSTEM_PROMPTS[task], user: ctx });
    return { text };
  }
  const e = new Error(`알 수 없는 task: ${task}`);
  e.code = 'BAD_REQUEST';
  throw e;
}

module.exports = { handleTask, enabled, MODEL };
