// ---------- shared helpers (used by every game engine and the shell) ----------
const rnd=n=>Math.floor(Math.random()*n);
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const rep=(k,n)=>Array(n).fill(k);
const clone=o=>JSON.parse(JSON.stringify(o));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=s=>String(s).replace(/[<>&"']/g,'');
const newId=()=>'g'+Math.random().toString(36).slice(2,10);
const emptyPiles=s=>Object.values(s).filter(v=>v===0).length;
const T='︎'; // text presentation, so glyphs never render as emoji

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

// ---------- effects: one-shot animation flags, floating pop-ups, sounds ----------
// Handlers set these; the shell consumes them after the next render.
const FX={pops:[],deal:false,bead:false,fight:false};
function pop(seat,text,kind){FX.pops.push({seat,text,kind:kind||''})}
let MUTED=false,AC=null;
const SOUNDS={
  tap:[[700,.03,'triangle']],
  card:[[520,.05,'triangle'],[310,.05,'triangle']],
  coin:[[988,.06],[1319,.1]],
  score:[[523,.08],[659,.08],[784,.14]],
  bad:[[196,.16,'sawtooth'],[147,.22,'sawtooth']],
  win:[[523,.1],[659,.1],[784,.1],[1047,.3]],
  lose:[[392,.16],[330,.16],[262,.32]],
};
function sfx(name){
  if(MUTED||typeof window==='undefined')return;
  try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    if(AC.state==='suspended')AC.resume();
    let t=AC.currentTime;
    for(const [f,d,type] of SOUNDS[name]||[]){
      const o=AC.createOscillator(),g=AC.createGain();
      o.type=type||'sine';o.frequency.value=f;
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.1,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);
      o.connect(g).connect(AC.destination);o.start(t);o.stop(t+d+.02);t+=d*.8;
    }
  }catch(e){}
}
let toastTimer;
function toast(msg){
  if(typeof document==='undefined')return;
  let t=document.querySelector('.toast');
  if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}
  t.textContent=msg;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.remove(),3200);
}

// ---------- card rendering ----------
const stripTags=s=>String(s).replace(/<[^>]+>/g,'');
function cardHTML(def,o={}){
  const tag=o.btn?'button':'div';
  return `<${tag} class="card k-${def.kind||'a'} ${o.cls||''}"${o.style?` style="${o.style}"`:''} ${o.attrs||''} ${o.btn&&o.disabled?'disabled':''} title="${esc(def.n+(def.txt?': '+stripTags(def.txt):''))}">
    <div class="chead"><span class="cname">${def.n}</span>${def.cost?`<span class="gem">${def.cost}</span>`:''}</div>
    <div class="cart">${o.face||def.face||`<span class="glyph">${def.art||''}</span>`}</div>
    <div class="ctext">${def.txt||''}</div>
    ${o.foot?`<div class="cfoot">${o.foot}</div>`:''}${o.badge!=null?`<span class="badge">${o.badge}</span>`:''}</${tag}>`;
}
// Fan position for card i of n in a hand.
function fanStyle(i,n){const d=i-(n-1)/2;return `--i:${i};--r:${(d*3.5).toFixed(1)}deg;--y:${(Math.pow(Math.abs(d),1.7)*4).toFixed(1)}px`}
function handHTML(items){
  return items.map((it,i)=>cardHTML(it.def,{...it.o,cls:`${(it.o&&it.o.cls)||''}${FX.deal?' deal':''}`,style:fanStyle(i,items.length)})).join('');
}
const backsHTML=n=>Array.from({length:n},(_,i)=>`<div class="card back${FX.deal?' deal':''}" style="${fanStyle(i,n)}"></div>`).join('');
const stackHTML=(label,n)=>`<div class="stack"><div class="card back${n?'':' none'}"></div><span>${label} <b>${n}</b></span></div>`;
function shopHTML(defs,supply,glam,canAct,action){
  return `<div class="shop">${Object.keys(supply).map(k=>{
    const d=defs[k],ok=canAct&&supply[k]>0&&glam>=d.cost;
    return cardHTML(d,{btn:true,disabled:!ok,cls:`mini${ok?' glow':supply[k]?'':' gone'}${canAct&&!ok?' dim':''}`,badge:`×${supply[k]}`,
      attrs:`data-a="${action}" data-i="${k}" aria-label="Buy ${d.n} for ${d.cost}"`});
  }).join('')}</div>`;
}
