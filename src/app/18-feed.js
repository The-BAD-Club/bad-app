/* ---------- the Feed: photos, words and props from the community ----------
   Approved members only (the security rules enforce it). Posts go up straight away. One emoji reaction per person per post,
   one report per person; owners delete their own posts, admins hide or delete anything.
   Photos are shrunk on the phone and kept in their own documents (feedimg), loaded only when a post scrolls into view. */
const FEED_EMO=['🔥','🧱','🤝','😂','🏸'];
const PROPS=[['🔥','Smash of the night'],['🧱','The Wall'],['🤝','Good sport'],['😂','Vibes'],['🏸','Clutch']];
const propLabel=e=>(PROPS.find(p=>p[0]===e)||['',''])[1];
S.feed=S.feed||{};S.feedImg=S.feedImg||{};S.fDraft=S.fDraft||{text:'',photos:[],dept:''};
const ago=iso=>{const t=Date.parse(iso||'');if(!t)return '';const m=Math.round((Date.now()-t)/60000);if(m<1)return 'just now';if(m<60)return m+'m';const h=Math.round(m/60);if(h<24)return h+'h';const d=Math.round(h/24);if(d<7)return d+'d';return new Date(t).toLocaleDateString('en-GB',{day:'numeric',month:'short'})};
const pname=uid=>(S.profiles[uid]||{}).nickname||'A BAD member';
const plink=uid=>`<button class="plink" data-prof="${esc(uid)}">${esc(pname(uid))}</button>`;
function feedList(){return Object.entries(S.feed).filter(([,p])=>!p.hidden||S.canEdit).sort((a,b)=>String(b[1].at||'').localeCompare(String(a[1].at||'')))}

function postHTML(id,p){const mine=p.uid===S.uid,r=p.r||{},myR=r[S.uid],rep=Object.keys(p.rep||{}).length;
  const counts=FEED_EMO.map(e=>[e,Object.values(r).filter(x=>x===e).length]);
  const menu=`<details class="pmenu"><summary aria-label="More">${ic('dots')}</summary><div class="pmenu-in">
    ${mine?`<button data-fdel="${esc(id)}">Delete post</button>`:`<button data-frep="${esc(id)}" ${(p.rep||{})[S.uid]?'disabled':''}>${(p.rep||{})[S.uid]?'Reported':'Report'}</button>`}
    ${S.canEdit?`<button data-fhide="${esc(id)}">${p.hidden?'Show again':'Hide'}</button>${mine?'':`<button data-fdel="${esc(id)}">Delete</button>`}`:''}</div></details>`;
  const head=p.kind==='props'
    ?`<div class="fp-props"><span class="fp-emo" aria-hidden="true">${esc(p.e||'')}</span><div><div class="nm">${plink(p.uid)} gave ${plink(p.to)} props</div><div class="sub">${esc(propLabel(p.e))} · ${esc(ago(p.at))}</div></div>${menu}</div>`
    :`<div class="fp-head">${avatar(S.profiles[p.uid],'')}<div><div class="nm">${plink(p.uid)}</div><div class="sub">${esc(ago(p.at))}${p.dept&&SPORTS[p.dept]?' · '+esc(SPORTS[p.dept].club):''}</div></div>${menu}</div>`;
  const n=p.n||0;
  const pics=n?`<div class="fp-pics n${n}">${Array.from({length:n},(_,i)=>{const k=id+'-'+i,src=S.feedImg[k];return `<figure data-fimg="${esc(k)}">${src?`<img src="${esc(src)}" alt="" decoding="async">`:''}</figure>`}).join('')}</div>`:'';
  return `<article class="fpost${p.hidden?' hid':''}" data-post="${esc(id)}">${head}
    ${p.hidden?'<span class="tagl warn">Hidden from members</span>':''}${S.canEdit&&rep?`<span class="tagl warn">Reported by ${rep}</span>`:''}
    ${p.text?`<p class="fp-text">${esc(p.text)}</p>`:''}${pics}
    <div class="fp-react" role="group" aria-label="React">${counts.map(([e,c])=>`<button data-freact="${esc(id)}" data-e="${e}" aria-pressed="${myR===e}" aria-label="React ${e}">${e}${c?`<span class="num">${c}</span>`:''}</button>`).join('')}</div></article>`}

function composerHTML(){const d=S.fDraft;
  return `<section class="fcompose">${avatar(myProfile(),'')}<div class="fc-in">
    <label for="f-text" class="sr">Share something</label><textarea id="f-text" rows="2" maxlength="500" placeholder="Share a moment from BAD…">${esc(d.text)}</textarea>
    ${d.photos.length?`<div class="fc-thumbs">${d.photos.map((u,i)=>`<div class="fc-th"><img src="${esc(u)}" alt=""><button class="rmx" data-frm="${i}" aria-label="Remove photo ${i+1}">${ic('x')}</button></div>`).join('')}</div>`:''}
    <div class="fc-bar"><label class="btn ghost sm fc-add${d.photos.length>=4?' off':''}">${ic('photo')}Photos<input type="file" id="f-files" accept="image/*" multiple hidden ${d.photos.length>=4?'disabled':''}></label>
      <select id="f-dept" aria-label="Department"><option value="">All of BAD</option>${Object.keys(SPORTS).map(k=>`<option value="${k}" ${d.dept===k?'selected':''}>${esc(SPORTS[k].club)}</option>`).join('')}</select>
      <button class="btn sm" id="f-go">Post</button></div></div></section>`}

/* the Feed lives on Home, under Coming up. Only the list refreshes when someone posts or reacts, so a half-written post is never lost. */
S.feedShow=S.feedShow||10;
function feedListHTML(){const L=feedList();if(!L.length)return `<div class="empty">${ic('photo')}<span>Nothing here yet. Post the first photo from your last session.</span></div>`;
  return L.slice(0,S.feedShow).map(([id,p])=>postHTML(id,p)).join('')+(L.length>S.feedShow?`<button class="btn ghost wide" data-fmore="1">Show more</button>`:'')}
function feedSectionHTML(){if(notMember()||!myProfile())return '';
  return `<section class="hsec" id="home-feed"><div class="sec-h"><h3 class="ah">Feed</h3><span class="fine">Photos, shout-outs and props</span></div>${composerHTML()}<div class="flist" id="flist">${feedListHTML()}</div></section>`}
function bindHomeFeed(el){const f=el.querySelector('#home-feed');if(!f)return;bindFeed(f);const m=f.querySelector('[data-fmore]');if(m)m.onclick=()=>{S.feedShow+=10;refreshFeedList()};
  if(S.scrollFeed){S.scrollFeed=0;setTimeout(()=>f.scrollIntoView({block:'start',behavior:'smooth'}),80)}}
function refreshFeedList(){const l=$('flist');if(!l)return;l.innerHTML=feedListHTML();const f=$('home-feed');bindFeed(l);const m=l.querySelector('[data-fmore]');if(m)m.onclick=()=>{S.feedShow+=10;refreshFeedList()}}
/* after posting or changing the photos: redraw the whole Feed block (composer included) */
function renderFeed(){if(S.view==='player')return renderPlayer();const f=$('home-feed');if(!f)return;const tmp=document.createElement('div');tmp.innerHTML=feedSectionHTML();const n=tmp.firstElementChild;if(!n)return;f.replaceWith(n);bindHomeFeed(n.parentElement||document)}
let feedIO=null;
function loadFeedImg(k){if(S.feedImg[k]!==undefined)return;S.feedImg[k]='';S.db.doc('feedimg/'+k).get().then(d=>{if(!d.exists)return;S.feedImg[k]=d.data().d;document.querySelectorAll(`[data-fimg="${CSS.escape(k)}"]`).forEach(f=>{f.innerHTML=`<img src="${S.feedImg[k]}" alt="" decoding="async">`})}).catch(()=>{delete S.feedImg[k]})}
function bindFeed(el){
  if(feedIO)feedIO.disconnect();
  const figs=el.querySelectorAll('[data-fimg]');
  if('IntersectionObserver' in window){feedIO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){loadFeedImg(e.target.dataset.fimg);feedIO.unobserve(e.target)}}),{rootMargin:'400px'});figs.forEach(f=>{if(!S.feedImg[f.dataset.fimg])feedIO.observe(f)})}
  else figs.forEach(f=>loadFeedImg(f.dataset.fimg));
  el.querySelectorAll('[data-prof]').forEach(b=>b.onclick=()=>openProfile(b.dataset.prof));
  const t=$('f-text');if(t)t.oninput=()=>{S.fDraft.text=t.value};
  const dp=$('f-dept');if(dp)dp.onchange=()=>{S.fDraft.dept=dp.value};
  const fi=$('f-files');if(fi)fi.onchange=async()=>{const fs=[...fi.files].slice(0,4-S.fDraft.photos.length);for(const f of fs){try{S.fDraft.photos.push(await shrinkFeed(f))}catch(_){toast("That photo couldn't be read.")}}renderFeed();const t2=$('f-text');if(t2)t2.focus()};
  el.querySelectorAll('[data-frm]').forEach(b=>b.onclick=()=>{S.fDraft.photos.splice(+b.dataset.frm,1);renderFeed()});
  const go=$('f-go');if(go)go.onclick=postFeed;
  el.querySelectorAll('[data-freact]').forEach(b=>b.onclick=()=>reactFeed(b.dataset.freact,b.dataset.e));
  el.querySelectorAll('[data-frep]').forEach(b=>b.onclick=async()=>{try{await S.db.doc('feed/'+b.dataset.frep).update({['rep.'+S.uid]:true});toast('Thanks. The crew will take a look.')}catch(e){toast("Sorry, that didn't go through.")}});
  el.querySelectorAll('[data-fhide]').forEach(b=>b.onclick=async()=>{const id=b.dataset.fhide;try{await S.db.doc('feed/'+id).update({hidden:!S.feed[id].hidden})}catch(e){toast(e&&e.code==='permission-denied'?'Please publish the latest security rules first.':"Sorry, that didn't save.")}});
  el.querySelectorAll('[data-fdel]').forEach(b=>b.onclick=async()=>{const id=b.dataset.fdel;if(S.fDelArm!==id){S.fDelArm=id;b.textContent='Tap again to delete';return}S.fDelArm=null;
    try{const n=(S.feed[id]||{}).n||0;for(let i=0;i<n;i++)await S.db.doc('feedimg/'+id+'-'+i).delete().catch(()=>{});await S.db.doc('feed/'+id).delete();toast('Post deleted.')}catch(e){toast("Sorry, that didn't delete.")}});
}
/* feed photos: 1080px on the long side, then smaller until each fits comfortably in its own document */
function shrinkFeed(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{let w=1080,q=.78,out='';
  for(let t=0;t<6;t++){const k=Math.min(1,w/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);out=c.toDataURL('image/jpeg',q);if(out.length<240000)break;w=Math.round(w*.85);q=Math.max(.6,q-.05)}
  URL.revokeObjectURL(u);res(out)};im.onerror=rej;im.src=u})}
async function postFeed(){const d=S.fDraft,text=(d.text||'').trim().slice(0,500);if(!text&&!d.photos.length){toast('Write something or add a photo first.');return}
  const b=$('f-go');b.disabled=true;b.textContent='Posting…';
  const id=Date.now().toString(36)+Math.random().toString(36).slice(2,6),photos=d.photos.slice(0,4);
  try{for(let i=0;i<photos.length;i++){await S.db.doc('feedimg/'+id+'-'+i).set({uid:S.uid,post:id,d:photos[i]});S.feedImg[id+'-'+i]=photos[i]}
    const post={uid:S.uid,kind:'post',at:new Date().toISOString(),n:photos.length};if(text)post.text=text;if(d.dept)post.dept=d.dept;
    await S.db.doc('feed/'+id).set(post);S.fDraft={text:'',photos:[],dept:''};toast('Posted.');renderFeed()}
  catch(e){b.disabled=false;b.textContent='Post';toast(e&&e.code==='permission-denied'?'Please publish the latest security rules first.':"Sorry, that didn't post. Try a smaller photo?")}}
async function reactFeed(id,e){const p=S.feed[id];if(!p)return;const cur=(p.r||{})[S.uid],FV=firebase.firestore.FieldValue;
  p.r=p.r||{};if(cur===e)delete p.r[S.uid];else p.r[S.uid]=e;if(S.view==='feed')renderFeed();
  try{await S.db.doc('feed/'+id).update({['r.'+S.uid]:cur===e?FV.delete():e})}catch(err){toast("Sorry, that didn't save.")}}

/* ---------- player profiles ---------- */
function openProfile(uid){if(!uid)return;S.profUid=uid;setView('player',{push:1})}
function profStats(uid){let played=0;const b=(S.bookings[uid]||{}).s||{};for(const [sid,x] of Object.entries(b)){const s=S.sessions[sid];if(s&&sessStart(s)<Date.now()&&!x.out)played++}
  const props={};Object.values(S.feed).forEach(p=>{if(p.kind==='props'&&p.to===uid&&!p.hidden)props[p.e]=(props[p.e]||0)+1});return {played,props}}
function renderPlayer(){const el=$('v-player');if(!el)return;const uid=S.profUid,p=S.profiles[uid];
  if(!p||notMember()){el.innerHTML=`<div class="empty">${ic('users')}<span>This profile isn't available.</span></div>`;return}
  const me=uid===S.uid,st=profStats(uid),lvl=typeof levelFor==='function'?levelFor(uid):null,og=typeof first100No==='function'?first100No(uid):0;
  const depts=(p.sports||[]).filter(k=>SPORTS[k]).map(k=>`<span class="tagl">${ic(SPORTS[k].icon)}${esc(SPORTS[k].club)}</span>`).join('');
  const posts=feedList().filter(([,x])=>x.uid===uid&&x.kind==='post').slice(0,6);
  const today=new Date().toISOString().slice(0,10).replace(/-/g,''),given=Object.keys(S.feed).some(k=>k==='p_'+S.uid+'_'+uid+'_'+today);
  const stc=typeof statsFor==='function'?statsFor(p.listKey):{};
  el.innerHTML=`<div class="prof-card">${cardHTML(p,{balance:stc.balance||0,badges:typeof badgeCount==='function'?badgeCount(uid):0,sessions:st.played})}</div>
    <section class="prof">${avatar(p,p.listKey)}<div><h2 class="prof-n">${esc(p.nickname)}</h2>
      <div class="sub">${p.number!=null&&p.number!==''?'No. '+esc(String(p.number)).padStart(2,'0'):''}${og?` · OG 100 #${og}`:''}${lvl&&lvl.name?` · ${esc(lvl.name)}`:''}</div></div></section>
    ${p.bio?`<p class="prof-bio">${esc(p.bio)}</p>`:me?`<p class="fine">Add a short bio in My BAD so people know who you are.</p>`:''}
    ${depts?`<div class="row prof-d">${depts}</div>`:''}
    <div class="tiles prof-tiles"><div class="tile"><b class="num">${st.played}</b><span class="label">Sessions</span></div><div class="tile"><b class="num">${Object.values(st.props).reduce((a,b)=>a+b,0)}</b><span class="label">Props</span></div><div class="tile"><b class="num">${posts.length}</b><span class="label">Posts</span></div></div>
    ${Object.keys(st.props).length?`<section class="hsec"><h3 class="ah">Props</h3><div class="row">${PROPS.filter(([e])=>st.props[e]).map(([e,l])=>`<span class="tagl">${e} ${esc(l)} <b class="num">${st.props[e]}</b></span>`).join('')}</div></section>`:''}
    ${me?'':`<section class="hsec"><h3 class="ah">Give props</h3>${given?`<p class="fine">You gave ${esc(p.nickname)} props today. You can give them more tomorrow.</p>`:`<p class="fine">Once a day per player. It shows in the Feed.</p><div class="propsel">${PROPS.map(([e,l])=>`<button data-gprop="${e}">${e}<span>${esc(l)}</span></button>`).join('')}</div>`}</section>`}
    ${posts.length?`<section class="hsec"><h3 class="ah">Posts</h3><div class="flist">${posts.map(([id,x])=>postHTML(id,x)).join('')}</div></section>`:''}`;
  bindFeed(el);
  el.querySelectorAll('[data-gprop]').forEach(b=>b.onclick=async()=>{const e=b.dataset.gprop,d=+today,id='p_'+S.uid+'_'+uid+'_'+d;b.disabled=true;
    try{const doc={uid:S.uid,kind:'props',to:uid,e,d,at:new Date().toISOString()};await S.db.doc('feed/'+id).set(doc);S.feed[id]=doc;toast(`${e} Props sent to ${p.nickname}.`);renderPlayer()}
    catch(err){b.disabled=false;toast(err&&err.code==='permission-denied'?'Please publish the latest security rules first.':"Sorry, that didn't go through.")}});
}

/* ---------- Baddies: everyone in the community, with search and a department filter ---------- */
S.bdQ=S.bdQ||'';S.bdSport=S.bdSport||'all';
function baddiesList(){const q=S.bdQ.trim().toLowerCase();
  return Object.entries(S.profiles).filter(([,p])=>!p.sample&&p.nickname&&(S.bdSport==='all'||(p.sports||['badminton']).includes(S.bdSport))&&(!q||p.nickname.toLowerCase().includes(q)||String(p.number||'')===q))
    .sort((a,b)=>a[1].nickname.localeCompare(b[1].nickname))}
function baddiesGrid(){const L=baddiesList();
  return L.length?`<div class="bdgrid">${L.map(([uid,p])=>{const og=typeof first100No==='function'?first100No(uid):0;
    return `<button class="bd" data-prof="${esc(uid)}">${avatar(p,p.listKey)}<span class="bd-n">${esc(p.nickname)}</span><span class="bd-s">${p.number!=null&&p.number!==''?'No. '+esc(String(p.number)):''}${og?` · OG #${og}`:''}</span><span class="bd-i">${(p.sports||[]).filter(k=>SPORTS[k]).slice(0,4).map(k=>ic(SPORTS[k].icon)).join('')}</span></button>`}).join('')}</div>`
    :`<div class="empty">${ic('users')}<span>No BADDIES match that.</span></div>`}
function renderBaddies(){const el=$('v-baddies');if(!el)return;
  const used=[...new Set(Object.values(S.profiles).flatMap(p=>p.sports||[]))].filter(k=>SPORTS[k]);
  el.innerHTML=`<div class="hero"><span class="label">BADDIES</span><h2>The community.</h2><p class="muted">${Object.values(S.profiles).filter(p=>!p.sample).length} BADDIES and counting. Tap anyone to see their card.</p></div>
    <div class="field" style="margin:0"><label for="bd-q" class="sr">Search BADDIES</label><input type="search" id="bd-q" placeholder="Search by name or number" value="${esc(S.bdQ)}"></div>
    ${sportBar(S.bdSport,'bdf',used)}<div id="bd-out">${baddiesGrid()}</div>`;
  const bindOut=()=>el.querySelectorAll('[data-prof]').forEach(b=>b.onclick=()=>openProfile(b.dataset.prof));
  const qi=$('bd-q');qi.oninput=()=>{S.bdQ=qi.value;$('bd-out').innerHTML=baddiesGrid();bindOut()};
  el.querySelectorAll('[data-bdf]').forEach(b=>b.onclick=()=>{S.bdSport=b.dataset.bdf;renderBaddies()});bindOut()}
