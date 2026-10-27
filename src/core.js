// ---------- shared helpers (used by every game engine and the shell) ----------
const rnd=n=>Math.floor(Math.random()*n);
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const rep=(k,n)=>Array(n).fill(k);
const clone=o=>JSON.parse(JSON.stringify(o));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=s=>String(s).replace(/[<>&"']/g,'');
const newId=()=>'g'+Math.random().toString(36).slice(2,10);
const emptyPiles=s=>Object.values(s).filter(v=>v===0).length;

function draw(p,n){
  const out=[];
  for(let k=0;k<n;k++){
    if(!p.deck.length){if(!p.discard.length)break;p.deck=shuffle(p.discard);p.discard=[]}
    out.push(p.deck.pop());
  }
  return out;
}
// Seat 2 closes each round; the game ends at the close of the round where the end was triggered.
function passTurn(st,maxRounds){
  const was=st.turn;st.turn=1-was;
  if(was===1){if(st.endTriggered||st.round>=maxRounds)st.over=true;else st.round++}
  return 'commit';
}

let toastTimer;
function toast(msg){
  if(typeof document==='undefined')return;
  let t=document.querySelector('.toast');
  if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}
  t.textContent=msg;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.remove(),3200);
}
function cardHTML(def,o={}){
  const tag=o.btn?'button':'div';
  return `<${tag} class="card ${o.cls||''}" ${o.attrs||''} ${o.btn&&o.disabled?'disabled':''}>
    <div class="top"><span class="nm">${def.n}</span>${def.cost?`<span class="cost">${def.cost}</span>`:''}</div>
    ${o.face||''}<div class="tx">${def.txt||''}</div>${o.foot?`<div class="stat">${o.foot}</div>`:''}</${tag}>`;
}
function marketHTML(defs,supply,glam,canAct,action){
  return `<div class="mkt">${Object.keys(supply).map(k=>{
    const d=defs[k],ok=canAct&&supply[k]>0&&glam>=d.cost;
    return cardHTML(d,{btn:true,disabled:!ok,cls:ok?'':'dim',face:d.face||'',
      attrs:`data-a="${action}" data-i="${k}" aria-label="Buy ${d.n} for ${d.cost}"`,
      foot:`<span class="left">${supply[k]} left</span>`});
  }).join('')}</div>`;
}
