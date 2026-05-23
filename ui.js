'use strict';

// ── 안전한 HTML 이스케이프 ─────────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// ── 토스트 알림 ────────────────────────────────────────────────────
let toastTimer;
function toast(msg, type = 'info', duration = 3000) {
  const el = document.getElementById('toast');
  if (!el) return;
  clearTimeout(toastTimer);
  const icons = { success: '✓', error: '✕', warn: '⚠', info: 'ℹ' };
  el.className = `toast toast-${type} show`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span>${esc(msg)}</span>`;
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

// ── 로딩 스피너 ────────────────────────────────────────────────────
function showLoading(msg = '로딩 중...') {
  const el = document.getElementById('loading-screen');
  if (el) {
    el.querySelector('.ld-sub').textContent = msg;
    el.classList.remove('hidden');
  }
}
function hideLoading() {
  const el = document.getElementById('loading-screen');
  if (el) el.classList.add('hidden');
}

// ── 모달 ───────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
}
function closeAllModals() {
  document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
  document.body.style.overflow = '';
}

// ── 아바타 ─────────────────────────────────────────────────────────
function uiAvatar(name, size = 36, bgColor) {
  const initials = (name || '?').slice(0, 2);
  const colors = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#10B981'];
  const bg = bgColor || colors[name?.charCodeAt(0) % colors.length || 0];
  return `<div class="avatar" style="width:${size}px;height:${size}px;background:${bg};font-size:${Math.floor(size * 0.4)}px">${esc(initials)}</div>`;
}

// ── 배지 ───────────────────────────────────────────────────────────
function uiBadge(text, color = '#3B82F6') {
  return `<span class="badge" style="background:${color}22;color:${color};border-color:${color}44">${esc(text)}</span>`;
}

// ── 빈 상태 ───────────────────────────────────────────────────────
function uiEmpty(icon, msg, sub = '') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-msg">${esc(msg)}</div>${sub ? `<div class="empty-sub">${esc(sub)}</div>` : ''}</div>`;
}

// ── 스켈레톤 로더 ─────────────────────────────────────────────────
function uiSkeleton(count = 3) {
  return Array(count).fill(0).map(() =>
    `<div class="skeleton-card"><div class="skeleton-line w70"></div><div class="skeleton-line w45"></div><div class="skeleton-line w85"></div></div>`
  ).join('');
}

// ── 진행 바 ───────────────────────────────────────────────────────
function uiProgressBar(value, max, color = '#3B82F6') {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return `<div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
}

// ── 금액 포맷 ─────────────────────────────────────────────────────
function fmtAmount(n) {
  if (typeof n !== 'number') return n;
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만원`;
  return `${n.toLocaleString()}원`;
}

// ── 날짜 포맷 ─────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// ── 상대 날짜 ─────────────────────────────────────────────────────
function relDate(str) {
  const diff = (Date.now() - new Date(str)) / 86400000;
  if (diff < 1) return '오늘';
  if (diff < 2) return '어제';
  if (diff < 7) return `${Math.floor(diff)}일 전`;
  if (diff < 30) return `${Math.floor(diff / 7)}주 전`;
  return fmtDate(str);
}

// ── 난이도 배지 ───────────────────────────────────────────────────
function difficultyBadge(d) {
  const map = { easy: ['간편', '#10B981'], medium: ['보통', '#F59E0B'], hard: ['복잡', '#EF4444'] };
  const [label, color] = map[d] || ['보통', '#F59E0B'];
  return uiBadge(label, color);
}

// ── 카테고리 칩 ───────────────────────────────────────────────────
function categoryChip(catId) {
  const cat = BENEFIT_CATEGORIES[catId] || { label: catId, icon: '📋', color: '#64748B' };
  return `<span class="cat-chip" style="background:${cat.color}20;color:${cat.color}">${cat.icon} ${cat.label}</span>`;
}

// ── 숫자 카운트업 애니메이션 ──────────────────────────────────────
function countUp(el, target, duration = 800, suffix = '') {
  if (!el) return;
  const start = 0;
  const step = target / (duration / 16);
  let cur = start;
  const timer = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = Math.floor(cur).toLocaleString() + suffix;
    if (cur >= target) clearInterval(timer);
  }, 16);
}

// ── 탭 시스템 ─────────────────────────────────────────────────────
function initTabs(containerSelector) {
  document.querySelectorAll(containerSelector).forEach(container => {
    const tabs = container.querySelectorAll('[data-tab]');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        container.querySelectorAll('[data-tab-content]').forEach(c => {
          c.classList.toggle('active', c.dataset.tabContent === target);
        });
      });
    });
  });
}

// ── 스크롤 리스너 ────────────────────────────────────────────────
function onScrollEnd(el, callback, threshold = 100) {
  el.addEventListener('scroll', () => {
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) callback();
  });
}

// ── 클립보드 복사 ────────────────────────────────────────────────
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('복사되었습니다', 'success');
  } catch {
    toast('복사에 실패했습니다', 'error');
  }
}

// ── 숫자만 입력 ──────────────────────────────────────────────────
function numericOnly(input) {
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '');
  });
}
