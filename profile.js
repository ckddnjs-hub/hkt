'use strict';

// ── 위저드 상태 ──────────────────────────────────────────────────────
const ProfileWizard = {
  step: 0,
  answers: {},  // { age, region, name, householdType, incomePercent, housing, employment, special:{...} }
  _init: false,
};

// ── 단계 정의 ────────────────────────────────────────────────────────
function getWizardSteps() {
  return [
    {
      id: 'age',
      q: '나이가 어떻게 되세요?',
      hint: '받을 수 있는 혜택 판정에 꼭 필요합니다',
      type: 'number',
      required: true,
      placeholder: '예: 35',
      unit: '세',
    },
    {
      id: 'region',
      q: '어디에 사시나요?',
      hint: '지역별로 추가 혜택이 다릅니다',
      type: 'region',
      required: true,
    },
    {
      id: 'name',
      q: '이름을 알려주시겠어요?',
      hint: '안내 메시지에 이름으로 불러드릴게요',
      type: 'text',
      required: false,
      placeholder: '예: 홍길동',
    },
    {
      id: 'householdType',
      q: '가구 형태가 어떻게 되나요?',
      type: 'choice',
      required: false,
      options: [
        { value: 'single',        label: '혼자 살아요' },
        { value: 'couple',        label: '부부만 살아요' },
        { value: 'nuclear',       label: '부부 + 자녀' },
        { value: 'single-parent', label: '한부모 가구' },
        { value: 'multi-gen',     label: '3세대 이상' },
      ],
    },
    {
      id: 'incomePercent',
      q: '소득 수준을 알려주시겠어요?',
      hint: '이 기기에만 저장되며 외부로 전송되지 않습니다\n소득 기반 혜택(기초생활·주거급여 등)을 더 정확히 찾을 수 있어요',
      type: 'choice',
      required: false,
      subLabel: '기준 중위소득 대비',
      options: [
        { value: '30',  label: '30% 이하',  sub: '기초생계급여 대상' },
        { value: '50',  label: '50% 이하',  sub: '교육급여 대상' },
        { value: '75',  label: '75% 수준',  sub: '저소득' },
        { value: '100', label: '100% 수준', sub: '중위소득' },
        { value: '120', label: '120% 이상', sub: '' },
      ],
    },
    {
      id: 'housing',
      q: '지금 어떻게 살고 계세요?',
      type: 'choice',
      required: false,
      options: [
        { value: 'own',    label: '내 집이에요' },
        { value: 'jeonse', label: '전세예요' },
        { value: 'rent',   label: '월세예요' },
        { value: 'public', label: '공공임대예요' },
        { value: 'family', label: '가족 집에 살아요' },
      ],
    },
    {
      id: 'employment',
      q: '현재 일을 하고 계신가요?',
      type: 'choice',
      required: false,
      options: [
        { value: 'employed',      label: '직장에 다녀요' },
        { value: 'self-employed', label: '자영업이에요' },
        { value: 'unemployed',    label: '일이 없어요' },
        { value: 'retired',       label: '은퇴했어요' },
      ],
    },
    {
      id: 'special',
      q: '해당되는 상황이 있으신가요?',
      hint: '복수 선택 가능 · 없으면 건너뛰세요',
      type: 'checkbox',
      required: false,
      options: [
        { key: 'disability',  label: '장애 등록이 있어요' },
        { key: 'pregnant',    label: '임신 중이에요' },
        { key: 'elderly',     label: '65세 이상 어르신을 부양해요' },
        { key: 'hasChildren', label: '자녀가 있어요' },
        { key: 'veteran',     label: '국가유공자예요' },
      ],
    },
  ];
}

// ── 프로필 페이지 렌더링 ─────────────────────────────────────────────
function renderProfilePage() {
  const page = document.getElementById('page-profile');
  if (!page) return;

  // 처음 진입 시 기존 프로필로 초기값 설정
  if (!ProfileWizard._init) {
    const p = APP.profile || {};
    ProfileWizard.answers = {
      age:           p.age        || '',
      region:        p.region     || '',
      name:          p.name       || '',
      householdType: p.householdType || '',
      incomePercent: p.incomePercent || '',
      housing:       p.housing    || '',
      employment:    p.employment || '',
      special: {
        disability:  !!p.disability,
        pregnant:    !!p.pregnant,
        elderly:     !!p.elderly,
        hasChildren: !!p.hasChildren,
        veteran:     !!p.veteran,
      },
    };
    ProfileWizard.step = 0;
    ProfileWizard._init = true;
  }

  page.innerHTML = `<div id="wizard-root" style="min-height:100%"></div>`;
  renderWizardStep();
}

// ── 현재 단계 렌더 ───────────────────────────────────────────────────
function renderWizardStep() {
  const root = document.getElementById('wizard-root');
  if (!root) return;

  const steps = getWizardSteps();
  const step  = ProfileWizard.step;

  // 완료 화면
  if (step >= steps.length) {
    root.innerHTML = renderWizardDone();
    return;
  }

  const s       = steps[step];
  const total   = steps.length;
  const pct     = Math.round((step / total) * 100);
  const ans     = ProfileWizard.answers;
  const prevAns = buildAnswerSummary(step, steps, ans);

  root.innerHTML = `
    <!-- 상단 진행 바 -->
    <div style="position:sticky;top:0;z-index:10;background:var(--bg1);padding:14px 0 10px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        ${step > 0 ? `
          <button onclick="wizardBack()"
            style="padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-muted);font-size:.8rem;cursor:pointer;font-family:inherit">
            ← 이전
          </button>` : '<div style="width:54px"></div>'}
        <div style="flex:1;height:4px;background:var(--bg3);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:var(--primary);border-radius:4px;transition:width .3s ease"></div>
        </div>
        <span style="font-size:.75rem;color:var(--text-muted);white-space:nowrap">${step + 1} / ${total}</span>
      </div>
    </div>

    <!-- 이전 답변 요약 -->
    ${prevAns ? `
      <div style="font-size:.76rem;color:var(--text-dim);margin-bottom:16px;line-height:1.8">
        ${prevAns}
      </div>` : ''}

    <!-- 질문 -->
    <div style="font-size:1.4rem;font-weight:900;letter-spacing:-.03em;line-height:1.45;margin-bottom:${s.hint ? '8px' : '24px'}">
      ${esc(s.q)}
    </div>
    ${s.hint ? `
      <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:20px;line-height:1.7;white-space:pre-wrap">${esc(s.hint)}</div>` : ''}
    ${s.subLabel ? `<div style="font-size:.75rem;color:var(--text-dim);margin-bottom:10px">${esc(s.subLabel)}</div>` : ''}

    <!-- 입력 영역 -->
    <div id="wizard-input">
      ${renderWizardInput(s)}
    </div>

    <!-- 하단 버튼 -->
    <div style="margin-top:24px;display:flex;flex-direction:column;gap:8px">
      ${s.type === 'number' || s.type === 'text' ? `
        <button onclick="wizardNext()"
          class="btn btn-primary btn-full"
          style="padding:14px;font-size:1rem">
          다음 →
        </button>` : ''}
      ${s.type === 'checkbox' ? `
        <button onclick="wizardNext()"
          class="btn btn-primary btn-full"
          style="padding:14px;font-size:1rem">
          다음 →
        </button>` : ''}
      ${!s.required ? `
        <button onclick="wizardSkip()"
          style="padding:10px;border-radius:10px;border:none;background:transparent;color:var(--text-dim);font-size:.84rem;cursor:pointer;font-family:inherit">
          건너뛰기
        </button>` : ''}
    </div>
  `;

  // number/text 인풋 자동 포커스
  if (s.type === 'number' || s.type === 'text') {
    setTimeout(() => document.getElementById('wizard-field')?.focus(), 80);
  }
}

// ── 단계별 입력 렌더 ─────────────────────────────────────────────────
function renderWizardInput(s) {
  const ans = ProfileWizard.answers;

  if (s.type === 'number') {
    return `
      <div style="display:flex;align-items:center;gap:10px">
        <input
          id="wizard-field"
          type="number" min="1" max="110"
          value="${esc(ans[s.id] || '')}"
          placeholder="${esc(s.placeholder || '')}"
          onkeydown="if(event.key==='Enter')wizardNext()"
          style="width:120px;padding:14px 16px;font-size:1.8rem;font-weight:700;text-align:center;
                 border-radius:12px;border:2px solid var(--primary);background:var(--bg2);
                 color:var(--text);font-family:inherit;outline:none"
        >
        <span style="font-size:1.2rem;color:var(--text-muted)">${esc(s.unit || '')}</span>
      </div>`;
  }

  if (s.type === 'text') {
    return `
      <input
        id="wizard-field"
        type="text"
        value="${esc(ans[s.id] || '')}"
        placeholder="${esc(s.placeholder || '')}"
        onkeydown="if(event.key==='Enter')wizardNext()"
        style="width:100%;max-width:280px;padding:14px 16px;font-size:1.2rem;font-weight:600;
               border-radius:12px;border:2px solid var(--primary);background:var(--bg2);
               color:var(--text);font-family:inherit;outline:none"
      >`;
  }

  if (s.type === 'region') {
    return `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${REGIONS.map(r => `
          <button onclick="wizardSelectRegion('${r}')"
            style="padding:12px 8px;border-radius:10px;
                   border:2px solid ${ans.region === r ? 'var(--primary)' : 'var(--border)'};
                   background:${ans.region === r ? 'rgba(59,130,246,.12)' : 'var(--bg2)'};
                   color:${ans.region === r ? 'var(--primary)' : 'var(--text)'};
                   font-size:.88rem;font-weight:${ans.region === r ? '700' : '400'};
                   cursor:pointer;font-family:inherit;transition:all .15s">
            ${esc(r)}
          </button>`).join('')}
      </div>`;
  }

  if (s.type === 'choice') {
    return `
      <div style="display:flex;flex-direction:column;gap:8px">
        ${s.options.map(opt => `
          <button onclick="wizardSelectChoice('${s.id}','${opt.value}')"
            style="padding:14px 18px;border-radius:12px;text-align:left;
                   border:2px solid ${ans[s.id] === opt.value ? 'var(--primary)' : 'var(--border)'};
                   background:${ans[s.id] === opt.value ? 'rgba(59,130,246,.1)' : 'var(--bg2)'};
                   color:${ans[s.id] === opt.value ? 'var(--primary)' : 'var(--text)'};
                   cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:.95rem;font-weight:${ans[s.id] === opt.value ? '700' : '500'}">${esc(opt.label)}</span>
            ${opt.sub ? `<span style="font-size:.74rem;color:var(--text-dim)">${esc(opt.sub)}</span>` : ''}
            ${ans[s.id] === opt.value ? `<span style="color:var(--primary);font-size:1rem;margin-left:8px">✓</span>` : ''}
          </button>`).join('')}
      </div>`;
  }

  if (s.type === 'checkbox') {
    const sp = ans.special || {};
    return `
      <div style="display:flex;flex-direction:column;gap:8px">
        ${s.options.map(opt => `
          <button onclick="wizardToggleCheckbox('${opt.key}')"
            style="padding:14px 18px;border-radius:12px;text-align:left;
                   border:2px solid ${sp[opt.key] ? 'var(--primary)' : 'var(--border)'};
                   background:${sp[opt.key] ? 'rgba(59,130,246,.1)' : 'var(--bg2)'};
                   color:${sp[opt.key] ? 'var(--primary)' : 'var(--text)'};
                   cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:12px">
            <span style="width:20px;height:20px;border-radius:6px;border:2px solid ${sp[opt.key] ? 'var(--primary)' : 'var(--border)'};
                         background:${sp[opt.key] ? 'var(--primary)' : 'transparent'};
                         display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.7rem;color:#fff">
              ${sp[opt.key] ? '✓' : ''}
            </span>
            <span style="font-size:.93rem;font-weight:${sp[opt.key] ? '700' : '400'}">${esc(opt.label)}</span>
          </button>`).join('')}
      </div>`;
  }

  return '';
}

// ── 완료 화면 ────────────────────────────────────────────────────────
function renderWizardDone() {
  const ans = ProfileWizard.answers;
  const sp  = ans.special || {};
  const rows = [
    ['나이',     ans.age ? ans.age + '세' : ''],
    ['지역',     ans.region],
    ['이름',     ans.name],
    ['가구',     { single:'1인', couple:'부부', nuclear:'부부+자녀', 'single-parent':'한부모', 'multi-gen':'3세대+' }[ans.householdType] || ''],
    ['소득',     ans.incomePercent ? '중위소득 ' + ans.incomePercent + '%' : ''],
    ['주거',     { own:'자가', jeonse:'전세', rent:'월세', public:'공공임대', family:'가족동거' }[ans.housing] || ''],
    ['취업',     { employed:'재직', 'self-employed':'자영업', unemployed:'미취업', retired:'은퇴' }[ans.employment] || ''],
    ['특수상황', Object.entries(sp).filter(([,v])=>v).map(([k])=>({disability:'장애',pregnant:'임신',elderly:'노인부양',hasChildren:'자녀있음',veteran:'국가유공자'}[k]||k)).join(', ')],
  ].filter(([,v]) => v);

  return `
    <div style="text-align:center;padding:20px 0 16px">
      <div style="font-size:1.5rem;font-weight:900;margin-bottom:6px">입력 완료</div>
      <div style="font-size:.84rem;color:var(--text-muted)">아래 내용으로 복지 혜택을 조회합니다</div>
    </div>

    <div style="background:var(--bg2);border-radius:14px;padding:16px;margin-bottom:20px">
      ${rows.map(([label, value]) => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:.82rem;color:var(--text-muted)">${label}</span>
          <span style="font-size:.84rem;font-weight:600">${esc(value)}</span>
        </div>`).join('')}
    </div>

    <button onclick="wizardSave()" class="btn btn-primary btn-full" style="padding:16px;font-size:1rem;font-weight:700">
      저장하고 혜택 조회하기
    </button>
    <button onclick="ProfileWizard.step=0;renderWizardStep()"
      style="width:100%;margin-top:10px;padding:10px;border:none;background:transparent;color:var(--text-dim);font-size:.84rem;cursor:pointer;font-family:inherit">
      처음부터 다시 입력하기
    </button>
  `;
}

// ── 이전 답변 요약 텍스트 생성 ──────────────────────────────────────
function buildAnswerSummary(currentStep, steps, ans) {
  const lines = [];
  for (let i = 0; i < currentStep && i < steps.length; i++) {
    const s = steps[i];
    let val = '';
    if (s.type === 'number')   val = ans[s.id] ? ans[s.id] + (s.unit || '') : '';
    if (s.type === 'text')     val = ans[s.id] || '';
    if (s.type === 'region')   val = ans.region || '';
    if (s.type === 'choice')   val = s.options.find(o => o.value === ans[s.id])?.label || '';
    if (s.type === 'checkbox') {
      const sp = ans.special || {};
      val = s.options.filter(o => sp[o.key]).map(o => o.label).join(', ');
    }
    if (val) lines.push(`<span style="color:var(--text)">${esc(val)}</span>`);
  }
  return lines.length ? lines.join(' · ') : '';
}

// ── 위저드 액션 ──────────────────────────────────────────────────────
function wizardNext() {
  const steps = getWizardSteps();
  const s     = steps[ProfileWizard.step];
  if (!s) return;

  // 값 읽기
  if (s.type === 'number' || s.type === 'text') {
    const val = document.getElementById('wizard-field')?.value.trim() || '';
    if (s.required && !val) {
      toast('필수 항목입니다', 'warn');
      document.getElementById('wizard-field')?.focus();
      return;
    }
    ProfileWizard.answers[s.id] = val;
  }

  if (s.type === 'region' && s.required && !ProfileWizard.answers.region) {
    toast('지역을 선택해주세요', 'warn');
    return;
  }

  ProfileWizard.step++;
  renderWizardStep();
  document.getElementById('wizard-root')?.scrollTo(0, 0);
  document.querySelector('.app-body')?.scrollTo(0, 0);
}

function wizardBack() {
  if (ProfileWizard.step > 0) {
    ProfileWizard.step--;
    renderWizardStep();
  }
}

function wizardSkip() {
  ProfileWizard.step++;
  renderWizardStep();
  document.querySelector('.app-body')?.scrollTo(0, 0);
}

function wizardSelectRegion(region) {
  ProfileWizard.answers.region = region;
  // 자동 다음 단계
  setTimeout(() => { ProfileWizard.step++; renderWizardStep(); }, 250);
}

function wizardSelectChoice(field, value) {
  ProfileWizard.answers[field] = value;
  // 선택 표시 후 자동 다음 단계
  renderWizardStep(); // 선택 상태 즉시 반영
  setTimeout(() => { ProfileWizard.step++; renderWizardStep(); }, 350);
}

function wizardToggleCheckbox(key) {
  if (!ProfileWizard.answers.special) ProfileWizard.answers.special = {};
  ProfileWizard.answers.special[key] = !ProfileWizard.answers.special[key];
  renderWizardStep(); // 즉시 UI 반영
}

// ── 위저드 저장 ──────────────────────────────────────────────────────
function wizardSave() {
  const ans = ProfileWizard.answers;
  const sp  = ans.special || {};

  if (!ans.age) {
    toast('나이를 입력해주세요', 'warn');
    ProfileWizard.step = 0;
    renderWizardStep();
    return;
  }

  const profile = {
    name:          (ans.name || '').trim(),
    age:           ans.age,
    region:        ans.region || '',
    householdType: ans.householdType || '',
    incomePercent: ans.incomePercent || '',
    housing:       ans.housing || '',
    employment:    ans.employment || '',
    disability:    !!sp.disability,
    pregnant:      !!sp.pregnant,
    elderly:       !!sp.elderly,
    hasChildren:   !!sp.hasChildren,
    veteran:       !!sp.veteran,
    updatedAt:     new Date().toISOString(),
  };

  saveProfile(profile);
  ProfileWizard._init = false; // 다음 진입 시 재초기화

  const matched = matchBenefits();
  saveBenefits(matched);
  updateWelfareMiniScore();
  renderSidebarUser();

  const name = profile.name ? `${profile.name}님, ` : '';
  toast(`${name}복지 데이터를 조회합니다...`, 'info', 2000);

  navigateTo('benefits');
  setTimeout(() => autoFetchWelfareOnProfileSave(), 400);

  dbSaveProfile(profile).catch(() => {});
}

// ── 프로필 저장 후 자동 API 조회 ────────────────────────────────────
async function autoFetchWelfareOnProfileSave() {
  const p = APP.profile;
  if (!p) return;

  const statusEl = document.getElementById('api-fetch-status');
  const btn      = document.getElementById('btn-fetch-api');
  if (statusEl) statusEl.textContent = '복지 데이터를 조회하는 중...';
  if (btn) { btn.disabled = true; btn.textContent = '조회 중...'; }

  try {
    // 중앙부처 + 지자체 병렬 호출 (benefits.js의 fetchBothAPIs 활용)
    const { allItems, totalCount, centralCount, localCount } =
      typeof fetchBothAPIs === 'function'
        ? await fetchBothAPIs(p, '100')
        : await (async () => {
            const res  = await fetch(`/api/welfare?type=central&rows=100`);
            const data = await res.json();
            return { allItems: data.items || [], totalCount: data.totalCount || 0, centralCount: data.items?.length || 0, localCount: 0 };
          })();

    if (allItems.length > 0) {
      const apiItems = allItems.map(apiItemToLocal);
      saveBenefits(apiItems); // API 결과만 저장
      if (typeof _apiPage !== 'undefined') {
        _apiPage   = 1;
        _sortedAPI = typeof sortByRelevance === 'function'
          ? sortByRelevance(apiItems, p) : apiItems;
      }
      renderBenefitsPage();
      const name = p.name ? `${p.name}님 — ` : '';
      toast(`${name}중앙 ${centralCount}건 + 지자체 ${localCount}건 (전체 ${totalCount}건)`, 'success', 4000);
      if (statusEl) statusEl.textContent = `중앙부처 ${centralCount}건 + 지자체 ${localCount}건 로드됨`;
    } else {
      if (statusEl) statusEl.textContent = `API 오류 — 로컬 데이터 표시 중`;
      if (btn) { btn.disabled = false; btn.textContent = '다시 조회'; }
    }
  } catch (e) {
    if (statusEl) statusEl.textContent = '조회 실패';
    if (btn) { btn.disabled = false; btn.textContent = '다시 조회'; }
  }
}
