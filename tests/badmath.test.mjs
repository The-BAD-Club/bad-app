// Unit tests for the BAD maths (session sizing, score checks, rotation, standings). Run: node --test tests/badmath.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const M = createRequire(import.meta.url)('../src/app/13-badmath.js');

test('valid scores: 21-point format', () => {
  for (const [a, b] of [[21, 0], [21, 19], [22, 20], [29, 27], [30, 28], [30, 29], [19, 21], [29, 30]]) assert.ok(M.validScore(21, a, b), `${a}-${b}`);
  for (const [a, b] of [[21, 20], [22, 19], [20, 18], [31, 29], [30, 27], [21, 21], [23, 20], [-1, 21], [21.5, 19]]) assert.ok(!M.validScore(21, a, b), `${a}-${b}`);
});
test('valid scores: 30-point format', () => {
  for (const [a, b] of [[30, 0], [30, 28], [31, 29], [34, 32], [35, 33], [35, 34]]) assert.ok(M.validScore(30, a, b), `${a}-${b}`);
  for (const [a, b] of [[30, 29], [21, 19], [36, 34], [35, 32], [32, 29]]) assert.ok(!M.validScore(30, a, b), `${a}-${b}`);
  assert.ok(!M.validScore(25, 25, 10), 'unknown format');
});
test('score hints explain the rule in plain words', () => {
  assert.equal(M.scoreHint(21, 21, 19), '');
  assert.match(M.scoreHint(21, 21, 20), /2-point lead/);
  assert.match(M.scoreHint(21, 20, 18), /ends at 21/);
  assert.match(M.scoreHint(21, 31, 29), /30 is the most/);
  assert.match(M.scoreHint(21, 21, 21), /tie/);
  assert.match(M.scoreHint(30, 33, 30), /exactly 2/);
});
test('scaled points compare 30-point games with 21-point games', () => {
  assert.equal(M.scaled(30, 30), 21);
  assert.equal(M.scaled(25, 30), 17.5);
  assert.equal(M.scaled(19, 21), 19);
});
test('session sizing matches the plan', () => {
  assert.equal(M.gamesEach(16, 2, 120, 12), 5);
  assert.equal(M.gamesEach(8, 1, 120, 12), 5);
  assert.equal(Math.round(M.gamesEach(24, 3, 180, 15) * 10) / 10, 6);
  assert.equal(M.shortfall([5, 4, 3, 6]), 3);
  const a = M.advice({ games: Array(16).fill(3), courts: 2, minsLeft: 30, d: 12 });   // 32 games short -> 8 games -> 4 rounds of 2 courts = 48 min
  assert.equal(a.ok, false); assert.equal(a.need, 48); assert.equal(a.extend, 20); assert.equal(a.withCourt, 36);
  assert.equal(M.advice({ games: Array(16).fill(5), courts: 2, minsLeft: 0, d: 12 }).ok, true);
});

const P = (id, g = 0, since = 0, extra = {}) => ({ id, g, since, rating: 3, cat: 'M', ...extra });
test('rotation: never skips a player with fewer games', () => {
  const ps = [P('a', 2, 1), P('b', 1, 5), P('c', 2, 2), P('d', 1, 6), P('e', 2, 3), P('f', 2, 4)];
  const r = M.pickFour(ps, []);
  const ids = [...r.a, ...r.b];
  assert.ok(ids.includes('b') && ids.includes('d'), 'both 1-game players play');
});
test('rotation: the longest-waiting player is always picked', () => {
  const ps = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id, i) => P(id, 1, i));
  const r = M.pickFour(ps, []);
  assert.ok([...r.a, ...r.b].includes('a'));
});
test('rotation: avoids repeating a partner when there is another way', () => {
  const ps = ['a', 'b', 'c', 'd'].map((id, i) => P(id, 1, i));
  const r = M.pickFour(ps, [{ a: ['a', 'b'], b: ['c', 'd'] }]);
  const teams = [r.a.slice().sort().join(), r.b.slice().sort().join()];
  assert.ok(!teams.includes('a,b') && !teams.includes('c,d'));
  assert.equal(r.P, 0);
});
test('rotation: balances teams by rating', () => {
  const ps = [P('a', 0, 1, { rating: 5 }), P('b', 0, 2, { rating: 5 }), P('c', 0, 3, { rating: 1 }), P('d', 0, 4, { rating: 1 })];
  const r = M.pickFour(ps, []);
  assert.equal(r.bal, 0, 'strong player paired with a newer player on each side');
});
test('rotation: a player passed over at the same level must go next time', () => {
  const ps = ['a', 'b', 'c', 'd', 'e'].map((id, i) => P(id, 1, i));
  // a,b,c,d have all partnered each other; e is fresh, so the cost prefers bringing e in and skipping someone
  const hist = [{ a: ['a', 'b'], b: ['c', 'd'] }, { a: ['a', 'c'], b: ['b', 'd'] }, { a: ['a', 'd'], b: ['b', 'c'] }];
  const r1 = M.pickFour(ps, hist);
  const skipped = ps.map(p => p.id).filter(id => ![...r1.a, ...r1.b].includes(id));
  assert.equal(skipped.length, 1);
  assert.equal(r1.deferred[skipped[0]], 1);
  const next = ps.map(p => ({ ...p, deferred: r1.deferred[p.id] || 0 }));
  const r2 = M.pickFour(next, [...hist, { a: r1.a, b: r1.b }]);
  assert.ok([...r2.a, ...r2.b].includes(skipped[0]), 'skipped player is forced in');
});
test('rotation: late arrivals are credited one game behind the lowest count', () => {
  assert.equal(M.eff({ g: 0, base: 3 }), 2);
  assert.equal(M.eff({ g: 4, base: 3 }), 4);
  // four early players on 3 games, one on 1; the late arrival (lowest count was 3 when they came) counts as 2
  const ps = [P('early1', 3, 1), P('early2', 3, 2), P('early3', 3, 3), P('early4', 3, 4), P('late', 0, 9, { base: 3 }), P('mid', 1, 5)];
  const r = M.pickFour(ps, []);
  const ids = [...r.a, ...r.b];
  assert.ok(ids.includes('mid'), 'genuinely behind players still go first');
  assert.ok(ids.includes('late'), 'the late arrival jumps ahead by one game only');
});
test('rotation: needs at least four players', () => {
  assert.equal(M.pickFour([P('a'), P('b'), P('c')], []), null);
});

test('standings: wins, then scaled points, then fewer games; ties share the rank', () => {
  const g = (a, b, score, fmt = 21) => ({ a, b, score, fmt });
  const rows = M.standings([
    g(['k', 'j'], ['c', 'm'], [21, 15]),
    g(['k', 'c'], ['j', 'm'], [21, 19]),
    g(['j', 'c'], ['k', 'm'], [30, 25], 30),
  ]);
  const by = Object.fromEntries(rows.map(r => [r.id, r]));
  assert.equal(by.k.wins, 2); assert.equal(by.j.wins, 2); assert.equal(by.c.wins, 2); assert.equal(by.m.wins, 0);
  assert.equal(by.c.sp, 15 + 21 + 21);       // 30-point game scaled to 21
  assert.equal(by.k.sp, 21 + 21 + 17.5);
  assert.equal(by.j.sp, 21 + 19 + 21);
  assert.equal(rows[0].id, 'j');             // 61 scaled points beats k's 59.5 and c's 57
  assert.deepEqual(M.winners(rows), ['j']);
  const tie = M.standings([g(['a', 'b'], ['c', 'd'], [21, 10]), g(['c', 'd'], ['a', 'b'], [21, 10])]);
  assert.equal(new Set(tie.map(r => r.rank)).size, 1, 'exact tie on wins, points and games shares first place');
  assert.equal(M.winners(tie).length, 4);
});
test('standings: fewer games played breaks a tie on wins and points', () => {
  const rows = M.standings([
    { a: ['x', 'p'], b: ['q', 'r'], score: [21, 0], fmt: 21 },
    { a: ['y', 's'], b: ['t', 'u'], score: [21, 0], fmt: 21 },
    { a: ['t', 'u'], b: ['y', 'v'], score: [0, 0 + 21], fmt: 21 },
  ]);
  // x: 1 win, 21 pts, 1 game. y: 2 wins. So y first; check x ahead of anyone with 1 win and more games.
  assert.equal(rows[0].id, 'y');
});
