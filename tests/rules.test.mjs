// Firestore security rules tests for the BAD App. Runs against the Firestore emulator in GitHub Actions.
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, serverTimestamp, writeBatch, Timestamp } from 'firebase/firestore';

let env;
const OWNER = 'thebadclub.co@gmail.com';
const ctx = (uid, email, verified = true) => env.authenticatedContext(uid, email ? { email, email_verified: verified } : {}).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const SID = 'friday-rally-2026-10-30', VSID = 'volley-2026-10-31';

before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-bad-app', firestore: { rules: readFileSync('../firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    await setDoc(doc(db, 'sessions', SID), { sport: 'badminton', title: 'Friday Rally', date: '2026-10-30', fee: 40, capacity: 20, gms: ['gm1'] });
    await setDoc(doc(db, 'sessions', VSID), { sport: 'volleyball', title: 'VolleyBAD', date: '2026-10-31', fee: 40, capacity: 18 });
    await setDoc(doc(db, 'admins', 'cm@x.com'), { role: 'cm', sports: ['badminton'] });
    await setDoc(doc(db, 'admins', 'founder@x.com'), { role: 'founder', sports: [] });
    await setDoc(doc(db, 'admins', 'app@x.com'), { role: 'app', sports: [] });
    await setDoc(doc(db, 'config', 'members'), { crew1: { type: 'Crew' } });
    await setDoc(doc(db, 'profiles', 'p2'), { nickname: 'Fei', listName: 'Fei' });
    await setDoc(doc(db, 'contacts', 'p2'), { email: 'fei@x.com' });
    await setDoc(doc(db, 'requests', 'p2'), { player: 'fei', at: 'x', type: 'free-session' });
    await setDoc(doc(db, 'pay', 'p2'), { s: { [SID]: { ok: true } } });
    await setDoc(doc(db, 'standing', 'p2'), { unpaid: 40 });
    await setDoc(doc(db, 'ledger', 'l1'), { v: 2, uid: 'p2', pts: 10, type: 'Adjustment', synced: false });
    await setDoc(doc(db, 'products', 'jersey'), { name: 'Jersey', price: 180, sizes: { S: 2, M: 5 }, status: 'live', maxPer: 2 });
    await setDoc(doc(db, 'live', SID), { rev: 3, courts: [] });
    await setDoc(doc(db, 'sops', 'draft1'), { status: 'draft', audience: 'player', title: 'x' });
    await setDoc(doc(db, 'sops', 'pub1'), { status: 'published', audience: 'player', title: 'x' });
    await setDoc(doc(db, 'sops', 'staff1'), { status: 'published', audience: 'staff', title: 'x' });
  });
});

// ---------- unauthorised reads ----------
test('signed-out visitors read nothing', async () => {
  await assertFails(getDoc(doc(anon(), 'profiles', 'p2')));
  await assertFails(getDoc(doc(anon(), 'sessions', SID)));
});
test('players cannot read other players’ private records', async () => {
  const db = ctx('p1', 'p1@x.com');
  for (const c of ['contacts', 'requests', 'pay', 'standing']) await assertFails(getDoc(doc(db, c, 'p2')));
  await assertFails(getDoc(doc(db, 'ledger', 'l1')));
  await assertFails(getDocs(collection(db, 'ledger')));
  await assertSucceeds(getDocs(query(collection(db, 'ledger'), where('uid', '==', 'p1'))));
  await assertFails(getDocs(collection(db, 'payments')));
});
test('players read their own private records', async () => {
  const db = ctx('p2', 'fei@x.com');
  for (const c of ['contacts', 'requests', 'pay', 'standing']) await assertSucceeds(getDoc(doc(db, c, 'p2')));
  await assertSucceeds(getDoc(doc(db, 'ledger', 'l1')));
});

// ---------- role escalation ----------
test('only the owner grants admin access', async () => {
  await assertFails(setDoc(doc(ctx('p1', 'p1@x.com'), 'admins', 'p1@x.com'), { role: 'founder' }));
  await assertFails(setDoc(doc(ctx('f', 'founder@x.com'), 'admins', 'p1@x.com'), { role: 'app' }));
  await assertFails(setDoc(doc(ctx('c', 'cm@x.com'), 'admins', 'cm@x.com'), { role: 'founder' }));
  await assertFails(setDoc(doc(ctx('o', OWNER, false), 'admins', 'p1@x.com'), { role: 'app' }));   // unverified email
  await assertSucceeds(setDoc(doc(ctx('o', OWNER), 'admins', 'p1@x.com'), { role: 'app' }));
});
test('players cannot verify their own membership or edit protected settings', async () => {
  const db = ctx('p1', 'p1@x.com');
  await assertFails(setDoc(doc(db, 'config', 'members'), { p1: { type: 'Founder' } }));
  await assertFails(setDoc(doc(db, 'config', 'points'), { per: 500 }));
  await assertFails(setDoc(doc(db, 'config', 'payments'), { iban: 'AE00' }));
  await assertFails(setDoc(doc(db, 'standing', 'p1'), { unpaid: 0 }));
});
test('players cannot confirm or waive their own payments', async () => {
  const db = ctx('p1', 'p1@x.com');
  await assertFails(setDoc(doc(db, 'pay', 'p1'), { s: { [SID]: { ok: true, waived: true } }, op: { sid: SID }, u: serverTimestamp() }));
});
test('players cannot award points or redeem by themselves', async () => {
  const db = ctx('p1', 'p1@x.com');
  await assertFails(setDoc(doc(db, 'ledger', 'x'), { v: 2, uid: 'p1', pts: 500, type: 'Adjustment', synced: false }));
  await assertFails(deleteDoc(doc(db, 'ledger', 'l1')));
});

// ---------- department limits ----------
test('community managers work only in their own department', async () => {
  const db = ctx('c', 'cm@x.com');
  await assertSucceeds(updateDoc(doc(db, 'sessions', SID), { title: 'Friday Rally!' }));
  await assertFails(updateDoc(doc(db, 'sessions', VSID), { title: 'x' }));
  await assertSucceeds(setDoc(doc(db, 'pay', 'p3'), { s: { [SID]: { ok: true } }, op: { sid: SID }, u: serverTimestamp() }));
  await assertFails(setDoc(doc(db, 'pay', 'p3'), { s: { [VSID]: { ok: true } }, op: { sid: VSID }, u: serverTimestamp() }));
  await assertFails(setDoc(doc(db, 'products', 'cap'), { name: 'Cap', price: 1 }));
});
test('app admins cannot approve payments; founders can', async () => {
  await assertFails(setDoc(doc(ctx('a', 'app@x.com'), 'pay', 'p3'), { s: { [SID]: { ok: true } }, op: { sid: SID }, u: serverTimestamp() }));
  await assertSucceeds(setDoc(doc(ctx('f', 'founder@x.com'), 'pay', 'p3'), { s: { [SID]: { ok: true } }, op: { sid: SID }, u: serverTimestamp() }));
});
test('payment details change only with a history record, by finance', async () => {
  const f = ctx('f', 'founder@x.com');
  const b = writeBatch(f);
  b.set(doc(f, 'payHistory', 'r1'), { by: 'founder@x.com', at: serverTimestamp(), before: {}, after: { iban: 'AE07' } });
  b.set(doc(f, 'config', 'payments'), { iban: 'AE07', rev: 'r1', updatedBy: 'founder@x.com', updatedAt: serverTimestamp() });
  await assertSucceeds(b.commit());
  await assertFails(setDoc(doc(f, 'config', 'payments'), { iban: 'AE08', rev: 'nope', updatedBy: 'founder@x.com', updatedAt: serverTimestamp() }));
  const a = ctx('a', 'app@x.com');
  await assertFails(setDoc(doc(a, 'config', 'payments'), { iban: 'AE09', rev: 'r1', updatedBy: 'app@x.com', updatedAt: serverTimestamp() }));
});

// ---------- bookings ----------
const join = (db, uid, sid, extra = {}) => setDoc(doc(db, 'bookings', uid), { key: uid, s: { [sid]: { at: 'x', t: serverTimestamp(), pay: 'cash', guests: [], ...extra } }, op: { sid, kind: 'join' }, u: serverTimestamp() });
test('joining uses the server clock', async () => {
  const db = ctx('p1', 'p1@x.com');
  await assertSucceeds(join(db, 'p1', SID));
  await assertFails(setDoc(doc(db, 'bookings', 'p1'), { key: 'p1', s: { [SID]: { at: 'x', t: Timestamp.fromMillis(0), pay: 'cash', guests: [] } }, op: { sid: SID, kind: 'join' }, u: serverTimestamp() }));
});
test('a player cannot book for someone else or touch another session', async () => {
  const db = ctx('p1', 'p1@x.com');
  await assertFails(join(db, 'p2', SID));
  await assertSucceeds(join(db, 'p1', SID));
  await assertFails(updateDoc(doc(db, 'bookings', 'p1'), { [`s.${VSID}`]: { at: 'x', t: serverTimestamp(), pay: 'cash', guests: [] }, [`s.${SID}.pay`]: 'bank', op: { sid: VSID, kind: 'join' }, u: serverTimestamp() }));
  await assertFails(join(db, 'p1', 'no-such-session'));
});
test('leaving records the server time and keeps the join time', async () => {
  const db = ctx('p1', 'p1@x.com');
  await assertSucceeds(join(db, 'p1', SID));
  await assertSucceeds(updateDoc(doc(db, 'bookings', 'p1'), { [`s.${SID}.out`]: 'x', [`s.${SID}.tout`]: serverTimestamp(), op: { sid: SID, kind: 'leave' }, u: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, 'bookings', 'p1'), { [`s.${SID}.tout`]: Timestamp.fromMillis(0), op: { sid: SID, kind: 'leave' }, u: serverTimestamp() }));
});
test('more than 3 guests is refused; staff add bookings only in their department', async () => {
  const db = ctx('p1', 'p1@x.com');
  await assertSucceeds(join(db, 'p1', SID));
  await assertFails(updateDoc(doc(db, 'bookings', 'p1'), { [`s.${SID}.guests`]: [{ n: 'a' }, { n: 'b' }, { n: 'c' }, { n: 'd' }], op: { sid: SID, kind: 'guest' }, u: serverTimestamp() }));
  const cm = ctx('c', 'cm@x.com');
  await assertSucceeds(setDoc(doc(cm, 'bookings', 'p9'), { key: 'p9', s: { [SID]: { at: 'x', pay: 'cash', guests: [] } }, op: { sid: SID, kind: 'admin' }, u: serverTimestamp() }));
  await assertFails(setDoc(doc(cm, 'bookings', 'p8'), { key: 'p8', s: { [VSID]: { at: 'x', pay: 'cash', guests: [] } }, op: { sid: VSID, kind: 'admin' }, u: serverTimestamp() }));
});

// ---------- court board ----------
test('court board saves must carry the next revision', async () => {
  const gm = ctx('gm1', 'gm@x.com');
  await assertSucceeds(setDoc(doc(gm, 'live', SID), { rev: 4, courts: [] }));
  await assertFails(setDoc(doc(gm, 'live', SID), { rev: 4, courts: [1] }));      // stale
  await assertFails(setDoc(doc(ctx('p1', 'p1@x.com'), 'live', SID), { rev: 5, courts: [] }));
});

// ---------- shop ----------
const order = (uid, price, qty = 1, extra = {}) => ({ uid, name: 'P', items: [{ pid: 'jersey', name: 'Jersey', size: 'S', qty, price }], subtotal: price * qty, discountPct: 0, discount: 0, total: price * qty, fulfil: 'pickup', pay: 'cash', status: 'new', createdAt: serverTimestamp(), ...extra });
test('stock only moves with a real new order, never past stock', async () => {
  const db = ctx('p1', 'p1@x.com');
  await assertFails(setDoc(doc(db, 'stock', 'jersey_S'), { pid: 'jersey', size: 'S', sold: 1, lastOrder: 'o-none' }));
  let b = writeBatch(db);
  b.set(doc(db, 'orders', 'o1'), order('p1', 180));
  b.set(doc(db, 'stock', 'jersey_S'), { pid: 'jersey', size: 'S', sold: 1, lastOrder: 'o1' });
  await assertSucceeds(b.commit());
  b = writeBatch(db);
  b.set(doc(db, 'orders', 'o2'), order('p1', 180, 2));
  b.set(doc(db, 'stock', 'jersey_S'), { pid: 'jersey', size: 'S', sold: 3, lastOrder: 'o2' });     // only 2 in stock
  await assertFails(b.commit());
  await assertFails(setDoc(doc(db, 'stock', 'jersey_S'), { pid: 'jersey', size: 'S', sold: 0, lastOrder: 'o1' }));   // can't give stock back
});
test('order prices, totals and status come from the product', async () => {
  const db = ctx('p1', 'p1@x.com');
  await assertFails(setDoc(doc(db, 'orders', 'o3'), order('p1', 1)));
  await assertFails(setDoc(doc(db, 'orders', 'o4'), order('p1', 180, 1, { total: 10 })));
  await assertFails(setDoc(doc(db, 'orders', 'o5'), order('p1', 180, 1, { status: 'paid' })));
  await assertFails(setDoc(doc(db, 'orders', 'o6'), order('p1', 180, 3)));          // over the limit per person
  await assertFails(setDoc(doc(db, 'orders', 'o7'), order('p2', 180)));             // someone else's order
  await assertSucceeds(setDoc(doc(db, 'orders', 'o8'), order('p1', 180, 1, { discountPct: 10, discount: 18, total: 162 })));
});

// ---------- BADges, SOPs, notifications ----------
test('only founders and crew give BADges', async () => {
  const b = { uid: 'p2', n: 1, reason: 'Crew help', byUid: 'crew1', synced: false };
  await assertSucceeds(setDoc(doc(ctx('crew1', 'crew@x.com'), 'badges', 'b1'), b));
  await assertFails(setDoc(doc(ctx('p1', 'p1@x.com'), 'badges', 'b2'), { ...b, byUid: 'p1' }));
  await assertFails(setDoc(doc(ctx('crew1', 'crew@x.com'), 'badges', 'b3'), { ...b, n: 50 }));
});
test('players read published player guides only', async () => {
  const db = ctx('p1', 'p1@x.com');
  await assertSucceeds(getDoc(doc(db, 'sops', 'pub1')));
  await assertFails(getDoc(doc(db, 'sops', 'draft1')));
  await assertFails(getDoc(doc(db, 'sops', 'staff1')));
  await assertSucceeds(getDoc(doc(ctx('crew1', 'crew@x.com'), 'sops', 'staff1')));
  await assertSucceeds(getDocs(query(collection(db, 'sops'), where('audience', '==', 'player'), where('status', '==', 'published'))));
});
test('push devices belong to one player; test notifications are for yourself only', async () => {
  const db = ctx('p1', 'p1@x.com');
  await assertSucceeds(setDoc(doc(db, 'pushTokens', 'tok1'), { uid: 'p1', token: 'tok1', at: serverTimestamp() }));
  await assertFails(setDoc(doc(db, 'pushTokens', 'tok2'), { uid: 'p2', token: 'tok2', at: serverTimestamp() }));
  await assertSucceeds(setDoc(doc(db, 'pushQueue', 'test-p1'), { type: 'test', uid: 'p1', at: serverTimestamp() }));
  await assertFails(setDoc(doc(db, 'pushQueue', 'test-p2'), { type: 'test', uid: 'p2', at: serverTimestamp() }));
  await assertFails(setDoc(doc(db, 'pushQueue', 'chg'), { type: 'session-change', sid: SID, at: serverTimestamp() }));
});

// ---------- BAD grades ----------
const gradeDoc = (by, extra = {}) => ({ g: 'C+', cat: 'M', ovr: null, by, byName: 'Crew', at: serverTimestamp(), sid: SID, scale: 'bad1', ...extra });
test('crew, admins and the session Game Master can set a grade; players cannot', async () => {
  await assertSucceeds(setDoc(doc(ctx('crew1'), 'grades', 'p2'), gradeDoc('crew1')));
  await assertSucceeds(setDoc(doc(ctx('a1', 'cm@x.com'), 'grades', 'p2'), gradeDoc('a1', { g: 'B' })));
  await assertSucceeds(setDoc(doc(ctx('gm1'), 'grades', 'p2'), gradeDoc('gm1', { g: 'U', cat: null })));
  await assertFails(setDoc(doc(ctx('gm1'), 'grades', 'p2'), gradeDoc('gm1', { sid: VSID })));   // not their session
  await assertFails(setDoc(doc(ctx('p2', 'fei@x.com'), 'grades', 'p2'), gradeDoc('p2')));         // not even their own
  await assertSucceeds(getDoc(doc(ctx('p1', 'p1@x.com'), 'grades', 'p2')));
});
test('grades must use the BAD scale, a real category and a sensible override, signed and timed by the server', async () => {
  const db = ctx('crew1');
  await assertFails(setDoc(doc(db, 'grades', 'p2'), gradeDoc('crew1', { g: 'Z' })));
  await assertFails(setDoc(doc(db, 'grades', 'p2'), gradeDoc('crew1', { cat: 'X' })));
  await assertFails(setDoc(doc(db, 'grades', 'p2'), gradeDoc('crew1', { ovr: 9 })));
  await assertFails(setDoc(doc(db, 'grades', 'p2'), gradeDoc('someoneElse')));
  await assertFails(setDoc(doc(db, 'grades', 'p2'), gradeDoc('crew1', { at: Timestamp.fromMillis(0) })));
  await assertSucceeds(setDoc(doc(db, 'grades', 'p2'), gradeDoc('crew1', { ovr: 4.5 })));
});
test('the grade log is add-only and readable by crew only', async () => {
  const db = ctx('crew1'), ref = doc(db, 'grades', 'p2', 'log', 'x1');
  await assertSucceeds(setDoc(ref, { from: {}, to: {}, by: 'crew1', byName: 'Crew', at: serverTimestamp(), sid: SID }));
  await assertFails(updateDoc(ref, { by: 'crew1' }));
  await assertFails(deleteDoc(ref));
  await assertFails(getDoc(doc(ctx('p1', 'p1@x.com'), 'grades', 'p2', 'log', 'x1')));
});
test('players can save their own self-assessed grade and category, on the BAD scale', async () => {
  const db = ctx('p2', 'fei@x.com');
  await assertSucceeds(setDoc(doc(db, 'profiles', 'p2'), { nickname: 'Fei', listName: 'Fei', grade: 'D+', cat: 'W' }));
  await assertFails(setDoc(doc(db, 'profiles', 'p2'), { nickname: 'Fei', listName: 'Fei', grade: '3' }));
  await assertFails(setDoc(doc(db, 'profiles', 'p2'), { nickname: 'Fei', listName: 'Fei', cat: 'Man' }));
});

// ---------- scores: submit, the other team confirms, Support finalises ----------
const GID = 'friday-g1';
const seedGame = (extra = {}) => env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'games', GID), { v: 2, sid: SID, sport: 'badminton', st: 'review', fmt: 21, a: ['p1', 'p3'], b: ['p2', 'p4'], ...extra }));
const sub = (by, team, sa, sb) => ({ sid: SID, sub: { sa, sb, by, team, at: serverTimestamp() }, conf: null, disp: null, fin: null });
test('a player in the game submits a valid score; others cannot', async () => {
  await seedGame();
  await assertFails(setDoc(doc(ctx('p9', 'p9@x.com'), 'results', GID), sub('p9', 'a', 21, 17)));   // not in the game
  await assertFails(setDoc(doc(ctx('p1', 'p1@x.com'), 'results', GID), sub('p1', 'b', 21, 17)));   // wrong team
  await assertFails(setDoc(doc(ctx('p1', 'p1@x.com'), 'results', GID), sub('p1', 'a', 21, 20)));   // not a valid score
  await assertSucceeds(setDoc(doc(ctx('p1', 'p1@x.com'), 'results', GID), sub('p1', 'a', 21, 17)));
});
test('only the other team can confirm or dispute; a teammate cannot', async () => {
  await seedGame();
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'results', GID), { sid: SID, sub: { sa: 21, sb: 17, by: 'p1', team: 'a', at: Timestamp.now() }, conf: null, disp: null, fin: null }));
  await assertFails(updateDoc(doc(ctx('p3', 'p3@x.com'), 'results', GID), { conf: { by: 'p3', at: serverTimestamp() } }));
  await assertFails(updateDoc(doc(ctx('p2', 'p2@x.com'), 'results', GID), { conf: { by: 'p4', at: serverTimestamp() } }));
  await assertSucceeds(updateDoc(doc(ctx('p2', 'p2@x.com'), 'results', GID), { disp: { by: 'p2', at: serverTimestamp(), why: 'Wrong score' } }));
  await assertSucceeds(updateDoc(doc(ctx('p4', 'p4@x.com'), 'results', GID), { conf: { by: 'p4', at: serverTimestamp() } }));
});
test('Support finalises with a valid score; players cannot finalise; corrections need a reason', async () => {
  await seedGame();
  const fin = (by, sa, sb, how = 'support', note) => ({ sid: SID, sub: null, conf: null, disp: null, fin: { sa, sb, by, at: serverTimestamp(), how, ...(note ? { note } : {}) } });
  await assertFails(setDoc(doc(ctx('p1', 'p1@x.com'), 'results', GID), fin('p1', 21, 10)));
  await assertFails(setDoc(doc(ctx('gm1'), 'results', GID), fin('gm1', 21, 20)));
  await assertSucceeds(setDoc(doc(ctx('gm1'), 'results', GID), fin('gm1', 21, 10)));
  await assertFails(setDoc(doc(ctx('a1', 'cm@x.com'), 'results', GID), fin('a1', 21, 12, 'correction')));
  await assertSucceeds(setDoc(doc(ctx('a1', 'cm@x.com'), 'results', GID), fin('a1', 21, 12, 'correction', 'Agreed with both teams')));
  await assertFails(updateDoc(doc(ctx('p2', 'p2@x.com'), 'results', GID), { sub: { sa: 10, sb: 21, by: 'p2', team: 'b', at: serverTimestamp() } }));  // final is locked for players
});
test('30-point games accept 35–34 and reject 30–29', async () => {
  await seedGame({ fmt: 30 });
  await assertFails(setDoc(doc(ctx('p1', 'p1@x.com'), 'results', GID), sub('p1', 'a', 30, 29)));
  await assertSucceeds(setDoc(doc(ctx('p1', 'p1@x.com'), 'results', GID), sub('p1', 'a', 35, 34)));
});
test('no results for cancelled games', async () => {
  await seedGame({ st: 'cancelled' });
  await assertFails(setDoc(doc(ctx('p1', 'p1@x.com'), 'results', GID), sub('p1', 'a', 21, 17)));
});
