/**
 * BAD App → Members tab
 * Copies every player card from the BAD App into the "Members" tab of BAD APP – Master.
 * Runs every 15 minutes once set up, and from the menu: BAD App → Update members now.
 *
 * Setup (once): Extensions → Apps Script → paste this file → paste appsscript.json →
 * pick "setup" in the toolbar → Run → allow access.
 */
const PROJECT_ID = 'bad-app-ef601';
const TAB = 'Members';
const SHEET_ID = '1ATPRh9Z-voVhE_8a5PNQUZnrLoEHBhM9iZAIR-1FeRA'; // BAD APP – Master
const WELCOME_POINTS = 20;
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Pro', 'National'];
const CLUBS = {
  badminton: 'The BAD Club', volleyball: 'VolleyBAD', pickleball: 'BADDINK', run: 'Runaways',
  basketball: 'BADSHOTS', training: 'Training Department', retreat: 'BAD Retreat', vibe: 'BAD Community'
};
const EDITIONS = { oncourt: 'On-Court', courtside: 'Courtside', offcourt: 'Off-Court', member: 'Member' };
const STAFF = ['Crew', 'Community Manager', 'Founder'];

function onOpen() {
  try { SpreadsheetApp.getUi().createMenu('BAD App').addItem('Update members now', 'syncMembers').addToUi(); } catch (e) {}
}

/** Run once: adds the 15-minute timer and fills the tab straight away. */
function setup() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'syncMembers')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncMembers').timeBased().everyMinutes(15).create();
  syncMembers();
}

function syncMembers() {
  const profiles = list_('profiles');
  const contacts = byId_(list_('contacts'));
  const ledger = list_('ledger');
  const verified = getDoc_('config/members');

  const points = {};
  ledger.forEach(e => {
    const k = e.player; if (!k) return;
    const p = Number(e.pts) || 0;
    points[k] = points[k] || { earned: 0, spent: 0 };
    if (p >= 0) points[k].earned += p; else points[k].spent += -p;
  });

  const rows = profiles
    .filter(p => !p.sample)
    .map(p => {
      const c = contacts[p.id] || {};
      const want = (p.memReq && p.memReq.type) || 'Guest';
      const v = verified[p.id] || {};
      let level = want, status = 'Open';
      if (v.type === want) status = 'Verified';
      else if (want !== 'Guest' && v.declined === want) status = 'Declined';
      else if (want !== 'Guest') status = 'Waiting for an admin';
      if (status !== 'Verified' && want !== 'Guest') level = want + ' (requested)';
      const sports = (p.sports && p.sports.length) ? p.sports : ['badminton'];
      const lv = p.levels || {};
      const types = p.types || {};
      const pt = points[p.listKey] || { earned: 0, spent: 0 };
      const earned = pt.earned + WELCOME_POINTS;
      return [
        date_(p.createdAt),
        p.nickname || '',
        p.listName || '',
        c.email || '',
        c.mobile || c.whatsapp || '',
        c.instagram || '',
        level,
        status,
        p.number == null ? '' : String(p.number),
        p.ref || '',
        p.referredBy || '',
        CLUBS[p.primary || sports[0]] || '',
        sports.map(k => CLUBS[k] || k).join(', '),
        sports.filter(k => lv[k] != null && lv[k] !== '').map(k => (CLUBS[k] || k) + ': ' + (LEVELS[lv[k]] || lv[k])).join(', '),
        Object.keys(types).filter(k => types[k]).map(k => (CLUBS[k] || k) + ': ' + types[k]).join(', '),
        p.shot || '',
        p.hand || '',
        earned - pt.spent,
        earned,
        EDITIONS[p.edition] || p.edition || '',
        date_(p.updatedAt),
        p.id
      ];
    })
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])));

  const sh = (SpreadsheetApp.getActive() || SpreadsheetApp.openById(SHEET_ID)).getSheetByName(TAB);
  if (!sh) throw new Error('No tab called ' + TAB);
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, 22).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, 22).setValues(rows);
  sh.getRange('A1').setNote('Filled by the BAD App every 15 minutes. Last update: ' +
    Utilities.formatDate(new Date(), 'Asia/Dubai', 'd MMM yyyy, h:mm a') + '. Changes typed here are replaced on the next update; edit players in the app.');
}

/* ---------- Firestore (reads with the sheet owner's Google account) ---------- */
function base_() { return 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/'; }
function fetch_(url) {
  const r = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  return { code: r.getResponseCode(), body: r.getContentText() };
}
function list_(col) {
  const out = []; let token = '';
  do {
    const r = fetch_(base_() + col + '?pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
    if (r.code !== 200) throw new Error('Could not read ' + col + ': ' + r.body.slice(0, 300));
    const j = JSON.parse(r.body);
    (j.documents || []).forEach(d => out.push(Object.assign({ id: d.name.split('/').pop() }, val_({ mapValue: { fields: d.fields || {} } }))));
    token = j.nextPageToken || '';
  } while (token);
  return out;
}
function getDoc_(path) {
  const r = fetch_(base_() + path);
  if (r.code === 404) return {};
  if (r.code !== 200) throw new Error('Could not read ' + path + ': ' + r.body.slice(0, 300));
  return val_({ mapValue: { fields: JSON.parse(r.body).fields || {} } });
}
function byId_(arr) { const o = {}; arr.forEach(x => o[x.id] = x); return o; }
function val_(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(val_);
  if ('mapValue' in v) { const o = {}, f = v.mapValue.fields || {}; Object.keys(f).forEach(k => o[k] = val_(f[k])); return o; }
  return null;
}
function date_(s) { if (!s) return ''; const d = new Date(s); return isNaN(d) ? '' : d; }
