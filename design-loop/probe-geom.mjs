// Reports the bounding box of selected elements on a local page, so layout
// bugs get measured instead of eyeballed from a screenshot.
//
//   node probe-geom.mjs <url> "<selector>" "<selector>" ...

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));

const PORT = 9841;
const proc = spawn(chrome, [
  '--headless=old', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--hide-scrollbars', '--allow-file-access-from-files',
  '--user-data-dir=' + process.env.TEMP + '/dl-geom',
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
const [url, ...selectors] = process.argv.slice(2);
await send('Page.navigate', { url });
await sleep(4000);

const expr = `(() => {
  const out = [];
  for (const sel of ${JSON.stringify(selectors)}) {
    const els = document.querySelectorAll(sel);
    if (!els.length) { out.push({ sel, n: 0 }); continue; }
    els.forEach((e, i) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      out.push({
        sel: sel + (els.length > 1 ? '[' + i + ']' : ''),
        x: Math.round(r.x), y: Math.round(r.y + scrollY),
        w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
        cx: Math.round((r.x + r.width / 2) * 10) / 10,
        bg: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopColor,
        pos: cs.position, disp: cs.display,
      });
    });
  }
  return JSON.stringify(out, null, 1);
})()`;

const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
console.log(res.result?.value ?? JSON.stringify(res).slice(0, 600));
proc.kill();
process.exit(0);
