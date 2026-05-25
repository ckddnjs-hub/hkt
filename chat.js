'use strict';

// ── 채팅 상태 ────────────────────────────────────────────────────────
const Chat = {
  messages: [],        // { role:'user'|'assistant', content, time, cards? }
  isTyping: false,
  sessionCtx: null,    // 빌드된 컨텍스트 캐시
  stt: null,
  isListening: false,
};

// ── 채팅 페이지 렌더링 ─────────────────────────────────────────────
function renderChatPage() {
  const page = document.getElementById('page-chat');
  if (!page) return;

  page.innerHTML = `
    <div class="chat-layout">
      <!-- 채팅 헤더 -->
      <div class="chat-header">
        <div class="chat-agent-info">
          <div class="chat-agent-avatar">🤖</div>
          <div>
            <div class="chat-agent-name">복지ON AI 상담사</div>
            <div class="chat-agent-status">
              <span class="status-dot"></span>
              NVIDIA NIM 멀티에이전트 기반
            </div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="clearChat()">초기화</button>
      </div>

      <!-- 메시지 목록 -->
      <div class="chat-messages" id="chat-messages">
        ${Chat.messages.length === 0 ? renderChatWelcome() : Chat.messages.map(renderMessage).join('')}
      </div>

      <!-- 빠른 질문 (메시지 없을 때만) -->
      ${Chat.messages.length === 0 ? `
        <div class="quick-questions" id="quick-questions">
          ${getQuickQuestions().map(q => `
            <button class="quick-q-btn" onclick="sendQuickQuestion(this,'${esc(q.text)}')">${q.icon} ${esc(q.text)}</button>
          `).join('')}
        </div>` : '<div id="quick-questions"></div>'}

      <!-- 입력창 -->
      <div class="chat-input-area">
        <div class="chat-input-wrap">
          <textarea
            id="chat-input"
            class="chat-input"
            placeholder="복지 혜택에 대해 물어보세요... (🎤 마이크로 말해도 됩니다)"
            rows="1"
            onkeydown="handleChatKey(event)"
            oninput="autoResizeTextarea(this)"
          ></textarea>
          <button class="chat-mic-btn" id="chat-mic-btn" onclick="toggleMicInput()" title="음성으로 말하기">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
          <button class="chat-send-btn" id="chat-send-btn" onclick="sendChatMessage()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div class="chat-input-hint">🎤 음성 입력 가능 · NVIDIA AI 복지 상담</div>
      </div>
    </div>
  `;

  scrollChatToBottom();
  document.getElementById('chat-input')?.focus();
}

// ── 웰컴 메시지 ───────────────────────────────────────────────────
function renderChatWelcome() {
  const name = APP.profile?.name ? `${APP.profile.name}님, ` : '';
  return `
    <div class="chat-welcome">
      <div class="chat-welcome-logo">🏛️</div>
      <div class="chat-welcome-title">안녕하세요!</div>
      <div class="chat-welcome-sub">
        ${name}저는 NVIDIA AI 기반 복지 상담사입니다.<br>
        어떤 복지 혜택이 궁금하신가요?
      </div>
      ${!APP.profile ? `
        <div class="chat-profile-hint">
          <span>💡</span>
          <span>프로필을 입력하면 더 정확한 맞춤 상담이 가능합니다</span>
          <button class="btn btn-sm btn-ghost" onclick="navigateTo('profile')">프로필 입력 →</button>
        </div>` : ''}
    </div>`;
}

// ── 빠른 질문 목록 ─────────────────────────────────────────────────
function getQuickQuestions() {
  const base = [
    { icon: '💰', text: '내가 받을 수 있는 혜택이 뭔가요?' },
    { icon: '🏠', text: '주거 관련 지원을 알고 싶어요' },
    { icon: '👶', text: '출산·육아 지원은 어떤 게 있나요?' },
    { icon: '💼', text: '실직 후 받을 수 있는 혜택은?' },
    { icon: '🔮', text: '앞으로 받게 될 혜택을 예측해줘' },
    { icon: '👥', text: '나 같은 사람들은 어떤 혜택 받아?' },
  ];
  const p = APP.profile;
  if (!p) return base;
  const personalized = [];
  if (parseInt(p.age) >= 65 || p.elderly) personalized.push({ icon: '👴', text: '기초연금 신청 방법 알려줘' });
  if (p.hasChildren) personalized.push({ icon: '📚', text: '자녀 교육 지원 혜택은?' });
  if (p.disability) personalized.push({ icon: '♿', text: '장애인 활동지원 신청하고 싶어요' });
  if (parseInt(p.incomePercent) <= 50) personalized.push({ icon: '🆘', text: '긴급 복지 지원이 필요해요' });
  return [...personalized, ...base].slice(0, 6);
}

// ── 메시지 렌더링 ──────────────────────────────────────────────────
function renderMessage(msg) {
  if (msg.role === 'user') {
    return `
      <div class="chat-msg chat-msg-user">
        <div class="chat-bubble chat-bubble-user">${esc(msg.content)}</div>
        <div class="chat-time">${msg.time || ''}</div>
      </div>`;
  }
  // assistant
  return `
    <div class="chat-msg chat-msg-assistant">
      <div class="chat-avatar-sm">🤖</div>
      <div class="chat-msg-body">
        <div class="chat-bubble chat-bubble-assistant">${formatAIResponse(msg.content)}</div>
        ${msg.cards?.length ? `
          <div class="chat-benefit-cards">
            ${msg.cards.map(b => renderChatBenefitCard(b)).join('')}
          </div>` : ''}
        <div class="chat-time">${msg.time || ''}</div>
      </div>
    </div>`;
}

// ── AI 응답 텍스트 포맷 (마크다운 기본 지원) ──────────────────────
function formatAIResponse(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

// ── 채팅 혜택 카드 (인라인 compact 버전) ──────────────────────────
function renderChatBenefitCard(b) {
  const cat = BENEFIT_CATEGORIES[b.category] || { icon: '📋', color: '#64748B' };
  return `
    <div class="chat-card" onclick="openBenefitDetail('${b.id}')">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.2rem">${cat.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:.85rem;font-weight:700;truncate">${esc(b.name)}</div>
          <div style="font-size:.75rem;color:var(--primary);font-weight:600">${esc(b.amount)}</div>
        </div>
        <span style="font-size:.7rem;color:var(--text-dim)">→</span>
      </div>
    </div>`;
}

// ── 타이핑 인디케이터 ─────────────────────────────────────────────
function showTypingIndicator() {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'chat-msg chat-msg-assistant';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="chat-avatar-sm">🤖</div>
    <div class="chat-bubble chat-bubble-assistant">
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>`;
  el.appendChild(div);
  scrollChatToBottom();
}
function removeTypingIndicator() {
  document.getElementById('typing-indicator')?.remove();
}

// ── 메시지 전송 ────────────────────────────────────────────────────
async function sendChatMessage(overrideText) {
  const input = document.getElementById('chat-input');
  const text = overrideText || input?.value.trim();
  if (!text || Chat.isTyping) return;

  // 빠른 질문 숨기기
  document.getElementById('quick-questions')?.remove();

  // 사용자 메시지 추가
  const userMsg = { role: 'user', content: text, time: nowTime() };
  Chat.messages.push(userMsg);
  appendMessage(userMsg);

  if (input) { input.value = ''; input.style.height = 'auto'; }

  const btn = document.getElementById('chat-send-btn');
  if (btn) btn.disabled = true;
  Chat.isTyping = true;
  showTypingIndicator();

  try {
    const { reply, relatedBenefits } = await getAIReply(text);
    removeTypingIndicator();
    const assistantMsg = {
      role: 'assistant',
      content: reply,
      cards: relatedBenefits,
      time: nowTime(),
    };
    Chat.messages.push(assistantMsg);
    appendMessage(assistantMsg);
  } catch (e) {
    removeTypingIndicator();
    const errMsg = {
      role: 'assistant',
      content: '죄송합니다, 잠시 오류가 발생했습니다. 다시 시도해주세요.\n\n설정에서 NVIDIA API 키를 확인해주세요.',
      time: nowTime(),
    };
    Chat.messages.push(errMsg);
    appendMessage(errMsg);
  } finally {
    Chat.isTyping = false;
    if (btn) btn.disabled = false;
    document.getElementById('chat-input')?.focus();
  }
}

function appendMessage(msg) {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  // 웰컴 제거
  el.querySelector('.chat-welcome')?.remove();
  const div = document.createElement('div');
  div.innerHTML = renderMessage(msg);
  el.appendChild(div.firstElementChild);
  scrollChatToBottom();
}

// ── AI 응답 생성 ───────────────────────────────────────────────────
async function getAIReply(userText) {
  const nvidiaKey = APP.settings.nvidiaKey;

  // 관련 혜택 로컬 매칭 (키워드 기반)
  const relatedBenefits = findRelatedBenefits(userText);

  // 컨텍스트 빌드 (최초 1회 또는 프로필 변경 시)
  const systemPrompt = buildChatSystemPrompt();
  const messages = [
    { role: 'system', content: systemPrompt },
    ...Chat.messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
  ];

  if (!nvidiaKey) {
    // 데모 모드: 로컬 응답 생성
    return { reply: generateDemoReply(userText, relatedBenefits), relatedBenefits };
  }

  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${nvidiaKey}`,
    },
    body: JSON.stringify({
      model: 'meta/llama-3.1-70b-instruct',
      messages,
      temperature: 0.7,
      max_tokens: 800,
      stream: false,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content || '답변을 생성할 수 없습니다.';
  return { reply, relatedBenefits };
}

// ── 시스템 프롬프트 빌드 ───────────────────────────────────────────
function buildChatSystemPrompt() {
  const p = APP.profile;
  const matched = (APP.matchedBenefits || matchBenefits()).slice(0, 8);

  const profileInfo = p ? `
사용자 프로필:
- 이름: ${p.name || '미입력'} / 나이: ${p.age || '미입력'}세 / 지역: ${p.region || '미입력'}
- 가구: ${p.householdType || '미입력'} / 소득: 중위소득 ${p.incomePercent || '미입력'}%
- 주거: ${p.housing || '미입력'} / 취업: ${p.employment || '미입력'}
- 특수상황: ${[p.disability && '장애인', p.pregnant && '임신', p.hasChildren && '자녀있음', p.elderly && '노인부양'].filter(Boolean).join(', ') || '없음'}
현재 매칭된 혜택 (${matched.length}개): ${matched.map(b => b.name).join(', ')}
` : '(프로필 미입력)';

  return `당신은 대한민국 복지 혜택 전문 AI 상담사입니다.
NVIDIA AI 멀티에이전트 시스템의 일부로 동작합니다.

${profileInfo}

역할:
- 사용자의 질문에 따뜻하고 친절하게 답변하세요
- 복잡한 복지 용어를 쉽게 설명하세요
- 구체적인 금액, 기관명, 신청 방법을 명시하세요
- 사용자 프로필에 맞는 혜택을 우선 안내하세요
- 복지로(bokjiro.go.kr) 또는 주민센터 방문을 권유하세요
- 항상 한국어로 답변하고, 200자 내외로 간결하게 답변하세요
- 이모지를 적절히 사용해 친근하게 소통하세요
- 마크다운 **굵게** 사용 가능

주의: 법적 조언이 아닌 참고 정보임을 명심하세요.`;
}

// ── 키워드 기반 관련 혜택 탐색 ────────────────────────────────────
function findRelatedBenefits(text) {
  const keywords = {
    주거: ['housing', 'income'], 월세: ['housing'], 전세: ['housing'],
    출산: ['family'], 육아: ['family'], 아동: ['family', 'education'],
    취업: ['employment'], 실직: ['employment'], 청년: ['youth'],
    노인: ['elderly'], 연금: ['elderly'], 장애: ['disability'],
    의료: ['health'], 건강: ['health'], 소득: ['income'],
  };
  const categories = new Set();
  Object.entries(keywords).forEach(([kw, cats]) => {
    if (text.includes(kw)) cats.forEach(c => categories.add(c));
  });
  if (!categories.size) return [];

  const pool = APP.matchedBenefits.length ? APP.matchedBenefits : WELFARE_DB;
  return pool.filter(b => categories.has(b.category)).slice(0, 3);
}

// ── 데모 응답 생성 (API 키 없을 때) ──────────────────────────────
function generateDemoReply(text, relatedBenefits) {
  const p = APP.profile;
  const name = p?.name ? `${p.name}님` : '고객님';

  if (text.includes('받을 수 있') || text.includes('혜택')) {
    const count = (APP.matchedBenefits.length || matchBenefits().length);
    return `${name}의 프로필을 분석한 결과, **총 ${count}가지 혜택**을 받으실 수 있습니다! 🎯\n\n현재 가장 중요한 혜택들을 아래에 정리해드렸어요. 가장 먼저 **주거급여**와 **건강보험료 경감**을 신청하시는 걸 추천드립니다.\n\n신청은 **복지로(bokjiro.go.kr)** 또는 가까운 **주민센터**에서 하실 수 있어요! 💪`;
  }
  if (text.includes('주거') || text.includes('월세') || text.includes('집')) {
    return `주거 관련 혜택으로는 🏠\n\n**• 주거급여**: 소득 중위 48% 이하 가구, 월 최대 49만5천원\n**• 청년월세지원**: 19~34세, 월 최대 20만원 × 12개월\n**• 공공임대**: 무주택 저소득 가구 우선 배정\n\n${name}의 경우 ${p?.housing === 'rent' ? '임차 중이시니' : ''} 주거급여가 가장 적합해 보입니다. 신청하시겠어요?`;
  }
  if (text.includes('출산') || text.includes('육아') || text.includes('아기')) {
    return `출산·육아 지원 혜택입니다 👶\n\n**• 출산지원금**: 첫째 200만원, 둘째 300만원\n**• 부모급여**: 만 0세 월 100만원, 만 1세 월 50만원\n**• 아동수당**: 만 8세 미만 월 10만원\n**• 산모·신생아 건강관리**: 건강관리사 파견 서비스\n\n출산 예정이시라면 **산전**에 미리 신청해두시는 게 좋아요! 📋`;
  }
  if (text.includes('실직') || text.includes('취업') || text.includes('일자리')) {
    return `실직·취업 관련 지원입니다 💼\n\n**• 실업급여**: 고용보험 가입자, 최대 9개월\n**• 국민취업지원제도**: 구직촉진수당 월 50만원 × 6개월\n**• 직업훈련**: 내일배움카드 최대 500만원 지원\n\n고용센터(1350) 또는 work.go.kr에서 신청하세요. 서두를수록 좋습니다! 💪`;
  }
  if (text.includes('예측') || text.includes('앞으로') || text.includes('미래')) {
    const age = parseInt(p?.age || 30);
    return `${name}의 생애주기 복지 예측입니다 🔮\n\n**현재**: ${(APP.matchedBenefits.length || matchBenefits().length)}개 혜택 수령 가능\n**5년 후 (${age+5}세)**: 자산형성·주거안정 중점\n**10년 후 (${age+10}세)**: 건강·경력 관리 혜택\n**65세 이후**: 기초연금 + 노인돌봄서비스\n\n생애 전체 예상 복지 수혜액은 약 **${Math.round((100 - parseInt(p?.incomePercent||60)) * 30)}만원**입니다!`;
  }
  if (text.includes('비슷한') || text.includes('같은 사람') || text.includes('유사')) {
    const ageGroup = toAgeGroup(p?.age);
    return `${name}과 비슷한 **${esc(ageGroup)}** 계층 분석입니다 👥\n\n비슷한 조건의 분들 중:\n**• 73%**가 주거급여를 받고 있어요\n**• 61%**가 건강보험료 경감을 신청했어요\n**• 38%**만 에너지바우처를 알고 있어요 ← 놓치기 쉬운 혜택!\n\n에너지바우처는 복지로에서 쉽게 신청할 수 있어요. 연간 최대 30만원 상당! 💡`;
  }

  return `좋은 질문이에요! ${name}의 상황에 맞게 분석해드렸습니다. 🤖\n\n더 정확한 상담을 위해 **프로필**을 먼저 입력해주시면 맞춤 혜택을 더 정밀하게 안내해드릴 수 있어요.\n\n**복지 상담 전화**: 129 (보건복지상담센터, 24시간)`;
}

// ── 유틸 함수들 ────────────────────────────────────────────────────
function sendQuickQuestion(btn, text) {
  document.getElementById('quick-questions')?.remove();
  sendChatMessage(text);
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function scrollChatToBottom() {
  const el = document.getElementById('chat-messages');
  if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
}

function clearChat() {
  Chat.messages = [];
  renderChatPage();
}

function nowTime() {
  return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

// ── toAgeGroup 전역 참조 (db.js에 이미 있으나 chat.js에서도 사용) ──
function toAgeGroup(age) {
  const n = parseInt(age || 0);
  if (n < 20) return '10대';
  if (n < 30) return '20대';
  if (n < 40) return '30대';
  if (n < 50) return '40대';
  if (n < 65) return '50-64세';
  return '65세이상';
}

// ── 음성 입력 (STT) ──────────────────────────────────────────────────
function toggleMicInput() {
  if (Chat.isListening) {
    stopMicInput();
  } else {
    startMicInput();
  }
}

function startMicInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    toast('이 브라우저는 음성 입력을 지원하지 않습니다', 'warn');
    return;
  }

  Chat.stt = new SpeechRecognition();
  Chat.stt.lang = 'ko-KR';
  Chat.stt.continuous = false;
  Chat.stt.interimResults = true;

  Chat.stt.onstart = () => {
    Chat.isListening = true;
    document.getElementById('chat-mic-btn')?.classList.add('listening');
    toast('🎤 말씀해주세요...', 'info', 3000);
  };

  Chat.stt.onresult = (e) => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    const input = document.getElementById('chat-input');
    if (input) { input.value = transcript; autoResizeTextarea(input); }
  };

  Chat.stt.onend = () => {
    Chat.isListening = false;
    document.getElementById('chat-mic-btn')?.classList.remove('listening');
    const input = document.getElementById('chat-input');
    if (input?.value.trim()) setTimeout(() => sendChatMessage(), 300);
  };

  Chat.stt.onerror = (e) => {
    Chat.isListening = false;
    document.getElementById('chat-mic-btn')?.classList.remove('listening');
    if (e.error !== 'no-speech') toast('음성 인식 오류: ' + e.error, 'warn');
  };

  Chat.stt.start();
}

function stopMicInput() {
  Chat.stt?.stop();
  Chat.stt = null;
  Chat.isListening = false;
  document.getElementById('chat-mic-btn')?.classList.remove('listening');
}
