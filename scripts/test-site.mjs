import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = process.cwd();
const liveBase = process.env.SITE_BASE?.replace(/\/$/, '');
const outputDir = path.join(root, 'evidence', liveBase ? 'test-output-live' : 'test-output');
await mkdir(outputDir, { recursive: true });

const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.pdf':'application/pdf', '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
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
try {
  const searchIndex = JSON.parse(await readFile(path.join(root, 'search-index.json'), 'utf8'));
  const indexedDocuments = searchIndex.filter(item => item.type === 'Document');
  const fullTextDocuments = indexedDocuments.filter(item => (item.keywords || '').length > 500);
  if (indexedDocuments.length !== 47) staticErrors.push(`search: expected 47 published district documents, found ${indexedDocuments.length}`);
  if (fullTextDocuments.length !== 41) staticErrors.push(`search: expected 41 district documents with extractable full text, found ${fullTextDocuments.length}`);
} catch (error) {
  staticErrors.push(`search: index could not be validated (${error.message})`);
}
try {
  await stat(path.join(root, 'documents', '08349b-e2754931600c45e9a9121effe815729e.pdf'));
  staticErrors.push('privacy: legacy construction-meter form containing identity-data fields remains publishable');
} catch {}
try {
  const readerMap = await readFile(path.join(root, 'documents', 'brooktrails-hiking-trail-map-reader.pdf'), 'latin1');
  if (!/\/Rotate\s+90\b/.test(readerMap)) staticErrors.push('parks: corrected district trail map is not rotated into reader orientation');
} catch (error) {
  staticErrors.push(`parks: corrected district trail map is missing (${error.message})`);
}
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

const server = liveBase ? null : createServer(async (req, res) => {
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

if (server) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = liveBase || `http://127.0.0.1:${server.address().port}`;
const routes = ['/', '/services/', '/water/', '/parks/', '/planning/', '/moving/', '/government/', '/history/', '/resources/', '/archive/', '/contact/'];
const separatedFireRoutes = ['/fire/', '/about-brooktrails-fire-department/', '/brooktrails-fire-department/', '/emergency-services/', '/fire-department-links/'];
const viewports = [{ name:'compactLaptop', width:1080, height:583 }, { name:'laptop', width:1513, height:618 }, { name:'desktop', width:1440, height:1000 }, { name:'mobile', width:390, height:844 }];
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
        bodyClass: document.body.className,
        activeNavigation: document.querySelectorAll('.site-nav [aria-current="page"]').length,
        homeSpringboard: document.body.classList.contains('page-home') ? (() => {
          const hubs = [...document.querySelectorAll('.hub-springboard')];
          return {
            count:hubs.length,
            classes:hubs.map(hub => [...hub.classList].find(name => name.startsWith('hub-') && name !== 'hub-springboard')),
            hrefs:hubs.map(hub => hub.getAttribute('href')),
            oldCards:document.querySelectorAll('.service-card').length,
            mainLinks:document.querySelectorAll('main a[href]').length,
            currentGauge:(() => {
              const gauge = document.querySelector('.hub-current .current-gauge');
              if (!gauge) return null;
              const rect = gauge.getBoundingClientRect();
              return { count:document.querySelectorAll('.hub-current .current-gauge').length, width:rect.width, height:rect.height };
            })(),
            oldCurrentRipples:document.querySelectorAll('.hub-current-ripple').length,
            recordCabinet:document.querySelectorAll('.hub-docket .record-cabinet').length,
            cabinetDrawers:document.querySelectorAll('.record-cabinet > i').length,
            rangerMap:document.querySelectorAll('.hub-compass .ranger-map').length,
          };
        })() : null,
        heroFit: (() => {
          const copy = document.querySelector('.page-hero-copy, .home-hero-copy');
          if (!copy) return null;
          const rect = copy.getBoundingClientRect();
          return { top:rect.top, bottom:rect.bottom, viewportHeight:window.innerHeight };
        })(),
        homeHeroLeadGap: document.body.classList.contains('page-home') ? (() => {
          const header = document.querySelector('.site-header');
          const eyebrow = document.querySelector('.home-hero-copy .eyebrow');
          return header && eyebrow ? eyebrow.getBoundingClientRect().top - header.getBoundingClientRect().bottom : null;
        })() : null,
        firstSectionPaddingTop: (() => {
          const section = document.querySelector('.page-content > .section:first-child');
          return section ? Number.parseFloat(getComputedStyle(section).paddingTop) : null;
        })(),
        styles: (() => {
          const heading = getComputedStyle(document.querySelector('h1'));
          const body = getComputedStyle(document.body);
          const primaryAction = document.querySelector('.button, .quick-link');
          const action = primaryAction ? getComputedStyle(primaryAction) : null;
          const calloutParagraph = document.querySelector('.callout p');
          const calloutText = calloutParagraph ? getComputedStyle(calloutParagraph) : null;
          return {
            headingFamily: heading.fontFamily,
            headingWeight: heading.fontWeight,
            bodyFamily: body.fontFamily,
            actionMinHeight: action?.minHeight || null,
            calloutText: calloutText ? { color:calloutText.color, fontSize:calloutText.fontSize, fontWeight:calloutText.fontWeight, lineHeight:calloutText.lineHeight } : null,
          };
        })(),
      }));
      const record = { route, viewport:viewport.name, status:response?.status(), ...audit, consoleErrors };
      results.push(record);
      if (record.status !== 200) browserErrors.push(`${viewport.name} ${route}: HTTP ${record.status}`);
      if (record.h1 !== 1) browserErrors.push(`${viewport.name} ${route}: ${record.h1} h1 elements`);
      if (record.overflow > 1) browserErrors.push(`${viewport.name} ${route}: horizontal overflow ${record.overflow}px`);
      if (record.brokenImages.length) browserErrors.push(`${viewport.name} ${route}: broken images ${record.brokenImages.join(', ')}`);
      if (record.unlabeledButtons) browserErrors.push(`${viewport.name} ${route}: unlabeled buttons ${record.unlabeledButtons}`);
      if (record.consoleErrors.length) browserErrors.push(`${viewport.name} ${route}: console errors ${record.consoleErrors.join(' | ')}`);
      const expectedActiveNavigation = route === '/contact/' ? 0 : 1;
      if (record.activeNavigation !== expectedActiveNavigation) browserErrors.push(`${viewport.name} ${route}: expected ${expectedActiveNavigation} active primary navigation item, found ${record.activeNavigation}`);
      if (!record.styles.headingFamily.toLowerCase().includes('trebuchet')) browserErrors.push(`${viewport.name} ${route}: unexpected heading family ${record.styles.headingFamily}`);
      if (!record.styles.bodyFamily.toLowerCase().includes('system-ui')) browserErrors.push(`${viewport.name} ${route}: unexpected body family ${record.styles.bodyFamily}`);
      if ((viewport.name === 'laptop' || viewport.name === 'compactLaptop') && record.heroFit?.bottom > viewport.height - 12) browserErrors.push(`${viewport.name} ${route}: hero copy extends below the usable first screen (${record.heroFit.bottom.toFixed(1)}px of ${viewport.height}px)`);
      if (route === '/' && viewport.name === 'mobile' && (record.homeHeroLeadGap === null || record.homeHeroLeadGap < 16 || record.homeHeroLeadGap > 52)) browserErrors.push(`${viewport.name} ${route}: field-guide lead gap is ${record.homeHeroLeadGap}px; expected 16-52px below the header`);
      if ((viewport.name === 'laptop' || viewport.name === 'compactLaptop') && record.firstSectionPaddingTop !== null && record.firstSectionPaddingTop > 64) browserErrors.push(`${viewport.name} ${route}: first content section leaves ${record.firstSectionPaddingTop}px of empty top space`);
      if (route === '/') {
        const expectedClasses = ['hub-current','hub-trailhead','hub-docket','hub-compass'];
        const expectedHrefs = ['services/','parks/','government/','history/'];
        if (record.homeSpringboard?.count !== 4) browserErrors.push(`${viewport.name} ${route}: expected four home springboards`);
        if (JSON.stringify(record.homeSpringboard?.classes) !== JSON.stringify(expectedClasses)) browserErrors.push(`${viewport.name} ${route}: springboards do not use four distinct visual metaphors`);
        if (JSON.stringify(record.homeSpringboard?.hrefs) !== JSON.stringify(expectedHrefs)) browserErrors.push(`${viewport.name} ${route}: springboards do not map exactly to the four hubs`);
        if (record.homeSpringboard?.oldCards !== 0) browserErrors.push(`${viewport.name} ${route}: old service cards remain on the home page`);
        if (record.homeSpringboard?.currentGauge?.count !== 1) browserErrors.push(`${viewport.name} ${route}: Services water-works landmark is missing`);
        if ((record.homeSpringboard?.currentGauge?.width || 0) < (viewport.name === 'mobile' ? 90 : 115)) browserErrors.push(`${viewport.name} ${route}: Services water-works landmark is too small (${record.homeSpringboard?.currentGauge?.width || 0}px)`);
        if (record.homeSpringboard?.oldCurrentRipples !== 0) browserErrors.push(`${viewport.name} ${route}: legacy Services line decoration remains`);
        if (record.homeSpringboard?.recordCabinet !== 1 || record.homeSpringboard?.cabinetDrawers !== 3) browserErrors.push(`${viewport.name} ${route}: District & Board records cabinet is incomplete`);
        if (record.homeSpringboard?.rangerMap !== 1) browserErrors.push(`${viewport.name} ${route}: Discover ranger-map landmark is missing`);
        if (record.homeSpringboard?.mainLinks > 11) browserErrors.push(`${viewport.name} ${route}: home still presents too many competing links (${record.homeSpringboard.mainLinks})`);
        const firstSpringboard = page.locator('.hub-springboard').first();
        await firstSpringboard.hover();
        if ((await firstSpringboard.evaluate(element => getComputedStyle(element).transform)) === 'none') browserErrors.push(`${viewport.name} ${route}: springboard hover reward is missing`);
        await firstSpringboard.focus();
        if ((await firstSpringboard.evaluate(element => getComputedStyle(element).outlineStyle)) === 'none') browserErrors.push(`${viewport.name} ${route}: springboard focus indicator is missing`);
      }
      if (record.styles.calloutText) {
        const callout = record.styles.calloutText;
        if (callout.color !== 'rgb(16, 36, 30)') browserErrors.push(`${viewport.name} ${route}: callout text color regressed to ${callout.color}`);
        if (Number.parseFloat(callout.fontSize) < 16.8) browserErrors.push(`${viewport.name} ${route}: callout text too small at ${callout.fontSize}`);
        if (Number.parseInt(callout.fontWeight, 10) < 600) browserErrors.push(`${viewport.name} ${route}: callout text weight too light at ${callout.fontWeight}`);
      }
      if (!/^page-/.test(record.bodyClass)) browserErrors.push(`${viewport.name} ${route}: missing page route class`);
      const primaryNavLabels = await page.locator('.site-nav a').allTextContents();
      if (primaryNavLabels.length !== 5) browserErrors.push(`${viewport.name} ${route}: expected five exploration hubs, found ${primaryNavLabels.length}`);
      if (JSON.stringify(primaryNavLabels.map(label => label.trim())) !== JSON.stringify(['Home','Services','Parks & Places','District & Board','Discover Brooktrails'])) browserErrors.push(`${viewport.name} ${route}: primary navigation does not match the four-hub architecture`);
      if (primaryNavLabels.some(label => label.trim().toLowerCase() === 'contact')) browserErrors.push(`${viewport.name} ${route}: utility contact destination remains in primary navigation`);
      if ((await page.locator('.masthead-actions .button').textContent()).trim() !== 'District desk') browserErrors.push(`${viewport.name} ${route}: masthead utility destination is not labeled District desk`);
      if (await page.locator('[data-site-search-input]').count() !== 1) browserErrors.push(`${viewport.name} ${route}: expected exactly one site-wide search`);
      if (route === '/') {
        const siteSearch = page.locator('[data-site-search-input]');
        const searchOptions = page.locator('[data-site-search-results] [role="option"]');
        for (const [query, expected] of [['ordinance 63','ordinance 63'],['building permit','build on my property'],['moving','considering brooktrails'],['evacuation','safety & evacuation']]) {
          await siteSearch.fill(query);
          await page.waitForTimeout(150);
          if (await searchOptions.count() < 1) browserErrors.push(`${viewport.name} ${route}: site search returned no suggestion for ${query}`);
          else if (!(await searchOptions.first().innerText()).toLowerCase().includes(expected)) browserErrors.push(`${viewport.name} ${route}: site search did not prioritize ${expected} for ${query}`);
        }
        await siteSearch.fill('nonexistent district phrase');
        await page.waitForTimeout(100);
        if (!(await page.locator('.site-search-empty').isVisible())) browserErrors.push(`${viewport.name} ${route}: site search has no visible zero-result recovery`);
        await page.keyboard.press('Escape');
      }
      if (route === '/planning/') {
        const planningText = await page.locator('main').innerText();
        for (const required of ['District design review is not the County building permit','Seven steps','Do not email identity documents']) {
          if (!planningText.includes(required)) browserErrors.push(`${viewport.name} ${route}: missing planning guidance “${required}”`);
        }
        if (await page.locator('a[href*="e2754931600c45e9a9121effe815729e"]').count()) browserErrors.push(`${viewport.name} ${route}: sensitive legacy form remains linked`);
      }
      if (route === '/moving/') {
        const movingText = await page.locator('main').innerText();
        for (const required of ['Seven questions','A quick jurisdiction map.','assessor’s parcel number']) {
          if (!movingText.includes(required)) browserErrors.push(`${viewport.name} ${route}: missing prospective-resident guidance “${required}”`);
        }
      }
      if (route === '/contact/') {
        const contactText = await page.locator('main').innerText();
        for (const requiredContact of ['707-459-2494','btcsd@btcsd.org','24860 Birch Street','707-459-0358','707-459-6761']) {
          if (!contactText.includes(requiredContact)) browserErrors.push(`${viewport.name} ${route}: consolidated District Desk is missing ${requiredContact}`);
        }
        if (await page.locator('.district-desk-paths, main .action-grid').count()) browserErrors.push(`${viewport.name} ${route}: District Desk still repeats the hub navigation`);
      }
      if (['/parks/','/government/','/history/'].includes(route)) {
        const tabs = page.locator('[data-story-target]');
        const count = await tabs.count();
        if (count < 2) browserErrors.push(`${viewport.name} ${route}: story deck has fewer than two choices`);
        else {
          for (let tabIndex = 0; tabIndex < count; tabIndex += 1) {
            await tabs.nth(tabIndex).click();
            const targetId = await tabs.nth(tabIndex).getAttribute('data-story-target');
            const targetVisible = await page.locator(`#${targetId}`).isVisible();
            if (!targetVisible) browserErrors.push(`${viewport.name} ${route}: story panel ${tabIndex + 1} did not open`);
            if (viewport.name === 'compactLaptop') {
              const fit = await page.locator('.story-deck-stage').evaluate(element => ({ height:element.getBoundingClientRect().height, clientHeight:element.clientHeight, scrollHeight:element.scrollHeight }));
              if (fit.height > viewport.height - 24) browserErrors.push(`${viewport.name} ${route}: story panel ${tabIndex + 1} is taller than the visible card area (${fit.height.toFixed(1)}px)`);
              if (fit.scrollHeight > fit.clientHeight + 1) browserErrors.push(`${viewport.name} ${route}: story panel ${tabIndex + 1} clips content (${fit.scrollHeight}px inside ${fit.clientHeight}px)`);
            }
          }
          if (route === '/government/') {
            if (count !== 7) browserErrors.push(`${viewport.name} ${route}: employment is not exposed as the seventh civic question`);
            if (await page.locator('#civic-panel-work').count() !== 1) browserErrors.push(`${viewport.name} ${route}: employment panel is missing`);
            await page.locator('#civic-tab-inside').click();
            const destinations = page.locator('.story-deck-destination');
            if (await destinations.count() !== 3) browserErrors.push(`${viewport.name} ${route}: expected three clearly linked operations destinations`);
            else {
              const labels = await destinations.locator('.story-deck-destination-copy b').allTextContents();
              if (labels.some(label => !label.trim())) browserErrors.push(`${viewport.name} ${route}: an operations destination is missing visible action text`);
              const hrefs = await destinations.evaluateAll(links => links.map(link => link.getAttribute('href')));
              if (hrefs.some(href => !href || href === '#')) browserErrors.push(`${viewport.name} ${route}: an operations destination is not linked`);
              await destinations.first().hover();
              if ((await destinations.first().evaluate(element => getComputedStyle(element).transform)) === 'none') browserErrors.push(`${viewport.name} ${route}: operations destination hover treatment is missing`);
              await destinations.first().focus();
              if ((await destinations.first().evaluate(element => getComputedStyle(element).outlineStyle)) === 'none') browserErrors.push(`${viewport.name} ${route}: operations destination focus indicator is missing`);
            }
            await tabs.first().click();
            const portraitTriggers = page.locator('[data-member-portrait-trigger]');
            const portraits = page.locator('[data-member-portrait]');
            if (await portraitTriggers.count() !== 5) browserErrors.push(`${viewport.name} ${route}: expected five Board portrait triggers`);
            if (await portraits.count() !== 5) browserErrors.push(`${viewport.name} ${route}: expected five Board portrait bubbles`);
            const portraitImagesLoaded = await portraits.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0));
            if (!portraitImagesLoaded) browserErrors.push(`${viewport.name} ${route}: one or more Board portraits failed to load`);
            const boardPanelText = await page.locator('#civic-panel-board').innerText();
            for (const member of ['Tina Tyler-O\'Shea','Rick Williams','Ed Horrick','Susan Mahoney','Mary Ziady']) {
              if (!boardPanelText.includes(member)) browserErrors.push(`${viewport.name} ${route}: Board panel is missing ${member}`);
            }
            await portraitTriggers.first().click();
            if (await portraitTriggers.first().getAttribute('aria-expanded') !== 'true') browserErrors.push(`${viewport.name} ${route}: portrait trigger did not open on click`);
            await page.waitForTimeout(220);
            const openOpacity = Number.parseFloat(await portraits.first().evaluate(element => getComputedStyle(element).opacity));
            if (openOpacity < .98) browserErrors.push(`${viewport.name} ${route}: opened portrait bubble is not visible`);
            await page.keyboard.press('Escape');
            if (await portraitTriggers.first().getAttribute('aria-expanded') !== 'false') browserErrors.push(`${viewport.name} ${route}: Escape did not close the portrait bubble`);
            await portraitTriggers.first().focus();
            if ((await portraitTriggers.first().evaluate(element => getComputedStyle(element).outlineStyle)) === 'none') browserErrors.push(`${viewport.name} ${route}: portrait trigger focus indicator is missing`);
            const groupCaption = await page.locator('.split-feature figcaption').last().innerText();
            if (!groupCaption.includes('Left to right: Susan Mahoney, Mary Ziady, Tina Tyler-O\'Shea, Ed Horrick, and Rick Williams.')) browserErrors.push(`${viewport.name} ${route}: Board group photo lacks the left-to-right caption`);
            const groupPhotoFit = await page.locator('.board-group-photo img').last().evaluate(image => {
              const style = getComputedStyle(image);
              const bounds = image.getBoundingClientRect();
              return { objectFit: style.objectFit, ratio: bounds.width / bounds.height };
            });
            if (groupPhotoFit.objectFit !== 'contain' || Math.abs(groupPhotoFit.ratio - (1170 / 724)) > .08) browserErrors.push(`${viewport.name} ${route}: Board group photo crops members instead of preserving the full five-person image`);
          }
          if (route === '/parks/') {
            const parkChoices = await tabs.locator('strong').allTextContents();
            const parkNumbers = await tabs.locator(':scope > span').allTextContents();
            if (parkChoices[0]?.trim() !== 'Tee off among the trees' || parkNumbers.join(',') !== '01,02,03,04,05') browserErrors.push(`${viewport.name} ${route}: Tee off is not the first numbered park choice`);
            await page.locator('#parks-tab-trails').click();
            const trailWalk = page.locator('[data-trail-walk]');
            const trailHikers = trailWalk.locator('.trail-walk-hiker');
            const trailSign = trailWalk.locator('.trail-plank-sign');
            const trailSignLinks = trailSign.locator('a');
            if (await trailWalk.count() !== 1 || await trailHikers.count() !== 4) browserErrors.push(`${viewport.name} ${route}: trail walk does not contain right, left, right, and planted poses`);
            if (await page.locator('[data-trail-journey], [data-trail-scene], [data-trail-step], .trail-actions').count() !== 0) browserErrors.push(`${viewport.name} ${route}: removed Discover, Map, Prepare journey controls or redundant action cards remain`);
            const trailHikersLoaded = await trailHikers.evaluateAll(images => images.length === 4 && images.every(image => image.complete && image.naturalWidth > 800 && image.naturalHeight > 1200));
            if (!trailHikersLoaded) browserErrors.push(`${viewport.name} ${route}: one or more trail gait frames did not load at source quality`);
            const gaitSources = await trailHikers.evaluateAll(images => images.map(image => image.getAttribute('src')));
            if (gaitSources.join(',') !== ['trail-hiker-right-stick.png','trail-hiker-left-stick.png','trail-hiker-right-stick.png','trail-hiker-summit.png'].map(name => `../assets/images/${name}`).join(',')) browserErrors.push(`${viewport.name} ${route}: gait must carry the walking stick through all steps before planting`);
            if (await trailSignLinks.count() !== 3) browserErrors.push(`${viewport.name} ${route}: rustic trail sign does not contain all three useful links`);
            else {
              const signHrefs = await trailSignLinks.evaluateAll(links => links.map(link => link.getAttribute('href')));
              if (signHrefs[0] !== '../documents/brooktrails-hiking-trail-map-reader.pdf' || signHrefs[1] !== 'https://www.trailforks.com/region/brooktrails-greenbelt-26604/' || signHrefs[2] !== '../contact/?topic=trails') browserErrors.push(`${viewport.name} ${route}: sign links do not reach the district map, live navigation, and current conditions`);
              await trailSignLinks.first().focus();
              if ((await trailSignLinks.first().evaluate(element => getComputedStyle(element).outlineStyle)) === 'none') browserErrors.push(`${viewport.name} ${route}: trail sign link lacks a focus indicator`);
            }
            const signBuild = await trailSign.evaluate(element => ({ background:getComputedStyle(element).backgroundImage, leftLeg:getComputedStyle(element,'::before').width, rightLeg:getComputedStyle(element,'::after').width }));
            if (!signBuild.background.includes('repeating-linear-gradient') || Number.parseFloat(signBuild.leftLeg) < 14 || Number.parseFloat(signBuild.rightLeg) < 14) browserErrors.push(`${viewport.name} ${route}: trail sign does not read as a wood plank on two substantial log legs`);
            await page.waitForTimeout(140);
            const firstStep = Number.parseFloat(await trailWalk.locator('.trail-walk-right-one').evaluate(element => getComputedStyle(element).opacity));
            const activeTrailAnimations = await page.locator('#parks-panel-trails').evaluate(panel => panel.getAnimations({ subtree:true }).map(animation => animation.effect?.target?.className || ''));
            if (firstStep < .98 || activeTrailAnimations.length !== 4 || activeTrailAnimations.some(name => !String(name).includes('trail-walk-hiker'))) browserErrors.push(`${viewport.name} ${route}: the right-foot frame is not the only animated visual system in the trail card`);
            await page.waitForTimeout(1050);
            if (Number.parseFloat(await trailWalk.locator('.trail-walk-left').evaluate(element => getComputedStyle(element).opacity)) < .98) browserErrors.push(`${viewport.name} ${route}: left-foot gait frame did not follow the first right step`);
            await page.waitForTimeout(1050);
            if (Number.parseFloat(await trailWalk.locator('.trail-walk-right-two').evaluate(element => getComputedStyle(element).opacity)) < .98) browserErrors.push(`${viewport.name} ${route}: second right-foot gait frame did not follow the left step`);
            await page.waitForTimeout(1150);
            if (Number.parseFloat(await trailWalk.locator('.trail-walk-planted').evaluate(element => getComputedStyle(element).opacity)) < .98) browserErrors.push(`${viewport.name} ${route}: hiker did not finish with the walking stick planted toward the sign`);
            await page.evaluate(() => document.activeElement?.blur());
            if (viewport.name === 'mobile' && !liveBase) await trailWalk.locator('.trail-walk-stage').screenshot({ path:path.join(outputDir, 'parks-trail-walk-mobile.png') });
            await trailWalk.locator('[data-trail-walk-replay]').click();
            await page.waitForTimeout(120);
            if (Number.parseFloat(await trailWalk.locator('.trail-walk-right-one').evaluate(element => getComputedStyle(element).opacity)) < .98) browserErrors.push(`${viewport.name} ${route}: Replay the hike did not restart on the right foot`);
            await page.locator('#parks-tab-golf').click();
            if (await page.locator('a[href="../contact/?topic=trails"]').count() !== 2) browserErrors.push(`${viewport.name} ${route}: current conditions should appear once on the sign and once in greenbelt-care guidance`);
            if (await page.locator('a[href="../archive/#source-ordinance-63"]').count() !== 1) browserErrors.push(`${viewport.name} ${route}: Ordinance 63 does not deep-link to its retained source`);
            if (await page.locator('a[href="../documents/brooktrails-hiking-trail-map-reader.pdf"]').count() !== 1) browserErrors.push(`${viewport.name} ${route}: district trail map should appear once on the rustic sign`);
            if (await page.locator('a[href="https://www.trailforks.com/region/brooktrails-greenbelt-26604/"]').count() !== 1) browserErrors.push(`${viewport.name} ${route}: live navigation should appear once on the rustic sign`);
            const golfScene = page.locator('[data-golf-reveal]');
            const golfPhone = page.locator('.golf-phone');
            const golfPlayer = page.locator('.golf-player');
            const replayControls = page.locator('[data-golf-replay]');
            const replayButton = page.locator('button.button[data-golf-replay]');
            if (await golfScene.count() !== 1) browserErrors.push(`${viewport.name} ${route}: expected one animated golf scene`);
            if (await golfPhone.getAttribute('href') !== 'tel:+17074596761') browserErrors.push(`${viewport.name} ${route}: golf reveal is missing the course phone link`);
            if (await replayControls.count() !== 2) browserErrors.push(`${viewport.name} ${route}: golfer and replay button are not both replay controls`);
            if (await golfPlayer.evaluate(element => element.tagName) !== 'BUTTON' || await golfPlayer.getAttribute('type') !== 'button' || !(await golfPlayer.getAttribute('aria-label'))?.toLowerCase().includes('replay')) browserErrors.push(`${viewport.name} ${route}: golfer is not an accessible replay button`);
            const golferFrames = await golfPlayer.evaluate(async () => Promise.all(['address','backswing','impact','followthrough'].map(async frame => {
              const url = new URL(`../assets/images/golfer-swing-${frame}.png`, window.location.href).href;
              const image = new Image();
              const loaded = await new Promise(resolve => { image.onload = () => resolve(true); image.onerror = () => resolve(false); image.src = url; });
              return { frame, loaded, width:image.naturalWidth, height:image.naturalHeight };
            })));
            if (golferFrames.some(frame => !frame.loaded || frame.width !== 543 || frame.height !== 724)) browserErrors.push(`${viewport.name} ${route}: one or more isolated golfer frames are missing or incorrectly sized`);
            const focusDelay = await golfPlayer.evaluate(element => Number.parseFloat(getComputedStyle(element).animationDelay) || 0);
            if (focusDelay < .75 || focusDelay > .9) browserErrors.push(`${viewport.name} ${route}: golf address-position hold is not approximately 800ms (${focusDelay}s)`);
            await replayButton.click();
            await page.waitForTimeout(400);
            const focusHold = await golfScene.evaluate(element => ({
              playerImage:getComputedStyle(element.querySelector('.golf-player')).backgroundImage,
              phoneOpacity:Number.parseFloat(getComputedStyle(element.querySelector('.golf-phone')).opacity),
              ballLeft:element.querySelector('.golf-ball').getBoundingClientRect().left,
              playerLeft:element.querySelector('.golf-player').getBoundingClientRect().left,
              playerRight:element.querySelector('.golf-player').getBoundingClientRect().right,
              fairwayLeft:element.querySelector('.golf-fairway').getBoundingClientRect().left,
            }));
            if (!focusHold.playerImage.includes('golfer-swing-address.png') || focusHold.phoneOpacity > .05) browserErrors.push(`${viewport.name} ${route}: golf scene does not hold the address position before swinging`);
            const ballAcrossPlayer = (focusHold.ballLeft - focusHold.playerLeft) / (focusHold.playerRight - focusHold.playerLeft);
            if (ballAcrossPlayer < .72 || ballAcrossPlayer > .98 || focusHold.ballLeft < focusHold.fairwayLeft - 16) browserErrors.push(`${viewport.name} ${route}: golf ball is not aligned just beyond the clubhead on the fairway`);
            if (viewport.name === 'mobile' && !liveBase) await golfScene.screenshot({ path:path.join(outputDir, 'parks-golf-address-mobile.png') });
            await page.waitForTimeout(750);
            const backswingImage = await golfPlayer.evaluate(element => getComputedStyle(element).backgroundImage);
            if (!backswingImage.includes('golfer-swing-backswing.png')) browserErrors.push(`${viewport.name} ${route}: golfer animation has no distinct backswing frame (${backswingImage})`);
            if (viewport.name === 'mobile' && !liveBase) await golfScene.screenshot({ path:path.join(outputDir, 'parks-golf-backswing-mobile.png') });
            await page.waitForTimeout(1950);
            const revealOpacity = Number.parseFloat(await golfPhone.evaluate(element => getComputedStyle(element).opacity));
            if (revealOpacity < .98) browserErrors.push(`${viewport.name} ${route}: golf phone number did not reveal after the shot`);
            const followthroughImage = await golfPlayer.evaluate(element => getComputedStyle(element).backgroundImage);
            if (!followthroughImage.includes('golfer-swing-followthrough.png')) browserErrors.push(`${viewport.name} ${route}: golfer animation does not finish on the isolated follow-through frame`);
            await golfPlayer.click();
            await page.waitForTimeout(150);
            const replayReset = await golfScene.evaluate(element => ({
              playerImage:getComputedStyle(element.querySelector('.golf-player')).backgroundImage,
              phoneOpacity:Number.parseFloat(getComputedStyle(element.querySelector('.golf-phone')).opacity),
            }));
            if (!replayReset.playerImage.includes('golfer-swing-address.png') || replayReset.phoneOpacity > .05) browserErrors.push(`${viewport.name} ${route}: clicking the golfer did not restart from the address position`);
            await golfPlayer.focus();
            if ((await golfPlayer.evaluate(element => getComputedStyle(element).outlineStyle)) === 'none') browserErrors.push(`${viewport.name} ${route}: golfer replay control lacks a focus indicator`);
            await replayButton.focus();
            if ((await replayButton.evaluate(element => getComputedStyle(element).outlineStyle)) === 'none') browserErrors.push(`${viewport.name} ${route}: replay button lacks a focus indicator`);
          }
          if (viewport.name === 'compactLaptop') {
            const inspectionIndex = route === '/history/' ? 3 : route === '/parks/' ? 0 : count - 1;
            await tabs.nth(inspectionIndex).click();
            if (route === '/parks/') await page.waitForTimeout(3150);
            const storyStage = page.locator('.story-deck-stage');
            await storyStage.scrollIntoViewIfNeeded();
            const slug = route.split('/').filter(Boolean)[0];
            await storyStage.screenshot({ path:path.join(outputDir, `${slug}-compact-card.png`) });
          }
        }
      }
      if (route === '/resources/') {
        const centralSearch = page.locator('.library-primary-search');
        if (await centralSearch.count() !== 1) browserErrors.push(`${viewport.name} ${route}: central all-site search is missing`);
        if (await page.locator('.masthead [data-site-search]').count()) browserErrors.push(`${viewport.name} ${route}: duplicate header search remains on the library page`);
        await centralSearch.locator('[data-site-search-input]').fill('chlorine residual');
        await page.waitForTimeout(150);
        const fullTextResults = centralSearch.locator('[role="option"]');
        if (await fullTextResults.count() < 1) browserErrors.push(`${viewport.name} ${route}: full document text search returned no result`);
        const shelves = page.locator('[data-resource-category]');
        if (await shelves.count() < 5) browserErrors.push(`${viewport.name} ${route}: expected guided document shelves`);
        if (viewport.name === 'mobile') {
          await shelves.nth(2).click();
          await page.waitForTimeout(700);
          const reveal = await page.locator('.library-results').evaluate((node) => ({ top:node.getBoundingClientRect().top, active:document.activeElement?.hasAttribute('data-resource-heading') }));
          if (reveal.top < 0 || reveal.top > viewport.height * .45) browserErrors.push(`${viewport.name} ${route}: shelf selection did not reveal the document results (${reveal.top}px)`);
          if (!reveal.active) browserErrors.push(`${viewport.name} ${route}: shelf selection did not focus the updated result heading`);
        }
        await page.locator('[data-resource-search]').fill('water');
        const visibleDocuments = await page.locator('[data-resource-item]:visible').count();
        if (visibleDocuments < 1) browserErrors.push(`${viewport.name} ${route}: resource search returned no water records`);
      }
      if (route === '/water/') {
        const jumpHrefs = await page.locator('.water-jump a').evaluateAll(links => links.map(link => link.getAttribute('href')));
        if (JSON.stringify(jumpHrefs) !== JSON.stringify(['#billing','#system','#conservation','#sewer'])) browserErrors.push(`${viewport.name} ${route}: water page jump rail is incomplete`);
      }
      if (viewport.name === 'laptop' || ((route === '/' || route === '/services/' || route === '/resources/' || route === '/parks/' || route === '/government/' || route === '/history/' || route === '/contact/') && (viewport.name === 'desktop' || viewport.name === 'mobile'))) {
        await page.evaluate(async () => {
          const distance = Math.max(window.innerHeight * 0.72, 420);
          for (let position = 0; position < document.documentElement.scrollHeight; position += distance) {
            window.scrollTo({ top: position, behavior: 'instant' });
            await new Promise((resolve) => setTimeout(resolve, 35));
          }
          window.scrollTo({ top: 0, behavior: 'instant' });
          await new Promise((resolve) => setTimeout(resolve, 800));
        });
        const slug = route === '/' ? 'home' : route.split('/').filter(Boolean)[0];
        await page.screenshot({ path:path.join(outputDir, `${slug}-${viewport.name}.png`), fullPage:viewport.name !== 'laptop' });
      }
      await page.close();
    }
    await context.close();
  }

  const redirectContext = await browser.newContext({ viewport:viewports[0] });
  for (const route of separatedFireRoutes) {
    const page = await redirectContext.newPage();
    const response = await page.goto(`${base}${route}`, { waitUntil:'networkidle', timeout:30000 });
    const finalPath = new URL(page.url()).pathname;
    results.push({ route, viewport:'redirect', status:response?.status(), finalPath });
    if (response?.status() !== 200) browserErrors.push(`redirect ${route}: HTTP ${response?.status()}`);
    if (!finalPath.endsWith('/archive/')) browserErrors.push(`redirect ${route}: expected retained archive, reached ${finalPath}`);
    await page.close();
  }
  await redirectContext.close();

  const reducedContext = await browser.newContext({ viewport:{ width:390, height:844 }, reducedMotion:'reduce' });
  const reducedPage = await reducedContext.newPage();
  const reducedResponse = await reducedPage.goto(`${base}/parks/`, { waitUntil:'networkidle', timeout:30000 });
  await reducedPage.locator('#parks-tab-golf').click();
  const reducedGolf = await reducedPage.locator('[data-golf-reveal]').evaluate(element => ({
    animatable:element.classList.contains('is-animatable'),
    phoneOpacity:getComputedStyle(element.querySelector('.golf-phone')).opacity,
  }));
  results.push({ route:'/parks/', viewport:'reduced-motion', status:reducedResponse?.status(), ...reducedGolf });
  if (reducedGolf.animatable) browserErrors.push('reduced-motion /parks/: golf scene should not animate');
  if (Number.parseFloat(reducedGolf.phoneOpacity) < .98) browserErrors.push('reduced-motion /parks/: golf phone number should be immediately visible');
  await reducedPage.locator('#parks-tab-trails').click();
  const reducedTrail = await reducedPage.locator('[data-trail-walk]').evaluate(element => ({ walking:element.classList.contains('is-walking'), rightOpacity:getComputedStyle(element.querySelector('.trail-walk-right-one')).opacity, plantedOpacity:getComputedStyle(element.querySelector('.trail-walk-planted')).opacity, replay:getComputedStyle(element.querySelector('[data-trail-walk-replay]')).display, animations:element.getAnimations({ subtree:true }).length, links:element.querySelectorAll('.trail-plank-sign a').length }));
  if (reducedTrail.walking || Number.parseFloat(reducedTrail.rightOpacity) > .02 || Number.parseFloat(reducedTrail.plantedOpacity) < .98 || reducedTrail.replay !== 'none' || reducedTrail.animations !== 0 || reducedTrail.links !== 3) browserErrors.push('reduced-motion /parks/: planted hiker and all three sign links should be static and immediately available');
  await reducedPage.close();
  await reducedContext.close();

  const deepLinkContext = await browser.newContext({ viewport:{ width:1280, height:800 } });
  const deepLinkPage = await deepLinkContext.newPage();
  await deepLinkPage.goto(`${base}/government/#civic-panel-meeting`, { waitUntil:'networkidle', timeout:30000 });
  if (!await deepLinkPage.locator('#civic-panel-meeting').isVisible()) browserErrors.push('deep link /government/#civic-panel-meeting did not open the meeting panel');
  await deepLinkPage.goto(`${base}/archive/#source-ordinance-63`, { waitUntil:'networkidle', timeout:30000 });
  if (!await deepLinkPage.locator('#source-ordinance-63').evaluate(element => element.open)) browserErrors.push('deep link /archive/#source-ordinance-63 did not open the retained source');
  await deepLinkPage.goto(`${base}/archive/#source-the-essence-of-brooktrails`, { waitUntil:'networkidle', timeout:30000 });
  if (!await deepLinkPage.locator('#source-the-essence-of-brooktrails').evaluate(element => element.open)) browserErrors.push('deep link to the retained Brooktrails story did not open the source');
  await deepLinkPage.close();
  await deepLinkContext.close();
} finally {
  await browser.close();
  server?.close();
}

const report = { generatedAt:new Date().toISOString(), base, htmlFiles:htmlFiles.length, routesChecked:results.length, staticErrors, browserErrors, results };
await writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ htmlFiles:htmlFiles.length, browserChecks:results.length, staticErrors:staticErrors.length, browserErrors:browserErrors.length }, null, 2));
if (staticErrors.length || browserErrors.length) {
  console.error([...staticErrors, ...browserErrors].join('\n'));
  process.exitCode = 1;
}
