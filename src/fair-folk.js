// =====================================================================
// FAIR FOLK: your opponent splits your hand into two piles; you keep one.
// =====================================================================
const FFC={
  penny:{n:'Penny',g:1,txt:'+1 Glamour.'},
  svow:{n:'Small Vow',vp:1,txt:'1 ★. Does nothing in hand.'},
  bell:{n:'Silver Bell',cost:3,g:2,txt:'+2 Glamour.'},
  twin:{n:'Twin Lantern',cost:2,g:1,txt:'+1. +2 more if another Twin Lantern is in the same pile.'},
  hermit:{n:'Hermit',cost:3,g:1,txt:'+1, or +4 if it is alone in its pile.'},
  hoard:{n:'Hoard',cost:4,g:1,txt:'+1 for each card in its pile, itself included.'},
  change:{n:'Changeling',cost:4,g:2,txt:'+2. If spurned, it moves into the kept pile.'},
  grudge:{n:'Grudge',cost:3,g:1,txt:'+1. If spurned, the divider gets no tithe.'},
  mirror:{n:'Mirror',cost:5,g:0,txt:'+Glamour equal to the best printed value in the other pile.'},
  witness:{n:'Witness',cost:4,g:1,txt:'+1. Next turn you split your own hand.'},
  vow:{n:'Vow',cost:5,vp:3,txt:'3 ★. Does nothing in hand.'},
  gvow:{n:'Grand Vow',cost:8,vp:6,txt:'6 ★. Does nothing in hand.'},
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
function ffPiles(hand,assign,editable,forWhom){
  return `<div class="piles">${[0,1].map(k=>{
    const r=ffResolve(hand,assign,k),n=assign.filter(x=>x===k).length;
    return `<div class="pile ${'AB'[k]}"><h3 class="${'AB'[k]}">Pile ${'AB'[k]} <span class="muted">· ${n} card${n===1?'':'s'}</span></h3>
      <div class="cards mini">${hand.map((c,i)=>assign[i]!==k?'':cardHTML(FFC[c],{btn:editable,cls:'p'+'AB'[k],
        attrs:editable?`data-a="ffToggle" data-i="${i}" aria-label="Move ${FFC[c].n} to the other pile"`:''})).join('')||'<p class="muted">Empty</p>'}</div>
      ${n?`<p class="calc">If ${forWhom} keeps this: <b>+${r.g}</b> Glamour. Divider's tithe: <b>${r.tithe}</b>${r.moved?' · Changeling jumps over':''}</p>`:''}
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
// Bot: as divider, minimise what the chooser gets, minus the tithe it earns.
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
  key:'fair-folk',title:'Fair Folk',color:'var(--ff)',
  hook:'Your opponent splits every hand you draw. You choose which half to play.',
  turn:['Pick one of the two piles your opponent made from your hand, and play it.','Buy cards with Glamour.','Draw your opponent’s next hand and split it for them.'],
  watch:'Does splitting feel like a puzzle or a chore? Which cards does the divider dread? Does anyone ever get to run a combo?',
  rules:[
    'Each player starts with 7 Pennies and 3 Small Vows. Hands are 5 cards.',
    'The divider splits your hand into two piles of at least one card. You keep one pile and play it. The other pile is spurned: it does nothing except trigger "if spurned" text.',
    'The divider earns a tithe of 1 Glamour per spurned card, banked for their next turn. Lopsided splits cost them.',
    'Buy as many cards as you can afford. Bought cards go to your discard pile.',
    'Vows score at the end and do nothing in hand, so they make your hands easier to split against you.',
    'The game ends after the round in which the Grand Vows or any three piles run out, or after round 15. Most ★ wins.',
    'Seat 1’s opening hand is split at random.',
  ],
  score:ffVP,
  setup(){
    const players=[0,1].map(()=>({deck:shuffle([...rep('penny',7),...rep('svow',3)]),discard:[],bank:0,selfSplit:false}));
    const hand=draw(players[0],5);
    return {turn:0,round:1,players,supply:{...FF_SUPPLY},offer:{seat:0,hand,assign:randSplit(hand.length),self:false},
      phase:'choose',glamour:0,bought:[],log:['Seat 1’s opening hand was split at random.'],over:false,endTriggered:false};
  },
  view(st,ctx){
    const me=st.turn,opp=1-me,L=ctx.label;
    let h='';
    if(!ctx.canAct){
      h+=`<div class="panel"><p class="status">${st.over?'Game over.':`Waiting for ${L(me)}.`}</p>`;
      if(!st.over&&st.offer&&st.phase==='choose')h+=`<p class="muted">${L(opp)} split this hand for ${L(me)}:</p>`+ffPiles(st.offer.hand,st.offer.assign,false,L(me));
      h+=`<p class="muted">Banked tithe: ${L(0)} ${st.players[0].bank} · ${L(1)} ${st.players[1].bank}</p></div>`;
      return h+`<div class="panel"><h3>Market</h3>${marketHTML(FFC,st.supply,0,false,'ffBuy')}</div>`;
    }
    const P=st.players[me];
    if(st.phase==='ownsplit'){
      h+=`<div class="panel"><h3>Your Witness lets you split your own hand</h3><p class="muted">Tap a card to move it to the other pile. Each pile needs at least one card.</p>
        ${ffPiles(st.offer.hand,st.offer.assign,true,'you')}<div class="row"><button class="btn primary" data-a="ffLock">Lock in this split</button></div></div>`;
    }else if(st.phase==='choose'){
      const sp=st.offer.assign;
      h+=`<div class="panel"><h3>${st.offer.self?'Your split':`${L(opp)} split your hand`}</h3>${ffPiles(st.offer.hand,sp,false,'you')}
        <div class="row">${[0,1].map(k=>sp.includes(k)?`<button class="btn primary" data-a="ffKeep" data-i="${k}">Keep pile ${'AB'[k]}</button>`:'').join('')}
        ${P.bank?`<span class="muted">Plus ${P.bank} banked tithe.</span>`:''}</div></div>`;
    }else if(st.phase==='buy'){
      h+=`<div class="panel"><div class="spread"><div><div class="label">Glamour to spend</div><div class="big">${st.glamour}</div></div>
        <div class="row">${st.bought.length?`<span class="muted">Bought: ${st.bought.map(k=>FFC[k].n).join(', ')}</span>`:''}<button class="btn primary" data-a="ffDoneBuy">Done buying</button></div></div>
        ${marketHTML(FFC,st.supply,st.glamour,true,'ffBuy')}</div>`;
    }else if(st.phase==='split'){
      const O=st.players[opp];
      h+=`<div class="panel"><h3>Split ${L(opp)}’s next hand</h3>`+(O.selfSplit
        ?`<p>${L(opp)} played a Witness, so they will split this hand themselves.</p><div class="row"><button class="btn primary" data-a="ffSend">End turn</button></div>`
        :`<p class="muted">Tap a card to move it. They keep one pile. You earn 1 Glamour next turn per card in the pile they don’t keep.</p>
          ${ffPiles(st.splitHand,st.splitAssign,true,L(opp))}<div class="row"><button class="btn primary" data-a="ffSend">Send split and end turn</button></div>`)+`</div>`;
    }
    h+=`<p class="muted">Your cards: ${P.deck.length+P.discard.length} · ${L(opp)}’s banked tithe: ${st.players[opp].bank}</p>`;
    return h;
  },
  on:{
    ffToggle(st,i){const a=st.phase==='split'?st.splitAssign:st.offer.assign;a[+i]=1-a[+i]},
    ffLock(st){if(!validSplit(st.offer.assign))return toast('Each pile needs at least one card.');st.phase='choose'},
    ffKeep(st,k,ctx){
      k=+k;const me=st.turn,P=st.players[me],O=st.players[1-me];
      const r=ffResolve(st.offer.hand,st.offer.assign,k),bank=P.bank;
      st.glamour=r.g+bank;P.bank=0;O.bank+=r.tithe;P.discard.push(...st.offer.hand);
      if(r.witness)P.selfSplit=true;
      st.log.push(`${ctx.label(me)} kept pile ${'AB'[k]} (${r.kept.map(c=>FFC[c].n).join(', ')}) for ${r.g} Glamour${bank?` + ${bank} banked`:''}. ${ctx.label(1-me)} banks ${r.tithe} tithe.`);
      st.offer=null;st.phase='buy';
    },
    ffBuy(st,key){
      const c=FFC[key];if(st.glamour<c.cost||!st.supply[key])return;
      st.glamour-=c.cost;st.supply[key]--;st.players[st.turn].discard.push(key);st.bought.push(key);
      if(st.supply.gvow===0||emptyPiles(st.supply)>=3)st.endTriggered=true;
    },
    ffDoneBuy(st,_,ctx){
      const opp=1-st.turn;
      if(st.bought.length)st.log.push(`${ctx.label(st.turn)} bought ${st.bought.map(k=>FFC[k].n).join(', ')}.`);
      st.bought=[];st.splitHand=draw(st.players[opp],5);st.splitAssign=defSplit(st.splitHand.length);st.phase='split';
    },
    ffSend(st){
      const opp=1-st.turn,O=st.players[opp];
      if(O.selfSplit){st.offer={seat:opp,hand:st.splitHand,assign:defSplit(st.splitHand.length),self:true};O.selfSplit=false}
      else{
        if(!validSplit(st.splitAssign))return toast('Each pile needs at least one card.');
        st.offer={seat:opp,hand:st.splitHand,assign:st.splitAssign,self:false};
      }
      st.splitHand=null;st.splitAssign=null;st.glamour=0;st.phase=st.offer.self?'ownsplit':'choose';
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
    if(st.phase==='split'){if(!st.players[1-st.turn].selfSplit)st.splitAssign=ffDenySplit(st.splitHand);return on.ffSend(st)}
  },
};
