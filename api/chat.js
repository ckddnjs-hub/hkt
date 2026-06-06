// GPT 생성 전용 서버사이드 프록시 (Vercel Serverless Function)
// 환경변수: gpt_key = OpenAI API 키
// 역할: 쉬운말 변환, 상담 응답, 마을방송 스크립트 생성 — 자격 매칭은 담당하지 않음
//
// 호출 예:
//   POST /api/chat
//   Body: { messages: [{role:'system',...},{role:'user',...}], temperature: 0.7, max_tokens: 800 }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST만 허용' });

  const apiKey = process.env.gpt_key;
  if (!apiKey) {
    return res.status(200).json({
      success: false,
      error: 'gpt_key 환경변수 미설정. Vercel → Settings → Environment Variables에 추가 후 재배포하세요.',
    });
  }

  const { messages, temperature = 0.7, max_tokens = 800, model } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ success: false, error: 'messages 배열 필수' });
  }
  // 쉬운말 변환 등 품질이 중요한 작업은 gpt-4o, 나머지는 gpt-4o-mini
  const gptModel = model === 'gpt-4o' ? 'gpt-4o' : 'gpt-4o-mini';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: gptModel, messages, temperature, max_tokens }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ success: true, content });
  } catch (err) {
    return res.status(200).json({ success: false, error: String(err.message || err) });
  }
}
