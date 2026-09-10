import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = new URL(process.argv[2] || 'https://www.btcsd.org/');
const outRoot = path.resolve(process.argv[3] || 'evidence/source-capture/2026-09-10');
const MAX_ITEMS = 2000;
const MAX_BYTES = 60 * 1024 * 1024;
const ASSET_HOSTS = /(^|\.)(btcsd\.org|wixstatic\.com|filesusr\.com)$/i;
const queue = [];
const queued = new Set();
const records = [];
const external = new Map();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url) {
  let response;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'CWU public-site preservation crawler/1.0 (+https://ukiahcomputerworks.com)' },
    });
    if (![429, 502, 503, 504].includes(response.status)) return response;
    if (attempt < 4) await wait(750 * (attempt + 1));
  }
  return response;
}

function canonical(raw, parent = base) {
  try {
    const url = new URL(raw.replace(/&amp;/g, '&'), parent);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|lightbox)/i.test(key)) url.searchParams.delete(key);
    }
    if (url.hostname === 'btcsd.org') url.hostname = 'www.btcsd.org';
    return url;
  } catch {
    return null;
  }
}

function enqueue(raw, referrer, kind = 'discovered') {
  const url = canonical(raw, referrer || base);
  if (!url) return;
  const sameSite = url.hostname === base.hostname;
  const assetHost = ASSET_HOSTS.test(url.hostname);
  if (!sameSite && !assetHost) {
    if (!external.has(url.href)) external.set(url.href, new Set());
    if (referrer) external.get(url.href).add(String(referrer));
    return;
  }
  const key = url.href;
  if (queued.has(key)) return;
  queued.add(key);
  queue.push({ url, referrer: referrer ? String(referrer) : null, kind });
}

function safePart(value) {
  return decodeURIComponent(value || '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'index';
}

function outputPath(url, contentType) {
  const digest = createHash('sha256').update(url.href).digest('hex').slice(0, 12);
  const isHtml = /text\/html/i.test(contentType);
  if (url.hostname === base.hostname && isHtml) {
    const route = url.pathname.replace(/^\/+|\/+$/g, '');
    return path.join('pages', route ? safePart(route) : 'home', 'index.html');
  }
  const ext = path.extname(url.pathname).slice(0, 12);
  const stem = safePart(path.basename(url.pathname, ext));
  return path.join('assets', safePart(url.hostname), `${stem}-${digest}${ext || '.bin'}`);
}

function references(text, contentType) {
  const found = new Set();
  if (/html|xml|css|javascript|json/i.test(contentType)) {
    for (const match of text.matchAll(/(?:href|src|poster)\s*=\s*["']([^"']+)["']/gi)) {
      found.add(match[1]);
    }
    for (const match of text.matchAll(/srcset\s*=\s*["']([^"']+)["']/gi)) {
      match[1].split(/,\s+(?=(?:https?:)?\/\/|\/)/).forEach(part => found.add(part.trim().replace(/\s+\d+(?:\.\d+)?[wx]$/, '')));
    }
    for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) found.add(match[1]);
    for (const match of text.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) found.add(match[1]);
    for (const match of text.matchAll(/https?:\\?\/\\?\/[^\s"'<>\\]+?\.(?:pdf|docx?|xlsx?|csv|jpe?g|png|gif|webp|svg)(?:[^\s"'<>\\]*)?/gi)) {
      found.add(match[0]);
    }
  }
  return [...found]
    .map(value => value.replace(/\\\//g, '/').replace(/&quot;.*$/i, '').trim())
    .filter(value => /^(?:https?:)?\/\//i.test(value) || /^\.?\.?(?:\/|\\)/.test(value));
}

enqueue(base.href, null, 'seed');
enqueue(new URL('/robots.txt', base).href, null, 'seed');
enqueue(new URL('/sitemap.xml', base).href, null, 'seed');

await mkdir(outRoot, { recursive: true });

while (queue.length && records.length < MAX_ITEMS) {
  const item = queue.shift();
  const started = new Date().toISOString();
  try {
    const response = await fetchWithRetry(item.url);
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_BYTES) throw new Error(`content-length ${length} exceeds ${MAX_BYTES}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_BYTES) throw new Error(`download ${bytes.length} exceeds ${MAX_BYTES}`);
    const rel = outputPath(item.url, contentType);
    const target = path.join(outRoot, rel);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    const record = {
      url: item.url.href,
      finalUrl: response.url,
      referrer: item.referrer,
      kind: item.kind,
      status: response.status,
      contentType,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      localPath: rel.replaceAll('\\', '/'),
      capturedAt: started,
    };
    records.push(record);
    if (/html|xml|css|javascript|json/i.test(contentType)) {
      const text = bytes.toString('utf8');
      const title = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (title) record.title = title;
      for (const ref of references(text, contentType)) enqueue(ref, item.url.href, /xml/i.test(contentType) ? 'sitemap' : 'page-reference');
    }
    if (item.url.hostname === base.hostname) await wait(60);
  } catch (error) {
    records.push({ url: item.url.href, referrer: item.referrer, kind: item.kind, error: String(error), capturedAt: started });
  }
}

const manifest = {
  schemaVersion: 1,
  source: base.href,
  capturedAt: new Date().toISOString(),
  limits: { maxItems: MAX_ITEMS, maxBytesPerItem: MAX_BYTES },
  totals: {
    records: records.length,
    successful: records.filter(r => r.status >= 200 && r.status < 400).length,
    failed: records.filter(r => r.error || r.status >= 400).length,
    bytes: records.reduce((sum, r) => sum + (r.bytes || 0), 0),
    externalReferences: external.size,
    queueRemaining: queue.length,
  },
  records,
  externalReferences: [...external].map(([url, refs]) => ({ url, referrers: [...refs] })),
};

await writeFile(path.join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
await writeFile(path.join(outRoot, 'README.txt'), [
  'Brooktrails Township CSD public website source capture',
  `Source: ${base.href}`,
  `Captured: ${manifest.capturedAt}`,
  `Records: ${manifest.totals.records}`,
  `Successful: ${manifest.totals.successful}`,
  `Failed: ${manifest.totals.failed}`,
  `Bytes: ${manifest.totals.bytes}`,
  '',
  'This is preservation evidence from public pages. It is not deployable source and does not prove that changing statements remain current.',
].join('\n'));

console.log(JSON.stringify(manifest.totals, null, 2));
