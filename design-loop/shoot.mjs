// Headless capture harness for the design loop.
// Drives the locally installed Chrome over CDP: no npm install, no download.
//
//   node shoot.mjs jobs.json
//
// jobs.json: { "outDir": "shots", "width": 1440, "height": 900, "jobs": [
//   { "name": "mercury-full", "url": "https://mercury.com/", "full": true },
//   { "name": "mercury-scroll", "url": "https://mercury.com/", "frames": [0, 0.15, 0.3] }
// ] }
//
// "full" captures the whole document height in one image (capped, see MAX_FULL).
// "frames" captures one viewport-sized image per scroll fraction, suffixed -00, -01...

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
// Chrome refuses a single screenshot taller than this; taller pages get clipped
// rather than silently failing the whole run.
const MAX_FULL = 16000;
const PORT = 9333 + (process.pid % 500);

const cfgPath = resolve(process.argv[2]);
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
const baseDir = dirname(cfgPath);
const outDir = resolve(baseDir, cfg.outDir ?? 'shots');
mkdirSync(outDir, { recursive: true });

const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('No Chrome or Edge found. Looked in:\n  ' + CHROME_CANDIDATES.join('\n  '));
  process.exit(1);
}

const W = cfg.width ?? 1440;
const H = cfg.height ?? 900;
// A fresh temp profile per run: NOT under outDir. An earlier version put it
// there, which meant every render silently wrote a 50-150MB throwaway
// Chrome profile alongside the screenshots.
const profile = join(tmpdir(), 'tm-shoot-profile-' + process.pid);

const proc = spawn(chrome, [
  '--headless=old',
  '--disable-gpu',
  '--no-sandbox',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-background-timer-throttling',
  '--force-color-profile=srgb',
  '--hide-scrollbars',
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${PORT}`,
  `--window-size=${W},${H}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

let chromeErr = '';
proc.stderr.on('data', (d) => { chromeErr += d.toString(); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function endpoint() {
  // Chrome writes the port file and opens the socket a beat after spawn.
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error(`Chrome never opened a debug socket on ${PORT}.\n${chromeErr}`);
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners) fn(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      setTimeout(() => {
        if (this.pending.delete(id)) rej(new Error(`${method} timed out`));
      }, 60000);
    });
  }
  once(method, timeout = 30000) {
    return new Promise((res) => {
      const fn = (msg) => {
        if (msg.method === method) {
          this.listeners = this.listeners.filter((f) => f !== fn);
          res(msg.params);
        }
      };
      this.listeners.push(fn);
      setTimeout(() => {
        this.listeners = this.listeners.filter((f) => f !== fn);
        res(null);
      }, timeout);
    });
  }
}

function connect(url) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => res(new CDP(ws)));
    ws.addEventListener('error', () => rej(new Error('CDP socket failed')));
  });
}

const results = [];

try {
  const cdp = await connect(await endpoint());
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: W, height: H, deviceScaleFactor: cfg.scale ?? 1, mobile: false,
  });

  for (const job of cfg.jobs) {
    const settle = job.wait ?? cfg.wait ?? 3500;
    try {
      const loaded = cdp.once('Page.loadEventFired', 45000);
      await cdp.send('Page.navigate', { url: job.url });
      await loaded;
      await sleep(settle);

      // Nudge the page through a full scroll so lazy images, reveal animations
      // and scroll-linked backgrounds all commit, then return to the top.
      if (job.prescroll !== false) {
        await cdp.send('Runtime.evaluate', {
          awaitPromise: true,
          expression: `(async () => {
            const h = document.documentElement.scrollHeight;
            for (let y = 0; y < h; y += ${Math.round(H * 0.6)}) {
              window.scrollTo(0, y);
              await new Promise(r => setTimeout(r, 260));
            }
            window.scrollTo(0, 0);
            await new Promise(r => setTimeout(r, 700));
          })()`,
        });
      }

      // Optionally remove chrome that would identify the page in a blind
      // comparison (a fixed header carries the wordmark into every frame,
      // and it follows the viewport, so it cannot be cropped away).
      if (job.hide?.length) {
        await cdp.send('Runtime.evaluate', {
          expression: `${JSON.stringify(job.hide)}.forEach(sel =>
            document.querySelectorAll(sel).forEach(el => { el.style.display = 'none'; }))`,
        });
      }

      const metrics = await cdp.send('Page.getLayoutMetrics');
      const docH = Math.ceil(metrics.cssContentSize?.height ?? H);
      const docW = Math.ceil(metrics.cssContentSize?.width ?? W);

      // Absolute scroll offset, for capturing the same component on two
      // pages of different total height.
      if (typeof job.atY === 'number') {
        await cdp.send('Runtime.evaluate', { expression: `window.scrollTo(0, ${job.atY})` });
        await sleep(job.frameWait ?? 1200);
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        const name = `${job.name}.png`;
        writeFileSync(join(outDir, name), Buffer.from(shot.data, 'base64'));
        results.push(`${name}  ${W}x${H} at y=${job.atY}`);
        continue;
      }

      if (job.frames) {
        for (let i = 0; i < job.frames.length; i++) {
          const frac = job.frames[i];
          const y = Math.round(Math.max(0, docH - H) * frac);
          await cdp.send('Runtime.evaluate', { expression: `window.scrollTo(0, ${y})` });
          await sleep(job.frameWait ?? 1100);
          const shot = await cdp.send('Page.captureScreenshot', {
            format: 'png', captureBeyondViewport: false,
          });
          const name = `${job.name}-${String(i).padStart(2, '0')}.png`;
          writeFileSync(join(outDir, name), Buffer.from(shot.data, 'base64'));
          results.push(`${name}  y=${y} (${frac})`);
        }
      } else {
        const clipH = Math.min(job.full ? docH : H, MAX_FULL);
        const shot = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: !!job.full,
          clip: { x: 0, y: 0, width: Math.min(docW, W), height: clipH, scale: 1 },
        });
        const name = `${job.name}.png`;
        writeFileSync(join(outDir, name), Buffer.from(shot.data, 'base64'));
        results.push(`${name}  ${Math.min(docW, W)}x${clipH}${clipH < docH ? ` (clipped from ${docH})` : ''}`);
      }
    } catch (e) {
      results.push(`${job.name}  FAILED: ${e.message}`);
    }
  }
} finally {
  proc.kill();
}

console.log(results.join('\n'));
