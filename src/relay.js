// =====================================================================
// RELAY: same gauntlet for both players; the cards you pass up go to your rival.
// =====================================================================
const ENC=[
  {n:'Cellar Rats',need:3,vp:1},{n:'Road Bandits',need:4,vp:1},{n:'Wolf Pack',need:5,vp:2},{n:'Bog Hag',need:5,vp:2,fail:2},
  {n:'Ogre',need:6,vp:2},{n:'Bandit Lord',need:7,vp:3},{n:'Wyvern',need:8,vp:3},{n:'Bridge Troll',need:8,vp:3,fail:2},
  {n:'Lich',need:9,vp:4},{n:'Hill Giant',need:10,vp:4},{n:'Elder Wyrm',need:11,vp:5},{n:'The Hollow King',need:13,vp:6},
];
const RLC={
  spear:{n:'Spear',m:1},
  ration:{n:'Rations',m:0,draw:1,txt:'Draw 1 card.'},
  wound:{n:'Wound',m:0,txt:'Dead weight.'},
  blade:{n:'Blade',m:2},
  great:{n:'Greatsword',m:3},
  scout:{n:'Scout',m:1,draw:1,txt:'Draw 1 card.'},
  squire:{n:'Squire',m:0,draw:2,txt:'Draw 2 cards.'},
  warband:{n:'Warband',m:1,txt:'+1 for each other Warband you play this turn.'},
  medic:{n:'Medic',m:1,txt:'Banish every Wound you play this turn.'},
  berserk:{n:'Berserker',m:4,txt:'After the fight, gain a Wound.'},
  trophy:{n:'Trophy',m:0,vp:2,txt:'2 ★ when you take it. Dead weight after.'},
  tactician:{n:'Tactician',m:0,txt:'+1 for each different card you play this turn (not Wounds).'},
  lance:{n:'Lance',m:1,txt:'+3 more against foes that need 8 or more.'},
};
for(const d of Object.values(RLC))d.face=d.m?`<div class="weave">⚔ ${d.m}</div>`:'';
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

const GAME={
  key:'relay',title:'Relay',color:'var(--rl)',
  hook:'You both face the same twelve foes in the same order. The cards you pass up become your rival’s next offer.',
  turn:['Fight this round’s foe with your hand. Beat it for ★, or take a Wound.','Take 1 of the 3 cards on offer. The other 2 go to your rival’s offer.','Optionally banish one card you just played.'],
  watch:'Do you ever pass a card to hurt your rival rather than taking the best one? Is knowing the upcoming foes enough to plan?',
  rules:[
    'Each player starts with 7 Spears and 3 Rations. Hands are 5 cards, played automatically when you fight.',
    'Both players face the same foe each round. Beat its number for its ★, plus 1 ★ if you beat it by 3 or more. Fail and you gain a Wound (2 against some foes).',
    'Draft: take 1 of your 3 offered cards. The 2 you leave go to your rival’s next offer, topped up with 1 fresh card.',
    'Then you may banish one card you played this fight, removing it from the game.',
    'After 12 rounds, most ★ wins.',
  ],
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
    const me=st.turn,L=ctx.label,P=st.players[me];
    const ladder=`<div class="ladder">${ENC.map((e,i)=>`<div class="rung ${i===st.round-1&&!st.over?'now':''}"><b>${i+1}. ${e.n}</b>
      <span class="mono">⚔ ${e.need} → ${e.vp} ★${e.fail?` · fail: ${e.fail} Wounds`:''}</span>
      <span class="r">${[0,1].map(s=>st.players[s].results[i]?`<span class="res ${st.players[s].results[i]}" title="${L(s)}">${s+1}${st.players[s].results[i]}</span>`:'').join('')}</span></div>`).join('')}</div>`;
    let h='';
    if(!ctx.canAct){h+=`<div class="panel"><p class="status">${st.over?'Game over.':`Waiting for ${L(me)}.`}</p></div>`}
    else if(st.phase==='fight'){
      const e=ENC[st.round-1];
      h+=`<div class="panel"><div class="spread"><h3>Round ${st.round}: ${e.n} needs ⚔ ${e.need}</h3><button class="btn primary" data-a="rlFight">Fight</button></div>
        <p class="muted">Your hand. Draw cards resolve automatically when you fight.</p>
        <div class="cards">${P.hand.map(k=>cardHTML(RLC[k],{face:RLC[k].face})).join('')}</div>
        <p class="muted">Deck ${P.deck.length} · discard ${P.discard.length} · Wounds owned ${P.deck.concat(P.discard).filter(k=>k==='wound').length}</p></div>`;
    }else{
      const f=st.fight;
      h+=`<div class="panel"><h3 class="${f.win?'ok':'no'}">${f.win?`Won: ⚔ ${f.m} vs ${f.need}, +${f.vp} ★`:`Lost: ⚔ ${f.m} vs ${f.need}, gained ${f.wounds} Wound${f.wounds===1?'':'s'}`}</h3>
        <p class="muted">Played: ${f.played.map(k=>RLC[k].n).join(', ')}${f.healed?` · Medic banished ${f.healed} Wound${f.healed===1?'':'s'}`:''}${f.bz?` · Berserker cost ${f.bz} Wound${f.bz===1?'':'s'}`:''}</p></div>`;
      if(st.phase==='draft'){
        h+=`<div class="panel"><h3>Take one</h3><p class="muted">The two you leave go to ${L(1-me)}’s next offer.</p>
          <div class="cards">${P.tray.map((k,i)=>cardHTML(RLC[k],{btn:true,face:RLC[k].face,attrs:`data-a="rlPick" data-i="${i}"`})).join('')}</div></div>`;
      }else{
        h+=`<div class="panel"><h3>Banish one card you played?</h3><p class="muted">Took ${RLC[st.picked].n}. Banishing removes the card from the game. Choosing ends your turn.</p>
          <div class="cards mini">${st.played.map((k,i)=>cardHTML(RLC[k],{btn:true,face:RLC[k].face,attrs:`data-a="rlBanish" data-i="${i}" aria-label="Banish ${RLC[k].n}"`})).join('')}</div>
          <div class="row"><button class="btn primary" data-a="rlBanish" data-i="skip">Keep them all and end turn</button></div></div>`;
      }
    }
    return h+`<div class="panel"><h3>The gauntlet</h3>${ladder}</div>`;
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
      const win=m>=e.need;let vp=0,wounds=0;
      if(win){vp=e.vp+(m>=e.need+3?1:0);P.score+=vp}
      else{wounds=e.fail||1;P.discard.push(...rep('wound',wounds))}
      const bz=played.filter(k=>k==='berserk').length;P.discard.push(...rep('wound',bz));
      P.results[st.round-1]=win?'W':'L';
      st.fight={played,m,need:e.need,win,vp,wounds,healed,bz};st.played=kept;st.phase='draft';
      st.log.push(`${ctx.label(st.turn)} ${win?'beat':'lost to'} ${e.n} with ⚔ ${m}${win?` (+${vp} ★)`:''}.`);
    },
    rlPick(st,i,ctx){
      const P=st.players[st.turn],k=P.tray.splice(+i,1)[0];
      if(RLC[k].vp)P.score+=RLC[k].vp;
      P.discard.push(k);st.passing=P.tray;P.tray=[];st.picked=k;st.phase='banish';
      st.log.push(`${ctx.label(st.turn)} took ${RLC[k].n} and passed ${st.passing.map(x=>RLC[x].n).join(' and ')||'nothing'}.`);
    },
    rlBanish(st,i,ctx){
      const me=st.turn,P=st.players[me],O=st.players[1-me];
      if(i!=='skip'){const k=st.played.splice(+i,1)[0];st.log.push(`${ctx.label(me)} banished ${RLC[k].n}.`)}
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
