const CFG={freeHours:48,halfHours:24};
const SHEETS=[{id:'1xKhAHUrprXUPyrpGrKL6hQKDGxY7GUNCnhsEDFRjUzY',day:'wed',label:'Wednesday Rally'},{id:'1V7Ps7jnQ5KpDEB2E7B1WK9aSvwt_3l_mehe4fokgxV4',day:'fri',label:'Friday Rally'}];
const EDITIONS=[['oncourt','On-Court','Black','#000'],['offcourt','Off-Court','White','#fff'],['courtside','Courtside','Grey','#969696']];
const LEVELS=['Beginner','Intermediate','Advanced','Pro','National'];
const LEVEL_SHORT=LEVELS;
const LEVEL_DESC=['New to the sport or still learning the rules','Plays regularly and can keep a rally going','Strong all-round game with good tactics','Competes in leagues or tournaments','Has played at national level'];
const lvlOf=(p,sp)=>{const v=p?.levels?.[sp];return v==null||v===''?null:+v};
const MONTHS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* ---------- icons (stroke, currentColor) ---------- */
const P={
 bag:'<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>',
 truck:'<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
 minus:'<path d="M5 12h14"/>',
 cash:'<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
 bank:'<path d="M3 10l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
 wallet:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14.5h2"/><path d="M6 6l9-3 1.5 3"/>',
 court:'<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 12h18M7 4v16M17 4v16"/>',
 card:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 15h6M9 18h4"/><circle cx="12" cy="9" r="2.5"/>',
 play:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 14h3v3H8z"/>',
 club:'<path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
 board:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
 admin:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
 badminton:'<path d="M12 14l-5-9 3 1 2-3 2 3 3-1z"/><path d="M9.5 7.5L12 14l2.5-6.5"/><path d="M10 14h4a2 2 0 0 1-2 4 2 2 0 0 1-2-4z"/>',
 volleyball:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 2 9M3.5 9.5A9 9 0 0 1 12 12M19 17.5A9 9 0 0 1 12 12M14 12a9 9 0 0 0 7-3M12 12a9 9 0 0 0-5 8M12 12a9 9 0 0 0-6-8"/>',
 pickleball:'<rect x="4" y="3" width="10" height="12" rx="5" transform="rotate(-30 9 9)"/><path d="M12.5 14.5l4 6"/><circle cx="18.5" cy="6.5" r="2.5"/>',
 run:'<path d="M3 17h7l3-3 4 2 4 1v2H3z"/><path d="M10 14l-1-4 4-2 3 3"/><circle cx="16" cy="5" r="1.5"/>',
 basketball:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.6 5.6a9 9 0 0 1 0 12.8M18.4 5.6a9 9 0 0 0 0 12.8"/>',
 training:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
 retreat:'<path d="M2 20l7-12 4 6 2-3 7 9z"/><circle cx="17" cy="5" r="2"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 pin:'<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
 coin:'<circle cx="12" cy="12" r="9"/><path d="M9 9.5c.5-1 1.6-1.5 3-1.5 1.7 0 3 .8 3 2s-1.3 1.6-3 2-3 .9-3 2 1.3 2 3 2c1.4 0 2.5-.5 3-1.5M12 6v2M12 16v2"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 5.5 5.8"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', check:'<path d="M5 12.5l4.5 4.5L19 7"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>',
 guest:'<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
 phone:'<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
 at:'<circle cx="12" cy="12" r="4"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1"/>',
 camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
 gift:'<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18M12 9v12M12 9C10 4 6 5 7.5 7.5 8.5 9 12 9 12 9zM12 9c2-5 6-4 4.5-1.5C15.5 9 12 9 12 9z"/>',
 star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
 arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>', ticket:'<path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 0 0-4V4H3z" transform="translate(0 2)"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 sheet:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M3 18l6-5 4 3 3-2 5 4"/>'
};
const ic=(n,cls='')=>`<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n]||''}</svg>`;

/* ---------- BAD clubs ---------- */
const SPORTS={
 badminton:{club:'The BAD Club',sport:'Badminton',icon:'badminton'},
 volleyball:{club:'VolleyBAD',sport:'Volleyball',icon:'volleyball'},
 pickleball:{club:'BADDINK',sport:'Pickleball',icon:'pickleball'},
 run:{club:'Runaways',sport:'Run club',icon:'run'},
 basketball:{club:'BADSHOTS',sport:'Basketball',icon:'basketball'},
 training:{club:'Training Department',sport:'Training',icon:'training',noType:true},
 retreat:{club:'BAD Retreat',sport:'Retreats',icon:'retreat',noType:true},
 vibe:{club:'BAD Community',sport:'Here for the vibe',icon:'users',noType:true}
};
const ACT_DESC={badminton:'Badminton · Wednesday & Friday Rally',volleyball:'Volleyball · Friday',pickleball:'Pickleball · Tuesday',run:'Run club',basketball:'Basketball',training:'Coaching and drills',retreat:'Trips and retreats',vibe:'Not playing? Come for the socials, events and good company'};
const LEVEL_FREE=['retreat','vibe'];
const PAY={cash:{label:'Cash',sub:'Pay at the session',icon:'cash'},bank:{label:'Bank transfer',sub:'Send before the session',icon:'bank'},ziina:{label:'Ziina',sub:'Pay with a link',icon:'wallet'},careem:{label:'Careem Pay',sub:'Send in the Careem app',icon:'phone'}};
const PLAYABLE=['badminton','volleyball','pickleball','run','basketball'];
const TYPES={
 badminton:{'Smasher':'Ends rallies from the back.','Net Ninja':'Lives at the tape.','The Wall':'Returns everything.','Trickster':'Holds, flicks, deceives.','Rally Machine':'No errors. Ever.'},
 volleyball:{'Spiker':'Goes up, brings it down.','Setter':'Makes everyone look good.','Libero':'Nothing hits the floor.','Blocker':'The wall at the net.','All-rounder':'Wherever the team needs.'},
 pickleball:{'Banger':'Drives first, asks later.','Dinker':'Patience at the kitchen line.','Drop Artist':'Soft third shots, every time.','Erne Hunter':'Lives on the sideline.','All-court':'Comfortable anywhere.'},
 run:{'Sprinter':'Short, fast, gone.','Tempo Runner':'Steady and strong.','Long Hauler':'Half marathons for fun.','Trail Runner':'Off-road when possible.','Social Pacer':'Here for the chat.'},
 basketball:{'Shooter':'Lives behind the arc.','Playmaker':'Sees the pass first.','Slasher':'Straight to the rim.','Rim Protector':'Nothing gets in.','Glue':'Does all the little things.'}
};
/* signature: one word that sums up how you play, any sport */
const SIGS=[['Power','Hits hard, plays big'],['Speed','First to every ball'],['Precision','Places it exactly'],['Defence','Gets everything back'],['Strategy','Reads the game'],['Endurance','Still going at 10pm'],['Teamwork','Makes everyone better'],['Hype','Brings the energy']];
const SHOTS={badminton:['Jump smash','Net kill','Drop shot','Clear','Drive','Net spin'],volleyball:['Spike','Jump serve','Dig','Set','Block'],pickleball:['Dink','Third-shot drop','Erne','Drive','Lob'],run:['5K','10K','Half marathon','Hill reps','Intervals'],basketball:['Three-pointer','Layup','Crossover','Block','Fadeaway']};
const QUIZ=[
  {q:'Long rally. Your move?',a:[['Wait for the short one, then smash.','Smasher'],['Creep to the net.','Net Ninja'],['Keep it going, all night if needed.','Rally Machine'],['Fake the drop, flick it deep.','Trickster'],['Defend. They will tire first.','The Wall']]},
  {q:'Best sound on court?',a:[['The crack of a full smash.','Smasher'],['The tick of a tight net shot.','Net Ninja'],['"How did you get that back?"','The Wall'],['The "oh" when they bite on the fake.','Trickster'],['The quiet of a 40-shot rally.','Rally Machine']]},
  {q:'Your partner calls "Yours!"',a:[['Already in the air.','Smasher'],['Already at the net.','Net Ninja'],['Dive. It\'s coming back.','The Wall'],['Hold it. Make them guess.','Trickster'],['Clear it deep and reset.','Rally Machine']]},
  {q:'What do you practise when no one is watching?',a:[['Jump timing.','Smasher'],['Footwork to the front.','Net Ninja'],['Defence drills.','The Wall'],['Deception.','Trickster'],['Consistency, again and again.','Rally Machine']]},
  {q:'After the session you are…',a:[['Replaying that one smash.','Smasher'],['Still talking about that net kill.','Net Ninja'],['Last to leave. One more game.','The Wall'],['Teaching someone your fake.','Trickster'],['Fine. Could go another two hours.','Rally Machine']]}
];

const S={memCfg:{},members:{},site:{},codes:{},payCfg:{},payments:{},uid:null,canEdit:false,db:null,mcp:null,profiles:{},ledger:[],requests:{},sessions:{},bookings:{},posts:{},noshows:{},contacts:{},brand:{},loaded:false,view:'card',sport:'all',clubFilter:'all'};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keyOf=s=>String(s||'').trim().toLowerCase();
const slug=s=>keyOf(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'x';
function toast(m){const t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,3200)}
function hash(s){let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h}
function memberNo(k){return 'BAD-'+String(hash(k)%9000+1000)}
/* referral code: NAME#NUMBER, e.g. KENNY#08. Typing it without the # also works. */
const normCode=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
/* reserve a code for good in refcodes/{CODE}: first come, first served, never reused */
async function claimRef(uid,base){const db=S.db;if(!db||!db.runTransaction)return base;
  for(let i=0;i<27;i++){const c=i?base+String.fromCharCode(64+i):base,ref=db.doc('refcodes/'+normCode(c));
    try{await db.runTransaction(async t=>{const d=await t.get(ref);if(d.exists){if(d.data().uid!==uid)throw new Error('taken')}else t.set(ref,{uid,code:c,at:new Date().toISOString()})});return c}
    catch(e){if(e&&e.message==='taken')continue;console.warn('refcode claim',e);return base}}
  return base+'-'+String(Date.now()).slice(-4)}
const refsOf=p=>[p.ref,...(p.refs||[])].filter(Boolean);
function refCode(uid,p){const n=String(p?.nickname||'BAD').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,10)||'BAD',num=String(p?.number??'').replace(/\D/g,'');
  const base=`${n}#${num===''?String(hash(uid)%90+10):num.padStart(2,'0')}`;let c=base,i=0;
  const taken=x=>Object.entries(S.profiles||{}).some(([id,q])=>id!==uid&&refsOf(q).some(r=>normCode(r)===normCode(x)))||((S.codes||{})[normCode(x)]);
  while(taken(c)&&i<25)c=base+String.fromCharCode(65+i++);return c}
const jersey=p=>(p.number===''||p.number==null)?'00':String(p.number).padStart(2,'0');
const at=(date,time)=>new Date(`${date}T${time||'20:00'}:00+04:00`);
const dParts=iso=>{const d=new Date(iso+'T12:00:00+04:00');return{d:d.getUTCDate(),m:MON[d.getUTCMonth()],w:DOW[d.getUTCDay()]}};
const fmtTime=t=>{const [h,m]=String(t||'20:00').split(':').map(Number);return `${((h+11)%12)+1}${m?':'+String(m).padStart(2,'0'):''}${h<12?'am':'pm'}`};
const sportOf=k=>SPORTS[k]||SPORTS.badminton;
const mainSport=p=>(p&&p.primary)||(p&&p.sports&&p.sports[0])||'badminton';
const typeOf=p=>{const sp=mainSport(p);return (p.types&&p.types[sp])||(sp==='badminton'?p.style:'')||''};

/* ---------- points ---------- */
function profileByKey(k){return Object.entries(S.profiles).find(([,p])=>p.listKey===k)}
function myProfile(){return S.uid?S.profiles[S.uid]:null}
function allKeys(){const m={};for(const e of S.ledger)if(!m[e.player])m[e.player]=e.name||e.player;for(const p of Object.values(S.profiles))if(p.listKey&&!m[p.listKey])m[p.listKey]=p.listName||p.nickname;return m}

/* ---------- card (minimal) ---------- */
function avatar(p,fallback){if(!p)return `<div class="av none" aria-hidden="true">${esc((fallback||'?')[0].toUpperCase())}</div>`;return `<div class="av ${esc(p.edition||'oncourt')}" aria-hidden="true">${p.photo?`<img src="${esc(p.photo)}" alt="">`:esc(jersey(p))}</div>`}
function cardHTML(p,st,opt){
  const cu=uidOfProfile(p),ed=cardEdition(p,cu),lvlUp=cu&&levelIdx(cu)>=1,member=lvlUp;
  const edName=cardEdLabel(p,cu),sp=mainSport(p),ty=typeOf(p);
  const logo=ed==='oncourt'||ed==='legend'?LOGO.badW:LOGO.badK;
  const img=p.photo||PH[hash(p.listKey||p.nickname||'BAD')%PH.length];
  return `<div class="pc ${ed}${opt&&opt.qr&&p.ref?' hasqr':''}"><div class="ph${p.photo?'':' placeholder'}" style="background-image:url('${esc(img)}')"></div>
    <div class="hd"><span><img src="${logo}" alt="BAD">${esc(edName)}</span><span class="num">${(()=>{const u=uidOfProfile(p),m=u?memStatus(u):null;return m&&m.state==='verified'&&m.type!=='Guest'?`<span class="mv">${ic('check')}${esc(m.type)}</span>`:'Guest'})()}</span></div>
    <div class="jn num" aria-hidden="true">${esc(jersey(p))}</div>
    <div class="nick">${esc(p.nickname||'Your name')}</div>
    <div class="style">${ic(sportOf(sp).icon)}${esc(ty||sportOf(sp).club)}</div>
    <div class="stats s4"><div><b class="num">${isFounder(cu)?'<span class="inf">∞</span>':(st.balance||0)}</b>Points</div><div><b class="num">${st.badges||0}</b>BADges</div><div><b>${esc(p.shot||'—')}</b>Signature</div><div><b>${esc(lvlOf(p,sp)==null?'—':LEVEL_SHORT[lvlOf(p,sp)])}</b>Level</div></div>
    <div class="ft"><span class="sps">${(p.sports&&p.sports.length?p.sports:['badminton']).map(s=>ic(sportOf(s).icon)).join('')}</span>${opt&&opt.qr&&p.ref&&typeof qrData==='function'&&qrData(inviteUrl(p.ref))?`<span class="cqr"><span class="num">${esc(p.ref)}</span><img src="${qrData(inviteUrl(p.ref))}" alt="Invite QR code"></span>`:`<span class="num">${member?memberNo(p.listKey||p.nickname):'Est. 2024'}</span>`}</div>
  </div>`;
}

/* ---------- photo: always black and white ---------- */
function bwFromImg(img){const s=360,c=document.createElement('canvas');c.width=s;c.height=s;const x=c.getContext('2d');
  const m=Math.min(img.width,img.height);x.drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,s,s);
  const d=x.getImageData(0,0,s,s),a=d.data;for(let i=0;i<a.length;i+=4){let y=.299*a[i]+.587*a[i+1]+.114*a[i+2];y=Math.max(0,Math.min(255,(y-128)*1.12+128));a[i]=a[i+1]=a[i+2]=y}
  x.putImageData(d,0,0);return c.toDataURL('image/jpeg',.72)}
function toBW(file){return new Promise((res,rej)=>{const r=new FileReader();r.onerror=rej;r.onload=()=>{const img=new Image();img.onerror=rej;img.onload=()=>{try{res(bwFromImg(img))}catch(e){rej(e)}};img.src=r.result};r.readAsDataURL(file)})}
/* full black-and-white source (keeps shape) for the cropper */
function bwSource(img,max=1100){const k=Math.min(1,max/Math.max(img.width,img.height)),w=Math.round(img.width*k),h=Math.round(img.height*k),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(img,0,0,w,h);
  const d=x.getImageData(0,0,w,h),a=d.data;for(let i=0;i<a.length;i+=4){let y=.299*a[i]+.587*a[i+1]+.114*a[i+2];y=Math.max(0,Math.min(255,(y-128)*1.12+128));a[i]=a[i+1]=a[i+2]=y}x.putImageData(d,0,0);return c.toDataURL('image/jpeg',.85)}
function loadImg(src,cors){return new Promise((res,rej)=>{const i=new Image();if(cors)i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=rej;i.src=src})}
/* account photo (e.g. Google) turned black and white; quietly skipped if the browser won't allow it */
function toBWUrl(url){return new Promise(res=>{if(!url)return res('');const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{res(bwSource(img))}catch(_){res('')}};img.onerror=()=>res('');img.src=url.replace(/=s\d+-c$/,'=s400-c')})}

/* referral codes: a member's personal code, or a club code made by admins */
function codeInfo(raw){const c=normCode(raw);if(!c)return null;
  const a=(S.codes||{})[c];if(a)return a.off?{kind:'off',code:c}:{kind:'club',code:c,label:a.label||'BAD club code',pts:0};
  for(const [uid,p] of Object.entries(S.profiles||{}))if(refsOf(p).some(r=>{const n=normCode(r);return n===c||n===c.replace(/^(.*\D)(\d)$/,'$10$2')}))return{kind:'member',code:c,uid,name:p.nickname||'a BADDIE'};
  return{kind:'none',code:c}}

/* ---------- membership: players pick a type, admins verify it ---------- */
const MEM_DEFAULT=[{k:'Guest',verify:false,d:'New, or dropping in now and then'},{k:'Baddie',verify:true,d:'Plays with us regularly'},{k:'Crew',verify:true,staff:true,d:'Helps run sessions and events'},{k:'Community Manager',verify:true,staff:true,admin:true,d:'Looks after the community'},{k:'Founder',verify:true,staff:true,admin:true,d:'Started BAD'}];
const MEM_OLD={'Drop-in':'Guest'};
const memTypes=()=>(S.memCfg&&S.memCfg.types&&S.memCfg.types.length)?S.memCfg.types:MEM_DEFAULT;
const memType=k=>memTypes().find(t=>t.k===(MEM_OLD[k]||k));
const memPick=()=>memTypes().filter(t=>!t.staff);
const memLabel=uid=>{const m=uid&&memStatus(uid);return m&&m.state==='verified'?m.type:'Guest'};
function memStatus(uid){const p=S.profiles[uid]||{},v=(S.members||{})[uid]||{},want=MEM_OLD[p.memReq?.type]||p.memReq?.type||'Guest',t=memType(want);
  if(v.type&&v.type===want)return{type:want,state:'verified',at:v.at};
  if(!t||!t.verify)return{type:want,state:'open'};
  if(v.declined===want)return{type:want,state:'declined'};
  return{type:want,state:'pending',at:p.memReq?.at}}
const uidOfProfile=p=>Object.keys(S.profiles||{}).find(k=>S.profiles[k]===p);

/* admin access: owner emails from config, plus anyone in admins/{email} */
const isAdminEmail=e=>{e=String(e||'').toLowerCase();return !!e&&((window.BAD_ADMINS||[]).map(x=>x.toLowerCase()).includes(e)||!!(S.admins||{})[e])};
const lvAdmin=k=>{const t=memType(k);return t&&('admin' in t)?!!t.admin:!!(MEM_DEFAULT.find(d=>d.k===k)||{}).admin};
const fmtD=x=>{if(!x)return'';const d=new Date(String(x).length===10?x+'T12:00:00':x);return isNaN(d)?String(x):d.toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Asia/Dubai'})};
const isFounder=uid=>!!uid&&memStatus(uid).state==='verified'&&memStatus(uid).type==='Founder';

/* back of the card: invite QR and code */
function cardBackHTML(p,st){
  const ed=cardEdition(p,uidOfProfile(p)),logo=ed==='oncourt'||ed==='legend'?LOGO.badW:LOGO.badK;
  const code=p.ref||'',qr=code&&typeof qrData==='function'?qrData(inviteUrl(code),400):'',uid=uidOfProfile(p),m=uid?memStatus(uid):null;
  const since=p.createdAt?new Date(p.createdAt).toLocaleDateString('en-GB',{month:'short',year:'numeric'}):'';
  return `<div class="pc ${ed} cback"><div class="hd"><span><img src="${logo}" alt="BAD">Invite</span><span class="num">${esc(jersey(p))}</span></div>
    <div class="qrbox">${qr?`<img src="${qr}" alt="QR code to join BAD with ${esc(p.nickname||'this')} card">`:`<span class="fine">QR appears once your card is saved</span>`}</div>
    <div class="cb-code num">${esc(code||'—')}</div>
    <div class="cb-sub">Scan to join BAD.<br>Use my code when you sign up.</div>
    <div class="ft"><span>${m&&m.state==='verified'?esc(m.type):'Guest'}</span><span class="num">${since?'Since '+esc(since):'Est. 2024'}</span></div>
  </div>`}

/* ---------- admin roles ----------
   owner: everything, set in config.js
   founder: everything, can add and remove admins (not owners)
   app: helps build the app: everything except managing admins
   cm: community manager for chosen sports: their sessions, courts, players and posts */
const ROLES={owner:{k:'Owner',d:'Full access. Set in the app settings file.'},founder:{k:'Founder admin',d:'Full access. Can add and remove admins.'},app:{k:'App admin',d:'Helps build the app. Everything except managing admins and the shop.'},cm:{k:'Community manager',d:'Runs their own sport: sessions, courts, players and posts.'}};
const myRole=()=>S.canEdit?((window.BAD_USER&&window.BAD_USER.role)||'owner'):'';
const mySports=()=>(window.BAD_USER&&window.BAD_USER.sports)||[];
const shopAdmin=()=>['owner','founder'].includes(myRole());
const fullAdmin=()=>['owner','founder','app'].includes(myRole());
const canManageAdmins=()=>['owner','founder'].includes(myRole());
const canSport=k=>fullAdmin()||(myRole()==='cm'&&mySports().includes(k||'badminton'));
const adminRec=e=>{e=String(e||'').toLowerCase();if((window.BAD_ADMINS||[]).map(x=>x.toLowerCase()).includes(e))return{role:'owner',sports:[]};const a=(S.admins||{})[e];return a?{role:a.role||'founder',sports:a.sports||[]}:null};
const roleLabel=r=>!r?'':r.role==='cm'?`Community manager · ${(r.sports||[]).map(k=>SPORTS[k]?.club||k).join(', ')||'no sport yet'}`:(ROLES[r.role]||{}).k||'Admin';
