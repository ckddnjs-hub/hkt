'use strict';
// ══════════════════════════════════════════════════════════════════════
//  strategy.js — AI 전략보드 (산점도 · 레이더 · 복지 네비게이션)
// ══════════════════════════════════════════════════════════════════════

let _scatterChart = null;
let _radarChart = null;

function renderStrategy() {
  const el = document.getElementById('page-strategy');
  if (!el) return;

  const data = _dashStrategyCache;

  el.innerHTML = `
    <div style="padding:16px 16px 0">
      <div style="font-size:1.1rem;font-weight:900;margin-bottom:4px">📊 AI 전략보드</div>
      <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:16px">
        ${data ? 'AI가 분석한 맞춤 혜택 전략이에요' : '정보를 입력하면 전략이 생성됩니다'}
      </div>
    </div>

    <div class="strategy-section">

      ${data?.strategy_summary ? `
        <!-- 전략 요약 -->
        <div class="card" style="background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.3)">
          <div class="chart-title">🤖 AI 전략 요약</div>
          <div style="font-size:.85rem;color:var(--text);line-height:1.7">${esc(data.strategy_summary).replace(/\n/g,'<br>')}</div>
          ${data.urgent_actions?.length ? `
            <div style="margin-top:12px">
              <div style="font-size:.75rem;font-weight:700;color:var(--warn);margin-bottom:6px">⚡ 지금 당장 해야 할 일</div>
              ${data.urgent_actions.map((a, i) => `
                <div style="display:flex;gap:8px;margin-bottom:6px;font-size:.83rem">
                  <span style="color:var(--primary);font-weight:700;flex-shrink:0">${i+1}.</span>
                  <span>${esc(a)}</span>
                </div>`).join('')}
            </div>` : ''}
        </div>` : ''}

      <!-- 긴급도 × 효과 산점도 -->
      <div class="chart-wrap">
        <div class="chart-title">⚡ 긴급도 × 효과 분석</div>
        <div style="position:relative;height:260px">
          <canvas id="scatter-chart"></canvas>
        </div>
        <div class="scatter-legend">
          <div class="scatter-legend-item"><div class="scatter-legend-dot" style="background:#FF5252"></div>즉시 신청</div>
          <div class="scatter-legend-item"><div class="scatter-legend-dot" style="background:#FF9800"></div>이번 달 내</div>
          <div class="scatter-legend-item"><div class="scatter-legend-dot" style="background:#00C896"></div>여유있음</div>
        </div>
      </div>

      <!-- 복지 네비게이션 경로 -->
      <div class="chart-wrap">
        <div class="chart-title">🧭 복지 네비게이션</div>
        <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:12px">목적지(최대 혜택)까지 최적 경로</div>
        <div class="nav-path" id="nav-path">
          ${_renderNavPath(data?.navigation_path)}
        </div>
      </div>

      <!-- 레이더 차트 -->
      <div class="chart-wrap">
        <div class="chart-title">🎯 복지 영역별 커버리지</div>
        <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:8px">비어있는 영역 한눈에 확인</div>
        <div class="radar-wrap">
          <canvas id="radar-chart"></canvas>
        </div>
      </div>

      <!-- 전체 혜택 리스트 -->
      ${data?.benefits?.length ? `
        <div style="font-size:.75rem;font-weight:700;color:var(--text-muted);margin-bottom:10px">전체 혜택 목록 (${data.benefits.length}개)</div>
        ${data.benefits.map(b => `
          <div class="card" style="padding:14px">
            <div style="display:flex;align-items:flex-start;gap:10px">
              <div style="font-size:1.3rem;flex-shrink:0">${_dashCatIcon(b.category)}</div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
                  <span style="font-weight:700;font-size:.9rem">${esc(b.name)}</span>
                  <span class="badge ${b.category === '주거지원' ? 'badge-purple' : 'badge-green'}" style="font-size:.65rem">${esc(b.category)}</span>
                </div>
                <div style="font-size:.83rem;color:var(--primary);font-weight:700;margin-bottom:3px">${esc(b.amount)}</div>
                <div style="font-size:.78rem;color:var(--text-muted)">${esc(b.description)}</div>
                <div style="font-size:.75rem;color:var(--text-dim);margin-top:4px">📍 ${esc(b.how_to_apply)}</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0">
                <div style="font-size:.65rem;font-weight:700;color:${b.urgency>=8?'var(--danger)':b.urgency>=5?'var(--warn)':'var(--primary)'}">긴급 ${b.urgency}</div>
                <div style="font-size:.65rem;font-weight:700;color:var(--accent)">효과 ${b.impact}</div>
                <button style="font-size:.72rem;padding:5px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer" onclick="window.open('${esc(b.apply_url||'https://www.bokjiro.go.kr')}','_blank')">신청</button>
              </div>
            </div>
          </div>`).join('')}` : `
        <div style="text-align:center;padding:32px 16px">
          <div style="font-size:2.5rem;margin-bottom:12px">📊</div>
          <div style="font-weight:700;margin-bottom:8px">전략 분석 데이터가 없어요</div>
          <button class="btn btn-primary" onclick="loadStrategy()">🤖 AI 분석 시작</button>
        </div>`}

      <div style="height:16px"></div>
    </div>
  `;

  // 차트 그리기
  setTimeout(() => {
    _drawScatterChart(data?.benefits || []);
    _drawRadarChart(data?.radar_scores || {});
  }, 100);
}

// ── 복지 네비게이션 렌더 ─────────────────────────────────────────────
function _renderNavPath(path) {
  if (!path?.length) {
    return `<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:.83rem">혜택 분석 후 표시됩니다</div>`;
  }
  let cumulative = 0;
  return path.map((node, i) => {
    cumulative += node.monthly_amount || 0;
    const isLast = i === path.length - 1;
    return `
      <div class="nav-node">
        <div style="display:flex;flex-direction:column;align-items:center">
          <div class="nav-node-dot ${node.type}">
            ${{ current: '📍', benefit: '➕', goal: '🏁' }[node.type] || '●'}
          </div>
          ${!isLast ? '<div class="nav-connector"></div>' : ''}
        </div>
        <div class="nav-node-info" style="padding:${isLast?'0':'0 0 16px'}">
          <div class="nav-node-label">${esc(node.label)}</div>
          ${node.monthly_amount ? `<div class="nav-node-amount">+월 ${node.monthly_amount}만원 → 누적 월 ${cumulative}만원</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ── 산점도 (긴급도 × 효과) ───────────────────────────────────────────
function _drawScatterChart(benefits) {
  const canvas = document.getElementById('scatter-chart');
  if (!canvas) return;
  if (_scatterChart) { _scatterChart.destroy(); _scatterChart = null; }

  const points = benefits.map(b => ({
    x: b.urgency,
    y: b.impact,
    label: b.name,
    color: b.urgency >= 8 ? '#FF5252' : b.urgency >= 5 ? '#FF9800' : '#00C896',
  }));

  _scatterChart = new Chart(canvas, {
    type: 'scatter',
    data: {
      datasets: [{
        label: '혜택',
        data: points.map(p => ({ x: p.x, y: p.y })),
        pointBackgroundColor: points.map(p => p.color),
        pointRadius: 10,
        pointHoverRadius: 13,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => points[ctx.dataIndex]?.label || '',
          },
        },
      },
      scales: {
        x: {
          min: 0, max: 10,
          title: { display: true, text: '긴급도 →', color: '#A0AEBB', font: { size: 11 } },
          ticks: { color: '#6B7685', stepSize: 2 },
          grid: { color: 'rgba(255,255,255,.05)' },
        },
        y: {
          min: 0, max: 10,
          title: { display: true, text: '효과 →', color: '#A0AEBB', font: { size: 11 } },
          ticks: { color: '#6B7685', stepSize: 2 },
          grid: { color: 'rgba(255,255,255,.05)' },
        },
      },
    },
  });

  // 레이블 플러그인
  if (points.length) {
    canvas.onclick = (e) => {
      const pts = _scatterChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
      if (pts.length) toast(points[pts[0].index]?.label || '', 'info', 2000);
    };
  }
}

// ── 레이더 차트 ───────────────────────────────────────────────────────
function _drawRadarChart(scores) {
  const canvas = document.getElementById('radar-chart');
  if (!canvas) return;
  if (_radarChart) { _radarChart.destroy(); _radarChart = null; }

  const labels = ['주거지원', '생활지원', '돌봄지원', '교육지원', '자산형성', '의료지원'];
  const values = labels.map(l => scores[l] || 0);

  _radarChart = new Chart(canvas, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: '커버리지',
        data: values,
        backgroundColor: 'rgba(0,200,150,.2)',
        borderColor: '#00C896',
        borderWidth: 2,
        pointBackgroundColor: '#00C896',
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { display: false, stepSize: 25 },
          grid: { color: 'rgba(255,255,255,.08)' },
          angleLines: { color: 'rgba(255,255,255,.08)' },
          pointLabels: { color: '#A0AEBB', font: { size: 11, weight: '700' } },
        },
      },
    },
  });
}
