// =====================================================================
// RELAY: same gauntlet for both players; the cards you pass up go to your rival.
// =====================================================================
const ENC=[
  {n:'Cellar Rats',need:3,vp:1,art:'⊛'},{n:'Road Bandits',need:4,vp:1,art:'⚑'},{n:'Wolf Pack',need:5,vp:2,art:'☾'},{n:'Bog Hag',need:5,vp:2,fail:2,art:'☋'},
  {n:'Ogre',need:6,vp:2,art:'♜'},{n:'Bandit Lord',need:7,vp:3,art:'♚'},{n:'Wyvern',need:8,vp:3,art:'⚶'},{n:'Bridge Troll',need:8,vp:3,fail:2,art:'⛰'},
  {n:'Lich',need:9,vp:4,art:'☠'},{n:'Hill Giant',need:10,vp:4,art:'♟'},{n:'Elder Wyrm',need:11,vp:5,art:'⚸'},{n:'The Hollow King',need:13,vp:6,art:'♛'},
];
ENC.forEach(e=>e.art+=T);
const RLC={
  spear:{n:'Spear',m:1,kind:'a',art:'↟'},
  ration:{n:'Rations',m:0,draw:1,kind:'a',art:'♨',txt:'Draw 1 card.'},
  wound:{n:'Wound',m:0,kind:'d',art:'✖',txt:'Does nothing.'},
  blade:{n:'Blade',m:2,kind:'b',art:'⚔'},
  great:{n:'Greatsword',m:3,kind:'b',art:'⚔'},
  scout:{n:'Scout',m:1,draw:1,kind:'c',art:'⌖',txt:'Draw 1 card.'},
  squire:{n:'Squire',m:0,draw:2,kind:'c',art:'♞',txt:'Draw 2 cards.'},
  warband:{n:'Warband',m:1,kind:'b',art:'⚐',txt:'+1 for each other Warband you play this turn.'},
  medic:{n:'Medic',m:1,kind:'c',art:'✚',txt:'Remove every Wound you play this turn from your deck.'},
  berserk:{n:'Berserker',m:4,kind:'b',art:'✹',txt:'After the fight, gain a Wound.'},
  trophy:{n:'Trophy',m:0,vp:2,kind:'e',art:'♛',txt:'+2 points when you take it. Does nothing after.'},
  tactician:{n:'Tactician',m:0,kind:'c',art:'♜',txt:'+1 for each different card you play this turn (not Wounds).'},
  lance:{n:'Lance',m:1,kind:'b',art:'➶',txt:'+3 more against foes that need 8 or more.'},
};
for(const d of Object.values(RLC)){
  d.art+=T;
  d.face=`<span class="glyph">${d.art}</span>${d.m?`<span class="might">⚔${T} ${d.m}</span>`:''}`;
}
const RL_POOL={blade:6,great:4,scout:5,squire:3,warband:6,medic:4,berserk:4,trophy:4,tactician:3,lance:4};
// Bot: rough worth of a card to a given player at this point in the gauntlet.
function rlValue(k,P,st){
  const owned=P.deck.concat(P.discard,P.hand),left=ENC.length-st.round;
  switch(k){
    case 'blade':return 2;
    case 'great':return 3;
    case 'scout':return 2.2;
    case 'squire':return 1.8;
    case 'warband':return 1+owned.filter(x=>x==='warband').length*0.9;
    case 'medic':return 1.2+owned.filter(x=>x==='wound').length*0.6;
    case 'berserk':return 2.6;
    case 'trophy':return left<4?3.5:1.6;
    case 'tactician':return 2;
    case 'lance':return 1+ENC.slice(st.round).filter(e=>e.need>=8).length*0.35;
    default:return 0;
  }
}
const wounds=p=>p.deck.concat(p.discard,p.hand).filter(k=>k==='wound').length;

const GAME={
  key:'relay',title:'Relay',
  hook:'You both face the same twelve foes in the same order. The cards you pass up become your rival’s next offer.',
  turn:['Fight this round’s foe with your hand. Win for points, or lose and take a Wound.','Take 1 of the 3 cards on offer. The other 2 go to your rival’s offer.','Optionally remove one card you just played from your deck.'],
  watch:'Do you ever pass a card to hurt your rival rather than taking the best one? Is knowing the upcoming foes enough to plan?',
  rules:[
    'Each player has their own deck, starting with 7 Spears and 3 Rations. Each turn you draw 5 cards, and they all fight automatically.',
    'Both players face the same foe each round. Add up your hand’s ⚔ power; reach the foe’s number to win its points, plus 1 point if you beat it by 3 or more. Lose and a Wound (a card that does nothing) goes into your deck, 2 against some foes.',
    'Draft: take 1 of your 3 offered cards into your discard pile. The 2 you leave go to your rival’s next offer, topped up with 1 fresh card.',
    'Then you may remove one card you played this fight from your deck for good. When your deck runs out, shuffle your discard pile into a new deck.',
    'After 12 rounds, most points wins.',
  ],
  maxRounds:12,
  score:(st,i)=>st.players[i].score,
  setup(){
    const pool=shuffle(Object.entries(RL_POOL).flatMap(([k,n])=>rep(k,n)));
    const players=[0,1].map(()=>{
      const p={deck:shuffle([...rep('spear',7),...rep('ration',3)]),discard:[],hand:[],score:0,tray:[],results:[]};
      p.hand=draw(p,5);p.tray=pool.splice(0,3);return p;
    });
    return {turn:0,round:1,players,pool,phase:'fight',fight:null,played:[],passing:null,log:[],over:false};
  },
  view(st,ctx){
    const S=ctx.seat,A=st.turn,L=ctx.label,act=ctx.canAct,P=st.players,me=P[S];
    const info=i=>`${P[i].deck.length+P[i].discard.length+P[i].hand.length} cards · ${wounds(P[i])} Wounds`;
    const v={oppInfo:info(1-S),meInfo:info(S),arena:'',hand:'',actions:'',prompt:''};
    const mk=(r,who)=>r?`<span class="mk ${r} ${who}" title="${who==='me'?L(S):L(1-S)}: ${r==='W'?'won':'lost'}">${r}</span>`:'';
    const track=`<div class="track">${ENC.map((x,i)=>`<div class="node${i===st.round-1&&!st.over?' now':''}${i<st.round-1||st.over?' past':''}" title="${x.n}: needs ${x.need}"><span class="nn">${i+1}</span><span class="marks">${mk(me.results[i],'me')}${mk(P[1-S].results[i],'opp')}</span></div>`).join('')}</div>`;
    const e=ENC[Math.min(st.round,ENC.length)-1],f=st.fight;
    const foe=`<div class="foe${FX.fight?(f&&f.win?' hit':' roar'):''}"><div class="foe-art">${e.art}</div><div class="foe-name">${e.n}</div>
      <div class="foe-stats"><span class="chip">needs ⚔${T} ${e.need}</span><span class="chip gold">${e.vp} points</span>${e.fail?`<span class="chip bad">fail: ${e.fail} Wounds</span>`:''}</div></div>`;
    let side='';
    if(f&&st.phase!=='fight'){
      side=`<div class="result ${f.win?'win':'loss'}"><div class="rt">${f.win?'Victory':'Defeated'}</div><div class="rm">⚔${T} ${f.m} / ${f.need}</div>
        <div>${f.win?`+${f.vp} points`:`+${f.wounds} Wound${f.wounds===1?'':'s'}`}${f.healed?` · Medic healed ${f.healed}`:''}${f.bz?` · Berserker cost ${f.bz}`:''}</div></div>`;
    }
    v.arena=track+`<div class="battle">${foe}${side}</div>`;
    if(st.over)return v;
    const preview=()=>`<div class="peek-label">Your next hand</div>`+handHTML(me.hand.map(k=>({def:RLC[k],o:{cls:'peek'}})));
    const line=(btn)=>`<div class="line">${st.played.map((k,i)=>cardHTML(RLC[k],{btn,cls:`sm${FX.fight?' deal':''}${btn?' banishable':''}`,style:`--i:${i}`,
      attrs:btn?`data-a="rlBanish" data-i="${i}" aria-label="Remove ${RLC[k].n}"`:''})).join('')}</div>`;
    if(st.phase==='fight'){
      if(act){
        v.prompt=`Round ${st.round}: ${e.n} needs ⚔${T} ${e.need}. Your whole hand fights.`;
        v.hand=handHTML(me.hand.map(k=>({def:RLC[k],o:{}})));
        v.actions=`<button class="btn primary big" data-a="rlFight">Fight</button>`;
      }else{v.prompt=`${L(A)} is fighting ${e.n}.`;v.hand=preview()}
    }else if(st.phase==='draft'){
      const tray=P[A].tray;
      v.arena+=`<div class="sub">Battle line</div>`+line(false);
      if(act){
        v.prompt=`Take one card. The other two go to ${L(1-A)}.`;
        v.arena+=`<div class="sub">Pick a card</div><div class="spoils">${tray.map((k,i)=>cardHTML(RLC[k],{btn:true,cls:'glow deal',style:`--i:${i}`,attrs:`data-a="rlPick" data-i="${i}"`})).join('')}</div>`;
      }else{
        v.prompt=`${L(A)} is picking a card. Two of these come to ${A===S&&!ctx.hot?'them':'you'}.`;
        v.arena+=`<div class="sub">Pick a card</div><div class="spoils">${tray.map((k,i)=>cardHTML(RLC[k],{cls:'deal',style:`--i:${i}`})).join('')}</div>`;
        v.hand=preview();
      }
    }else{
      if(act){
        v.prompt='Remove one card you played from your deck, or keep them all.';
        v.arena+=`<div class="sub">Tap a card to remove it</div>`+line(true);
        v.actions=`<button class="btn primary big" data-a="rlBanish" data-i="skip">Keep all</button>`;
      }else{v.prompt=`${L(A)} may remove a card.`;v.arena+=line(false);v.hand=preview()}
    }
    return v;
  },
  on:{
    rlFight(st,_,ctx){
      const P=st.players[st.turn],e=ENC[st.round-1];
      const q=P.hand.slice(),played=[];P.hand=[];
      while(q.length){const k=q.shift();played.push(k);if(RLC[k].draw)q.push(...draw(P,RLC[k].draw))}
      const wb=played.filter(k=>k==='warband').length,distinct=new Set(played.filter(k=>k!=='wound')).size;
      let m=0;
      for(const k of played){m+=RLC[k].m||0;if(k==='warband')m+=wb-1;if(k==='tactician')m+=distinct;if(k==='lance'&&e.need>=8)m+=3}
      let kept=played,healed=0;
      if(played.includes('medic')){healed=played.filter(k=>k==='wound').length;kept=played.filter(k=>k!=='wound')}
      const win=m>=e.need;let vp=0,wnd=0;
      if(win){vp=e.vp+(m>=e.need+3?1:0);P.score+=vp}
      else{wnd=e.fail||1;P.discard.push(...rep('wound',wnd))}
      const bz=played.filter(k=>k==='berserk').length;P.discard.push(...rep('wound',bz));
      P.results[st.round-1]=win?'W':'L';
      st.fight={played,m,need:e.need,win,vp,wounds:wnd,healed,bz};st.played=kept;st.phase='draft';
      FX.fight=true;
      if(win){pop(st.turn,`+${vp} points`);sfx('win')}else{pop(st.turn,`+${wnd} Wound${wnd===1?'':'s'}`,'bad');sfx('lose')}
      st.log.push(`${ctx.label(st.turn)} ${win?'beat':'lost to'} ${e.n} with ⚔ ${m}${win?` (+${vp} points)`:''}.`);
    },
    rlPick(st,i,ctx){
      const P=st.players[st.turn],k=P.tray.splice(+i,1)[0];
      if(RLC[k].vp){P.score+=RLC[k].vp;pop(st.turn,`+${RLC[k].vp} points`);sfx('score')}else sfx('card');
      P.discard.push(k);st.passing=P.tray;P.tray=[];st.picked=k;st.phase='banish';
      st.log.push(`${ctx.label(st.turn)} took ${RLC[k].n} and passed ${st.passing.map(x=>RLC[x].n).join(' and ')||'nothing'}.`);
    },
    rlBanish(st,i,ctx){
      const me=st.turn,P=st.players[me],O=st.players[1-me];
      if(i!=='skip'){const k=st.played.splice(+i,1)[0];st.log.push(`${ctx.label(me)} removed ${RLC[k].n}.`);sfx('bad')}else sfx('tap');
      P.discard.push(...st.played);st.played=[];P.hand=draw(P,5);
      O.tray=st.passing.concat(st.pool.splice(0,3-st.passing.length));
      st.passing=null;st.fight=null;st.phase='fight';
      return passTurn(st,ENC.length);
    },
  },
  bot(st,ctx){
    const on=GAME.on,P=st.players[st.turn],O=st.players[1-st.turn];
    if(st.phase==='fight')return on.rlFight(st,0,ctx);
    if(st.phase==='draft'){
      // Take what's best for us, nudged toward denying what's best for them.
      let bi=0,bs=-1;
      P.tray.forEach((k,i)=>{const s=rlValue(k,P,st)+0.3*rlValue(k,O,st);if(s>bs){bs=s;bi=i}});
      return on.rlPick(st,bi,ctx);
    }
    let i=st.played.indexOf('wound');
    if(i<0&&st.round>=2)i=st.played.indexOf('ration');
    if(i<0&&st.round>=4)i=st.played.indexOf('spear');
    return on.rlBanish(st,i<0?'skip':String(i),ctx);
  },
};
