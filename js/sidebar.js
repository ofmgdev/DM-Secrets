/** Right-hand panels: initiative, tokens, characters, dice + roll log. */
import { getState, dispatch } from './store.js';
import { el, $, toast } from './ui.js';
import { logRoll } from './rolllog.js';
import { mod } from './rules.js';

let handlers = {};

export function initSidebar(h) {
  handlers = h;

  // dice quick buttons
  $$('#panel-dice .dice-quick button').forEach((b) => {
    b.addEventListener('click', () => logRoll({ who: 'DM', label: b.dataset.roll, formula: b.dataset.roll }));
  });
  $('#dice-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#dice-input');
    if (!input.value.trim()) return;
    logRoll({ who: 'DM', label: input.value.trim(), formula: input.value.trim() });
    input.value = '';
  });

  $('#btn-combat-toggle').addEventListener('click', () => {
    const { combat } = getState().campaign;
    dispatch({ type: combat.active ? 'combat/end' : 'combat/start' });
  });
}

const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function renderSidebar() {
  renderCombat();
  renderTokenList();
  renderCharacterList();
  renderRollLog();
}

function renderCombat() {
  const { tokens, combat } = getState().campaign;
  const list = $('#initiative-list');
  const btn = $('#btn-combat-toggle');
  const round = $('#combat-round');

  btn.textContent = combat.active ? 'End combat' : 'Start combat';
  btn.classList.toggle('danger', combat.active);
  round.textContent = combat.active ? `Round ${combat.round}` : '';

  const ordered = combat.active && combat.order.length
    ? combat.order.map((id) => tokens.find((t) => t.id === id)).filter(Boolean)
    : [...tokens].filter((t) => t.initiative != null).sort((a, b) => b.initiative - a.initiative);

  list.replaceChildren();

  if (!ordered.length) {
    list.append(el('li', { class: 'muted small' }, 'No initiative rolled. Right-click a token → Roll initiative, or use ⚔ Roll Initiative.'));
  }

  ordered.forEach((tk, i) => {
    const isActive = combat.active && combat.order[combat.turn] === tk.id;
    const li = el('li', { class: `init-row${isActive ? ' active' : ''}` },
      el('button', { class: 'init-score', title: 'Set initiative',
        onclick: () => {
          const v = prompt(`Initiative for ${tk.name}`, tk.initiative ?? '');
          if (v != null && v !== '') dispatch({ type: 'combat/setInitiative', payload: { id: tk.id, value: Number(v) } });
        } }, tk.initiative ?? '–'),
      el('span', { class: 'init-swatch', style: `background:${tk.color}` }),
      el('span', { class: 'init-name' }, tk.name),
      tk.hp ? el('span', { class: 'init-hp' }, `${tk.hp.cur}/${tk.hp.max}`) : null,
    );
    list.append(li);
  });

  if (combat.active) {
    list.append(el('li', { class: 'init-nav' },
      el('button', { class: 'mini', onclick: () => dispatch({ type: 'combat/prev' }) }, '‹ Prev'),
      el('button', { class: 'mini primary', onclick: () => dispatch({ type: 'combat/next' }) }, 'Next turn ›'),
    ));
  }
}

function renderTokenList() {
  const { tokens } = getState().campaign;
  const ul = $('#token-list');
  ul.replaceChildren();
  if (!tokens.length) { ul.append(el('li', { class: 'muted small' }, 'No tokens yet.')); return; }
  tokens.forEach((tk) => {
    ul.append(el('li', { class: 'row-item' },
      el('span', { class: 'dot', style: `background:${tk.color}` }),
      el('span', { class: 'grow', onclick: () => handlers.focusToken?.(tk.id) }, tk.name),
      tk.charId ? el('button', { class: 'mini', onclick: () => handlers.openSheet?.(tk.charId) }, 'Sheet') : null,
      el('button', { class: 'mini', onclick: () => handlers.adjustHp?.(tk.id) }, 'HP'),
      el('button', { class: 'mini danger', onclick: () => dispatch({ type: 'token/remove', payload: { id: tk.id } }) }, '✕'),
    ));
  });
}

function renderCharacterList() {
  const { characters } = getState().campaign;
  const ul = $('#character-list');
  ul.replaceChildren();
  if (!characters.length) { ul.append(el('li', { class: 'muted small' }, 'No characters. Click “＋ Character”.')); return; }
  characters.forEach((ch) => {
    const hasToken = getState().campaign.tokens.some((t) => t.charId === ch.id);
    ul.append(el('li', { class: 'row-item' },
      el('span', { class: 'dot', style: `background:${ch.color}` }),
      el('span', { class: 'grow', onclick: () => handlers.openSheet?.(ch.id) },
        `${ch.name}`, el('span', { class: 'muted small' }, ` · L${ch.level} ${ch.race} ${ch.class}`)),
      el('button', { class: 'mini', onclick: () => handlers.openSheet?.(ch.id) }, 'Sheet'),
      hasToken ? null : el('button', { class: 'mini', onclick: () => dispatch({ type: 'token/add', payload: {
        name: ch.name, charId: ch.id, color: ch.color, ac: ch.armorClass,
        hp: { cur: ch.curHp, max: ch.maxHp }, x: 1, y: 1,
      } }) }, 'Place'),
    ));
  });
}

function renderRollLog() {
  const { rollLog } = getState().campaign;
  const ul = $('#roll-log');
  ul.replaceChildren();
  rollLog.forEach((r) => {
    ul.append(el('li', { class: 'roll-entry' },
      el('div', { class: 'roll-top' },
        el('span', { class: 'roll-who' }, r.who),
        el('span', { class: 'roll-label' }, r.label || r.formula),
        el('span', { class: 'roll-total' }, r.total),
      ),
      el('div', { class: 'roll-detail', html: (r.detail || '').replace(/~~(.+?)~~/g, '<s>$1</s>') }),
    ));
  });
}

/** Roll initiative for every token (dex mod for linked chars). */
export function rollInitiativeForAll() {
  const { tokens, characters } = getState().campaign;
  if (!tokens.length) { toast('Add some tokens first.'); return; }
  tokens.forEach((tk) => {
    const ch = characters.find((c) => c.id === tk.charId);
    const m = ch ? mod(ch.abilities.dex) : 0;
    const value = 1 + Math.floor(Math.random() * 20) + m;
    dispatch({ type: 'combat/setInitiative', payload: { id: tk.id, value } });
  });
  dispatch({ type: 'combat/start' });
  toast('Initiative rolled — combat started');
}
