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

/* who reacted, Facebook-style: the top emojis stacked, then "You and 3 others" */
function reactSummary(r){const v=Object.values(r||{});if(!v.length)return '';const c={};v.forEach(e=>c[e]=(c[e]||0)+1);
  const top=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([e])=>`<i>${e}</i>`).join(''),mine=(r||{})[S.uid];
  return `<div class="fp-sum"><span class="fp-emos" aria-hidden="true">${top}</span><span>${mine?(v.length===1?'You':`You and ${v.length-1} other${v.length===2?'':'s'}`):v.length}</span></div>`}
function postHTML(id,p){const mine=p.uid===S.uid,r=p.r||{},myR=r[S.uid],rep=Object.keys(p.rep||{}).length,n=p.n||0;
  const menu=`<details class="pmenu"><summary aria-label="More">${ic('dots')}</summary><div class="pmenu-in">
    ${mine?`<button data-fdel="${esc(id)}">Delete post</button>`:`<button data-frep="${esc(id)}" ${(p.rep||{})[S.uid]?'disabled':''}>${(p.rep||{})[S.uid]?'Reported':'Report'}</button>`}
    ${S.canEdit?`<button data-fhide="${esc(id)}">${p.hidden?'Show again':'Hide'}</button>${mine?'':`<button data-fdel="${esc(id)}">Delete</button>`}`:''}</div></details>`;
  const meta=[ago(p.at),p.dept&&SPORTS[p.dept]?SPORTS[p.dept].club:''].filter(Boolean).map(esc).join(' · ');
  const head=p.kind==='props'
    ?`<div class="fp-props"><span class="fp-emo" aria-hidden="true">${esc(p.e||'')}</span><div><div class="nm">${plink(p.uid)} gave ${plink(p.to)} props</div><div class="sub"><span class="fp-tag">${esc(propLabel(p.e))}</span> ${esc(ago(p.at))}</div></div>${menu}</div>`
    :`<div class="fp-head"><button class="fp-av" data-prof="${esc(p.uid)}" aria-label="${esc(pname(p.uid))}">${avatar(S.profiles[p.uid],'')}</button><div><div class="nm">${plink(p.uid)}</div><div class="sub">${meta}</div></div>${menu}</div>`;
  const big=!n&&p.text&&p.text.length<=90&&p.kind!=='props';
  const pics=n?`<div class="fp-pics n${n}">${Array.from({length:n},(_,i)=>{const k=id+'-'+i,src=S.feedImg[k];return `<figure data-fimg="${esc(k)}" data-fzoom="${esc(k)}">${src?`<img src="${esc(src)}" alt="" decoding="async">`:''}</figure>`}).join('')}</div>`:'';
  const second=mine||p.kind==='props'?'':`<button class="fp-act" data-fprops="${esc(p.uid)}">${ic('star')}Give props</button>`;
  return `<article class="fpost${p.hidden?' hid':''}${p.kind==='props'?' isprops':''}" data-post="${esc(id)}">${head}
    ${p.hidden?'<span class="tagl warn">Hidden from members</span>':''}${S.canEdit&&rep?`<span class="tagl warn">Reported by ${rep}</span>`:''}
    ${p.text?`<p class="fp-text${big?' big':''}">${esc(p.text)}</p>`:''}${pics}${reactSummary(r)}
    <div class="fp-bar"><button class="fp-act${myR?' on':''}" data-freact="${esc(id)}" aria-pressed="${!!myR}">${myR?`<span class="fp-me">${myR}</span>${esc(propLabel(myR))}`:`${ic('spark')}React`}</button>${second}</div></article>`}

/* the composer: one quiet line until you tap it, like Facebook's "What's on your mind?" */
function composerHTML(){const d=S.fDraft,p=myProfile()||{},open=S.fOpen||d.text||d.photos.length;
  if(!open)return `<section class="fcompose closed">${avatar(p,'')}<button class="fc-pill" data-fopen="1">What’s on your mind, ${esc(p.nickname||'BADDY')}?</button><label class="fc-ph" aria-label="Add photos">${ic('photo')}<input type="file" id="f-files" accept="image/*" multiple hidden></label></section>`;
  const tags=(p.sports||[]).filter(k=>SPORTS[k]).slice(0,4);
  return `<section class="fcompose">${avatar(p,'')}<div class="fc-in">
    <label for="f-text" class="sr">Share something</label><textarea id="f-text" rows="3" maxlength="500" placeholder="What’s on your mind, ${esc(p.nickname||'BADDY')}?">${esc(d.text)}</textarea>
    ${d.photos.length?`<div class="fc-thumbs">${d.photos.map((u,i)=>`<div class="fc-th"><img src="${esc(u)}" alt=""><button class="rmx" data-frm="${i}" aria-label="Remove photo ${i+1}">${ic('x')}</button></div>`).join('')}</div>`:''}
    ${tags.length?`<div class="fc-tags" role="group" aria-label="Tag a department">${tags.map(k=>`<button class="chip${d.dept===k?' on':''}" data-ftag="${k}" aria-pressed="${d.dept===k}">${ic(SPORTS[k].icon)}${esc(SPORTS[k].club)}</button>`).join('')}</div>`:''}
    <div class="fc-bar"><label class="btn ghost sm fc-add${d.photos.length>=4?' off':''}">${ic('photo')}Photo<input type="file" id="f-files" accept="image/*" multiple hidden ${d.photos.length>=4?'disabled':''}></label>
      <span class="fc-sp"></span><button class="linkbtn" data-fcancel="1">Cancel</button><button class="btn sm" id="f-go">Post</button></div></div></section>`}

/* the Feed lives on Home, under Coming up. Only the list refreshes when someone posts or reacts, so a half-written post is never lost. */
S.feedShow=S.feedShow||10;S.feedLim=S.feedLim||20;
/* the Feed listens to the newest 20 posts; Show more listens to 20 more */
function subFeed(){if(!S.member||!S.db)return;if(S.feedUnsub)S.feedUnsub();
  S.feedUnsub=S.db.collection('feed').orderBy('at','desc').limit(S.feedLim).onSnapshot(s=>{const m={};s.forEach(d=>m[d.id]=d.data());S.feed=m;if(S.view==='home')refreshFeedList();else if(S.view==='player')render()},()=>{})}
function feedMore(){S.feedShow+=10;if(Object.keys(S.feed).length>=S.feedLim){S.feedLim+=20;subFeed()}refreshFeedList()}
function feedListHTML(){const L=feedList();if(!L.length)return `<div class="empty">${ic('photo')}<span>Nothing yet. Be the first to post from tonight.</span></div>`;
  return L.slice(0,S.feedShow).map(([id,p])=>postHTML(id,p)).join('')+(L.length>S.feedShow||Object.keys(S.feed).length>=S.feedLim?`<div class="fmore-s"><button class="btn ghost wide" data-fmore="1">Show more</button></div>`:'<p class="fine fend">You’re all caught up.</p>')}
function feedSectionHTML(){if(notMember()||!myProfile())return '';
  return `<section class="hsec" id="home-feed"><div class="sec-h"><h3 class="ah">Feed</h3><span class="fine">Photos, shout-outs and props</span></div>${composerHTML()}<div class="flist" id="flist">${feedListHTML()}</div></section>`}
function bindHomeFeed(el){const f=el.querySelector('#home-feed');if(!f)return;bindFeed(f);bindMore(f);
  if(S.scrollFeed){S.scrollFeed=0;setTimeout(()=>f.scrollIntoView({block:'start',behavior:'smooth'}),80)}}
function refreshFeedList(){const l=$('flist');if(!l)return;l.innerHTML=feedListHTML();const f=$('home-feed');bindFeed(l);bindMore(l)}
/* after posting or changing the photos: redraw the whole Feed block (composer included) */
function renderFeed(){if(S.view==='player')return renderPlayer();const f=$('home-feed');if(!f)return;const tmp=document.createElement('div');tmp.innerHTML=feedSectionHTML();const n=tmp.firstElementChild;if(!n)return;f.replaceWith(n);bindHomeFeed(n.parentElement||document)}
let feedIO=null,moreIO=null;
/* Show more loads itself when you scroll near it (the button stays for keyboards) */
function bindMore(el){const m=el.querySelector('[data-fmore]');if(!m)return;m.onclick=feedMore;
  if('IntersectionObserver' in window){if(moreIO)moreIO.disconnect();moreIO=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){moreIO.disconnect();feedMore()}},{rootMargin:'300px'});moreIO.observe(m)}}
function closePick(){document.querySelectorAll('.fp-pick').forEach(x=>x.remove())}
function openPick(btn,id){closePick();const d=document.createElement('div');d.className='fp-pick';d.setAttribute('role','menu');d.setAttribute('aria-label','Choose a reaction');
  d.innerHTML=PROPS.map(([e,l])=>`<button role="menuitem" data-fpe="${e}" aria-label="${esc(l)}" title="${esc(l)}">${e}</button>`).join('');
  btn.closest('.fp-bar').appendChild(d);d.querySelector('button').focus();
  d.querySelectorAll('[data-fpe]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();closePick();reactFeed(id,b.dataset.fpe)});
  setTimeout(()=>document.addEventListener('click',closePick,{once:true}),0)}
function loadFeedImg(k){if(S.feedImg[k]!==undefined)return;S.feedImg[k]='';S.db.doc('feedimg/'+k).get().then(d=>{if(!d.exists)return;S.feedImg[k]=d.data().d;document.querySelectorAll(`[data-fimg="${CSS.escape(k)}"]`).forEach(f=>{f.innerHTML=`<img src="${S.feedImg[k]}" alt="" decoding="async">`})}).catch(()=>{delete S.feedImg[k]})}
function bindFeed(el){
  const figs=el.querySelectorAll('[data-fimg]');
  if('IntersectionObserver' in window){feedIO=feedIO||new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){loadFeedImg(e.target.dataset.fimg);feedIO.unobserve(e.target)}}),{rootMargin:'400px'});figs.forEach(f=>{if(!S.feedImg[f.dataset.fimg])feedIO.observe(f)})}
  else figs.forEach(f=>loadFeedImg(f.dataset.fimg));
  el.querySelectorAll('[data-prof]').forEach(b=>b.onclick=()=>openProfile(b.dataset.prof));
  const t=$('f-text');if(t)t.oninput=()=>{S.fDraft.text=t.value};
  const fi=$('f-files');if(fi)fi.onchange=async()=>{const fs=[...fi.files].slice(0,4-S.fDraft.photos.length);for(const f of fs){try{S.fDraft.photos.push(await shrinkFeed(f))}catch(_){toast("That photo couldn't be read.")}}S.fOpen=1;renderFeed();const t2=$('f-text');if(t2)t2.focus()};
  el.querySelectorAll('[data-frm]').forEach(b=>b.onclick=()=>{S.fDraft.photos.splice(+b.dataset.frm,1);renderFeed()});
  const go=$('f-go');if(go)go.onclick=postFeed;
  /* React: tap to pick an emoji; tap again to take it back */
  el.querySelectorAll('[data-freact]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();const id=b.dataset.freact,cur=((S.feed[id]||{}).r||{})[S.uid];if(cur)reactFeed(id,cur);else openPick(b,id)});
  el.querySelectorAll('[data-fprops]').forEach(b=>b.onclick=()=>propsSheet(b.dataset.fprops));
  el.querySelectorAll('[data-fzoom]').forEach(f=>f.onclick=()=>{const src=S.feedImg[f.dataset.fzoom];if(src&&typeof openZoom==='function')openZoom(src)});
  el.querySelectorAll('[data-fopen]').forEach(b=>b.onclick=()=>{S.fOpen=1;renderFeed();const t2=$('f-text');if(t2)t2.focus()});
  el.querySelectorAll('[data-fcancel]').forEach(b=>b.onclick=()=>{S.fOpen=0;S.fDraft={text:'',photos:[],dept:''};renderFeed()});
  el.querySelectorAll('[data-ftag]').forEach(b=>b.onclick=()=>{S.fDraft.dept=S.fDraft.dept===b.dataset.ftag?'':b.dataset.ftag;el.querySelectorAll('[data-ftag]').forEach(x=>{const on=x.dataset.ftag===S.fDraft.dept;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)})});
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
    await S.db.doc('feed/'+id).set(post);S.fDraft={text:'',photos:[],dept:''};S.fOpen=0;toast('Posted.');renderFeed()}
  catch(e){b.disabled=false;b.textContent='Post';toast(e&&e.code==='permission-denied'?'Please publish the latest security rules first.':"Sorry, that didn't post. Try a smaller photo?")}}
async function reactFeed(id,e){const p=S.feed[id];if(!p)return;const cur=(p.r||{})[S.uid],FV=firebase.firestore.FieldValue;
  p.r={...(p.r||{})};if(cur===e)delete p.r[S.uid];else p.r[S.uid]=e;
  document.querySelectorAll(`[data-post="${CSS.escape(id)}"]`).forEach(a=>{const t=document.createElement('div');t.innerHTML=postHTML(id,p);const n=t.firstElementChild;a.replaceWith(n);bindFeed(n)});
  try{await S.db.doc('feed/'+id).update({['r.'+S.uid]:cur===e?FV.delete():e})}catch(err){toast("Sorry, that didn't save.")}}

/* ---------- player profiles ---------- */
function openProfile(uid){if(!uid)return;if(S.profUid!==uid)S.pfTab='posts';S.profUid=uid;setView('player',{push:1})}
function profStats(uid){let played=0;const b=(S.bookings[uid]||{}).s||{};for(const [sid,x] of Object.entries(b)){const s=S.sessions[sid];if(s&&sessStart(s)<Date.now()&&!x.out)played++}
  const props={};Object.values(S.feed).forEach(p=>{if(p.kind==='props'&&p.to===uid&&!p.hidden)props[p.e]=(props[p.e]||0)+1});return {played,props}}
/* props: once a day per player, from a profile or a Feed post */
const todayKey=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dubai'}).replace(/-/g,'');
const propsGiven=uid=>Object.keys(S.feed).some(k=>k==='p_'+S.uid+'_'+uid+'_'+todayKey());
async function giveProps(uid,e){const d=+todayKey(),id='p_'+S.uid+'_'+uid+'_'+d,doc={uid:S.uid,kind:'props',to:uid,e,d,at:new Date().toISOString()};
  await S.db.doc('feed/'+id).set(doc);S.feed[id]=doc;toast(`${e} Props sent to ${pname(uid)}.`);if(S.view==='player')renderPlayer();else if(S.view==='home')refreshFeedList()}
function propsSheet(uid){if(uid===S.uid)return;const nm=pname(uid);
  if(propsGiven(uid)){toast(`You gave ${nm} props today. More tomorrow.`);return}
  const s=launchSheet(`<span class="label">Give props</span><h3 class="wl-h">Props for ${esc(nm)}.</h3><p class="muted">Once a day per player. It shows in the Feed.</p><div class="propsel">${PROPS.map(([e,l])=>`<button data-gprop="${e}">${e}<span>${esc(l)}</span></button>`).join('')}</div>`,'Give props');
  s.card.querySelectorAll('[data-gprop]').forEach(b=>b.onclick=async()=>{s.card.querySelectorAll('[data-gprop]').forEach(x=>x.disabled=true);
    try{await giveProps(uid,b.dataset.gprop);s.close()}catch(err){s.card.querySelectorAll('[data-gprop]').forEach(x=>x.disabled=false);toast(err&&err.code==='permission-denied'?'Please publish the latest security rules first.':"Sorry, that didn't go through.")}})}
const coverOf=uid=>{let h=0;for(const c of String(uid))h=(h*31+c.charCodeAt(0))>>>0;return CLUB_PHOTOS.home[h%CLUB_PHOTOS.home.length]};
S.pfTab=S.pfTab||'posts';
/* a profile reads like Facebook's: cover, photo, name, a line about you, two buttons, then Posts and Props */
function renderPlayer(){const el=$('v-player');if(!el)return;const uid=S.profUid,p=S.profiles[uid];
  if(!p||notMember()){el.innerHTML=`<div class="empty">${ic('users')}<span>This profile isn't available.</span></div>`;return}
  const me=uid===S.uid,st=profStats(uid),lvl=typeof levelFor==='function'?levelFor(uid):null,og=typeof first100No==='function'?first100No(uid):0;
  const depts=(p.sports||[]).filter(k=>SPORTS[k]).map(k=>`<span class="tagl">${ic(SPORTS[k].icon)}${esc(SPORTS[k].club)}</span>`).join('');
  const posts=feedList().filter(([,x])=>x.uid===uid&&x.kind==='post');
  const got=feedList().filter(([,x])=>x.kind==='props'&&x.to===uid),nProps=Object.values(st.props).reduce((a,b)=>a+b,0);
  const given=!me&&propsGiven(uid),tab=S.pfTab==='props'?'props':'posts';
  const sub=[p.number!=null&&p.number!==''?'No. '+String(p.number).padStart(2,'0'):'',og?`OG 100 #${og}`:'',lvl&&lvl.name?lvl.name:''].filter(Boolean).map(esc).join(' · ');
  el.innerHTML=`<section class="pf">
    <div class="pf-cover"><img src="${esc(coverOf(uid))}" alt="" loading="lazy" decoding="async"></div>
    <div class="pf-id">${avatar(p,p.listKey)}<div class="pf-nm"><h2 class="prof-n">${esc(p.nickname)}</h2>${sub?`<div class="sub">${sub}</div>`:''}</div></div>
    ${p.now?`<p class="nowpub"><span class="label">Currently</span> ${esc(p.now)}</p>`:''}
    ${p.bio?`<p class="prof-bio">${esc(p.bio)}</p>`:me?`<p class="fine">Add an About me so people know who you are.</p>`:''}
    ${profLine(uid,p)?`<p class="fine meline">${profLine(uid,p)}</p>`:''}
    ${depts?`<div class="row prof-d">${depts}</div>`:''}
    <div class="pf-acts">${me?`<button class="btn" data-editcard="1">${ic('edit')}Edit my card</button>`
      :given?`<button class="btn ghost" disabled>${ic('check')}Props given today</button>`:`<button class="btn" data-fprops="${esc(uid)}">${ic('star')}Give props</button>`}
      <button class="btn ghost" data-seecard="1">${ic('card')}See card</button></div>
    <p class="pf-stats"><span><b class="num">${st.played}</b> session${st.played===1?'':'s'}</span><span><b class="num">${nProps}</b> props</span><span><b class="num">${posts.length}</b> post${posts.length===1?'':'s'}</span></p>
  </section>
  <div class="seg2 pf-tabs" role="group" aria-label="Posts or Props"><button aria-pressed="${tab==='posts'}" data-pftab="posts">Posts</button><button aria-pressed="${tab==='props'}" data-pftab="props">Props</button></div>
  ${tab==='posts'
    ?(posts.length?`<div class="flist">${posts.slice(0,10).map(([id,x])=>postHTML(id,x)).join('')}</div>`:`<div class="empty">${ic('photo')}<span>${me?'You haven’t posted yet. Share a moment on Home.':`${esc(p.nickname)} hasn’t posted yet.`}</span></div>`)
    :(nProps?`<div class="fanwall">${PROPS.filter(([e])=>st.props[e]).map(([e,l])=>`<div class="fan"><span class="fan-e">${e}</span><b class="num">${st.props[e]}</b><span class="fine">${esc(l)}</span></div>`).join('')}</div>
      <div class="flist">${got.slice(0,10).map(([id,x])=>postHTML(id,x)).join('')}</div>`
      :`<div class="empty">${ic('star')}<span>No props yet.${me?'':' Be the first.'}</span></div>`)}`;
  bindFeed(el);
  el.querySelectorAll('[data-pftab]').forEach(b=>b.onclick=()=>{S.pfTab=b.dataset.pftab;renderPlayer()});
  el.querySelectorAll('[data-editcard]').forEach(b=>b.onclick=()=>startCreator(myProfile()));
  el.querySelectorAll('[data-seecard]').forEach(b=>b.onclick=()=>{const stc=typeof statsFor==='function'?statsFor(p.listKey):{};
    launchSheet(`<div class="prof-card">${cardHTML(p,{balance:stc.balance||0,badges:typeof badgeCount==='function'?badgeCount(uid):0,sessions:st.played})}</div><div class="row"><button class="btn ghost" data-lx="1">Close</button></div>`,`${p.nickname}'s card`)});
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
