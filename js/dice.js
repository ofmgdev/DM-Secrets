/**
 * Dice notation parser + roller.
 * Supports: NdM, +/- modifiers and flat numbers, multiple terms,
 *   kh/kl (keep highest/lowest N), dl/dh (drop lowest/highest N),
 *   advantage/disadvantage via `2d20kh1` / `2d20kl1`.
 * Examples: "1d20+5", "2d6+3", "4d6kh3", "1d20+1d4+3", "3d8-1"
 */

const TERM_RE = /([+-]?)\s*(\d*)d(\d+)((?:(?:kh|kl|dl|dh)\d+)*)|([+-]?)\s*(\d+)(?!d)/gi;

function rollDie(sides) {
  return 1 + Math.floor(Math.random() * sides);
}

export function roll(notation) {
  const src = String(notation).trim().toLowerCase().replace(/\s+/g, '');
  if (!src) throw new Error('empty roll');

  let total = 0;
  const parts = [];
  let matched = false;
  TERM_RE.lastIndex = 0;
  let m;

  while ((m = TERM_RE.exec(src)) !== null) {
    matched = true;
    if (m[3] !== undefined && m[3] !== '') {
      // dice term
      const sign = m[1] === '-' ? -1 : 1;
      const count = Math.min(200, Math.max(1, parseInt(m[2] || '1', 10)));
      const sides = Math.min(1000, Math.max(2, parseInt(m[3], 10)));
      const mods = m[4] || '';

      let rolls = Array.from({ length: count }, () => rollDie(sides));
      const original = [...rolls];
      const kept = new Set(rolls.map((_, i) => i));

      const modRe = /(kh|kl|dl|dh)(\d+)/g;
      let mm;
      while ((mm = modRe.exec(mods)) !== null) {
        const op = mm[1];
        const n = parseInt(mm[2], 10);
        const idxSorted = [...kept].sort((a, b) => rolls[a] - rolls[b]); // asc
        let drop = [];
        if (op === 'kh') drop = idxSorted.slice(0, Math.max(0, kept.size - n));
        if (op === 'kl') drop = idxSorted.slice(Math.min(kept.size, n));
        if (op === 'dl') drop = idxSorted.slice(0, n);
        if (op === 'dh') drop = idxSorted.slice(-n);
        drop.forEach((i) => kept.delete(i));
      }

      const keptVals = [...kept].map((i) => rolls[i]);
      const sub = keptVals.reduce((a, b) => a + b, 0) * sign;
      total += sub;
      parts.push({
        kind: 'dice',
        text: `${count}d${sides}${mods}`,
        sign,
        dice: original,
        dropped: original.map((_, i) => !kept.has(i)),
        sub,
      });
    } else if (m[6] !== undefined) {
      const sign = m[5] === '-' ? -1 : 1;
      const val = parseInt(m[6], 10) * sign;
      total += val;
      parts.push({ kind: 'flat', sign, value: Math.abs(val), sub: val });
    }
  }

  if (!matched) throw new Error(`can't parse "${notation}"`);
  return { notation: src, total, parts };
}

/** Human-readable breakdown, e.g. "[15, ~4~, 12] + 3 = 30" */
export function describe(result) {
  const chunks = result.parts.map((p) => {
    if (p.kind === 'flat') {
      return `${p.sign < 0 ? '−' : '+'} ${p.value}`;
    }
    const inner = p.dice
      .map((v, i) => (p.dropped[i] ? `~~${v}~~` : `${v}`))
      .join(', ');
    return `${p.sign < 0 ? '− ' : ''}[${inner}]`;
  });
  let s = chunks.join(' ').replace(/^\+ /, '');
  return `${s} = ${result.total}`;
}

/** Roll a d20 check with optional advantage/disadvantage and a flat bonus. */
export function d20(bonus = 0, mode = 'normal') {
  const notation =
    mode === 'adv' ? `2d20kh1${fmt(bonus)}`
    : mode === 'dis' ? `2d20kl1${fmt(bonus)}`
    : `1d20${fmt(bonus)}`;
  return roll(notation);
}

function fmt(n) {
  if (!n) return '';
  return n > 0 ? `+${n}` : `${n}`;
}
