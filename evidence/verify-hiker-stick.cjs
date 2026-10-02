const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
  for (const width of [390,1080,1440]) {
    const page = await browser.newPage({viewport:{width,height:width===1080?583:844}});
    await page.goto(process.env.SITE_BASE ? `${process.env.SITE_BASE}/parks/` : `file:///${process.cwd().replaceAll('\\','/')}/parks/index.html`);
    await page.locator('#parks-tab-trails').click();
    for (const [index,time] of [0,1500,2600,3800].entries()) {
      await page.locator('[data-trail-walk]').evaluate((element,time) => {for (const animation of element.getAnimations({subtree:true})) {animation.pause();animation.currentTime=time;}},time);
      await page.locator('.trail-walk-stage').screenshot({path:path.join('evidence',process.env.SITE_BASE?'test-output-live':'test-output',`hiker-stick-${width}-${index+1}.png`)});
    }
    console.log(JSON.stringify({width,sources:await page.locator('.trail-walk-hiker').evaluateAll(images=>images.map(image=>({src:image.getAttribute('src'),loaded:image.complete&&image.naturalWidth>0}))),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}));
    await page.close();
  }
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
