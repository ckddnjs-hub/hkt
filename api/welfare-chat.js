// Vercel 서버리스 함수
// 환경변수: BKEY (행정안전부 gov24 API), gpt_key (OpenAI)
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ text: '허용되지 않는 메서드입니다.' });

  const { message = '', user_profile = {}, history = [] } = req.body || {};

  const BKEY = process.env.BKEY ? decodeURIComponent(process.env.BKEY) : '';
  const GPT_KEY = process.env.gpt_key || '';

  if (!BKEY) return res.status(500).json({ text: '⚠️ BKEY 환경변수가 설정되지 않았습니다. Vercel 설정을 확인하세요.' });
  if (!GPT_KEY) return res.status(500).json({ text: '⚠️ gpt_key 환경변수가 설정되지 않았습니다.' });

  try {
    // 1. 프로필 기반 서비스 분야 결정
    const p = user_profile;
    const age = p.age || (p.birth_year ? new Date().getFullYear() - p.birth_year : 40);
    const fields = resolveServiceFields(age, p);

    // 2. gov24 API 검색 (키워드 + 서비스분야)
    const services = await searchGov24(message, fields, BKEY);

    // 3. 프로필 요약 문자열
    const profileSummary = buildProfileSummary(age, p);

    // 4. GPT 응답 생성
    const text = await askGPT(message, profileSummary, services, history, GPT_KEY);

    return res.json({ text, source_count: services.length });
  } catch (e) {
    console.error('welfare-chat error:', e);
    return res.status(500).json({ text: `⚠️ 서버 오류가 발생했어요: ${e.message}` });
  }
};

// ── 프로필 → 관련 서비스분야 ─────────────────────────────────────────
function resolveServiceFields(age, p) {
  const fields = [];
  if (age >= 65)                    fields.push('노인·요양');
  if (age < 19)                     fields.push('보육·교육 및 취약아동지원');
  if (p.has_disability)             fields.push('장애인');
  if (p.has_infant)                 fields.push('임신·출산');
  if (p.is_single_parent)          fields.push('가족지원');
  if (p.housing_type === 'monthly_rent' || p.housing_type === 'jeonse')
                                    fields.push('주거');
  if (!fields.length)               fields.push('생활지원'); // 기본
  return fields.slice(0, 3);
}

// ── gov24 API 검색 ───────────────────────────────────────────────────
async function searchGov24(message, fields, key) {
  const BASE = 'https://api.odcloud.kr/api/gov24/v3/serviceList';
  const allResults = [];

  // 키워드 검색 (메시지 앞 20자)
  const keyword = message.replace(/[?？]/g, '').slice(0, 20).trim();

  const queries = [];
  if (keyword) {
    queries.push({ 'cond[서비스명::LIKE]': keyword });
  }
  // 서비스분야별 검색 (최대 2개)
  for (const field of fields.slice(0, 2)) {
    queries.push({ 'cond[서비스분야::LIKE]': field });
  }

  for (const extra of queries) {
    try {
      const params = new URLSearchParams({
        serviceKey: key,
        page: '1',
        perPage: '15',
        returnType: 'JSON',
        ...extra,
      });
      const r = await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const body = await r.json();
      const items = body.data || [];
      for (const item of items) {
        const sid = item['서비스ID'];
        if (sid && !allResults.find(x => x['서비스ID'] === sid)) {
          allResults.push(item);
        }
      }
    } catch { /* 개별 쿼리 실패 무시 */ }
    if (allResults.length >= 20) break;
  }

  // 쿼리가 모두 실패했거나 결과 없으면 첫 페이지 fallback
  if (allResults.length === 0) {
    const params = new URLSearchParams({ serviceKey: key, page: '1', perPage: '20', returnType: 'JSON' });
    const r = await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(10000) });
    if (r.ok) {
      const body = await r.json();
      allResults.push(...(body.data || []).slice(0, 20));
    }
  }

  return allResults.slice(0, 20);
}

// ── 프로필 요약 ─────────────────────────────────────────────────────
function buildProfileSummary(age, p) {
  return [
    `나이: ${age}세`,
    p.gender === 'female' ? '여성' : p.gender === 'male' ? '남성' : '',
    p.region ? `거주지: ${[p.region, p.district].filter(Boolean).join(' ')}` : '',
    p.household_type ? `가구형태: ${{ single:'1인가구', couple:'부부', family:'자녀포함', single_parent:'한부모가정', other:'기타' }[p.household_type] || p.household_type}` : '',
    p.income_level ? `소득: 중위소득 ${p.income_level}%` : '',
    p.income_amount ? `월소득: 약 ${p.income_amount}만원` : '',
    p.housing_type ? `주거형태: ${{ own:'자가', jeonse:'전세', monthly_rent:'월세', public:'공공임대', other:'기타' }[p.housing_type] || p.housing_type}` : '',
    p.has_disability ? '장애인' : '',
    p.has_infant ? '영유아 자녀 있음' : '',
    p.is_single_parent ? '한부모 가정' : '',
    p.is_low_income ? '기초수급·차상위' : '',
  ].filter(Boolean).join(' | ');
}

// ── GPT 호출 ─────────────────────────────────────────────────────────
async function askGPT(message, profileSummary, services, history, key) {
  const serviceText = services.length
    ? services.map((s, i) => {
        const name    = s['서비스명'] || '';
        const content = (s['지원내용'] || '').slice(0, 120);
        const method  = (s['신청방법'] || '').slice(0, 60);
        const url     = s['상세조회URL'] || '';
        const agency  = s['소관기관명'] || '';
        return `${i + 1}. **${name}** (${agency})\n   지원내용: ${content}\n   신청방법: ${method}${url ? `\n   상세URL: ${url}` : ''}`;
      }).join('\n')
    : '(검색 결과 없음)';

  const systemPrompt = `당신은 한국 복지 혜택 전문 AI 상담사입니다.
사용자 프로필과 공공 복지서비스 데이터(행정안전부 gov24 API)를 바탕으로 맞춤 혜택을 친절하게 안내합니다.
답변 규칙:
- 한국어로 대화체로 답변
- 사용자 프로필에 맞는 서비스만 추천 (맞지 않으면 그 이유 언급)
- 혜택명, 지원내용, 신청방법을 포함
- 이모지 적절 사용
- 500자 이내로 간결하게
- 마지막에 "더 궁금한 점이 있으면 물어보세요 😊" 추가`;

  const userContent = `[사용자 프로필]\n${profileSummary || '프로필 정보 없음'}\n\n[공공 복지서비스 검색 결과 (${services.length}건)]\n${serviceText}\n\n[사용자 질문]\n${message}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map(h => ({
      role: h.role === 'ai' ? 'assistant' : 'user',
      content: h.content,
    })),
    { role: 'user', content: userContent },
  ];

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-4o', messages, max_tokens: 800, temperature: 0.7 }),
    signal: AbortSignal.timeout(25000),
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(`OpenAI 오류 ${r.status}: ${err.error?.message || JSON.stringify(err)}`);
  }

  const data = await r.json();
  return data.choices?.[0]?.message?.content || '응답을 받지 못했어요.';
}
