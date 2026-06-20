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
          <div style="font-size:2.5rem;margin-bottom:12px">🔍</div>
          <div style="font-weight:700;margin-bottom:8px">혜택을 분석 중이에요</div>
          <div style="font-size:.83rem;color:var(--text-muted);margin-bottom:16px">정보 입력 후 AI 분석을 시작합니다</div>
          <button class="btn btn-primary" onclick="${p?.onboarding_done ? 'loadStrategy()' : 'renderWizard()'}">
            ${p?.onboarding_done ? '🤖 AI 분석 시작' : '정보 입력하기'}
          </button>
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

// ── 전략 데이터 로드 (Railway 호출) ────────────────────────────────────
async function loadStrategy() {
  if (!MY_PROFILE?.onboarding_done) return;
  try {
    const res = await fetch(`${RAILWAY_URL}/api/strategy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: ME?.id, profile: MY_PROFILE }),
    });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    _dashStrategyCache = data;
    if (currentPage === 'dashboard') renderDashboard();
    if (currentPage === 'strategy') renderStrategy();
  } catch (e) {
    console.error('strategy load error', e);
  }
}

// 위저드 완료 후 자동 로드 트리거
function _strategyAutoLoad() {
  setTimeout(() => loadStrategy(), 500);
}
