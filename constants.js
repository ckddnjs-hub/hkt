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
