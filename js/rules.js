/**
 * D&D 5e reference data and rules helpers.
 * Deliberately a compact subset — enough to build a playable character and
 * drive the sheet's math. Extend the tables freely.
 */

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABILITY_NAMES = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

/** skill -> governing ability */
export const SKILLS = {
  acrobatics: 'dex', 'animal handling': 'wis', arcana: 'int', athletics: 'str',
  deception: 'cha', history: 'int', insight: 'wis', intimidation: 'cha',
  investigation: 'int', medicine: 'wis', nature: 'int', perception: 'wis',
  performance: 'cha', persuasion: 'cha', religion: 'int',
  'sleight of hand': 'dex', stealth: 'dex', survival: 'wis',
};

export const RACES = {
  Dragonborn: { asi: { str: 2, cha: 1 }, speed: 30, traits: ['Breath Weapon', 'Damage Resistance'] },
  Dwarf:      { asi: { con: 2 }, speed: 25, traits: ['Darkvision', 'Dwarven Resilience', 'Stonecunning'] },
  Elf:        { asi: { dex: 2 }, speed: 30, traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance'] },
  Gnome:      { asi: { int: 2 }, speed: 25, traits: ['Darkvision', 'Gnome Cunning'] },
  'Half-Elf': { asi: { cha: 2, any2: 1 }, speed: 30, traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'] },
  'Half-Orc': { asi: { str: 2, con: 1 }, speed: 30, traits: ['Darkvision', 'Relentless Endurance', 'Savage Attacks'] },
  Halfling:   { asi: { dex: 2 }, speed: 25, traits: ['Lucky', 'Brave', 'Halfling Nimbleness'] },
  Human:      { asi: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, speed: 30, traits: ['Extra Language'] },
  Tiefling:   { asi: { cha: 2, int: 1 }, speed: 30, traits: ['Darkvision', 'Hellish Resistance', 'Infernal Legacy'] },
};

export const CLASSES = {
  Barbarian: { hitDie: 10, primary: ['str'], saves: ['str', 'con'], skillCount: 2,
    skills: ['animal handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
  Bard:      { hitDie: 8, primary: ['cha'], saves: ['dex', 'cha'], skillCount: 3, spellAbility: 'cha',
    skills: Object.keys(SKILLS) },
  Cleric:    { hitDie: 8, primary: ['wis'], saves: ['wis', 'cha'], skillCount: 2, spellAbility: 'wis',
    skills: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
  Druid:     { hitDie: 8, primary: ['wis'], saves: ['int', 'wis'], skillCount: 2, spellAbility: 'wis',
    skills: ['arcana', 'animal handling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'] },
  Fighter:   { hitDie: 10, primary: ['str', 'dex'], saves: ['str', 'con'], skillCount: 2,
    skills: ['acrobatics', 'animal handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'] },
  Monk:      { hitDie: 8, primary: ['dex', 'wis'], saves: ['str', 'dex'], skillCount: 2,
    skills: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'] },
  Paladin:   { hitDie: 10, primary: ['str', 'cha'], saves: ['wis', 'cha'], skillCount: 2, spellAbility: 'cha',
    skills: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'] },
  Ranger:    { hitDie: 10, primary: ['dex', 'wis'], saves: ['str', 'dex'], skillCount: 3, spellAbility: 'wis',
    skills: ['animal handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'] },
  Rogue:     { hitDie: 8, primary: ['dex'], saves: ['dex', 'int'], skillCount: 4,
    skills: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight of hand', 'stealth'] },
  Sorcerer:  { hitDie: 6, primary: ['cha'], saves: ['con', 'cha'], skillCount: 2, spellAbility: 'cha',
    skills: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'] },
  Warlock:   { hitDie: 8, primary: ['cha'], saves: ['wis', 'cha'], skillCount: 2, spellAbility: 'cha',
    skills: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'] },
  Wizard:    { hitDie: 6, primary: ['int'], saves: ['int', 'wis'], skillCount: 2, spellAbility: 'int',
    skills: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'] },
};

export const BACKGROUNDS = {
  Acolyte:     { skills: ['insight', 'religion'] },
  Charlatan:   { skills: ['deception', 'sleight of hand'] },
  Criminal:    { skills: ['deception', 'stealth'] },
  Entertainer: { skills: ['acrobatics', 'performance'] },
  'Folk Hero': { skills: ['animal handling', 'survival'] },
  Noble:       { skills: ['history', 'persuasion'] },
  Outlander:   { skills: ['athletics', 'survival'] },
  Sage:        { skills: ['arcana', 'history'] },
  Soldier:     { skills: ['athletics', 'intimidation'] },
  Urchin:      { skills: ['sleight of hand', 'stealth'] },
};

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

/** Full spell-slot progression by class level (index 1..9 = slot level). */
const FULL_CASTER_SLOTS = [
  null,
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2],
  [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];
const FULL_CASTERS = new Set(['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard']);
const HALF_CASTERS = new Set(['Paladin', 'Ranger']);

// ---- helpers ----

export const mod = (score) => Math.floor((Number(score || 10) - 10) / 2);
export const fmtMod = (m) => (m >= 0 ? `+${m}` : `${m}`);
export const proficiencyBonus = (level) => 2 + Math.floor((Math.max(1, level) - 1) / 4);

export function spellSlotsFor(className, level) {
  let effective = 0;
  if (FULL_CASTERS.has(className)) effective = level;
  else if (HALF_CASTERS.has(className)) effective = Math.floor(level / 2);
  else if (className === 'Warlock') {
    // Pact magic — simplified: 1..4 slots, level scales the slot level
    const slots = level >= 17 ? 4 : level >= 11 ? 3 : level >= 2 ? 2 : 1;
    const slvl = Math.min(5, Math.ceil(level / 2));
    const out = {};
    out[slvl] = { max: slots, used: 0 };
    return out;
  }
  const row = FULL_CASTER_SLOTS[Math.min(20, Math.max(0, effective))];
  if (!row) return {};
  const out = {};
  row.forEach((count, i) => { out[i + 1] = { max: count, used: 0 }; });
  return out;
}

/** roll 4d6 drop lowest, six times */
export function rollAbilityArray() {
  const one = () => {
    const d = [0, 0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6)).sort((a, b) => b - a);
    return { total: d[0] + d[1] + d[2], dice: d };
  };
  return [one(), one(), one(), one(), one(), one()];
}

export function abilityCheckBonus(char, ability) {
  return mod(char.abilities[ability]);
}

export function saveBonus(char, ability) {
  const pb = proficiencyBonus(char.level);
  const prof = (char.saveProficiencies || []).includes(ability);
  return mod(char.abilities[ability]) + (prof ? pb : 0);
}

export function skillBonus(char, skill) {
  const ability = SKILLS[skill];
  const pb = proficiencyBonus(char.level);
  const prof = (char.skillProficiencies || []).includes(skill);
  const expertise = (char.expertise || []).includes(skill);
  return mod(char.abilities[ability]) + (prof ? pb : 0) + (expertise ? pb : 0);
}

export function passivePerception(char) {
  return 10 + skillBonus(char, 'perception');
}

export function spellcasting(char) {
  const cls = CLASSES[char.class];
  if (!cls || !cls.spellAbility) return null;
  const pb = proficiencyBonus(char.level);
  const abilMod = mod(char.abilities[cls.spellAbility]);
  return {
    ability: cls.spellAbility,
    saveDc: 8 + pb + abilMod,
    attackBonus: pb + abilMod,
  };
}

// ---- factories ----

let idc = 0;
export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}_${(idc++).toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export function newCharacter(patch = {}) {
  return {
    id: uid('char'),
    name: 'New Adventurer',
    playerName: '',
    race: 'Human',
    class: 'Fighter',
    background: 'Soldier',
    level: 1,
    alignment: '',
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saveProficiencies: ['str', 'con'],
    skillProficiencies: [],
    expertise: [],
    maxHp: 10,
    curHp: 10,
    tempHp: 0,
    armorClass: 10,
    speed: 30,
    hitDice: '1d10',
    spellSlots: {},
    attacks: [],
    features: [],
    equipment: [],
    notes: '',
    color: randomTokenColor(),
    ...patch,
  };
}

export function newCampaign(patch = {}) {
  return {
    id: uid('camp'),
    name: 'Untitled Campaign',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    map: { cols: 30, rows: 20, cell: 48, tiles: {} },
    tokens: [],
    characters: [],
    combat: { active: false, round: 0, turn: 0, order: [] },
    rollLog: [],
    ...patch,
  };
}

const TOKEN_COLORS = ['#e2504d', '#4d90e2', '#54b06a', '#c77dff', '#e0a44d', '#4dc4c4', '#e26fa8', '#8a92a6'];
export function randomTokenColor() {
  return TOKEN_COLORS[Math.floor(Math.random() * TOKEN_COLORS.length)];
}
