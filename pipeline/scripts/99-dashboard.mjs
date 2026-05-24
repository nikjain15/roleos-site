#!/usr/bin/env node
// Live status dashboard for the job-search pipeline.
// Run: node pipeline/scripts/99-dashboard.mjs   then open http://localhost:7777

import http from 'node:http';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 7777);

function countFiles(dir, ext) {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) n += countFiles(p, ext);
    else if (entry.name.endsWith(ext)) n++;
  }
  return n;
}

function byCompany(dir, ext) {
  if (!existsSync(dir)) return {};
  const out = {};
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    out[entry.name] = countFiles(join(dir, entry.name), ext);
  }
  return out;
}

function tail(path, lines = 20) {
  if (!existsSync(path)) return '';
  const txt = readFileSync(path, 'utf8').split('\n');
  return txt.slice(-lines).join('\n');
}

function bgProcesses() {
  try {
    const out = execSync(`ps -axo pid,etime,command | grep -E "03-extract|04-render|_overnight" | grep -v grep`, { encoding: 'utf8' });
    return out.trim().split('\n').filter(Boolean);
  } catch { return []; }
}

function sumCost(logPath) {
  if (!existsSync(logPath)) return null;
  const re = /Cost \(actual\):\s*\$?([0-9.]+)/gi;
  const txt = readFileSync(logPath, 'utf8');
  let m, total = 0, n = 0;
  while ((m = re.exec(txt))) { total += Number(m[1]); n++; }
  return { total, n };
}

function status() {
  const raw = countFiles(join(ROOT, 'jds-raw'), '.md');
  const structured = countFiles(join(ROOT, 'jds-structured'), '.json');
  const views = countFiles(join(ROOT, 'jds-views'), '.view.md');
  return {
    ts: new Date().toISOString(),
    counts: { raw, structured, views },
    pct: { structured: raw ? (structured / raw * 100).toFixed(1) : '0', views: raw ? (views / raw * 100).toFixed(1) : '0' },
    byCompanyStructured: byCompany(join(ROOT, 'jds-structured'), '.json'),
    byCompanyRaw: byCompany(join(ROOT, 'jds-raw'), '.md'),
    bg: bgProcesses(),
    cost: sumCost(join(ROOT, 'data/overnight.log')),
    logTail: tail(join(ROOT, 'data/overnight.log'), 25),
  };
}

const HTML = `<!doctype html><html><head><meta charset=utf8><title>JD Pipeline Status</title>
<style>
body{font:14px/1.4 ui-monospace,monospace;background:#0b0d10;color:#d7dde5;margin:0;padding:24px;max-width:1100px}
h1{font-size:18px;margin:0 0 16px;color:#fff}
h2{font-size:13px;margin:24px 0 8px;color:#8aa;text-transform:uppercase;letter-spacing:.08em}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.card{background:#151a20;border:1px solid #232a33;border-radius:6px;padding:14px}
.big{font-size:28px;color:#fff;font-weight:600}
.sub{color:#7a8696;font-size:12px;margin-top:4px}
.bar{height:6px;background:#232a33;border-radius:3px;overflow:hidden;margin-top:8px}
.bar>div{height:100%;background:linear-gradient(90deg,#3b82f6,#10b981);transition:width .4s}
pre{background:#0e1115;border:1px solid #1e242c;border-radius:4px;padding:10px;overflow:auto;font-size:12px;max-height:320px;color:#bcc6d1}
table{width:100%;border-collapse:collapse;font-size:12px}
td{padding:3px 8px;border-bottom:1px solid #1e242c}
td:last-child{text-align:right;color:#7a8696}
.ok{color:#10b981}.warn{color:#f59e0b}.run{color:#3b82f6}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle}
.dot.run{background:#3b82f6;animation:pulse 1.5s infinite}.dot.idle{background:#555}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
</style></head><body>
<h1>JD Pipeline — live status</h1>
<div id=app>loading…</div>
<script>
async function tick(){
  const s = await (await fetch('/status')).json();
  const running = s.bg.length > 0;
  const html = \`
    <div class=grid>
      <div class=card><div class=big>\${s.counts.raw}</div><div class=sub>raw JDs</div></div>
      <div class=card><div class=big>\${s.counts.structured} <span style="font-size:14px;color:#7a8696">/ \${s.counts.raw}</span></div><div class=sub>structured (\${s.pct.structured}%)</div><div class=bar><div style="width:\${s.pct.structured}%"></div></div></div>
      <div class=card><div class=big>\${s.counts.views} <span style="font-size:14px;color:#7a8696">/ \${s.counts.raw}</span></div><div class=sub>views (\${s.pct.views}%)</div><div class=bar><div style="width:\${s.pct.views}%"></div></div></div>
    </div>
    <h2><span class="dot \${running?'run':'idle'}"></span>Background processes</h2>
    <pre>\${s.bg.length ? s.bg.join('\\n') : '(none running)'}</pre>
    \${s.cost ? \`<h2>Cost so far</h2><div class=card>$\${s.cost.total.toFixed(4)} across \${s.cost.n} run(s)</div>\` : ''}
    <h2>Per-company progress (structured / raw)</h2>
    <div class=card><table>\${Object.keys(s.byCompanyRaw).sort().map(c=>{
      const r=s.byCompanyRaw[c]||0, st=s.byCompanyStructured[c]||0;
      const cls = st===r ? 'ok' : (st>0 ? 'run' : 'warn');
      return \`<tr><td>\${c}</td><td class=\${cls}>\${st} / \${r}</td></tr>\`;
    }).join('')}</table></div>
    <h2>overnight.log (tail)</h2>
    <pre>\${s.logTail.replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]))}</pre>
    <div class=sub style="margin-top:16px">updated \${s.ts} — refreshes every 5s</div>\`;
  document.getElementById('app').innerHTML = html;
}
tick(); setInterval(tick, 5000);
</script></body></html>`;

http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(status()));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(HTML);
  }
}).listen(PORT, () => console.log(`Dashboard: http://localhost:${PORT}`));
