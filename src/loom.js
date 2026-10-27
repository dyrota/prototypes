// =====================================================================
// LOOM: each card is a link; you continue the thread your opponent left.
// =====================================================================
const SYM={S:'☼',M:'☾'+T,L:'❦'+T,W:'≈'};
const SYMNAME={S:'Sun',M:'Moon',L:'Leaf',W:'Wave'};
const symH=s=>s==='*'?'<span class="sym any" title="any symbol">✱</span>'
  :s==='='?'<span class="sym any" title="same as incoming">=</span>'
  :`<span class="sym ${s}" title="${SYMNAME[s]}">${SYM[s]}</span>`;
const LMC={
  spSM:{n:'Spindle',in:'S',out:'M',g:1},spML:{n:'Spindle',in:'M',out:'L',g:1},spLW:{n:'Spindle',in:'L',out:'W',g:1},spWS:{n:'Spindle',in:'W',out:'S',g:1},
  spSL:{n:'Spindle',in:'S',out:'L',g:1},spMW:{n:'Spindle',in:'M',out:'W',g:1},spLS:{n:'Spindle',in:'L',out:'S',g:1},spWM:{n:'Spindle',in:'W',out:'M',g:1},
  knot:{n:'Knot',in:'*',out:'=',g:0,txt:'Matches anything and passes the symbol through.'},
  silk:{n:'Silk',cost:2,in:'S',out:'M',g:2,kind:'b'},
  copper:{n:'Copper Thread',cost:2,in:'M',out:'W',g:2,kind:'b'},
  silver:{n:'Silver Thread',cost:2,in:'W',out:'L',g:2,kind:'b'},
  moss:{n:'Moss Thread',cost:2,in:'L',out:'S',g:2,kind:'b'},
  bobbin:{n:'Bobbin',cost:3,in:'M',out:'S',g:0,draw:1,kind:'d',txt:'Draw 1 card.'},
  shuttle:{n:'Shuttle',cost:3,in:'L',out:'W',g:0,draw:1,kind:'d',txt:'Draw 1 card.'},
  snarl:{n:'Snarl',cost:3,in:'S',out:'W',g:1,kind:'d',txt:'If your thread ends on this, your opponent loses a random card from their next hand.'},
  gold:{n:'Gold Thread',cost:4,in:'*',out:'=',g:2,kind:'d',txt:'Matches anything and passes the symbol through.'},
  mark:{n:'Weaver’s Mark',cost:4,in:'*',out:'*',g:1,kind:'d',txt:'Matches anything. You choose the outgoing symbol.'},
  tapestry:{n:'Tapestry',cost:5,in:'W',out:'S',vp:2,kind:'c'},
  banner:{n:'Banner',cost:5,in:'M',out:'L',vp:2,kind:'c'},
  master:{n:'Masterwork',cost:8,in:'*',out:'*',vp:4,kind:'c',txt:'Matches anything. You choose the outgoing symbol.'},
};
const faceBead=s=>s==='*'?'<span class="fb any">✱</span>':s==='='?'<span class="fb any">=</span>':`<span class="fb ${s}">${SYM[s]}</span>`;
for(const d of Object.values(LMC)){
  const bits=[];
  if(d.g)bits.push(`+${d.g} Glamour.`);
  if(d.vp)bits.push(`${d.vp} ★ each time you weave it.`);
  if(d.txt)bits.push(d.txt);
  d.txt=bits.join(' ');
  d.kind=d.kind||'a';
  d.face=`<div class="links-face">${faceBead(d.in)}<span class="arrow">→</span>${faceBead(d.out)}</div>`;
}
const LM_SUPPLY={silk:6,copper:6,silver:6,moss:6,bobbin:5,shuttle:5,snarl:5,gold:5,mark:5,tapestry:6,banner:6,master:4};
const lmBonus=n=>n>=6?4:n===5?2:n===4?1:0;
const lmCur=st=>st.chain.length?st.chain[st.chain.length-1].out:st.end;
const lmMatch=(c,cur)=>c.in==='*'||c.in===cur;
function lmApply(st,i,chosen){
  const P=st.players[st.turn],key=P.hand.splice(i,1)[0],c=LMC[key],cur=lmCur(st);
  const match=lmMatch(c,cur),inS=c.in==='*'?cur:c.in;
  const out=c.out==='='?inS:c.out==='*'?chosen:c.out;
  st.chain.push({k:key,out,dead:!match});
  FX.bead=true;
  if(match){
    st.glamour+=c.g||0;
    if(c.vp){P.score+=c.vp;st.vpGained+=c.vp;pop(st.turn,`+${c.vp} ★`);sfx('score')}else sfx('card');
    if(c.draw)P.hand.push(...draw(P,c.draw));
  }else sfx('tap');
}
function lmInCounts(pl){
  const c={S:0,M:0,L:0,W:0,'*':0};
  pl.deck.concat(pl.discard,pl.hand).forEach(k=>c[LMC[k].in]++);
  return c;
}
// Bot: search every playable ordering of the hand (draws ignored) and score the thread.
function lmPlan(hand,cur,oppIn,startLen){
  let best={score:-1,seq:[]};
  const total=Object.values(oppIn).reduce((a,b)=>a+b,0)||1;
  (function dfs(used,cur,seq,val){
    const len=startLen+seq.length;
    const endPen=seq.length?3*((oppIn[cur]||0)+(oppIn['*']||0))/total:0;
    const sc=val+lmBonus(len)*2.5-endPen+seq.length*0.01;
    if(sc>best.score)best={score:sc,seq:seq.slice()};
    hand.forEach((k,i)=>{
      if(used&(1<<i))return;
      const c=LMC[k];if(!lmMatch(c,cur))return;
      const inS=c.in==='*'?cur:c.in;
      const outs=c.out==='*'?['S','M','L','W']:[c.out==='='?inS:c.out];
      for(const o of outs){seq.push({i,out:o});dfs(used|(1<<i),o,seq,val+(c.g||0)+(c.vp||0)*2.5+(c.draw?1.5:0));seq.pop()}
    });
  })(0,cur,[],0);
  return best;
}
function lmBotBuy(st){
  const g=st.glamour,s=st.supply;
  const order=['master','tapestry','banner','gold','mark','bobbin','shuttle','snarl','silk','copper','silver','moss'];
  return order.find(k=>s[k]>0&&LMC[k].cost<=g&&(LMC[k].cost>=g-2||g<4));
}
function threadHTML(st,L){
  let h=`<div class="bead start ${st.end}" title="Thread start">${SYM[st.end]}<small>${st.endBy==null?'Start':L(st.endBy)}</small></div>`;
  st.chain.forEach((x,j)=>{
    const last=j===st.chain.length-1;
    h+=`<div class="link${x.dead?' dead':''}"></div><div class="bead ${x.out}${x.dead?' dead':''}${last?' end':''}${last&&FX.bead?' new':''}">${SYM[x.out]}<small>${LMC[x.k].n}</small></div>`;
  });
  if(!st.chain.length)h=h.replace('bead start','bead start end');
  return `<div class="thread">${h}</div>`;
}
const meterHTML=n=>`<div class="meter" aria-label="Thread length ${n}">${[1,2,3,4,5,6].map(i=>`<span class="notch${i<=n?' on':''}${i>=4?' b':''}">${i===4?'+1':i===5?'+2':i===6?'+4':''}</span>`).join('')}</div>`;

const GAME={
  key:'loom',title:'Loom',
  hook:'Every card is a link from one symbol to another. You start your turn wherever your opponent left the thread.',
  turn:['Continue the shared thread from the symbol your opponent ended on, matching card to card.','Score Glamour, ★ and a bonus for long threads, then buy.','The symbol you end on is where your opponent must start.'],
  watch:'Do you feel the pull between a long thread and a nasty ending symbol? Do turns fizzle when you inherit a bad symbol?',
  rules:[
    'Each card shows an incoming symbol → an outgoing symbol. ✱ matches anything; = passes the incoming symbol through.',
    'Your first card must match the symbol your opponent ended on. If it doesn’t, you may still play it as a restart: it sets the thread but gives nothing.',
    'After that, each card must match the outgoing symbol of the card before it. Stop whenever you like.',
    'Thread bonus: 4 cards +1 ★, 5 cards +2 ★, 6 or more +4 ★.',
    '★ cards score every time you weave them, so they compound.',
    'Leftover cards are discarded. Draw 5 at the end of your turn.',
    'The game ends after the round in which the Masterworks or any two piles run out, or after round 14.',
  ],
  maxRounds:14,
  score:(st,i)=>st.players[i].score,
  setup(){
    const starter=['spSM','spML','spLW','spWS','spSL','spMW','spLS','spWM','knot','knot'];
    const players=[0,1].map(()=>{const p={deck:shuffle(starter.slice()),discard:[],hand:[],score:0};p.hand=draw(p,5);return p});
    return {turn:0,round:1,players,supply:{...LM_SUPPLY},end:'SMLW'[rnd(4)],endBy:null,chain:[],phase:'weave',glamour:0,vpGained:0,
      bought:[],pending:null,log:['The thread starts on a random symbol.'],over:false,endTriggered:false};
  },
  view(st,ctx){
    const S=ctx.seat,A=st.turn,L=ctx.label,act=ctx.canAct,P=st.players,me=P[S],O=P[1-S];
    const total=p=>p.deck.length+p.discard.length+p.hand.length;
    const v={oppInfo:`${total(O)} cards · hand ${O.hand.length}`,meInfo:`${total(me)} cards`,arena:'',hand:'',actions:'',prompt:''};
    const cur=lmCur(st);
    v.arena=`<div class="loom">${threadHTML(st,L)}<div class="loom-row">${meterHTML(st.chain.length)}<span class="chip gold">${st.glamour} Glamour</span>${st.vpGained?`<span class="chip">+${st.vpGained} ★</span>`:''}</div></div>`;
    if(st.over)return v;
    const preview=()=>`<div class="peek-label">Your next hand</div>`+handHTML(me.hand.map(k=>({def:LMC[k],o:{cls:'peek'}})));
    if(st.phase==='weave'){
      if(act){
        const first=!st.chain.length;
        v.prompt=`Weave from ${symH(cur)}. Each card must match the last symbol.`;
        v.hand=handHTML(me.hand.map((k,i)=>{
          const c=LMC[k],ok=lmMatch(c,cur),can=ok||first;
          return {def:c,o:{btn:true,disabled:!can||st.pending!=null,cls:ok?'glow':can?'restart':'dim',attrs:`data-a="lmPlay" data-i="${i}"`,foot:!ok&&first?'Restart: no effect':''}};
        }))||'<p class="empty">No cards left in hand.</p>';
        const oc=lmInCounts(O);
        v.actions=`<span class="hint">${L(1-S)} can start on ${['S','M','L','W'].map(s=>`${symH(s)}${oc[s]}`).join(' ')} ✱${oc['*']}</span><button class="btn primary big" data-a="lmFinish">Finish thread</button>`;
        if(st.pending!=null){
          v.arena+=`<div class="picker"><span>Choose where ${LMC[me.hand[st.pending]].n} leads:</span>${['S','M','L','W'].map(s=>`<button class="bead ${s}" data-a="lmOut" data-i="${s}" aria-label="${SYMNAME[s]}">${SYM[s]}</button>`).join('')}<button class="btn small" data-a="lmCancel">Cancel</button></div>`;
        }
      }else{
        v.prompt=`${L(A)} is weaving from ${symH(cur)}.`;
        v.hand=preview();
      }
    }else{
      v.prompt=act?'Spend your Glamour on new threads.':`${L(A)} is shopping.`;
      v.arena+=shopHTML(LMC,st.supply,st.glamour,act,'lmBuy');
      if(act)v.actions=`<button class="btn primary big" data-a="lmEnd">End turn</button>`;
      v.hand=preview();
    }
    return v;
  },
  on:{
    lmPlay(st,i){
      i=+i;const P=st.players[st.turn],c=LMC[P.hand[i]];
      if(!lmMatch(c,lmCur(st))&&st.chain.length)return;
      if(c.out==='*'){st.pending=i;sfx('tap');return}
      lmApply(st,i,null);
    },
    lmOut(st,s){if(st.pending==null)return;const i=st.pending;st.pending=null;lmApply(st,i,s)},
    lmCancel(st){st.pending=null},
    lmFinish(st,_,ctx){
      const P=st.players[st.turn],b=lmBonus(st.chain.length);P.score+=b;
      if(b){pop(st.turn,`Thread bonus +${b} ★`);sfx('score')}
      st.log.push(`${ctx.label(st.turn)} wove ${st.chain.length} card${st.chain.length===1?'':'s'} for ${st.glamour} Glamour and ${st.vpGained+b} ★${b?` (thread bonus ${b})`:''}${st.chain.length?`, ending on ${SYM[lmCur(st)]}`:''}.`);
      st.pending=null;st.phase='buy';
    },
    lmBuy(st,key){
      const c=LMC[key];if(st.glamour<c.cost||!st.supply[key])return;
      st.glamour-=c.cost;st.supply[key]--;st.players[st.turn].discard.push(key);st.bought.push(key);sfx('card');
      if(st.supply.master===0||emptyPiles(st.supply)>=2)st.endTriggered=true;
    },
    lmEnd(st,_,ctx){
      const me=st.turn,P=st.players[me],O=st.players[1-me];
      if(st.bought.length)st.log.push(`${ctx.label(me)} bought ${st.bought.map(k=>LMC[k].n).join(', ')}.`);
      if(st.chain.length){
        const last=st.chain[st.chain.length-1];st.end=last.out;st.endBy=me;
        if(last.k==='snarl'&&!last.dead&&O.hand.length){
          const lost=O.hand.splice(rnd(O.hand.length),1)[0];O.discard.push(lost);
          st.log.push(`Snarl: ${ctx.label(1-me)} loses ${LMC[lost].n} from their next hand.`);
          pop(1-me,'Snarled!','bad');
        }
      }
      P.discard.push(...P.hand,...st.chain.map(x=>x.k));P.hand=draw(P,5);
      Object.assign(st,{chain:[],glamour:0,vpGained:0,bought:[],pending:null,phase:'weave'});
      sfx('tap');
      return passTurn(st,14);
    },
  },
  bot(st,ctx){
    const on=GAME.on,P=st.players[st.turn];
    if(st.phase==='buy'){const k=st.bought.length<2&&lmBotBuy(st);return k?on.lmBuy(st,k):on.lmEnd(st,0,ctx)}
    const oppIn=lmInCounts(st.players[1-st.turn]),cur=lmCur(st);
    if(!st.chain.length&&P.hand.length&&!P.hand.some(k=>lmMatch(LMC[k],cur))){
      // Nothing matches: pick the restart card that opens the best thread.
      let bi=-1,bs=1;
      P.hand.forEach((k,i)=>{
        const c=LMC[k];if(c.out==='*'||c.out==='=')return;
        const rest=P.hand.filter((_,j)=>j!==i),s=lmPlan(rest,c.out,oppIn,1).score-(c.g||0)-(c.vp||0)*2.5;
        if(s>bs){bs=s;bi=i}
      });
      if(bi<0)return on.lmFinish(st,0,ctx);
      return on.lmPlay(st,bi);
    }
    const plan=lmPlan(P.hand,cur,oppIn,st.chain.length);
    if(!plan.seq.length)return on.lmFinish(st,0,ctx);
    const step=plan.seq[0];
    on.lmPlay(st,step.i);
    if(st.pending!=null)on.lmOut(st,step.out);
  },
};
