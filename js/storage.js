/**
 * Persistence. Autosaves the active campaign to localStorage (debounced) and
 * offers JSON export/import. Every campaign is also kept in a keyed library so
 * the DM can juggle several.
 */
const ACTIVE_KEY = 'dmsecrets.active';
const LIB_PREFIX = 'dmsecrets.campaign.';
const SCHEMA = 1;

let timer = null;

export function autosave(campaign) {
  clearTimeout(timer);
  timer = setTimeout(() => saveCampaign(campaign), 400);
}

export function saveCampaign(campaign) {
  try {
    const blob = JSON.stringify({ schema: SCHEMA, campaign });
    localStorage.setItem(LIB_PREFIX + campaign.id, blob);
    localStorage.setItem(ACTIVE_KEY, campaign.id);
  } catch (e) {
    console.warn('save failed', e);
  }
}

export function loadActive() {
  try {
    const id = localStorage.getItem(ACTIVE_KEY);
    if (!id) return null;
    return loadCampaignById(id);
  } catch {
    return null;
  }
}

export function loadCampaignById(id) {
  try {
    const raw = localStorage.getItem(LIB_PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function listCampaigns() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(LIB_PREFIX)) continue;
    try {
      const { campaign } = JSON.parse(localStorage.getItem(key));
      out.push({ id: campaign.id, name: campaign.name, updatedAt: campaign.updatedAt });
    } catch { /* skip */ }
  }
  return out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function deleteCampaign(id) {
  localStorage.removeItem(LIB_PREFIX + id);
  if (localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY);
}

export function exportCampaign(campaign) {
  const blob = new Blob([JSON.stringify({ schema: SCHEMA, campaign }, null, 2)],
    { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug(campaign.name)}.dmsecrets.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function importCampaign(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const c = migrate(parsed);
        if (!c) throw new Error('not a campaign file');
        resolve(c);
      } catch (e) { reject(e); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function migrate(parsed) {
  if (!parsed) return null;
  const campaign = parsed.campaign || parsed;
  if (!campaign || !campaign.map) return null;
  // future schema migrations slot in here
  campaign.combat = campaign.combat || { active: false, round: 0, turn: 0, order: [] };
  campaign.rollLog = campaign.rollLog || [];
  campaign.tokens = campaign.tokens || [];
  campaign.characters = campaign.characters || [];
  return campaign;
}

function slug(s) {
  return String(s || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'campaign';
}
