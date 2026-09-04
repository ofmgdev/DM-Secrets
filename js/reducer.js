/**
 * Pure reducer: (campaign, action) -> campaign.
 * Keep every case immutable-ish (shallow clones) so subscribers can diff, and so
 * a future network layer can serialize/replay actions deterministically.
 */
import { uid, randomTokenColor } from './rules.js';

const ROLL_LOG_MAX = 60;

export function reducer(campaign, action) {
  const c = campaign;
  switch (action.type) {
    case 'campaign/replace':
      return { ...action.payload, updatedAt: Date.now() };

    case 'campaign/rename':
      return { ...c, name: action.payload.name };

    case 'map/resize': {
      const { cols, rows, cell } = action.payload;
      return { ...c, map: { ...c.map, cols: cols ?? c.map.cols, rows: rows ?? c.map.rows, cell: cell ?? c.map.cell } };
    }

    case 'map/paint': {
      const tiles = { ...c.map.tiles };
      for (const { x, y, kind } of action.payload.cells) {
        const key = `${x},${y}`;
        if (kind === null) delete tiles[key];
        else tiles[key] = kind;
      }
      return { ...c, map: { ...c.map, tiles } };
    }

    case 'map/clearTerrain':
      return { ...c, map: { ...c.map, tiles: {} } };

    case 'token/add': {
      const t = {
        id: uid('tok'),
        name: action.payload.name || 'Token',
        charId: action.payload.charId || null,
        x: action.payload.x ?? 1,
        y: action.payload.y ?? 1,
        size: action.payload.size || 1,
        color: action.payload.color || randomTokenColor(),
        hp: action.payload.hp || null,
        ac: action.payload.ac ?? null,
        initiative: null,
        isEnemy: !!action.payload.isEnemy,
      };
      return { ...c, tokens: [...c.tokens, t] };
    }

    case 'token/move': {
      const tokens = c.tokens.map((t) =>
        t.id === action.payload.id ? { ...t, x: action.payload.x, y: action.payload.y } : t);
      return { ...c, tokens };
    }

    case 'token/update': {
      const tokens = c.tokens.map((t) =>
        t.id === action.payload.id ? { ...t, ...action.payload.patch } : t);
      return { ...c, tokens };
    }

    case 'token/hp': {
      const tokens = c.tokens.map((t) => {
        if (t.id !== action.payload.id || !t.hp) return t;
        const cur = Math.max(0, Math.min(t.hp.max, t.hp.cur + action.payload.delta));
        return { ...t, hp: { ...t.hp, cur } };
      });
      return { ...c, tokens };
    }

    case 'token/remove': {
      const tokens = c.tokens.filter((t) => t.id !== action.payload.id);
      const order = c.combat.order.filter((id) => id !== action.payload.id);
      return { ...c, tokens, combat: { ...c.combat, order } };
    }

    case 'char/add':
      return { ...c, characters: [...c.characters, action.payload.character] };

    case 'char/update': {
      const characters = c.characters.map((ch) =>
        ch.id === action.payload.id ? { ...ch, ...action.payload.patch } : ch);
      // keep linked tokens' quick stats in sync
      const src = characters.find((ch) => ch.id === action.payload.id);
      const tokens = c.tokens.map((t) => {
        if (t.charId !== action.payload.id || !src) return t;
        return { ...t, name: src.name, color: src.color, ac: src.armorClass,
          hp: { cur: src.curHp, max: src.maxHp } };
      });
      return { ...c, characters, tokens };
    }

    case 'char/remove': {
      const characters = c.characters.filter((ch) => ch.id !== action.payload.id);
      const tokens = c.tokens.map((t) => (t.charId === action.payload.id ? { ...t, charId: null } : t));
      return { ...c, characters, tokens };
    }

    // ---- combat ----
    case 'combat/setInitiative': {
      const tokens = c.tokens.map((t) =>
        t.id === action.payload.id ? { ...t, initiative: action.payload.value } : t);
      return withOrder({ ...c, tokens });
    }

    case 'combat/start': {
      const withInit = withOrder(c);
      return { ...c, combat: { ...withInit.combat, active: true, round: 1, turn: 0 } };
    }

    case 'combat/end':
      return { ...c, combat: { active: false, round: 0, turn: 0, order: [] } };

    case 'combat/next': {
      if (!c.combat.active || c.combat.order.length === 0) return c;
      let turn = c.combat.turn + 1;
      let round = c.combat.round;
      if (turn >= c.combat.order.length) { turn = 0; round += 1; }
      return { ...c, combat: { ...c.combat, turn, round } };
    }

    case 'combat/prev': {
      if (!c.combat.active || c.combat.order.length === 0) return c;
      let turn = c.combat.turn - 1;
      let round = c.combat.round;
      if (turn < 0) { turn = c.combat.order.length - 1; round = Math.max(1, round - 1); }
      return { ...c, combat: { ...c.combat, turn, round } };
    }

    // ---- dice ----
    case 'roll/log': {
      const entry = { id: uid('roll'), ts: Date.now(), ...action.payload };
      const rollLog = [entry, ...c.rollLog].slice(0, ROLL_LOG_MAX);
      return { ...c, rollLog };
    }

    case 'roll/clear':
      return { ...c, rollLog: [] };

    default:
      return c;
  }
}

/** Recompute initiative order from tokens that have an initiative value. */
function withOrder(c) {
  const order = c.tokens
    .filter((t) => t.initiative != null)
    .sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      // tie-break by dex-ish: fall back to name
      return a.name.localeCompare(b.name);
    })
    .map((t) => t.id);
  return { ...c, combat: { ...c.combat, order } };
}
