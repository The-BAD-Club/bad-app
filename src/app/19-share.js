/* ---------- share a session: WhatsApp, Instagram Story, or a link ----------
   Every session has its own page: …/bad-app/#s=<id>. Anyone can open it (sessions are public in the security rules);
   members get a button to book, visitors get Join BAD. The Story image is drawn on the phone, 1080×1920, with a QR code. */
const sessUrl=sid=>`${APP_URL}#s=${encodeURIComponent(sid)}`;
const longDate=iso=>{const d=new Date(iso+'T12:00:00+04:00');return d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'Asia/Dubai'})};
function sessShareText(sid){const s=S.sessions[sid]||{},sp=sportOf(s.sport);
  return [`${s.title||sp.club} · The BAD Club`,`📅 ${longDate(s.date)}`,`🕗 ${timeRange(s,true)}`,s.venue?`📍 ${s.venue}`:'',+s.fee>0?`💳 AED ${s.fee}`:'',s.note?`\n${s.note}`:'',`\nEvery level is welcome. Book your spot:`,sessUrl(sid)].filter(Boolean).join('\n')}
const STORY_PHOTO={badminton:'assets/home/home-08.jpg',volleyball:'assets/home/home-07.jpg',taste:'assets/home/home-05.jpg',badx:'assets/home/home-06.jpg'};

function shareSession(sid){const s=S.sessions[sid];if(!s)return;const text=sessShareText(sid),url=sessUrl(sid);
  const ov=document.createElement('div');ov.className='shov';ov.setAttribute('role','dialog');ov.setAttribute('aria-label','Share this session');
  ov.innerHTML=`<div class="shcard"><div class="sh-h"><b>Share ${esc(s.title||sportOf(s.sport).club)}</b><button class="sh-x" aria-label="Close">${ic('x')}</button></div>
    <div class="sh-grid">
      <a class="sh-o" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">${ic('wa')}<span>WhatsApp</span></a>
      <button class="sh-o" data-sh="story">${ic('ig')}<span>Instagram Story</span></button>
      <button class="sh-o" data-sh="copy">${ic('copy')}<span>Copy link</span></button>
      ${navigator.share?`<button class="sh-o" data-sh="more">${ic('arrow')}<span>More</span></button>`:''}</div>
    <pre class="sh-prev">${esc(text)}</pre></div>`;
  document.body.appendChild(ov);
  const close=()=>ov.remove();ov.querySelector('.sh-x').onclick=close;ov.onclick=e=>{if(e.target===ov)close()};
  ov.querySelector('[data-sh="copy"]').onclick=async()=>{try{await navigator.clipboard.writeText(text);toast('Copied. Paste it anywhere.')}catch(_){prompt('Copy this:',url)}};
  const more=ov.querySelector('[data-sh="more"]');if(more)more.onclick=()=>navigator.share({title:s.title,text,url}).catch(()=>{});
  ov.querySelector('[data-sh="story"]').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.querySelector('span').textContent='Making it…';
    try{const blob=await storyImage(sid),file=new File([blob],`BAD-${(s.title||'session').replace(/[^\w]+/g,'-')}.png`,{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file]});toast('In Instagram, add a Link sticker with the session link.')}
      else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('Saved. Post it to your Story and add a Link sticker.')}
      try{await navigator.clipboard.writeText(url)}catch(_){}}
    catch(err){if(err&&err.name!=='AbortError')toast("Sorry, the Story image couldn't be made.")}
    finally{b.disabled=false;b.querySelector('span').textContent='Instagram Story'}};
}

/* the Story: a club photo on top, the details big and clear underneath, a QR code that opens the session */
async function storyImage(sid){const s=S.sessions[sid],sp=sportOf(s.sport),W=1080,H=1920,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  try{await document.fonts.ready}catch(_){}
  const ff=getComputedStyle(document.body).fontFamily||'sans-serif',serif=getComputedStyle(document.querySelector('h2')||document.body).fontFamily||'serif';
  g.fillStyle='#0a0a0a';g.fillRect(0,0,W,H);
  try{const im=await loadImg(STORY_PHOTO[s.sport]||'assets/home/home-01.jpg'),ph=1100,k=Math.max(W/im.width,ph/im.height),w=im.width*k,h=im.height*k;
    g.save();g.beginPath();g.rect(0,0,W,ph);g.clip();g.filter='grayscale(1) contrast(1.08)';g.drawImage(im,(W-w)/2,(ph-h)/2,w,h);g.restore();
    const gr=g.createLinearGradient(0,ph*.4,0,ph);gr.addColorStop(0,'rgba(10,10,10,0)');gr.addColorStop(1,'rgba(10,10,10,1)');g.fillStyle=gr;g.fillRect(0,0,W,ph)}catch(_){}
  g.fillStyle='#fff';g.textBaseline='alphabetic';
  g.font=`900 64px ${ff}`;g.fillText('BAD',72,140);
  g.font=`600 26px ${ff}`;g.globalAlpha=.7;g.fillText(sp.club.toUpperCase(),72,190);g.globalAlpha=1;
  const wrap=(t,x,y,max,lh)=>{const words=String(t).split(/\s+/);let line='',n=0;for(const w of words){const tt=line?line+' '+w:w;if(g.measureText(tt).width>max&&line){g.fillText(line,x,y+n*lh);n++;line=w}else line=tt}g.fillText(line,x,y+n*lh);return n+1};
  let y=1210;g.font=`400 104px ${serif}`;y+=wrap(s.title||sp.club,72,y,W-144,108)*108;
  y+=24;const rows=[longDate(s.date),timeRange(s,true),s.venue||'',+s.fee>0?`AED ${s.fee}`:''].filter(Boolean);
  g.font=`500 42px ${ff}`;rows.forEach(r=>{g.globalAlpha=.88;wrap(r,72,y,W-144-300,52);g.globalAlpha=1;y+=62});
  const qr=qrData(sessUrl(sid),260);if(qr){try{const q=await loadImg(qr);g.fillStyle='#fff';const qx=W-72-280,qy=H-72-280-70;g.beginPath();g.roundRect?g.roundRect(qx,qy,280,280,24):g.rect(qx,qy,280,280);g.fill();g.drawImage(q,qx+10,qy+10,260,260)}catch(_){}}
  g.fillStyle='#fff';g.font=`700 30px ${ff}`;g.fillText('Every level is welcome.',72,H-150);g.globalAlpha=.65;g.font=`500 28px ${ff}`;g.fillText('Scan or tap the link to book',72,H-104);g.globalAlpha=1;
  return await new Promise(r=>c.toBlob(r,'image/png'))}

/* ---------- the session page anyone can open ---------- */
function openSession(sid){S.sessId=sid;setView('sess',{push:1})}
function renderSess(){const el=$('v-sess');if(!el)return;const sid=S.sessId,s=S.sessions[sid];
  if(!s){el.innerHTML=`<div class="empty">${ic('clock')}<span>Loading the session…</span></div>`;const db=window.badPublicDb||S.db;if(db&&sid&&!S._sessFetch){S._sessFetch=1;db.doc('sessions/'+sid).get().then(d=>{S._sessFetch=0;if(d.exists){S.sessions[sid]=d.data();renderSess()}else el.innerHTML=`<div class="empty">${ic('clock')}<span>This session isn't available any more.</span></div>`}).catch(()=>{S._sessFetch=0})}return}
  const sp=sportOf(s.sport),d=dParts(s.date),past=s.date<new Date().toISOString().slice(0,10),guest=!!window.BAD_GUEST;
  el.innerHTML=`<div class="sesshero"><div class="dt"><small>${d.w}</small><b class="num">${d.d}</b><small>${d.m}</small></div><div><span class="label">${ic(sp.icon)} ${esc(sp.club)}</span><h2>${esc(s.title||sp.club)}</h2></div></div>
    <div class="sessinfo">
      <div class="si">${ic('cal')}<span>${esc(longDate(s.date))}</span></div>
      <div class="si">${ic('clock')}<span>${esc(timeRange(s,true))}</span></div>
      ${s.venue?`<div class="si">${ic('pin')}<span>${esc(s.venue)}${s.mapLink?` · <a href="${esc(s.mapLink)}" target="_blank" rel="noopener">Directions</a>`:''}</span></div>`:''}
      ${+s.fee>0?`<div class="si">${ic('coin')}<span>AED ${esc(s.fee)}</span></div>`:''}</div>
    ${s.note?`<p class="snote">${esc(s.note)}</p>`:''}
    ${past?`<p class="fine">This session has already happened.</p>`:guest?`<div class="row"><button class="btn bigjoin" data-sjoin="1">${ic('card')}Join BAD to book</button></div><p class="fine">Already a member? Sign in, then come back to this link.</p>`
      :`<div class="row"><button class="btn" data-sbook="1">${ic('play')}Book in Play</button></div>`}
    <div class="row"><button class="btn ghost" data-sshare="1">${ic('share')}Share</button></div>
    <p class="fine">Every level is welcome. The BAD Club, Dubai.</p>`;
  const q=k=>el.querySelector(k);
  if(q('[data-sjoin]'))q('[data-sjoin]').onclick=()=>window.badJoin&&window.badJoin();
  if(q('[data-sbook]'))q('[data-sbook]').onclick=()=>{S.sport=s.sport||'all';S.scrollSess=sid;setView('play')};
  q('[data-sshare]').onclick=()=>shareSession(sid)}

document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-share]');if(b){e.preventDefault();shareSession(b.dataset.share)}});
