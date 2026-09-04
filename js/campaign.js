/** Campaign manager modal: rename, map size, save/load library, import/export, new. */
import { getState, dispatch, loadCampaign } from './store.js';
import { el, openModal, closeModal, toast, confirmDialog } from './ui.js';
import {
  listCampaigns, loadCampaignById, deleteCampaign, saveCampaign,
  exportCampaign, importCampaign,
} from './storage.js';
import { newCampaign } from './rules.js';

export function openCampaignModal() {
  const node = el('div', { class: 'campaign-mgr' });
  render();
  openModal(node);

  function render() {
    const c = getState().campaign;
    node.replaceChildren(
      el('h2', {}, 'Campaign'),

      el('section', { class: 'builder-section' },
        el('h3', {}, 'This campaign'),
        el('label', { class: 'b-field' }, el('span', {}, 'Name'),
          el('input', { value: c.name, onchange: (e) => dispatch({ type: 'campaign/rename', payload: { name: e.target.value } }) })),
        el('div', { class: 'row' },
          numField('Columns', c.map.cols, (v) => resize({ cols: v })),
          numField('Rows', c.map.rows, (v) => resize({ rows: v })),
          numField('Cell px', c.map.cell, (v) => resize({ cell: v })),
        ),
        el('div', { class: 'row' },
          el('button', { class: 'mini', onclick: () => { saveCampaign(c); toast('Saved'); } }, '💾 Save now'),
          el('button', { class: 'mini', onclick: () => exportCampaign(c) }, '⭳ Export JSON'),
          el('label', { class: 'mini filelabel' }, '⭱ Import JSON',
            el('input', { type: 'file', accept: 'application/json', hidden: true, onchange: onImport })),
          el('button', { class: 'mini danger', onclick: async () => {
            if (await confirmDialog('Clear all painted terrain?')) dispatch({ type: 'map/clearTerrain' });
          } }, 'Clear terrain'),
        ),
      ),

      el('section', { class: 'builder-section' },
        el('h3', {}, 'Saved campaigns'),
        library(c.id),
        el('button', { class: 'primary', onclick: async () => {
          if (await confirmDialog('Start a new empty campaign? Unsaved changes are lost.')) {
            loadCampaign(newCampaign());
            closeModal();
            toast('New campaign');
          }
        } }, '＋ New campaign'),
      ),

      el('div', { class: 'row end' }, el('button', { class: 'mini', onclick: closeModal }, 'Close')),
    );
  }

  function resize(patch) {
    const m = getState().campaign.map;
    dispatch({ type: 'map/resize', payload: {
      cols: clamp(patch.cols ?? m.cols, 5, 100),
      rows: clamp(patch.rows ?? m.rows, 5, 100),
      cell: clamp(patch.cell ?? m.cell, 20, 120),
    } });
    render();
  }

  function library(activeId) {
    const items = listCampaigns();
    if (!items.length) return el('p', { class: 'muted' }, 'Nothing saved yet.');
    return el('ul', { class: 'stack' }, ...items.map((it) => el('li', { class: 'row-item' },
      el('span', { class: 'grow' }, it.name, it.id === activeId ? el('span', { class: 'muted small' }, ' · active') : null,
        el('span', { class: 'muted small' }, ` · ${new Date(it.updatedAt || 0).toLocaleString()}`)),
      el('button', { class: 'mini', onclick: () => {
        const loaded = loadCampaignById(it.id);
        if (loaded) { loadCampaign(loaded); closeModal(); toast(`Loaded ${loaded.name}`); }
      } }, 'Load'),
      el('button', { class: 'mini danger', onclick: async () => {
        if (await confirmDialog(`Delete saved campaign “${it.name}”?`)) { deleteCampaign(it.id); render(); }
      } }, '✕'),
    )));
  }

  async function onImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const c = await importCampaign(file);
      loadCampaign(c);
      closeModal();
      toast(`Imported ${c.name}`);
    } catch (err) {
      toast(`Import failed: ${err.message}`);
    }
  }
}

function numField(label, value, onCommit) {
  return el('label', { class: 'b-field' }, el('span', {}, label),
    el('input', { type: 'number', value, onchange: (e) => onCommit(Number(e.target.value)) }));
}
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n || lo));
