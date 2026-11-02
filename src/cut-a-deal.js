// =====================================================================
// CUT A DEAL: an Ascension-style deckbuilder with no shared center row.
// Each turn ends with you revealing 5 market cards and cutting them into
// two piles. Your opponent picks one to shop from; you shop from the other.
// =====================================================================
const FAC={g:'Guild',b:'Blade',m:'Mystic'};
const CDC={
  copper:{n:'Copper',c:1,kind:'a',art:'◉'},
  militia:{n:'Militia',m:1,kind:'a',art:'↟'},
  apprentice:{n:'Apprentice',cost:3,c:2,kind:'a',art:'❖'},
  soldier:{n:'Soldier',cost:3,m:2,kind:'a',art:'⚔'},
  smuggler:{n:'Smuggler',cost:2,f:'g',c:1,art:'◑',txt:'Follow-up Guild: draw 1.'},
  broker:{n:'Broker',cost:3,f:'g',c:1,art:'⚭',txt:'Follow-up Guild: +2 coins.'},
  fence:{n:'Fence',cost:4,f:'g',c:2,art:'✂',txt:'You may banish a card from your hand or play area.'},
  banker:{n:'Banker',cost:5,f:'g',art:'♦',txt:'+1 coin for each Guild card you’ve played this turn, this one included.'},
  patron:{n:'Patron',cost:6,f:'g',c:3,vp:2,art:'❂'},
  veteran:{n:'Veteran',cost:2,f:'b',m:1,art:'➶',txt:'Follow-up Blade: draw 1.'},
  duelist:{n:'Duelist',cost:3,f:'b',m:1,art:'†',txt:'Follow-up Blade: +2 might.'},
  recruiter:{n:'Recruiter',cost:4,f:'b',m:2,art:'⚐',txt:'The next card you buy this turn goes on top of your deck.'},
  captain:{n:'Captain',cost:5,f:'b',art:'⚑',txt:'+1 might for each Blade card you’ve played this turn, this one included.'},
  warlord:{n:'Warlord',cost:6,f:'b',m:3,vp:2,art:'✪'},
  seer:{n:'Seer',cost:3,f:'m',c:1,art:'⊙',txt:'Draw 1.'},
  adept:{n:'Adept',cost:3,f:'m',art:'◐',txt:'Choose: +2 coins or +2 might.'},
  sage:{n:'Sage',cost:4,f:'m',c:1,m:1,art:'✦',txt:'Follow-up Mystic: draw 2.'},
  oracle:{n:'Oracle',cost:5,f:'m',art:'☾',txt:'Draw 2.'},
  archmage:{n:'Archmage',cost:7,f:'m',c:2,m:2,vp:3,art:'✹'},
  bandit:{n:'Bandit',need:2,pts:1,art:'✠'},
  goblin:{n:'Goblin',need:3,pts:2,art:'⊛'},
  brigand:{n:'Brigand',need:4,pts:2,art:'☋',txt:'Banish a card from your hand or play area.'},
  troll:{n:'Troll',need:5,pts:3,art:'⛰',txt:'Draw 1.'},
  wraith:{n:'Wraith',need:6,pts:4,art:'☠'},
  dragon:{n:'Dragon',need:8,pts:6,art:'⚸'},
};
const CD_MARKET={smuggler:3,broker:4,fence:3,banker:3,patron:2,veteran:3,duelist:4,recruiter:3,captain:3,warlord:2,
  seer:4,adept:4,sage:3,oracle:3,archmage:2,goblin:5,brigand:3,troll:3,wraith:3,dragon:2};
const CD_ALWAYS=['apprentice','soldier','bandit'];
const CD_POOL=30,CD_CUT=5;
for(const d of Object.values(CDC)){
  d.art+=T;
  const bits=[];
  if(d.need){
    d.kind='e';bits.push(`Defeat with ${d.need} might: +${d.pts} point${d.pts===1?'':'s'}.`);
    d.face=`<span class="glyph">${d.art}</span><span class="might">⚔${T} ${d.need}</span>`;
  }else{
    d.kind=d.kind||{g:'b',m:'c',b:'d'}[d.f];
    if(d.c)bits.push(`+${d.c} coin${d.c===1?'':'s'}.`);
    if(d.m)bits.push(`+${d.m} might.`);
    if(d.vp)bits.push(`Worth ${d.vp} points.`);
    if(d.f)d.face=`<span class="glyph">${d.art}</span><span class="fac">${FAC[d.f]}</span>`;
  }
  if(d.txt)bits.push(d.txt);
  d.txt=bits.join(' ');
}
const isFoe=k=>!!CDC[k].need;
const cdOwned=(st,i)=>{const P=st.players[i];return P.deck.concat(P.discard,P.hand,st.turn===i?st.played:[])};
const cdScore=(st,i)=>st.players[i].pts+cdOwned(st,i).reduce((s,k)=>s+(CDC[k].vp||0),0);
const cdSplitOK=(a,n)=>n<2||(a.includes(0)&&a.includes(1));

function cdPilesHTML(cards,assign,o){
  return `<div class="piles">${[0,1].map(k=>{
    const idx=cards.map((_,i)=>i).filter(i=>assign[i]===k);
    return `<div class="pile p${'AB'[k]}">
      <div class="pile-h"><span class="pile-name">${o.names?o.names[k]:'Pile '+'AB'[k]}</span><span class="chip">${idx.length} card${idx.length===1?'':'s'}</span></div>
      <div class="pile-cards">${idx.map((i,j)=>cardHTML(CDC[cards[i]],{btn:o.edit,cls:`sm${FX.deal?' deal':''}${o.edit?' movable':''}`,style:`--i:${j+k*3}`,
        attrs:o.edit?`data-a="cdToggle" data-i="${i}" aria-label="Move ${CDC[cards[i]].n} to pile ${'BA'[k]}"`:''})).join('')||'<p class="empty">Tap cards to move them here</p>'}</div>
      ${o.pick?`<button class="btn primary" data-a="cdPick" data-i="${k}">Take pile ${'AB'[k]}</button>`:''}
    </div>`;
  }).join('')}</div>`;
}
const rowHTML=(label,html,cls)=>`<div class="cd-sec ${cls||''}"><div class="sub">${label}</div><div class="line">${html}</div></div>`;

// ---------- playing a card ----------
function cdPlayCard(st,P,k){
  const d=CDC[k],fu=d.f&&st.lastF===d.f;
  if(d.f)st.cnt[d.f]=(st.cnt[d.f]||0)+1;
  let c=d.c||0,m=d.m||0,dr=0,note='';
  switch(k){
    case 'smuggler':if(fu){dr=1;note='follow-up'}break;
    case 'broker':if(fu){c+=2;note='follow-up'}break;
    case 'veteran':if(fu){dr=1;note='follow-up'}break;
    case 'duelist':if(fu){m+=2;note='follow-up'}break;
    case 'sage':if(fu){dr=2;note='follow-up'}break;
    case 'banker':c=st.cnt.g;break;
    case 'captain':m=st.cnt.b;break;
    case 'seer':dr=1;break;
    case 'oracle':dr=2;break;
    case 'recruiter':st.topNext=true;break;
    case 'fence':st.pending={t:'banish'};break;
    case 'adept':st.pending={t:'adept'};break;
  }
  st.coin+=c;st.might+=m;st.lastF=d.f||null;
  if(dr){const got=draw(P,dr);P.hand.push(...got);if(got.length)FX.deal=true}
  if(note)pop(st.turn,'Follow-up!','good');
}
function cdGain(st,i,pts){
  st.players[i].pts+=pts;st.pool=Math.max(0,st.pool-pts);
  if(st.pool===0)st.endTriggered=true;
  pop(i,`+${pts} point${pts===1?'':'s'}`);
}
function cdReveal(st){
  const n=Math.min(CD_CUT,st.market.length);
  if(st.market.length<=CD_CUT)st.endTriggered=true;
  return st.market.splice(st.market.length-n,n);
}

// ---------- bot ----------
// Rough coins and might a hand will make, without sequencing.
function cdEstimate(hand){
  let c=0,m=0;
  const n=f=>hand.filter(k=>CDC[k].f===f).length;
  for(const k of hand){
    const d=CDC[k];c+=d.c||0;m+=d.m||0;
    if(k==='broker'&&n('g')>1)c+=1.5;
    if(k==='duelist'&&n('b')>1)m+=1.5;
    if(k==='banker')c+=n('g');
    if(k==='captain')m+=n('b');
    if(k==='adept'){c+=1;m+=1}
    if(k==='seer')c+=.8;
    if(k==='oracle'){c+=1;m+=.7}
  }
  return {c,m};
}
function cdAvgHand(st,i){
  const all=cdOwned(st,i).filter(k=>k!==undefined),e=cdEstimate(all),f=5/Math.max(5,all.length);
  return {c:e.c*f,m:e.m*f};
}
function cdWorth(k,st){
  const d=CDC[k];
  if(d.need)return d.pts+(k==='brigand'?.6:k==='troll'?.5:0);
  return (d.vp||0)+(d.cost||0)*.8*Math.max(.2,1-st.round/16);
}
// Best set of acquisitions from `cards` with the given coins and might.
function cdPlan(cards,c,m,st){
  let best={v:-1,set:[]};const n=Math.min(cards.length,11);
  for(let mask=0;mask<(1<<n);mask++){
    let cost=0,need=0,v=0;const set=[];
    for(let i=0;i<n;i++)if(mask>>i&1){const d=CDC[cards[i]];if(d.need)need+=d.need;else cost+=d.cost;v+=cdWorth(cards[i],st);set.push(i)}
    if(cost>c||need>m)continue;
    v+=Math.floor((m-need)/2)*1+(c-cost>=3&&st.round<13?cdWorth('apprentice',st):0);
    if(v>best.v)best={v,set};
  }
  return best;
}
function cdNextPlay(st,hand){
  const has=f=>hand.some(k=>['smuggler','broker','veteran','duelist','sage'].includes(k)&&CDC[k].f===f);
  let bi=0,bs=99;
  hand.forEach((k,i)=>{
    const d=CDC[k];let s;
    if(k==='seer'||k==='oracle')s=0;
    else if(!d.f)s=1;
    else if(['smuggler','broker','veteran','duelist','sage'].includes(k))s=st.lastF===d.f?2:has(d.f)&&hand.filter(x=>CDC[x].f===d.f).length>1?4.5:5;
    else if(k==='banker'||k==='captain')s=6;
    else s=has(d.f)?3:4;
    if(s<bs){bs=s;bi=i}
  });
  return bi;
}

const GAME={
  key:'cut-a-deal',title:'Cut a Deal',
  hook:'A classic deckbuilder with no luck of the draw in the market: every card it reveals gets cut into two piles, and your opponent picks first.',
  turn:['Pick one of the two piles your opponent cut from the market. The other pile goes to them.','Play your hand in any order to make coins and might, then buy cards and defeat foes from your piles.','Reveal 5 new market cards and cut them into two piles for your opponent.'],
  watch:'Does cutting feel fair, or can a good cutter squeeze their opponent? Do you ever take the smaller pile? Does play order in your hand matter enough?',
  rules:[
    'Each player has their own deck, starting with 8 Coppers (+1 coin) and 2 Militia (+1 might). Each turn you draw 5 cards.',
    'There is no shared market row. At the end of your turn you reveal 5 cards from the market deck and split them into two piles, each with at least one card.',
    'Your opponent picks one pile to shop from on their turn. You get the other pile to shop from on your next turn. Cut it so you are happy with either half.',
    'On your turn, play cards one at a time. Coins buy cards; might defeats foes for points. You can shop from your two piles plus Apprentice, Soldier and Bandit, which are always available.',
    'Follow-up: some cards get a bonus if the card you played just before them is the same faction (Guild, Blade or Mystic). Play order matters.',
    'Banish removes a card from your deck for good. Bought cards go to your discard pile, which is shuffled into a new deck when your deck runs out.',
    'Cards you don’t buy go to the bottom of the market deck.',
    `The game ends after the round in which the ${CD_POOL}-point pool runs out, or after round 20. Points from foes plus points printed on your cards; most wins.`,
  ],
  maxRounds:20,
  score:cdScore,
  setup(){
    const market=shuffle(Object.entries(CD_MARKET).flatMap(([k,n])=>rep(k,n)));
    const players=[0,1].map(()=>{const p={deck:shuffle([...rep('copper',8),...rep('militia',2)]),discard:[],hand:[],pts:0,reserve:[]};p.hand=draw(p,5);return p});
    const cards=market.splice(market.length-CD_CUT,CD_CUT),assign=shuffle([0,0,1,1,1]);
    return {turn:0,round:1,players,market,pool:CD_POOL,offer:{cards,assign},phase:'choose',
      coin:0,might:0,cnt:{},lastF:null,topNext:false,pending:null,mine:[],played:[],cut:null,
      log:['The opening cut was made at random. Seat 2 gets the pile seat 1 leaves.'],over:false,endTriggered:false};
  },
  view(st,ctx){
    const S=ctx.seat,A=st.turn,L=ctx.label,act=ctx.canAct,P=st.players,me=P[S],ap=P[A];
    const total=p=>p.deck.length+p.discard.length+p.hand.length;
    const v={oppInfo:`${total(P[1-S])} cards · share ${P[1-S].reserve.length}`,meInfo:`${total(me)} cards · ${st.pool} pts left in pool`,arena:'',hand:'',actions:'',prompt:''};
    if(st.over)return v;
    const peek=(label,hand)=>`<div class="peek-label">${label}</div>`+handHTML(hand.map(k=>({def:CDC[k],o:{cls:'peek'}})));
    const share=p=>p.reserve.length?rowHTML('Your share from your last cut',p.reserve.map((k,i)=>cardHTML(CDC[k],{cls:'sm',style:`--i:${i}`})).join('')):'';
    if(st.phase==='choose'){
      const o=st.offer;
      v.prompt=act?`${L(1-A)} cut the market. Take a pile; they get the other.`:`${L(A)} is picking a pile.`;
      v.arena=cdPilesHTML(o.cards,o.assign,{pick:act})+(act?share(ap):'');
      v.hand=S===A?peek('Your hand',me.hand):peek('Your next hand',me.hand);
      return v;
    }
    if(st.phase==='cut'){
      const c=st.cut;
      v.prompt=act?`Cut the market for ${L(1-A)}. They pick a pile; you shop from the other next turn.`:`${L(A)} is cutting the market.`;
      v.arena=cdPilesHTML(c.cards,c.assign,{edit:act});
      if(act){
        const e=cdEstimate(me.hand),o=cdAvgHand(st,1-A);
        v.actions=`<span class="hint">Your next hand ≈ ${Math.round(e.c)} coins, ${Math.round(e.m)} might · ${L(1-A)} averages ${o.c.toFixed(1)} / ${o.m.toFixed(1)}</span><button class="btn primary big" data-a="cdSend">Offer cut</button>`;
      }
      v.hand=peek('Your next hand',me.hand);
      return v;
    }
    // main phase
    const pend=st.pending,banish=act&&pend&&pend.t==='banish';
    const res=`<div class="res"><span class="r coin"><b>${st.coin}</b> coins</span><span class="r mi"><b>${st.might}</b> might</span>${st.topNext?'<span class="chip gold">next buy goes on top of your deck</span>':''}</div>`;
    const canGet=k=>act&&!pend&&(isFoe(k)?st.might>=CDC[k].need:st.coin>=CDC[k].cost);
    const buyBtn=(k,i,src)=>cardHTML(CDC[k],{btn:true,disabled:!canGet(k),cls:`sm${canGet(k)?' glow':''}`,style:`--i:${i}`,
      badge:src==='a'?'∞':null,attrs:`data-a="cdGet" data-i="${src}${src==='a'?k:i}" aria-label="${isFoe(k)?'Defeat':'Buy'} ${CDC[k].n}"`});
    v.arena=res+(st.played.length?rowHTML('In play',st.played.map((k,i)=>cardHTML(CDC[k],{btn:banish,cls:`mini${banish?' banishable':''}`,style:`--i:${i}`,attrs:banish?`data-a="cdBanish" data-i="p${i}"`:''})).join(''),'played'):'')
      +`<div class="cd-row">${rowHTML(S===A?'Your market':`${L(A)}’s market`,st.mine.map((k,i)=>buyBtn(k,i,'m')).join('')||'<p class="empty">Nothing left</p>','mkt')}${rowHTML('Always available',CD_ALWAYS.map((k,i)=>buyBtn(k,i,'a')).join(''),'always')}</div>`;
    if(act){
      if(pend&&pend.t==='adept'){
        v.prompt='Adept: choose one.';
        v.actions=`<button class="btn primary big" data-a="cdAdept" data-i="c">+2 coins</button><button class="btn primary big" data-a="cdAdept" data-i="m">+2 might</button>`;
      }else if(banish){
        v.prompt='Banish a card from your hand or play area, or skip.';
        v.actions=`<button class="btn big" data-a="cdBanish" data-i="skip">Skip</button>`;
      }else{
        v.prompt=ap.hand.length?`Play cards in any order${st.lastF?`. Last played: ${FAC[st.lastF]}`:''}.`:'Buy cards and defeat foes, then end your turn.';
        v.actions=`${ap.hand.length?`<button class="btn" data-a="cdPlayAll">Play all</button>`:''}<button class="btn primary big" data-a="cdEnd">End turn</button>`;
      }
      v.hand=handHTML(ap.hand.map((k,i)=>({def:CDC[k],o:banish?{btn:true,cls:'banishable',attrs:`data-a="cdBanish" data-i="h${i}"`}
        :{btn:true,disabled:!!pend,cls:CDC[k].f&&CDC[k].f===st.lastF&&/Follow-up/.test(CDC[k].txt)?'glow':'',attrs:`data-a="cdPlay" data-i="${i}"`}})))||'<p class="empty">Hand played.</p>';
    }else{
      v.prompt=`${L(A)} is playing their turn.`;
      v.hand=peek('Your next hand',me.hand);
    }
    return v;
  },
  on:{
    cdToggle(st,i){const a=st.cut.assign;a[+i]=1-a[+i];sfx('tap')},
    cdPick(st,k,ctx){
      k=+k;const me=st.turn,P=st.players[me],o=st.offer;
      const pile=o.cards.filter((_,i)=>o.assign[i]===k),rest=o.cards.filter((_,i)=>o.assign[i]!==k);
      st.mine=pile.concat(P.reserve);P.reserve=[];st.players[1-me].reserve=rest;st.offer=null;st.phase='main';
      st.log.push(`${ctx.label(me)} took pile ${'AB'[k]} (${pile.map(x=>CDC[x].n).join(', ')}). ${ctx.label(1-me)} gets ${rest.map(x=>CDC[x].n).join(', ')||'nothing'}.`);
      FX.deal=true;sfx('card');
    },
    cdPlay(st,i){
      if(st.pending)return;
      const P=st.players[st.turn],k=P.hand.splice(+i,1)[0];if(!k)return;
      st.played.push(k);cdPlayCard(st,P,k);sfx(CDC[k].c?'coin':'card');
    },
    cdPlayAll(st){
      const P=st.players[st.turn];
      while(P.hand.length&&!st.pending)GAME.on.cdPlay(st,0);
    },
    cdAdept(st,w){if(!st.pending||st.pending.t!=='adept')return;if(w==='c')st.coin+=2;else st.might+=2;st.pending=null;sfx('coin')},
    cdBanish(st,w,ctx){
      if(!st.pending||st.pending.t!=='banish')return;
      const P=st.players[st.turn];st.pending=null;
      if(w==='skip')return sfx('tap');
      const k=w[0]==='h'?P.hand.splice(+w.slice(1),1)[0]:st.played.splice(+w.slice(1),1)[0];
      st.log.push(`${ctx.label(st.turn)} banished ${CDC[k].n}.`);sfx('bad');
    },
    cdGet(st,w,ctx){
      if(st.pending)return;
      const me=st.turn,P=st.players[me],always=w[0]==='a',k=always?w.slice(1):st.mine[+w.slice(1)],d=CDC[k];
      if(!k)return;
      if(d.need){
        if(st.might<d.need)return;
        st.might-=d.need;cdGain(st,me,d.pts);sfx('score');
        if(k==='brigand')st.pending={t:'banish'};
        if(k==='troll'){P.hand.push(...draw(P,1));FX.deal=true}
        st.log.push(`${ctx.label(me)} defeated ${d.n} (+${d.pts}).`);
      }else{
        if(st.coin<d.cost)return;
        st.coin-=d.cost;
        if(st.topNext){P.deck.push(k);st.topNext=false}else P.discard.push(k);
        sfx('card');st.log.push(`${ctx.label(me)} bought ${d.n}.`);
      }
      if(!always)st.mine.splice(+w.slice(1),1);
    },
    cdEnd(st){
      if(st.pending)return;
      const P=st.players[st.turn];
      P.discard.push(...P.hand,...st.played);st.played=[];
      st.market.unshift(...shuffle(st.mine));st.mine=[];
      P.hand=draw(P,5);
      const cards=cdReveal(st);
      st.cut={cards,assign:cards.map((_,i)=>i<Math.ceil(cards.length/2)?0:1)};
      Object.assign(st,{coin:0,might:0,cnt:{},lastF:null,topNext:false,phase:'cut'});
      FX.deal=true;sfx('card');
    },
    cdSend(st){
      const c=st.cut;
      if(!cdSplitOK(c.assign,c.cards.length))return toast('Each pile needs at least one card.');
      st.offer={cards:c.cards,assign:c.assign};st.cut=null;st.phase='choose';
      sfx('tap');
      return passTurn(st,20);
    },
  },
  // One bot decision per call; returns 'commit' when its turn is over.
  bot(st,ctx){
    const on=GAME.on,me=st.turn,P=st.players[me];
    if(st.phase==='choose'){
      const o=st.offer,e=cdEstimate(P.hand);
      const val=[0,1].map(k=>cdPlan(o.cards.filter((_,i)=>o.assign[i]===k).concat(P.reserve),e.c,e.m,st).v);
      return on.cdPick(st,val[1]>val[0]?1:0,ctx);
    }
    if(st.phase==='cut'){
      // Show the cut for a beat before sending it.
      if(st.botCut){delete st.botCut;return on.cdSend(st)}
      const c=st.cut,n=c.cards.length,mine=cdEstimate(P.hand),opp=cdAvgHand(st,1-me),O=st.players[1-me];
      let best=c.assign,bs=-Infinity;
      for(let mask=1;mask<(1<<n)-1;mask++){
        if(mask&1)continue;
        const a=c.cards.map((_,i)=>mask>>i&1),pile=k=>c.cards.filter((_,i)=>a[i]===k);
        const theirs=[0,1].map(k=>cdPlan(pile(k).concat(O.reserve),opp.c,opp.m,st).v),tk=theirs[1]>theirs[0]?1:0;
        const s=cdPlan(pile(1-tk),mine.c,mine.m,st).v-.6*theirs[tk]+rnd(10)/100;
        if(s>bs){bs=s;best=a}
      }
      if(n<2)return on.cdSend(st);
      c.assign=best;st.botCut=true;sfx('tap');return;
    }
    if(st.pending){
      if(st.pending.t==='adept'){
        const rest=cdEstimate(P.hand);
        const a=cdPlan(st.mine,st.coin+2+rest.c,st.might+rest.m,st).v,b=cdPlan(st.mine,st.coin+rest.c,st.might+2+rest.m,st).v;
        return on.cdAdept(st,a>=b?'c':'m');
      }
      const pick=['copper','militia'].map(k=>[P.hand.indexOf(k),st.played.indexOf(k)]).flat();
      const [hc,pc,hm,pm]=pick,w=pc>=0?'p'+pc:hc>=0?'h'+hc:st.round>=6&&pm>=0?'p'+pm:st.round>=6&&hm>=0?'h'+hm:'skip';
      return on.cdBanish(st,w,ctx);
    }
    if(P.hand.length)return on.cdPlay(st,cdNextPlay(st,P.hand));
    const plan=cdPlan(st.mine,st.coin,st.might,st);
    if(plan.set.length){
      const foe=plan.set.find(i=>isFoe(st.mine[i])),i=foe!=null?foe:plan.set[0];
      return on.cdGet(st,'m'+i,ctx);
    }
    if(st.might>=2)return on.cdGet(st,'abandit',ctx);
    if(st.coin>=3&&st.round<13){
      const all=cdOwned(st,me),m=all.filter(k=>CDC[k].m).length,c=all.filter(k=>CDC[k].c).length;
      return on.cdGet(st,m*2<c?'asoldier':'aapprentice',ctx);
    }
    return on.cdEnd(st);
  },
};
