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
function gState(gid,g){if(g.st==='cancelled')return 'cancelled';if(g.st==='final')return 'final';
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
  const act=mine.filter(([gid,g])=>['noscore','submitted','disputed','ready'].includes(gState(gid,g))).reverse();
  const done=mine.filter(([gid,g])=>gState(gid,g)==='final').reverse();
  return `${act.map(([gid,g])=>playerGameTile(sid,gid,g)).join('')}
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
  return `<div class="li qrow"><div><div class="nm">${A} <span class="muted">v</span> ${B}</div><div class="sub">${esc(g.court)} · to ${f} · ${hhmm(new Date(msOf(g.endDev)||Date.now()).toISOString())}${isFinite(gameMins(g))?` · ${Math.round(gameMins(g))} min`:''}</div>${claim}<div class="qact">${act}</div></div></div>`}
function supportHTML(sid){const gs=liveGames(sid).filter(([,g])=>v2(g)),by={};for(const [gid,g] of gs){const st=gState(gid,g);(by[st]=by[st]||[]).push([gid,g])}
  const ready=by.ready||[];
  const groups=GROUPS.map(([k,t,d])=>by[k]&&by[k].length?`<div class="tile qgroup"><div class="sec-h"><b>${t} · ${by[k].length}</b>${k==='ready'&&ready.length>1?`<button class="btn sm" data-sc="finall">${ic('check')}Finalise all ${ready.length}</button>`:''}</div><p class="fine">${d}</p><div class="list">${by[k].map(([gid,g])=>supportRow(sid,gid,g,k)).join('')}</div></div>`:'').join('');
  const fin=(by.final||[]).slice().reverse(),can=(by.cancelled||[]);
  return `${groups||`<div class="tile"><b>${ic('check')} All scores are final</b><p class="fine">New games show up here as soon as a court finishes.</p></div>`}
    ${fin.length?`<div class="tile"><b>Final · ${fin.length}</b><div class="list">${fin.map(([gid,g])=>`<div class="li qrow"><div><div class="nm">${teamNames(sid,g.a)} <span class="muted">v</span> ${teamNames(sid,g.b)} <b class="num" style="float:right">${scoreTxt(g.final[0],g.final[1])}</b></div><div class="sub">${esc(g.court)} · to ${fmtOf(g)}${(resOf(gid).fin||{}).how==='unavailable'?' · other team unavailable':''}${(resOf(gid).fin||{}).note?' · '+esc(resOf(gid).fin.note):''}</div>
      ${correctFor===gid?scoreInputs(gid,g,[`<b>Team A</b> · ${teamNames(sid,g.a)}`,`<b>Team B</b> · ${teamNames(sid,g.b)}`],{note:'Reason for the correction (required)',buttons:`<button class="btn sm" data-sc="fin" data-gid="${esc(gid)}" data-how="correction">Save correction</button><button class="btn ghost sm" data-sc="nocorrect">Back</button>`}):`<button class="linkbtn" data-sc="correct" data-gid="${esc(gid)}">Correct</button>`}</div></div>`).join('')}</div></div>`:''}
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
