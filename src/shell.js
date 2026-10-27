// =====================================================================
// Shell: lobby, local + online storage, bot and hotseat turns.
// Local games (vs bot, hotseat) live in this browser. Online games need the
// Claude artifact runtime (window.claude) and are shared through its db.
// =====================================================================
const HUB='https://dyrota.github.io/prototypes/';
const $app=document.getElementById('app');
const LS='proto-'+GAME.key+'-games';
let DB=null,USER=null,ME=null,ONLINE=false,CANWRITE=true;
let LOCAL={},REMOTE={},names={};
let view={screen:'lobby',id:null},work=null,workKey=null,confirmDel=null,handoff=null,botTimer=null;

function lsLoad(){try{return JSON.parse(localStorage.getItem(LS)||'{}')}catch(e){return {}}}
function lsSave(){try{localStorage.setItem(LS,JSON.stringify(LOCAL))}catch(e){}}
const getGame=id=>LOCAL[id]||REMOTE[id];
const isLocal=g=>g.mode==='local';
const vsBot=g=>isLocal(g)&&g.seats.includes('bot');

function seatLabel(g,i){
  const s=g.seats[i];
  if(isLocal(g))return s==='bot'?'Bot':vsBot(g)?'You':`Seat ${i+1}`;
  if(!s)return 'Open seat';
  if(s===ME)return g.seats[0]===g.seats[1]?`You (seat ${i+1})`:'You';
  return clean(names[s]||'Opponent');
}
function canActIn(g,st){
  if(st.over||g.status==='done')return false;
  const s=g.seats[st.turn];
  return isLocal(g)?s==='h':CANWRITE&&s===ME;
}
function gameCtx(g){const st=work||g.state;return {canAct:canActIn(g,st),label:i=>seatLabel(g,i)}}
function statusFor(g){
  const st=g.state;
  if(st.over||g.status==='done')return {cls:'done',txt:'Finished'};
  if(g.seats[st.turn]==='bot')return {cls:'wait',txt:'Bot is playing'};
  if(canActIn(g,st))return {cls:'go',txt:isLocal(g)&&!vsBot(g)?`Seat ${st.turn+1} to play`:'Your turn'};
  if(!g.seats[1]&&st.turn===1)return {cls:'wait',txt:'Waiting for an opponent'};
  return {cls:'wait',txt:`${seatLabel(g,st.turn)} to play`};
}
function modeName(g){return isLocal(g)?(vsBot(g)?'vs bot':'hotseat'):'online'}

function render(){
  if(view.screen==='game'&&getGame(view.id))renderGame();
  else{view={screen:'lobby',id:null};renderLobby()}
}

function gameItem(id,g,join){
  const s=statusFor(g),st=g.state;
  return `<div class="gitem"><span class="dot"></span>
    <div><b>${seatLabel(g,0)} ${GAME.score(st,0)} – ${GAME.score(st,1)} ${seatLabel(g,1)}</b> <span class="muted">· ${modeName(g)} · round ${st.round}</span></div>
    <div class="row">${join?(CANWRITE?`<button class="btn small primary" data-a="join" data-i="${id}">Join</button>`:''):`<span class="pill ${s.cls}">${s.txt}</span>`}
      <button class="btn small" data-a="open" data-i="${id}">${join?'Watch':'Open'}</button>
      ${!join&&(isLocal(g)||g.createdBy===ME)?`<button class="btn small ghost" data-a="del" data-i="${id}">${confirmDel===id?'Confirm delete':'Delete'}</button>`:''}</div></div>`;
}

function renderLobby(){
  const mine=[],open=[];
  for(const [id,g] of Object.entries(LOCAL))mine.push([id,g]);
  for(const [id,g] of Object.entries(REMOTE)){
    if(g.seats.includes(ME))mine.push([id,g]);
    else if(!g.seats[1]&&g.status!=='done')open.push([id,g]);
  }
  const rank=g=>statusFor(g).cls==='go'?0:statusFor(g).cls==='wait'?1:2;
  mine.sort((a,b)=>rank(a[1])-rank(b[1])||(b[1].updatedAt||0)-(a[1].updatedAt||0));
  $app.innerHTML=`
  <header class="intro">
    <a class="back" href="${HUB}" target="_top">← All prototypes</a>
    <h1>${GAME.title}</h1>
    <p class="hook">${GAME.hook}</p>
  </header>
  <section class="panel"><h2>Play</h2>
    <div class="row">
      <button class="btn primary" data-a="new" data-i="bot">Play vs bot</button>
      <button class="btn" data-a="new" data-i="hot">Hotseat: 2 players, 1 device</button>
      ${ONLINE&&CANWRITE?`<button class="btn" data-a="new" data-i="online">New online game</button><button class="btn" data-a="new" data-i="solo">Online, both seats</button>`:''}
    </div>
    <p class="mode">${ONLINE
      ?'<b>Online games are shared through this page.</b> Anyone it’s shared with at Contributor access can join an open seat and play their turns whenever they like.'
      :'Bot and hotseat games are saved in this browser. For async online play, open the Claude artifact version of this game.'}</p>
  </section>
  <div class="two">
    <section class="panel"><h3>A turn</h3><ol>${GAME.turn.map(t=>`<li>${t}</li>`).join('')}</ol></section>
    <section class="panel"><h3>Test for</h3><p class="watch">${GAME.watch}</p></section>
  </div>
  <section class="panel"><h2>Your games</h2>${mine.length?`<div class="glist">${mine.map(([id,g])=>gameItem(id,g,false)).join('')}</div>`:'<p class="muted">No games yet. Start one above.</p>'}</section>
  ${ONLINE?`<section class="panel"><h2>Open seats</h2>${open.length?`<div class="glist">${open.map(([id,g])=>gameItem(id,g,true)).join('')}</div>`:'<p class="muted">No one is waiting for an opponent right now.</p>'}</section>`:''}
  <section class="panel"><h2>Rules</h2><ul class="rules">${GAME.rules.map(r=>`<li>${r}</li>`).join('')}</ul></section>`;
}

function renderGame(){
  const g=getGame(view.id),key=view.id+':'+(g.v||0);
  if(workKey!==key){work=clone(g.state);workKey=key}
  const st=work,ctx=gameCtx(g),s=statusFor(g),iAmIn=!isLocal(g)&&g.seats.includes(ME);
  let banner;
  if(st.over){const a=GAME.score(st,0),b=GAME.score(st,1);banner=a===b?`Tied at ${a} ★.`:`${ctx.label(a>b?0:1)} won, ${Math.max(a,b)} to ${Math.min(a,b)}.`}
  else if(g.seats[st.turn]==='bot')banner='The bot is taking its turn…';
  else if(ctx.canAct)banner=isLocal(g)&&!vsBot(g)?`Seat ${st.turn+1}, your turn.`:'Your turn.';
  else if(!isLocal(g)&&!g.seats[1])banner=iAmIn?'Waiting for someone to join. They’ll take seat 2.':'Seat 2 is open.';
  else banner=`${ctx.label(st.turn)} to play.`;
  const showHandoff=handoff===view.id&&!st.over;
  $app.innerHTML=`
  <section class="panel gbar">
    <div class="spread"><button class="btn ghost small" data-a="lobby">← ${GAME.title} games</button><span class="muted">${modeName(g)} · round ${st.round}</span></div>
    <div class="seats">${[0,1].map(i=>`<div class="seat ${st.turn===i&&!st.over?'on':''}"><span>${ctx.label(i)}${st.turn===i&&!st.over?' <span class="muted">· to play</span>':''}</span><span class="score">${GAME.score(st,i)} ★</span></div>`).join('')}</div>
    <div class="spread"><p class="status">${banner}</p><div class="row">
      ${!isLocal(g)&&!g.seats[1]&&CANWRITE?(iAmIn?`<button class="btn small" data-a="solo" data-i="${view.id}">Take seat 2 myself</button>`:`<button class="btn small primary" data-a="join" data-i="${view.id}">Join as seat 2</button>`):''}
      ${ctx.canAct&&!showHandoff?`<button class="btn small ghost" data-a="undo">Restart this turn</button>`:''}
      ${st.over?`<button class="btn small primary" data-a="rematch">Rematch</button>`:''}</div></div>
    <details class="rules"><summary>Rules</summary><ul>${GAME.rules.map(r=>`<li>${r}</li>`).join('')}</ul></details>
  </section>
  ${showHandoff
    ?`<section class="panel handoff"><h2>Seat ${st.turn+1}’s turn</h2><p>Pass the device to seat ${st.turn+1}, then tap Ready.</p><div class="row"><button class="btn primary" data-a="ready">Ready</button></div></section>`
    :`<div class="board">${GAME.view(st,ctx)}</div>`}
  <section class="panel"><h3>Log</h3><div class="log">${st.log.slice(-14).reverse().map(l=>`<div>${esc(l)}</div>`).join('')||'<span>Nothing yet.</span>'}</div></section>`;
  if(vsBot(g)&&g.seats[st.turn]==='bot'&&!st.over&&!botTimer)botTimer=setTimeout(runBot,700);
}

function runBot(){
  botTimer=null;
  const id=view.id,g=getGame(id);
  if(!g||!vsBot(g)||g.state.over||g.seats[g.state.turn]!=='bot')return;
  const w=clone(g.state),ctx={canAct:true,label:i=>seatLabel(g,i)};
  for(let n=0;n<300;n++){if(GAME.bot(w,ctx)==='commit')break}
  const doc=clone(g);doc.state=w;if(w.over)doc.status='done';
  saveGame(id,doc);
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
  view={screen:'game',id};workKey=null;handoff=null;setHash(id);saveGame(id,doc);window.scrollTo(0,0);
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
    view={screen:'game',id};setHash(id);await saveGame(id,d);
  }catch(e){toast('Couldn’t join that game. Try again.')}
}
function setHash(id){try{history.replaceState(null,'',id?'#'+id:location.pathname+location.search)}catch(e){}}

const GLOBAL={
  new:kind=>newGame(kind),
  open:id=>{view={screen:'game',id};workKey=null;handoff=null;setHash(id);render();window.scrollTo(0,0)},
  lobby:()=>{view={screen:'lobby',id:null};handoff=null;setHash(null);render()},
  join:id=>claimSeat(id,false),
  solo:id=>claimSeat(id,true),
  undo:()=>{workKey=null;render()},
  ready:()=>{handoff=null;render()},
  rematch:()=>{const g=getGame(view.id);newGame(isLocal(g)?(vsBot(g)?'bot':'hot'):g.seats[0]===g.seats[1]?'solo':'online')},
  del:async id=>{
    if(confirmDel!==id){confirmDel=id;render();setTimeout(()=>{if(confirmDel===id){confirmDel=null;render()}},4000);return}
    confirmDel=null;
    if(LOCAL[id]){delete LOCAL[id];lsSave();render();return}
    const prev=REMOTE[id];delete REMOTE[id];render();
    try{await DB.doc('games/'+id).delete()}catch(e){REMOTE[id]=prev;render();toast('Couldn’t delete that game.')}
  },
};
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-a]');if(!b||b.disabled)return;
  const a=b.dataset.a,arg=b.dataset.i;
  if(GLOBAL[a])return GLOBAL[a](arg);
  const g=getGame(view.id);if(!g)return;
  const ctx=gameCtx(g),h=GAME.on[a];
  if(!h||!ctx.canAct)return;
  if(h(work,arg,ctx)==='commit'){
    const doc=clone(g);doc.state=clone(work);if(work.over)doc.status='done';
    if(isLocal(doc)&&!vsBot(doc)&&!work.over)handoff=view.id;
    await saveGame(view.id,doc);window.scrollTo(0,0);
  }else render();
});

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
    if(first){first=false;if(h&&REMOTE[h]&&view.screen==='lobby')view={screen:'game',id:h}}
    refreshNames();render();
  },()=>toast('Lost the connection to shared games. Reload to reconnect.'));
}
init();
