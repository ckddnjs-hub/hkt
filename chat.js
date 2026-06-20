'use strict';
// ══════════════════════════════════════════════════════════════════════
//  chat.js — AI 채팅 (Railway 스트리밍)
// ══════════════════════════════════════════════════════════════════════

let _chatHistory = [];
let _chatStreaming = false;

function renderChat() {
  const el = document.getElementById('chat-messages');
  if (!el) return;

  if (_chatHistory.length === 0) {
    el.innerHTML = `
      <div style="text-align:center;padding:32px 16px">
        <div style="font-size:3rem;margin-bottom:12px">🤖</div>
        <div style="font-weight:700;margin-bottom:8px">복지혜택 AI 상담사</div>
        <div style="font-size:.83rem;color:var(--text-muted);line-height:1.7">
          궁금한 혜택을 자유롭게 물어보세요<br>
          입력한 내 정보를 바탕으로 맞춤 답변을 드려요
        </div>
      </div>
      <div style="padding:0 4px;display:flex;flex-direction:column;gap:8px">
        ${['출산 후 받을 수 있는 혜택 알려줘', '월세 지원 신청 방법이 궁금해', '기초연금 받을 수 있나요?', '취업 준비 중 지원받을 수 있는 것은?'].map(q => `
          <button style="text-align:left;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;font-family:inherit;font-size:.83rem;color:var(--text);cursor:pointer;transition:all .2s" onclick="chatQuickQuery('${esc(q)}')">
            💬 ${esc(q)}
          </button>`).join('')}
      </div>`;
    return;
  }

  el.innerHTML = _chatHistory.map(h => `
    <div class="chat-bubble ${h.role === 'user' ? 'user' : 'ai'}">
      ${h.role === 'ai' ? _chatFormatAI(h.content) : esc(h.content)}
    </div>`).join('');
  el.scrollTop = el.scrollHeight;
}

function _chatFormatAI(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>')
    .replace(/^### (.*)/gm, '<div style="font-weight:900;margin:6px 0 2px">$1</div>')
    .replace(/^- (.*)/gm, '<div style="padding-left:10px">• $1</div>');
}

async function chatSend() {
  if (_chatStreaming) return;
  const input = document.getElementById('chat-input');
  const msg = input?.value.trim();
  if (!msg) return;
  input.value = '';
  input.style.height = 'auto';
  await _chatDoSend(msg);
}

function chatOnKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatSend();
  }
}

function chatQuickQuery(q) {
  navigateTo('chat');
  setTimeout(() => _chatDoSend(q), 100);
}

async function _chatDoSend(msg) {
  if (_chatStreaming) return;
  _chatStreaming = true;

  _chatHistory.push({ role: 'user', content: msg });

  const el = document.getElementById('chat-messages');
  if (!el) { _chatStreaming = false; return; }

  // 사용자 메시지 렌더
  el.innerHTML += `<div class="chat-bubble user">${esc(msg)}</div>`;

  // AI 타이핑 인디케이터
  const typingId = 'typing-' + Date.now();
  el.innerHTML += `<div class="chat-bubble ai" id="${typingId}"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  el.scrollTop = el.scrollHeight;

  try {
    // 전략 검색 이후엔 /api/personal/feedback, 아니면 /api/personal/search 신규 호출
    const hasSearched = !!(_dashStrategyCache?.benefits?.length);
    const endpoint    = hasSearched ? '/api/personal/feedback' : '/api/personal/search';

    if (!_searchThreadId) {
      _searchThreadId = (ME?.id || 'anon') + '-' + Date.now();
    }

    const body = hasSearched
      ? { thread_id: _searchThreadId, message: msg }
      : {
          thread_id:    _searchThreadId,
          user_profile: typeof _buildUserProfile === 'function' ? _buildUserProfile(MY_PROFILE || {}) : {},
          message:      msg,
        };

    const res = await fetch(`${RAILWAY_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(res.status);

    const data = await res.json();
    // feedback 응답: { reply } 또는 { presented_text } 또는 search 결과
    const aiText = data.reply || data.presented_text || data.message ||
      (data.results ? `검색 결과 ${data.results.length}건을 찾았어요.` : '응답을 받았어요.');

    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.innerHTML = _chatFormatAI(aiText);
    _chatHistory.push({ role: 'ai', content: aiText });

    // 검색 결과가 있으면 전략 캐시 갱신
    if (data.results) {
      if (typeof _mapResults === 'function') {
        const benefits = _mapResults(data.results);
        _dashStrategyCache = {
          ..._dashStrategyCache,
          benefits,
          presented_text: data.presented_text || '',
          strategy_summary: data.presented_text || '',
        };
      }
    }

  } catch (e) {
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.innerHTML = '⚠️ 연결에 실패했어요. 잠시 후 다시 시도해주세요.';
  } finally {
    _chatStreaming = false;
    el.scrollTop = el.scrollHeight;
  }
}

// 입력창 높이 자동 조절
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('chat-input');
  if (!input) return;
  input.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });
});
