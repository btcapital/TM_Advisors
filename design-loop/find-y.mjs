// Reports the absolute document Y of the first element whose text matches,
// so a blind crop can be aimed at a component instead of guessed at.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
const chrome=['C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const PORT=9877;
const proc=spawn(chrome,['--headless=old','--disable-gpu','--no-sandbox','--no-first-run','--hide-scrollbars','--allow-file-access-from-files','--user-data-dir='+process.env.TEMP+'/dl-findy','--remote-debugging-port='+PORT,'--window-size=1440,900','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws;for(let i=0;i<100&&!ws;i++){try{const l=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();ws=l.find(t=>t.type==='page')?.webSocketDebuggerUrl;}catch{};if(!ws)await sleep(200);}
const s=new WebSocket(ws);await new Promise(r=>s.addEventListener('open',r));
let id=0;const p=new Map();
s.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&p.has(m.id)){p.get(m.id)(m.result);p.delete(m.id);}});
const send=(method,params={})=>new Promise(r=>{p.set(++id,r);s.send(JSON.stringify({id,method,params}));});
await send('Page.enable');await send('Runtime.enable');
const [url,...needles]=process.argv.slice(2);
await send('Page.navigate',{url});await sleep(5000);
await send('Runtime.evaluate',{awaitPromise:true,expression:`(async()=>{const h=document.documentElement.scrollHeight;for(let y=0;y<h;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,150));}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,500));})()`});
const res=await send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{
  const out=[];
  for(const n of ${JSON.stringify(needles)}){
    const els=[...document.querySelectorAll('*')].filter(e=>e.children.length===0 && e.textContent.trim()===n);
    if(!els.length){out.push(n+': NOT FOUND');continue;}
    const r=els[0].getBoundingClientRect();
    out.push(n+': y='+Math.round(r.top+window.scrollY)+' x='+Math.round(r.left));
  }
  return out;
})()`});
const v=res.result?.value;console.log(Array.isArray(v)?v.join(String.fromCharCode(10)):JSON.stringify(res).slice(0,300));
proc.kill();process.exit(0);
