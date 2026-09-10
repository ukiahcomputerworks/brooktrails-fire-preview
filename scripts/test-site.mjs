import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = process.cwd();
const outputDir = path.join(root, 'evidence', 'test-output');
await mkdir(outputDir, { recursive: true });

const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.pdf':'application/pdf', '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
const skipDirs = new Set(['.git', 'evidence', 'scripts', 'data', 'node_modules']);

async function walk(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && skipDirs.has(entry.name)) continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(target, files);
    else files.push(target);
  }
  return files;
}

const htmlFiles = (await walk(root)).filter(file => file.endsWith('.html'));
const staticErrors = [];
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const rel = path.relative(root, file).replaceAll('\\', '/');
  if (!/<meta name="robots" content="noindex,nofollow,noarchive">/.test(html)) staticErrors.push(`${rel}: missing preview noindex`);
  if ((html.match(/<h1\b/g) || []).length !== 1) staticErrors.push(`${rel}: expected exactly one h1`);
  for (const match of html.matchAll(/<(?:a|link|script|img)[^>]+(?:href|src)="([^"]+)"/g)) {
    const ref = match[1].split(/[?#]/)[0];
    if (!ref || /^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(ref)) continue;
    let target = path.resolve(path.dirname(file), decodeURIComponent(ref));
    try {
      const info = await stat(target);
      if (info.isDirectory()) target = path.join(target, 'index.html');
      await stat(target);
    } catch { staticErrors.push(`${rel}: missing local target ${ref}`); }
  }
  for (const tag of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noopener/.test(tag[0])) staticErrors.push(`${rel}: target blank missing noopener`);
  }
}

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.join(root, pathname.replace(/^\/+/, ''));
    if (!path.extname(file)) file = path.join(file, 'index.html');
    if (!file.startsWith(root)) throw new Error('outside root');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type':'text/plain' });
    res.end('Not found');
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
const routes = ['/', '/water/', '/fire/', '/parks/', '/planning/', '/government/', '/history/', '/resources/', '/archive/', '/contact/'];
const viewports = [{ name:'desktop', width:1440, height:1000 }, { name:'mobile', width:390, height:844 }];
const browserErrors = [];
const results = [];
const browser = await chromium.launch({ headless:true, executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    for (const route of routes) {
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('pageerror', error => consoleErrors.push(error.message));
      const response = await page.goto(`${base}${route}`, { waitUntil:'networkidle', timeout:30000 });
      const audit = await page.evaluate(() => ({
        title: document.title,
        h1: document.querySelectorAll('h1').length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        brokenImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => image.getAttribute('src')),
        unlabeledButtons: [...document.querySelectorAll('button')].filter(button => !button.textContent.trim() && !button.getAttribute('aria-label')).length,
      }));
      const record = { route, viewport:viewport.name, status:response?.status(), ...audit, consoleErrors };
      results.push(record);
      if (record.status !== 200) browserErrors.push(`${viewport.name} ${route}: HTTP ${record.status}`);
      if (record.h1 !== 1) browserErrors.push(`${viewport.name} ${route}: ${record.h1} h1 elements`);
      if (record.overflow > 1) browserErrors.push(`${viewport.name} ${route}: horizontal overflow ${record.overflow}px`);
      if (record.brokenImages.length) browserErrors.push(`${viewport.name} ${route}: broken images ${record.brokenImages.join(', ')}`);
      if (record.unlabeledButtons) browserErrors.push(`${viewport.name} ${route}: unlabeled buttons ${record.unlabeledButtons}`);
      if (record.consoleErrors.length) browserErrors.push(`${viewport.name} ${route}: console errors ${record.consoleErrors.join(' | ')}`);
      if ((route === '/' || route === '/fire/') && (viewport.name === 'desktop' || viewport.name === 'mobile')) {
        const slug = route === '/' ? 'home' : 'fire';
        await page.screenshot({ path:path.join(outputDir, `${slug}-${viewport.name}.png`), fullPage:true });
      }
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

const report = { generatedAt:new Date().toISOString(), htmlFiles:htmlFiles.length, routesChecked:results.length, staticErrors, browserErrors, results };
await writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ htmlFiles:htmlFiles.length, browserChecks:results.length, staticErrors:staticErrors.length, browserErrors:browserErrors.length }, null, 2));
if (staticErrors.length || browserErrors.length) {
  console.error([...staticErrors, ...browserErrors].join('\n'));
  process.exitCode = 1;
}
