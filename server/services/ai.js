// Claude API 연동 (해외 재보험 업무 AI 기능)
// - 서베이리포트 요약 / 약관·특약 요약·번역 / Slip·이메일 구조화 추출
// API 키는 환경변수 ANTHROPIC_API_KEY로 주입한다(코드에 하드코딩 금지).

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.AI_MODEL || 'claude-opus-4-8';
let _client = null;

function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const e = new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.');
    e.code = 'NO_API_KEY';
    throw e;
  }
  if (!_client) _client = new Anthropic(); // ANTHROPIC_API_KEY 자동 사용
  return _client;
}

function textOf(resp) {
  return (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

// 단순 텍스트 완성 (요약·번역은 thinking 없이 빠르게)
async function complete({ system, user, maxTokens = 2000 }) {
  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  return textOf(resp);
}

// 약관 PDF를 직접 첨부해 처리(내장 약관 문서용)
async function completeWithPdf({ system, instruction, pdfBase64, maxTokens = 4000 }) {
  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
        { type: 'text', text: instruction },
      ],
    }],
  });
  return textOf(resp);
}

// 1) 서베이리포트 요약
async function summarizeSurvey({ reportText, context }) {
  const system =
    '당신은 해외수재 재보험 클레임 담당자를 돕는 손해사정 전문 어시스턴트입니다. ' +
    '서베이리포트를 한국어로, 업무 검토에 바로 쓸 수 있게 요약합니다. ' +
    '항목: ① 사고개요 ② 손상범위 ③ 추정 사고원인 ④ 손해액(있으면) ⑤ 담보·면책 쟁점 ⑥ 추가 요청자료. ' +
    '근거 없는 추정은 하지 말고, 원문에 없으면 "원문 미기재"로 표시하세요.';
  const ctx = context
    ? `대상 클레임 정보: ${JSON.stringify(context)}\n\n`
    : '';
  const body = reportText
    ? `${ctx}다음 서베이리포트 원문을 위 항목으로 요약하세요.\n\n---\n${reportText.slice(0, 60000)}`
    : `${ctx}서베이리포트 원문이 제공되지 않았습니다. 위 클레임 정보만으로 점검해야 할 항목과 요청자료를 정리하세요.`;
  return complete({ system, user: body, maxTokens: 2000 });
}

// 2) 문서 요약 (텍스트 또는 PDF)
async function summarizeDoc({ title, text, pdfBase64 }) {
  const system =
    '당신은 보험 약관·특약·Treaty 문서를 분석하는 전문 어시스턴트입니다. ' +
    '실무자가 빠르게 파악하도록 한국어로 요약합니다. ' +
    '항목: ① 문서 목적/적용대상 ② 담보 범위 ③ 주요 면책·제외 ④ 한도·자기부담 등 핵심 조건 ⑤ 업무상 유의점.';
  const instruction = `문서명: ${title || '(미상)'}\n위 항목 기준으로 핵심을 요약하세요.`;
  if (pdfBase64) return completeWithPdf({ system, instruction, pdfBase64, maxTokens: 2500 });
  return complete({ system, user: `${instruction}\n\n---\n${(text || '').slice(0, 60000)}`, maxTokens: 2500 });
}

// 3) 문서 번역
async function translateDoc({ title, text, pdfBase64, target }) {
  const lang = target === 'en' ? '영어' : '한국어';
  const system =
    `당신은 보험·재보험 문서 전문 번역가입니다. 원문의 의미를 정확히 보존하여 ${lang}로 번역합니다. ` +
    '보험 전문용어는 업계 표준 용어를 사용하고, 길면 핵심 조항 위주로 번역하되 생략한 부분은 명시하세요.';
  const instruction = `문서명: ${title || '(미상)'}\n이 문서를 ${lang}로 번역하세요.`;
  if (pdfBase64) return completeWithPdf({ system, instruction, pdfBase64, maxTokens: 4000 });
  return complete({ system, user: `${instruction}\n\n---\n${(text || '').slice(0, 40000)}`, maxTokens: 4000 });
}

// 4) Slip·이메일에서 수재계약 핵심 조건 구조화 추출 (structured outputs)
const SLIP_SCHEMA = {
  type: 'object',
  properties: {
    insured: { type: 'string', description: '피보험자명' },
    country: { type: 'string', description: '국가' },
    city: { type: 'string', description: '도시/소재지' },
    line: { type: 'string', description: '보험종목 (Package/기술보험/해상적하/배상책임 등)' },
    tsiEok: { type: 'number', description: '가입금액 TSI를 억원 단위로 환산한 값(미상이면 0)' },
    premiumOriginal: { type: 'number', description: '계약통화 기준 보험료 금액(미상이면 0)' },
    currency: { type: 'string', description: '통화 코드 (USD/EUR/JPY/GBP/KRW 등)' },
    cedant: { type: 'string', description: '출재사/브로커/프론팅사' },
    ppwDate: { type: 'string', description: 'PPW 또는 인수희망일 (YYYY-MM-DD, 미상이면 빈 문자열)' },
    slipSummary: { type: 'string', description: '인수조건 한 줄 요약(한국어)' },
    confidence: { type: 'number', description: '추출 신뢰도 0~100' },
  },
  required: ['insured', 'country', 'city', 'line', 'tsiEok', 'premiumOriginal', 'currency', 'cedant', 'ppwDate', 'slipSummary', 'confidence'],
  additionalProperties: false,
};

async function extractSlip({ text }) {
  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 1500,
    system:
      '당신은 해외수재 인수 담당자를 돕는 어시스턴트입니다. Slip/이메일 본문에서 수재계약 핵심 조건을 추출합니다. ' +
      'TSI/보험료에 통화·단위(million 등)가 있으면 정확히 환산하고, 1 USD=1450, EUR=1580, JPY=9.8, GBP=1850 KRW 기준으로 억원(1억=1e8 KRW)으로 환산하세요. 불명확하면 0과 낮은 confidence를 쓰세요.',
    messages: [{ role: 'user', content: `다음 본문에서 수재계약 조건을 추출하세요.\n\n---\n${(text || '').slice(0, 40000)}` }],
    output_config: { format: { type: 'json_schema', schema: SLIP_SCHEMA } },
  });
  return JSON.parse(textOf(resp));
}

// 내장 약관 PDF를 CLIENT_DIR/assets/docs 에서 안전하게 읽어 base64로 반환
function readDocPdfBase64(file, clientDir) {
  if (!file || typeof file !== 'string') return null;
  if (!file.startsWith('assets/docs/') || file.includes('..')) return null;
  const abs = path.join(clientDir, file);
  if (!abs.endsWith('.pdf') || !fs.existsSync(abs)) return null;
  return fs.readFileSync(abs).toString('base64');
}

// --- 결제 없는 데모 목업 폴백 -------------------------------------------
// ANTHROPIC_API_KEY가 없을 때, 빈 화면 대신 "시연 샘플" 결과를 반환한다.
// 키를 넣으면 위의 실제 Claude 함수로 자동 전환된다.
function enabled() { return !!process.env.ANTHROPIC_API_KEY; }
const SAMPLE = '【시연 샘플 — 서버에 ANTHROPIC_API_KEY를 넣으면 실제 Claude가 생성합니다】';

function mockSurvey(context) {
  const c = context || {};
  return [
    SAMPLE,
    `① 사고개요: ${c['사고유형'] || '사고'} 발생 · 증권 ${c['증권번호'] || '-'} / 피보험자 ${c['피보험자'] || '-'}`,
    '② 손상범위: 주요 설비·재고에 물적손해(현장 서베이 기준). 서베이리포트 첨부 시 상세 자동 분석.',
    '③ 추정원인: 1차 조사 기준 우발적 사고로 추정 — 정밀 원인조사보고서 확인 필요.',
    `④ 손해액: Paid/OS ${c['PaidOS'] || '-'} (추산). 최종 손해사정서로 확정 예정.`,
    '⑤ 담보·면책 쟁점: 보험기간 내 사고 여부, 노후화·마모 등 면책사유 해당 여부 검토.',
    '⑥ 추가 요청자료: 최종 손해사정서, 복구견적서, 사고 전후 사진, 원인조사보고서.',
  ].join('\n');
}
function mockDoc(title, keywords) {
  return [
    SAMPLE,
    `① 문서 목적/적용대상: ${title || '문서'} — 해당 담보의 인수·보상 기준을 정의.`,
    '② 담보 범위: 약관에 명시된 담보위험에 대한 직접손해를 보상.',
    `③ 주요 면책·제외: ${keywords || '노후화, 마모, 고의, 전쟁, 테러 등'} (예시).`,
    '④ 핵심 조건: 보상한도·자기부담금·면책기간 등은 증권/특약 조건에 따름.',
    '⑤ 업무 유의점: 사고 시 담보·면책 해당 여부와 재보험 통보의무를 우선 확인.',
  ].join('\n');
}
function mockTranslate(title, target) {
  if (target === 'en') {
    return `${SAMPLE}\nThis document defines the coverage, exclusions, limits and conditions applicable to the policy "${title || ''}". Key review points: insured perils, exclusions, deductibles, and reinsurance notification requirements.`;
  }
  return `${SAMPLE}\n본 문서 "${title || ''}"는 해당 증권에 적용되는 담보·면책·한도 및 제반 조건을 규정합니다. 주요 검토사항: 담보위험, 면책사유, 자기부담금, 재보험 통보의무.`;
}

module.exports = {
  summarizeSurvey, summarizeDoc, translateDoc, extractSlip, readDocPdfBase64, MODEL,
  enabled, mockSurvey, mockDoc, mockTranslate,
};
