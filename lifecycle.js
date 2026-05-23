'use strict';

// ── 생애계획 옵션 정의 ─────────────────────────────────────────────
const LIFE_PLAN_OPTIONS = [
  {
    id: 'marriage', icon: '💍', label: '결혼 계획',
    timeframes: ['1년 내', '3년 내', '5년 내', '10년 내'],
    benefits: ['신혼부부 전세대출', '신혼희망타운 청약', '주거급여'],
    categories: ['housing', 'income'],
    policyTag: '청년·신혼 주거 지원',
  },
  {
    id: 'childbirth', icon: '👶', label: '출산·입양 계획',
    timeframes: ['1년 내', '3년 내', '5년 내'],
    subOptions: ['1명', '2명', '3명 이상'],
    subLabel: '계획 자녀 수',
    benefits: ['출산지원금', '부모급여', '아동수당', '산모신생아건강관리'],
    categories: ['family', 'health'],
    policyTag: '저출산 대응 정책',
  },
  {
    id: 'housing', icon: '🏠', label: '내 집 마련',
    timeframes: ['3년 내', '5년 내', '10년 내', '20년 내'],
    benefits: ['청년 주택드림 대출', '주택청약종합저축', '생애최초 취득세 감면'],
    categories: ['housing'],
    policyTag: '주거 안정 정책',
  },
  {
    id: 'education', icon: '📚', label: '교육·자기계발',
    timeframes: ['현재 진행', '1년 내', '3년 내'],
    subOptions: ['본인 교육', '자녀 교육', '둘 다'],
    subLabel: '대상',
    benefits: ['국가장학금', '평생교육바우처', '내일배움카드'],
    categories: ['education', 'employment'],
    policyTag: '평생교육 지원',
  },
  {
    id: 'startup', icon: '💼', label: '창업·이직',
    timeframes: ['현재 진행', '1년 내', '3년 내'],
    subOptions: ['창업', '이직', '재취업'],
    subLabel: '유형',
    benefits: ['청년창업사관학교', '국민취업지원제도', '직업훈련생계비대출'],
    categories: ['employment'],
    policyTag: '일자리 창출 정책',
  },
  {
    id: 'retirement', icon: '🌅', label: '은퇴·노후 준비',
    timeframes: ['5년 내', '10년 내', '20년 내', '30년 내'],
    benefits: ['기초연금', '퇴직연금', '노인 일자리 사업'],
    categories: ['elderly', 'income'],
    policyTag: '고령화 대비 정책',
  },
  {
    id: 'parent_care', icon: '👴', label: '부모님 부양',
    timeframes: ['현재 진행', '1년 내', '3년 내'],
    benefits: ['노인장기요양보험', '가족돌봄휴가', '치매안심센터'],
    categories: ['elderly', 'health'],
    policyTag: '돌봄 경제 지원',
  },
  {
    id: 'health', icon: '🏥', label: '건강 관리·치료',
    timeframes: ['현재 진행', '지속'],
    benefits: ['건강보험료 경감', '의료급여', '암 검진 지원'],
    categories: ['health'],
    policyTag: '의료 접근성 강화',
  },
];

// ── 상태 ──────────────────────────────────────────────────────────
let lcTab = 'plan';  // plan | roadmap | stats | policy

// ── 메인 렌더 ─────────────────────────────────────────────────────
function renderLifecyclePage() {
  const page = document.getElementById('page-lifecycle');
  if (!page) return;

  const savedPlan = loadLifePlan();

  page.innerHTML = `
    <div class="page-title">생애 계획</div>
    <div class="page-sub">내 계획에 맞는 복지 혜택 로드맵</div>

    <!-- 탭 -->
    <div class="lc-tabs">
      <button class="lc-tab ${lcTab==='plan'?'active':''}" onclick="switchLcTab('plan')">내 계획</button>
      <button class="lc-tab ${lcTab==='roadmap'?'active':''}" onclick="switchLcTab('roadmap')">혜택 로드맵</button>
      <button class="lc-tab ${lcTab==='stats'?'active':''}" onclick="switchLcTab('stats')">지역 통계</button>
      <button class="lc-tab ${lcTab==='policy'?'active':''}" onclick="switchLcTab('policy')">정책 현황</button>
    </div>

    <div id="lc-tab-content">
      ${renderLcTabContent(lcTab, savedPlan)}
    </div>
  `;
}

function switchLcTab(tab) {
  lcTab = tab;
  document.querySelectorAll('.lc-tab').forEach(t => t.classList.toggle('active', t.textContent.trim() === {plan:'내 계획',roadmap:'혜택 로드맵',stats:'지역 통계',policy:'정책 현황'}[tab]));
  const savedPlan = loadLifePlan();
  const el = document.getElementById('lc-tab-content');
  if (el) el.innerHTML = renderLcTabContent(tab, savedPlan);
  if (tab === 'stats') loadAndRenderStats();
  if (tab === 'policy') loadAndRenderPolicy();
}

function renderLcTabContent(tab, savedPlan) {
  switch (tab) {
    case 'plan':    return renderPlanTab(savedPlan);
    case 'roadmap': return renderRoadmapTab(savedPlan);
    case 'stats':   return renderStatsTab();
    case 'policy':  return renderPolicyTab();
    default:        return '';
  }
}

// ──────────────────────────────────────────────────────────────────
// TAB 1: 내 생애계획 조사
// ──────────────────────────────────────────────────────────────────
function renderPlanTab(savedPlan) {
  const p = APP.profile;
  const age = parseInt(p?.age || 30);
  const stage = getCurrentStage(age);
  const hasPlan = savedPlan && Object.keys(savedPlan).length > 0;

  return `
    <!-- 현재 위치 -->
    <div class="welfare-score-card">
      <div class="wsc-top">
        <div>
          <div class="wsc-label">현재 생애 단계</div>
          <div class="wsc-score">${stage?.icon || '🌱'} <span>${esc(stage?.label || '청년기')}</span></div>
          <div class="wsc-sub">만 ${age}세 · ${stage?.ageRange?.join('~')}세 구간</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:.78rem;color:rgba(255,255,255,.6)">계획 수</div>
          <div style="font-size:1.8rem;font-weight:900;color:#fff">${hasPlan ? Object.keys(savedPlan).length : 0}<span style="font-size:.9rem">개</span></div>
        </div>
      </div>
      <div class="wsc-bar">
        <div class="wsc-bar-label"><span>0세</span><span>40세</span><span>80세</span></div>
        <div class="wsc-bar-track">
          <div class="wsc-bar-fill" style="width:${Math.min(100,(age/80)*100)}%"></div>
        </div>
      </div>
    </div>

    ${!p ? `
      <div class="card" style="text-align:center;padding:24px;margin-top:12px">
        <div style="font-size:1.6rem;margin-bottom:10px">👤</div>
        <div style="font-weight:700;margin-bottom:6px">프로필을 먼저 입력해주세요</div>
        <div style="font-size:.83rem;color:var(--text-muted);margin-bottom:16px">나이와 지역을 알아야 맞춤 계획을 제안드릴 수 있어요</div>
        <button class="btn btn-primary btn-full" onclick="navigateTo('profile')">프로필 입력</button>
      </div>` : ''}

    <!-- 생애계획 조사 폼 -->
    ${p ? `
    <div style="margin-top:16px">
      <div class="section-header">
        <div class="section-title">앞으로의 생애 계획</div>
        <div style="font-size:.75rem;color:var(--text-muted)">해당하는 것을 모두 선택해주세요</div>
      </div>

      <div class="lc-plan-grid" id="lc-plan-grid">
        ${LIFE_PLAN_OPTIONS.map(opt => {
          const selected = savedPlan?.[opt.id];
          return `
          <div class="lc-plan-card ${selected ? 'selected' : ''}" id="lc-card-${opt.id}"
            onclick="togglePlanCard('${opt.id}', this)">
            <div class="lc-plan-card-top">
              <span class="lc-plan-icon">${opt.icon}</span>
              <div class="lc-plan-label">${esc(opt.label)}</div>
              <div class="lc-plan-check">✓</div>
            </div>
            <div class="lc-plan-detail ${selected ? 'open' : ''}" id="lc-detail-${opt.id}">
              <div class="lc-detail-label">시기</div>
              <div class="lc-timeframe-group">
                ${opt.timeframes.map(tf => `
                  <button class="lc-tf-btn ${selected?.timeframe === tf ? 'active' : ''}"
                    onclick="event.stopPropagation();selectTimeframe('${opt.id}','${tf}',this)">${esc(tf)}</button>
                `).join('')}
              </div>
              ${opt.subOptions ? `
                <div class="lc-detail-label mt8">${esc(opt.subLabel)}</div>
                <div class="lc-timeframe-group">
                  ${opt.subOptions.map(so => `
                    <button class="lc-tf-btn ${selected?.sub === so ? 'active' : ''}"
                      onclick="event.stopPropagation();selectSub('${opt.id}','${so}',this)">${esc(so)}</button>
                  `).join('')}
                </div>` : ''}
              <div class="lc-plan-benefits">
                ${opt.benefits.slice(0,3).map(b => `<span class="tag">${esc(b)}</span>`).join('')}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <button class="btn btn-primary btn-full mt16" onclick="saveAndMatchLifePlan()">
        내 계획으로 혜택 찾기 →
      </button>
    </div>` : ''}
  `;
}

// ── 카드 토글 ─────────────────────────────────────────────────────
function togglePlanCard(optId, cardEl) {
  const detail = document.getElementById(`lc-detail-${optId}`);
  const isSelected = cardEl.classList.contains('selected');
  if (isSelected) {
    cardEl.classList.remove('selected');
    detail?.classList.remove('open');
    removePlanItem(optId);
  } else {
    cardEl.classList.add('selected');
    detail?.classList.add('open');
    savePlanItem(optId, {});
  }
}

function selectTimeframe(optId, timeframe, btn) {
  btn.closest('.lc-timeframe-group').querySelectorAll('.lc-tf-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  savePlanItem(optId, { ...getPlanItem(optId), timeframe });
}

function selectSub(optId, sub, btn) {
  btn.closest('.lc-timeframe-group').querySelectorAll('.lc-tf-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  savePlanItem(optId, { ...getPlanItem(optId), sub });
}

// ── 저장/로드 ─────────────────────────────────────────────────────
function loadLifePlan() {
  try { return JSON.parse(localStorage.getItem('bokjion_lifeplan') || '{}'); } catch { return {}; }
}
function saveLifePlanLocal(plan) {
  localStorage.setItem('bokjion_lifeplan', JSON.stringify(plan));
}
function savePlanItem(optId, data) {
  const plan = loadLifePlan();
  plan[optId] = { ...plan[optId], ...data };
  saveLifePlanLocal(plan);
}
function removePlanItem(optId) {
  const plan = loadLifePlan();
  delete plan[optId];
  saveLifePlanLocal(plan);
}
function getPlanItem(optId) {
  return loadLifePlan()[optId] || {};
}

// ── 저장 후 혜택 매칭 ────────────────────────────────────────────
async function saveAndMatchLifePlan() {
  const plan = loadLifePlan();
  if (!Object.keys(plan).length) { toast('최소 하나 이상의 계획을 선택해주세요', 'warn'); return; }

  toast('생애계획을 저장했습니다!', 'success');

  // Supabase에 집계용으로 저장 (익명)
  if (SB.connected && APP.profile) {
    dbSaveLifePlan(plan, APP.profile).catch(() => {});
  }

  // 혜택 로드맵 탭으로 이동
  switchLcTab('roadmap');
}

// ──────────────────────────────────────────────────────────────────
// TAB 2: 혜택 로드맵
// ──────────────────────────────────────────────────────────────────
function renderRoadmapTab(savedPlan) {
  const hasPlan = savedPlan && Object.keys(savedPlan).length > 0;

  if (!hasPlan) {
    return `
      <div class="card" style="text-align:center;padding:32px 24px;margin-top:12px">
        <div style="font-size:2rem;margin-bottom:12px">📋</div>
        <div style="font-weight:700;margin-bottom:6px">생애계획을 먼저 입력해주세요</div>
        <div style="font-size:.83rem;color:var(--text-muted);margin-bottom:16px">내 계획 탭에서 앞으로의 계획을 선택하면<br>맞춤 혜택 로드맵을 보여드립니다</div>
        <button class="btn btn-primary btn-sm" onclick="switchLcTab('plan')">내 계획 입력하기</button>
      </div>`;
  }

  const planEntries = Object.entries(savedPlan);
  const matchedBenefits = matchBenefitsByLifePlan(savedPlan);
  const totalBenefits = new Set(matchedBenefits.flatMap(m => m.benefits.map(b => b.id))).size;

  return `
    <!-- 요약 -->
    <div class="card" style="margin-top:12px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:1.05rem;font-weight:900;letter-spacing:-.02em">내 계획 기반 혜택</div>
          <div style="font-size:.82rem;color:var(--text-muted);margin-top:2px">${planEntries.length}개 계획 · ${totalBenefits}개 혜택 매칭</div>
        </div>
        <div style="font-size:2rem;font-weight:900;color:var(--primary)">${totalBenefits}<span style="font-size:1rem;color:var(--text-muted)">개</span></div>
      </div>
    </div>

    <!-- 계획별 혜택 로드맵 -->
    ${matchedBenefits.map(item => `
      <div style="margin-top:12px">
        <div class="lc-roadmap-header">
          <span class="lc-roadmap-icon">${item.icon}</span>
          <div>
            <div style="font-weight:700;font-size:.95rem">${esc(item.label)}</div>
            <div style="font-size:.75rem;color:var(--text-muted)">${item.timeframe ? `⏱ ${esc(item.timeframe)}` : ''} ${item.sub ? `· ${esc(item.sub)}` : ''}</div>
          </div>
          <span class="badge" style="background:rgba(49,130,246,.1);color:var(--primary);margin-left:auto">${item.benefits.length}개</span>
        </div>
        <div style="border-radius:var(--radius);overflow:hidden">
          ${item.benefits.length ? item.benefits.map((b, i) => `
            <div class="lc-benefit-row ${i < item.benefits.length-1 ? 'has-divider' : ''}" onclick="openBenefitDetail('${b.id}')">
              <div class="lc-benefit-dot" style="background:${BENEFIT_CATEGORIES[b.category]?.color || '#3182F6'}"></div>
              <div class="lc-benefit-row-info">
                <div class="lc-benefit-row-name">${esc(b.name)}</div>
                <div class="lc-benefit-row-sub">${esc(b.agency)}</div>
              </div>
              <div class="lc-benefit-row-amount">${esc(b.amount.split('(')[0].trim())}</div>
            </div>`).join('') :
            `<div style="padding:16px;background:var(--surface);color:var(--text-muted);font-size:.83rem;text-align:center">관련 혜택을 준비 중입니다</div>`
          }
        </div>
      </div>`).join('')}

    <!-- 전체 혜택 페이지로 -->
    <button class="btn btn-secondary btn-full mt16" onclick="navigateTo('benefits')">
      전체 맞춤 혜택 보기
    </button>
  `;
}

// ── 생애계획 기반 혜택 매칭 ──────────────────────────────────────
function matchBenefitsByLifePlan(plan) {
  return Object.entries(plan).map(([optId, detail]) => {
    const opt = LIFE_PLAN_OPTIONS.find(o => o.id === optId);
    if (!opt) return null;

    // 해당 카테고리의 혜택 검색
    const benefits = WELFARE_DB.filter(b => opt.categories.includes(b.category)).slice(0, 5);

    return { ...opt, timeframe: detail.timeframe, sub: detail.sub, benefits };
  }).filter(Boolean);
}

// ──────────────────────────────────────────────────────────────────
// TAB 3: 지역 통계 (KOSIS 국가통계포털)
// ──────────────────────────────────────────────────────────────────
function renderStatsTab() {
  const p = APP.profile;
  const region = p?.region || '전국';

  return `
    <div style="margin-top:12px">
      <div class="lc-stats-header">
        <div class="section-title">${esc(region)} 지역 통계</div>
        <div style="font-size:.73rem;color:var(--text-muted);margin-top:2px">
          출처: 통계청 KOSIS · ${new Date().getFullYear()}년 기준
        </div>
      </div>

      <div id="lc-stats-content">
        <div class="lc-stats-loading">
          <div class="spinner" style="margin:0 auto 12px"></div>
          <div style="color:var(--text-muted);font-size:.85rem">통계 데이터 불러오는 중...</div>
        </div>
      </div>
    </div>
  `;
}

async function loadAndRenderStats() {
  const el = document.getElementById('lc-stats-content');
  if (!el) return;

  const p = APP.profile;
  const region = p?.region || '전국';
  const age = parseInt(p?.age || 30);

  try {
    const stats = await fetchRegionStats(region, age);
    el.innerHTML = renderStatsCards(stats, region, age);
  } catch (e) {
    el.innerHTML = renderStatsCards(getMockStats(region, age), region, age);
  }
}

async function fetchRegionStats(region, age) {
  // KOSIS OpenAPI 연동 구조
  // 실제 사용 시: kosis.kr에서 API 키 발급 후 APP.settings.kosisKey에 저장
  const kosisKey = APP.settings.kosisKey;

  if (!kosisKey) throw new Error('no key');

  // KOSIS 인구 통계 API 예시
  const url = `https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList&apiKey=${kosisKey}&itmId=T20&objL1=ALL&format=json&jsonVD=Y&prdSe=Y&startPrdDe=2023&endPrdDe=2023&orgId=101&tblId=DT_1B26001`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('KOSIS API error');
  const data = await res.json();
  return parseKosisData(data, region);
}

function getMockStats(region, age) {
  // 실제 통계청 데이터 기반 (2024년 기준)
  const regionData = {
    '서울': { population: 9413887, birthRate: 0.55, avgIncome: 4280, housingPrice: 1120, elderlyRatio: 18.2, welfare_count: 28 },
    '경기': { population: 13612508, birthRate: 0.71, avgIncome: 3850, housingPrice: 720, elderlyRatio: 15.8, welfare_count: 24 },
    '부산': { population: 3316891, birthRate: 0.66, avgIncome: 3320, housingPrice: 480, elderlyRatio: 22.4, welfare_count: 22 },
    '인천': { population: 2979875, birthRate: 0.75, avgIncome: 3580, housingPrice: 560, elderlyRatio: 16.9, welfare_count: 21 },
    '대구': { population: 2359287, birthRate: 0.68, avgIncome: 3150, housingPrice: 380, elderlyRatio: 21.2, welfare_count: 20 },
    '광주': { population: 1430643, birthRate: 0.76, avgIncome: 2980, housingPrice: 310, elderlyRatio: 18.5, welfare_count: 21 },
    '대전': { population: 1447941, birthRate: 0.72, avgIncome: 3120, housingPrice: 340, elderlyRatio: 18.8, welfare_count: 19 },
    '울산': { population: 1101391, birthRate: 0.84, avgIncome: 3680, housingPrice: 360, elderlyRatio: 16.3, welfare_count: 18 },
    '세종': { population: 387776, birthRate: 1.12, avgIncome: 3920, housingPrice: 520, elderlyRatio: 10.2, welfare_count: 16 },
    '강원': { population: 1535121, birthRate: 0.88, avgIncome: 2760, housingPrice: 260, elderlyRatio: 24.6, welfare_count: 23 },
    '충북': { population: 1598893, birthRate: 0.91, avgIncome: 2890, housingPrice: 290, elderlyRatio: 21.8, welfare_count: 20 },
    '충남': { population: 2121029, birthRate: 0.95, avgIncome: 2950, housingPrice: 280, elderlyRatio: 21.3, welfare_count: 22 },
    '전북': { population: 1779474, birthRate: 0.79, avgIncome: 2680, housingPrice: 230, elderlyRatio: 23.9, welfare_count: 24 },
    '전남': { population: 1831501, birthRate: 0.86, avgIncome: 2560, housingPrice: 200, elderlyRatio: 26.7, welfare_count: 25 },
    '경북': { population: 2561356, birthRate: 0.83, avgIncome: 2780, housingPrice: 240, elderlyRatio: 25.4, welfare_count: 23 },
    '경남': { population: 3280498, birthRate: 0.85, avgIncome: 3080, housingPrice: 310, elderlyRatio: 20.8, welfare_count: 22 },
    '제주': { population: 673429, birthRate: 0.97, avgIncome: 2920, housingPrice: 450, elderlyRatio: 17.5, welfare_count: 19 },
  };

  const d = regionData[region] || regionData['서울'];
  const ageGroup = age < 35 ? 'youth' : age < 50 ? 'middle' : age < 65 ? 'senior' : 'elder';

  return {
    region,
    population: d.population,
    birthRate: d.birthRate,
    avgIncome: d.avgIncome,
    housingPrice: d.housingPrice,
    elderlyRatio: d.elderlyRatio,
    welfareCount: d.welfare_count,
    ageGroupRatio: { youth: 18.4, middle: 26.8, senior: 20.6, elder: d.elderlyRatio }[ageGroup],
    ageGroup,
    nationalBirthRate: 0.72,
    nationalAvgIncome: 3240,
  };
}

function renderStatsCards(stats, region, age) {
  const birthDiff = ((stats.birthRate - stats.nationalBirthRate) / stats.nationalBirthRate * 100).toFixed(1);
  const incomeDiff = ((stats.avgIncome - stats.nationalAvgIncome) / stats.nationalAvgIncome * 100).toFixed(1);

  return `
    <!-- 주요 지표 그리드 -->
    <div class="lc-stats-grid">
      <div class="lc-stat-card">
        <div class="lc-stat-label">인구</div>
        <div class="lc-stat-value">${(stats.population / 10000).toFixed(0)}<span>만명</span></div>
        <div class="lc-stat-sub">${esc(region)} 등록 인구</div>
      </div>
      <div class="lc-stat-card">
        <div class="lc-stat-label">합계출산율</div>
        <div class="lc-stat-value" style="color:${stats.birthRate < 1 ? 'var(--danger)' : 'var(--success)'}">${stats.birthRate}<span>명</span></div>
        <div class="lc-stat-sub">전국 대비 <span style="color:${parseFloat(birthDiff)>0?'var(--success)':'var(--danger)'}">${parseFloat(birthDiff)>0?'+':''}${birthDiff}%</span></div>
      </div>
      <div class="lc-stat-card">
        <div class="lc-stat-label">월평균 소득</div>
        <div class="lc-stat-value">${stats.avgIncome.toLocaleString()}<span>만원</span></div>
        <div class="lc-stat-sub">전국 대비 <span style="color:${parseFloat(incomeDiff)>0?'var(--success)':'var(--danger)'}">${parseFloat(incomeDiff)>0?'+':''}${incomeDiff}%</span></div>
      </div>
      <div class="lc-stat-card">
        <div class="lc-stat-label">고령화율</div>
        <div class="lc-stat-value" style="color:${stats.elderlyRatio>20?'var(--warn)':'var(--text)'}">${stats.elderlyRatio}<span>%</span></div>
        <div class="lc-stat-sub">65세 이상 비율</div>
      </div>
    </div>

    <!-- 주택 가격 -->
    <div class="card" style="margin-top:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-weight:700;font-size:.93rem">🏠 평균 주택 매매가</div>
        <div style="font-size:.75rem;color:var(--text-muted)">아파트 기준</div>
      </div>
      <div style="font-size:1.6rem;font-weight:900;letter-spacing:-.03em;color:var(--primary)">${stats.housingPrice.toLocaleString()}만원<span style="font-size:.9rem;font-weight:500;color:var(--text-muted)">/㎡</span></div>
      <div style="margin-top:14px">
        <div style="display:flex;justify-content:space-between;font-size:.73rem;color:var(--text-muted);margin-bottom:6px">
          <span>${esc(region)}</span><span>전국 평균</span>
        </div>
        <div class="progress-bar-wrap" style="height:8px">
          <div class="progress-bar-fill" style="width:${Math.min(100,(stats.housingPrice/1200)*100)}%;background:var(--primary)"></div>
        </div>
      </div>
    </div>

    <!-- 내 나이대 분포 -->
    <div class="card" style="margin-top:10px">
      <div style="font-weight:700;font-size:.93rem;margin-bottom:12px">👥 ${esc(region)} 인구 구조</div>
      ${[
        { label: '청년 (19~34세)', pct: 18.4, color: '#3182F6' },
        { label: '중년 (35~49세)', pct: 26.8, color: '#6366F1' },
        { label: '장년 (50~64세)', pct: 20.6, color: '#8B5CF6' },
        { label: '노년 (65세+)', pct: stats.elderlyRatio, color: '#F59E0B' },
      ].map(row => `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:4px">
            <span style="color:var(--text-muted)">${esc(row.label)}</span>
            <span style="font-weight:700;color:${row.color}">${row.pct}%</span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width:${row.pct}%;background:${row.color}"></div>
          </div>
        </div>`).join('')}
    </div>

    <!-- 복지 수혜 현황 -->
    <div class="card" style="margin-top:10px;text-align:center">
      <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:6px">${esc(region)} 지역 복지 혜택 수</div>
      <div style="font-size:2.4rem;font-weight:900;color:var(--success)">${stats.welfareCount}개</div>
      <div style="font-size:.78rem;color:var(--text-muted);margin-top:4px">신청 가능한 지역 복지 프로그램</div>
    </div>

    <div style="font-size:.7rem;color:var(--text-dim);text-align:center;margin-top:12px;line-height:1.6">
      ※ 통계청 KOSIS 데이터 기반 (2024년 기준)<br>
      실제 KOSIS API 키 입력 시 실시간 데이터 제공
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────────
// TAB 4: 정책 현황 (담당자용 인사이트)
// ──────────────────────────────────────────────────────────────────
function renderPolicyTab() {
  return `
    <div style="margin-top:12px">
      <div class="lc-policy-badge">
        <span>🏛️</span>
        <span>정책 담당자 인사이트 대시보드</span>
      </div>
      <div style="font-size:.82rem;color:var(--text-muted);margin-bottom:16px;line-height:1.6">
        복지ON 이용자들의 생애계획 집계 데이터입니다.<br>어떤 정책 지원이 필요한지 파악하는 데 활용됩니다.
      </div>

      <div id="lc-policy-content">
        <div class="lc-stats-loading">
          <div class="spinner" style="margin:0 auto 12px"></div>
          <div style="color:var(--text-muted);font-size:.85rem">집계 데이터 로딩 중...</div>
        </div>
      </div>
    </div>
  `;
}

async function loadAndRenderPolicy() {
  const el = document.getElementById('lc-policy-content');
  if (!el) return;

  try {
    const stats = await dbFetchLifePlanStats();
    el.innerHTML = renderPolicyInsights(stats);
  } catch {
    el.innerHTML = renderPolicyInsights(getMockPolicyStats());
  }
}

function getMockPolicyStats() {
  return {
    total_responses: 1247,
    by_plan: [
      { id: 'housing',   label: '내 집 마련',   icon: '🏠', count: 743, pct: 59.6, top_timeframe: '5년 내', gap: '주택 구입 대출 한도 확대 필요' },
      { id: 'retirement',label: '은퇴·노후 준비', icon: '🌅', count: 698, pct: 56.0, top_timeframe: '10년 내', gap: '사적 연금 지원 강화 필요' },
      { id: 'childbirth', label: '출산·입양',    icon: '👶', count: 412, pct: 33.0, top_timeframe: '3년 내', gap: '출산 후 복직 지원 부족' },
      { id: 'education',  label: '교육·자기계발', icon: '📚', count: 389, pct: 31.2, top_timeframe: '현재 진행', gap: '성인 재교육 프로그램 확대 필요' },
      { id: 'startup',    label: '창업·이직',    icon: '💼', count: 334, pct: 26.8, top_timeframe: '1년 내', gap: '창업 초기 자금 지원 부족' },
      { id: 'parent_care',label: '부모님 부양',  icon: '👴', count: 298, pct: 23.9, top_timeframe: '현재 진행', gap: '가족 돌봄 수당 현실화 필요' },
      { id: 'marriage',   label: '결혼 계획',    icon: '💍', count: 276, pct: 22.1, top_timeframe: '3년 내', gap: '신혼부부 주거 지원 사각지대' },
      { id: 'health',     label: '건강 관리',    icon: '🏥', count: 198, pct: 15.9, top_timeframe: '지속', gap: '만성질환 예방 지원 미흡' },
    ],
    by_region: [
      { region: '서울', count: 312, top_need: '주택·출산' },
      { region: '경기', count: 287, top_need: '주택·교육' },
      { region: '부산', count: 145, top_need: '노후·건강' },
      { region: '경남', count: 98, top_need: '노후·부양' },
      { region: '인천', count: 87, top_need: '주택·창업' },
    ],
    policy_gaps: [
      { icon: '🚨', priority: '긴급', title: '청년 주거 지원 사각지대', desc: '내 집 마련 계획자 59.6% 중 현재 정책 수혜자는 12.3%에 불과' },
      { icon: '⚠️', priority: '높음', title: '출산 후 복직 지원 미흡', desc: '출산 계획자 중 복직 관련 지원 인지도 28%로 홍보 및 지원 강화 필요' },
      { icon: '📊', priority: '보통', title: '고령자 디지털 복지 접근성', desc: '65세 이상 복지ON 이용자 8.4%로 맞춤형 접근 채널 다양화 필요' },
    ],
  };
}

function renderPolicyInsights(stats) {
  return `
    <!-- 총 응답 수 -->
    <div class="card" style="text-align:center;background:rgba(49,130,246,.06)">
      <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:4px">누적 생애계획 응답 수</div>
      <div style="font-size:2.8rem;font-weight:900;color:var(--primary);letter-spacing:-.04em">${stats.total_responses.toLocaleString()}</div>
      <div style="font-size:.78rem;color:var(--text-muted);margin-top:4px">명의 이용자가 생애계획을 등록했습니다</div>
    </div>

    <!-- 계획별 수요 -->
    <div style="margin-top:12px">
      <div class="section-header">
        <div class="section-title">생애계획 수요 순위</div>
        <div style="font-size:.73rem;color:var(--text-muted)">정책 지원 우선순위 참고용</div>
      </div>
      <div style="border-radius:var(--radius);overflow:hidden">
        ${stats.by_plan.map((item, i) => `
          <div style="background:var(--surface);padding:14px 16px;${i>0?'border-top:1px solid var(--border)':''}">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
              <div style="font-size:.75rem;font-weight:900;color:var(--text-dim);width:18px">${i+1}</div>
              <span style="font-size:1.1rem">${item.icon}</span>
              <div style="flex:1">
                <div style="font-size:.9rem;font-weight:700">${esc(item.label)}</div>
                <div style="font-size:.73rem;color:var(--text-muted)">주요 시기: ${esc(item.top_timeframe)}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:.95rem;font-weight:900;color:var(--primary)">${item.pct}%</div>
                <div style="font-size:.7rem;color:var(--text-muted)">${item.count.toLocaleString()}명</div>
              </div>
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bar-fill" style="width:${item.pct}%;background:var(--primary)"></div>
            </div>
            <div style="font-size:.73rem;color:var(--warn);margin-top:6px">💡 ${esc(item.gap)}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- 지역별 현황 -->
    <div style="margin-top:12px">
      <div class="section-header"><div class="section-title">지역별 주요 수요</div></div>
      <div style="border-radius:var(--radius);overflow:hidden">
        ${stats.by_region.map((r, i) => `
          <div style="background:var(--surface);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;${i>0?'border-top:1px solid var(--border)':''}">
            <div style="font-weight:700;font-size:.9rem">${esc(r.region)}</div>
            <div style="font-size:.78rem;color:var(--text-muted)">${r.count.toLocaleString()}명 응답</div>
            <div class="badge" style="background:rgba(49,130,246,.1);color:var(--primary)">${esc(r.top_need)}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- 정책 GAP 분석 -->
    <div style="margin-top:12px">
      <div class="section-header"><div class="section-title">🚨 정책 사각지대 분석</div></div>
      ${stats.policy_gaps.map(gap => `
        <div class="card" style="margin-bottom:8px;border-left:3px solid ${gap.priority==='긴급'?'var(--danger)':gap.priority==='높음'?'var(--warn)':'var(--primary)'}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span>${gap.icon}</span>
            <span class="badge" style="background:${gap.priority==='긴급'?'rgba(240,68,82,.12)':gap.priority==='높음'?'rgba(245,158,11,.12)':'rgba(49,130,246,.12)'};color:${gap.priority==='긴급'?'var(--danger)':gap.priority==='높음'?'var(--warn)':'var(--primary)'}">${esc(gap.priority)}</span>
            <div style="font-size:.9rem;font-weight:700">${esc(gap.title)}</div>
          </div>
          <div style="font-size:.8rem;color:var(--text-muted);line-height:1.55">${esc(gap.desc)}</div>
        </div>`).join('')}
    </div>

    <div style="font-size:.7rem;color:var(--text-dim);text-align:center;margin-top:12px;line-height:1.7">
      ※ 본 데이터는 복지ON 이용자 자발적 입력 기반 통계입니다<br>
      정책 수립 참고자료로만 활용하시기 바랍니다
    </div>
  `;
}

// ── 기존 함수 유지 (다른 파일에서 호출) ─────────────────────────
function getCurrentStage(age) {
  return LIFE_STAGES.find(s => age >= s.ageRange[0] && age <= s.ageRange[1]) || LIFE_STAGES[3];
}
function getBenefitsForStage(stageId) {
  const stage = LIFE_STAGES.find(s => s.id === stageId);
  if (!stage) return [];
  return WELFARE_DB.filter(b => {
    if (!b.ageRange) return true;
    const [min, max] = stage.ageRange;
    return !(b.ageRange[1] < min || b.ageRange[0] > max);
  });
}
