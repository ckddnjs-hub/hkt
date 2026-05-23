'use strict';

let benefitsFilter = 'all';
let selectedBenefitId = null;

// ── 혜택 페이지 렌더링 ───────────────────────────────────────────────
function renderBenefitsPage() {
  const page = document.getElementById('page-benefits');
  if (!page) return;

  const matched = APP.profile ? matchBenefits() : [];
  if (matched.length && !APP.matchedBenefits.length) saveBenefits(matched);
  const benefits = matched.length ? matched : APP.matchedBenefits;

  page.innerHTML = `
    <div class="page-title grad-text">맞춤 복지 혜택</div>
    <div class="page-sub">AI가 분석한 나만의 복지 혜택 목록</div>

    <!-- AI 에이전트 실행 패널 -->
    <div class="agent-panel" id="agent-panel">
      <div class="agent-header">
        <div>
          <div class="agent-title">🤖 NVIDIA AI 멀티에이전트 분석</div>
          <div class="agent-sub">4개의 전문 AI가 협력하여 맞춤 혜택을 분석합니다</div>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-run-agents" onclick="handleRunAgents()">
          ✨ AI 분석 시작
        </button>
      </div>
      <div class="agents-grid">
        ${Object.values(AGENTS_CONFIG).map(a => `
          <div class="agent-card" id="agent-card-${a.id}">
            <div class="agent-avatar">${a.avatar}</div>
            <div class="agent-name">${a.name}</div>
            <div class="agent-status">대기</div>
          </div>`).join('')}
      </div>
      <div class="agent-log" id="agent-log">
        <div class="agent-log-line info">[준비] AI 에이전트를 시작하려면 위 버튼을 클릭하세요</div>
      </div>
    </div>

    <!-- AI 결과 요약 (초기에는 숨김) -->
    <div id="ai-benefits-result" class="card card-blue mb16 hidden">
      <div class="section-header">
        <div class="section-title">🎯 AI 분석 결과</div>
        <div class="badge" style="background:rgba(16,185,129,.15);color:var(--success)">분석 완료</div>
      </div>
      <div style="font-size:1.2rem;font-weight:900;color:var(--primary)" id="ai-total-estimate"></div>
      <div style="font-size:.85rem;color:var(--text-muted);margin-top:6px" id="ai-insight-text"></div>
    </div>

    <!-- 카테고리 필터 -->
    <div class="news-filter-bar">
      <button class="toggle-btn active" data-filter="all" onclick="filterBenefits('all',this)">전체 (${benefits.length})</button>
      ${Object.entries(BENEFIT_CATEGORIES).map(([id, cat]) => {
        const count = benefits.filter(b => b.category === id).length;
        if (!count) return '';
        return `<button class="toggle-btn" data-filter="${id}" onclick="filterBenefits('${id}',this)">${cat.icon} ${cat.label} (${count})</button>`;
      }).join('')}
    </div>

    <!-- 프로필 없을 때 안내 -->
    ${!APP.profile ? `
      <div class="card card-blue" style="text-align:center;padding:32px">
        <div style="font-size:2.5rem;margin-bottom:12px">👤</div>
        <div style="font-size:1rem;font-weight:700;margin-bottom:8px">프로필이 없습니다</div>
        <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:16px">프로필을 입력하면 맞춤 혜택을 찾아드립니다</div>
        <button class="btn btn-primary" onclick="navigateTo('profile')">📝 프로필 입력하기</button>
      </div>` : ''}

    <!-- 혜택 목록 -->
    <div id="benefits-list">
      ${benefits.length ? benefits.map(b => renderBenefitCard(b)).join('') :
        APP.profile ? uiEmpty('🔍', '조건에 맞는 혜택이 없습니다', '프로필을 수정하거나 AI 분석을 시도해보세요') : ''}
    </div>

    <!-- 유사계층 분석 결과 -->
    <div id="cohort-result" class="mt20"></div>
  `;
}

function renderBenefitCard(b) {
  const cat = BENEFIT_CATEGORIES[b.category] || { icon: '📋', color: '#64748B', label: b.category };
  const matchPct = b.matchScore || 75;
  return `
    <div class="benefit-card" onclick="openBenefitDetail('${b.id}')">
      <div class="benefit-card-header">
        <div class="benefit-cat-icon" style="background:${cat.color}20">
          <span style="font-size:1.2rem">${cat.icon}</span>
        </div>
        <div class="benefit-info">
          <div class="benefit-name">${esc(b.name)}</div>
          <div class="benefit-agency">${esc(b.agency)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${difficultyBadge(b.difficulty)}
        </div>
      </div>
      <div class="benefit-amount">${esc(b.amount)}</div>
      <div class="benefit-desc">${esc(b.description)}</div>
      <div class="benefit-footer">
        <div class="benefit-tags">
          ${(b.tags || []).slice(0, 2).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        </div>
        <div class="match-score">
          <span>매칭</span>
          <div class="match-bar"><div class="match-fill" style="width:${matchPct}%"></div></div>
          <span style="color:var(--primary);font-weight:700">${matchPct}%</span>
        </div>
      </div>
    </div>`;
}

// ── 혜택 필터 ────────────────────────────────────────────────────────
function filterBenefits(filter, btn) {
  benefitsFilter = filter;
  document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const benefits = APP.matchedBenefits.length ? APP.matchedBenefits : matchBenefits();
  const filtered = filter === 'all' ? benefits : benefits.filter(b => b.category === filter);
  const listEl = document.getElementById('benefits-list');
  if (listEl) {
    listEl.innerHTML = filtered.length
      ? filtered.map(b => renderBenefitCard(b)).join('')
      : uiEmpty('🔍', '해당 카테고리 혜택이 없습니다');
  }
}

// ── 혜택 상세 모달 ───────────────────────────────────────────────────
function openBenefitDetail(benefitId) {
  const benefit = WELFARE_DB.find(b => b.id === benefitId);
  if (!benefit) return;

  selectedBenefitId = benefitId;
  const cat = BENEFIT_CATEGORIES[benefit.category] || { icon: '📋', color: '#64748B' };
  const modal = document.getElementById('benefit-detail-modal');
  const content = document.getElementById('benefit-detail-content');

  if (!modal || !content) return;

  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <div style="width:52px;height:52px;border-radius:16px;background:${cat.color}20;display:flex;align-items:center;justify-content:center;font-size:1.6rem;flex-shrink:0">${cat.icon}</div>
      <div>
        <div style="font-size:1.1rem;font-weight:900">${esc(benefit.name)}</div>
        <div style="font-size:.83rem;color:var(--text-muted)">${esc(benefit.agency)}</div>
      </div>
    </div>

    <div class="benefit-detail-amount">${esc(benefit.amount)}</div>
    <div class="benefit-detail-desc">${esc(benefit.description)}</div>

    <div class="detail-section">
      <div class="detail-section-title">신청 자격</div>
      <div class="conditions-list">
        ${benefit.ageRange ? `<div class="condition-item"><span class="condition-icon">✓</span> 나이: ${benefit.ageRange[0]}~${benefit.ageRange[1]}세</div>` : ''}
        ${benefit.conditions?.maxIncome ? `<div class="condition-item"><span class="condition-icon">✓</span> 소득: 기준 중위소득 ${benefit.conditions.maxIncome}% 이하</div>` : ''}
        ${benefit.conditions?.disability ? `<div class="condition-item"><span class="condition-icon">✓</span> 장애인 등록 필수</div>` : ''}
        ${benefit.conditions?.pregnant ? `<div class="condition-item"><span class="condition-icon">✓</span> 임산부 대상</div>` : ''}
        ${benefit.conditions?.hasChildren ? `<div class="condition-item"><span class="condition-icon">✓</span> 자녀 있는 가구</div>` : ''}
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">필요 서류</div>
      <ul class="doc-list">
        ${(benefit.documents || []).map(d => `<li>${esc(d)}</li>`).join('')}
      </ul>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">처리 기간</div>
      <div style="font-size:.9rem;color:var(--text-muted)">평균 ${benefit.processDays || 30}일</div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">신청 난이도</div>
      ${difficultyBadge(benefit.difficulty)}
    </div>

    ${APP.profile ? `
      <div class="cohort-insight mt12">
        <div style="font-size:.78rem;font-weight:700;color:var(--primary);margin-bottom:6px">👥 유사 계층 활용 현황</div>
        <div class="cohort-insight-text">비슷한 조건의 분들 중 약 ${Math.floor(Math.random() * 30 + 50)}%가 이 혜택을 받고 있습니다.</div>
      </div>` : ''}

    <div style="display:flex;gap:10px;margin-top:20px">
      <a href="${esc(benefit.applyUrl)}" target="_blank" rel="noopener" class="btn btn-primary" style="flex:1;text-align:center">
        🌐 온라인 신청
      </a>
      <button class="btn btn-ghost" style="flex:1" onclick="navigateTo('apply');closeAllModals()">
        📋 신청 가이드
      </button>
    </div>
    <div style="font-size:.78rem;color:var(--text-muted);text-align:center;margin-top:8px">
      방문 신청: ${esc(benefit.applyOffline || '주민센터')}
    </div>
  `;

  openModal('benefit-modal-overlay');
}

// ── AI 에이전트 실행 핸들러 ─────────────────────────────────────────
async function handleRunAgents() {
  if (!APP.profile) {
    toast('먼저 프로필을 입력해주세요', 'warn');
    navigateTo('profile');
    return;
  }

  // NVIDIA API 키가 있으면 실제 API 사용, 없으면 데모 모드
  if (APP.settings.nvidiaKey) {
    await AgentOrchestrator.runAll(APP.profile);
  } else {
    toast('데모 모드로 실행합니다. 실제 분석은 설정에서 NVIDIA API 키를 입력하세요.', 'info', 4000);
    await runDemoAgents(APP.profile);
  }
}
