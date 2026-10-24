/* ---------- Courts: live board for badminton, volleyball, pickleball, basketball ---------- */
/* Admins place every player. Flow: Bench (fewest games first) → Waiting courts → Courts → Game done → back to Bench. */
const COURT_SPORTS=['badminton','volleyball','pickleball','basketball'];
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
S.live={};S.games={};S.scores={};S.courtSid=null;let sel=null,liveQ=Promise.resolve();

const gpid=(uid,name)=>`g~${uid}~${slug(name)}`;
function people(sid){
  const m={},r=roster(sid);
  for(const e of [...r.in,...r.wait]){
    if(e.guest)m[gpid(e.uid,e.guest)]={name:e.guest,guestOf:e.uid};
    else{const p=S.profiles[e.uid];m[e.uid]={name:p?.nickname||S.bookings[e.uid]?.name||allKeys()[e.key]||e.key||'Player',p,uid:e.uid}}
  }
  for(const w of (S.live[sid]?.walkins||[]))m['w~'+w.id]={name:w.name,walk:true};
  return m;
}
function who(sid,pid){const m=people(sid);if(m[pid])return m[pid];const p=S.profiles[pid];if(p)return{name:p.nickname,p,uid:pid};
  for(const g of Object.values(S.games))if(g.names&&g.names[pid])return{name:g.names[pid]};return{name:'Player'}}
function pav(sid,pid){const x=who(sid,pid);return x.p?avatar(x.p):avatar(null,x.name)}
const sessGames=sid=>Object.entries(S.games).filter(([,g])=>g.sid===sid).sort((a,b)=>(a[1].at||'').localeCompare(b[1].at||''));
const gamesFor=(sid,pid)=>sessGames(sid).filter(([,g])=>[...g.a,...g.b].includes(pid)).length;

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
const courtEd=sid=>(S.canEdit&&canSport(S.courtSport))||isGM(sid);
function courtSessions(){
  const now=Date.now();
  return Object.entries(S.sessions).filter(([sid,s])=>(s.sport||'badminton')===S.courtSport&&(S.live[sid]?sessStart(s)>now-18*36e5:((S.canEdit||isGM(sid))?sessStart(s)>now-12*36e5&&sessStart(s)<now+7*864e5:Math.abs(sessStart(s)-now)<12*36e5)))
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
  return Object.keys(lv.checkin).filter(x=>!p.has(x)&&!out.has(x)).map(x=>({x,t:lv.avail[x]||lv.checkin[x],c:lv.checkin[x],g:gamesFor(sid,x)}))
    .sort((a,b)=>(!!(lv.rest||{})[a.x]-!!(lv.rest||{})[b.x])||(lv.catchup?(a.g-b.g||a.t.localeCompare(b.t)):a.t.localeCompare(b.t))).map(o=>o.x)}
const isRest=(lv,p)=>!!(lv.rest||{})[p];
function detach(lv,pid){for(const c of [...lv.courts,...lv.waiting])c.on=c.on.map(x=>x===pid?null:x);lv.out=lv.out.filter(x=>x!==pid)}
function locate(lv,pid){for(const [k,arr] of [['c',lv.courts],['w',lv.waiting]])for(let ci=0;ci<arr.length;ci++){const i=arr[ci].on.indexOf(pid);if(i>=0)return[k,ci,i]}return null}
const blank=(size)=>Array(size).fill(null);
function saveLive(sid,lv){lv.updatedAt=new Date().toISOString();S.live[sid]=lv;renderCourts();
  liveQ=liveQ.then(()=>S.db.doc('live/'+sid).set(lv)).catch(()=>toast("Sorry, the court board didn't save. Please try again."))}
function startBoard(sid){const sp=S.sessions[sid].sport||'badminton',size=SIZES[sp][0][0];
  saveLive(sid,{courts:Array.from({length:DEF_COURTS[sp]},(_,i)=>({id:'c'+(i+1),name:'Court '+(i+1),size,on:blank(size)})),waiting:[{id:'w1',size,on:blank(size)},{id:'w2',size,on:blank(size)}],walkins:[],out:[],checkin:{},avail:{},order:'arrival'});
  toast('Court board is open. Next, check players in as they arrive.')}

/* ---------- render ---------- */
S.courtStep=3;S.asPlayer=false;let pendingDone=null;
const nm=(sid,pid)=>pid===S.uid?'You':who(sid,pid).name;
function pl(sid,pid,o={}){ /* one player token: photo + name (+ games) */
  const tag=o.act?'button':'span',me=pid===S.uid;
  return `<${tag} class="pl${sel===pid?' sel':''}${me?' me':''}" ${o.act?`data-act="${o.act}" ${o.data||''}`:''}>${o.n!=null?`<span class="qn num">${o.n}</span>`:''}${pav(sid,pid)}<span class="pn">${esc(nm(sid,pid))}</span>${o.games?`<span class="fine num">${gamesFor(sid,pid)} played${S.canEdit&&!S.asPlayer&&lvlTag(pid,S.sessions[sid]?.sport||'badminton')?' · '+lvlTag(pid,S.sessions[sid]?.sport||'badminton'):''}</span>`:''}${o.lv&&isRest(o.lv,pid)?'<span class="flag">Resting</span>':o.lv&&(o.lv.more||{})[pid]?'<span class="flag">+ games</span>':''}</${tag}>`}
function spot(o={}){return o.act?`<button class="pl" data-act="${o.act}" ${o.data||''} aria-label="Open spot"><span class="slot">${ic('plus')}</span></button>`:`<span class="pl"><span class="slot"></span></span>`}
function sideHTML(sid,c,k,ci,from,to,edit){let h='';for(let i=from;i<to;i++){const pid=c.on[i],d=`data-k="${k}" data-c="${ci}" data-i="${i}"`;h+=pid?pl(sid,pid,{act:edit?'slot':null,data:d,games:edit,lv:S.live[sid]}):spot({act:edit?'slot':null,data:d})}return h}
function courtCard(sid,c,ci,edit){
  const sp=S.sessions[sid].sport||'badminton',half=c.size/2,full=c.on.filter(Boolean).length,gno=sessGames(sid).filter(([,g])=>g.court===c.name).length+1;
  let foot='';
  if(edit){foot=pendingDone===ci
    ?`<div class="confirm"><b>Final score?</b><div class="row" style="gap:6px"><span class="fine">Left</span><input type="number" min="0" id="sa-${ci}" class="sc" value="${c.score&&(c.score[0]||c.score[1])?c.score[0]:''}" aria-label="Score, left team"><span class="muted">–</span><input type="number" min="0" id="sb-${ci}" class="sc" value="${c.score&&(c.score[0]||c.score[1])?c.score[1]:''}" aria-label="Score, right team"><span class="fine">Right</span></div>
      <div class="row" style="gap:6px"><button class="btn sm" data-act="done" data-c="${ci}">${ic('check')}Save game</button><button class="btn ghost sm" data-act="done" data-c="${ci}" data-noscore="1">Skip score</button><button class="btn ghost sm" data-act="nodone">Back</button></div></div>`
    :`<div class="row" style="justify-content:flex-end;gap:6px">${full<c.size?`<button class="btn ghost sm" data-act="fill" data-k="c" data-c="${ci}">Auto-fill</button>`:''}<button class="btn sm" data-act="askdone" data-c="${ci}" ${full<2?'disabled':''}>${ic('check')}Game done</button></div>`}
  const sc=c.score||[0,0],live=full>=2;
  const board=live?(edit?`<div class="scoreboard" aria-label="Live score">${[0,1].map(t=>`<div class="sb-side"><button class="sbb" data-act="pt" data-c="${ci}" data-t="${t}" data-d="-1" aria-label="Minus one, ${t?'right':'left'} team">−</button><b class="num">${sc[t]}</b><button class="sbb plus" data-act="pt" data-c="${ci}" data-t="${t}" data-d="1" aria-label="Plus one, ${t?'right':'left'} team">+</button></div>`).join('<span class="sb-mid">–</span>')}</div>`
    :(sc[0]||sc[1]?`<div class="scoreboard ro"><b class="num">${sc[0]}</b><span class="sb-mid">–</span><b class="num">${sc[1]}</b></div>`:'')):'';
  return `<article class="court"><div class="court-h"><b>${esc(c.name)}</b><span class="tagl${full?' solid':''}">${full?'Game '+gno:'Free'}</span></div>
    <div class="court-body ${sp}">${MARK[sp]||''}<div class="half">${sideHTML(sid,c,'c',ci,0,half,edit)}</div><div class="net"><span>${MIDLINE[sp]||'NET'}</span></div><div class="half">${sideHTML(sid,c,'c',ci,half,c.size,edit)}</div></div>${board}${foot}</article>`;
}
function waitRow(sid,w,wi,edit){
  const half=w.size/2,full=w.on.filter(Boolean).length;
  return `<article class="wait"><div class="court-h"><span class="ic-row"><span class="qn num" style="position:static">${wi+1}</span><b>${wi===0?'Next up':'Then'}</b></span>${edit&&full<w.size?`<button class="btn ghost sm" data-act="fill" data-k="w" data-c="${wi}">Auto-fill</button>`:''}</div>
    <div class="mini"><div class="half">${sideHTML(sid,w,'w',wi,0,half,edit)}</div><span class="vs">vs</span><div class="half">${sideHTML(sid,w,'w',wi,half,w.size,edit)}</div></div></article>`;
}
function levelPick(uid,sp){const own=ownLevel(uid,sp),o=S.levels[uid],ov=o&&o.levels?o.levels[sp]:(o?o.level:null);
  return `<label class="lvl"><span class="fine">Level</span><select data-lvl="${esc(uid)}" data-sp="${sp}"><option value="">${own!=null?'Their own: '+LEVELS[own]:'Not set'}</option>${LEVELS.map((l,i)=>`<option value="${i}" ${ov===i?'selected':''}>${l}</option>`).join('')}</select></label>`}
function stepper(){const st=[['Set up','Courts'],['Check in','Who has arrived'],['Games','Place and log'],['Wrap up','Scores, sheet']];
  return `<div class="stepper">${st.map(([t,d],i)=>`<button data-act="step" data-n="${i+1}" aria-current="${S.courtStep===i+1?'step':'false'}"><span class="qn num" style="position:static">${i+1}</span><span><b>${t}</b><span class="fine">${d}</span></span></button>`).join('')}</div>`}

function renderCourts(){
  const el=$('v-courts');if(!el||S.view!=='courts')return;
  const me=myProfile();
  if(!S.courtSport){const liveS=Object.keys(S.live).map(k=>S.sessions[k]).filter(Boolean).find(x=>sessStart(x)>Date.now()-18*36e5);S.courtSport=(liveS&&liveS.sport)||(me&&COURT_SPORTS.find(k=>(me.sports||[]).includes(k)))||'badminton'}
  const list=courtSessions();
  const sportChips=`<div class="sports">${COURT_SPORTS.map(k=>`<button class="sp" data-act="sport" data-v="${k}" aria-pressed="${k===S.courtSport}">${ic(SPORTS[k].icon)}${SPORTS[k].club}</button>`).join('')}</div>`;
  if(!list.find(([sid])=>sid===S.courtSid))S.courtSid=(list.find(([sid])=>S.live[sid])||list[0]||[null])[0];
  const sid=S.courtSid,s=sid&&S.sessions[sid],lv0=sid&&S.live[sid];
  const ED=courtEd(sid),org=ED&&!S.asPlayer;document.body.classList.toggle('wide',org);
  const pick=list.length>1?`<div class="sports">${list.map(([id,x])=>{const d=dParts(x.date);return `<button class="sp" data-act="pick" data-sid="${id}" aria-pressed="${id===sid}">${ic(sportOf(x.sport).icon)}${esc(x.title)} · ${d.w} ${d.d}${S.live[id]?' ●':''}</button>`}).join('')}</div>`:'';
  const viewToggle=ED?`<div class="chips"><button class="chip sm" data-act="as" data-v="0" aria-pressed="${!S.asPlayer}">${ic('admin')}Admin</button><button class="chip sm" data-act="as" data-v="1" aria-pressed="${S.asPlayer}">${ic('eye')}Player view</button></div>`:'';
  const head=`${sportChips}<div class="row" style="justify-content:space-between;align-items:flex-end"><div class="hero" style="gap:4px"><span class="label">${esc(SPORTS[S.courtSport].club)} · Courts</span><h2>${s?esc(s.title):esc(SPORTS[S.courtSport].sport)}</h2></div>${viewToggle}</div>${pick}`;
  if(!sid){const nxt=Object.values(S.sessions).filter(x=>(x.sport||'badminton')===S.courtSport&&sessStart(x)>Date.now()).sort((a,b)=>sessStart(a)-sessStart(b))[0];
    el.innerHTML=head+`<div class="empty">${ic(SPORTS[S.courtSport].icon)}<span>${nxt?`Next ${esc(SPORTS[S.courtSport].club)} session: ${esc(nxt.title)}, ${dParts(nxt.date).w} ${dParts(nxt.date).d} ${dParts(nxt.date).m}. Courts open on the day.`:`No ${esc(SPORTS[S.courtSport].club)} session scheduled yet.`}</span>${S.canEdit&&!nxt?`<button class="btn ghost sm" data-act="goadmin">${ic('plus')}Add a session</button>`:''}</div>`;bindCourts(el);return}
  if(!lv0){el.innerHTML=head+`<div class="empty">${ic(sportOf(s.sport).icon)}<span>${org?`${Object.keys(people(sid)).length} players are signed up. Open the board when you're at the venue.`:'Courts appear here once the session starts.'}</span>${org?`<button class="btn" data-act="start">${ic('plus')}Open the court board</button>`:''}</div>`;bindCourts(el);return}
  const lv=norm(clone(lv0)),ppl=people(sid),bench=benchOf(sid,lv),meId=S.uid,loc=locate(lv,meId);
  /* ---------- public view: straight to the point ---------- */
  if(!org){
    const pend=!lv.checkin[meId]&&S.myCI?.[sid],inn=lv.checkin[meId],st=pend?['Checking you in…','Scan received. It confirms in a moment.']:loc&&loc[0]==='c'?['On '+lv.courts[loc[1]].name,'Enjoy the game.']:loc?[loc[1]===0?'You’re next':'Up in '+(loc[1]+1),loc[1]===0?'Get ready.':'Hang tight.']:inn&&!lv.out.includes(meId)?['On the bench','#'+(bench.indexOf(meId)+1)+' in line · checked in '+hhmm(inn)]:ppl[meId]?['Not checked in','Please check in with an admin when you arrive.']:null;
    const myGames=sessGames(sid).filter(([,g])=>[...g.a,...g.b].includes(meId));
    const benchMe=inn&&!loc&&!lv.out.includes(meId),rest=isRest(lv,meId),more=(lv.more||{})[meId];
    const todo=sessGames(sid).filter(([gid,g])=>[...g.a,...g.b].includes(meId)&&!g.final&&!S.scores[meId]?.g?.[gid]).slice(-1)[0];
    el.innerHTML=head+`${todo?`<div class="tile prompt"><span class="label">${ic('star')} Add your score</span>${gameRow(sid,todo[0],todo[1],0,true,true)}</div>`:''}${st?`<div class="tile you"><span class="label">You</span><b class="big">${esc(rest&&benchMe?'Sitting out':st[0])}</b><span class="fine">${esc(rest&&benchMe?'Tap Ready when you want back in. You keep your place.':st[1])}</span>
      ${inn&&!lv.out.includes(meId)?`<div class="row" style="gap:6px;margin-top:6px"><button class="btn sm ${rest?'':'ghost'} inv" data-act="rest" data-v="${rest?0:1}">${rest?ic('play')+'Ready to play':ic('clock')+'Sit out a game'}</button><button class="btn sm ghost inv" data-act="more" data-v="${more?0:1}" aria-pressed="${!!more}">${ic('plus')}${more?'Up for extra: on':'Up for extra games'}</button></div>`:''}</div>`:''}
      <div class="split"><div class="main"><div class="courts">${lv.courts.map((c,i)=>courtCard(sid,c,i,false)).join('')}</div></div><aside class="side">
      ${lv.waiting.some(w=>w.on.some(Boolean))?`<div class="sec"><span class="label">Next</span><div class="waits">${lv.waiting.map((w,i)=>w.on.some(Boolean)?waitRow(sid,w,i,false):'').join('')}</div></div>`:''}
      ${bench.length?`<div class="sec"><span class="label">Bench</span><div class="bench">${bench.map((p,i)=>pl(sid,p,{n:i+1,lv})).join('')}</div></div>`:''}
      <p class="fine">Games go in order of arrival. Arriving late may mean fewer games.</p>
      ${myGames.length?`<div class="sec"><span class="label">Your games · ${myGames.length}</span><div class="list">${myGames.map(([gid,g],i)=>gameRow(sid,gid,g,i,true)).join('')}</div></div>`:''}</aside></div>`;
    bindCourts(el);return;
  }
  /* ---------- admin view: step by step ---------- */
  let body='';
  if(S.courtStep===1){
    const sp=s.sport||'badminton';
    body=`<div class="tile"><div class="sec-h"><b>${ic('court')} Courts</b><button class="btn ghost sm" data-act="add" data-k="c">${ic('plus')}Add court</button></div>
      <div class="list">${lv.courts.map((c,i)=>`<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">${esc(c.name)}</div><div class="chips" style="margin-top:6px">${SIZES[sp].map(([n,l])=>`<button class="chip sm" data-act="size" data-k="c" data-c="${i}" data-n="${n}" aria-pressed="${c.size===n}">${l}</button>`).join('')}</div></div>${lv.courts.length>1&&!c.on.some(Boolean)?`<button class="btn ghost sm" data-act="del" data-k="c" data-c="${i}">${ic('x')}</button>`:''}</div>`).join('')}</div></div>
      <div class="tile"><div class="sec-h"><b>${ic('clock')} Waiting area</b><div class="row" style="gap:6px"><button class="btn ghost sm" data-act="wless" ${lv.waiting.length<2?'disabled':''} aria-label="Fewer waiting groups">−</button><b class="num">${lv.waiting.length}</b><button class="btn ghost sm" data-act="add" data-k="w" aria-label="More waiting groups">+</button></div></div>
        <p class="fine">Groups lined up to go on next. When a game ends, the first group moves onto that court.</p></div>
      <div class="tile"><b>${ic('users')} How the bench works</b>
        <p class="fine">First come, first served: players are called in the order they checked in, and go to the back after each game. Late arrivals join at the back. Players can sit out a game and keep their place. Use Catch-up during games to call the players with the fewest games first.</p></div>
      <button class="btn wide" data-act="step" data-n="2">Next: check players in ${ic('arrow')}</button>`;
  }else if(S.courtStep===2){
    const arr=arrivals(lv),notYet=Object.keys(ppl).filter(p=>!lv.checkin[p]).sort((a,b)=>who(sid,a).name.localeCompare(who(sid,b).name));
    body=`<div class="split eq"><div class="tile"><div class="sec-h"><b>${ic('check')} Check in</b><span class="fine num">${arr.length} of ${Object.keys(ppl).length} here</span></div>
        <button class="btn wide" data-act="qr">${ic('eye')}Show check-in QR code</button>
        <p class="fine">Players scan the code when they arrive. You can also check people in by name below, for guests or anyone without their phone.</p>
        <input type="text" id="ci-find" placeholder="Find a player" autocomplete="off">
        <div class="list" id="ci-list">${notYet.map(p=>`<div class="li ci" data-name="${esc(who(sid,p).name.toLowerCase())}" style="grid-template-columns:auto minmax(0,1fr) auto">${pav(sid,p)}<div><div class="nm">${esc(who(sid,p).name)}</div><div class="sub">${who(sid,p).guestOf?'Guest of '+esc(who(sid,who(sid,p).guestOf).name):'Signed up'}</div></div><button class="btn sm ghost" data-act="ci" data-pid="${esc(p)}">${ic('check')}Check in</button></div>`).join('')||'<span class="fine">Everyone signed up has arrived.</span>'}</div>
        <div class="row"><input type="text" id="walk-name" maxlength="24" placeholder="Walk-in player's name" style="flex:1;min-width:160px"><button class="btn ghost sm" data-act="walk">${ic('guest')}Add and check in</button></div></div>
      <div class="tile"><b>${ic('clock')} Arrived · in order</b><div class="list">${arr.map((p,i)=>`<div class="li" style="grid-template-columns:auto auto minmax(0,1fr) auto"><span class="rank num">${i+1}</span>${pav(sid,p)}<div><div class="nm">${esc(who(sid,p).name)}</div><div class="sub num">${hhmm(lv.checkin[p])}${lv.out.includes(p)?' · left':''}${isRest(lv,p)?' · resting':''}</div>${S.profiles[p]?levelPick(p,s.sport||'badminton'):''}</div>${lv.out.includes(p)?`<button class="btn ghost sm" data-act="restore" data-pid="${esc(p)}">Back in</button>`:locate(lv,p)?'<span class="fine">Playing</span>':`<button class="btn ghost sm" data-act="unci" data-pid="${esc(p)}">Undo</button>`}</div>`).join('')||'<span class="fine">No one has checked in yet.</span>'}</div></div></div>
      <button class="btn wide" data-act="step" data-n="3">Next: run games ${ic('arrow')}</button>`;
  }else if(S.courtStep===3){
    body=`<p class="hint">${sel?`<b>${esc(who(sid,sel).name)}</b> selected. Tap an open spot or another player to swap.`:'Tap a player, then tap where they should go.'}</p>
      <div class="split"><div class="main"><div class="courts">${lv.courts.map((c,i)=>courtCard(sid,c,i,true)).join('')}</div>
      <div class="sec"><span class="label">Waiting area</span><div class="waits">${lv.waiting.map((w,i)=>waitRow(sid,w,i,true)).join('')}</div></div></div>
      <aside class="side"><div class="sec"><div class="sec-h"><span class="label">Bench · ${lv.catchup?'catch-up: fewest games first':'first come, first served'}</span><button class="chip sm" data-act="catchup" aria-pressed="${!!lv.catchup}">${ic('arrow')}Catch-up</button></div>
        <div class="bench">${bench.map((p,i)=>pl(sid,p,{act:'bench',data:`data-pid="${esc(p)}"`,n:i+1,games:true,lv})).join('')||'<span class="fine">Everyone checked in is placed.</span>'}</div>
        ${Object.keys(ppl).filter(p=>!lv.checkin[p]).length?`<button class="btn ghost sm" data-act="step" data-n="2" style="justify-self:start">${ic('check')}${Object.keys(ppl).filter(p=>!lv.checkin[p]).length} not checked in</button>`:''}</div></aside></div>
      ${sel?`<div class="selbar">${pav(sid,sel)}<b style="flex:1;min-width:90px">${esc(who(sid,sel).name)}</b><div class="row" style="gap:6px">${locate(lv,sel)?`<button class="btn ghost sm" data-act="tobench">To bench</button>`:''}<button class="btn ghost sm" data-act="orest">${isRest(lv,sel)?'Ready':'Rest'}</button><button class="btn ghost sm" data-act="out">Left</button><button class="btn sm" data-act="unsel">${ic('x')}</button></div></div>`:''}`;
  }else{
    const counts=Object.keys(ppl).map(p=>[p,gamesFor(sid,p)]).sort((a,b)=>b[1]-a[1]);
    body=`<div class="tile"><b>${ic('play')} Game log · ${sessGames(sid).length}</b><p class="fine">Confirm or correct scores. Players' own entries show as Reported.</p>
        <div class="list">${sessGames(sid).map(([gid,g],i)=>gameRow(sid,gid,g,i,false)).join('')||'<span class="fine">No games logged yet.</span>'}</div></div>
      <div class="tile"><b>${ic('users')} Games per player</b><div class="list">${counts.map(([p,n])=>`<div class="li" style="grid-template-columns:auto minmax(0,1fr) auto">${pav(sid,p)}<span>${esc(who(sid,p).name)}</span><b class="num">${n}</b></div>`).join('')}</div></div>`;
  }
  el.innerHTML=head+stepper()+body;
  el.querySelectorAll('[data-lvl]').forEach(x=>x.onchange=()=>setLevel(x.dataset.lvl,x.dataset.sp,x.value));
  const fd=$('ci-find');if(fd)fd.oninput=e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll('#ci-list .ci').forEach(r=>r.hidden=q&&!r.dataset.name.includes(q))};
  bindCourts(el);
}
function gameRow(sid,gid,g,i,mine,bare){
  const sc=scoreOf(gid,g),names=t=>t.map(p=>esc(nm(sid,p))).join(' & ');
  const my=S.scores[S.uid]?.g?.[gid],edit=(mine&&!g.final)||(!mine&&S.canEdit&&canSport(g.sport)),v=my||sc?.s||[];
  return `<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">${names(g.a)} <span class="muted">vs</span> ${names(g.b)}</div><div class="sub">${esc(g.court)}${sc?(sc.st==='disputed'?' · Scores differ':sc.st==='confirmed'?' · Confirmed':''):''}</div>
      ${edit?`<div class="row" style="gap:6px;margin-top:6px"><input type="number" min="0" class="sc" id="ga-${gid}" value="${esc(v[0]??'')}" aria-label="Score for ${names(g.a)}"><span class="muted">–</span><input type="number" min="0" class="sc" id="gb-${gid}" value="${esc(v[1]??'')}" aria-label="Score for ${names(g.b)}"><button class="btn ghost sm" data-act="${mine?'myscore':'final'}" data-gid="${gid}">${ic('check')}${mine?'Save':'Confirm'}</button></div>`:''}</div>
    <b class="num big" style="font-size:1.6rem">${sc?sc.s.join('–'):'—'}</b></div>`;
}

/* ---------- actions (placing players is admin-only) ---------- */
function bindCourts(el){el.onclick=async ev=>{
  const b=ev.target.closest('[data-act]');if(!b)return;const act=b.dataset.act,sid=S.courtSid;
  if(act==='sport'){S.courtSport=b.dataset.v;S.courtSid=null;sel=null;pendingDone=null;return renderCourts()}
  if(act==='goadmin'){return setView('admin')}
  if(act==='rest'||act==='more'){return setFlag(sid,act,b.dataset.v==='1')}
  if(act==='pick'){S.courtSid=b.dataset.sid;sel=null;pendingDone=null;return renderCourts()}
  if(act==='as'){S.asPlayer=b.dataset.v==='1';sel=null;return renderCourts()}
  if(act==='step'){S.courtStep=+b.dataset.n;sel=null;pendingDone=null;window.scrollTo(0,0);return renderCourts()}
  if(act==='myscore'||act==='final'){const gid=b.dataset.gid,a=$('ga-'+gid).value,bb=$('gb-'+gid).value;if(a===''||bb===''){toast('Please enter both scores.');return}
    const v=[Number(a),Number(bb)];
    try{if(act==='final')await S.db.doc('games/'+gid).update({final:v});else{const cur=S.scores[S.uid]?.g||{};await S.db.doc('scores/'+S.uid).set({g:{...cur,[gid]:v}})}toast('Score saved. Thank you.')}catch(e){toast("Sorry, the score didn't save.")}return}
  if(!courtEd(sid))return;
  if(act==='start'){S.courtStep=1;return startBoard(sid)}
  const lv=norm(clone(S.live[sid])),arr=k=>k==='w'?lv.waiting:lv.courts,sp=S.sessions[sid].sport||'badminton';
  if(act==='bench'){sel=sel===b.dataset.pid?null:b.dataset.pid;return renderCourts()}
  if(act==='qr')return showQR(sid);
  if(act==='catchup'){lv.catchup=!lv.catchup;toast(lv.catchup?'Catch-up on: fewest games are called first.':'Back to first come, first served.');return saveLive(sid,lv)}
  if(act==='orest'){lv.rest=lv.rest||{};lv.ft=lv.ft||{};lv.rest[sel]=!lv.rest[sel];lv.ft[sel]=new Date().toISOString();sel=null;return saveLive(sid,lv)}
  if(act==='ci'){const p=b.dataset.pid;lv.checkin[p]=new Date().toISOString();toast(`${who(sid,p).name} checked in · #${Object.keys(lv.checkin).length}`);return saveLive(sid,lv)}
  if(act==='unci'){const p=b.dataset.pid;delete lv.checkin[p];delete lv.avail[p];detach(lv,p);return saveLive(sid,lv)}
  if(act==='order'){lv.order=b.dataset.v;return saveLive(sid,lv)}
  if(act==='unsel'){sel=null;return renderCourts()}
  if(act==='pt'){const c=lv.courts[+b.dataset.c],t=+b.dataset.t;c.score=c.score||[0,0];c.score[t]=Math.max(0,c.score[t]+(+b.dataset.d));return saveLive(sid,lv)}
  if(act==='askdone'){pendingDone=+b.dataset.c;return renderCourts()}
  if(act==='nodone'){pendingDone=null;return renderCourts()}
  if(act==='slot'){const c=arr(b.dataset.k)[+b.dataset.c],i=+b.dataset.i,cur=c.on[i];
    if(!sel){if(cur){sel=cur;renderCourts()}return}
    if(cur===sel){sel=null;return renderCourts()}
    const from=locate(lv,sel);detach(lv,sel);
    if(cur){detach(lv,cur);if(from)arr(from[0])[from[1]].on[from[2]]=cur}
    c.on[i]=sel;sel=null;return saveLive(sid,lv)}
  if(act==='tobench'){detach(lv,sel);sel=null;return saveLive(sid,lv)}
  if(act==='out'){detach(lv,sel);lv.out.push(sel);toast(`${who(sid,sel).name} is marked as left.`);sel=null;return saveLive(sid,lv)}
  if(act==='restore'){lv.out=lv.out.filter(x=>x!==b.dataset.pid);return saveLive(sid,lv)}
  if(act==='walk'){const n=$('walk-name').value.trim().slice(0,24);if(!n){toast("Please type the player's name.");return}
    const wid=slug(n)+'-'+Date.now().toString(36);lv.walkins.push({id:wid,name:n});lv.checkin['w~'+wid]=new Date().toISOString();toast(`${n} is checked in.`);return saveLive(sid,lv)}
  if(act==='add'){const k=b.dataset.k,size=(k==='w'&&lv.courts[0]?.size)||SIZES[sp][0][0];
    if(k==='c')lv.courts.push({id:'c'+Date.now().toString(36),name:'Court '+(lv.courts.length+1),size,on:blank(size)});else lv.waiting.push({id:'w'+Date.now().toString(36),size,on:blank(size)});return saveLive(sid,lv)}
  if(act==='wless'){const i=lv.waiting.map(w=>w.on.some(Boolean)).lastIndexOf(false);lv.waiting.splice(i>=0?i:lv.waiting.length-1,1);return saveLive(sid,lv)}
  if(act==='del'){arr(b.dataset.k).splice(+b.dataset.c,1);return saveLive(sid,lv)}
  if(act==='size'){const c=arr(b.dataset.k)[+b.dataset.c],n=+b.dataset.n,on=c.on.filter(Boolean);c.size=n;c.on=blank(n);on.slice(0,n).forEach((p,i)=>c.on[i]=p);
    lv.waiting.forEach(w=>{if(!w.on.some(Boolean)){w.size=n;w.on=blank(n)}});return saveLive(sid,lv)}
  if(act==='fill'){const c=arr(b.dataset.k)[+b.dataset.c],bench=benchOf(sid,lv).filter(p=>!isRest(lv,p));c.on=c.on.map(p=>p||bench.shift()||null);return saveLive(sid,lv)}
  if(act==='done'){const ci=+b.dataset.c,c=lv.courts[ci],half=c.size/2,a=c.on.slice(0,half).filter(Boolean),bb=c.on.slice(half).filter(Boolean);
    if(!a.length||!bb.length){toast('Please put players on both sides first.');return}
    const names={};[...a,...bb].forEach(p=>names[p]=who(sid,p).name);
    const g={sid,sport:sp,court:c.name,a,b:bb,names,at:new Date().toISOString()};
    if(!b.dataset.noscore){const sa=$('sa-'+ci).value,sb=$('sb-'+ci).value;if(sa===''||sb===''){toast('Please enter both scores, or tap Skip score.');return}g.final=[Number(sa),Number(sb)]}
    try{await S.db.doc('games/'+sid+'-'+Date.now().toString(36)).set(g)}catch(e){toast("Sorry, the game didn't save.");return}
    pendingDone=null;const endT=new Date().toISOString();[...a,...bb].forEach(p=>lv.avail[p]=endT);c.on=blank(c.size);c.score=[0,0];
    const nx=lv.waiting[0];
    if(nx&&nx.on.some(Boolean)){if(nx.size===c.size)c.on=[...nx.on];else nx.on.filter(Boolean).slice(0,c.size).forEach((p,i)=>c.on[i]=p);
      lv.waiting.shift();lv.waiting.push({id:'w'+Date.now().toString(36),size:nx.size,on:blank(nx.size)});toast(`Game saved. Next up is on ${c.name}.`)}
    else toast(`Game saved. ${c.name} is free.`);
    return saveLive(sid,lv)}
}}

/* ---------- board: points or club rank ---------- */
S.boardMode='points';
function renderBoard(){
  const f=S.sport,mode=S.boardMode;
  const toggle=`<div class="chips"><button class="chip" data-bm="points" aria-pressed="${mode==='points'}">${ic('coin')}Points</button><button class="chip" data-bm="rank" aria-pressed="${mode==='rank'}">${ic('board')}Rank</button></div>`;
  let body;
  if(mode==='rank'){const rows=rankRows(f);
    body=rows.map((r,i)=>{const p=S.profiles[r.pid];return `<div class="li" style="grid-template-columns:auto auto minmax(0,1fr) auto"><span class="rank num">${i+1}</span>${avatar(p)}<div><div class="nm">${esc(p.nickname)}</div><div class="sub num">${r.w} won · ${r.g-r.w} lost · ${r.d>0?'+':''}${r.d} points</div></div><b class="num">${Math.round(r.w/r.g*100)}%</b></div>`}).join('')||`<div class="empty">${ic('board')}<span>Rank appears once games have scores. Add yours on the Courts tab.</span></div>`;
  }else{const rows=Object.entries(S.profiles).filter(([,p])=>f==='all'||(p.sports||['badminton']).includes(f)).map(([uid,p])=>({p,uid,st:statsFor(p.listKey),fd:isFounder(uid)})).sort((a,b)=>(b.fd-a.fd)||b.st.earned-a.st.earned||a.p.nickname.localeCompare(b.p.nickname));let rk=0;
    body=rows.map((r,i)=>`<div class="li" style="grid-template-columns:auto auto minmax(0,1fr) auto"><span class="rank num">${r.fd?'':++rk}</span>${avatar(r.p)}
      <div><div class="nm">${esc(r.p.nickname)} ${r.uid&&levelIdx(r.uid)>=1?`<span class="tagl">${esc(levelFor(r.uid,badgeCount(r.uid)).k)}</span>`:''}${r.p.sample?' <span class="tagl">Sample</span>':''}</div><div class="sub ic-row" style="gap:6px">${(r.p.sports||['badminton']).map(s=>ic(SPORTS[s]?.icon||'badminton')).join('')}<span>${esc(typeOf(r.p)||'Player')}${r.st.sessions?` · ${r.st.sessions} session${r.st.sessions===1?'':'s'}`:''}</span></div></div>
      <b class="num">${r.fd?'<span class="inf">∞</span>':r.st.earned}</b></div>`).join('')||`<div class="empty">${ic('board')}<span>No one on the board yet. You could be first.</span></div>`}
  $('v-board').innerHTML=`<div class="hero"><span class="label">Board</span><h2>The BAD board.</h2><p class="fine">${mode==='rank'?'Wins from scored games. A light competition, all in good fun.':'Lifetime points from registered members.'} Community over competition, always.</p></div>${toggle}${sportBar(f,'bf',mode==='rank'?COURT_SPORTS:PLAYABLE)}<div class="list">${body}</div>`;
  document.querySelectorAll('[data-bf]').forEach(b=>b.onclick=()=>{S.sport=b.dataset.bf;renderBoard()});
  document.querySelectorAll('[data-bm]').forEach(b=>b.onclick=()=>{S.boardMode=b.dataset.bm;renderBoard()});
}
