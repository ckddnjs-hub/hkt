'use strict';
// ══════════════════════════════════════════════════════════════════════
//  wizard.js — Toss 스타일 온보딩 위저드 (8단계)
// ══════════════════════════════════════════════════════════════════════

let _wz = {
  step: 0,
  data: {
    gender: null, birth_year: null,
    region: null, district: null, address: null, lat: null, lng: null,
    household_type: null, household_size: 1,
    income_level: 100, income_amount: 200,
    housing_type: null,
    employment_status: null,
    has_disability: false, disability_grade: null,
    has_pregnancy: false, has_infant: false,
    is_single_parent: false, is_low_income: false,
  },
};

const WZ_TOTAL = 8;

function renderWizard() {
  navigateTo('wizard');
  _wz.step = 0;
  _wzRenderStep();
}

function _wzRenderStep() {
  const wrap = document.getElementById('wizard-wrap');
  const progress = document.getElementById('wizard-progress');
  if (!wrap) return;
  progress.style.width = `${(_wz.step / WZ_TOTAL) * 100}%`;

  const steps = [
    _wzStep0_welcome,
    _wzStep1_gender,
    _wzStep2_birth,
    _wzStep3_region,
    _wzStep4_household,
    _wzStep5_income,
    _wzStep6_housing,
    _wzStep7_extras,
    _wzStep8_done,
  ];
  wrap.innerHTML = steps[_wz.step]();
}

function _wzNext() {
  if (_wz.step < WZ_TOTAL) { _wz.step++; _wzRenderStep(); }
}
function _wzBack() {
  if (_wz.step > 0) { _wz.step--; _wzRenderStep(); }
}

// ── Step 0: 웰컴 ──────────────────────────────────────────────────────
function _wzStep0_welcome() {
  return `
    <div class="wizard-step active" style="align-items:center;text-align:center;padding-top:48px">
      <div style="font-size:4rem;margin-bottom:20px">🏛️</div>
      <div style="font-size:1.5rem;font-weight:900;margin-bottom:12px">나에게 맞는<br>복지 혜택을 찾아드려요</div>
      <div style="font-size:.88rem;color:var(--text-muted);line-height:1.7;margin-bottom:auto;max-width:280px">
        몇 가지 정보만 알려주시면<br>
        AI가 받을 수 있는 혜택을 분석하고<br>
        신청 전략까지 짜드립니다 🤖
      </div>
      <div class="wizard-footer" style="width:100%">
        <button class="btn btn-primary btn-full btn-lg" onclick="_wzNext()">
          시작하기 →
        </button>
        <div style="font-size:.75rem;color:var(--text-dim);text-align:center">
          약 2분이면 완료돼요 · 개인정보는 안전하게 보호됩니다
        </div>
      </div>
    </div>`;
}

// ── Step 1: 성별 ──────────────────────────────────────────────────────
function _wzStep1_gender() {
  return `
    <div class="wizard-step active">
      <div class="wizard-step-num">1 / ${WZ_TOTAL}</div>
      <div class="wizard-question">성별이 어떻게 되세요?</div>
      <div class="wizard-sub">일부 혜택은 성별에 따라 달라질 수 있어요</div>
      <div class="wizard-options">
        <button class="wizard-option ${_wz.data.gender==='male'?'selected':''}" onclick="_wzSelect('gender','male');_wzNext()">
          <span class="opt-icon">👨</span>
          <div><div style="font-weight:700">남성</div></div>
        </button>
        <button class="wizard-option ${_wz.data.gender==='female'?'selected':''}" onclick="_wzSelect('gender','female');_wzNext()">
          <span class="opt-icon">👩</span>
          <div><div style="font-weight:700">여성</div></div>
        </button>
      </div>
      <div class="wizard-footer">
        <div class="wizard-nav">
          <button class="btn-back" onclick="_wzBack()">‹ 이전</button>
          <button class="btn btn-primary" style="flex:1" onclick="_wzNext()">다음 →</button>
        </div>
      </div>
    </div>`;
}

// ── Step 2: 생년도 ─────────────────────────────────────────────────────
function _wzStep2_birth() {
  return `
    <div class="wizard-step active">
      <div class="wizard-step-num">2 / ${WZ_TOTAL}</div>
      <div class="wizard-question">태어난 연도를 알려주세요</div>
      <div class="wizard-sub">연령에 따라 받을 수 있는 혜택이 달라져요<br>(예: 기초연금은 만 65세 이상)</div>
      <div style="margin-bottom:auto">
        <input type="number" class="wizard-input" id="birth-input"
          placeholder="예: 1975" min="1924" max="${new Date().getFullYear()}"
          value="${_wz.data.birth_year || ''}"
          inputmode="numeric" style="font-size:1.5rem;font-weight:700;text-align:center;padding:20px"
        >
        <div id="age-preview" style="text-align:center;margin-top:12px;font-size:.9rem;color:var(--text-muted)">
          ${_wz.data.birth_year ? `만 ${new Date().getFullYear()-_wz.data.birth_year}세` : ''}
        </div>
      </div>
      <div class="wizard-footer">
        <div class="wizard-nav">
          <button class="btn-back" onclick="_wzBack()">‹ 이전</button>
          <button class="btn btn-primary" style="flex:1" onclick="_wzSaveBirth()">다음 →</button>
        </div>
      </div>
    </div>
    <script>
      document.getElementById('birth-input').addEventListener('input', function() {
        const y = parseInt(this.value);
        const el = document.getElementById('age-preview');
        if (y >= 1924 && y <= ${new Date().getFullYear()}) {
          el.textContent = '만 ' + (${new Date().getFullYear()} - y) + '세';
        } else { el.textContent = ''; }
      });
    </scr` + `ipt>`;
}
function _wzSaveBirth() {
  const val = parseInt(document.getElementById('birth-input')?.value);
  if (!val || val < 1924 || val > new Date().getFullYear()) {
    toast('올바른 연도를 입력해주세요', 'error'); return;
  }
  _wz.data.birth_year = val;
  _wzNext();
}

// ── Step 3: 지역 (GPS) ────────────────────────────────────────────────
function _wzStep3_region() {
  const hasAddr = !!_wz.data.address;
  return `
    <div class="wizard-step active">
      <div class="wizard-step-num">3 / ${WZ_TOTAL}</div>
      <div class="wizard-question">어디에 사세요?</div>
      <div class="wizard-sub">거주 지역에 따라 지자체 혜택이 달라져요<br>GPS로 자동 입력하거나 직접 입력할 수 있어요</div>
      <div style="margin-bottom:auto">
        <button class="gps-btn" id="gps-btn" onclick="_wzGetGPS()">
          📍 현재 위치로 자동 입력
        </button>
        ${hasAddr ? `<div class="address-result" id="addr-result">✅ ${esc(_wz.data.address)}</div>` : '<div id="addr-result" style="display:none" class="address-result"></div>'}
        <div style="display:flex;align-items:center;gap:8px;margin:12px 0">
          <div style="flex:1;height:1px;background:var(--border)"></div>
          <span style="font-size:.75rem;color:var(--text-dim)">또는 직접 입력</span>
          <div style="flex:1;height:1px;background:var(--border)"></div>
        </div>
        <input type="text" class="wizard-input" id="region-input"
          placeholder="예: 대전광역시 유성구"
          value="${esc(_wz.data.address || '')}"
        >
      </div>
      <div class="wizard-footer">
        <div class="wizard-nav">
          <button class="btn-back" onclick="_wzBack()">‹ 이전</button>
          <button class="btn btn-primary" style="flex:1" onclick="_wzSaveRegion()">다음 →</button>
        </div>
      </div>
    </div>`;
}

function _wzGetGPS() {
  const btn = document.getElementById('gps-btn');
  if (!navigator.geolocation) { toast('GPS를 지원하지 않는 브라우저예요', 'error'); return; }
  if (btn) { btn.textContent = '📡 위치 가져오는 중...'; btn.disabled = true; }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude: lat, longitude: lng } = pos.coords;
    _wz.data.lat = lat; _wz.data.lng = lng;

    // 카카오 역지오코딩
    try {
      await _wzLoadKakaoSDK();
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.coord2Address(lng, lat, (result, status) => {
        if (status === kakao.maps.services.Status.OK && result.length > 0) {
          const doc = result[0];
          const road = doc.road_address?.address_name;
          const jibun = doc.address?.address_name;
          const addr = road || jibun || '';
          _wz.data.address = addr;
          // 시도/시군구 파싱
          const parts = addr.split(' ');
          _wz.data.region = parts[0] || '';
          _wz.data.district = parts[1] || '';

          const input = document.getElementById('region-input');
          if (input) input.value = addr;
          const res = document.getElementById('addr-result');
          if (res) { res.textContent = '✅ ' + addr; res.style.display = 'block'; }
          toast('위치를 가져왔어요', 'success');
        }
        if (btn) { btn.textContent = '📍 현재 위치로 자동 입력'; btn.disabled = false; }
      });
    } catch (e) {
      if (btn) { btn.textContent = '📍 현재 위치로 자동 입력'; btn.disabled = false; }
      toast('주소 변환에 실패했어요', 'error');
    }
  }, (err) => {
    if (btn) { btn.textContent = '📍 현재 위치로 자동 입력'; btn.disabled = false; }
    toast('GPS 권한을 허용해주세요', 'error');
  }, { enableHighAccuracy: true, timeout: 10000 });
}

function _wzLoadKakaoSDK() {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps?.services) { resolve(); return; }
    if (window.kakao?.maps) { kakao.maps.load(resolve); return; }
    const s = document.createElement('script');
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`;
    s.onload = () => kakao.maps.load(resolve);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function _wzSaveRegion() {
  const val = document.getElementById('region-input')?.value.trim();
  if (!val) { toast('지역을 입력해주세요', 'error'); return; }
  if (!_wz.data.address) {
    _wz.data.address = val;
    const parts = val.split(' ');
    _wz.data.region = parts[0] || val;
    _wz.data.district = parts[1] || '';
  }
  _wzNext();
}

// ── Step 4: 가구 구성 ─────────────────────────────────────────────────
function _wzStep4_household() {
  const opts = [
    { val: 'single', icon: '🧑', label: '1인 가구', desc: '혼자 살고 있어요' },
    { val: 'couple', icon: '👫', label: '부부 (2인)', desc: '자녀 없는 부부' },
    { val: 'family', icon: '👨‍👩‍👧', label: '자녀 포함', desc: '부부 + 자녀' },
    { val: 'single_parent', icon: '👩‍👦', label: '한부모 가정', desc: '한부모 + 자녀' },
  ];
  return `
    <div class="wizard-step active">
      <div class="wizard-step-num">4 / ${WZ_TOTAL}</div>
      <div class="wizard-question">가족 구성이 어떻게 되세요?</div>
      <div class="wizard-sub">가구 구성에 따라 받을 수 있는 혜택이 달라져요</div>
      <div class="wizard-options" style="margin-bottom:auto">
        ${opts.map(o => `
          <button class="wizard-option ${_wz.data.household_type===o.val?'selected':''}"
            onclick="_wzSelect('household_type','${o.val}');_wzNext()">
            <span class="opt-icon">${o.icon}</span>
            <div><div style="font-weight:700">${o.label}</div><div style="font-size:.78rem;color:var(--text-muted)">${o.desc}</div></div>
          </button>`).join('')}
        <button class="wizard-option ${_wz.data.household_type==='other'?'selected':''}"
          onclick="_wzSelect('household_type','other');_wzNext()">
          <span class="opt-icon">👥</span>
          <div><div style="font-weight:700">기타</div><div style="font-size:.78rem;color:var(--text-muted)">다세대·기타 형태</div></div>
        </button>
      </div>
      <div class="wizard-footer">
        <div class="wizard-nav">
          <button class="btn-back" onclick="_wzBack()">‹ 이전</button>
          <button class="btn btn-primary" style="flex:1" onclick="_wzNext()">다음 →</button>
        </div>
      </div>
    </div>`;
}

// ── Step 5: 소득 수준 ─────────────────────────────────────────────────
function _wzStep5_income() {
  const levels = [
    { pct: 50,  label: '50% 이하', desc: '기초생활수급자·차상위',  color: '#FF5252' },
    { pct: 75,  label: '75% 이하', desc: '차상위계층',             color: '#FF9800' },
    { pct: 100, label: '100% 이하', desc: '저소득 가구',           color: '#FFD600' },
    { pct: 150, label: '150% 이하', desc: '중산층 하단',           color: '#00C896' },
    { pct: 200, label: '200% 이하', desc: '중산층',                color: '#6366F1' },
    { pct: 999, label: '200% 초과', desc: '고소득',                color: '#6B7685' },
  ];
  return `
    <div class="wizard-step active">
      <div class="wizard-step-num">5 / ${WZ_TOTAL}</div>
      <div class="wizard-question">소득 수준을 선택해주세요</div>
      <div class="wizard-sub">기준 중위소득 기준이에요 (2024년 1인 가구 기준 약 222만원)</div>
      <div class="wizard-options" style="margin-bottom:auto">
        ${levels.map(l => `
          <button class="wizard-option ${_wz.data.income_level===l.pct?'selected':''}"
            onclick="_wzSelect('income_level',${l.pct});_wzNext()" style="padding:12px 16px">
            <div style="width:10px;height:10px;border-radius:50%;background:${l.color};flex-shrink:0"></div>
            <div style="flex:1">
              <span style="font-weight:700">중위소득 ${l.label}</span>
              <span style="font-size:.78rem;color:var(--text-muted);margin-left:8px">${l.desc}</span>
            </div>
          </button>`).join('')}
      </div>
      <div class="wizard-footer">
        <div class="wizard-nav">
          <button class="btn-back" onclick="_wzBack()">‹ 이전</button>
          <button class="btn btn-primary" style="flex:1" onclick="_wzNext()">다음 →</button>
        </div>
      </div>
    </div>`;
}

// ── Step 6: 거주 형태 ─────────────────────────────────────────────────
function _wzStep6_housing() {
  const opts = [
    { val: 'own',          icon: '🏠', label: '자가',     desc: '본인 소유 주택' },
    { val: 'jeonse',       icon: '🔑', label: '전세',     desc: '전세 계약' },
    { val: 'monthly_rent', icon: '📋', label: '월세',     desc: '월세 계약' },
    { val: 'public',       icon: '🏢', label: '공공임대', desc: '공공임대주택' },
    { val: 'other',        icon: '❓', label: '기타',     desc: '무상·기타' },
  ];
  return `
    <div class="wizard-step active">
      <div class="wizard-step-num">6 / ${WZ_TOTAL}</div>
      <div class="wizard-question">거주 형태가 어떻게 되세요?</div>
      <div class="wizard-sub">주거 혜택(주거급여 등) 수급 자격에 영향을 줘요</div>
      <div class="wizard-grid" style="margin-bottom:auto">
        ${opts.map(o => `
          <button class="wizard-option ${_wz.data.housing_type===o.val?'selected':''}"
            onclick="_wzSelect('housing_type','${o.val}');_wzNext()">
            <span style="font-size:1.6rem">${o.icon}</span>
            <div style="font-weight:700;font-size:.88rem">${o.label}</div>
            <div style="font-size:.72rem;color:var(--text-muted)">${o.desc}</div>
          </button>`).join('')}
      </div>
      <div class="wizard-footer">
        <div class="wizard-nav">
          <button class="btn-back" onclick="_wzBack()">‹ 이전</button>
          <button class="btn btn-primary" style="flex:1" onclick="_wzNext()">다음 →</button>
        </div>
      </div>
    </div>`;
}

// ── Step 7: 추가 해당사항 ──────────────────────────────────────────────
function _wzStep7_extras() {
  const items = [
    { key: 'has_disability',  icon: '♿', label: '장애가 있어요',               desc: '장애인 등록 여부' },
    { key: 'has_pregnancy',   icon: '🤱', label: '임신 중이거나 출산했어요',   desc: '출산지원금 등 해당' },
    { key: 'has_infant',      icon: '👶', label: '영유아(만 6세 이하) 자녀',  desc: '아동수당·보육료 등' },
    { key: 'is_single_parent',icon: '👩‍👦', label: '한부모 가정이에요',        desc: '한부모 가정 지원' },
    { key: 'is_low_income',   icon: '📋', label: '기초생활수급자·차상위계층', desc: '이미 수급 중이에요' },
  ];
  return `
    <div class="wizard-step active">
      <div class="wizard-step-num">7 / ${WZ_TOTAL}</div>
      <div class="wizard-question">해당되는 항목을 모두 선택해주세요</div>
      <div class="wizard-sub">없으면 건너뛰세요 · 복수 선택 가능</div>
      <div class="checkbox-list" style="margin-bottom:auto" id="extras-list">
        ${items.map(it => `
          <div class="checkbox-item ${_wz.data[it.key]?'checked':''}" onclick="_wzToggleExtra('${it.key}', this)">
            <div class="checkbox-box">${_wz.data[it.key] ? '✓' : ''}</div>
            <span style="font-size:1.2rem">${it.icon}</span>
            <div>
              <div style="font-weight:700;font-size:.9rem">${it.label}</div>
              <div style="font-size:.75rem;color:var(--text-muted)">${it.desc}</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="wizard-footer">
        <div class="wizard-nav">
          <button class="btn-back" onclick="_wzBack()">‹ 이전</button>
          <button class="btn btn-primary" style="flex:1" onclick="_wzNext()">다음 →</button>
        </div>
      </div>
    </div>`;
}
function _wzToggleExtra(key, el) {
  _wz.data[key] = !_wz.data[key];
  el.classList.toggle('checked', _wz.data[key]);
  const box = el.querySelector('.checkbox-box');
  if (box) box.textContent = _wz.data[key] ? '✓' : '';
}

// ── Step 8: 완료 + 저장 ───────────────────────────────────────────────
function _wzStep8_done() {
  // 비동기 저장 시작
  _wzSaveToSupabase();
  return `
    <div class="wizard-step active" style="align-items:center;text-align:center;padding-top:48px">
      <div style="font-size:4rem;margin-bottom:20px">🎉</div>
      <div style="font-size:1.4rem;font-weight:900;margin-bottom:12px">정보 입력 완료!</div>
      <div style="font-size:.88rem;color:var(--text-muted);line-height:1.7;margin-bottom:auto">
        AI가 맞춤 혜택 전략을 분석하고 있어요<br>잠시 후 결과를 확인해보세요 🤖
      </div>
      <div class="wizard-footer" style="width:100%">
        <button class="btn btn-primary btn-full btn-lg" id="done-btn" onclick="navigateTo('dashboard')">
          결과 확인하기 →
        </button>
      </div>
    </div>`;
}

async function _wzSaveToSupabase() {
  const { error } = await saveProfile({ ..._wz.data, onboarding_done: true });
  if (error) { toast('저장 중 오류가 발생했어요', 'error'); return; }
  MY_PROFILE = { ...MY_PROFILE, ..._wz.data, onboarding_done: true };
  updateHeaderAvatar();
  // 전략 분석도 미리 트리거
  _strategyAutoLoad();
}

// ── 공통 선택 헬퍼 ────────────────────────────────────────────────────
function _wzSelect(key, val) {
  _wz.data[key] = val;
}
