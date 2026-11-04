/* ---------- QR check-in, rest / extra games, levels ---------- */
const APP_URL=window.BAD_WEB?location.origin+location.pathname:'https://claude.ai/artifact/2WfMUPuiwZQBxY6TFkBAMk';
S.qr={};S.checkins={};S.myCI={};S.levels={};S.courtSport=null;
(function readHash(){const h=location.hash||'',m=h.match(/^#ci-(.+)-([a-z0-9]{6})$/);if(m)S.pendingCI={sid:m[1],code:m[2]};
  const j=h.match(/^#join-([A-Za-z0-9]{2,20})$/);if(j){S.pendingRef=j[1].toUpperCase();try{localStorage.setItem('badRef',S.pendingRef)}catch(_){}history.replaceState(null,'',location.pathname)}
  else{try{S.pendingRef=localStorage.getItem('badRef')||''}catch(_){}}})();
const inviteUrl=code=>`${APP_URL}#join-${normCode(code)}`;
/* QR as an image, made on this device (no network) */
const _qrCache={};
function qrData(text,size=240){const k=size+'|'+text;if(_qrCache[k])return _qrCache[k];if(!window.QRCode)return '';
  const d=document.createElement('div');try{new QRCode(d,{text,width:size,height:size,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M})}catch(_){return ''}
  const c=d.querySelector('canvas');const u=c?c.toDataURL('image/png'):(d.querySelector('img')?.src||'');if(u)_qrCache[k]=u;return u}
const newCode=()=>Math.random().toString(36).slice(2,8).padEnd(6,'x');
const ownLevel=(uid,sp)=>{const p=S.profiles[uid];if(!p)return null;return p.levels&&p.levels[sp]!=null?p.levels[sp]:(p.level??null)};
const effLevel=(uid,sp)=>{const o=S.levels[uid];if(o&&o.levels&&o.levels[sp]!=null)return o.levels[sp];if(o&&o.level!=null&&!o.levels)return o.level;return ownLevel(uid,sp)};
/* other sports: the crew's pick wins, then the player's own (scale v2) */
const lvl2Of=(uid,sp)=>{const o=(S.levels||{})[uid];if(o&&o.lv2&&o.lv2[sp]!=null)return o.lv2[sp];const p=(S.profiles||{})[uid];return p&&p.lv2&&p.lv2[sp]!=null?p.lv2[sp]:null};
function sportRating(uid,sp){const i=lvl2Of(uid,sp);if(i==null)return null;return i+1+(TEAM_SPORTS.includes(sp)&&catOf(uid)==='M'?0.5:0)}
const lvlTag=(uid,sp)=>{if((sp||'badminton')==='badminton'){if(!S.profiles[uid]){const x=boardLvl(S.live[S.courtSid],uid);return gradeRow(x.g)?x.g+(x.cat?' '+x.cat:''):'Unrated'}const g=gradeOf(uid),c=catOf(uid);return g?g+(c?' '+c:''):'Unrated'}const l2=lvl2Of(uid,sp);if(l2!=null)return lvlName(sp,l2)||'';return 'Unrated'};

/* player: complete a scanned check-in */
async function processCheckin(){
  const p=S.pendingCI;if(!p||!S.loaded||!S.db||!S.uid)return;
  const s=S.sessions[p.sid];if(!s){if(Object.keys(S.sessions).length){S.pendingCI=null;toast('Sorry, that check-in code is for a session we can’t find.')}return}
  if(!myProfile()){if(!p.told){p.told=1;toast('Please register first. You’ll be checked in right after.');if(S.view!=='create')startCreator()}return}
  S.pendingCI=null;
  try{
    if(!S.bookings[S.uid]?.s?.[p.sid]||S.bookings[S.uid].s[p.sid].out)await saveBooking(p.sid,'join',()=>freshEntry('cash'));
    const cur=S.myCI||{};await S.db.doc('checkins/'+S.uid).set({...cur,[p.sid]:{...(cur[p.sid]||{}),at:cur[p.sid]?.at||new Date().toISOString(),code:p.code}});
    S.courtSport=s.sport||'badminton';S.courtSid=p.sid;setView('courts');toast('You’re checked in. Thank you!');
  }catch(e){toast('Sorry, check-in didn’t save. Please ask an admin.')}
}
async function setFlag(sid,key,val){const cur=S.myCI||{},e={...(cur[sid]||{})};e[key]=val;e.ft=new Date().toISOString();
  try{await S.db.doc('checkins/'+S.uid).set({...cur,[sid]:e});toast(key==='rest'?(val?'You’ll sit out until you tap Ready.':'Welcome back. You’re in the rotation.'):(val?'Admins can see you’re up for extra games.':'Got it.'))}catch(_){toast('Sorry, that didn’t save.')}}

/* admin: merge scanned check-ins and player flags into the live board */
function syncCheckins(){
  if(!S.canEdit||!S.db)return;
  for(const [sid,lv0] of Object.entries(S.live)){const q=S.qr[sid];if(!S.sessions[sid])continue;
    const lv=norm(clone(lv0)),ppl=people(sid);let changed=false;lv.rest=lv.rest||{};lv.more=lv.more||{};lv.ft=lv.ft||{};
    for(const [uid,doc] of Object.entries(S.checkins)){const e=doc&&doc[sid];if(!e)continue;
      if(q&&e.code===q.code&&ppl[uid]&&!lv.checkin[uid]){setBase(sid,lv,uid);lv.checkin[uid]=e.at;lv.seen={...(lv.seen||{}),[uid]:ppl[uid].name};changed=true}
      if(lv.checkin[uid]&&e.ft&&e.ft>(lv.ft[uid]||'')){lv.rest[uid]=!!e.rest;lv.more[uid]=!!e.more;lv.ft[uid]=e.ft;changed=true}}
    if(changed)saveLive(sid,lv)}
}

/* admin: QR panel */
/* admins: a big QR code that opens the app so new players can make their card */
function showSignupQR(){const ov=document.createElement('div');ov.className='qrov';
  ov.innerHTML=`<div class="qrcard"><img src="${LOGO.badK}" alt="BAD" style="height:34px"><h2>Get your BAD card</h2><p class="muted">Scan with your phone camera to sign up and make your player card.</p><div id="qrbox"></div><p class="fine num">${esc(APP_URL.replace(/^https?:\/\//,''))}</p><div class="row" style="justify-content:center"><button class="btn sm" id="qr-close">Close</button></div></div>`;
  document.body.appendChild(ov);const b=$('qrbox');if(window.QRCode)new QRCode(b,{text:APP_URL,width:260,height:260,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});else b.innerHTML=`<p class="code">${esc(APP_URL)}</p>`;
  $('qr-close').onclick=()=>ov.remove();ov.onclick=e=>{if(e.target===ov)ov.remove()}}
async function showQR(sid){
  let q=S.qr[sid];if(!q){q={code:newCode(),at:new Date().toISOString()};try{await S.db.doc('qr/'+sid).set(q);S.qr[sid]=q}catch(e){toast('Sorry, the QR code didn’t save.');return}}
  const s=S.sessions[sid],url=`${APP_URL}#ci-${sid}-${q.code}`;
  const ov=document.createElement('div');ov.className='qrov';ov.innerHTML=`<div class="qrcard"><img src="${LOGO.badK}" alt="BAD" style="height:30px"><h2>${esc(s.title)}</h2><p class="muted">Scan with your phone camera to check in.</p><div id="qrbox"></div>
    <p class="fine">Can’t scan? An admin can check you in by name.</p><div class="row" style="justify-content:center"><button class="btn ghost sm" id="qr-new">New code</button><button class="btn sm" id="qr-close">Close</button></div></div>`;
  document.body.appendChild(ov);
  const draw=u=>{const b=$('qrbox');b.innerHTML='';if(window.QRCode)new QRCode(b,{text:u,width:240,height:240,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});else b.innerHTML=`<p class="code">${esc(u)}</p>`};
  draw(url);
  $('qr-close').onclick=()=>ov.remove();
  $('qr-new').onclick=async()=>{const n={code:newCode(),at:new Date().toISOString()};try{await S.db.doc('qr/'+sid).set(n);S.qr[sid]=n;draw(`${APP_URL}#ci-${sid}-${n.code}`);toast('New code. The old one no longer works.')}catch(e){toast('Sorry, that didn’t save.')}};
}
async function setLevel2(uid,sp,v){try{const cur={...((S.levels[uid]||{}).lv2||{})};if(v==='')delete cur[sp];else cur[sp]=+v;await S.db.doc('levels/'+uid).set({...(S.levels[uid]||{}),lv2:cur,at:new Date().toISOString(),by:S.uid});toast(`${(S.profiles[uid]||{}).nickname||'Player'}: ${v===''?'not set':lvlName(sp,+v)}. Saved.`)}catch(e){toast('Sorry, that didn’t save.')}}
async function setLevel(uid,sp,v){try{const cur={...((S.levels[uid]||{}).levels||{})};if(v==='')delete cur[sp];else cur[sp]=+v;await S.db.doc('levels/'+uid).set({levels:cur,at:new Date().toISOString()});toast('Level saved. Only admins see this.')}catch(e){toast('Sorry, that didn’t save.')}}

/* sample players (for trying the app) */
async function removeSamples(quiet){
  const ids=Object.entries(S.profiles).filter(([,p])=>p.sample).map(([id])=>id);if(!ids.length)return;await allGamesLoad();const set=new Set(ids);
  try{for(const id of ids){await S.db.doc('profiles/'+id).delete();await S.db.doc('bookings/'+id).delete()}
    for(const [gid,g] of Object.entries(S.games||{}))if([...(g.a||[]),...(g.b||[])].some(x=>set.has(x)))await S.db.doc('games/'+gid).delete();
    for(const [sid,lv] of Object.entries(S.live||{})){const j=JSON.stringify(lv);if(ids.some(i=>j.includes('"'+i+'"')))await S.db.doc('live/'+sid).delete()}
    toast(`${ids.length} sample players removed.`)}catch(e){if(!quiet)toast('Sorry, some sample players were not removed.')}
}
