/* ---------- Notifications (v0.86) ----------
   The app queues messages in Firestore (pushQueue/{id}) and every phone that turned notifications on has a
   pushTokens/{token} document. sendPush() runs every minute: it works out who each message is for, sends it with
   Firebase Cloud Messaging, then deletes the queued message. Tokens that no longer work are removed.
   Setup (once): add this file next to Members.gs, add the firebase.messaging scope to appsscript.json,
   then pick "setupPush" in the toolbar → Run → allow access. */
const FCM_URL = 'https://fcm.googleapis.com/v1/projects/' + PROJECT_ID + '/messages:send';
const SITE = 'https://thebadclub.com/';

function setupPush() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'sendPush').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendPush').timeBased().everyMinutes(1).create();
  sendPush();
}

function sendPush() {
  const queue = list_('pushQueue');
  if (!queue.length) return;
  const tokens = list_('pushTokens').map(t => ({ uid: t.uid, token: t.token || t.id })).filter(t => t.token);
  const byUid = {};
  tokens.forEach(t => (byUid[t.uid] = byUid[t.uid] || []).push(t.token));
  const dead = {};
  queue.forEach(m => {
    try {
      const msg = describe_(m);
      if (msg) {
        const list = msg.to === 'all' ? tokens.map(t => t.token) : [].concat.apply([], msg.to.map(u => byUid[u] || []));
        Array.from(new Set(list)).forEach(tok => { if (!dead[tok] && !sendOne_(tok, msg)) dead[tok] = true; });
      }
    } catch (e) { console.error('push ' + m.id + ': ' + e); }
    try { del_('pushQueue/' + m.id); } catch (e) { console.error(e); }
  });
  Object.keys(dead).forEach(tok => { try { del_('pushTokens/' + tok); } catch (_) {} });
}

/** Who a queued message is for, and what it says. */
function describe_(m) {
  switch (m.type) {
    case 'test': return { to: [m.uid], title: 'Notifications are on', body: 'You’ll hear from BAD here. See you on court.', link: '#card' };
    case 'testimonial': return { to: [m.to], title: 'New testimonial', body: (m.fromName || 'A BADDY') + ' wrote you a testimonial. Tap to read it and show it on your profile.', link: '#card' };
    case 'post': return { to: 'all', title: m.title || 'New on BAD', body: m.body || '', link: '#club' };
    case 'session-new': return { to: 'all', title: m.title || 'New session', body: m.body || 'Spots are open in Play.', link: '#s=' + encodeURIComponent(m.sid || '') };
    case 'broadcast': return { to: 'all', title: m.title || 'The BAD Club', body: m.body || '', link: m.link || '' };
    case 'promoted': return { to: [m.uid], title: 'You’re in', body: 'A spot opened up for you. See you there.', link: '#s=' + encodeURIComponent(m.sid || '') };
    case 'session-change': return { to: bookers_(m.sid), title: m.title || 'Session update', body: m.body || 'Something changed. Tap to see.', link: '#s=' + encodeURIComponent(m.sid || '') };
  }
  return null;
}
function bookers_(sid) {
  return list_('bookings').filter(b => b.s && b.s[sid] && !b.s[sid].out).map(b => b.id);
}

/** Sends one notification. Returns false when the token is gone for good. */
function sendOne_(token, msg) {
  const body = { message: { token: token,
    notification: { title: String(msg.title).slice(0, 80), body: String(msg.body || '').slice(0, 200) },
    webpush: { fcm_options: { link: SITE + (msg.link || '') }, notification: { icon: SITE + 'icon-192.png', badge: SITE + 'icon-192.png' } } } };
  const r = UrlFetchApp.fetch(FCM_URL, { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, payload: JSON.stringify(body) });
  const code = r.getResponseCode(), text = r.getContentText();
  if (code === 200) return true;
  if (code === 404 || /UNREGISTERED|registration-token-not-registered/i.test(text)) return false;
  console.error('FCM ' + code + ': ' + text.slice(0, 300));
  return true;
}
function del_(path) {
  const parts = path.split('/'), id = parts.pop();
  const r = fetch_(base_() + parts.join('/') + '/' + encodeURIComponent(id), 'delete');
  if (r.code !== 200 && r.code !== 404) throw new Error('Could not delete ' + path + ': ' + r.body.slice(0, 200));
}
