'use strict';

let selectedStage = null;

// ── 생애주기 페이지 렌더링 ────────────────────────────────────────────
function renderLifecyclePage() {
  const page = document.getElementById('page-lifecycle');
  if (!page) return;

  const age = parseInt(APP.profile?.age || 30);
  const currentStage = getCurrentStage(age);
  selectedStage = currentStage?.id || 'youth';

  page.innerHTML = `
    <div class="page-title">생애 계획</div>
    <div class="page-sub">나이와 생애 이벤트별 복지 혜택 로드맵</div>

    <!-- 현재 위치 카드 -->
    <div class="welfare-score-card" style="margin-bottom:20px">
      <div class="wsc-top">
        <div>
          <div class="wsc-label">현재 생애 단계</div>
          <div class="wsc-score">
            ${currentStage?.icon || '🌱'} <span>${esc(currentStage?.label || '청년기')}</span>
          </div>
          <div class="wsc-sub">만 ${age}세 · ${esc(currentStage?.ageRange?.join('~') || '19~34')}세 구간</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:.8rem;color:rgba(255,255,255,.6)">이 단계 혜택</div>
          <div style="font-size:1.8rem;font-weight:900;color:#fff">${getBenefitsForStage(currentStage?.id || 'youth').length}개</div>
        </div>
      </div>
      <div class="wsc-bar">
        <div class="wsc-bar-label">
          <span>영유아</span><span>청년</span><span>노년</span>
        </div>
        <div class="wsc-bar-track">
          <div class="wsc-bar-fill" style="width:${Math.min(100, (age / 80) * 100)}%"></div>
        </div>
      </div>
    </div>

    <!-- 단계 선택 네비 -->
    <div class="lifecycle-stages-nav">
      ${LIFE_STAGES.map(stage => `
        <button class="stage-btn ${stage.id === selectedStage ? 'active' : ''}"
          onclick="selectLifecycleStage('${stage.id}', this)">
          ${stage.icon} ${stage.label}
          ${stage.id === currentStage?.id ? ' ←현재' : ''}
        </button>`).join('')}
    </div>

    <!-- 현재 혜택 패널 -->
    <div id="lifecycle-stage-panel">
      ${renderLifecycleStageBenefits(selectedStage, age)}
    </div>

    <!-- 생애 이벤트 타임라인 -->
    <div class="section-header mt24">
      <div class="section-title">🗓 생애 이벤트 타임라인</div>
    </div>
    <div class="lifecycle-timeline" id="lifecycle-timeline">
      ${renderLifecycleTimeline(age)}
    </div>

    <!-- AI 생애 플랜 (에이전트 결과 표시 영역) -->
    <div id="lifecycle-ai-events" class="mt8"></div>

    <!-- AI 생애 플랜 요청 버튼 -->
    ${APP.profile ? `
      <div class="card card-blue mt16" style="text-align:center">
        <div style="font-size:1.4rem;margin-bottom:8px">🔮</div>
        <div style="font-weight:700;margin-bottom:4px">AI 생애 플랜 분석</div>
        <div style="font-size:.83rem;color:var(--text-muted);margin-bottom:16px">NVIDIA AI가 내 상황에 맞춘 30년 복지 로드맵을 제시합니다</div>
        <button class="btn btn-primary" onclick="handleRunAgents();navigateTo('benefits')">
          🤖 AI 생애 플랜 받기
        </button>
      </div>` : `
      <div class="card mt16" style="text-align:center;padding:24px">
        <div style="font-size:.9rem;font-weight:700;margin-bottom:8px">🧑 프로필을 입력하면</div>
        <div style="font-size:.82rem;color:var(--text-muted);margin-bottom:16px">나이, 가구 상황에 맞는 정밀한 생애 플랜을 제공합니다</div>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('profile')">프로필 입력</button>
      </div>`}
  `;
}

// ── 현재 생애 단계 판별 ──────────────────────────────────────────────
function getCurrentStage(age) {
  return LIFE_STAGES.find(s => age >= s.ageRange[0] && age <= s.ageRange[1]) || LIFE_STAGES[3];
}

// ── 단계별 혜택 가져오기 ──────────────────────────────────────────────
function getBenefitsForStage(stageId) {
  const stage = LIFE_STAGES.find(s => s.id === stageId);
  if (!stage) return [];
  return WELFARE_DB.filter(b => {
    if (!b.ageRange) return true;
    const [min, max] = stage.ageRange;
    return !(b.ageRange[1] < min || b.ageRange[0] > max);
  });
}

// ── 단계별 혜택 패널 렌더링 ─────────────────────────────────────────
function renderLifecycleStageBenefits(stageId, userAge) {
  const stage = LIFE_STAGES.find(s => s.id === stageId);
  if (!stage) return '';

  const benefits = getBenefitsForStage(stageId);
  const isCurrent = userAge >= stage.ageRange[0] && userAge <= stage.ageRange[1];
  const isPast = userAge > stage.ageRange[1];

  return `
    <div class="card">
      <div class="section-header">
        <div>
          <div class="section-title">${stage.icon} ${stage.label} 혜택</div>
          <div class="section-sub">${stage.ageRange[0]}~${stage.ageRange[1]}세</div>
        </div>
        <div class="badge" style="background:${
          isCurrent ? 'rgba(59,130,246,.15)' : isPast ? 'rgba(16,185,129,.1)' : 'rgba(99,102,241,.1)'
        };color:${isCurrent ? 'var(--primary)' : isPast ? 'var(--success)' : 'var(--accent)'}">
          ${isCurrent ? '현재' : isPast ? '지남' : '미래'}
        </div>
      </div>
      ${benefits.length ? benefits.slice(0, 4).map(b => `
        <div class="card card-sm card-hover mb8" onclick="openBenefitDetail('${b.id}');navigateTo('benefits')">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:10px">
            <div>
              <div style="font-size:.9rem;font-weight:700">${esc(b.name)}</div>
              <div style="font-size:.78rem;color:var(--text-muted);margin-top:2px">${esc(b.agency)}</div>
            </div>
            <div style="font-size:.85rem;font-weight:700;color:var(--primary);text-align:right;flex-shrink:0">${esc(b.amount.split('(')[0].trim())}</div>
          </div>
        </div>`).join('') : uiEmpty('📋', '해당 단계 혜택 정보가 없습니다')}
      ${benefits.length > 4 ? `<div class="text-muted" style="font-size:.82rem;text-align:center;margin-top:8px">+${benefits.length - 4}개 더보기</div>` : ''}
    </div>
  `;
}

// ── 단계 선택 ────────────────────────────────────────────────────────
function selectLifecycleStage(stageId, btn) {
  selectedStage = stageId;
  document.querySelectorAll('.stage-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const age = parseInt(APP.profile?.age || 30);
  const panel = document.getElementById('lifecycle-stage-panel');
  if (panel) panel.innerHTML = renderLifecycleStageBenefits(stageId, age);
}

// ── 생애 타임라인 렌더링 ─────────────────────────────────────────────
function renderLifecycleTimeline(userAge) {
  const timelineItems = [
    {
      period: '0~6세 (영유아기)',
      title: '출산 · 영유아 지원',
      status: userAge > 6 ? 'past' : userAge <= 6 ? 'current' : 'future',
      benefits: ['출산지원금', '부모급여', '아동수당', '산모신생아지원'],
    },
    {
      period: '7~18세 (아동·청소년기)',
      title: '교육 · 성장 지원',
      status: userAge > 18 ? 'past' : userAge >= 7 ? 'current' : 'future',
      benefits: ['교육급여', '급식지원', '방과후돌봄', '장학금'],
    },
    {
      period: '19~34세 (청년기)',
      title: '자립 · 취업 지원',
      status: userAge > 34 ? 'past' : userAge >= 19 ? 'current' : 'future',
      benefits: ['청년도약계좌', '청년월세지원', '국민취업지원', '청년내일채움'],
    },
    {
      period: '35~49세 (중년기)',
      title: '가족 · 경력 안정',
      status: userAge > 49 ? 'past' : userAge >= 35 ? 'current' : 'future',
      benefits: ['아이돌봄서비스', '직업훈련지원', '중소기업 지원', '주택청약'],
    },
    {
      period: '50~64세 (장년기)',
      title: '노후 준비 · 건강 관리',
      status: userAge > 64 ? 'past' : userAge >= 50 ? 'current' : 'future',
      benefits: ['기초연금 준비', '건강검진 확대', '장기요양 대비', '퇴직연금'],
    },
    {
      period: '65세 이상 (노년기)',
      title: '기초 보장 · 돌봄',
      status: userAge >= 65 ? 'current' : 'future',
      benefits: ['기초연금', '노인장기요양', '노인돌봄서비스', '의료급여'],
    },
    {
      period: '생애 이벤트',
      title: '결혼 · 출산 · 질병 · 실직',
      status: 'future',
      benefits: ['긴급복지지원', '실업급여', '산재보험', '질병 의료비 지원'],
      isEvent: true,
    },
  ];

  return `<div class="timeline-line"></div>` + timelineItems.map(item => {
    const isCurrent = item.status === 'current';
    return `
      <div class="timeline-item">
        <div class="timeline-dot ${item.status}${isCurrent ? ' current' : ''}">
          ${isCurrent ? '●' : ''}
        </div>
        <div class="timeline-content ${isCurrent ? 'current' : ''}">
          <div class="timeline-period">${esc(item.period)}</div>
          <div class="timeline-title">${esc(item.title)}</div>
          <div class="timeline-benefits mt8">
            ${(item.benefits || []).map(b =>
              `<span class="timeline-benefit-chip ${item.status}">${esc(b)}</span>`
            ).join('')}
          </div>
        </div>
      </div>`;
  }).join('');
}
