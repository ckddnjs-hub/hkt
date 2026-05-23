'use strict';

// ── NVIDIA NIM 멀티에이전트 오케스트레이터 ─────────────────────────────

const AgentOrchestrator = {
  isRunning: false,
  results: {},
  logLines: [],

  async runAll(profile) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.results = {};
    this.logLines = [];

    const nvidiaKey = APP.settings.nvidiaKey;
    if (!nvidiaKey) {
      toast('NVIDIA API 키를 설정에서 입력해주세요', 'warn');
      this.isRunning = false;
      return null;
    }

    this.updateUI('init');
    this.log('info', '🚀 멀티에이전트 분석 시작');

    try {
      // 에이전트 1: 프로필 분석
      await this.runAgent('analyst', profile, nvidiaKey);

      // 에이전트 2, 3: 병렬 실행
      await Promise.all([
        this.runAgent('matcher', profile, nvidiaKey),
        this.runAgent('cohort', profile, nvidiaKey),
      ]);

      // 에이전트 4: 미래 플래닝
      await this.runAgent('futurePlanner', profile, nvidiaKey);

      this.log('done', '✅ 모든 에이전트 분석 완료!');
      this.updateUI('done');
      return this.results;

    } catch (err) {
      console.error('에이전트 실패:', err);
      this.log('warn', `❌ 오류: ${err.message}`);
      this.updateUI('error');
      return null;
    } finally {
      this.isRunning = false;
    }
  },

  async runAgent(agentId, profile, apiKey) {
    const cfg = AGENTS_CONFIG[agentId];
    if (!cfg) return;

    this.setAgentStatus(agentId, 'thinking');
    this.log('info', `${cfg.avatar} ${cfg.name} 분석 중...`);

    const prompt = buildAgentPrompt(agentId, profile);

    try {
      const result = await callNvidiaAPI(cfg.model, cfg.systemPrompt, prompt, apiKey);
      this.results[agentId] = result;
      this.setAgentStatus(agentId, 'done');
      this.log('done', `${cfg.avatar} ${cfg.name} 완료`);
    } catch (err) {
      // API 실패 시 데모 데이터 사용
      this.results[agentId] = getDemoResult(agentId, profile);
      this.setAgentStatus(agentId, 'done');
      this.log('warn', `${cfg.avatar} ${cfg.name} (데모 모드)`);
    }
  },

  setAgentStatus(agentId, status) {
    const card = document.getElementById(`agent-card-${agentId}`);
    if (!card) return;
    card.className = `agent-card ${status === 'thinking' ? 'thinking' : status === 'done' ? 'done' : ''}`;
    const statusEl = card.querySelector('.agent-status');
    if (statusEl) {
      statusEl.textContent = status === 'thinking' ? '분석 중...' : status === 'done' ? '완료' : '대기';
      statusEl.className = `agent-status ${status}`;
    }
  },

  log(type, msg) {
    this.logLines.push({ type, msg, time: new Date().toLocaleTimeString() });
    const logEl = document.getElementById('agent-log');
    if (logEl) {
      logEl.innerHTML = this.logLines.slice(-8).map(l =>
        `<div class="agent-log-line ${l.type}">[${l.time}] ${esc(l.msg)}</div>`
      ).join('');
      logEl.scrollTop = logEl.scrollHeight;
    }
  },

  updateUI(state) {
    const btn = document.getElementById('btn-run-agents');
    if (!btn) return;
    if (state === 'init') {
      btn.disabled = true;
      btn.textContent = '🤖 에이전트 분석 중...';
    } else if (state === 'done') {
      btn.disabled = false;
      btn.textContent = '🔄 다시 분석하기';
      renderAgentResults(this.results);
    } else if (state === 'error') {
      btn.disabled = false;
      btn.textContent = '⚠️ 재시도';
    }
  },
};

// ── NVIDIA NIM API 호출 ───────────────────────────────────────────────
async function callNvidiaAPI(model, systemPrompt, userPrompt, apiKey) {
  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 1500,
      stream: false,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`API 오류: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── 에이전트별 프롬프트 생성 ─────────────────────────────────────────
function buildAgentPrompt(agentId, profile) {
  const profileStr = JSON.stringify(profile, null, 2);

  const prompts = {
    analyst: `다음 사용자 프로필을 분석하여 복지 수요를 파악해주세요:
${profileStr}

분석 결과를 다음 JSON 형식으로 반환하세요:
{
  "keyNeeds": ["주요 복지 수요 3-5개"],
  "riskFactors": ["위험 요인"],
  "strengths": ["강점/자원"],
  "summary": "한 줄 요약"
}`,

    matcher: `다음 사용자 프로필에 적합한 복지 혜택을 추천해주세요:
${profileStr}

다음 JSON 형식으로 상위 5개 혜택을 반환하세요:
{
  "topBenefits": [
    {
      "name": "혜택명",
      "reason": "추천 이유",
      "urgency": "높음/보통/낮음",
      "estimatedAmount": "예상 지원액",
      "category": "카테고리"
    }
  ],
  "totalEstimate": "월 예상 수령액",
  "insight": "핵심 인사이트"
}`,

    cohort: `다음 프로필의 사용자와 비슷한 계층이 자주 놓치는 복지 혜택을 분석해주세요:
${profileStr}

JSON 형식으로 반환:
{
  "cohortProfile": "유사 계층 설명",
  "hiddenBenefits": [
    {
      "name": "혜택명",
      "utilizationRate": "유사 계층 활용률",
      "reason": "잘 모르는 이유"
    }
  ],
  "cohortInsight": "계층 분석 인사이트"
}`,

    futurePlanner: `다음 프로필 기반으로 향후 생애주기별 예상 복지 혜택을 계획해주세요:
${profileStr}

JSON 형식으로 반환:
{
  "currentStage": "현재 생애 단계",
  "futureEvents": [
    {
      "year": 2025,
      "event": "예상 이벤트",
      "benefits": ["관련 혜택들"],
      "action": "지금 준비할 것"
    }
  ],
  "lifetimeValue": "생애 총 예상 복지 수혜액",
  "planInsight": "생애 플랜 인사이트"
}`,
  };

  return prompts[agentId] || `사용자 프로필을 분석해주세요: ${profileStr}`;
}

// ── 데모 결과 (API 키 없을 때) ─────────────────────────────────────────
function getDemoResult(agentId, profile) {
  const age = parseInt(profile?.age || 30);
  const income = parseInt(profile?.incomePercent || 60);
  const name = profile?.name || '사용자';

  const demo = {
    analyst: JSON.stringify({
      keyNeeds: ['소득 보장', '주거 안정', '의료비 경감', '자산 형성'],
      riskFactors: income < 50 ? ['저소득 위험', '주거 불안정'] : ['중간 소득 유동성'],
      strengths: ['정기적 신청 의지', '정보 접근성'],
      summary: `${name}님은 소득 기준 중위 ${income}% 수준으로 복지 혜택 우선순위가 높습니다.`,
    }),

    matcher: JSON.stringify({
      topBenefits: [
        { name: income <= 48 ? '주거급여' : '청년월세지원', reason: '소득 및 주거 조건 부합', urgency: '높음', estimatedAmount: '월 20-50만원', category: 'housing' },
        { name: '건강보험료 경감', reason: '소득 기준 충족', urgency: '높음', estimatedAmount: '월 3-10만원', category: 'health' },
        { name: age < 35 ? '청년도약계좌' : '국민취업지원제도', reason: '나이 및 소득 조건 부합', urgency: '보통', estimatedAmount: '월 50-70만원', category: 'youth' },
        { name: '교육급여', reason: '자녀 있는 경우 자동 대상', urgency: '보통', estimatedAmount: '연 46-68만원', category: 'education' },
        { name: '의료급여', reason: '기준 중위소득 40% 이하 해당', urgency: '높음', estimatedAmount: '본인부담 최소화', category: 'health' },
      ],
      totalEstimate: `월 ${Math.round(income < 30 ? 150 : income < 50 ? 90 : 50)}만원`,
      insight: `현재 소득 수준에서 월 평균 ${Math.round(income < 30 ? 150 : 90)}만원 상당의 복지 혜택을 받으실 수 있습니다.`,
    }),

    cohort: JSON.stringify({
      cohortProfile: `${age}세 내외, 중위소득 ${income}% 수준의 ${profile?.householdType === 'single' ? '1인' : '다인'} 가구`,
      hiddenBenefits: [
        { name: '에너지바우처', utilizationRate: '38%', reason: '신청 방법을 몰라서' },
        { name: '문화누리카드', utilizationRate: '52%', reason: '복지관에서만 안내받아서' },
        { name: '통신요금 감면', utilizationRate: '61%', reason: '통신사에 직접 문의해야 해서' },
      ],
      cohortInsight: `비슷한 조건의 계층에서 평균 3.2개의 혜택을 추가로 받고 있습니다. 특히 에너지, 통신, 문화 바우처를 놓치는 경우가 많습니다.`,
    }),

    futurePlanner: JSON.stringify({
      currentStage: age < 35 ? '청년기' : age < 65 ? '중장년기' : '노년기',
      futureEvents: [
        { year: new Date().getFullYear() + 1, event: '주거 안정화', benefits: ['전세자금대출', '주거급여'], action: '주거 상황 점검 및 신청' },
        { year: new Date().getFullYear() + 3, event: '자산 형성 목표', benefits: ['청년도약계좌 만기', '개인형퇴직연금'], action: '금융 계획 수립' },
        { year: new Date().getFullYear() + 5, event: '생애 이벤트 대비', benefits: age < 35 ? ['출산지원금', '부모급여', '아동수당'] : ['장기요양 준비'], action: '관련 서비스 사전 파악' },
        { year: 65, event: '노년기 전환', benefits: ['기초연금', '노인장기요양보험', '노인돌봄서비스'], action: '65세 전 미리 신청 준비' },
      ],
      lifetimeValue: `총 약 ${Math.round((100 - income) * 3000)}만원`,
      planInsight: `생애 전체적으로 약 ${Math.round((100 - income) * 3000)}만원의 복지 혜택이 예상됩니다. 지금부터 준비하면 더 많은 혜택을 받을 수 있습니다.`,
    }),
  };

  return demo[agentId] || '';
}

// ── 에이전트 결과 렌더링 ─────────────────────────────────────────────
function renderAgentResults(results) {
  // 혜택 결과를 benefits 페이지에 업데이트
  try {
    const matcherData = JSON.parse(results.matcher || '{}');
    if (matcherData.topBenefits) {
      document.getElementById('ai-benefits-result')?.classList.remove('hidden');
      document.getElementById('ai-total-estimate').textContent = matcherData.totalEstimate || '';
      document.getElementById('ai-insight-text').textContent = matcherData.insight || '';
    }

    const cohortData = JSON.parse(results.cohort || '{}');
    if (cohortData.hiddenBenefits) {
      const el = document.getElementById('cohort-result');
      if (el) {
        el.innerHTML = `
          <div class="cohort-insight">
            <div style="font-size:.82rem;font-weight:700;color:var(--primary);margin-bottom:8px">👥 ${esc(cohortData.cohortProfile || '')}</div>
            ${cohortData.hiddenBenefits.map(b =>
              `<div style="padding:8px 0;border-bottom:1px solid var(--border)">
                <div style="font-size:.87rem;font-weight:700">${esc(b.name)}</div>
                <div style="font-size:.77rem;color:var(--text-muted)">${esc(cohortData.cohortProfile || '')} 중 ${esc(b.utilizationRate)} 활용 · ${esc(b.reason)}</div>
              </div>`
            ).join('')}
            <div class="cohort-insight-text mt8">${esc(cohortData.cohortInsight || '')}</div>
          </div>`;
      }
    }

    const futureData = JSON.parse(results.futurePlanner || '{}');
    if (futureData.futureEvents && document.getElementById('lifecycle-ai-events')) {
      renderLifecycleAIEvents(futureData);
    }

    toast('AI 분석 완료! 맞춤 혜택을 확인하세요.', 'success', 4000);
  } catch (e) {
    console.warn('결과 파싱 오류:', e);
  }
}

function renderLifecycleAIEvents(futureData) {
  const el = document.getElementById('lifecycle-ai-events');
  if (!el) return;
  el.innerHTML = `
    <div class="section-header">
      <div class="section-title">🔮 AI 예측 생애 이벤트</div>
      <div class="badge" style="background:rgba(99,102,241,.15);color:var(--accent)">생애 총 ${esc(futureData.lifetimeValue || '')}</div>
    </div>
    ${futureData.futureEvents?.map(ev => `
      <div class="timeline-item">
        <div class="timeline-dot future"></div>
        <div class="timeline-content">
          <div class="timeline-period">${esc(String(ev.year))}년 예정</div>
          <div class="timeline-title">${esc(ev.event)}</div>
          <div class="timeline-benefits">
            ${(ev.benefits || []).map(b => `<span class="timeline-benefit-chip future">${esc(b)}</span>`).join('')}
          </div>
          <div style="font-size:.78rem;color:var(--primary);margin-top:8px">💡 지금 할 것: ${esc(ev.action || '')}</div>
        </div>
      </div>
    `).join('') || ''}
    <div class="cohort-insight mt12">
      <div class="cohort-insight-text">${esc(futureData.planInsight || '')}</div>
    </div>`;
}

// ── 데모 모드로 빠른 실행 ──────────────────────────────────────────────
async function runDemoAgents(profile) {
  if (!profile) { toast('프로필을 먼저 입력해주세요', 'warn'); return; }

  const btn = document.getElementById('btn-run-agents');
  if (btn) { btn.disabled = true; btn.textContent = '🤖 에이전트 분석 중...'; }

  const agentIds = ['analyst', 'matcher', 'cohort', 'futurePlanner'];

  // 순서대로 각 에이전트 시뮬레이션
  for (const agentId of agentIds) {
    AgentOrchestrator.setAgentStatus(agentId, 'thinking');
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
    AgentOrchestrator.results[agentId] = getDemoResult(agentId, profile);
    AgentOrchestrator.setAgentStatus(agentId, 'done');
    AgentOrchestrator.log('done', `${AGENTS_CONFIG[agentId]?.avatar} ${AGENTS_CONFIG[agentId]?.name} 완료`);
  }

  if (btn) { btn.disabled = false; btn.textContent = '🔄 다시 분석하기'; }
  renderAgentResults(AgentOrchestrator.results);
}
