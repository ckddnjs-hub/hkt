'use strict';

// ── API ─────────────────────────────────────────────────────────────
const API = {
  NVIDIA_BASE: 'https://integrate.api.nvidia.com/v1',
  WELFARE_BASE: 'https://www.bokjiro.go.kr/openApi/rest',
  NEWS_BASE: 'https://newsapi.org/v2',
};

// ── NVIDIA 에이전트 설정 ─────────────────────────────────────────────
const AGENTS_CONFIG = {
  analyst: {
    id: 'analyst',
    name: '프로필 분석가',
    avatar: '🔍',
    color: '#3B82F6',
    model: 'meta/llama-3.1-70b-instruct',
    role: '사용자 프로필을 분석하여 핵심 복지 수요를 파악하는 전문가',
    systemPrompt: `당신은 사회복지 분야의 전문 프로필 분석가입니다.
사용자의 인적사항, 소득, 가구 구성, 특수 상황을 분석하여
복지 수요를 정확하게 파악합니다.
항상 한국어로 답변하며, 구체적이고 실용적인 분석을 제공합니다.
분석 결과는 JSON 형식으로 반환합니다.`
  },
  matcher: {
    id: 'matcher',
    name: '혜택 매칭 전문가',
    avatar: '🎯',
    color: '#6366F1',
    model: 'meta/llama-3.1-70b-instruct',
    role: '분석된 프로필에 맞는 복지 혜택을 정확하게 매칭',
    systemPrompt: `당신은 대한민국 복지 혜택 매칭 전문가입니다.
사용자 프로필 분석 결과를 바탕으로 적합한 복지 혜택을 선별합니다.
지원 금액, 자격 요건, 신청 방법을 명확하게 제시합니다.
항상 한국어로 답변합니다.`
  },
  cohort: {
    id: 'cohort',
    name: '유사계층 분석가',
    avatar: '👥',
    color: '#8B5CF6',
    model: 'meta/llama-3.1-70b-instruct',
    role: '비슷한 조건의 다른 사람들이 받는 혜택을 분석',
    systemPrompt: `당신은 유사 계층 복지 혜택 분석 전문가입니다.
사용자와 비슷한 인구통계학적 특성을 가진 집단이
실제로 활용하는 복지 혜택 패턴을 분석합니다.
놓치기 쉬운 혜택을 발굴하여 제안합니다.
항상 한국어로 답변합니다.`
  },
  futurePlanner: {
    id: 'futurePlanner',
    name: '생애주기 플래너',
    avatar: '🔮',
    color: '#EC4899',
    model: 'meta/llama-3.1-70b-instruct',
    role: '생애주기 관점에서 미래 복지 혜택을 예측',
    systemPrompt: `당신은 생애주기 관점의 복지 플래닝 전문가입니다.
현재 사용자의 나이와 상황을 기반으로 향후 5년, 10년, 20년 내에
받을 수 있는 복지 혜택을 예측합니다.
생애 이벤트(결혼, 출산, 은퇴 등)와 연계된 혜택을 제시합니다.
항상 한국어로 답변합니다.`
  }
};

// ── 복지 혜택 카테고리 ───────────────────────────────────────────────
const BENEFIT_CATEGORIES = {
  income: { label: '소득·생계', icon: '💰', color: '#3B82F6' },
  housing: { label: '주거', icon: '🏠', color: '#10B981' },
  health: { label: '의료·건강', icon: '🏥', color: '#EF4444' },
  education: { label: '교육·보육', icon: '📚', color: '#F59E0B' },
  employment: { label: '일자리', icon: '💼', color: '#8B5CF6' },
  family: { label: '가족·출산', icon: '👨‍👩‍👧', color: '#EC4899' },
  elderly: { label: '노인·요양', icon: '👴', color: '#6366F1' },
  disability: { label: '장애인', icon: '♿', color: '#14B8A6' },
  youth: { label: '청년', icon: '🌱', color: '#84CC16' },
};

// ── 생애주기 단계 ────────────────────────────────────────────────────
const LIFE_STAGES = [
  { id: 'infant', label: '영유아', ageRange: [0, 6], icon: '👶', color: '#F9A8D4' },
  { id: 'child', label: '아동', ageRange: [7, 12], icon: '🧒', color: '#FDE68A' },
  { id: 'teen', label: '청소년', ageRange: [13, 18], icon: '🎒', color: '#BBF7D0' },
  { id: 'youth', label: '청년', ageRange: [19, 34], icon: '🌱', color: '#93C5FD' },
  { id: 'middle', label: '중장년', ageRange: [35, 64], icon: '💼', color: '#C4B5FD' },
  { id: 'senior', label: '노년', ageRange: [65, 120], icon: '🌿', color: '#6EE7B7' },
];

// ── 복지 혜택 데이터베이스 (데모용 + 실제 제도 기반) ─────────────────
const WELFARE_DB = [
  // 소득·생계
  {
    id: 'w001', name: '생계급여', category: 'income',
    amount: '월 최대 623,368원(1인)', agency: '보건복지부',
    conditions: { maxIncome: 30, householdTypes: ['all'] },
    ageRange: [0, 120], description: '기준 중위소득 30% 이하 가구의 생계비 지원',
    applyUrl: 'https://www.bokjiro.go.kr', applyOffline: '주민센터',
    tags: ['기초생활', '저소득', '필수'],
    documents: ['소득확인서', '가족관계증명서', '임대차계약서'],
    difficulty: 'medium', processDays: 30
  },
  {
    id: 'w002', name: '의료급여', category: 'health',
    amount: '본인부담 1,000~2,000원', agency: '보건복지부',
    conditions: { maxIncome: 40, householdTypes: ['all'] },
    ageRange: [0, 120], description: '기준 중위소득 40% 이하 가구 의료비 지원',
    applyUrl: 'https://www.bokjiro.go.kr', applyOffline: '주민센터',
    tags: ['기초생활', '의료', '필수'],
    documents: ['소득확인서', '가족관계증명서'],
    difficulty: 'medium', processDays: 30
  },
  {
    id: 'w003', name: '주거급여', category: 'housing',
    amount: '최대 월 495,000원(서울 1인)', agency: '국토교통부',
    conditions: { maxIncome: 48, householdTypes: ['all'], housing: ['rent', 'jeonse'] },
    ageRange: [0, 120], description: '기준 중위소득 48% 이하 가구 주거비 지원',
    applyUrl: 'https://www.bokjiro.go.kr', applyOffline: '주민센터',
    tags: ['주거', '저소득', '임차'],
    documents: ['임대차계약서', '소득확인서'],
    difficulty: 'medium', processDays: 60
  },
  {
    id: 'w004', name: '교육급여', category: 'education',
    amount: '연 초등 461,000원~고교 680,000원', agency: '교육부',
    conditions: { maxIncome: 50, householdTypes: ['all'], hasChildren: true },
    ageRange: [7, 18], description: '기준 중위소득 50% 이하 가구 학생 교육비 지원',
    applyUrl: 'https://www.bokjiro.go.kr', applyOffline: '학교 또는 주민센터',
    tags: ['교육', '저소득', '아동'],
    documents: ['소득확인서', '재학증명서'],
    difficulty: 'easy', processDays: 14
  },
  // 청년
  {
    id: 'w010', name: '청년도약계좌', category: 'youth',
    amount: '월 최대 70만원 납입 + 정부 기여금', agency: '금융위원회',
    conditions: { minIncome: 0, maxIncome: 75, ageRange: [19, 34] },
    ageRange: [19, 34], description: '5년 만기 시 최대 5,000만원 목돈 마련',
    applyUrl: 'https://www.kinfa.or.kr', applyOffline: '은행',
    tags: ['청년', '자산형성', '저축'],
    documents: ['소득확인서', '신분증'],
    difficulty: 'easy', processDays: 7
  },
  {
    id: 'w011', name: '국민취업지원제도', category: 'employment',
    amount: '구직촉진수당 월 50만원 × 6개월', agency: '고용노동부',
    conditions: { employment: 'unemployed', ageRange: [15, 69], maxIncome: 60 },
    ageRange: [15, 69], description: '취업 취약계층 맞춤형 취업 지원',
    applyUrl: 'https://www.work.go.kr', applyOffline: '고용센터',
    tags: ['일자리', '취업', '청년'],
    documents: ['이력서', '소득확인서', '통장사본'],
    difficulty: 'medium', processDays: 21
  },
  {
    id: 'w012', name: '청년월세 한시 특별지원', category: 'housing',
    amount: '월 최대 20만원 × 12개월', agency: '국토교통부',
    conditions: { maxIncome: 60, ageRange: [19, 34], housing: ['rent'] },
    ageRange: [19, 34], description: '청년 독립 거주자 월세 지원',
    applyUrl: 'https://www.bokjiro.go.kr', applyOffline: '주민센터',
    tags: ['청년', '주거', '월세'],
    documents: ['임대차계약서', '소득확인서', '통장사본'],
    difficulty: 'easy', processDays: 30
  },
  // 가족·출산
  {
    id: 'w020', name: '부모급여', category: 'family',
    amount: '만 0세 월 100만원 / 만 1세 월 50만원', agency: '보건복지부',
    conditions: { hasChildren: true, childAgeMax: 1 },
    ageRange: [0, 120], description: '만 0~1세 아동 양육 지원',
    applyUrl: 'https://www.bokjiro.go.kr', applyOffline: '주민센터',
    tags: ['영유아', '육아', '출산'],
    documents: ['출생증명서', '통장사본'],
    difficulty: 'easy', processDays: 14
  },
  {
    id: 'w021', name: '아동수당', category: 'family',
    amount: '월 10만원', agency: '보건복지부',
    conditions: { hasChildren: true, childAgeMax: 7 },
    ageRange: [0, 120], description: '만 8세 미만 아동 1인당 월 10만원 지급',
    applyUrl: 'https://www.bokjiro.go.kr', applyOffline: '주민센터',
    tags: ['아동', '육아', '전국민'],
    documents: ['통장사본'],
    difficulty: 'easy', processDays: 7
  },
  {
    id: 'w022', name: '출산지원금', category: 'family',
    amount: '첫째 200만원 / 둘째 300만원 / 셋째+ 500만원', agency: '보건복지부',
    conditions: { hasChildren: true },
    ageRange: [0, 120], description: '출생아 부모에게 바우처 또는 현금 지급',
    applyUrl: 'https://www.bokjiro.go.kr', applyOffline: '주민센터',
    tags: ['출산', '저출생', '전국민'],
    documents: ['출생증명서', '통장사본'],
    difficulty: 'easy', processDays: 14
  },
  // 노인
  {
    id: 'w030', name: '기초연금', category: 'elderly',
    amount: '최대 월 334,810원', agency: '보건복지부',
    conditions: { ageRange: [65, 120], maxIncome: 70 },
    ageRange: [65, 120], description: '소득 하위 70% 어르신 연금 지원',
    applyUrl: 'https://www.bokjiro.go.kr', applyOffline: '주민센터',
    tags: ['노인', '연금', '65세이상'],
    documents: ['신분증', '통장사본', '소득확인서'],
    difficulty: 'easy', processDays: 30
  },
  {
    id: 'w031', name: '노인 장기요양보험', category: 'elderly',
    amount: '본인부담 15~20% (1~5등급)', agency: '국민건강보험공단',
    conditions: { ageRange: [65, 120] },
    ageRange: [65, 120], description: '일상생활이 어려운 어르신 돌봄 서비스',
    applyUrl: 'https://www.longtermcare.or.kr', applyOffline: '국민건강보험공단',
    tags: ['노인', '돌봄', '요양'],
    documents: ['의사소견서', '신분증'],
    difficulty: 'hard', processDays: 60
  },
  // 장애인
  {
    id: 'w040', name: '장애인연금', category: 'disability',
    amount: '최대 월 403,180원', agency: '보건복지부',
    conditions: { disability: true, maxIncome: 70, ageRange: [18, 64] },
    ageRange: [18, 64], description: '중증장애인의 소득 보전 및 추가 지출 지원',
    applyUrl: 'https://www.bokjiro.go.kr', applyOffline: '주민센터',
    tags: ['장애인', '소득지원', '중증'],
    documents: ['장애인증명서', '소득확인서', '통장사본'],
    difficulty: 'medium', processDays: 30
  },
  {
    id: 'w041', name: '장애인 활동지원', category: 'disability',
    amount: '월 최대 1,551,840원 바우처', agency: '보건복지부',
    conditions: { disability: true, ageRange: [6, 64] },
    ageRange: [6, 64], description: '일상·사회생활을 위한 활동지원사 서비스',
    applyUrl: 'https://www.bokjiro.go.kr', applyOffline: '주민센터',
    tags: ['장애인', '활동지원', '서비스'],
    documents: ['장애인증명서', '의사소견서'],
    difficulty: 'hard', processDays: 60
  },
  // 건강·의료
  {
    id: 'w050', name: '산모·신생아 건강관리 지원', category: 'health',
    amount: '서비스 이용권 (5~25일)', agency: '보건복지부',
    conditions: { pregnant: true, maxIncome: 150 },
    ageRange: [15, 45], description: '출산 후 산모·신생아 건강관리사 파견 서비스',
    applyUrl: 'https://www.bokjiro.go.kr', applyOffline: '보건소',
    tags: ['출산', '산모', '건강'],
    documents: ['출생증명서', '소득확인서'],
    difficulty: 'easy', processDays: 14
  },
  {
    id: 'w051', name: '건강보험료 경감', category: 'health',
    amount: '보험료 최대 80% 감면', agency: '국민건강보험공단',
    conditions: { maxIncome: 50 },
    ageRange: [0, 120], description: '저소득층 건강보험료 경감 지원',
    applyUrl: 'https://www.nhis.or.kr', applyOffline: '국민건강보험공단',
    tags: ['건강보험', '경감', '저소득'],
    documents: ['소득확인서'],
    difficulty: 'easy', processDays: 7
  },
  // 주거
  {
    id: 'w060', name: '청년 전세보증금 반환 보증', category: 'housing',
    amount: '최대 2.5억원 보증', agency: '주택도시보증공사(HUG)',
    conditions: { ageRange: [19, 39], housing: ['jeonse'] },
    ageRange: [19, 39], description: '전세 보증금 미반환 위험으로부터 보호',
    applyUrl: 'https://www.khug.or.kr', applyOffline: '은행',
    tags: ['청년', '전세', '보증'],
    documents: ['임대차계약서', '신분증', '등기부등본'],
    difficulty: 'medium', processDays: 14
  },
];

// ── 뉴스 데이터 (데모용) ─────────────────────────────────────────────
const SAMPLE_NEWS = [
  {
    id: 'n001', title: '2024년 기초연금 인상 확정… 최대 334,810원',
    summary: '보건복지부는 2024년 기초연금 최대 지급액을 월 334,810원으로 확정했습니다.',
    category: 'elderly', date: '2024-01-15', source: '보건복지부',
    url: 'https://www.mohw.go.kr', urgent: true
  },
  {
    id: 'n002', title: '청년도약계좌 가입 대상 확대… 소득 요건 완화',
    summary: '금융위원회는 청년도약계좌 가입 요건을 중위소득 60%에서 75%로 완화했습니다.',
    category: 'youth', date: '2024-02-01', source: '금융위원회',
    url: 'https://www.fsc.go.kr', urgent: true
  },
  {
    id: 'n003', title: '출생아 200만원 바우처 지원 전면 확대',
    summary: '올해부터 모든 출생아에게 200만원(첫째) 이상의 출산지원금이 지급됩니다.',
    category: 'family', date: '2024-01-02', source: '보건복지부',
    url: 'https://www.mohw.go.kr', urgent: false
  },
  {
    id: 'n004', title: '주거급여 선정 기준 인상… 더 많은 가구 혜택',
    summary: '2024년 주거급여 선정 기준이 기준 중위소득 47%에서 48%로 확대됩니다.',
    category: 'housing', date: '2024-01-08', source: '국토교통부',
    url: 'https://www.molit.go.kr', urgent: false
  },
  {
    id: 'n005', title: '국민취업지원제도, 2024년 지원 강화',
    summary: '구직촉진수당 지급 기간 및 취업 서비스 프로그램이 대폭 확대됩니다.',
    category: 'employment', date: '2024-01-20', source: '고용노동부',
    url: 'https://www.moel.go.kr', urgent: false
  },
  {
    id: 'n006', title: '부모급여 만 2세까지 확대 추진',
    summary: '정부가 현재 만 0~1세에 지급되는 부모급여를 만 2세까지 확대하는 방안을 검토 중입니다.',
    category: 'family', date: '2024-02-10', source: '보건복지부',
    url: 'https://www.mohw.go.kr', urgent: true
  },
  {
    id: 'n007', title: '장애인 활동지원 서비스 단가 인상',
    summary: '장애인 활동지원 급여 단가가 시간당 16,150원으로 조정됩니다.',
    category: 'disability', date: '2024-01-05', source: '보건복지부',
    url: 'https://www.mohw.go.kr', urgent: false
  },
  {
    id: 'n008', title: '의료급여 수급자 건강생활 유지비 지원',
    summary: '의료급여 수급자에게 건강생활 유지비가 월 6,000원 지급됩니다.',
    category: 'health', date: '2024-01-12', source: '보건복지부',
    url: 'https://www.mohw.go.kr', urgent: false
  },
];

// ── 색상 상수 ────────────────────────────────────────────────────────
const COLORS = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#93C5FD',
  secondary: '#6366F1',
  accent: '#818CF8',
  success: '#10B981',
  danger: '#EF4444',
  warn: '#F59E0B',
  info: '#06B6D4',
};

// ── 지역 목록 ────────────────────────────────────────────────────────
const REGIONS = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
];

// ── 지역별 사각지대 추정 데이터 (KOSIS 기반 2024년 추정치) ───────────────
const BLIND_SPOT_DATA = {
  '서울': { pop65: 1580000, singleElderly: 312000, basicPension: { recipients: 875000, eligible: 1106000 }, housing: { recipients: 178000, eligible: 295000 }, disability: { recipients: 43000, eligible: 61000 } },
  '부산': { pop65: 430000, singleElderly: 89000, basicPension: { recipients: 248000, eligible: 301000 }, housing: { recipients: 63000, eligible: 97000 }, disability: { recipients: 17000, eligible: 24000 } },
  '대구': { pop65: 290000, singleElderly: 58000, basicPension: { recipients: 168000, eligible: 203000 }, housing: { recipients: 44000, eligible: 68000 }, disability: { recipients: 12000, eligible: 17000 } },
  '인천': { pop65: 310000, singleElderly: 59000, basicPension: { recipients: 178000, eligible: 217000 }, housing: { recipients: 47000, eligible: 73000 }, disability: { recipients: 13000, eligible: 18000 } },
  '광주': { pop65: 165000, singleElderly: 34000, basicPension: { recipients: 97000, eligible: 115500 }, housing: { recipients: 27000, eligible: 42000 }, disability: { recipients: 8000, eligible: 11000 } },
  '대전': { pop65: 162000, singleElderly: 31000, basicPension: { recipients: 94000, eligible: 113400 }, housing: { recipients: 26000, eligible: 40000 }, disability: { recipients: 7500, eligible: 10500 } },
  '울산': { pop65: 115000, singleElderly: 21000, basicPension: { recipients: 64000, eligible: 80500 }, housing: { recipients: 18000, eligible: 28000 }, disability: { recipients: 5200, eligible: 7300 } },
  '세종': { pop65: 38000, singleElderly: 6500, basicPension: { recipients: 21000, eligible: 26600 }, housing: { recipients: 6000, eligible: 9200 }, disability: { recipients: 1700, eligible: 2400 } },
  '경기': { pop65: 1420000, singleElderly: 268000, basicPension: { recipients: 782000, eligible: 994000 }, housing: { recipients: 163000, eligible: 272000 }, disability: { recipients: 39000, eligible: 55000 } },
  '강원': { pop65: 248000, singleElderly: 56000, basicPension: { recipients: 158000, eligible: 173600 }, housing: { recipients: 42000, eligible: 62000 }, disability: { recipients: 11000, eligible: 15000 } },
  '충북': { pop65: 218000, singleElderly: 48000, basicPension: { recipients: 138000, eligible: 152600 }, housing: { recipients: 37000, eligible: 55000 }, disability: { recipients: 9500, eligible: 13200 } },
  '충남': { pop65: 268000, singleElderly: 61000, basicPension: { recipients: 167000, eligible: 187600 }, housing: { recipients: 45000, eligible: 67000 }, disability: { recipients: 11500, eligible: 16000 } },
  '전북': { pop65: 268000, singleElderly: 62000, basicPension: { recipients: 175000, eligible: 187600 }, housing: { recipients: 48000, eligible: 68000 }, disability: { recipients: 12000, eligible: 16500 } },
  '전남': { pop65: 298000, singleElderly: 72000, basicPension: { recipients: 197000, eligible: 208600 }, housing: { recipients: 54000, eligible: 75000 }, disability: { recipients: 13500, eligible: 18500 } },
  '경북': { pop65: 368000, singleElderly: 85000, basicPension: { recipients: 238000, eligible: 257600 }, housing: { recipients: 63000, eligible: 90000 }, disability: { recipients: 16500, eligible: 23000 } },
  '경남': { pop65: 355000, singleElderly: 76000, basicPension: { recipients: 228000, eligible: 248500 }, housing: { recipients: 61000, eligible: 87000 }, disability: { recipients: 16000, eligible: 22000 } },
  '제주': { pop65: 102000, singleElderly: 20000, basicPension: { recipients: 62000, eligible: 71400 }, housing: { recipients: 17000, eligible: 26000 }, disability: { recipients: 4400, eligible: 6100 } },
};

// ── 우선 발굴 대상 데모 (익명화) ─────────────────────────────────────
const PRIORITY_TARGETS_DEMO = [
  { id: 1, code: 'HH-001', age: 82, type: '독거노인', neighborhood: '중앙동', missing: ['기초연금', '에너지바우처'], risk: 'high', contactDays: 45 },
  { id: 2, code: 'HH-002', age: 74, type: '독거노인', neighborhood: '행복동', missing: ['장기요양보험'], risk: 'high', contactDays: 31 },
  { id: 3, code: 'HH-003', age: 68, type: '중증장애', neighborhood: '평화동', missing: ['장애인연금', '활동지원'], risk: 'high', contactDays: 7 },
  { id: 4, code: 'HH-004', age: 79, type: '독거노인', neighborhood: '중앙동', missing: ['기초연금', '의료급여'], risk: 'high', contactDays: 60 },
  { id: 5, code: 'HH-005', age: 71, type: '독거노인', neighborhood: '희망동', missing: ['주거급여'], risk: 'medium', contactDays: 21 },
  { id: 6, code: 'HH-006', age: 35, type: '한부모', neighborhood: '행복동', missing: ['한부모가족지원', '아동양육비'], risk: 'medium', contactDays: 3 },
  { id: 7, code: 'HH-007', age: 55, type: '중증장애', neighborhood: '평화동', missing: ['활동지원서비스'], risk: 'medium', contactDays: 14 },
  { id: 8, code: 'HH-008', age: 88, type: '독거노인', neighborhood: '중앙동', missing: ['기초연금', '노인돌봄'], risk: 'high', contactDays: 90 },
];

// ── 이달 마감 혜택 ────────────────────────────────────────────────────
const DEADLINE_BENEFITS = [
  { name: '에너지바우처', deadline: '2024-12-31', dday: 7, category: 'income', desc: '동절기 에너지 지원 · 최대 연 18만원' },
  { name: '청년 월세 지원', deadline: '2025-01-15', dday: 22, category: 'housing', desc: '월 최대 20만원 × 12개월' },
  { name: '아동수당 신청', deadline: '상시', dday: null, category: 'family', desc: '출생 후 60일 내 신청 권장' },
  { name: '긴급복지지원', deadline: '상시', dday: null, category: 'income', desc: '위기상황 발생 시 즉시 신청' },
];

// ── 방송 카테고리 ─────────────────────────────────────────────────────
const BROADCAST_CATEGORIES = [
  { id: 'welfare',  label: '복지 혜택', icon: '🎁', color: '#3B82F6', urgency: 'normal' },
  { id: 'disaster', label: '재난·안전', icon: '🚨', color: '#EF4444', urgency: 'high'   },
  { id: 'health',   label: '건강·의료', icon: '💉', color: '#10B981', urgency: 'normal' },
  { id: 'weather',  label: '기상 특보', icon: '🌪️', color: '#F59E0B', urgency: 'high'   },
  { id: 'life',     label: '생활 안내', icon: '🏘️', color: '#8B5CF6', urgency: 'normal' },
  { id: 'agri',     label: '농어업',   icon: '🌾', color: '#84CC16', urgency: 'normal' },
];

// ── 카테고리별 방송 템플릿 ─────────────────────────────────────────────
const BROADCAST_TEMPLATES = {
  welfare: [
    { id: 'n_pension', label: '기초연금 신청',
      official: '기초연금 신청 기간이 도래하였으니 만 65세 이상 어르신께서는 해당 읍면동 주민센터에 내방하시어 신청 절차를 이행하시기 바랍니다. 신청 시 신분증 및 통장사본을 지참하시기 바랍니다.' },
    { id: 'n_rent', label: '청년 월세 지원',
      official: '2024년도 청년 월세 한시 특별지원 사업 신청을 실시합니다. 지원 대상은 만 19세에서 34세 이하 무주택 청년으로 월세 계약자이며, 가구 소득이 기준 중위소득 60% 이하인 자에 한합니다.' },
    { id: 'n_energy', label: '에너지바우처',
      official: '에너지바우처 지원 대상자를 대상으로 동절기 에너지바우처를 지급합니다. 대상자 여부는 읍면동 주민센터에 문의하시기 바랍니다.' },
    { id: 'n_urgent', label: '긴급복지지원',
      official: '갑작스러운 위기상황으로 생계유지가 곤란한 가구를 대상으로 긴급복지지원 사업을 실시합니다. 실직, 질병, 화재 등 위기상황 발생 시 읍면동 주민센터 또는 긴급복지지원 콜센터(129)에 신청하시기 바랍니다.' },
  ],
  disaster: [
    { id: 'd_heatwave', label: '폭염 대피',
      official: '폭염특보 발효로 인한 야외 활동 자제 및 온열질환 예방을 위해 취약계층 어르신 및 독거세대에 대한 안전 여부를 확인하고 무더위쉼터 이용을 적극 권장하오니 협조하여 주시기 바랍니다.' },
    { id: 'd_typhoon', label: '태풍 주의',
      official: '태풍 북상으로 인해 강풍 및 집중호우가 예상됩니다. 저지대·하천변 거주자는 사전 대피하시고, 외출을 자제하며 창문 및 출입문을 잠그고 시설물 결박 조치를 취하여 주시기 바랍니다.' },
    { id: 'd_cold', label: '한파 주의',
      official: '한파특보 발효로 기온이 급격히 하락할 예정입니다. 독거 어르신 및 취약계층 방한 대책을 강구하고, 수도 동파 방지 조치 및 보일러 점검을 실시하여 주시기 바랍니다.' },
    { id: 'd_flood', label: '홍수·침수',
      official: '집중호우로 인한 침수 피해가 예상됩니다. 하천변, 저지대, 지하 거주자는 즉시 안전한 지역으로 대피하시고, 침수 발생 시 119 또는 읍면동 행정복지센터에 신고하여 주시기 바랍니다.' },
    { id: 'd_fire', label: '산불 주의',
      official: '건조한 날씨와 강한 바람으로 산불 발생 위험이 높습니다. 산림 내 불씨 취급에 주의하시고 산림 인근 소각 행위를 전면 자제하여 주시기 바랍니다. 산불 발견 시 즉시 119에 신고하시기 바랍니다.' },
  ],
  health: [
    { id: 'h_flu', label: '독감 예방접종',
      official: '인플루엔자(독감) 국가 예방접종 사업이 시행됩니다. 만 65세 이상 어르신 및 생후 6개월부터 13세 이하 어린이는 지정 의료기관에서 무료로 접종받으실 수 있습니다. 접종 시 신분증을 지참하시기 바랍니다.' },
    { id: 'h_covid', label: '감염병 주의',
      official: '호흡기 감염병 확산 방지를 위하여 발열, 기침 등 증상 발생 시 외출을 자제하고 마스크를 착용하여 주시기 바랍니다. 증상이 지속될 경우 관할 보건소 또는 의료기관을 방문하여 주시기 바랍니다.' },
    { id: 'h_check', label: '건강검진 안내',
      official: '국가 일반건강검진 대상자는 검진 기한 내에 가까운 검진 기관에서 검진을 받으시기 바랍니다. 검진 대상 여부 및 기관은 국민건강보험공단(1577-1000)에 문의하시기 바랍니다.' },
    { id: 'h_shelter', label: '무더위쉼터',
      official: '폭염으로 인한 온열질환 예방을 위해 마을회관, 경로당 등 무더위쉼터를 운영합니다. 혼자 거주하시는 어르신 및 취약계층 주민께서는 쉼터를 적극 이용하시기 바랍니다.' },
  ],
  weather: [
    { id: 'w_heat', label: '폭염 특보',
      official: '오늘 최고 기온 35도 이상의 폭염이 예상됩니다. 낮 12시부터 오후 5시 사이 야외 활동을 자제하시고 충분한 수분을 섭취하여 주시기 바랍니다. 어지러움, 두통 등 이상 증상 발생 시 즉시 119에 신고하시기 바랍니다.' },
    { id: 'w_rain', label: '집중호우',
      official: '강한 비와 천둥·번개가 예상됩니다. 하천변, 저지대, 산사태 위험 지역 주민은 사전 대피하시고 외출을 자제하여 주시기 바랍니다. 피해 발생 시 즉시 119에 신고하여 주시기 바랍니다.' },
    { id: 'w_snow', label: '대설 특보',
      official: '대설특보 발효로 많은 눈이 예상됩니다. 빙판길 낙상 사고에 주의하시고, 농업시설 등 시설물 피해 예방 조치를 취하여 주시기 바랍니다. 불필요한 외출을 자제하여 주시기 바랍니다.' },
    { id: 'w_dust', label: '미세먼지',
      official: '미세먼지 농도가 매우 나쁨 수준으로 예상됩니다. 외출 시 마스크를 반드시 착용하시고, 노인, 어린이, 호흡기 및 심혈관 질환자는 외출을 최대한 자제하여 주시기 바랍니다.' },
  ],
  life: [
    { id: 'l_water', label: '단수 안내',
      official: '상수도 시설 정기 점검 공사로 인해 해당 지역에 단수가 예정되어 있습니다. 단수 시간 동안 불편함이 없도록 사전에 생활용수를 충분히 확보하여 주시기 바랍니다.' },
    { id: 'l_power', label: '정전 안내',
      official: '전력 설비 보수공사로 인해 해당 지역에 일시적인 정전이 예정되어 있습니다. 의료기기 사용 가정 및 냉동식품 보관 가정에서는 사전에 필요한 조치를 취하여 주시기 바랍니다.' },
    { id: 'l_trash', label: '쓰레기 수거',
      official: '대형폐기물 및 재활용품 특별 수거를 실시합니다. 배출 방법 및 수거 일정에 따라 지정된 장소에 배출하여 주시기 바랍니다.' },
    { id: 'l_event', label: '마을 행사',
      official: '주민 화합 및 지역 공동체 활성화를 위한 마을 행사가 개최됩니다. 주민 여러분의 많은 참여와 성원을 부탁드립니다.' },
  ],
  agri: [
    { id: 'a_spray', label: '농약 살포',
      official: '병해충 방제를 위한 공동 항공 방제(농약 살포)가 실시될 예정입니다. 해당 일시에는 인근 지역 야외 활동을 자제하시고, 창문을 닫아 주시기 바랍니다.' },
    { id: 'a_harvest', label: '공동 수확',
      official: '공동 수확 작업을 시행합니다. 참여를 희망하시는 분은 읍면동 행정복지센터에 사전 신청하여 주시기 바랍니다. 참여자 여비 및 식사는 제공됩니다.' },
    { id: 'a_machine', label: '농기계 대여',
      official: '농기계 임대사업소에서 트랙터, 이앙기 등 농기계를 저렴하게 대여합니다. 이용을 희망하시는 분은 농업기술센터에 사전 예약하여 주시기 바랍니다.' },
    { id: 'a_fish', label: '어업 안전',
      official: '기상 악화로 인해 출어를 자제하여 주시기 바랍니다. 부득이하게 출어 시 구명조끼를 반드시 착용하고 기상 상황을 수시로 확인하여 안전에 유의하여 주시기 바랍니다.' },
  ],
};

// ── 하위 호환용 SAMPLE_NOTICES ────────────────────────────────────────
const SAMPLE_NOTICES = BROADCAST_TEMPLATES.welfare;
