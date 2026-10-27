// =====================================================================
// Shell: title screen, game table, overlays, storage, bot and hotseat turns.
// Local games (vs bot, pass and play) live in this browser. Online games need
// the Claude artifact runtime (window.claude) and are shared through its db.
// =====================================================================
const HUB='https://dyrota.github.io/prototypes/';
const $app=document.getElementById('app');
const LS='proto-'+GAME.key+'-games';
const ICON={
  menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  help:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.6M12 17h.01"/></svg>',
  on:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19.5 6a8 8 0 0 1 0 12"/></svg>',
  off:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
};
let DB=null,USER=null,ME=null,ONLINE=false,CANWRITE=true;
let LOCAL={},REMOTE={},names={};
let view={screen:'title',id:null},work=null,workKey=null,modal=null,confirmDel=null,handoff=null,botTimer=null,dismissed=null;
try{MUTED=localStorage.getItem('proto-muted')==='1'}catch(e){}

function lsLoad(){try{return JSON.parse(localStorage.getItem(LS)||'{}')}catch(e){return {}}}
function lsSave(){try{localStorage.setItem(LS,JSON.stringify(LOCAL))}catch(e){}}
const getGame=id=>LOCAL[id]||REMOTE[id];
const isLocal=g=>g.mode==='local';
const vsBot=g=>isLocal(g)&&g.seats.includes('bot');
const isHot=g=>isLocal(g)&&!vsBot(g);

function seatLabel(g,i){
  const s=g.seats[i];
  if(isLocal(g))return s==='bot'?'Bot':vsBot(g)?'You':`Seat ${i+1}`;
  if(!s)return 'Open seat';
  if(s===ME)return g.seats[0]===g.seats[1]?`Seat ${i+1}`:'You';
  return clean(names[s]||'Opponent');
}
function canActIn(g,st){
  if(st.over||g.status==='done')return false;
  const s=g.seats[st.turn];
  return isLocal(g)?s==='h':CANWRITE&&s===ME;
}
// Which seat sits at the bottom of the table.
function perspective(g,st){
  if(vsBot(g))return g.seats.indexOf('h');
  if(isHot(g)||g.seats[0]===g.seats[1])return st.turn;
  const i=g.seats.indexOf(ME);return i<0?0:i;
}
function statusFor(g){
  const st=g.state;
  if(st.over||g.status==='done')return {cls:'done',txt:'Finished'};
  if(g.seats[st.turn]==='bot')return {cls:'wait',txt:'Bot to play'};
  if(canActIn(g,st))return {cls:'go',txt:isHot(g)?`Seat ${st.turn+1} to play`:'Your turn'};
  if(!g.seats[1]&&st.turn===1)return {cls:'wait',txt:'Waiting for an opponent'};
  return {cls:'wait',txt:`${seatLabel(g,st.turn)} to play`};
}
const modeName=g=>isLocal(g)?(vsBot(g)?'vs bot':'pass and play'):'online';
const initial=s=>s==='Bot'?'B':s==='You'?'Y':s.startsWith('Seat ')?s.slice(5):(s[0]||'?').toUpperCase();

function render(){
  if(view.screen==='game'&&getGame(view.id))renderGame();
  else{view={screen:'title',id:null};renderTitle()}
  const ov=modalHTML();
  if(ov)$app.insertAdjacentHTML('beforeend',ov);
  flushFX();
}

// ---------- title screen ----------
function myGames(){
  const mine=[],open=[];
  for(const [id,g] of Object.entries(LOCAL))mine.push([id,g]);
  for(const [id,g] of Object.entries(REMOTE)){
    if(g.seats.includes(ME))mine.push([id,g]);
    else if(!g.seats[1]&&g.status!=='done')open.push([id,g]);
  }
  const rank=g=>({go:0,wait:1,done:2})[statusFor(g).cls];
  mine.sort((a,b)=>rank(a[1])-rank(b[1])||(b[1].updatedAt||0)-(a[1].updatedAt||0));
  return {mine,open};
}
function renderTitle(){
  const {mine,open}=myGames();
  const cont=mine.find(([,g])=>statusFor(g).cls!=='done');
  const yourTurn=mine.filter(([,g])=>!isLocal(g)&&statusFor(g).cls==='go').length;
  $app.innerHTML=`<div class="title">
    <div class="deco" aria-hidden="true"><div class="card back d1"></div><div class="card back d2"></div><div class="card back d3"></div></div>
    <div class="title-inner">
      <h1 class="logo">${GAME.title}</h1>
      <p class="tag">${GAME.hook}</p>
      <nav class="menu">
        ${cont?`<button class="btn primary big" data-a="open" data-i="${cont[0]}">Continue<small>${modeName(cont[1])} · round ${cont[1].state.round} · ${GAME.score(cont[1].state,0)}–${GAME.score(cont[1].state,1)}</small></button>`:''}
        <button class="btn ${cont?'':'primary '}big" data-a="new" data-i="bot">Play vs bot</button>
        <button class="btn big" data-a="new" data-i="hot">Pass and play</button>
        ${ONLINE&&CANWRITE?`<button class="btn big" data-a="new" data-i="online">New online game</button>`:''}
        <div class="menu-row"><button class="btn" data-a="modal" data-i="rules">How to play</button><button class="btn" data-a="modal" data-i="games">Games${mine.length?` (${mine.length})`:''}</button></div>
      </nav>
      ${yourTurn?`<p class="notice">It’s your turn in ${yourTurn} online game${yourTurn===1?'':'s'}.</p>`:''}
      ${open.length?`<p class="notice">${open.length} player${open.length===1?' is':'s are'} waiting for an opponent. <button class="linkbtn" data-a="modal" data-i="games">Join</button></p>`:''}
      <p class="foot">${ONLINE?'Online games are shared through this page. Friends need Contributor access to join.':'Games are saved in this browser.'} · <a href="${HUB}" target="_top">All prototypes</a></p>
    </div></div>`;
}

// ---------- game table ----------
function renderGame(){
  const g=getGame(view.id),key=view.id+':'+(g.v||0);
  if(workKey!==key){work=clone(g.state);workKey=key;FX.deal=true;FX.prompt=true}
  const st=work,S=perspective(g,st),canAct=canActIn(g,st);
  const ctx={seat:S,canAct,hot:isHot(g),label:i=>seatLabel(g,i)};
  const v=GAME.view(st,ctx);
  if(!v.prompt){
    if(st.over)v.prompt='Game over.';
    else if(!isLocal(g)&&!g.seats[1])v.prompt=g.seats[0]===ME?'Waiting for someone to join.':'Seat 2 is open.';
    else v.prompt=`${ctx.label(st.turn)} to play.`;
  }
  if(!canAct&&!st.over&&!isLocal(g)&&g.seats[st.turn]!==ME)v.prompt+=` <span class="muted">Waiting for ${ctx.label(st.turn)}.</span>`;
  const plate=(i,cls)=>{const name=ctx.label(i);
    return `<div class="plate ${cls}${st.turn===i&&!st.over?' active':''}" data-seat="${i}"><span class="avatar">${initial(name)}</span>
      <div class="pl-body"><div class="pl-name">${name}</div><div class="pl-info">${i===S?v.meInfo:v.oppInfo}</div></div>
      <div class="pl-score"><b>${GAME.score(st,i)}</b><span>★</span></div></div>`};
  const covered=handoff===view.id&&!st.over;
  const joinBtn=!isLocal(g)&&!g.seats[1]&&CANWRITE?(g.seats[0]===ME?`<button class="btn small" data-a="solo" data-i="${view.id}">Take seat 2 myself</button>`:`<button class="btn primary" data-a="join" data-i="${view.id}">Join as seat 2</button>`):'';
  $app.innerHTML=`<div class="stage">
    <header class="hud">
      <button class="icon" data-a="menu" aria-label="Back to menu">${ICON.menu}</button>
      ${plate(1-S,'opp')}
      <div class="hud-r"><span class="round">Round ${st.round}/${GAME.maxRounds}</span>
        <button class="icon" data-a="modal" data-i="rules" aria-label="How to play">${ICON.help}</button>
        <button class="icon" data-a="mute" aria-label="${MUTED?'Turn sound on':'Turn sound off'}">${MUTED?ICON.off:ICON.on}</button></div>
    </header>
    <div class="prompt${FX.prompt?' new':''}">${covered?'':v.prompt}</div>
    <main class="arena">${covered?'':v.arena}</main>
    <div class="bottom">
      <div class="tray">${plate(S,'me')}<div class="actions">${joinBtn}${covered?'':v.actions}${canAct&&!covered?`<button class="btn ghost small" data-a="undo">Undo turn</button>`:''}${st.over?`<button class="btn primary" data-a="rematch">Rematch</button>`:''}</div></div>
      <div class="hand">${covered?'':v.hand}</div>
    </div>
  </div>`;
  if(vsBot(g)&&g.seats[st.turn]==='bot'&&!st.over&&!botTimer)botTimer=setTimeout(botTick,FX.deal?1100:750);
}

// ---------- overlays ----------
function modalHTML(){
  const g=view.screen==='game'?getGame(view.id):null;
  if(g&&handoff===view.id&&!work.over){
    return `<div class="overlay"><div class="modal center"><div class="end-title">Seat ${work.turn+1}</div><p>Pass the device to seat ${work.turn+1}, then tap Ready.</p><button class="btn primary big" data-a="ready">Ready</button></div></div>`;
  }
  if(g&&work.over&&dismissed!==view.id&&!modal){
    const a=GAME.score(work,0),b=GAME.score(work,1),S=perspective(g,work);
    let title;
    if(a===b)title='Draw';
    else if(isHot(g)||g.seats[0]===g.seats[1])title=`Seat ${a>b?1:2} wins`;
    else title=(a>b?0:1)===S?'Victory':'Defeat';
    return `<div class="overlay"><div class="modal center end">
      <div class="end-title">${title}</div>
      <div class="end-scores">${[0,1].map(i=>`<div><span>${seatLabel(g,i)}</span><b>${GAME.score(work,i)} ★</b></div>`).join('')}</div>
      <div class="row center"><button class="btn primary big" data-a="rematch">Rematch</button><button class="btn" data-a="menu">Menu</button><button class="btn ghost" data-a="dismiss">See the board</button></div></div></div>`;
  }
  if(modal==='rules'){
    return `<div class="overlay" data-a="close"><div class="modal" role="dialog" aria-label="How to play">
      <div class="spread"><h2>How to play ${GAME.title}</h2><button class="btn small" data-a="close">Close</button></div>
      <p class="lead">${GAME.hook}</p>
      <h3>A turn</h3><ol>${GAME.turn.map(t=>`<li>${t}</li>`).join('')}</ol>
      <h3>Rules</h3><ul>${GAME.rules.map(r=>`<li>${r}</li>`).join('')}</ul>
      <h3>Test for</h3><p class="watch">${GAME.watch}</p>
      ${g?`<h3>Log</h3><div class="log">${work.log.slice(-14).reverse().map(l=>`<div>${esc(l)}</div>`).join('')||'Nothing yet.'}</div>`:''}
    </div></div>`;
  }
  if(modal==='games'){
    const {mine,open}=myGames();
    const item=([id,g],join)=>{const s=statusFor(g),st=g.state;
      return `<div class="gitem"><div><b>${seatLabel(g,0)} ${GAME.score(st,0)} – ${GAME.score(st,1)} ${seatLabel(g,1)}</b><div class="muted">${modeName(g)} · round ${st.round}</div></div>
        <div class="row">${join?(CANWRITE?`<button class="btn small primary" data-a="join" data-i="${id}">Join</button>`:''):`<span class="pill ${s.cls}">${s.txt}</span>`}
        <button class="btn small" data-a="open" data-i="${id}">${join?'Watch':'Open'}</button>
        ${!join&&(isLocal(g)||g.createdBy===ME)?`<button class="btn small ghost" data-a="del" data-i="${id}">${confirmDel===id?'Confirm':'Delete'}</button>`:''}</div></div>`};
    return `<div class="overlay" data-a="close"><div class="modal" role="dialog" aria-label="Games">
      <div class="spread"><h2>Games</h2><button class="btn small" data-a="close">Close</button></div>
      ${mine.length?`<div class="glist">${mine.map(x=>item(x,false)).join('')}</div>`:'<p class="muted">No games yet.</p>'}
      ${ONLINE?`<h3>Open seats</h3>${open.length?`<div class="glist">${open.map(x=>item(x,true)).join('')}</div>`:'<p class="muted">No one is waiting for an opponent.</p>'}
        ${CANWRITE?`<p class="muted">Testing alone online? <button class="linkbtn" data-a="new" data-i="solo">Start a game and play both seats</button>.</p>`:''}`:''}
    </div></div>`;
  }
  return '';
}

// ---------- effects ----------
function flushFX(){
  if(typeof document!=='undefined'&&FX.pops.length){
    const g=getGame(view.id);
    FX.pops.forEach((p,n)=>{
      const el=document.querySelector(`.plate[data-seat="${p.seat}"]`)||document.querySelector('.arena');
      if(!el)return;
      const r=el.getBoundingClientRect(),d=document.createElement('div');
      d.className='pop '+p.kind;d.textContent=p.text;
      d.style.left=(r.left+r.width/2)+'px';d.style.top=(r.top+r.height/2-n*26)+'px';
      document.body.appendChild(d);setTimeout(()=>d.remove(),1400);
    });
  }
  FX.pops=[];FX.deal=false;FX.bead=false;FX.fight=false;FX.prompt=false;
}

// ---------- turns ----------
function botTick(){
  botTimer=null;
  const g=getGame(view.id);
  if(view.screen!=='game'||!g||!vsBot(g)||work.over||g.seats[work.turn]!=='bot')return;
  const ctx={seat:work.turn,canAct:true,label:i=>seatLabel(g,i)};
  if(GAME.bot(work,ctx)==='commit'){
    const doc=clone(g);doc.state=clone(work);if(work.over){doc.status='done';sfx(GAME.score(work,0)===GAME.score(work,1)?'tap':'lose')}
    saveGame(view.id,doc);
  }else render();
}
async function saveGame(id,doc){
  doc.updatedAt=Date.now();doc.v=(doc.v||0)+1;
  if(doc.state.log.length>40)doc.state.log=doc.state.log.slice(-40);
  if(isLocal(doc)){LOCAL[id]=doc;lsSave();render();return}
  const prev=REMOTE[id];REMOTE[id]=doc;render();
  try{await DB.doc('games/'+id).set(doc)}
  catch(e){
    if(prev)REMOTE[id]=prev;else delete REMOTE[id];workKey=null;render();
    toast(e&&e.code==='invalid_argument'?'You can’t save here. Ask the owner for Contributor access.'
      :e&&e.code==='quota_exceeded'?'This page is full. Delete some old games.'
      :'Couldn’t save. Check your connection and try again.');
  }
}
function newGame(kind){
  const id=newId(),base={type:GAME.key,createdAt:Date.now(),state:GAME.setup()};
  let doc;
  if(kind==='bot')doc={...base,mode:'local',seats:['h','bot'],status:'active'};
  else if(kind==='hot')doc={...base,mode:'local',seats:['h','h'],status:'active'};
  else doc={...base,mode:'online',seats:[ME,kind==='solo'?ME:null],createdBy:ME,status:kind==='solo'?'active':'open'};
  modal=null;handoff=null;dismissed=null;view={screen:'game',id};workKey=null;setHash(id);sfx('card');
  saveGame(id,doc);window.scrollTo(0,0);
}
async function claimSeat(id,asSolo){
  if(!ONLINE)return;
  const ref=DB.doc('games/'+id);
  try{
    const l=await ref.acquire({holder:ME,ttlMs:5000});
    if(!l.acquired)return toast('Someone else is joining right now. Try again in a few seconds.');
    const snap=await ref.get(),d=snap.exists?clone(snap.data()):null;
    if(!d||d.seats[1])return toast('That seat was just taken.');
    if(!asSolo&&d.seats[0]===ME)return;
    d.seats=[d.seats[0],ME];d.status='active';
    modal=null;view={screen:'game',id};setHash(id);await saveGame(id,d);
  }catch(e){toast('Couldn’t join that game. Try again.')}
}
function setHash(id){try{history.replaceState(null,'',id?'#'+id:location.pathname+location.search)}catch(e){}}

const GLOBAL={
  new:kind=>newGame(kind),
  open:id=>{modal=null;handoff=null;view={screen:'game',id};workKey=null;setHash(id);render();window.scrollTo(0,0)},
  menu:()=>{modal=null;handoff=null;view={screen:'title',id:null};setHash(null);render();window.scrollTo(0,0)},
  modal:m=>{modal=m;render()},
  close:()=>{modal=null;confirmDel=null;render()},
  join:id=>claimSeat(id,false),
  solo:id=>{modal=null;claimSeat(id,true)},
  undo:()=>{workKey=null;render()},
  ready:()=>{handoff=null;FX.deal=true;render()},
  dismiss:()=>{dismissed=view.id;render()},
  mute:()=>{MUTED=!MUTED;try{localStorage.setItem('proto-muted',MUTED?'1':'0')}catch(e){}render();sfx('tap')},
  rematch:()=>{const g=getGame(view.id);newGame(isLocal(g)?(vsBot(g)?'bot':'hot'):g.seats[0]===g.seats[1]?'solo':'online')},
  del:async id=>{
    if(confirmDel!==id){confirmDel=id;render();return}
    confirmDel=null;
    if(LOCAL[id]){delete LOCAL[id];lsSave();render();return}
    const prev=REMOTE[id];delete REMOTE[id];render();
    try{await DB.doc('games/'+id).delete()}catch(e){REMOTE[id]=prev;render();toast('Couldn’t delete that game.')}
  },
};
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-a]');if(!b||b.disabled)return;
  // Clicking the dimmed backdrop closes a modal; clicks inside it don't.
  if(b.classList.contains('overlay')&&e.target!==b)return;
  const a=b.dataset.a,arg=b.dataset.i;
  if(GLOBAL[a])return GLOBAL[a](arg);
  const g=getGame(view.id);if(!g)return;
  const S=perspective(g,work),ctx={seat:S,canAct:canActIn(g,work),hot:isHot(g),label:i=>seatLabel(g,i)},h=GAME.on[a];
  if(!h||!ctx.canAct)return;
  if(h(work,arg,ctx)==='commit'){
    const doc=clone(g);doc.state=clone(work);
    if(work.over){doc.status='done';const a0=GAME.score(work,0),a1=GAME.score(work,1);sfx(a0===a1?'tap':(a0>a1?0:1)===S||isHot(g)?'win':'lose')}
    else if(isHot(doc))handoff=view.id;
    await saveGame(view.id,doc);window.scrollTo(0,0);
  }else render();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal){modal=null;render()}});

async function refreshNames(){
  if(!USER)return;
  const ids=new Set();
  Object.values(REMOTE).forEach(g=>g.seats.forEach(s=>{if(s&&s!==ME&&!(s in names))ids.add(s)}));
  if(!ids.size)return;
  ids.forEach(id=>names[id]='');
  try{const ps=await USER.profiles([...ids]);for(const id of ids)names[id]=(ps&&ps[id]&&ps[id].name)||'';render()}catch(e){}
}
async function init(){
  LOCAL=lsLoad();
  const h=(location.hash||'').slice(1);
  if(h&&LOCAL[h])view={screen:'game',id:h};
  render();
  const cl=window.claude;if(!cl||!cl.use)return;
  const [db,user]=await Promise.all([cl.use('db'),cl.use('user')]);
  if(!db||!user)return;
  const id=await user.id();if(!id)return;
  DB=db;USER=user;ME=id;ONLINE=true;
  try{if(await user.can('data.write')===false)CANWRITE=false}catch(e){}
  render();
  let first=true;
  db.collection('games').onSnapshot(snap=>{
    const next={};
    snap.docs.forEach(d=>{const v=d.data();if(v&&v.state&&v.type===GAME.key)next[d.id]=v});
    REMOTE=next;
    if(first){first=false;if(h&&REMOTE[h]&&view.screen==='title')view={screen:'game',id:h}}
    refreshNames();render();
  },()=>toast('Lost the connection to shared games. Reload to reconnect.'));
}
init();
