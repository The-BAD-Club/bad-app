/* ---------- Home: the public front door of The BAD Club ----------
   Anyone can open it without signing in. It shows who BAD is, the departments and the weekly rhythm.
   Signed-in BADDIES also see the sessions coming up. Your own card, sessions and points live in My BAD. */
const IG_URL='https://www.instagram.com/thebad.club/';
const WEEK=[
  ['Tue','pickleball','BAD DINK','Pickleball. Time changes week to week, check Play.'],
  ['Wed','badminton','BADminton Wednesday','Badminton.'],
  ['Fri','badminton','BADminton Friday','Badminton.'],
  ['Fri','volleyball','VolleyBAD','Volleyball, 7pm to 10:30pm.']];
function renderHome(){const el=$('v-home');if(!el)return;
  const guest=!!window.BAD_GUEST,me=!guest&&S.uid&&typeof myProfile==='function'?myProfile():null,c=PS();
  const next=(S.loaded||S.pubSessions)?upcoming().filter(([,s])=>!s.cancelled&&!isSide(s.sport)).slice(0,3):[];
  const cta=guest
    ?`<button class="btn bigjoin" data-hjoin="1">${ic('card')}Join BAD</button>`
    :'';
  /* members: your next game first, or one button to find one */
  const mineNext=me?upcoming().find(([sid])=>{const b=S.bookings[S.uid]?.s?.[sid];return b&&!b.out}):null;
  const nextBlock=!me?'':mineNext?`<button class="tile nexts cta" data-hgo="card"><span class="label">You're in</span><span class="ic-row"><span class="ic-bub">${ic('ticket')}</span><span><b>${esc(mineNext[1].title||sportOf(mineNext[1].sport).club)}</b><span class="fine" style="display:block">${esc(fmtS(mineNext[1]))}${mineNext[1].timeTbc?'':' · '+esc(fmtTime(mineNext[1].start))}${mineNext[1].venue?' · '+esc(mineNext[1].venue):''}</span></span>${ic('arrow')}</span></button>`
    :`<button class="tile nexts cta" data-hgo="play"><span class="label">No game booked</span><span class="ic-row"><span class="ic-bub">${ic('play')}</span><span><b>Find a game</b><span class="fine" style="display:block">New sessions every week</span></span>${ic('arrow')}</span></button>`;
  const first=[['card','Make your card','Free, and it takes a minute. An admin approves new cards.'],['play','Pick a session','Book your spot in Play. New? Join as a guest.'],['users','Show up and play','Check in when you arrive. Every level plays with everyone.']];
  const sessions=next.length?`<section class="hsec"><h3 class="ah">Coming up</h3><div class="list">${next.map(([sid,s])=>{const d=dParts(s.date),sp=sportOf(s.sport);return `<button class="li act hsess" data-hgo="play" style="grid-template-columns:auto minmax(0,1fr) auto"><div class="mini-dt"><small>${d.w}</small><b class="num">${d.d}</b><small>${d.m}</small></div><div><div class="nm ic-row" style="gap:6px">${ic(sp.icon)}${esc(s.title||sp.club)}</div><div class="sub">${s.timeTbc?'Time to be confirmed':esc(fmtTime(s.start))}${s.venue?' · '+esc(s.venue):''}</div></div>${ic('arrow')}</button>`}).join('')}</div></section>`
    :`<section class="hsec"><h3 class="ah">Every week</h3><div class="week">${WEEK.map(([d,k,t])=>`<div class="wk"><span class="wk-d num">${d}</span>${ic(SPORTS[k].icon)}<b>${esc(t)}</b></div>`).join('')}</div></section>`;
  const about=`<button class="bigfaq" data-hgo="faq"><span class="ic-bub">${ic('guide')}</span><span><b>FAQs</b><small>What is BAD? Who can join? How much is it?</small></span>${ic('arrow')}</button>
    <div class="homelinks ${guest||notMember()?'two':'three'}">${[['guide','guide','Guide'],['wth','spark','About BAD'],...(guest||notMember()?[]:[['club','photo','Gallery']])].map(([v,i,t])=>`<button data-hgo="${v}"${v==='club'?' data-cm="gallery"':''}>${ic(i)}${t}</button>`).join('')}</div>`;
  el.innerHTML=`<div class="phome">
    ${heroHTML("")}${cta?`<p class="hwhy">Badminton, volleyball, pickleball and more. Every week, every level.</p><div class="joinrow">${cta}</div>`:""}
    ${guest?`${about}
    <section class="hsec"><h3 class="ah">Your first time</h3><ol class="gsteps">${first.map(([i,t,d],n)=>`<li><span class="gn num">${n+1}</span><span class="ic-bub soft">${ic(i)}</span><div><b>${t}</b><span class="fine">${d}</span></div></li>`).join('')}</ol></section>
    ${sessions}${homeVideosHTML()}${igHTML()}${contactHTML()}`
    /* members: everything about BAD first, the Feed last so it can keep scrolling */
    :`${nextBlock}${newsHTML()}${sessions}${about}${homeVideosHTML()}${igHTML()}${contactHTML()}${feedSectionHTML()}`}
  </div>`;
  el.querySelectorAll('[data-hjoin]').forEach(b=>b.onclick=()=>window.badJoin&&window.badJoin());
  bindHero(el);bindHomeFeed(el);
  el.querySelectorAll('[data-hgo]').forEach(b=>b.onclick=()=>{if(b.dataset.cm)S.clubMode=b.dataset.cm;setView(b.dataset.hgo)});
}
/* Club news on Home: upcoming events first, then the latest news. The full list and the Gallery are one tap away. */
function newsHTML(){if(notMember())return '';const today=new Date().toISOString().slice(0,10),ps=Object.entries(S.posts||{});
  const ev=ps.filter(([,p])=>p.type==='event'&&(p.date||'')>=today).sort((a,b)=>a[1].date.localeCompare(b[1].date)),nw=ps.filter(([,p])=>p.type!=='event').sort((a,b)=>(b[1].postedAt||'').localeCompare(a[1].postedAt||''));
  const top=[...ev,...nw].slice(0,3);
  const links=`<div class="row" style="gap:8px"><button class="btn ghost sm" data-hgo="club" data-cm="news">${ic('club')}All news</button></div>`;
  if(!top.length)return '';
  return `<section class="hsec"><h3 class="ah">What's on</h3><div class="list">${top.map(([id,p])=>{const d=p.date?dParts(p.date):null,sp=SPORTS[p.club];
    return `<button class="li act" data-hgo="club" data-cm="news" style="grid-template-columns:auto minmax(0,1fr) auto">${d?`<div class="mini-dt"><small>${d.w}</small><b class="num">${d.d}</b><small>${d.m}</small></div>`:`<span class="ic-bub soft">${ic('club')}</span>`}<div><div class="nm">${esc(p.title)}</div><div class="sub">${p.type==='event'?'Event':'News'} · ${esc(sp?sp.club:'All of BAD')}</div></div>${ic('arrow')}</button>`}).join('')}</div>${links}</section>`}
/* Talk to us: WhatsApp (with a ready message), email and Instagram. On Home and the FAQs, for visitors and members. */
function contactHTML(ig){return `<section class="hsec talk"><h3 class="ah">Talk to us</h3><p class="fine">Questions about joining, a collab or a private session? We usually reply the same day.</p>
  <div class="talkrow"><a class="btn" href="${waLink()}" target="_blank" rel="noopener">${ic('wa')}WhatsApp</a><a class="btn ghost" href="mailto:${BAD_EMAIL}?subject=${encodeURIComponent('Hello BAD')}">${ic('mail')}Email</a>${ig?`<a class="btn ghost" href="${IG_URL}" target="_blank" rel="noopener">${ic('ig')}Instagram</a>`:''}</div></section>`}
/* called by the sign-in bridge when nobody is signed in: show Home, and if they followed a link to another tab, ask them to sign in for it */
window.badGuestMode=function(){loadHomeMediaPublic();
  /* visitors see the real upcoming sessions (sessions are public in the security rules); if that read isn't allowed yet, the weekly list shows instead */
  const db=window.badPublicDb;if(db&&!S.pubSessions){const today=new Date().toISOString().slice(0,10);
    db.collection('sessions').where('date','>=',today).get().then(s=>{if(!window.BAD_GUEST)return;const o={};s.docs.forEach(d=>o[d.id]=d.data());S.sessions=o;S.pubSessions=true;if(S.view==='home')renderHome();else if(S.view==='sess')renderSess()}).catch(()=>{})}
const want=S.deepView&&S.deepView!=='home'?S.deepView:null;S.deepView=want;if(want==='sess'){S.deepView=null;setView('sess');return}setView('home');if(want&&window.badJoin)window.badJoin(want)};

/* ---------- FAQs, About BAD, and the photos, videos and Instagram on Home ---------- */
const STORY_HTML=`<p><b>BAD started from BADminton.</b> We were friends who loved the game, but felt it deserved more visibility and a fresh identity here. So instead of waiting for someone else, we made our own: The BAD Club.</p>
      <p>We know “bad” has a stigma. We own it. Everyone starts somewhere: you pick up a racket, struggle, learn and get better. <b>We were all BAD players once.</b></p>
      <p>BAD is still a passion project, a community built like a brand. It started with badminton and now plays volleyball, pickleball, basketball, runs and dances too.</p>`;
function faqList(){const c=PS();return [
  ['About BAD',[
    ['What is BAD?','The BAD Club is a sports community in Dubai. We run weekly sessions for badminton, volleyball, pickleball, basketball, running and dance, plus food and drink collabs we call Taste BADs.'],
    ['Why is it called BAD?','Because we were all bad players once. We own the word: everyone starts somewhere, and BAD is where you get better with people who cheer you on. Read the full story in About BAD.'],
    ['What does BAD stand for?','BAD came from BADminton. Bold. Agile. Defiant. came later, as something to live by: bold enough to try something different, agile enough to adapt as we go, and defiant enough to question the norm.'],
    ['Do I need to be good to join?','No. Every level is welcome and everyone plays with everyone. Beginners join every week.'],
    ['Is BAD a registered company?','Yes. The BAD Club LLC, registered in Sharjah, License No. 2649469.01. Read our Privacy policy and Terms at the bottom of any page.'],
    ['Where and when do you play?','Every week: BAD DINK on Tuesday, BADminton Wednesday, BADminton Friday and VolleyBAD on Friday. Exact times and venues are on each session in Play.']]],
  ['Joining and booking',[
    ['How do I join?','Tap Join BAD and make your player card. It is free and takes a minute. Just want to try once? Take a guest pass instead.'],
    ['How do I book a session?','Open Play, pick a session and tap Count me in. You can cancel, change how you pay or bring a friend from My BAD.'],
    ['How do scores work?','After a game, one player enters the score in Courts and someone from the other team confirms it. Scores are just for fun and help us mix games.'],
    ['What if the session is full?','You go on the waitlist. It is first come, first served and nobody skips it. Core members and up just get to sign up 48 hours earlier.'],
    ['What if I can’t make it?','Drop out for free up to 48 hours before. Between 24 and 48 hours, half the fee applies. Under 24 hours, the full fee applies.']]],
  ['Paying',[
    ['How much is a session?','Each session shows its fee in Play before you book. You only pay for the sessions you join.'],
    ['How do I pay?','Cash at the session, bank transfer, Ziina or Careem Pay. Open the session in My BAD to see how and to tell us when you’ve paid.']]],
  ['Points, BADges and your card',[
    ['How do points work?',`You get ${c.per} points for every session you play. At ${c.free} points your next session is free. Points reset if you don’t play for 6 months.`],
    ['What are BADges?','A thank you from the founders and crew for helping out, bringing friends and showing up. They never expire. More BADges means a higher level and better perks.'],
    ['What is the OG 100?','The first 100 people to make a card. They start one BADge level up and get an OG 100 number on the back of their card.'],
    ['Can I pick my jersey number?','Yes, when you make your card. Numbers are first come, first served. Once 0 to 99 are taken, numbers have three digits.']]],
  ['Anything else?',[
    ['How do I reach you?','WhatsApp us on '+phoneFmt(BAD_PHONE)+', email '+BAD_EMAIL+', send a message on Instagram at @thebad.club, or speak to any of the crew at a session.']]]]}
function renderFaq(){const el=$('v-faq');if(!el)return;
  el.innerHTML=`<div class="hero"><span class="label">FAQs</span><h2>Good questions.</h2><p class="muted">Everything people ask before their first BAD session.</p></div>
  ${faqList().map(([h,qs])=>`<section class="hsec"><h3 class="ah">${esc(h)}</h3><div class="faq">${qs.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>`).join('')}
  ${contactHTML(true)}
  <div class="talkrow">${window.BAD_GUEST?`<button class="btn" data-hjoin="1">${ic('card')}Join BAD</button>`:''}<button class="btn ghost" data-goview="guide">${ic('guide')}Read the Guide</button></div>`;
  el.querySelectorAll('[data-goview]').forEach(b=>b.onclick=()=>setView(b.dataset.goview));
  el.querySelectorAll('[data-hjoin]').forEach(b=>b.onclick=()=>window.badJoin&&window.badJoin())}
function renderWth(){const el=$('v-wth');if(!el)return;
  el.innerHTML=`<div class="hero"><span class="label">About BAD</span><h2>We were all BAD players once.</h2></div>
  ${homePhotosHTML(true)}<section class="hsec story">${STORY_HTML}</section>
  <div class="row">${window.BAD_GUEST?`<button class="btn" data-hjoin="1">${ic('card')}Join BAD</button>`:''}<button class="btn ghost" data-goview="faq">FAQs</button><a class="btn ghost" href="${IG_URL}" target="_blank" rel="noopener">${ic('ig')}@thebad.club</a></div>`;
  el.querySelectorAll('[data-goview]').forEach(b=>b.onclick=()=>setView(b.dataset.goview));
  el.querySelectorAll('[data-hjoin]').forEach(b=>b.onclick=()=>window.badJoin&&window.badJoin())}
/* photos: community photos an admin picked for Home, then the latest Gallery albums (members only). No merch here. */
/* the BAD DAY film opens Home: muted, looping, full width. Tap for sound. Calm-motion settings get the still frame and a play button. */
const HERO={src:'assets/home/bad-day.mp4',poster:'assets/home/bad-day-poster.jpg'};
const calmMotion=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}};
function heroHTML(cta){const calm=calmMotion();
  return `<section class="vhero"><video class="vh-v" src="${HERO.src}" poster="${HERO.poster}" ${calm?'':'autoplay'} muted loop playsinline preload="${calm?'none':'auto'}" aria-label="POV: BAD DAY, a short film from a BADminton session"></video><div class="vh-shade" aria-hidden="true"></div>
    <button class="vh-snd" data-vsnd="1" aria-label="${calm?'Play the film':'Turn sound on'}">${calm?ic('play'):ic('snd')}</button>
    <div class="vh-in"><h2 class="manifesto phtitle">THE BAD CLUB</h2><p class="vh-tag">A community built like a brand</p>${cta}</div></section>`}
function bindHero(el){const v=el.querySelector('.vh-v'),b=el.querySelector('[data-vsnd]');if(!v||!b)return;
  b.onclick=()=>{if(v.paused){v.play().catch(()=>{});v.muted=false}else v.muted=!v.muted;b.innerHTML=v.muted?ic('snd'):ic('sndon');b.setAttribute('aria-label',v.muted?'Turn sound on':'Turn sound off')};
  /* pause when it scrolls away or the tab is hidden, so it doesn't use battery for nothing */
  if('IntersectionObserver' in window&&!calmMotion()){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)v.play().catch(()=>{});else v.pause()}),{threshold:.2});io.observe(v)}}
/* the club's own photos: sessions, VolleyBAD, Taste BADs, BAD-O-WEEN and the Off-Court shoot. Landscape ones get a wider frame. */
const CLUB_PHOTOS={home:Array.from({length:12},(_,i)=>`assets/home/home-${String(i+1).padStart(2,'0')}.jpg`),wth:Array.from({length:8},(_,i)=>`assets/home/wth-${String(i+1).padStart(2,'0')}.jpg`)};
const WIDE_PHOTOS=new Set(['assets/home/home-01.jpg','assets/home/home-07.jpg','assets/home/home-11.jpg']);
function homePhotos(set){const own=((S.homeMedia||{}).photos||[]).filter(Boolean);return set==='wth'?CLUB_PHOTOS.wth:[...own,...CLUB_PHOTOS.home].slice(0,14)}
function photoStrip(ps,small){return `<div class="hstrip${small?' sm':''}" aria-label="Photos from BAD">${ps.map((u,i)=>`<figure${WIDE_PHOTOS.has(u)?' class="wide"':''}><img src="${esc(u)}" alt="" loading="${i<2?'eager':'lazy'}" decoding="async"></figure>`).join('')}</div>`}
function homePhotosHTML(small){return photoStrip(homePhotos(small?'wth':'home'),small)}
/* video links: YouTube, Instagram reels or posts, TikTok, or a direct .mp4 */
function vidEmbed(u){u=String(u||'').trim();let m;
  if((m=u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/)))return {k:'yt',src:`https://www.youtube-nocookie.com/embed/${m[1]}`};
  if((m=u.match(/instagram\.com\/(p|reel|reels|tv)\/([\w-]+)/)))return {k:'ig',src:`https://www.instagram.com/${m[1]==='reels'?'reel':m[1]}/${m[2]}/embed`};
  if((m=u.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/)))return {k:'tt',src:`https://www.tiktok.com/embed/v2/${m[1]}`};
  if(/^https:\/\/.+\.(mp4|webm|mov)(\?.*)?$/i.test(u))return {k:'mp4',src:u};return null}
function homeVideosHTML(){const v=((S.homeMedia||{}).videos||[]).map(vidEmbed).filter(Boolean).slice(0,6);if(!v.length)return '';
  return `<section class="hsec"><h3 class="ah">Watch</h3><div class="hvids">${v.map(x=>x.k==='mp4'?`<div class="hvid tall"><video src="${esc(x.src)}" controls playsinline preload="metadata"></video></div>`
    :`<div class="hvid${x.k==='yt'?'':' tall'}"><iframe src="${esc(x.src)}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="BAD video"></iframe></div>`).join('')}</div></section>`}
function igHTML(){return `<a class="igcard" href="${IG_URL}" target="_blank" rel="noopener"><span class="ic-bub">${ic('ig')}</span><span><b>@thebad.club</b><small>Photos, reels and what’s next. Follow us on Instagram.</small></span><span class="btn sm">Follow</span></a>`}
/* visitors read the Home photos and videos with the public connection (config/home is public in the security rules) */
function loadHomeMediaPublic(){const db=window.badPublicDb;if(!db||S.homeMedia)return;db.doc('config/home').get().then(d=>{S.homeMedia=d.exists?d.data():{};if(S.view==='home'||S.view==='wth')renderNow()}).catch(()=>{})}
