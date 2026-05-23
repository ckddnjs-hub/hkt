'use strict';

// ── Supabase 설정 ────────────────────────────────────────────────────
const SB = {
  URL:  'https://jynktixmuhghhgayxrlv.supabase.co',
  REST: 'https://jynktixmuhghhgayxrlv.supabase.co/rest/v1',
  KEY:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bmt0aXhtdWhnaGhnYXl4cmx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MTIwMTYsImV4cCI6MjA5NTA4ODAxNn0.FYcpv08I7i6YtWCZheBZmMs-x1-3S_ILavScsu_MhVg',
  connected: false,
  sessionId: null,
};

// 공통 헤더
function sbHeaders(extra = {}) {
  return {
    'apikey': SB.KEY,
    'Authorization': `Bearer ${SB.KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

// ── 기본 요청 함수 ────────────────────────────────────────────────────
async function sbRequest(path, method = 'GET', body = null, prefer = '') {
  const opts = {
    method,
    headers: sbHeaders(prefer ? { Prefer: prefer } : {}),
    signal: AbortSignal.timeout(12000),
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${SB.REST}/${path}`, opts);
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `Supabase ${res.status}`);
  return data;
}

// ── 연결 확인 ────────────────────────────────────────────────────────
async function dbPing() {
  try {
    await sbRequest('welfare_benefits?select=id&limit=1');
    SB.connected = true;
    updateDbStatusUI(true);
    return true;
  } catch {
    SB.connected = false;
    updateDbStatusUI(false);
    return false;
  }
}

function updateDbStatusUI(connected) {
  const el = document.getElementById('db-status');
  if (!el) return;
  el.innerHTML = connected
    ? `<span style="color:var(--success)">● 연결됨</span>`
    : `<span style="color:var(--danger)">● 오프라인 (로컬 모드)</span>`;
}

// ── 세션 ID 관리 (익명 사용자 식별) ──────────────────────────────────
function getSessionId() {
  if (SB.sessionId) return SB.sessionId;
  let id = localStorage.getItem('bokjion_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('bokjion_session_id', id);
  }
  SB.sessionId = id;
  return id;
}

// ── 연령대/소득 그룹 변환 ──────────────────────────────────────────────
function toAgeGroup(age) {
  const n = parseInt(age || 0);
  if (n < 20) return '10대이하';
  if (n < 30) return '20대';
  if (n < 40) return '30대';
  if (n < 50) return '40대';
  if (n < 65) return '50-64세';
  return '65세이상';
}

function toIncomeGroup(pct) {
  const n = parseInt(pct || 100);
  if (n <= 30) return '30%이하';
  if (n <= 50) return '50%이하';
  if (n <= 75) return '75%이하';
  if (n <= 100) return '100%이하';
  return '100%초과';
}

// ════════════════════════════════════════════════════════════════════
//  1. 사용자 세션 (프로필 동기화)
// ════════════════════════════════════════════════════════════════════

async function dbSaveProfile(profile) {
  if (!profile) return;
  const sessionId = getSessionId();
  const payload = {
    session_id: sessionId,
    profile_data: profile,
    matched_benefits: APP.matchedBenefits || [],
    region: profile.region || null,
    age_group: toAgeGroup(profile.age),
    income_group: toIncomeGroup(profile.incomePercent),
    last_active: new Date().toISOString(),
  };

  try {
    // upsert (있으면 업데이트, 없으면 삽입)
    await sbRequest('user_sessions', 'POST', payload,
      'return=minimal,resolution=merge-duplicates');
    console.log('[DB] 프로필 동기화 완료');
  } catch (e) {
    console.warn('[DB] 프로필 저장 실패 (로컬만):', e.message);
  }
}

async function dbLoadProfile() {
  const sessionId = getSessionId();
  try {
    const rows = await sbRequest(
      `user_sessions?session_id=eq.${sessionId}&select=profile_data,matched_benefits&limit=1`
    );
    if (rows?.length) return rows[0];
    return null;
  } catch (e) {
    console.warn('[DB] 프로필 로드 실패:', e.message);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════
//  2. 복지 혜택 DB
// ════════════════════════════════════════════════════════════════════

async function dbFetchBenefits({ category, region, keyword, limit = 50 } = {}) {
  let path = `welfare_benefits?is_active=eq.true&order=created_at.desc&limit=${limit}`;
  if (category && category !== 'all') path += `&category=eq.${encodeURIComponent(category)}`;
  if (keyword) path += `&name=ilike.*${encodeURIComponent(keyword)}*`;

  try {
    const rows = await sbRequest(path);
    return rows || [];
  } catch (e) {
    console.warn('[DB] 혜택 로드 실패, 로컬 사용:', e.message);
    return null; // null = 로컬 폴백
  }
}

// DB 데이터를 로컬 WELFARE_DB 포맷으로 변환
function dbBenefitToLocal(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: row.amount,
    agency: row.agency,
    description: row.description,
    conditions: row.conditions || {},
    ageRange: row.age_range || [0, 120],
    tags: row.tags || [],
    documents: row.documents || [],
    applyUrl: row.apply_url || '#',
    applyOffline: row.apply_offline || '주민센터',
    difficulty: row.difficulty || 'medium',
    processDays: row.process_days || 30,
  };
}

// 로컬 WELFARE_DB 포맷 → Supabase 포맷 (시드용)
function localBenefitToDb(b) {
  return {
    id: b.id,
    name: b.name,
    category: b.category,
    amount: b.amount,
    agency: b.agency,
    description: b.description,
    conditions: b.conditions || {},
    age_range: b.ageRange || [0, 120],
    tags: b.tags || [],
    documents: b.documents || [],
    apply_url: b.applyUrl || '',
    apply_offline: b.applyOffline || '주민센터',
    difficulty: b.difficulty || 'medium',
    process_days: b.processDays || 30,
    is_active: true,
  };
}

// 로컬 WELFARE_DB를 Supabase에 시드 (최초 1회)
async function dbSeedBenefits() {
  try {
    const existing = await sbRequest('welfare_benefits?select=id&limit=1');
    if (existing?.length) {
      console.log('[DB] 혜택 데이터 이미 있음, 시드 스킵');
      return;
    }
    const rows = WELFARE_DB.map(localBenefitToDb);
    await sbRequest('welfare_benefits', 'POST', rows, 'return=minimal');
    console.log(`[DB] 혜택 ${rows.length}개 시드 완료`);
    toast(`복지 혜택 ${rows.length}개를 DB에 저장했습니다`, 'success');
  } catch (e) {
    console.warn('[DB] 시드 실패:', e.message);
  }
}

// ════════════════════════════════════════════════════════════════════
//  3. 뉴스 기사
// ════════════════════════════════════════════════════════════════════

async function dbFetchNews({ category, urgent, limit = 30 } = {}) {
  let path = `news_articles?order=published_at.desc&limit=${limit}`;
  if (category && category !== 'all') path += `&category=eq.${encodeURIComponent(category)}`;
  if (urgent) path += `&urgent=eq.true`;

  try {
    const rows = await sbRequest(path);
    return rows?.length ? rows : null;
  } catch (e) {
    console.warn('[DB] 뉴스 로드 실패, 샘플 사용:', e.message);
    return null;
  }
}

// DB 뉴스 → 로컬 포맷 변환
function dbNewsToLocal(row) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    category: row.category,
    source: row.source,
    url: row.url,
    urgent: row.urgent,
    date: row.published_at,
  };
}

// 샘플 뉴스 DB에 시드
async function dbSeedNews() {
  try {
    const existing = await sbRequest('news_articles?select=id&limit=1');
    if (existing?.length) return;
    const rows = SAMPLE_NEWS.map(n => ({
      id: n.id, title: n.title, summary: n.summary,
      category: n.category, source: n.source, url: n.url,
      urgent: n.urgent, published_at: n.date,
    }));
    await sbRequest('news_articles', 'POST', rows, 'return=minimal');
    console.log(`[DB] 뉴스 ${rows.length}개 시드 완료`);
  } catch (e) {
    console.warn('[DB] 뉴스 시드 실패:', e.message);
  }
}

// 관리자 뉴스 등록
async function dbAddNews(article) {
  try {
    const row = await sbRequest('news_articles', 'POST', {
      id: `n${Date.now()}`,
      title: article.title,
      summary: article.summary,
      category: article.category,
      source: article.source || '관리자',
      url: article.url || '#',
      urgent: article.urgent || false,
      published_at: new Date().toISOString().split('T')[0],
    }, 'return=representation');
    toast('뉴스가 등록되었습니다', 'success');
    return row?.[0];
  } catch (e) {
    toast('뉴스 등록 실패: ' + e.message, 'error');
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════
//  4. 혜택 통계
// ════════════════════════════════════════════════════════════════════

// 혜택 조회 기록
async function dbTrackBenefitView(benefitId) {
  if (!benefitId || !SB.connected) return;
  try {
    // upsert: 없으면 생성, 있으면 view_count +1
    await sbRequest(
      'benefit_stats', 'POST',
      { benefit_id: benefitId, view_count: 1 },
      'resolution=merge-duplicates'
    );
    // view_count RPC 대신 별도 update
    await sbRequest(
      `benefit_stats?benefit_id=eq.${benefitId}`,
      'PATCH',
      { view_count: null, updated_at: new Date().toISOString() }
    );
  } catch (e) {
    // 통계 실패는 조용히 무시
  }
}

// 인기 혜택 순위
async function dbFetchPopularBenefits(limit = 5) {
  try {
    const stats = await sbRequest(
      `benefit_stats?order=view_count.desc&limit=${limit}&select=benefit_id,view_count`
    );
    return stats || [];
  } catch {
    return [];
  }
}

// ════════════════════════════════════════════════════════════════════
//  5. 집계 통계 (대시보드용)
// ════════════════════════════════════════════════════════════════════

async function dbFetchStats() {
  try {
    const [sessions, benefits, news] = await Promise.all([
      sbRequest('user_sessions?select=count', 'GET', null, '').catch(() => null),
      sbRequest('welfare_benefits?select=count&is_active=eq.true').catch(() => null),
      sbRequest('news_articles?select=count').catch(() => null),
    ]);
    return {
      users: sessions?.[0]?.count || 0,
      benefits: benefits?.[0]?.count || 0,
      news: news?.[0]?.count || 0,
    };
  } catch {
    return { users: 0, benefits: 0, news: 0 };
  }
}

// 지역별 사용자 분포
async function dbFetchRegionStats() {
  try {
    return await sbRequest(
      'user_sessions?select=region&region=not.is.null'
    ) || [];
  } catch {
    return [];
  }
}

// ════════════════════════════════════════════════════════════════════
//  6. 초기화 (앱 부팅 시 호출)
// ════════════════════════════════════════════════════════════════════

async function dbInit() {
  console.log('[DB] Supabase 초기화 중...');
  const ok = await dbPing();
  if (!ok) {
    console.log('[DB] 오프라인 모드로 실행');
    return false;
  }

  // 최초 실행 시 샘플 데이터 시드
  const seeded = localStorage.getItem('bokjion_db_seeded');
  if (!seeded) {
    await Promise.all([dbSeedBenefits(), dbSeedNews()]);
    localStorage.setItem('bokjion_db_seeded', '1');
  }

  // 세션 복구 시도
  const remote = await dbLoadProfile();
  if (remote?.profile_data && !APP.profile) {
    APP.profile = remote.profile_data;
    APP.matchedBenefits = remote.matched_benefits || [];
    saveProfile(remote.profile_data);
    console.log('[DB] 원격 프로필 복구 완료');
  }

  return true;
}

// ════════════════════════════════════════════════════════════════════
//  7. 생애계획 (정책 인사이트용 집계)
// ════════════════════════════════════════════════════════════════════

async function dbSaveLifePlan(plan, profile) {
  if (!plan || !profile) return;
  const sessionId = getSessionId();
  const payload = {
    session_id: sessionId,
    plan_ids: Object.keys(plan),
    plan_data: plan,
    region: profile.region || null,
    age_group: toAgeGroup(profile.age),
    income_group: toIncomeGroup(profile.incomePercent),
    saved_at: new Date().toISOString(),
  };
  try {
    await sbRequest('life_plans', 'POST', payload,
      'return=minimal,resolution=merge-duplicates');
    console.log('[DB] 생애계획 저장 완료');
  } catch (e) {
    console.warn('[DB] 생애계획 저장 실패:', e.message);
  }
}

async function dbFetchLifePlanStats() {
  const rows = await sbRequest('life_plans?select=plan_ids,region,age_group&limit=1000');
  if (!rows?.length) throw new Error('no data');

  // 클라이언트 집계
  const byPlan = {};
  rows.forEach(r => {
    (r.plan_ids || []).forEach(id => { byPlan[id] = (byPlan[id] || 0) + 1; });
  });
  const byRegionMap = {};
  rows.forEach(r => {
    if (r.region) byRegionMap[r.region] = (byRegionMap[r.region] || 0) + 1;
  });

  const optMap = {};
  LIFE_PLAN_OPTIONS.forEach(o => { optMap[o.id] = o; });

  const totalResponses = rows.length;
  const by_plan = Object.entries(byPlan)
    .map(([id, count]) => ({
      id, count,
      icon: optMap[id]?.icon || '📋',
      label: optMap[id]?.label || id,
      pct: parseFloat((count / totalResponses * 100).toFixed(1)),
      top_timeframe: '집계 중',
      gap: optMap[id]?.policyTag || '',
    }))
    .sort((a, b) => b.count - a.count);

  const by_region = Object.entries(byRegionMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([region, count]) => ({ region, count, top_need: '집계 중' }));

  return {
    total_responses: totalResponses,
    by_plan,
    by_region,
    policy_gaps: getMockPolicyStats().policy_gaps,
  };
}

// ── DB 연동된 혜택 로드 (DB 우선, 실패 시 로컬 폴백) ──────────────────
async function loadBenefitsWithDB(filterOpts = {}) {
  if (!SB.connected) return null;
  const rows = await dbFetchBenefits(filterOpts);
  if (!rows) return null;
  return rows.map(dbBenefitToLocal);
}

// ── DB 연동된 뉴스 로드 ─────────────────────────────────────────────
async function loadNewsWithDB(filterOpts = {}) {
  if (!SB.connected) return null;
  const rows = await dbFetchNews(filterOpts);
  if (!rows) return null;
  return rows.map(dbNewsToLocal);
}
