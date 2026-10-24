/* ---------- admin ---------- */
const SIGNUP_SHEET='1ATPRh9Z-voVhE_8a5PNQUZnrLoEHBhM9iZAIR-1FeRA';
let adminSid=null;
const nameOf=(uid,key)=>S.profiles[uid]?.nickname||S.bookings[uid]?.name||allKeys()[key]||key||'Unknown';
function mcpErr(e){const c=e&&e.code;return c==='server_not_connected'?'Add Google Sheets in claude.ai Settings → Connectors.':c==='needs_reauth'?'Reconnect Google Sheets in claude.ai Settings → Connectors.':(c==='not_in_manifest'||c==='approval_required')?'Allow Google Sheets for this page, then try again.':(e&&e.message)||'Something went wrong.'}

let aTab='today',showNew=false,showPast=false,adminPicked=false;
const ATABS=[['today','Today','clock'],['sessions','Sessions','ticket'],['players','Players','users'],['points','Points & BADges','coin'],['posts','Club posts','club'],['payments','Payments','wallet'],['shop','Shop','bag'],['settings','Settings','admin']];
const fmtS=x=>{const d=dParts(x.date);return `${d.w} ${d.d} ${d.m}`};
const unpaidOf=sid=>{const r=roster(sid);return r.in.filter(e=>!e.guest&&!S.payments[sid]?.[e.uid]?.ok)};
const owedOf=sid=>{const s=S.sessions[sid],r=roster(sid);return unpaidOf(sid).length*(+s.fee||0)+r.late.filter(e=>e.guest||!S.payments[sid]?.[e.uid]?.ok).reduce((t,e)=>t+(+e.fee.amount||0),0)};
const boxD=(title,inner)=>`<details class="panel fold"><summary class="ah">${title}</summary><div class="foldin">${inner}</div></details>`;
const box=(title,inner,extra='')=>`<div class="panel ${extra}">${title?`<h3 class="ah">${title}</h3>`:''}${inner}</div>`;
const tile=(n,l)=>`<div class="tile"><div class="stat"><b class="num">${n}</b><span class="label">${l}</span></div></div>`;

const TABS_CM=['today','sessions','players','payments','posts'];
function renderAdmin(){
  if(!fullAdmin()&&!TABS_CM.includes(aTab))aTab='today';if(aTab==='shop'&&!shopAdmin())aTab='today';const TABS=(fullAdmin()?ATABS:ATABS.filter(t=>TABS_CM.includes(t[0]))).filter(t=>t[0]!=='shop'||shopAdmin());
  const el=$('v-admin'),list=Object.entries(S.sessions).filter(([,x])=>canSport(x.sport)).sort((a,b)=>sessStart(a[1])-sessStart(b[1]));
  const up=upcoming().filter(([,x])=>canSport(x.sport));if(!adminPicked&&up[0])adminSid=up[0][0];if(!adminSid||!S.sessions[adminSid])adminSid=(up[0]||list[list.length-1]||[null])[0];
  const badge=Object.assign({payments:payChecks().length},fullAdmin()?{points:Object.keys(S.requests).length,players:memPending().length}:{});
  const T=ATABS.find(t=>t[0]===aTab)||ATABS[0];
  const nav=`<nav class="anav" aria-label="Admin sections">${TABS.map(([k,l,i])=>`<button type="button" data-at="${k}" aria-current="${aTab===k?'page':'false'}">${ic(i)}<span>${l}</span>${badge[k]?`<span class="badge num">${badge[k]}</span>`:''}</button>`).join('')}</nav>`;
  const body=({today:aToday,sessions:aSessions,players:aPlayers,points:aPoints,posts:aPosts,payments:aPayments,shop:aShop,settings:aSettings}[aTab]||aToday)(list,up);
  el.innerHTML=`<div class="admin"><div class="ahead"><span class="label">${esc(roleLabel({role:myRole(),sports:mySports()}))}</span><h2>${T[1]}</h2></div>${nav}<div class="abody">${body}</div></div>`;
  bindAdmin();const act=el.querySelector('.anav [aria-current="page"]');if(act&&innerWidth<1000)act.scrollIntoView({block:'nearest',inline:'center'});
}

function aToday(list,up){
  const nx=up[0],s=nx&&S.sessions[nx[0]];
  const alerts=[];const rq=fullAdmin()?Object.keys(S.requests).length:0;
  const mq=fullAdmin()?memPending().length:0;if(mq)alerts.push(['check',`${mq} membership${mq>1?'s':''} to verify`,'players']);
  if(rq)alerts.push(['gift',`${rq} free session request${rq>1?'s':''} waiting`,'points']);
  const past=list.filter(([id,x])=>sessStart(x)<Date.now()&&sessStart(x)>Date.now()-14*864e5);
  for(const [id,x] of past){const o=owedOf(id);if(o)alerts.push(['coin',`AED ${o} unpaid from ${esc(x.title)} · ${fmtS(x)}`,'sessions',id])}
  const pcN=payChecks().length;if(pcN)alerts.unshift(['wallet',`${pcN} payment${pcN>1?'s':''} to check`,'payments']);
  const pc=S.payCfg||{};if(fullAdmin()&&!pc.iban&&!pc.ziinaLink)alerts.push(['bank','Add your bank details and Ziina link so players know where to pay','settings']);
  if(fullAdmin()&&!S.site?.url)alerts.push(['arrow','Add the BAD website link so every Club post links to it','settings']);
  const sm=fullAdmin()?Object.values(S.profiles).filter(p=>p.sample).length:0;if(sm)alerts.push(['users',`${sm} sample players are still in the app`,'settings']);
  const players=Object.values(S.profiles).filter(p=>!p.sample).length;
  const nsN=Object.values(S.noshows).filter(n=>(n.dates||[]).length).length;
  let next='<div class="empty">No upcoming sessions. <button class="btn sm" data-go="sessions" data-new="1">'+ic('plus')+'Add a session</button></div>';
  if(s){const r=roster(nx[0]),paid=r.in.filter(e=>!e.guest&&S.payments[nx[0]]?.[e.uid]?.ok).length;
    next=`<div class="nextcard"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><span class="label">Next up · ${fmtS(s)} · ${s.timeTbc?'Time TBC':esc(fmtTime(s.start))}</span><h3 class="big">${esc(s.title)}</h3>${s.venue?`<p class="hint">${ic('pin')}${esc(s.venue)}</p>`:''}</div>${ic(sportOf(s.sport).icon)}</div>
      <div class="tiles">${tile(`${r.in.length}<small>/${r.cap}</small>`,'In')}${tile(r.wait.length,'Waiting')}${tile(`${paid}<small>/${r.in.filter(e=>!e.guest).length}</small>`,'Paid')}</div>
      <div class="row"><button class="btn" data-go="sessions" data-sid="${esc(nx[0])}">${ic('users')}See players</button><button class="btn ghost" data-courts="${esc(s.sport)}">${ic('court')}Run courts</button></div></div>`}
  return `${next}
  ${box('Needs attention',alerts.length?`<div class="list">${alerts.map(([i,t,go,sid])=>`<button type="button" class="alert" data-go="${go}" ${sid?`data-sid="${esc(sid)}"`:''}>${ic(i)}<span>${t}</span>${ic('arrow')}</button>`).join('')}</div>`:'<p class="hint">All clear. Nice one.</p>')}
  <div class="tiles">${tile(players,'Players')}${tile(up.length,'Upcoming sessions')}${tile(nsN,'On no-show list')}</div>
  ${box('Quick actions',`<div class="qa"><button class="btn ghost" data-go="sessions" data-new="1">${ic('plus')}Add a session</button><button class="btn ghost" data-go="posts">${ic('club')}Post to Club</button>${fullAdmin()?`<button class="btn ghost" data-go="points">${ic('star')}Give bonus points</button><button class="btn ghost" data-go="points">${ic('gift')}Club codes</button>`:''}</div>`)}`;
}

/* Game Master: runs the courts for one session, even without admin access */
function gmPanel(sid,s){const gms=s.gms||[],ps=Object.entries(S.profiles).filter(([u,p])=>!p.sample&&!gms.includes(u)).sort((a,b)=>{const st=u=>memType(memLabel(u))?.staff?0:1;return st(a[0])-st(b[0])||(a[1].nickname||'').localeCompare(b[1].nickname||'')});
  return box(`Game Master${gms.length>1?'s':''}`,`<p class="hint" style="margin-top:0">Runs the courts and the queue for this session. They can open the board and log games, even without admin access.</p>
    ${gms.length?`<div class="list">${gms.map(u=>{const p=S.profiles[u]||{};return `<div class="li" style="grid-template-columns:auto minmax(0,1fr) auto">${avatar(p,p.listKey)}<div><div class="nm">${esc(p.nickname||'Player')}</div><div class="sub">${esc(memLabel(u))}</div></div><button class="rmx" data-gmrm="${esc(u)}" aria-label="Remove ${esc(p.nickname||'')} as Game Master">${ic('x')}</button></div>`}).join('')}</div>`:''}
    <div class="row" style="margin-top:10px"><select id="gm-pick" style="flex:1;min-width:180px" aria-label="Pick a Game Master"><option value="">${gms.length?'Add another Game Master':'Pick a Game Master'}</option>${ps.map(([u,p])=>`<option value="${esc(u)}">${esc(p.nickname||'')}${memType(memLabel(u))?.staff?' · '+esc(memLabel(u)):''}</option>`).join('')}</select><button class="btn sm" id="gm-add">${ic('plus')}Add</button></div>`)}
/* add people by hand: a registered player, or a guest (with or without a host) */
function addPlayerPanel(sid,r){const inIds=new Set([...r.in,...r.wait].filter(e=>!e.guest).map(e=>e.uid)),ps=Object.entries(S.profiles).filter(([u,p])=>!p.sample&&!inIds.has(u)).sort((a,b)=>(a[1].nickname||'').localeCompare(b[1].nickname||'')),hosts=Object.entries(S.profiles).filter(([u])=>inIds.has(u));
  const m=S.addMode||'player';
  return `<div class="addp"><div class="chips" role="group" aria-label="Add someone"><button type="button" class="chip sm" data-addmode="player" aria-pressed="${m==='player'}">${ic('plus')}Add a player</button><button type="button" class="chip sm" data-addmode="guest" aria-pressed="${m==='guest'}">${ic('guest')}Add a guest</button></div>
    ${m==='player'?`<div class="row"><select id="ap-uid" style="flex:1;min-width:180px" aria-label="Player to add"><option value="">Pick a registered player</option>${ps.map(([u,p])=>`<option value="${esc(u)}">${esc(p.nickname||'')}${p.listName&&p.listName!==p.nickname?' ('+esc(p.listName)+')':''}</option>`).join('')}</select><button class="btn sm" id="ap-go">Add</button></div>`
      :`<div class="row"><input type="text" id="ag-name" maxlength="30" placeholder="Guest's name" style="flex:1;min-width:140px" aria-label="Guest's name"><select id="ag-host" style="flex:1;min-width:160px" aria-label="Guest of"><option value="">No host · BAD guest</option>${hosts.map(([u,p])=>`<option value="${esc(u)}">Guest of ${esc(p.nickname||'')}</option>`).join('')}</select><button class="btn sm" id="ag-go">Add</button></div>
      <p class="fine">With a host, the fee goes under the host's name. With no host, the guest shows on Payments under their own name.</p>`}
    <p class="fine">Added by an admin. Payment starts as cash.</p></div>`}
function rmRosterBtn(e){const k=`${e.uid}|${e.guest==null?'':e.gi}`;return S.rosterRm===k?`<button class="chip sm" data-rrm="${esc(k)}">Remove?</button>`:`<button class="rmx" data-rrarm="${esc(k)}" aria-label="Take ${esc(e.guest||nameOf(e.uid,e.key))} off this session">${ic('x')}</button>`}
function aSessions(list,up){
  if(!canSport(newSport))newSport=Object.keys(SPORTS).find(canSport)||'badminton';
  const s=adminSid&&S.sessions[adminSid],r=s?roster(adminSid):null;
  const ns=S.noshows,nsId=e=>e.guest?`${adminSid}#g-${slug(e.guest)}`:adminSid,isNS=e=>Object.values(ns).some(n=>n.player===e.key&&(n.dates||[]).includes(nsId(e)));
  const shown=showPast?list.slice().reverse():up.concat(s&&!up.some(([i])=>i===adminSid)?[[adminSid,s]]:[]);
  const picker=`<div class="sports" role="group" aria-label="Pick a session">${shown.map(([id,x])=>`<button type="button" class="sp" data-sid="${esc(id)}" aria-pressed="${id===adminSid}">${ic(sportOf(x.sport).icon)}${fmtS(x)} · ${esc(x.title)}</button>`).join('')||'<span class="hint">No upcoming sessions.</span>'}</div>
    <div class="row" style="justify-content:space-between"><label class="chip sm"><input type="checkbox" id="a-past" ${showPast?'checked':''}> Show past sessions</label><button class="btn sm${showNew?' ghost':''}" id="a-new">${showNew?ic('x')+'Close':ic('plus')+'Add a session'}</button></div>`;
  const form=showNew?box('Add a session',`
    <div class="field" style="margin:0"><span class="lbl">Club</span><div class="sports">${Object.keys(SPORTS).filter(canSport).map(k=>`<button type="button" class="sp" data-nsp="${k}" aria-pressed="${k===newSport}">${ic(SPORTS[k].icon)}${SPORTS[k].club}</button>`).join('')}</div></div>
    <div class="fgrid">
      <div class="field"><label for="n-title">Name</label><input type="text" id="n-title" value="${esc(defaultTitle(newSport))}"></div>
      <div class="field"><label for="n-date">Date</label><input type="date" id="n-date"></div>
      <div class="field"><label for="n-start">Start</label><input type="time" id="n-start" value="${newSport==='volleyball'?'19:00':'20:00'}"></div>
      <div class="field"><label for="n-end">End</label><input type="time" id="n-end" value="${newSport==='volleyball'?'22:30':'22:00'}"></div>
      <div class="field"><label for="n-fee">Fee (AED)</label><input type="number" id="n-fee" value="40"></div>
      <div class="field"><label for="n-cap">Spots</label><input type="number" id="n-cap" value="${newSport==='volleyball'?18:newSport==='pickleball'?16:20}"></div>
      <div class="field wide"><label for="n-venue">Venue</label><input type="text" id="n-venue"></div>
      <div class="field wide"><label for="n-opens">Sign-ups open <span class="req">optional</span></label><input type="datetime-local" id="n-opens"><p class="fine">Leave blank to open straight away. Member level and up can join 24 hours before this.</p></div></div>
    <label class="chip sm" style="justify-self:start"><input type="checkbox" id="n-tbc"> Time to be confirmed</label>
    <div class="row"><button class="btn" id="n-go">${ic('plus')}Post session</button></div>`,'formbox'):'';
  if(!s)return picker+form+'<div class="empty">No sessions yet.</div>';
  const paid=r.in.filter(e=>!e.guest&&S.payments[adminSid]?.[e.uid]?.ok).length,owed=owedOf(adminSid);
  const nm=e=>e.guest?`${esc(e.guest)} <span class="tagl">Guest of ${esc(nameOf(e.uid,e.key))}</span>`:esc(nameOf(e.uid,e.key))+(S.bookings[e.uid]?.guest?' <span class="tagl">Guest</span>':'')+(S.bookings[e.uid]?.s?.[adminSid]?.byAdmin?' <span class="tagl">Added by admin</span>':'');
  const rosterHTML=r.in.map((e,i)=>`<div class="li pl"><span class="rank num">${i+1}</span>${e.guest?avatar(null,e.guest):avatar(S.profiles[e.uid],e.key)}<div><div class="nm">${nm(e)}</div><div class="sub">${e.guest?'Host is responsible':esc(S.contacts[e.uid]?.mobile||S.contacts[e.uid]?.whatsapp||'')}${gamesFor(adminSid,e.guest?gpid(e.uid,e.guest):e.uid)?` · ${gamesFor(adminSid,e.guest?gpid(e.uid,e.guest):e.uid)} games`:''}</div>${e.guest?'':payTag(adminSid,e.uid)}</div>
      <div class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn sm ${isNS(e)?'':'ghost'} nsb" data-ns="${esc(e.key)}" data-uid="${esc(e.uid)}" data-d="${esc(nsId(e))}" title="Hidden from players">${isNS(e)?'No-show ✕':'No-show'}</button>${rmRosterBtn(e)}</div></div>`).join('')||'<div class="empty">No one yet.</div>';
  return `${picker}${form}
  <div class="nextcard"><span class="label">${fmtS(s)} · ${s.timeTbc?'Time TBC':esc(fmtTime(s.start))+'–'+esc(fmtTime(s.end||''))} · AED ${esc(s.fee)}</span><h3 class="big">${esc(s.title)}</h3>
    <div class="tiles t4">${tile(`${r.in.length}<small>/${r.cap}</small>`,'In')}${tile(r.wait.length,'Waiting')}${tile(`${paid}<small>/${r.in.filter(e=>!e.guest).length}</small>`,'Paid')}${tile(`<small>AED</small> ${owed}`,'Still to collect')}</div>
    <div class="row"><button class="btn ghost sm" data-courts="${esc(s.sport)}">${ic('court')}Run courts</button></div></div>
  ${gmPanel(adminSid,s)}
  ${box(`Players <span class="hint num">${r.in.length}</span>`,`<div class="list">${rosterHTML}</div>${addPlayerPanel(adminSid,r)}`)}
  ${r.wait.length?box('Waitlist',`<div class="list">${r.wait.map((e,i)=>`<div class="li" style="grid-template-columns:auto minmax(0,1fr) auto"><span class="rank num">${i+1}</span><div class="nm">${nm(e)}</div>${rmRosterBtn(e)}</div>`).join('')}</div>`):''}
  ${r.late.length?box('Dropped late · fee owed',`<div class="list">${r.late.map(e=>`<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">${nm(e)}</div><div class="sub">${esc(e.fee.label)}${e.guest?' · host pays':''} · dropped ${esc(new Date(e.out).toLocaleString('en-GB',{timeZone:'Asia/Dubai',dateStyle:'medium',timeStyle:'short'}))}</div>${e.guest?'':payTag(adminSid,e.uid)}</div><b class="num">AED ${e.fee.amount}</b></div>`).join('')}</div>`):''}`;
}

function aPlayers(){
  const ps=Object.entries(S.profiles).filter(([,p])=>fullAdmin()||(p.sports||['badminton']).some(canSport)).sort((a,b)=>(!!a[1].sample-!!b[1].sample)||(a[1].nickname||'').localeCompare(b[1].nickname||''));
  const nsBy={};for(const n of Object.values(S.noshows))nsBy[n.player]=(n.dates||[]).length;
  const nsKeys=Object.values(S.noshows).filter(n=>(n.dates||[]).length).sort((a,b)=>b.dates.length-a.dates.length);
  const mp=memPending();
  return `${fullAdmin()?'':`<p class="hint">Players in ${esc(mySports().map(k=>SPORTS[k]?.club).join(', '))}.</p>`}${!fullAdmin()?'':box(`Membership to verify${mp.length?` <span class="badge num">${mp.length}</span>`:''}`,mp.length?`<div class="list">${mp.map(([uid,p,m])=>{const c=S.contacts[uid]||{};return `<div class="li req">${avatar(p,p.listKey)}<div><div class="nm">${esc(p.nickname)}</div><div class="sub">Asked for <b>${esc(m.type)}</b>${m.at?' · '+esc(fmtD(m.at)):''}${c.mobile?' · '+esc(c.mobile):''}</div></div><div class="row"><button class="btn sm" data-mok="${esc(uid)}">Verify</button><button class="btn ghost sm" data-mno="${esc(uid)}">Decline</button></div></div>`}).join('')}</div>`:'<p class="hint">Nothing to verify. Guest needs no check.</p>')}
  <div class="field" style="margin:0"><label for="a-q" class="sr">Search players</label><input type="search" id="a-q" placeholder="Search name, email or mobile"></div>
  ${box(`Everyone <span class="hint num">${ps.length}</span>`,`<div class="list" id="a-plist">${ps.map(([uid,p])=>{const c=S.contacts[uid]||{},st=statsFor(p.listKey);return `<div class="li" data-q="${esc(((p.nickname||'')+' '+(p.listName||'')+' '+(c.email||'')+' '+(c.mobile||'')).toLowerCase())}">${avatar(p,p.listKey)}<div><div class="nm">${esc(p.nickname||'—')}${p.sample?' <span class="tagl">Sample</span>':''}${(()=>{const m=memStatus(uid);return m.type!=='Guest'?` <span class="tagl${m.state==='verified'?' solid':m.state==='pending'?' warn':''}">${m.state==='verified'?ic('check'):''}${esc(m.type)}</span>`:''})()}${nsBy[p.listKey]?` <span class="tagl warn">${nsBy[p.listKey]} no-show</span>`:''}${!(p.listName||'').trim()?' <span class="tagl warn">No tracker name</span>':''}</div><div class="sub">${[c.email,c.mobile].filter(Boolean).map(esc).join(' · ')||'No contact details'}</div><div class="sub">${(p.sports||[]).map(k=>SPORTS[k]?.club).filter(Boolean).join(' · ')}</div><div class="sub">${esc(st.level||'Rookie')} · ${st.badges||0} BADge${st.badges===1?'':'s'} · ${st.unpaid?`<span class="warn-t">AED ${st.unpaid} unpaid</span>`:'Paid up'}</div></div><div class="pts"><b class="num">${isFounder(uid)?'∞':st.balance}</b><span class="label">pts</span></div>${fullAdmin()?`<details class="manage"><summary>Manage${pendingFor(uid).length?` · AED ${pendingFor(uid).reduce((t,r)=>t+r.amount,0)} pending`:''}</summary><div class="row" style="gap:8px;margin-top:8px;align-items:flex-end"><div class="field" style="margin:0;flex:1;min-width:160px"><label for="tn-${esc(uid)}">Name on tracker</label><input id="tn-${esc(uid)}" data-tracker="${esc(uid)}" value="${esc(p.listName||'')}" maxlength="30" placeholder="As written on the tracker"></div>${canGiveBadge()&&uid!==S.uid?`<button class="btn ghost sm" data-givebadge="${esc(uid)}">${ic('star')}Give a BADge</button>`:''}</div><div class="row" style="gap:8px;margin-top:8px">${pendingFor(uid).length?`<button class="btn ghost" data-freeall="${esc(uid)}">Clear AED ${pendingFor(uid).reduce((t,r)=>t+r.amount,0)} pending</button>`:''}${window.BAD_WEB&&!p.sample&&canManageAdmins()?(()=>{const em=((S.contacts[uid]||{}).email||'').toLowerCase(),r=adminRec(em),cur=!r?'':r.role==='cm'?'cm:'+((r.sports||[])[0]||''):r.role;if(!em)return '';if(r&&r.role==='owner')return `<span class="tagl solid">${ic('check')}Owner</span>`;return `<select class="memset adm" data-access="${esc(uid)}" aria-label="Admin access for ${esc(p.nickname||'player')}"><option value="">No admin access</option>${Object.keys(SPORTS).map(k=>`<option value="cm:${k}" ${cur==='cm:'+k?'selected':''}>Community manager · ${esc(SPORTS[k].club)}</option>`).join('')}<option value="app" ${cur==='app'?'selected':''}>App admin</option><option value="founder" ${cur==='founder'?'selected':''}>Founder admin</option></select>`})():''}<select class="memset" data-memset="${esc(uid)}" aria-label="Membership for ${esc(p.nickname||'player')}">${memTypes().map(t=>`<option ${t.k===memLabel(uid)?'selected':''}>${esc(t.k)}</option>`).join('')}</select></div></details>`:''}</div>`}).join('')||'<div class="empty">No players yet.</div>'}</div>`)}
  ${box('No-show list <span class="tagl">Admins only</span>',`<p class="hint">Players never see this. Mark no-shows from a session’s player list.</p><div class="list">${nsKeys.map(n=>`<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">${esc(n.name||n.player)}</div><div class="sub num">${n.dates.map(d=>{const [sd,g]=d.split('#');return esc((S.sessions[sd]?fmtS(S.sessions[sd]):sd)+(g?' (guest)':''))}).join(' · ')}</div></div><b class="num">${n.dates.length}</b></div>`).join('')||'<div class="empty">Clean sheet so far.</div>'}</div>`,'secret')}
  <details class="panel"><summary class="ah">Add a player from a join code</summary><p class="hint">Only needed if a player couldn’t save their card and sent you a BAD1- code.</p><textarea id="imp-code" placeholder="BAD1-…"></textarea><div class="row"><button class="btn ghost" id="imp-go">Add player</button></div></details>`;
}

function aPoints(){const c=PS(),ps=Object.entries(S.profiles).filter(([,p])=>!p.sample).sort((a,b)=>(a[1].nickname||'').localeCompare(b[1].nickname||''));
  const recent=[...(S.ledger||[]).filter(isV2).map(e=>({...e,k:'l'})),...Object.entries(S.badges||{}).map(([id,b])=>({...b,_id:id,k:'b'}))].sort((a,b)=>String(b.at||b.date).localeCompare(String(a.at||a.date))).slice(0,30);
  const syncAt=S.sheetPts&&S.sheetPts.at;
  return `${!c.launch?`<div class="note">${ic('clock')}<span>Points haven’t launched yet. Add the launch date in Points Settings B8 of BAD APP – Master. Until then, everyone shows 0 points.</span></div>`:''}
  ${box(`Free session requests${Object.keys(S.requests).length?` <span class="badge num">${Object.keys(S.requests).length}</span>`:''}`,`<div class="list">${Object.entries(S.requests).map(([id,q])=>{const p=S.profiles[id],pt=p?pointsFor(id):null;return `<div class="li req">${avatar(p,q.player)}<div><div class="nm">${esc(p?.nickname||q.player)}</div><div class="sub">${pt?pt.balance:0} points · asked ${esc(fmtD(q.at))}${pt&&pt.unpaid?` · <span class="warn-t">AED ${pt.unpaid} unpaid</span>`:''}</div></div><div class="row"><button class="btn sm" data-ok="${esc(id)}" ${pt&&(pt.unpaid||pt.balance<c.free)?'disabled':''}>Approve</button><button class="btn ghost sm" data-no="${esc(id)}">Decline</button></div></div>`}).join('')||'<p class="hint">None right now.</p>'}</div><p class="fine">Approving takes ${Math.abs(c.other['Free session redeemed'])} points off. Players with an unpaid balance need to settle it first.</p>`)}
  ${canGiveBadge()?box('BADges',`<p class="hint" style="margin-top:0">For loyalty and BAD spirit. Only founders and crew can give them.</p><button class="btn" data-givebadge="">${ic('star')}Give a BADge</button>`):''}
  ${box('Add points',`<div class="fgrid">
    <div class="field wide"><label for="lp-player">Player</label><select id="lp-player"><option value="">Pick a player</option>${ps.map(([u,p])=>`<option value="${esc(u)}" ${S.lpDraft?.uid===u?'selected':''}>${esc(p.nickname||'')}${p.listName&&p.listName!==p.nickname?' ('+esc(p.listName)+')':''}</option>`).join('')}</select></div>
    <div class="field"><label for="lp-type">Type</label><select id="lp-type">${LEDGER_TYPES.filter(t=>t!=='Free session redeemed').map(t=>`<option ${S.lpDraft?.type===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div>
    <div class="field"><label for="lp-pts">Points</label><input type="number" id="lp-pts" value="${esc(S.lpDraft?.pts??c.other[S.lpDraft?.type||LEDGER_TYPES[0]])}"></div>
    <div class="field"><label for="lp-dept">Department</label><select id="lp-dept"><option value="">—</option>${Object.values(SPORTS).map(x=>`<option ${S.lpDraft?.dept===x.club?'selected':''}>${esc(x.club)}</option>`).join('')}</select></div>
    <div class="field wide"><label for="lp-reason">Reason</label><input type="text" id="lp-reason" maxlength="80" placeholder="BADoween tournament" value="${esc(S.lpDraft?.reason||'')}"></div></div>
    <p class="fine">Session points come from the trackers on their own. Use this for events, tournaments, BAD Retreat and fixes. No-shows and late cancellations from the app are added on their own.</p>
    <div class="row"><button class="btn" id="lp-go">${ic('plus')}Add points</button></div>`)}
  ${box('Recent points and BADges',recent.length?`<div class="list">${recent.map(r=>{const p=S.profiles[r.uid]||{};return `<div class="li" style="grid-template-columns:auto minmax(0,1fr) auto auto">${avatar(p,r.player)}<div><div class="nm">${esc(p.nickname||r.player||'')}</div><div class="sub">${esc(fmtD(r.date))} · ${r.k==='b'?`BADge · ${esc(r.reason)} · from ${esc(r.by||'')}`:`${esc(r.type)} · ${esc(r.reason||'')}`}</div></div><b class="num">${r.k==='b'?`+${r.n||1} ${ic('star')}`:(r.pts>0?'+':'−')+Math.abs(r.pts)}</b>${r.synced?`<span class="tagl" title="Already on the sheet">${ic('sheet')}</span>`:`<button class="rmx" data-lrm="${r.k}|${esc(r._id)}" aria-label="Delete this entry">${ic('x')}</button>`}</div>`}).join('')}</div><p class="fine">Entries with ${ic('sheet')} are already on BAD APP – Master. To change those, edit the sheet.</p>`:'<p class="hint">Nothing yet.</p>')}
  ${codesPanel()}
  ${box('Sheet sync',`<p class="hint" style="margin-top:0">Points, BADges and the settings come from BAD APP – Master every 15 minutes. ${syncAt?`Last update: ${esc(new Date(syncAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit',timeZone:'Asia/Dubai'}))}.`:'<b>Not connected yet.</b> Run setup in the sheet’s Apps Script once.'}</p>`)}`;
}

function aPosts(){
  return `${box('New post',`<div class="chips" role="group"><button type="button" class="chip" data-pt="event" aria-pressed="${postType==='event'}">Event</button><button type="button" class="chip" data-pt="news" aria-pressed="${postType!=='event'}">Announcement</button></div>
    <div class="fgrid">
      <div class="field wide"><label for="p-title">Title</label><input type="text" id="p-title"></div>
      <div class="field"><label for="p-club">For</label><select id="p-club">${fullAdmin()?'<option value="all">All of BAD</option>':''}${Object.keys(SPORTS).filter(canSport).map(k=>`<option value="${k}">${SPORTS[k].club}</option>`).join('')}</select></div>
      <div class="field"><label for="p-link">Link</label><input type="url" id="p-link" placeholder="https://" value="${esc(S.site?.url||'')}"></div></div>
    <p class="fine">Every post links somewhere. It starts as the BAD site, change it for a sign-up form, map or ticket page.</p>
    <div class="fgrid" id="p-evt" ${postType==='event'?'':'hidden'}>
      <div class="field"><label for="p-date">Date</label><input type="date" id="p-date"></div>
      <div class="field"><label for="p-time">Time</label><input type="text" id="p-time" placeholder="4pm–10pm"></div>
      <div class="field"><label for="p-place">Place</label><input type="text" id="p-place"></div>
      <div class="field"><label for="p-map">Map link <span class="muted">(optional)</span></label><input type="url" id="p-map" placeholder="https://maps.app.goo.gl/…"></div></div>
    <div class="field" style="margin:0"><label for="p-body">Text</label><textarea id="p-body"></textarea></div>
    <div class="row"><button class="btn" id="p-go">Post</button></div>`)}
  ${box('Posted',`<div class="list">${Object.entries(S.posts).filter(([,p])=>fullAdmin()||canSport(p.club)).sort((a,b)=>(b[1].postedAt||'').localeCompare(a[1].postedAt||'')).map(([id,p])=>`<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">${esc(p.title)}</div><div class="sub">${p.type==='event'?'Event · '+esc(p.date||''):'Announcement'} · ${esc(p.club&&p.club!=='all'?SPORTS[p.club]?.club||'':'All of BAD')}</div></div><button class="btn ghost sm" data-delpost="${esc(id)}">Remove</button></div>`).join('')||'<p class="hint">Nothing posted yet.</p>'}</div>`)}`;
}

function aSettings(){
  const own=(window.BAD_ADMINS||[]),extra=Object.keys(S.admins||{});
  const gs=id=>`https://docs.google.com/spreadsheets/d/${id}/edit`;
  return `${window.BAD_WEB&&canManageAdmins()?box('Admins',`<p class="hint">Each admin signs in with this email. Give someone access here, or from Players → Manage.</p>
    <div class="list">${own.map(e=>`<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">${esc(e)}</div><div class="sub">${ROLES.owner.d}</div></div><span class="tagl solid">Owner</span></div>`).join('')}${extra.filter(e=>!own.includes(e)).map(e=>{const r=adminRec(e);return `<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">${esc(e)}</div><div class="sub">${esc(roleLabel(r))}</div></div><button class="btn ghost sm" data-unadmin="${esc(e)}">Remove</button></div>`}).join('')}</div>
    <div class="fgrid"><div class="field wide"><label for="ad-email">Email</label><input type="email" id="ad-email" placeholder="name@email.com"></div>
      <div class="field wide"><label for="ad-role">Role</label><select id="ad-role">${Object.keys(SPORTS).map(k=>`<option value="cm:${k}">Community manager · ${esc(SPORTS[k].club)}</option>`).join('')}<option value="app">App admin</option><option value="founder">Founder admin</option></select></div></div>
    <div class="row"><button class="btn" id="ad-go">Add admin</button></div>
    <details class="manage"><summary>What each role can do</summary><div class="list" style="margin-top:8px">${Object.values(ROLES).map(r=>`<div class="li" style="grid-template-columns:1fr"><div><div class="nm">${r.k}</div><div class="sub">${r.d}</div></div></div>`).join('')}</div></details>`):''}
  ${payPanel()}
  ${box('BAD website',`<p class="hint">Every Club post links here unless you add a different link.</p><div class="row" style="align-items:flex-end"><div class="field" style="flex:1;min-width:200px;margin:0"><label for="site-url">Website link</label><input type="url" id="site-url" placeholder="https://" value="${esc(S.site?.url||'')}"></div><button class="btn" id="site-go">Save</button></div>`)}
  ${boxD('Membership levels',`<p class="hint">Membership levels. Players can request the open ones. “Admins assign” levels (like Crew or Founder) are only given from the Players list. “Needs verifying” waits for an admin before it shows on the card.</p>
    <div class="list">${memTypes().map((t,i)=>`<div class="li mlv"><div><div class="nm">${esc(t.k)}</div><div class="sub">${esc(t.d||'')}</div></div><div class="row" style="gap:6px"><label class="chip sm"><input type="checkbox" data-mverify="${i}" ${t.verify?'checked':''}> Needs verifying</label><label class="chip sm"><input type="checkbox" data-mstaff="${i}" ${t.staff?'checked':''}> Admins assign</label><label class="chip sm"><input type="checkbox" data-madmin="${i}" ${lvAdmin(t.k)?'checked':''}> Gets Admin tab</label></div>${t.k==='Guest'?'':`<button class="btn ghost sm" data-mdel="${i}">Remove</button>`}</div>`).join('')}</div>
    <div class="row" style="align-items:flex-end"><div class="field" style="flex:1;min-width:150px;margin:0"><label for="mt-name">New type</label><input type="text" id="mt-name" maxlength="24" placeholder="e.g. Student"></div><div class="field" style="flex:2;min-width:160px;margin:0"><label for="mt-desc">Short description</label><input type="text" id="mt-desc" maxlength="40"></div><button class="btn" id="mt-add">Add</button></div>`)}
  ${boxD('Google Sheets',`<p class="hint">The trackers feed attendance and payments into the Master, which works out points.</p><div class="list">${[['BAD APP – Master',SIGNUP_SHEET,'Players, sign-ups, points and every tracker'],...SHEETS.map(x=>[x.label,x.id,'Attendance and payments']),['Tuesday Training Tracker','1gwP-s7QP93-0qOzRu_RH2q664Onpsrz1crWjneDa5Oo','Training attendance, payments and coach fees']].map(([n,id,d])=>`<a class="li" style="grid-template-columns:auto minmax(0,1fr) auto;text-decoration:none;color:inherit" href="${gs(id)}" target="_blank" rel="noopener">${ic('sheet')}<div><div class="nm">${esc(n)}</div><div class="sub">${esc(d)}</div></div>${ic('arrow')}</a>`).join('')}<a class="li" style="grid-template-columns:auto minmax(0,1fr) auto;text-decoration:none;color:inherit" href="https://drive.google.com/drive/folders/1E_EmlRuVN-zhlGosz8Fvd5oWNGGS-lsk" target="_blank" rel="noopener">${ic('image')}<div><div class="nm">BAD APP folder</div><div class="sub">Google Drive folder with all of the above</div></div>${ic('arrow')}</a></div>`)}
  ${Object.values(S.profiles).some(p=>p.sample)?box(`Sample players <span class="tagl">${Object.values(S.profiles).filter(p=>p.sample).length}</span>`,`<p class="hint">Sample players from the 21 Oct session are here so you can try the courts and check-in. Remove them before going live.</p><button class="btn ghost sm" id="rm-samples" style="justify-self:start">${ic('x')}Remove sample players</button>`,'secret'):''}
  ${boxD(`What's new <span class="hint num">v${APP_VERSION}</span>`,whatsNewHTML())}
  ${boxD('Brand and logos',brandPanel())}`;
}
let postType='event',newSport='badminton';
function payTag(sid,uid){const b=S.bookings[uid]?.s?.[sid]||{},k=b.pay||'cash',P=S.payments[sid]?.[uid]||{},ok=P.ok&&!P.waived,fr=!!P.waived;
  return `<div class="row" style="gap:6px;margin-top:4px"><span class="tagl${ok||fr?' solid':''}">${ic(PAY[k]?.icon||'cash')}${PAY[k]?.label||'Cash'}${fr?' · Free':ok?' · Paid':b.sent?' · Sent':''}</span>${fr?'':`<button class="chip sm" data-paid="${esc(uid)}" aria-pressed="${ok}">${ok?'Undo paid':'Mark paid'}</button>`}${ok?'':`<button class="chip sm" data-free="${esc(uid)}" aria-pressed="${fr}">${fr?'Undo free':'Make free'}</button>`}</div>`}
function payPanel(){const c=S.payCfg||{};
  return `<div class="panel"><h3 class="ah">Payments</h3><p class="muted">Players choose how they pay when they join a session. Bank, Ziina and Careem Pay details are shown only to players who pick that option.</p>
    <div class="chips">${Object.entries(PAY).map(([k,m])=>`<label class="chip"><input type="checkbox" data-pon="${k}" ${c[k]!==false?'checked':''}> ${ic(m.icon)}${m.label}</label>`).join('')}</div>
    <div class="row" style="align-items:flex-end"><div class="field" style="margin:0;flex:1;min-width:160px"><label for="pc-acc">Account name</label><input type="text" id="pc-acc" value="${esc(c.accName||'')}"></div>
      <div class="field" style="margin:0;flex:1;min-width:160px"><label for="pc-bank">Bank</label><input type="text" id="pc-bank" value="${esc(c.bankName||'')}"></div></div>
    <div class="field" style="margin:0"><label for="pc-iban">IBAN</label><input type="text" id="pc-iban" value="${esc(c.iban||'')}" placeholder="AE.."></div>
    <div class="field" style="margin:0"><label for="pc-ziina">Ziina payment link</label><input type="text" id="pc-ziina" value="${esc(c.ziinaLink||'')}" placeholder="https://pay.ziina.com/..."></div>
    <div class="row" style="align-items:flex-end"><div class="field" style="margin:0;flex:1;min-width:160px"><label for="pc-cname">Careem Pay name</label><input type="text" id="pc-cname" value="${esc(c.careemName||'')}"></div>
      <div class="field" style="margin:0;flex:1;min-width:160px"><label for="pc-cno">Careem Pay number</label><input type="tel" id="pc-cno" value="${esc(c.careemNo||'')}" placeholder="+971 5x xxx xxxx"></div></div>
    <div class="field" style="margin:0"><label for="pc-clink">Careem Pay link <span class="muted">(optional)</span></label><input type="text" id="pc-clink" value="${esc(c.careemLink||'')}" placeholder="https://"></div>
    <div class="row"><button class="btn" id="pc-save">Save payment details</button></div></div>`}
const defaultTitle=k=>({vibe:'BAD Social',badminton:'Wednesday Rally',volleyball:'VolleyBAD',pickleball:'BADDINK Pickleball',run:'Runaways Run',basketball:'BADSHOTS Run',training:'Training',retreat:'BAD Retreat'}[k]||'Session');
function bindAdmin(){
  const q=s=>document.querySelectorAll('#v-admin '+s),on=(id,f)=>{const e=$(id);if(e)e.onclick=f};
  q('[data-at]').forEach(b=>b.onclick=()=>{aTab=b.dataset.at;renderAdmin();scrollTo({top:0})});
  q('[data-go]').forEach(b=>b.onclick=()=>{aTab=b.dataset.go;if(b.dataset.sid){adminSid=b.dataset.sid;adminPicked=true}if(b.dataset.new)showNew=true;renderAdmin();scrollTo({top:0})});
  q('[data-courts]').forEach(b=>b.onclick=()=>{S.courtSport=b.dataset.courts;setView('courts')});
  q('.sp[data-sid]').forEach(b=>b.onclick=()=>{adminSid=b.dataset.sid;adminPicked=true;renderAdmin()});
  const past=$('a-past');if(past)past.onchange=()=>{showPast=past.checked;renderAdmin()};
  on('a-new',()=>{showNew=!showNew;renderAdmin()});
  const aq=$('a-q');if(aq)aq.oninput=()=>{const v=aq.value.trim().toLowerCase();q('#a-plist [data-q]').forEach(li=>li.hidden=!!v&&!li.dataset.q.includes(v))};
  q('[data-ns]').forEach(b=>b.onclick=async()=>{const key=b.dataset.ns,id='ns-'+slug(key),cur=S.noshows[id]||{player:key,name:nameOf(b.dataset.uid,key),dates:[]};
    const dates=new Set(cur.dates||[]),d=b.dataset.d;dates.has(d)?dates.delete(d):dates.add(d);
    try{await S.db.doc('noshows/'+id).set({player:key,name:cur.name,dates:[...dates]})}catch(e){toast("Didn't save.")}});
  q('[data-pt]').forEach(b=>b.onclick=()=>{postType=b.dataset.pt;q('[data-pt]').forEach(x=>x.setAttribute('aria-pressed',x===b));$('p-evt').hidden=postType!=='event'});
  q('[data-nsp]').forEach(b=>b.onclick=()=>{newSport=b.dataset.nsp;renderAdmin()});
  on('n-go',async()=>{const date=$('n-date').value;if(!date){toast('Please pick a date.');return}
    const title=$('n-title').value.trim()||defaultTitle(newSport),id=slug(title).slice(0,24)+'-'+date;
    try{await S.db.doc('sessions/'+id).set({sport:newSport,date,start:$('n-start').value||'20:00',end:$('n-end').value||'22:00',timeTbc:$('n-tbc').checked,title,fee:Number($('n-fee').value)||0,capacity:Number($('n-cap').value)||20,venue:$('n-venue').value.trim(),opens:$('n-opens')?.value||''});showNew=false;adminSid=id;adminPicked=true;toast('Session posted.');renderAdmin()}catch(e){toast("Sorry, that didn't save.")}});
  on('p-go',async()=>{const title=$('p-title').value.trim();if(!title){toast('Add a title.');return}
    const lk=$('p-link').value.trim()||S.site?.url||'';if(!/^https:\/\//.test(lk)){toast(S.site?.url?'Please use a full https:// link.':'Please add a link, or set the BAD site link in Settings.');return}$('p-link').value=lk;
    const d={type:postType,club:$('p-club').value,title,body:$('p-body').value.trim(),link:$('p-link').value.trim(),postedAt:new Date().toISOString()};
    if(postType==='event'){d.date=$('p-date').value;d.time=$('p-time').value.trim();d.place=$('p-place').value.trim();const m=$('p-map').value.trim();if(m)d.mapLink=m}
    try{await S.db.collection('posts').add(d);toast('Posted.')}catch(e){toast("Didn't post.")}});
  q('[data-delpost]').forEach(b=>b.onclick=async()=>{try{await S.db.doc('posts/'+b.dataset.delpost).delete();toast('Removed.')}catch(e){toast("Didn't remove.")}});
  q('[data-ok]').forEach(b=>b.onclick=()=>approve(b.dataset.ok));q('[data-no]').forEach(b=>b.onclick=async()=>{try{await S.db.doc('requests/'+b.dataset.no).delete();toast('Declined.')}catch(e){}});
  {const sv=()=>{S.lpDraft={uid:$('lp-player')?.value,type:$('lp-type')?.value,pts:$('lp-pts')?.value,dept:$('lp-dept')?.value,reason:$('lp-reason')?.value}};
    ['lp-player','lp-pts','lp-dept','lp-reason'].forEach(id=>{const x=$(id);if(x)x.oninput=x.onchange=sv});
    const ty=$('lp-type');if(ty)ty.onchange=()=>{sv();S.lpDraft.pts=PS().other[ty.value];renderNow()}}
  on('lp-go',async()=>{const d=S.lpDraft||{},uid=$('lp-player').value,type=$('lp-type').value,pts=parseInt($('lp-pts').value,10);if(!uid){toast('Please pick a player.');return}if(isNaN(pts)||(!pts&&type!=='Adjustment')){toast('Please add the points.');return}
    if(!trackerName(uid))toast('Tip: add their name on tracker in Players so the sheet can match it.');
    try{await addLedger(null,{uid,type,pts,dept:$('lp-dept').value,reason:$('lp-reason').value.trim()||type});S.lpDraft=null;toast(`${pts>0?'+':''}${pts} for ${S.profiles[uid]?.nickname||'them'}.`)}catch(e){toast("Sorry, that didn't save.")}});
  q('[data-lrm]').forEach(b=>b.onclick=async()=>{const [k,id]=b.dataset.lrm.split('|');try{await S.db.doc((k==='b'?'badges/':'ledger/')+id).delete();toast('Deleted.')}catch(e){toast("Sorry, that didn't delete.")}});
  q('[data-givebadge]').forEach(b=>b.onclick=()=>openBadge(b.dataset.givebadge||''));
  on('imp-go',async()=>{const raw=$('imp-code').value.trim();
    try{if(!raw.startsWith('BAD1-'))throw 0;const d=JSON.parse(decodeURIComponent(escape(atob(raw.slice(5)))));if(!d.nickname)throw 0;const id='imp-'+slug(d.nickname)+'-'+Date.now().toString(36);const c=d.contact;delete d.contact;
      await S.db.doc('profiles/'+id).set(d);if(c)await S.db.doc('contacts/'+id).set(c);$('imp-code').value='';toast(d.nickname+' added.')}catch(e){toast('That code is not valid. Ask them to copy it again.')}});
  if(aTab==='shop')bindShopAdmin();
  bindCodes();if(aTab==='settings')bindBrand();
  q('[data-free]').forEach(b=>b.onclick=async()=>{const uid=b.dataset.free,cur={...(S.payments[adminSid]||{})},was=cur[uid]?.waived;if(was)delete cur[uid];else cur[uid]={ok:true,waived:true,at:new Date().toISOString(),by:window.BAD_USER?.email||''};
    try{await S.db.doc('payments/'+adminSid).set(cur);toast(was?'Back to pending.':'Done. Nothing to pay for this one.')}catch(e){toast("Sorry, that didn't save.")}});
  const pcSet=async(uid,mk,msg,src)=>{const c=(src||payChecks)().find(x=>x.uid===uid);if(!c)return;const at=new Date().toISOString();
    try{for(const r of c.items){const cur={...(S.payments[r.sid]||{})};cur[uid]=mk(at,r);await S.db.doc('payments/'+r.sid).set(cur)}toast(msg)}catch(e){toast("Sorry, that didn't save.")}};
  q('[data-pcok]').forEach(b=>b.onclick=()=>pcSet(b.dataset.pcok,(at,r)=>({ok:true,at,method:S.bookings[b.dataset.pcok]?.s?.[r.sid]?.pay||'cash',by:window.BAD_USER?.email||''}),'Payment confirmed. Thank you.'));
  q('[data-pcfree]').forEach(b=>b.onclick=()=>pcSet(b.dataset.pcfree,at=>({ok:true,waived:true,at,by:window.BAD_USER?.email||''}),'Done. Nothing to pay.'));
  q('[data-upok]').forEach(b=>b.onclick=()=>pcSet(b.dataset.upok,(at,r)=>({ok:true,at,method:S.bookings[b.dataset.upok]?.s?.[r.sid]?.pay||'cash',by:window.BAD_USER?.email||''}),'Marked as paid. Thank you.',unpaidList));
  q('[data-upfree]').forEach(b=>b.onclick=()=>pcSet(b.dataset.upfree,at=>({ok:true,waived:true,at,by:window.BAD_USER?.email||''}),'Done. Nothing to pay.',unpaidList));
  const pq=$('pay-q');if(pq)pq.oninput=()=>{const v=pq.value.toLowerCase();S.payQ=pq.value;document.querySelectorAll('#a-unpaid .li').forEach(li=>li.hidden=v&&!li.dataset.q.includes(v))};
  q('[data-pcrm]').forEach(b=>b.onclick=async()=>{const uid=b.dataset.pcrm,c=payChecks().find(x=>x.uid===uid),bk=S.bookings[uid];if(!c||!bk)return;const s={...bk.s};
    c.items.forEach(r=>{const x={...s[r.sid]};delete x.sent;delete x.ask;s[r.sid]=x});
    try{await S.db.doc('bookings/'+uid).set({...bk,s});toast('Request removed. It stays as unpaid.')}catch(e){toast("Sorry, that didn't save.")}});
  q('[data-pundo]').forEach(b=>b.onclick=async()=>{const [sid,uid]=b.dataset.pundo.split('|'),cur={...(S.payments[sid]||{})};delete cur[uid];
    try{await S.db.doc('payments/'+sid).set(cur);toast('Undone. It shows as unpaid again.')}catch(e){toast("Sorry, that didn't save.")}});
  q('[data-uparm]').forEach(b=>b.onclick=()=>{S.rmArm=S.rmArm===b.dataset.uparm?null:b.dataset.uparm;renderNow()});
  q('[data-uprmno]').forEach(b=>b.onclick=()=>{S.rmArm=null;renderNow()});
  q('[data-uprm]').forEach(b=>b.onclick=async()=>{const [uid,sid]=b.dataset.uprm.split('|'),bk=S.bookings[uid];S.rmArm=null;if(!bk)return;const s={...bk.s};(sid==='*'?pendingFor(uid).filter(r=>canSport(S.sessions[r.sid].sport)).map(r=>r.sid):[sid]).forEach(k=>delete s[k]);
    try{await S.db.doc('bookings/'+uid).set({...bk,s});toast(`Removed. ${S.profiles[uid]?.nickname||'They'} no longer owe${S.profiles[uid]?'s':''} for this one.`)}catch(e){toast("Sorry, that didn't save.")}});
  q('[data-pcno]').forEach(b=>b.onclick=async()=>{const uid=b.dataset.pcno,c=payChecks().find(x=>x.uid===uid),bk=S.bookings[uid];if(!c||!bk)return;const s={...bk.s},at=new Date().toISOString();
    c.items.forEach(r=>{const x={...s[r.sid]};delete x.sent;x.ask={...(x.ask||{}),no:at};s[r.sid]=x});
    try{await S.db.doc('bookings/'+uid).set({...bk,s});toast('Noted. The player will see it wasn’t found yet.')}catch(e){toast("Sorry, that didn't save.")}});
  q('[data-tracker]').forEach(x=>x.onchange=async()=>{const uid=x.dataset.tracker,v=x.value.trim().slice(0,30),clash=Object.entries(S.profiles).find(([u])=>u!==uid&&normName(trackerName(u))===normName(v));
    if(v&&clash){toast(`${clash[1].nickname} already uses that name.`);x.value=S.profiles[uid]?.listName||'';return}
    try{await S.db.doc('profiles/'+uid).update({listName:v,updatedAt:new Date().toISOString()});toast(v?`Saved. ${S.profiles[uid]?.nickname||'They'} match${S.profiles[uid]?'es':''} "${v}" on the tracker.`:'Cleared.')}catch(e){toast("Sorry, that didn't save.")}});
  on('gm-add',async()=>{const u=$('gm-pick').value;if(!u){toast('Please pick someone.');return}const s=S.sessions[adminSid];try{await S.db.doc('sessions/'+adminSid).update({gms:[...new Set([...(s.gms||[]),u])]});toast(`${S.profiles[u]?.nickname||'They'} is Game Master for ${s.title}.`)}catch(e){toast("Sorry, that didn't save.")}});
  q('[data-gmrm]').forEach(b=>b.onclick=async()=>{const s=S.sessions[adminSid];try{await S.db.doc('sessions/'+adminSid).update({gms:(s.gms||[]).filter(x=>x!==b.dataset.gmrm)});toast('Removed.')}catch(e){toast("Sorry, that didn't save.")}});
  q('[data-addmode]').forEach(b=>b.onclick=()=>{S.addMode=b.dataset.addmode;renderNow()});
  on('ap-go',async()=>{const u=$('ap-uid').value;if(!u){toast('Please pick a player.');return}const cur=S.bookings[u]||{s:{}},sid=adminSid;
    try{await S.db.doc('bookings/'+u).set({...cur,key:S.profiles[u]?.listKey||cur.key||'',s:{...(cur.s||{}),[sid]:{at:new Date().toISOString(),guests:[],pay:'cash',byAdmin:window.BAD_USER?.email||''}}});toast(`${S.profiles[u]?.nickname||'Player'} is in.`)}catch(e){toast("Sorry, that didn't save.")}});
  on('ag-go',async()=>{const n=$('ag-name').value.trim().slice(0,30),host=$('ag-host').value,sid=adminSid,at=new Date().toISOString();if(!n){toast("Please type the guest's name.");return}
    try{if(host){const cur=S.bookings[host];const x={...cur.s[sid]};x.guests=[...(x.guests||[]),{n,at,byAdmin:true}];await S.db.doc('bookings/'+host).set({...cur,s:{...cur.s,[sid]:x}})}
      else{const id='g-'+slug(n)+'-'+Date.now().toString(36);await S.db.doc('bookings/'+id).set({key:'guest-'+slug(n),name:n,guest:true,addedBy:window.BAD_USER?.email||'',s:{[sid]:{at,guests:[],pay:'cash',byAdmin:true}}})}
      toast(`${n} is in.`);$('ag-name').value=''}catch(e){toast("Sorry, that didn't save.")}});
  q('[data-rrarm]').forEach(b=>b.onclick=()=>{S.rosterRm=b.dataset.rrarm;renderNow();setTimeout(()=>{if(S.rosterRm===b.dataset.rrarm){S.rosterRm=null;renderNow()}},4000)});
  q('[data-rrm]').forEach(b=>b.onclick=async()=>{const [uid,gi]=b.dataset.rrm.split('|'),sid=adminSid,cur=S.bookings[uid];S.rosterRm=null;if(!cur)return;const s={...cur.s};
    if(gi===''){delete s[sid]}else{const x={...s[sid]};x.guests=(x.guests||[]).filter((_,i)=>i!==+gi);s[sid]=x}
    try{if(cur.guest&&!Object.keys(s).length)await S.db.doc('bookings/'+uid).delete();else await S.db.doc('bookings/'+uid).set({...cur,s});toast('Taken off the session.')}catch(e){toast("Sorry, that didn't save.")}});
  q('[data-freeall]').forEach(b=>b.onclick=async()=>{const uid=b.dataset.freeall,list=pendingFor(uid),at=new Date().toISOString();
    try{for(const r of list){const cur={...(S.payments[r.sid]||{})};cur[uid]={ok:true,waived:true,at,by:window.BAD_USER?.email||''};await S.db.doc('payments/'+r.sid).set(cur)}toast(`Cleared AED ${list.reduce((t,r)=>t+r.amount,0)} for ${S.profiles[uid]?.nickname||'this player'}.`)}catch(e){toast("Sorry, that didn't save.")}});
  q('[data-paid]').forEach(b=>b.onclick=async()=>{const uid=b.dataset.paid,cur={...(S.payments[adminSid]||{})},was=cur[uid]?.ok;cur[uid]={ok:!was,at:new Date().toISOString(),method:S.bookings[uid]?.s?.[adminSid]?.pay||'cash'};
    try{await S.db.doc('payments/'+adminSid).set(cur);toast(was?'Marked as unpaid.':'Payment confirmed.')}catch(e){toast("Sorry, that didn't save.")}});
  on('pc-save',async()=>{const d={accName:$('pc-acc').value.trim(),bankName:$('pc-bank').value.trim(),iban:$('pc-iban').value.trim(),ziinaLink:$('pc-ziina').value.trim(),careemName:$('pc-cname').value.trim(),careemNo:$('pc-cno').value.trim(),careemLink:$('pc-clink').value.trim()};
    q('[data-pon]').forEach(x=>d[x.dataset.pon]=x.checked);
    if(d.ziinaLink&&!/^https:\/\//.test(d.ziinaLink)){toast('Please use a full https:// link for Ziina.');return}
    try{await S.db.doc('config/payments').set(d);toast('Payment details saved.')}catch(e){toast("Sorry, that didn't save.")}});
  on('rm-samples',removeSamples);
  const setMem=async(uid,val)=>{const cur={...(S.members||{})};if(val)cur[uid]=val;else delete cur[uid];try{await S.db.doc('config/members').set(cur);S.members=cur;renderAdmin()}catch(e){toast("Sorry, that didn't save.")}};
  q('[data-mok]').forEach(b=>b.onclick=()=>{const uid=b.dataset.mok,m=memStatus(uid);setMem(uid,{type:m.type,at:new Date().toISOString(),by:window.BAD_USER?.email||''}).then(()=>toast(`${S.profiles[uid]?.nickname||'Player'} is verified as ${m.type}.`))});
  q('[data-mno]').forEach(b=>b.onclick=()=>{const uid=b.dataset.mno,m=memStatus(uid);setMem(uid,{...(S.members[uid]||{}),declined:m.type,at:new Date().toISOString()})});
  const saveTypes=async L=>{try{await S.db.doc('config/membership').set({types:L});S.memCfg={types:L};renderAdmin()}catch(e){toast("Sorry, that didn't save.")}};
  q('[data-mverify]').forEach(x=>x.onchange=()=>{const L=memTypes().map(t=>({...t}));L[+x.dataset.mverify].verify=x.checked;saveTypes(L)});
  q('[data-mstaff]').forEach(x=>x.onchange=()=>{const L=memTypes().map(t=>({...t}));L[+x.dataset.mstaff].staff=x.checked;saveTypes(L)});
  q('[data-memset]').forEach(x=>x.onchange=async()=>{const uid=x.dataset.memset,k=x.value;try{const em=((S.contacts[uid]||{}).email||'').toLowerCase();if(window.BAD_WEB&&canManageAdmins()&&lvAdmin(k)&&em&&!isAdminEmail(em)){const pr=S.profiles[uid]||{},r=k==='Community Manager'?{role:'cm',sports:[pr.primary||(pr.sports||['badminton'])[0]]}:k==='Founder'?{role:'founder',sports:[]}:{role:'app',sports:[]};await S.db.doc('admins/'+em).set({...r,addedBy:window.BAD_USER?.email||'',at:new Date().toISOString(),via:k});toast(`${S.profiles[uid]?.nickname||'Player'} can now use the Admin tab.`)}await S.db.doc('profiles/'+uid).update({memReq:{type:k,at:new Date().toISOString()}});await setMem(uid,{type:k,at:new Date().toISOString(),by:window.BAD_USER?.email||''});toast(`${S.profiles[uid]?.nickname||'Player'} is now ${k}.`)}catch(e){toast("Sorry, that didn't save.")}});
  const accessVal=v=>v==='app'?{role:'app',sports:[]}:v==='founder'?{role:'founder',sports:[]}:v.startsWith('cm:')?{role:'cm',sports:[v.slice(3)]}:null;
  q('[data-access]').forEach(x=>x.onchange=async()=>{const uid=x.dataset.access,em=((S.contacts[uid]||{}).email||'').toLowerCase(),nm=S.profiles[uid]?.nickname||'Player',r=accessVal(x.value);if(!em)return;
    try{if(!r){await S.db.doc('admins/'+em).delete();toast(`${nm} no longer has admin access.`)}else{await S.db.doc('admins/'+em).set({...r,addedBy:window.BAD_USER?.email||'',at:new Date().toISOString()});toast(`${nm} is now ${roleLabel(r)}. They may need to reopen the app.`)}}catch(e){toast("Sorry, that didn't save.")}});
  q('[data-adm]').forEach(b=>b.onclick=async()=>{const uid=b.dataset.adm,em=((S.contacts[uid]||{}).email||'').toLowerCase(),nm=S.profiles[uid]?.nickname||'Player';if(!em)return;
    try{if(isAdminEmail(em)){await S.db.doc('admins/'+em).delete();toast(`${nm} no longer has admin access.`)}else{await S.db.doc('admins/'+em).set({addedBy:window.BAD_USER?.email||'',at:new Date().toISOString()});toast(`${nm} can now use the Admin tab. They may need to reopen the app.`)}}catch(e){toast("Sorry, that didn't save.")}});
  q('[data-madmin]').forEach(x=>x.onchange=()=>{const L=memTypes().map(t=>({...t}));L[+x.dataset.madmin].admin=x.checked;saveTypes(L)});
  q('[data-mdel]').forEach(b=>b.onclick=()=>{const L=memTypes().filter((_,i)=>i!==+b.dataset.mdel);saveTypes(L)});
  on('mt-add',()=>{const k=$('mt-name').value.trim();if(!k){toast('Please name the type.');return}if(memTypes().some(t=>t.k.toLowerCase()===k.toLowerCase())){toast('That type already exists.');return}saveTypes([...memTypes(),{k,d:$('mt-desc').value.trim(),verify:true}])});
  on('site-go',async()=>{const u=$('site-url').value.trim();if(u&&!/^https:\/\//.test(u)){toast('Please use a full https:// link.');return}try{await S.db.doc('config/site').set({url:u});toast('Website link saved.')}catch(e){toast("Sorry, that didn't save.")}});
  on('ad-go',async()=>{const e=$('ad-email').value.trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(e)){toast('Please enter a full email address.');return}const r=accessVal($('ad-role').value);
    try{await S.db.doc('admins/'+e).set({...r,addedBy:window.BAD_USER?.email||'',at:new Date().toISOString()});toast(`${e} is now ${roleLabel(r)}.`);$('ad-email').value=''}catch(x){toast("Sorry, that didn't save.")}});
  q('[data-unadmin]').forEach(b=>b.onclick=async()=>{try{await S.db.doc('admins/'+b.dataset.unadmin).delete();toast('Removed.')}catch(x){toast("Sorry, that didn't save.")}});
}
async function approve(id){const r=S.requests[id];if(!r)return;const pt=pointsFor(id),c=PS();
  if(pt.unpaid){toast('They have an unpaid balance. Please settle it first.');return}if(pt.balance<c.free){toast(`They need ${c.free} points.`);return}
  try{await addLedger(null,{uid:id,type:'Free session redeemed',pts:c.other['Free session redeemed'],reason:'Free session'});await S.db.doc('requests/'+id).delete();toast('Approved. Enjoy the session.')}catch(e){toast("Didn't save.")}}

function parseDate(s){const m=String(s).match(/(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})/);if(!m)return null;const mo=MONTHS[m[2].toLowerCase()];if(!mo)return null;return `${m[3]}-${String(mo).padStart(2,'0')}-${m[1].padStart(2,'0')}`}
const isTrue=v=>v===true||String(v).toUpperCase()==='TRUE';
/* ---------- club referral codes ---------- */
function codesPanel(){const L=S.codes||{},used=c=>Object.values(S.profiles).filter(p=>normCode(p.referredBy)===c).length;
  return `<div class="panel"><h3 class="ah">Invite codes</h3>
  <p class="hint">Codes from BAD for people who weren’t invited by a member: events, posters, Instagram, partners. New players type it in Referral code when they sign up.</p>
  <div class="list">${Object.entries(L).sort().map(([c,a])=>`<div class="li" style="grid-template-columns:minmax(0,1fr) auto auto"><div><div class="nm num">${esc(c)}${a.off?' <span class="tagl">Ended</span>':''}</div><div class="sub">${esc(a.label||'')} · used ${used(c)}</div></div>
    <button class="btn ghost sm" data-coff="${esc(c)}">${a.off?'Turn on':'End'}</button><button class="btn ghost sm" data-cdel="${esc(c)}" aria-label="Delete ${esc(c)}">Delete</button></div>`).join('')||'<div class="empty">No invite codes yet.</div>'}</div>
  <div class="row" style="margin-top:12px;align-items:flex-end">
    <div class="field" style="flex:1;min-width:140px;margin:0"><label for="cc-code">Code</label><input type="text" id="cc-code" placeholder="THEBADCLUB" maxlength="12" style="text-transform:uppercase"></div>
    <div class="field" style="flex:2;min-width:160px;margin:0"><label for="cc-label">What it’s for</label><input type="text" id="cc-label" placeholder="BADoween poster"></div>
    <button class="btn" id="cc-add">Add code</button></div></div>`}
async function saveCodes(L){try{await S.db.doc('config/codes').set({list:L});S.codes=L;render()}catch(e){toast('Sorry, that didn’t save.')}}
function bindCodes(){
  const add=$('cc-add');if(!add)return;
  add.onclick=()=>{const c=$('cc-code').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');if(c.length<3){toast('Codes need at least 3 letters or numbers.');return}
    if(Object.values(S.profiles).some(p=>refsOf(p).some(r=>normCode(r)===c))){toast('A member already uses that code. Please pick another.');return}
    (async()=>{if(S.db.runTransaction){try{const d=await S.db.doc('refcodes/'+c).get();if(d.exists&&d.data().uid!=='club'){toast('A member already uses that code. Please pick another.');return}await S.db.doc('refcodes/'+c).set({uid:'club',code:c,at:new Date().toISOString()})}catch(_){}}
    saveCodes({...S.codes,[c]:{label:$('cc-label').value.trim()||'BAD invite code',at:new Date().toISOString()}}).then(()=>toast(c+' is ready to share.'))})()};
  document.querySelectorAll('[data-coff]').forEach(b=>b.onclick=()=>{const c=b.dataset.coff,L={...S.codes};L[c]={...L[c],off:!L[c].off};saveCodes(L)});
  document.querySelectorAll('[data-cdel]').forEach(b=>b.onclick=()=>{const c=b.dataset.cdel,L={...S.codes};delete L[c];saveCodes(L)});
}

function memPending(){return Object.entries(S.profiles).filter(([,p])=>!p.sample).map(([uid,p])=>[uid,p,memStatus(uid)]).filter(([,,m])=>m.state==='pending').sort((a,b)=>String(a[2].at||'').localeCompare(String(b[2].at||'')))}

/* players who asked an admin to check a payment, or tapped I've paid */
function payChecks(){const out=[];
  for(const [uid,b] of Object.entries(S.bookings||{})){const bs=b?.s||{};
    const items=pendingFor(uid).filter(r=>{const x=bs[r.sid]||{},s=S.sessions[r.sid];return s&&canSport(s.sport)&&((x.ask&&!x.ask.no)||x.sent)});
    if(!items.length)continue;const note=items.map(r=>bs[r.sid].ask?.note).find(Boolean)||'',at=items.map(r=>bs[r.sid].ask?.at||bs[r.sid].sent).sort().pop();
    out.push({uid,items,note,at,total:items.reduce((t,r)=>t+r.amount,0)})}
  return out.sort((a,b)=>String(a.at).localeCompare(String(b.at)))}
const rmBtn=(uid,sid,amt)=>`<span class="row" style="gap:8px;flex:none"><span class="num">${amt}</span><button class="rmx" data-uparm="${esc(uid)}|${esc(sid)}" aria-label="Remove this booking" aria-pressed="${S.rmArm===uid+'|'+sid}">${ic('x')}</button></span>`;
const rmConf=(uid,sid,n)=>S.rmArm===uid+'|'+sid?`<div class="rmconf"><span class="fine">${sid==='*'&&n>1?`Remove all ${n} unpaid bookings?`:'Remove this booking?'} They won’t owe for it and come off the session list.</span><div class="row" style="gap:6px"><button class="chip sm" data-uprm="${esc(uid)}|${esc(sid)}">${ic('x')}Remove</button><button class="chip sm" data-uprmno="1">Keep</button></div></div>`:'';
function unpaidList(){const out=[];
  for(const uid of Object.keys(S.bookings||{})){const items=pendingFor(uid).filter(r=>canSport(S.sessions[r.sid].sport));if(items.length)out.push({uid,items,total:items.reduce((t,r)=>t+r.amount,0)})}
  return out.sort((a,b)=>b.total-a.total)}
function aPayments(){
  const C=payChecks(),U=unpaidList(),Cu=new Set(C.map(c=>c.uid)),UL=U.filter(u=>!Cu.has(u.uid)),owed=U.reduce((t,u)=>t+u.total,0),since=Date.now()-14*864e5,rec=[];
  for(const [sid,m] of Object.entries(S.payments||{})){const s=S.sessions[sid];if(!s||!canSport(s.sport))continue;for(const [uid,P] of Object.entries(m||{}))if(P&&P.ok&&P.at&&Date.parse(P.at)>since)rec.push({sid,uid,P,s})}
  rec.sort((a,b)=>String(b.P.at).localeCompare(String(a.P.at)));
  const nm=uid=>esc(S.profiles[uid]?.nickname||'Player');
  return `<div class="tiles">${tile(C.length,'To check')}${tile(owed,'AED unpaid')}${tile(U.length,'Players owing')}</div>
  ${payChecksHTML()||box('Payments to check','<p class="hint">Nothing to check right now. When a player taps Check with admin or I\'ve paid, they show here.</p>')}
  ${box(`Unpaid <span class="hint num">AED ${owed}</span>`,UL.length?`<input type="search" id="pay-q" placeholder="Search a player" value="${esc(S.payQ||'')}" aria-label="Search unpaid players"><div class="list" id="a-unpaid">${UL.map(u=>{const p=S.profiles[u.uid]||{},bs=S.bookings[u.uid]?.s||{};return `<div class="li pcheck" data-q="${esc((p.nickname||'').toLowerCase())}" style="grid-template-columns:auto minmax(0,1fr)">${avatar(p,p.listKey)}<div><div class="row" style="justify-content:space-between"><span class="nm">${nm(u.uid)}</span><b class="num">AED ${u.total}</b></div>
    ${u.items.map(r=>{const s=S.sessions[r.sid],x=bs[r.sid]||{};return `<div class="sub pline"><span>${esc(s.title||sportOf(s.sport).club)} · ${fmtS(s)} · ${PAY[x.pay||'cash']?.label||'Cash'}</span>${u.items.length>1?rmBtn(u.uid,r.sid,r.amount):''}</div>${rmConf(u.uid,r.sid)}`}).join('')}
    <div class="row" style="gap:6px;margin-top:8px"><button class="chip sm" data-upok="${esc(u.uid)}">${ic('check')}Mark all paid</button><button class="chip sm" data-upfree="${esc(u.uid)}">Make free</button><button class="chip sm" data-uparm="${esc(u.uid)}|*" aria-pressed="${S.rmArm===u.uid+'|*'}">${ic('x')}Remove</button></div>${rmConf(u.uid,'*',u.items.length)}<div hidden></div></div></div>`}).join('')}</div>`:(U.length?'<p class="hint">Everyone else owing is in Payments to check above.</p>':'<p class="hint">Everyone is paid up. Thank you.</p>'))}
  ${boxD(`Confirmed in the last 2 weeks <span class="hint num">${rec.length}</span>`,rec.length?`<div class="list">${rec.slice(0,40).map(r=>`<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div><span class="nm">${nm(r.uid)}</span><div class="sub">${esc(r.s.title||sportOf(r.s.sport).club)} · ${fmtS(r.s)}${r.P.by?' · by '+esc(r.P.by.split('@')[0]):''}</div></div><div class="row" style="gap:6px"><span class="tagl solid">${ic('check')}${r.P.waived?'Free':PAY[r.P.method]?.label||'Paid'}</span><button class="chip sm" data-pundo="${esc(r.sid)}|${esc(r.uid)}">Undo</button></div></div>`).join('')}</div>`:'<p class="hint">Nothing confirmed yet.</p>')}`}
function payChecksHTML(){const L=payChecks();if(!L.length)return '';
  return box(`Payments to check <span class="hint num">${L.length}</span>`,`<div class="list">${L.map(c=>{const p=S.profiles[c.uid]||{},bs=S.bookings[c.uid]?.s||{};return `<div class="li pcheck" style="grid-template-columns:auto minmax(0,1fr)">${avatar(p,p.listKey)}<div><div class="row" style="justify-content:space-between"><span class="nm">${esc(p.nickname||'Player')}</span><b class="num">AED ${c.total}</b></div>
    ${c.items.map(r=>{const s=S.sessions[r.sid],x=bs[r.sid]||{};return `<div class="sub pline"><span>${esc(s.title||sportOf(s.sport).club)} · ${fmtS(s)} · ${PAY[x.pay||'cash']?.label||'Cash'}${x.sent?' · says paid':''}</span>${c.items.length>1?rmBtn(c.uid,r.sid,r.amount):''}</div>${rmConf(c.uid,r.sid)}`}).join('')}
    ${c.note?`<p class="hint" style="margin:6px 0 0">“${esc(c.note)}”</p>`:''}
    <div class="row" style="gap:6px;margin-top:8px"><button class="chip sm" data-pcok="${esc(c.uid)}">${ic('check')}Paid</button><button class="chip sm" data-pcfree="${esc(c.uid)}">Make free</button><button class="chip sm" data-pcno="${esc(c.uid)}">Not received</button><button class="chip sm" data-uparm="${esc(c.uid)}|*" aria-pressed="${S.rmArm===c.uid+'|*'}">${ic('x')}Remove</button><button class="chip sm" data-pcrm="${esc(c.uid)}">Remove request</button></div>${rmConf(c.uid,'*',c.items.length)}<div hidden></div></div></div>`}).join('')}</div>`)}

/* a player's unpaid sessions (for admins) */
function pendingFor(uid){const b=S.bookings[uid]?.s||{},out=[];
  for(const [sid,x] of Object.entries(b)){const s=S.sessions[sid];if(!s)continue;const r=roster(sid),P=S.payments[sid]?.[uid];if(P&&P.ok)continue;
    let amount=0;if(x.out)amount=feeFor(s,x.out).amount;else if(r.in.some(e=>e.uid===uid&&!e.guest)){const g=(x.guests||[]).filter(g=>!g.out||r.late.some(e=>e.uid===uid&&e.guest===g.n)).length;amount=(Number(s.fee)||0)*(1+g)}
    if(amount)out.push({sid,amount})}
  return out}
