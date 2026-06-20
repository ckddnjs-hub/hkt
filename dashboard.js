'use strict';
// ══════════════════════════════════════════════════════════════════════
//  dashboard.js — 메인 대시보드 (홈)
// ══════════════════════════════════════════════════════════════════════

let _dashStrategyCache = null;

function renderDashboard() {
  const el = document.getElementById('page-dashboard');
  if (!el) return;

  const p = MY_PROFILE;
  const age = p?.birth_year ? new Date().getFullYear() - p.birth_year : null;
  const name = age ? `${age}세 ${p.gender === 'female' ? '여성' : '남성'}` : '사용자';
  const region = p?.district || p?.region || '지역 미입력';
  const benefits = _dashStrategyCache?.benefits || [];
  const urgent = benefits.filter(b => b.urgency >= 8).slice(0, 2);
  const topBenefits = benefits.slice(0, 5);

  el.innerHTML = `
    <!-- 히어로 -->
    <div class="dashboard-hero">
      <div class="hero-greeting">안녕하세요 👋</div>
      <div class="hero-title">${esc(name)}님을 위한<br>맞춤 혜택이 있어요</div>
      <div class="hero-stat-row">
        <div class="hero-stat">
          <div class="hero-stat-num" style="color:var(--primary)">${benefits.length || '?'}</div>
          <div class="hero-stat-label">수급 가능 혜택</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-num" style="color:var(--warn)">${urgent.length || '?'}</div>
          <div class="hero-stat-label">긴급 신청 필요</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-num" style="color:var(--accent)">${_dashTotalMonthly(benefits)}</div>
          <div class="hero-stat-label">월 예상 혜택</div>
        </div>
      </div>
    </div>

    <div class="page-pad" style="padding-top:16px">

      ${!p?.onboarding_done ? `
        <!-- 온보딩 안내 -->
        <div class="card" style="background:rgba(0,200,150,.08);border-color:var(--border-strong);cursor:pointer" onclick="renderWizard()">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="font-size:2rem">📝</div>
            <div style="flex:1">
              <div style="font-weight:700;margin-bottom:4px">정보를 먼저 입력해주세요</div>
              <div style="font-size:.8rem;color:var(--text-muted)">2분이면 완료돼요 · AI 맞춤 분석을 시작합니다</div>
            </div>
            <div style="color:var(--primary);font-size:1.2rem">›</div>
          </div>
        </div>` : ''}

      ${urgent.length > 0 ? `
        <!-- 긴급 신청 -->
        <div class="section-title">🚨 지금 바로 신청하세요</div>
        ${urgent.map(b => `
          <div class="card urgent-card">
            <div style="display:flex;align-items:flex-start;gap:12px">
              <div class="benefit-icon" style="background:rgba(255,82,82,.15)">🔴</div>
              <div style="flex:1">
                <div class="benefit-name">${esc(b.name)}</div>
                <div class="benefit-amount">${esc(b.amount)}</div>
                <div class="benefit-how">${esc(b.how_to_apply)}</div>
                ${b.deadline ? `<div class="badge badge-red" style="margin-top:6px">마감 ${esc(b.deadline)}</div>` : ''}
              </div>
              <button class="btn btn-outline" style="padding:6px 10px;font-size:.75rem" onclick="window.open('${esc(b.apply_url||'https://www.bokjiro.go.kr')}','_blank')">신청</button>
            </div>
          </div>`).join('')}` : ''}

      <!-- 전체 혜택 목록 -->
      <div class="section-title">💰 받을 수 있는 혜택</div>
      ${topBenefits.length > 0 ? `
        <div class="card" style="padding:0 16px">
          ${topBenefits.map(b => `
            <div class="benefit-item">
              <div class="benefit-icon" style="background:${_dashCatColor(b.category)}20">
                ${_dashCatIcon(b.category)}
              </div>
              <div class="benefit-info">
                <div class="benefit-name">${esc(b.name)}</div>
                <div class="benefit-amount">${esc(b.amount)}</div>
                <div class="benefit-how">${esc(b.description)}</div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                <div class="badge ${b.urgency >= 8 ? 'badge-red' : b.urgency >= 5 ? 'badge-yellow' : 'badge-green'}" style="font-size:.65rem">
                  긴급도 ${b.urgency}
                </div>
              </div>
            </div>`).join('')}
        </div>
        <button class="btn btn-outline btn-full" style="margin-top:8px" onclick="navigateTo('strategy')">
          📊 전체 전략보드 보기
        </button>` : `
        <div class="card" style="text-align:center;padding:32px 16px">
          ${_dashStrategyCache?.loading ? `
            <div class="spinner" style="margin:0 auto 12px"></div>
            <div style="font-weight:700;margin-bottom:4px">AI가 혜택을 분석하고 있어요</div>
            <div style="font-size:.8rem;color:var(--text-muted)">복지 DB ${_dashStrategyCache?.raw_count || '...'} 건 검색 중</div>
          ` : _dashStrategyCache?.error ? `
            <div style="font-size:2rem;margin-bottom:8px">⚠️</div>
            <div style="font-weight:700;margin-bottom:8px">분석에 실패했어요</div>
            <button class="btn btn-primary" onclick="loadStrategy()">다시 시도</button>
          ` : `
            <div style="font-size:2.5rem;margin-bottom:12px">🔍</div>
            <div style="font-weight:700;margin-bottom:8px">맞춤 혜택을 찾아드릴게요</div>
            <div style="font-size:.83rem;color:var(--text-muted);margin-bottom:16px">정보 입력 후 AI 분석을 시작합니다</div>
            <button class="btn btn-primary" onclick="${p?.onboarding_done ? 'loadStrategy()' : 'renderWizard()'}">
              ${p?.onboarding_done ? '🤖 AI 분석 시작' : '정보 입력하기'}
            </button>
          `}
        </div>`}

      <!-- AI 채팅 빠른 접근 -->
      <div class="section-title">💬 AI에게 물어보세요</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
        ${['출산 후 받을 수 있는 혜택 알려줘', '월세 지원 혜택 있어?', '취업 준비 중인데 받을 수 있는 혜택은?'].map(q => `
          <button class="card" style="text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;padding:14px" onclick="chatQuickQuery('${esc(q)}')">
            <span style="font-size:1.1rem">💬</span>
            <span style="font-size:.85rem;font-weight:600">${esc(q)}</span>
            <span style="margin-left:auto;color:var(--text-dim)">›</span>
          </button>`).join('')}
      </div>

      <div style="height:16px"></div>
    </div>
  `;

  // 전략 데이터 없으면 자동 로드
  if (!_dashStrategyCache && p?.onboarding_done) loadStrategy();
}

function _dashTotalMonthly(benefits) {
  if (!benefits.length) return '-';
  // navigation_path 합산
  const cache = _dashStrategyCache?.navigation_path || [];
  const total = cache.filter(n => n.type === 'benefit').reduce((s, n) => s + (n.monthly_amount || 0), 0);
  return total ? `월 ${total}만원+` : `${benefits.length}종`;
}

function _dashCatIcon(cat) {
  return { '주거지원':'🏠', '생활지원':'🍚', '돌봄지원':'👶', '교육지원':'📚', '자산형성':'💰', '의료지원':'🏥' }[cat] || '📋';
}
function _dashCatColor(cat) {
  return { '주거지원':'#3B82F6', '생활지원':'#00C896', '돌봄지원':'#EC4899', '교육지원':'#F59E0B', '자산형성':'#6366F1', '의료지원':'#EF4444' }[cat] || '#6B7685';
}

// ── MY_PROFILE → Railway UserProfile 변환 ────────────────────────────
function _buildUserProfile(p) {
  const age = p.birth_year ? new Date().getFullYear() - p.birth_year : 40;
  const monthlyIncome = p.income_amount ? p.income_amount * 10000 : null;
  return {
    age,
    region: [p.region, p.district].filter(Boolean).join(' ') || '',
    monthly_income: monthlyIncome,
    has_disability:       !!p.has_disability,
    is_single_household:  p.household_type === 'single',
    is_single_parent:     p.household_type === 'single_parent' || !!p.is_single_parent,
  };
}

// ── 결과 → 내부 캐시 포맷 변환 ──────────────────────────────────────
function _mapResults(results, presentedText) {
  const fieldToCategory = (f = '', n = '') => {
    const t = (f + n).toLowerCase();
    if (/주거|임대|전세|월세/.test(t)) return '주거지원';
    if (/의료|건강|보건|병원|치료|약/.test(t)) return '의료지원';
    if (/돌봄|요양|장기|보호|어린이|아동|영유아/.test(t)) return '돌봄지원';
    if (/교육|학습|학비|장학|학교/.test(t)) return '교육지원';
    if (/자산|취업|고용|일자리|창업|자립/.test(t)) return '자산형성';
    return '생활지원';
  };

  return results.map((r, i) => ({
    name:        r.service_name  || '알 수 없음',
    category:    fieldToCategory(r.service_field, r.service_name),
    description: (r.support_content || '').slice(0, 80),
    amount:      _extractAmount(r.support_content),
    urgency:     Math.max(1, 8 - i),   // 앞 순서일수록 긴급도 높게
    impact:      Math.min(10, 9 - Math.floor(i / 3)),
    deadline:    null,
    how_to_apply: r.apply_method || '',
    apply_url:   r.detail_url || 'https://www.bokjiro.go.kr',
    source:      r.source || '',
    match_reason: r.match_reason || '',
  }));
}

function _extractAmount(content = '') {
  const m = content.match(/(\d[\d,]*)\s*만\s*원/);
  if (m) return `최대 ${m[1]}만원`;
  if (/현물|서비스|이용권/.test(content)) return '현물 지원';
  return '지원금 있음';
}

// ── POST /api/personal/search 호출 ──────────────────────────────────
let _searchThreadId = null;

async function loadStrategy() {
  if (!MY_PROFILE?.onboarding_done) return;

  // 로딩 상태 표시
  _dashStrategyCache = { loading: true };
  if (currentPage === 'dashboard') renderDashboard();
  if (currentPage === 'strategy')  renderStrategy();

  if (!_searchThreadId) {
    _searchThreadId = (ME?.id || 'anon') + '-' + Date.now();
  }

  try {
    const userProfile = _buildUserProfile(MY_PROFILE);
    const age = userProfile.age;
    const message = `안녕하세요. ${age}세 ${MY_PROFILE.gender === 'female' ? '여성' : '남성'}입니다. 제 상황에 맞는 복지 혜택을 알려주세요.`;

    const res = await fetch(`${RAILWAY_URL}/api/personal/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thread_id:    _searchThreadId,
        user_profile: userProfile,
        message,
      }),
    });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();

    const benefits = _mapResults(data.results || []);
    _dashStrategyCache = {
      benefits,
      presented_text:   data.presented_text || '',
      raw_count:        data.raw_count || 0,
      strategy_summary: data.presented_text || '',
      radar_scores:     _buildRadarScores(benefits),
      navigation_path:  _buildNavPath(benefits),
      urgent_actions:   benefits.filter(b => b.urgency >= 8).slice(0, 3).map(b => `${b.name} — ${b.how_to_apply || '주민센터 방문'}`),
    };

    if (currentPage === 'dashboard') renderDashboard();
    if (currentPage === 'strategy')  renderStrategy();

  } catch (e) {
    console.error('personal/search error', e);
    _dashStrategyCache = { error: e.message };
    if (currentPage === 'dashboard') renderDashboard();
  }
}

function _buildRadarScores(benefits) {
  const cats = ['주거지원','생활지원','돌봄지원','교육지원','자산형성','의료지원'];
  const scores = {};
  cats.forEach(c => {
    const count = benefits.filter(b => b.category === c).length;
    scores[c] = Math.min(100, count * 20);
  });
  return scores;
}

function _buildNavPath(benefits) {
  const path = [{ label: '현재', monthly_amount: 0, type: 'current' }];
  let cum = 0;
  benefits.slice(0, 4).forEach(b => {
    const amt = parseInt((b.amount || '').replace(/[^\d]/g, '')) || 0;
    cum += amt;
    path.push({ label: b.name, monthly_amount: amt, type: 'benefit' });
  });
  path.push({ label: '목표 달성', monthly_amount: 0, type: 'goal' });
  return path;
}

// 위저드 완료 후 자동 로드 트리거
function _strategyAutoLoad() {
  _searchThreadId = null; // 새 프로필이면 스레드 초기화
  setTimeout(() => loadStrategy(), 500);
}
