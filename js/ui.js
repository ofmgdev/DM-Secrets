/** Tiny DOM helpers + modal manager. */

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const ch of children.flat()) {
    if (ch == null || ch === false) continue;
    node.append(ch.nodeType ? ch : document.createTextNode(String(ch)));
  }
  return node;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const root = () => document.getElementById('modal-root');
const body = () => document.getElementById('modal-body');
let onCloseCb = null;

export function openModal(contentNode, { onClose, wide } = {}) {
  const b = body();
  b.replaceChildren(contentNode);
  b.classList.toggle('wide', !!wide);
  root().hidden = false;
  onCloseCb = onClose || null;
  document.addEventListener('keydown', escHandler);
}

export function closeModal() {
  if (root().hidden) return;
  root().hidden = true;
  body().replaceChildren();
  document.removeEventListener('keydown', escHandler);
  const cb = onCloseCb; onCloseCb = null;
  if (cb) cb();
}

function escHandler(e) {
  if (e.key === 'Escape') closeModal();
}

export function initModalRoot() {
  root().addEventListener('click', (e) => {
    if (e.target.matches('[data-close], [data-close] *')) closeModal();
  });
}

export function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = el('div', { id: 'toast' });
    document.body.append(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

export function confirmDialog(message) {
  return new Promise((resolve) => {
    const node = el('div', { class: 'confirm' },
      el('p', {}, message),
      el('div', { class: 'row end' },
        el('button', { class: 'mini', onclick: () => { closeModal(); resolve(false); } }, 'Cancel'),
        el('button', { class: 'mini danger', onclick: () => { closeModal(); resolve(true); } }, 'Confirm'),
      ),
    );
    openModal(node, { onClose: () => resolve(false) });
  });
}
