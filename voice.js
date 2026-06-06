'use strict';

// ── 음성 상태 ────────────────────────────────────────────────────────
const Voice = {
  synth: window.speechSynthesis, // fallback용
  isPlaying: false,
  isPaused: false,
  utterance: null,
  audioEl: null,   // OpenAI TTS audio element
  script: '',
  rate: 0.88,
  scriptReady: false,
};

// ── 마을방송 변환기 상태 ──────────────────────────────────────────────
const VoiceBroadcast = {
  originalText: '',
  convertedText: '',
  isConverting: false,
  category: 'welfare',
};

// ── AI 마을방송 + 복지 라디오 페이지 렌더 ───────────────────────────
function renderVoicePage() {
  const page = document.getElementById('page-voice');
  if (!page) return;

  const p = APP.profile;
  const region = p?.region || '우리 동네';

  page.innerHTML = `
    <div class="voice-page">

      <!-- 탭 네비게이션 -->
      <div class="voice-tabs">
        <button class="voice-tab active" id="vtab-broadcast" onclick="switchVoiceTab('broadcast')">
          📣 전달자 모드
        </button>
        <button class="voice-tab" id="vtab-radio" onclick="switchVoiceTab('radio')">
          🎤 당사자 모드
        </button>
      </div>

      <!-- ─── AI 마을방송 탭 ────────────────────────────────── -->
      <div id="voice-tab-broadcast">

        <div class="card" style="margin-bottom:12px">
          <div class="section-header" style="margin-bottom:12px">
            <div class="section-title">공문 → 쉬운 말 변환</div>
            <div class="badge" style="background:rgba(16,185,129,.15);color:#10B981;font-size:.7rem">이장 · 복지사 · 생활지원사</div>
          </div>

          <!-- 방송 유형 카테고리 -->
          <div style="margin-bottom:12px">
            <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:8px;font-weight:600">방송 유형</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${BROADCAST_CATEGORIES.map(cat => `
                <button class="broadcast-cat-btn${cat.id === 'welfare' ? ' active' : ''}"
                  data-cat="${cat.id}" data-color="${cat.color}"
                  onclick="selectBroadcastCategory('${cat.id}', this)">
                  ${cat.icon} ${esc(cat.label)}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- 긴급 배지 (재난·기상 선택 시) -->
          <div id="urgent-broadcast-badge" style="display:none;align-items:center;gap:8px;padding:8px 12px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:var(--radius-sm);margin-bottom:10px">
            <span style="font-size:1rem">🚨</span>
            <span style="font-size:.8rem;font-weight:700;color:#EF4444">긴급 방송 모드 — 변환 즉시 발송 권장</span>
          </div>

          <!-- 빠른 템플릿 -->
          <div style="margin-bottom:12px">
            <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:8px;font-weight:600">빠른 템플릿</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px" id="broadcast-template-btns">
              ${BROADCAST_TEMPLATES.welfare.map(n => `
                <button class="voice-speed-btn" onclick="selectNoticeTemplate('${n.id}')" style="font-size:.78rem;padding:6px 14px">${esc(n.label)}</button>
              `).join('')}
            </div>
          </div>

          <!-- 내용 입력 -->
          <div style="margin-bottom:12px">
            <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:6px;font-weight:600">내용 입력</div>
            <textarea
              id="notice-input"
              style="width:100%;min-height:90px;padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:.84rem;resize:vertical;font-family:inherit;box-sizing:border-box;line-height:1.6"
              placeholder="공문 또는 공지사항을 붙여넣으세요...&#10;예) 기초연금 신청 기간이 도래하였으니..."
            ></textarea>
          </div>

          <button
            class="btn btn-primary btn-full"
            id="btn-convert-notice"
            onclick="convertNotice()"
          >
            🤖 쉬운 말로 변환하기
          </button>
        </div>

        <!-- 변환 결과 -->
        <div id="broadcast-result-wrap" style="display:none">
          <div class="card" style="margin-bottom:12px">
            <div class="section-header" style="margin-bottom:10px">
              <div class="section-title">✅ 변환된 방송문</div>
              <button class="btn btn-ghost btn-sm" onclick="copyBroadcastText()">📋 복사</button>
            </div>
            <div
              id="broadcast-converted-text"
              style="font-size:.9rem;line-height:1.8;color:var(--text);background:var(--bg2);padding:14px;border-radius:var(--radius-sm);white-space:pre-wrap;margin-bottom:14px;border-left:3px solid var(--primary)"
            ></div>

            <!-- 재생 / 전화 발송 버튼 -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <button class="btn btn-primary" onclick="playBroadcastText()" id="btn-play-broadcast">
                🔊 방송 재생
              </button>
              <button class="btn" style="background:#10B981;color:#fff;border:none" onclick="simulatePhoneCall()">
                📞 전화 발송
              </button>
            </div>
          </div>

          <!-- 전화 발송 시뮬레이션 -->
          <div id="phone-simulation" style="display:none">
            <div class="card">
              <div style="font-size:.88rem;font-weight:700;margin-bottom:12px">📞 자동 전화 발송 시뮬레이션</div>
              <div id="phone-sim-list"></div>
            </div>
          </div>
        </div>

        <div class="voice-accessibility-note">
          <span>📣</span>
          <span>어르신도 이해하기 쉬운 말로 복지 공지를 자동 변환합니다</span>
        </div>

      </div><!-- /voice-tab-broadcast -->

      <!-- ─── 맞춤 라디오 탭 ────────────────────────────────── -->
      <div id="voice-tab-radio" style="display:none">

        <!-- 라디오 헤더 -->
        <div class="voice-header">
          <div class="voice-badge">LIVE</div>
          <div class="voice-station">${esc(region)} 복지에코 음성 안내</div>
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

        ${!p ? `
          <div class="card" style="text-align:center;padding:24px;margin-top:16px">
            <div style="font-size:1.6rem;margin-bottom:12px">👤</div>
            <div style="font-weight:700;margin-bottom:6px">프로필을 입력해주세요</div>
            <div style="font-size:.83rem;color:var(--text-muted);margin-bottom:16px">지역과 상황에 맞는<br>맞춤 복지 소식을 들을 수 있어요</div>
            <button class="btn btn-primary btn-full" onclick="navigateTo('profile')">프로필 입력하기</button>
          </div>` : ''}

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

        <div class="voice-accessibility-note">
          <span>♿</span>
          <span>어르신 · 디지털 취약계층을 위한 음성 복지 안내 서비스입니다</span>
        </div>

      </div><!-- /voice-tab-radio -->

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
  if (Voice.audioEl) {
    Voice.audioEl.pause();
  } else {
    Voice.synth.pause();
  }
  Voice.isPaused = true;
  Voice.isPlaying = false;
  setVoiceUIState('paused');
}

// ── 재개 ──────────────────────────────────────────────────────────
function resumeVoice() {
  if (Voice.audioEl) {
    Voice.audioEl.play();
  } else {
    Voice.synth.resume();
  }
  Voice.isPaused = false;
  Voice.isPlaying = true;
  setVoiceUIState('playing');
}

// ── 정지 ──────────────────────────────────────────────────────────
function stopVoice() {
  if (Voice.audioEl) {
    Voice.audioEl.pause();
    Voice.audioEl.currentTime = 0;
    Voice.audioEl = null;
  }
  Voice.synth.cancel();
  Voice.isPlaying = false;
  Voice.isPaused = false;
  setVoiceUIState('idle');
}

// ── OpenAI TTS (tts-1-hd, shimmer 목소리) ────────────────────────
async function openAITTS(text, voice = 'shimmer') {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `TTS ${res.status}`);
  }

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  return new Audio(url);
}

// ── 실제 음성 재생 (OpenAI TTS → Web Speech fallback) ────────────
async function speakText(text) {
  // 기존 재생 중단
  if (Voice.audioEl) { Voice.audioEl.pause(); Voice.audioEl = null; }
  Voice.synth.cancel();

  setVoiceUIState('loading');

  try {
    // OpenAI TTS
    const audio = await openAITTS(text);
    Voice.audioEl = audio;

    audio.onended = () => {
      Voice.isPlaying = false;
      Voice.isPaused  = false;
      Voice.audioEl   = null;
      setVoiceUIState('done');
    };
    audio.onerror = (e) => {
      console.warn('[TTS] 재생 오류:', e);
      Voice.isPlaying = false;
      Voice.audioEl   = null;
      setVoiceUIState('idle');
    };

    audio.play();
    Voice.isPlaying = true;
    Voice.isPaused  = false;
    setVoiceUIState('playing');

    // 스크립트 표시
    const scriptWrap = document.getElementById('voice-script-wrap');
    const scriptText = document.getElementById('voice-script-text');
    if (scriptWrap && Voice.script) {
      scriptWrap.style.display = 'block';
      if (scriptText) scriptText.textContent = Voice.script;
    }
  } catch (e) {
    console.warn('[TTS] OpenAI 실패, Web Speech 폴백:', e);
    _speakWithWebSpeech(text);
  }
}

// ── Web Speech API 폴백 ───────────────────────────────────────────
function _speakWithWebSpeech(text) {
  Voice.synth.cancel();
  const sentences = text.split(/(?<=[.!?。])\s+/).filter(s => s.trim());
  let idx = 0;

  function speakNext() {
    if (idx >= sentences.length) {
      Voice.isPlaying = false;
      Voice.isPaused  = false;
      setVoiceUIState('done');
      return;
    }
    const utt   = new SpeechSynthesisUtterance(sentences[idx]);
    utt.lang    = 'ko-KR';
    utt.rate    = Voice.rate;
    utt.onend   = () => { idx++; speakNext(); };
    utt.onerror = () => { idx++; speakNext(); };
    highlightScriptLine(idx, sentences.length);
    Voice.synth.speak(utt);
  }

  Voice.isPlaying = true;
  Voice.isPaused  = false;
  setVoiceUIState('playing');
  speakNext();
}

// ── 스크립트 빌드 ─────────────────────────────────────────────────
async function buildVoiceScript() {
  const p = APP.profile;
  try {
    return await buildScriptWithGPT(p);
  } catch (e) {
    console.warn('[Voice] GPT 실패, 데모 모드:', e);
    return buildDemoScript(p);
  }
}

// ── GPT로 복지 라디오 스크립트 생성 ──────────────────────────────
async function buildScriptWithGPT(profile) {
  const news = getVoiceNewsList(profile);
  const benefits = (APP.matchedBenefits.length ? APP.matchedBenefits : matchBenefits()).slice(0, 3);
  const region = profile?.region || '우리 동네';
  const name = profile?.name || '주민';

  const prompt = `다음 조건에 맞는 복지 라디오 방송 스크립트를 작성해주세요.

청취자 정보:
- 이름: ${name}님 / 지역: ${region} / 나이: ${profile?.age || ''}세
- 상황: ${[profile?.disability&&'장애인',profile?.elderly&&'노인부양',profile?.hasChildren&&'자녀있음',profile?.pregnant&&'임신중'].filter(Boolean).join(', ')||'일반'}

오늘의 혜택 소식:
${benefits.map(b => `- ${b.name}: ${b.amount}`).join('\n')}

뉴스:
${news.slice(0,3).map(n => `- ${n.title}`).join('\n')}

요구사항:
- "안녕하세요, ${name}님!" 으로 시작, 지역명(${region}) 언급
- 핵심 혜택 2~3개를 쉬운 말로 설명, 신청 방법(복지로 또는 주민센터)으로 마무리
- 총 300~400자, 한국어 존댓말, 이해하기 쉬운 단어만 사용`;

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: '당신은 따뜻한 복지 라디오 방송 작가입니다. 어르신도 이해하기 쉬운 말로 복지 혜택을 안내하는 방송 스크립트를 작성합니다.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 600,
    }),
    signal: AbortSignal.timeout(20000),
  });

  const data = await res.json();
  if (!data.success || !data.content) throw new Error(data.error || 'empty response');
  return data.content;
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

// ── 탭 전환 ──────────────────────────────────────────────────────
function switchVoiceTab(tab) {
  document.getElementById('voice-tab-broadcast').style.display = tab === 'broadcast' ? 'block' : 'none';
  document.getElementById('voice-tab-radio').style.display = tab === 'radio' ? 'block' : 'none';
  document.getElementById('vtab-broadcast').classList.toggle('active', tab === 'broadcast');
  document.getElementById('vtab-radio').classList.toggle('active', tab === 'radio');
  if (tab === 'radio' && (Voice.isPlaying || Voice.isPaused)) {
    Voice.synth.cancel();
    Voice.isPlaying = false;
    Voice.isPaused = false;
  }
}

// ── 방송 카테고리 전환 ────────────────────────────────────────────
function selectBroadcastCategory(catId, btn) {
  VoiceBroadcast.category = catId;

  document.querySelectorAll('.broadcast-cat-btn').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');

  const templates = BROADCAST_TEMPLATES[catId] || [];
  const container = document.getElementById('broadcast-template-btns');
  if (container) {
    container.innerHTML = templates.map(n =>
      `<button class="voice-speed-btn" onclick="selectNoticeTemplate('${n.id}')" style="font-size:.78rem;padding:6px 14px">${esc(n.label)}</button>`
    ).join('');
  }

  const cat = BROADCAST_CATEGORIES.find(c => c.id === catId);
  const badge = document.getElementById('urgent-broadcast-badge');
  if (badge) badge.style.display = cat?.urgency === 'high' ? 'flex' : 'none';

  const convertBtn = document.getElementById('btn-convert-notice');
  if (convertBtn) {
    convertBtn.style.background = cat?.urgency === 'high' ? '#EF4444' : '';
    convertBtn.style.borderColor = cat?.urgency === 'high' ? '#EF4444' : '';
  }

  const placeholders = {
    welfare:  '공문 내용을 붙여넣으세요...\n예) 기초연금 신청 기간이 도래하였으니...',
    disaster: '재난·안전 공문을 입력하세요...\n예) 태풍 북상으로 강풍이 예상됩니다...',
    health:   '건강·의료 공지를 입력하세요...\n예) 독감 예방접종 사업이 시행됩니다...',
    weather:  '기상 특보 내용을 입력하세요...\n예) 폭염특보 발효로 기온 35도 예상...',
    life:     '생활 안내 공문을 입력하세요...\n예) 상수도 시설 점검으로 단수가...',
    agri:     '농어업 안내를 입력하세요...\n예) 공동 방제 작업이 실시됩니다...',
  };
  const textarea = document.getElementById('notice-input');
  if (textarea) textarea.placeholder = placeholders[catId] || '내용을 입력하세요...';
}

// ── 공지 템플릿 선택 ─────────────────────────────────────────────
function selectNoticeTemplate(id) {
  const category = VoiceBroadcast.category || 'welfare';
  const templates = BROADCAST_TEMPLATES[category] || [];
  const notice = templates.find(n => n.id === id);
  if (!notice) return;
  const el = document.getElementById('notice-input');
  if (el) { el.value = notice.official; el.focus(); }
}

// ── 공지 변환 메인 ────────────────────────────────────────────────
async function convertNotice() {
  const input = document.getElementById('notice-input');
  const text = input?.value.trim();
  if (!text) { toast('공문 내용을 입력해주세요', 'warn'); return; }
  if (VoiceBroadcast.isConverting) return;

  VoiceBroadcast.isConverting = true;
  const btn = document.getElementById('btn-convert-notice');
  if (btn) { btn.disabled = true; btn.textContent = '🤖 변환 중...'; }

  VoiceBroadcast.originalText = text;

  try {
    VoiceBroadcast.convertedText = await convertWithGPT(text);
    showBroadcastResult(VoiceBroadcast.convertedText);
  } catch (e) {
    VoiceBroadcast.convertedText = convertNoticeDemo(text);
    showBroadcastResult(VoiceBroadcast.convertedText);
  } finally {
    VoiceBroadcast.isConverting = false;
    if (btn) { btn.disabled = false; btn.textContent = '🤖 어르신 말로 변환하기'; }
  }
}

// ── GPT로 마을방송 변환 ────────────────────────────────────────────
async function convertWithGPT(text) {
  const region = APP.profile?.region || '우리 동네';
  const cat = VoiceBroadcast.category || 'welfare';
  const catInfo = BROADCAST_CATEGORIES.find(c => c.id === cat) || {};
  const isUrgent = catInfo.urgency === 'high';

  const urgentPrefix = isUrgent
    ? '【긴급 방송】 즉각 전파가 필요한 내용입니다. 첫 문장에 "긴급 안내!"를 반드시 포함하고, 행동 지침을 명확하게 전달하세요.\n\n'
    : '';

  const categoryGuide = {
    welfare:  '복지 혜택 안내 — 어르신도 이해하기 쉬운 따뜻한 말투, 신청처(주민센터/복지로) 안내 포함',
    health:   '건강·의료 안내 — 대상자와 장소·시간 명확히, 무료 여부 강조',
    life:     '생활 안내 — 영향 시간대와 대처 방법 중심, 불편 최소화 안내',
  }[cat] || '주민 안내';

  const prompt = `${urgentPrefix}다음 행정 공문을 마을 방송 멘트로 변환해주세요.

방송 유형: ${catInfo.label || cat} (${categoryGuide})
지역: ${region}

원문:
"${text}"

요구사항:
- "${region} 주민 여러분~" 또는 "어르신~" 으로 시작
- 어려운 행정 용어를 쉬운 생활 언어로 바꾸기
- 핵심 정보(날짜/장소/연락처/행동지침)를 빠뜨리지 않기
- 200~300자, 마을 방송으로 읽을 수 있는 분량
- ${isUrgent ? '긴박하고 명확한 말투' : '따뜻하고 친근한 말투'}

변환된 방송문만 출력하세요.`;

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: '당신은 지역 공공 AI 방송 작가입니다. 행정 공문을 주민이 바로 이해하고 행동할 수 있는 마을 방송 멘트로 변환합니다.' },
        { role: 'user', content: prompt },
      ],
      temperature: isUrgent ? 0.5 : 0.75,
      max_tokens: 400,
    }),
    signal: AbortSignal.timeout(20000),
  });

  const data = await res.json();
  if (!data.success || !data.content) throw new Error(data.error || 'empty response');
  return data.content;
}

// ── 데모 변환 (API 키 없을 때) ───────────────────────────────────
function convertNoticeDemo(text) {
  const region = APP.profile?.region || '우리 동네';
  const cat = VoiceBroadcast.category || 'welfare';

  // ── 재난·안전 ──────────────────────────────────────────────────
  if (cat === 'disaster' || text.includes('태풍') || text.includes('침수') || text.includes('대피')) {
    if (text.includes('태풍') || text.includes('강풍')) {
      return `긴급 안내! ${region} 주민 여러분~\n\n태풍이 접근하고 있습니다. 지금 바로 외출을 자제하시고 창문을 단단히 닫아주세요. 저지대나 침수 위험 지역에 계신 분들은 즉시 마을회관으로 대피해 주세요.\n\n긴급 상황 시 재난안전 전화 119로 연락하시면 됩니다!`;
    }
    if (text.includes('폭염') || text.includes('猛暑') || text.includes('무더위')) {
      return `긴급 안내! ${region} 주민 여러분~\n\n폭염 경보가 발령되었습니다! 낮 12시~오후 5시 사이에는 외출을 삼가 주세요. 어르신과 어린이는 특히 조심하세요.\n\n가까운 무더위쉼터(마을회관·경로당)에서 더위를 피하시고, 물 자주 드세요. 응급상황은 119!`;
    }
    if (text.includes('한파') || text.includes('동파') || text.includes('결빙')) {
      return `긴급 안내! ${region} 주민 여러분~\n\n한파 경보가 발령되었습니다. 수도 동파 예방을 위해 수도꼭지를 조금씩 틀어두시고, 보일러를 확인해주세요.\n\n홀로 사시는 어르신들, 주변에 안부 확인 부탁드립니다. 도움 필요하시면 주민센터 전화주세요!`;
    }
    if (text.includes('산불')) {
      return `긴급 안내! ${region} 주민 여러분~\n\n인근에 산불이 발생하였습니다! 즉시 대피하시고 연기가 있는 방향으로 이동하지 마세요.\n\n대피 장소: 마을회관 또는 읍면사무소. 산불 신고는 119, 경찰은 112로 연락하세요!`;
    }
    return `긴급 안내! ${region} 주민 여러분~\n\n재난 상황이 발생하였습니다. 안전한 장소로 이동하시고 당국의 안내에 따라주세요.\n\n긴급상황은 재난안전 전화 119, 자세한 사항은 주민센터로 문의해주세요!`;
  }

  // ── 건강·의료 ──────────────────────────────────────────────────
  if (cat === 'health' || text.includes('예방접종') || text.includes('건강검진') || text.includes('감염병')) {
    if (text.includes('독감') || text.includes('인플루엔자')) {
      return `${region} 주민 여러분께 알립니다~\n\n독감 예방주사 맞으실 시간이에요! 만 65세 이상 어르신과 어린이는 가까운 병원에서 무료로 맞을 수 있어요.\n\n신분증 챙기셔서 가까운 의원에 예약하시면 됩니다. 건강 지키세요!`;
    }
    if (text.includes('건강검진') || text.includes('검진')) {
      return `${region} 주민 여러분께 알립니다~\n\n올해 국가 건강검진 기간이에요. 2년마다 한 번씩 무료로 받으실 수 있으니 꼭 챙겨 받으세요!\n\n가까운 병원이나 보건소에서 받으실 수 있어요. 건강보험공단 전화 1577-1000으로 문의하세요!`;
    }
    if (text.includes('무더위쉼터') || text.includes('쉼터')) {
      return `${region} 주민 여러분께 알립니다~\n\n여름 무더위쉼터가 운영됩니다. 경로당·마을회관·도서관 등에서 시원하게 쉬실 수 있어요.\n\n특히 혼자 사시는 어르신들, 낮에는 쉼터에서 더위 피하세요. 음료수도 준비되어 있습니다!`;
    }
    return `${region} 주민 여러분께 알립니다~\n\n건강 관련 중요 안내입니다. 대상이 되시는 분들은 빠뜨리지 마시고 참여해주세요.\n\n자세한 내용은 보건소(☎ 지역보건소) 또는 주민센터로 문의하시면 도움드립니다!`;
  }

  // ── 기상 특보 ──────────────────────────────────────────────────
  if (cat === 'weather' || text.includes('미세먼지') || text.includes('대설') || text.includes('집중호우')) {
    if (text.includes('미세먼지') || text.includes('황사')) {
      return `${region} 주민 여러분께 알립니다~\n\n오늘 미세먼지 농도가 매우 높습니다. 외출 시 반드시 마스크를 착용해주세요.\n\n어르신·어린이·호흡기 질환자는 외출을 자제하시고, 외출 후 손발을 깨끗이 씻어주세요!`;
    }
    if (text.includes('대설') || text.includes('폭설') || text.includes('눈')) {
      return `${region} 주민 여러분께 알립니다~\n\n많은 눈이 예상됩니다. 미리 내 집 앞 눈을 치워주시고, 빙판길 낙상사고에 조심해주세요.\n\n농작물·시설물 피해 예방을 위해 지붕 위 눈도 미리 치워두시면 좋아요!`;
    }
    if (text.includes('집중호우') || text.includes('호우') || text.includes('폭우')) {
      return `긴급 안내! ${region} 주민 여러분~\n\n집중호우가 예보되어 있습니다. 하천·저지대 주민분들은 미리 대피 준비해주세요.\n\n농경지·시설물 점검하시고, 침수 위험 지역은 즉시 대피하세요. 긴급상황은 119!`;
    }
    return `${region} 주민 여러분께 알립니다~\n\n기상 특보가 발효되었습니다. 외출 시 날씨에 맞는 준비를 하시고 안전에 유의해주세요.\n\n최신 기상 정보는 기상청 날씨 앱이나 131로 확인하실 수 있습니다!`;
  }

  // ── 생활 안내 ──────────────────────────────────────────────────
  if (cat === 'life' || text.includes('단수') || text.includes('정전') || text.includes('쓰레기')) {
    if (text.includes('단수') || text.includes('수도')) {
      return `${region} 주민 여러분께 알립니다~\n\n수도 시설 점검으로 잠시 물 공급이 중단됩니다. 미리 물을 받아두시고 불편을 최소화해주세요.\n\n작업 완료 후 바로 공급 재개됩니다. 긴급 문의는 상수도 사업소로 연락해주세요!`;
    }
    if (text.includes('정전') || text.includes('전기')) {
      return `${region} 주민 여러분께 알립니다~\n\n전기 설비 점검으로 잠시 정전이 있을 예정입니다. 중요한 전자기기 플러그를 미리 빼두시고 대비해주세요.\n\n긴급 전기 문의는 한전 고객센터 123으로 연락하시면 됩니다!`;
    }
    if (text.includes('쓰레기') || text.includes('폐기물') || text.includes('수거')) {
      return `${region} 주민 여러분께 알립니다~\n\n쓰레기 수거 일정이 변경되었습니다. 지정된 날짜와 장소에 분리수거해 주시면 감사합니다.\n\n대형 폐기물 배출은 주민센터에 미리 신청하시면 처리해드립니다!`;
    }
    return `${region} 주민 여러분께 알립니다~\n\n생활 관련 중요 안내입니다. 주민 여러분의 협조를 부탁드립니다.\n\n자세한 문의는 주민센터 또는 읍면사무소로 연락해주세요!`;
  }

  // ── 농어업 ──────────────────────────────────────────────────────
  if (cat === 'agri' || text.includes('농약') || text.includes('방제') || text.includes('출어') || text.includes('농기계')) {
    if (text.includes('농약') || text.includes('방제')) {
      return `${region} 농업인 여러분께 알립니다~\n\n공동 병해충 방제 작업이 실시됩니다. 방제 시간에 밭이나 논에 들어가지 마시고, 어린이와 반려동물도 접근하지 않도록 해주세요.\n\n농약 보관에 주의하시고, 작업 후 반드시 손발을 씻어주세요!`;
    }
    if (text.includes('공동수확') || text.includes('수확')) {
      return `${region} 농업인 여러분께 알립니다~\n\n공동 수확 작업 일정을 안내드립니다. 참여 의사가 있으신 분들은 마을회관에서 사전 신청해 주세요.\n\n장갑과 작업복 챙겨오시면 됩니다. 참여해주셔서 감사합니다!`;
    }
    if (text.includes('농기계') || text.includes('기계')) {
      return `${region} 농업인 여러분께 알립니다~\n\n농기계 무상 수리 서비스가 실시됩니다. 농기계가 고장나신 분들은 신청해 주세요!\n\n신청은 농업기술센터 또는 마을이장님께 말씀해주시면 됩니다.`;
    }
    if (text.includes('출어') || text.includes('조업')) {
      return `${region} 어업인 여러분께 알립니다~\n\n오늘 출어 관련 중요 안내입니다. 기상 상황을 꼭 확인하시고, 안전 장비를 갖추고 출항해주세요.\n\n해양 기상 정보는 해양기상 전화 1588-6855로 확인하실 수 있습니다!`;
    }
    return `${region} 농어업인 여러분께 알립니다~\n\n농어업 관련 중요 안내사항입니다. 자세한 내용은 농업기술센터 또는 마을이장님께 문의해주세요!`;
  }

  // ── 복지 (기본) ─────────────────────────────────────────────────
  if (text.includes('기초연금') || text.includes('65세')) {
    return `어르신~! ${region} 주민 여러분께 알려드립니다.\n\n이번 달 기초연금 신청 기간이에요. 만 65세 이상이신 어르신들은 신분증이랑 통장 챙기셔서 주민센터 오시면 도와드립니다~\n\n궁금한 점은 복지 상담 전화 129번으로 전화하시면 24시간 도와드려요!`;
  }
  if (text.includes('청년') || text.includes('월세')) {
    return `${region} 청년 여러분께 알립니다!\n\n월세 내시는 만 19살~34살 청년이라면, 정부에서 월 최대 20만 원까지 1년간 도와줄 수 있어요.\n\n주민센터나 복지로 홈페이지에서 신청하세요~`;
  }
  if (text.includes('에너지') || text.includes('바우처')) {
    return `${region} 주민 여러분께 알립니다.\n\n겨울철 에너지비용 걱정되시는 분들, 에너지바우처를 신청해보세요! 의료급여 받으시는 어르신이나 장애인 가정이 대상이에요.\n\n주민센터에 오시면 자세히 설명해드릴게요~`;
  }
  if (text.includes('긴급복지') || text.includes('위기가구')) {
    return `${region} 주민 여러분께 알립니다.\n\n갑작스러운 어려움으로 생활이 힘드신 분들, 긴급복지 지원 신청하세요. 실직·질병·재난 등으로 위기에 처한 가구를 즉시 도와드립니다.\n\n주민센터나 복지 상담 전화 129번으로 연락주시면 바로 도움드릴게요!`;
  }

  return `${region} 주민 여러분께 알립니다.\n\n` +
    text
      .replace(/하시기 바랍니다/g, '해주세요')
      .replace(/이행하시/g, '하시')
      .replace(/내방하시/g, '오시')
      .replace(/지참하시기 바랍니다/g, '가지고 오시면 됩니다')
      .replace(/실시합니다/g, '합니다')
      .replace(/에 한합니다/g, '이면 돼요')
      .replace(/제출하시기 바랍니다/g, '내시면 됩니다')
      .replace(/문의하시기 바랍니다/g, '문의해주세요') +
    '\n\n궁금한 점은 주민센터나 복지 상담 전화 129번으로 문의해주세요!';
}

// ── 변환 결과 표시 ────────────────────────────────────────────────
function showBroadcastResult(text) {
  const wrap = document.getElementById('broadcast-result-wrap');
  const textEl = document.getElementById('broadcast-converted-text');
  if (wrap) wrap.style.display = 'block';
  if (textEl) textEl.textContent = text;
  wrap?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  toast('✅ 방송문 변환 완료!', 'success');
}

// ── 방송문 복사 ───────────────────────────────────────────────────
function copyBroadcastText() {
  const text = VoiceBroadcast.convertedText;
  if (!text) return;
  navigator.clipboard?.writeText(text).then(() => toast('방송문이 복사되었습니다', 'success'));
}

// ── 변환된 방송문 재생 ────────────────────────────────────────────
function playBroadcastText() {
  const text = VoiceBroadcast.convertedText;
  if (!text) return;
  Voice.synth.cancel();
  Voice.script = text;
  speakText(text);
  const btn = document.getElementById('btn-play-broadcast');
  if (btn) btn.textContent = '🔊 방송 중...';
}

// ── 전화 발송 시뮬레이션 ──────────────────────────────────────────
function simulatePhoneCall() {
  const sim = document.getElementById('phone-simulation');
  if (!sim) return;
  sim.style.display = 'block';
  sim.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const residents = [
    { name: '김영자', age: 72, phone: '010-****-1234', status: 'pending' },
    { name: '박수덕', age: 68, phone: '010-****-5678', status: 'pending' },
    { name: '이순복', age: 75, phone: '010-****-9012', status: 'pending' },
    { name: '최정남', age: 81, phone: '010-****-3456', status: 'pending' },
    { name: '강말순', age: 69, phone: '010-****-7890', status: 'pending' },
  ];

  const list = document.getElementById('phone-sim-list');
  if (!list) return;

  function renderSimList(data) {
    list.innerHTML = data.map(r => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">
          ${r.status === 'done' ? '✅' : r.status === 'calling' ? '📞' : '👤'}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:.88rem;font-weight:700">${esc(r.name)} (${r.age}세)</div>
          <div style="font-size:.77rem;color:var(--text-muted)">${esc(r.phone)}</div>
        </div>
        <div style="font-size:.77rem;font-weight:600;white-space:nowrap;color:${r.status === 'done' ? '#10B981' : r.status === 'calling' ? 'var(--warn)' : 'var(--text-dim)'}">
          ${r.status === 'done' ? '발송 완료' : r.status === 'calling' ? '발신 중...' : '대기'}
        </div>
      </div>
    `).join('');
  }

  renderSimList(residents);

  residents.forEach((r, i) => {
    setTimeout(() => { residents[i].status = 'calling'; renderSimList(residents); }, i * 1200);
    setTimeout(() => {
      residents[i].status = 'done';
      renderSimList(residents);
      if (i === residents.length - 1) {
        toast(`📞 ${residents.length}명에게 방송 발송 완료!`, 'success', 3000);
      }
    }, i * 1200 + 900);
  });
}
