/* ---------- launch pieces (v0.67) ----------
   Welcome on first open, What's new after an update, install to the home screen,
   Privacy and Terms links, and Delete my account. */
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
function launchSheet(html,label){
  const ov=document.createElement('div');ov.className='shov';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label',label);
  ov.innerHTML=`<div class="shcard lsheet">${html}</div>`;document.body.appendChild(ov);
  const close=()=>ov.remove();ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-lx]'))close()});
  const k=e=>{if(e.key==='Escape'){close();document.removeEventListener('keydown',k)}};document.addEventListener('keydown',k);
  return {ov,card:ov.querySelector('.lsheet'),close};
}

/* first open: three screens, once per phone */
const WELCOME=[['card','Your card','Your name, number and what you play. It’s how the club knows you.'],
  ['play','Book a spot','Pick a session in Play and tap Count me in. That’s it.'],
  ['coin','Earn points','Every session earns points toward free games. BADges come from the crew.']];
function showWelcome(){let i=0;const s=launchSheet('','Welcome to BAD');
  const draw=()=>{const [icn,h,t]=WELCOME[i];
    s.card.innerHTML=`<div class="wl-ic">${ic(icn)}</div><span class="label">Welcome to BAD · ${i+1} of ${WELCOME.length}</span><h3 class="wl-h">${h}</h3><p class="muted">${t}</p>
      <div class="wl-dots" aria-hidden="true">${WELCOME.map((_,j)=>`<i class="${j===i?'on':''}"></i>`).join('')}</div>
      <div class="row"><button class="btn" data-wn="1">${i<WELCOME.length-1?'Next':'Let’s play'}</button>${i<WELCOME.length-1?'<button class="btn ghost" data-lx="1">Skip</button>':''}</div>`;
    s.card.querySelector('[data-wn]').onclick=()=>{if(i<WELCOME.length-1){i++;draw()}else s.close()};s.card.querySelector('[data-wn]').focus()};
  draw()}

/* after an update: the short note from the version log (4th field), once */
function whatsNew(){const e=CHANGES.find(c=>c[0]===APP_VERSION);if(!e||!e[3])return;
  const s=launchSheet(`<div class="wl-ic">${ic('spark')}</div><span class="label">What’s new · v${esc(APP_VERSION)}</span><h3 class="wl-h">Fresh on BAD.</h3><p class="muted">${esc(e[3])}</p><div class="row"><button class="btn" data-lx="1">Got it</button></div>`,'What’s new');
  s.card.querySelector('[data-lx]').focus()}

function launchIntro(){
  if(location.hash.indexOf('#s=')===0||document.documentElement.classList.contains('gated')||document.querySelector('.shov'))return;
  const seen=lsGet('badSeenV');lsSet('badSeenV',APP_VERSION);
  /* phones that used BAD before this version get What's new, not the welcome */
  if(!seen){if(S.uid&&myProfile())whatsNew();else if(!lsGet('badWelcome')){lsSet('badWelcome','1');showWelcome()}}
  else if(seen!==APP_VERSION)whatsNew()}

/* install to the home screen: Chrome and Android offer a button, iPhone needs Safari's Share menu */
let installEv=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEv=e;if(S.view==='card')render()});
window.addEventListener('appinstalled',()=>{installEv=null;toast('BAD is on your home screen.');if(S.view==='card')render()});
const isStandalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch(e){return false}};
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function installHTML(){if(!window.BAD_WEB||isStandalone())return '';
  if(installEv)return `<section class="hsec"><h3 class="ah">BAD on your phone</h3><button class="tile cta" data-install="1"><span class="ic-row"><span class="ic-bub">${ic('plus')}</span><span><b>Add BAD to your home screen</b><span class="fine" style="display:block">Opens full screen, like an app</span></span>${ic('arrow')}</span></button></section>`;
  if(isIOS())return `<section class="hsec"><h3 class="ah">BAD on your phone</h3><div class="tile inst-ios"><b>Add BAD to your home screen</b><p class="fine">In Safari, tap Share ${ic('share')} then <b>Add to Home Screen</b>. BAD opens full screen, like an app.</p></div></section>`;
  return ''}
function bindInstall(el){el.querySelectorAll('[data-install]').forEach(b=>b.onclick=async()=>{if(!installEv)return;installEv.prompt();try{await installEv.userChoice}catch(e){}installEv=null;render()})}

/* bottom of My BAD: Privacy, Terms, Delete my account */
function accountFootHTML(){return `<section class="hsec acctfoot"><a href="privacy.html" target="_blank" rel="noopener">Privacy</a><a href="terms.html" target="_blank" rel="noopener">Terms</a><button class="linkbtn dangerl" data-delme="1">Delete my account</button></section>`}
function bindAccountFoot(el){el.querySelectorAll('[data-delme]').forEach(b=>b.onclick=askDelete)}
function askDelete(){
  const s=launchSheet(`<span class="label">Delete my account</span><h3 class="wl-h">Leaving BAD?</h3>
    <p class="muted">This removes your card, contact details, Feed posts and photos for good. Your points and BADges go too. Records of what you paid stay with the club for its accounts.</p>
    <label for="del-in" class="fine">Type DELETE to confirm</label><input id="del-in" autocomplete="off" autocapitalize="characters" spellcheck="false">
    <div class="row"><button class="btn dangerb" data-delgo="1" disabled>Delete for good</button><button class="btn ghost" data-lx="1">Keep my account</button></div>
    <p class="fine" id="del-msg" role="status"></p>`,'Delete my account');
  const inp=s.card.querySelector('#del-in'),go=s.card.querySelector('[data-delgo]'),msg=s.card.querySelector('#del-msg');
  inp.oninput=()=>{go.disabled=inp.value.trim().toUpperCase()!=='DELETE'};inp.focus();
  go.onclick=async()=>{
    if(window.badAuthRecent&&!window.badAuthRecent()){
      msg.innerHTML='For your safety, sign in again first, then come back to Delete my account. <button class="linkbtn" data-resign="1">Sign in again</button>';
      msg.querySelector('[data-resign]').onclick=()=>{lsSet('badDelAfter','1');window.badSignOut&&window.badSignOut()};return}
    go.disabled=true;inp.disabled=true;msg.textContent='Deleting…';
    try{await deleteMe();lsSet('badDelAfter','');s.close();toast('Your account is deleted. Thanks for playing with us.');setTimeout(()=>{location.hash='';location.reload()},1600)}
    catch(e){go.disabled=false;inp.disabled=false;
      msg.textContent=e&&e.code==='auth/requires-recent-login'?'For your safety, sign out, sign in again, then try once more.'
        :e&&e.code==='permission-denied'?'That didn’t go through. Please ask an admin to delete your account.':'Sorry, that didn’t work. Please try again.'}}}
async function deleteMe(){const u=S.uid,db=S.db;if(!u||!db)throw new Error('signed out');
  const mine=async c=>{try{const q=await db.collection(c).where('uid','==',u).get();await Promise.all(q.docs.map(d=>d.ref.delete()))}catch(e){}};
  await mine('feedimg');await mine('feed');
  try{await db.doc('contacts/'+u).delete()}catch(e){}
  await db.doc('profiles/'+u).delete();
  if(window.badDeleteAuth)await window.badDeleteAuth()}
/* back after "Sign in again": open My BAD and the delete sheet */
function resumeDelete(){if(lsGet('badDelAfter')!=='1'||!S.uid||!myProfile())return;lsSet('badDelAfter','');setView('card');setTimeout(askDelete,400)}

/* service worker: offline and installable, only on the real site */
if(window.BAD_WEB&&'serviceWorker' in navigator&&location.protocol==='https:')
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
