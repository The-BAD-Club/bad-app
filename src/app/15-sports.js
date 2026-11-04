/* ---------- BAD PACE run log and BADDEST PLAYER for every sport ----------
   runs/{sessionId}_{playerId}: distance (km) and time (seconds). Runners log their own; crew can log for anyone, walk-ins too.
   Badminton picks BADDEST PLAYER from the standings; every other sport, crew pick. Either way: +5, once. */
S.runs={};let runEdit=null,pickWin=[];
const fmtDur=secs=>{secs=Math.round(secs);const h=Math.floor(secs/3600),m=Math.floor(secs%3600/60),x=secs%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
const parseDur=t=>{const p=String(t||'').trim().split(':').map(Number);if(!p.length||p.some(n=>!Number.isFinite(n)||n<0))return NaN;return p.length===3?p[0]*3600+p[1]*60+p[2]:p.length===2?p[0]*60+p[1]:p[0]*60};
const paceOf=r=>r&&r.km>0&&r.secs>0?r.secs/r.km:null;
const runOf=(sid,pid)=>S.runs[sid+'_'+pid];
function runRows(sid){return Object.values(S.runs).filter(r=>r.sid===sid&&r.km>0).sort((a,b)=>b.km-a.km||(paceOf(a)||1e9)-(paceOf(b)||1e9))}
function runForm(sid,pid,mine){const r=runOf(sid,pid)||{};
  return `<div class="runform" data-runpid="${esc(pid)}"><label><span>Distance (km)</span><input type="number" step="0.01" min="0" max="100" inputmode="decimal" data-rk="km" value="${r.km??''}"></label>
    <label><span>Time (mm:ss or h:mm:ss)</span><input type="text" inputmode="numeric" data-rk="t" placeholder="32:15" value="${r.secs?fmtDur(r.secs):''}"></label>
    <button class="btn sm" data-run="save" data-pid="${esc(pid)}">${ic('check')}${mine?'Save my run':'Save'}</button></div>`}
function runHTML(sid,lv,crew){const rows=runRows(sid),me=S.uid,inn=lv.checkin[me];
  const board=rows.length?`<div class="stable runs" role="table" aria-label="Tonight's runs"><div class="strow sh" role="row"><span>#</span><span>Runner</span><span>km</span><span>Pace</span></div>
    ${rows.map((r,i)=>`<div class="strow${r.pid===me?' mine':''}${i===0?' first':''}" role="row"><span class="num">${i+1}</span><span>${esc(r.pid===me?'You':who(sid,r.pid).name)}${crew?` <button class="linkbtn" data-run="edit" data-pid="${esc(r.pid)}">Edit</button>`:''}</span><span class="num">${(+r.km).toFixed(2)}</span><span class="num">${paceOf(r)?fmtDur(paceOf(r))+'/km':'—'}</span></div>`).join('')}</div>`
    :'<p class="fine">No runs logged yet.</p>';
  const mine=!crew&&inn?`<div class="tile prompt"><b>Log your run</b>${runForm(sid,me,true)}</div>`:'';
  const crewList=crew?(()=>{const todo=presentIds(lv).filter(p=>!runOf(sid,p)||runEdit===p);
    return todo.length?`<div class="list">${todo.map(p=>`<div class="li" style="grid-template-columns:auto minmax(0,1fr)">${pav(sid,p)}<div><div class="nm">${esc(who(sid,p).name)}</div>${runForm(sid,p,false)}</div></div>`).join('')}</div>`:'<p class="fine">Everyone checked in has a run logged.</p>'})():'';
  return `${mine}<div class="tile standings"><div class="sec-h"><b>${ic('run')} Tonight's runs</b><span class="fine">Distance, then pace</span></div>${board}${crew?`<div class="sec" style="margin-top:12px"><span class="label">Log runs</span>${crewList}</div>`:''}</div>`}
function bindRuns(el){el.querySelectorAll('[data-run]').forEach(b=>b.onclick=async ev=>{ev.stopPropagation();const k=b.dataset.run,pid=b.dataset.pid,sid=S.courtSid;
  if(k==='edit'){runEdit=pid;return renderCourts()}
  const f=el.querySelector(`[data-runpid="${CSS.escape(pid)}"]`),km=Math.round(Number(f.querySelector('[data-rk=km]').value)*100)/100,secs=parseDur(f.querySelector('[data-rk=t]').value);
  if(!(km>0&&km<=100)){toast('Please enter the distance in km.');return}
  if(!(secs>0&&secs<86400)){toast('Please enter the time, like 32:15.');return}
  try{await S.db.doc('runs/'+sid+'_'+pid).set({sid,pid,km,secs:Math.round(secs),by:S.uid,at:SVT()});runEdit=null;toast(`Saved: ${km} km in ${fmtDur(secs)} (${fmtDur(secs/km)}/km).`)}
  catch(e){toast("Sorry, that run didn't save.")}})}

/* ---------- BADDEST PLAYER picked by crew ---------- */
function baddestCard(sid){const aw=S.awards[sid]||{},w=aw.winners||[];
  return `<div class="baddest"><span class="label">BADDEST PLAYER${w.length>1?'S':''}</span><b>${w.map(p=>esc(p===S.uid?'You':who(sid,p).name)).join(' & ')}</b><span class="fine">+5 points${w.some(p=>!S.profiles[p])?' · guests need a card to collect points':''}</span></div>`}
function baddestPickHTML(sid,lv){const s=S.sessions[sid],admin=S.canEdit&&canRun((s||{}).sport||'badminton'),aw=S.awards[sid];
  const pool=presentIds(lv).length?presentIds(lv):Object.keys(people(sid));
  if(!admin)return aw?`<div class="tile">${baddestCard(sid)}</div>`:'';
  if(!pickWin.length&&aw)pickWin=[...(aw.winners||[])];
  return `<div class="tile">${aw?baddestCard(sid):''}<div class="sec-h"><b>${ic('star')} BADDEST PLAYER</b><span class="fine">+5 points</span></div>
    <p class="fine">Pick tonight's standout${aw?', or change the pick':''}. Up to 3 for a shared title.</p>
    <div class="chips" role="group" aria-label="Pick BADDEST PLAYER">${pool.map(p=>`<button class="chip sm" data-bp-pick="${esc(p)}" aria-pressed="${pickWin.includes(p)}">${esc(who(sid,p).name)}</button>`).join('')||'<span class="fine">Check players in first.</span>'}</div>
    <div class="row" style="margin-top:10px"><button class="btn sm" data-bp-award="1" ${pickWin.length?'':'disabled'}>${ic('star')}${aw?'Update BADDEST PLAYER':'Award BADDEST PLAYER'}</button></div></div>`}
document.addEventListener('click',async ev=>{const t=ev.target.closest('[data-bp-pick],[data-bp-award]');if(!t||!t.closest('#v-courts'))return;ev.stopPropagation();
  if(t.dataset.bpPick){const p=t.dataset.bpPick;pickWin=pickWin.includes(p)?pickWin.filter(x=>x!==p):[...pickWin,p].slice(-3);return renderCourts()}
  if(t.dataset.bpAward){await awardSession(S.courtSid,[...pickWin]);pickWin=[];renderCourts()}},true);
