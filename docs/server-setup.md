# BAD's free server: one-time setup

About 20 minutes. After this, GitHub does the work admin phones do today: nightly backups and publishing the security rules, with more jobs (snapshots, approvals, points) added later. Everything stays on free plans.

Never paste the key from step 1 into a chat, an email or any file in this repo. It only goes into GitHub's secret box.

## 1. Make a Firebase key

1. Open the Firebase console, project **bad-app-ef601**.
2. Gear icon → **Project settings** → **Service accounts**.
3. Click **Generate new private key**, then **Generate key**. A `.json` file downloads.

## 2. Give the key to GitHub

1. Open github.com/The-BAD-Club/bad-app → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret**. Name: `FIREBASE_SA`. Value: open the `.json` file in a text editor, copy everything, paste.
3. Save, then delete the `.json` file from your computer.

From now on, when a change to `firestore.rules` reaches main and its tests pass, GitHub publishes the rules itself.

## 3. Make the private backup repo

1. github.com → **New repository** → owner **The-BAD-Club**, name `bad-backups`, **Private**. No README.
2. It must stay private: backups hold contact details.

## 4. Let the backup job write to it

1. Your GitHub avatar → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Name `BAD backups`, expiry 1 year, resource owner **The-BAD-Club**.
3. Repository access: **Only select repositories** → `bad-backups`.
4. Permissions → Repository → **Contents: Read and write**. Nothing else.
5. Generate, copy the token, then in bad-app → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Name: `BACKUP_TOKEN`. Paste. Save.

## 5. Test it

1. bad-app → **Actions** → **Nightly backup** → **Run workflow**.
2. After a minute it should be green, and `bad-backups` gets a branch named `d-` plus today's date.

Backups then run every night at 3:17am Dubai and keep the last 30 days.

## 6. Two switches

- bad-app → **Settings** → **Pages** → tick **Enforce HTTPS**.
- The BAD APP Master Sheet → **Extensions** → **Apps Script** → run **setup** once, so points sync.

## If something fails

- Rules publish fails with a permission error: in Google Cloud console → IAM, give the `firebase-adminsdk` account the role **Firebase Rules Admin**.
- Backup fails at the push step: the token has expired or can't see `bad-backups`. Make a new one (step 4).
- To restore: download a backup branch, then `FIREBASE_SA="$(cat key.json)" node tools/restore.mjs bad.json.gz [collection]`. Ask before restoring: it overwrites.
