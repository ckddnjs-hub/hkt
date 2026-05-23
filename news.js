'use strict';

let newsFilter = 'all';

// ── 뉴스 페이지 렌더링 ───────────────────────────────────────────────
function renderNewsPage() {
  const page = document.getElementById('page-news');
  if (!page) return;

  const profileCategories = getProfileCategories();
  const filteredNews = getPersonalizedNews(profileCategories);

  page.innerHTML = `
    <div class="page-title">복지 뉴스</div>
    <div class="page-sub">
      ${APP.profile
        ? `${esc(APP.profile.name || '내')} 프로필 맞춤 복지 소식`
        : '최신 복지 정책 및 혜택 뉴스'}
    </div>

    <!-- 개인화 알림 -->
    ${APP.profile && profileCategories.length ? `
      <div class="card card-blue mb16">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:1.4rem">🎯</span>
          <div>
            <div style="font-size:.88rem;font-weight:700">맞춤 뉴스 활성화</div>
            <div style="font-size:.78rem;color:var(--text-muted)">${profileCategories.map(c => BENEFIT_CATEGORIES[c]?.label || c).join(', ')} 관련 뉴스를 우선 표시합니다</div>
          </div>
        </div>
      </div>` : ''}

    <!-- 필터 -->
    <div class="news-filter-bar">
      <button class="toggle-btn ${newsFilter === 'all' ? 'active' : ''}" onclick="filterNews('all',this)">전체</button>
      <button class="toggle-btn ${newsFilter === 'urgent' ? 'active' : ''}" onclick="filterNews('urgent',this)">🔴 긴급</button>
      ${Object.entries(BENEFIT_CATEGORIES).map(([id, cat]) => {
        const count = SAMPLE_NEWS.filter(n => n.category === id).length;
        if (!count) return '';
        const isPersonal = profileCategories.includes(id);
        return `<button class="toggle-btn ${newsFilter === id ? 'active' : ''}" onclick="filterNews('${id}',this)">${isPersonal ? '⭐ ' : ''}${cat.label}</button>`;
      }).join('')}
    </div>

    <!-- 뉴스 목록 -->
    <div id="news-list">
      ${renderNewsList(filteredNews)}
    </div>
  `;
}

function renderNewsList(newsList) {
  if (!newsList.length) return uiEmpty('📰', '뉴스가 없습니다', '다른 카테고리를 선택해보세요');

  return newsList.map(n => {
    const cat = BENEFIT_CATEGORIES[n.category] || { icon: '📋', color: '#64748B', label: n.category };
    return `
      <div class="news-card" onclick="openNewsDetail('${n.id}')">
        <div class="${n.urgent ? 'news-urgent-dot' : 'news-normal-dot'}"></div>
        <div class="news-body">
          ${n.urgent ? '<span class="badge" style="background:rgba(239,68,68,.12);color:var(--danger);margin-bottom:6px">긴급</span>' : ''}
          <div class="news-title">${esc(n.title)}</div>
          <div class="news-summary">${esc(n.summary)}</div>
          <div class="news-meta">
            <span>${cat.icon} ${cat.label}</span>
            <span>·</span>
            <span>${esc(n.source)}</span>
            <span>·</span>
            <span>${relDate(n.date)}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── 뉴스 필터 ────────────────────────────────────────────────────────
function filterNews(filter, btn) {
  newsFilter = filter;
  document.querySelectorAll('.news-filter-bar .toggle-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  let filtered;
  if (filter === 'all') {
    filtered = SAMPLE_NEWS;
  } else if (filter === 'urgent') {
    filtered = SAMPLE_NEWS.filter(n => n.urgent);
  } else {
    filtered = SAMPLE_NEWS.filter(n => n.category === filter);
  }

  const listEl = document.getElementById('news-list');
  if (listEl) listEl.innerHTML = renderNewsList(filtered);
}

// ── 프로필 기반 카테고리 추출 ────────────────────────────────────────
function getProfileCategories() {
  if (!APP.profile) return [];
  const p = APP.profile;
  const cats = [];
  const age = parseInt(p.age || 0);

  if (parseInt(p.incomePercent || 100) <= 50) cats.push('income');
  if (p.housing === 'rent' || p.housing === 'jeonse') cats.push('housing');
  if (p.disability) cats.push('disability');
  if (p.hasChildren) { cats.push('family'); cats.push('education'); }
  if (p.pregnant) cats.push('family', 'health');
  if (age >= 65 || p.elderly) cats.push('elderly');
  if (p.employment === 'unemployed') cats.push('employment');
  if (age < 35) cats.push('youth');

  return [...new Set(cats)];
}

// ── 개인화 뉴스 정렬 ────────────────────────────────────────────────
function getPersonalizedNews(profileCategories) {
  if (!profileCategories.length) return SAMPLE_NEWS;

  return [...SAMPLE_NEWS].sort((a, b) => {
    const aMatch = profileCategories.includes(a.category) ? 1 : 0;
    const bMatch = profileCategories.includes(b.category) ? 1 : 0;
    if (bMatch !== aMatch) return bMatch - aMatch;
    if (b.urgent !== a.urgent) return b.urgent ? 1 : -1;
    return new Date(b.date) - new Date(a.date);
  });
}

// ── 뉴스 상세 모달 ───────────────────────────────────────────────────
function openNewsDetail(newsId) {
  const news = SAMPLE_NEWS.find(n => n.id === newsId);
  if (!news) return;

  const cat = BENEFIT_CATEGORIES[news.category] || { icon: '📋', color: '#64748B', label: news.category };
  const modal = document.getElementById('news-detail-modal');
  const content = document.getElementById('news-detail-content');

  if (!modal || !content) return;

  content.innerHTML = `
    <div style="margin-bottom:12px">
      ${news.urgent ? '<span class="badge" style="background:rgba(239,68,68,.12);color:var(--danger);margin-bottom:8px;display:inline-block">긴급</span>' : ''}
      ${categoryChip(news.category)}
    </div>
    <div style="font-size:1.1rem;font-weight:900;line-height:1.5;margin-bottom:12px">${esc(news.title)}</div>
    <div style="display:flex;gap:10px;font-size:.8rem;color:var(--text-muted);margin-bottom:20px">
      <span>${esc(news.source)}</span>
      <span>·</span>
      <span>${fmtDate(news.date)}</span>
    </div>
    <div style="font-size:.92rem;color:var(--text-muted);line-height:1.8;margin-bottom:24px">
      ${esc(news.summary)}
      <br><br>
      <span style="color:var(--text-dim);font-size:.82rem">※ 자세한 내용은 공식 기관 웹사이트에서 확인하세요.</span>
    </div>
    <div style="display:flex;gap:10px">
      <a href="${esc(news.url)}" target="_blank" rel="noopener" class="btn btn-primary" style="flex:1;text-align:center">
        🔗 공식 사이트 보기
      </a>
      <button class="btn btn-ghost" onclick="closeAllModals()">닫기</button>
    </div>
  `;

  openModal('news-modal-overlay');
}
