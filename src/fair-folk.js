// =====================================================================
// FAIR FOLK: your opponent splits your hand into two piles; you keep one.
// =====================================================================
const FFC={
  penny:{n:'Penny',g:1,kind:'a',art:'◉'+T,txt:'+1 coin.'},
  svow:{n:'Small Gem',vp:1,kind:'c',art:'♢'+T,txt:'Worth 1 point. No coins.'},
  bell:{n:'Silver Bell',cost:3,g:2,kind:'a',art:'♫'+T,txt:'+2 coins.'},
  twin:{n:'Twin Lantern',cost:2,g:1,kind:'b',art:'⚭'+T,txt:'+1 coin, or +3 if another Twin Lantern is in the same pile.'},
  hermit:{n:'Hermit',cost:3,g:1,kind:'b',art:'☗'+T,txt:'+1 coin, or +4 if it is alone in its pile.'},
  hoard:{n:'Hoard',cost:4,g:1,kind:'b',art:'❖'+T,txt:'+1 coin for each card in its pile, itself included.'},
  change:{n:'Changeling',cost:4,g:2,kind:'b',art:'◐'+T,txt:'+2 coins. If it’s in the pile you didn’t pick, it jumps into the one you did.'},
  grudge:{n:'Grudge',cost:3,g:1,kind:'d',art:'✠'+T,txt:'+1 coin. If it’s in the pile you didn’t pick, the splitter gets no bonus.'},
  mirror:{n:'Mirror',cost:5,g:0,kind:'b',art:'◈'+T,txt:'Coins equal to the best single card in the other pile.'},
  witness:{n:'Witness',cost:4,g:1,kind:'d',art:'⊙'+T,txt:'+1 coin. Next turn you split your own hand.'},
  vow:{n:'Gem',cost:5,vp:3,kind:'c',art:'♦'+T,txt:'Worth 3 points. No coins.'},
  gvow:{n:'Crown',cost:8,vp:6,kind:'c',art:'♛'+T,txt:'Worth 6 points. No coins.'},
};
const FF_SUPPLY={twin:8,bell:8,hermit:6,grudge:6,hoard:6,change:6,witness:6,mirror:6,vow:8,gvow:4};
const defSplit=n=>Array.from({length:n},(_,i)=>i<Math.ceil(n/2)?0:1);
const validSplit=a=>a.length<2||(a.includes(0)&&a.includes(1));
function randSplit(n){
  if(n<2)return Array(n).fill(0);
  const idx=shuffle([...Array(n).keys()]),a=Array(n).fill(1);
  idx.slice(0,1+rnd(n-1)).forEach(i=>a[i]=0);
  return a;
}
function ffResolve(hand,assign,k){
  let kept=[],sp=[];
  hand.forEach((c,i)=>(assign[i]===k?kept:sp).push(c));
  const moved=sp.filter(c=>c==='change').length;
  if(moved){kept=kept.concat(rep('change',moved));sp=sp.filter(c=>c!=='change')}
  const best=sp.reduce((m,c)=>Math.max(m,FFC[c].g||0),0);
  const twins=kept.filter(c=>c==='twin').length;
  let g=0;
  for(const c of kept){
    if(c==='twin')g+=1+(twins>1?2:0);
    else if(c==='hermit')g+=kept.length===1?4:1;
    else if(c==='hoard')g+=kept.length;
    else if(c==='mirror')g+=best;
    else g+=FFC[c].g||0;
  }
  return {g,tithe:sp.includes('grudge')?0:sp.length,kept,sp,moved,witness:kept.includes('witness')};
}
function ffVP(st,i){
  const P=st.players[i];let all=P.deck.concat(P.discard);
  if(st.offer&&st.offer.seat===i)all=all.concat(st.offer.hand);
  if(st.splitHand&&st.turn!==i)all=all.concat(st.splitHand);
  return all.reduce((s,c)=>s+(FFC[c].vp||0),0);
}
function ffPilesHTML(hand,assign,o){
  return `<div class="piles">${[0,1].map(k=>{
    const r=ffResolve(hand,assign,k),idx=hand.map((_,i)=>i).filter(i=>assign[i]===k);
    return `<div class="pile p${'AB'[k]}">
      <div class="pile-h"><span class="pile-name">Pile ${'AB'[k]}</span>${idx.length?`<span class="chip gold">+${r.g} coins</span><span class="chip" title="Bonus coins the splitter gets if this pile is picked">splitter +${r.tithe}</span>`:''}</div>
      <div class="pile-cards">${idx.map((i,j)=>cardHTML(FFC[hand[i]],{btn:o.edit,cls:`sm${FX.deal?' deal':''}${o.edit?' movable':''}`,style:`--i:${j+k*3}`,
        attrs:o.edit?`data-a="ffToggle" data-i="${i}" aria-label="Move ${FFC[hand[i]].n} to pile ${'BA'[k]}"`:''})).join('')||'<p class="empty">Tap cards to move them here</p>'}</div>
      ${o.keep&&idx.length?`<button class="btn primary" data-a="ffKeep" data-i="${k}">Play pile ${'AB'[k]}</button>`:''}
    </div>`;
  }).join('')}</div>`;
}
// Every way to split a hand into two non-empty piles (pile labels don't matter, so card 0 is always in A).
function ffAllSplits(n){
  if(n<2)return [Array(n).fill(0)];
  const out=[];
  for(let m=0;m<(1<<n);m++){
    if(m&1)continue;
    const a=[...Array(n)].map((_,i)=>(m>>i)&1);
    if(validSplit(a))out.push(a);
  }
  return out;
}
// Bot: as splitter, minimise what the chooser gets, minus the bonus it earns.
function ffDenySplit(hand){
  let best=null,bs=Infinity;
  for(const a of ffAllSplits(hand.length)){
    const r0=ffResolve(hand,a,0),r1=ffResolve(hand,a,1);
    const pick=r0.g>r1.g||(r0.g===r1.g&&r0.tithe<=r1.tithe)?r0:r1;
    const s=pick.g-0.8*pick.tithe+rnd(10)/100;
    if(s<bs){bs=s;best=a}
  }
  return best;
}
function ffSelfSplit(hand){
  let best=null,bs=-1;
  for(const a of ffAllSplits(hand.length)){const s=Math.max(ffResolve(hand,a,0).g,ffResolve(hand,a,1).g);if(s>bs){bs=s;best=a}}
  return best;
}
function ffBotBuy(st){
  const g=st.glamour,s=st.supply,r=st.round;
  const want=[];
  if(g>=8)want.push('gvow');
  if(r>=5)want.push('vow');
  want.push('mirror','change','hoard','witness','bell','hermit','grudge');
  if(r<6)want.push('twin');
  return want.find(k=>s[k]>0&&FFC[k].cost<=g);
}

const GAME={
  key:'fair-folk',title:'Fair Folk',
  hook:'A classic deckbuilder with one twist: your opponent splits every hand you draw into two piles, and you only get to play one.',
  turn:['Pick one of the two piles your opponent made from your hand. You earn that pile’s coins.','Spend the coins on new cards for your deck.','Draw your opponent’s next hand and split it for them.'],
  watch:'Does splitting feel like a puzzle or a chore? Which cards does the splitter dread? Does anyone ever get to run a combo?',
  rules:[
    'Each player has their own deck, starting with 7 Pennies (+1 coin) and 3 Small Gems (1 point). Each turn you draw 5 cards.',
    'Your opponent splits those 5 cards into two piles. You pick one pile and earn its coins. The other pile earns nothing. Both piles then go to your discard pile.',
    'Spend your coins on cards from the shop. Bought cards go to your discard pile.',
    'When your deck runs out, your discard pile is shuffled into a new deck. That is how cards you bought come back into your hand.',
    'The splitter earns 1 bonus coin for each card in the pile you didn’t pick, added to their next turn. So lopsided splits cost them.',
    'Gems and Crowns are worth points at the end but give no coins. The more you buy, the easier your hands are to split against you.',
    'The game ends after the round in which the Crowns or any three shop piles run out, or after round 15. Most points wins.',
    'Seat 1’s first hand is split at random.',
  ],
  maxRounds:15,
  score:ffVP,
  setup(){
    const players=[0,1].map(()=>({deck:shuffle([...rep('penny',7),...rep('svow',3)]),discard:[],bank:0,selfSplit:false}));
    const hand=draw(players[0],5);
    return {turn:0,round:1,players,supply:{...FF_SUPPLY},offer:{seat:0,hand,assign:randSplit(hand.length),self:false},
      phase:'choose',glamour:0,bought:[],log:['Seat 1’s opening hand was split at random.'],over:false,endTriggered:false};
  },
  view(st,ctx){
    const S=ctx.seat,A=st.turn,L=ctx.label,act=ctx.canAct,P=st.players;
    const info=i=>`${P[i].deck.length+P[i].discard.length} cards · <span class="gold">${P[i].bank} bonus coins saved</span>`;
    const v={oppInfo:info(1-S),meInfo:info(S),arena:'',hand:'',actions:'',prompt:''};
    v.hand=`<div class="stacks">${stackHTML('Deck',P[S].deck.length)}${stackHTML('Discard',P[S].discard.length)}</div>`;
    if(st.over)return v;
    if(st.phase==='choose'){
      v.prompt=act?`${L(1-A)} split your hand into two piles. Pick one to play.`:`${L(A)} is choosing a pile.`;
      v.arena=ffPilesHTML(st.offer.hand,st.offer.assign,{keep:act});
      if(act&&P[A].bank)v.actions=`<span class="chip gold">+${P[A].bank} bonus coins from splitting</span>`;
    }else if(st.phase==='ownsplit'){
      v.prompt=act?'Your Witness lets you split your own hand.':`${L(A)} is splitting their own hand.`;
      v.arena=ffPilesHTML(st.offer.hand,st.offer.assign,{edit:act});
      if(act)v.actions=`<button class="btn primary big" data-a="ffLock">Lock in split</button>`;
    }else if(st.phase==='buy'){
      v.prompt=act?'Buy cards. They go to your discard pile and get shuffled into your deck later.':`${L(A)} is shopping.`;
      v.arena=`<div class="purse"><span class="purse-n">${st.glamour}</span><span class="purse-l">coins</span>${st.bought.length?`<span class="muted">Bought ${st.bought.map(k=>FFC[k].n).join(', ')}</span>`:''}</div>${shopHTML(FFC,st.supply,st.glamour,act,'ffBuy')}`;
      if(act)v.actions=`<button class="btn primary big" data-a="ffDoneBuy">Done buying</button>`;
    }else if(st.phase==='split'){
      const Tg=1-A,self=P[Tg].selfSplit;
      v.prompt=act?(self?`${L(Tg)} played a Witness and will split this hand.`:`Split ${L(Tg)}’s next hand. They pick a pile; you get 1 bonus coin per card in the other one.`)
        :`${L(A)} is splitting ${Tg===S&&!ctx.hot?'your':L(Tg)+'’s'} next hand.`;
      v.arena=ffPilesHTML(st.splitHand,st.splitAssign,{edit:act&&!self});
      if(act)v.actions=`<button class="btn primary big" data-a="ffSend">${self?'End turn':'Offer split'}</button>`;
    }
    return v;
  },
  on:{
    ffToggle(st,i){const a=st.phase==='split'?st.splitAssign:st.offer.assign;a[+i]=1-a[+i];sfx('tap')},
    ffLock(st){if(!validSplit(st.offer.assign))return toast('Each pile needs at least one card.');st.phase='choose';sfx('tap')},
    ffKeep(st,k,ctx){
      k=+k;const me=st.turn,P=st.players[me],O=st.players[1-me];
      const r=ffResolve(st.offer.hand,st.offer.assign,k),bank=P.bank;
      st.glamour=r.g+bank;P.bank=0;O.bank+=r.tithe;P.discard.push(...st.offer.hand);
      if(r.witness)P.selfSplit=true;
      st.log.push(`${ctx.label(me)} kept pile ${'AB'[k]} (${r.kept.map(c=>FFC[c].n).join(', ')}) for ${r.g} coins${bank?` + ${bank} bonus`:''}. ${ctx.label(1-me)} gets ${r.tithe} bonus coin${r.tithe===1?'':'s'}.`);
      pop(me,`+${st.glamour} coins`);if(r.tithe)pop(1-me,`+${r.tithe} bonus`,'good');sfx('coin');
      st.offer=null;st.phase='buy';
    },
    ffBuy(st,key){
      const c=FFC[key];if(st.glamour<c.cost||!st.supply[key])return;
      st.glamour-=c.cost;st.supply[key]--;st.players[st.turn].discard.push(key);st.bought.push(key);
      if(c.vp){pop(st.turn,`+${c.vp} points`);sfx('score')}else sfx('card');
      if(st.supply.gvow===0||emptyPiles(st.supply)>=3)st.endTriggered=true;
    },
    ffDoneBuy(st,_,ctx){
      const opp=1-st.turn;
      if(st.bought.length)st.log.push(`${ctx.label(st.turn)} bought ${st.bought.map(k=>FFC[k].n).join(', ')}.`);
      st.bought=[];st.splitHand=draw(st.players[opp],5);st.splitAssign=defSplit(st.splitHand.length);st.phase='split';
      FX.deal=true;sfx('card');
    },
    ffSend(st){
      const opp=1-st.turn,O=st.players[opp];
      if(O.selfSplit){st.offer={seat:opp,hand:st.splitHand,assign:defSplit(st.splitHand.length),self:true};O.selfSplit=false}
      else{
        if(!validSplit(st.splitAssign))return toast('Each pile needs at least one card.');
        st.offer={seat:opp,hand:st.splitHand,assign:st.splitAssign,self:false};
      }
      st.splitHand=null;st.splitAssign=null;st.glamour=0;st.phase=st.offer.self?'ownsplit':'choose';
      sfx('tap');
      return passTurn(st,15);
    },
  },
  // One bot decision per call; returns 'commit' when its turn is over.
  bot(st,ctx){
    const on=GAME.on;
    if(st.phase==='ownsplit'){st.offer.assign=ffSelfSplit(st.offer.hand);return on.ffLock(st)}
    if(st.phase==='choose'){
      const a=st.offer.assign,r=[0,1].map(k=>a.includes(k)?ffResolve(st.offer.hand,a,k).g:-1);
      return on.ffKeep(st,r[1]>r[0]?1:0,ctx);
    }
    if(st.phase==='buy'){const k=st.bought.length<2&&ffBotBuy(st);return k?on.ffBuy(st,k):on.ffDoneBuy(st,0,ctx)}
    if(st.phase==='split'){
      // Show the split for a beat before sending it.
      if(!st.players[1-st.turn].selfSplit&&!st.botSplit){st.splitAssign=ffDenySplit(st.splitHand);st.botSplit=true;sfx('tap');return}
      delete st.botSplit;return on.ffSend(st);
    }
  },
};
