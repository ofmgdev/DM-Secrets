/** Character builder wizard -> creates a character (and optionally a token). */
import { dispatch } from './store.js';
import { el, openModal, closeModal, toast } from './ui.js';
import {
  ABILITIES, ABILITY_NAMES, RACES, CLASSES, BACKGROUNDS, SKILLS,
  STANDARD_ARRAY, rollAbilityArray, mod, fmtMod, proficiencyBonus,
  spellSlotsFor, newCharacter,
} from './rules.js';

const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export function openBuilder(onCreated) {
  const draft = {
    name: '',
    race: 'Human',
    klass: 'Fighter',
    background: 'Soldier',
    level: 1,
    method: 'array',
    base: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
    rolled: null,
    assign: {},           // ability -> value (array/roll methods)
    skills: new Set(),
    addToken: true,
  };

  const node = el('div', { class: 'builder', dataset: { builder: '1' } });
  render();
  openModal(node, { wide: true });

  function render() {
    const raceData = RACES[draft.race];
    const classData = CLASSES[draft.klass];
    node.replaceChildren();

    node.append(el('h2', {}, 'Create a Character'));

    // identity
    node.append(section('Identity',
      field('Name', el('input', { value: draft.name, placeholder: 'e.g. Mara Quickfoot',
        oninput: (e) => { draft.name = e.target.value; } })),
      field('Level', el('input', { type: 'number', min: 1, max: 20, value: draft.level,
        onchange: (e) => { draft.level = clamp(+e.target.value, 1, 20); render(); } })),
      field('Race', select(Object.keys(RACES), draft.race, (v) => { draft.race = v; render(); })),
      field('Class', select(Object.keys(CLASSES), draft.klass, (v) => {
        draft.klass = v; draft.skills = new Set(); render();
      })),
      field('Background', select(Object.keys(BACKGROUNDS), draft.background, (v) => {
        draft.background = v; render();
      })),
    ));

    node.append(el('div', { class: 'builder-info' },
      el('span', {}, `Racial bonus: ${asiText(raceData.asi)}`),
      el('span', {}, `Speed ${raceData.speed} ft · Hit die d${classData.hitDie}`),
      el('span', {}, `Saves: ${classData.saves.map((s) => s.toUpperCase()).join(', ')}`),
    ));

    // ability method
    node.append(section('Ability Scores',
      el('div', { class: 'row' },
        radio('method', 'array', draft.method === 'array', 'Standard array', () => { draft.method = 'array'; draft.assign = {}; render(); }),
        radio('method', 'roll', draft.method === 'roll', 'Roll 4d6', () => { draft.method = 'roll'; draft.rolled = rollAbilityArray(); draft.assign = {}; render(); }),
        radio('method', 'buy', draft.method === 'buy', 'Point buy (27)', () => { draft.method = 'buy'; render(); }),
      ),
      abilityEditor(raceData),
    ));

    // skills
    const pool = classData.skills;
    const bgSkills = BACKGROUNDS[draft.background].skills;
    node.append(section(`Skill Proficiencies — choose ${classData.skillCount} (class)`,
      el('p', { class: 'muted' }, `From background (${draft.background}): ${bgSkills.map(t).join(', ')} — granted automatically.`),
      el('div', { class: 'skill-pick' }, ...pool.map((sk) => {
        const checked = draft.skills.has(sk);
        const disabled = !checked && draft.skills.size >= classData.skillCount;
        return el('label', { class: `chip${checked ? ' on' : ''}${disabled ? ' disabled' : ''}` },
          el('input', {
            type: 'checkbox', checked, disabled,
            onchange: () => { checked ? draft.skills.delete(sk) : draft.skills.add(sk); render(); },
          }),
          `${t(sk)} (${SKILLS[sk].toUpperCase()})`);
      })),
    ));

    node.append(el('label', { class: 'row' },
      el('input', { type: 'checkbox', checked: draft.addToken,
        onchange: (e) => { draft.addToken = e.target.checked; } }),
      'Also drop a token on the map'));

    node.append(el('div', { class: 'row end' },
      el('button', { class: 'mini', onclick: closeModal }, 'Cancel'),
      el('button', { class: 'primary', onclick: finish }, 'Create character'),
    ));
  }

  function abilityEditor(raceData) {
    const wrap = el('div', { class: 'ability-editor' });

    if (draft.method === 'buy') {
      const spent = ABILITIES.reduce((sum, ab) => sum + POINT_COST[draft.base[ab]], 0);
      wrap.append(el('div', { class: 'muted' }, `Points spent: ${spent} / 27`));
      ABILITIES.forEach((ab) => {
        const v = draft.base[ab];
        const total = v + (raceData.asi[ab] || 0);
        wrap.append(el('div', { class: 'ae-row' },
          el('span', { class: 'ae-name' }, ABILITY_NAMES[ab]),
          el('button', { class: 'mini', onclick: () => { if (v > 8) { draft.base[ab]--; render(); } } }, '–'),
          el('span', { class: 'ae-val' }, v),
          el('button', { class: 'mini', onclick: () => {
            if (v < 15 && spent + (POINT_COST[v + 1] - POINT_COST[v]) <= 27) { draft.base[ab]++; render(); }
          } }, '+'),
          el('span', { class: 'ae-total' }, `→ ${total} (${fmtMod(mod(total))})`),
        ));
      });
      return wrap;
    }

    // array / roll -> assign values to abilities via selects
    const values = draft.method === 'array'
      ? STANDARD_ARRAY
      : (draft.rolled || (draft.rolled = rollAbilityArray())).map((r) => r.total);

    if (draft.method === 'roll') {
      wrap.append(el('div', { class: 'row' },
        el('span', { class: 'muted' }, `Rolled: ${draft.rolled.map((r) => `${r.total} [${r.dice.join(',')}]`).join('  ')}`),
        el('button', { class: 'mini', onclick: () => { draft.rolled = rollAbilityArray(); draft.assign = {}; render(); } }, 'Reroll'),
      ));
    }

    const used = new Map();
    Object.values(draft.assign).forEach((v) => used.set(v, (used.get(v) || 0) + 1));

    ABILITIES.forEach((ab) => {
      const cur = draft.assign[ab];
      const avail = countBag(values);
      const opts = [el('option', { value: '' }, '—')];
      [...new Set(values)].sort((a, b) => b - a).forEach((val) => {
        const remaining = (avail.get(val) || 0) - (used.get(val) || 0) + (cur === val ? 1 : 0);
        if (remaining > 0) opts.push(el('option', { value: val, selected: cur === val }, String(val)));
      });
      const total = (cur || 0) + (raceData.asi[ab] || 0);
      wrap.append(el('div', { class: 'ae-row' },
        el('span', { class: 'ae-name' }, ABILITY_NAMES[ab]),
        el('select', { onchange: (e) => {
          const val = e.target.value ? +e.target.value : undefined;
          if (val) draft.assign[ab] = val; else delete draft.assign[ab];
          render();
        } }, ...opts),
        el('span', { class: 'ae-total' }, cur ? `→ ${total} (${fmtMod(mod(total))})` : ''),
      ));
    });
    return wrap;
  }

  function finish() {
    const raceData = RACES[draft.race];
    const classData = CLASSES[draft.klass];

    let base;
    if (draft.method === 'buy') {
      base = { ...draft.base };
    } else {
      if (Object.keys(draft.assign).length < 6) { toast('Assign all six ability scores first.'); return; }
      base = { ...draft.assign };
    }
    const abilities = {};
    ABILITIES.forEach((ab) => { abilities[ab] = (base[ab] || 8) + (raceData.asi[ab] || 0); });

    const level = draft.level;
    const conMod = mod(abilities.con);
    const maxHp = classData.hitDie + conMod
      + (level - 1) * (Math.floor(classData.hitDie / 2) + 1 + conMod);

    const skills = new Set([...draft.skills, ...BACKGROUNDS[draft.background].skills]);

    const char = newCharacter({
      name: draft.name || `${draft.race} ${draft.klass}`,
      race: draft.race, class: draft.klass, background: draft.background, level,
      abilities,
      saveProficiencies: [...classData.saves],
      skillProficiencies: [...skills],
      maxHp: Math.max(1, maxHp), curHp: Math.max(1, maxHp),
      armorClass: 10 + mod(abilities.dex),
      speed: raceData.speed,
      hitDice: `${level}d${classData.hitDie}`,
      spellSlots: spellSlotsFor(draft.klass, level),
      attacks: [],
      features: raceData.traits.slice(),
      proficiencyBonus: proficiencyBonus(level),
    });

    dispatch({ type: 'char/add', payload: { character: char } });
    if (draft.addToken) {
      dispatch({ type: 'token/add', payload: {
        name: char.name, charId: char.id, color: char.color,
        hp: { cur: char.curHp, max: char.maxHp }, ac: char.armorClass,
        x: 1, y: 1,
      } });
    }
    closeModal();
    toast(`${char.name} created`);
    onCreated?.(char.id);
  }
}

// helpers
const t = (s) => s.replace(/\b\w/g, (m) => m.toUpperCase());
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
function countBag(arr) { const m = new Map(); arr.forEach((v) => m.set(v, (m.get(v) || 0) + 1)); return m; }
function asiText(asi) {
  return Object.entries(asi).map(([k, v]) => k === 'any2' ? `+${v}×2 any` : `+${v} ${k.toUpperCase()}`).join(', ') || 'none';
}
function section(title, ...kids) {
  return el('section', { class: 'builder-section' }, el('h3', {}, title), ...kids);
}
function field(label, control) {
  return el('label', { class: 'b-field' }, el('span', {}, label), control);
}
function select(options, value, onChange) {
  return el('select', { onchange: (e) => onChange(e.target.value) },
    ...options.map((o) => el('option', { value: o, selected: o === value }, o)));
}
function radio(name, value, checked, label, onChange) {
  return el('label', { class: 'radio' },
    el('input', { type: 'radio', name, value, checked, onchange: onChange }), label);
}
