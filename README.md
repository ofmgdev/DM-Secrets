# DM Secrets — D&D Game Table

A browser-based virtual tabletop for running D&D 5e games at a single screen:
battle map, tokens, character sheets, a dice roller, and an initiative tracker.
No build step, no server, no dependencies — plain ES modules.

## Run it

Serve the folder with any static file server and open `index.html`:

```bash
python -m http.server 8123
```

Then visit <http://localhost:8123>.

## Features

- **Battle map** — paint floor/wall terrain, pan (drag) and zoom (scroll), grid toggle.
- **Tokens** — drop tokens, drag to snap to the grid, per-token HP bars and colour,
  right-click for a context menu (sheet, HP, initiative, remove).
- **Character builder** — race / class / background, ability scores by standard array,
  4d6-drop-lowest, or 27-point buy; class + background skill proficiencies; HP, AC,
  spell slots and saves derived automatically.
- **Character sheet** — full 5e sheet with live modifiers; every ability check, save,
  skill, attack and spell-attack is a clickable roll (Shift = advantage, Alt = disadvantage).
- **Dice roller** — `2d6+3`, `4d6kh3`, `1d20+1d4+5`, `1d100`… with a shared roll log.
- **Initiative tracker** — roll for all combatants, ordered turn tracker, round counter.
- **Campaigns** — autosaved to `localStorage`; export / import as JSON; multiple saved campaigns.

## Architecture

State lives in `js/store.js` and every change is a dispatched action run through a
pure reducer (`js/reducer.js`). This is the seam for **multiplayer**: a future network
layer can broadcast dispatched actions and replay remote ones through the same reducer
so all clients converge.

| File | Responsibility |
|------|----------------|
| `store.js` | central state, dispatch, subscribe, middleware |
| `reducer.js` | pure `(campaign, action) → campaign` |
| `rules.js` | 5e data tables + math helpers, factories |
| `dice.js` | dice-notation parser / roller |
| `rolllog.js` | roll → structured log entry |
| `map.js` | terrain canvas, grid, pan/zoom, paint tools |
| `tokens.js` | token render, drag, context menu, placement |
| `sheet.js` | character sheet UI |
| `builder.js` | character creation wizard |
| `sidebar.js` | initiative, token/character lists, dice panel |
| `campaign.js` | campaign manager modal |
| `storage.js` | localStorage persistence + JSON import/export |
| `ui.js` | DOM helpers + modal manager |
| `main.js` | bootstrap, toolbar, keyboard, render loop |

## Keyboard

`V` select · `F` floor · `W` wall · `E` erase · `G` grid · `N` next turn (in combat) · `Esc` cancel
