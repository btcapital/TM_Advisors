// Crops a PNG by re-rendering it in Chrome and screenshotting a clip.
// Used to strip identifying chrome (wordmarks, nav bars) out of images
// before a blind comparison.
//
//   node crop.mjs in.png out.png <x> <y> <w> <h>

import { spawn } from 'node:child_process';
import { existsSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));

const [inPath, outPath, X, Y, W, H] = process.argv.slice(2);
const src = 'file:///' + realpathSync(resolve(inPath)).replace(/\\/g, '/');
const w = Number(W), h = Number(H), x = Number(X), y = Number(Y);

const PORT = 9861;
const proc = spawn(chrome, [
  '--headless=old', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--hide-scrollbars', '--allow-file-access-from-files',
  '--user-data-dir=' + process.env.TEMP + '/dl-crop',
  '--remote-debugging-port=' + PORT, `--window-size=${w},${h}`, 'about:blank',
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
await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });

// The image has to be DECODED before the capture, not merely requested.
// Sleeping and hoping produced pure-white crops: the screenshot fired first.
const html = `<style>html,body{margin:0;padding:0;overflow:hidden;background:#fff}
img{position:absolute;left:${-x}px;top:${-y}px;max-width:none}</style><img id="s" src="${src}">`;
await send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) });

const ready = await send('Runtime.evaluate', {
  awaitPromise: true, returnByValue: true,
  expression: `(async () => {
    const img = document.getElementById('s');
    await img.decode();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return img.naturalWidth + 'x' + img.naturalHeight;
  })()`,
});
if (!ready.result?.value) {
  console.error(`FAILED: ${inPath} never decoded. ${JSON.stringify(ready).slice(0, 300)}`);
  proc.kill();
  process.exit(1);
}
await sleep(300);

const shot = await send('Page.captureScreenshot', {
  format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 },
});
writeFileSync(resolve(outPath), Buffer.from(shot.data, 'base64'));
console.log(`${outPath}  ${w}x${h} from ${inPath} at ${x},${y}`);
proc.kill();
process.exit(0);
