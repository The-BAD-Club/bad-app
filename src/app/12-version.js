/* ---------- app version and what's new ----------
   Testing period = 0.x. Version 1.0 is the launch. Add a line at the top for every release,
   and the same line to the SOP's App versions table. */
const APP_VERSION='0.16';
const CHANGES=[
  ['0.16','2026-11-04','Side Quests tab with Taste BADs (food and drink collabs: join like a session, earn event points); community managers get a tick box per department, many per department, owners run all; BADge designs for each level; community managers and crew give up to 5 BADges a month, founders unlimited; Volume II last pieces in the Shop; check-in: reorder or reshuffle arrivals, × to remove, cancellations inside 48 hours charged (half or full fee, or no charge); links straight to a tab (#shop, #quests)'],
  ['0.15','2026-11-04','Edit a player with a Save button (Admin → Players → Edit); no-show list: × per date, − and +, remove a player, add a player by hand; community managers now only manage their own club (an admin entry without a role gives no access)'],
  ['0.14','2026-11-04','Design review: phone tab bar back at the bottom (it sat over the logo), no overlapping buttons on any screen; ∞ BADges for Founders; FRAGMENTS RELEASE pre-order in the Shop; Home shows checked games\' results'],
  ['0.13','2026-11-04','Cancel a session and email everyone who signed up; payment dashboard per session with reminders by email or WhatsApp; payments saved in each player\'s own record so players see their own status'],
  ['0.12','2026-11-04','Matching rules for Beginners and balance; BAD PACE (was Runaways) with check-in and a run log; BAD HABITS dance crew; levels for every sport in its own words; balanced teams for volleyball and basketball; player counts on courts; BADDEST PLAYER for every sport'],
  ['0.11','2026-11-04','Courts: boards reload after refresh; sign-up QR for admins; rename or remove on check-in; Save now; undo and redo; drag and drop; re-pair; pause and close courts; Finish asks first; Still playing, Void and Delete for games; Edit finished scores'],
  ['0.10','2026-11-02','Badminton queuing: Start, Finish and Cancel with timing; fair rotation with balanced teams; scores confirmed by the other team and finalised by Support; session standings and BADDEST PLAYER (+5); player cap, waiting list, courts and time with a 5-game check'],
  ['0.9','2026-11-02','BAD levels F to A+ with W/M category, crew verify on check-in; minimal player card with the invite on the back; courts load only tonight\'s data and boards can\'t overwrite each other'],
  ['0.8','2026-10-24','Game Master per session; admins add players and guests by hand and take people off a session'],
  ['0.7','2026-10-24','Points and BADges from BAD APP – Master; BADge levels and perks; name on tracker; department wording'],
  ['0.6','2026-10-24','Payments tab; Check with admin; remove and undo for payments'],
  ['0.5','2026-10-24','Shop: limited drops, essentials, bag, checkout and orders'],
  ['0.4','2026-10-24','Pay all, Careem Pay, make a session free, clear pending'],
  ['0.3','2026-10-24','Two-sided card with invite QR; design pass; admin roles'],
  ['0.2','2026-10-23','Home page, membership levels, save card, light theme, Members sheet'],
  ['0.1','2026-10-23','First version: sign-in, player card, sessions, referral codes']];
const SOP_URL='https://claude.ai/artifact/RuSFThqHtbF6S2KcZvxqtX';
function whatsNewHTML(){return `<p class="hint" style="margin-top:0">You're on version ${APP_VERSION}${APP_VERSION.startsWith('0.')?', the testing period. Version 1.0 is the launch':''}. How the crew runs things is in the <a href="${SOP_URL}" target="_blank" rel="noopener">BAD App SOP</a>.</p>
  <div class="list">${CHANGES.map(([v,d,t])=>`<div class="li" style="grid-template-columns:auto minmax(0,1fr)"><span class="tagl${v===APP_VERSION?' solid':''} num">v${v}</span><div><div class="nm" style="font-weight:500">${esc(t)}</div><div class="sub">${esc(fmtD(d))}</div></div></div>`).join('')}</div>`}
(function addVer(){if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',addVer);return}const f=document.querySelector('footer.sign');if(f&&!f.querySelector('.ver')){const s=document.createElement('span');s.className='ver num';s.textContent='BAD App v'+APP_VERSION+(APP_VERSION.startsWith('0.')?' · testing':'');f.appendChild(s)}})();
