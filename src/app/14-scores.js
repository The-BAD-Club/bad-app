/* ---------- Scores: submit → opposing team confirms → Support finalises ----------
   A finished game (status review) counts for nothing until Support finalises it. Every step records who and when.
   results/{gameId}: sub (submitted), conf (confirmed by the other team), disp (disputed), fin (final, by Support).
   Scores are always stored the game's way round: sa for Team A, sb for Team B. */
S.results={};
const scoreDraft={};let disputeFor=null,correctFor=null;
const DISPUTE_REASONS=['Wrong score','Wrong winner','Not our game','Other'];
const resOf=gid=>S.results[gid]||{};
const teamOf=(g,uid)=>g.a.includes(uid)?'a':g.b.includes(uid)?'b':null;
const otherT=t=>t==='a'?'b':'a';
const v2=g=>g&&g.v===2;
/* where a game is in the process */
function gState(gid,g){if(g.st==='played')return 'played';if(g.st==='cancelled')return 'cancelled';if(g.st==='final')return 'final';
  const r=resOf(gid);if(r.disp)return 'disputed';if(r.sub&&r.conf)return 'ready';if(r.sub)return 'submitted';return 'noscore'}
const teamNames=(sid,ids)=>ids.map(p=>esc(p===S.uid?'You':nm(sid,p))).join(' & ');
const scoreTxt=(sa,sb)=>`${sa}–${sb}`;
/* a score from one team's side: "21–17" with their own score first */
const mySide=(t,sa,sb)=>t==='b'?[sb,sa]:[sa,sb];
const fmtOf=g=>g.fmt||21;
const isSupport=sid=>(S.canEdit&&canSport((S.sessions[sid]||{}).sport||'badminton'))||isGM(sid);

/* ---------- player side ---------- */
function scoreInputs(gid,g,labels,opts={}){const d=scoreDraft[gid]||{},hint=d.x!==undefined&&d.y!==undefined&&d.x!==''&&d.y!==''?BADMATH.scoreHint(fmtOf(g),d.x,d.y):'';
  return `<div class="scorein" data-scgid="${esc(gid)}">
    <label class="sl"><span>${labels[0]}</span><input type="number" inputmode="numeric" min="0" max="35" class="sc" data-scx="x" value="${esc(d.x??'')}" aria-label="Score: ${labels[0].replace(/<[^>]+>/g,'')}"></label>
    <label class="sl"><span>${labels[1]}</span><input type="number" inputmode="numeric" min="0" max="35" class="sc" data-scx="y" value="${esc(d.y??'')}" aria-label="Score: ${labels[1].replace(/<[^>]+>/g,'')}"></label>
    <p class="fine schint" role="status">${esc(hint)}</p>
    ${opts.note?`<input type="text" maxlength="80" class="scnote" data-scx="note" placeholder="${esc(opts.note)}" value="${esc(d.note||'')}">`:''}
    <div class="row" style="gap:6px">${opts.buttons}</div></div>`}
function playerGameTile(sid,gid,g){const t=teamOf(g,S.uid);if(!t)return '';const r=resOf(gid),st=gState(gid,g),f=fmtOf(g);
  const mine=`<b>Your team</b> · ${teamNames(sid,g[t])}`,theirs=`<b>Opponents</b> · ${teamNames(sid,g[otherT(t)])}`;
  const head=`<div class="row" style="justify-content:space-between"><span class="label">${esc(g.court)} · to ${f}</span>${st==='final'?`<span class="tagl solid">${ic('check')}Final</span>`:''}</div>`;
  if(st==='noscore'||(st==='submitted'&&r.sub.team===t&&S.edit===gid)||(st==='disputed'&&S.edit===gid))
    return `<div class="tile prompt">${head}<b>Add the final score</b>${scoreInputs(gid,g,[mine,theirs],{buttons:`<button class="btn sm" data-sc="submit" data-gid="${esc(gid)}">${ic('check')}Send score</button>${S.edit===gid?`<button class="btn ghost sm" data-sc="noedit">Back</button>`:''}`})}<p class="fine">One player from the other team confirms it, then Support makes it final.</p></div>`;
  if(st==='submitted'&&r.sub.team===t){const [x,y]=mySide(t,r.sub.sa,r.sub.sb);
    return `<div class="tile">${head}<p>You sent <b class="num">${scoreTxt(x,y)}</b> (${x>y?'win':'loss'}). Waiting for ${teamNames(sid,g[otherT(t)])} to confirm.</p><button class="linkbtn" data-sc="edit" data-gid="${esc(gid)}">Change the score</button></div>`}
  if(st==='submitted'){const [x,y]=mySide(t,r.sub.sa,r.sub.sb);
    if(disputeFor===gid)return `<div class="tile prompt">${head}<b>What’s wrong?</b><div class="chips" role="group">${DISPUTE_REASONS.map(x=>`<button class="chip sm" data-sc="why" data-v="${esc(x)}" aria-pressed="${(scoreDraft[gid]||{}).why===x}">${esc(x)}</button>`).join('')}</div>
      <div class="row" style="gap:6px"><button class="btn sm" data-sc="dispute" data-gid="${esc(gid)}" ${(scoreDraft[gid]||{}).why?'':'disabled'}>Send to Support</button><button class="btn ghost sm" data-sc="nodispute">Back</button></div><p class="fine">Or enter the right score instead:</p>
      ${scoreInputs(gid,g,[mine,theirs],{buttons:`<button class="btn ghost sm" data-sc="submit" data-gid="${esc(gid)}">Send this score instead</button>`})}</div>`;
    return `<div class="tile prompt">${head}<b>Confirm the score</b><p>${teamNames(sid,g[otherT(t)])} sent <b class="num">${scoreTxt(x,y)}</b>, a ${x>y?'win':'loss'} for your team.</p>
      <div class="row" style="gap:6px"><button class="btn sm" data-sc="confirm" data-gid="${esc(gid)}">${ic('check')}That’s right</button><button class="btn ghost sm" data-sc="askdispute" data-gid="${esc(gid)}">Something’s wrong</button></div></div>`}
  if(st==='ready'){const [x,y]=mySide(t,r.sub.sa,r.sub.sb);return `<div class="tile">${head}<p><b class="num">${scoreTxt(x,y)}</b> agreed by both teams. Support will make it final.</p></div>`}
  if(st==='disputed')return `<div class="tile">${head}<p>Support is checking this score.</p><button class="linkbtn" data-sc="edit" data-gid="${esc(gid)}">Enter the right score</button></div>`;
  return '';}
/* everything a player needs to act on, then their results tonight */
function playerScoresHTML(sid){const mine=liveGames(sid).filter(([,g])=>v2(g)&&teamOf(g,S.uid));if(!mine.length)return '';
  const needsMe=([gid,g])=>{const st=gState(gid,g),r=resOf(gid),t=teamOf(g,S.uid);return st==='noscore'||(st==='submitted'&&r.sub.team!==t)||S.edit===gid||disputeFor===gid};
  const act=mine.filter(([gid,g])=>['noscore','submitted','disputed','ready'].includes(gState(gid,g))).reverse();
  const now=act.filter(needsMe),later=act.filter(x=>!needsMe(x));
  const done=mine.filter(([gid,g])=>gState(gid,g)==='final').reverse();
  return `${now.map(([gid,g])=>playerGameTile(sid,gid,g)).join('')}${later.length?`<div class="sec"><span class="label">Waiting for others · ${later.length}</span>${later.map(([gid,g])=>playerGameTile(sid,gid,g)).join('')}</div>`:''}
    ${done.length?`<div class="sec"><span class="label">Your results · ${done.length}</span><div class="list">${done.map(([gid,g])=>{const t=teamOf(g,S.uid),[x,y]=mySide(t,g.final[0],g.final[1]);
      return `<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">${x>y?'Won':'Lost'} · with ${teamNames(sid,g[t].filter(p=>p!==S.uid))||'—'}</div><div class="sub">v ${teamNames(sid,g[otherT(t)])} · ${esc(g.court)}</div></div><b class="num big" style="font-size:1.4rem">${scoreTxt(x,y)}</b></div>`}).join('')}</div></div>`:''}`}

/* ---------- Support queue ---------- */
const GROUPS=[['ready','Ready to finalise','Both teams agree. One tap makes it count.'],['disputed','Disputed','The teams disagree. Check with them, then enter the right score.'],
  ['submitted','Needs confirming','One team has sent a score. If the other team can’t confirm, finalise it with a reason.'],['noscore','Needs a score','Nobody has sent a score yet. Ask the players, or enter it for guests.']];
function supportCount(sid){return liveGames(sid).filter(([gid,g])=>v2(g)&&['ready','disputed','submitted','noscore'].includes(gState(gid,g))).length}
function supportRow(sid,gid,g,st){const r=resOf(gid),f=fmtOf(g),A=teamNames(sid,g.a),B=teamNames(sid,g.b);
  const claim=r.sub?`<p class="fine">${esc(nm(sid,r.sub.by))} sent <b class="num">${scoreTxt(r.sub.sa,r.sub.sb)}</b>${r.conf?` · confirmed by ${esc(nm(sid,r.conf.by))}`:''}${r.disp?` · disputed by ${esc(nm(sid,r.disp.by))}: ${esc(r.disp.why||'')}`:''}</p>`:'';
  let act='';
  if(st==='ready')act=`<button class="btn sm" data-sc="fin" data-gid="${esc(gid)}" data-how="agreed">${ic('check')}Finalise ${scoreTxt(r.sub.sa,r.sub.sb)}</button><button class="linkbtn" data-sc="sedit" data-gid="${esc(gid)}">Enter a different score</button>`;
  else if(st==='submitted'&&!S.sedit[gid])act=`<button class="btn ghost sm" data-sc="fin" data-gid="${esc(gid)}" data-how="unavailable">Other team unavailable · finalise ${scoreTxt(r.sub.sa,r.sub.sb)}</button><button class="linkbtn" data-sc="sedit" data-gid="${esc(gid)}">Enter a different score</button>`;
  if(st==='noscore'||st==='disputed'||S.sedit[gid])act=scoreInputs(gid,g,[`<b>Team A</b> · ${A}`,`<b>Team B</b> · ${B}`],{note:st==='disputed'?'What was agreed with the players':'',buttons:`<button class="btn sm" data-sc="fin" data-gid="${esc(gid)}" data-how="support">${ic('check')}Finalise this score</button>`});
  act+=gameTools(sid,gid,g);
  return `<div class="li qrow"><div><div class="nm">${A} <span class="muted">v</span> ${B}</div><div class="sub">${esc(g.court)} · to ${f} · ${hhmm(new Date(msOf(g.endDev)||Date.now()).toISOString())}${isFinite(gameMins(g))?` · ${Math.round(gameMins(g))} min`:''}</div>${claim}<div class="qact">${act}</div></div></div>`}
/* fix a mistake: put the game back on its court, void it (kept, counts for nothing) or delete it (admins) */
let toolFor=null,toolAsk=null;
function gameTools(sid,gid,g){const admin=S.canEdit&&canSport((S.sessions[sid]||{}).sport||'badminton');
  if(toolFor!==gid)return `<button class="linkbtn" data-sc="tools" data-gid="${esc(gid)}">More</button>`;
  if(toolAsk)return `<div class="confirm"><b>${toolAsk==='void'?'Void this game?':toolAsk==='del'?'Delete this game?':'Put this game back on court?'}</b><p class="fine">${toolAsk==='void'?'It stays in the record as void and counts for nothing.':toolAsk==='del'?'It’s removed completely, with no record left.':`The players go back on ${esc(g.court)} and the timer carries on.`}</p>
    <div class="row" style="gap:6px"><button class="btn sm" data-sc="${toolAsk}go" data-gid="${esc(gid)}">${toolAsk==='void'?'Void':toolAsk==='del'?'Delete':'Back on court'}</button><button class="btn ghost sm" data-sc="toolno">Keep</button></div></div>`;
  return `<div class="row" style="gap:6px"><button class="btn ghost sm" data-sc="toolask" data-v="still" data-gid="${esc(gid)}">${ic('play')}Still playing</button><button class="btn ghost sm" data-sc="toolask" data-v="void" data-gid="${esc(gid)}">Void</button>${admin?`<button class="btn ghost sm" data-sc="toolask" data-v="del" data-gid="${esc(gid)}">Delete</button>`:''}<button class="linkbtn" data-sc="toolno">Close</button></div>`}
function supportHTML(sid){const gs=liveGames(sid).filter(([,g])=>v2(g)),by={};for(const [gid,g] of gs){const st=gState(gid,g);(by[st]=by[st]||[]).push([gid,g])}
  const ready=by.ready||[];
  const groups=GROUPS.map(([k,t,d])=>by[k]&&by[k].length?`<div class="tile qgroup"><div class="sec-h"><b>${t} · ${by[k].length}</b>${k==='ready'&&ready.length>1?`<button class="btn sm" data-sc="finall">${ic('check')}Finalise all ${ready.length}</button>`:''}</div><p class="fine">${d}</p><div class="list">${by[k].map(([gid,g])=>supportRow(sid,gid,g,k)).join('')}</div></div>`:'').join('');
  const fin=(by.final||[]).slice().reverse(),can=(by.cancelled||[]);
  return `${groups||`<div class="tile"><b>${ic('check')} All scores are final</b><p class="fine">New games show up here as soon as a court finishes.</p></div>`}
    ${fin.length?`<div class="tile"><b>Final · ${fin.length}</b><div class="list">${fin.map(([gid,g])=>`<div class="li qrow"><div><div class="row" style="justify-content:space-between;gap:10px;flex-wrap:nowrap"><span class="nm" style="min-width:0">${teamNames(sid,g.a)} <span class="muted">v</span> ${teamNames(sid,g.b)}</span><b class="num" style="white-space:nowrap">${scoreTxt(g.final[0],g.final[1])}</b></div><div class="sub">${esc(g.court)} · to ${fmtOf(g)}${(resOf(gid).fin||{}).how==='unavailable'?' · other team unavailable':''}${(resOf(gid).fin||{}).note?' · '+esc(resOf(gid).fin.note):''}</div>
      ${correctFor===gid?scoreInputs(gid,g,[`<b>Team A</b> · ${teamNames(sid,g.a)}`,`<b>Team B</b> · ${teamNames(sid,g.b)}`],{note:'Reason for the correction (required)',buttons:`<button class="btn sm" data-sc="fin" data-gid="${esc(gid)}" data-how="correction">${ic('check')}Save</button><button class="btn ghost sm" data-sc="nocorrect">Back</button>`}):`<div class="row" style="gap:10px"><button class="linkbtn" data-sc="correct" data-gid="${esc(gid)}">${ic('edit')}Edit</button>${gameTools(sid,gid,g)}</div>`}</div></div>`).join('')}</div></div>`:''}
    ${can.length?`<div class="tile"><b>Cancelled · ${can.length}</b><div class="list">${can.map(([gid,g])=>`<div class="li"><div><div class="nm">${teamNames(sid,g.a)} <span class="muted">v</span> ${teamNames(sid,g.b)}</div><div class="sub">${esc(g.court)} · ${esc(g.reason||'')} · no result</div></div></div>`).join('')}</div></div>`:''}`}
S.sedit={};

/* ---------- saving ---------- */
function readDraft(gid,g,flip){const d=scoreDraft[gid]||{},x=Number(d.x),y=Number(d.y),h=BADMATH.scoreHint(fmtOf(g),d.x,d.y);
  if(h){toast(h);return null}return flip?[y,x]:[x,y]}
async function scoreAct(b){const k=b.dataset.sc,gid=b.dataset.gid,g=gid&&S.games[gid],sid=g&&g.sid;
  if(k==='edit'){S.edit=gid;return renderCourts()}
  if(k==='noedit'){S.edit=null;return renderCourts()}
  if(k==='askdispute'){disputeFor=gid;return renderCourts()}
  if(k==='nodispute'){disputeFor=null;return renderCourts()}
  if(k==='why'){const id=disputeFor;scoreDraft[id]={...(scoreDraft[id]||{}),why:b.dataset.v};return renderCourts()}
  if(k==='sedit'){S.sedit[gid]=true;return renderCourts()}
  if(k==='correct'){correctFor=gid;const f=g.final||[];scoreDraft[gid]={x:f[0],y:f[1]};return renderCourts()}
  if(k==='nocorrect'){correctFor=null;return renderCourts()}
  if(k==='award'){await awardSession(S.courtSid);return renderCourts()}
  if(k==='tools'){toolFor=gid;toolAsk=null;return renderCourts()}
  if(k==='toolask'){toolFor=gid;toolAsk=b.dataset.v;return renderCourts()}
  if(k==='toolno'){toolFor=null;toolAsk=null;return renderCourts()}
  if(k==='voidgo'||k==='delgo'||k==='stillgo'){toolFor=null;toolAsk=null;
    try{if(k==='voidgo'){await S.db.doc('games/'+gid).update({st:'cancelled',reason:'Voided',interrupted:true,by:S.uid,was:g.st,wasFinal:g.final||null});toast('Game voided. It no longer counts.')}
      else if(k==='delgo'){await S.db.doc('games/'+gid).delete();delete S.gSess[gid];mergeGames();toast('Game deleted.')}
      else{const lv=norm(clone(S.live[sid]||{courts:[]})),c=lv.courts.find(x=>x.name===g.court);
        if(!c){toast(`${g.court} isn't on the board any more.`);return}
        if(c.on.some(Boolean)){toast(`${c.name} has players on it. Clear it first, or void this game instead.`);return}
        for(const p of [...g.a,...g.b])detach(lv,p);
        const half=c.size/2,pad=(t)=>t.concat(Array(half).fill(null)).slice(0,half);c.on=[...pad(g.a),...pad(g.b)];
        c.st='playing';c.t0=g.start||null;c.t0dev=g.startDev||new Date().toISOString();c.fmt=g.fmt||null;c.pausedMs=g.pausedMs||0;
        await S.db.doc('games/'+gid).delete();delete S.gSess[gid];mergeGames();saveLive(sid,lv);toast(`Back on ${c.name}. The timer carries on.`)}}
    catch(e){console.warn(e);toast("Sorry, that didn't save.")}
    return renderCourts()}
  const ref=S.db.doc('results/'+gid),cur=resOf(gid);
  try{
    if(k==='submit'){const t=teamOf(g,S.uid);if(!t)return;const v=readDraft(gid,g,t==='b');if(!v)return;
      await ref.set({sid,sub:{sa:v[0],sb:v[1],by:S.uid,team:t,at:SVT()},conf:null,disp:null,fin:null});
      S.edit=null;disputeFor=null;delete scoreDraft[gid];toast('Score sent. The other team will confirm it.')}
    else if(k==='confirm'){await ref.set({...cur,sid,conf:{by:S.uid,at:SVT()}});toast('Confirmed. Thank you.')}
    else if(k==='dispute'){const why=(scoreDraft[gid]||{}).why;await ref.set({...cur,sid,disp:{by:S.uid,at:SVT(),why}});disputeFor=null;toast('Sent to Support. They’ll check it with both teams.')}
    else if(k==='fin'||k==='finall'){
      const list=k==='finall'?liveGames(S.courtSid).filter(([id,x])=>v2(x)&&gState(id,x)==='ready').map(([id])=>id):[gid];
      for(const id of list){const gg=S.games[id],rr=resOf(id),how=k==='finall'?'agreed':b.dataset.how;let v,note='';
        if(how==='agreed'||how==='unavailable')v=[rr.sub.sa,rr.sub.sb];else{v=readDraft(id,gg,false);if(!v)return;note=((scoreDraft[id]||{}).note||'').trim().slice(0,80)}
        if(how==='correction'&&!note){toast('Please add a reason for the correction.');return}
        if(how==='unavailable')note='Other team unavailable to confirm';
        await finalise(id,gg,v,how,note)}
      correctFor=null;toast(list.length>1?`${list.length} scores are final.`:'Score is final. It counts now.')}
  }catch(e){console.warn(e);toast("Sorry, that didn't save. Please try again.")}
  renderCourts()}
/* Support: the result, the game record and an add-only log entry, saved together */
async function finalise(gid,g,v,how,note){const cur=resOf(gid),b=S.db.batch(),fin={sa:v[0],sb:v[1],by:S.uid,at:SVT(),how};if(note)fin.note=note;
  b.set(S.db.doc('results/'+gid),{sid:g.sid,sub:cur.sub||null,conf:cur.conf||null,disp:cur.disp||null,fin});
  b.update(S.db.doc('games/'+gid),{st:'final',final:v,finBy:S.uid,finAt:SVT()});
  b.set(S.db.collection('results/'+gid+'/log').doc(),{sid:g.sid,sa:v[0],sb:v[1],how,note:note||'',by:S.uid,at:SVT(),was:g.final||null});
  await b.commit();delete scoreDraft[gid];delete S.sedit[gid]}
function bindScores(el){
  el.querySelectorAll('[data-scgid] [data-scx]').forEach(x=>x.oninput=()=>{const gid=x.closest('[data-scgid]').dataset.scgid,d=scoreDraft[gid]=scoreDraft[gid]||{};d[x.dataset.scx]=x.value;
    const g=S.games[gid],h=x.closest('[data-scgid]').querySelector('.schint');if(h&&g&&x.dataset.scx!=='note')h.textContent=d.x!==undefined&&d.y!==undefined&&d.x!==''&&d.y!==''?BADMATH.scoreHint(fmtOf(g),d.x,d.y):''});
  el.querySelectorAll('[data-sc]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();scoreAct(b)})}

/* ---------- session standings and BADDEST PLAYER ----------
   Only final scores count. Most wins, then most points (scaled to a 21-point game), then fewer games. Exact ties share the title. */
S.awards={};
function sessStandings(sid){return BADMATH.standings(liveGames(sid).filter(([,g])=>v2(g)&&g.st==='final'&&g.final).map(([,g])=>({a:g.a,b:g.b,score:g.final,fmt:fmtOf(g)})))}
const sameSet=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
function standingsHTML(sid,crew){const rows=sessStandings(sid),aw=S.awards[sid],pend=supportCount(sid),s=S.sessions[sid];
  if(!rows.length)return crew?`<div class="tile"><b>${ic('board')} Standings</b><p class="fine">They appear as soon as the first score is final.</p></div>`:'';
  const win=BADMATH.winners(rows),changed=aw&&!sameSet(aw.winners||[],win);
  const admin=S.canEdit&&canSport((s||{}).sport||'badminton');
  const badd=aw?`<div class="baddest"><span class="label">BADDEST PLAYER${(aw.winners||[]).length>1?'S':''}</span><b>${(aw.winners||[]).map(p=>esc(nm(sid,p))).join(' & ')}</b><span class="fine">+5 points${(aw.winners||[]).some(p=>!S.profiles[p])?' · guests need a card to collect points':''}</span></div>`:'';
  const fin=!crew||!admin?'':pend?`<p class="fine">Finalise the ${pend} score${pend===1?'':'s'} above, then finalise the session to award BADDEST PLAYER.</p>`
    :aw&&!changed?`<p class="fine">${ic('check')} Session finalised. A score correction here will let you update the award.</p>`
    :`<div class="row" style="gap:8px;align-items:center"><button class="btn sm" data-sc="award">${ic('star')}${aw?'Update the award':'Finalise session · award BADDEST PLAYER'}</button>${changed?`<span class="fine">Standings changed after a correction.</span>`:''}</div>`;
  return `<div class="tile standings">${badd}<div class="sec-h"><b>${ic('board')} ${aw?'Final standings':'Standings · live'}</b><span class="fine">Wins, then points</span></div>
    <div class="stable" role="table" aria-label="Session standings"><div class="strow sh" role="row"><span>#</span><span>Player</span><span>W–L</span><span>Pts</span></div>
    ${rows.map(r=>`<div class="strow${r.id===S.uid?' mine':''}${r.rank===1?' first':''}" role="row"><span class="num">${r.rank}</span><span>${esc(r.id===S.uid?'You':nm(sid,r.id))}${crew?`<small class="fine"> · ${r.played} game${r.played===1?'':'s'} · ${r.diff>0?'+':''}${r.diff}</small>`:''}</span><span class="num">${r.wins}–${r.losses}</span><span class="num">${Number.isInteger(r.sp)?r.sp:r.sp.toFixed(1)}</span></div>`).join('')}</div>
    <p class="fine">Points from 30-point games are scaled to 21 so every game counts the same. Win % and point difference are for interest only.</p>${fin}</div>`}
/* admin: finalise the session. One award per session; a later correction updates it with a reversal entry, never a second +5. */
async function awardSession(sid,picked){const s=S.sessions[sid],rows=picked?[]:sessStandings(sid),win=picked||BADMATH.winners(rows);if(!win.length){toast(picked?'Pick at least one player.':'No final scores yet.');return}
  const prev=(S.awards[sid]||{}).winners||[],t=`${s.title||'Badminton'} · ${fmtD(s.date)}`,dept=sportOf(s.sport).club;
  const have=new Set((S.ledger||[]).map(e=>e._id));let n=0;
  try{
    for(const uid of win)if(S.profiles[uid]&&!prev.includes(uid)){const id=`baddest-${sid}-${uid}`;
      if(!have.has(id)){await addLedger(id,{uid,type:'BADDEST PLAYER',pts:5,dept,date:s.date,sid,reason:'BADDEST PLAYER · '+t});n++}}
    for(const uid of prev)if(S.profiles[uid]&&!win.includes(uid)){const k=(S.ledger||[]).filter(e=>String(e._id).startsWith(`baddest-${sid}-${uid}-undo`)).length;
      await addLedger(`baddest-${sid}-${uid}-undo${k+1}`,{uid,type:'BADDEST PLAYER',pts:-5,dept,date:s.date,sid,reason:'BADDEST PLAYER changed after a correction · '+t})}
    const top=rows.slice(0,5).map(r=>({id:r.id,rank:r.rank,wins:r.wins,sp:r.sp,played:r.played}));
    await S.db.doc('awards/'+sid).set({sid,winners:win,top,by:S.uid,at:SVT(),rev:((S.awards[sid]||{}).rev||0)+1,prev:prev});
    toast(`BADDEST PLAYER: ${win.map(p=>nm(sid,p)).join(' & ')}${n?` · +5 points`:''}`)}
  catch(e){console.warn(e);toast("Sorry, the award didn't save. Please try again.")}}
