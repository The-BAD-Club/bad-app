/* Nightly backup of the whole BAD database to one gzipped JSON file.
   Run by .github/workflows/backup.yml with the FIREBASE_SA secret. Never prints data to the log.
   Usage: node tools/backup.mjs <out-file.json.gz> */
import admin from 'firebase-admin';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const out = process.argv[2];
if (!out) { console.error('usage: node tools/backup.mjs <out.json.gz>'); process.exit(2); }
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA)) });
const db = admin.firestore();

/* collections whose documents hold their own log subcollections */
const WITH_LOGS = new Set(['results', 'grades']);
const plain = v => v instanceof admin.firestore.Timestamp ? { __ts: v.toDate().toISOString() } : v;
const clean = o => JSON.parse(JSON.stringify(o, (k, v) => plain(v)));

const dump = { at: new Date().toISOString(), project: admin.app().options.credential.projectId || '', collections: {} };
let docs = 0;
for (const col of await db.listCollections()) {
  const snap = await col.get(), c = (dump.collections[col.id] = {});
  for (const d of snap.docs) {
    c[d.id] = { data: clean(d.data()) }; docs++;
    if (WITH_LOGS.has(col.id)) for (const sub of await d.ref.listCollections()) {
      const s = await sub.get(); c[d.id][sub.id] = {}; s.forEach(x => { c[d.id][sub.id][x.id] = clean(x.data()); docs++; });
    }
  }
}
writeFileSync(out, gzipSync(JSON.stringify(dump)));
console.log(`Backed up ${docs} documents in ${Object.keys(dump.collections).length} collections.`);
