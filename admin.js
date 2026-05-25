'use strict';

// ── 관리자 대시보드 상태 ──────────────────────────────────────────────
const Admin = {
  region: null,
  stats: null,
  targets: [],
  isAnalyzing: false,
  kosisLoaded: false,
};

// ── 관리자 페이지 렌더 ────────────────────────────────────────────────
function renderAdminPage() {
  const page = document.getElementById('page-admin');
  if (!page) return;

  Admin.region = APP.profile?.region || '경기';
  const stats = BLIND_SPOT_DATA[Admin.region] || BLIND_SPOT_DATA['경기'];
  Admin.stats = stats;
  Admin.targets = [...PRIORITY_TARGETS_DEMO];

  page.innerHTML = `
    <div class="admin-page">

      <!-- 헤더 -->
      <div class="admin-header card">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <div style="width:44px;height:44px;border-radius:12px;background:rgba(16,185,129,.15);display:flex;align-items:center;justify-content:center;font-size:1.4rem">🏛️</div>
          <div>
            <div style="font-size:1rem;font-weight:900;color:var(--text)">이장님 · 복지사 대시보드</div>
            <div style="font-size:.78rem;color:var(--text-muted)">복지 사각지대 발굴 관리 시스템</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="font-size:.8rem;color:var(--text-muted);white-space:nowrap">분석 지역</div>
          <select id="admin-region-select"
            style="flex:1;padding:8px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:.84rem;font-family:inherit"
            onchange="onAdminRegionChange(this.value)">
            ${REGIONS.map(r => `<option value="${r}" ${r === Admin.region ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
          <button class="btn btn-sm" style="background:rgba(99,102,241,.15);color:var(--accent);border:none;white-space:nowrap" onclick="loadKosisData()">
            📡 KOSIS 갱신
          </button>
        </div>
      </div>

      <!-- 사각지대 요약 카드 3종 -->
      <div class="section-header mt4">
        <div class="section-title">📊 사각지대 현황 — ${esc(Admin.region)}</div>
        <div class="badge" style="background:rgba(239,68,68,.12);color:#EF4444;font-size:.7rem">추정치 · KOSIS 기반</div>
      </div>
      <div class="admin-blind-spot-grid">
        ${renderBlindSpotCard('기초연금', stats.basicPension, '👴', '#6366F1', '65세 이상 소득 하위 70%')}
        ${renderBlindSpotCard('주거급여', stats.housing, '🏠', '#3B82F6', '중위소득 48% 이하 가구')}
        ${renderBlindSpotCard('장애인 혜택', stats.disability, '♿', '#10B981', '중증장애인 등록자')}
      </div>

      <!-- 전체 사각지대 요약 수치 -->
      ${renderTotalBlindSpot(stats)}

      <!-- AI 사각지대 분석 -->
      <div class="card mt8">
        <div class="section-header" style="margin-bottom:10px">
          <div class="section-title">🤖 AI 사각지대 분석</div>
          <button class="btn btn-sm btn-primary" id="btn-analyze" onclick="runBlindSpotAnalysis()">
            분석 시작
          </button>
        </div>
        <div id="admin-ai-result">
          <div style="font-size:.83rem;color:var(--text-muted);line-height:1.6;padding:8px 0">
            AI가 지역 데이터를 분석하여 사각지대 원인과 우선 개입 전략을 제안합니다.<br>
            NVIDIA API 키가 없으면 데모 분석이 제공됩니다.
          </div>
        </div>
      </div>

      <!-- 우선 발굴 대상 -->
      <div class="section-header mt8">
        <div class="section-title">🚨 우선 발굴 대상</div>
        <div style="display:flex;gap:6px">
          <button class="admin-filter-btn active" onclick="filterTargets('all', this)">전체</button>
          <button class="admin-filter-btn" onclick="filterTargets('high', this)">고위험</button>
          <button class="admin-filter-btn" onclick="filterTargets('노인', this)">독거노인</button>
          <button class="admin-filter-btn" onclick="filterTargets('장애', this)">장애인</button>
        </div>
      </div>
      <div id="admin-targets-list">
        ${renderTargetsList(Admin.targets)}
      </div>

      <!-- 이달 마감 혜택 -->
      <div class="section-header mt8">
        <div class="section-title">⏰ 이달 신청 마감 혜택</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px">
        ${DEADLINE_BENEFITS.map(b => renderDeadlineCard(b)).join('')}
      </div>

      <!-- 긴급 방송 원클릭 버튼 -->
      <div class="section-header mt8">
        <div class="section-title">🚨 긴급 방송 빠른 발송</div>
        <div class="badge" style="background:rgba(239,68,68,.12);color:#EF4444;font-size:.7rem">원클릭 발송</div>
      </div>
      <div class="card" style="padding:12px;margin-bottom:8px">
        <div style="font-size:.77rem;color:var(--text-muted);margin-bottom:10px">자주 사용하는 긴급 방송을 한 번에 생성·발송합니다</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="emergency-quick-btn" style="background:rgba(239,68,68,.12);color:#EF4444" onclick="quickEmergencyBroadcast('heatwave')">
            <span style="font-size:1.4rem">🌡️</span>폭염 경보
          </button>
          <button class="emergency-quick-btn" style="background:rgba(99,102,241,.12);color:#6366F1" onclick="quickEmergencyBroadcast('typhoon')">
            <span style="font-size:1.4rem">🌀</span>태풍 대피
          </button>
          <button class="emergency-quick-btn" style="background:rgba(59,130,246,.12);color:#3B82F6" onclick="quickEmergencyBroadcast('coldwave')">
            <span style="font-size:1.4rem">❄️</span>한파 주의
          </button>
          <button class="emergency-quick-btn" style="background:rgba(107,114,128,.12);color:#9CA3AF" onclick="quickEmergencyBroadcast('dust')">
            <span style="font-size:1.4rem">😷</span>미세먼지
          </button>
        </div>
      </div>

      <!-- 방송문 빠른 생성 버튼 -->
      <div class="card" style="background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.2);margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:1.4rem">📣</div>
          <div style="flex:1">
            <div style="font-size:.88rem;font-weight:700">사각지대 발굴 방송문 자동 생성</div>
            <div style="font-size:.77rem;color:var(--text-muted);margin-top:2px">위 데이터 기반으로 이달 방송문을 AI가 작성합니다</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="generateAdminBroadcast()">생성</button>
        </div>
      </div>

      <!-- KOSIS 연동 안내 -->
      <div class="card" style="background:var(--bg2);margin-bottom:16px">
        <div style="font-size:.78rem;font-weight:700;color:var(--text-dim);margin-bottom:8px">📡 KOSIS 공공데이터 연동</div>
        <div style="font-size:.77rem;color:var(--text-muted);line-height:1.7;margin-bottom:10px">
          실시간 인구·수급 통계를 불러오려면 KOSIS API 키를 설정하세요.<br>
          <a href="https://kosis.kr/openapi/" target="_blank" style="color:var(--primary)">kosis.kr/openapi</a>에서 무료 발급 가능합니다.
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="kosis-key-input" type="password"
            placeholder="KOSIS API 키 입력"
            value="${esc(APP.settings.kosisKey || '')}"
            style="flex:1;padding:8px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:.82rem;font-family:inherit"
          />
          <button class="btn btn-sm btn-primary" onclick="saveKosisKey()">저장</button>
        </div>
      </div>

    </div>
  `;
}

// ── 사각지대 카드 렌더 ────────────────────────────────────────────────
function renderBlindSpotCard(name, data, icon, color, desc) {
  const gap = data.eligible - data.recipients;
  const rate = Math.round((data.recipients / data.eligible) * 100);
  const gapRate = 100 - rate;

  return `
    <div class="admin-bs-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:1.1rem">${icon}</span>
          <span style="font-size:.82rem;font-weight:700">${esc(name)}</span>
        </div>
        <div class="badge" style="background:rgba(239,68,68,.12);color:#EF4444;font-size:.68rem">
          미수급 ${gapRate}%
        </div>
      </div>

      <!-- 수급률 바 -->
      <div style="background:var(--bg3);border-radius:4px;height:8px;margin-bottom:8px;overflow:hidden">
        <div style="height:100%;width:${rate}%;background:${color};border-radius:4px;transition:width .6s ease"></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        <div>
          <div style="font-size:.68rem;color:var(--text-dim)">추정 대상자</div>
          <div style="font-size:.88rem;font-weight:700;color:var(--text)">${fmtNum(data.eligible)}명</div>
        </div>
        <div>
          <div style="font-size:.68rem;color:var(--text-dim)">현재 수급자</div>
          <div style="font-size:.88rem;font-weight:700;color:${color}">${fmtNum(data.recipients)}명</div>
        </div>
      </div>

      <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:.7rem;color:var(--text-muted)">${esc(desc)}</div>
        <div style="font-size:.82rem;font-weight:900;color:#EF4444">
          -${fmtNum(gap)}명
        </div>
      </div>
    </div>
  `;
}

// ── 전체 사각지대 합계 ────────────────────────────────────────────────
function renderTotalBlindSpot(stats) {
  const total =
    (stats.basicPension.eligible - stats.basicPension.recipients) +
    (stats.housing.eligible - stats.housing.recipients) +
    (stats.disability.eligible - stats.disability.recipients);

  const avgRate = Math.round(
    ((stats.basicPension.recipients + stats.housing.recipients + stats.disability.recipients) /
     (stats.basicPension.eligible + stats.housing.eligible + stats.disability.eligible)) * 100
  );

  return `
    <div class="card" style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);margin-bottom:4px">
      <div style="display:flex;align-items:center;gap:16px">
        <div style="text-align:center;min-width:72px">
          <div style="font-size:1.5rem;font-weight:900;color:#EF4444">${fmtNum(total)}</div>
          <div style="font-size:.72rem;color:var(--text-muted)">명 사각지대 추정</div>
        </div>
        <div style="flex:1;border-left:1px solid var(--border);padding-left:16px">
          <div style="font-size:.82rem;font-weight:700;margin-bottom:4px">평균 수급 커버율 ${avgRate}%</div>
          <div style="font-size:.77rem;color:var(--text-muted);line-height:1.6">
            ${esc(Admin.region)} 지역에서 복지 혜택을 받을 자격이 있지만<br>아직 신청하지 못한 주민이 <strong style="color:#EF4444">${fmtNum(total)}명</strong>으로 추정됩니다.
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── 우선 발굴 대상 목록 ────────────────────────────────────────────────
function renderTargetsList(targets) {
  if (!targets.length) return `<div class="card" style="text-align:center;color:var(--text-muted);font-size:.84rem;padding:24px">해당 조건의 대상자가 없습니다</div>`;

  return `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${targets.map(t => `
        <div class="admin-target-card ${t.risk}">
          <div style="display:flex;align-items:flex-start;gap:12px">
            <div class="admin-risk-badge ${t.risk}">
              ${t.risk === 'high' ? '🔴' : t.risk === 'medium' ? '🟡' : '🟢'}
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-size:.88rem;font-weight:700">${esc(t.code)}</span>
                <span style="font-size:.75rem;color:var(--text-muted)">${t.age}세 · ${esc(t.type)}</span>
                <span style="font-size:.72rem;color:var(--text-dim);margin-left:auto">${esc(t.neighborhood)}</span>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">
                ${t.missing.map(m => `
                  <span style="font-size:.72rem;padding:2px 8px;border-radius:10px;background:rgba(239,68,68,.1);color:#EF4444;font-weight:600">${esc(m)} 미신청</span>
                `).join('')}
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span style="font-size:.73rem;color:${t.contactDays > 30 ? '#EF4444' : 'var(--text-dim)'}">
                  마지막 접촉 ${t.contactDays}일 전
                </span>
                <button class="btn btn-sm" style="font-size:.72rem;padding:4px 10px;background:rgba(59,130,246,.12);color:var(--primary);border:none"
                  onclick="visitTarget('${t.id}')">
                  방문 예약
                </button>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ── 마감 혜택 카드 ────────────────────────────────────────────────────
function renderDeadlineCard(b) {
  const cat = BENEFIT_CATEGORIES[b.category] || { icon: '📋', color: '#64748B' };
  const urgency = b.dday !== null && b.dday <= 7;
  return `
    <div class="card" style="padding:12px 14px;${urgency ? 'border-left:3px solid #EF4444' : ''}">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.1rem">${cat.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:.87rem;font-weight:700">${esc(b.name)}</div>
          <div style="font-size:.75rem;color:var(--text-muted)">${esc(b.desc)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${b.dday !== null
            ? `<div style="font-size:.82rem;font-weight:900;color:${urgency ? '#EF4444' : 'var(--warn)'}">D-${b.dday}</div>`
            : `<div style="font-size:.75rem;color:var(--text-muted)">상시</div>`
          }
        </div>
      </div>
    </div>
  `;
}

// ── 지역 변경 ─────────────────────────────────────────────────────────
function onAdminRegionChange(region) {
  Admin.region = region;
  Admin.stats = BLIND_SPOT_DATA[region] || BLIND_SPOT_DATA['경기'];
  renderAdminPage();
}

// ── 우선 대상 필터 ────────────────────────────────────────────────────
function filterTargets(filter, btn) {
  document.querySelectorAll('.admin-filter-btn').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');

  let filtered = [...PRIORITY_TARGETS_DEMO];
  if (filter === 'high') filtered = filtered.filter(t => t.risk === 'high');
  else if (filter !== 'all') filtered = filtered.filter(t => t.type.includes(filter));

  const el = document.getElementById('admin-targets-list');
  if (el) el.innerHTML = renderTargetsList(filtered);
}

// ── 방문 예약 ────────────────────────────────────────────────────────
function visitTarget(id) {
  toast(`HH-00${id} 방문 예약이 등록되었습니다`, 'success');
}

// ── KOSIS API 데이터 불러오기 ─────────────────────────────────────────
async function loadKosisData() {
  const key = APP.settings.kosisKey;
  if (!key) {
    toast('설정에서 KOSIS API 키를 먼저 입력해주세요', 'warn');
    return;
  }

  toast('📡 KOSIS 데이터 불러오는 중...', 'info', 3000);

  try {
    // 주민등록인구 통계 (DT_1B040A3)
    const regionCode = getKosisRegionCode(Admin.region);
    const url = `https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList&apiKey=${encodeURIComponent(key)}&itmId=T2&objL1=${regionCode}&format=json&jsonVD=Y&prdSe=Y&startPrdDe=2023&endPrdDe=2023&orgId=101&tblId=DT_1B040A3`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`KOSIS API 오류: ${res.status}`);
    const data = await res.json();

    if (data && data.length > 0) {
      Admin.kosisLoaded = true;
      toast('✅ KOSIS 실시간 데이터 연동 완료', 'success');
    } else {
      throw new Error('데이터 없음');
    }
  } catch (e) {
    toast('KOSIS 연동 실패 — 추정 데이터로 표시합니다', 'warn');
  }
}

// ── KOSIS 지역 코드 변환 ─────────────────────────────────────────────
function getKosisRegionCode(region) {
  const codes = {
    '서울': '11', '부산': '21', '대구': '22', '인천': '23',
    '광주': '24', '대전': '25', '울산': '26', '세종': '29',
    '경기': '31', '강원': '32', '충북': '33', '충남': '34',
    '전북': '35', '전남': '36', '경북': '37', '경남': '38', '제주': '39',
  };
  return codes[region] || '31';
}

// ── KOSIS 키 저장 ────────────────────────────────────────────────────
function saveKosisKey() {
  const input = document.getElementById('kosis-key-input');
  const key = input?.value.trim();
  if (!key) { toast('API 키를 입력해주세요', 'warn'); return; }
  saveSettings({ kosisKey: key });
  toast('✅ KOSIS API 키가 저장되었습니다', 'success');
}

// ── AI 사각지대 분석 ─────────────────────────────────────────────────
async function runBlindSpotAnalysis() {
  if (Admin.isAnalyzing) return;
  Admin.isAnalyzing = true;

  const btn = document.getElementById('btn-analyze');
  const result = document.getElementById('admin-ai-result');
  if (btn) { btn.disabled = true; btn.textContent = '분석 중...'; }
  if (result) result.innerHTML = `<div class="typing-dots" style="padding:12px 0"><span></span><span></span><span></span></div>`;

  try {
    const stats = Admin.stats;
    const gap = {
      pension: stats.basicPension.eligible - stats.basicPension.recipients,
      housing: stats.housing.eligible - stats.housing.recipients,
      disability: stats.disability.eligible - stats.disability.recipients,
    };

    const nvidiaKey = APP.settings.nvidiaKey;
    let analysis;

    if (nvidiaKey) {
      analysis = await fetchNvidiaBlindSpotAnalysis(Admin.region, stats, gap, nvidiaKey);
    } else {
      await new Promise(r => setTimeout(r, 1200));
      analysis = getDemoBlindSpotAnalysis(Admin.region, stats, gap);
    }

    if (result) {
      result.innerHTML = `
        <div style="font-size:.84rem;line-height:1.8;color:var(--text);white-space:pre-wrap;padding:4px 0">${esc(analysis)}</div>
      `;
    }
  } catch (e) {
    if (result) result.innerHTML = `<div style="color:var(--text-muted);font-size:.83rem">분석 오류가 발생했습니다. 다시 시도해주세요.</div>`;
  } finally {
    Admin.isAnalyzing = false;
    if (btn) { btn.disabled = false; btn.textContent = '분석 시작'; }
  }
}

// ── NVIDIA 사각지대 분석 API 호출 ────────────────────────────────────
async function fetchNvidiaBlindSpotAnalysis(region, stats, gap, apiKey) {
  const prompt = `다음은 ${region} 지역의 복지 사각지대 현황 데이터입니다.

기초연금: 추정 대상 ${fmtNum(stats.basicPension.eligible)}명 중 수급자 ${fmtNum(stats.basicPension.recipients)}명 → 미수급 ${fmtNum(gap.pension)}명
주거급여: 추정 대상 ${fmtNum(stats.housing.eligible)}명 중 수급자 ${fmtNum(stats.housing.recipients)}명 → 미수급 ${fmtNum(gap.housing)}명
장애인 혜택: 추정 대상 ${fmtNum(stats.disability.eligible)}명 중 수급자 ${fmtNum(stats.disability.recipients)}명 → 미수급 ${fmtNum(gap.disability)}명
독거노인: ${fmtNum(stats.singleElderly)}명 추정

다음을 분석해주세요:
1. 가장 시급한 사각지대 유형과 원인
2. 이 지역에서 효과적인 발굴 전략 (구체적으로)
3. 이장님·복지사가 이달 집중해야 할 우선순위 3가지

200자 이내로 간결하게, 실무자가 바로 활용할 수 있도록 작성해주세요.`;

  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'meta/llama-3.1-70b-instruct',
      messages: [
        { role: 'system', content: '당신은 대한민국 사회복지 정책 전문가입니다. 복지 사각지대 발굴을 위한 실무적인 분석과 전략을 제공합니다.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5, max_tokens: 600, stream: false,
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || getDemoBlindSpotAnalysis(region, stats, gap);
}

// ── 데모 분석 결과 ────────────────────────────────────────────────────
function getDemoBlindSpotAnalysis(region, stats, gap) {
  const topGap = gap.housing > gap.pension ? '주거급여' : '기초연금';
  const topNum = Math.max(gap.pension, gap.housing, gap.disability);
  return `📊 ${region} 지역 사각지대 분석 결과

🔴 가장 시급한 유형: ${topGap} (미수급 ${fmtNum(topNum)}명 추정)
주요 원인: 자격 조건 인지 부족, 신청 절차 복잡, 디지털 접근 어려움

📌 이달 우선 전략:
1. 독거노인 ${fmtNum(stats.singleElderly)}명 중 기초연금 미수급자 전화 발굴 — 마을방송 즉시 활용
2. 장애인 등록자 중 활동지원 미신청 가구 방문 상담 집중
3. 에너지바우처 마감 임박 — 의료급여 수급가구 일괄 안내 필요

💡 이 지역 특성상 농촌형 고령 단독가구 비율이 높아 전화 중심 접근이 효과적입니다.`;
}

// ── 관리자용 방송문 자동 생성 ────────────────────────────────────────
async function generateAdminBroadcast() {
  const stats = Admin.stats;
  const gap = stats.basicPension.eligible - stats.basicPension.recipients;
  const region = Admin.region;

  const text = `${region} 주민 여러분께 알립니다. 현재 이 지역에서 기초연금을 아직 신청하지 못하신 어르신이 약 ${fmtNum(gap)}명으로 파악되고 있습니다. 만 65세 이상이신 어르신 중 아직 신청 안 하신 분들은 꼭 주민센터에 들러주세요. 신분증이랑 통장만 있으면 바로 도움드릴 수 있습니다.`;

  VoiceBroadcast.convertedText = text;

  toast('📣 방송문이 생성되었습니다. AI 마을방송 탭에서 재생하세요.', 'success', 4000);
  setTimeout(() => navigateTo('voice'), 1500);
}

// ── 긴급 방송 원클릭 ─────────────────────────────────────────────────
function quickEmergencyBroadcast(type) {
  const region = Admin.region || APP.profile?.region || '우리 동네';

  const scripts = {
    heatwave: {
      cat: 'disaster',
      text: `긴급 안내! ${region} 주민 여러분~\n\n폭염 경보가 발령되었습니다! 낮 12시~오후 5시 사이에는 외출을 자제해 주세요. 어르신과 어린이는 특히 조심하세요.\n\n가까운 무더위쉼터(마을회관·경로당)에서 더위를 피하시고, 물 자주 드세요. 응급상황은 119!`,
    },
    typhoon: {
      cat: 'disaster',
      text: `긴급 안내! ${region} 주민 여러분~\n\n태풍이 접근하고 있습니다! 지금 바로 외출을 자제하시고 창문을 단단히 닫아주세요.\n\n저지대·침수 위험 지역에 계신 분들은 즉시 마을회관으로 대피해 주세요. 긴급 상황은 재난안전 전화 119!`,
    },
    coldwave: {
      cat: 'disaster',
      text: `긴급 안내! ${region} 주민 여러분~\n\n한파 경보가 발령되었습니다! 수도 동파 예방을 위해 수도꼭지를 조금씩 틀어두시고 보일러를 확인해주세요.\n\n홀로 사시는 어르신들, 주변에 안부 확인 부탁드립니다. 도움 필요하시면 주민센터로 연락주세요!`,
    },
    dust: {
      cat: 'weather',
      text: `${region} 주민 여러분께 알립니다~\n\n오늘 미세먼지 농도가 매우 나쁨 수준입니다! 외출 시 반드시 마스크를 착용해주세요.\n\n어르신·어린이·호흡기 질환자는 외출을 자제하시고, 외출 후 손발을 깨끗이 씻어주세요!`,
    },
  };

  const s = scripts[type];
  if (!s) return;

  VoiceBroadcast.category = s.cat;
  VoiceBroadcast.convertedText = s.text;

  toast('🚨 긴급 방송문이 생성되었습니다. AI 마을방송 탭에서 확인하세요!', 'success', 4000);
  setTimeout(() => {
    navigateTo('voice');
    // 탭 전환 후 결과 표시
    setTimeout(() => {
      switchVoiceTab('broadcast');
      showBroadcastResult(s.text);
    }, 300);
  }, 800);
}

// ── 숫자 포맷 ────────────────────────────────────────────────────────
function fmtNum(n) {
  return Number(n).toLocaleString('ko-KR');
}
