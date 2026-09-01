// Dumps the visible prose of each page, plus the team bios that live in a
// hidden block and only surface in the profile dialog. Used to feed the
// humanize pattern scan.

import { spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));

const PORT = 9911;
const proc = spawn(chrome, [
  '--headless=old', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--hide-scrollbars', '--allow-file-access-from-files',
  '--user-data-dir=' + process.env.TEMP + '/dl-copy',
  '--remote-debugging-port=' + PORT, '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 100 && !wsUrl; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
  } catch {}
  if (!wsUrl) await sleep(200);
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });

await send('Page.enable');
await send('Runtime.enable');

const EXPR = `(() => {
  const out = [];
  const main = document.querySelector('main');
  out.push('--- VISIBLE PAGE COPY ---');
  out.push(main ? main.innerText : document.body.innerText);
  const bios = document.querySelectorAll('[id^="bio-src-"]');
  if (bios.length) {
    out.push('');
    out.push('--- TEAM BIOS (shown in the profile dialog) ---');
    bios.forEach(b => { out.push('[' + b.id + '] ' + b.textContent.trim()); });
  }
  return out.join('\\n');
})()`;

let all = '';
for (const page of ['index.html', 'investment-strategies.html', 'contact.html', 'thank-you.html', '404.html']) {
  const loaded = send('Page.navigate', { url: 'file:///C:/Users/Brandon/dev/TM_Advisors/' + page });
  await loaded;
  await sleep(3400);
  const r = await send('Runtime.evaluate', { expression: EXPR, returnByValue: true });
  const text = r.result?.value;
  all += `\n\n=============== ${page} ===============\n` + (text || 'EXTRACT FAILED: ' + JSON.stringify(r).slice(0, 300));
}

writeFileSync('site-copy.txt', all, 'utf8');
console.log('chars:', all.length);
proc.kill();
process.exit(0);
