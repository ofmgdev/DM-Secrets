/** Bootstrap: wire toolbar, keyboard, persistence, and the render loop. */
import { getState, dispatch, subscribe, use, setUi, loadCampaign } from './store.js';
import { autosave, loadActive, saveCampaign } from './storage.js';
import { initModalRoot, $, $$, toast } from './ui.js';
import { initMap, renderMap, setGridVisible, fitToView, screenToCell } from './map.js';
import { initTokens, renderTokens, beginPlacement, cancelPlacement } from './tokens.js';
import { initSidebar, renderSidebar, rollInitiativeForAll } from './sidebar.js';
import { openSheet } from './sheet.js';
import { openBuilder } from './builder.js';
import { openCampaignModal } from './campaign.js';
import { randomTokenColor } from './rules.js';

let currentTool = 'select';

function boot() {
  initModalRoot();

  const saved = loadActive();
  if (saved) loadCampaign(saved);

  initMap(() => currentTool);
  initTokens({
    openSheet: (id) => id ? openSheet(id) : toast('That token has no character sheet.'),
    adjustHp: adjustHpPrompt,
    changeColor: changeTokenColor,
  });
  initSidebar({
    openSheet,
    adjustHp: adjustHpPrompt,
    focusToken: focusToken,
  });

  wireToolbar();
  wireKeyboard();

  // persistence middleware
  use((action, prev, next) => {
    if (action.scope === 'ui') return;
    if (next.campaign !== prev.campaign) autosave(next.campaign);
  });

  subscribe(renderAll);
  renderAll();
  fitToView();
}

let rafPending = false;
function paint() {
  rafPending = false;
  try {
    renderMap();
    renderTokens();
    renderSidebar();
    setGridVisible(getState().ui.showGrid);
    document.title = `${getState().campaign.name} — DM Secrets`;
  } catch (e) {
    console.error('render error', e);
  }
}
function renderAll() {
  if (rafPending) return;
  rafPending = true;
  // rAF is throttled/paused while the tab is hidden — fall back to a timer so
  // the first paint (and background updates) still happen.
  if (typeof document !== 'undefined' && document.hidden) {
    setTimeout(paint, 0);
  } else {
    requestAnimationFrame(paint);
    setTimeout(() => { if (rafPending) paint(); }, 250);
  }
}

function wireToolbar() {
  $$('#map-tools .tool[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });
  $('#toggle-grid').addEventListener('click', () => {
    setUi({ showGrid: !getState().ui.showGrid });
    $('#toggle-grid').classList.toggle('active', getState().ui.showGrid);
  });
  $('#toggle-grid').classList.toggle('active', getState().ui.showGrid);

  $('#btn-add-token').addEventListener('click', () => {
    toast('Click the map to drop a token');
    beginPlacement({ name: 'Token', color: randomTokenColor(), isEnemy: false, hp: { cur: 10, max: 10 } });
  });
  $('#btn-new-char').addEventListener('click', () => openBuilder((id) => openSheet(id)));
  $('#btn-roll-combat').addEventListener('click', rollInitiativeForAll);
  $('#btn-campaign').addEventListener('click', openCampaignModal);
}

function setTool(tool) {
  currentTool = tool;
  cancelPlacement();
  $$('#map-tools .tool[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === tool));
  $('#stage').dataset.tool = tool;
}

function wireKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    const map = { v: 'select', f: 'floor', w: 'wall', e: 'erase' };
    if (map[e.key]) { setTool(map[e.key]); return; }
    if (e.key === 'g') { setUi({ showGrid: !getState().ui.showGrid }); }
    if (e.key === 'Escape') cancelPlacement();
    if ((e.key === 'n' || e.key === 'N') && getState().campaign.combat.active) dispatch({ type: 'combat/next' });
  });
}

// ---- token helpers exposed to menus/panels ----
function adjustHpPrompt(tokenId) {
  const tk = getState().campaign.tokens.find((t) => t.id === tokenId);
  if (!tk || !tk.hp) { toast('This token has no HP.'); return; }
  const v = prompt(`Adjust HP for ${tk.name} (e.g. -7 or +4). Current ${tk.hp.cur}/${tk.hp.max}`, '-1');
  if (v == null) return;
  const delta = Number(v);
  if (Number.isNaN(delta)) return;
  dispatch({ type: 'token/hp', payload: { id: tokenId, delta } });
  const linked = getState().campaign.characters.find((c) => c.id === tk.charId);
  if (linked) {
    const cur = Math.max(0, Math.min(linked.maxHp, linked.curHp + delta));
    dispatch({ type: 'char/update', payload: { id: linked.id, patch: { curHp: cur } } });
  }
}

function changeTokenColor(tokenId) {
  const tk = getState().campaign.tokens.find((t) => t.id === tokenId);
  if (!tk) return;
  const input = document.createElement('input');
  input.type = 'color';
  input.value = tk.color;
  input.addEventListener('change', () => {
    dispatch({ type: 'token/update', payload: { id: tokenId, patch: { color: input.value } } });
  });
  input.click();
}

function focusToken(tokenId) {
  const tk = getState().campaign.tokens.find((t) => t.id === tokenId);
  if (!tk) return;
  const node = document.querySelector(`.token[data-id="${tokenId}"]`);
  if (node) {
    node.classList.add('flash');
    setTimeout(() => node.classList.remove('flash'), 900);
  }
}

window.addEventListener('beforeunload', () => saveCampaign(getState().campaign));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
