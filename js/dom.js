// Small DOM helpers: selectors, screen switching, toasts and modal dialogs.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const SCREENS = ['start', 'booth', 'edit'];
let current = 'start';

export function showScreen(name) {
  for (const s of SCREENS) $('#screen-' + s).hidden = s !== name;
  current = name;
  window.scrollTo(0, 0);
}

export function currentScreen() {
  return current;
}

let toastTimer = 0;
export function toast(message, ms = 2800) {
  const t = $('#toast');
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

export function openModal(sel) {
  const m = typeof sel === 'string' ? $(sel) : sel;
  m._opener = document.activeElement;
  m.hidden = false;
  document.body.classList.add('modal-open');
  const first = m.querySelector('[data-autofocus]') || m.querySelector('button:not([hidden]), input');
  if (first) first.focus();
}

export function closeModal(sel) {
  const m = typeof sel === 'string' ? $(sel) : sel;
  if (!m || m.hidden) return;
  m.hidden = true;
  if (!$$('.modal').some((x) => !x.hidden)) document.body.classList.remove('modal-open');
  if (m._opener && m._opener.focus) m._opener.focus();
}

document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-close]');
  if (c) closeModal(c.closest('.modal'));
});

document.addEventListener('keydown', (e) => {
  const open = $$('.modal').filter((m) => !m.hidden).pop();
  if (!open) return;
  if (e.key === 'Escape') {
    closeModal(open);
  } else if (e.key === 'Tab') {
    const f = $$('button:not([hidden]):not([disabled]), input, [href]', open).filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}
