/* ---------- navigation ---------- */
const NAV={card:['card','Home'],guide:['guide','Guide'],play:['play','Play'],courts:['court','Courts'],club:['club','Club'],quests:['quest','Quests'],board:['board','Board'],shop:['bag','Shop'],admin:['admin','Admin']};
document.querySelectorAll('.tabs button').forEach(b=>{const [i,t]=NAV[b.dataset.v];b.innerHTML=ic(i)+`<span>${t}</span>`;b.onclick=()=>setView(b.dataset.v)});
function setView(v){S.view=v;
  for(const id of ['card','guide','play','courts','create','club','quests','board','shop','admin'])$('v-'+id).hidden=id!==v;
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-current',(b.dataset.v===v||(v==='create'&&b.dataset.v==='card'))?'page':'false'));
  renderNow();window.scrollTo(0,0);
}
function render(){
  const ae=document.activeElement,typing=ae&&/INPUT|TEXTAREA|SELECT/.test(ae.tagName)&&ae.type!=='range';
  if(S.view==='create'){if($('preview'))preview();return}
  if(typing&&$('v-'+S.view)&&$('v-'+S.view).contains(ae))return;
  if(S.view==='courts')return renderCourts();
  renderNow();
}
function renderNow(){$('nav-admin').hidden=!S.canEdit;document.body.classList.toggle('wide',S.view==='admin'||(S.view==='courts'&&S.canEdit&&canRun(S.courtSport)&&!S.asPlayer));
  ({card:renderCard,play:renderPlay,courts:()=>{sel=null;renderCourts()},club:renderClub,quests:renderQuests,guide:renderGuide,board:renderBoard,shop:typeof renderShop==='function'?renderShop:()=>{},admin:typeof renderAdmin==='function'?renderAdmin:()=>{},create:renderStep}[S.view]||(()=>{}))()}
function sportBar(cur,attr,keys){return `<div class="sports" role="group" aria-label="Filter by department"><button class="sp" data-${attr}="all" aria-pressed="${cur==='all'}">${ic('users')}All</button>${keys.map(k=>`<button class="sp" data-${attr}="${k}" aria-pressed="${cur===k}">${ic(SPORTS[k].icon)}${SPORTS[k].club}</button>`).join('')}</div>`}

/* ---------- sessions logic ---------- */
const sessStart=s=>at(s.date,s.start||'20:00');
/* sign-ups can open at a set time; Member level and up get in 24 hours early */
const opensMs=s=>s&&s.opens?+at(s.opens.slice(0,10),s.opens.slice(11,16)||'00:00'):0;
function signupState(s,uid){const o=opensMs(s),now=Date.now();if(!o||now>=o)return{open:true};if(perk.early(uid)&&now>=o-864e5)return{open:true,early:true};return{open:false,opens:o,earlyAt:o-864e5}}
function roster(sid){
  const s=S.sessions[sid];const cap=Number(s?.capacity)||20;
  const all=[];for(const [uid,b] of Object.entries(S.bookings)){const x=b.s&&b.s[sid];if(!x)continue;
    all.push({uid,key:b.key,at:x.at,out:x.out||null,guest:null});
    (x.guests||[]).forEach((g,gi)=>all.push({uid,key:b.key,at:g.at,out:g.out||x.out||null,guest:g.n,gi}))}
  const sorted=all.filter(e=>!e.out).sort((a,b)=>a.at.localeCompare(b.at)),pri=e=>!e.guest&&typeof perk!=='undefined'&&perk.skipWait(e.uid)?1:0;
  /* Core level and up skip ahead of the waitlist */
  const active=sorted.slice(0,cap).concat(sorted.slice(cap).sort((a,b)=>pri(b)-pri(a)||a.at.localeCompare(b.at)));
  const late=all.filter(e=>e.out).map(e=>{const ahead=all.filter(o=>o.at<e.at&&(!o.out||o.out>e.out)).length;return{...e,wasIn:ahead<cap,fee:feeFor(s,e.out)}}).filter(e=>e.wasIn&&e.fee.amount>0);
  /* the waiting list can have a limit (badminton: 4); anyone past it is turned away when they try to join */
  const wc=s&&s.waitCap!=null&&s.waitCap!==''?Number(s.waitCap):Infinity;
  return{cap,wc,in:active.slice(0,cap),wait:active.slice(cap,cap+wc),over:active.slice(cap+wc),late};
}
function feeFor(s,whenIso){const h=(sessStart(s)-new Date(whenIso))/36e5,f=Number(s.fee)||0;
  if(h>=CFG.freeHours)return{amount:0,label:'No charge'};if(h>=CFG.halfHours)return{amount:f/2,label:'Half fee'};return{amount:f,label:'Full fee'}}
/* staff take someone off a session. Inside the 48 hours the drop counts as a late cancellation, so the same fee
   applies as if they had dropped themselves (half from 48 to 24 hours, full under 24). charge=false removes them with no fee. */
const dropFee=sid=>S.sessions[sid]?feeFor(S.sessions[sid],new Date().toISOString()):{amount:0,label:'No charge'};
async function staffDrop(uid,sid,gi,charge){const t=new Date().toISOString(),g=gi===''||gi==null?null:+gi;
  return staffBooking(uid,sid,o=>{if(!o)return undefined;
    if(g==null)return charge?{...o,out:t,guests:(o.guests||[]).map(x=>x.out?x:{...x,out:t})}:null;
    return{...o,guests:charge?(o.guests||[]).map((x,i)=>i===g?{...x,out:t}:x):(o.guests||[]).filter((_,i)=>i!==g)}})}
function upcoming(){const now=Date.now()-2*36e5;return Object.entries(S.sessions).filter(([,s])=>sessStart(s)>now).sort((a,b)=>sessStart(a[1])-sessStart(b[1]))}
let pendingOut=null,guestFor=null,payFor=null;
/* Bookings: one change to one session per save, named in op (join, leave, guest or pay), with server times,
   exactly as the security rules expect. Several sessions = several saves. */
/* Payments live in each player's own record, pay/{uid}: s.{sessionId} = {ok, waived, method, at, by}.
   Players can read only their own; finance admins and community managers write, one session per save.
   The old shared records (payments/{sessionId}) are still read for history. S.payments[sid][uid] combines both. */
S.payOld={};S.payNew={};
function rebuildPayments(){const m={};for(const [sid,x] of Object.entries(S.payOld||{}))m[sid]={...x};
  for(const [uid,d] of Object.entries(S.payNew||{}))for(const [sid,v] of Object.entries((d&&d.s)||{})){m[sid]=m[sid]||{};if(v)m[sid][uid]=v;else delete m[sid][uid]}
  S.payments=m}
async function setPayment(uid,sid,val){const cur=(S.payNew[uid]&&S.payNew[uid].s)||{},s={...cur};
  /* an old shared record for this session is replaced by the new one, so an explicit 'not paid' wins over it */
  s[sid]=val||null;await S.db.doc('pay/'+uid).set({s,op:{sid},u:SVT()});
  S.payNew[uid]={...(S.payNew[uid]||{}),s};rebuildPayments();render()}
async function saveBooking(sid,kind,fn){const cur=S.bookings[S.uid]||{s:{}},s={...(cur.s||{})},o=s[sid]?{...s[sid]}:null;
  const e=fn(o);if(!e)return;s[sid]=e;await S.db.doc('bookings/'+S.uid).set({key:myProfile().listKey,s,op:{sid,kind},u:SVT()})}
const freshEntry=(pay,at)=>({at:at||new Date().toISOString(),t:SVT(),guests:[],pay:pay||'cash'});
/* staff change to someone else's booking (admins and community managers for that sport) */
async function staffBooking(uid,sid,fn,base){const cur=S.bookings[uid]||base||{s:{}},s={...(cur.s||{})},o=s[sid]?{...s[sid]}:null;
  const e=fn(o);if(e===undefined)return;if(e===null)delete s[sid];else s[sid]=e;
  const {op,u,...rest}=cur;await S.db.doc('bookings/'+uid).set({...rest,s,op:{sid,kind:'admin'},u:SVT()})}
const isCancelled=sid=>!!(S.sessions[sid]&&S.sessions[sid].cancelled);
const isFull=sid=>{const r=roster(sid);return r.in.length>=r.cap&&r.wait.length>=r.wc&&!(typeof perk!=='undefined'&&perk.skipWait(S.uid))};
async function join(sid,pay){if(isCancelled(sid)){toast('This session is cancelled.');return}if(isFull(sid)){toast('Sorry, this session and its waiting list are full.');return}try{await saveBooking(sid,'join',()=>freshEntry(pay));payFor=null;toast("You're in. See you there.")}catch(e){toast("Sorry, that didn't save. Please try again.")}}
async function setPay(sid,pay){try{await saveBooking(sid,'pay',o=>{const x={...o,pay};delete x.sent;return x});payFor=null;toast(`Payment set to ${PAY[pay].label}.`)}catch(e){toast("Sorry, that didn't save.")}}
async function markSent(sid){try{await saveBooking(sid,'pay',o=>({...o,sent:new Date().toISOString()}));toast('Thank you. An admin will confirm your payment.')}catch(e){toast("Sorry, that didn't save.")}}
async function unmarkSent(sid){try{await saveBooking(sid,'pay',o=>{const x={...o};delete x.sent;return x});toast('Done. It shows as not paid yet.')}catch(e){toast("Sorry, that didn't save.")}}
const payOn=k=>{const c=S.payCfg||{};return c[k]!==false};
function payPicker(sid,isChange){return `<div class="confirm"><b>${isChange?'Change how you pay':'How would you like to pay?'}</b>
  <div class="paypick">${Object.entries(PAY).filter(([k])=>payOn(k)).map(([k,m])=>`<button type="button" data-pay="${k}" data-sid="${sid}" data-change="${isChange?1:0}">${ic(m.icon)}<b>${m.label}</b><span class="fine">${m.sub}</span></button>`).join('')}</div>
  <button class="btn ghost sm" data-paycancel="1" style="justify-self:start">Cancel</button></div>`}
const careemDet=(c,amt)=>c.careemNo||c.careemLink?`<div class="paydet">${c.careemName?`<span class="fine">Send to</span><b>${esc(c.careemName)}</b>`:''}${c.careemNo?`<span class="fine">Careem Pay</span><b class="num">${esc(c.careemNo)}</b>`:''}<span class="fine">Amount</span><b class="num">AED ${esc(amt)}</b></div>${c.careemLink?`<a class="btn" href="${esc(c.careemLink)}" target="_blank" rel="noopener">${ic('phone')}Open Careem Pay</a>`:''}`:'<p class="fine">An admin will share the Careem Pay details with you.</p>';
function payInfo(sid,s,mine,amt){const fee=amt!=null?amt:s.fee;
  const k=mine.pay||'cash',m=PAY[k],c=S.payCfg||{},ok=S.payments[sid]?.[S.uid]?.ok;
  if(S.payments[sid]?.[S.uid]?.waived)return `<div class="payline ok">${ic('check')}<span><b>Free</b> · nothing to pay</span></div>`;
  if(ok)return `<div class="payline ok">${ic('check')}<span><b>Paid</b> · ${m.label}</span></div>`;
  let det='';
  if(k==='bank')det=c.bankName||c.iban?`<div class="paydet"><span class="fine">Account name</span><b>${esc(c.accName||'')}</b><span class="fine">Bank</span><b>${esc(c.bankName||'')}</b><span class="fine">IBAN</span><b class="num" id="iban-${sid}">${esc(c.iban||'')}</b><span class="fine">Reference</span><b>${esc((myProfile()?.nickname||'')+' '+s.date)}</b></div><button class="btn ghost sm" data-copy="iban-${sid}">${ic('copy')}Copy IBAN</button>`:'<p class="fine">An admin will share the bank details with you.</p>';
  if(k==='ziina')det=c.ziinaLink?`<a class="btn sm" href="${esc(c.ziinaLink)}" target="_blank" rel="noopener">${ic('wallet')}Pay AED ${esc(fee)} with Ziina</a>`:'<p class="fine">An admin will send you a Ziina link.</p>';
  if(k==='cash')det=`<p class="fine">Please bring AED ${esc(fee)} in cash to the session.</p>`;
  if(k==='careem')det=careemDet(c,fee);
  return `<div class="payline"><div class="row" style="justify-content:space-between"><span class="ic-row">${ic(m.icon)}<span><b>${m.label}</b> · AED ${esc(fee)}${mine.sent?' · <span class="fine">sent, waiting for confirmation</span>':''}</span></span><button class="btn ghost sm" data-paychange="${sid}">Change</button></div>
    ${det}${k!=='cash'&&!mine.sent?`<button class="btn ghost sm" data-sent="${sid}" style="justify-self:start">${ic('check')}I've paid</button>`:''}${mine.sent?`<button class="linkbtn" data-unsent="${sid}" style="justify-self:start">Tapped by mistake? Undo</button>`:''}</div>`;
}
async function leave(sid,late){const now=new Date().toISOString();
  try{await saveBooking(sid,'leave',o=>({...o,out:now,tout:SVT(),guests:(o.guests||[]).map(g=>g.out?g:{...g,out:now})}));pendingOut=null;toast(late?'Your name is removed. The fee is noted.':'Your name is removed. Thank you for letting us know.')}catch(e){toast("Sorry, that didn't save. Please try again.")}}
async function addGuest(sid,name){name=name.trim().slice(0,24);if(!name){toast("Please add your guest's name.");return}
  try{await saveBooking(sid,'guest',o=>({...o,guests:[...(o.guests||[]),{n:name,at:new Date().toISOString()}]}));guestFor=null;toast(`${name} is on the list as your guest.`)}catch(e){toast("Sorry, that didn't save.")}}
async function dropGuest(sid,gi,late){const now=new Date().toISOString();
  try{await saveBooking(sid,'guest',o=>{const g=[...(o.guests||[])];if(late)g[gi]={...g[gi],out:now};else g.splice(gi,1);return {...o,guests:g}});pendingOut=null;toast(late?'Guest removed. The fee is noted under your name.':'Guest removed.')}catch(e){toast("Sorry, that didn't save.")}}

function renderPlay(){
  const el=$('v-play'),me=myProfile();
  const used=[...new Set(Object.values(S.sessions).map(s=>s.sport||'badminton'))].filter(k=>SPORTS[k]&&!isSide(k));if(isSide(S.sport))S.sport='all';
  const list=upcoming().filter(([,s])=>!isSide(s.sport)&&(S.sport==='all'||(s.sport||'badminton')===S.sport));
  const head=`<div class="hero"><span class="label">Sessions</span><h2>Find your next game.</h2>
    ${me?'':`<div class="note">${ic('card')}<div style="display:grid;gap:8px"><span>Please register your player card first. After that, joining any session is one tap.</span><button class="btn sm" id="go-card" style="justify-self:start">Register here</button></div></div>`}</div>
    ${(()=>{const n=me?upcoming().filter(([sid])=>{const b=S.bookings[S.uid]?.s?.[sid];return b&&!b.out}).length:0;return n?`<button class="mystrip" data-goview="card">${ic('ticket')}<span><b>You're booked for ${n} session${n===1?'':'s'}</b><small>Cancel, change payment or bring a friend from Home</small></span>${ic('arrow')}</button>`:''})()}
    ${sportBar(S.sport,'flt',used)}${S.sport!=='all'?deptCard(S.sport):''}`;
  const rules=`<details class="rules"><summary>${ic('clock')}How joining and dropping out works</summary><p class="fine">Plans change, and that's fine. You can drop out for free up to 48 hours before. Between 24 and 48 hours, half the fee applies. Under 24 hours, the full fee applies. On the day, please check in with an admin when you arrive: games go in order of arrival, so arriving late may mean fewer games. Guests are the responsibility of the member who brings them. You earn +${CFG.newGuest} points for every new guest you bring.</p></details>`;
  if(!list.length){el.innerHTML=head+`<div class="empty">${ic('play')}<span>No sessions posted for this department yet. Please check back soon.</span></div>`+rules;bindPlay(el);return}
  const wk=sx=>{const t=new Date();t.setHours(0,0,0,0);const d=(sessStart(sx)-t)/864e5;return d<7-((t.getDay()+6)%7)?'This week':d<14-((t.getDay()+6)%7)?'Next week':'Later'};let lastWk='';
  el.innerHTML=head+`<div class="slist">`+list.map(([sid,s])=>{const w=wk(s),hdr=w!==lastWk?`<h3 class="wkh">${w}</h3>`:'';lastWk=w;
    return hdr+sessCard(sid,s)}).join('')+`</div>`+rules;
  bindPlay(el);
}
function sessCard(sid,s){const me=myProfile();
    const r=roster(sid),d=dParts(s.date),mine=S.bookings[S.uid]?.s?.[sid],started=Date.now()>sessStart(s),sp=sportOf(s.sport);
    const pos=r.in.findIndex(e=>e.uid===S.uid&&!e.guest),wpos=r.wait.findIndex(e=>e.uid===S.uid&&!e.guest);
    const myG=[...r.in.map(e=>({...e,st:'In'})),...r.wait.map(e=>({...e,st:'Waitlist'}))].filter(e=>e.uid===S.uid&&e.guest);
    let status='',actions='';
    if(s.cancelled){status=`<span class="tagl warn">Cancelled${s.cancelReason?' · '+esc(s.cancelReason):''}</span>`}
    if(s.cancelled){}
    else if(mine&&mine.out){const f=feeFor(s,mine.out);status=`<span class="tagl">Dropped · ${esc(f.label)}${f.amount?` · AED ${f.amount}`:''}</span>`;if(me&&!started)actions=`<button class="btn sm" data-joinask="${sid}">${ic('plus')}Join again</button>`}
    else if(pos>=0){status=`<span class="tagl solid">${ic('check')}You're in</span>`;if(!started)actions=`<button class="btn ghost sm" data-out="${sid}">I can't make it</button>`}
    else if(wpos>=0){status=`<span class="tagl">Waitlist #${wpos+1}</span>`;actions=`<button class="btn ghost sm" data-wout="${sid}">Leave waitlist</button>`}
    else if(me&&!started){const ss=signupState(s,S.uid),fmtO=t=>new Date(t).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit',timeZone:'Asia/Dubai'});
      if(!ss.open)status=`<span class="tagl">Sign-ups open ${esc(fmtO(ss.opens))}</span>`;
      else{if(ss.early)status=`<span class="tagl solid">${ic('star')}Early access</span>`;actions=r.in.length>=r.cap&&r.wait.length>=r.wc&&!perk.skipWait(S.uid)?`<span class="tagl warn">Full · waiting list full</span>`:`<button class="btn sm" data-joinask="${sid}">${ic('plus')}${r.in.length>=r.cap?(perk.skipWait(S.uid)?'Join · you skip the waitlist':`Join waitlist${r.wc<Infinity?` · ${r.wc-r.wait.length} left`:''}`):'Count me in'}</button>`}}
    let conf='';
    if(pendingOut&&pendingOut.sid===sid){const f=feeFor(s,new Date().toISOString()),g=pendingOut.gi!=null;
      conf=`<div class="confirm"><p><b>Just so you know:</b> it's now under ${f.label==='Full fee'?'24':'48'} hours to start. Removing ${g?'your guest':'your name'} means the ${esc(f.label.toLowerCase())}, AED ${f.amount}${g?', under your name':''}.</p>
      <div class="row"><button class="btn sm" data-yes="1">Remove ${g?'guest':'me'}</button><button class="btn ghost sm" data-no="1">Keep ${g?'them':'me'} in</button></div></div>`}
    const guests=(mine&&!mine.out&&!started)?`<div style="display:grid;gap:8px;border-top:1px solid var(--line);padding-top:10px">
      ${myG.map(g=>`<div class="row" style="justify-content:space-between"><span class="ic-row">${ic('guest')}${esc(g.guest)} <span class="fine">your guest · ${g.st}</span></span><button class="btn ghost sm" data-gout="${sid}" data-gi="${g.gi}">Remove</button></div>`).join('')}
      ${guestFor===sid?`<div class="row"><input type="text" id="g-name" maxlength="24" placeholder="Guest's name" style="flex:1;min-width:150px"><button class="btn sm" data-gadd="${sid}">Add</button><button class="btn ghost sm" data-gcancel="1">Cancel</button></div>`
        :`<button class="btn ghost sm" data-gnew="${sid}" style="justify-self:start">${ic('guest')}Bring a guest</button>`}</div>`:'';
    return `<article class="sess" data-sess="${esc(sid)}"><div class="dt"><small>${d.w}</small><b class="num">${d.d}</b><small>${d.m}</small></div><div class="bd">
      <div class="row" style="justify-content:space-between;gap:8px"><div class="ic-row">${ic(sp.icon)}<h3>${esc(s.title||sp.club)}</h3></div>${status}</div>
      <div class="meta"><span>${ic('clock')}${s.timeTbc?'Time to be confirmed':`${fmtTime(s.start)} to ${fmtTime(s.end)}`}</span>${s.venue?`<span>${ic('pin')}${esc(s.venue)}</span>`:''}<span>${ic('coin')}AED ${esc(s.fee)}</span>${(s.gms||[]).length?`<span>${ic('star')}Game Master: ${s.gms.map(u=>esc(S.profiles[u]?.nickname||'')).filter(Boolean).join(' & ')}</span>`:''}<span>${ic('users')}${r.in.length}/${r.cap}${r.wait.length?` · ${r.wait.length} waiting`:''}</span></div>
      ${s.note?`<p>${esc(s.note)}</p>`:''}
      <div class="cap"><i style="width:${Math.min(100,r.in.length/r.cap*100)}%"></i></div>
      <div class="row" style="justify-content:space-between">${r.in.length?`<div class="faces">${r.in.slice(0,7).map(e=>e.guest?avatar(null,e.guest):avatar(S.profiles[e.uid],e.key)).join('')}${r.in.length>7?`<span class="more num">+${r.in.length-7}</span>`:''}</div>`:'<span class="fine">Be the first to join.</span>'}${actions}</div>
      ${payFor&&payFor.sid===sid?payPicker(sid,payFor.change):''}${mine&&!mine.out&&(pos>=0||wpos>=0)&&!(payFor&&payFor.sid===sid)?payInfo(sid,s,mine):''}${guests}${conf}</div></article>`}
function bindPlay(el){
  const q=s=>el.querySelectorAll(s),now=()=>new Date().toISOString();
  q('[data-flt]').forEach(b=>b.onclick=()=>{S.sport=b.dataset.flt;renderNow()});
  q('[data-joinask]').forEach(b=>b.onclick=()=>{payFor={sid:b.dataset.joinask,change:false};renderNow()});
  q('[data-pay]').forEach(b=>b.onclick=()=>b.dataset.change==='1'?setPay(b.dataset.sid,b.dataset.pay):join(b.dataset.sid,b.dataset.pay));
  q('[data-paycancel]').forEach(b=>b.onclick=()=>{payFor=null;renderNow()});
  q('[data-paychange]').forEach(b=>b.onclick=()=>{payFor={sid:b.dataset.paychange,change:true};renderNow()});
  q('[data-sent]').forEach(b=>b.onclick=()=>markSent(b.dataset.sent));
  q('[data-unsent]').forEach(b=>b.onclick=()=>unmarkSent(b.dataset.unsent));
  q('[data-copy]').forEach(b=>b.onclick=async()=>{const t=$(b.dataset.copy).textContent;try{await navigator.clipboard.writeText(t);toast('IBAN copied.')}catch(e){const r=document.createRange();r.selectNodeContents($(b.dataset.copy));const x=getSelection();x.removeAllRanges();x.addRange(r);toast('Selected. Please copy it now.')}});
  q('[data-wout]').forEach(b=>b.onclick=()=>leave(b.dataset.wout,false));
  q('[data-out]').forEach(b=>b.onclick=()=>{const sid=b.dataset.out;if(feeFor(S.sessions[sid],now()).amount===0)leave(sid,false);else{pendingOut={sid};renderNow()}});
  q('[data-gout]').forEach(b=>b.onclick=()=>{const sid=b.dataset.gout,gi=+b.dataset.gi;const w=roster(sid).wait.find(e=>e.uid===S.uid&&e.gi===gi);
    if(w||feeFor(S.sessions[sid],now()).amount===0)dropGuest(sid,gi,false);else{pendingOut={sid,gi};renderNow()}});
  q('[data-yes]').forEach(b=>b.onclick=()=>{const p=pendingOut;p.gi!=null?dropGuest(p.sid,p.gi,true):leave(p.sid,true)});
  q('[data-no]').forEach(b=>b.onclick=()=>{pendingOut=null;renderNow()});
  q('[data-gnew]').forEach(b=>b.onclick=()=>{guestFor=b.dataset.gnew;renderNow();const i=el.querySelector('#g-name');if(i)i.focus()});
  q('[data-gcancel]').forEach(b=>b.onclick=()=>{guestFor=null;renderNow()});
  q('[data-gadd]').forEach(b=>b.onclick=()=>addGuest(b.dataset.gadd,el.querySelector('#g-name').value));
  const g=$('go-card');if(g)g.onclick=()=>startCreator();
  q('.mystrip').forEach(b=>b.onclick=()=>{setView('card');scrollTo({top:0})});
}

/* ---------- my card (home) ---------- */
/* ---------- my activity + payments ---------- */
function myActivity(){
  const b=S.bookings[S.uid]?.s||{},rows=[];
  for(const [sid,x] of Object.entries(b)){const s=S.sessions[sid];if(!s)continue;
    const started=Date.now()>sessStart(s),r=roster(sid),inside=r.in.some(e=>e.uid===S.uid&&!e.guest),wait=r.wait.some(e=>e.uid===S.uid&&!e.guest);
    const guests=(x.guests||[]).filter(g=>!g.out||r.late.some(e=>e.uid===S.uid&&e.guest===g.n)).length;
    let status,amount=0;
    if(x.out){const f=feeFor(s,x.out);status=f.amount?'Dropped late':'Dropped';amount=f.amount}
    else if(inside){status=started?'Played':'Booked';amount=(Number(s.fee)||0)*(1+guests)}
    else if(wait){status=started?'Missed (waitlist)':'Waitlist'}
    else continue;
    const pay=S.payments[sid]?.[S.uid];
    const payState=!amount?'none':pay?.waived?'free':pay?.ok?'paid':x.sent?'sent':'pending';
    rows.push({sid,s,x,status,amount,guests,payState,games:gamesFor(sid,S.uid),method:x.pay||'cash'});
  }
  return rows.sort((a,b)=>sessStart(b.s)-sessStart(a.s));
}
function payAllHTML(due,total){
  const c=S.payCfg||{},opts=Object.keys(PAY).filter(payOn),k=opts.includes(S.payAllM)?S.payAllM:(opts.includes('ziina')?'ziina':opts[0]||'cash'),todo=due.filter(r=>r.payState==='pending');
  const ref=`${myProfile()?.nickname||''} · ${due.length} session${due.length===1?'':'s'}`;
  let det='';
  if(k==='bank')det=c.iban?`<div class="paydet"><span class="fine">Account name</span><b>${esc(c.accName||'')}</b><span class="fine">Bank</span><b>${esc(c.bankName||'')}</b><span class="fine">IBAN</span><b class="num" id="iban-all">${esc(c.iban)}</b><span class="fine">Amount</span><b class="num">AED ${total}</b><span class="fine">Reference</span><b>${esc(ref)}</b></div><button class="btn ghost" data-copy="iban-all">${ic('copy')}Copy IBAN</button>`:'<p class="fine">An admin will share the bank details with you.</p>';
  if(k==='ziina')det=c.ziinaLink?`<a class="btn" href="${esc(c.ziinaLink)}" target="_blank" rel="noopener">${ic('wallet')}Open Ziina and send AED ${total}</a>`:'<p class="fine">An admin will send you a Ziina link for AED '+total+'.</p>';
  if(k==='cash')det=`<p class="fine">Please bring AED ${total} in cash to your next session. An admin will confirm it there.</p>`;
  if(k==='careem')det=careemDet(c,total);
  return `<div class="payall"><div class="list">${due.map(r=>{const d=dParts(r.s.date);return `<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><span>${esc(r.s.title||sportOf(r.s.sport).club)} <span class="fine">· ${d.d} ${d.m}${r.status==='Dropped late'?' · late drop fee':''}${r.guests?` · +${r.guests} guest${r.guests>1?'s':''}`:''}</span></span><b class="num">AED ${r.amount}</b></div>`}).join('')}
    <div class="li total" style="grid-template-columns:minmax(0,1fr) auto"><b>Total</b><b class="num">AED ${total}</b></div></div>
    <div class="chips" role="group" aria-label="How you'll pay">${opts.map(o=>`<button class="chip" data-pam="${o}" aria-pressed="${o===k}">${ic(PAY[o].icon)}${PAY[o].label}</button>`).join('')}</div>
    ${det}
    ${k!=='cash'&&todo.length?`<button class="btn ghost" data-payalldone="${k}">${ic('check')}I've paid all AED ${total}</button>`:k==='cash'?'':'<p class="fine">Sent. An admin will confirm it soon.</p>'}</div>`}
/* Points and BADges: two tiles side by side */
function ptsTilesHTML(pt,fd,req){const c=PS();
  const pts=fd?`<div class="tile hs ptile"><span class="label">Points</span><div class="stat"><b class="num"><span class="inf">∞</span></b><span class="fine">Founder. Points never run out.</span></div></div>`
    :`<div class="tile hs ptile"><span class="label">Points</span><div class="stat"><b class="num">${pt.balance}<small>/${c.free}</small></b><span class="fine">${!pt.started?(pt.launch?`Points start counting on ${esc(fmtD(pt.launch))}.`:'Points start counting on launch day.'):pt.canRedeem?'A free session is ready.':`${c.free-pt.balance} more to a free session.`}</span></div>
      <div class="bar"><i style="width:${Math.min(100,pt.balance/c.free*100)}%"></i></div>
      ${pt.playBy?`<span class="fine">Play by ${esc(fmtD(pt.playBy))} to keep them.</span>`:''}
      ${req?'<span class="tagl">Free session requested</span>':pt.canRedeem?(pt.unpaid?`<span class="fine">Please settle your AED ${pt.unpaid} first, then you can use your free session.</span>`:`<button class="btn sm" id="redeem">${ic('ticket')}Use ${c.free} for a free session</button>`):''}</div>`;
  const bd=`<div class="tile hs btile"><span class="label">BADges</span><div class="bstat"><span class="bimg">${badgeArt(pt.top?9:pt.levelIdx,{label:pt.level+' BADge'})}</span><div class="stat"><b class="num">${fd?'<span class="inf">∞</span>':pt.badges}</b><span class="fine"><span class="lvl">${esc(pt.level)}</span>${pt.top?' · every perk':pt.next?` · ${pt.toNext} more to ${esc(pt.next.k)}`:' · top BADge level'}</span></div></div>
      ${!pt.top&&pt.next?`<div class="bar"><i style="width:${Math.max(0,Math.min(100,(pt.badges-(+(PS().levels[pt.levelIdx]||{}).at||0))/Math.max(1,(+pt.next.at)-(+(PS().levels[pt.levelIdx]||{}).at||0))*100))}%"></i></div>`:''}
      ${canGiveBadge()?`<button class="btn ghost sm" data-givebadge="">Give a BADge</button>`:''}</div>`;
  const pay=`<div class="paystat ${pt.unpaid?'owe':'ok'}">${pt.unpaid?`${ic('wallet')}<span>AED ${pt.unpaid} unpaid</span>`:`${ic('check')}<span>Paid up</span>`}</div>`;
  return `<section class="hsec"><div class="sec-h"><h3 class="ah">Points and BADges</h3>${pay}</div><div class="tiles pbtiles">${pts}${bd}</div></section>`}
function recentHTML(uid){const rows=[...myEntries(uid).map(e=>({d:e.date,i:e.pts<0?(e.type==='Free session redeemed'?'ticket':'clock'):'coin',t:e.reason||e.type,v:`${e.pts>0?'+':'−'}${Math.abs(e.pts)}`})),...myBadges(uid).map(b=>({d:b.date,i:'star',t:b.reason+(b.by?` · from ${b.by}`:''),v:`+${b.n||1} BADge${(b.n||1)>1?'s':''}`}))].sort((a,b)=>String(b.d).localeCompare(String(a.d))).slice(0,6);
  if(!rows.length)return '';
  return `<section class="hsec"><h3 class="ah">Recent points and BADges</h3><div class="list">${rows.map(r=>`<div class="li"><span class="ic-bub soft">${ic(r.i)}</span><div><div class="nm">${esc(r.t)}</div><div class="sub num">${esc(fmtD(r.d))}</div></div><b class="num">${r.v}</b></div>`).join('')}</div><p class="fine">Session points come from the session trackers and update every 15 minutes.</p></section>`}
function activityHTML(){
  const rows=myActivity(),due=rows.filter(r=>r.payState==='pending'||r.payState==='sent');
  const total=due.reduce((a,r)=>a+r.amount,0);
  const badge=st=>({free:'<span class="tagl solid">'+ic('check')+'Free</span>',paid:'<span class="tagl solid">'+ic('check')+'Paid</span>',sent:'<span class="tagl">Sent · checking</span>',pending:'<span class="tagl warn">Pending</span>',none:''}[st]);
  return `<div class="sec hsec"><div class="sec-h"><h3 class="ah">Bookings and payments</h3>${rows.length?`<span class="fine">${rows.length} session${rows.length===1?'':'s'}</span>`:''}</div>
    ${total?`<div class="tile owe"><span class="label">Payment pending</span><div class="stat"><b class="num">AED ${total}</b><span class="fine">${due.length} session${due.length===1?'':'s'} not confirmed yet. Thank you for settling when you can.</span></div>
      <div class="row"><button class="btn" data-payall="1">${ic('wallet')}Pay all AED ${total}</button><button class="btn ghost" data-payjump="1">Pay one by one</button></div>${(()=>{const asked=due.filter(r=>r.x.ask&&!r.x.ask.no),no=due.find(r=>r.x.ask&&r.x.ask.no);
        if(asked.length)return `<div class="askbox"><span class="ic-row">${ic('clock')}<span>Sent to the admins. They'll check and confirm soon.</span></span><button class="linkbtn" data-askcancel="1">Cancel request</button></div>`;
        if(S.askOpen)return `<div class="askbox"><label class="lbl" for="ask-note">Anything the admins should know?</label><textarea id="ask-note" rows="2" maxlength="300" placeholder="Optional. For example: I paid cash to Kym on Friday.">${esc(S.askNote||'')}</textarea><div class="row"><button class="btn" data-asksend="1">${ic('check')}Send to admins</button><button class="btn ghost" data-askclose="1">Cancel</button></div></div>`;
        return `${no?'<p class="fine">An admin couldn’t find this payment yet. Please check with them at your next session.</p>':''}<button class="btn ghost wide" data-askadm="1">${ic('users')}Check with admin</button>`})()}${S.canEdit&&fullAdmin()?`<button class="linkbtn" data-clearmine="1">Admin: clear my AED ${total} pending</button>`:''}
      ${S.payAll?payAllHTML(due,total):''}</div>`
      :rows.length?`<div class="tile"><span class="ic-row">${ic('check')}<b>All paid up.</b></span><span class="fine">Thank you.</span></div>`:''}
    <div class="list">${rows.slice(0,12).map(r=>{const d=dParts(r.s.date),sp=sportOf(r.s.sport),due=r.payState==='pending'||r.payState==='sent',open=S.openPay===r.sid||(!S.openPay&&S.payJump&&due&&r===rows.find(x=>x.payState==='pending'||x.payState==='sent'));const row=`<div class="li act" style="grid-template-columns:auto minmax(0,1fr) auto">
      <div class="mini-dt"><small>${d.w}</small><b class="num">${d.d}</b><small>${d.m}</small></div>
      <div><div class="nm ic-row" style="gap:6px">${ic(sp.icon)}${esc(r.s.title||sp.club)}</div><div class="sub">${esc(r.status)}${r.games?` · ${r.games} game${r.games===1?'':'s'}`:''}${r.guests?` · +${r.guests} guest${r.guests>1?'s':''}`:''}${r.amount?` · ${ic(PAY[r.method].icon)} ${PAY[r.method].label}`:''}</div></div>
      <div style="display:grid;justify-items:end;gap:4px">${r.amount?`<b class="num">AED ${r.amount}</b>`:''}${badge(r.payState)}${due?`<span class="paygo">${r.payState==='sent'?'Details':'Pay'} ›</span>`:''}</div></div>`;
      return due?`<details class="payrow" data-payrow="${esc(r.sid)}" ${open?'open':''}><summary>${row}</summary><div class="paybody">${payFor&&payFor.sid===r.sid?payPicker(r.sid,true):payInfo(r.sid,r.s,r.x,r.amount)}</div></details>`:row}).join('')||`<div class="empty">${ic('play')}<span>No sessions yet. Your bookings, games and payments will show here.</span></div>`}</div>
    ${due.length?`<p class="fine">Cash is confirmed by an admin at the session. For bank transfer or Ziina, open the session above and tap I've paid after sending.</p>`:''}</div>`;
}
/* Home: a checked game shows its result or what's still needed; scores are added on the Courts screen */
function homeGameRow(gid,g){const sid=g.sid,t=typeof teamOf==='function'?teamOf(g,S.uid):null,st=typeof gState==='function'?gState(gid,g):g.st;
  const sc=g.final?(t==='b'?[g.final[1],g.final[0]]:g.final):null;
  const label={final:sc?(sc[0]>sc[1]?'Won':'Lost'):'Final',noscore:'Score needed',submitted:'Waiting for confirmation',ready:'Agreed · Support will finalise',disputed:'Support is checking',cancelled:'Cancelled · no result',played:'Played'}[st]||'';
  return `<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">${teamNames(sid,g.a)} <span class="muted">vs</span> ${teamNames(sid,g.b)}</div><div class="sub">${esc(g.court||'')}${label?' · '+esc(label):''}</div>${st==='noscore'||st==='submitted'?`<button class="linkbtn" data-goscore="${esc(sid)}">Open in Courts${ic('arrow')}</button>`:''}</div><b class="num big" style="font-size:1.5rem">${sc?sc[0]+'–'+sc[1]:'—'}</b></div>`}
function renderCard(){
  const el=$('v-card'),p=myProfile();
  if(!p){
    el.innerHTML=`<div class="grid2"><div class="mini">${cardHTML({nickname:'Your name',number:'',edition:'oncourt',sports:PLAYABLE},{balance:0,badges:0,sessions:0})}</div>
      <div class="hero"><span class="label">One card for every BADDIE</span><h2>Welcome to <span class="sr-only">BAD</span><img class="inline-logo logo-l" src="${LOGO.badK}" alt="" aria-hidden="true"><img class="inline-logo logo-d" src="${LOGO.badW}" alt="" aria-hidden="true">.</h2>
        <p class="muted">Please take a minute to register. It's how you join sessions, earn points and meet the community.</p>
        <div class="perks">
          <div>${ic('play')}<span><b>Join in one tap</b><small>Badminton, volleyball, pickleball and more</small></span></div>
          <div>${ic('coin')}<span><b>Earn points</b><small>${PS().per} points for every session. ${PS().free} points is a free session</small></span></div>
          <div>${ic('star')}<span><b>Collect BADges</b><small>A thank you from the founders and crew. Member, Core, then Legend</small></span></div>
        </div>
        <button class="btn wide" id="start">${ic('card')}Register here</button>
        <p class="fine">We were all BAD players once. Every level is welcome.</p>${S.loaded?'':'<p class="fine">Loading…</p>'}</div></div>`;
    $('start').onclick=()=>startCreator();return;
  }
  const st=statsFor(p.listKey),pt=pointsFor(S.uid),fd=isFounder(S.uid),req=S.requests[S.uid];
  const mine=myActivity(),nextS=upcoming().find(([sid])=>{const b=S.bookings[S.uid]?.s?.[sid];return b&&!b.out});
  const rk=rankRows('all'),ri=rk.findIndex(r=>r.pid===S.uid),me=ri>=0?rk[ri]:{g:0,w:0};
  const myGames=Object.entries(S.games).filter(([,g])=>[...g.a,...g.b].includes(S.uid)).sort((a,b)=>(b[1].at||'').localeCompare(a[1].at||''));
  const attended=Math.max(st.sessions,mine.filter(r=>r.status==='Played').length);
  const sports=(p.sports&&p.sports.length?p.sports:['badminton']);
  const statT=(lbl,val,sub,extra='')=>`<div class="tile hs"><span class="label">${lbl}</span><div class="stat"><b class="num">${val}</b>${sub?`<span class="fine">${sub}</span>`:''}</div>${extra}</div>`;
  const mySess=upcoming().filter(([sid])=>{const b=S.bookings[S.uid]?.s?.[sid];return b&&!b.out});
  let next;
  if(mySess.length)next=`<section class="hsec mysess"><div class="sec-h"><h3 class="ah">Your sessions</h3><button class="linkbtn" data-goview="play">Find more${ic('arrow')}</button></div><div class="slist">${mySess.map(([sid,x])=>sessCard(sid,x)).join('')}</div></section>`;
  else next=`<button class="tile nexts cta" data-goview="play"><span class="label">No session booked</span><span class="ic-row"><span class="ic-bub">${ic('play')}</span><span><b>Find your next game</b><span class="fine" style="display:block">${upcoming().length} sessions coming up</span></span>${ic('arrow')}</span></button>`;
  el.innerHTML=`<div class="home">
    <aside class="home-card"><div class="flip${S.flipped?' on':''}" id="my-card" role="button" tabindex="0" aria-label="Flip your card to see the invite QR code" aria-pressed="${!!S.flipped}"><div class="flip-in"><div class="face front">${cardHTML(p,st)}</div><div class="face back">${cardBackHTML(p,st)}</div></div></div><p class="fine fliphint">${S.flipped?'Tap to see the front':'Tap the card to flip it'}</p><div class="row" style="justify-content:center"><button class="btn sm" id="save-card">${ic('image')}${S.flipped?'Save back':'Save card'}</button><button class="btn ghost sm" id="edit">${ic('edit')}Edit my card</button></div></aside>
    <div class="home-main">
      <div class="hero" style="gap:4px"><span class="label">Hello, ${esc(p.nickname)} · ${esc(memLabel(S.uid))}</span><h2>${nextS?'See you on court.':'Ready to play?'}</h2></div>
      ${next}
      ${ptsTilesHTML(pt,fd,req)}
      <section class="hsec"><h3 class="ah">Your stats</h3>
        <div class="tiles hstats h3">
          ${statT('Sessions',attended,'Played with BAD')}
          ${statT('Games',myGames.length||me.g,me.g?`${me.w} won · ${Math.round(me.w/me.g*100)}%`:'Logged on court')}
          ${S.gAll?statT('Rank',ri>=0?'#'+(ri+1):'—',ri>=0?`of ${rk.length} players`:'Add scores to get ranked'):statT('Rank','—','See it on the Board',`<button class="linkbtn" data-rankgo="1">Open the Rank board${ic('arrow')}</button>`)}
        </div></section>
      ${(()=>{const m=memStatus(S.uid),tag={verified:`<span class="tagl solid">${ic('check')}Verified</span>`,pending:'<span class="tagl warn">Waiting for an admin</span>',declined:'<span class="tagl">Not confirmed</span>',open:''}[m.state];
        return `<section class="tile memb"><div class="row" style="justify-content:space-between"><span class="label">Membership</span>${tag}</div><div class="stat"><b>${esc(m.type)}</b><span class="fine">${m.state==='declined'?'We couldn’t confirm this one. Please speak to an admin.':m.state==='pending'?'We’ll confirm it soon. Thank you.':esc(memType(m.type)?.d||'')}</span></div>
          ${memType(m.type)?.staff?'':`<details><summary class="linkbtn">Change membership</summary><div class="row" style="margin-top:10px"><select id="mem-sel" style="flex:1;min-width:160px">${memPick().map(t=>`<option ${t.k===m.type?'selected':''}>${esc(t.k)}</option>`).join('')}</select><button class="btn sm" id="mem-go">Request</button></div></details>`}</section>`})()}
      <section class="hsec"><h3 class="ah">Your activities</h3>
        <div class="acts">${sports.map(k=>{const sp=SPORTS[k];if(!sp)return'';const lv=p.levels?.[k],ty=p.types?.[k];return `<div class="act"><span class="ic-bub soft">${ic(sp.icon)}</span><div><b>${esc(sp.club)}</b><div class="fine">${[k==='badminton'?gradeLabel(S.uid):(p.lv2&&p.lv2[k]!=null)?lvlName(k,p.lv2[k]):lv!=null&&lv!==''&&!LEVEL_FREE.includes(k)?LEVELS[lv]:'',ty].filter(Boolean).map(esc).join(' · ')||esc(sp.sport)}</div></div></div>`}).join('')}</div></section>
      ${activityHTML()}
      ${myGames.length?`<section class="hsec"><h3 class="ah">Recent games</h3><div class="list">${myGames.slice(0,5).map(([gid,g],i)=>g.v===2?homeGameRow(gid,g):gameRow(g.sid,gid,g,i,true)).join('')}</div></section>`:''}
      ${recentHTML(S.uid)}
      <section class="tile refer"><span class="label">Invite a friend</span>
        <div class="inv one"><div class="stat"><b class="num" id="my-ref">${esc(p.ref||refCode(S.uid,p))}</b><span class="fine">Flip your card to show your QR code, or share the link. Friends use your code when they register.</span>
          <div class="row" style="margin-top:6px"><button class="btn sm" id="share-inv">${ic('arrow')}Share invite</button><button class="btn ghost sm" id="copy-ref">${ic('copy')}Copy code</button></div></div></div></section>
      <details class="hsec how"><summary class="ah">How points and BADges work</summary>
        <div class="howgrid"><div><h4>${ic('coin')}Points</h4><p>Every session you join earns you ${PS().per} points, whatever you play. Collect ${PS().free} points and your next session is on us. Points reset if you go ${PS().expire} days without playing, so keep showing up.</p></div>
        <div><h4>${ic('star')}BADges</h4><p>BADges are our way of saying thank you. The founders and crew give them for loyalty and BAD spirit: helping run a session, bringing a friend, showing up week after week, trying a new sport with us. BADges never expire. The more you collect, the higher your level: ${PS().levels.slice(1).map(l=>esc(l.k)).join(', ').replace(/, ([^,]*)$/,', then $1')}.</p></div>
        <div><h4>${ic('badminton')}BAD levels</h4><p>${esc(LVL_NOTICE)} Levels go from F to A+, with a W or M rating, and are only used to make games fair.</p></div></div>
        <div class="list lvls">${PS().levels.map((l,i)=>`<div class="li" style="grid-template-columns:auto auto minmax(0,1fr)"><span class="lvimg">${badgeArt(i,{locked:!pt.top&&i>pt.levelIdx,label:l.k})}</span><span class="tagl${l.k===pt.level?' solid':''}">${esc(l.k)}${+l.at?' · '+l.at:''}</span><span class="fine">${esc(l.d||'')}</span></div>`).join('')}<div class="li" style="grid-template-columns:auto auto minmax(0,1fr)"><span class="lvimg">${badgeArt(9,{locked:!pt.top,label:topName()})}</span><span class="tagl${pt.top?' solid':''}">${esc(topName())}</span><span class="fine">${esc(PS().top.d||'Reserved for the founders of BAD. Every perk, always.')}</span></div></div></details>
    </div></div>`;
  bindPlay(el);
  el.querySelectorAll('[data-payrow]').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)S.openPay=d.dataset.payrow;else if(S.openPay===d.dataset.payrow)S.openPay=null}));
  el.querySelectorAll('[data-payall]').forEach(b=>b.onclick=()=>{S.payAll=!S.payAll;renderCard()});
  el.querySelectorAll('[data-pam]').forEach(b=>b.onclick=()=>{S.payAllM=b.dataset.pam;renderCard()});
  el.querySelectorAll('[data-askadm]').forEach(b=>b.onclick=()=>{S.askOpen=true;renderCard();setTimeout(()=>$('ask-note')?.focus(),50)});
  el.querySelectorAll('[data-askclose]').forEach(b=>b.onclick=()=>{S.askOpen=false;renderCard()});
  const an=$('ask-note');if(an)an.oninput=()=>S.askNote=an.value;
  el.querySelectorAll('[data-asksend]').forEach(b=>b.onclick=async()=>{const note=($('ask-note')?.value||'').trim(),ids=myActivity().filter(r=>r.payState==='pending'||r.payState==='sent').map(r=>r.sid),at=new Date().toISOString();
    try{for(const id of ids)await saveBooking(id,'pay',o=>o&&({...o,ask:{at,note}}));S.askOpen=false;S.askNote='';toast('Sent. An admin will check and confirm. Thank you.')}catch(e){toast("Sorry, that didn't send. Please try again.")}});
  el.querySelectorAll('[data-askcancel]').forEach(b=>b.onclick=async()=>{try{for(const [id,o] of Object.entries(S.bookings[S.uid]?.s||{}))if(o&&o.ask)await saveBooking(id,'pay',x=>{const y={...x};delete y.ask;return y});toast('Request cancelled.')}catch(e){toast("Sorry, that didn't save.")}});
  el.querySelectorAll('[data-clearmine]').forEach(b=>b.onclick=async()=>{const due=myActivity().filter(r=>r.payState==='pending'||r.payState==='sent'),at=new Date().toISOString();
    try{for(const r of due)await setPayment(S.uid,r.sid,{ok:true,waived:true,at,by:window.BAD_USER?.email||''});S.payAll=false;toast('Cleared. Nothing pending.')}catch(e){toast("Sorry, that didn't save.")}});
  el.querySelectorAll('[data-payalldone]').forEach(b=>b.onclick=async()=>{const k=b.dataset.payalldone,ids=myActivity().filter(r=>r.payState==='pending').map(r=>r.sid),at=new Date().toISOString();
    try{for(const id of ids)await saveBooking(id,'pay',o=>o&&({...o,pay:k,sent:at}));S.payAll=false;toast('Thank you. An admin will confirm your payments.')}catch(e){toast("Sorry, that didn't save.")}});
  el.querySelectorAll('[data-payjump]').forEach(b=>b.onclick=()=>{const d=el.querySelector('.payrow');if(!d)return;d.open=true;S.openPay=d.dataset.payrow;d.scrollIntoView({behavior:'smooth',block:'center'})});
  $('edit').onclick=()=>startCreator(p);el.querySelectorAll('[data-goview]').forEach(b=>b.onclick=()=>setView(b.dataset.goview));el.querySelectorAll('[data-goscore]').forEach(b=>b.onclick=()=>{const x=S.sessions[b.dataset.goscore];S.courtSport=(x&&x.sport)||'badminton';S.courtSid=b.dataset.goscore;S.asPlayer=true;setView('courts')});el.querySelectorAll('[data-rankgo]').forEach(b=>b.onclick=()=>{S.boardMode='rank';setView('board')});
  $('copy-ref').onclick=async()=>{const t=$('my-ref').textContent;try{await navigator.clipboard.writeText(t);toast('Code copied. Thank you for sharing BAD.')}catch(e){const g=document.createRange();g.selectNodeContents($('my-ref'));const x=getSelection();x.removeAllRanges();x.addRange(g);toast('Selected. Please copy it now.')}};
  const r=$('redeem');if(r)r.onclick=requestFree;
  el.querySelectorAll('[data-givebadge]').forEach(b=>b.onclick=()=>openBadge(b.dataset.givebadge||''));
  $('save-card').onclick=saveCardImage;
  {const fl=$('my-card');const flip=()=>{const on=!fl.classList.contains('on');S.flipped=on;fl.classList.toggle('on',on);fl.setAttribute('aria-pressed',on);fl.nextElementSibling.textContent=on?'Tap to see the front':'Tap the card to flip it';$('save-card').lastChild.textContent=on?'Save back':'Save card'};fl.onclick=flip;fl.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip()}}}
  $('share-inv').onclick=async()=>{const code=p.ref||refCode(S.uid,p),url=inviteUrl(code),text=`Join me at BAD. Use my code ${code} when you sign up.`;
    try{if(navigator.share){await navigator.share({title:'Join BAD',text,url});return}await navigator.clipboard.writeText(text+' '+url);toast('Invite link copied.')}catch(e){if(e.name!=='AbortError')toast('Please copy your code instead.')}};
  const mg=$('mem-go');if(mg)mg.onclick=async()=>{const k=$('mem-sel').value;try{await S.db.doc('profiles/'+S.uid).update({memReq:{type:k,at:new Date().toISOString()}});toast(memType(k)?.verify?'Thank you. An admin will confirm it.':'Membership updated.')}catch(e){toast("Sorry, that didn't save.")}};
}
/* save the player card as an image (share sheet on phones, download elsewhere) */
function loadScript(src){return new Promise((res,rej)=>{if([...document.scripts].some(x=>x.src===src))return res();const x=document.createElement('script');x.src=src;x.onload=res;x.onerror=rej;document.head.appendChild(x)})}
async function saveCardImage(){const fl=$('my-card'),b=$('save-card'),node=fl?.querySelector(fl.classList.contains('on')?'.face.back .pc':'.face.front .pc');if(!node)return;b.disabled=true;const t=b.innerHTML;b.textContent='Making your card…';
  try{if(!window.html2canvas)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const SC=3,cs=getComputedStyle(node),rad=(parseFloat(cs.borderTopLeftRadius)||18)*SC,bgc=cs.backgroundColor||'#000';
    /* 1) text and logos only: the photo and its fades are drawn below by hand, since the image tool can't draw CSS fades */
    const ph=node.querySelector('.ph'),nr=node.getBoundingClientRect(),pr=ph?ph.getBoundingClientRect():null;
    const url=ph?(getComputedStyle(ph).backgroundImage.match(/url\(["']?(.*?)["']?\)/)||[])[1]:'';const placeholder=ph&&ph.classList.contains('placeholder');
    node.classList.add('snap');fl.classList.add('snapping');let shot;try{shot=await html2canvas(node,{backgroundColor:null,scale:SC,useCORS:true,logging:false})}finally{node.classList.remove('snap');fl.classList.remove('snapping')}
    /* 2) compose: white frame, card colour, photo with fades, then the text layer */
    const bw=3*SC,W=shot.width,Hh=shot.height,cv=document.createElement('canvas');cv.width=W+bw*2;cv.height=Hh+bw*2;const x=cv.getContext('2d');
    const rr=(px,py,w,h,r)=>{x.beginPath();x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath()};
    rr(0,0,cv.width,cv.height,rad+bw);x.fillStyle='#FFFFFF';x.fill();
    x.save();rr(bw,bw,W,Hh,rad);x.clip();x.fillStyle=bgc;x.fillRect(bw,bw,W,Hh);
    if(pr&&url){try{const img=await loadImg(url);const px=Math.floor(bw+(pr.left-nr.left)*SC),py=Math.floor(bw+(pr.top-nr.top)*SC),pw=Math.ceil(pr.width*SC),phh=Math.round(pr.height*SC),k=Math.max(pw/img.width,phh/img.height),dw=img.width*k,dh=img.height*k;
      x.save();x.beginPath();x.rect(px,py,pw,phh);x.clip();x.globalAlpha=placeholder?.85:1;x.filter='grayscale(1) contrast(1.05)';x.drawImage(img,px+(pw-dw)/2,py+(phh-dh)/2,dw,dh);x.filter='none';x.globalAlpha=1;
      const m=bgc.match(/\d+(\.\d+)?/g)||[0,0,0],c=`${m[0]},${m[1]},${m[2]}`;
      let g=x.createLinearGradient(0,py,0,py+phh*.34);g.addColorStop(0,`rgba(${c},.85)`);g.addColorStop(1,`rgba(${c},0)`);x.fillStyle=g;x.fillRect(px,py,pw,phh*.34);
      g=x.createLinearGradient(0,py,0,py+phh);g.addColorStop(0,`rgba(${c},0)`);g.addColorStop(.35,`rgba(${c},0)`);g.addColorStop(.94,`rgba(${c},1)`);g.addColorStop(1,`rgba(${c},1)`);x.fillStyle=g;x.fillRect(px,py,pw,phh+1);x.restore();x.fillStyle=bgc;x.fillRect(px,py+phh-1,pw,3)}catch(_){}}
    x.drawImage(shot,bw,bw);x.restore();
    const blob=await new Promise(r=>cv.toBlob(r,'image/png'));const name=`BAD-card-${slug(myProfile()?.nickname||'player')}.png`,file=new File([blob],name,{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})&&/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)){try{await navigator.share({files:[file],title:'My BAD card'})}catch(e){if(e.name!=='AbortError')throw e}}
    else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);toast('Card saved.')}}
  catch(e){console.error(e);toast('Sorry, that didn’t work. You can take a screenshot instead.')}
  b.disabled=false;b.innerHTML=t}
async function requestFree(){const p=myProfile();if(!p||!S.db)return;
  try{await S.db.doc('requests/'+S.uid).set({player:p.listKey,at:new Date().toISOString(),type:'free-session'});toast('Thank you. An admin will confirm shortly.')}catch(e){toast("Sorry, that didn't send. Please ask an admin at the session.")}}

/* ---------- club feed ---------- */
/* ---------- Side Quests: collaborations and everything Off Court ----------
   Each quest is a session in a side department (Taste BADs for food and drink). People join, pay and drop out
   exactly like a session, and earn event points after it. Posts for those departments show here too. */
function renderQuests(){
  const el=$('v-quests');if(!el)return;const f=S.questFilter&&SIDE.includes(S.questFilter)?S.questFilter:'all',today=todayIso();
  const list=upcoming().filter(([,s])=>isSide(s.sport)&&(f==='all'||s.sport===f));
  const past=Object.entries(S.sessions).filter(([,s])=>isSide(s.sport)&&sessStart(s)<Date.now()-2*36e5&&(f==='all'||s.sport===f)).sort((a,b)=>sessStart(b[1])-sessStart(a[1])).slice(0,6);
  const posts=Object.entries(S.posts).filter(([,p])=>isSide(p.club)&&(f==='all'||p.club===f)&&(p.type!=='event'||(p.date||'')>=today)).sort((a,b)=>(b[1].postedAt||'').localeCompare(a[1].postedAt||''));
  el.innerHTML=`<div class="hero"><span class="label">Side Quests</span><h2>Off Court.</h2><p class="muted">Collabs, food, drinks and everything BAD that isn't a game. Join like a session and earn event points.</p></div>
    ${SIDE.length>1?sportBar(f,'qf',SIDE):`<div class="qdepts">${SIDE.map(k=>`<div class="qdept">${ic(SPORTS[k].icon)}<div><b>${esc(SPORTS[k].club)}</b><span class="fine">${esc(SPORTS[k].sport)}</span></div></div>`).join('')}</div>`}
    ${list.length?`<div class="slist">${list.map(([sid,s])=>sessCard(sid,s)).join('')}</div>`:`<div class="empty">${ic('quest')}<span>No side quests posted yet. The next collab drops here first.</span></div>`}
    ${posts.length?`<section class="hsec"><h3 class="ah">News from the collabs</h3><div class="list">${posts.map(([,p])=>`<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">${esc(p.title)}</div><div class="sub">${esc(SPORTS[p.club]?.club||'')}${p.date?' · '+esc(fmtD(p.date)):''}${p.place?' · '+esc(p.place):''}</div>${p.body?`<p class="fine" style="margin:4px 0 0">${esc(p.body)}</p>`:''}</div>${p.link?`<a class="btn ghost sm" href="${esc(p.link)}" target="_blank" rel="noopener">Open${ic('arrow')}</a>`:''}</div>`).join('')}</div></section>`:''}
    ${past.length?`<details class="hsec how"><summary class="ah">Past quests</summary><div class="list">${past.map(([,s])=>`<div class="li" style="grid-template-columns:auto minmax(0,1fr)">${ic(sportOf(s.sport).icon)}<div><div class="nm">${esc(s.title)}</div><div class="sub">${esc(fmtS(s))}${s.venue?' · '+esc(s.venue):''}</div></div></div>`).join('')}</div></details>`:''}`;
  el.querySelectorAll('[data-qf]').forEach(b=>b.onclick=()=>{S.questFilter=b.dataset.qf;renderQuests()});
  bindPlay(el);
}
/* ---------- Gallery: an album per event, with photos and a link to the full set ---------- */
function galleryHTML(f){const A=Object.entries(S.gallery||{}).filter(([,a])=>f==='all'||a.club===f||a.club==='all').sort((a,b)=>String(b[1].date||'').localeCompare(String(a[1].date||'')));
  if(!A.length)return `<div class="empty">${ic('photo')}<span>No albums yet. Photos from the next event land here.</span></div>`;
  const open=S.album&&S.gallery[S.album];
  return `<div class="galgrid">${A.map(([id,a])=>`<button class="album" data-album="${esc(id)}"><div class="acover" style="background-image:url('${esc((a.photos||[])[0]||'')}')">${(a.photos||[]).length?'':ic('photo')}<span class="acount num">${(a.photos||[]).length}</span></div><div class="ameta"><span class="fine">${esc(SPORTS[a.club]?.club||'All of BAD')}${a.date?' · '+esc(fmtD(a.date)):''}</span><b>${esc(a.title)}</b></div></button>`).join('')}</div>
  ${open?`<div class="sheet-ov" data-albclose="1"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(open.title)}"><button class="sheet-x" data-albclose="1" aria-label="Close">${ic('x')}</button><div class="sheet-in" style="padding:20px;display:grid;gap:12px">
    <div><span class="label">${esc(SPORTS[open.club]?.club||'All of BAD')}${open.date?' · '+esc(fmtD(open.date)):''}</span><h2 style="margin:4px 0 0">${esc(open.title)}</h2></div>
    <div class="photos">${(open.photos||[]).map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener" class="ph1" style="background-image:url('${esc(u)}')" aria-label="Photo ${i+1}"></a>`).join('')}</div>
    ${open.link?`<a class="btn wide" href="${esc(open.link)}" target="_blank" rel="noopener">${ic('photo')}See all the photos${ic('arrow')}</a>`:''}</div></div></div>`:''}`}
function bindGallery(el){el.querySelectorAll('[data-album]').forEach(b=>b.onclick=()=>{S.album=b.dataset.album;renderClub()});
  el.querySelectorAll('[data-albclose]').forEach(b=>b.onclick=ev=>{if(ev.target.closest('.sheet')&&!ev.target.closest('.sheet-x'))return;S.album=null;renderClub()})}

/* ---------- Guide: what the app is for and how to use it ---------- */
function renderGuide(){const el=$('v-guide');if(!el)return;const c=PS(),me=S.uid,pt=me?pointsFor(me):null;
  const tabs=[['card','Home','Your player card, your sessions, points and BADges.'],['play','Play','Find a session and join it in one tap. Drop out or bring a friend from Home.'],['courts','Courts','On the day: check in, see your court and who’s next.'],['club','Club','News, events and the Gallery.'],['quests','Quests','Side Quests: collabs and everything Off Court.'],['board','Board','Points and rankings. Players first.'],['shop','Shop','Drops and Essentials, picked up at sessions.']];
  const steps=[['card','Make your card','Your name, number, photo and the sports you play. It takes a minute.'],['play','Join a session','Pick one in Play and tap “Count me in”. Choose how you’ll pay.'],['check','Check in when you arrive','Scan the QR code at the venue, or ask an admin. Games go in order of arrival.'],['court','Play','Courts shows your court, who’s next and when you’re up. The rotation keeps games fair for everyone.'],['star','Log your score','After a game, one player enters the score and someone from the other team confirms.'],['coin','Collect points and BADges','Every session earns points. BADges come from the founders and crew.']];
  el.innerHTML=`<div class="hero"><span class="label">Guide</span><h2>How BAD works.</h2><p class="muted">The BAD App is your club card, your sign-ups and your rewards in one place. Here’s everything you need, in order.</p></div>
  <section class="hsec"><h3 class="ah">Getting started</h3><ol class="gsteps">${steps.map(([i,t,d],n)=>`<li><span class="gn num">${n+1}</span><span class="ic-bub soft">${ic(i)}</span><div><b>${t}</b><span class="fine">${d}</span></div></li>`).join('')}</ol></section>
  <section class="hsec"><h3 class="ah">Points</h3><div class="gcard">${ic('coin')}<div><p><b>${c.per} points</b> for every session you play, whatever the sport. At <b>${c.free} points</b> your next session is free.</p><p class="fine">Points reset if you go ${c.expire} days without playing. A no-show or late cancellation costs points.</p>${pt&&pt.started?`<p class="fine">You have <b class="num">${isFounder(me)?'∞':pt.balance}</b> points.</p>`:''}</div></div></section>
  <section class="hsec"><h3 class="ah">BADges and levels</h3><p class="fine">BADges are a thank you from the founders and crew, for helping out, bringing friends and showing up. They never expire. More BADges, higher level, better perks.</p>
    <div class="list lvls">${c.levels.map((l,i)=>`<div class="li" style="grid-template-columns:auto minmax(0,1fr)"><span class="lvimg">${badgeArt(i,{label:l.k})}</span><div><div class="nm">${esc(l.k)}${+l.at?` <span class="fine">· ${l.at} BADges</span>`:''}</div><div class="sub">${esc(l.d||'')}</div></div></div>`).join('')}<div class="li" style="grid-template-columns:auto minmax(0,1fr)"><span class="lvimg">${badgeArt(9,{label:topName()})}</span><div><div class="nm">${esc(topName())} <span class="fine">· Founders</span></div><div class="sub">${esc(c.top.d||'')}</div></div></div></div>
    <div class="gcard f100c"><b class="f100">FIRST 100</b><div><p>The first 100 people to make a card start <b>one level up</b>, get a First 100 mark on their card and wear a number from 0 to 99.${first100Left()?` <b class="num">${first100Left()}</b> spots left.`:' All 100 spots are taken: new numbers are 100 to 999.'}</p><p class="fine">Every jersey number belongs to one player, first come first served.</p></div></div></section>
  <section class="hsec"><h3 class="ah">BAD levels</h3><div class="gcard">${ic('badminton')}<div><p><b>${esc(LVL_NOTICE)}</b></p><p class="fine">Levels run from F to A+, with a W or M rating. They only exist to make games fair.</p></div></div></section>
  <section class="hsec"><h3 class="ah">Joining and dropping out</h3><div class="gcard">${ic('clock')}<div><p>Drop out for free up to 48 hours before. From 48 to 24 hours, half the fee applies. Under 24 hours, the full fee.</p><p class="fine">Pay by cash, bank transfer, Ziina or Careem Pay. Your payment status is on Home.</p></div></div></section>
  <section class="hsec"><h3 class="ah">The departments</h3><div class="depts">${Object.keys(SPORTS).map(deptCard).join('')}</div></section>
  <section class="hsec"><h3 class="ah">The tabs</h3><div class="list">${tabs.map(([i,t,d])=>`<div class="li" style="grid-template-columns:auto minmax(0,1fr)"><span class="ic-bub soft">${ic(NAV[i==='card'?'card':i]?NAV[i][0]:i)}</span><div><div class="nm">${t}</div><div class="sub">${d}</div></div></div>`).join('')}</div></section>`;
}
function renderClub(){
  const el=$('v-club'),today=new Date().toISOString().slice(0,10),f=S.clubFilter;
  const ps=Object.entries(S.posts).filter(([,p])=>f==='all'||(p.club||'all')===f||p.club==='all');
  const events=ps.filter(([,p])=>p.type==='event'&&(p.date||'')>=today).sort((a,b)=>a[1].date.localeCompare(b[1].date));
  const news=ps.filter(([,p])=>p.type!=='event').sort((a,b)=>(b[1].postedAt||'').localeCompare(a[1].postedAt||''));
  const card=([id,p])=>{const d=p.date?dParts(p.date):null,sp=SPORTS[p.club];return `<article class="post"><div class="sess" style="padding:0;background:none;display:block"><div class="dt" style="background:var(--bg)">${d?`<small>${d.w}</small><b class="num">${d.d}</b><small>${d.m}</small>`:`<span style="padding:10px 0">${ic('club')}</span>`}</div></div><div style="display:grid;gap:8px;min-width:0">
    <span class="ic-row label">${sp?ic(sp.icon)+esc(sp.club):ic('users')+'All of BAD'}</span><h3>${esc(p.title)}</h3>
    ${p.type==='event'?`<div class="meta">${p.time?`<span>${ic('clock')}${esc(p.time)}</span>`:''}${p.place?`<span>${ic('pin')}${esc(p.place)}</span>`:''}</div>`:''}<p>${esc(p.body||'')}</p>
    <div class="row" style="gap:8px">${(()=>{const u=p.link||S.site?.url;return u?`<a class="btn sm" href="${esc(u)}" target="_blank" rel="noopener">${esc(p.link?(p.linkLabel&&p.linkLabel!=='Directions'?p.linkLabel:'Find out more'):'Visit the BAD site')}${ic('arrow')}</a>`:''})()}${p.mapLink?`<a class="btn ghost sm" href="${esc(p.mapLink)}" target="_blank" rel="noopener">${ic('pin')}Directions</a>`:''}</div></div></article>`};
  const mode=S.clubMode==='gallery'?'gallery':'news',modes=`<div class="chips seg" role="group" aria-label="Club"><button class="chip" data-cm="news" aria-pressed="${mode==='news'}">${ic('club')}What's on</button><button class="chip" data-cm="gallery" aria-pressed="${mode==='gallery'}">${ic('photo')}Gallery</button></div>`;
  if(mode==='gallery'){el.innerHTML=`<div class="hero"><span class="label">Club</span><h2>Gallery.</h2><p class="muted">Photos from every BAD event.</p></div>${modes}${sportBar(f,'cf',Object.keys(SPORTS))}${galleryHTML(f)}`;
    el.querySelectorAll('[data-cf]').forEach(b=>b.onclick=()=>{S.clubFilter=b.dataset.cf;renderClub()});el.querySelectorAll('[data-cm]').forEach(b=>b.onclick=()=>{S.clubMode=b.dataset.cm;renderClub()});bindGallery(el);return}
  el.innerHTML=`<div class="hero"><span class="label">Club</span><h2>What's on at BAD.</h2></div>${modes}${sportBar(f,'cf',Object.keys(SPORTS))}${f!=='all'?deptCard(f):''}
    <div class="view" style="gap:12px">${events.map(card).join('')}${news.map(card).join('')}${!events.length&&!news.length?`<div class="empty">${ic('club')}<span>Nothing posted here yet. Please check back soon.</span></div>`:''}</div>`;
  el.querySelectorAll('[data-cf]').forEach(b=>b.onclick=()=>{S.clubFilter=b.dataset.cf;renderClub()});el.querySelectorAll('[data-cm]').forEach(b=>b.onclick=()=>{S.clubMode=b.dataset.cm;renderClub()});
}


/* light / dark toggle, remembered on this device */
(function(){const b=$('theme');if(!b)return;const set=t=>{if(t==='light')document.documentElement.setAttribute('data-theme','light');else document.documentElement.removeAttribute('data-theme');b.setAttribute('aria-label',t==='light'?'Switch to dark theme':'Switch to light theme');try{localStorage.setItem('badTheme',t)}catch(_){}};
  b.onclick=()=>set(document.documentElement.getAttribute('data-theme')==='light'?'dark':'light');set(document.documentElement.getAttribute('data-theme')==='light'?'light':'dark')})();
