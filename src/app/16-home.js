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
  const next=(S.loaded||S.pubSessions)?upcoming().filter(([,s])=>!s.cancelled&&!isSide(s.sport)).slice(0,3):[];
  const cta=guest
    ?`<div class="row"><button class="btn" data-hjoin="1">${ic('card')}Join BAD</button></div>`
    :`<div class="row"><button class="btn" data-hgo="card">${ic('card')}${me?'Open My BAD':'Make my card'}</button><button class="btn ghost" data-hgo="play">${ic('play')}Find a session</button></div>`;
  const depts=Object.keys(SPORTS).filter(k=>k!=='vibe');
  const story=`<p><b>BAD started from BADminton.</b> We were friends who loved the game, but felt it deserved more visibility and a fresh identity here. So instead of waiting for someone else, we made our own: The BAD Club.</p>
      <p>We know “bad” has a stigma. We own it. Everyone starts somewhere: you pick up a racket, struggle, learn and get better. <b>We were all BAD players once.</b></p>
      <p>BAD is still a passion project, a community built like a brand. It started with badminton and now plays volleyball, pickleball, basketball, runs and dances too.</p>`;
  const first=[['card','Make your card','Free, and it takes a minute.'],['play','Pick a session','Book your spot in Play.'],['users','Show up and play','Check in when you arrive. Every level plays with everyone.']];
  el.innerHTML=`<div class="phome">
    <section class="phero">
      ${MANIFESTO}
      <p class="muted">A Dubai sports community. Every level is welcome.</p>
      ${cta}
    </section>
    ${guest?`<section class="hsec story"><h3 class="ah">Why we made BAD</h3>${story}</section>`:`<details class="hsec how story"><summary class="ah">Why we made BAD</summary>${story}</details>`}
    ${guest?`<section class="hsec"><h3 class="ah">Your first time</h3><ol class="gsteps">${first.map(([i,t,d],n)=>`<li><span class="gn num">${n+1}</span><span class="ic-bub soft">${ic(i)}</span><div><b>${t}</b><span class="fine">${d}</span></div></li>`).join('')}</ol></section>`:''}
    ${next.length?`<section class="hsec"><div class="sec-h"><h3 class="ah">Coming up</h3><button class="linkbtn" data-hgo="play">See all${ic('arrow')}</button></div><div class="list">${next.map(([sid,s])=>{const d=dParts(s.date),sp=sportOf(s.sport);return `<button class="li act hsess" data-hgo="play" style="grid-template-columns:auto minmax(0,1fr) auto"><div class="mini-dt"><small>${d.w}</small><b class="num">${d.d}</b><small>${d.m}</small></div><div><div class="nm ic-row" style="gap:6px">${ic(sp.icon)}${esc(s.title||sp.club)}</div><div class="sub">${s.timeTbc?'Time to be confirmed':esc(fmtTime(s.start))}${s.venue?' · '+esc(s.venue):''}</div></div>${ic('arrow')}</button>`}).join('')}</div></section>`
    :`<section class="hsec"><h3 class="ah">Every week</h3><div class="week">${WEEK.map(([d,k,t])=>`<div class="wk"><span class="wk-d num">${d}</span>${ic(SPORTS[k].icon)}<b>${esc(t)}</b></div>`).join('')}</div></section>`}
    <section class="hsec"><h3 class="ah">Departments</h3><div class="dgrid">${depts.map(k=>`<div class="dchip">${ic(SPORTS[k].icon)}<span>${esc(k==='training'?'Training':SPORTS[k].club)}</span></div>`).join('')}</div></section>
    <p class="fine phfoot">${ic('coin')}${c.per} points every session · ${c.free} points is a free session<br><a href="${IG_URL}" target="_blank" rel="noopener">@thebad.club</a></p>
  </div>`;
  el.querySelectorAll('[data-hjoin]').forEach(b=>b.onclick=()=>window.badJoin&&window.badJoin());
  el.querySelectorAll('[data-hgo]').forEach(b=>b.onclick=()=>setView(b.dataset.hgo));
}
/* called by the sign-in bridge when nobody is signed in: show Home, and if they followed a link to another tab, ask them to sign in for it */
window.badGuestMode=function(){
  /* visitors see the real upcoming sessions (sessions are public in the security rules); if that read isn't allowed yet, the weekly list shows instead */
  const db=window.badPublicDb;if(db&&!S.pubSessions){const today=new Date().toISOString().slice(0,10);
    db.collection('sessions').where('date','>=',today).get().then(s=>{if(!window.BAD_GUEST)return;const o={};s.docs.forEach(d=>o[d.id]=d.data());S.sessions=o;S.pubSessions=true;if(S.view==='home')renderHome()}).catch(()=>{})}
const want=S.deepView&&S.deepView!=='home'?S.deepView:null;S.deepView=want;setView('home');if(want&&window.badJoin)window.badJoin(want)};
