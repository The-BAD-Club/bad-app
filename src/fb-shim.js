/* Firebase bridge for the hosted BAD App.
   The app was built against a small document-store API (doc/collection/get/set/update/delete/onSnapshot).
   Firestore's compat SDK has the same shape, so this file only provides sign-in and the `window.claude.use()` entry point. */
(function(){
  const cfg=window.BAD_FIREBASE;
  window.BAD_WEB=true;
  if(!cfg||!cfg.apiKey){const g=document.createElement('div');g.id='gate';g.innerHTML=`<div class="gate-card"><img src="${typeof LOGO!=='undefined'?LOGO.badW:''}" alt="BAD" style="height:40px"><h2>The BAD App is on its way.</h2><p class="muted">We were all BAD players once. See you on court soon.</p></div>`;document.body.appendChild(g);document.documentElement.classList.add('gated');return}
  firebase.initializeApp(cfg);
  const auth=firebase.auth(),fs=firebase.firestore();
  try{fs.settings({ignoreUndefinedProperties:true})}catch(e){console.warn(e)}
  try{fs.enablePersistence({synchronizeTabs:true}).catch(()=>{})}catch(_){}
  const OWNER_EMAILS=(window.BAD_ADMINS||[]).map(e=>e.toLowerCase());

  /* ---------- sign-in screen ---------- */
  const gate=document.createElement('div');gate.id='gate';gate.hidden=true;
  gate.innerHTML=`<div class="gate-card">
    <h2 class="gate-h">Welcome to <img src="${typeof LOGO!=="undefined"?LOGO.badW:""}" alt="BAD"></h2>
    <p class="muted">Sign in to get your player card, join sessions and earn points.</p>
    <button class="btn wide" id="g-google"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5a4.3 4.3 0 0 1-1.9 2.8v2.3h3c1.8-1.6 2.9-4 2.9-6.8z" fill="none"/><circle cx="12" cy="12" r="8.5"/><path d="M12 12h8.4"/></svg>Continue with Google</button>
    <div class="or"><span>or use email</span></div>
    <form id="g-form" class="sec" novalidate>
      <input type="email" id="g-email" placeholder="you@email.com" autocomplete="email" required>
      <input type="password" id="g-pass" placeholder="Password (6+ characters)" autocomplete="current-password" required minlength="6">
      <div class="row"><button class="btn" type="submit" id="g-in">Sign in</button><button class="btn ghost" type="button" id="g-up">Create account</button></div>
      <button class="linkbtn" type="button" id="g-reset">Forgot password?</button>
    </form>
    <p class="fine" id="g-msg" role="status"></p>
    <p class="fine">We only use your email to run sessions and keep your points. We never share it.</p>
  </div>`;
  document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(gate));
  if(document.body)document.body.appendChild(gate);
  const msg=t=>{const m=document.getElementById('g-msg');if(m)m.textContent=t};
  const nice=e=>({'auth/invalid-credential':'That email and password don’t match. Please try again.','auth/user-not-found':'No account with that email yet. Tap Create account.','auth/wrong-password':'That password isn’t right. Please try again.','auth/email-already-in-use':'You already have an account. Tap Sign in.','auth/weak-password':'Please use at least 6 characters.','auth/invalid-email':'Please check the email address.','auth/popup-closed-by-user':'Sign-in was closed. Please try again.','auth/unauthorized-domain':'This web address isn’t allowed yet. An organiser needs to add it in Firebase.'}[e&&e.code]||'Sorry, that didn’t work. Please try again.');
  gate.addEventListener('click',async ev=>{
    const id=ev.target.closest('button')?.id;if(!id)return;
    const email=document.getElementById('g-email').value.trim(),pass=document.getElementById('g-pass').value;
    try{
      if(id==='g-google'){const p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
        try{await auth.signInWithPopup(p)}catch(e){if(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment')await auth.signInWithRedirect(p);else throw e}}
      if(id==='g-up'){if(!email||pass.length<6){msg('Please enter your email and a password of 6+ characters.');return}await auth.createUserWithEmailAndPassword(email,pass)}
      if(id==='g-reset'){if(!email){msg('Type your email above first, then tap Forgot password.');return}await auth.sendPasswordResetEmail(email);msg('Check your inbox for a reset link.')}
    }catch(e){msg(nice(e))}
  });
  gate.addEventListener('submit',async ev=>{ev.preventDefault();const email=document.getElementById('g-email').value.trim(),pass=document.getElementById('g-pass').value;
    try{await auth.signInWithEmailAndPassword(email,pass)}catch(e){msg(nice(e))}});

  /* ---------- auth state ---------- */
  let resolveUser;const userReady=new Promise(r=>resolveUser=r);
  auth.onAuthStateChanged(async u=>{
    if(!u){gate.hidden=false;document.documentElement.classList.add('gated');return}
    gate.hidden=true;document.documentElement.classList.remove('gated');
    const email=(u.email||'').toLowerCase();let admin=OWNER_EMAILS.includes(email);
    if(!admin&&email){try{admin=(await fs.doc('admins/'+email).get()).exists}catch(_){}}
    window.BAD_USER={uid:u.uid,email,name:u.displayName||'',photo:u.photoURL||'',admin};
    resolveUser(window.BAD_USER);
  });
  window.badSignOut=()=>auth.signOut().then(()=>location.reload());

  /* ---------- the API the app calls ---------- */
  const userApi={
    id:async()=>(await userReady).uid,
    isOwner:async()=>(await userReady).admin,
    canEdit:async()=>(await userReady).admin,
    can:async()=>null,
    me:async()=>{const u=await userReady;return{id:u.uid,name:u.name,email:u.email,avatarUrl:'',color:'#969696',isOwner:u.admin,canEdit:u.admin}},
    email:async()=>(await userReady).email
  };
  window.claude={use:async name=>{
    await userReady;
    if(name==='db')return fs;
    if(name==='user')return userApi;
    return null; /* connectors and file uploads aren't available on the hosted version */
  }};
})();
