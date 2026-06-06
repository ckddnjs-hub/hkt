'use strict';

let benefitsFilter = 'all';
let selectedBenefitId = null;

// ── 복지 API 점검 상태 ───────────────────────────────────────────────
const WelfareAPITest = {
  status: 'idle',   // 'idle' | 'loading' | 'ok' | 'error'
  result: null,     // { count, firstItem, attempted, error }
};

// ── 혜택 페이지 렌더링 ───────────────────────────────────────────────
function renderBenefitsPage() {
  const page = document.getElementById('page-benefits');
  if (!page) return;

  const matched = APP.profile ? matchBenefits() : [];
  if (matched.length && !APP.matchedBenefits.length) saveBenefits(matched);
  const benefits = matched.length ? matched : APP.matchedBenefits;

  page.innerHTML = `
    <div class="page-title">맞춤 복지 혜택</div>
    <div class="page-sub">규칙 기반으로 판정된 나만의 혜택 목록</div>

    <!-- 복지에코 규칙 기반 자격 판정 패널 -->
    <div class="card mb16" id="rule-match-panel">
      <div class="section-header" style="margin-bottom:12px">
        <div>
          <div class="section-title">규칙 기반 자격 판정</div>
          <div style="font-size:.76rem;color:var(--text-muted);margin-top:2px">자격 판정은 규칙 100% — AI 환각 없음</div>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-fetch-api" onclick="fetchWelfareAPI()">
          실제 복지 조회
        </button>
      </div>
      <div id="rule-match-summary">
        ${APP.profile ? renderRuleMatchSummary(matched) : '<div style="color:var(--text-muted);font-size:.84rem">프로필 입력 후 자동 판정됩니다</div>'}
      </div>
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
        <div style="font-size:1rem;font-weight:700;margin-bottom:8px">프로필 미입력</div>
        <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:16px">프로필을 입력하면 맞춤 혜택을 찾아드립니다</div>
        <button class="btn btn-primary" onclick="navigateTo('profile')">프로필 입력하기</button>
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
  if (typeof dbTrackBenefitView === 'function') {
    dbTrackBenefitView(benefitId).catch(() => {});
  }

  // API 항목은 matchedBenefits에, 로컬 항목은 WELFARE_DB에 있음
  const benefit = APP.matchedBenefits.find(b => b.id === benefitId)
               || WELFARE_DB.find(b => b.id === benefitId);
  if (!benefit) return;

  selectedBenefitId = benefitId;
  const modal = document.getElementById('benefit-detail-modal');
  const content = document.getElementById('benefit-detail-content');
  if (!modal || !content) return;

  content.innerHTML = renderBenefitDetailBase(benefit);
  openModal('benefit-modal-overlay');

  // API 항목이면 상세 정보 추가 로딩
  if (benefit.fromAPI && benefit.id.startsWith('WLF')) {
    fetchAndRenderBenefitDetail(benefit.id);
  }
}

// ── 기본 모달 내용 (목록 데이터 기반, 즉시 표시) ────────────────────
function renderBenefitDetailBase(benefit) {
  const cat = BENEFIT_CATEGORIES[benefit.category] || { icon: '📋', color: '#64748B' };
  return `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <div style="width:52px;height:52px;border-radius:16px;background:${cat.color}20;display:flex;align-items:center;justify-content:center;font-size:1.6rem;flex-shrink:0">${cat.icon}</div>
      <div>
        <div style="font-size:1.1rem;font-weight:900">${esc(benefit.name)}</div>
        <div style="font-size:.83rem;color:var(--text-muted)">${esc(benefit.agency || '')}</div>
      </div>
    </div>

    ${benefit.amount ? `<div class="benefit-detail-amount">${esc(benefit.amount)}</div>` : ''}
    ${benefit.description ? `<div class="benefit-detail-desc">${esc(benefit.description)}</div>` : ''}

    ${benefit.srvPvsnNm ? `
      <div style="margin-bottom:12px">
        <span class="badge" style="background:rgba(99,102,241,.12);color:var(--accent)">${esc(benefit.srvPvsnNm)}</span>
        ${benefit.onapPsbltYn === 'Y' ? `<span class="badge" style="background:rgba(16,185,129,.12);color:var(--success);margin-left:4px">온라인 신청 가능</span>` : ''}
      </div>` : ''}

    <!-- 로컬 조건 정보 (WELFARE_DB 항목) -->
    ${!benefit.fromAPI ? `
      <div class="detail-section">
        <div class="detail-section-title">신청 자격</div>
        <div class="conditions-list">
          ${benefit.ageRange ? `<div class="condition-item"><span class="condition-icon">✓</span> 나이: ${benefit.ageRange[0]}~${benefit.ageRange[1]}세</div>` : ''}
          ${benefit.conditions?.maxIncome ? `<div class="condition-item"><span class="condition-icon">✓</span> 소득: 기준 중위소득 ${benefit.conditions.maxIncome}% 이하</div>` : ''}
          ${benefit.conditions?.disability ? `<div class="condition-item"><span class="condition-icon">✓</span> 장애인 등록 필수</div>` : ''}
          ${benefit.conditions?.pregnant ? `<div class="condition-item"><span class="condition-icon">✓</span> 임산부 대상</div>` : ''}
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">필요 서류</div>
        <ul class="doc-list">${(benefit.documents || []).map(d => `<li>${esc(d)}</li>`).join('')}</ul>
      </div>` : ''}

    <!-- API 항목이면 상세 로딩 자리 -->
    ${benefit.fromAPI ? `
      <div id="benefit-api-detail" style="padding:16px 0">
        <div class="typing-dots" style="justify-content:center"><span></span><span></span><span></span></div>
        <div style="text-align:center;font-size:.78rem;color:var(--text-muted);margin-top:8px">상세 정보 불러오는 중...</div>
      </div>` : ''}

    <div style="display:flex;gap:10px;margin-top:20px">
      <a href="${esc(benefit.applyUrl || 'https://www.bokjiro.go.kr')}" target="_blank" rel="noopener" class="btn btn-primary" style="flex:1;text-align:center">
        온라인 신청
      </a>
      <button class="btn btn-ghost" style="flex:1" onclick="navigateTo('apply');closeAllModals()">
        신청 가이드
      </button>
    </div>
    <div style="font-size:.78rem;color:var(--text-muted);text-align:center;margin-top:8px">
      방문 신청: ${esc(benefit.applyOffline || '주민센터')}
    </div>
  `;
}

// ── API 상세조회 → 모달 업데이트 ────────────────────────────────────
async function fetchAndRenderBenefitDetail(servId) {
  const slot = document.getElementById('benefit-api-detail');
  if (!slot) return;

  try {
    const res = await fetch(`/api/welfare?servId=${encodeURIComponent(servId)}`);
    const data = await res.json();

    if (!data.success || !data.items?.[0]) {
      slot.innerHTML = `<div style="font-size:.78rem;color:var(--text-dim)">상세 정보를 불러오지 못했습니다.</div>`;
      return;
    }

    const d = data.items[0];
    slot.innerHTML = renderAPIDetailSections(d);
  } catch (e) {
    slot.innerHTML = '';
  }
}

// ── 상세 API 응답 렌더 ───────────────────────────────────────────────
function renderAPIDetailSections(d) {
  const section = (title, body) => body ? `
    <div class="detail-section">
      <div class="detail-section-title">${title}</div>
      <div style="font-size:.84rem;color:var(--text);line-height:1.75;white-space:pre-wrap">${esc(body)}</div>
    </div>` : '';

  const listSection = (title, items, nameFld, linkFld) => {
    if (!items?.length) return '';
    return `
      <div class="detail-section">
        <div class="detail-section-title">${title}</div>
        ${items.map(it => `
          <div style="font-size:.84rem;margin-bottom:6px">
            ${esc(it[nameFld] || '')}
            ${it[linkFld] ? `<span style="color:var(--primary);margin-left:6px">${esc(it[linkFld])}</span>` : ''}
          </div>`).join('')}
      </div>`;
  };

  return `
    ${section('지원 대상', d.tgtrDtlCn)}
    ${section('선정 기준', d.slctCritCn)}
    ${section('지원 내용', d.alwServCn)}
    ${listSection('신청 방법', d.applmetList, 'servSeDetailNm', 'servSeDetailLink')}
    ${listSection('문의처', d.inqplCtadrList, 'servSeDetailNm', 'servSeDetailLink')}
    ${listSection('관련 사이트', d.inqplHmpgReldList, 'servSeDetailNm', 'servSeDetailLink')}
    ${d.crtrYr ? `<div style="font-size:.72rem;color:var(--text-dim);margin-top:8px">${d.crtrYr}년 기준</div>` : ''}
  `;
}

// ── 규칙 매칭 요약 렌더 ────────────────────────────────────────────
function renderRuleMatchSummary(matched) {
  const easyCount = matched.filter(b => b.difficulty === 'easy').length;
  const onlineCount = matched.filter(b => b.difficulty !== 'hard').length;
  return `
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px">
      <div style="text-align:center;flex:1;min-width:72px">
        <div style="font-size:1.9rem;font-weight:900;color:var(--primary)">${matched.length}</div>
        <div style="font-size:.73rem;color:var(--text-muted)">받을 수 있는 혜택</div>
      </div>
      <div style="text-align:center;flex:1;min-width:72px">
        <div style="font-size:1.9rem;font-weight:900;color:var(--success)">${easyCount}</div>
        <div style="font-size:.73rem;color:var(--text-muted)">간편 신청 가능</div>
      </div>
      <div style="text-align:center;flex:1;min-width:72px">
        <div style="font-size:1.9rem;font-weight:900;color:var(--warn)">${onlineCount}</div>
        <div style="font-size:.73rem;color:var(--text-muted)">온라인 신청 가능</div>
      </div>
    </div>
    <div id="api-fetch-status" style="font-size:.76rem;color:var(--text-dim)">
      프로필 저장 시 자동 조회됩니다 · 수동으로 다시 조회하려면 위 버튼을 누르세요
    </div>`;
}

// ── 실제 복지 API 연동 (공공데이터포털 → 규칙 매칭 보완) ──────────────
async function fetchWelfareAPI() {
  const p = APP.profile;
  if (!p) { toast('프로필을 먼저 입력해주세요', 'warn'); navigateTo('profile'); return; }

  const btn = document.getElementById('btn-fetch-api');
  const statusEl = document.getElementById('api-fetch-status');
  if (btn) { btn.disabled = true; btn.textContent = '조회 중...'; }
  if (statusEl) statusEl.textContent = '공공데이터포털에서 복지 데이터를 가져오는 중...';

  const params = new URLSearchParams({
    type: 'central',
    rows: '30',
    lifeArray: ageToLifeCode(parseInt(p.age || 30), p.pregnant),
  });
  if (p.age) params.set('age', String(parseInt(p.age)));
  const trgCode = profileToTrgCode(p);
  if (trgCode) params.set('trgterIndvdlArray', trgCode);

  try {
    const res = await fetch(`/api/welfare?${params}`);
    const data = await res.json();

    if (data.success && data.items?.length) {
      const apiMatched = data.items.map(apiItemToLocal);
      const merged = mergeAndDedupe(APP.matchedBenefits.length ? APP.matchedBenefits : matchBenefits(), apiMatched);
      saveBenefits(merged);
      renderBenefitsPage();
      toast(`복지 데이터 ${data.items.length}건 조회 완료`, 'success', 3000);
    } else {
      const msg = data.error || data.message || '연결 실패';
      if (statusEl) {
        statusEl.textContent = `API 오류: ${msg}`;
        if (data.attempted) statusEl.title = data.attempted; // 마우스 올리면 URL 표시
      }
      if (btn) { btn.disabled = false; btn.textContent = '다시 조회'; }
      console.error('[welfare API] error:', msg, '\nattempted:', data.attempted);
    }
  } catch (e) {
    if (statusEl) statusEl.textContent = `네트워크 오류: ${e.message}`;
    if (btn) { btn.disabled = false; btn.textContent = '다시 조회'; }
    console.error('[welfare API]', e);
  }
}

// ── 프로필 → API 코드 변환 ──────────────────────────────────────────
function ageToLifeCode(age, pregnant) {
  if (pregnant) return '007';
  if (age <= 6)  return '001'; // 영유아
  if (age <= 12) return '002'; // 아동
  if (age <= 18) return '003'; // 청소년
  if (age <= 34) return '004'; // 청년
  if (age <= 64) return '005'; // 중장년
  return '006';                // 노년
}

function profileToTrgCode(p) {
  if (p.disability) return '040';
  if (parseInt(p.incomePercent || 100) <= 50) return '050';
  if (p.householdType === 'single-parent') return '060';
  return '';
}

// ── API 응답 → 로컬 포맷 변환 ───────────────────────────────────────
function apiItemToLocal(item) {
  return {
    id: item.servId || `api_${Math.random().toString(36).slice(2, 8)}`,
    name: item.servNm || '복지서비스',
    category: detectCategoryFromAPI(item),
    amount: item.sprtCycNm || '지원 있음',
    agency: item.jurMnofNm || '중앙부처',
    description: item.servDgst || '',
    srvPvsnNm: item.srvPvsnNm || '',       // 제공유형 (현금/바우처 등)
    onapPsbltYn: item.onapPsbltYn || '',   // 온라인 신청 가능 여부
    conditions: {},
    ageRange: [0, 120],
    tags: (item.lifeArray || '').split(',').map(s => s.trim()).filter(Boolean),
    documents: [],
    applyUrl: item.servDtlLink || 'https://www.bokjiro.go.kr',
    applyOffline: '주민센터',
    difficulty: item.onapPsbltYn === 'Y' ? 'easy' : 'medium',
    processDays: 30,
    matchScore: 80,
    fromAPI: true,
  };
}

function detectCategoryFromAPI(item) {
  const theme = item.intrsThemaArray || '';
  if (theme.includes('일자리')) return 'employment';
  if (theme.includes('주거'))   return 'housing';
  if (theme.includes('신체건강') || theme.includes('임신')) return 'health';
  if (theme.includes('보육') || theme.includes('교육'))    return 'education';
  if (theme.includes('서민금융')) return 'income';
  return 'income';
}

function mergeAndDedupe(local, apiItems) {
  const ids = new Set(local.map(b => b.id));
  return [...local, ...apiItems.filter(b => !ids.has(b.id))];
}

// ══════════════════════════════════════════════════════════════════
// 복지 API 점검 카드
// ══════════════════════════════════════════════════════════════════

// ── 점검 카드 렌더 ────────────────────────────────────────────────
function renderWelfareAPICard() {
  const p = APP.profile;
  const age = parseInt(p?.age || 0);
  const lifeCode = p ? ageToLifeCode(age, p.pregnant) : '—';
  const lifeLabel = { '001':'영유아','002':'아동','003':'청소년','004':'청년','005':'중장년','006':'노년','007':'임신·출산' }[lifeCode] || '—';
  const trgCode = p ? profileToTrgCode(p) : '';
  const trgLabel = { '040':'장애인','050':'저소득','060':'한부모·조손' }[trgCode] || '';

  const params = [
    ['callTp',      'L',                       '필수'],
    ['srchKeyCode', '003 (제목+내용)',           '필수'],
    ['pageNo',      '1',                        '필수'],
    ['numOfRows',   '30',                       '필수'],
    ['lifeArray',   lifeCode ? `${lifeCode} (${lifeLabel})` : '—', '프로필 기반'],
    ['age',         p?.age ? String(parseInt(p.age)) : '—', '프로필 기반'],
    ['trgterIndvdlArray', trgCode ? `${trgCode} (${trgLabel})` : '—', '프로필 기반'],
  ];

  const { status, result } = WelfareAPITest;

  const statusBadge = {
    idle:    `<span style="color:var(--text-dim)">● 미실행</span>`,
    loading: `<span style="color:var(--warn)">● 점검 중...</span>`,
    ok:      `<span style="color:var(--success)">● 연결됨</span>`,
    error:   `<span style="color:var(--danger)">● 오류</span>`,
  }[status];

  let resultHTML = '';
  if (status === 'ok' && result) {
    resultHTML = `
      <div style="margin-top:12px;padding:10px;background:rgba(16,185,129,.08);border-radius:8px;border:1px solid rgba(16,185,129,.2)">
        <div style="font-size:.82rem;font-weight:700;color:var(--success);margin-bottom:6px">응답 성공</div>
        <div style="font-size:.78rem;color:var(--text-muted)">총 ${result.totalCount}건 / 이번 응답 ${result.count}건</div>
        ${result.firstItem ? `
          <div style="margin-top:8px;font-size:.78rem;border-top:1px solid var(--border);padding-top:8px">
            <div style="font-weight:700;color:var(--text)">${esc(result.firstItem.servNm || '')}</div>
            <div style="color:var(--text-muted)">${esc(result.firstItem.jurMnofNm || '')} · ${esc(result.firstItem.sprtCycNm || '')}</div>
          </div>` : ''}
      </div>`;
  } else if (status === 'error' && result) {
    resultHTML = `
      <div style="margin-top:12px;padding:10px;background:rgba(239,68,68,.06);border-radius:8px;border:1px solid rgba(239,68,68,.2)">
        <div style="font-size:.82rem;font-weight:700;color:var(--danger);margin-bottom:4px">오류 내용</div>
        <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:6px;word-break:break-all">${esc(result.error || '')}</div>
        ${result.attempted ? `
          <div style="font-size:.72rem;color:var(--text-dim);word-break:break-all">
            <span style="font-weight:700">요청 URL</span><br>${esc(result.attempted)}
          </div>` : ''}
      </div>`;
  }

  return `
    <div class="card mb16" id="welfare-api-check-card">
      <div class="section-header" style="margin-bottom:10px">
        <div>
          <div class="section-title">복지 API 점검</div>
          <div style="font-size:.75rem;color:var(--text-muted);margin-top:2px">${statusBadge}</div>
        </div>
        <button class="btn btn-sm" style="background:var(--bg3);color:var(--text)"
          id="btn-api-check" onclick="runWelfareAPICheck()">
          점검 실행
        </button>
      </div>

      <!-- 요청 파라미터 테이블 -->
      <div style="font-size:.72rem;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">요청 파라미터</div>
      <div style="background:var(--bg3);border-radius:8px;overflow:hidden;margin-bottom:4px">
        ${params.map((r, i) => `
          <div style="display:flex;padding:6px 10px;${i ? 'border-top:1px solid var(--border)' : ''}">
            <div style="width:42%;font-size:.76rem;font-weight:700;color:var(--text);font-family:monospace">${r[0]}</div>
            <div style="flex:1;font-size:.76rem;color:${r[2]==='필수'?'var(--primary)':'var(--text-muted)'}">${esc(r[1])}</div>
            <div style="font-size:.68rem;color:var(--text-dim);white-space:nowrap">${r[2]}</div>
          </div>`).join('')}
      </div>

      ${!p ? `<div style="font-size:.75rem;color:var(--text-dim);margin-top:6px">※ 프로필 입력 시 lifeArray · age · trgterIndvdlArray가 자동 설정됩니다</div>` : ''}

      ${resultHTML}
    </div>
  `;
}

// ── 점검 실행 ─────────────────────────────────────────────────────
async function runWelfareAPICheck() {
  WelfareAPITest.status = 'loading';
  WelfareAPITest.result = null;
  _refreshAPICheckCard();

  const p = APP.profile;
  const params = new URLSearchParams({ type: 'central', rows: '5' });
  params.set('lifeArray', ageToLifeCode(parseInt(p?.age || 30), p?.pregnant));
  if (p?.age) params.set('age', String(parseInt(p.age)));
  const trgCode = p ? profileToTrgCode(p) : '';
  if (trgCode) params.set('trgterIndvdlArray', trgCode);

  try {
    const res = await fetch(`/api/welfare?${params}`);
    const data = await res.json();

    if (data.success && data.items?.length) {
      WelfareAPITest.status = 'ok';
      WelfareAPITest.result = {
        totalCount: data.totalCount,
        count: data.count,
        firstItem: data.items[0],
      };
    } else {
      WelfareAPITest.status = 'error';
      WelfareAPITest.result = {
        error: data.error || data.message || '응답 없음',
        attempted: data.attempted || '',
      };
    }
  } catch (e) {
    WelfareAPITest.status = 'error';
    WelfareAPITest.result = { error: e.message, attempted: '' };
  }

  _refreshAPICheckCard();
}

function _refreshAPICheckCard() {
  // 혜택 페이지 내 카드 갱신
  const slot = document.getElementById('welfare-api-check-card');
  if (slot) slot.outerHTML = renderWelfareAPICard();
  // 사이드바 위젯 갱신
  renderSidebarAPIWidget();
}

// ── 사이드바 상시 위젯 ────────────────────────────────────────────
function renderSidebarAPIWidget() {
  const el = document.getElementById('sidebar-api-widget');
  if (!el) return;

  const { status, result } = WelfareAPITest;

  const dot = {
    idle:    `<span style="color:var(--text-dim)">●</span>`,
    loading: `<span style="color:var(--warn)">●</span>`,
    ok:      `<span style="color:var(--success)">●</span>`,
    error:   `<span style="color:var(--danger)">●</span>`,
  }[status];

  const label = {
    idle:    '미실행',
    loading: '점검 중...',
    ok:      `연결됨 · ${result?.totalCount ?? 0}건`,
    error:   '오류',
  }[status];

  let detail = '';
  if (status === 'ok' && result?.firstItem) {
    detail = `<div style="font-size:.72rem;color:var(--text-muted);margin-top:4px;line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(result.firstItem.servNm || '')}</div>`;
  }
  if (status === 'error' && result?.error) {
    detail = `<div style="font-size:.72rem;color:var(--danger);margin-top:4px;line-height:1.5;word-break:break-all">${esc(result.error)}</div>`;
    if (result.attempted) {
      detail += `<div style="font-size:.68rem;color:var(--text-dim);margin-top:3px;word-break:break-all">${esc(result.attempted)}</div>`;
    }
  }

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div style="font-size:.73rem;font-weight:700;color:var(--text-muted)">복지 API</div>
      <button
        onclick="runWelfareAPICheck()"
        style="font-size:.68rem;padding:3px 8px;border-radius:6px;background:var(--bg2);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;font-family:inherit"
        ${status === 'loading' ? 'disabled' : ''}>
        점검
      </button>
    </div>
    <div style="display:flex;align-items:center;gap:5px;font-size:.76rem">
      ${dot}
      <span style="color:var(--text)">${label}</span>
    </div>
    ${detail}
  `;
}
