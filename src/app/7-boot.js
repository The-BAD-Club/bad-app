/* ---------- boot ---------- */
S.contacts={};S.brand={};
(async function boot(){
  render();
  const C=window.claude;if(!C||!C.use){S.loaded=true;render();return}
  const [db,user]=await Promise.all([C.use('db'),C.use('user')]);
  S.db=db;if(user){S.uid=await user.id();S.canEdit=await user.canEdit()}
  if(S.uid&&db)db.doc('contacts/'+S.uid).get().then(d=>{if(d.exists)S.myContact=d.data()}).catch(()=>{});
  if(S.canEdit&&innerWidth>=1000&&S.view==='card'&&!S.pendingCI)setView('admin');
  if(S.canEdit){C.use('mcp').then(m=>{S.mcp=m});C.use('assets').then(a=>{S.assets=a})}
  if(!db){S.loaded=true;render();return}
  let pending=10;
  const done=()=>{if(pending>0&&--pending===0){S.loaded=true;seedWeb();fixups();fixups2();if(S.canEdit&&window.BAD_WEB)setTimeout(()=>removeSamples(true),2500);if(S.canEdit)setTimeout(()=>autoPoints(),1500)}render();if(S.loaded){processCheckin();if(S.canEdit)syncCheckins()}};
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
  col('profiles',s=>S.profiles=map(s));
  col('ledger',s=>S.ledger=s.docs.map(d=>({...d.data(),_id:d.id})));
  col('requests',s=>S.requests=map(s));
  col('sessions',s=>S.sessions=map(s));
  col('bookings',s=>S.bookings=map(s));
  col('posts',s=>S.posts=map(s));
  col('live',s=>S.live=map(s));
  col('games',s=>S.games=map(s));
  col('scores',s=>S.scores=map(s));
  if(S.uid)db.doc('checkins/'+S.uid).onSnapshot(d=>{S.myCI=d.exists?d.data():{};render()},()=>{});
  db.doc('config/codes').onSnapshot(d=>{S.codes=d.exists?(d.data().list||{}):{};render()},()=>{});
  db.collection('products').onSnapshot(s=>{S.products=map(s);if(S.view==='shop'||S.view==='admin')render()},()=>{});
  db.collection('shopstock').onSnapshot(s=>{S.stock=map(s);if(S.view==='shop'||S.view==='admin')render()},()=>{});
  if(S.uid)(db.collection('orders').where?db.collection('orders').where('uid','==',S.uid):db.collection('orders')).onSnapshot(s=>{const m=map(s);S.myOrders=Object.fromEntries(Object.entries(m).filter(([,o])=>o.uid===S.uid));if(S.view==='shop')render()},()=>{});
  db.doc('config/points').onSnapshot(d=>{S.ptsCfg=d.exists?d.data():null;render()},()=>{});
  db.doc('config/sheetPoints').onSnapshot(d=>{S.sheetPts=d.exists?d.data():null;render()},()=>{});
  db.collection('badges').onSnapshot(s=>{S.badges=map(s);render()},()=>{});
  db.doc('config/membership').onSnapshot(d=>{S.memCfg=d.exists?d.data():{};render()},()=>{});
  db.doc('config/members').onSnapshot(d=>{S.members=d.exists?d.data():{};render()},()=>{});
  db.doc('config/site').onSnapshot(d=>{S.site=d.exists?d.data():{};render()},()=>{});
  db.doc('config/payments').onSnapshot(d=>{S.payCfg=d.exists?d.data():{};render()},()=>{});
  db.collection('payments').onSnapshot(s=>{S.payments=map(s);render()},()=>{});
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
