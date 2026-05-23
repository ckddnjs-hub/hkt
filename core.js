'use strict';

// ── 앱 상태 ─────────────────────────────────────────────────────────
const APP = {
  currentPage: 'home',
  profile: null,
  settings: { nvidiaKey: '', claudeKey: '', kosisKey: '', theme: 'dark', notifications: false },
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

  // 저장된 데이터 로드 (로컬)
  loadPersistedData();

  // 테마 적용
  applyTheme(APP.settings.theme);

  // body 표시 (UI 먼저 렌더)
  document.body.classList.add('ready');

  // 온보딩 여부 확인
  if (!APP.isOnboarded || !APP.profile) {
    showOnboarding();
  } else {
    showApp();
  }

  hideLoading();

  // Supabase 비동기 초기화 (UI 블로킹 없음)
  dbInit().then(connected => {
    if (connected) {
      console.log('[App] Supabase 연결 완료');
      // 원격 프로필 로드 후 UI 업데이트
      renderSidebarUser();
      updateWelfareMiniScore();
    }
  });
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
  const appEl = document.getElementById('app');
  appEl.classList.add('show');
  initRouter();
  renderSidebarUser();
  updateWelfareMiniScore();
  // 초기 페이지 렌더
  onPageEnter(APP.currentPage || 'home');
}

// ── 페이지 타이틀 맵 ─────────────────────────────────────────────────
const PAGE_TITLES = {
  home: '대시보드', profile: '내 정보', benefits: '맞춤 혜택',
  news: '복지 뉴스', lifecycle: '생애 계획', apply: '신청 가이드',
  settings: '설정', chat: 'AI 복지 상담', voice: '복지 라디오',
};

// ── 라우터 ──────────────────────────────────────────────────────────
function initRouter() {
  const params = new URLSearchParams(location.search);
  const page = params.get('page') || 'home';
  APP.currentPage = page;

  // 뒤로가기
  window.addEventListener('popstate', e => {
    navigateTo(e.state?.page || 'home', false, true);
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

function navigateTo(page, pushState = true, isBack = false) {
  if (!APP.isOnboarded && page !== 'home') {
    toast('먼저 시작하기를 완료해주세요.', 'warn');
    return;
  }

  const prevPage = APP.currentPage;
  APP.currentPage = page;

  // 페이지 순서로 슬라이드 방향 결정
  const pageOrder = ['home', 'profile', 'benefits', 'chat', 'voice', 'news', 'lifecycle', 'apply', 'settings'];
  const prevIdx = pageOrder.indexOf(prevPage);
  const nextIdx = pageOrder.indexOf(page);
  const goingBack = isBack || (prevIdx > nextIdx);

  // 현재 활성 페이지에 애니메이션 클래스 적용
  const prevEl = document.getElementById(`page-${prevPage}`);
  const pageEl = document.getElementById(`page-${page}`);

  if (prevEl && prevEl !== pageEl) prevEl.classList.remove('active');
  if (pageEl) {
    if (goingBack) pageEl.classList.add('slide-left');
    else pageEl.classList.remove('slide-left');
    pageEl.classList.add('active');
    // 애니메이션 클래스 정리
    if (goingBack) {
      requestAnimationFrame(() => {
        setTimeout(() => pageEl.classList.remove('slide-left'), 250);
      });
    }
  }

  // 바텀 네비 활성화 (FAB 제외한 nav 아이템)
  document.querySelectorAll('.bottom-nav-item[data-nav]').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === page);
  });
  // 사이드바 활성화
  document.querySelectorAll('[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // 헤더 타이틀 (데스크탑: 오른쪽 / 모바일: 가운데)
  const headerTitle = document.getElementById('header-title');
  if (headerTitle) headerTitle.textContent = PAGE_TITLES[page] || '';

  // 히스토리
  if (pushState) {
    history.pushState({ page }, '', `?page=${page}`);
  }

  // 스크롤 상단 (앱 바디)
  document.querySelector('.app-body')?.scrollTo(0, 0);

  // 음성 페이지 이탈 시 정지
  if (prevPage === 'voice' && page !== 'voice') {
    if (typeof onVoicePageLeave === 'function') onVoicePageLeave();
  }

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
    case 'chat': renderChatPage(); break;
    case 'voice': renderVoicePage(); break;
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
