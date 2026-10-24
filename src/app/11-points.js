/* ---------- Points and BADges ----------
   The numbers live on the "Points Settings" tab of BAD APP – Master. The Apps Script copies them into
   config/points every 15 minutes, together with each player's row from "Points Balance" (config/sheetPoints).
   New BADges and points entries given in the app show straight away and are added to the sheet on the next sync. */
const PTS_FALLBACK={per:5,free:100,expire:90,launch:'',other:{'Event or tournament':10,'BAD Retreat':20,'No-show':-4,'Free session redeemed':-100,'Adjustment':0},
  levels:[{k:'Rookie',at:0,d:'Player card, earn points, join any session'},{k:'Member',at:3,d:'Silver Member card, sign-ups open to you 24 hours early'},{k:'Core',at:10,d:'Skip the waitlist when a session is full, 5% off merch, a vote on new sessions and events'},{k:'Legend',at:25,d:'Black Legend card, 10% off merch, first pick of limited merch drops, invites to members-only events, first spots for BAD Retreat'}],
  top:{k:'',d:'Reserved for the founders of BAD. Every perk, always.'},
  reasons:[{k:'Crew help',n:'1',eg:'Set up courts, ran the queue, took photos, packed up'},{k:'Brought a new player',n:'1',eg:'Their friend joined and played a paid session'},{k:'4 weeks in a row',n:'1',eg:'Never missed their session for a month'},{k:'Completed their player card',n:'1',eg:'Photo, number and sports all filled in'},{k:'Tried a new department',n:'1',eg:'First time at VolleyBAD, BADDINK, Runaways or another department'},{k:'Above and beyond',n:'1 to 5',eg:'Anything that shows the BAD spirit'}]};
const LEDGER_TYPES=['Event or tournament','BAD Retreat','No-show','Free session redeemed','Adjustment'];
function PS(){const c=S.ptsCfg||{};return{...PTS_FALLBACK,...c,other:{...PTS_FALLBACK.other,...(c.other||{})},levels:(c.levels&&c.levels.length?c.levels:PTS_FALLBACK.levels),top:{...PTS_FALLBACK.top,...(c.top||{})},reasons:(c.reasons&&c.reasons.length?c.reasons:PTS_FALLBACK.reasons)}}
/* the top level's name is still being chosen; never show it as "Founder" (that's a membership role) */
const topName=()=>{const n=String(PS().top.k||'').trim();return n&&n.toLowerCase()!=='founder'?n:'Top level'};
const normName=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
const trackerName=uid=>{const p=S.profiles[uid]||{};return (p.listName||'').trim()};
const uidByTracker=name=>{const n=normName(name);return Object.keys(S.profiles).find(u=>normName(trackerName(u))===n)};
function sheetRow(uid){const n=normName(trackerName(uid));if(!n)return null;const P=(S.sheetPts&&S.sheetPts.players)||{};return P[n]||null}
const isV2=e=>e&&e.v===2;
const myEntries=uid=>(S.ledger||[]).filter(e=>isV2(e)&&e.uid===uid);
const myBadges=uid=>Object.entries(S.badges||{}).map(([id,b])=>({...b,_id:id})).filter(b=>b.uid===uid);
const staffTypes=['Founder','Crew','Community Manager'];
/* founders and crew (membership level Founder, Crew or Community Manager) can give BADges */
const canGiveBadge=()=>{if(!S.uid)return false;const m=memStatus(S.uid);return m.state==='verified'&&staffTypes.includes(m.type)};
const addDays=(iso,d)=>{const t=new Date(String(iso).slice(0,10)+'T12:00:00');t.setDate(t.getDate()+d);return t.toISOString().slice(0,10)};
const todayIso=()=>new Date(Date.now()+4*36e5).toISOString().slice(0,10);
/* everything a player sees about their points and BADges */
function pointsFor(uid){const c=PS(),row=sheetRow(uid)||{},launch=c.launch||'',started=!!launch&&todayIso()>=launch;
  const fresh=myEntries(uid).filter(e=>!e.synced&&(!launch||(e.date||'')>=launch)),freshPts=fresh.reduce((t,e)=>t+(Number(e.pts)||0),0);
  let last=[row.last,...fresh.map(e=>e.date)].filter(Boolean).sort().pop()||'';
  let balance=started?Math.max(0,(Number(row.balance)||0)+freshPts):0;
  const playBy=started&&last&&balance>0?addDays(last,c.expire):'';
  const bdg=badgeCount(uid);
  const lv=levelFor(uid,bdg),appUnpaid=typeof pendingFor==='function'?pendingFor(uid).filter(r=>sessStart(S.sessions[r.sid])<Date.now()).reduce((t,r)=>t+r.amount,0):0,sheetUnpaid=Number(row.unpaid)||0;
  return{balance,started,launch,last,playBy,free:c.free,per:c.per,canRedeem:started&&balance>=c.free,sessions:Number(row.sessions)||0,
    badges:bdg,level:lv.k,levelIdx:lv.i,next:lv.next,toNext:lv.next?lv.next.at-bdg:0,top:lv.top,unpaid:appUnpaid+sheetUnpaid,appUnpaid,sheetUnpaid}}
function levelFor(uid,n){const L=PS().levels;if(uid&&isFounder(uid))return{k:topName(),i:L.length,top:true,next:null};let i=0;L.forEach((l,j)=>{if(n>=(Number(l.at)||0))i=j});return{k:L[i].k,i,top:false,next:L[i+1]||null}}
function badgeCount(uid){const row=sheetRow(uid)||{};return (Number(row.badges)||0)+myBadges(uid).filter(b=>!b.synced).reduce((t,b)=>t+(Number(b.n)||1),0)}
const levelIdx=uid=>uid?levelFor(uid,badgeCount(uid)).i:0;
/* perks, by level index: 1 Member, 2 Core, 3 Legend, 4 top */
const perk={early:uid=>levelIdx(uid)>=1,skipWait:uid=>levelIdx(uid)>=2,merchOff:uid=>{const i=levelIdx(uid);return i>=3?10:i>=2?5:0},firstPick:uid=>levelIdx(uid)>=3};
/* card colour follows the BADge level: silver for Member and Core, black Legend card from Legend up */
const cardEdition=(p,uid)=>{const i=uid?levelIdx(uid):0;return i>=3?'legend':i>=1?'member':(p.edition||'oncourt')};
const cardEdLabel=(p,uid)=>{const i=uid?levelIdx(uid):0;return i>=4?topName():i>=3?'Legend':i>=1?PS().levels[Math.min(i,PS().levels.length-1)].k:((EDITIONS.find(e=>e[0]===(p.edition||'oncourt'))||EDITIONS[0])[1])};

/* old name kept so every screen keeps working */
function statsFor(k){const pr=profileByKey(k),uid=pr&&pr[0];if(!uid)return{earned:0,balance:0,sessions:0,badges:0,entries:[]};const x=pointsFor(uid);return{...x,earned:x.balance,entries:myEntries(uid)}}

/* ---------- give a BADge ---------- */
let BG={open:false,uid:'',n:1,reason:'',custom:'',q:''};
function badgeSheet(){const c=PS(),ps=Object.entries(S.profiles).filter(([u,p])=>!p.sample&&u!==S.uid).sort((a,b)=>(a[1].nickname||'').localeCompare(b[1].nickname||'')),sel=BG.uid&&S.profiles[BG.uid];
  const isAb=/above and beyond/i.test(BG.reason),max=isAb||BG.reason==='__custom'?5:1;if(BG.n>max)BG.n=max;
  return `<div class="sheet-ov" data-bgclose="1"><div class="sheet" role="dialog" aria-modal="true" aria-label="Give a BADge"><button class="sheet-x" data-bgclose="1" aria-label="Close">${ic('x')}</button>
    <div class="sheet-in" style="padding:20px;display:grid;gap:16px"><div><span class="label">Founders and crew</span><h2 style="margin:4px 0 0">Give a BADge</h2><p class="fine" style="margin:6px 0 0">BADges say thank you for loyalty and BAD spirit. They never expire.</p></div>
    <div class="field" style="margin:0"><span class="lbl">Who for?</span>${sel?`<div class="li" style="grid-template-columns:auto minmax(0,1fr) auto">${avatar(sel,sel.listKey)}<div><div class="nm">${esc(sel.nickname||'')}</div><div class="sub">${trackerName(BG.uid)?esc(trackerName(BG.uid))+' on the tracker':'<span class="warn-t">No name on tracker yet. An admin can add it.</span>'}</div></div><button class="chip sm" data-bgpick="">Change</button></div>`
      :`<input type="search" id="bg-q" placeholder="Search a player" value="${esc(BG.q)}" aria-label="Search a player"><div class="list bgpick">${ps.filter(([,p])=>!BG.q||(p.nickname+' '+(p.listName||'')).toLowerCase().includes(BG.q.toLowerCase())).slice(0,8).map(([u,p])=>`<button type="button" class="li" data-bgpick="${esc(u)}" style="grid-template-columns:auto minmax(0,1fr) auto;text-align:left">${avatar(p,p.listKey)}<span class="nm">${esc(p.nickname||'')}</span><span class="fine">${pointsFor(u).badges} BADges</span></button>`).join('')||'<p class="hint">No one found.</p>'}</div>`}</div>
    <div class="field" style="margin:0"><span class="lbl">Why?</span><div class="chips">${c.reasons.map(r=>`<button type="button" class="chip" data-bgr="${esc(r.k)}" aria-pressed="${BG.reason===r.k}" title="${esc(r.eg||'')}">${esc(r.k)}</button>`).join('')}<button type="button" class="chip" data-bgr="__custom" aria-pressed="${BG.reason==='__custom'}">${ic('edit')}Something else</button></div>
      ${BG.reason==='__custom'?`<input id="bg-custom" maxlength="80" placeholder="Type the reason" value="${esc(BG.custom)}" style="margin-top:8px">`:BG.reason?`<p class="fine" style="margin:8px 0 0">${esc((c.reasons.find(r=>r.k===BG.reason)||{}).eg||'')}</p>`:''}</div>
    ${max>1?`<div class="field" style="margin:0"><span class="lbl">How many?</span><div class="chips">${[1,2,3,4,5].map(n=>`<button type="button" class="chip" data-bgn="${n}" aria-pressed="${BG.n===n}">${n}</button>`).join('')}</div></div>`:''}
    <button class="btn wide" data-bggive="1" ${sel&&BG.reason&&(BG.reason!=='__custom'||BG.custom.trim())?'':'disabled'}>${ic('star')}Give ${BG.n} BADge${BG.n>1?'s':''}${sel?' to '+esc(sel.nickname||''):''}</button></div></div></div>`}
function openBadge(uid){BG={open:true,uid:uid||'',n:1,reason:'',custom:'',q:''};drawBadge()}
function drawBadge(){let h=$('bg-host');if(!h){h=document.createElement('div');h.id='bg-host';document.body.appendChild(h)}
  if(!BG.open){h.innerHTML='';document.documentElement.classList.remove('sheet-open');return}
  const f=document.activeElement&&document.activeElement.id;h.innerHTML=badgeSheet();document.documentElement.classList.add('sheet-open');
  if(f&&$(f)){const e=$(f);e.focus();try{e.setSelectionRange(e.value.length,e.value.length)}catch(_){}}
  h.onclick=async ev=>{const t=ev.target.closest('[data-bgclose],[data-bgpick],[data-bgr],[data-bgn],[data-bggive]');if(!t)return;
    if(t.dataset.bgclose!==undefined){if(ev.target.closest('.sheet')&&!ev.target.closest('.sheet-x'))return;BG.open=false;drawBadge();return}
    if(t.dataset.bgpick!==undefined){BG.uid=t.dataset.bgpick;drawBadge();return}
    if(t.dataset.bgr!==undefined){BG.reason=t.dataset.bgr;if(!/above and beyond/i.test(BG.reason)&&BG.reason!=='__custom')BG.n=1;drawBadge();if(BG.reason==='__custom')setTimeout(()=>$('bg-custom')?.focus(),30);return}
    if(t.dataset.bgn!==undefined){BG.n=+t.dataset.bgn;drawBadge();return}
    if(t.dataset.bggive!==undefined)giveBadge()};
  const q=$('bg-q');if(q)q.oninput=()=>{BG.q=q.value;drawBadge()};
  const cu=$('bg-custom');if(cu)cu.oninput=()=>{BG.custom=cu.value;const b=h.querySelector('[data-bggive]');if(b)b.disabled=!cu.value.trim()}}
async function giveBadge(){const p=S.profiles[BG.uid];if(!p||!S.db)return;const reason=BG.reason==='__custom'?BG.custom.trim():BG.reason;if(!reason)return;
  const me=myProfile()||{},d={date:todayIso(),uid:BG.uid,player:trackerName(BG.uid)||p.nickname||'',name:p.nickname||'',n:BG.n,reason,by:(me.listName||me.nickname||window.BAD_USER?.name||'').trim(),byEmail:window.BAD_USER?.email||'',byUid:S.uid,at:new Date().toISOString(),synced:false};
  try{await S.db.collection('badges').add(d);toast(`${BG.n} BADge${BG.n>1?'s':''} for ${p.nickname}. Thank you.`);BG.open=false;drawBadge()}catch(e){console.warn(e);toast("Sorry, that didn't save. Please publish the latest rules and try again.")}}

/* ---------- points entries: events, retreats, no-shows, free sessions, adjustments ---------- */
async function addLedger(id,o){const c=PS(),pts=o.pts!=null&&o.pts!==''?Number(o.pts):(c.other[o.type]||0);
  const d={v:2,date:o.date||todayIso(),uid:o.uid,player:trackerName(o.uid)||(S.profiles[o.uid]||{}).nickname||'',name:(S.profiles[o.uid]||{}).nickname||'',dept:o.dept||'',type:o.type,pts,reason:o.reason||o.type,by:(myProfile()?.listName||myProfile()?.nickname||window.BAD_USER?.email||'').trim(),at:new Date().toISOString(),synced:false,...(o.sid?{sid:o.sid}:{})};
  return id?S.db.doc('ledger/'+id).set(d):S.db.collection('ledger').add(d)}
/* run by an admin's app: no-shows, late cancellations and paid retreats become points entries, once each */
async function autoPoints(){if(!S.canEdit||!S.db||S._autoPts)return;const c=PS();if(!c.launch)return;S._autoPts=true;
  try{const have=new Set((S.ledger||[]).map(e=>e._id)),now=Date.now(),put=async(id,o)=>{if(have.has(id))return;have.add(id);try{await addLedger(id,o)}catch(_){}};
    for(const [sid,s] of Object.entries(S.sessions)){if(!s.date||s.date<c.launch||!canSport(s.sport))continue;const dept=sportOf(s.sport).club,t=`${s.title||dept} · ${fmtD(s.date)}`;
      for(const e of roster(sid).late)if(!e.guest)await put(`late-${sid}-${e.uid}`,{uid:e.uid,type:'No-show',dept,date:s.date,sid,reason:'Late cancellation: '+t});
      if(s.sport==='retreat'&&sessStart(s)<now)for(const [uid,P] of Object.entries(S.payments[sid]||{}))if(P&&P.ok&&!P.waived)await put(`ret-${sid}-${uid}`,{uid,type:'BAD Retreat',dept,date:s.date,sid,reason:t})}
    for(const n of Object.values(S.noshows||{})){const pr=profileByKey(n.player);if(!pr)continue;
      for(const d of (n.dates||[])){if(d.includes('#'))continue;const s=S.sessions[d];if(!s||!s.date||s.date<c.launch)continue;await put(`ns-${d}-${pr[0]}`,{uid:pr[0],type:'No-show',dept:sportOf(s.sport).club,date:s.date,sid:d,reason:`No-show: ${s.title||sportOf(s.sport).club} · ${fmtD(s.date)}`})}}
  }finally{S._autoPts=false}}
