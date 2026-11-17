// =====================================================================
// LION'S SHARE: a full deckbuilder built on an I-cut-you-choose market.
// Each turn ends with you revealing market cards and cutting them into two
// piles, one card face down. Your opponent shops from one pile; the other
// pile is yours next turn. Taking a pile only to block costs you: use
// nothing from it and the cutter scores a point per card (or, as a variant,
// gets the pile too).
// The market runs through three ages over a fixed 14 rounds.
// =====================================================================
const LS_F={g:'Guild',b:'Blade',m:'Mystic'};
const LS_ROUNDS=14,LS_AGE_END=[4,9,14],LS_CUT=5,LS_PU=1;
const LS_AGE_NAME=['Age I','Age II','Age III'];
const lsAgeOf=r=>r<=LS_AGE_END[0]?0:r<=LS_AGE_END[1]?1:2;
const LSC={
  copper:{n:'Copper',c:1,art:'◉',plain:1},
  militia:{n:'Militia',m:1,art:'↟',plain:1},
  tribute:{n:'Tribute',pay:4,gain:1,art:'⚖',txt:'Pay 4 coins: +1 point. Once per turn.'},
  patrol:{n:'Patrol',use:3,gain:1,art:'⚑',txt:'Spend 3 might: +1 point. Once per turn.'},
  // Guild: coins
  peddler:{n:'Peddler',cost:2,f:'g',c:1,art:'◑',txt:'Follow-up: draw 1.'},
  broker:{n:'Broker',cost:3,f:'g',c:2,art:'⚭',txt:'Follow-up: +1 coin.'},
  haggler:{n:'Haggler',cost:3,f:'g',c:1,art:'%',txt:'Your next buy this turn costs 2 less.'},
  fence:{n:'Fence',cost:4,f:'g',c:2,art:'✂',txt:'You may banish a card from your hand or play area.'},
  banker:{n:'Banker',cost:5,f:'g',c:2,art:'♦',txt:'+1 coin for each other Guild card you’ve played this turn.'},
  patron:{n:'Patron',cost:6,f:'g',c:3,vp:2,art:'❂'},
  // Blade: might
  scout:{n:'Scout',cost:2,f:'b',m:2,art:'➶'},
  duelist:{n:'Duelist',cost:3,f:'b',m:2,art:'†',txt:'Follow-up: +2 might.'},
  vanguard:{n:'Vanguard',cost:3,f:'b',m:2,art:'➤',txt:'If this is the first card you play this turn: +2 might.'},
  recruiter:{n:'Recruiter',cost:4,f:'b',m:2,art:'⚐',txt:'Your next buy this turn goes on top of your deck.'},
  looter:{n:'Looter',cost:4,f:'b',m:2,art:'⚒',txt:'+1 coin for each foe you defeat later this turn.'},
  captain:{n:'Captain',cost:5,f:'b',m:3,art:'✠',txt:'+1 might for each other Blade card you’ve played this turn.'},
  warlord:{n:'Warlord',cost:6,f:'b',m:4,vp:2,art:'✪'},
  champion:{n:'Champion',cost:8,f:'b',m:6,vp:3,art:'♘'},
  // Mystic: cards and tricks
  seer:{n:'Seer',cost:3,f:'m',c:1,art:'⊙',txt:'Draw 1.'},
  adept:{n:'Adept',cost:3,f:'m',art:'◐',txt:'Choose: +2 coins or +2 might.'},
  surveyor:{n:'Surveyor',cost:3,f:'m',c:1,m:1,art:'⌖',txt:'When you cut this turn, reveal 1 more card.'},
  sage:{n:'Sage',cost:4,f:'m',c:1,m:1,art:'✦',txt:'Follow-up: draw 2.'},
  mimic:{n:'Mimic',cost:4,f:'m',art:'❏',txt:'The next card you play is played twice.'},
  oracle:{n:'Oracle',cost:5,f:'m',art:'☾',txt:'Draw 3.'},
  archmage:{n:'Archmage',cost:7,f:'m',c:2,m:2,vp:3,art:'✹'},
  // Prizes: points only
  statue:{n:'Statue',cost:5,vp:2,art:'♖',dead:1},
  monument:{n:'Monument',cost:7,vp:4,art:'▲',dead:1},
  crown:{n:'Crown',cost:9,vp:6,art:'♔',dead:1},
  // Foes
  goblin:{n:'Goblin',need:2,pts:1,gc:1,art:'⊛',txt:'Then +1 coin.'},
  wolf:{n:'Wolf',need:3,pts:2,art:'☗'},
  brigand:{n:'Brigand',need:4,pts:2,art:'☋',txt:'Then you may banish a card from your hand or play area.'},
  troll:{n:'Troll',need:5,pts:3,art:'⛰',txt:'Then draw 1.'},
  wraith:{n:'Wraith',need:6,pts:4,art:'☠'},
  giant:{n:'Giant',need:7,pts:5,art:'♉'},
  dragon:{n:'Dragon',need:9,pts:7,art:'⚸'},
  thief:{n:'Thief',need:2,pts:1,threat:1,art:'☂'},
  raiders:{n:'Raiders',need:4,pts:2,threat:2,art:'☄'},
  warband:{n:'Warband',need:5,pts:3,threat:2,art:'⚉'},
};
// What each age's market deck holds. Costs and foes climb; points arrive in Age III.
const LS_AGES=[
  {peddler:4,broker:4,haggler:3,fence:3,scout:4,duelist:4,vanguard:3,recruiter:2,seer:4,adept:4,surveyor:2,sage:2,goblin:5,wolf:4,thief:2},
  {broker:2,haggler:2,fence:3,banker:4,patron:2,duelist:2,recruiter:3,looter:3,captain:4,warlord:2,adept:1,surveyor:2,sage:3,mimic:3,oracle:4,statue:2,
    wolf:3,brigand:4,troll:4,wraith:3,raiders:2},
  {fence:2,banker:2,patron:4,looter:2,captain:2,warlord:4,champion:2,sage:2,mimic:2,oracle:2,archmage:3,statue:4,monument:4,crown:2,
    brigand:2,troll:3,wraith:5,giant:4,dragon:3,warband:2},
];
const LS_ALWAYS=['tribute','patrol'];
const lsPl=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
for(const d of Object.values(LSC)){
  d.art+=T;
  const bits=[],star=d.vp||d.pts||d.gain;
  const pts=star?`<span class="ls-pts">★${T} ${star}</span>`:'';
  if(d.need){
    d.kind='e';bits.push(`Defeat with ${d.need} might: +${lsPl(d.pts,'point')}.`);
    if(d.threat)bits.push(`Threat: if it’s still in your shop when your turn ends, your opponent gets ${lsPl(d.threat,'point')}.`);
    d.face=`<span class="glyph">${d.art}</span>${pts}<span class="might">⚔${T} ${d.need}</span>`;
  }else{
    d.kind=d.use?'e':d.f?{g:'b',m:'c',b:'d'}[d.f]:'a';
    if(d.c)bits.push(`+${lsPl(d.c,'coin')}.`);
    if(d.m)bits.push(`+${d.m} might.`);
    if(d.vp)bits.push(`Worth ${lsPl(d.vp,'point')}.`);
    d.face=`<span class="glyph">${d.art}</span>${pts}${d.f?`<span class="fac">${LS_F[d.f]}</span>`:d.use?`<span class="might">⚔${T} ${d.use}</span>`:''}`;
  }
  if(d.txt)bits.push(d.txt);
  d.txt=bits.join(' ');
  if(d.pay)d.cost=d.pay;
}
const lsDeck=a=>shuffle(Object.entries(LS_AGES[a]).flatMap(([k,n])=>rep(k,n)));
const lsOwned=(st,i)=>{const P=st.players[i];return P.deck.concat(P.discard,P.hand,st.turn===i?st.played:[])};
const lsScore=(st,i)=>st.players[i].pts+lsOwned(st,i).reduce((s,k)=>s+(LSC[k].vp||0),0);
// The player who is behind sees the face-down card before picking.
const lsPeek=(st,i)=>!LS_TUNE.nopeek&&lsScore(st,i)<lsScore(st,1-i);
const lsTax=st=>st.unused!=='bounce';
const lsLastCut=st=>st.turn===0&&st.round>=LS_ROUNDS;
const lsFresh=()=>({coin:0,might:0,lastF:null,cnt:{g:0,b:0,m:0},n:0,twice:0,disc:0,loot:0,top:false,extra:0,draws:0,pending:[],used:{},took:false});

// ---------- playing a card ----------
// One resolution of a card's effect. Works on the game state and on the bot's scratch copies alike.
function lsFx(S,k){
  const d=LSC[k],fu=!!d.f&&S.lastF===d.f;
  if(d.f)S.cnt[d.f]++;
  let c=d.c||0,m=d.m||0;
  switch(k){
    case 'peddler':if(fu)S.draws++;break;
    case 'broker':if(fu)c++;break;
    case 'duelist':if(fu)m+=2;break;
    case 'sage':if(fu)S.draws+=2;break;
    case 'vanguard':if(S.n===0)m+=2;break;
    case 'banker':c+=S.cnt.g-1;break;
    case 'captain':m+=S.cnt.b-1;break;
    case 'seer':S.draws++;break;
    case 'oracle':S.draws+=3;break;
    case 'haggler':S.disc+=2;break;
    case 'recruiter':S.top=true;break;
    case 'looter':S.loot++;break;
    case 'surveyor':S.extra++;break;
    case 'fence':S.pending.push('banish');break;
    case 'adept':S.pending.push('adept');break;
    case 'mimic':S.twice++;break;
  }
  S.coin+=c;S.might+=m;S.lastF=d.f||null;
  return fu&&/Follow-up/.test(d.txt);
}
function lsPlayS(S,k){
  const tw=S.twice>0&&k!=='mimic';
  if(tw)S.twice--;
  let fu=lsFx(S,k);
  if(tw)fu=lsFx(S,k)||fu;
  S.n++;
  return {fu,tw};
}
function lsGain(st,i,pts,quiet){
  st.players[i].pts+=pts;
  if(!quiet)pop(i,`+${lsPl(pts,'point')}`);
}
const lsPrice=(st,k)=>LSC[k].pay||Math.max(0,LSC[k].cost-st.disc);
function lsReveal(st,n){
  const a=lsAgeOf(st.turn===1?st.round+1:st.round),d=st.mk[a];
  if(d.length<n)d.unshift(...lsDeck(a));
  return {cards:d.splice(d.length-n,n),age:a};
}

// ---------- bot: valuing cards ----------
// Test hooks for the sim harness: LS_TUNE.persona[seat], .cut[seat]='rand', .pick[seat]='rand'.
const LS_TUNE={};
const LS_PERSONAS=[{wc:1.15,wm:.85},{wc:1,wm:1},{wc:1.1,wm:.95}];
function lsPersona(st,i){
  if(LS_TUNE.persona&&LS_TUNE.persona[i])return LS_TUNE.persona[i];
  st.bp=st.bp||[null,null];
  if(!st.bp[i])st.bp[i]=LS_PERSONAS[rnd(LS_PERSONAS.length)];
  return st.bp[i];
}
// Rough coins and might a card adds to a hand.
function lsStat(k,X){
  const d=LSC[k],pf=X.pf,dc=X.avgC,dm=X.avgM;let c=d.c||0,m=d.m||0;
  switch(k){
    case 'peddler':c+=dc*pf.g;m+=dm*pf.g;break;
    case 'broker':c+=pf.g;break;
    case 'duelist':m+=2*pf.b;break;
    case 'vanguard':m+=1.5;break;
    case 'banker':c+=4*X.sh.g;break;
    case 'captain':m+=4*X.sh.b;break;
    case 'adept':c+=1;m+=1;break;
    case 'seer':c+=dc;m+=dm;break;
    case 'sage':c+=2*dc*pf.m;m+=2*dm*pf.m;break;
    case 'oracle':c+=3*dc;m+=3*dm;break;
    case 'mimic':c+=1.6*dc+.3;m+=1.6*dm+.2;break;
    case 'haggler':c+=1.4;break;
    case 'looter':c+=.6;break;
  }
  return {c,m};
}
// Everything the bot needs to know about one seat's deck to value cards for it.
function lsCtx(st,i,per){
  const all=lsOwned(st,i),n=all.length,cnt={g:0,b:0,m:0},pf={},sh={};
  for(const k of all){const f=LSC[k].f;if(f)cnt[f]++}
  for(const f in cnt){sh[f]=cnt[f]/n;pf[f]=1-Math.pow(1-(cnt[f]+.5)/(n+1),3.5)}
  const buyR=st.turn===i||i===1?st.round:st.round+1,Tl=Math.max(0,LS_ROUNDS-buyR);
  per=per||{wc:1,wm:1};
  const X={n,cnt,pf,sh,T:Tl,wc:per.wc,wm:per.wm,pu:per.pu,plays:Math.max(0,Math.min(Tl,Tl*5.5/(n+1)-.4)),avgC:.8,avgM:.3,thin:n>7?1:0};
  let c=0,m=0;
  for(const k of all){const s=lsStat(k,X);c+=s.c;m+=s.m}
  X.avgC=c/n;X.avgM=m/n;
  return X;
}
function lsWorth(k,X){
  const d=LSC[k];
  if(d.need)return d.pts+(k==='brigand'&&X.T>3?.6:0)+(k==='troll'?.4:0);
  if(d.gain)return d.gain;
  const s=lsStat(k,X),u=X.wc*s.c+X.wm*s.m+(k==='fence'?X.thin:0)+(k==='recruiter'?.4:0)+(k==='surveyor'?.7:0);
  // A card takes a slot in a future hand, so it is only worth what it adds over the average card it crowds out.
  return (d.vp||0)+(u-(X.wc*X.avgC+X.wm*X.avgM))*X.plays*(X.pu||LS_PU);
}
// Best set of buys and fights from `shop` ([{k,s}]) with c coins and m might.
// o: {disc, loot, used, must}; must = the set has to include a card from the pile picked this turn. Returns {v, set:[{i,k}]} where i is the shop index, or -1 for an always-available card.
function lsPlan(shop,c,m,X,o){
  o=o||{};
  const disc=o.disc||0,loot=o.loot||0,used=o.used||{},must=o.must;
  let items=[],base=0;
  shop.forEach((e,i)=>{
    const d=LSC[e.k];
    if(d.need){
      if(d.threat)base-=d.threat;
      if(d.need<=m)items.push({i,k:e.k,p:e.s==='p',cost:0,need:d.need,foe:1,gc:d.gc||0,v:lsWorth(e.k,X)+(d.threat||0)});
    }else if(d.cost-disc<=c+loot*2+1){
      const v=lsWorth(e.k,X);
      if(v>.02||(must&&e.s==='p'))items.push({i,k:e.k,p:e.s==='p',cost:d.cost,need:0,card:1,v});
    }
  });
  if(items.length>9)items=items.sort((a,b)=>b.v-a.v).slice(0,9);
  if(!used.tribute&&c+loot*2>=4)items.push({i:-1,k:'tribute',cost:4,need:0,v:1});
  if(!used.patrol&&m>=3)items.push({i:-1,k:'patrol',cost:0,need:3,v:1});
  const n=items.length;let best=must?-99:0,bm=0;
  for(let mask=1;mask<(1<<n);mask++){
    let cost=0,need=0,v=0,foes=0,mx=0,pk=0,gc=0;
    for(let j=0;j<n;j++)if(mask>>j&1){
      const it=items[j];cost+=it.cost;need+=it.need;v+=it.v;
      if(it.foe){foes++;gc+=it.gc}
      if(it.p)pk++;
      if(it.card&&it.cost>mx)mx=it.cost;
    }
    if(need>m||(must&&!pk))continue;
    cost-=Math.min(disc,mx);
    if(cost>c+loot*foes+gc)continue;
    if(v>best){best=v;bm=mask}
  }
  const set=items.filter((_,j)=>bm>>j&1);
  return {v:base+(bm?best:0),set,took:set.some(it=>it.p)};
}
// Best order to play a hand from the current turn state. Plain cards go last; the rest are searched.
function lsBestOrder(st,hand,X){
  const sp=[],pl=[];
  hand.forEach((k,i)=>(LSC[k].plain?pl:sp).push(i));
  const start={coin:st.coin||0,might:st.might||0,lastF:st.lastF||null,cnt:{...(st.cnt||{g:0,b:0,m:0})},n:st.n||0,twice:st.twice||0,disc:0,loot:0,top:false,extra:0,draws:0,pending:[]};
  const plainBest=pl.reduce((b,i)=>{const d=LSC[hand[i]],u=X.wc*(d.c||0)+X.wm*(d.m||0);return u>b?u:b},0);
  const score=(S,bonus)=>X.wc*S.coin+X.wm*S.might+S.draws*(X.wc*X.avgC+X.wm*X.avgM)*1.1+S.disc*.4+S.loot*.6+S.extra*.5+(S.top?.3:0)
    +S.pending.reduce((s,p)=>s+(p==='adept'?2*Math.max(X.wc,X.wm):.2),0)+(S.twice>0?plainBest:0)+bonus;
  let best=null;
  const rest=sp.slice(0,7);
  (function go(S,left,first,bonus){
    if(!left.length){const v=score(S,bonus);if(!best||v>best.v)best={v,first,S};return}
    const seen={};
    for(let j=0;j<left.length;j++){
      const k=hand[left[j]];if(seen[k])continue;seen[k]=1;
      const N={...S,cnt:{...S.cnt},pending:S.pending.slice()},d0=N.draws;
      lsPlayS(N,k);
      go(N,left.filter((_,x)=>x!==j),first<0?left[j]:first,bonus+(N.draws>d0?.01*left.length:0));
    }
  })(start,rest,-1,0);
  const S=best.S;
  for(const i of pl){const d=LSC[hand[i]];S.coin+=d.c||0;S.might+=d.m||0}
  if(S.twice>0&&pl.length){const d=LSC[hand[pl[0]]];S.coin+=d.c||0;S.might+=d.m||0}
  return {first:best.first>=0?best.first:pl.length?pl[0]:0,S};
}
// Coins and might a hand should make, counting expected draws.
function lsYield(st,hand,X){
  const S=lsBestOrder(lsFresh(),hand,X).S,ad=S.pending.filter(p=>p==='adept').length;
  return {c:S.coin+S.draws*X.avgC+ad,m:S.might+S.draws*X.avgM+ad,disc:S.disc,loot:S.loot};
}
const lsAvg=X=>({c:X.avgC*5+.5,m:X.avgM*5+.5});
const lsLam=i=>LS_TUNE.lam&&LS_TUNE.lam[i]!=null?LS_TUNE.lam[i]:.7;

function lsBotPick(st,me){
  const o=st.offer,P=st.players[me],O=st.players[1-me];
  if(LS_TUNE.pick&&LS_TUNE.pick[me]==='rand')return rnd(2);
  const X=lsCtx(st,me,lsPersona(st,me)),XO=lsCtx(st,1-me),y=lsYield(st,P.hand,X),oa=lsAvg(XO);
  const seen=o.hid<0||lsPeek(st,me),wasted=me===1&&st.round>=LS_ROUNDS;
  const mine=P.reserve.map(k=>({k,s:'o'})),opt={disc:y.disc,loot:y.loot},lam=lsLam(me);
  const pool=Object.entries(LS_AGES[o.age]);
  const val=[0,1].map(p=>{
    const vis=[],other=[];
    o.cards.forEach((k,i)=>{if(o.assign[i]===p){if(seen||i!==o.hid)vis.push({k,s:'p'})}else if(seen||i!==o.hid)other.push({k,s:'o'})});
    // If I use nothing from the pile, the cutter gets it back along with the other one.
    const net=pile=>{
      const pl=lsPlan(pile.concat(mine),y.c,y.m,X,opt);
      const unused=pl.took?[]:pile.filter(e=>!LSC[e.k].threat);
      if(lsTax(st))return pl.v-(wasted?0:unused.length+lam*lsPlan(other,oa.c,oa.m,XO).v);
      const left=other.concat(unused.map(e=>({k:e.k,s:'o'})));
      return pl.v-(wasted?0:lam*lsPlan(left,oa.c,oa.m,XO).v);
    };
    if(seen||o.assign[o.hid]!==p)return net(vis);
    let s=0,w=0;
    for(const [k,n] of pool){s+=n*net(vis.concat({k,s:'p'}));w+=n}
    return s/w;
  });
  return val[1]>val[0]?1:0;
}
function lsBotCut(st,me){
  const c=st.cut,n=c.cards.length,P=st.players[me],O=st.players[1-me],full=(1<<n)-1;
  if(n<2){c.assign=c.cards.map(()=>0);c.hid=-1;return}
  if(LS_TUNE.cut&&LS_TUNE.cut[me]==='rand'){
    do{c.assign=c.cards.map(()=>rnd(2))}while(!c.assign.includes(0)||!c.assign.includes(1));
    c.hid=rnd(n);return;
  }
  const X=lsCtx(st,me,lsPersona(st,me)),XO=lsCtx(st,1-me),y=lsYield(st,P.hand,X),oa=lsAvg(XO);
  const wasted=lsLastCut(st),oppSees=lsScore(st,1-me)<lsScore(st,me),lam=lsLam(me);
  const theirs=O.reserve.map(k=>({k,s:'o'})),ownShop=(mask,s)=>c.cards.map((k,i)=>mask>>i&1?{k,s:s||'o',i}:null).filter(Boolean);
  const oppMemo={},myMemo={};
  let threats=0;
  c.cards.forEach((k,i)=>{if(LSC[k].threat)threats|=1<<i});
  // What the opponent would make of a pile on top of what they already hold, and what comes back to me if they use none of it.
  const oppPlan=mask=>{
    if(oppMemo[mask])return oppMemo[mask];
    const p=lsPlan(ownShop(mask,'p').concat(theirs),oa.c,oa.m,XO);
    return oppMemo[mask]={v:p.v,back:p.took?0:mask&~threats};
  };
  const myPlan=mask=>myMemo[mask]!==undefined?myMemo[mask]:(myMemo[mask]=lsPlan(ownShop(mask),y.c,y.m,X,{disc:y.disc,loot:y.loot}).v);
  // What a face-down card is worth to the opponent before they know what it is.
  let ps=0,pw=0;
  for(const [k,nn] of Object.entries(LS_AGES[c.age])){
    const d=LSC[k];
    ps+=nn*(d.need?(d.need<=oa.m?d.pts:-(d.threat||0)):d.cost<=oa.c?lsWorth(k,XO)*.5:0);pw+=nn;
  }
  const prior=ps/pw;
  let best=null;
  for(let mask=2;mask<full;mask+=2){
    const piles=[full^mask,mask],real=piles.map(oppPlan);
    const cnt=b=>{let n=0;for(;b;b&=b-1)n++;return n};
    const out=[0,1].map(k=>wasted?-lam*real[k].v:lsTax(st)?myPlan(piles[1-k])+cnt(real[k].back)-lam*real[k].v:myPlan(piles[1-k]|real[k].back)-lam*real[k].v);
    for(let h=0;h<n;h++){
      const hp=mask>>h&1;
      const seen=[0,1].map(k=>!oppSees&&k===hp?oppPlan(piles[k]&~(1<<h)).v+prior:real[k].v);
      const p=1/(1+Math.exp(-(seen[1]-seen[0])/.7));
      const s=(1-p)*out[0]+p*out[1]+rnd(100)/400;
      if(!best||s>best.s)best={s,mask,h};
    }
  }
  c.assign=c.cards.map((_,i)=>best.mask>>i&1);c.hid=best.h;
}

// ---------- view helpers ----------
const lsCard=(k,o={})=>cardHTML(LSC[k],{...o,foot:o.foot||(LSC[k].threat?`Threat ${LSC[k].threat}`:null)});
const lsRow=(label,html,cls)=>`<div class="cd-sec ${cls||''}"><div class="sub">${label}</div><div class="line">${html}</div></div>`;
function lsTrack(st){
  const a=lsAgeOf(st.round);
  return `<div class="ls-track" aria-label="${LS_AGE_NAME[a]}, round ${st.round} of ${LS_ROUNDS}">${[0,1,2].map(g=>{
    const from=g?LS_AGE_END[g-1]+1:1;let pips='';
    for(let r=from;r<=LS_AGE_END[g];r++)pips+=`<i class="${r<st.round?'done':r===st.round?'now':''}"></i>`;
    return `<span class="ls-age${g===a?' on':''}"><b>${LS_AGE_NAME[g]}</b>${pips}</span>`;
  }).join('')}</div>`;
}
// o: {edit, pick, seeHid, names}
function lsPilesHTML(c,o){
  return `<div class="piles">${[0,1].map(p=>{
    const idx=c.cards.map((_,i)=>i).filter(i=>c.assign[i]===p);
    const cards=idx.map((i,j)=>{
      const k=c.cards[i],hid=c.hid===i,st=`--i:${j+p*3}`,deal=FX.deal?' deal':'';
      if(hid&&!o.seeHid)return `<div class="card back sm ls-down${deal}" style="${st}" title="Face-down card"><span>?</span></div>`;
      const card=lsCard(k,{btn:o.edit,cls:`sm${deal}${o.edit?' movable':''}${hid?' ls-hid':''}`,style:st,badge:hid?'hidden':null,
        attrs:o.edit?`data-a="lsToggle" data-i="${i}" aria-label="Move ${LSC[k].n} to pile ${'BA'[p]}"`:''});
      return o.edit?`<div class="ls-slot">${card}<button class="btn small ls-hide${hid?' on':''}" data-a="lsHide" data-i="${i}" aria-pressed="${hid}" aria-label="Place ${LSC[k].n} face down">${hid?'Face down':'Hide'}</button></div>`:card;
    }).join('');
    return `<div class="pile p${'AB'[p]}">
      <div class="pile-h"><span class="pile-name">Pile ${'AB'[p]}</span><span class="chip">${lsPl(idx.length,'card')}</span></div>
      <div class="pile-cards">${cards||'<p class="empty">Tap cards to move them here</p>'}</div>
      ${o.pick?`<button class="btn primary" data-a="lsPick" data-i="${p}">Take pile ${'AB'[p]}</button>`:''}
    </div>`;
  }).join('')}</div>`;
}

const GAME={
  key:'lions-share',title:'Lion’s Share',
  hook:'A deckbuilder where nobody gets lucky in the market. You cut every reveal into two piles and hide one card. Your opponent takes a pile, and you shop from the other.',
  turn:['Pick one of the two piles your opponent cut. One of its cards may be face down until you take it.',
    'Play your hand one card at a time to make coins and might. Buy cards and defeat foes from your shop.',
    'Reveal 5 market cards, split them into two piles for your opponent, and place one card face down. The pile they leave is yours next turn.'],
  watch:'Do you ever agonise over a cut or a pick? Does the face-down card get used to bluff, and does it work? Do Guild, Blade and Mystic decks all feel winnable? Is 14 rounds the right length?',
  rules:[
    'You each have your own deck: 8 Coppers (+1 coin) and 2 Militia (+1 might) to start. You draw 5 cards each turn. Coins buy cards; might defeats foes for points.',
    'There is no shared market row. At the end of your turn you reveal 5 market cards and split them into two piles of at least one card each. One card of your choice goes face down.',
    'Your opponent picks one pile to shop from on their turn. The pile they leave is yours to shop from on your next turn, so cut it so you are happy either way.',
    'No blocking for free: if you buy or defeat nothing from the pile you took, your opponent scores 1 point per card in it (or, with the title-screen variant, gets the pile to shop from too). Otherwise, cards nobody buys are gone.',
    'Underdog: if you have fewer points than your opponent when you pick, you see the face-down card first.',
    'Threat foes are dangerous to hold. If one is still in your shop when your turn ends, your opponent gets the points shown.',
    'Follow-up bonuses trigger when the card you played just before is the same faction (Guild, Blade or Mystic). Play order matters.',
    'Nothing else is for sale: every card you add comes from a pile. Once per turn each you can also use Tribute (pay 4 coins for 1 point) and Patrol (spend 3 might for 1 point).',
    'Bought cards go to your discard pile, which is shuffled into a new deck when your deck runs out. Banish removes a card from your deck for good.',
    `The market moves through three ages: ${LS_AGE_NAME[0]} (rounds 1–${LS_AGE_END[0]}) is cheap cards and small foes, ${LS_AGE_NAME[1]} (rounds ${LS_AGE_END[0]+1}–${LS_AGE_END[1]}) is the strong cards, ${LS_AGE_NAME[2]} (rounds ${LS_AGE_END[1]+1}–${LS_ROUNDS}) is where most of the points are.`,
    `The game ends after round ${LS_ROUNDS}. Points from foes, Tribute and Patrol plus points printed on your cards; most wins.`,
  ],
  options:[{key:'unused',label:'If you use nothing from your pile',choices:[['tax','Opponent scores 1 per card'],['bounce','Opponent gets the pile']]}],
  tag:st=>LS_AGE_NAME[lsAgeOf(st.round)],
  maxRounds:LS_ROUNDS,
  score:lsScore,
  setup(o){
    const unused=o&&o.unused==='bounce'?'bounce':'tax';
    const mk=[0,1,2].map(lsDeck);
    const players=[0,1].map(()=>{const p={deck:shuffle([...rep('copper',8),...rep('militia',2)]),discard:[],hand:[],pts:0,reserve:[]};p.hand=draw(p,5);return p});
    const cards=mk[0].splice(mk[0].length-LS_CUT,LS_CUT);
    return {turn:0,round:1,unused,players,mk,offer:{cards,assign:shuffle([0,0,1,1,1]),hid:-1,age:0},phase:'choose',
      ...lsFresh(),shop:[],played:[],cut:null,
      log:['The opening cut was made at random. Seat 2 gets the pile seat 1 leaves.'],over:false,endTriggered:false};
  },
  view(st,ctx){
    const S=ctx.seat,A=st.turn,L=ctx.label,act=ctx.canAct,P=st.players,me=P[S],ap=P[A];
    const info=p=>`Deck ${p.deck.length} · discard ${p.discard.length}`;
    const v={oppInfo:`${info(P[1-S])} · hand ${P[1-S].hand.length}`,meInfo:info(me),arena:'',hand:'',actions:'',prompt:''};
    if(st.over)return v;
    const track=lsTrack(st);
    const peekHand=(label,hand)=>`<div class="peek-label">${label}</div>`+handHTML(hand.map(k=>({def:LSC[k],o:{cls:'peek'}})));
    const minis=(label,list)=>list.length?lsRow(label,list.map((k,i)=>lsCard(k,{cls:'mini',style:`--i:${i}`})).join(''),'ls-wait'):'';
    if(st.phase==='choose'){
      const o=st.offer,peek=o.hid>=0&&lsPeek(st,A),wasted=A===1&&st.round>=LS_ROUNDS;
      v.prompt=act?`${o.hid<0?'The opening cut was random.':`${L(1-A)} cut the market.`} Take a pile${wasted?'':`; ${L(1-A)} gets the other`}.`:`${L(A)} is picking a pile.`;
      v.arena=track+lsPilesHTML(o,{pick:act,seeHid:S!==A||peek})
        +(act&&o.hid>=0?`<p class="ls-note">${peek?'You’re behind on points, so you can see the face-down card.':'One card is face down. You’ll see it if you take that pile.'}</p>`:'')
        +(act?minis('Already in your shop',ap.reserve):'');
      v.hand=S===A?peekHand('Your hand',me.hand):peekHand('Your next hand',me.hand);
      return v;
    }
    if(st.phase==='cut'){
      const c=st.cut,wasted=lsLastCut(st);
      v.prompt=act?(wasted?`Final cut. ${L(1-A)} shops from one pile and the other is lost, so leave them as little as you can.`
        :`Cut the market for ${L(1-A)}. They take one pile; you shop from the other next turn.`):`${L(A)} is cutting the market.`;
      if(act){
        const X=lsCtx(st,A),y=lsYield(st,me.hand,X),oa=lsCtx(st,1-A);
        v.arena=track+lsPilesHTML(c,{edit:true,seeHid:true})
          +`<p class="ls-note">Tap a card to move it. Choose one to place face down${lsScore(st,1-A)<lsScore(st,A)?`, though ${L(1-A)} is behind and will see it`:''}.</p>`
          +minis(`Already in ${L(1-A)}’s shop`,P[1-A].reserve);
        v.actions=`<span class="hint">Your next hand ≈ ${Math.round(y.c)} coins, ${Math.round(y.m)} might · ${L(1-A)} averages ${(oa.avgC*5).toFixed(1)} / ${(oa.avgM*5).toFixed(1)}</span><button class="btn primary big" data-a="lsSend">Offer cut</button>`;
      }else v.arena=track;
      v.hand=peekHand('Your next hand',me.hand);
      return v;
    }
    // main phase
    const pend=st.pending[0],banish=act&&pend==='banish';
    const res=`<div class="res"><span class="r coin"><b>${st.coin}</b> coins</span><span class="r mi"><b>${st.might}</b> might</span></div>`
      +[st.twice?'<span class="chip gold">next card is played twice</span>':'',st.disc?`<span class="chip gold">next buy costs ${st.disc} less</span>`:'',
        st.top?'<span class="chip gold">next buy goes on top of your deck</span>':'',st.loot?`<span class="chip gold">+${lsPl(st.loot,'coin')} per foe defeated</span>`:'',
        st.extra?`<span class="chip gold">reveal ${LS_CUT+st.extra} when you cut</span>`:''].filter(Boolean).join('');
    const can=k=>{
      if(!act||pend)return false;const d=LSC[k];
      if(d.need)return st.might>=d.need;
      if(d.use)return !st.used.patrol&&st.might>=d.use;
      if(d.pay)return !st.used.tribute&&st.coin>=d.pay;
      return st.coin>=lsPrice(st,k);
    };
    const lastTurn=A===1&&st.round>=LS_ROUNDS,mustUse=!st.took&&!lastTurn&&st.shop.some(e=>e.s==='p');
    const shopCard=(e,i)=>{const d=LSC[e.k],ok=can(e.k),cut=!d.need&&st.disc&&ok;
      return lsCard(e.k,{btn:true,disabled:!ok,cls:`sm${ok?' glow':''}${e.s==='p'&&!st.took&&!lastTurn?' ls-ret':''}`,style:`--i:${i}`,badge:cut?`now ${lsPrice(st,e.k)}`:null,
        attrs:`data-a="lsGet" data-i="s${i}" aria-label="${d.need?'Defeat':'Buy'} ${d.n}"`})};
    const alwaysCard=(k,i)=>{const d=LSC[k],ok=can(k),once=d.gain,spent=once&&st.used[k];
      return lsCard(k,{btn:true,disabled:!ok,cls:`sm${ok?' glow':''}${spent?' gone':''}`,style:`--i:${i}`,badge:spent?'done':null,
        attrs:`data-a="lsGet" data-i="a${k}" aria-label="${once?'Use':'Buy'} ${d.n}"`})};
    v.arena=track+`<div class="ls-res">${res}</div>`
      +(st.played.length?lsRow('In play',st.played.map((k,i)=>lsCard(k,{btn:banish,cls:`mini${banish?' banishable':''}`,style:`--i:${i}`,attrs:banish?`data-a="lsBanish" data-i="p${i}"`:''})).join(''),'played ls-played'):'')
      +`<div class="cd-row">${lsRow((S===A?'Your shop':`${L(A)}’s shop`)+(mustUse?` <span class="ls-key">↩ use one of these or ${lsTax(st)?`${L(1-A)} scores ${lsPl(st.shop.filter(e=>e.s==='p'&&!LSC[e.k].threat).length,'point')}`:`they go to ${L(1-A)}`}</span>`:''),
        st.shop.map(shopCard).join('')||'<p class="empty">Nothing left</p>','mkt')}${lsRow('Once per turn',LS_ALWAYS.map(alwaysCard).join(''),'always')}</div>`;
    if(act){
      if(pend==='adept'){
        v.prompt='Adept: choose one.';
        v.actions=`<button class="btn primary big" data-a="lsAdept" data-i="c">+2 coins</button><button class="btn primary big" data-a="lsAdept" data-i="m">+2 might</button>`;
      }else if(banish){
        v.prompt='Banish a card from your hand or play area, or skip.';
        v.actions=`<button class="btn big" data-a="lsBanish" data-i="skip">Skip</button>`;
      }else{
        const basics=ap.hand.some(k=>LSC[k].plain),threat=st.shop.find(e=>LSC[e.k].threat);
        v.prompt=ap.hand.length?`Play cards in any order${st.lastF?`. Last played: ${LS_F[st.lastF]}`:''}.`
          :threat?`Buy and fight. ${LSC[threat.k].n} will cost you ${lsPl(LSC[threat.k].threat,'point')} if you leave it.`:'Buy cards and defeat foes, then end your turn.';
        v.actions=`${basics?`<button class="btn" data-a="lsBasics">Play basics</button>`:''}<button class="btn primary big" data-a="lsEnd">${A===1&&st.round>=LS_ROUNDS?'Finish game':'End turn'}</button>`;
      }
      const ready=k=>{const d=LSC[k];return (d.f&&d.f===st.lastF&&/Follow-up/.test(d.txt))||(k==='vanguard'&&st.n===0)||(st.twice>0&&k!=='mimic')};
      v.hand=handHTML(ap.hand.map((k,i)=>({def:LSC[k],o:banish?{btn:true,cls:'banishable',attrs:`data-a="lsBanish" data-i="h${i}"`}
        :{btn:true,disabled:!!pend,cls:ready(k)?'glow':'',attrs:`data-a="lsPlay" data-i="${i}"`}})))||'<p class="empty">Hand played.</p>';
    }else{
      v.prompt=`${L(A)} is playing their turn.`;
      v.hand=peekHand('Your next hand',me.hand);
    }
    return v;
  },
  on:{
    lsToggle(st,i){const c=st.cut;if(!c)return;c.assign[+i]=1-c.assign[+i];sfx('tap')},
    lsHide(st,i){const c=st.cut;if(!c)return;c.hid=c.hid===+i?-1:+i;sfx('tap')},
    lsPick(st,p,ctx){
      if(st.phase!=='choose')return;
      p=+p;const me=st.turn,P=st.players[me],o=st.offer,L=ctx.label;
      const pile=o.cards.filter((_,i)=>o.assign[i]===p),rest=o.cards.filter((_,i)=>o.assign[i]!==p);
      const wasted=me===1&&st.round>=LS_ROUNDS,names=a=>a.map(k=>LSC[k].n).join(', ')||'nothing';
      st.shop=pile.map(k=>({k,s:'p'})).concat(P.reserve.map(k=>({k,s:'o'})));P.reserve=[];
      if(!wasted)st.players[1-me].reserve.push(...rest);
      st.offer=null;st.phase='main';st.took=false;
      st.log.push(`${L(me)} took pile ${'AB'[p]} (${names(pile)}). ${wasted?'Lost':`Left for ${L(1-me)}`}: ${names(rest)}.`);
      if(o.hid>=0&&o.assign[o.hid]===p&&LSC[o.cards[o.hid]].threat)pop(me,'Ambush!','bad');
      FX.deal=true;sfx('card');
    },
    lsPlay(st,i){
      if(st.pending.length||st.phase!=='main')return;
      const P=st.players[st.turn],k=P.hand.splice(+i,1)[0];if(!k)return;
      st.played.push(k);
      const r=lsPlayS(st,k);
      if(st.draws){const got=draw(P,st.draws);P.hand.push(...got);if(got.length)FX.deal=true}
      st.draws=0;
      if(r.tw)pop(st.turn,'Twice!','good');else if(r.fu)pop(st.turn,'Follow-up!','good');
      sfx(LSC[k].c?'coin':'card');
    },
    lsBasics(st){
      if(st.pending.length||st.phase!=='main')return;
      const P=st.players[st.turn];
      for(let i=P.hand.length-1;i>=0;i--)if(LSC[P.hand[i]].plain){
        const k=P.hand.splice(i,1)[0];st.played.push(k);lsPlayS(st,k);
      }
      sfx('coin');
    },
    lsAdept(st,w){if(st.pending[0]!=='adept')return;st.pending.shift();if(w==='c')st.coin+=2;else st.might+=2;sfx('coin')},
    lsBanish(st,w,ctx){
      if(st.pending[0]!=='banish')return;
      const P=st.players[st.turn];st.pending.shift();
      if(w==='skip')return sfx('tap');
      const k=w[0]==='h'?P.hand.splice(+w.slice(1),1)[0]:st.played.splice(+w.slice(1),1)[0];
      if(!k)return;
      st.log.push(`${ctx.label(st.turn)} banished ${LSC[k].n}.`);sfx('bad');
    },
    lsGet(st,w,ctx){
      if(st.pending.length||st.phase!=='main')return;
      const me=st.turn,P=st.players[me],always=w[0]==='a',idx=+w.slice(1),e=always?null:st.shop[idx],k=always?w.slice(1):e&&e.k,d=LSC[k],L=ctx.label;
      if(!d||(always&&!LS_ALWAYS.includes(k)))return;
      if(d.gain){
        const key=d.pay?'coin':'might',amt=d.pay||d.use;
        if(st.used[k]||st[key]<amt)return;
        st[key]-=amt;st.used[k]=true;lsGain(st,me,d.gain);sfx('score');
        st.log.push(`${L(me)} used ${d.n} (+${d.gain}).`);
        return;
      }
      if(d.need){
        if(st.might<d.need)return;
        st.might-=d.need;lsGain(st,me,d.pts);sfx('score');
        st.coin+=st.loot+(d.gc||0);
        if(k==='brigand')st.pending.push('banish');
        if(k==='troll'){P.hand.push(...draw(P,1));FX.deal=true}
        st.log.push(`${L(me)} defeated ${d.n} (+${d.pts}).`);
      }else{
        const price=lsPrice(st,k);
        if(st.coin<price)return;
        st.coin-=price;st.disc=0;
        if(st.top){P.deck.push(k);st.top=false}else P.discard.push(k);
        sfx('card');st.log.push(`${L(me)} bought ${d.n}.`);
      }
      if(!always){if(e.s==='p')st.took=true;st.shop.splice(idx,1)}
    },
    lsEnd(st,_,ctx){
      if(st.pending.length||st.phase!=='main')return;
      const me=st.turn,P=st.players[me],L=ctx.label;
      for(const e of st.shop){
        const d=LSC[e.k];
        if(d.threat){lsGain(st,1-me,d.threat);pop(me,`${d.n} got through`,'bad');st.log.push(`${L(me)} left ${d.n} undefeated: +${d.threat} to ${L(1-me)}.`)}
      }
      const last=me===1&&st.round>=LS_ROUNDS,back=st.took?[]:st.shop.filter(e=>e.s==='p'&&!LSC[e.k].threat).map(e=>e.k);
      if(back.length&&!last&&lsTax(st)){lsGain(st,1-me,back.length);st.log.push(`${L(me)} used nothing from the pile: +${back.length} to ${L(1-me)}.`)}
      else if(back.length&&!last){st.players[1-me].reserve.push(...back);st.log.push(`${L(me)} used nothing from the pile: ${back.map(k=>LSC[k].n).join(', ')} went to ${L(1-me)}.`)}
      P.discard.push(...P.hand,...st.played);P.hand=[];
      const extra=st.extra;
      Object.assign(st,lsFresh(),{shop:[],played:[]});
      if(last){sfx('card');return passTurn(st,LS_ROUNDS)}
      P.hand=draw(P,5);
      const r=lsReveal(st,LS_CUT+extra),n=r.cards.length;
      st.cut={cards:r.cards,assign:r.cards.map((_,i)=>i<Math.ceil(n/2)?0:1),hid:-1,age:r.age};
      st.phase='cut';FX.deal=true;sfx('card');
    },
    lsSend(st){
      const c=st.cut;if(st.phase!=='cut'||!c)return;
      if(c.cards.length>1){
        if(!c.assign.includes(0)||!c.assign.includes(1))return toast('Each pile needs at least one card.');
        if(c.hid<0)return toast('Choose one card to place face down.');
      }
      st.offer=c;st.cut=null;st.phase='choose';
      sfx('tap');
      return passTurn(st,LS_ROUNDS);
    },
  },
  // One bot decision per call; returns 'commit' when its turn is over.
  bot(st,ctx){
    const on=GAME.on,me=st.turn,P=st.players[me];
    if(st.phase==='choose')return on.lsPick(st,lsBotPick(st,me),ctx);
    if(st.phase==='cut'){
      // Show the cut for a beat before sending it.
      if(st.botCut){delete st.botCut;return on.lsSend(st,null,ctx)}
      lsBotCut(st,me);st.botCut=true;sfx('tap');return;
    }
    const X=lsCtx(st,me,lsPersona(st,me));
    const plan=(c,m)=>lsPlan(st.shop,c,m,X,{disc:st.disc,loot:st.loot,used:st.used});
    if(st.pending[0]==='adept'){
      const y=P.hand.length?lsBestOrder({...st,coin:0,might:0},P.hand,X).S:{coin:0,might:0};
      const a=plan(st.coin+2+y.coin,st.might+y.might).v,b=plan(st.coin+y.coin,st.might+2+y.might).v;
      return on.lsAdept(st,a>b||(a===b&&X.wc>=X.wm)?'c':'m');
    }
    if(st.pending[0]==='banish'){
      let w='skip';
      if(X.T>1&&X.n>7){
        const pc=st.played.indexOf('copper'),pm=st.played.indexOf('militia');
        const dropM=pm>=0&&(pc<0||X.wm*(X.avgM*5<2.5?.8:1.1)<X.wc);
        if(dropM)w='p'+pm;else if(pc>=0)w='p'+pc;
        else if(X.T>4&&P.hand.includes('copper'))w='h'+P.hand.indexOf('copper');
      }
      return on.lsBanish(st,w,ctx);
    }
    if(P.hand.length){
      // Starters go down before a Fence so it can banish one for free.
      const pl=P.hand.findIndex(k=>LSC[k].plain);
      if(pl>=0&&!st.twice&&P.hand.includes('fence')&&!(st.n===0&&P.hand.includes('vanguard')))return on.lsPlay(st,pl);
      return on.lsPlay(st,lsBestOrder(st,P.hand,X).first);
    }
    let best=plan(st.coin,st.might);
    if(!st.took&&!best.took&&!(me===1&&st.round>=LS_ROUNDS)&&st.shop.some(e=>e.s==='p')){
      // Nothing from the pile is worth it on its own. Is it worth a purchase to keep the pile from going back?
      const alt=lsPlan(st.shop,st.coin,st.might,X,{disc:st.disc,loot:st.loot,used:st.used,must:true});
      if(alt.took){
        const XO=lsCtx(st,1-me),oa=lsAvg(XO),O=st.players[1-me],has=O.reserve.map(k=>({k,s:'o'}));
        const back=st.shop.filter(e=>e.s==='p'&&!LSC[e.k].threat).map(e=>({k:e.k,s:'o'}));
        const deny=lsTax(st)?back.length/lsLam(me):lsPlan(has.concat(back),oa.c,oa.m,XO).v-lsPlan(has,oa.c,oa.m,XO).v;
        if(alt.v+lsLam(me)*deny>best.v)best=alt;
      }
    }
    const set=best.set;
    if(set.length){
      // Fight first (Looter pays out), then the dearest card (discounts and top-decking land on it).
      const it=set.find(x=>x.foe)||set.find(x=>x.k==='patrol')||set.filter(x=>x.card).sort((a,b)=>b.cost-a.cost)[0]||set[0];
      const sig=st.coin+':'+st.might+':'+st.shop.length;
      on.lsGet(st,it.i>=0?'s'+it.i:'a'+it.k,ctx);
      if(sig!==st.coin+':'+st.might+':'+st.shop.length)return;
    }
    return on.lsEnd(st,null,ctx);
  },
};
