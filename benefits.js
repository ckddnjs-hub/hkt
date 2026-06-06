'use strict';

let benefitsFilter = 'all';
let selectedBenefitId = null;

// ── AI 검색 상태 ─────────────────────────────────────────────────────
const BenefitsSearch = {
  status: 'idle',     // 'idle' | 'analyzing' | 'fetching' | 'done' | 'error'
  intent: '',         // GPT가 요약한 의도
  extracted: null,    // 추출된 파라미터 { keyword, lifeArray, trgterIndvdlArray, intrsThemaArray }
  results: [],        // API 결과 카드 배열
  error: '',
};

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

    <!-- AI 복지 검색 -->
    <div class="card mb16">
      <div style="font-size:.84rem;font-weight:700;margin-bottom:8px">어떤 도움이 필요하신가요?</div>
      <div style="font-size:.76rem;color:var(--text-muted);margin-bottom:10px">
        상황을 자유롭게 입력하면 AI가 의도를 분석해 맞는 복지 혜택을 찾아드립니다
      </div>
      <div style="display:flex;gap:8px">
        <input
          id="benefits-search-input"
          class="form-input"
          style="flex:1"
          placeholder="예: 최근 실직했어요 / 임신 중인데 지원받고 싶어요 / 혼자 사는 어르신이에요"
          onkeydown="if(event.key==='Enter')searchBenefitsWithAI(this.value)"
        >
        <button class="btn btn-primary" style="white-space:nowrap" onclick="searchBenefitsWithAI(document.getElementById('benefits-search-input').value)">
          검색
        </button>
      </div>
      <!-- AI 검색 결과 영역 -->
      <div id="ai-search-results">${renderSearchResults()}</div>
    </div>

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

  return `
    <div class="benefit-card" id="bcard-${b.id}" onclick="openBenefitDetail('${b.id}')" style="cursor:pointer">
      <div class="benefit-card-header">
        <div class="benefit-cat-icon" style="background:${cat.color}20">
          <span style="font-size:1.2rem">${cat.icon}</span>
        </div>
        <div class="benefit-info">
          <div class="benefit-name">${esc(b.name)}</div>
          <div class="benefit-agency">${esc(b.agency)}</div>
        </div>
        ${b.onapPsbltYn === 'Y' ? `<span class="badge" style="background:rgba(16,185,129,.12);color:var(--success);font-size:.68rem;white-space:nowrap">온라인 신청</span>` : ''}
      </div>
      ${b.amount ? `<div class="benefit-amount">${esc(b.amount)}</div>` : ''}
      ${b.description ? `<div class="benefit-desc">${esc(b.description)}</div>` : ''}
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

  // 검색 결과 → 매칭 → 로컬 DB 순서로 탐색
  const benefit = BenefitsSearch.results.find(b => b.id === benefitId)
               || APP.matchedBenefits.find(b => b.id === benefitId)
               || WELFARE_DB.find(b => b.id === benefitId);
  if (!benefit) { console.warn('[상세] 혜택 못 찾음:', benefitId); return; }

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
      slot.innerHTML = `<div style="font-size:.78rem;color:var(--text-dim);padding:8px 0">상세 정보를 불러오지 못했습니다.</div>`;
      return;
    }

    const d = data.items[0];
    // 상세 내용 + 쉬운말 버튼
    slot.innerHTML = `
      ${renderAPIDetailSections(d)}
      <div id="modal-simplify-area" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
        <button
          onclick="simplifyModalDetail('${servId}')"
          style="width:100%;padding:12px;border-radius:10px;border:2px solid var(--primary);background:transparent;color:var(--primary);font-size:.88rem;font-weight:700;cursor:pointer;font-family:inherit">
          쉬운말로 보기 (GPT-4o)
        </button>
      </div>
    `;
    // 상세 데이터를 캐시로 저장
    _detailCache[servId] = d;
  } catch (e) {
    slot.innerHTML = `<div style="font-size:.78rem;color:var(--danger)">오류: ${e.message}</div>`;
  }
}

const _detailCache = {}; // servId → 상세 데이터 캐시

// ── 모달에서 쉬운말 변환 ──────────────────────────────────────────
async function simplifyModalDetail(servId) {
  const area = document.getElementById('modal-simplify-area');
  if (!area) return;

  const d = _detailCache[servId];
  if (!d) return;

  area.innerHTML = `
    <div class="typing-dots" style="justify-content:center;padding:12px 0">
      <span></span><span></span><span></span>
    </div>
    <div style="text-align:center;font-size:.76rem;color:var(--text-muted)">GPT-4o가 쉬운 말로 바꾸는 중...</div>
  `;

  // 상세 텍스트 조합 (가장 중요한 필드 우선)
  const fullText = [
    d.servNm && `서비스명: ${d.servNm}`,
    d.wlfareInfoOutlCn && `개요: ${d.wlfareInfoOutlCn}`,
    d.tgtrDtlCn && `대상: ${d.tgtrDtlCn}`,
    d.alwServCn && `지원내용: ${d.alwServCn}`,
    d.slctCritCn && `선정기준: ${d.slctCritCn}`,
    d.applmetList?.[0]?.servSeDetailNm && `신청방법: ${d.applmetList[0].servSeDetailNm}`,
  ].filter(Boolean).join('\n\n').slice(0, 2000); // 토큰 절약

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: 'system', content: `당신은 복지 서비스 내용을 어르신·장애인도 이해할 수 있도록 쉬운 말로 바꾸는 전문가입니다.
규칙:
- 어려운 행정·법률 용어를 일상 언어로 대체
- 누가 받을 수 있는지, 얼마나 받는지, 어디서 신청하는지 포함
- 300자 이내, 따뜻하고 친근한 말투
- 단락 구분하여 읽기 쉽게` },
          { role: 'user', content: fullText },
        ],
      }),
    });
    const json = await res.json();
    const text = json.success ? json.content : '변환에 실패했습니다.';

    area.innerHTML = `
      <div style="padding:14px;background:rgba(59,130,246,.06);border-radius:10px;border-left:3px solid var(--primary)">
        <div style="font-size:.72rem;font-weight:700;color:var(--primary);margin-bottom:8px">쉬운 말 설명 (GPT-4o)</div>
        <div style="font-size:.86rem;color:var(--text);line-height:1.8;white-space:pre-wrap">${esc(text)}</div>
      </div>
      <button onclick="simplifyModalDetail('${servId}')"
        style="width:100%;margin-top:8px;padding:8px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-dim);font-size:.76rem;cursor:pointer;font-family:inherit">
        다시 변환
      </button>
    `;
  } catch (e) {
    area.innerHTML = `<div style="color:var(--danger);font-size:.8rem">오류: ${e.message}</div>`;
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

// ── 프로필 기반 공통 파라미터 빌더 ────────────────────────────────
function buildProfileParams(profile, rows = '100') {
  const p = profile;
  const params = new URLSearchParams({ type: 'central', rows });
  if (p?.age) {
    params.set('lifeArray', ageToLifeCode(parseInt(p.age), p?.pregnant));
    params.set('age', String(parseInt(p.age)));
  }
  const trgCode = p ? profileToTrgCode(p) : '';
  if (trgCode) params.set('trgterIndvdlArray', trgCode);
  return params;
}

// ── 지자체 파라미터 빌더 ────────────────────────────────────────────
// 코드표 v1.0 기준: 중앙부처와 동일 코드 체계, 정렬만 arrgOrd 사용
// age·onapPsbltYn는 서버에서 central 타입일 때만 추가하므로 type=local이면 무시됨
function buildLocalParams(profile, rows = '100') {
  const p = profile;
  const params = new URLSearchParams({ type: 'local', rows, arrgOrd: '001' }); // 001=최신순
  if (p?.age) {
    params.set('lifeArray', ageToLifeCode(parseInt(p.age), p?.pregnant));
    // age는 지자체 API 미지원 → 서버에서도 central일 때만 추가하므로 넘겨도 무시됨
  }
  const trgCode = p ? profileToTrgCode(p) : '';
  if (trgCode) params.set('trgterIndvdlArray', trgCode);
  return params;
}

// ── 중앙 + 지자체 병렬 호출 후 합산 ──────────────────────────────────
async function fetchBothAPIs(profile, rows = '100') {
  const [centralResult, localResult] = await Promise.allSettled([
    fetch(`/api/welfare?${buildProfileParams(profile, rows)}`).then(r => r.json()),
    fetch(`/api/welfare?${buildLocalParams(profile, rows)}`).then(r => r.json()),
  ]);

  const centralData = centralResult.status === 'fulfilled' ? centralResult.value : { success: false };
  const localData   = localResult.status === 'fulfilled'   ? localResult.value   : { success: false };

  const centralItems = centralData.success ? (centralData.items || []).map(i => ({ ...i, _src: 'central' })) : [];
  const localItems   = localData.success   ? (localData.items   || []).map(i => ({ ...i, _src: 'local'   })) : [];

  return {
    centralData,
    localData,
    allItems:   [...centralItems, ...localItems],
    totalCount: (centralData.totalCount || 0) + (localData.totalCount || 0),
    centralCount: centralItems.length,
    localCount:   localItems.length,
  };
}

// ── 실제 복지 API 연동 (중앙 + 지자체 병렬) ────────────────────────
async function fetchWelfareAPI() {
  const p = APP.profile;
  if (!p) { toast('프로필을 먼저 입력해주세요', 'warn'); navigateTo('profile'); return; }

  const btn = document.getElementById('btn-fetch-api');
  const statusEl = document.getElementById('api-fetch-status');
  if (btn) { btn.disabled = true; btn.textContent = '조회 중...'; }
  if (statusEl) statusEl.textContent = '중앙부처 + 지자체 복지 데이터를 가져오는 중...';

  try {
    const { allItems, totalCount, centralCount, localCount, centralData } = await fetchBothAPIs(p, '100');

    if (allItems.length > 0) {
      const apiItems = allItems.map(apiItemToLocal);
      const merged   = mergeAndDedupe(matchBenefits(), apiItems);
      saveBenefits(merged);
      renderBenefitsPage();

      toast(`중앙 ${centralCount}건 + 지자체 ${localCount}건 로드 (전체 ${totalCount}건)`, 'success', 4000);
      if (statusEl) statusEl.textContent =
        `중앙부처 ${centralCount}건 + 지자체 ${localCount}건 · 전체 ${totalCount}건`;
    } else {
      const msg = centralData.error || '결과 없음';
      if (statusEl) statusEl.textContent = `오류: ${msg}`;
      if (btn) { btn.disabled = false; btn.textContent = '다시 조회'; }
      console.error('[welfare API]', msg);
    }
  } catch (e) {
    if (statusEl) statusEl.textContent = `네트워크 오류: ${e.message}`;
    if (btn) { btn.disabled = false; btn.textContent = '다시 조회'; }
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
// AI 복지 검색 파이프라인
// 흐름: 자유 입력 → GPT 의도분석(파라미터 추출) → 복지 API → 카드
// ══════════════════════════════════════════════════════════════════

async function searchBenefitsWithAI(query) {
  query = (query || '').trim();
  if (!query) { toast('검색어를 입력해주세요', 'warn'); return; }

  BenefitsSearch.status = 'analyzing';
  BenefitsSearch.intent = '';
  BenefitsSearch.extracted = null;
  BenefitsSearch.results = [];
  BenefitsSearch.error = '';
  updateSearchResultsUI();

  try {
    // ── 1단계: GPT 의도 분석 → API 파라미터 추출 ──────────────────
    const extracted = await extractWelfareParams(query);
    BenefitsSearch.intent = extracted.intent || query;
    BenefitsSearch.extracted = extracted;
    BenefitsSearch.status = 'fetching';
    updateSearchResultsUI();

    // ── 2단계: 복지 API 호출 (빈 결과 시 파라미터 축소 재시도) ────
    const p = APP.profile;
    console.log('[AI검색] 추출된 파라미터:', extracted);
    const items = await fetchWelfareWithFallback(extracted, p, query);

    if (items.length) {
      BenefitsSearch.results = items.map(apiItemToLocal);
      BenefitsSearch.status = 'done';
    } else {
      BenefitsSearch.error = `"${query}" 검색 결과가 없습니다. 콘솔(F12)에서 API 응답을 확인해보세요.`;
      BenefitsSearch.status = 'error';
    }
  } catch (e) {
    console.error('[AI검색] 오류:', e);
    BenefitsSearch.error = e.message;
    BenefitsSearch.status = 'error';
  }

  updateSearchResultsUI();
}

// ── 단계적 fallback API 호출 ──────────────────────────────────────
async function fetchWelfareWithFallback(extracted, profile, originalQuery) {
  const kw   = (extracted.keyword || '').trim();
  const life = (extracted.lifeArray || '').trim();
  const trg  = (extracted.trgterIndvdlArray || '').trim();
  const thm  = (extracted.intrsThemaArray || '').trim();

  // base: 공통 파라미터 (age는 profile에서)
  const makeBase = () => {
    const p = new URLSearchParams({ type: 'central', rows: '20' });
    if (profile?.age) p.set('age', String(parseInt(profile.age)));
    return p;
  };

  // 시도 순서: 중앙(좁은→넓은) → 지자체(넓은)
  const centralAttempts = [
    kw || life ? { type:'central', keyword: kw, lifeArray: life, trgterIndvdlArray: trg, intrsThemaArray: thm } : null,
    (kw && life) ? { type:'central', keyword: kw, lifeArray: life } : null,
    kw ? { type:'central', keyword: kw } : null,
    life ? { type:'central', lifeArray: life } : null,
    originalQuery ? { type:'central', keyword: originalQuery } : null,
  ].filter(Boolean);

  const localAttempts = [
    kw ? { type:'local', keyword: kw, lifeArray: life, arrgOrd: '001' } : null,
    originalQuery ? { type:'local', keyword: originalQuery, arrgOrd: '001' } : null,
    life ? { type:'local', lifeArray: life, arrgOrd: '001' } : null,
  ].filter(Boolean);

  const attempts = [...centralAttempts, ...localAttempts];
  console.log('[AI검색] 시도할 attempt 수:', attempts.length);

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    const params  = makeBase();
    params.set('type', attempt.type || 'central');
    if (attempt.keyword)           params.set('keyword', attempt.keyword);
    if (attempt.lifeArray)         params.set('lifeArray', attempt.lifeArray);
    if (attempt.trgterIndvdlArray) params.set('trgterIndvdlArray', attempt.trgterIndvdlArray);
    if (attempt.intrsThemaArray)   params.set('intrsThemaArray', attempt.intrsThemaArray);
    if (attempt.arrgOrd)           params.set('arrgOrd', attempt.arrgOrd);

    const url  = `/api/welfare?${params}`;
    console.log(`[AI검색] ${i+1}차(${attempt.type}):`, url);

    const res  = await fetch(url);
    const data = await res.json();
    console.log(`[AI검색] ${i+1}차 응답:`, data.success, 'items:', data.items?.length, data.error || '');

    if (data.success && data.items?.length > 0) return data.items;
    if (!data.success && data.error && !data.error.includes('NO DATA')) {
      throw new Error(data.error);
    }
  }
  return [];
}

// ── GPT 의도 분석: 자유 텍스트 → welfare API 파라미터 JSON ─────────
async function extractWelfareParams(query) {
  const p = APP.profile;
  const profileCtx = p
    ? `프로필: ${p.age || ''}세 / ${p.region || ''} / ${[
        p.disability && '장애인',
        p.pregnant && '임신중',
        p.elderly && '노인부양',
        p.incomePercent && `중위소득 ${p.incomePercent}%`,
        p.householdType === 'single-parent' && '한부모',
      ].filter(Boolean).join(', ') || '정보없음'}`
    : '';

  const system = `당신은 한국 복지서비스 API 파라미터 추출기입니다.
사용자 입력을 분석해 아래 JSON만 출력하세요 (마크다운 없이).

코드표:
lifeArray: 001영유아 002아동 003청소년 004청년(19-34세) 005중장년(35-64세) 006노년(65+) 007임신·출산
trgterIndvdlArray: 010다문화·탈북민 020다자녀 030보훈 040장애인 050저소득 060한부모·조손
intrsThemaArray: 010신체건강 020정신건강 030생활지원 040주거 050일자리 060문화·여가 070안전·위기 080임신·출산 090보육 100교육 120보호·돌봄 130서민금융 140법률

${profileCtx}

출력 형식 (값이 없으면 빈 문자열):
{"keyword":"핵심검색어","lifeArray":"코드","trgterIndvdlArray":"코드","intrsThemaArray":"코드","intent":"의도요약(10자내)"}`;

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: query },
      ],
      temperature: 0.1,
      max_tokens: 120,
    }),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'GPT 응답 실패');

  // JSON 추출 (GPT가 가끔 ```json 래핑하는 경우 대비)
  const raw = data.content.replace(/```json?|```/g, '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('파라미터 파싱 실패');
  return JSON.parse(raw.slice(start, end + 1));
}

// ── 검색 결과 UI 렌더 ─────────────────────────────────────────────
function renderSearchResults() {
  const { status, intent, extracted, results, error } = BenefitsSearch;

  if (status === 'idle') return '';

  if (status === 'analyzing') return `
    <div style="padding:16px 0;text-align:center">
      <div class="typing-dots" style="justify-content:center"><span></span><span></span><span></span></div>
      <div style="font-size:.78rem;color:var(--text-muted);margin-top:8px">AI가 의도를 분석하는 중...</div>
    </div>`;

  if (status === 'fetching') return `
    <div style="padding:16px 0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span class="badge" style="background:rgba(99,102,241,.12);color:var(--accent)">${esc(intent)}</span>
        ${_extractedParamBadges(extracted)}
      </div>
      <div class="typing-dots" style="justify-content:center"><span></span><span></span><span></span></div>
      <div style="font-size:.78rem;color:var(--text-muted);margin-top:8px;text-align:center">복지 API에서 검색하는 중...</div>
    </div>`;

  if (status === 'error') return `
    <div style="padding:12px 0">
      <div style="font-size:.82rem;color:var(--danger)">${esc(error)}</div>
      <div style="font-size:.75rem;color:var(--text-dim);margin-top:4px">다른 표현으로 다시 검색해보세요</div>
    </div>`;

  if (status === 'done' && results.length === 0) return `
    <div style="padding:16px 0;text-align:center">
      <div style="font-size:.88rem;font-weight:700;margin-bottom:6px">검색 결과가 없습니다</div>
      <div style="font-size:.78rem;color:var(--text-muted)">다른 표현으로 다시 검색해보세요</div>
    </div>`;

  if (status === 'done') return `
    <div style="margin-top:14px">
      <!-- 결과 헤더 -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span class="badge" style="background:rgba(0,192,115,.12);color:var(--success)">${esc(intent)}</span>
          ${_extractedParamBadges(extracted)}
          <span style="font-size:.74rem;color:var(--text-muted)">${results.length}건</span>
        </div>
        <!-- 음성으로 듣기 버튼 (핵심 차별점) -->
        <button onclick="readSearchResultsAloud()"
          style="display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:20px;
                 border:1.5px solid var(--success);background:rgba(0,192,115,.08);
                 color:var(--success);font-size:.78rem;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          음성으로 듣기
        </button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${results.map(b => renderBenefitCard(b)).join('')}
      </div>
    </div>`;

  return '';
}

// 추출된 파라미터를 배지로 표시
function _extractedParamBadges(ex) {
  if (!ex) return '';
  const lifeLabels = { '001':'영유아','002':'아동','003':'청소년','004':'청년','005':'중장년','006':'노년','007':'임신·출산' };
  const trgLabels  = { '010':'다문화','020':'다자녀','030':'보훈','040':'장애인','050':'저소득','060':'한부모' };
  const themeLabels= { '010':'신체건강','020':'정신건강','030':'생활지원','040':'주거','050':'일자리','060':'문화','070':'안전','080':'임신·출산','090':'보육','100':'교육','120':'돌봄','130':'서민금융','140':'법률' };

  return [
    ex.keyword && `<span class="badge" style="background:var(--bg3);color:var(--text)">"${esc(ex.keyword)}"</span>`,
    ex.lifeArray && `<span class="badge" style="background:var(--bg3);color:var(--text-muted)">${lifeLabels[ex.lifeArray] || ex.lifeArray}</span>`,
    ex.trgterIndvdlArray && `<span class="badge" style="background:var(--bg3);color:var(--text-muted)">${trgLabels[ex.trgterIndvdlArray] || ex.trgterIndvdlArray}</span>`,
    ex.intrsThemaArray && `<span class="badge" style="background:var(--bg3);color:var(--text-muted)">${themeLabels[ex.intrsThemaArray] || ex.intrsThemaArray}</span>`,
  ].filter(Boolean).join('');
}

// ── 검색 결과 → TTS 음성 재생 ─────────────────────────────────────
function readSearchResultsAloud() {
  const results = BenefitsSearch.results;
  if (!results.length) return;

  const p     = APP.profile;
  const name  = p?.name ? `${p.name}님, ` : '';
  const intent = BenefitsSearch.intent || '맞춤 복지';

  // 음성 스크립트 생성
  const intro  = `${name}${intent} 관련 혜택 ${results.length}가지를 안내해 드립니다.`;
  const items  = results.slice(0, 3).map((b, i) =>
    `${i+1}번, ${b.name}입니다. ${b.agency}에서 지원하며, ${b.description || b.amount || '자세한 내용은 주민센터에 문의하세요.'}`
  ).join(' ');
  const outro  = `신청은 복지로 홈페이지 또는 가까운 주민센터를 방문해 주세요.`;

  const script = `${intro} ${items} ${outro}`;

  // voice.js의 TTS 활용
  if (typeof Voice !== 'undefined' && Voice.synth) {
    Voice.synth.cancel();
    const utt = new SpeechSynthesisUtterance(script);
    utt.lang = 'ko-KR';
    utt.rate = 0.88;
    Voice.synth.speak(utt);
    toast('음성 안내를 시작합니다', 'success', 2000);
  } else {
    // voice.js 없으면 Web Speech API 직접 사용
    if (!('speechSynthesis' in window)) { toast('이 브라우저는 음성을 지원하지 않습니다', 'warn'); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(script);
    utt.lang = 'ko-KR'; utt.rate = 0.88;
    window.speechSynthesis.speak(utt);
    toast('음성 안내를 시작합니다', 'success', 2000);
  }

  // 음성 페이지로 이동해 TTS 컨트롤 표시
  navigateTo('voice');
  setTimeout(() => { if (typeof switchVoiceTab === 'function') switchVoiceTab('radio'); }, 200);
}

// ── 검색 결과 DOM 갱신 ────────────────────────────────────────────
function updateSearchResultsUI() {
  const el = document.getElementById('ai-search-results');
  if (el) el.innerHTML = renderSearchResults();
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
  try {
    const { allItems, totalCount, centralCount, localCount, centralData } =
      await fetchBothAPIs(p, '20'); // 점검용은 20건만

    if (allItems.length > 0) {
      WelfareAPITest.status = 'ok';
      WelfareAPITest.result = {
        totalCount,
        count: allItems.length,
        centralCount,
        localCount,
        firstItem: allItems[0] || null,
      };
    } else {
      WelfareAPITest.status = centralData?.success === false ? 'error' : 'empty';
      WelfareAPITest.result = {
        totalCount: 0, count: 0, centralCount: 0, localCount: 0,
        error: centralData?.error || '결과 없음',
        attempted: centralData?.attempted || '',
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
    ok:      `연결됨 · 중앙 ${result?.centralCount ?? 0} + 지자체 ${result?.localCount ?? 0}건`,
    empty:   '연결됨 · 결과 없음',
    error:   '오류',
  }[status] || status;

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
