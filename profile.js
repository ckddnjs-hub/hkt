'use strict';

// ── 프로필 페이지 렌더링 ─────────────────────────────────────────────
function renderProfilePage() {
  const page = document.getElementById('page-profile');
  if (!page) return;
  const p = APP.profile || {};

  page.innerHTML = `
    <div class="page-title">내 정보</div>
    <div class="page-sub">맞춤 복지 혜택을 위해 정보를 입력해주세요</div>

    <!-- 완성도 표시 -->
    <div class="profile-complete-bar" id="profile-complete-bar">
      <div class="pcb-label">
        <span>프로필 완성도</span>
        <span class="pcb-pct" id="profile-pct">0%</span>
      </div>
      ${uiProgressBar(0, 100, 'var(--primary)')}
    </div>

    <!-- 기본 정보 -->
    <div class="profile-section">
      <div class="profile-section-title">👤 기본 정보</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">이름</label>
          <input class="form-input" id="pf-name" type="text" placeholder="홍길동" value="${esc(p.name || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">나이</label>
          <input class="form-input" id="pf-age" type="number" min="1" max="100" placeholder="30" value="${esc(p.age || '')}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">성별</label>
        <div class="toggle-group" id="pf-gender-group">
          ${['male:남성', 'female:여성', 'other:기타'].map(g => {
            const [val, label] = g.split(':');
            return `<button class="toggle-btn ${p.gender === val ? 'active' : ''}" data-gender="${val}">${label}</button>`;
          }).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">거주 지역</label>
        <select class="form-select" id="pf-region">
          <option value="">선택하세요</option>
          ${REGIONS.map(r => `<option value="${r}" ${p.region === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- 가구 정보 -->
    <div class="profile-section">
      <div class="profile-section-title">🏠 가구 정보</div>
      <div class="form-group">
        <label class="form-label">가구 유형</label>
        <select class="form-select" id="pf-household-type">
          <option value="">선택하세요</option>
          ${[
            ['single', '1인 가구'],
            ['couple', '부부 가구'],
            ['nuclear', '핵가족 (부부+자녀)'],
            ['single-parent', '한부모 가구'],
            ['multi-gen', '3세대 이상'],
            ['other', '기타'],
          ].map(([val, label]) => `<option value="${val}" ${p.householdType === val ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">가구원 수</label>
          <select class="form-select" id="pf-household-size">
            <option value="">선택</option>
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

    <!-- 소득 정보 -->
    <div class="profile-section">
      <div class="profile-section-title">💰 소득 정보</div>
      <div class="form-group">
        <label class="form-label">기준 중위소득 대비 (%)</label>
        <select class="form-select" id="pf-income">
          <option value="">선택하세요</option>
          ${[
            ['30', '30% 이하 (기초생계급여 대상)'],
            ['40', '40% 이하 (기초의료급여 대상)'],
            ['48', '48% 이하 (주거급여 대상)'],
            ['50', '50% 이하 (교육급여 대상)'],
            ['60', '60% (저소득)'],
            ['75', '75% (중위소득 하위)'],
            ['100', '100% (중위소득)'],
            ['120', '120% 이상'],
          ].map(([val, label]) => `<option value="${val}" ${p.incomePercent === val ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
        <div class="form-hint">2024년 기준 중위소득 4인 기준 5,729,341원</div>
      </div>
      <div class="form-group">
        <label class="form-label">취업 상태</label>
        <div class="toggle-group" id="pf-employment-group">
          ${[
            ['employed', '재직 중'],
            ['self-employed', '자영업'],
            ['unemployed', '미취업'],
            ['retired', '은퇴'],
          ].map(([val, label]) => `<button class="toggle-btn ${p.employment === val ? 'active' : ''}" data-employment="${val}">${label}</button>`).join('')}
        </div>
      </div>
    </div>

    <!-- 주거 정보 -->
    <div class="profile-section">
      <div class="profile-section-title">🏡 주거 정보</div>
      <div class="form-group">
        <label class="form-label">주거 형태</label>
        <div class="toggle-group" id="pf-housing-group">
          ${[
            ['own', '자가'],
            ['jeonse', '전세'],
            ['rent', '월세'],
            ['public', '공공임대'],
            ['family', '가족 동거'],
          ].map(([val, label]) => `<button class="toggle-btn ${p.housing === val ? 'active' : ''}" data-housing="${val}">${label}</button>`).join('')}
        </div>
      </div>
    </div>

    <!-- 건강/특수 상황 -->
    <div class="profile-section">
      <div class="profile-section-title">💊 건강 및 특수 상황</div>
      <div class="checkbox-group" id="pf-special-group">
        ${[
          ['disability', '장애 등록', '♿'],
          ['pregnant', '임신 중', '🤰'],
          ['elderly', '65세+ 부양', '👴'],
          ['veteran', '국가유공자', '🎖'],
          ['lowCredit', '신용불량', '📋'],
          ['foreignMarriage', '결혼이민자', '🌏'],
        ].map(([key, label, icon]) => `
          <label class="checkbox-item ${p[key] ? 'checked' : ''}" data-key="${key}">
            <span>${icon} ${label}</span>
            <span class="checkbox-check">${p[key] ? '✓' : ''}</span>
          </label>`).join('')}
      </div>
    </div>

    <!-- 저장 버튼 -->
    <button class="btn btn-primary btn-full btn-lg mt20" id="btn-save-profile">
      💾 프로필 저장하기
    </button>
    <button class="btn btn-ghost btn-full mt8" id="btn-find-benefits" style="${APP.profile ? '' : 'display:none'}">
      🎯 맞춤 혜택 찾기
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

  // 저장
  document.getElementById('btn-save-profile')?.addEventListener('click', saveProfileFromForm);

  // 혜택 찾기
  document.getElementById('btn-find-benefits')?.addEventListener('click', () => navigateTo('benefits'));
}

// ── 프로필 완성도 계산 ───────────────────────────────────────────────
function updateProfileCompletion() {
  const fields = ['pf-name', 'pf-age', 'pf-region', 'pf-household-type', 'pf-income'];
  const filled = fields.filter(id => {
    const el = document.getElementById(id);
    return el && el.value.trim() !== '';
  }).length;

  const pct = Math.round((filled / fields.length) * 100);
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

// ── 프로필 저장 ─────────────────────────────────────────────────────
async function saveProfileFromForm() {
  const profile = readProfileFromForm();

  if (!profile.name || !profile.age) {
    toast('이름과 나이는 필수입니다', 'warn');
    return;
  }

  saveProfile(profile);

  // 혜택 재계산
  const matched = matchBenefits();
  saveBenefits(matched);
  updateWelfareMiniScore();
  renderSidebarUser();

  toast(`${profile.name}님, 프로필이 저장되었습니다! ${matched.length}개 혜택을 찾았어요.`, 'success', 4000);
  document.getElementById('btn-find-benefits')?.style.removeProperty('display');

  // Supabase 동기화 (비동기 - 실패해도 로컬 저장 유지)
  dbSaveProfile(profile).catch(() => {});
}
