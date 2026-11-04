/* ---------- Manual court board ----------
   While the automatic queue is being rebuilt, crew arrange and match players by hand.
   Courts, a "Next up" area and the bench (everyone checked in who isn't placed). Drag a player anywhere,
   or tap a player then tap a spot. Dropping on someone swaps the two. Start and End game are one tap each;
   when a game ends its players go back to the bench and the first Next up group walks onto that court. */
S.cTab=S.cTab||'sheet';let msel=null;
const MB_SIZE={badminton:4,pickleball:4,volleyball:12,basketball:10};
const mbSize=sp=>MB_SIZE[sp]||4;
const mbPlayed=(lv,p)=>((lv.played||{})[p]||0);
function mbBench(lv){const placed=new Set([...lv.courts,...lv.waiting].flatMap(c=>c.on).filter(Boolean)),out=new Set(lv.out||[]);
  return arrivals(lv).filter(p=>!placed.has(p)&&!out.has(p)).sort((a,b)=>mbPlayed(lv,a)-mbPlayed(lv,b)||String(lv.avail[a]||lv.checkin[a]).localeCompare(String(lv.avail[b]||lv.checkin[b])))}
function mbChip(sid,lv,p,where){const x=who(sid,p),t=typeof lvlTag==='function'&&S.profiles[p]?lvlTag(p,S.sessions[sid]?.sport||'badminton'):'';
  return `<button type="button" class="mchip${msel===p?' sel':''}" data-mp="${esc(p)}" data-from="${esc(where)}" aria-label="${esc(x.name)}, ${mbPlayed(lv,p)} played. Drag, or tap then tap a spot.">${pav(sid,p)}<span class="mc-n">${esc(x.name)}</span><span class="mc-s num">${mbPlayed(lv,p)}${t?' · '+esc(t):''}</span></button>`}
function mbSlot(sid,lv,p,key){return `<div class="mslot${p?' full':''}" data-drop="${key}">${p?mbChip(sid,lv,p,key):`<span class="mslot-e">${msel?'Tap to place':'Drop here'}</span>`}</div>`}
function mboardHTML(sid,s,lv){const sp=s.sport||'badminton',size=mbSize(sp),half=size/2,bench=mbBench(lv);
  const courts=lv.courts.map((c,ci)=>{const playing=c.st==='playing',n=c.on.filter(Boolean).length;
    return `<article class="mcourt${playing?' on':''}"><div class="mc-h"><b>${esc(c.name)}</b><span class="tagl${playing?' solid':''}">${playing?`Playing · ${elapsed(c)} min`:n?'Ready':'Free'}</span></div>
      <div class="mc-body"><div class="mside">${c.on.slice(0,half).map((p,i)=>mbSlot(sid,lv,p,`c:${ci}:${i}`)).join('')}</div><div class="mnet">${sp==='basketball'?'vs':'NET'}</div><div class="mside">${c.on.slice(half).map((p,i)=>mbSlot(sid,lv,p,`c:${ci}:${i+half}`)).join('')}</div></div>
      <div class="mc-f">${playing?`<button class="btn wide mend" data-mb="end" data-c="${ci}">${ic('check')}End game</button>`
        :`${n?`<button class="linkbtn" data-mb="clear" data-c="${ci}">Clear</button>`:`<button class="linkbtn" data-mb="rmcourt" data-c="${ci}">Remove court</button>`}<button class="btn" data-mb="start" data-c="${ci}" ${n>=2?'':'disabled'}>${ic('play')}Start</button>`}</div></article>`}).join('');
  const waits=lv.waiting.map((w,wi)=>`<div class="mwait"><div class="mc-h"><b>${wi===0?'Next up':'Then'} ${wi+1}</b>${w.on.some(Boolean)?`<button class="linkbtn" data-mb="wclear" data-w="${wi}">Clear</button>`:`<button class="linkbtn" data-mb="rmwait" data-w="${wi}">Remove</button>`}</div><div class="mwrow">${w.on.map((p,i)=>mbSlot(sid,lv,p,`w:${wi}:${i}`)).join('')}</div></div>`).join('');
  return `<p class="hint mhint">${msel?`<b>${esc(who(sid,msel).name)}</b> picked. Tap a spot, or tap them again to put them down.`:'Drag players onto a court or Next up. Or tap a player, then tap a spot. Drop on someone to swap.'}</p>
    <div class="mboard"><div class="mmain"><div class="mcourts">${courts||'<p class="fine">No courts yet.</p>'}</div>
      <div class="row" style="gap:8px"><button class="btn ghost sm" data-mb="addcourt">${ic('plus')}Add court</button></div>
      <div class="sec"><span class="label">Next up</span><div class="mwaits">${waits}</div><button class="btn ghost sm" data-mb="addwait" style="margin-top:8px">${ic('plus')}Add a Next up group</button></div></div>
      <aside class="mbench" data-drop="b"><div class="sec-h"><span class="label">Bench · ${bench.length}</span><span class="fine">Fewest games first</span></div>
        <div class="mbench-l">${bench.map(p=>mbChip(sid,lv,p,'b')).join('')||'<span class="fine">Everyone checked in is placed.</span>'}</div>
        <p class="fine">Check people in on the Check-in &amp; Pay tab. Drag someone here to take them off a court.</p></aside></div>`}
/* move a player to a spot; if someone is there, they swap places */
function mbMove(sid,pid,to){const lv=norm(clone(S.live[sid]));const from=locate(lv,pid);
  if(to==='b'){if(!from)return;detach(lv,pid);msel=null;return saveLive(sid,lv)}
  const [k,a,i]=to.split(':'),arr=k==='c'?lv.courts:lv.waiting,box=arr[+a];if(!box)return;const there=box.on[+i];
  if(there===pid){msel=null;return renderCourts()}
  detach(lv,pid);if(there){if(from){const fa=from[0]==='c'?lv.courts:lv.waiting;fa[from[1]].on[from[2]]=there}else detach(lv,there)}
  box.on[+i]=pid;msel=null;return saveLive(sid,lv)}
async function mbAct(sid,act,b){const lv=norm(clone(S.live[sid])),s=S.sessions[sid],size=mbSize(s.sport||'badminton'),now=new Date().toISOString();
  lv.played=lv.played||{};
  if(act==='addcourt'){lv.courts.push({id:'c'+Date.now().toString(36),name:'Court '+(lv.courts.length+1),size,on:Array(size).fill(null)});return saveLive(sid,lv)}
  if(act==='rmcourt'){lv.courts.splice(+b.dataset.c,1);lv.courts.forEach((c,i)=>{if(/^Court \d+$/.test(c.name))c.name='Court '+(i+1)});return saveLive(sid,lv)}
  if(act==='addwait'){lv.waiting.push({id:'w'+Date.now().toString(36),size,on:Array(size).fill(null)});return saveLive(sid,lv)}
  if(act==='rmwait'){lv.waiting.splice(+b.dataset.w,1);return saveLive(sid,lv)}
  if(act==='wclear'){const w=lv.waiting[+b.dataset.w];w.on=w.on.map(()=>null);return saveLive(sid,lv)}
  if(act==='clear'){const c=lv.courts[+b.dataset.c];c.on=c.on.map(()=>null);c.st='';return saveLive(sid,lv)}
  if(act==='start'){const c=lv.courts[+b.dataset.c];c.st='playing';c.t0dev=now;c.pausedMs=0;toast(`${c.name} is playing.`);return saveLive(sid,lv)}
  if(act==='end'){const c=lv.courts[+b.dataset.c],ps=c.on.filter(Boolean);ps.forEach(p=>{lv.played[p]=(lv.played[p]||0)+1;lv.avail[p]=now});
    c.on=c.on.map(()=>null);c.st='';delete c.t0dev;
    /* the first Next up group walks on; the other groups move up one */
    const firstIdx=lv.waiting.findIndex(w=>w.on.some(Boolean));let msg=`Game over on ${c.name}. Players are back on the bench.`;
    if(firstIdx>=0){const w=lv.waiting[firstIdx],inn=w.on.filter(Boolean);inn.forEach((p,i)=>c.on[i<c.on.length?i:0]=p);
      for(let i=firstIdx;i<lv.waiting.length-1;i++)lv.waiting[i].on=lv.waiting[i+1].on.slice();lv.waiting[lv.waiting.length-1].on=lv.waiting[lv.waiting.length-1].on.map(()=>null);
      msg=`Game over. ${inn.map(p=>who(sid,p).name).join(', ')} ${inn.length>1?'are':'is'} on ${c.name}. Tap Start when ready.`}
    toast(msg);return saveLive(sid,lv)}}
/* drag: works with mouse and touch. A short tap selects instead. */
function mbBind(el){const sid=S.courtSid;if(!el.querySelector('.mboard'))return;
  el.querySelectorAll('[data-mb]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();mbAct(sid,b.dataset.mb,b)});
  el.querySelectorAll('[data-drop]').forEach(t=>t.addEventListener('click',ev=>{if(!msel||ev.target.closest('.mchip'))return;ev.stopPropagation();mbMove(sid,msel,t.dataset.drop)}));
  el.querySelectorAll('.mchip').forEach(ch=>{
    ch.onpointerdown=ev=>{if(ev.button>0)return;const p=ch.dataset.mp,x0=ev.clientX,y0=ev.clientY,touch=ev.pointerType!=='mouse';let ghost=null,over=null,armed=!touch,last=ev;
      /* on touch screens, press and hold briefly to pick a player up, so the page still scrolls normally */
      const hold=touch?setTimeout(()=>{armed=true;ch.classList.add('armed');if(navigator.vibrate)try{navigator.vibrate(12)}catch(_){}},180):0;
      const block=e=>{if(ghost||armed)e.preventDefault()};ch.addEventListener('touchmove',block,{passive:false});
      const target=e=>{if(ghost)ghost.style.visibility='hidden';const t=document.elementFromPoint(e.clientX,e.clientY);if(ghost)ghost.style.visibility='';return t&&t.closest('[data-drop]')};
      const mv=e=>{last=e;if(!ghost){const far=Math.hypot(e.clientX-x0,e.clientY-y0)>=8;if(!armed){if(far){clearTimeout(hold)}return}if(!far&&!touch)return;ghost=ch.cloneNode(true);ghost.classList.add('mghost');document.body.appendChild(ghost);ch.classList.add('dragging');try{ch.setPointerCapture(ev.pointerId)}catch(_){}}
        ghost.style.left=(e.clientX-ghost.offsetWidth/2)+'px';ghost.style.top=(e.clientY-ghost.offsetHeight/2)+'px';
        if(e.clientY<70)scrollBy(0,-14);else if(e.clientY>innerHeight-110)scrollBy(0,14);
        const t=target(e);if(t!==over){over&&over.classList.remove('over');over=t;over&&over.classList.add('over')}e.preventDefault()};
      const up=e=>{clearTimeout(hold);ch.classList.remove('armed');ch.removeEventListener('touchmove',block);ch.removeEventListener('pointermove',mv);ch.removeEventListener('pointerup',up);ch.removeEventListener('pointercancel',up);
        if(ghost){ghost.remove();ch.classList.remove('dragging');over&&over.classList.remove('over');const t=target(e);el._mbDragged=Date.now();if(t)mbMove(sid,p,t.dataset.drop)}};
      ch.addEventListener('pointermove',mv);ch.addEventListener('pointerup',up);ch.addEventListener('pointercancel',up)};
    ch.onclick=ev=>{ev.stopPropagation();if(Date.now()-(el._mbDragged||0)<250)return;const p=ch.dataset.mp;
      if(msel&&msel!==p&&ch.dataset.from!=='b'){mbMove(sid,msel,ch.dataset.from);return}msel=msel===p?null:p;renderCourts()}})}
