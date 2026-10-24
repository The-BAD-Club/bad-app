/* ---------- register / edit card ---------- */
let D={},step=0,quiz=null;
const STEPS=['About you','Your look','Your activities','Your levels','Your signature'];
const okEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
const okMobile=v=>String(v||'').replace(/\D/g,'').length>=8;
const numTaken=n=>{if(n==='')return null;for(const [uid,p] of Object.entries(S.profiles||{}))if(uid!==S.uid&&!p.sample&&String(p.number)===String(+n))return p.nickname||'another player';return null};
function numHint(n){if(n==='')return 'Pick your jersey number, 0 to 99.';const t=numTaken(n);return t?`${t} also wears ${+n}. You can still use it, or pick another.`:`${+n} is yours. You can change it any time.`}
function freeNumber(){for(let i=0;i<40;i++){const n=String(Math.floor(Math.random()*99)+1);if(!numTaken(n))return n}return String(Math.floor(Math.random()*99)+1)}
function memHint(k){const t=memType(k);return !t||!t.verify?'No check needed.':'An admin will verify this. Your card shows it once it’s confirmed.'}
function startCreator(existing){
  D=existing?{...existing,types:{...(existing.types||{})},sports:[...(existing.sports||['badminton'])]}:{nickname:'',listName:'',number:freeNumber(),edition:'oncourt',photo:'',sports:[],primary:'',types:{},levels:{},level:1,hand:'Right',shot:'',email:'',mobile:'',instagram:'',referredBy:''};
  if(existing){const c=S.contacts[S.uid]||S.myContact||{};D.email=c.email||'';D.mobile=c.mobile||c.whatsapp||'';D.instagram=c.instagram||'';if(!D.types.badminton&&existing.style)D.types.badminton=existing.style;D.levels={...(existing.levels||{})};for(const k of D.sports)if(D.levels[k]==null&&!LEVEL_FREE.includes(k)&&existing.level!=null)D.levels[k]=existing.level}
  if(!existing){const U=window.BAD_USER||{},full=(U.name||'').trim();if(S.pendingRef)D.referredBy=S.pendingRef;
    D.email=U.email||'';D.listName='';D.nickname=(full.split(/\s+/)[0]||'').slice(0,16);D._acctEmail=!!U.email;
    if(U.photo)toBWUrl(U.photo).then(async src=>{if(!src||D.photo)return;D._src=src;D._crop={z:1,x:0,y:0,b:0};try{D.photo=await renderCrop(src,D._crop)}catch(_){return}if(S.view==='create'){preview();if(step===1)renderStep()}})}
  D.memType=(existing&&existing.memReq&&existing.memReq.type)||D.memType||'Guest';if(MEM_OLD[D.memType])D.memType=MEM_OLD[D.memType];
  D._editing=!!existing;step=0;quiz=null;setView('create');
}
function preview(){const k=keyOf(D.listName||D.nickname);const st=statsFor(k);$('preview').innerHTML=cardHTML(D,st)}
function chips(name,opts,cur,attr='f'){return `<div class="chips" role="group">${opts.map(o=>`<button type="button" class="chip" data-${attr}="${name}" data-val="${esc(o)}" aria-pressed="${o===cur}">${esc(o)}</button>`).join('')}</div>`}
function stepValid(){
  if(step===0)return D.nickname.trim()&&okEmail(D.email)&&okMobile(D.mobile);
  return true;
}
function renderStep(){
  $('steps').innerHTML=STEPS.map((_,i)=>`<i class="${i<=step?'on':''}"></i>`).join('');
  const el=$('step'),head=i=>`<span class="label">Step ${i+1} of ${STEPS.length}${i?' · Optional':' · The only required step'}</span><h2 style="margin:6px 0 18px">${STEPS[i]}</h2>`;
  const inp=(id,icon,type,val,ph,extra='')=>`<div class="inp">${ic(icon)}<input type="${type}" id="${id}" value="${esc(val)}" placeholder="${ph}" ${extra}></div>`;
  if(step===0){
    const taken=new Set(Object.entries(S.profiles).filter(([u])=>u!==S.uid).map(([u])=>normName(trackerName(u))).filter(Boolean)),seen=new Set(),free=[...Object.values((S.sheetPts&&S.sheetPts.players)||{}).map(r=>r.name),...Object.values(allKeys())].filter(n=>{const k=normName(n);if(!k||taken.has(k)||seen.has(k))return false;seen.add(k);return true}).map(n=>[keyOf(n),n]).sort((a,b)=>a[1].localeCompare(b[1]));
    el.innerHTML=head(0)+`
      <div class="namerow"><div class="field"><label for="c-nick">Player name</label>${inp('c-nick','card','text',D.nickname,'What everyone calls you','maxlength="16"')}</div>
        <div class="field"><label for="c-num">Number</label><input type="text" inputmode="numeric" id="c-num" maxlength="2" value="${esc(D.number)}" placeholder="00" class="jnum"></div></div>
      <p class="fine" id="c-num-hint" role="status" style="margin:6px 0 18px">${numHint(D.number)}</p>
      ${D._acctEmail&&!D._editing?`<div class="acct">${ic('mail')}<div><span class="label">Signed in as</span><div class="nm">${esc(D.email)}</div></div></div>`:`<div class="field"><label for="c-email">Email</label>${inp('c-email','mail','email',D.email,'you@email.com','autocomplete="email"')}</div>`}
      <div class="field"><label for="c-mob">Mobile number</label>${inp('c-mob','phone','tel',D.mobile,'+971 5x xxx xxxx','autocomplete="tel"')}</div>
      <div class="field"><label for="c-mem">Membership</label><select id="c-mem">${(memType(D.memType)?.staff?[memType(D.memType),...memPick()]:memPick()).map(t=>`<option value="${esc(t.k)}" ${t.k===D.memType?'selected':''}>${esc(t.k)}${t.d?' · '+esc(t.d):''}</option>`).join('')}</select><p class="fine" id="c-mem-hint">${memHint(D.memType)}</p></div>
      <div class="field"><label for="c-ig">Instagram <span class="req">optional</span></label>${inp('c-ig','at','text',D.instagram,'@yourhandle','maxlength="40"')}</div>
      ${D._editing?'':`<div class="field"><label for="c-ref">Referral code <span class="req">optional</span></label>${inp('c-ref','gift','text',D.referredBy,'e.g. KENNY#08','maxlength="16" style="text-transform:uppercase"')}<p class=\"fine\" id=\"c-ref-hint\" role=\"status\"></p></div>`}
      ${free.length?`<div class="field"><label for="c-list">Played with us before?</label><select id="c-list"><option value="">This is my first time</option>${free.map(([k,n])=>`<option value="${esc(n)}" ${keyOf(D.listName)===k?'selected':''}>I'm ${esc(n)} on the tracker</option>`).join('')}</select><p class="fine">Points and payments are matched by your name on the session tracker. First time? We'll use your nickname.</p></div>`:''}
      <p class="fine">Your email and mobile number are only seen by BAD admins. We use them for session updates and nothing else.</p>`;
    $('c-num').oninput=e=>{D.number=e.target.value.replace(/\D/g,'').slice(0,2);e.target.value=D.number;$('c-num-hint').textContent=numHint(D.number);preview()};
    $('c-mem').onchange=e=>{D.memType=e.target.value;$('c-mem-hint').textContent=memHint(D.memType)};
    const on=(id,k,f)=>{const e=$(id);if(e)e.oninput=x=>{D[k]=f?f(x.target.value):x.target.value;$('next').disabled=!stepValid();if(step===0)$('skip').disabled=!stepValid();if(k==='nickname')preview()}};
    on('c-nick','nickname');on('c-email','email');on('c-mob','mobile');on('c-ig','instagram');on('c-ref','referredBy',v=>v.trim().toUpperCase().slice(0,16));
    const rh=()=>{const el=$('c-ref-hint');if(!el)return;const i=codeInfo(D.referredBy);el.textContent=!i?'':i.kind==='club'?`✓ ${i.label}.`:i.kind==='member'?`✓ Invited by ${i.name}. Welcome.`:i.kind==='off'?'This code has ended.':'We can’t find that code. Please check the spelling.'};
    if($('c-ref')){$('c-ref').addEventListener('input',rh);rh()}
    const l=$('c-list');if(l)l.onchange=e=>{D.listName=e.target.value;preview()};
  }
  if(step===1){
    el.innerHTML=head(1)+`
      <div class="field"><span class="lbl">Profile photo <span class="req">optional</span></span><div class="photo"><div class="pv">${D.photo?`<img src="${esc(D.photo)}" alt="Your photo">`:ic('camera')}</div>
        <div class="row"><button type="button" class="btn ghost sm" id="ph-add">${ic('camera')}${D.photo?'Change photo':'Add a photo'}</button>${D.photo?`<button type="button" class="btn ghost sm" id="ph-crop">${ic('edit')}Adjust</button><button type="button" class="btn ghost sm" id="ph-rm">${ic('x')}Remove</button>`:''}</div></div>
        <p class="fine">Photos are shown in black and white. We convert them for you. Until you add one, your card uses a BAD photo.</p></div>
      <div class="field"><span class="lbl">Card edition</span><div class="editions">${EDITIONS.map(([k,n,c,hex])=>`<button type="button" data-e="${k}" aria-pressed="${k===D.edition}"><i style="background:${hex}"></i><span>${n}</span><small>${c}</small></button>`).join('')}</div>
        <p class="fine">Your card turns silver at the Member BADge level, and black at Legend.</p></div>`;
    $('ph-add').onclick=()=>$('photo-in').click();const rm=$('ph-rm');if(rm)rm.onclick=()=>{D.photo='';D._src='';renderStep()};const cr=$('ph-crop');if(cr)cr.onclick=()=>openCropper(D._src||D.photo);
    el.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{D.edition=b.dataset.e;renderStep()});
  }
  if(step===2){
    const cardable=D.sports.filter(k=>PLAYABLE.includes(k));
    el.innerHTML=head(2)+`<p class="muted" style="margin-bottom:14px">Tick every activity you'd like to join. You can change this any time.</p>
      <div class="checklist">${Object.keys(SPORTS).map(k=>`<label class="chk"><input type="checkbox" data-sp="${k}" ${D.sports.includes(k)?'checked':''}><span class="ic-bub soft">${ic(SPORTS[k].icon)}</span><span><b>${SPORTS[k].club}</b><span class="fine">${ACT_DESC[k]}</span></span><span class="box" aria-hidden="true">${ic('check')}</span></label>`).join('')}</div>
      ${cardable.length>1?`<div class="field" style="margin-top:18px"><span class="lbl">Main sport, shown on your card</span>${chips('primary',cardable.map(s=>SPORTS[s].club),SPORTS[mainSport(D)].club,'pr')}</div>`:''}`;
    el.querySelectorAll('[data-sp]').forEach(b=>b.onchange=()=>{const k=b.dataset.sp;D.sports=b.checked?[...new Set([...D.sports,k])]:D.sports.filter(x=>x!==k);
      const cd=D.sports.filter(x=>PLAYABLE.includes(x));if(!D.sports.includes(D.primary))D.primary=cd[0]||D.sports[0]||'';renderStep()});
    el.querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>{D.primary=Object.keys(SPORTS).find(k=>SPORTS[k].club===b.dataset.val);renderStep()});
  }
  if(step===3){
    if(quiz&&quiz.i<QUIZ.length){
      const Q=QUIZ[quiz.i];
      el.innerHTML=head(3)+`<div class="ic-row" style="margin-bottom:8px">${ic('badminton')}<span class="label">Badminton · question ${quiz.i+1} of ${QUIZ.length}</span></div><h3 style="font-family:var(--f-serif);font-weight:400;font-size:1.7rem;margin:0 0 14px">${esc(Q.q)}</h3>
        <div class="opts">${Q.a.map(([t],j)=>`<button type="button" class="chip" data-qa="${j}">${esc(t)}</button>`).join('')}</div>
        <div class="row" style="margin-top:14px"><button type="button" class="btn ghost sm" id="q-skip">Skip the test</button></div>`;
      el.querySelectorAll('[data-qa]').forEach(b=>b.onclick=()=>{const ty=Q.a[+b.dataset.qa][1];quiz.score[ty]=(quiz.score[ty]||0)+1;quiz.i++;
        if(quiz.i>=QUIZ.length){D.types.badminton=Object.entries(quiz.score).sort((a,b)=>b[1]-a[1])[0][0];quiz.done=true}renderStep()});
      $('q-skip').onclick=()=>{quiz=null;renderStep()};
    }else{
      const acts=D.sports.filter(k=>!LEVEL_FREE.includes(k));
      el.innerHTML=head(3)+`<p class="muted" style="margin-bottom:14px">Your level for each activity helps us balance games. Be honest, there's no wrong answer.</p>`+acts.map(sp=>{const T=TYPES[sp]||{},cur=D.types[sp]||'';return `<div class="act-card"><div class="ic-row"><span class="ic-bub">${ic(SPORTS[sp].icon)}</span><b>${SPORTS[sp].club}</b></div>
        <div class="field" style="margin:0"><span class="lbl">Level</span><div class="lvl-pick" role="group" aria-label="${SPORTS[sp].club} level">${LEVELS.map((l,i)=>`<button type="button" data-lv="${sp}" data-i="${i}" aria-pressed="${D.levels[sp]===i}"><span class="bars" aria-hidden="true">${[0,1,2,3,4].map(j=>`<i class="${j<=i?'on':''}"></i>`).join('')}</span><span class="t"><b>${l}</b><small>${LEVEL_DESC[i]}</small></span></button>`).join('')}</div></div>
        ${Object.keys(T).length?`<div class="field" style="margin:0"><span class="lbl">Play style</span>
          ${sp==='badminton'?(quiz&&quiz.done&&cur?`<div class="result"><span class="label">You're a</span><b class="big">${esc(cur)}</b><p>${esc(T[cur]||'')}</p></div>`:`<div class="row"><button type="button" class="btn sm" id="q-start">${ic('star')}Take the 30-second test</button><span class="fine">Five questions. No wrong answers.</span></div>`):''}
          <div class="chips" role="group">${Object.entries(T).map(([k,d])=>`<button type="button" class="chip" data-ty="${sp}" data-val="${esc(k)}" aria-pressed="${k===cur}" title="${esc(d)}">${esc(k)}</button>`).join('')}</div>
          ${cur&&!(sp==='badminton'&&quiz&&quiz.done)?`<p class="fine">${esc(T[cur]||'')}</p>`:''}</div>`:''}</div>`}).join('')+`
        ${acts.length?'':'<p class="fine">No levels needed for the activities you picked.</p>'}
        <div class="field"><span class="lbl">Hand</span>${chips('hand',['Right','Left'],D.hand)}</div>`;
      const qs=$('q-start');if(qs)qs.onclick=()=>{quiz={i:0,score:{}};renderStep()};
      el.querySelectorAll('[data-ty]').forEach(b=>b.onclick=()=>{D.types[b.dataset.ty]=D.types[b.dataset.ty]===b.dataset.val?'':b.dataset.val;if(b.dataset.ty==='badminton')quiz=null;renderStep()});
      el.querySelectorAll('[data-lv]').forEach(b=>b.onclick=()=>{const k=b.dataset.lv,v=+b.dataset.i;if(D.levels[k]===v)delete D.levels[k];else D.levels[k]=v;renderStep()});
    }
  }
  if(step===4){
    const sp=mainSport(D);
    el.innerHTML=head(4)+`<p class="muted" style="margin-bottom:14px">One word for how you play. It goes on your card, whatever the sport.</p>
      <div class="sigs" role="group" aria-label="Your signature">${SIGS.map(([k,d])=>`<button type="button" class="sig" data-f="shot" data-val="${esc(k)}" aria-pressed="${D.shot===k}"><b>${esc(k)}</b><span>${esc(d)}</span></button>`).join('')}</div>
      <div class="field" style="margin-top:14px"><label for="c-sig">Or write your own <span class="req">optional</span></label><input type="text" id="c-sig" maxlength="14" placeholder="e.g. Net ninja, Lefty, Clutch" value="${esc(SIGS.some(([k])=>k===D.shot)?'':D.shot||'')}"><p class="fine">Up to 14 characters. Keep it friendly, it’s on your card.</p></div>
      <p class="fine">You can edit your card any time.</p>`;
  }
  if(step===4){const ci=$('c-sig');if(ci)ci.oninput=e=>{D.shot=e.target.value.replace(/\s+/g,' ').slice(0,14);el.querySelectorAll('.sig').forEach(x=>x.setAttribute('aria-pressed',x.dataset.val===D.shot));preview()}}
  if(step===5)el.innerHTML=`<h2 style="margin-bottom:12px">Thank you.</h2><div id="save-out" style="display:grid;gap:12px"><p class="muted">Saving your card…</p></div>`;
  el.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{const k=b.dataset.f;D[k]=D[k]===b.dataset.val?'':b.dataset.val;renderStep()});
  const inQuiz=step===3&&quiz&&quiz.i<QUIZ.length;
  const done=step===5;
  $('back').hidden=done||inQuiz;$('back').textContent=step===0?'Cancel':'Back';
  $('next').hidden=done||inQuiz;
  $('skip').hidden=done||inQuiz;$('skip').textContent=step===0?'Save my card':step===4?'Skip & save':'Skip';$('skip').disabled=step===0&&!stepValid();
  $('finish').hidden=done||inQuiz||step===0||step===4;
  $('next').textContent=step===4?(D._editing?'Save my card':'Register'):'Continue';
  $('next').disabled=!stepValid();
  preview();
}
$('back').onclick=()=>{if(step===0){setView('card');return}step=Math.max(0,step-1);quiz=null;renderStep()};
const saveNow=()=>{if(step===0&&!stepValid())return;step=5;renderStep();saveProfile()};
$('skip').onclick=()=>{if(step===0||step===4)return saveNow();if(step===4&&D.shot==null)D.shot='';step++;quiz=null;renderStep()};
$('finish').onclick=saveNow;
$('next').onclick=()=>{if(!stepValid())return;if(step<4){step++;if(step===2&&!D.sports.length)D.sports=[];renderStep()}else{step=5;renderStep();saveProfile()}};
$('photo-in').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const url=URL.createObjectURL(f),img=await loadImg(url);URL.revokeObjectURL(url);D._src=bwSource(img);D._crop={z:1,x:0,y:0,b:0};openCropper(D._src)}catch(_){toast('Sorry, that image did not load. Please try a JPG or PNG.')}};

/* ---------- crop & adjust: drag to move, pinch or slider to zoom, brightness ---------- */
const CROP_W=600,CROP_H=520;
async function renderCrop(src,c){const img=await loadImg(src),cv=document.createElement('canvas');cv.width=CROP_W;cv.height=CROP_H;const x=cv.getContext('2d');
  const base=Math.max(CROP_W/img.width,CROP_H/img.height),sc=base*c.z,w=img.width*sc,h=img.height*sc;
  x.filter=`brightness(${100+c.b}%)`;x.fillStyle='#000';x.fillRect(0,0,CROP_W,CROP_H);x.drawImage(img,(CROP_W-w)/2+c.x*CROP_W,(CROP_H-h)/2+c.y*CROP_H,w,h);
  return cv.toDataURL('image/jpeg',.8)}
function openCropper(src){if(!src)return;const c={...(D._src===src&&D._crop?D._crop:{z:1,x:0,y:0,b:0})};
  const ov=document.createElement('div');ov.className='crop-ov';ov.setAttribute('role','dialog');ov.setAttribute('aria-label','Adjust your photo');
  ov.innerHTML=`<div class="crop-box"><div class="row" style="justify-content:space-between"><h3 class="ah">Adjust your photo</h3><button class="btn ghost sm" data-cx>${ic('x')}Cancel</button></div>
    <div class="crop-frame" id="cf"><img id="ci" src="${src}" alt="" draggable="false"><div class="crop-fade"></div></div>
    <p class="fine" style="text-align:center">Drag to move. Pinch or use the slider to zoom.</p>
    <label class="crop-sl"><span class="label">Zoom</span><input type="range" id="cz" min="1" max="3" step="0.01" value="${c.z}"></label>
    <label class="crop-sl"><span class="label">Brightness</span><input type="range" id="cb" min="-40" max="40" step="1" value="${c.b}"></label>
    <div class="row" style="justify-content:space-between"><button class="btn ghost sm" id="crst">Reset</button><button class="btn" id="cok">${ic('check')}Use photo</button></div></div>`;
  document.body.appendChild(ov);document.body.style.overflow='hidden';
  const f=ov.querySelector('#cf'),im=ov.querySelector('#ci');
  const clamp=()=>{const fw=f.clientWidth,fh=f.clientHeight,base=Math.max(fw/im.naturalWidth,fh/im.naturalHeight),w=im.naturalWidth*base*c.z,h=im.naturalHeight*base*c.z;
    const mx=Math.max(0,(w-fw)/2/fw),my=Math.max(0,(h-fh)/2/fh);c.x=Math.max(-mx,Math.min(mx,c.x));c.y=Math.max(-my,Math.min(my,c.y));return{w,h,fw,fh}};
  const draw=()=>{if(!im.naturalWidth)return;const {w,h,fw,fh}=clamp();im.style.width=w+'px';im.style.height=h+'px';im.style.left=((fw-w)/2+c.x*fw)+'px';im.style.top=((fh-h)/2+c.y*fh)+'px';im.style.filter=`brightness(${100+c.b}%)`};
  im.onload=draw;if(im.complete)draw();addEventListener('resize',draw);
  const pts=new Map();let last=null,pinch=null;
  f.addEventListener('pointerdown',e=>{f.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});last={x:e.clientX,y:e.clientY};if(pts.size===2){const [a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:c.z}}});
  f.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2&&pinch){const [a,b]=[...pts.values()];c.z=Math.max(1,Math.min(3,pinch.z*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d));ov.querySelector('#cz').value=c.z}
    else if(last){c.x+=(e.clientX-last.x)/f.clientWidth;c.y+=(e.clientY-last.y)/f.clientHeight;last={x:e.clientX,y:e.clientY}}draw()});
  const up=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=null;const r=[...pts.values()][0];last=r?{...r}:null};
  f.addEventListener('pointerup',up);f.addEventListener('pointercancel',up);
  f.addEventListener('wheel',e=>{e.preventDefault();c.z=Math.max(1,Math.min(3,c.z*(e.deltaY<0?1.06:1/1.06)));ov.querySelector('#cz').value=c.z;draw()},{passive:false});
  ov.querySelector('#cz').oninput=e=>{c.z=+e.target.value;draw()};ov.querySelector('#cb').oninput=e=>{c.b=+e.target.value;draw()};
  const close=()=>{removeEventListener('resize',draw);ov.remove();document.body.style.overflow=''};
  ov.querySelector('[data-cx]').onclick=()=>{close();if(!D.photo&&D._src===src)D._src=''};
  ov.querySelector('#crst').onclick=()=>{Object.assign(c,{z:1,x:0,y:0,b:0});ov.querySelector('#cz').value=1;ov.querySelector('#cb').value=0;draw()};
  ov.querySelector('#cok').onclick=async()=>{try{D.photo=await renderCrop(src,c);D._src=src;D._crop={...c};close();renderStep();preview()}catch(_){toast('Sorry, that didn’t work. Please try another photo.')}};
}

async function saveProfile(){
  const now=new Date().toISOString();
  const data={/* _src/_crop stay on this device */nickname:D.nickname.trim().slice(0,16),listName:((D.listName||'').trim()||D.nickname.trim()).slice(0,30),number:String(D.number===''?'0':+D.number),edition:D.edition,photo:D.photo||'',
    sports:D.sports.length?D.sports:['badminton'],primary:mainSport(D),types:D.types,style:D.types.badminton||'',levels:Object.fromEntries(Object.entries(D.levels).filter(([k])=>D.sports.includes(k))),level:D.levels[mainSport(D)]??null,hand:D.hand,shot:(D.shot||'').trim().slice(0,14),
    listKey:keyOf(D.listName||D.nickname),createdAt:D.createdAt||now,updatedAt:now,ref:refCode(S.uid||D.nickname,{nickname:D.nickname,number:D.number}),refs:[...new Set([...(D.refs||[]),...(D.ref?[D.ref]:[])])].slice(-6),referredBy:(D.referredBy||'').toUpperCase().slice(0,16),memReq:{type:D.memType||'Guest',at:(D.memReq&&D.memReq.type===D.memType)?D.memReq.at:now}};
  const contact={email:D.email.trim().slice(0,80),mobile:D.mobile.trim().slice(0,20),instagram:(D.instagram||'').trim().slice(0,40),updatedAt:now};
  if(S.db&&S.uid){
    try{data.ref=await claimRef(S.uid,data.ref);await S.db.doc('profiles/'+S.uid).set(data);try{await S.db.doc('contacts/'+S.uid).set(contact);S.myContact=contact}catch(_){}
      try{localStorage.removeItem('badRef')}catch(_){}S.pendingRef='';toast(D._editing?'Your card is updated.':'Welcome to BAD. Thank you for registering.');setView('card');setTimeout(processCheckin,800);return}catch(e){console.error('BAD save failed',e);S.saveErr=(e&&(e.code||e.message))||''}
  }
  if(window.BAD_WEB){
    $('save-out').innerHTML=`<p>Sorry, we couldn’t save your card just now. Your details are still here, so nothing is lost.</p>
      <p class="fine">Please try again in a moment. If it keeps happening, let a BAD admin know.${S.saveErr?` (${esc(S.saveErr)})`:''}</p>
      <div class="row"><button class="btn" id="save-retry">Try again</button><button class="btn ghost" id="redo">Edit card</button></div>`;
    $('redo').onclick=()=>{step=0;renderStep()};
    $('save-retry').onclick=async e=>{e.target.disabled=true;e.target.textContent='Saving…';S.saveErr='';await saveProfile()};
    return}
  const code='BAD1-'+btoa(unescape(encodeURIComponent(JSON.stringify({...data,photo:'',contact}))));
  $('save-out').innerHTML=`<p>Your card is ready, but we couldn't save it to your account from here. Please send this code to a BAD admin and they will add you.</p>
    <div class="code" id="code">${esc(code)}</div>
    <div class="row"><button class="btn" id="copy">${ic('copy')}Copy code</button><button class="btn ghost" id="redo">Edit card</button></div>`;
  $('copy').onclick=async()=>{try{await navigator.clipboard.writeText(code);toast('Copied. Thank you.')}catch(e){toast('Please select the code and copy it.')}};
  $('redo').onclick=()=>{step=4;renderStep()};
}
