const {chromium}=require('playwright');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
  for(const [width,height] of [[390,844],[1080,583],[1440,1000]]){
    const page=await browser.newPage({viewport:{width,height}});
    const response=await page.goto(process.env.SITE_BASE?`${process.env.SITE_BASE}/parks/#parks-panel-gather`:`file:///${process.cwd().replaceAll('\\','/')}/parks/index.html#parks-panel-gather`);
    for(const venue of ['center','grove']){
      await page.locator(`[data-gather-choice="${venue}"]`).click();
      await page.waitForTimeout(850);
      await page.keyboard.press('Tab');
      await page.locator(`[data-gather-choice="${venue}"]`).focus();
      if(await page.locator(`[data-gather-choice="${venue}"]`).evaluate(element=>getComputedStyle(element).outlineStyle)==='none')throw new Error('Keyboard focus is missing');
      const panel=page.locator('#parks-panel-gather');
      await panel.screenshot({path:path.join('evidence',process.env.SITE_BASE?'test-output-live':'test-output',`gather-${width}-${venue}.png`)});
      console.log(JSON.stringify({width,venue,status:response?.status(),visibleTickets:await page.locator('[data-gather-detail]:visible').count(),height:(await panel.boundingBox()).height,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}));
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    const transitions=await page.locator('.gather-door,.gather-lights').evaluateAll(elements=>elements.map(element=>getComputedStyle(element).transitionDuration));
    if(transitions.some(value=>value!=='0s'))throw new Error('Reduced-motion gathering transitions remain');
    await page.goto(process.env.SITE_BASE?`${process.env.SITE_BASE}/contact/?topic=parks`:`file:///${process.cwd().replaceAll('\\','/')}/contact/index.html?topic=parks`);
    if(!await page.locator('[data-contact-topic]').innerText().then(text=>text.includes('guest count')))throw new Error('Gathering staff handoff loses its context');
    await page.close();
  }
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
