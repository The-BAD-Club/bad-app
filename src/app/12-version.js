/* ---------- app version and what's new ----------
   Testing period = 0.x. Version 1.0 is the launch. Add a line at the top for every release,
   and the same line to the SOP's App versions table. */
const APP_VERSION='0.8';
const CHANGES=[
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
