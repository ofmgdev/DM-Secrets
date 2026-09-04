/**
 * Central state store.
 *
 * Every change to the campaign goes through `dispatch(action)`. A pure reducer
 * produces the next state and subscribers are notified. This indirection is the
 * seam for future multiplayer: a network layer can intercept dispatched actions,
 * broadcast them to peers, and replay remote actions through the same reducer so
 * every client converges on the same state.
 */
import { reducer } from './reducer.js';
import { newCampaign } from './rules.js';

const listeners = new Set();
let state = { campaign: newCampaign(), ui: { tool: 'select', showGrid: true } };
let middlewares = [];

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Register a function called with (action, prevState, nextState) after every dispatch. */
export function use(mw) {
  middlewares.push(mw);
}

export function dispatch(action) {
  const prev = state;
  const nextCampaign = action.scope === 'ui'
    ? prev.campaign
    : reducer(prev.campaign, action);

  const nextUi = action.scope === 'ui'
    ? { ...prev.ui, ...action.payload }
    : prev.ui;

  state = { campaign: nextCampaign, ui: nextUi };

  for (const mw of middlewares) {
    try { mw(action, prev, state); } catch (e) { console.error('middleware error', e); }
  }
  for (const fn of listeners) {
    try { fn(state, action); } catch (e) { console.error('listener error', e); }
  }
  return action;
}

/** Replace the whole campaign (load / import). */
export function loadCampaign(campaign) {
  dispatch({ type: 'campaign/replace', payload: campaign });
}

// convenience UI action
export function setUi(patch) {
  dispatch({ scope: 'ui', type: 'ui/set', payload: patch });
}
