/* bad-share: runs on the route thebadclub.com/s/* in front of the site.
   /s/<session id>            → a tiny page with that session's title, date and poster in the link preview
                                (WhatsApp, iMessage, Instagram read these tags), then it sends people on to the app.
   /s/<session id>/poster.jpg → the session's poster as an image (stored in Firestore posters/<id>).
   Sessions and posters are public in the security rules, so no key or sign-in is needed. */
const FS = 'https://firestore.googleapis.com/v1/projects/bad-app-ef601/databases/(default)/documents';
const SITE = 'https://thebadclub.com';
const CLUBS = { badminton: 'BADMINTON', volleyball: 'VOLLEYBAD', pickleball: 'BAD DINK', run: 'BAD PACE', dance: 'BAD HABITS',
  basketball: 'BAD SHOTS', training: 'TRAIN BAD', retreat: 'BAD RETREAT', vibe: 'BAD COMMUNITY', taste: 'TASTEBADS', party: 'BAD X' };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const val = (doc, k) => { const f = doc && doc.fields && doc.fields[k]; if (!f) return ''; return f.stringValue ?? f.integerValue ?? f.doubleValue ?? (f.booleanValue != null ? f.booleanValue : ''); };
async function getDoc(path) { const r = await fetch(`${FS}/${path}`, { cf: { cacheTtl: 60, cacheEverything: true } }); return r.ok ? r.json() : null; }
function when(date, start, tbc) {
  if (!date) return '';
  const d = new Date(date + 'T12:00:00+04:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Dubai' });
  if (tbc || !start) return d;
  const [h, m] = String(start).split(':').map(Number); const t = `${(h % 12) || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
  return `${d} · ${t}`;
}
export default {
  async fetch(req) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/s\/([\w-]+)(\/poster\.jpg)?\/?$/);
    if (!m) return fetch(req);
    const sid = decodeURIComponent(m[1]);
    if (m[2]) {
      const p = await getDoc('posters/' + encodeURIComponent(sid));
      const img = String(val(p, 'img') || '');
      const i = img.indexOf('base64,');
      if (!img.startsWith('data:image/jpeg') || i < 0) return Response.redirect(SITE + '/assets/og.jpg', 302);
      const bin = atob(img.slice(i + 7)); const bytes = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
      return new Response(bytes, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400' } });
    }
    const s = await getDoc('sessions/' + encodeURIComponent(sid));
    const app = `${SITE}/#s=${encodeURIComponent(sid)}`;
    const club = CLUBS[val(s, 'sport')] || 'The BAD Club';
    const title = s ? `${val(s, 'title') || club} · The BAD Club` : 'BAD · The BAD Club';
    const desc = s ? [when(val(s, 'date'), val(s, 'start'), val(s, 'timeTbc') === true), val(s, 'venue')].filter(Boolean).join(' · ') + '. Every level is welcome. Book your spot.' : 'Come for the game. Stay for the people.';
    const pv = s && val(s, 'poster');
    const img = pv ? `${SITE}/s/${encodeURIComponent(sid)}/poster.jpg?v=${encodeURIComponent(pv)}` : `${SITE}/assets/og.jpg`;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="The BAD Club">
<meta property="og:url" content="${esc(SITE + url.pathname)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">${pv ? '' : '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(img)}">
<link rel="canonical" href="${esc(SITE + url.pathname)}"><script>location.replace(${JSON.stringify(app)})</script>
<style>body{font:16px system-ui;background:#000;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0}a{color:#fff}</style></head>
<body><a href="${esc(app)}">Open ${esc(title)}</a></body></html>`;
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=120' } });
  }
};
