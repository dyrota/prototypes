// =====================================================================
// CUT A DEAL II: the market is two decks (cheap and premium). Each turn ends
// with you revealing 3 cheap + 2 premium cards and cutting them into two piles.
// Your opponent picks a pile and shops from it first; whatever they leave,
// in either pile, comes back to you.
// =====================================================================
const FAC={g:'Guild',b:'Blade',m:'Mystic'};
const CDC={
  copper:{n:'Copper',c:1,kind:'a',art:'◉'},
  militia:{n:'Militia',m:1,kind:'a',art:'↟'},
  apprentice:{n:'Apprentice',cost:3,c:2,kind:'a',art:'❖'},
  soldier:{n:'Soldier',cost:3,m:2,kind:'a',art:'⚔'},
  smuggler:{n:'Smuggler',cost:2,f:'g',c:1,art:'◑',txt:'Follow-up Guild: draw 1.'},
  broker:{n:'Broker',cost:3,f:'g',c:2,art:'⚭',txt:'Follow-up Guild: +1 coin.'},
  fence:{n:'Fence',cost:4,f:'g',c:2,art:'✂',txt:'You may banish a card from your hand or play area.'},
  banker:{n:'Banker',cost:5,f:'g',art:'♦',txt:'+1 coin for each Guild card you’ve played this turn, this one included.'},
  patron:{n:'Patron',cost:6,f:'g',c:3,vp:2,art:'❂'},
  veteran:{n:'Veteran',cost:2,f:'b',m:1,art:'➶',txt:'Follow-up Blade: draw 1.'},
  duelist:{n:'Duelist',cost:3,f:'b',m:2,art:'†',txt:'Follow-up Blade: +1 might.'},
  recruiter:{n:'Recruiter',cost:4,f:'b',m:2,art:'⚐',txt:'The next card you buy this turn goes on top of your deck.'},
  captain:{n:'Captain',cost:5,f:'b',art:'⚑',txt:'+1 might for each Blade card you’ve played this turn, this one included.'},
  warlord:{n:'Warlord',cost:6,f:'b',m:3,vp:2,art:'✪'},
  seer:{n:'Seer',cost:3,f:'m',c:1,art:'⊙',txt:'Draw 1.'},
  adept:{n:'Adept',cost:3,f:'m',art:'◐',txt:'Choose: +2 coins or +2 might.'},
  sage:{n:'Sage',cost:4,f:'m',c:1,m:1,art:'✦',txt:'Follow-up Mystic: draw 2.'},
  oracle:{n:'Oracle',cost:5,f:'m',art:'☾',txt:'Draw 2.'},
  archmage:{n:'Archmage',cost:7,f:'m',c:2,m:2,vp:3,art:'✹'},
  bandit:{n:'Bandit',need:3,pts:1,art:'✠'},
  goblin:{n:'Goblin',need:3,pts:2,art:'⊛'},
  brigand:{n:'Brigand',need:4,pts:2,art:'☋',txt:'Banish a card from your hand or play area.'},
  troll:{n:'Troll',need:5,pts:3,art:'⛰',txt:'Draw 1.'},
  wraith:{n:'Wraith',need:6,pts:4,art:'☠'},
  dragon:{n:'Dragon',need:8,pts:6,art:'⚸'},
};
const CD_CHEAP={smuggler:3,broker:4,fence:3,veteran:3,duelist:4,recruiter:3,seer:4,adept:4,sage:3,goblin:5,brigand:3};
const CD_PREM={banker:3,patron:2,captain:3,warlord:2,oracle:3,archmage:2,troll:3,wraith:3,dragon:2};
const CD_ALWAYS=['apprentice','soldier','bandit'];
const CD_POOL=26,CD_NCHEAP=3,CD_NPREM=2,CD_CUT=CD_NCHEAP+CD_NPREM;
const cdTier=k=>CD_PREM[k]?'prem':'cheap';
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
    case 'broker':if(fu){c+=1;note='follow-up'}break;
    case 'veteran':if(fu){dr=1;note='follow-up'}break;
    case 'duelist':if(fu){m+=1;note='follow-up'}break;
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
  const take=(d,n)=>d.splice(Math.max(0,d.length-n),n);
  const c=take(st.cheap,CD_NCHEAP),p=take(st.prem,CD_NPREM);
  c.push(...take(st.cheap,CD_CUT-c.length-p.length));p.push(...take(st.prem,CD_CUT-c.length-p.length));
  if(st.cheap.length+st.prem.length<CD_CUT)st.endTriggered=true;
  return c.concat(p);
}
// Unbought cards go back under the deck they came from.
function cdReturn(st,cards){for(const k of shuffle(cards.slice()))st[cdTier(k)].unshift(k)}

// ---------- bot ----------
// Rough coins and might a hand will make, without sequencing.
function cdEstimate(hand){
  let c=0,m=0;
  const n=f=>hand.filter(k=>CDC[k].f===f).length;
  for(const k of hand){
    const d=CDC[k];c+=d.c||0;m+=d.m||0;
    if(k==='broker'&&n('g')>1)c+=.7;
    if(k==='duelist'&&n('b')>1)m+=.7;
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
    v+=(m-need>=3?1:0)+(c-cost>=3&&st.round<13?cdWorth('apprentice',st):0);
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

// The chooser buys from the pile it takes; everything else goes to the cutter.
function cdChoice(st,cards,assign,share,c,m,cutC,cutM){
  const pile=k=>cards.filter((_,i)=>assign[i]===k);
  return [0,1].map(k=>{
    const mine=pile(k),plan=cdPlan(mine.concat(share),c,m,st);
    const rest=pile(1-k).concat(mine.filter((_,i)=>!plan.set.includes(i)));
    const cut=cdPlan(rest,cutC,cutM,st).v;
    return {k,v:plan.v,cut,s:plan.v-.5*cut};
  });
}

const GAME={
  key:'cut-a-deal-2',title:'Cut a Deal II',
  hook:'Every card the market reveals gets cut into two piles. Your opponent picks a pile and shops from it first; whatever they leave comes back to you.',
  turn:['Pick one of the two piles your opponent cut. You shop from it first; they get everything you leave.','Play your hand in any order to make coins and might, then buy cards and defeat foes.','Reveal 3 cheap and 2 premium market cards and cut them into two piles for your opponent.'],
  watch:'Is the cut tense now that leftovers come back to you? Do early cuts matter? Is taking a pile just to block ever worth it?',
  rules:[
    'Each player has their own deck, starting with 8 Coppers (+1 coin) and 2 Militia (+1 might). Each turn you draw 5 cards.',
    'The market is two decks: cheap cards (cost 2–4, small foes) and premium cards (cost 5+, big foes).',
    'At the end of your turn, reveal 3 cheap and 2 premium cards and cut them into two piles, each with at least one card.',
    'Your opponent picks a pile and shops from it first. Everything they leave, the other pile and whatever they didn’t take from theirs, comes back to you for your next turn.',
    'On your turn, play cards one at a time. Coins buy cards; might defeats foes for points. You can also buy Apprentice and Soldier at any time, and defeat one Bandit per turn.',
    'Follow-up: some cards get a bonus if the card you played just before them is the same faction (Guild, Blade or Mystic). Play order matters.',
    'Banish removes a card from your deck for good. Bought cards go to your discard pile, which is shuffled into a new deck when your deck runs out.',
    'Cards that came back to you and that you don’t take go to the bottom of the market.',
    `The game ends after the round in which the ${CD_POOL}-point pool runs out, or after round 20. Points from foes plus points printed on your cards; most wins.`,
  ],
  maxRounds:20,
  score:cdScore,
  setup(){
    const deck=o=>shuffle(Object.entries(o).flatMap(([k,n])=>rep(k,n)));
    const players=[0,1].map(()=>{const p={deck:shuffle([...rep('copper',8),...rep('militia',2)]),discard:[],hand:[],pts:0,reserve:[]};p.hand=draw(p,5);return p});
    const st={turn:0,round:1,players,cheap:deck(CD_CHEAP),prem:deck(CD_PREM),pool:CD_POOL,phase:'choose',
      coin:0,might:0,cnt:{},lastF:null,topNext:false,bandit:false,pending:null,mine:[],share:[],played:[],cut:null,
      log:['The opening cut was made at random.'],over:false,endTriggered:false};
    const cards=cdReveal(st);st.offer={cards,assign:shuffle([0,0,1,1,1])};
    return st;
  },
  view(st,ctx){
    const S=ctx.seat,A=st.turn,L=ctx.label,act=ctx.canAct,P=st.players,me=P[S],ap=P[A];
    const total=p=>p.deck.length+p.discard.length+p.hand.length;
    const v={oppInfo:`${total(P[1-S])} cards · ${P[1-S].reserve.length} coming back`,meInfo:`${total(me)} cards · ${st.pool} pts left in pool`,arena:'',hand:'',actions:'',prompt:''};
    if(st.over)return v;
    const peek=(label,hand)=>`<div class="peek-label">${label}</div>`+handHTML(hand.map(k=>({def:CDC[k],o:{cls:'peek'}})));
    const back=p=>p.reserve.length?rowHTML('Also coming back to you',p.reserve.map((k,i)=>cardHTML(CDC[k],{cls:'sm',style:`--i:${i}`})).join('')):'';
    if(st.phase==='choose'){
      const o=st.offer;
      v.prompt=act?`${L(1-A)} cut the market. Take a pile and shop from it first; ${L(1-A)} gets everything you leave.`:`${L(A)} is picking a pile.`;
      v.arena=cdPilesHTML(o.cards,o.assign,{pick:act})+(act?back(ap):'');
      v.hand=S===A?peek('Your hand',me.hand):peek('Your next hand',me.hand);
      return v;
    }
    if(st.phase==='cut'){
      const c=st.cut;
      v.prompt=act?`Cut the market for ${L(1-A)}. They take a pile and shop from it first; you get everything they leave.`:`${L(A)} is cutting the market.`;
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
    const canGet=k=>act&&!pend&&(k==='bandit'&&st.bandit?false:isFoe(k)?st.might>=CDC[k].need:st.coin>=CDC[k].cost);
    const buyBtn=(k,i,src)=>cardHTML(CDC[k],{btn:true,disabled:!canGet(k),cls:`sm${canGet(k)?' glow':''}`,style:`--i:${i}`,
      badge:src==='a'?(k==='bandit'?(st.bandit?'✓':'×1'):'∞'):null,attrs:`data-a="cdGet" data-i="${src}${src==='a'?k:i}" aria-label="${isFoe(k)?'Defeat':'Buy'} ${CDC[k].n}"`});
    const you=S===A;
    v.arena=res+(st.played.length?rowHTML('In play',st.played.map((k,i)=>cardHTML(CDC[k],{btn:banish,cls:`mini${banish?' banishable':''}`,style:`--i:${i}`,attrs:banish?`data-a="cdBanish" data-i="p${i}"`:''})).join(''),'played'):'')
      +`<div class="cd-row">${rowHTML(`${you?'Pile you took':`${L(A)}’s pile`} <span class="muted">· leftovers go to ${you?L(1-A):'you'}</span>`,st.mine.map((k,i)=>buyBtn(k,i,'m')).join('')||'<p class="empty">Nothing left</p>','mkt')}`
      +(st.share.length?rowHTML(you?'Came back to you':`Came back to ${L(A)}`,st.share.map((k,i)=>buyBtn(k,i,'s')).join(''),'mkt'):'')
      +`${rowHTML('Always available',CD_ALWAYS.map((k,i)=>buyBtn(k,i,'a')).join(''),'always')}</div>`;
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
      st.mine=pile;st.share=P.reserve;P.reserve=[];st.offer=null;st.phase='main';
      st.players[1-me].reserve=rest;
      st.log.push(`${ctx.label(me)} took pile ${'AB'[k]} (${pile.map(x=>CDC[x].n).join(', ')}). ${ctx.label(1-me)} gets ${rest.map(x=>CDC[x].n).join(', ')||'nothing'}, plus anything left over.`);
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
      const me=st.turn,P=st.players[me],src=w[0],list=src==='m'?st.mine:src==='s'?st.share:null,k=list?list[+w.slice(1)]:w.slice(1),d=CDC[k];
      if(!d)return;
      if(k==='bandit'&&st.bandit)return toast('Only one Bandit per turn.');
      if(d.need){
        if(st.might<d.need)return;
        st.might-=d.need;cdGain(st,me,d.pts);sfx('score');
        if(k==='bandit')st.bandit=true;
        if(k==='brigand')st.pending={t:'banish'};
        if(k==='troll'){P.hand.push(...draw(P,1));FX.deal=true}
        st.log.push(`${ctx.label(me)} defeated ${d.n} (+${d.pts}).`);
      }else{
        if(st.coin<d.cost)return;
        st.coin-=d.cost;
        if(st.topNext){P.deck.push(k);st.topNext=false}else P.discard.push(k);
        sfx('card');st.log.push(`${ctx.label(me)} bought ${d.n}.`);
      }
      if(list)list.splice(+w.slice(1),1);
    },
    cdEnd(st,_,ctx){
      if(st.pending)return;
      const me=st.turn,P=st.players[me];
      P.discard.push(...P.hand,...st.played);st.played=[];
      if(st.mine.length&&ctx)st.log.push(`${ctx.label(1-me)} gets back ${st.mine.map(x=>CDC[x].n).join(', ')}.`);
      st.players[1-me].reserve.push(...st.mine);st.mine=[];
      cdReturn(st,st.share);st.share=[];
      P.hand=draw(P,5);
      const cards=cdReveal(st);
      st.cut={cards,assign:cards.map((_,i)=>i%2)};
      Object.assign(st,{coin:0,might:0,cnt:{},lastF:null,topNext:false,bandit:false,phase:'cut'});
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
    const on=GAME.on,me=st.turn,P=st.players[me],O=st.players[1-me];
    if(st.phase==='choose'){
      const o=st.offer,e=cdEstimate(P.hand),opp=cdAvgHand(st,1-me);
      const ch=cdChoice(st,o.cards,o.assign,P.reserve,e.c,e.m,opp.c,opp.m);
      return on.cdPick(st,ch[1].s>ch[0].s?1:0,ctx);
    }
    if(st.phase==='cut'){
      // Show the cut for a beat before sending it.
      if(st.botCut){delete st.botCut;return on.cdSend(st)}
      const c=st.cut,n=c.cards.length,mine=cdEstimate(P.hand),opp=cdAvgHand(st,1-me);
      if(n<2)return on.cdSend(st);
      let best=c.assign,bs=-Infinity;
      for(let mask=1;mask<(1<<n)-1;mask++){
        if(mask&1)continue;
        const a=c.cards.map((_,i)=>mask>>i&1);
        const ch=cdChoice(st,c.cards,a,O.reserve,opp.c,opp.m,mine.c,mine.m),t=ch[1].s>ch[0].s?ch[1]:ch[0];
        // Re-score what comes back with this bot's actual next hand.
        const pile=k=>c.cards.filter((_,i)=>a[i]===k),theirs=pile(t.k),plan=cdPlan(theirs.concat(O.reserve),opp.c,opp.m,st);
        const rest=pile(1-t.k).concat(theirs.filter((_,i)=>!plan.set.includes(i))).concat(P.reserve);
        const s=cdPlan(rest,mine.c,mine.m,st).v-.6*t.v+rnd(10)/100;
        if(s>bs){bs=s;best=a}
      }
      c.assign=best;st.botCut=true;sfx('tap');return;
    }
    const all=st.mine.concat(st.share),at=i=>i<st.mine.length?'m'+i:'s'+(i-st.mine.length);
    if(st.pending){
      if(st.pending.t==='adept'){
        const rest=cdEstimate(P.hand);
        const a=cdPlan(all,st.coin+2+rest.c,st.might+rest.m,st).v,b=cdPlan(all,st.coin+rest.c,st.might+2+rest.m,st).v;
        return on.cdAdept(st,a>=b?'c':'m');
      }
      const pick=['copper','militia'].map(k=>[P.hand.indexOf(k),st.played.indexOf(k)]).flat();
      const [hc,pc,hm,pm]=pick,w=pc>=0?'p'+pc:hc>=0?'h'+hc:st.round>=6&&pm>=0?'p'+pm:st.round>=6&&hm>=0?'h'+hm:'skip';
      return on.cdBanish(st,w,ctx);
    }
    if(P.hand.length)return on.cdPlay(st,cdNextPlay(st,P.hand));
    const plan=cdPlan(all,st.coin,st.might,st);
    if(plan.set.length){
      const foe=plan.set.find(i=>isFoe(all[i])),i=foe!=null?foe:plan.set[0];
      return on.cdGet(st,at(i),ctx);
    }
    if(st.might>=3&&!st.bandit)return on.cdGet(st,'abandit',ctx);
    if(st.coin>=3&&st.round<13){
      const own=cdOwned(st,me),m=own.filter(k=>CDC[k].m).length,c=own.filter(k=>CDC[k].c).length;
      return on.cdGet(st,m*2<c?'asoldier':'aapprentice',ctx);
    }
    return on.cdEnd(st,null,ctx);
  },
};
