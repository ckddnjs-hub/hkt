// 복지 OpenAPI 연동 (Vercel Serverless Function)
// 제공기관: 한국사회보장정보원(B554287)
//   - 중앙부처 복지서비스: NationalWelfareInformationsV001  (활용가이드 v2.2 기준 — 검증됨)
//   - 지자체 복지서비스:   LocalGovernmentWelfareInformations (코드표 v1.0 기준 — 경로/일부 파라미터는 테스트 필요)
// 두 API 모두 동일한 인증키(WELFARE_API_KEY) 하나로 호출됩니다.
//
// 환경변수: WELFARE_API_KEY = 공공데이터포털 "일반 인증키(Decoding)"
//   ※ 아래 URLSearchParams가 키를 1회 인코딩하므로 반드시 "디코딩" 키를 넣을 것.
//      "인코딩" 키를 넣으면 이중 인코딩 → resultCode 30 SERVICE_KEY_IS_NOT_REGISTERED_ERROR.
//
// 호출 예:
//   /api/welfare?type=central&keyword=청년&page=1&rows=20            (중앙부처 목록)
//   /api/welfare?type=central&lifeArray=004&intrsThemaArray=050      (생애주기=청년, 관심주제=일자리)
//   /api/welfare?type=central&servId=WLF00001138                     (중앙부처 상세)
//   /api/welfare?type=local&keyword=청년&page=1&rows=20              (지자체 목록)
//
// 코드표(생애주기 lifeArray): 001 영유아 002 아동 003 청소년 004 청년 005 중장년 006 노년 007 임신·출산
// 코드표(가구유형 trgterIndvdlArray): 010 다문화·탈북민 020 다자녀 030 보훈대상자 040 장애인 050 저소득 060 한부모·조손
// 코드표(관심주제 intrsThemaArray): 010 신체건강 020 정신건강 030 생활지원 040 주거 050 일자리 060 문화·여가
//   070 안전·위기 080 임신·출산 090 보육 100 교육 110 입양·위탁 120 보호·돌봄 130 서민금융 140 법률 (이하 중앙부처: 150 관계개선 160 에너지)

const ENDPOINTS = {
  central: {
    base: 'http://apis.data.go.kr/B554287/NationalWelfareInformationsV001',
    list: 'NationalWelfarelistV001',
    detail: 'NationalWelfaredetailedV001',
    listWrap: 'servList',   // 목록 1건 래퍼
    detailWrap: 'wantedDtl', // 상세 래퍼
  },
  // TODO(테스트): 지자체는 활용가이드 미확보. 경로/파라미터는 중앙부처 패턴을 따른다고 가정.
  // 실패 시 응답의 attempted/error를 확인해 경로(LcgvWelfarelist 등)만 바꾸면 됩니다.
  local: {
    base: 'http://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations',
    list: 'LcgvWelfarelist',
    detail: 'LcgvWelfaredetailed',
    listWrap: 'servList',
    detailWrap: 'wantedDtl',
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'max-age=3600, stale-while-revalidate=86400');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.WELFARE_API_KEY;

  const {
    type = 'central',          // 'central' | 'local'
    servId,                    // 있으면 상세조회(callTp=D)
    page = '1',
    rows = '20',
    keyword,                   // 검색어 → searchWrd
    srchKeyCode,               // 001 제목/서비스명, 002 내용, 003 제목+내용 (기본 003)
    lifeArray,                 // 생애주기 코드
    trgterIndvdlArray,         // 가구유형 코드
    intrsThemaArray,           // 관심주제 코드
    age,                       // 나이 (중앙부처)
    onapPsbltYn,               // 온라인신청 가능여부 Y/N (중앙부처)
    orderBy = 'date',          // 중앙부처 정렬: date(최신/조회순) | popular(인기순)
    arrgOrd,                   // 지자체 정렬: 001 최신순 | 002 인기순
  } = req.query;

  const cfg = ENDPOINTS[type] || ENDPOINTS.central;
  const mode = servId ? 'detail' : 'list';
  const baseUrl = `${cfg.base}/${cfg[mode]}`;

  if (!apiKey) {
    return res.status(200).json({
      success: false, mockData: true,
      message: 'WELFARE_API_KEY 환경변수 미설정. Vercel → Settings → Environment Variables에 추가 후 재배포하세요.',
    });
  }

  // serviceKey는 "디코딩 키" 가정 → URLSearchParams가 1회 인코딩하여 올바른 형태가 됨
  const params = new URLSearchParams({ serviceKey: apiKey });

  if (mode === 'detail') {
    params.set('callTp', 'D');   // ← 필수
    params.set('servId', servId);
  } else {
    params.set('callTp', 'L');   // ← 필수
    params.set('pageNo', String(page));
    params.set('numOfRows', String(rows));
    params.set('srchKeyCode', srchKeyCode || '003'); // 필수 — 003: 제목+내용(가장 폭넓음)
    if (keyword) params.set('searchWrd', keyword);
    if (lifeArray) params.set('lifeArray', lifeArray);
    if (trgterIndvdlArray) params.set('trgterIndvdlArray', trgterIndvdlArray);
    if (intrsThemaArray) params.set('intrsThemaArray', intrsThemaArray);

    if (type === 'central') {
      if (age) params.set('age', age);
      if (onapPsbltYn) params.set('onapPsbltYn', onapPsbltYn);
      if (orderBy) params.set('orderBy', orderBy);
    } else {
      if (arrgOrd) params.set('arrgOrd', arrgOrd);
    }
  }

  const requestUrl = `${baseUrl}?${params.toString()}`;

  try {
    const response = await fetch(requestUrl);
    const text = await response.text();

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);

    // 1) OpenAPI 게이트웨이 에러(인증/트래픽): <cmmMsgHeader><returnReasonCode>..
    const gwCode = pickTag(text, 'returnReasonCode');
    const gwMsg = pickTag(text, 'returnAuthMsg') || pickTag(text, 'errMsg');
    if (gwCode && gwCode !== '00') throw new Error(`[${gwCode}] ${gwMsg || 'gateway error'}`);

    // 2) 서비스 레벨 결과코드 (0 = 정상, 40 = 데이터 없음(빈 결과))
    const resultCode = pickTag(text, 'resultCode');
    const resultMessage = pickTag(text, 'resultMessage');
    if (resultCode === '40') {
      return res.status(200).json({ success: true, type, mode, totalCount: 0, count: 0, items: [] });
    }
    if (resultCode && resultCode !== '0' && resultCode !== '00') {
      throw new Error(`[${resultCode}] ${resultMessage || errName(resultCode)}`);
    }

    const items = mode === 'detail'
      ? [parseDetail(pickBlock(text, cfg.detailWrap) || text)]
      : pickBlocks(text, cfg.listWrap).map(parseFields);

    return res.status(200).json({
      success: true,
      type, mode,
      totalCount: Number(pickTag(text, 'totalCount')) || items.length,
      count: items.length,
      items,
    });
  } catch (err) {
    return res.status(200).json({
      success: false, mockData: true, type, mode,
      attempted: requestUrl.replace(/serviceKey=[^&]+/, 'serviceKey=***'), // 키 마스킹
      error: String(err.message || err),
      message: 'API 호출 실패. attempted URL과 error를 확인하세요(경로/파라미터명 또는 인코딩/디코딩 키 문제일 수 있음).',
    });
  }
}

// ── 에러코드명(활용가이드 표) ────────────────────────────────────────
function errName(code) {
  return ({
    '04': 'HTTP_ERROR', '10': 'INVALID_REQUEST_PARAMETER_ERROR',
    '12': 'NO_OPENAPI_SERVICE_ERROR', '20': 'SERVICE_ACCESS_DENIED_ERROR',
    '22': 'LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR',
    '30': 'SERVICE_KEY_IS_NOT_REGISTERED_ERROR', '31': 'DEADLINE_HAS_EXPIRED_ERROR',
    '99': 'UNKNOWN_ERROR',
  })[code] || 'ERROR';
}

// ── 경량 XML 파서 (의존성 없음) ──────────────────────────────────────
// 목록: <servList> 내부의 스칼라 필드만 추출
function parseFields(fragment) {
  const obj = {};
  const re = /<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(fragment)) !== null) {
    if (/<[A-Za-z]/.test(m[2])) continue; // 컨테이너 태그 skip
    obj[m[1]] = decode(m[2]);
  }
  return obj;
}

// 상세: <wantedDtl> 스칼라 필드 + 반복 서브리스트(applmetList, baslawList 등)를 배열로 묶음
function parseDetail(block) {
  const obj = {};
  const re = /<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const tag = m[1], val = m[2];
    if (/<[A-Za-z]/.test(val)) {
      (obj[tag] = obj[tag] || []).push(parseFields(val)); // 반복 서브리스트
    } else {
      obj[tag] = decode(val);
    }
  }
  return obj;
}

function pickBlocks(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'g');
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function pickBlock(xml, tag) {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  return m ? m[1] : null;
}

function pickTag(xml, tag) {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  return m ? decode(m[1]) : null;
}

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}
