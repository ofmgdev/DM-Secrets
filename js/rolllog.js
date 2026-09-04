/** Shared roll helper — rolls dice and pushes a structured entry to the log. */
import { dispatch } from './store.js';
import { roll, describe, d20 } from './dice.js';
import { toast } from './ui.js';

export function logRoll({ who = 'DM', label = '', formula }) {
  let result;
  try {
    result = roll(formula);
  } catch (e) {
    toast(e.message);
    return null;
  }
  dispatch({
    type: 'roll/log',
    payload: { who, label, formula: result.notation, total: result.total, detail: describe(result) },
  });
  toast(`${label || formula}: ${result.total}`);
  return result;
}

export function logD20({ who = 'DM', label, bonus = 0, mode = 'normal' }) {
  const result = d20(bonus, mode);
  const tag = mode === 'adv' ? ' (adv)' : mode === 'dis' ? ' (dis)' : '';
  dispatch({
    type: 'roll/log',
    payload: { who, label: `${label}${tag}`, formula: result.notation, total: result.total, detail: describe(result) },
  });
  const nat = result.parts[0]?.dice ?? [];
  const kept = nat.filter((_, i) => !result.parts[0].dropped[i])[0];
  let flair = '';
  if (kept === 20) flair = ' — NAT 20!';
  else if (kept === 1) flair = ' — nat 1…';
  toast(`${label}${tag}: ${result.total}${flair}`);
  return result;
}
