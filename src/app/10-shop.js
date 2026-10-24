/* ---------- BAD Shop: limited drops and essentials ---------- */
S.products={};S.stock={};S.myOrders={};S.orders={};S.shopFilter='all';S.shopPid=null;S.bagOpen=false;S.shopDone=null;
S.bag=(()=>{try{return JSON.parse(localStorage.getItem('badBag')||'[]')}catch(_){return[]}})();
const saveBag=()=>{try{localStorage.setItem('badBag',JSON.stringify(S.bag))}catch(_){}};
const DROPS={limited:'Limited drop',essentials:'Essentials'};
const ORDER_ST={new:'Placed',paid:'Paid',ready:'Ready',done:'Collected',cancelled:'Cancelled'};
const aed=n=>'AED '+(Math.round((+n||0)*100)/100).toLocaleString('en-GB');
const sizeList=p=>Object.keys(p.sizes||{OS:0});
const soldOf=(pid,sz)=>((S.stock[pid]||{}).sold||{})[sz]||0;
const leftOf=(p,pid,sz)=>Math.max(0,((p.sizes||{})[sz]||0)-soldOf(pid,sz));
const leftAll=(p,pid)=>sizeList(p).reduce((t,z)=>t+leftOf(p,pid,z),0);
/* Legend level and up get first pick of limited drops: 24 hours before everyone else */
const firstPick=p=>p&&p.drop==='limited'&&p.releaseAt&&typeof perk!=='undefined'&&perk.firstPick(S.uid);
const released=p=>!p.releaseAt||Date.now()>=new Date(p.releaseAt).getTime()-(firstPick(p)?864e5:0);
const merchOff=()=>typeof perk!=='undefined'&&S.uid?perk.merchOff(S.uid):0;
const withOff=sub=>{const o=merchOff(),d=Math.round(sub*o)/100;return{off:o,disc:d,total:sub-d}};
const liveProducts=()=>Object.entries(S.products).filter(([,p])=>p.status==='live').sort((a,b)=>(a[1].order||0)-(b[1].order||0)||String(b[1].createdAt||'').localeCompare(String(a[1].createdAt||'')));
const sizeName=z=>z==='OS'?'One size':z;
function countdown(iso){const ms=new Date(iso).getTime()-Date.now();if(ms<=0)return'Live now';const d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5),m=Math.floor(ms%36e5/6e4);return d?`${d}d ${h}h`:h?`${h}h ${m}m`:`${m}m`}
const dropWhen=iso=>new Date(iso).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit',timeZone:'Asia/Dubai'});
function prodTag(p,pid){if(!released(p))return`<span class="ptag">Drops in ${countdown(p.releaseAt)}</span>`;if(firstPick(p)&&Date.now()<new Date(p.releaseAt).getTime())return`<span class="ptag">${ic('star')}First pick for you</span>`;const l=leftAll(p,pid);if(!l)return'<span class="ptag dark">Sold out</span>';if(l<=5)return`<span class="ptag">Only ${l} left</span>`;return p.drop==='limited'?'<span class="ptag">Limited</span>':''}

function renderShop(){
  const el=$('v-shop');if(!el)return;
  const all=liveProducts(),f=S.shopFilter,list=all.filter(([,p])=>f==='all'||p.drop===f);
  const next=all.filter(([,p])=>p.drop==='limited'&&!released(p)).sort((a,b)=>new Date(a[1].releaseAt)-new Date(b[1].releaseAt))[0];
  const bagN=S.bag.reduce((t,i)=>t+i.qty,0),bagT=S.bag.reduce((t,i)=>t+i.qty*i.price,0);
  const mine=Object.entries(S.myOrders).sort((a,b)=>String(b[1].createdAt).localeCompare(String(a[1].createdAt)));
  el.innerHTML=`<div class="hero"><span class="label">BAD Shop</span><h2>Drops &amp; essentials.</h2><p class="muted">Made for BADDIES. Limited drops go once, essentials stay.</p></div>
    ${next?(()=>{const [pid,p]=next;return `<button class="dropban" data-pid="${esc(pid)}">${p.images&&p.images[0]?`<img src="${p.images[0]}" alt="">`:''}<div class="db-t"><span class="label">Next limited drop${p.dropName?' · '+esc(p.dropName):''}</span><b>${esc(p.name)}</b><span class="fine">${esc(dropWhen(p.releaseAt))}</span></div><span class="db-c num">${countdown(p.releaseAt)}</span></button>`})():''}
    <div class="chips" role="group" aria-label="Filter">${[['all','All'],['limited','Limited drops'],['essentials','Essentials']].map(([k,l])=>`<button class="chip" data-sf="${k}" aria-pressed="${f===k}">${l}</button>`).join('')}</div>
    ${list.length?`<div class="pgrid">${list.map(([pid,p])=>`<button class="pcard" data-pid="${esc(pid)}"><div class="pimg">${p.images&&p.images[0]?`<img src="${p.images[0]}" alt="${esc(p.name)}" loading="lazy">`:`<span>${ic('bag')}</span>`}${prodTag(p,pid)}</div><div class="pmeta"><span class="fine">${esc(p.drop==='limited'?(p.dropName||'Limited drop'):'Essentials')}</span><b>${esc(p.name)}</b><span class="num">${aed(p.price)}</span></div></button>`).join('')}</div>`
      :`<div class="empty">${ic('bag')}<span>${all.length?'Nothing here right now.':'The first drop is on its way. Check back soon.'}</span></div>`}
    ${mine.length?`<section class="hsec"><h3 class="ah">My orders</h3><div class="list">${mine.map(([oid,o])=>`<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">Order ${esc(oid.slice(-5).toUpperCase())} · ${esc(fmtD(o.createdAt))}</div><div class="sub">${o.items.map(i=>`${i.qty}× ${esc(i.name)}${i.size&&i.size!=='OS'?' ('+esc(i.size)+')':''}`).join(', ')}</div><div class="sub">${o.fulfil==='delivery'?ic('truck')+' Porter delivery':ic('pin')+' Pick up'} · ${esc(PAY[o.pay]?.label||'')}</div></div><div style="display:grid;justify-items:end;gap:4px"><b class="num">${aed(o.total)}</b><span class="tagl${o.status==='done'||o.status==='paid'||o.status==='ready'?' solid':o.status==='cancelled'?' warn':''}">${esc(ORDER_ST[o.status]||o.status)}</span></div></div>`).join('')}</div></section>`:''}
    ${bagN?`<button class="bagfab" data-bag="1">${ic('bag')}<span>Bag · ${bagN}</span><b class="num">${aed(bagT)}</b></button>`:''}
    ${S.shopPid?productSheet(S.shopPid):''}${S.bagOpen?bagSheet():''}`;
  bindShop(el);
}
function productSheet(pid){const p=S.products[pid];if(!p)return'';const rel=released(p),sz=sizeList(p),sel=S.shopSize&&sz.includes(S.shopSize)?S.shopSize:(sz.length===1?sz[0]:null),left=sel?leftOf(p,pid,sel):0,inBag=S.bag.filter(i=>i.pid===pid).reduce((t,i)=>t+i.qty,0),max=Math.max(0,Math.min(left,(p.maxPer||99)-inBag));
  const q=Math.min(S.shopQty||1,Math.max(1,max));
  return `<div class="sheet-ov" data-close="1"><div class="sheet" role="dialog" aria-label="${esc(p.name)}">
    <button class="sheet-x" data-close="1" aria-label="Close">${ic('x')}</button>
    <div class="gallery">${(p.images&&p.images.length?p.images:['']).map(u=>u?`<img src="${u}" alt="${esc(p.name)}">`:`<div class="noimg">${ic('bag')}</div>`).join('')}</div>
    ${p.images&&p.images.length>1?`<p class="fine" style="text-align:center">Swipe for more photos</p>`:''}
    <div class="sheet-b"><span class="label">${esc(p.drop==='limited'?'Limited drop'+(p.dropName?' · '+p.dropName:''):'Essentials')}</span><h3 class="big">${esc(p.name)}</h3><b class="num price">${aed(p.price)}</b>
      ${p.desc?`<p class="muted">${esc(p.desc)}</p>`:''}
      ${!rel?`<div class="note">${ic('clock')}<span>Drops ${esc(dropWhen(p.releaseAt))}. Come back then, it goes fast.</span></div>`:`
      ${sz.length>1||sz[0]!=='OS'?`<div class="field" style="margin:0"><span class="lbl">Size</span><div class="chips">${sz.map(z=>{const l=leftOf(p,pid,z);return `<button class="chip" data-size="${esc(z)}" aria-pressed="${sel===z}" ${l?'':'disabled'}>${esc(sizeName(z))}${l&&l<=3?` <small class="fine">· ${l} left</small>`:''}${l?'':' · sold out'}</button>`}).join('')}</div></div>`:''}
      ${sel&&max?`<div class="row buybar" style="justify-content:space-between"><div class="qty"><button class="btn ghost sm" data-qty="-1" aria-label="One less">${ic('minus')}</button><b class="num">${q}</b><button class="btn ghost sm" data-qty="1" aria-label="One more" ${q>=max?'disabled':''}>${ic('plus')}</button></div><button class="btn" data-addbag="${esc(pid)}">${ic('bag')}Add to bag · ${aed(p.price*q)}</button></div>${p.maxPer?`<p class="fine">Limit ${p.maxPer} per person.</p>`:''}`
        :sel?`<p class="fine">${left?`You've reached the limit of ${p.maxPer} for this one.`:'Sold out in this size.'}</p>`:leftAll(p,pid)?'<p class="fine">Pick a size.</p>':'<p class="fine">Sold out. Thank you for the love.</p>'}`}
    </div></div></div>`}
function bagSheet(){const c=S.payCfg||{},items=S.bag,sub=items.reduce((t,i)=>t+i.qty*i.price,0),opts=Object.keys(PAY).filter(payOn),pay=opts.includes(S.shopPay)?S.shopPay:opts[0]||'cash',fu=S.shopFul||'pickup';
  if(S.shopDone){const o=S.shopDone;let det='';
    if(o.pay==='bank')det=c.iban?`<div class="paydet"><span class="fine">Account name</span><b>${esc(c.accName||'')}</b><span class="fine">IBAN</span><b class="num" id="iban-shop">${esc(c.iban)}</b><span class="fine">Amount</span><b class="num">${aed(o.total)}</b><span class="fine">Reference</span><b>Order ${esc(o.no)}</b></div>`:'<p class="fine">An admin will share the bank details with you.</p>';
    if(o.pay==='ziina')det=c.ziinaLink?`<a class="btn" href="${esc(c.ziinaLink)}" target="_blank" rel="noopener">${ic('wallet')}Pay ${aed(o.total)} with Ziina</a>`:'<p class="fine">An admin will send you a Ziina link.</p>';
    if(o.pay==='careem')det=careemDet(c,o.total);
    if(o.pay==='cash')det=`<p class="fine">Please pay ${aed(o.total)} in cash when you collect.</p>`;
    return `<div class="sheet-ov" data-close="1"><div class="sheet" role="dialog" aria-label="Order placed"><button class="sheet-x" data-close="1" aria-label="Close">${ic('x')}</button><div class="sheet-b">
      <span class="label">Order ${esc(o.no)}</span><h3 class="big">Thank you. It's yours.</h3><p class="muted">${o.fulfil==='delivery'?'We will book a Porter driver and let you know when it is on the way. The delivery fee is paid to the driver.':'Collect it at '+esc(o.where||'your next session')+'. An admin will let you know when it is ready.'}</p>
      <b class="num price">${aed(o.total)}</b>${det}<button class="btn ghost" data-close="1">Done</button></div></div></div>`}
  const ups=upcoming().slice(0,6);
  return `<div class="sheet-ov" data-close="1"><div class="sheet" role="dialog" aria-label="Your bag"><button class="sheet-x" data-close="1" aria-label="Close">${ic('x')}</button><div class="sheet-b">
    <h3 class="big">Your bag</h3>
    ${items.length?`<div class="list">${items.map((i,n)=>`<div class="li bagline"><div class="bthumb">${S.products[i.pid]?.images?.[0]?`<img src="${S.products[i.pid].images[0]}" alt="">`:ic('bag')}</div><div><div class="nm">${esc(i.name)}</div><div class="sub">${esc(sizeName(i.size))} · ${aed(i.price)}</div><div class="qty sm"><button class="btn ghost sm" data-bq="${n}" data-d="-1" aria-label="One less">${ic('minus')}</button><b class="num">${i.qty}</b><button class="btn ghost sm" data-bq="${n}" data-d="1" aria-label="One more">${ic('plus')}</button></div></div><b class="num">${aed(i.qty*i.price)}</b></div>`).join('')}
      ${(()=>{const w=withOff(sub);return w.off?`<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><span>${ic('star')} ${esc(pointsFor(S.uid).level)} ${w.off}% off</span><b class="num">− ${aed(w.disc)}</b></div><div class="li total" style="grid-template-columns:minmax(0,1fr) auto"><b>Total</b><b class="num">${aed(w.total)}</b></div>`:`<div class="li total" style="grid-template-columns:minmax(0,1fr) auto"><b>Total</b><b class="num">${aed(sub)}</b></div>`})()}</div>
    <div class="field" style="margin:0"><span class="lbl">How you'll get it</span><div class="chips"><button class="chip" data-ful="pickup" aria-pressed="${fu==='pickup'}">${ic('pin')}Pick up at a session</button><button class="chip" data-ful="delivery" aria-pressed="${fu==='delivery'}">${ic('truck')}Delivery with Porter</button></div></div>
    ${fu==='pickup'?`<div class="field" style="margin:0"><label for="sh-sess">Which session</label><select id="sh-sess">${ups.map(([sid,x])=>{const d=dParts(x.date);return `<option value="${esc(sid)}" ${S.shopSess===sid?'selected':''}>${esc(x.title)} · ${d.w} ${d.d} ${d.m}</option>`}).join('')}<option value="" ${S.shopSess===''?'selected':''}>Any session, I'll let you know</option></select></div>`
      :`<div class="field" style="margin:0"><label for="sh-addr">Delivery address</label><textarea id="sh-addr" placeholder="Building, street, area, emirate">${esc(S.shopAddr||'')}</textarea><p class="fine">We book a Porter driver for you. The delivery fee is paid to the driver.</p></div>`}
    <div class="field" style="margin:0"><span class="lbl">How you'll pay</span><div class="chips">${opts.map(o=>`<button class="chip" data-spay="${o}" aria-pressed="${o===pay}">${ic(PAY[o].icon)}${PAY[o].label}</button>`).join('')}</div></div>
    <button class="btn wide" data-place="1" ${myProfile()?'':'disabled'}>Place order · ${aed(withOff(sub).total)}</button>${myProfile()?'':'<p class="fine">Please register your player card first.</p>'}`
    :`<div class="empty">${ic('bag')}<span>Your bag is empty.</span></div>`}
  </div></div></div>`}

function bindShop(el){
  const q=s=>el.querySelectorAll(s);
  q('[data-sf]').forEach(b=>b.onclick=()=>{S.shopFilter=b.dataset.sf;renderShop()});
  q('[data-pid]').forEach(b=>b.onclick=()=>{S.shopPid=b.dataset.pid;S.shopSize=null;S.shopQty=1;renderShop()});
  const closeS=()=>{S.shopPid=null;S.bagOpen=false;S.shopDone=null;renderShop()};
  q('.sheet-ov').forEach(o=>o.onclick=e=>{if(e.target===o)closeS()});
  q('.sheet [data-close]').forEach(b=>b.onclick=closeS);
  q('[data-size]').forEach(b=>b.onclick=()=>{S.shopSize=b.dataset.size;S.shopQty=1;renderShop()});
  q('[data-qty]').forEach(b=>b.onclick=()=>{S.shopQty=Math.max(1,(S.shopQty||1)+(+b.dataset.qty));renderShop()});
  q('[data-addbag]').forEach(b=>b.onclick=()=>{const pid=b.dataset.addbag,p=S.products[pid],sz=S.shopSize||sizeList(p)[0],qn=S.shopQty||1,ex=S.bag.find(i=>i.pid===pid&&i.size===sz);
    if(ex)ex.qty+=qn;else S.bag.push({pid,size:sz,qty:qn,price:+p.price,name:p.name});saveBag();S.shopPid=null;toast(`${p.name} is in your bag.`);renderShop()});
  q('[data-bag]').forEach(b=>b.onclick=()=>{S.bagOpen=true;renderShop()});
  q('[data-bq]').forEach(b=>b.onclick=()=>{const i=S.bag[+b.dataset.bq];if(!i)return;const p=S.products[i.pid];i.qty+=(+b.dataset.d);
    if(p&&+b.dataset.d>0){const lim=Math.min(leftOf(p,i.pid,i.size),p.maxPer||99);if(i.qty>lim){i.qty=lim;toast(lim?`Limit ${lim} for this one.`:'Sold out in this size.')}}
    if(i.qty<=0)S.bag.splice(+b.dataset.bq,1);saveBag();renderShop()});
  q('[data-ful]').forEach(b=>b.onclick=()=>{const a=el.querySelector('#sh-addr');if(a)S.shopAddr=a.value;S.shopFul=b.dataset.ful;renderShop()});
  q('[data-spay]').forEach(b=>b.onclick=()=>{const a=el.querySelector('#sh-addr');if(a)S.shopAddr=a.value;S.shopPay=b.dataset.spay;renderShop()});
  const ad=el.querySelector('#sh-addr');if(ad)ad.oninput=()=>{S.shopAddr=ad.value};
  const ss=el.querySelector('#sh-sess');if(ss)ss.onchange=()=>{S.shopSess=ss.value};
  q('[data-place]').forEach(b=>b.onclick=()=>placeOrder(el,b));
  q('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText($(b.dataset.copy).textContent);toast('Copied.')}catch(_){}});
}
async function placeOrder(el,btn){
  const p0=myProfile();if(!p0||!S.bag.length)return;const fu=S.shopFul||'pickup',opts=Object.keys(PAY).filter(payOn),pay=opts.includes(S.shopPay)?S.shopPay:opts[0]||'cash';
  const addr=(el.querySelector('#sh-addr')?.value||'').trim(),sess=el.querySelector('#sh-sess')?.value??'';
  if(fu==='delivery'&&addr.length<8){toast('Please add your delivery address.');return}
  btn.disabled=true;btn.textContent='Placing your order…';
  const items=S.bag.map(i=>({pid:i.pid,name:i.name,size:i.size,qty:i.qty,price:+i.price})),subtotal=items.reduce((t,i)=>t+i.qty*i.price,0),W=withOff(subtotal),total=W.total;
  const need={};items.forEach(i=>{need[i.pid]=need[i.pid]||{};need[i.pid][i.size]=(need[i.pid][i.size]||0)+i.qty});
  try{
    const reserve=async(get,set)=>{for(const [pid,sz] of Object.entries(need)){const p=S.products[pid];if(!p||p.status!=='live'||!released(p))throw new Error(`${p?p.name:'An item'} isn't available right now.`);
        const d=await get(pid),sold={...((d&&d.sold)||{})};for(const [z,n] of Object.entries(sz)){if(((p.sizes||{})[z]||0)-(sold[z]||0)<n)throw new Error(`Sorry, ${p.name} (${sizeName(z)}) just sold out.`);sold[z]=(sold[z]||0)+n}
        await set(pid,{sold})}};
    if(S.db.runTransaction)await S.db.runTransaction(async t=>{const refs={},snaps={};for(const pid of Object.keys(need)){refs[pid]=S.db.doc('shopstock/'+pid);snaps[pid]=await t.get(refs[pid])}
      await reserve(async pid=>snaps[pid].exists?snaps[pid].data():{},async(pid,v)=>t.set(refs[pid],v))});
    else await reserve(async pid=>{const d=await S.db.doc('shopstock/'+pid).get();return d.exists?d.data():{}},(pid,v)=>S.db.doc('shopstock/'+pid).set(v));
    const id='o'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),c=S.myContact||{},sx=sess&&S.sessions[sess];
    const order={uid:S.uid,name:p0.nickname||'',email:c.email||window.BAD_USER?.email||'',mobile:c.mobile||'',items,subtotal,discount:W.disc,discountPct:W.off,total,fulfil:fu,address:fu==='delivery'?addr:'',session:fu==='pickup'?sess:'',pay,status:'new',createdAt:new Date().toISOString()};
    await S.db.doc('orders/'+id).set(order);
    S.bag=[];saveBag();S.shopDone={no:id.slice(-5).toUpperCase(),total,pay,fulfil:fu,where:sx?`${sx.title}, ${dParts(sx.date).w} ${dParts(sx.date).d} ${dParts(sx.date).m}`:''};renderShop();
  }catch(e){console.error(e);toast(e&&e.message&&!/permission/i.test(e.message)?e.message:"Sorry, that didn't go through. Please try again.");btn.disabled=false;btn.textContent='Place order'}
}

/* ---------- admin: products and orders ---------- */
let shopEdit=null,shopOrdF='open';
function aShop(){
  const prods=Object.entries(S.products).sort((a,b)=>(a[1].order||0)-(b[1].order||0)||String(b[1].createdAt||'').localeCompare(String(a[1].createdAt||'')));
  const ords=Object.entries(S.orders).sort((a,b)=>String(b[1].createdAt).localeCompare(String(a[1].createdAt)));
  const shown=ords.filter(([,o])=>shopOrdF==='all'||(shopOrdF==='open'?!['done','cancelled'].includes(o.status):o.status===shopOrdF));
  const revenue=ords.filter(([,o])=>['paid','ready','done'].includes(o.status)).reduce((t,[,o])=>t+(+o.total||0),0);
  const e={...(shopEdit&&shopEdit!=='new'?S.products[shopEdit]||{}:{}),...(S.pDraft||{})};
  const form=shopEdit?box(shopEdit==='new'?'New product':'Edit product',`
    <div class="chips" role="group">${Object.entries(DROPS).map(([k,l])=>`<button type="button" class="chip" data-pdrop="${k}" aria-pressed="${(S.pDrop||e.drop||'essentials')===k}">${l}</button>`).join('')}</div>
    <div class="fgrid">
      <div class="field wide"><label for="pf-name">Name</label><input type="text" id="pf-name" value="${esc(e.name||'')}" placeholder="BAD Club Jersey 2026"></div>
      <div class="field"><label for="pf-price">Price (AED)</label><input type="number" id="pf-price" min="0" value="${esc(e.price??'')}"></div>
      <div class="field"><label for="pf-max">Limit per person</label><input type="number" id="pf-max" min="0" value="${esc(e.maxPer??'')}" placeholder="No limit"></div>
      <div class="field wide"><label for="pf-drop">Drop name <span class="muted">(optional)</span></label><input type="text" id="pf-drop" value="${esc(e.dropName||'')}" placeholder="BAD-O-WEEN, Volume II…"></div>
      <div class="field wide"><label for="pf-sizes">Sizes and stock</label><input type="text" id="pf-sizes" value="${esc(e.sizesRaw!=null?e.sizesRaw:e.sizes?Object.entries(e.sizes).map(([z,n])=>z==='OS'?n:`${z}:${n}`).join(', '):'')}" placeholder="S:10, M:15, L:10, XL:5   or just 30 for one size"></div>
      <div class="field"><label for="pf-rel">Drop date <span class="muted">(optional)</span></label><input type="datetime-local" id="pf-rel" value="${e.relRaw!=null?esc(e.relRaw):e.releaseAt?new Date(new Date(e.releaseAt).getTime()+4*36e5).toISOString().slice(0,16):''}"></div>
      <div class="field"><label for="pf-status">Show in shop</label><select id="pf-status">${[['live','Live'],['draft','Draft, hidden'],['archived','Archived']].map(([k,l])=>`<option value="${k}" ${(e.status||'draft')===k?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="field wide"><label for="pf-desc">Description</label><textarea id="pf-desc" placeholder="Fabric, fit, story behind the drop">${esc(e.desc||'')}</textarea></div></div>
    <div class="field" style="margin:0"><span class="lbl">Photos <span class="muted">(up to 4, first one is the cover)</span></span><div class="pthumbs">${(S.pImgs||e.images||[]).map((u,i)=>`<div class="pth"><img src="${u}" alt=""><button class="sheet-x" data-pimgrm="${i}" aria-label="Remove photo">${ic('x')}</button></div>`).join('')}${(S.pImgs||e.images||[]).length<4?`<button class="pth add" id="pf-add">${ic('plus')}<span class="fine">Add</span></button>`:''}</div><input type="file" id="pf-file" accept="image/*" multiple hidden></div>
    <div class="row"><button class="btn" id="pf-save">${ic('check')}Save product</button><button class="btn ghost" id="pf-cancel">Cancel</button>${shopEdit!=='new'?`<button class="btn ghost" id="pf-del">Delete</button>`:''}</div>`,'formbox'):'';
  return `<div class="tiles">${tile(Object.values(S.products).filter(p=>p.status==='live').length,'Live products')}${tile(ords.filter(([,o])=>o.status==='new').length,'New orders')}${tile(`<small>AED</small> ${revenue}`,'Paid sales')}</div>
  ${form}
  ${box(`Products <span class="hint num">${prods.length}</span>`,`${shopEdit?'':`<div class="row"><button class="btn" id="pf-new">${ic('plus')}Add a product</button></div>`}
    <div class="list">${prods.map(([pid,p])=>`<div class="li" style="grid-template-columns:auto minmax(0,1fr) auto"><div class="bthumb">${p.images&&p.images[0]?`<img src="${p.images[0]}" alt="">`:ic('bag')}</div><div><div class="nm">${esc(p.name)} <span class="tagl${p.status==='live'?' solid':''}">${p.status==='live'?(released(p)?'Live':'Drops '+esc(dropWhen(p.releaseAt))):p.status==='draft'?'Draft':'Archived'}</span></div><div class="sub">${esc(DROPS[p.drop]||'')}${p.dropName?' · '+esc(p.dropName):''} · ${aed(p.price)}</div><div class="sub num">${sizeList(p).map(z=>`${esc(sizeName(z))} ${leftOf(p,pid,z)}/${(p.sizes||{})[z]||0}`).join(' · ')} left</div></div><button class="btn ghost sm" data-pedit="${esc(pid)}">Edit</button></div>`).join('')||'<p class="hint">No products yet. Add your first drop.</p>'}</div>`)}
  ${box(`Orders <span class="hint num">${ords.length}</span>`,`<div class="chips">${[['open','Open'],['new','Placed'],['paid','Paid'],['ready','Ready'],['done','Collected'],['cancelled','Cancelled'],['all','All']].map(([k,l])=>`<button class="chip" data-of="${k}" aria-pressed="${shopOrdF===k}">${l}</button>`).join('')}</div>
    <div class="list">${shown.map(([oid,o])=>{const sx=o.session&&S.sessions[o.session];return `<div class="li ord" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">${esc(o.name||'Player')} · <span class="num">#${esc(oid.slice(-5).toUpperCase())}</span></div>
      <div class="sub">${o.items.map(i=>`${i.qty}× ${esc(i.name)}${i.size&&i.size!=='OS'?' ('+esc(i.size)+')':''}`).join(', ')}</div>
      <div class="sub">${o.fulfil==='delivery'?`${ic('truck')} Porter to ${esc(o.address)}`:`${ic('pin')} Pick up${sx?' at '+esc(sx.title)+' · '+dParts(sx.date).d+' '+dParts(sx.date).m:''}`}</div>
      <div class="sub">${esc(PAY[o.pay]?.label||'')} · ${esc(o.mobile||o.email||'')} · ${esc(fmtD(o.createdAt))}</div></div>
      <div style="display:grid;justify-items:end;gap:6px"><b class="num">${aed(o.total)}</b><select class="memset" data-ost="${esc(oid)}" aria-label="Order status">${Object.entries(ORDER_ST).map(([k,l])=>`<option value="${k}" ${o.status===k?'selected':''}>${l}</option>`).join('')}</select></div></div>`}).join('')||'<p class="hint">No orders here.</p>'}</div>`)}`;
}
function shrinkImg(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const k=Math.min(1,900/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);res(c.toDataURL('image/jpeg',.74))};im.onerror=rej;im.src=u})}
function parseSizes(t){t=String(t||'').trim();if(!t)return null;if(/^\d+$/.test(t))return{OS:+t};const o={};t.split(/[,\n]+/).forEach(x=>{const m=x.trim().match(/^([A-Za-z0-9 .+-]{1,12})\s*[:=]\s*(\d+)$/);if(m)o[m[1].trim().toUpperCase()]=+m[2]});return Object.keys(o).length?o:null}
function bindShopAdmin(){
  const on=(id,f)=>{const x=$(id);if(x)x.onclick=f},q=s=>document.querySelectorAll('#v-admin '+s);
  const keep=()=>{if(!$('pf-name'))return;S.pDraft={name:$('pf-name').value,price:$('pf-price').value,maxPer:$('pf-max').value,dropName:$('pf-drop').value,sizesRaw:$('pf-sizes').value,relRaw:$('pf-rel').value,status:$('pf-status').value,desc:$('pf-desc').value}};
  on('pf-new',()=>{shopEdit='new';S.pImgs=[];S.pDrop='limited';S.pDraft=null;renderAdmin()});
  q('[data-pedit]').forEach(b=>b.onclick=()=>{shopEdit=b.dataset.pedit;S.pImgs=null;S.pDrop=null;S.pDraft=null;renderAdmin();scrollTo({top:0})});
  on('pf-cancel',()=>{shopEdit=null;S.pImgs=null;S.pDraft=null;renderAdmin()});
  q('[data-pdrop]').forEach(b=>b.onclick=()=>{S.pDrop=b.dataset.pdrop;q('[data-pdrop]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
  const fi=$('pf-file');on('pf-add',()=>fi&&fi.click());
  if(fi)fi.onchange=async()=>{keep();const cur=[...(S.pImgs||(S.products[shopEdit]||{}).images||[])];for(const f of [...fi.files].slice(0,4-cur.length)){try{cur.push(await shrinkImg(f))}catch(_){toast('One photo did not load.')}}S.pImgs=cur;renderAdmin()};
  q('[data-pimgrm]').forEach(b=>b.onclick=()=>{keep();const cur=[...(S.pImgs||(S.products[shopEdit]||{}).images||[])];cur.splice(+b.dataset.pimgrm,1);S.pImgs=cur;renderAdmin()});
  on('pf-save',async()=>{const name=$('pf-name').value.trim(),price=+$('pf-price').value,sizes=parseSizes($('pf-sizes').value);
    if(!name){toast('Please name the product.');return}if(!(price>=0)||$('pf-price').value===''){toast('Please add a price.');return}if(!sizes){toast('Add sizes and stock, e.g. S:10, M:15 or 30.');return}
    const old=shopEdit!=='new'?S.products[shopEdit]||{}:{},imgs=S.pImgs||old.images||[],rel=$('pf-rel').value;
    const d={name,price,sizes,drop:S.pDrop||old.drop||'essentials',dropName:$('pf-drop').value.trim(),maxPer:+$('pf-max').value||0,desc:$('pf-desc').value.trim(),status:$('pf-status').value,releaseAt:rel?new Date(rel+':00+04:00').toISOString():null,images:imgs,order:old.order||0,createdAt:old.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(JSON.stringify(d).length>950000){toast('The photos are too large together. Please remove one.');return}
    const id=shopEdit!=='new'?shopEdit:slug(name).slice(0,30)+'-'+Date.now().toString(36);
    try{await S.db.doc('products/'+id).set(d);shopEdit=null;S.pImgs=null;S.pDraft=null;toast(d.status==='live'?'Saved. It is in the shop.':'Saved.');renderAdmin()}catch(e){toast("Sorry, that didn't save.")}});
  on('pf-del',async()=>{if(!shopEdit||shopEdit==='new')return;try{await S.db.doc('products/'+shopEdit).delete();shopEdit=null;toast('Product deleted.');renderAdmin()}catch(e){toast("Sorry, that didn't delete.")}});
  q('[data-of]').forEach(b=>b.onclick=()=>{shopOrdF=b.dataset.of;renderAdmin()});
  q('[data-ost]').forEach(x=>x.onchange=async()=>{const oid=x.dataset.ost,o=S.orders[oid],st=x.value;if(!o)return;
    try{if(st==='cancelled'&&o.status!=='cancelled'){for(const i of o.items){const r=S.db.doc('shopstock/'+i.pid),d=await r.get(),sold={...((d.exists&&d.data().sold)||{})};sold[i.size]=Math.max(0,(sold[i.size]||0)-i.qty);await r.set({sold})}}
      if(o.status==='cancelled'&&st!=='cancelled'){for(const i of o.items){const r=S.db.doc('shopstock/'+i.pid),d=await r.get(),sold={...((d.exists&&d.data().sold)||{})};sold[i.size]=(sold[i.size]||0)+i.qty;await r.set({sold})}}
      await S.db.doc('orders/'+oid).update({status:st,updatedAt:new Date().toISOString()});toast(`Order marked ${ORDER_ST[st].toLowerCase()}.`)}catch(e){toast("Sorry, that didn't save.")}});
}
/* live countdowns refresh once a minute while the shop is open */
setInterval(()=>{if(S.view==='shop'&&!S.shopPid&&!S.bagOpen&&liveProducts().some(([,p])=>!released(p)))renderShop()},60000);
