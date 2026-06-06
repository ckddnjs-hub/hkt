'use strict';

// ── 프로필 페이지 렌더링 ─────────────────────────────────────────────
function renderProfilePage() {
  const page = document.getElementById('page-profile');
  if (!page) return;
  const p = APP.profile || {};

  page.innerHTML = `
    <div class="page-title">내 정보</div>
    <div class="page-sub">나이와 지역만 입력해도 바로 조회됩니다</div>

    <!-- ── 필수: 나이 + 지역 ── -->
    <div class="profile-section" style="border:2px solid var(--primary);border-radius:var(--radius)">
      <div class="profile-section-title" style="color:var(--primary)">기본 정보 <span style="font-size:.72rem;font-weight:400;color:var(--text-muted)">— 이것만 입력해도 조회됩니다</span></div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">나이 <span style="color:var(--primary);font-size:.7rem">필수</span></label>
          <input class="form-input" id="pf-age" type="number" min="1" max="100" placeholder="30" value="${esc(p.age || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">거주 지역 <span style="color:var(--primary);font-size:.7rem">필수</span></label>
          <select class="form-select" id="pf-region">
            <option value="">선택</option>
            ${REGIONS.map(r => `<option value="${r}" ${p.region === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">이름 <span style="font-size:.7rem;color:var(--text-dim)">(선택 — 개인화 안내에 사용)</span></label>
        <input class="form-input" id="pf-name" type="text" placeholder="홍길동" value="${esc(p.name || '')}">
      </div>
    </div>

    <!-- ── 선택: 상세 정보 ── -->
    <div style="margin:16px 0 8px;display:flex;align-items:center;gap:8px">
      <div style="flex:1;height:1px;background:var(--border)"></div>
      <span style="font-size:.75rem;color:var(--text-muted);white-space:nowrap">선택 — 입력할수록 정확한 매칭</span>
      <div style="flex:1;height:1px;background:var(--border)"></div>
    </div>

    <!-- 가구 -->
    <div class="profile-section">
      <div class="profile-section-title">가구 상황 <span style="font-size:.7rem;font-weight:400;color:var(--text-dim)">(선택)</span></div>
      <div class="form-group">
        <label class="form-label">가구 유형</label>
        <select class="form-select" id="pf-household-type">
          <option value="">선택 안 함</option>
          ${[
            ['single', '1인 가구'],
            ['couple', '부부 가구'],
            ['nuclear', '핵가족 (부부+자녀)'],
            ['single-parent', '한부모 가구'],
            ['multi-gen', '3세대 이상'],
          ].map(([val, label]) => `<option value="${val}" ${p.householdType === val ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">가구원 수</label>
          <select class="form-select" id="pf-household-size">
            <option value="">선택 안 함</option>
            ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${p.householdSize == n ? 'selected' : ''}>${n}명${n===6?'+':''}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">자녀 유무</label>
          <div class="toggle-group">
            <button class="toggle-btn ${p.hasChildren ? 'active' : ''}" id="pf-children-yes">있음</button>
            <button class="toggle-btn ${!p.hasChildren ? 'active' : ''}" id="pf-children-no">없음</button>
          </div>
        </div>
      </div>
      <div id="pf-children-section" style="${p.hasChildren ? '' : 'display:none'}">
        <div class="form-group">
          <label class="form-label">막내 자녀 나이</label>
          <input class="form-input" id="pf-child-age" type="number" min="0" max="20" placeholder="만 나이" value="${esc(p.childAge || '')}">
        </div>
      </div>
    </div>

    <!-- 소득 (민감정보) -->
    <div class="profile-section">
      <div class="profile-section-title">소득 수준 <span style="font-size:.7rem;font-weight:400;color:var(--text-dim)">(선택)</span></div>
      <div style="font-size:.76rem;color:var(--text-muted);margin-bottom:10px;padding:8px 10px;background:var(--bg3);border-radius:8px;line-height:1.6">
        소득 정보는 이 기기에만 저장되며 외부로 전송되지 않습니다.<br>
        입력하면 기초생활·주거급여 등 소득 기반 혜택을 더 정확히 찾을 수 있습니다.
      </div>
      <div class="form-group">
        <label class="form-label">기준 중위소득 대비</label>
        <select class="form-select" id="pf-income">
          <option value="">입력 안 함</option>
          ${[
            ['30', '30% 이하 — 기초생계급여 대상'],
            ['40', '40% 이하 — 기초의료급여 대상'],
            ['48', '48% 이하 — 주거급여 대상'],
            ['50', '50% 이하 — 교육급여 대상'],
            ['60', '60% 수준 — 저소득'],
            ['75', '75% 수준'],
            ['100', '100% 수준 — 중위소득'],
            ['120', '120% 이상'],
          ].map(([val, label]) => `<option value="${val}" ${p.incomePercent === val ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">취업 상태</label>
          <div class="toggle-group" id="pf-employment-group">
            ${[
              ['employed', '재직'],
              ['self-employed', '자영업'],
              ['unemployed', '미취업'],
              ['retired', '은퇴'],
            ].map(([val, label]) => `<button class="toggle-btn ${p.employment === val ? 'active' : ''}" data-employment="${val}">${label}</button>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">주거 형태</label>
          <div class="toggle-group" id="pf-housing-group">
            ${[
              ['own', '자가'],
              ['jeonse', '전세'],
              ['rent', '월세'],
              ['public', '공공임대'],
            ].map(([val, label]) => `<button class="toggle-btn ${p.housing === val ? 'active' : ''}" data-housing="${val}">${label}</button>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- 특수 상황 -->
    <div class="profile-section">
      <div class="profile-section-title">특수 상황 <span style="font-size:.7rem;font-weight:400;color:var(--text-dim)">(선택 — 해당하는 항목만)</span></div>
      <div class="checkbox-group" id="pf-special-group">
        ${[
          ['disability', '장애 등록', '♿'],
          ['pregnant', '임신 중', '🤰'],
          ['elderly', '65세+ 부양', '👴'],
          ['veteran', '국가유공자', '🎖'],
          ['lowCredit', '신용불량', ''],
          ['foreignMarriage', '결혼이민자', ''],
        ].map(([key, label, icon]) => `
          <label class="checkbox-item ${p[key] ? 'checked' : ''}" data-key="${key}">
            <span>${icon ? icon + ' ' : ''}${label}</span>
            <span class="checkbox-check">${p[key] ? '✓' : ''}</span>
          </label>`).join('')}
      </div>
    </div>

    <!-- 저장 버튼 -->
    <button class="btn btn-primary btn-full btn-lg mt20" id="btn-save-profile">
      저장하고 혜택 조회하기
    </button>
  `;

  initProfileEvents();
  updateProfileCompletion();
}

// ── 프로필 이벤트 초기화 ─────────────────────────────────────────────
function initProfileEvents() {
  // 성별 토글
  document.querySelectorAll('[data-gender]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-gender]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // 고용 토글
  document.querySelectorAll('[data-employment]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-employment]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // 주거 토글
  document.querySelectorAll('[data-housing]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-housing]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // 자녀 토글
  document.getElementById('pf-children-yes')?.addEventListener('click', () => {
    document.getElementById('pf-children-yes').classList.add('active');
    document.getElementById('pf-children-no').classList.remove('active');
    document.getElementById('pf-children-section').style.display = '';
  });
  document.getElementById('pf-children-no')?.addEventListener('click', () => {
    document.getElementById('pf-children-no').classList.add('active');
    document.getElementById('pf-children-yes').classList.remove('active');
    document.getElementById('pf-children-section').style.display = 'none';
  });

  // 체크박스
  document.querySelectorAll('[data-key]').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('checked');
      const check = item.querySelector('.checkbox-check');
      if (check) check.textContent = item.classList.contains('checked') ? '✓' : '';
    });
  });

  // 입력 변경 시 완성도 업데이트
  document.querySelectorAll('#page-profile .form-input, #page-profile .form-select').forEach(el => {
    el.addEventListener('input', updateProfileCompletion);
  });

  // 저장 + 자동 조회
  document.getElementById('btn-save-profile')?.addEventListener('click', saveProfileFromForm);
}

// ── 프로필 완성도 계산 (필수 2 + 선택 6) ────────────────────────────
function updateProfileCompletion() {
  const required = ['pf-age', 'pf-region'];
  const optional = ['pf-name', 'pf-household-type', 'pf-income', 'pf-household-size'];
  const reqFilled = required.filter(id => document.getElementById(id)?.value.trim()).length;
  const optFilled = optional.filter(id => document.getElementById(id)?.value.trim()).length;

  const pct = Math.round(((reqFilled * 2 + optFilled) / (required.length * 2 + optional.length)) * 100);
  const pctEl = document.getElementById('profile-pct');
  if (pctEl) pctEl.textContent = `${pct}%`;

  const bar = document.querySelector('#profile-complete-bar .progress-bar-fill');
  if (bar) bar.style.width = `${pct}%`;
}

// ── 폼에서 프로필 읽기 ───────────────────────────────────────────────
function readProfileFromForm() {
  const specialKeys = ['disability', 'pregnant', 'elderly', 'veteran', 'lowCredit', 'foreignMarriage'];
  const specialValues = {};
  specialKeys.forEach(key => {
    specialValues[key] = document.querySelector(`[data-key="${key}"]`)?.classList.contains('checked') || false;
  });

  return {
    name: document.getElementById('pf-name')?.value.trim() || '',
    age: document.getElementById('pf-age')?.value || '',
    gender: document.querySelector('[data-gender].active')?.dataset.gender || '',
    region: document.getElementById('pf-region')?.value || '',
    householdType: document.getElementById('pf-household-type')?.value || '',
    householdSize: document.getElementById('pf-household-size')?.value || '',
    hasChildren: document.getElementById('pf-children-yes')?.classList.contains('active') || false,
    childAge: document.getElementById('pf-child-age')?.value || '',
    incomePercent: document.getElementById('pf-income')?.value || '',
    employment: document.querySelector('[data-employment].active')?.dataset.employment || '',
    housing: document.querySelector('[data-housing].active')?.dataset.housing || '',
    ...specialValues,
    updatedAt: new Date().toISOString(),
  };
}

// ── 프로필 저장 + 자동 복지 조회 ───────────────────────────────────
async function saveProfileFromForm() {
  const profile = readProfileFromForm();

  if (!profile.age) {
    toast('나이는 필수입니다', 'warn');
    document.getElementById('pf-age')?.focus();
    return;
  }

  saveProfile(profile);

  // 로컬 규칙 매칭 먼저
  const matched = matchBenefits();
  saveBenefits(matched);
  updateWelfareMiniScore();
  renderSidebarUser();

  const name = profile.name ? `${profile.name}님, ` : '';
  toast(`${name}복지 데이터를 조회합니다...`, 'info', 2000);

  // 혜택 페이지로 이동 후 실제 API 자동 조회
  navigateTo('benefits');
  setTimeout(() => autoFetchWelfareOnProfileSave(), 400);

  // Supabase 동기화 (비동기)
  dbSaveProfile(profile).catch(() => {});
}

// ── 프로필 저장 후 자동 API 조회 ────────────────────────────────────
async function autoFetchWelfareOnProfileSave() {
  const p = APP.profile;
  if (!p) return;

  // benefits 페이지의 상태 표시 업데이트
  const statusEl = document.getElementById('api-fetch-status');
  const btn = document.getElementById('btn-fetch-api');
  if (statusEl) statusEl.textContent = '실제 복지 데이터를 조회하는 중...';
  if (btn) { btn.disabled = true; btn.textContent = '조회 중...'; }

  // benefits.js의 buildProfileParams와 동일한 파라미터 (rows=100)
  const params = typeof buildProfileParams === 'function'
    ? buildProfileParams(p, '100')
    : (() => {
        const q = new URLSearchParams({ type: 'central', rows: '100' });
        if (p.age) { q.set('lifeArray', ageToLifeCode(parseInt(p.age), p.pregnant)); q.set('age', String(parseInt(p.age))); }
        const trg = profileToTrgCode(p); if (trg) q.set('trgterIndvdlArray', trg);
        return q;
      })();

  try {
    const res = await fetch(`/api/welfare?${params}`);
    const data = await res.json();

    if (data.success) {
      const apiItems = (data.items || []).map(apiItemToLocal);
      const merged = mergeAndDedupe(matchBenefits(), apiItems);
      saveBenefits(merged);
      renderBenefitsPage();
      const name = p.name ? `${p.name}님 — ` : '';
      const total = data.totalCount || apiItems.length;
      toast(`${name}${apiItems.length}건 로드 완료 (전체 ${total}건)`, 'success', 3000);
    } else {
      if (statusEl) statusEl.textContent = `API 미연결 — 로컬 데이터 ${APP.matchedBenefits.length}개 표시 중`;
      if (btn) { btn.disabled = false; btn.textContent = '다시 조회'; }
    }
  } catch (e) {
    if (statusEl) statusEl.textContent = '조회 실패 — 로컬 데이터만 표시됩니다';
    if (btn) { btn.disabled = false; btn.textContent = '다시 조회'; }
  }
}
