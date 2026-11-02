/* ---------- BAD maths: session sizing, score checks, rotation and standings ----------
   Pure functions, no screen or database code, so they can be unit-tested (tests/badmath.test.mjs).
   The reasoning behind every rule is in the Badminton Queuing plan. */
const BADMATH=(()=>{
  const FORMATS={21:{target:21,cap:30,mins:12},30:{target:30,cap:35,mins:17}};
  const TARGET_GAMES=5;

  /* ---- session sizing ----
     average games each = 4·C·T / (N·d): every doubles game gives 4 player-games */
  const gamesEach=(N,C,T,d)=>N>0&&d>0?4*C*T/(N*d):0;
  /* games still needed to bring everyone present up to the target, and the time that takes */
  function shortfall(games,target=TARGET_GAMES){return games.reduce((s,g)=>s+Math.max(0,target-g),0)}
  function timeNeeded(S,C,d){const K=Math.ceil(S/4);return C>0?d*Math.ceil(K/C):Infinity}
  /* advice for crew: null when everyone can still reach the target in the time left */
  function advice({games,courts,minsLeft,d,target=TARGET_GAMES}){
    const S=shortfall(games,target);if(!S)return {ok:true,S:0};
    const need=timeNeeded(S,courts,d),needMore=timeNeeded(S,courts+1,d);
    return need<=minsLeft?{ok:true,S,need}:{ok:false,S,need,extend:Math.ceil((need-minsLeft)/5)*5,withCourt:needMore,courtEnough:needMore<=minsLeft}}

  /* ---- scores ----
     valid final scores: win at the target by 2+, or by exactly 2 past it, or at the cap by 1 or 2 */
  function validScore(fmt,x,y){const f=FORMATS[fmt];if(!f)return false;
    if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x===y)return false;
    const w=Math.max(x,y),l=Math.min(x,y);
    return (w===f.target&&l<=f.target-2)||(w>f.target&&w<f.cap&&w-l===2)||(w===f.cap&&l>=f.cap-2)}
  function scoreHint(fmt,x,y){const f=FORMATS[fmt];if(!f)return 'Pick 21 or 30 points first.';
    if(x===''||y===''||x==null||y==null)return 'Enter both scores.';
    x=Number(x);y=Number(y);if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0)return 'Scores are whole numbers.';
    if(x===y)return 'Badminton can’t end in a tie.';
    const w=Math.max(x,y),l=Math.min(x,y);
    if(w<f.target)return `A ${f.target}-point game ends at ${f.target} or more.`;
    if(w>f.cap)return `${f.cap} is the most a ${f.target}-point game can reach.`;
    if(w===f.target&&l>f.target-2)return `At ${f.target-1}–${f.target-1} you need a 2-point lead to win.`;
    if(w>f.target&&w<f.cap&&w-l!==2)return `Past ${f.target}, the winner is exactly 2 points ahead.`;
    if(w===f.cap&&l<f.cap-2)return `A game only reaches ${f.cap} from ${f.cap-1}–${f.cap-1} or ${f.cap-2}–${f.cap-1}.`;
    return '';}
  /* points scaled to a 21-point game, so mixed formats compare fairly in the tiebreak */
  const scaled=(s,fmt)=>s*21/(FORMATS[fmt]?FORMATS[fmt].target:21);

  /* ---- rotation ----
     players: [{id, g: games this session, base: lowest count when they arrived (late-arrival credit),
                since: when they became free (ms), deferred: times passed over, rating, cat}]
     history: past and prepared lineups [{a:[id,id], b:[id,id]}] */
  const eff=p=>Math.max(p.g||0,(p.base||0)-1);
  function order(players){return [...players].sort((x,y)=>eff(x)-eff(y)||(x.since||0)-(y.since||0)||String(x.id).localeCompare(String(y.id)))}
  function counts(history){const part={},opp={},key=(x,y)=>x<y?x+'|'+y:y+'|'+x;
    for(const m of history){for(const t of [m.a,m.b])if(t&&t.length===2){const k=key(t[0],t[1]);part[k]=(part[k]||0)+1}
      if(m.a&&m.b)for(const x of m.a)for(const y of m.b){const k=key(x,y);opp[k]=(opp[k]||0)+1}}
    return {part,opp,key}}
  const W={balance:30,partner:10000,opponent:3,mix:2,depth:5};
  /* the cheapest of the 3 ways to split four players into two teams */
  function pairing(four,cnt,fallbackRating){
    const r=p=>typeof p.rating==='number'?p.rating:fallbackRating;
    let best=null;
    for(const [i,j,k,l] of [[0,1,2,3],[0,2,1,3],[0,3,1,2]]){
      const a=[four[i],four[j]],b=[four[k],four[l]];
      const bal=Math.abs(r(a[0])+r(a[1])-r(b[0])-r(b[1]));
      const P=(cnt.part[cnt.key(a[0].id,a[1].id)]||0)+(cnt.part[cnt.key(b[0].id,b[1].id)]||0);
      let O=0;for(const x of a)for(const y of b)O+=cnt.opp[cnt.key(x.id,y.id)]||0;
      const w=t=>t.filter(p=>p.cat==='W').length,M=w(a)!==w(b)?1:0;
      const cost=W.balance*bal+W.partner*P+W.opponent*O+W.mix*M;
      if(!best||cost<best.cost)best={a:a.map(p=>p.id),b:b.map(p=>p.id),cost,bal,P,O,M}}
    return best}
  /* pick the next four: fairness first (fewest games, longest wait, nobody skipped twice), then the best teams */
  function pickFour(players,history,poolSize=8){
    const q=order(players);if(q.length<4)return null;
    const known=q.map(p=>p.rating).filter(x=>typeof x==='number'),avg=known.length?known.reduce((s,x)=>s+x,0)/known.length:3;
    const cnt=counts(history),pool=q.slice(0,poolSize),e4=eff(q[3]);
    const must=pool.filter(p=>eff(p)<e4).map(p=>p.id);
    const forced=pool.filter(p=>eff(p)===e4&&(p.deferred||0)>0).map(p=>p.id);
    if(!must.includes(pool[0].id)&&!forced.includes(pool[0].id))forced.unshift(pool[0].id);
    const req=[...must,...forced].slice(0,4);
    let best=null;const n=pool.length;
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)for(let k=j+1;k<n;k++)for(let l=k+1;l<n;l++){
      const four=[pool[i],pool[j],pool[k],pool[l]],ids=four.map(p=>p.id);
      if(four.some(p=>eff(p)>e4))continue;                 /* never skip a player with fewer games */
      if(req.some(id=>!ids.includes(id)))continue;         /* first in line and anyone passed over before */
      const pr=pairing(four,cnt,avg),cost=pr.cost+W.depth*(i+j+k+l-6);
      if(!best||cost<best.cost)best={...pr,cost,last:l}}
    if(!best){const pr=pairing(q.slice(0,4),cnt,avg);best={...pr,last:3}}
    const chosen=new Set([...best.a,...best.b]);
    /* players at the same level who were passed over must go next time */
    const deferred={};for(const p of pool.slice(0,best.last+1))deferred[p.id]=chosen.has(p.id)?0:(eff(p)===e4?(p.deferred||0)+1:(p.deferred||0));
    return {a:best.a,b:best.b,cost:best.cost,bal:best.bal,P:best.P,O:best.O,deferred}}

  /* ---- standings ----
     games: [{a:[ids], b:[ids], score:[sa,sb], fmt}] (final results only) */
  function standings(games){
    const t={};const row=id=>t[id]||(t[id]={id,played:0,wins:0,losses:0,pf:0,pa:0,sp:0});
    for(const g of games){if(!g||!g.score)continue;const [sa,sb]=g.score.map(Number);
      for(const [team,mine,theirs] of [[g.a,sa,sb],[g.b,sb,sa]])for(const id of team){const r=row(id);r.played++;
        if(mine>theirs)r.wins++;else r.losses++;r.pf+=mine;r.pa+=theirs;r.sp+=scaled(mine,g.fmt)}}
    const rows=Object.values(t).map(r=>({...r,diff:r.pf-r.pa,pct:r.played?r.wins/r.played:0,sp:Math.round(r.sp*10)/10}));
    /* most wins, then most scaled points, then fewer games played (same result in fewer chances). Names never decide. */
    const cmp=(x,y)=>y.wins-x.wins||y.sp-x.sp||x.played-y.played;
    rows.sort((x,y)=>cmp(x,y)||String(x.id).localeCompare(String(y.id)));
    let rank=0;rows.forEach((r,i)=>{if(i===0||cmp(rows[i-1],r)!==0)rank=i+1;r.rank=rank});
    return rows}
  const winners=rows=>rows.filter(r=>r.rank===1&&r.played>0).map(r=>r.id);

  return {FORMATS,TARGET_GAMES,gamesEach,shortfall,timeNeeded,advice,validScore,scoreHint,scaled,eff,order,pairing,pickFour,standings,winners,W};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BADMATH;
