/* ---------- Courts: live board for badminton, volleyball, pickleball, basketball ---------- */
/* Admins place every player. Flow: Bench (fewest games first) → Waiting courts → Courts → Game done → back to Bench. */
const COURT_SPORTS=['badminton','volleyball','pickleball','basketball'];
/* running (BAD PACE) and dance (BAD HABITS) get a check-in board without courts */
const BOARD_SPORTS=[...COURT_SPORTS,'run','dance'];
/* queueOff(sport): the court queue (rotation, matching, games and scores) is switched off while it is rebuilt from scratch.
   Every department uses the Check-in & Pay sheet: who came, who paid, and ending the session. Set to false to bring the queue back. */
/* badminton keeps the full 4-step process (Set up, Check in, Games, Scores); other departments use Check-in & Pay and the manual board */
const queueOff=sp=>(sp||'badminton')!=='badminton';
const isAttend=sp=>queueOff(sp)||!COURT_SPORTS.includes(sp||'badminton');
const SIZES={badminton:[[4,'Doubles'],[2,'Singles']],pickleball:[[4,'Doubles'],[2,'Singles']],volleyball:[[12,'6 v 6'],[10,'5 v 5'],[8,'4 v 4']],basketball:[[10,'5 v 5'],[8,'4 v 4'],[6,'3 v 3']]};
const DEF_COURTS={badminton:2,pickleball:2,volleyball:1,basketball:1};
const MIDLINE={basketball:'HALF COURT'};
const mk=d=>`<svg class="mark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" vector-effect="non-scaling-stroke">${d}</g></svg>`;
const MARK={ /* horizontal courts, net at x=50, drawn to each sport's real proportions */
 badminton:mk('<path d="M0 7.5H100M0 92.5H100M35.2 0V100M64.8 0V100M5.7 0V100M94.3 0V100M0 50H35.2M64.8 50H100" vector-effect="non-scaling-stroke"/>'),
 pickleball:mk('<path d="M34.1 0V100M65.9 0V100M0 50H34.1M65.9 50H100" vector-effect="non-scaling-stroke"/>'),
 volleyball:mk('<path d="M33.3 0V100M66.7 0V100" vector-effect="non-scaling-stroke"/>'),
 basketball:mk('<ellipse cx="50" cy="50" rx="6.5" ry="12" vector-effect="non-scaling-stroke"/><path d="M0 37H20.7V63H0M100 37H79.3V63H100M0 6H10A26 44 0 0 1 10 94H0M100 6H90A26 44 0 0 0 90 94H100" vector-effect="non-scaling-stroke"/>')
};
S.live={};S.games={};S.scores={};S.courtSid=null;let sel=null;

/* ---------- lean court data ----------
   Only tonight's sessions are followed live (board, games, scores), and only while the app is open on screen.
   Your own older games load once; everyone's history loads only when the Rank board is opened. */
S.gSess={};S.gMine={};S.gAll=null;S.subs={};S.pend=0;S.saveErr=null;
const mergeGames=()=>{S.games={...(S.gAll||{}),...S.gMine,...S.gSess}};
/* sessions whose court data we follow live: the same ones the Courts tab can open (crew: from 18 h ago to 7 days ahead;
   players: around today), plus whichever session is open on screen */
function activeSids(){const now=Date.now(),crew=S.canEdit||Object.keys(S.sessions||{}).some(id=>isGM(id));
  const ids=Object.entries(S.sessions||{}).filter(([,s])=>!s.cancelled&&BOARD_SPORTS.includes(s.sport||'badminton')&&sessStart(s)>now-18*36e5&&sessStart(s)<now+(crew?7*864e5:12*36e5))
    .sort((a,b)=>sessStart(a[1])-sessStart(b[1])).map(([id])=>id);
  if(S.courtSid&&S.sessions[S.courtSid]&&!ids.includes(S.courtSid))ids.unshift(S.courtSid);
  return ids.slice(0,30)}
const chunks=(a,n)=>{const o=[];for(let i=0;i<a.length;i+=n)o.push(a.slice(i,i+n));return o};
function courtSubs(){
  const d=S.sessData;if(!d||!S.member)return;
  const want=document.hidden?[]:activeSids(),key=want.join(',')||'-';
  if(S.subs.key===key)return;
  (S.subs.off||[]).forEach(f=>{try{f()}catch(_){}});S.subs={key,off:[]};
  for(const k of Object.keys(S.live))if(!want.includes(k))delete S.live[k];
  if(!want.length){S.gSess={};mergeGames();return}
  for(const sid of want)S.subs.off.push(d.db.doc('live/'+sid).onSnapshot(x=>{if(x.exists)S.live[sid]=x.data();else delete S.live[sid];render()},()=>{}));
  const part={games:{},results:{},awards:{},runs:{}},put=(k,i,m)=>{part[k][i]=m;return Object.assign({},...Object.values(part[k]))};
  chunks(want,10).forEach((ids,i)=>{
    S.subs.off.push(d.db.collection('games').where('sid','in',ids).onSnapshot(s=>{S.gSess=put('games',i,d.map(s));mergeGames();render()},()=>{}));
    S.subs.off.push(d.db.collection('results').where('sid','in',ids).onSnapshot(s=>{S.results=put('results',i,d.map(s));render()},()=>{}));
    S.subs.off.push(d.db.collection('awards').where('sid','in',ids).onSnapshot(s=>{S.awards=put('awards',i,d.map(s));render()},()=>{}));
    S.subs.off.push(d.db.collection('runs').where('sid','in',ids).onSnapshot(s=>{S.runs=put('runs',i,d.map(s));render()},()=>{}))});
  if(S.canEdit||want.some(x=>isGM(x)))S.subs.off.push(d.db.collection('scores').onSnapshot(s=>{S.scores=d.map(s);render()},()=>{}));
}
async function myGamesLoad(){const d=S.sessData;if(!d||!S.uid)return;
  try{const r=await Promise.all(['a','b'].map(t=>d.db.collection('games').where(t,'array-contains',S.uid).get()));S.gMine={...d.map(r[0]),...d.map(r[1])};mergeGames();render()}catch(_){}}
async function allGamesLoad(){if(S.gAll||S.gAllP)return;const d=S.sessData;if(!d)return;S.gAllP=true;
  try{const s=await d.db.collection('games').get();S.gAll=d.map(s);mergeGames();render()}catch(_){}finally{S.gAllP=false}}
{let hideT=null;
  document.addEventListener('visibilitychange',()=>{clearTimeout(hideT);if(document.hidden)hideT=setTimeout(courtSubs,60000);else courtSubs()});
  setInterval(courtSubs,30*60e3);
  addEventListener('online',()=>renderCourts());addEventListener('offline',()=>renderCourts())}

const gpid=(uid,name)=>`g~${uid}~${slug(name)}`;
function people(sid){
  const m={},r=roster(sid);
  for(const e of [...r.in,...r.wait]){
    if(e.guest)m[gpid(e.uid,e.guest)]={name:e.guest,guestOf:e.uid};
    else{const p=S.profiles[e.uid];m[e.uid]={name:p?.nickname||S.bookings[e.uid]?.name||allKeys()[e.key]||e.key||'Player',p,uid:e.uid}}
  }
  for(const w of (S.live[sid]?.walkins||[]))m['w~'+w.id]={name:w.name,walk:true};
  const lv=S.live[sid]||{};for(const k of Object.keys(lv.hide||{}))if(lv.hide[k]&&!(lv.checkin||{})[k])delete m[k];
  for(const [k,n] of Object.entries(lv.names||{}))if(m[k]&&n)m[k]={...m[k],name:n};
  /* anyone checked in stays on the sheet with their name, even if their booking changed after */
  for(const k of Object.keys(lv.checkin||{}))if(!m[k]){const n=(lv.seen||{})[k];if(n)m[k]=k.startsWith('g~')?{name:n,guestOf:k.split('~')[1]}:k.startsWith('w~')?{name:n,walk:true}:{name:n,uid:k,p:S.profiles[k]}}
  return m;
}
function who(sid,pid){const m=people(sid);if(m[pid])return m[pid];const p=S.profiles[pid];if(p)return{name:p.nickname,p,uid:pid};
  const lvn=((S.live[sid]||{}).seen||{})[pid]||((S.live[sid]||{}).names||{})[pid];if(lvn)return{name:lvn};
  if(String(pid).startsWith('g~')){const [,host,sl]=pid.split('~');const g=Object.values(S.bookings[host]?.s||{}).flatMap(x=>x.guests||[]).find(x=>slug(x.n)===sl);if(g)return{name:g.n,guestOf:host}}
  if(S.bookings[pid]?.name)return{name:S.bookings[pid].name};
  for(const g of Object.values(S.games))if(g.names&&g.names[pid])return{name:g.names[pid]};return{name:'Player'}}
function pav(sid,pid){const x=who(sid,pid);return x.p?avatar(x.p):avatar(null,x.name)}
const sessGames=sid=>Object.entries(S.games).filter(([,g])=>g.sid===sid).sort((a,b)=>(a[1].at||'').localeCompare(b[1].at||''));
/* games that count for rotation: finished or being checked, never cancelled ones */
const liveGames=sid=>sessGames(sid).filter(([,g])=>g.st!=='cancelled');
const gamesFor=(sid,pid)=>liveGames(sid).filter(([,g])=>[...g.a,...g.b].includes(pid)).length;

/* ---------- session plan: courts, time and the 5-game check ---------- */
const sessEnd=s=>at(s.date,s.end||'22:00');
const addMins=(hhmm,m)=>{const [h,mi]=String(hhmm||'22:00').split(':').map(Number);const t=Math.min(23*60+59,Math.max(0,h*60+mi+m));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')};
const msOf=t=>t&&typeof t.toMillis==='function'?t.toMillis():t&&t.seconds!=null?t.seconds*1000:typeof t==='string'?Date.parse(t):typeof t==='number'?t:NaN;
/* game length in minutes: server times, unless the phone was offline and they disagree by more than 30 s */
function gameMins(g){const sv=msOf(g.end)-msOf(g.start),dv=msOf(g.endDev)-msOf(g.startDev);
  const ms=isFinite(sv)&&sv>0&&(!isFinite(dv)||Math.abs(sv-dv)<=30000)?sv:isFinite(dv)&&dv>0?dv:NaN;return isFinite(ms)?Math.max(0,ms-(g.pausedMs||0))/60000:NaN}
function avgMins(sid){const ds=liveGames(sid).map(([,g])=>g.interrupted?NaN:gameMins(g)).filter(x=>x>2&&x<90);return ds.length>=3?{d:ds.reduce((a,b)=>a+b,0)/ds.length,n:ds.length}:null}
function presentIds(lv){return Object.keys(lv.checkin||{}).filter(p=>!(lv.out||[]).includes(p))}
function planInfo(sid,lv){const s=S.sessions[sid],now=Date.now(),st=sessStart(s),en=sessEnd(s);
  const present=presentIds(lv),N=present.length||roster(sid).in.length,C=lv.courts.filter(c=>!c.closed).length||1,T=Math.max(0,(en-st)/6e4);
  const left=Math.max(0,(en-Math.max(now,st))/6e4),m=avgMins(sid),d=m?m.d:BADMATH.FORMATS[21].mins;
  const games=present.map(p=>gamesFor(sid,p));
  return {N,C,T,left,d,measured:m,each:BADMATH.gamesEach(N,C,T,d),adv:BADMATH.advice({games,courts:C,minsLeft:left,d}),games}}
const fmtMins=m=>{m=Math.round(m);return m>=60?`${Math.floor(m/60)} h${m%60?' '+m%60+' min':''}`:`${m} min`};
function planTile(sid,lv,full){const s=S.sessions[sid],P=planInfo(sid,lv),admin=S.canEdit&&canSport(s.sport||'badminton');
  const head=`${P.N} players · ${P.C} court${P.C===1?'':'s'} · ${fmtMins(P.T)} · about <b class="num">${P.each.toFixed(1)}</b> games each`;
  const dl=P.measured?`Average game ${Math.round(P.d)} min, from ${P.measured.n} timed games.`:`Planning with ${Math.round(P.d)}-minute games until 3 games are timed.`;
  const warn=!P.adv.ok?`<div class="note warnbox" role="status"><b>Aiming for about 5 games each: ${P.adv.S} more games to go.</b> That takes about ${fmtMins(P.adv.need)}, with ${fmtMins(P.left)} left.
      <div class="row" style="gap:6px;margin-top:8px">${admin?`<button class="btn sm" data-act="extend" data-v="${P.adv.extend}">${ic('clock')}Extend ${P.adv.extend} min</button>`:''}<button class="btn ghost sm" data-act="add" data-k="c">${ic('plus')}Add a court${P.adv.courtEnough?' (fits in time)':''}</button></div></div>`
    :P.games.length?`<p class="fine">${ic('check')} On track for about 5 games each${P.adv.need?`, in about ${fmtMins(P.adv.need)}`:''}.</p>`:'';
  if(!full)return !P.adv.ok?`<div class="tile plan">${warn}</div>`:warn?`<div class="plan">${warn}</div>`:'';
  const r=roster(sid),wc=r.wc===Infinity?'No limit':r.wc;
  const prev=n=>`${n} players: about ${BADMATH.gamesEach(n,P.C,P.T,P.d).toFixed(1)} games each`;
  return `<div class="tile plan"><div class="sec-h"><b>${ic('users')} Session</b><span class="fine">Ends ${fmtTime(s.end||'22:00')}</span></div>
    <p>${head}</p><p class="fine">${dl}</p>${warn}
    ${admin?`<div class="planctl">
      <div><span class="label">Player cap</span><div class="row" style="gap:6px"><button class="btn ghost sm" data-act="cap" data-v="-1" aria-label="Lower the player cap">−</button><b class="num">${r.cap}</b><button class="btn ghost sm" data-act="cap" data-v="1" aria-label="Raise the player cap">+</button></div><span class="fine">${esc(prev(r.cap+1))}</span></div>
      <div><span class="label">Waiting list</span><div class="row" style="gap:6px"><button class="btn ghost sm" data-act="wcap" data-v="-1" aria-label="Shorter waiting list">−</button><b class="num">${wc}</b><button class="btn ghost sm" data-act="wcap" data-v="1" aria-label="Longer waiting list">+</button></div><span class="fine">${r.wait.length} waiting${r.over.length?`, ${r.over.length} turned away`:''}</span></div>
      <div><span class="label">Time</span><div class="row" style="gap:6px"><button class="btn ghost sm" data-act="extend" data-v="15">+15 min</button><button class="btn ghost sm" data-act="extend" data-v="30">+30 min</button></div><span class="fine">Ends ${fmtTime(s.end||'22:00')}</span></div>
    </div>`:'<p class="fine">Admins can change the player cap, waiting list and end time.</p>'}</div>`}
async function sessUpdate(sid,patch,msg){try{await S.db.doc('sessions/'+sid).update(patch);toast(msg)}catch(e){toast("Sorry, that didn't save.")}}

function scoreOf(gid,g){
  if(g.final)return{s:g.final,st:'confirmed'};
  const subs=[...g.a,...g.b].map(p=>S.scores[p]?.g?.[gid]).filter(Boolean);
  if(!subs.length)return null;
  const uniq=[...new Set(subs.map(s=>s.join('-')))];
  return uniq.length===1?{s:subs[0],st:'reported'}:{s:subs[0],st:'disputed'};
}
function rankRows(sport){
  const t={};
  for(const [gid,g] of Object.entries(S.games)){if(sport!=='all'&&g.sport!==sport)continue;const sc=scoreOf(gid,g);if(!sc||sc.st==='disputed')continue;
    const [a,b]=sc.s.map(Number);for(const [team,mine,theirs] of [[g.a,a,b],[g.b,b,a]])for(const pid of team){if(!S.profiles[pid])continue;
      const r=t[pid]||(t[pid]={pid,g:0,w:0,d:0});r.g++;if(mine>theirs)r.w++;r.d+=mine-theirs}}
  return Object.values(t).sort((x,y)=>y.w-x.w||(y.w/y.g)-(x.w/x.g)||y.d-x.d);
}

/* ---------- board state helpers ---------- */
/* admins for their department, or the session's Game Master */
const isGM=sid=>!!sid&&!!S.uid&&(S.sessions[sid]?.gms||[]).includes(S.uid);
const courtEd=sid=>(S.canEdit&&canRun(S.courtSport))||isGM(sid);
function courtSessions(){
  const now=Date.now();
  return Object.entries(S.sessions).filter(([sid,s])=>!s.cancelled&&(s.sport||'badminton')===S.courtSport&&(S.live[sid]?sessStart(s)>now-18*36e5:((S.canEdit||isGM(sid))?sessStart(s)>now-12*36e5&&sessStart(s)<now+7*864e5:Math.abs(sessStart(s)-now)<12*36e5)))
    .sort((a,b)=>sessStart(a[1])-sessStart(b[1]));
}
const clone=o=>JSON.parse(JSON.stringify(o));
const norm=lv=>{lv.waiting=lv.waiting||[];lv.out=lv.out||[];lv.walkins=lv.walkins||[];lv.checkin=lv.checkin||{};lv.avail=lv.avail||{};lv.order=lv.order||'arrival';return lv};
const hhmm=iso=>iso?new Date(iso).toLocaleTimeString('en-GB',{timeZone:'Asia/Dubai',hour:'numeric',minute:'2-digit',hour12:true}).replace(' ',''):'';
const arrivals=lv=>Object.entries(lv.checkin).sort((a,b)=>a[1].localeCompare(b[1])).map(([p])=>p);
const placed=lv=>new Set([...lv.courts,...lv.waiting].flatMap(c=>c.on).filter(Boolean));
/* Bench = checked-in players who are not on a court or waiting. Default order: first come, first served
   (check-in time, then the time their last game ended). Late arrivals join at the back; nobody jumps ahead for having fewer games. */
function benchOf(sid,lv){norm(lv);const p=placed(lv),out=new Set(lv.out);
  const free=Object.keys(lv.checkin).filter(x=>!p.has(x)&&!out.has(x));
  const ord=BADMATH.order(free.map(x=>rotP(sid,lv,x))).map(o=>o.id);
  return [...ord.filter(x=>!isRest(lv,x)),...ord.filter(x=>isRest(lv,x))]}
/* one player as the rotation sees them */
function rotP(sid,lv,id){return {id,g:gamesFor(sid,id),base:(lv.base||{})[id]||0,since:msOf(lv.avail[id]||lv.checkin[id])||0,deferred:(lv.defer||{})[id]||0,
  rating:(()=>{const sp=(S.sessions[sid]||{}).sport||'badminton';return sp==='badminton'?(S.profiles[id]?badRating(id):boardRating(lv,id)):(S.profiles[id]?sportRating(id,sp):null)})(),cat:S.profiles[id]?catOf(id):(boardLvl(lv,id).cat||null),
  band:BADMATH.bandOf(S.profiles[id]?gradeOf(id):boardLvl(lv,id).g)}}
/* lineups already played or prepared, so fresh partners and opponents are preferred */
function lineups(sid,lv){const h=liveGames(sid).map(([,g])=>({a:g.a,b:g.b}));
  for(const c of [...lv.courts,...lv.waiting]){const half=c.size/2,a=c.on.slice(0,half).filter(Boolean),b=c.on.slice(half).filter(Boolean);if(a.length&&b.length)h.push({a,b})}return h}
/* fill an empty doubles slot with the next four from the rotation; other sizes fill in bench order */
function generateInto(sid,lv,c){const bench=benchOf(sid,lv).filter(p=>!isRest(lv,p));
  if(c.size===4&&!c.on.some(Boolean)){const r=BADMATH.pickFour(bench.map(x=>rotP(sid,lv,x)),lineups(sid,lv));if(!r)return false;
    c.on=[...r.a,...r.b];lv.defer={...(lv.defer||{}),...r.deferred};return true}
  if(c.size>4&&!c.on.some(Boolean)&&bench.length>=2){const take=bench.slice(0,c.size).map(x=>rotP(sid,lv,x)),known=take.filter(p=>typeof p.rating==='number'),avg=known.length?known.reduce((t,p)=>t+p.rating,0)/known.length:3;
    const half=c.size/2,A=[],B=[];let sa=0,sb=0;for(const p of [...take].sort((x,y)=>((y.rating??avg)-(x.rating??avg)))){const r=p.rating??avg;if((sa<=sb&&A.length<half)||B.length>=half){A.push(p.id);sa+=r}else{B.push(p.id);sb+=r}}
    const pad=t=>t.concat(Array(half).fill(null)).slice(0,half);c.on=[...pad(A),...pad(B)];return true}
  const before=c.on.filter(Boolean).length;c.on=c.on.map(x=>x||bench.shift()||null);return c.on.filter(Boolean).length>before}
/* late-arrival credit: remember the lowest games count among players already there */
function setBase(sid,lv,pid){const others=presentIds(lv).filter(x=>x!==pid).map(x=>gamesFor(sid,x));lv.base=lv.base||{};if(others.length)lv.base[pid]=Math.min(...others)}
/* format suggestion: 21 points at capacity; 30 below it while everyone can still reach 5 games */
function suggestFmt(sid,lv){const P=planInfo(sid,lv);if(P.N>=roster(sid).cap)return 21;
  const a=BADMATH.advice({games:P.games,courts:P.C,minsLeft:P.left,d:P.measured?P.measured.d*30/21:BADMATH.FORMATS[30].mins});return a.ok?30:21}
const inG=c=>!!c&&(c.st==='playing'||c.st==='paused');
/* minutes played, not counting pauses */
const elapsed=c=>{const t=msOf(c.t0dev);if(!isFinite(t))return 0;const end=c.st==='paused'?msOf(c.pAt):Date.now();return Math.max(0,Math.floor((end-t-(c.pausedMs||0))/60000))};
function beginnerWarn(sid,lv,c){if(!c||c.size!==4||c.on.filter(Boolean).length!==4)return '';const P=c.on.map(id=>rotP(sid,lv,id));
  return BADMATH.beginnerBreaks(P.slice(0,2),P.slice(2))?'A Beginner has no Beginner opponent here.':''}
/* team strength for crew: the sum of each side's balancing ratings */
function teamStr(sid,lv,c){if(!c||c.size!==4)return '';const r=id=>{const x=rotP(sid,lv,id);return typeof x.rating==='number'?x.rating:null};
  const a=c.on.slice(0,2).map(r),b=c.on.slice(2).map(r);if([...a,...b].some(x=>x==null))return '';const sa=a[0]+a[1],sb=b[0]+b[1];return `teams ${sa} v ${sb}`}
const isRest=(lv,p)=>!!(lv.rest||{})[p];
function detach(lv,pid){for(const c of [...lv.courts,...lv.waiting])c.on=c.on.map(x=>x===pid?null:x);lv.out=lv.out.filter(x=>x!==pid)}
function locate(lv,pid){for(const [k,arr] of [['c',lv.courts],['w',lv.waiting]])for(let ci=0;ci<arr.length;ci++){const i=arr[ci].on.indexOf(pid);if(i>=0)return[k,ci,i]}return null}
const blank=(size)=>Array(size).fill(null);
/* Every save carries the next revision number. The security rules turn down a save made from an old copy of the board,
   so two phones can never undo each other's changes; the phone that lost simply shows the latest board. */
/* undo and redo: each phone keeps the last 30 board changes. A finished game is part of its step, so undoing a Finish removes the game too. */
S.hist={};const H=sid=>S.hist[sid]||(S.hist[sid]={u:[],r:[]});
function saveLive(sid,lv,meta){const prev=S.live[sid];if(prev&&!(meta&&meta.noHist)){const h=H(sid);h.u.push({lv:JSON.parse(JSON.stringify(prev)),gid:meta&&meta.gid,game:meta&&meta.game});if(h.u.length>30)h.u.shift();if(!(meta&&meta.redo))h.r=[]}
  return saveLiveRaw(sid,lv)}
async function undoRedo(sid,dir){const h=H(sid),from=dir==='undo'?h.u:h.r,to=dir==='undo'?h.r:h.u,e=from.pop();if(!e){toast(dir==='undo'?'Nothing to undo.':'Nothing to redo.');return}
  const cur=JSON.parse(JSON.stringify(S.live[sid]));to.push({lv:cur,gid:e.gid,game:e.game});
  try{if(e.gid){if(dir==='undo')await S.db.doc('games/'+e.gid).delete();else await S.db.doc('games/'+e.gid).set(e.game);
      if(dir==='undo'){delete S.gSess[e.gid];mergeGames()}}}catch(_){toast("The game record couldn't be changed. The board was still restored.")}
  const lv=JSON.parse(JSON.stringify(e.lv));delete lv.rev;saveLiveRaw(sid,lv);toast(dir==='undo'?'Undone.':'Redone.')}
function saveLiveRaw(sid,lv){lv.updatedAt=new Date().toISOString();lv.rev=((S.live[sid]&&S.live[sid].rev)||0)+1;S.live[sid]=lv;S.pend++;S.saveErr=null;renderCourts();
  S.db.doc('live/'+sid).set(lv).then(()=>{S.pend--;renderCourts()},e=>{S.pend--;S.saveErr=Date.now();
    toast(e&&e.code==='permission-denied'?'Another phone changed the board just now. You’re seeing the latest. Please make that change again.':"Sorry, the court board didn't save. Please try again.");renderCourts()})}
function saveState(){if(S.pend>0)return navigator.onLine===false?['warn','Offline · saves when you’re back online']:['','Saving…'];
  if(S.saveErr&&Date.now()-S.saveErr<15000)return['warn','Not saved · showing the latest board'];return['ok','Saved']}
function startBoard(sid){const sp=S.sessions[sid].sport||'badminton';
  if(isAttend(sp)){saveLive(sid,{courts:[],waiting:[],walkins:[],out:[],checkin:{},avail:{},order:'arrival'});toast('Check-in is open.');return}
  const size=SIZES[sp][0][0];
  saveLive(sid,{courts:Array.from({length:Number(S.sessions[sid].courts)||DEF_COURTS[sp]},(_,i)=>({id:'c'+(i+1),name:'Court '+(i+1),size,on:blank(size)})),waiting:[{id:'w1',size,on:blank(size)},{id:'w2',size,on:blank(size)}],walkins:[],out:[],checkin:{},avail:{},order:'arrival'});
  toast('Court board is open. Next, check players in as they arrive.')}

/* ---------- render ---------- */
S.courtStep=3;S.asPlayer=false;let pendingDone=null,cancelAsk=null,cancelWhy='',walkCat='',ciEdit=null,ciRm=false,ciShuf=false,resetAsk=false,finishAsk=null;
const CANCEL_REASONS=['Injury','Player had to leave','Wrong lineup','Court problem','Other'];
/* timers on playing courts tick once a minute without redrawing the board */
setInterval(()=>document.querySelectorAll('.timer[data-t0]').forEach(t=>{const m=msOf(t.dataset.t0);if(isFinite(m))t.textContent=Math.max(0,Math.floor((Date.now()-m-Number(t.dataset.pm||0))/60000))+' min'}),20000);
const nm=(sid,pid)=>pid===S.uid?'You':who(sid,pid).name;
function pl(sid,pid,o={}){ /* one player token: photo + name (+ games) */
  const tag=o.act?'button':'span',me=pid===S.uid;
  return `<${tag} class="pl${sel===pid?' sel':''}${me?' me':''}" ${o.act?`data-act="${o.act}" ${o.data||''}`:''}>${o.n!=null?`<span class="qn num">${o.n}</span>`:''}${pav(sid,pid)}<span class="pn">${esc(nm(sid,pid))}</span>${o.games?`<span class="fine num">${gamesFor(sid,pid)} played${S.canEdit&&!S.asPlayer&&lvlTag(pid,S.sessions[sid]?.sport||'badminton')?' · '+lvlTag(pid,S.sessions[sid]?.sport||'badminton'):''}</span>`:''}${o.lv&&isRest(o.lv,pid)?'<span class="flag">Resting</span>':o.lv&&(o.lv.more||{})[pid]?'<span class="flag">+ games</span>':''}</${tag}>`}
function spot(o={}){return o.act?`<button class="pl" data-act="${o.act}" ${o.data||''} aria-label="Open spot"><span class="slot">${ic('plus')}</span></button>`:`<span class="pl"><span class="slot"></span></span>`}
function sideHTML(sid,c,k,ci,from,to,edit){let h='';for(let i=from;i<to;i++){const pid=c.on[i],d=`data-k="${k}" data-c="${ci}" data-i="${i}"`;h+=pid?(edit?`<span class="plw">${pl(sid,pid,{act:'slot',data:d,games:true,lv:S.live[sid]})}<button class="plx" data-act="slotx" ${d} aria-label="Take ${esc(nm(sid,pid))} off, back to the bench">${ic('x')}</button></span>`:pl(sid,pid,{games:false,lv:S.live[sid]})):spot({act:edit?'slot':null,data:d})}return h}
function courtCard(sid,c,ci,edit){
  const sp=S.sessions[sid].sport||'badminton',half=c.size/2,full=c.on.filter(Boolean).length,playing=inG(c),gno=liveGames(sid).filter(([,g])=>g.court===c.name).length+1;
  const fmt=c.fmt||(sp==='badminton'?suggestFmt(sid,S.live[sid]||{courts:[]}):null);
  let foot='';
  if(edit){
    if(cancelAsk===ci)foot=`<div class="confirm"><b>${playing?'Cancel this game?':'Clear this court?'}</b>${playing?`<p class="fine">No result is counted. The players go back to the front of the bench.</p>
        <div class="chips" role="group" aria-label="Reason">${CANCEL_REASONS.map(r=>`<button class="chip sm" data-act="cancelwhy" data-v="${esc(r)}" aria-pressed="${cancelWhy===r}">${esc(r)}</button>`).join('')}</div>`:''}
        <div class="row" style="gap:6px"><button class="btn sm" data-act="cancelgo" data-c="${ci}" ${playing&&!cancelWhy?'disabled':''}>${playing?'Cancel game':'Clear court'}</button><button class="btn ghost sm" data-act="cancelno">Back</button></div></div>`;
    else if(finishAsk===ci)foot=`<div class="confirm"><b>Finish this game?</b><p class="fine">The players go back to the bench${S.live[sid]&&S.live[sid].waiting&&S.live[sid].waiting[0]&&S.live[sid].waiting[0].on.some(Boolean)?' and Next up comes on':''}. Scores come next.</p><div class="row" style="gap:6px"><button class="btn sm" data-act="finish" data-c="${ci}">${ic('check')}Finish game</button><button class="btn ghost sm" data-act="finishno">Keep playing</button></div></div>`;
    else if(playing||c.st==='paused')foot=`<div class="row cfoot"><button class="linkbtn" data-act="cancelask" data-c="${ci}">Cancel</button><button class="btn ghost sm" data-act="${c.st==='paused'?'resume':'pause'}" data-c="${ci}">${c.st==='paused'?ic('play')+'Resume':ic('clock')+'Pause'}</button><button class="btn wide" data-act="finish" data-c="${ci}">${ic('check')}End game</button></div>`;
    else if(c.closed)foot=`<div class="row cfoot"><span class="fine" style="margin-right:auto">Closed: no games go on this court.</span><button class="btn ghost sm" data-act="close" data-c="${ci}">Reopen court</button></div>`;
    else if(!full&&S.live[sid]&&S.live[sid].waiting&&S.live[sid].waiting[0]&&S.live[sid].waiting[0].on.some(Boolean))foot=`<div class="row cfoot"><button class="linkbtn" data-act="close" data-c="${ci}">Close court</button><button class="btn wide" data-act="nextin" data-c="${ci}">${ic('arrow')}Bring Next up on</button></div>`;
    else foot=`${full===4&&c.size===4&&(teamStr(sid,S.live[sid],c)||beginnerWarn(sid,S.live[sid],c))?`<p class="fine tstr">${esc([teamStr(sid,S.live[sid],c),beginnerWarn(sid,S.live[sid],c)].filter(Boolean).join(' · '))}</p>`:''}<div class="row cfoot">${full?`<button class="linkbtn" data-act="cancelask" data-c="${ci}">Clear</button>`:`<button class="linkbtn" data-act="close" data-c="${ci}">Close court</button>`}${full===4&&c.size===4?`<button class="btn ghost sm" data-act="repair" data-c="${ci}" title="Try the next way of pairing these four">⇄ Re-pair</button>`:''}${full<c.size?`<button class="btn ghost sm" data-act="fill" data-k="c" data-c="${ci}">${ic('users')}Fill from rotation</button>`:''}${full>=2?`<button class="btn wide" data-act="begin" data-c="${ci}" ${full<c.size&&sp==='badminton'?'disabled':''}>${ic('play')}Start</button>`:''}</div>`}
  const fchip=fmt?(edit&&!playing?`<button class="chip sm fmt" data-act="fmt" data-c="${ci}" aria-label="Game format, tap to change">To ${fmt}</button>`:`<span class="tagl">To ${fmt}</span>`):'';
  const tag=c.st==='paused'?`<span class="tagl warn">Paused · ${elapsed(c)} min</span>`:playing?`<span class="tagl solid timer" data-t0="${esc(c.t0dev||'')}" data-pm="${c.pausedMs||0}">${elapsed(c)} min</span>`:c.closed?`<span class="tagl">Closed</span>`:`<span class="tagl">${full?'Game '+gno+' · ready':'Free'}</span>`;
  return `<article class="court${playing?' on':''}${c.closed?' closed':''}"><div class="court-h"><b>${esc(c.name)}</b><span class="row" style="gap:6px">${fchip}${tag}</span></div>
    <div class="court-body ${sp}">${MARK[sp]||''}<div class="half">${sideHTML(sid,c,'c',ci,0,half,edit&&!playing)}</div><div class="net"><span>${MIDLINE[sp]||'NET'}</span></div><div class="half">${sideHTML(sid,c,'c',ci,half,c.size,edit&&!playing)}</div></div>${foot}</article>`;
}
function waitRow(sid,w,wi,edit){
  const half=w.size/2,full=w.on.filter(Boolean).length;
  return `<article class="wait"><div class="court-h"><span class="ic-row"><span class="qn num" style="position:static">${wi+1}</span><b>${wi===0?'Next up':'Then'}</b></span><span class="row" style="gap:6px">${edit&&full?`<button class="linkbtn" data-act="wclear" data-c="${wi}">Clear</button>`:''}${edit&&full<w.size?`<button class="btn ghost sm" data-act="fill" data-k="w" data-c="${wi}">Auto-fill</button>`:''}</span></div>
    <div class="mini"><div class="half">${sideHTML(sid,w,'w',wi,0,half,edit)}</div><span class="vs">vs</span><div class="half">${sideHTML(sid,w,'w',wi,half,w.size,edit)}</div></div></article>`;
}
/* check-in list: rename a guest or walk-in, or take anyone off tonight's list */
function ciEditor(sid,p){const x=who(sid,p),member=!!x.uid&&!!S.profiles[p],admin=S.canEdit&&canRun((S.sessions[sid]||{}).sport||'badminton');
  return `<div class="cied">${member?`<p class="fine">${esc(x.name)} is a member, so their name comes from their card.</p>`:`<label class="fine" for="ci-nm">Name</label><div class="row" style="gap:6px;flex-wrap:nowrap"><input type="text" id="ci-nm" maxlength="24" value="${esc(x.name)}" style="flex:1;min-width:0"><button class="btn sm" data-act="cirename" data-pid="${esc(p)}">Save</button></div>`}
    ${ciRm?(()=>{const f=admin&&!x.walk?dropFee(sid):{amount:0},fee=f.amount>0;return `<div class="confirm"><b>Take ${esc(x.name)} off tonight's list?</b><p class="fine">${admin&&!x.walk?(fee?`Cancelling inside 48 hours: ${esc(f.label.toLowerCase())}, AED ${f.amount}, goes on their payments. Choose “No charge” if there's a good reason.`:'They’re removed from the session list too. No charge this far ahead.'):x.walk?'The walk-in is removed.':'They’re hidden from tonight’s board. An admin can take them off the session list.'}</p><div class="row" style="gap:6px">${fee?`<button class="btn sm" data-act="cirmgo" data-charge="1" data-pid="${esc(p)}">Cancelled · AED ${f.amount}</button><button class="btn ghost sm" data-act="cirmgo" data-charge="0" data-pid="${esc(p)}">No charge</button>`:`<button class="btn sm" data-act="cirmgo" data-pid="${esc(p)}">Remove</button>`}<button class="btn ghost sm" data-act="cirmno">Keep</button></div></div>`})()
      :`<button class="linkbtn danger" data-act="cirm" data-pid="${esc(p)}">Remove from tonight</button>`}<button class="linkbtn" data-act="ciedit" data-pid="">Done</button></div>`}
/* guests and walk-ins have no card, so their level and category live on tonight's board */
const boardLvl=(lv,pid)=>((lv&&lv.lvl)||{})[pid]||{};
function boardRating(lv,pid){const x=boardLvl(lv,pid),r=gradeRow(x.g);return r&&x.cat?(x.cat==='W'?r[2]:r[3]):null}
function guestPick(lv,pid){const x=boardLvl(lv,pid),r=boardRating(lv,pid);
  return `<div class="gpick" data-bp="${esc(pid)}"><select data-bk="g" aria-label="BAD level"><option value="U">UNRATED</option>${GRADES.map(([k,d])=>`<option value="${k}" ${x.g===k?'selected':''}>${k} · ${esc(d)}</option>`).join('')}</select>
    <select data-bk="cat" aria-label="Category"><option value="">W / M</option>${Object.keys(CATS).map(k=>`<option value="${k}" ${x.cat===k?'selected':''}>${k}</option>`).join('')}</select>
    <label class="grate"><span>Rating</span><input type="text" value="${r==null?'—':r}" disabled aria-label="Balancing rating from the level"></label></div>`}
/* crew and Game Masters verify the BAD grade and category; an optional rating override replaces the table rating */
function gradePick(uid,sid){const r=(S.grades||{})[uid]||{},pr=S.profiles[uid]||{},c=r.cat||'',g=gradeRow(r.g||''),cc=c||pr.cat,calc=g&&cc?(cc==='W'?g[2]:g[3]):null;
  const adj=typeof r.ovr==='number',val=adj?r.ovr:calc;
  return `<div class="gpick" data-gp="${esc(uid)}"><select data-gk="g" aria-label="BAD level"><option value="U">UNRATED${pr.grade&&!g?' · says '+esc(pr.grade):''}</option>${GRADES.map(([k,d])=>`<option value="${k}" ${r.g===k?'selected':''}>${k} · ${esc(d)}</option>`).join('')}</select>
    <select data-gk="cat" aria-label="Balancing category"><option value="">W / M${pr.cat&&!c?' · says '+esc(pr.cat):''}</option>${Object.keys(CATS).map(k=>`<option value="${k}" ${c===k?'selected':''}>${k}</option>`).join('')}</select>
    <label class="grate${adj?' adj':''}"><span>${adj?'Adjusted':'Rating'}</span><input type="number" step="0.5" min="0" max="7" inputmode="decimal" data-gk="ovr" placeholder="—" value="${val==null?'':val}" ${val==null&&!adj?'disabled':''} aria-label="Balancing rating. Set from the level; change it to adjust"></label>
    ${adj?`<button type="button" class="linkbtn greset" data-greset="${esc(uid)}" title="Back to the rating for ${esc(r.g||'')} ${esc(cc||'')}">Reset to ${calc==null?'auto':calc}</button>`:''}</div>`}
async function saveGrade(uid,sid,k,v){
  const cur=(S.grades||{})[uid]||{},pr=S.profiles[uid]||{};
  const from={g:cur.g||'U',cat:cur.cat||null,ovr:typeof cur.ovr==='number'?cur.ovr:null};
  const to={...from};
  if(k==='g')to.g=gradeRow(v)?v:'U';
  if(k==='cat')to.cat=CATS[v]?v:null;
  if(k==='ovr'){const n=v===''?null:Math.round(Number(v)*2)/2;if(n!=null&&!(n>=0&&n<=7)){toast('Ratings go from 0 to 7.');return}to.ovr=n}
  if(k!=='cat'&&!to.cat&&CATS[pr.cat])to.cat=pr.cat;
  if(k==='g'||k==='cat')to.ovr=null;   /* a new level or category means a fresh rating from the table */
  if(k==='ovr'&&to.ovr!=null){const row=gradeRow(to.g),cc=to.cat||pr.cat,calc=row&&cc?(cc==='W'?row[2]:row[3]):null;if(calc===to.ovr)to.ovr=null}   /* the player's own category, now confirmed by crew */
  const me=myProfile(),doc={...to,by:S.uid,byName:(me&&me.nickname)||'',at:SVT(),sid,scale:GRADE_SCALE};
  /* keep the old 5-step level (scale v1) the first time, for the record. It is never turned into a grade. */
  if(cur.prev)doc.prev=cur.prev;else{const lv=S.levels&&S.levels[uid],ov=lv&&lv.levels?lv.levels.badminton:null,own=pr.levels?pr.levels.badminton:null;
    doc.prev={scale:'v1',self:own==null||own===''?null:(LEVELS[own]||null),crew:ov==null?null:(LEVELS[ov]||null)}}
  try{const b=S.db.batch();b.set(S.db.doc('grades/'+uid),doc);b.set(S.db.collection('grades/'+uid+'/log').doc(),{from,to,by:S.uid,byName:doc.byName,at:SVT(),sid});await b.commit();
    const row=gradeRow(to.g),cc=to.cat||pr.cat,rt=to.ovr!=null?to.ovr:row&&cc?(cc==='W'?row[2]:row[3]):null;
    toast(`${(S.profiles[uid]||{}).nickname||'Player'}: ${row?to.g:'UNRATED'}${to.cat?' - '+to.cat:''}${rt!=null?` · rating ${rt}${to.ovr!=null?' (adjusted)':''}`:''}. Saved.`)}
  catch(e){toast("Sorry, that level didn't save.");renderCourts()}}
function levelPick(uid,sp){const p=S.profiles[uid]||{},own=p.lv2?p.lv2[sp]:null,o=S.levels[uid],ov=o&&o.lv2?o.lv2[sp]:null;
  return `<label class="lvl"><span class="fine">Level</span><select data-lvl2="${esc(uid)}" data-sp="${sp}"><option value="">${own!=null?'Their own: '+esc(lvlName(sp,own)):'Not set'}</option>${(LEVELS_BY[sp]||[]).map(([l],i)=>`<option value="${i}" ${ov===i?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`}
function stepper(){const n=S.courtSid?supportCount(S.courtSid):0,st=[['Set up','Courts and time'],['Check in','Who has arrived'],['Games','Courts and next up'],['Scores',n?`${n} to check`:'Standings']];
  return `<div class="stepper">${st.map(([t,d],i)=>`<button data-act="step" data-n="${i+1}" aria-current="${S.courtStep===i+1?'step':'false'}"><span class="qn num" style="position:static">${i+1}</span><span><b>${t}</b><span class="fine">${d}</span></span></button>`).join('')}</div>`}

/* no session for this department yet: admins start today's one right here (sign-up sheet and board in one go) */
function quickStart(sp){const att=isAttend(sp),def={basketball:['19:00','21:00',20],run:['06:30','07:30',40],dance:['19:00','20:30',30],pickleball:['19:00','21:00',16],volleyball:['19:00','22:30',18],badminton:['20:00','22:00',16]}[sp]||['19:00','21:00',20];
  return `<div class="qstart"><span class="label">Start today's ${esc(SPORTS[sp].club)} session</span><p class="fine">${att?'Opens a sign-up and check-in sheet for today. Players can sign up in Play straight away.':'Opens today’s session and the court board. Players can sign up in Play straight away.'}</p>
    <div class="fgrid"><div class="field wide"><label for="qs-title">Name</label><input id="qs-title" maxlength="80" placeholder="${esc(defaultTitle(sp))}"></div>
    <div class="field"><label for="qs-start">Start</label><input type="time" id="qs-start" value="${def[0]}"></div><div class="field"><label for="qs-end">End</label><input type="time" id="qs-end" value="${def[1]}"></div>
    <div class="field"><label for="qs-cap">Max players</label><input type="number" id="qs-cap" min="2" value="${def[2]}"></div><div class="field"><label for="qs-fee">Fee (AED)</label><input type="number" id="qs-fee" min="0" value="${sp==='run'?0:40}"></div>
    ${att?'':`<div class="field"><label for="qs-courts">Courts</label><input type="number" id="qs-courts" min="1" max="8" value="${DEF_COURTS[sp]||1}"></div>`}<div class="field wide"><label for="qs-venue">Venue</label><input id="qs-venue" maxlength="80" placeholder="Where"></div></div>
    <div class="row" style="gap:8px"><button class="btn" data-act="qsgo">${ic('play')}${att?'Open the sign-up sheet':'Open courts'}</button><button class="btn ghost sm" data-act="goadmin">Plan a later date</button></div></div>`}
/* ---------- Check-in & Pay: the session sheet while the queue is switched off ----------
   One list of everyone signed up (and walk-ins): tap to mark who came, set how they paid, take people off.
   Payments for players and admin-added guests are their real payment records; walk-ins are noted on the sheet. */
const PAYOPT=[['','Not paid'],['cash','Paid · Cash'],['bank','Paid · Bank'],['ziina','Paid · Ziina'],['careem','Paid · Careem'],['fastpay','Paid · FastPay'],['free','Free']];
let endAsk=false,endNS=true,sheetQ='';
function payOf(sid,lv,pid){const s=S.sessions[sid]||{},fee=+s.fee||0;
  if(pid.startsWith('g~')){const host=pid.split('~')[1];return{kind:'host',host}}
  if(pid.startsWith('w~')){const w=(lv.wpay||{})[pid];return{kind:'walk',amount:fee,val:w?(w.waived?'free':w.method):''}}
  const P=S.payments[sid]?.[pid],b=S.bookings[pid]?.s?.[sid]||{},g=(b.guests||[]).filter(x=>!x.out).length;
  return{kind:'own',amount:fee*(1+g),guests:g,val:P&&P.ok?(P.waived?'free':(P.method||b.pay||'cash')):'',sent:!P?.ok&&!!b.sent,pref:b.pay||'cash'}}
function paySelHTML(sid,lv,p){const s=S.sessions[sid]||{},fee=+s.fee||0,can=typeof canPayFor==='function'?canPayFor(s.sport):false,pay=payOf(sid,lv,p),name=who(sid,p).name;
  if(pay.kind==='host')return `<span class="fine">Paid with ${esc(who(sid,pay.host).name)}</span>`;if(!fee)return '<span class="fine">Free session</span>';
  const lbl=(PAYOPT.find(o=>o[0]===pay.val)||PAYOPT[0])[1];
  return can?`<select class="paysel${pay.val?' ok':''}" data-paysel="${esc(p)}" aria-label="Payment for ${esc(name)}">${PAYOPT.map(([k,l])=>`<option value="${k}" ${k===pay.val?'selected':''}>${k?l:`Not paid · AED ${pay.amount}`}</option>`).join('')}</select>${pay.sent?'<span class="tagl warn">Says paid</span>':''}`
    :`<span class="tagl${pay.val?' solid':''}">${esc(pay.val?lbl:'Not paid · AED '+pay.amount)}</span>`}
function payTilesHTML(sid,lv,ids){const P=ids.map(p=>payOf(sid,lv,p)).filter(x=>x.kind!=='host'),paid=P.filter(x=>x.val),coll=paid.filter(x=>x.val!=='free').reduce((t,x)=>t+x.amount,0),due=P.filter(x=>!x.val).reduce((t,x)=>t+x.amount,0);
  return `<div class="tiles t4 paytiles"><div class="tile"><b class="num">${paid.length}<small>/${P.length}</small></b><span class="label">Paid</span></div><div class="tile"><b class="num"><small>AED</small> ${coll}</b><span class="label">Collected</span></div><div class="tile"><b class="num"><small>AED</small> ${due}</b><span class="label">To collect</span></div></div>`}
function sheetHTML(sid,s,lv,ppl){const ended=lv.ended||s.ended,can=typeof canPayFor==='function'?canPayFor(s.sport):false,fee=+s.fee||0;
  const ids=[...new Set([...Object.keys(ppl),...Object.keys(lv.checkin)])];
  const rows=ids.map(p=>({p,x:who(sid,p),here:!!lv.checkin[p],pay:payOf(sid,lv,p)})).sort((a,b)=>(a.here-b.here)||a.x.name.localeCompare(b.x.name));
  const here=rows.filter(r=>r.here).length,payers=rows.filter(r=>r.pay.kind!=='host'),paid=payers.filter(r=>r.pay.val),coll=paid.filter(r=>r.pay.val!=='free').reduce((t,r)=>t+r.pay.amount,0),due=payers.filter(r=>!r.pay.val).reduce((t,r)=>t+r.pay.amount,0);
  const absent=rows.filter(r=>!r.here&&r.pay.kind==='own'&&!r.p.startsWith('w~'));
  const sel=(r)=>{if(r.pay.kind==='host')return `<span class="fine">Paid with ${esc(who(sid,r.pay.host).name)}</span>`;
    if(!fee)return '<span class="fine">Free session</span>';
    const lbl=(PAYOPT.find(o=>o[0]===r.pay.val)||PAYOPT[0])[1];
    return can?`<select class="paysel${r.pay.val?' ok':''}" data-paysel="${esc(r.p)}" aria-label="Payment for ${esc(r.x.name)}">${PAYOPT.map(([k,l])=>`<option value="${k}" ${k===r.pay.val?'selected':''}>${k?l:`Not paid · AED ${r.pay.amount}`}</option>`).join('')}</select>${r.pay.sent?'<span class="tagl warn">Says paid</span>':''}`
      :`<span class="tagl${r.pay.val?' solid':''}">${esc(r.pay.val?lbl:'Not paid · AED '+r.pay.amount)}</span>`};
  const row=r=>`<div class="li srow${r.here?' here':''}" data-name="${esc(r.x.name.toLowerCase())}"><div class="srow-who">${pav(sid,r.p)}<div><div class="nm">${esc(r.x.name)}${r.x.walk?' <span class="tagl">Walk-in</span>':''}${r.x.guestOf?' <span class="tagl">Guest</span>':''}${isGuestBk(r.p)?' <span class="tagl">Guest</span>':''}</div><div class="sub">${r.x.guestOf?'Guest of '+esc(who(sid,r.x.guestOf).name)+' · ':''}${r.here?'Here since '+hhmm(lv.checkin[r.p]):'Not here yet'}${r.pay.guests?` · +${r.pay.guests} guest${r.pay.guests>1?'s':''}`:''}</div></div></div>
    <div class="srow-acts">${ended?'':r.here?`<button class="btn sm ghost" data-act="unci" data-pid="${esc(r.p)}" aria-label="Undo check-in for ${esc(r.x.name)}" title="Undo check-in">Undo</button>`:`<button class="btn sm" data-act="ci" data-pid="${esc(r.p)}">${ic('check')}Here</button>`}${sel(r)}${ended?'':`<button class="btn ghost sm icon" data-act="cix" data-pid="${esc(r.p)}" aria-label="Remove ${esc(r.x.name)}">${ic('x')}</button>`}</div>${ciEdit===r.p?ciEditor(sid,r.p):''}</div>`;
  return `${ended?`<div class="note endnote">${ic('check')}<div style="display:grid;gap:6px"><span><b>Session ended${lv.ended?' at '+hhmm(lv.ended):''}.</b> You can still update payments here.</span><button class="btn ghost sm" data-act="reopen" style="justify-self:start">Reopen session</button></div></div>`:''}
  <div class="tiles t4">${tile(`${here}<small>/${rows.length}</small>`,'Here')}${tile(`${paid.length}<small>/${payers.length}</small>`,'Paid')}${tile(`<small>AED</small> ${coll}`,'Collected')}${tile(`<small>AED</small> ${due}`,'To collect')}</div>
  ${ended?'':`<div class="row sheettools"><button class="btn ghost sm" data-act="qr">${ic('eye')}Check-in QR</button><button class="btn ghost sm" data-act="endask">${ic('check')}End session</button></div>`}
  ${endAsk&&!ended?`<div class="confirm"><b>End ${esc(s.title)}?</b><p class="fine">Check-in closes and the sheet keeps who came and who paid. You can reopen it.</p>${absent.length?`<label class="chip sm" style="justify-self:start"><input type="checkbox" id="end-ns" ${endNS?'checked':''}> Mark the ${absent.length} who didn't come as no-shows</label><p class="fine">${absent.map(r=>esc(r.x.name)).join(', ')}</p>`:''}<div class="row" style="gap:6px"><button class="btn sm" data-act="endgo">End session</button><button class="btn ghost sm" data-act="endask">Keep going</button></div></div>`:''}
  <input type="search" id="sheet-q" placeholder="Find a name" value="${esc(sheetQ)}" autocomplete="off" aria-label="Find a name on the sheet">
  <div class="list ssheet" id="sheet-list">${rows.map(row).join('')||'<span class="fine">No one has signed up yet.</span>'}</div>
  ${ended?'':`<div class="walkin"><span class="label">Walk-in</span><input type="text" id="walk-name" maxlength="24" placeholder="Name: search members or add a walk-in" autocomplete="off"><div id="walk-sugg" class="list" aria-live="polite"></div><button class="btn ghost sm" data-act="walk" style="justify-self:start">${ic('guest')}Add and mark here</button></div>`}`}
async function endSession(sid,markNS){const s=S.sessions[sid],lv=norm(clone(S.live[sid])),ppl=people(sid),now=new Date().toISOString();
  if(markNS){for(const [p,x] of Object.entries(ppl)){if(lv.checkin[p]||p.startsWith('w~')||p.startsWith('g~')||!S.bookings[p]||S.bookings[p].guest)continue;const key=S.bookings[p].key||S.profiles[p]?.listKey;if(!key)continue;
    const id='ns-'+slug(key),cur=S.noshows[id]||{player:key,name:x.name,dates:[]};if((cur.dates||[]).includes(sid))continue;try{await S.db.doc('noshows/'+id).set({player:key,name:cur.name||x.name,dates:[...(cur.dates||[]),sid]})}catch(_){}}}
  lv.ended=now;try{if(canSport(s.sport||'badminton'))await S.db.doc('sessions/'+sid).update({ended:true,endedAt:now})}catch(_){}
  toast(`${s.title} has ended.`);return saveLive(sid,lv)}
function renderCourts(){
  const el=$('v-courts');if(!el||S.view!=='courts')return;
  const fa=document.activeElement;if(fa&&el.contains(fa)&&fa.matches('input,textarea')){if(!el._wait){el._wait=1;fa.addEventListener('blur',()=>{el._wait=0;setTimeout(renderCourts,0)},{once:true})}return}
  const me=myProfile();
  if(!S.courtSport){const liveS=Object.keys(S.live).map(k=>S.sessions[k]).filter(Boolean).find(x=>sessStart(x)>Date.now()-18*36e5);S.courtSport=(liveS&&liveS.sport)||(me&&COURT_SPORTS.find(k=>(me.sports||[]).includes(k)))||'badminton'}
  const list=courtSessions();
  const sportChips=`<div class="sports">${BOARD_SPORTS.map(k=>`<button class="sp" data-act="sport" data-v="${k}" aria-pressed="${k===S.courtSport}">${ic(SPORTS[k].icon)}${SPORTS[k].club}</button>`).join('')}</div>`;
  if(!list.find(([sid])=>sid===S.courtSid)){S.courtSid=(list.find(([sid])=>S.live[sid])||list[0]||[null])[0];setTimeout(courtSubs,0)}
  const sid=S.courtSid,s=sid&&S.sessions[sid],lv0=sid&&S.live[sid];
  const ED=courtEd(sid),org=ED&&!S.asPlayer;document.body.classList.toggle('wide',org);
  const pick=list.length>1?`<div class="sports">${list.map(([id,x])=>{const d=dParts(x.date);return `<button class="sp" data-act="pick" data-sid="${id}" aria-pressed="${id===sid}">${ic(sportOf(x.sport).icon)}${esc(x.title)} · ${d.w} ${d.d}${S.live[id]?' ●':''}</button>`}).join('')}</div>`:'';
  const viewToggle=ED?`<div class="chips"><button class="chip sm" data-act="as" data-v="0" aria-pressed="${!S.asPlayer}">${ic('admin')}Admin</button><button class="chip sm" data-act="as" data-v="1" aria-pressed="${S.asPlayer}">${ic('eye')}Player view</button>${sid&&S.live[sid]&&!S.asPlayer?(()=>{const v=saveState(),h=H(sid);return `<span class="tagl savest ${v[0]}" role="status">${esc(v[1])}</span><span class="row hbtns" style="gap:4px"><button class="btn ghost sm icon" data-act="undo" ${h.u.length?'':'disabled'} aria-label="Undo" title="Undo">↶</button><button class="btn ghost sm icon" data-act="redo" ${h.r.length?'':'disabled'} aria-label="Redo" title="Redo">↷</button>${v[0]==='ok'?'':`<button class="btn ghost sm" data-act="savenow">${ic('check')}Save now</button>`}</span>`})():''}</div>`:'';
  const head=`${sportChips}<div class="row" style="justify-content:space-between;align-items:flex-end"><div class="hero" style="gap:4px"><span class="label">${esc(SPORTS[S.courtSport].club)} · ${!(ED&&!S.asPlayer)?'Live today':queueOff(S.courtSport)?(S.cTab==='board'?'Courts':'Check-in & Pay'):isAttend(S.courtSport)?'Check-in':'Courts'}</span><h2>${s?esc(s.title):esc(SPORTS[S.courtSport].sport)}</h2></div>${viewToggle}</div>${pick}`;
  if(!sid){const nxt=Object.values(S.sessions).filter(x=>(x.sport||'badminton')===S.courtSport&&sessStart(x)>Date.now()).sort((a,b)=>sessStart(a)-sessStart(b))[0];
    el.innerHTML=head+`<div class="empty">${ic(SPORTS[S.courtSport].icon)}<span>${nxt?`Next ${esc(SPORTS[S.courtSport].club)} session: ${esc(nxt.title)}, ${dParts(nxt.date).w} ${dParts(nxt.date).d} ${dParts(nxt.date).m}. Courts open on the day.`:`No ${esc(SPORTS[S.courtSport].club)} session scheduled yet.`}</span>${S.canEdit&&canSport(S.courtSport)?quickStart(S.courtSport):''}</div>`;bindCourts(el);return}
  if(!lv0){el.innerHTML=head+`<div class="empty">${ic(sportOf(s.sport).icon)}<span>${org?`${Object.keys(people(sid)).length} players are signed up. Open the board when you're at the venue.`:'Courts appear here once the session starts.'}</span>${org?`<button class="btn" data-act="start">${ic('plus')}Open the court board</button>`:''}</div>`;bindCourts(el);return}
  const lv=norm(clone(lv0)),ppl=people(sid),bench=benchOf(sid,lv),meId=S.uid,loc=locate(lv,meId);
  const att=isAttend(s.sport);if(att&&org)S.courtStep=2;
  if(att&&!org){const inn=lv.checkin[meId];
    el.innerHTML=head+`<div class="tile you"><span class="label">You</span><b class="big">${(()=>{const L=locate(lv,meId);return !inn?'Not checked in yet':L&&L[0]==='c'?`On ${esc(lv.courts[L[1]].name)}`:L?(L[1]===0?'You’re next up':`Up in ${L[1]+1}`):'Checked in'})()}</b><span class="fine">${inn?'Checked in at '+hhmm(inn)+(lv.played&&lv.played[meId]?` · ${lv.played[meId]} game${lv.played[meId]>1?'s':''} played`:'')+'.':'Scan the check-in QR code when you arrive.'}</span></div>
      ${lv.courts.length?`<div class="mcourts pview">${lv.courts.map(c=>`<div class="mcourt${c.st==='playing'?' on':''}"><div class="mc-h"><b>${esc(c.name)}</b><span class="tagl${c.st==='playing'?' solid':''}">${c.st==='playing'?'Playing':c.on.some(Boolean)?'Ready':'Free'}</span></div><p class="fine">${c.on.filter(Boolean).map(p=>esc(nm(sid,p))).join(' · ')||'—'}</p></div>`).join('')}</div>`:''}
      ${(S.awards[sid]&&S.awards[sid].winners||[]).length?baddestCard(sid):''}${s.sport==='run'?runHTML(sid,lv,false):''}<p class="fine">${Object.keys(lv.checkin).length} checked in.</p>`;
    bindCourts(el);bindRuns(el);return}
  /* ---------- public view: straight to the point ---------- */
  const counts=COURT_SPORTS.includes(s.sport||'badminton')?`<p class="fine counts">On court <b class="num">${lv.courts.reduce((t,c)=>t+c.on.filter(Boolean).length,0)}</b> · Next up <b class="num">${lv.waiting.reduce((t,w)=>t+w.on.filter(Boolean).length,0)}</b> · Bench <b class="num">${bench.length}</b> · Checked in <b class="num">${presentIds(lv).length}</b></p>`:'';
  if(!org){
    const pend=!lv.checkin[meId]&&S.myCI?.[sid],inn=lv.checkin[meId],st=pend?['Checking you in…','Scan received. It confirms in a moment.']:loc&&loc[0]==='c'?['On '+lv.courts[loc[1]].name,'Enjoy the game.']:loc?[loc[1]===0?'You’re next':'Up in '+(loc[1]+1),loc[1]===0?'Get ready.':'Hang tight.']:inn&&!lv.out.includes(meId)?['On the bench','#'+(bench.indexOf(meId)+1)+' in line · checked in '+hhmm(inn)]:ppl[meId]?['Not checked in','Please check in with an admin when you arrive.']:null;
    const myGames=sessGames(sid).filter(([,g])=>[...g.a,...g.b].includes(meId));
    const benchMe=inn&&!loc&&!lv.out.includes(meId),rest=isRest(lv,meId),more=(lv.more||{})[meId];
    const legacy=myGames.filter(([,g])=>!v2(g));
    const todo=legacy.filter(([gid,g])=>!g.final&&!S.scores[meId]?.g?.[gid]).slice(-1)[0];
    el.innerHTML=head+counts+`${S.awards[sid]?standingsHTML(sid,false):''}${playerScoresHTML(sid)}${todo?`<div class="tile prompt"><span class="label">${ic('star')} Add your score</span>${gameRow(sid,todo[0],todo[1],0,true,true)}</div>`:''}${st?`<div class="tile you"><span class="label">You</span><b class="big">${esc(rest&&benchMe?'Sitting out':st[0])}</b><span class="fine">${esc(rest&&benchMe?'Tap Ready when you want back in. You keep your place.':st[1])}</span>
      ${inn&&!lv.out.includes(meId)?`<div class="row" style="gap:6px;margin-top:6px"><button class="btn sm ${rest?'':'ghost'} inv" data-act="rest" data-v="${rest?0:1}">${rest?ic('play')+'Ready to play':ic('clock')+'Sit out a game'}</button><button class="btn sm ghost inv" data-act="more" data-v="${more?0:1}" aria-pressed="${!!more}">${ic('plus')}${more?'Up for extra: on':'Up for extra games'}</button></div>`:''}</div>`:''}
      <div class="split"><div class="main"><div class="courts">${lv.courts.map((c,i)=>courtCard(sid,c,i,false)).join('')}</div></div><aside class="side">
      ${lv.waiting.some(w=>w.on.some(Boolean))?`<div class="sec"><span class="label">Next</span><div class="waits">${lv.waiting.map((w,i)=>w.on.some(Boolean)?waitRow(sid,w,i,false):'').join('')}</div></div>`:''}
      ${bench.length?`<div class="sec"><span class="label">Bench</span><div class="bench">${bench.map((p,i)=>pl(sid,p,{n:i+1,lv})).join('')}</div></div>`:''}
      <p class="fine">Fewest games play first. Arrive late and you join one game behind.</p>
      ${!S.awards[sid]?standingsHTML(sid,false):''}
      ${legacy.length?`<div class="sec"><span class="label">Earlier games · ${legacy.length}</span><div class="list">${legacy.map(([gid,g],i)=>gameRow(sid,gid,g,i,true)).join('')}</div></div>`:''}</aside></div>`;
    bindCourts(el);bindScores(el);return;
  }
  /* ---------- admin view: step by step ---------- */
  let body='';
  if(S.courtStep===1&&!queueOff(S.courtSport)){
    const sp=s.sport||'badminton';
    body=`${planTile(sid,lv,true)}<div class="tile"><div class="sec-h"><b>${ic('court')} Courts</b><button class="btn ghost sm" data-act="add" data-k="c">${ic('plus')}Add court</button></div>
      <div class="list">${lv.courts.map((c,i)=>`<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">${esc(c.name)}</div><div class="chips" style="margin-top:6px">${SIZES[sp].map(([n,l])=>`<button class="chip sm" data-act="size" data-k="c" data-c="${i}" data-n="${n}" aria-pressed="${c.size===n}">${l}</button>`).join('')}</div></div>${lv.courts.length>1&&!c.on.some(Boolean)?`<button class="btn ghost sm" data-act="del" data-k="c" data-c="${i}">${ic('x')}</button>`:''}</div>`).join('')}</div></div>
      <div class="tile"><div class="sec-h"><b>${ic('clock')} Waiting area</b><div class="row" style="gap:6px"><button class="btn ghost sm" data-act="wless" ${lv.waiting.length<2?'disabled':''} aria-label="Fewer waiting groups">−</button><b class="num">${lv.waiting.length}</b><button class="btn ghost sm" data-act="add" data-k="w" aria-label="More waiting groups">+</button></div></div>
        <p class="fine">Groups lined up to go on next. When a game ends, the first group moves onto that court.</p></div>
      <div class="tile"><b>${ic('users')} How the bench works</b>
        <p class="fine">First come, first served: players are called in the order they checked in, and go to the back after each game. Late arrivals join at the back. Players can sit out a game and keep their place. Use Catch-up during games to call the players with the fewest games first.</p></div>
      <button class="btn wide" data-act="step" data-n="2">Next: check players in ${ic('arrow')}</button>`;
  }else if(queueOff(S.courtSport)){body=`<div class="seg2 ctabs" role="group" aria-label="Session tools"><button data-ctab="sheet" aria-pressed="${S.cTab!=='board'}">Check-in &amp; Pay</button><button data-ctab="board" aria-pressed="${S.cTab==='board'}">Courts</button></div>`+(S.cTab==='board'?mboardHTML(sid,s,lv):sheetHTML(sid,s,lv,ppl));
  }else if(S.courtStep===2){
    const arr=arrivals(lv),notYet=Object.keys(ppl).filter(p=>!lv.checkin[p]).sort((a,b)=>who(sid,a).name.localeCompare(who(sid,b).name));
    body=`<div class="split eq"><div class="tile"><div class="sec-h"><b>${ic('check')} Check in</b><span class="fine num">${arr.length} of ${Math.max(arr.length,Object.keys(ppl).length)} here</span></div>
        <button class="btn wide" data-act="qr">${ic('eye')}Show check-in QR code</button>
        <p class="fine">Players scan the code when they arrive. You can also check people in by name below, for guests or anyone without their phone.</p>
        <input type="text" id="ci-find" placeholder="Find a player" autocomplete="off">
        <div class="list" id="ci-list">${notYet.map(p=>`<div class="li ci" data-name="${esc(who(sid,p).name.toLowerCase())}" style="grid-template-columns:auto minmax(0,1fr) auto">${pav(sid,p)}<div><div class="nm">${esc(who(sid,p).name)}</div><div class="sub">${who(sid,p).guestOf?'Guest of '+esc(who(sid,who(sid,p).guestOf).name):'Signed up'}</div></div><div class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn sm ghost" data-act="ci" data-pid="${esc(p)}">${ic('check')}Check in</button><button class="btn sm ghost icon" data-act="ciedit" data-pid="${esc(p)}" aria-label="Edit ${esc(who(sid,p).name)}">${ic('edit')}</button><button class="btn sm ghost icon" data-act="cix" data-pid="${esc(p)}" aria-label="Remove ${esc(who(sid,p).name)}, cancelled">${ic('x')}</button></div>${ciEdit===p?ciEditor(sid,p):''}</div>`).join('')||'<span class="fine">Everyone signed up has arrived.</span>'}</div>
        <div class="walkin"><span class="label">Walk-in</span>
          <input type="text" id="walk-name" maxlength="24" placeholder="Name: search members or add a walk-in" autocomplete="off">
          <div id="walk-sugg" class="list" aria-live="polite"></div>
          ${(s.sport||'badminton')==='badminton'?`<select id="walk-g" aria-label="Walk-in BAD level"><option value="U">Level: UNRATED</option>${GRADES.map(([k,d])=>`<option value="${k}">${k} · ${esc(d)}</option>`).join('')}</select>
            <div class="chips" role="group" aria-label="Walk-in category">${Object.entries(CATS).map(([k,l])=>`<button type="button" class="chip sm" data-act="walkcat" data-v="${k}" aria-pressed="${walkCat===k}">${l}</button>`).join('')}</div>`:''}
          <button class="btn ghost sm" data-act="walk" style="justify-self:start">${ic('guest')}Add and check in</button></div></div>
      <div class="tile"><div class="sec-h"><b>${ic('wallet')} Payments tonight</b></div>${payTilesHTML(sid,lv,arr)}<p class="fine">Set each person's payment on their row below as you collect it.</p></div>
      <div class="tile"><div class="sec-h"><b>${ic('clock')} Arrived · in order</b>${arr.length>2?(ciShuf?`<span class="row" style="gap:6px"><button class="btn sm" data-act="cishufgo">Shuffle</button><button class="btn ghost sm" data-act="cishuf">Keep</button></span>`:`<button class="btn ghost sm" data-act="cishuf">⇅ Reshuffle</button>`):''}</div>${ciShuf?'<p class="fine">Mixes the arrival order of everyone who isn’t on a court. To move one person, drag them by the number or use ↑ ↓. Games already played still count, so the fairness of turns stays the same.</p>':''}<div class="list">${arr.map((p,i)=>`<div class="li arr" data-arr="${esc(p)}" style="grid-template-columns:auto auto minmax(0,1fr) auto"><span class="rank num drag-h" title="Drag to move" aria-label="Drag ${esc(who(sid,p).name)} up or down"><span class="grip" aria-hidden="true">⋮⋮</span>${i+1}</span>${pav(sid,p)}<div><div class="nm">${esc(who(sid,p).name)}</div><div class="sub num">${hhmm(lv.checkin[p])}${lv.out.includes(p)?' · left':''}${isRest(lv,p)?' · resting':''}</div></div><div class="row arrctl">${lv.out.includes(p)?`<button class="btn ghost sm" data-act="restore" data-pid="${esc(p)}">Back in</button>`:locate(lv,p)?'<span class="fine">Playing</span>':`<button class="btn ghost sm" data-act="unci" data-pid="${esc(p)}">Undo</button>`}<button class="btn ghost sm icon" data-act="ciup" data-pid="${esc(p)}" ${i?'':'disabled'} aria-label="Move ${esc(who(sid,p).name)} up">↑</button><button class="btn ghost sm icon" data-act="cidown" data-pid="${esc(p)}" ${i<arr.length-1?'':'disabled'} aria-label="Move ${esc(who(sid,p).name)} down">↓</button><button class="btn ghost sm icon" data-act="cix" data-pid="${esc(p)}" aria-label="Remove ${esc(who(sid,p).name)}">${ic('x')}</button></div>${ciEdit===p?ciEditor(sid,p):''}<div class="ci-pay">${paySelHTML(sid,lv,p)}</div><details class="ci-lvl"><summary>Level · ${esc((S.profiles[p]&&typeof lvlTag==='function'&&lvlTag(p,s.sport||'badminton'))||(S.profiles[p]?'Not set':'Unrated'))}</summary>${S.profiles[p]?((s.sport||'badminton')==='badminton'?gradePick(p,sid):levelPick(p,s.sport||'badminton')):((s.sport||'badminton')==='badminton'?guestPick(lv,p):'')}</details></div>`).join('')||'<span class="fine">No one has checked in yet.</span>'}</div></div></div>
      ${isAttend(s.sport)?'':`<button class="btn wide" data-act="step" data-n="3">Next: run games ${ic('arrow')}</button>`}`;
  }else if(S.courtStep===3){
    const anyW=lv.waiting.some(w=>w.on.some(Boolean)),anyC=lv.courts.some(c=>!inG(c)&&c.on.some(Boolean));
    const tools=resetAsk?`<div class="confirm"><b>Reset the board?</b><p class="fine">Every court that isn't mid-game and the whole waiting area are emptied. Everyone goes back to the bench. Check-ins and games already played stay.</p><div class="row" style="gap:6px"><button class="btn sm" data-act="resetgo">Reset</button><button class="btn ghost sm" data-act="resetask">Keep</button></div></div>`
      :`<div class="row boardtools" style="gap:8px;justify-content:flex-end">${anyW?`<button class="btn ghost sm" data-act="wclearall">${ic('x')}Clear waiting area</button>`:''}${anyW||anyC?`<button class="btn ghost sm" data-act="resetask">↺ Reset board</button>`:''}</div>`;
    body=`${planTile(sid,lv,false)}${tools}<p class="hint">${sel?`<b>${esc(who(sid,sel).name)}</b> selected. Tap an open spot or another player to swap.`:'Tap a player, then tap where they should go. Or drag them there (on a phone, press and hold first).'}</p>
      <div class="split"><div class="main"><div class="courts">${lv.courts.map((c,i)=>courtCard(sid,c,i,true)).join('')}</div>
      <div class="sec"><span class="label">Waiting area</span><div class="waits">${lv.waiting.map((w,i)=>waitRow(sid,w,i,true)).join('')}</div></div></div>
      <aside class="side"><div class="sec"><div class="sec-h"><span class="label">Bench · fewest games first</span></div>
        <div class="bench">${bench.map((p,i)=>pl(sid,p,{act:'bench',data:`data-pid="${esc(p)}"`,n:i+1,games:true,lv})).join('')||'<span class="fine">Everyone checked in is placed.</span>'}</div>
        ${Object.keys(ppl).filter(p=>!lv.checkin[p]).length?`<button class="btn ghost sm" data-act="step" data-n="2" style="justify-self:start">${ic('check')}${Object.keys(ppl).filter(p=>!lv.checkin[p]).length} not checked in</button>`:''}</div></aside></div>
      ${sel?`<div class="selbar">${pav(sid,sel)}<b style="flex:1;min-width:90px">${esc(who(sid,sel).name)}</b><div class="row" style="gap:6px">${locate(lv,sel)?`<button class="btn ghost sm" data-act="tobench">To bench</button>`:''}<button class="btn ghost sm" data-act="orest">${isRest(lv,sel)?'Ready':'Rest'}</button><button class="btn ghost sm" data-act="out">Left</button><button class="btn sm" data-act="unsel">${ic('x')}</button></div></div>`:''}`;
  }else{
    const legacy=sessGames(sid).filter(([,g])=>!v2(g));
    body=`${supportHTML(sid)}${typeof standingsHTML==='function'?standingsHTML(sid,true):''}${legacy.length?`<div class="tile"><b>${ic('play')} Earlier games · ${legacy.length}</b><p class="fine">Logged before score checks. Confirm or correct them here.</p>
        <div class="list">${legacy.map(([gid,g],i)=>gameRow(sid,gid,g,i,false)).join('')}</div></div>`:''}`;
  }
  if(att)body+=`${s.sport==='run'?runHTML(sid,lv,true):''}${baddestPickHTML(sid,lv)}`;
  else if(S.courtStep===3)body=counts+body;
  if(S.courtStep===4&&(s.sport||'badminton')!=='badminton')body=baddestPickHTML(sid,lv)+body;
  el.innerHTML=head+(att?'':stepper())+body;
  el.querySelectorAll('[data-lvl]').forEach(x=>x.onchange=()=>setLevel(x.dataset.lvl,x.dataset.sp,x.value));
  el.querySelectorAll('[data-lvl2]').forEach(x=>x.onchange=()=>setLevel2(x.dataset.lvl2,x.dataset.sp,x.value));
  el.querySelectorAll('[data-gp] [data-gk]').forEach(x=>x.onchange=()=>saveGrade(x.closest('[data-gp]').dataset.gp,S.courtSid,x.dataset.gk,x.value));
  el.querySelectorAll('[data-greset]').forEach(x=>x.onclick=()=>saveGrade(x.dataset.greset,S.courtSid,'ovr',''));
  el.querySelectorAll('[data-bp] [data-bk]').forEach(x=>x.onchange=()=>{const sid=S.courtSid,pid=x.closest('[data-bp]').dataset.bp,lv=norm(clone(S.live[sid]));
    const cur={...boardLvl(lv,pid)};if(x.dataset.bk==='g')cur.g=gradeRow(x.value)?x.value:'U';else cur.cat=CATS[x.value]?x.value:null;
    lv.lvl={...(lv.lvl||{}),[pid]:cur};toast(`${who(sid,pid).name}: ${gradeRow(cur.g)?cur.g:'UNRATED'}${cur.cat?' - '+cur.cat:''}. Saved for tonight.`);saveLive(sid,lv)});
  const wn=$('walk-name');if(wn)wn.oninput=()=>{const q=wn.value.trim().toLowerCase(),box=$('walk-sugg');if(!box)return;if(q.length<2){box.innerHTML='';return}
    const lv0=S.live[sid]||{},taken=new Set([...Object.keys(people(sid)),...Object.keys(lv0.checkin||{})]);
    const hits=Object.entries(S.profiles).filter(([u,p])=>!p.sample&&!taken.has(u)&&[(p.nickname||''),(p.listName||'')].some(x=>x.toLowerCase().includes(q))).slice(0,5);
    box.innerHTML=hits.length?`<span class="label">Members</span>${hits.map(([u,p])=>`<div class="li" style="grid-template-columns:auto minmax(0,1fr) auto">${avatar(p)}<div><div class="nm">${esc(p.nickname)}</div><div class="sub">${esc(gradeLabel(u))}${p.listName&&p.listName!==p.nickname?' · '+esc(p.listName):''}</div></div><button class="btn sm" data-act="memberin" data-pid="${esc(u)}">${ic('check')}Check in</button></div>`).join('')}<span class="fine">Not them? Add as a walk-in below.</span>`:'<span class="fine">No member with that name. Add them as a walk-in below.</span>';
    box.querySelectorAll('[data-act=memberin]').forEach(b=>b.onmousedown=e=>e.preventDefault())};
  const fd=$('ci-find');if(fd)fd.oninput=e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll('#ci-list .ci').forEach(r=>r.hidden=q&&!r.dataset.name.includes(q))};
  bindCourts(el);bindScores(el);bindRuns(el);
}
function gameRow(sid,gid,g,i,mine,bare){
  const sc=scoreOf(gid,g),names=t=>t.map(p=>esc(nm(sid,p))).join(' & ');
  const my=S.scores[S.uid]?.g?.[gid],edit=(mine&&!g.final)||(!mine&&S.canEdit&&canRun(g.sport)),v=my||sc?.s||[];
  return `<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">${names(g.a)} <span class="muted">vs</span> ${names(g.b)}</div><div class="sub">${esc(g.court)}${sc?(sc.st==='disputed'?' · Scores differ':sc.st==='confirmed'?' · Confirmed':''):''}</div>
      ${edit?`<div class="row" style="gap:6px;margin-top:6px"><input type="number" min="0" class="sc" id="ga-${gid}" value="${esc(v[0]??'')}" aria-label="Score for ${names(g.a)}"><span class="muted">–</span><input type="number" min="0" class="sc" id="gb-${gid}" value="${esc(v[1]??'')}" aria-label="Score for ${names(g.b)}"><button class="btn ghost sm" data-act="${mine?'myscore':'final'}" data-gid="${gid}">${ic('check')}${mine?'Save':'Confirm'}</button></div>`:''}</div>
    <b class="num big" style="font-size:1.6rem">${sc?sc.s.join('–'):'—'}</b></div>`;
}

/* ---------- actions (placing players is admin-only) ---------- */
/* drag and drop: drag a player's icon onto a court spot, a waiting spot or the bench. It does exactly what tap-and-tap does. */
function enableDrag(el){if(el._drag)return;el._drag=true;let d=null,hold=null;
  /* phones: press and hold a player for a moment, then drag. A quick swipe still scrolls the page. Mouse: drag straight away. */
  const arm=()=>{if(!d)return;d.armed=true;d.t.classList.add('armed');try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}};
  el.addEventListener('pointerdown',ev=>{const t=ev.target.closest('.pl[data-act="slot"],.pl[data-act="bench"]');if(!t||ev.button>0)return;
    const pid=t.dataset.act==='bench'?t.dataset.pid:(()=>{const lv=S.live[S.courtSid],arr=t.dataset.k==='w'?lv.waiting:lv.courts;return (arr[+t.dataset.c]||{on:[]}).on[+t.dataset.i]})();
    if(!pid)return;d={pid,t,x:ev.clientX,y:ev.clientY,on:false,id:ev.pointerId,armed:ev.pointerType==='mouse'};clearTimeout(hold);if(!d.armed)hold=setTimeout(arm,180)});
  el.addEventListener('touchmove',ev=>{if(d&&d.armed)ev.preventDefault()},{passive:false});
  el.addEventListener('pointermove',ev=>{if(!d||ev.pointerId!==d.id)return;
    if(!d.armed){if(Math.hypot(ev.clientX-d.x,ev.clientY-d.y)>8){clearTimeout(hold);d=null}return}
    if(!d.on){if(Math.hypot(ev.clientX-d.x,ev.clientY-d.y)<6)return;d.on=true;d.g=d.t.cloneNode(true);d.g.className+=' ghost';document.body.appendChild(d.g);document.body.classList.add('dragging')}
    d.g.style.left=ev.clientX+'px';d.g.style.top=ev.clientY+'px';ev.preventDefault();
    if(ev.clientY<80)scrollBy(0,-14);else if(ev.clientY>innerHeight-110)scrollBy(0,14);
    document.querySelectorAll('.droptgt').forEach(x=>x.classList.remove('droptgt'));const u=document.elementFromPoint(ev.clientX,ev.clientY);const tg=u&&u.closest('.pl[data-act="slot"],.bench,.pl[data-act="bench"]');if(tg)tg.classList.add('droptgt')},{passive:false});
  const end=ev=>{clearTimeout(hold);if(!d)return;const was=d;d=null;was.t.classList.remove('armed');document.querySelectorAll('.droptgt').forEach(x=>x.classList.remove('droptgt'));document.body.classList.remove('dragging');if(!was.on)return;was.g.remove();
    el._skipClick=true;setTimeout(()=>el._skipClick=false,250);
    const u=document.elementFromPoint(ev.clientX,ev.clientY),slot=u&&u.closest('.pl[data-act="slot"]'),bench=u&&u.closest('.bench,.pl[data-act="bench"]');
    sel=was.pid;
    if(slot&&slot!==was.t)el.onclick({target:slot});
    else if(bench&&was.t.dataset.act==='slot')el.onclick({target:{closest:()=>({dataset:{act:'tobench'}})}});
    else{sel=null;renderCourts()}};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',ev=>{clearTimeout(hold);if(d){d.t.classList.remove('armed');if(d.g)d.g.remove()}d=null;document.body.classList.remove('dragging')})}
/* drag a player up or down the arrival order: grab the number, drop on the new spot. The check-in times are swapped
   around so the order sticks for everyone, and Undo brings the old order back. */
function arrDrag(el){const list=el.querySelector('.li.arr')?.parentElement;if(!list)return;
  list.querySelectorAll('.drag-h').forEach(h=>h.onpointerdown=ev=>{if(ev.button>0)return;ev.preventDefault();const row=h.closest('.li.arr'),rows=[...list.querySelectorAll('.li.arr')],from=rows.indexOf(row);
    let to=from;const y0=ev.clientY,sy0=scrollY;row.classList.add('dragging');h.setPointerCapture?.(ev.pointerId);
    const mv=e=>{if(e.clientY<90)scrollBy(0,-14);else if(e.clientY>innerHeight-120)scrollBy(0,14);row.style.transform=`translateY(${e.clientY-y0+scrollY-sy0}px)`;to=from;rows.forEach((r,i)=>{if(r===row)return;const b=r.getBoundingClientRect(),mid=b.top+b.height/2;if(i<from&&e.clientY<mid)to=Math.min(to,i);if(i>from&&e.clientY>mid)to=Math.max(to,i)});
      rows.forEach((r,i)=>r.classList.toggle('dropat',r!==row&&i===to))};
    const up=()=>{h.onpointermove=null;h.onpointerup=h.onpointercancel=null;row.style.transform='';row.classList.remove('dragging');rows.forEach(r=>r.classList.remove('dropat'));
      if(to===from)return;const sid=S.courtSid,lv=norm(clone(S.live[sid])),a=arrivals(lv),ts=a.map(p=>lv.checkin[p]),[m]=a.splice(from,1);a.splice(to,0,m);a.forEach((p,i)=>lv.checkin[p]=ts[i]);
      toast(`${who(sid,m).name} moved to ${to+1}.`);saveLive(sid,lv)};
    h.onpointermove=mv;h.onpointerup=up;h.onpointercancel=up})}
function bindSheet(el){const q=el.querySelector('#sheet-q');if(q)q.oninput=()=>{sheetQ=q.value;const v=q.value.trim().toLowerCase();el.querySelectorAll('#sheet-list .srow').forEach(r=>r.hidden=!!v&&!r.dataset.name.includes(v))};
  if(q&&sheetQ)q.oninput();
  el.querySelectorAll('[data-paysel]').forEach(x=>x.onchange=async()=>{const sid=S.courtSid,pid=x.dataset.paysel,v=x.value,by=window.BAD_USER?.email||'',at=new Date().toISOString();
    try{if(pid.startsWith('w~')){const lv=norm(clone(S.live[sid]));lv.wpay={...(lv.wpay||{})};if(!v)delete lv.wpay[pid];else lv.wpay[pid]=v==='free'?{waived:true,at,by}:{method:v,at,by};await saveLive(sid,lv)}
      else await setPayment(pid,sid,!v?null:v==='free'?{ok:true,waived:true,at,by}:{ok:true,method:v,at,by});
      toast(v?(v==='free'?'Marked free.':'Marked paid.'):'Marked not paid.')}catch(e){toast("Sorry, that didn't save.")}})}
function bindCourts(el){if(!(queueOff(S.courtSport)&&S.cTab==='board'))enableDrag(el);arrDrag(el);bindSheet(el);if(typeof mbBind==='function')mbBind(el);el.querySelectorAll('[data-ctab]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();S.cTab=b.dataset.ctab;msel=null;renderCourts()});el.onclick=async ev=>{if(el._skipClick&&ev.isTrusted!==false&&ev.type==='click'){el._skipClick=false;return}
  const b=ev.target.closest('[data-act]');if(!b)return;const act=b.dataset.act,sid=S.courtSid;
  if(act==='sport'){S.courtSport=b.dataset.v;S.courtSid=null;sel=null;pendingDone=null;return renderCourts()}
  if(act==='goadmin'){aTab='sessions';showNew=true;newSport=S.courtSport;return setView('admin')}
  if(act==='qsgo'){const sp=S.courtSport,date=todayIso(),title=($('qs-title').value||'').trim()||defaultTitle(sp),id=slug(title).slice(0,24)+'-'+date;
    const d={sport:sp,date,start:$('qs-start').value||'19:00',end:$('qs-end').value||'21:00',timeTbc:false,title,fee:Number($('qs-fee').value)||0,capacity:Number($('qs-cap').value)||20,waitCap:null,courts:COURT_SPORTS.includes(sp)?Math.max(1,Number($('qs-courts')?.value)||1):null,venue:($('qs-venue').value||'').trim(),opens:''};
    try{await S.db.doc('sessions/'+id).set(d);S.sessions[id]=d;S.courtSid=id;toast(`${title} is on. Players can sign up in Play, and you can check people in here.`);S.courtStep=1;return startBoard(id)}catch(e){toast("Sorry, that didn't save.")}return}
  if(act==='rest'||act==='more'){return setFlag(sid,act,b.dataset.v==='1')}
  if(act==='pick'){S.courtSid=b.dataset.sid;setTimeout(courtSubs,0);sel=null;pendingDone=null;return renderCourts()}
  if(act==='as'){S.asPlayer=b.dataset.v==='1';sel=null;return renderCourts()}
  if(act==='step'){S.courtStep=+b.dataset.n;sel=null;pendingDone=null;window.scrollTo(0,0);return renderCourts()}
  if(act==='myscore'||act==='final'){const gid=b.dataset.gid,a=$('ga-'+gid).value,bb=$('gb-'+gid).value;if(a===''||bb===''){toast('Please enter both scores.');return}
    const v=[Number(a),Number(bb)];
    try{if(act==='final')await S.db.doc('games/'+gid).update({final:v});else{const cur=S.scores[S.uid]?.g||{};await S.db.doc('scores/'+S.uid).set({g:{...cur,[gid]:v}})}toast('Score saved. Thank you.')}catch(e){toast("Sorry, the score didn't save.")}return}
  if(!courtEd(sid))return;
  if(act==='start'){try{const x=await S.db.doc('live/'+sid).get();if(x.exists){S.live[sid]=x.data();S.courtStep=2;courtSubs();toast('This board was already open. Your check-ins and games are back.');return renderCourts()}}catch(_){}
    S.courtStep=1;return startBoard(sid)}
  if(act==='cap'||act==='wcap'||act==='extend'){const ss=S.sessions[sid];if(!(S.canEdit&&canSport(ss.sport||'badminton'))){toast('Only admins can change this.');return}
    if(act==='cap'){const n=Math.max(2,(Number(ss.capacity)||20)+Number(b.dataset.v));return sessUpdate(sid,{capacity:n},`Player cap is ${n}.${Number(b.dataset.v)>0&&roster(sid).wait.length?' The next person on the waiting list is in.':''}`)}
    if(act==='wcap'){const cur=ss.waitCap==null||ss.waitCap===''?roster(sid).wait.length:Number(ss.waitCap),n=Math.max(0,cur+Number(b.dataset.v));return sessUpdate(sid,{waitCap:n},`Waiting list holds ${n}.`)}
    const e=addMins(ss.end||'22:00',Number(b.dataset.v));return sessUpdate(sid,{end:e},`Session now ends at ${fmtTime(e)}.`)}
  const lv=norm(clone(S.live[sid])),arr=k=>k==='w'?lv.waiting:lv.courts,sp=S.sessions[sid].sport||'badminton';
  if(act==='bench'){sel=sel===b.dataset.pid?null:b.dataset.pid;return renderCourts()}
  if(act==='qr')return showQR(sid);
  if(act==='orest'){lv.rest=lv.rest||{};lv.ft=lv.ft||{};lv.rest[sel]=!lv.rest[sel];lv.ft[sel]=new Date().toISOString();sel=null;return saveLive(sid,lv)}
  if(act==='ci'){const p=b.dataset.pid;setBase(sid,lv,p);lv.checkin[p]=new Date().toISOString();lv.seen={...(lv.seen||{}),[p]:who(sid,p).name};toast(`${who(sid,p).name} checked in · #${Object.keys(lv.checkin).length}`);return saveLive(sid,lv)}
  if(act==='unci'){const p=b.dataset.pid;delete lv.checkin[p];delete lv.avail[p];detach(lv,p);return saveLive(sid,lv)}
  if(act==='order'){lv.order=b.dataset.v;return saveLive(sid,lv)}
  if(act==='unsel'){sel=null;return renderCourts()}
  if(act==='undo'||act==='redo')return undoRedo(sid,act);
  if(act==='savenow'){saveLive(sid,lv,{noHist:true});S.lastManual=Date.now();return}
  if(act==='finishask'){finishAsk=+b.dataset.c;return renderCourts()}
  if(act==='finishno'){finishAsk=null;return renderCourts()}
  if(act==='pause'){const c=lv.courts[+b.dataset.c];if(c.st!=='playing')return;c.st='paused';c.pAt=new Date().toISOString();toast(`${c.name} is paused. The timer has stopped.`);return saveLive(sid,lv)}
  if(act==='resume'){const c=lv.courts[+b.dataset.c];if(c.st!=='paused')return;c.pausedMs=(c.pausedMs||0)+Math.max(0,Date.now()-msOf(c.pAt));delete c.pAt;c.st='playing';toast(`${c.name} is back on.`);return saveLive(sid,lv)}
  if(act==='close'){const c=lv.courts[+b.dataset.c];c.closed=!c.closed;toast(c.closed?`${c.name} is closed. No games go on it until you reopen it.`:`${c.name} is open again.`);return saveLive(sid,lv)}
  if(act==='repair'){const c=lv.courts[+b.dataset.c];const four=c.on.filter(Boolean);if(four.length!==4)return;
    const opts=[[0,1,2,3],[0,2,1,3],[0,3,1,2]],cur=opts.findIndex(o=>o.every((k,j)=>c.on[j]===four[k])),nx=opts[(cur+1)%3];c.on=nx.map(k=>four[k]);
    const t=teamStr(sid,lv,c),bk=beginnerWarn(sid,lv,c);toast(`New pairs${t?` · ${t}`:''}.${bk?' '+bk:''}`);return saveLive(sid,lv)}
  if(act==='cancelask'){cancelAsk=+b.dataset.c;cancelWhy='';return renderCourts()}
  if(act==='cancelno'){cancelAsk=null;return renderCourts()}
  if(act==='cancelwhy'){cancelWhy=b.dataset.v;return renderCourts()}
  if(act==='slot'){const c=arr(b.dataset.k)[+b.dataset.c],i=+b.dataset.i,cur=c.on[i];
    if(inG(c)){toast('This game has started. Finish or cancel it first.');return}
    if(sel){const f=locate(lv,sel);if(f&&f[0]==='c'&&inG(lv.courts[f[1]])){toast('That player is in a game. Finish or cancel it first.');sel=null;return renderCourts()}}
    if(!sel){if(cur){sel=cur;renderCourts()}return}
    if(cur===sel){sel=null;return renderCourts()}
    const from=locate(lv,sel);detach(lv,sel);
    if(cur){detach(lv,cur);if(from)arr(from[0])[from[1]].on[from[2]]=cur}
    c.on[i]=sel;sel=null;return saveLive(sid,lv)}
  if(act==='tobench'){{const f=locate(lv,sel);if(f&&f[0]==='c'&&inG(lv.courts[f[1]])){toast('That player is in a game. Finish or cancel it first.');return}}detach(lv,sel);sel=null;return saveLive(sid,lv)}
  if(act==='out'){{const f=locate(lv,sel);if(f&&f[0]==='c'&&inG(lv.courts[f[1]])){toast('That player is in a game. Finish or cancel it first.');return}}detach(lv,sel);lv.out.push(sel);toast(`${who(sid,sel).name} is marked as left.`);sel=null;return saveLive(sid,lv)}
  if(act==='restore'){lv.out=lv.out.filter(x=>x!==b.dataset.pid);return saveLive(sid,lv)}
  if(act==='memberin'){const u=b.dataset.pid,pp=S.profiles[u];if(!pp)return;
    if(S.canEdit&&canRun(sp)&&!S.bookings[u]?.s?.[sid]){try{await staffBooking(u,sid,()=>freshEntry('cash'),{key:pp.listKey||'',s:(S.bookings[u]||{}).s||{}})}catch(e){toast("Couldn't add them to the session list, but they're checked in.")}}
    setBase(sid,lv,u);lv.checkin[u]=new Date().toISOString();lv.seen={...(lv.seen||{}),[u]:pp.nickname};const wn=$('walk-name');if(wn){wn.value='';wn.blur()}
    toast(`${pp.nickname} is checked in${S.canEdit&&canRun(sp)?' and on the session list':''}.`);return saveLive(sid,lv)}
  if(act==='ciedit'){ciEdit=b.dataset.pid||null;ciRm=false;return renderCourts()}
  if(act==='cirm'){ciRm=true;return renderCourts()}
  if(act==='slotx'){const c=arr(b.dataset.k)[+b.dataset.c],p=c.on[+b.dataset.i];if(!p)return;if(b.dataset.k==='c'&&inG(c)){toast('That court is mid-game. Finish or cancel the game first.');return}
    c.on[+b.dataset.i]=null;if(sel===p)sel=null;toast(`${nm(sid,p)} is back on the bench.`);return saveLive(sid,lv)}
  if(act==='wclear'){lv.waiting[+b.dataset.c].on=lv.waiting[+b.dataset.c].on.map(()=>null);toast('Cleared. They’re back on the bench.');return saveLive(sid,lv)}
  if(act==='wclearall'){lv.waiting.forEach(w=>w.on=w.on.map(()=>null));toast('Waiting area cleared.');return saveLive(sid,lv)}
  if(act==='resetask'){resetAsk=!resetAsk;return renderCourts()}
  if(act==='resetgo'){resetAsk=false;let kept=0;lv.courts.forEach(c=>{if(inG(c)){kept++;return}c.on=c.on.map(()=>null)});lv.waiting.forEach(w=>w.on=w.on.map(()=>null));sel=null;
    toast(kept?`Board reset. ${kept} game${kept>1?'s':''} still playing, left as is.`:'Board reset. Everyone is on the bench.');return saveLive(sid,lv)}
  if(act==='endask'){endAsk=!endAsk;endNS=true;return renderCourts()}
  if(act==='endgo'){const m=$('end-ns')?$('end-ns').checked:false;endAsk=false;return endSession(sid,m)}
  if(act==='reopen'){delete lv.ended;try{if(canSport(sp))await S.db.doc('sessions/'+sid).update({ended:false})}catch(_){}toast('Session reopened.');return saveLive(sid,lv)}
  if(act==='cix'){{const f=locate(lv,b.dataset.pid);if(f&&f[0]==='c'&&inG(lv.courts[f[1]])){toast('That player is in a game. Finish or cancel it first.');return}}ciEdit=b.dataset.pid;ciRm=true;return renderCourts()}
  if(act==='cishuf'){ciShuf=!ciShuf;return renderCourts()}
  if(act==='ciup'||act==='cidown'){const a=arrivals(lv),i=a.indexOf(b.dataset.pid),j=act==='ciup'?i-1:i+1;if(i<0||j<0||j>=a.length)return;
    const t=lv.checkin[a[i]];lv.checkin[a[i]]=lv.checkin[a[j]];lv.checkin[a[j]]=t;return saveLive(sid,lv)}
  if(act==='cishufgo'){ciShuf=false;const a=arrivals(lv).filter(p=>!locate(lv,p)),ts=a.map(p=>lv.checkin[p]);
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}a.forEach((p,i)=>lv.checkin[p]=ts[i]);toast('Arrival order reshuffled. Undo brings it back.');return saveLive(sid,lv)}
  if(act==='cirmno'){ciRm=false;return renderCourts()}
  if(act==='cirename'){const p=b.dataset.pid,n=($('ci-nm')||{}).value.trim().slice(0,24);if(!n){toast('Please type a name.');return}
    if(p.startsWith('w~')){const w=lv.walkins.find(x=>'w~'+x.id===p);if(w)w.name=n}else lv.names={...(lv.names||{}),[p]:n};
    ciEdit=null;toast(`Saved as ${n}.`);return saveLive(sid,lv)}
  if(act==='cirmgo'){const p=b.dataset.pid,x=who(sid,p),admin=S.canEdit&&canRun(sp);ciEdit=null;ciRm=false;
    if(p.startsWith('w~')){lv.walkins=lv.walkins.filter(w=>'w~'+w.id!==p);delete lv.checkin[p];detach(lv,p);toast(`${x.name} removed.`);return saveLive(sid,lv)}
    if(admin){const charge=b.dataset.charge==='1',f=dropFee(sid);try{if(p.startsWith('g~')){const [,host]=p.split('~'),gs=((S.bookings[host]||{}).s||{})[sid]?.guests||[],gi=gs.findIndex(g=>gpid(host,g.n)===p);if(gi>=0)await staffDrop(host,sid,gi,charge)}
        else await staffDrop(p,sid,'',charge);toast(charge&&f.amount?`${x.name} is off the list. AED ${f.amount} late cancellation added to their payments.`:`${x.name} is off the session list.`)}catch(e){toast("Sorry, that didn't save.")}}
    lv.hide={...(lv.hide||{}),[p]:true};detach(lv,p);delete lv.checkin[p];if(!admin)toast(`${x.name} is hidden from tonight's board.`);return saveLive(sid,lv)}
  if(act==='walkcat'){walkCat=walkCat===b.dataset.v?'':b.dataset.v;document.querySelectorAll('[data-act=walkcat]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.v===walkCat));return}
  if(act==='walk'){const n=$('walk-name').value.trim().slice(0,24);if(!n){toast("Please type the player's name.");return}
    const wid=slug(n)+'-'+Date.now().toString(36),wg=($('walk-g')||{}).value||'U';lv.walkins.push({id:wid,name:n});
    lv.lvl={...(lv.lvl||{}),['w~'+wid]:{g:gradeRow(wg)?wg:'U',cat:CATS[walkCat]?walkCat:null}};walkCat='';setBase(sid,lv,'w~'+wid);lv.checkin['w~'+wid]=new Date().toISOString();lv.seen={...(lv.seen||{}),['w~'+wid]:n};toast(`${n} is checked in.`);return saveLive(sid,lv)}
  if(act==='add'){const k=b.dataset.k,size=(k==='w'&&lv.courts[0]?.size)||SIZES[sp][0][0];
    if(k==='c')lv.courts.push({id:'c'+Date.now().toString(36),name:'Court '+(lv.courts.length+1),size,on:blank(size)});else lv.waiting.push({id:'w'+Date.now().toString(36),size,on:blank(size)});return saveLive(sid,lv)}
  if(act==='wless'){const i=lv.waiting.map(w=>w.on.some(Boolean)).lastIndexOf(false);lv.waiting.splice(i>=0?i:lv.waiting.length-1,1);return saveLive(sid,lv)}
  if(act==='del'){const c=arr(b.dataset.k)[+b.dataset.c];if(inG(c)){toast('Finish or cancel the game on this court first.');return}arr(b.dataset.k).splice(+b.dataset.c,1);return saveLive(sid,lv)}
  if(act==='size'){if(inG(arr(b.dataset.k)[+b.dataset.c])){toast('Finish or cancel the game on this court first.');return}const c=arr(b.dataset.k)[+b.dataset.c],n=+b.dataset.n,on=c.on.filter(Boolean);c.size=n;c.on=blank(n);on.slice(0,n).forEach((p,i)=>c.on[i]=p);
    lv.waiting.forEach(w=>{if(!w.on.some(Boolean)){w.size=n;w.on=blank(n)}});return saveLive(sid,lv)}
  if(act==='fill'){const c=arr(b.dataset.k)[+b.dataset.c];if(inG(c)||c.closed)return;if(!generateInto(sid,lv,c)){toast('Not enough players on the bench.');return}return saveLive(sid,lv)}
  if(act==='fmt'){const c=lv.courts[+b.dataset.c];c.fmt=(c.fmt||suggestFmt(sid,lv))===21?30:21;return saveLive(sid,lv)}
  if(act==='begin'){const c=lv.courts[+b.dataset.c],half=c.size/2;
    if(!c.on.slice(0,half).some(Boolean)||!c.on.slice(half).some(Boolean)){toast('Please put players on both sides first.');return}
    c.st='playing';c.t0=SVT();c.t0dev=new Date().toISOString();if(sp==='badminton')c.fmt=c.fmt||suggestFmt(sid,lv);
    toast(`${c.name} has started${c.fmt?' · to '+c.fmt:''}.`);return saveLive(sid,lv)}
  if(act==='nextin'){const c=lv.courts[+b.dataset.c],nx=lv.waiting[0];if(!c||!nx||!nx.on.some(Boolean))return;c.on=blank(c.size);nx.on.filter(Boolean).slice(0,c.size).forEach((p,i)=>c.on[i]=p);
    lv.waiting.shift();lv.waiting.push({id:'w'+Date.now().toString(36),size:nx.size,on:blank(nx.size)});if(lv.waiting[0]&&!lv.waiting[0].on.some(Boolean))generateInto(sid,lv,lv.waiting[0]);toast(`Next up is on ${c.name}. Tap Start when they're ready.`);return saveLive(sid,lv)}
  if(act==='finish'||act==='cancelgo'){const ci=+b.dataset.c,c=lv.courts[ci],half=c.size/2,a=c.on.slice(0,half).filter(Boolean),bb=c.on.slice(half).filter(Boolean),now=new Date().toISOString();
    cancelAsk=null;
    finishAsk=null;
    if(act==='cancelgo'&&!inG(c)){c.on=blank(c.size);delete c.fmt;toast(`${c.name} is clear.`);return saveLive(sid,lv)}
    const names={};[...a,...bb].forEach(p=>names[p]=who(sid,p).name);
    /* the game record: teams, court, format and both clocks. Finish frees the court; the score comes from the players and Support. */
    const g={v:2,sid,sport:sp,court:c.name,a,b:bb,names,fmt:c.fmt||null,st:act==='finish'?(sp==='badminton'?'review':'played'):'cancelled',start:isFinite(msOf(c.t0))?c.t0:null,startDev:c.t0dev||null,end:SVT(),endDev:now,at:now};
    if(act==='cancelgo'){g.reason=cancelWhy||'Other';g.interrupted=true;g.by=S.uid}
    g.pausedMs=(c.pausedMs||0)+(c.st==='paused'?Math.max(0,Date.now()-msOf(c.pAt)):0);
    const gid=sid+'-'+Date.now().toString(36);
    try{await S.db.doc('games/'+gid).set(g)}catch(e){toast("Sorry, the game didn't save. Please try again.");return}
    S.gSess[gid]={...g,start:g.start||null,end:null};mergeGames();   /* count it now, before the next lineup is picked */
    if(act==='finish')[...a,...bb].forEach(p=>lv.avail[p]=now);      /* cancelled: they keep their place in line */
    c.on=blank(c.size);delete c.st;delete c.t0;delete c.t0dev;delete c.fmt;delete c.pausedMs;delete c.pAt;cancelWhy='';
    /* bring on the next prepared lineup, or generate one straight onto the free court */
    const nx=lv.waiting[0];let msg;
    if(c.closed)msg=`${c.name} is closed.`;
    else if(nx&&nx.on.some(Boolean)){if(nx.size===c.size)c.on=[...nx.on];else nx.on.filter(Boolean).slice(0,c.size).forEach((p,i)=>c.on[i]=p);
      lv.waiting.shift();lv.waiting.push({id:'w'+Date.now().toString(36),size:nx.size,on:blank(nx.size)});msg=`Next up is on ${c.name}.`}
    else msg=generateInto(sid,lv,c)?`Next four are on ${c.name}.`:`${c.name} is free.`;
    /* keep Next up prepared so players can see who's coming */
    if(lv.waiting[0]&&!lv.waiting[0].on.some(Boolean))generateInto(sid,lv,lv.waiting[0]);
    toast((act==='finish'?'Game finished. ':'Game cancelled. ')+msg);
    return saveLive(sid,lv,{gid,game:g})}
}}

/* ---------- board: points or club rank ---------- */
S.boardMode='points';
function renderBoard(){
  if(queueOff('badminton')&&S.boardMode==='rank')S.boardMode='points';
  const f=S.sport,mode=S.boardMode;
  if(mode==='rank'&&!S.gAll)allGamesLoad();
  const toggle=`<div class="chips"><button class="chip" data-bm="points" aria-pressed="${mode==='points'}">${ic('coin')}Points</button>${queueOff('badminton')?'':`<button class="chip" data-bm="rank" aria-pressed="${mode==='rank'}">${ic('board')}Rank</button>`}</div>`;
  let body;
  if(mode==='rank'){const rows=rankRows(f);
    body=rows.map((r,i)=>{const p=S.profiles[r.pid];return `<div class="li" style="grid-template-columns:auto auto minmax(0,1fr) auto"><span class="rank num">${i+1}</span>${avatar(p)}<div><div class="nm">${esc(p.nickname)}</div><div class="sub num">${r.w} won · ${r.g-r.w} lost · ${r.d>0?'+':''}${r.d} points</div></div><b class="num">${Math.round(r.w/r.g*100)}%</b></div>`}).join('')||`<div class="empty">${ic('board')}<span>Rank appears once games have scores. Add yours on the Courts tab.</span></div>`;
  }else{const rows=Object.entries(S.profiles).filter(([,p])=>f==='all'||(p.sports||['badminton']).includes(f)).map(([uid,p])=>({p,uid,st:statsFor(p.listKey),fd:isFounder(uid)})).sort((a,b)=>(a.fd-b.fd)||b.st.earned-a.st.earned||a.p.nickname.localeCompare(b.p.nickname));let rk=0;/* players first, founders always at the bottom */
    body=rows.map((r,i)=>`${r.fd&&(i===0||!rows[i-1].fd)?'<div class="sec-h fdiv"><span class="label">Founders</span></div>':''}<div class="li" style="grid-template-columns:auto auto minmax(0,1fr) auto"><span class="rank num">${r.fd?'':++rk}</span>${avatar(r.p)}
      <div><div class="nm">${esc(r.p.nickname)} ${r.uid&&levelIdx(r.uid)>=1?`<span class="tagl">${esc(levelFor(r.uid,badgeCount(r.uid)).k)}</span>`:''}${r.p.sample?' <span class="tagl">Sample</span>':''}</div><div class="sub ic-row" style="gap:6px">${(r.p.sports||['badminton']).map(s=>ic(SPORTS[s]?.icon||'badminton')).join('')}<span>${esc(typeOf(r.p)||'Player')}${r.st.sessions?` · ${r.st.sessions} session${r.st.sessions===1?'':'s'}`:''}</span></div></div>
      <b class="num">${r.fd?'<span class="inf">∞</span>':r.st.earned}</b></div>`).join('')||`<div class="empty">${ic('board')}<span>No one on the board yet. You could be first.</span></div>`}
  $('v-board').innerHTML=`${courtSwitch('board')}<div class="hero"><span class="label">Board</span><h2>The BAD board.</h2><p class="fine">${mode==='rank'?'Wins from scored games. A light competition, all in good fun.':'Lifetime points from registered members.'}</p></div>${toggle}${sportBar(f,'bf',mode==='rank'?COURT_SPORTS:PLAYABLE)}<div class="list">${body}</div>`;
  bindSwitch($('v-board'));
  document.querySelectorAll('[data-bf]').forEach(b=>b.onclick=()=>{S.sport=b.dataset.bf;renderBoard()});
  document.querySelectorAll('[data-bm]').forEach(b=>b.onclick=()=>{S.boardMode=b.dataset.bm;renderBoard()});
}
