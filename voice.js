'use strict';

// ── 음성 상태 ────────────────────────────────────────────────────────
const Voice = {
  synth: window.speechSynthesis,
  isPlaying: false,
  isPaused: false,
  utterance: null,
  script: '',
  rate: 0.88,
  scriptReady: false,
};

// ── 복지 라디오 페이지 렌더 ──────────────────────────────────────────
function renderVoicePage() {
  const page = document.getElementById('page-voice');
  if (!page) return;

  const p = APP.profile;
  const region = p?.region || '우리 동네';

  page.innerHTML = `
    <div class="voice-page">

      <!-- 라디오 헤더 -->
      <div class="voice-header">
        <div class="voice-badge">LIVE</div>
        <div class="voice-station">${esc(region)} 복지 라디오</div>
        <div class="voice-date">${getTodayLabel()}</div>
      </div>

      <!-- 메인 플레이어 -->
      <div class="voice-player">
        <div class="voice-waveform" id="voice-waveform">
          ${Array(20).fill(0).map((_, i) =>
            `<div class="voice-bar" style="animation-delay:${i * 0.07}s"></div>`
          ).join('')}
        </div>

        <div class="voice-play-wrap">
          <button class="voice-play-btn" id="voice-play-btn" onclick="toggleVoice()">
            <svg id="voice-icon-play" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <svg id="voice-icon-pause" viewBox="0 0 24 24" fill="currentColor" style="display:none">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          </button>
        </div>

        <div class="voice-status" id="voice-status">
          ${p ? '버튼을 눌러 오늘의 복지 소식을 들으세요' : '프로필을 입력하면 맞춤 소식을 들을 수 있어요'}
        </div>
      </div>

      <!-- 속도 조절 -->
      <div class="voice-speed-bar">
        ${[['느리게', 0.75], ['보통', 0.9], ['빠르게', 1.1]].map(([label, rate]) => `
          <button class="voice-speed-btn ${Voice.rate === rate ? 'active' : ''}"
            onclick="setVoiceRate(${rate}, this)">${label}</button>
        `).join('')}
      </div>

      <!-- 스크립트 미리보기 -->
      <div class="voice-script-wrap" id="voice-script-wrap" style="display:none">
        <div class="voice-script-label">오늘의 복지 소식 스크립트</div>
        <div class="voice-script-text" id="voice-script-text"></div>
      </div>

      <!-- 프로필 없을 때 안내 -->
      ${!p ? `
        <div class="card" style="text-align:center;padding:24px;margin-top:16px">
          <div style="font-size:1.6rem;margin-bottom:12px">👤</div>
          <div style="font-weight:700;margin-bottom:6px">프로필을 입력해주세요</div>
          <div style="font-size:.83rem;color:var(--text-muted);margin-bottom:16px">지역과 상황에 맞는<br>맞춤 복지 소식을 들을 수 있어요</div>
          <button class="btn btn-primary btn-full" onclick="navigateTo('profile')">프로필 입력하기</button>
        </div>` : ''}

      <!-- 오늘의 주요 소식 목록 -->
      ${p ? `
        <div class="section-header mt8">
          <div class="section-title">오늘의 주요 소식</div>
        </div>
        <div style="border-radius:var(--radius);overflow:hidden">
          ${getVoiceNewsList(p).map((item, i) => `
            <div class="home-list-item" style="background:var(--surface);padding:14px 16px;${i > 0 ? 'border-top:1px solid var(--border)' : ''}">
              <div class="hli-icon" style="background:${item.color}15;font-size:1.1rem">${item.icon}</div>
              <div class="hli-info">
                <div class="hli-name">${esc(item.title)}</div>
                <div class="hli-sub">${esc(item.sub)}</div>
              </div>
            </div>`).join('')}
        </div>` : ''}

      <!-- 접근성 안내 -->
      <div class="voice-accessibility-note">
        <span>♿</span>
        <span>어르신 · 시각 약자를 위한 음성 복지 서비스입니다</span>
      </div>

    </div>
  `;
}

// ── 재생/일시정지 토글 ──────────────────────────────────────────────
async function toggleVoice() {
  if (Voice.isPlaying && !Voice.isPaused) {
    pauseVoice();
  } else if (Voice.isPaused) {
    resumeVoice();
  } else {
    await startVoice();
  }
}

// ── 시작 ───────────────────────────────────────────────────────────
async function startVoice() {
  Voice.synth.cancel();
  setVoiceUIState('loading');

  try {
    const script = await buildVoiceScript();
    Voice.script = script;
    speakText(script);
  } catch (e) {
    setVoiceUIState('idle');
    toast('음성 생성에 실패했습니다', 'error');
  }
}

// ── 일시정지 ──────────────────────────────────────────────────────
function pauseVoice() {
  Voice.synth.pause();
  Voice.isPaused = true;
  Voice.isPlaying = false;
  setVoiceUIState('paused');
}

// ── 재개 ──────────────────────────────────────────────────────────
function resumeVoice() {
  Voice.synth.resume();
  Voice.isPaused = false;
  Voice.isPlaying = true;
  setVoiceUIState('playing');
}

// ── 정지 ──────────────────────────────────────────────────────────
function stopVoice() {
  Voice.synth.cancel();
  Voice.isPlaying = false;
  Voice.isPaused = false;
  setVoiceUIState('idle');
}

// ── 실제 음성 재생 ────────────────────────────────────────────────
function speakText(text) {
  Voice.synth.cancel();

  // 긴 텍스트는 문장 단위로 나눠서 재생 (브라우저 버그 방지)
  const sentences = text.split(/(?<=[.!?。])\s+/).filter(s => s.trim());
  let idx = 0;

  function speakNext() {
    if (idx >= sentences.length) {
      Voice.isPlaying = false;
      Voice.isPaused = false;
      setVoiceUIState('done');
      return;
    }
    const utt = new SpeechSynthesisUtterance(sentences[idx]);
    utt.lang = 'ko-KR';
    utt.rate = Voice.rate;
    utt.pitch = 1.0;
    utt.volume = 1.0;

    utt.onend = () => { idx++; speakNext(); };
    utt.onerror = () => { idx++; speakNext(); };

    // 현재 문장 강조 표시
    highlightScriptLine(idx, sentences.length);

    Voice.synth.speak(utt);
  }

  Voice.isPlaying = true;
  Voice.isPaused = false;
  setVoiceUIState('playing');
  speakNext();
}

// ── 스크립트 빌드 ─────────────────────────────────────────────────
async function buildVoiceScript() {
  const p = APP.profile;
  const nvidiaKey = APP.settings.nvidiaKey;

  if (nvidiaKey && p) {
    try {
      return await buildScriptWithNvidia(p, nvidiaKey);
    } catch (e) {
      console.warn('[Voice] NVIDIA 실패, 데모 모드:', e);
    }
  }
  return buildDemoScript(p);
}

// ── NVIDIA NIM으로 스크립트 생성 ─────────────────────────────────
async function buildScriptWithNvidia(profile, apiKey) {
  const news = getVoiceNewsList(profile);
  const benefits = (APP.matchedBenefits.length ? APP.matchedBenefits : matchBenefits()).slice(0, 3);
  const region = profile.region || '우리 동네';
  const name = profile.name || '주민';

  const prompt = `다음 조건에 맞는 복지 라디오 방송 스크립트를 작성해주세요.

청취자 정보:
- 이름: ${name}님
- 지역: ${region}
- 나이: ${profile.age}세
- 상황: ${[profile.disability&&'장애인',profile.elderly&&'노인부양',profile.hasChildren&&'자녀있음',profile.pregnant&&'임신중'].filter(Boolean).join(', ')||'일반'}

오늘의 혜택 소식:
${benefits.map(b => `- ${b.name}: ${b.amount}`).join('\n')}

뉴스:
${news.slice(0,3).map(n => `- ${n.title}`).join('\n')}

요구사항:
- 라디오 방송처럼 따뜻하고 친근하게 읽어줄 수 있는 문장으로 작성
- "안녕하세요, ${name}님!" 으로 시작
- 지역명(${region})을 언급
- 핵심 혜택 2~3개를 쉽게 설명
- 신청 방법(복지로 또는 주민센터)으로 마무리
- 총 300~400자, 말로 읽으면 1분 30초 분량
- 한국어, 존댓말, 이해하기 쉬운 단어만 사용`;

  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'meta/llama-3.1-70b-instruct',
      messages: [
        { role: 'system', content: '당신은 따뜻한 복지 라디오 방송 작가입니다. 어르신도 이해하기 쉬운 말로 복지 혜택을 안내하는 방송 스크립트를 작성합니다.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 600,
      stream: false,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || buildDemoScript(profile);
}

// ── 데모 스크립트 생성 ────────────────────────────────────────────
function buildDemoScript(profile) {
  const p = profile;
  const region = p?.region || '우리 동네';
  const name = p?.name || '주민';
  const age = parseInt(p?.age || 40);
  const benefits = p ? (APP.matchedBenefits.length ? APP.matchedBenefits : matchBenefits()).slice(0, 3) : [];

  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  let script = `안녕하세요, ${name}님! 오늘 ${month}월 ${day}일 ${region} 복지 소식을 전해드립니다.\n\n`;

  if (benefits.length) {
    script += `오늘 ${name}님께 꼭 필요한 혜택 소식 먼저 전해드릴게요. `;
    benefits.forEach((b, i) => {
      script += `${i === 0 ? '첫 번째로' : i === 1 ? '두 번째로' : '마지막으로'}, ${b.name}입니다. ${b.description} 혜택 금액은 ${b.amount}이에요. `;
    });
    script += '\n\n';
  }

  if (age >= 65) {
    script += `어르신들을 위한 소식도 있어요. 이번 달 기초연금 신청 기간이니 아직 신청 안 하신 분들은 주민센터에 꼭 방문해 보세요. 만 65세 이상이시면 매달 최대 32만 원을 받으실 수 있습니다.\n\n`;
  } else if (age < 34) {
    script += `청년 분들을 위한 소식이에요. 청년 월세 지원 사업 신청이 이번 달까지입니다. 만 19세에서 34세 이하 청년이라면 월 최대 20만 원을 12개월 동안 지원받으실 수 있어요.\n\n`;
  }

  script += `오늘 소개해드린 혜택들은 복지로 사이트, 또는 가까운 주민센터에서 신청하실 수 있습니다. 신청 방법이 어려우시면 복지 상담 전화 129번으로 전화해 주세요. 24시간 상담 가능합니다. 오늘 하루도 건강하고 좋은 하루 보내세요!`;

  return script;
}

// ── UI 상태 업데이트 ─────────────────────────────────────────────
function setVoiceUIState(state) {
  const btn = document.getElementById('voice-play-btn');
  const status = document.getElementById('voice-status');
  const waveform = document.getElementById('voice-waveform');
  const playIcon = document.getElementById('voice-icon-play');
  const pauseIcon = document.getElementById('voice-icon-pause');
  const scriptWrap = document.getElementById('voice-script-wrap');
  const scriptText = document.getElementById('voice-script-text');

  if (!btn) return;

  if (state === 'loading') {
    btn.classList.add('loading');
    if (status) status.textContent = '방송 준비 중...';
    if (waveform) waveform.classList.remove('active');
  } else if (state === 'playing') {
    btn.classList.remove('loading');
    btn.classList.add('playing');
    if (playIcon) playIcon.style.display = 'none';
    if (pauseIcon) pauseIcon.style.display = 'block';
    if (status) status.textContent = '방송 중... 버튼을 눌러 일시정지';
    if (waveform) waveform.classList.add('active');
    if (scriptWrap && Voice.script) {
      scriptWrap.style.display = 'block';
      if (scriptText) scriptText.textContent = Voice.script;
    }
  } else if (state === 'paused') {
    btn.classList.remove('playing');
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
    if (status) status.textContent = '일시정지됨 · 버튼을 눌러 계속 듣기';
    if (waveform) waveform.classList.remove('active');
  } else if (state === 'done') {
    btn.classList.remove('playing', 'loading');
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
    if (status) status.textContent = '오늘 방송이 끝났습니다. 다시 들으려면 버튼을 누르세요';
    if (waveform) waveform.classList.remove('active');
  } else {
    btn.classList.remove('playing', 'loading');
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
    if (status) status.textContent = '버튼을 눌러 오늘의 복지 소식을 들으세요';
    if (waveform) waveform.classList.remove('active');
  }
}

// ── 스크립트 현재 위치 강조 ──────────────────────────────────────
function highlightScriptLine(idx, total) {
  const el = document.getElementById('voice-script-text');
  if (!el || !Voice.script) return;
  const sentences = Voice.script.split(/(?<=[.!?。])\s+/).filter(s => s.trim());
  el.innerHTML = sentences.map((s, i) =>
    `<span class="${i === idx ? 'voice-script-current' : i < idx ? 'voice-script-done' : ''}">${esc(s)} </span>`
  ).join('');
  // 현재 문장으로 스크롤
  const currentEl = el.querySelector('.voice-script-current');
  if (currentEl) currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── 속도 변경 ─────────────────────────────────────────────────────
function setVoiceRate(rate, btn) {
  Voice.rate = rate;
  document.querySelectorAll('.voice-speed-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  // 재생 중이면 재시작
  if (Voice.isPlaying && Voice.script) {
    speakText(Voice.script);
  }
}

// ── 오늘 뉴스 목록 (음성용) ──────────────────────────────────────
function getVoiceNewsList(profile) {
  const region = profile?.region || '';
  const age = parseInt(profile?.age || 40);
  const items = [];

  // 긴급 뉴스
  SAMPLE_NEWS.filter(n => n.urgent).slice(0, 2).forEach(n => {
    items.push({ icon: '🔴', color: '#EF4444', title: n.title, sub: `${n.source} · ${relDate(n.date)}` });
  });

  // 맞춤 혜택
  const matched = profile ? (APP.matchedBenefits.length ? APP.matchedBenefits : matchBenefits()).slice(0, 3) : [];
  matched.forEach(b => {
    const cat = BENEFIT_CATEGORIES[b.category] || { icon: '📋', color: '#3182F6' };
    items.push({ icon: cat.icon, color: cat.color, title: b.name, sub: b.amount });
  });

  // 연령별 고정 항목
  if (age >= 65) items.push({ icon: '👴', color: '#8B5CF6', title: '기초연금 이번달 지급일 확인', sub: '만 65세 이상 · 최대 32만원' });
  if (age < 35) items.push({ icon: '🏠', color: '#10B981', title: '청년 월세 지원 신청 중', sub: '만 19~34세 · 월 최대 20만원' });

  return items.slice(0, 5);
}

// ── 오늘 날짜 라벨 ────────────────────────────────────────────────
function getTodayLabel() {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// ── 페이지 떠날 때 정지 ──────────────────────────────────────────
function onVoicePageLeave() {
  if (Voice.isPlaying || Voice.isPaused) {
    Voice.synth.cancel();
    Voice.isPlaying = false;
    Voice.isPaused = false;
  }
}
