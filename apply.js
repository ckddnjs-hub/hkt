'use strict';

// ── 신청 가이드 페이지 렌더링 ──────────────────────────────────────────
function renderApplyPage() {
  const page = document.getElementById('page-apply');
  if (!page) return;

  const topBenefits = (APP.matchedBenefits.length ? APP.matchedBenefits : matchBenefits()).slice(0, 3);

  page.innerHTML = `
    <div class="page-title">신청 가이드</div>
    <div class="page-sub">단계별 복지 혜택 신청 방법 안내</div>

    <!-- 빠른 신청 채널 -->
    <div class="section-header">
      <div class="section-title">빠른 신청 채널</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px">
      ${[
        { icon: '🌐', name: '복지로', sub: '온라인 통합 신청', url: 'https://www.bokjiro.go.kr', color: '#3B82F6' },
        { icon: '🏛', name: '정부24', sub: '정부 서비스 통합', url: 'https://www.gov.kr', color: '#6366F1' },
        { icon: '📱', name: '복지로 앱', sub: '모바일 신청', url: 'https://www.bokjiro.go.kr', color: '#8B5CF6' },
        { icon: '🏠', name: '주민센터', sub: '방문 신청', url: '#', color: '#10B981' },
      ].map(ch => `
        <a href="${esc(ch.url)}" target="_blank" rel="noopener" class="apply-link-card">
          <div class="alc-info">
            <div class="alc-icon" style="width:40px;height:40px;background:${ch.color}15;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.3rem">${ch.icon}</div>
            <div>
              <div class="alc-name">${esc(ch.name)}</div>
              <div class="alc-sub">${esc(ch.sub)}</div>
            </div>
          </div>
          <span style="color:var(--text-dim)">→</span>
        </a>`).join('')}
    </div>

    <!-- 신청 단계 가이드 -->
    <div class="section-header">
      <div class="section-title">신청 순서 가이드</div>
    </div>
    ${[
      {
        num: 1,
        title: '자격 확인',
        desc: '소득, 재산, 나이, 가구 요건을 먼저 확인하세요. 복지로 서비스 모의계산 기능을 활용하면 편리합니다.',
        icon: '🔍',
      },
      {
        num: 2,
        title: '서류 준비',
        desc: '주민등록등본, 가족관계증명서, 소득확인서(건강보험료 납부확인서), 통장사본은 거의 모든 신청에 필요합니다.',
        icon: '📄',
      },
      {
        num: 3,
        title: '온라인 또는 방문 신청',
        desc: '복지로(www.bokjiro.go.kr) 또는 가까운 주민센터에 신청하세요. 대부분 온라인으로 처리됩니다.',
        icon: '📝',
      },
      {
        num: 4,
        title: '심사 및 결정',
        desc: '통상 14~60일 이내에 적격 여부가 결정됩니다. 문자 또는 우편으로 통보됩니다.',
        icon: '⏳',
      },
      {
        num: 5,
        title: '수급 시작',
        desc: '승인 후 다음 달부터 혜택이 지급됩니다. 매년 자격 재확인이 필요한 급여가 있습니다.',
        icon: '✅',
      },
    ].map(step => `
      <div class="apply-step">
        <div class="apply-step-num">${step.num}</div>
        <div class="apply-step-content">
          <div class="apply-step-title">${step.icon} ${esc(step.title)}</div>
          <div class="apply-step-desc">${esc(step.desc)}</div>
        </div>
      </div>`).join('')}

    <!-- 공통 서류 목록 -->
    <div class="card mt16">
      <div class="section-title" style="margin-bottom:12px">공통 준비 서류</div>
      <ul class="doc-list">
        ${[
          '주민등록등본 (최근 3개월 이내)',
          '가족관계증명서',
          '건강보험료 납부확인서 (소득 증빙)',
          '금융정보 제공 동의서',
          '통장 사본 (지급받을 계좌)',
          '임대차계약서 (주거 관련 혜택)',
          '장애인증명서 (해당자)',
        ].map(d => `<li>${esc(d)}</li>`).join('')}
      </ul>
    </div>

    <!-- 맞춤 혜택 신청 링크 -->
    ${topBenefits.length ? `
      <div class="section-header mt24">
        <div class="section-title">맞춤 혜택 바로 신청</div>
      </div>
      ${topBenefits.map(b => `
        <div class="apply-link-card" onclick="openBenefitDetail('${b.id}')">
          <div class="alc-info">
            <div class="alc-icon" style="font-size:1.4rem">${BENEFIT_CATEGORIES[b.category]?.icon || '📋'}</div>
            <div>
              <div class="alc-name">${esc(b.name)}</div>
              <div class="alc-sub">${esc(b.amount)} · ${esc(b.agency)}</div>
            </div>
          </div>
          <span class="badge" style="background:rgba(16,185,129,.12);color:var(--success)">${difficultyBadge(b.difficulty)}</span>
        </div>`).join('')}` : ''}

    <!-- 상담 안내 -->
    <div class="card card-blue mt24" style="text-align:center">
      <div style="font-size:.78rem;font-weight:700;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">복지 상담 전화</div>
      <div style="font-size:1.4rem;font-weight:900;color:var(--primary);margin-bottom:4px">129</div>
      <div style="font-size:.83rem;color:var(--text-muted)">보건복지상담센터 (연중무휴 24시간)</div>
      <div class="divider"></div>
      <div style="font-size:.82rem;color:var(--text-muted)">
        고용 상담: <strong>1350</strong> · 주거 상담: <strong>1600-0777</strong>
      </div>
    </div>
  `;
}

// ── 홈 페이지 렌더링 ──────────────────────────────────────────────────
function renderHomePage() {
  const page = document.getElementById('page-home');
  if (!page) return;
  const p = APP.profile;

  page.innerHTML = `
    <!-- 서비스 소개 -->
    <div style="padding:20px 0 12px;text-align:center">
      <div style="font-size:1.5rem;font-weight:900;letter-spacing:-.03em;margin-bottom:6px">복지에코</div>
      <div style="font-size:.85rem;color:var(--text-muted);line-height:1.7">
        나의 상황을 입력하면<br>받을 수 있는 복지를 찾아드립니다
      </div>
    </div>

    <!-- 메인 검색창 -->
    <div class="card" style="margin-bottom:16px">
      <div style="font-size:.82rem;font-weight:700;margin-bottom:10px">어떤 도움이 필요하신가요?</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <input
          id="home-search-input"
          class="form-input"
          style="flex:1"
          placeholder="예: 실직했어요 / 임신 중이에요 / 혼자 사는 어르신"
          onkeydown="if(event.key==='Enter')homeSearch()"
        >
        <button class="btn btn-primary" style="white-space:nowrap" onclick="homeSearch()">검색</button>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${['실직했어요','임신 중이에요','65세 이상','장애인 지원','저소득 가구','한부모 가정'].map(ex => `
          <button onclick="homeSearchWith('${ex}')"
            style="font-size:.72rem;padding:4px 10px;border-radius:20px;border:1px solid var(--border);background:var(--bg2);color:var(--text-muted);cursor:pointer;font-family:inherit">
            ${ex}
          </button>`).join('')}
      </div>
    </div>

    <!-- 프로필 상태 -->
    <div class="card" style="display:flex;align-items:center;gap:14px;padding:14px 16px;cursor:pointer" onclick="navigateTo('profile')">
      <div style="width:40px;height:40px;border-radius:12px;background:${p ? 'rgba(59,130,246,.12)' : 'var(--bg3)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${p ? 'var(--primary)' : 'var(--text-dim)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div style="flex:1;min-width:0">
        ${p ? `
          <div style="font-size:.88rem;font-weight:700">${esc(p.name || '내 정보')}</div>
          <div style="font-size:.76rem;color:var(--text-muted)">${[p.age && p.age+'세', p.region].filter(Boolean).join(' · ') || '정보 입력됨'}</div>
        ` : `
          <div style="font-size:.88rem;font-weight:700;color:var(--text-muted)">내 정보 입력</div>
          <div style="font-size:.76rem;color:var(--text-dim)">나이·지역 입력 시 더 정확한 결과</div>
        `}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-dim);flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  `;
}
}

// ── 홈 검색 진입 ─────────────────────────────────────────────────
function homeSearch() {
  const query = document.getElementById('home-search-input')?.value.trim();
  if (!query) { toast('검색어를 입력해주세요', 'warn'); return; }
  homeSearchWith(query);
}

function homeSearchWith(query) {
  // 혜택 페이지로 이동 후 AI 검색 실행
  navigateTo('benefits');
  setTimeout(() => {
    const input = document.getElementById('benefits-search-input');
    if (input) input.value = query;
    if (typeof searchBenefitsWithAI === 'function') searchBenefitsWithAI(query);
  }, 150);
}

// ── 복지 고지 빠른 방송 생성 (홈 전달자 모드) ─────────────────────
function quickWelfareBroadcast(type) {
  const region = APP.profile?.region || '우리 동네';
  const templates = BROADCAST_TEMPLATES.welfare || [];
  const map = { pension: 'n_pension', rent: 'n_rent', energy: 'n_energy', urgent: 'n_urgent' };
  const tpl = templates.find(t => t.id === map[type]);
  if (!tpl) return;

  if (typeof VoiceBroadcast !== 'undefined') {
    VoiceBroadcast.category = 'welfare';
    VoiceBroadcast.convertedText = tpl.official;
  }

  toast(`📣 "${tpl.label}" 방송문이 준비됐습니다. 방송·안내 탭에서 확인하세요!`, 'success', 4000);
  setTimeout(() => {
    navigateTo('voice');
    setTimeout(() => {
      if (typeof switchVoiceTab === 'function') switchVoiceTab('broadcast');
      if (typeof showBroadcastResult === 'function') showBroadcastResult(tpl.official);
    }, 300);
  }, 800);
}

// ── 설정 페이지 렌더링 ──────────────────────────────────────────────
function renderSettingsPage() {
  const page = document.getElementById('page-settings');
  if (!page) return;

  const s = APP.settings;

  page.innerHTML = `
    <div class="page-title">설정</div>
    <div class="page-sub">앱 환경 및 API 설정</div>

    <!-- AI API 설정 -->
    <div style="font-size:.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px">AI API 설정</div>
    <div class="card mb16">
      <div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--bg3);border-radius:10px;margin-bottom:10px">
        <span style="font-size:1.3rem">✅</span>
        <div>
          <div style="font-size:.85rem;font-weight:700">GPT AI 서버 연결됨</div>
          <div style="font-size:.76rem;color:var(--text-muted)">gpt_key · WELFARE_API_KEY — Vercel 환경변수로 안전하게 관리</div>
        </div>
      </div>
      <div class="api-key-section" style="background:var(--bg3)">
        <div class="api-key-label">KOSIS API Key <span style="font-size:.7rem;color:var(--text-dim);font-weight:400">(지역 통계 실시간 연동)</span></div>
        <div class="api-key-input-wrap">
          <input class="api-key-input" id="kosis-key" type="password" placeholder="kosis.kr에서 발급" value="${esc(s.kosisKey || '')}">
          <button class="api-key-toggle" onclick="toggleKeyVisibility('kosis-key',this)">👁</button>
        </div>
        <div class="form-hint">kosis.kr → OpenAPI 신청 → 인증키 발급</div>
      </div>
      <button class="btn btn-primary btn-full mt12" onclick="saveApiKeys()">저장</button>
    </div>

    <!-- 일반 설정 -->
    <div style="font-size:.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px">일반</div>
    <div class="settings-group mb16">
      <div class="settings-item" onclick="toggleTheme()">
        <div class="settings-item-left">
          <div class="settings-icon">${s.theme === 'dark' ? '🌙' : '☀️'}</div>
          <div>
            <div class="settings-label">다크 모드</div>
            <div class="settings-sub">${s.theme === 'dark' ? '켜짐' : '꺼짐'}</div>
          </div>
        </div>
        <div class="toggle-switch ${s.theme === 'dark' ? 'on' : ''}"></div>
      </div>
      <div class="settings-item" onclick="requestNotifications()">
        <div class="settings-item-left">
          <div class="settings-icon">🔔</div>
          <div>
            <div class="settings-label">복지 알림</div>
            <div class="settings-sub">새 혜택 및 마감 알림</div>
          </div>
        </div>
        <div class="toggle-switch ${s.notifications ? 'on' : ''}"></div>
      </div>
    </div>

    <!-- 데이터 -->
    <div style="font-size:.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px">데이터</div>
    <div class="settings-group mb16">
      <div class="settings-item" onclick="exportData()">
        <div class="settings-item-left">
          <div class="settings-icon">📤</div>
          <div><div class="settings-label">내보내기</div><div class="settings-sub">프로필 및 혜택 JSON 저장</div></div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-dim)"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
      <div class="settings-item" onclick="dbSeedBenefits()">
        <div class="settings-item-left">
          <div class="settings-icon">📥</div>
          <div><div class="settings-label">혜택 DB 시드</div><div class="settings-sub">데이터를 Supabase에 업로드</div></div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-dim)"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
      <div class="settings-item" onclick="showDbStats()">
        <div class="settings-item-left">
          <div class="settings-icon">📊</div>
          <div>
            <div class="settings-label">DB 통계</div>
            <div class="settings-sub" id="db-status">확인 중...</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();dbPing().then(()=>toast('연결 확인','success'))">ping</button>
      </div>
      <div class="settings-item" onclick="confirmClearData()">
        <div class="settings-item-left">
          <div class="settings-icon">🗑</div>
          <div><div class="settings-label" style="color:var(--danger)">데이터 초기화</div><div class="settings-sub">모든 설정 및 프로필 삭제</div></div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-dim)"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>

    <!-- 뉴스 등록 -->
    <div style="font-size:.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px">관리자 · 뉴스 등록</div>
    <div class="card mb16">
      <div class="form-group"><input class="form-input" id="admin-news-title" placeholder="뉴스 제목"></div>
      <div class="form-group"><input class="form-input" id="admin-news-summary" placeholder="요약"></div>
      <div class="form-row">
        <select class="form-select" id="admin-news-category">
          <option value="">카테고리 선택</option>
          ${Object.entries(BENEFIT_CATEGORIES).map(([id, c]) =>
            `<option value="${id}">${c.label}</option>`).join('')}
        </select>
        <label class="checkbox-item" id="admin-news-urgent-wrap">
          <input type="checkbox" id="admin-news-urgent">
          <div class="checkbox-check">✓</div>
          <span>긴급</span>
        </label>
      </div>
      <input class="form-input mt8" id="admin-news-url" placeholder="원문 URL (선택)">
      <button class="btn btn-primary btn-full mt12" onclick="submitAdminNews()">뉴스 등록</button>
    </div>

    <!-- 앱 정보 -->
    <div class="card" style="text-align:center;padding:20px">
      <div style="font-size:.88rem;font-weight:700;margin-bottom:4px">복지ON v1.0.0</div>
      <div style="font-size:.78rem;color:var(--text-muted)">규칙 매칭 + GPT 생성 복지 도달 플랫폼</div>
      <div style="font-size:.72rem;color:var(--text-dim);margin-top:12px;line-height:1.6">본 서비스는 참고용이며, 실제 수급 여부는<br>관할 기관에 확인하시기 바랍니다.</div>
    </div>
  `;

  // 설정 페이지 렌더 후 DB 상태 바로 표시
  setTimeout(() => updateDbStatusUI(SB.connected), 100);
}

// ── 설정 기능들 ─────────────────────────────────────────────────────
function toggleKeyVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.textContent = isPassword ? '🔒' : '👁';
}

function saveApiKeys() {
  const kosisKey = document.getElementById('kosis-key')?.value.trim() || '';
  saveSettings({ kosisKey });
  toast('설정이 저장되었습니다', 'success');
}

function exportData() {
  const data = {
    profile: APP.profile,
    settings: { ...APP.settings, kosisKey: '***' },
    matchedBenefits: APP.matchedBenefits,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bokjion_data_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('데이터가 내보내졌습니다', 'success');
}

function confirmClearData() {
  if (confirm('모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
    Object.values(LS).forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('bokjion_session_id');
    localStorage.removeItem('bokjion_db_seeded');
    location.reload();
  }
}

// ── DB 통계 표시 ─────────────────────────────────────────────────────
async function showDbStats() {
  if (!SB.connected) {
    toast('Supabase에 연결되어 있지 않습니다', 'warn');
    return;
  }
  toast('통계 조회 중...', 'info', 1500);
  const stats = await dbFetchStats();
  const popular = await dbFetchPopularBenefits(3);
  const popularText = popular.length
    ? popular.map((s, i) => `${i + 1}. ${s.benefit_id} (${s.view_count}회)`).join('\n')
    : '데이터 없음';

  alert(`📊 복지ON DB 통계\n\n👥 세션(사용자): ${stats.users}명\n🎁 활성 혜택: ${stats.benefits}개\n📰 뉴스: ${stats.news}개\n\n🔥 인기 혜택:\n${popularText}`);
}

// ── 관리자 뉴스 등록 제출 ─────────────────────────────────────────────
async function submitAdminNews() {
  const title   = document.getElementById('admin-news-title')?.value.trim();
  const summary = document.getElementById('admin-news-summary')?.value.trim();
  const category = document.getElementById('admin-news-category')?.value;
  const urgent  = document.getElementById('admin-news-urgent')?.checked;
  const url     = document.getElementById('admin-news-url')?.value.trim();

  if (!title || !summary) {
    toast('제목과 요약은 필수입니다', 'warn');
    return;
  }
  if (!SB.connected) {
    toast('DB 연결이 필요합니다', 'warn');
    return;
  }

  const result = await dbAddNews({ title, summary, category, urgent, url });
  if (result) {
    // 입력 초기화
    ['admin-news-title', 'admin-news-summary', 'admin-news-url'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('admin-news-category').value = '';
    // 라이브 뉴스 캐시 초기화 → 다음 뉴스 페이지 방문 시 재로드
    window._liveNews = null;
  }
}
