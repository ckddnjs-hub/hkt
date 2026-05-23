// 복지로 API 연동 (Vercel Serverless Function)
// 배포 시 WELFARE_API_KEY 환경변수 필요

export default async function handler(req, res) {
  const { category, region, age, income } = req.query;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'max-age=3600, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 복지로 OpenAPI 연동
    const apiKey = process.env.WELFARE_API_KEY;
    const baseUrl = 'https://www.bokjiro.go.kr/openApi/rest/wlfareInfo';

    const params = new URLSearchParams({
      serviceKey: apiKey || '',
      numOfRows: '20',
      pageNo: '1',
      srchKeyCode: category || '',
      addrCode: region || '',
    });

    const response = await fetch(`${baseUrl}?${params}`);
    if (!response.ok) throw new Error(`API 오류: ${response.status}`);

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    // 실패 시 목 데이터 반환
    return res.status(200).json({
      success: false,
      message: '실제 API 연동 필요. WELFARE_API_KEY 환경변수를 설정하세요.',
      mockData: true,
    });
  }
}
