// 작은 DOM 유틸과 토스트

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, html = '') {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v != null) n.setAttribute(k, v);
  }
  if (html) n.innerHTML = html;
  return n;
}

let toastHost = null;
export function toast(msg, kind = 'info', ms = 2200) {
  if (!msg) return;
  if (!toastHost) {
    toastHost = el('div', { id: 'toasts', 'aria-live': 'polite' });
    document.body.appendChild(toastHost);
  }
  const t = el('div', { class: `toast toast-${kind}` }, msg);
  toastHost.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => {
    t.classList.remove('in');
    setTimeout(() => t.remove(), 260);
  }, ms);
}

export function toastLines(lines, kind = 'info') {
  for (const [i, line] of (lines || []).entries()) {
    setTimeout(() => toast(line, kind), i * 260);
  }
}

// 모달 — 상세 정보 패널, 확인 창 등
export function modal(innerHtml, { onClose, wide = false } = {}) {
  // 모달은 한 번에 하나만 띄운다
  document.querySelectorAll('.modal-back').forEach((n) => n.remove());
  const back = el('div', { class: 'modal-back' });
  const box = el('div', { class: `modal${wide ? ' wide' : ''}` }, innerHtml);
  const close = el('button', { class: 'modal-close', 'aria-label': '닫기' }, '✕');
  let closed = false;
  const esc = (e) => { if (e.key === 'Escape') done(); };
  const done = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', esc);
    back.remove();
    if (onClose) onClose();
  };
  close.addEventListener('click', done);
  back.addEventListener('click', (e) => { if (e.target === back) done(); });
  document.addEventListener('keydown', esc);
  box.appendChild(close);
  back.appendChild(box);
  document.body.appendChild(back);
  return { close: done, box };
}

export function confirmDialog(message, { okText = '확인', cancelText = '취소' } = {}) {
  return new Promise((resolve) => {
    // 버튼 클릭이 modal 의 onClose 보다 먼저 확정되어야 한다.
    // (close() 가 onClose → resolve(false) 를 먼저 호출하면 확인이 항상 취소로 처리된다)
    let decided = false;
    const finish = (v) => { if (!decided) { decided = true; resolve(v); } };
    const m = modal(`<div class="confirm"><p>${message}</p>
      <div class="confirm-actions">
        <button class="btn ghost" data-act="cancel">${cancelText}</button>
        <button class="btn primary" data-act="ok">${okText}</button>
      </div></div>`, { onClose: () => finish(false) });
    m.box.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      finish(act === 'ok');
      m.close();
    });
  });
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// innerHTML 로 삽입되는 사용자 입력(팀 이름 등)을 안전하게 만든다.
export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
