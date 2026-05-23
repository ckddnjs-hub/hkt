'use strict';

// ── 앱 상태 ─────────────────────────────────────────────────────────
const APP = {
  currentPage: 'home',
  profile: null,
  settings: { nvidiaKey: '', claudeKey: '', theme: 'dark', notifications: false },
  matchedBenefits: [],
  isOnboarded: false,
};

// ── 로컬스토리지 키 ──────────────────────────────────────────────────
const LS = {
  PROFILE: 'bokjion_profile',
  SETTINGS: 'bokjion_settings',
  BENEFITS: 'bokjion_benefits',
  ONBOARDED: 'bokjion_onboarded',
};

// ── 초기화 ──────────────────────────────────────────────────────────
async function bootApp() {
  // PWA 등록
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (e) {
      console.warn('SW 등록 실패:', e);
    }
  }

  // 저장된 데이터 로드
  loadPersistedData();

  // 테마 적용
  applyTheme(APP.settings.theme);

  // 라우팅 초기화
  initRouter();

  // 온보딩 여부 확인
  if (!APP.isOnboarded || !APP.profile) {
    showOnboarding();
  } else {
    showApp();
  }

  // body 표시
  document.body.classList.add('ready');
  hideLoading();
}

// ── 데이터 로드 ──────────────────────────────────────────────────────
function loadPersistedData() {
  try {
    const p = localStorage.getItem(LS.PROFILE);
    if (p) APP.profile = JSON.parse(p);

    const s = localStorage.getItem(LS.SETTINGS);
    if (s) Object.assign(APP.settings, JSON.parse(s));

    const b = localStorage.getItem(LS.BENEFITS);
    if (b) APP.matchedBenefits = JSON.parse(b);

    APP.isOnboarded = localStorage.getItem(LS.ONBOARDED) === 'true';
  } catch (e) {
    console.warn('데이터 로드 실패:', e);
  }
}

// ── 데이터 저장 ──────────────────────────────────────────────────────
function saveProfile(profile) {
  APP.profile = profile;
  localStorage.setItem(LS.PROFILE, JSON.stringify(profile));
}

function saveSettings(settings) {
  Object.assign(APP.settings, settings);
  localStorage.setItem(LS.SETTINGS, JSON.stringify(APP.settings));
}

function saveBenefits(benefits) {
  APP.matchedBenefits = benefits;
  localStorage.setItem(LS.BENEFITS, JSON.stringify(benefits));
}

function setOnboarded() {
  APP.isOnboarded = true;
  localStorage.setItem(LS.ONBOARDED, 'true');
}

// ── 온보딩 ──────────────────────────────────────────────────────────
function showOnboarding() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('onboarding-page').classList.add('show');
}

function startApp() {
  setOnboarded();
  document.getElementById('onboarding-page').classList.remove('show');
  showApp();
  navigateTo('profile');
  toast('프로필을 먼저 입력해주세요! 맞춤 혜택을 찾아드릴게요.', 'info', 4000);
}

// ── 앱 표시 ─────────────────────────────────────────────────────────
function showApp() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('app').classList.add('show');
  renderSidebarUser();
  updateWelfareMiniScore();
}

// ── 라우터 ──────────────────────────────────────────────────────────
function initRouter() {
  const params = new URLSearchParams(location.search);
  const page = params.get('page') || 'home';
  APP.currentPage = page;

  // 뒤로가기
  window.addEventListener('popstate', (e) => {
    navigateTo(e.state?.page || 'home', false);
  });

  // 바텀 네비 클릭
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.nav));
  });

  // 사이드바 네비 클릭
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.page));
  });
}

function navigateTo(page, pushState = true) {
  if (!APP.isOnboarded && page !== 'home') {
    toast('먼저 시작하기를 완료해주세요.', 'warn');
    return;
  }

  APP.currentPage = page;

  // 모든 페이지 숨기기
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // 현재 페이지 표시
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  // 네비 활성화 업데이트
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === page);
  });
  document.querySelectorAll('[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // 페이지 타이틀 업데이트
  const titles = {
    home: '대시보드', profile: '내 정보', benefits: '맞춤 혜택',
    news: '복지 뉴스', lifecycle: '생애 계획', apply: '신청 가이드', settings: '설정'
  };
  const headerTitle = document.getElementById('main-header-title');
  if (headerTitle) headerTitle.textContent = titles[page] || page;

  // 모바일 헤더 타이틀
  const mobileTitle = document.getElementById('mobile-header-title');
  if (mobileTitle) mobileTitle.textContent = titles[page] || page;

  // 히스토리
  if (pushState) {
    history.pushState({ page }, '', `?page=${page}`);
  }

  // 스크롤 상단
  document.querySelector('.main-content')?.scrollTo(0, 0);

  // 페이지별 초기화
  onPageEnter(page);
}

function onPageEnter(page) {
  switch (page) {
    case 'home': renderHomePage(); break;
    case 'benefits': renderBenefitsPage(); break;
    case 'news': renderNewsPage(); break;
    case 'lifecycle': renderLifecyclePage(); break;
    case 'apply': renderApplyPage(); break;
    case 'profile': renderProfilePage(); break;
    case 'settings': renderSettingsPage(); break;
  }
}

// ── 사이드바 사용자 표시 ─────────────────────────────────────────────
function renderSidebarUser() {
  const el = document.getElementById('sidebar-user');
  if (!el) return;
  if (APP.profile) {
    el.innerHTML = `
      ${uiAvatar(APP.profile.name || '사용자', 36)}
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">${esc(APP.profile.name || '사용자')}</div>
        <div class="sidebar-user-sub">${esc(APP.profile.region || '')} · ${APP.profile.age || ''}세</div>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="avatar" style="width:36px;height:36px;background:var(--bg3);font-size:1rem">👤</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">프로필 미설정</div>
        <div class="sidebar-user-sub">클릭하여 설정</div>
      </div>`;
  }
  el.onclick = () => navigateTo('profile');
}

// ── 복지 점수 계산 ────────────────────────────────────────────────────
function calcWelfareScore() {
  if (!APP.profile) return 0;
  let score = 0;
  const p = APP.profile;

  // 소득 기반 (낮을수록 높은 점수)
  const income = parseInt(p.incomePercent || 100);
  if (income <= 30) score += 35;
  else if (income <= 50) score += 25;
  else if (income <= 70) score += 15;
  else score += 5;

  // 가구 특성
  if (p.householdType === 'single-parent') score += 15;
  if (p.hasChildren) score += 10;
  if (p.elderly) score += 10;
  if (p.disability) score += 15;
  if (p.pregnant) score += 12;

  // 주거
  if (p.housing === 'rent' || p.housing === 'jeonse') score += 8;

  // 취업 상태
  if (p.employment === 'unemployed') score += 10;

  return Math.min(100, score);
}

// ── 미니 복지 점수 업데이트 ──────────────────────────────────────────
function updateWelfareMiniScore() {
  const score = calcWelfareScore();
  const el = document.getElementById('wsm-score');
  if (el) el.textContent = `${score}점`;

  const sub = document.getElementById('wsm-sub');
  if (sub) {
    const count = APP.matchedBenefits.length || matchBenefits().length;
    sub.textContent = `예상 혜택 ${count}개`;
  }
}

// ── 혜택 로컬 매칭 ────────────────────────────────────────────────────
function matchBenefits() {
  if (!APP.profile) return [];
  const p = APP.profile;
  const age = parseInt(p.age || 30);
  const income = parseInt(p.incomePercent || 100);

  return WELFARE_DB.filter(b => {
    // 나이 조건
    if (b.ageRange && (age < b.ageRange[0] || age > b.ageRange[1])) return false;

    // 소득 조건
    if (b.conditions?.maxIncome && income > b.conditions.maxIncome) return false;

    // 장애 조건
    if (b.conditions?.disability === true && !p.disability) return false;

    // 임신 조건
    if (b.conditions?.pregnant === true && !p.pregnant) return false;

    // 주거 조건
    if (b.conditions?.housing) {
      if (!b.conditions.housing.includes(p.housing)) return false;
    }

    // 고용 조건
    if (b.conditions?.employment && b.conditions.employment !== p.employment) return false;

    // 자녀 조건
    if (b.conditions?.hasChildren === true && !p.hasChildren) return false;

    return true;
  }).map(b => ({
    ...b,
    matchScore: calcMatchScore(b, p),
  })).sort((a, b) => b.matchScore - a.matchScore);
}

function calcMatchScore(benefit, profile) {
  let score = 70; // 기본 점수
  const income = parseInt(profile.incomePercent || 100);
  const age = parseInt(profile.age || 30);

  // 소득이 낮을수록 기초 혜택 매칭도 높음
  if (benefit.conditions?.maxIncome) {
    const margin = benefit.conditions.maxIncome - income;
    score += Math.min(20, margin / 2);
  }

  // 나이가 정확히 맞을수록
  if (benefit.ageRange) {
    const mid = (benefit.ageRange[0] + benefit.ageRange[1]) / 2;
    score += Math.max(0, 10 - Math.abs(age - mid) / 5);
  }

  // 특수 상황 완전 일치
  if (benefit.conditions?.disability && profile.disability) score += 15;
  if (benefit.conditions?.pregnant && profile.pregnant) score += 15;
  if (benefit.conditions?.hasChildren && profile.hasChildren) score += 10;

  return Math.min(100, Math.round(score));
}

// ── 테마 적용 ─────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  APP.settings.theme = theme;
}

function toggleTheme() {
  const next = APP.settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  saveSettings({ theme: next });
  toast(`${next === 'dark' ? '다크' : '라이트'} 모드로 전환됨`, 'success');
}

// ── 알림 권한 ─────────────────────────────────────────────────────────
async function requestNotifications() {
  if (!('Notification' in window)) {
    toast('이 브라우저는 알림을 지원하지 않습니다', 'warn');
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    APP.settings.notifications = true;
    saveSettings({ notifications: true });
    toast('복지 혜택 알림이 활성화되었습니다!', 'success');
  } else {
    toast('알림 권한이 거부되었습니다', 'warn');
  }
}

// ── DOM 준비 시 실행 ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', bootApp);
