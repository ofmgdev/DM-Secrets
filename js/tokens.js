/**
 * Token layer: render, drag-to-move (snaps to grid), context menu, HP badges,
 * active-turn highlight. Placement mode is driven from main.js.
 */
import { getState, dispatch } from './store.js';
import { screenToCell, getScale } from './map.js';
import { el } from './ui.js';

let layer;
let dragging = null;   // { id, el, dx, dy }
let placement = null;  // { token defaults } while placing a new token
let onOpenSheet = () => {};
let onAdjustHp = () => {};
let onChangeColor = () => {};

export function initTokens({ openSheet, adjustHp, changeColor }) {
  layer = document.getElementById('token-layer');
  onOpenSheet = openSheet;
  onAdjustHp = adjustHp;
  onChangeColor = changeColor;

  layer.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  layer.addEventListener('contextmenu', onContextMenu);
  layer.addEventListener('dblclick', onDblClick);

  document.getElementById('viewport').addEventListener('click', onViewportClick, true);
}

export function beginPlacement(defaults) {
  placement = defaults;
  document.getElementById('stage').classList.add('placing');
}
export function cancelPlacement() {
  placement = null;
  document.getElementById('stage').classList.remove('placing');
}

export function renderTokens() {
  if (dragging) return; // don't yank the element mid-drag
  const { tokens, map, combat } = getState().campaign;
  const activeId = combat.active ? combat.order[combat.turn] : null;

  layer.replaceChildren(...tokens.map((t) => {
    const node = el('div', {
      class: `token${t.isEnemy ? ' enemy' : ''}${t.id === activeId ? ' active-turn' : ''}`,
      dataset: { id: t.id },
      title: t.name,
    });
    node.style.left = `${t.x * map.cell}px`;
    node.style.top = `${t.y * map.cell}px`;
    node.style.width = node.style.height = `${t.size * map.cell}px`;
    node.style.setProperty('--tok', t.color);

    node.append(el('span', { class: 'token-initial' }, initials(t.name)));

    if (t.initiative != null) {
      node.append(el('span', { class: 'token-init' }, t.initiative));
    }
    if (t.hp) {
      const pct = Math.max(0, Math.min(100, (t.hp.cur / t.hp.max) * 100));
      node.append(el('div', { class: 'token-hpbar' },
        el('div', { class: 'token-hpfill', style: `width:${pct}%` })));
      node.append(el('span', { class: 'token-hptext' }, `${t.hp.cur}/${t.hp.max}`));
    }
    return node;
  }));
}

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
}

// ---- placement ----
function onViewportClick(e) {
  if (!placement) return;
  const tokenEl = e.target.closest('.token');
  if (tokenEl) return;
  const { x, y } = screenToCell(e.clientX, e.clientY);
  const { cols, rows } = getState().campaign.map;
  if (x < 0 || y < 0 || x >= cols || y >= rows) return;
  dispatch({ type: 'token/add', payload: { ...placement, x, y } });
  e.stopPropagation();
  cancelPlacement();
}

// ---- drag ----
function onPointerDown(e) {
  if (e.button !== 0) return;
  const tokenEl = e.target.closest('.token');
  if (!tokenEl) return;
  const id = tokenEl.dataset.id;
  const rect = tokenEl.getBoundingClientRect();
  dragging = {
    id, el: tokenEl,
    dx: e.clientX - rect.left,
    dy: e.clientY - rect.top,
    moved: false,
  };
  tokenEl.classList.add('dragging');
  tokenEl.setPointerCapture?.(e.pointerId);
  e.stopPropagation();
}

function onPointerMove(e) {
  if (!dragging) return;
  dragging.moved = true;
  const scale = getScale();
  const layerRect = layer.getBoundingClientRect();
  const left = (e.clientX - dragging.dx - layerRect.left) / scale;
  const top = (e.clientY - dragging.dy - layerRect.top) / scale;
  dragging.el.style.left = `${left}px`;
  dragging.el.style.top = `${top}px`;
}

function onPointerUp(e) {
  if (!dragging) return;
  const d = dragging;
  dragging = null;
  d.el.classList.remove('dragging');

  if (!d.moved) {
    d.el.classList.remove('dragging');
    renderTokens();
    return;
  }
  const { x, y } = screenToCell(e.clientX - d.dx + d.el.offsetWidth / 2,
                                e.clientY - d.dy + d.el.offsetHeight / 2);
  const { cols, rows } = getState().campaign.map;
  const cx = Math.max(0, Math.min(cols - 1, x));
  const cy = Math.max(0, Math.min(rows - 1, y));
  dispatch({ type: 'token/move', payload: { id: d.id, x: cx, y: cy } });
}

// ---- menus ----
function onContextMenu(e) {
  const tokenEl = e.target.closest('.token');
  if (!tokenEl) return;
  e.preventDefault();
  closeCtx();
  const id = tokenEl.dataset.id;
  const tpl = document.getElementById('tpl-token-context').content.cloneNode(true);
  const menu = tpl.querySelector('.ctx-menu');
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;
  menu.addEventListener('click', (ev) => {
    const act = ev.target.dataset.act;
    if (!act) return;
    const token = getState().campaign.tokens.find((t) => t.id === id);
    if (act === 'sheet') onOpenSheet(token?.charId);
    if (act === 'hp') onAdjustHp(id);
    if (act === 'color') onChangeColor(id);
    if (act === 'init') dispatch({ type: 'combat/setInitiative',
      payload: { id, value: 1 + Math.floor(Math.random() * 20) + initiativeMod(token) } });
    if (act === 'remove') dispatch({ type: 'token/remove', payload: { id } });
    closeCtx();
  });
  document.body.append(menu);
  setTimeout(() => document.addEventListener('pointerdown', closeCtx, { once: true }), 0);
}

function initiativeMod(token) {
  const char = getState().campaign.characters.find((c) => c.id === token?.charId);
  if (!char) return 0;
  return Math.floor((char.abilities.dex - 10) / 2);
}

function closeCtx() {
  document.querySelectorAll('.ctx-menu').forEach((m) => m.remove());
}

function onDblClick(e) {
  const tokenEl = e.target.closest('.token');
  if (!tokenEl) return;
  const token = getState().campaign.tokens.find((t) => t.id === tokenEl.dataset.id);
  if (token?.charId) onOpenSheet(token.charId);
  else {
    const name = prompt('Token name', token.name);
    if (name != null) dispatch({ type: 'token/update', payload: { id: token.id, patch: { name } } });
  }
}
