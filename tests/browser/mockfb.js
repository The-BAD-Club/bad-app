/* In-memory stand-in for the Firebase compat SDK, for browser tests only (never shipped).
   Supports: doc get/set(merge)/update (dotted paths, FieldPath, delete, serverTimestamp, increment), collection add/get/onSnapshot,
   where/orderBy/limit, batches, transactions (with optimistic conflict detection), Timestamp, messaging stubs.
   window.MOCK_DOCS seeds data; window.MOCK_USER is the signed-in user (or null); window.MOCK_FAIL = {path: true} makes writes fail. */
window.firebase = (function () {
  const store = {}, ver = {}, listeners = new Set();
  let clock = Date.now();
  class Timestamp { constructor(ms) { this._ms = ms; this.seconds = Math.floor(ms / 1000); this.nanoseconds = 0 }
    toMillis() { return this._ms } toDate() { return new Date(this._ms) } static fromMillis(ms) { return new Timestamp(ms) } static now() { return new Timestamp(Date.now()) } }
  const SERVER = { __sv: 'ts' }, DELETE = { __sv: 'del' };
  const inc = n => ({ __sv: 'inc', n });
  class FieldPath { constructor(...p) { this.p = p } }
  const clone = v => v instanceof Timestamp ? v : Array.isArray(v) ? v.map(clone) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) : v;
  const resolve = (v, now) => v === SERVER ? new Timestamp(now) : v instanceof Timestamp ? v : Array.isArray(v) ? v.map(x => resolve(x, now))
    : v && typeof v === 'object' && !v.__sv ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== DELETE).map(([k, x]) => [k, resolve(x, now)])) : v;
  for (const [k, v] of Object.entries(window.MOCK_DOCS || {})) { store[k] = resolve(v, clock); ver[k] = 1 }
  const fire = () => setTimeout(() => listeners.forEach(f => f()), 0);
  const failing = p => (window.MOCK_FAIL || {})[p] || (window.MOCK_FAIL || {})[p.split('/')[0]];
  function snapDoc(p) { return { id: p.split('/').pop(), ref: docRef(p), exists: p in store, data: () => p in store ? clone(store[p]) : undefined, get: k => (store[p] || {})[k] } }
  function setPath(obj, parts, val, now) {
    let o = obj; for (let i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]] }
    const last = parts[parts.length - 1];
    if (val === DELETE) delete o[last]; else if (val && val.__sv === 'inc') o[last] = (Number(o[last]) || 0) + val.n; else o[last] = resolve(val, now);
  }
  function applySet(p, v, opts, now) { if (opts && opts.merge) { const cur = clone(store[p] || {}); for (const [k, x] of Object.entries(v)) setPath(cur, [k], x, now); store[p] = cur } else store[p] = resolve(v, now); ver[p] = (ver[p] || 0) + 1 }
  function applyUpdate(p, args, now) {
    if (!(p in store)) throw Object.assign(new Error('No document to update: ' + p), { code: 'not-found' });
    const cur = clone(store[p]); const pairs = [];
    if (args.length === 1 && !(args[0] instanceof FieldPath) && typeof args[0] === 'object') for (const [k, x] of Object.entries(args[0])) pairs.push([k.split('.'), x]);
    else for (let i = 0; i < args.length; i += 2) pairs.push([args[i] instanceof FieldPath ? args[i].p : String(args[i]).split('.'), args[i + 1]]);
    for (const [parts, x] of pairs) setPath(cur, parts, x, now);
    store[p] = cur; ver[p] = (ver[p] || 0) + 1;
  }
  const tick = () => (clock = Math.max(clock + 1, Date.now()));
  function docRef(p) {
    return { id: p.split('/').pop(), path: p,
      get: async () => snapDoc(p),
      set: async (v, o) => { if (failing(p)) throw Object.assign(new Error('permission-denied'), { code: 'permission-denied' }); applySet(p, v, o, tick()); fire() },
      update: async (...a) => { if (failing(p)) throw Object.assign(new Error('permission-denied'), { code: 'permission-denied' }); applyUpdate(p, a, tick()); fire() },
      delete: async () => { if (failing(p)) throw Object.assign(new Error('permission-denied'), { code: 'permission-denied' }); delete store[p]; ver[p] = (ver[p] || 0) + 1; fire() },
      onSnapshot: (f, err) => { const g = () => f(snapDoc(p)); listeners.add(g); g(); return () => listeners.delete(g) },
      collection: c => colRef(p + '/' + c) };
  }
  function colRef(c, filters = [], order = null, lim = 0) {
    const run = () => {
      let docs = Object.keys(store).filter(k => k.startsWith(c + '/') && k.split('/').length === c.split('/').length + 1).map(snapDoc);
      for (const [f, op, val] of filters) docs = docs.filter(d => { const x = f.split('.').reduce((o, k) => o == null ? o : o[k], d.data()); const xv = x instanceof Timestamp ? x.toMillis() : x, vv = val instanceof Timestamp ? val.toMillis() : val;
        return op === '==' ? xv === vv : op === '>=' ? xv >= vv : op === '>' ? xv > vv : op === '<=' ? xv <= vv : op === '<' ? xv < vv : op === 'in' ? val.includes(x) : op === 'array-contains' ? (x || []).includes(val) : op === '!=' ? xv !== vv : true });
      if (order) docs.sort((a, b) => { const x = a.data()[order[0]], y = b.data()[order[0]]; return (x > y ? 1 : x < y ? -1 : 0) * (order[1] === 'desc' ? -1 : 1) });
      if (lim) docs = docs.slice(0, lim);
      return { docs, empty: !docs.length, size: docs.length, forEach: f => docs.forEach(f) };
    };
    return { id: c.split('/').pop(), path: c, doc: id => docRef(c + '/' + (id || 'a' + Math.random().toString(36).slice(2))),
      where: (f, op, v) => colRef(c, [...filters, [f instanceof FieldPath ? f.p.join('.') : f, op, v]], order, lim),
      orderBy: (f, d) => colRef(c, filters, [f, d || 'asc'], lim), limit: n => colRef(c, filters, order, n),
      get: async () => run(),
      onSnapshot: (f, err) => { const g = () => f(run()); listeners.add(g); g(); return () => listeners.delete(g) },
      add: async v => { const id = 'a' + Math.random().toString(36).slice(2); if (failing(c + '/' + id)) throw Object.assign(new Error('permission-denied'), { code: 'permission-denied' }); applySet(c + '/' + id, v, null, tick()); fire(); return { id } } };
  }
  function batchLike() {
    const ops = [];
    return { set: (r, v, o) => { ops.push(['set', r.path, v, o]); return this }, update: (r, ...a) => { ops.push(['update', r.path, a]) }, delete: r => { ops.push(['delete', r.path]) },
      _ops: ops,
      commit: async () => { for (const o of ops) if (failing(o[1])) throw Object.assign(new Error('permission-denied'), { code: 'permission-denied' });
        const now = tick(); for (const o of ops) { if (o[0] === 'set') applySet(o[1], o[2], o[3], now); else if (o[0] === 'update') applyUpdate(o[1], o[2], now); else { delete store[o[1]]; ver[o[1]] = (ver[o[1]] || 0) + 1 } } fire() } };
  }
  const fs = {
    settings: () => {}, enablePersistence: () => Promise.resolve(),
    doc: p => docRef(p), collection: c => colRef(c), batch: () => batchLike(),
    runTransaction: async fn => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const seen = {}; const b = batchLike();
        const tx = { get: async r => { seen[r.path] = ver[r.path] || 0; return snapDoc(r.path) }, set: (r, v, o) => { b.set(r, v, o); return tx }, update: (r, ...a) => { b.update(r, ...a); return tx }, delete: r => { b.delete(r); return tx } };
        const out = await fn(tx);
        if (window.MOCK_TX_HOOK) await window.MOCK_TX_HOOK();
        if (Object.entries(seen).some(([p, v]) => (ver[p] || 0) !== v)) continue;   // someone else wrote: retry like Firestore
        await b.commit(); return out;
      }
      throw Object.assign(new Error('Transaction failed after retries'), { code: 'aborted' });
    }
  };
  const FieldValue = { serverTimestamp: () => SERVER, delete: () => DELETE, increment: n => inc(n), arrayUnion: (...v) => ({ __sv: 'au', v }) };
  const u = window.MOCK_USER;
  let authCb = [];
  const auth = { currentUser: u, onAuthStateChanged: f => { authCb.push(f); setTimeout(() => f(u ? { ...u, getIdToken: async () => 'tok' } : null), 10) }, signOut: async () => { window.MOCK_SIGNED_OUT = true },
    signInWithPopup: async () => {}, signInWithRedirect: async () => {}, getRedirectResult: async () => ({}), createUserWithEmailAndPassword: async () => {}, signInWithEmailAndPassword: async () => {}, sendPasswordResetEmail: async () => {} };
  const firestore = () => fs; firestore.FieldValue = FieldValue; firestore.FieldPath = FieldPath; firestore.Timestamp = Timestamp;
  const messaging = () => ({ getToken: async () => 'mock-token-' + (u ? u.uid : 'x'), deleteToken: async () => true, onMessage: () => {} });
  messaging.isSupported = async () => !!window.MOCK_PUSH;
  const fb = { initializeApp: () => {}, auth: () => auth, firestore, messaging, _store: store };
  fb.auth.GoogleAuthProvider = function () { this.setCustomParameters = () => {} };
  return fb;
})();
