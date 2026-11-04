/* ---------- Home: the public front door of The BAD Club ----------
   Anyone can open it without signing in. It shows who BAD is, the departments and the weekly rhythm.
   Signed-in BADDIES also see the sessions coming up. Your own card, sessions and points live in My BAD. */
const IG_URL='https://www.instagram.com/thebad.club/';
const WEEK=[
  ['Tue','pickleball','BAD DINK','Pickleball. Time changes week to week, check Play.'],
  ['Wed','badminton','Wednesday Rally','Badminton with The BAD Club.'],
  ['Fri','badminton','Friday Rally','Badminton with The BAD Club.'],
  ['Fri','volleyball','VolleyBAD','Volleyball, 7pm to 10:30pm.']];
function renderHome(){const el=$('v-home');if(!el)return;
  const guest=!!window.BAD_GUEST,me=!guest&&S.uid&&typeof myProfile==='function'?myProfile():null,c=PS();
  const next=!guest&&S.loaded?upcoming().filter(([,s])=>!s.cancelled&&!isSide(s.sport)).slice(0,4):[];
  const cta=guest
    ?`<div class="row"><button class="btn" data-hjoin="1">${ic('card')}Join BAD</button><button class="btn ghost" data-hjoin="1">Sign in</button></div><p class="fine">Free to join. Make your player card and book your first session in a minute.</p>`
    :`<div class="row"><button class="btn" data-hgo="card">${ic('card')}${me?'Open My BAD':'Make my card'}</button><button class="btn ghost" data-hgo="play">${ic('play')}Find a session</button></div>`;
  el.innerHTML=`<div class="phome">
    <section class="phero">
      <div class="phero-logo"><img class="inline-logo logo-l" src="${LOGO.clubK}" alt="The BAD Club"><img class="inline-logo logo-d" src="${LOGO.clubW}" alt="The BAD Club"></div>
      <span class="label">Dubai, UAE · Community over competition</span>
      <h2>A community built like a brand.</h2>
      <p class="muted">The BAD Club is a Dubai sports community. We started with badminton and now play volleyball, pickleball and basketball, run and dance together. Every level is welcome, and everyone plays with everyone.</p>
      ${MANIFESTO}
      ${cta}
    </section>
    ${next.length?`<section class="hsec"><div class="sec-h"><h3 class="ah">Coming up</h3><button class="linkbtn" data-hgo="play">See all${ic('arrow')}</button></div><div class="list">${next.map(([sid,s])=>{const d=dParts(s.date),sp=sportOf(s.sport);return `<button class="li act hsess" data-hgo="play" style="grid-template-columns:auto minmax(0,1fr) auto"><div class="mini-dt"><small>${d.w}</small><b class="num">${d.d}</b><small>${d.m}</small></div><div><div class="nm ic-row" style="gap:6px">${ic(sp.icon)}${esc(s.title||sp.club)}</div><div class="sub">${s.timeTbc?'Time to be confirmed':esc(fmtTime(s.start))}${s.venue?' · '+esc(s.venue):''}</div></div>${ic('arrow')}</button>`}).join('')}</div></section>`
    :`<section class="hsec"><h3 class="ah">Every week</h3><div class="week">${WEEK.map(([d,k,t,x])=>`<div class="wk"><span class="wk-d num">${d}</span><span class="ic-bub soft">${ic(SPORTS[k].icon)}</span><div><b>${esc(t)}</b><span class="fine">${esc(x)}</span></div></div>`).join('')}</div><p class="fine">Places are limited and go first come, first served. ${guest?'Join BAD to see dates, venues and book your spot.':'Book your spot in Play.'}</p></section>`}
    <section class="hsec"><h3 class="ah">What we do</h3><div class="whatwe">
      <div class="gcard">${ic('play')}<div><b>Weekly sessions</b><span class="fine">Recreational sessions at partner venues around Dubai. We book the courts and run the rotation, you just show up and play.</span></div></div>
      <div class="gcard">${ic('users')}<div><b>Community experiences</b><span class="fine">Socials, friendly competitions, retreats and events that bring every department together.</span></div></div>
      <div class="gcard">${ic('taste')}<div><b>Side Quests</b><span class="fine">Collabs with brands, creatives and venues we love, starting with Taste BADs for food and drink.</span></div></div>
      <div class="gcard">${ic('bag')}<div><b>BAD gear</b><span class="fine">Limited drops and Essentials. Every sale goes back into the community.</span></div></div>
    </div></section>
    <section class="hsec"><h3 class="ah">The departments</h3><div class="depts">${Object.keys(SPORTS).filter(k=>k!=='vibe').map(deptCard).join('')}</div></section>
    <section class="hsec"><h3 class="ah">Why join</h3><div class="perks phperks">
      <div>${ic('card')}<span><b>Your own player card</b><small>Your name, number and the sports you play</small></span></div>
      <div>${ic('coin')}<span><b>Earn points</b><small>${c.per} points every session. ${c.free} points is a free session</small></span></div>
      <div>${ic('star')}<span><b>Collect BADges</b><small>A thank you from the founders and crew for showing up</small></span></div>
    </div></section>
    <details class="hsec how"><summary class="ah">House rules</summary>${rulesHTML()}</details>
    <section class="tile phfollow"><span class="label">Follow us</span><div class="row" style="justify-content:space-between;align-items:center"><b>@thebad.club</b><a class="btn ghost sm" href="${IG_URL}" target="_blank" rel="noopener">${ic('camera')}Instagram${ic('arrow')}</a></div>${S.site&&S.site.url?`<a class="linkbtn" href="${esc(S.site.url)}" target="_blank" rel="noopener">Visit the BAD site${ic('arrow')}</a>`:''}</section>
  </div>`;
  el.querySelectorAll('[data-hjoin]').forEach(b=>b.onclick=()=>window.badJoin&&window.badJoin());
  el.querySelectorAll('[data-hgo]').forEach(b=>b.onclick=()=>setView(b.dataset.hgo));
}
/* called by the sign-in bridge when nobody is signed in: show Home, and if they followed a link to another tab, ask them to sign in for it */
window.badGuestMode=function(){const want=S.deepView&&S.deepView!=='home'?S.deepView:null;S.deepView=want;setView('home');if(want&&window.badJoin)window.badJoin(want)};
