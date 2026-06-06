// OpenAI TTS 프록시 (Vercel Serverless)
// 환경변수: gpt_key (chat.js와 동일)
// 모델: tts-1-hd (고품질), 목소리: shimmer (한국어 자연스러움)
//
// POST /api/tts
// Body: { text: "...", voice?: "shimmer"|"nova"|"alloy"|"onyx"|"echo"|"fable" }
// Response: audio/mpeg

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용' });

  const apiKey = process.env.gpt_key;
  if (!apiKey) {
    return res.status(200).json({ success: false, error: 'gpt_key 환경변수 미설정' });
  }

  const { text, voice = 'shimmer' } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'text 필수' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        voice,
        input: text.slice(0, 4096), // OpenAI 최대 4096자
        response_format: 'mp3',
        speed: 0.92, // 노인 대상 → 약간 느리게
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI TTS ${response.status}: ${errText.slice(0, 200)}`);
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    res.status(200).json({ success: false, error: String(err.message || err) });
  }
}
