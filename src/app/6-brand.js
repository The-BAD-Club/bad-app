/* ---------- brand: official BAD logos (BAD ASSETS folder, files 03 white / 04 black) built in; brand fonts by upload ---------- */
function applyBrand(){
  const b=S.brand||{};
  const hdr=document.querySelector('.wordmark');
  if(hdr&&!hdr.dataset.done){hdr.dataset.done='1';hdr.innerHTML=`<img class="logo-l" src="${LOGO.badK}" alt="BAD"><img class="logo-d" src="${LOGO.badW}" alt="BAD">`}
  let st=$('brand-fonts');if(!st){st=document.createElement('style');st.id='brand-fonts';document.head.appendChild(st)}
  st.textContent=(b.sans?`@font-face{font-family:"BAD Sans";src:url("${b.sans}");font-display:swap}`:'')+(b.serif?`@font-face{font-family:"BAD Display";src:url("${b.serif}");font-display:swap}`:'')+
    `:root{--f-sans:${b.sans?'"BAD Sans",':''}"Aktiv Grotesk","Inter Tight","Helvetica Neue",Arial,sans-serif;--f-serif:${b.serif?'"BAD Display",':''}"IvyPresto Display","Instrument Serif",Didot,Georgia,serif}`;
}
applyBrand();

function brandPanel(){
  const b=S.brand||{};
  const sw=(src,bg,label)=>`<figure style="margin:0;display:grid;gap:6px"><div style="aspect-ratio:3/2;display:grid;place-items:center;background:${bg};border:1px solid var(--line);border-radius:var(--r)"><img src="${src}" alt="${label}" style="max-width:70%;max-height:60%"></div><figcaption class="fine">${label}</figcaption></figure>`;
  return `<div class="panel"><h3 class="ah">Brand</h3>
    <p class="muted">The official BAD logos from the ASSETS folder are built into the app: the black BAD wordmark on light screens and cards, the white one on dark screens and On-Court cards.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">${sw(LOGO.badK,'#fff','BAD · black (04)')}${sw(LOGO.badW,'#000','BAD · white (03)')}${sw(LOGO.clubK,'#fff','The BAD Club · black (02)')}${sw(LOGO.clubW,'#000','The BAD Club · white (01)')}</div>
    <span class="label">Brand fonts</span>
    <p class="fine">Aktiv Grotesk and IvyPresto Display aren't in Drive yet. Upload the .woff2, .otf or .ttf files and every screen switches over.</p>
    <div class="row"><button class="btn ghost sm" data-font="sans">${b.sans?'Replace':'Upload'} Aktiv Grotesk</button><button class="btn ghost sm" data-font="serif">${b.serif?'Replace':'Upload'} IvyPresto Display</button><span class="hint" id="brand-status"></span></div>
    <input type="file" id="font-in" accept=".woff2,.woff,.otf,.ttf,font/*" hidden></div>`;
}
let fontRole=null;
function bindBrand(){
  const st=$('brand-status');
  document.querySelectorAll('[data-font]').forEach(b=>b.onclick=()=>{fontRole=b.dataset.font;$('font-in').click()});
  $('font-in').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||!S.assets)return;st.textContent='Uploading font…';
    try{const up=await S.assets.upload(f);await S.db.doc('config/brand').set({...(S.brand||{}),[fontRole]:up.url});st.textContent='Font is live.'}catch(err){st.textContent="Sorry, that font didn't upload. Please try .woff2 or .otf."}};
}
