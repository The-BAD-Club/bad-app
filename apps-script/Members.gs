/**
 * BAD App ⇄ BAD APP – Master
 * Every 15 minutes (and from the menu: BAD App → Update now):
 *  1. New BADges given in the app go to the BADges tab (A:E).
 *  2. New points entries from the app (events, retreats, no-shows, free sessions) go to the Points Ledger tab (A:G).
 *  3. The Points Settings tab and every row of Points Balance are copied into the app, so both show the same numbers.
 *  4. Every player card is copied into the Members tab (A:V only; W onwards are sheet formulas).
 *
 * Setup (once): Extensions → Apps Script → paste this file → paste appsscript.json →
 * pick "setup" in the toolbar → Run → allow access.
 */
const PROJECT_ID = 'bad-app-ef601';
const TAB = 'Members';
const SHEET_ID = '1ATPRh9Z-voVhE_8a5PNQUZnrLoEHBhM9iZAIR-1FeRA'; // BAD APP – Master
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Pro', 'National'];
const CLUBS = {
  badminton: 'The BAD Club', volleyball: 'VolleyBAD', pickleball: 'BADDINK', run: 'Runaways',
  basketball: 'BADSHOTS', training: 'Training Department', retreat: 'BAD Retreat', vibe: 'BAD Community'
};
const EDITIONS = { oncourt: 'On-Court', courtside: 'Courtside', offcourt: 'Off-Court', member: 'Member' };
const STAFF = ['Crew', 'Community Manager', 'Founder'];

function onOpen() {
  try { SpreadsheetApp.getUi().createMenu('BAD App').addItem('Update now', 'syncMembers').addToUi(); } catch (e) {}
}

/** Run once: adds the 15-minute timer and fills the tab straight away. */
function setup() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'syncMembers')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncMembers').timeBased().everyMinutes(15).create();
  syncMembers();
}

/** The 15-minute job. Points first, so the Members formulas see the newest BADges and entries. */
function syncMembers() {
  try { syncPoints(); } catch (e) { console.error('Points sync: ' + e); }
  syncMembersTab_();
}

function syncMembersTab_() {
  const profiles = list_('profiles');
  const contacts = byId_(list_('contacts'));
  const verified = getDoc_('config/members');

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
        '', // R: App points (old rules), no longer used
        '', // S: App lifetime points (old rules), no longer used
        EDITIONS[p.edition] || p.edition || '',
        date_(p.updatedAt),
        p.id
      ];
    })
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])));

  const sh = book_().getSheetByName(TAB);
  if (!sh) throw new Error('No tab called ' + TAB);
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, 22).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, 22).setValues(rows);
  sh.getRange('A1').setNote('Filled by the BAD App every 15 minutes. Last update: ' +
    Utilities.formatDate(new Date(), 'Asia/Dubai', 'd MMM yyyy, h:mm a') + '. Changes typed here are replaced on the next update; edit players in the app.');
}

/* ---------- Points and BADges ---------- */
const LEDGER_TYPES = ['Event or tournament', 'BAD Retreat', 'No-show', 'Free session redeemed', 'Adjustment'];
function book_() { return SpreadsheetApp.getActive() || SpreadsheetApp.openById(SHEET_ID); }

function syncPoints() {
  const ss = book_();
  pushRows_(ss.getSheetByName('BADges'), list_('badges').filter(b => b.synced !== true), 'badges',
    b => [day_(b.date), b.player || b.name || '', Number(b.n) || 1, b.by || b.byEmail || '', b.reason || '']);
  pushRows_(ss.getSheetByName('Points Ledger'), list_('ledger').filter(e => e.v === 2 && e.synced !== true), 'ledger',
    e => [day_(e.date), e.player || e.name || '', e.dept || '', LEDGER_TYPES.indexOf(e.type) >= 0 ? e.type : 'Adjustment', Number(e.pts) || 0, e.reason || '', e.by || '']);
  SpreadsheetApp.flush();
  setDoc_('config/points', readSettings_(ss.getSheetByName('Points Settings')));
  setDoc_('config/sheetPoints', readBalances_(ss.getSheetByName('Points Balance')));
}

/** Adds rows under the last filled row of column A (other columns hold formulas), then marks them as sent. */
function pushRows_(sh, docs, col, toRow) {
  if (!sh || !docs.length) return;
  docs.sort((a, b) => String(a.at || a.date).localeCompare(String(b.at || b.date)));
  const a = sh.getRange('A1:A' + sh.getMaxRows()).getValues();
  let last = a.length; while (last > 1 && a[last - 1][0] === '') last--;
  const rows = docs.map(toRow), w = rows[0].length;
  if (last + rows.length > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), last + rows.length - sh.getMaxRows());
  sh.getRange(last + 1, 1, rows.length, w).setValues(rows);
  docs.forEach(d => patch_(col + '/' + d.id, { synced: true, syncedAt: new Date() }));
}

function readSettings_(sh) {
  const v = sh.getRange('A1:C45').getValues(), num = x => Number(x) || 0, txt = x => String(x == null ? '' : x).trim();
  const launch = v[7][1] instanceof Date ? Utilities.formatDate(v[7][1], 'Asia/Dubai', 'yyyy-MM-dd') : txt(v[7][1]);
  const other = {}; for (let r = 14; r <= 18; r++) if (txt(v[r][0])) other[txt(v[r][0])] = num(v[r][1]);
  if (other['No-show'] != null) other['No-show or late cancellation'] = other['No-show'];
  const levels = []; for (let r = 27; r <= 30; r++) if (txt(v[r][0])) levels.push({ k: txt(v[r][0]), at: num(v[r][1]), d: txt(v[r][2]) });
  const reasons = []; for (let r = 34; r <= 44; r++) if (txt(v[r][0]) && !/^(reason|when to give)/i.test(txt(v[r][0]))) reasons.push({ k: txt(v[r][0]), n: txt(v[r][1]), eg: txt(v[r][2]) });
  return { per: num(v[4][1]) || 5, free: num(v[5][1]) || 100, expire: num(v[6][1]) || 90, launch: launch,
    other: other, levels: levels, top: { k: txt(v[31][0]), d: txt(v[31][2]) }, reasons: reasons, at: new Date() };
}

function readBalances_(sh) {
  const v = sh.getDataRange().getValues(), h = v[0].map(x => String(x).toLowerCase()), players = {};
  const c = k => h.findIndex(x => x.indexOf(k) === 0), money = x => typeof x === 'number' ? x : Number(String(x).replace(/[^0-9.\-]/g, '')) || 0;
  const iName = c('player'), I = { sessions: c('sessions'), unpaid: c('unpaid'), status: c('payment status'), last: c('last active'), from: c('points count from'),
    earned: c('points earned'), used: c('points used'), balance: c('points balance'), badges: c('badges'), level: c('level'), free: c('free sessions') };
  for (let r = 1; r < v.length; r++) {
    const name = String(v[r][iName] || '').trim(); if (!name) continue;
    const row = { name: name };
    Object.keys(I).forEach(k => { if (I[k] < 0) return; const x = v[r][I[k]];
      row[k] = x instanceof Date ? Utilities.formatDate(x, 'Asia/Dubai', 'yyyy-MM-dd') : (k === 'status' || k === 'level') ? String(x) : (k === 'last' || k === 'from') ? String(x || '') : money(x); });
    players[name.toLowerCase().replace(/\s+/g, ' ')] = row;
  }
  return { players: players, at: new Date() };
}
function day_(s) { if (!s) return ''; const d = new Date(String(s).slice(0, 10) + 'T12:00:00+04:00'); return isNaN(d) ? String(s) : d; }

/* ---------- Firestore (with the sheet owner's Google account) ---------- */
function base_() { return 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/'; }
function fetch_(url, method, body) {
  const o = { method: method || 'get', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true };
  if (body) { o.contentType = 'application/json'; o.payload = JSON.stringify(body); }
  const r = UrlFetchApp.fetch(url, o);
  return { code: r.getResponseCode(), body: r.getContentText() };
}
/** Replaces a whole document. */
function setDoc_(path, obj) {
  const r = fetch_(base_() + path, 'patch', { fields: enc_(obj).mapValue.fields });
  if (r.code !== 200) throw new Error('Could not write ' + path + ': ' + r.body.slice(0, 300));
}
/** Changes only the given fields. */
function patch_(path, obj) {
  const q = Object.keys(obj).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  const r = fetch_(base_() + path + '?' + q, 'patch', { fields: enc_(obj).mapValue.fields });
  if (r.code !== 200) throw new Error('Could not update ' + path + ': ' + r.body.slice(0, 300));
}
function enc_(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc_) } };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'object') { const f = {}; Object.keys(v).forEach(k => f[k] = enc_(v[k])); return { mapValue: { fields: f } }; }
  return { stringValue: String(v) };
}
function list_(col) {
  const out = []; let token = '';
  do {
    const r = fetch_(base_() + col + '?pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
    if (r.code === 404) return out;
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
