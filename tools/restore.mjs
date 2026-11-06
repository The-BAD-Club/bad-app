/* Restore one collection (or all) from a backup file. Asks for nothing and overwrites, so run it by hand only.
   Usage: FIREBASE_SA="$(cat key.json)" node tools/restore.mjs <backup.json.gz> [collection] */
import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const [file, only] = process.argv.slice(2);
if (!file) { console.error('usage: node tools/restore.mjs <backup.json.gz> [collection]'); process.exit(2); }
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA)) });
const db = admin.firestore();
const dump = JSON.parse(gunzipSync(readFileSync(file)));
const back = o => JSON.parse(JSON.stringify(o), (k, v) => v && typeof v === 'object' && v.__ts ? admin.firestore.Timestamp.fromDate(new Date(v.__ts)) : v);
let n = 0;
for (const [col, docs] of Object.entries(dump.collections)) {
  if (only && col !== only) continue;
  let batch = db.batch(), k = 0;
  const flush = async () => { if (k) { await batch.commit(); batch = db.batch(); k = 0; } };
  for (const [id, entry] of Object.entries(docs)) {
    const { data, ...subs } = entry;
    batch.set(db.collection(col).doc(id), back(data)); k++; n++;
    for (const [sub, rows] of Object.entries(subs)) for (const [sid, row] of Object.entries(rows)) { batch.set(db.collection(col).doc(id).collection(sub).doc(sid), back(row)); k++; n++; if (k >= 400) await flush(); }
    if (k >= 400) await flush();
  }
  await flush();
}
console.log(`Restored ${n} documents from ${dump.at}.`);
