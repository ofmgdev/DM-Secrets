/** D&D 5e character sheet, rendered into the shared modal. */
import { getState, dispatch } from './store.js';
import { el, openModal, closeModal, confirmDialog } from './ui.js';
import { logRoll, logD20 } from './rolllog.js';
import {
  ABILITIES, ABILITY_NAMES, SKILLS, mod, fmtMod, proficiencyBonus,
  saveBonus, skillBonus, passivePerception, spellcasting, spellSlotsFor,
} from './rules.js';

export function openSheet(charId) {
  const char = getState().campaign.characters.find((c) => c.id === charId);
  if (!char) return;
  openModal(render(char.id), { wide: true });
}

function patch(id, p) {
  dispatch({ type: 'char/update', payload: { id, patch: p } });
  // re-render in place
  const body = document.getElementById('modal-body');
  if (body && body.firstChild?.dataset?.sheetFor === id) {
    body.replaceChildren(render(id));
  }
}

function numInput(value, onCommit, opts = {}) {
  return el('input', {
    type: 'number', value, class: opts.class || 'num',
    onchange: (e) => onCommit(Number(e.target.value)),
    ...(opts.min != null ? { min: opts.min } : {}),
    ...(opts.max != null ? { max: opts.max } : {}),
  });
}

function render(id) {
  const st = getState();
  const char = st.campaign.characters.find((c) => c.id === id);
  const pb = proficiencyBonus(char.level);
  const sc = spellcasting(char);

  const root = el('div', { class: 'sheet', dataset: { sheetFor: id } });

  // ---------- header ----------
  root.append(el('div', { class: 'sheet-head' },
    el('input', {
      class: 'sheet-name', value: char.name, placeholder: 'Character name',
      onchange: (e) => patch(id, { name: e.target.value }),
    }),
    el('div', { class: 'sheet-meta' },
      metaField('Class', char.class, (v) => patch(id, { class: v })),
      metaNum('Level', char.level, (v) => {
        const lvl = Math.max(1, Math.min(20, v || 1));
        patch(id, { level: lvl, spellSlots: spellSlotsFor(char.class, lvl) });
      }),
      metaField('Race', char.race, (v) => patch(id, { race: v })),
      metaField('Background', char.background, (v) => patch(id, { background: v })),
      metaField('Player', char.playerName, (v) => patch(id, { playerName: v })),
      metaField('Alignment', char.alignment, (v) => patch(id, { alignment: v })),
    ),
  ));

  const grid = el('div', { class: 'sheet-grid' });
  root.append(grid);

  // ---------- column 1: abilities + saves ----------
  const col1 = el('div', { class: 'sheet-col' });
  const abilBox = el('div', { class: 'ability-col' });
  ABILITIES.forEach((ab) => {
    const score = char.abilities[ab];
    abilBox.append(el('div', { class: 'ability' },
      el('div', { class: 'ability-label' }, ab.toUpperCase()),
      el('input', {
        class: 'ability-score', type: 'number', value: score,
        onchange: (e) => patch(id, { abilities: { ...char.abilities, [ab]: Number(e.target.value) } }),
      }),
      el('button', {
        class: 'ability-mod', title: `Roll ${ABILITY_NAMES[ab]} check`,
        onclick: (e) => logD20({ who: char.name, label: `${ABILITY_NAMES[ab]} check`, bonus: mod(score), mode: rollMode(e) }),
      }, fmtMod(mod(score))),
    ));
  });
  col1.append(abilBox);

  col1.append(el('div', { class: 'pill' }, `Proficiency ${fmtMod(pb)}`),
              el('button', {
                class: 'pill click', title: 'Roll initiative',
                onclick: (e) => {
                  const r = logD20({ who: char.name, label: 'Initiative', bonus: mod(char.abilities.dex), mode: rollMode(e) });
                  syncTokenInit(id, r.total);
                },
              }, `Initiative ${fmtMod(mod(char.abilities.dex))}`),
              el('div', { class: 'pill' }, `Passive Perception ${passivePerception(char)}`));

  const saveBox = el('div', { class: 'listbox' }, el('h4', {}, 'Saving Throws'));
  ABILITIES.forEach((ab) => {
    const prof = (char.saveProficiencies || []).includes(ab);
    saveBox.append(el('div', { class: 'list-row' },
      profDot(prof, () => toggle(id, 'saveProficiencies', ab)),
      el('button', {
        class: 'list-roll',
        onclick: (e) => logD20({ who: char.name, label: `${ABILITY_NAMES[ab]} save`, bonus: saveBonus(char, ab), mode: rollMode(e) }),
      }, `${fmtMod(saveBonus(char, ab))}`),
      el('span', { class: 'list-name' }, ABILITY_NAMES[ab]),
    ));
  });
  col1.append(saveBox);
  grid.append(col1);

  // ---------- column 2: skills ----------
  const col2 = el('div', { class: 'sheet-col' });
  const skillBox = el('div', { class: 'listbox' }, el('h4', {}, 'Skills'));
  Object.keys(SKILLS).sort().forEach((sk) => {
    const prof = (char.skillProficiencies || []).includes(sk);
    const exp = (char.expertise || []).includes(sk);
    skillBox.append(el('div', { class: 'list-row' },
      profDot(prof, () => toggle(id, 'skillProficiencies', sk), exp, () => toggle(id, 'expertise', sk)),
      el('button', {
        class: 'list-roll',
        onclick: (e) => logD20({ who: char.name, label: `${title(sk)}`, bonus: skillBonus(char, sk), mode: rollMode(e) }),
      }, fmtMod(skillBonus(char, sk))),
      el('span', { class: 'list-name' }, title(sk),
        el('span', { class: 'list-abil' }, ` ${SKILLS[sk].toUpperCase()}`)),
    ));
  });
  col2.append(skillBox);
  grid.append(col2);

  // ---------- column 3: combat + spells ----------
  const col3 = el('div', { class: 'sheet-col' });

  col3.append(el('div', { class: 'stat-row' },
    stat('Armor Class', numInput(char.armorClass, (v) => patch(id, { armorClass: v }))),
    stat('Speed', numInput(char.speed, (v) => patch(id, { speed: v }))),
    stat('Hit Dice', el('input', { class: 'num wide', value: char.hitDice, onchange: (e) => patch(id, { hitDice: e.target.value }) })),
  ));

  // HP block
  const hpDelta = el('input', { type: 'number', class: 'num', placeholder: '0' });
  col3.append(el('div', { class: 'hp-block' },
    el('h4', {}, 'Hit Points'),
    el('div', { class: 'hp-row' },
      stat('Current', numInput(char.curHp, (v) => patch(id, { curHp: v }))),
      stat('Max', numInput(char.maxHp, (v) => patch(id, { maxHp: v, curHp: Math.min(char.curHp, v) }))),
      stat('Temp', numInput(char.tempHp, (v) => patch(id, { tempHp: v }))),
    ),
    el('div', { class: 'row' },
      hpDelta,
      el('button', { class: 'mini danger', onclick: () => {
        const d = Math.abs(Number(hpDelta.value) || 0);
        let temp = char.tempHp, dmg = d;
        if (temp > 0) { const absorbed = Math.min(temp, dmg); temp -= absorbed; dmg -= absorbed; }
        patch(id, { tempHp: temp, curHp: Math.max(0, char.curHp - dmg) });
      } }, '– Damage'),
      el('button', { class: 'mini good', onclick: () => {
        const d = Math.abs(Number(hpDelta.value) || 0);
        patch(id, { curHp: Math.min(char.maxHp, char.curHp + d) });
      } }, '+ Heal'),
    ),
  ));

  // Spellcasting
  if (sc) {
    const slots = char.spellSlots && Object.keys(char.spellSlots).length
      ? char.spellSlots : spellSlotsFor(char.class, char.level);
    const spellBox = el('div', { class: 'listbox' },
      el('h4', {}, 'Spellcasting'),
      el('div', { class: 'row' },
        el('span', { class: 'pill' }, `${ABILITY_NAMES[sc.ability]}`),
        el('span', { class: 'pill' }, `Save DC ${sc.saveDc}`),
        el('button', { class: 'pill click', onclick: (e) =>
          logD20({ who: char.name, label: 'Spell attack', bonus: sc.attackBonus, mode: rollMode(e) }) },
          `Atk ${fmtMod(sc.attackBonus)}`),
      ),
    );
    Object.entries(slots).forEach(([lvl, s]) => {
      const row = el('div', { class: 'slot-row' }, el('span', {}, `Level ${lvl}`));
      for (let i = 0; i < s.max; i++) {
        row.append(el('button', {
          class: `slot-pip${i < s.used ? ' used' : ''}`,
          onclick: () => {
            const used = i < s.used ? i : i + 1;
            patch(id, { spellSlots: { ...slots, [lvl]: { ...s, used } } });
          },
        }));
      }
      row.append(el('button', { class: 'mini', onclick: () =>
        patch(id, { spellSlots: { ...slots, [lvl]: { ...s, used: 0 } } }) }, 'reset'));
      spellBox.append(row);
    });
    col3.append(spellBox);
  }

  // Attacks
  const atkBox = el('div', { class: 'listbox' }, el('h4', {}, 'Attacks'));
  (char.attacks || []).forEach((atk, i) => {
    atkBox.append(el('div', { class: 'atk-row' },
      el('input', { class: 'atk-name', value: atk.name, placeholder: 'Attack',
        onchange: (e) => updateAttack(id, i, { name: e.target.value }) }),
      el('input', { class: 'num', value: atk.bonus ?? 0, type: 'number', title: 'to hit',
        onchange: (e) => updateAttack(id, i, { bonus: Number(e.target.value) }) }),
      el('input', { class: 'atk-dmg', value: atk.damage || '', placeholder: '1d8+3',
        onchange: (e) => updateAttack(id, i, { damage: e.target.value }) }),
      el('button', { class: 'mini', title: 'Roll attack', onclick: (e) => {
        logD20({ who: char.name, label: `${atk.name} to hit`, bonus: atk.bonus || 0, mode: rollMode(e) });
        if (atk.damage) logRoll({ who: char.name, label: `${atk.name} damage`, formula: atk.damage });
      } }, '🎲'),
      el('button', { class: 'mini danger', onclick: () =>
        patch(id, { attacks: char.attacks.filter((_, j) => j !== i) }) }, '✕'),
    ));
  });
  atkBox.append(el('button', { class: 'mini', onclick: () =>
    patch(id, { attacks: [...(char.attacks || []), { name: 'New attack', bonus: mod(char.abilities.str) + pb, damage: '1d6' }] }) },
    '+ Add attack'));
  col3.append(atkBox);

  grid.append(col3);

  // ---------- notes row ----------
  root.append(el('div', { class: 'sheet-notes' },
    textareaField('Features & Traits', (char.features || []).join('\n'),
      (v) => patch(id, { features: v.split('\n').filter(Boolean) })),
    textareaField('Equipment', (char.equipment || []).join('\n'),
      (v) => patch(id, { equipment: v.split('\n').filter(Boolean) })),
    textareaField('Notes', char.notes || '', (v) => patch(id, { notes: v })),
  ));

  root.append(el('div', { class: 'row end sheet-footer' },
    el('div', { class: 'swatch-wrap' },
      el('input', { type: 'color', value: char.color, onchange: (e) => patch(id, { color: e.target.value }) }),
      el('span', { class: 'muted' }, 'token colour')),
    el('button', { class: 'mini danger', onclick: async () => {
      if (await confirmDialog(`Delete ${char.name}? This cannot be undone.`)) {
        dispatch({ type: 'char/remove', payload: { id } });
        closeModal();
      }
    } }, 'Delete character'),
    el('button', { class: 'mini', onclick: closeModal }, 'Close'),
  ));

  return root;
}

// ---- small helpers ----
function rollMode(e) {
  if (e.shiftKey) return 'adv';
  if (e.altKey || e.ctrlKey) return 'dis';
  return 'normal';
}
function title(s) { return s.replace(/\b\w/g, (m) => m.toUpperCase()); }

function toggle(id, key, value) {
  const char = getState().campaign.characters.find((c) => c.id === id);
  const set = new Set(char[key] || []);
  set.has(value) ? set.delete(value) : set.add(value);
  patch(id, { [key]: [...set] });
}

function updateAttack(id, i, p) {
  const char = getState().campaign.characters.find((c) => c.id === id);
  const attacks = char.attacks.map((a, j) => (j === i ? { ...a, ...p } : a));
  patch(id, { attacks });
}

function syncTokenInit(charId, value) {
  const tok = getState().campaign.tokens.find((t) => t.charId === charId);
  if (tok) dispatch({ type: 'combat/setInitiative', payload: { id: tok.id, value } });
}

function metaField(label, value, onCommit) {
  return el('label', { class: 'meta-field' }, el('span', {}, label),
    el('input', { value: value || '', onchange: (e) => onCommit(e.target.value) }));
}
function metaNum(label, value, onCommit) {
  return el('label', { class: 'meta-field' }, el('span', {}, label),
    el('input', { type: 'number', value, min: 1, max: 20, onchange: (e) => onCommit(Number(e.target.value)) }));
}
function stat(label, control) {
  return el('div', { class: 'stat' }, el('span', { class: 'stat-label' }, label), control);
}
function textareaField(label, value, onCommit) {
  return el('label', { class: 'ta-field' }, el('span', {}, label),
    el('textarea', { rows: 5, onchange: (e) => onCommit(e.target.value) }, value));
}
function profDot(prof, onProf, exp, onExp) {
  const wrap = el('span', { class: 'prof-dots' });
  wrap.append(el('button', {
    class: `prof-dot${prof ? ' on' : ''}`, title: 'Proficient',
    onclick: onProf,
  }));
  if (onExp) {
    wrap.append(el('button', {
      class: `prof-dot exp${exp ? ' on' : ''}`, title: 'Expertise',
      onclick: onExp,
    }));
  }
  return wrap;
}
