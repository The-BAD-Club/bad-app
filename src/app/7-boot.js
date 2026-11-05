/* ---------- boot ---------- */
S.contacts={};S.brand={};S.badges=S.badges||{};S.grades=S.grades||{};S.approvals={};
(async function boot(){
  /* links straight to a tab: …/#shop, #quests, #play, #club, #board, #courts (used by short links like the Volume II one) */
  {const v=(location.hash||'').match(/^#(home|feed|guide|faq|wth|shop|quests|play|club|board|courts)$/);if(v){S.view=v[1];S.deepView=v[1];for(const id of ['home','card','guide','faq','wth','feed','player','play','courts','create','club','quests','board','shop','admin'])$('v-'+id).hidden=id!==v[1]}}
  render();
  const C=window.claude;if(!C||!C.use){S.loaded=true;render();return}
  const [db,user]=await Promise.all([C.use('db'),C.use('user')]);
  S.db=db;if(user){S.uid=await user.id();S.canEdit=await user.canEdit()}
  if(S.uid&&db)db.doc('contacts/'+S.uid).get().then(d=>{if(d.exists)S.myContact=d.data()}).catch(()=>{});
  if(S.deepView)setView(S.deepView);else if(S.canEdit&&innerWidth>=1000&&S.view==='card'&&!S.pendingCI)setView('admin');
  if(S.canEdit){C.use('mcp').then(m=>{S.mcp=m});C.use('assets').then(a=>{S.assets=a})}
  if(!db){S.loaded=true;render();return}
  /* who's in: approved cards (and the crew) load the community; everyone else loads only their own data */
  S.member=!!S.canEdit;
  if(S.uid&&!S.member){try{const [a,p]=await Promise.all([db.doc('approved/'+S.uid).get(),db.doc('profiles/'+S.uid).get()]);S.myApproval=a.exists?a.data():null;
    S.member=(S.myApproval&&S.myApproval.ok===true)||(!S.myApproval&&preApproval(p.exists?p.data():null))}catch(_){}}
  if(S.uid&&!S.canEdit)db.doc('approved/'+S.uid).onSnapshot(d=>{const was=S.myApproval;S.myApproval=d.exists?d.data():null;if(S.myApproval&&S.myApproval.ok===true&&!S.member)location.reload();else if(JSON.stringify(was)!==JSON.stringify(S.myApproval))render()},()=>{});
  document.documentElement.classList.toggle('nomember',notMember());
  let pending=10;
  const done=()=>{if(pending>0&&--pending===0){S.loaded=true;unboot();if(typeof seedNomani==='function')setTimeout(seedNomani,3000);seedWeb();fixups();fixups2();if(S.canEdit&&window.BAD_WEB)setTimeout(()=>removeSamples(true),2500);if(S.canEdit)setTimeout(()=>autoPoints(),1500);if(S.canEdit)setTimeout(()=>autoApproveExisting(),3000)}render();if(S.loaded){processCheckin();if(S.canEdit)syncCheckins()}};
  /* hosted version: first admin sign-in on an empty database loads the starter sessions, posts and sample players */
  /* one-off content fixes, applied once by an admin's app */
  async function fixups(){if(!S.canEdit)return;const b=S.posts['badoween-2026'];
    if(b&&b.link!=='https://bad-o-ween.thebadclub-co.workers.dev/')try{await db.doc('posts/badoween-2026').update({link:'https://bad-o-ween.thebadclub-co.workers.dev/',linkLabel:'Event site',mapLink:b.mapLink||(String(b.link||'').includes('maps')?b.link:'https://maps.app.goo.gl/LFCfLBWaK19X63vY9')})}catch(e){console.warn(e)}}
  async function fixups2(){if(!S.canEdit)return;const a=S.posts['app-live'];if(a&&/every BAD club/.test(a.body||''))try{await db.doc('posts/app-live').update({body:a.body.replace('every BAD club','every BADDIE')})}catch(_){}}
  async function seedWeb(){if(!window.BAD_WEB||!S.canEdit||Object.keys(S.sessions||{}).length)return;
    try{const seed=await (await fetch('seed.json',{cache:'no-store'})).json();
      for(const [c,docs] of Object.entries(seed))for(const [id,d] of Object.entries(docs))await db.doc(c+'/'+id).set(d);
      toast('Starter sessions and sample players are in.')}catch(e){console.warn('seed',e)}}
  const col=(path,fn)=>db.collection(path).onSnapshot(s=>{fn(s);done()},()=>done());
  const map=s=>{const o={};s.docs.forEach(d=>o[d.id]=d.data());return o};
  S.sessData={db,map};
  const mine=(path,fn)=>db.doc(path+'/'+S.uid).onSnapshot(d=>{fn(d.exists?{[S.uid]:d.data()}:{});done()},()=>done());
  /* if the full list is refused (an older card the admins haven't approved yet), fall back to your own card so nobody lands on registration */
  const colOr=(path,fn,own)=>db.collection(path).onSnapshot(s=>{fn(s);done()},()=>{if(S.uid)db.doc(path+'/'+S.uid).onSnapshot(d=>{own(d.exists?{[S.uid]:d.data()}:{});render()},()=>{});done()});
  if(S.member)colOr('profiles',s=>S.profiles=map(s),m=>S.profiles=m);else if(S.uid)mine('profiles',m=>S.profiles=m);else done();
  S.gallery={};if(S.member)db.collection('gallery').onSnapshot(s=>{S.gallery=map(s);if(S.view==='club'||S.view==='admin')render()},()=>{});
  S.numbers={};db.collection('numbers').onSnapshot(s=>{S.numbers=map(s);if(S.view==='create')render();backfillNumbers()},()=>{});
  col('ledger',s=>S.ledger=s.docs.map(d=>({...d.data(),_id:d.id})));
  col('requests',s=>S.requests=map(s));
  col('sessions',s=>{S.sessions=map(s);courtSubs();if(typeof renameRallies==='function')setTimeout(renameRallies,1000)});
  if(S.member)colOr('bookings',s=>{S.bookings=map(s);if(typeof autoLinkGuests==='function')setTimeout(autoLinkGuests,800)},m=>S.bookings=m);else if(S.uid)mine('bookings',m=>S.bookings=m);else done();
  if(S.member)col('posts',s=>S.posts=map(s));else{S.posts={};done()}
  if(S.canEdit)db.collection('approved').onSnapshot(s=>{S.approvals=map(s);S.approvalsLoaded=true;if(typeof autoApproveExisting==='function')autoApproveExisting();if(S.view==='admin')render()},()=>{});
  /* Lean data: court data is loaded only for tonight's sessions, and paused while the app is in the background.
     Older games load once, only when a screen needs them (your stats, the Rank board). */
  done();done();done();
  if(S.uid&&S.member)myGamesLoad();
  if(S.uid)db.doc('checkins/'+S.uid).onSnapshot(d=>{S.myCI=d.exists?d.data():{};render()},()=>{});
  db.doc('config/codes').onSnapshot(d=>{S.codes=d.exists?(d.data().list||{}):{};render()},()=>{});
  db.collection('products').onSnapshot(s=>{S.products=map(s);if(typeof syncV2Prices==='function')syncV2Prices();if(S.view==='shop'||S.view==='admin')render()},()=>{});
  db.collection('shopstock').onSnapshot(s=>{S.stock=map(s);if(S.view==='shop'||S.view==='admin')render()},()=>{});
  if(S.uid)(db.collection('orders').where?db.collection('orders').where('uid','==',S.uid):db.collection('orders')).onSnapshot(s=>{const m=map(s);S.myOrders=Object.fromEntries(Object.entries(m).filter(([,o])=>o.uid===S.uid));if(S.view==='shop')render()},()=>{});
  db.doc('config/points').onSnapshot(d=>{S.ptsCfg=d.exists?d.data():null;render()},()=>{});
  db.doc('config/sheetPoints').onSnapshot(d=>{S.sheetPts=d.exists?d.data():null;render()},()=>{});
  if(S.member)db.collection('badges').onSnapshot(s=>{S.badges=map(s);render()},()=>{});
  if(S.member)db.collection('grades').onSnapshot(s=>{S.grades=map(s);render()},()=>{});
  db.doc('config/membership').onSnapshot(d=>{S.memCfg=d.exists?d.data():{};render()},()=>{});
  db.doc('config/members').onSnapshot(d=>{S.members=d.exists?d.data():{};render()},()=>{});
  if(S.member)db.collection('feed').orderBy('at','desc').limit(80).onSnapshot(s=>{S.feed=map(s);if(['feed','player'].includes(S.view))render()},()=>{});
  db.doc('config/home').onSnapshot(d=>{S.homeMedia=d.exists?d.data():{};if(['home','wth'].includes(S.view))render()},()=>{});
  db.doc('config/site').onSnapshot(d=>{S.site=d.exists?d.data():{};S.siteLoaded=true;render()},()=>{});
  db.doc('config/payments').onSnapshot(d=>{S.payCfg=d.exists?d.data():{};render()},()=>{});
  if(S.canEdit)db.collection('payments').onSnapshot(s=>{S.payOld=map(s);rebuildPayments();render()},()=>{});
  if(S.canEdit)db.collection('pay').onSnapshot(s=>{S.payNew=map(s);rebuildPayments();render()},()=>{});
  else if(S.uid)db.doc('pay/'+S.uid).onSnapshot(d=>{S.payNew=d.exists?{[S.uid]:d.data()}:{};rebuildPayments();render()},()=>{});
  db.doc('config/brand').onSnapshot(d=>{S.brand=d.exists?d.data():{};applyBrand();done()},()=>done());
  if(S.canEdit){
    db.collection('contacts').onSnapshot(s=>{S.contacts=map(s);if(S.view==='admin')render()},()=>{});
    db.collection('checkins').onSnapshot(s=>{S.checkins=map(s);syncCheckins()},()=>{});
    db.collection('qr').onSnapshot(s=>{S.qr=map(s);syncCheckins()},()=>{});
    db.collection('levels').onSnapshot(s=>{S.levels=map(s);render()},()=>{});
    if(window.BAD_WEB)db.collection('admins').onSnapshot(s=>{S.admins=map(s);if(S.view==='admin')render()},()=>{});
    if(shopAdmin())db.collection('orders').onSnapshot(s=>{S.orders=map(s);if(S.view==='admin')render()},()=>{});
    db.collection('noshows').onSnapshot(s=>{S.noshows=map(s);if(S.view==='admin')render()},()=>{});
  }
})();
