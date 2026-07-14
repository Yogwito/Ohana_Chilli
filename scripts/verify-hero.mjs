import { chromium } from 'playwright';

const OUT = process.env.OUT_DIR;
const browser = await chromium.launch();

async function runViewport(name, viewport) {
  const page = await browser.newPage({ viewport });
  const logs = [];
  page.on('console', (m) => m.type() === 'error' && logs.push(m.text()));

  await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: `${OUT}/pw-${name}-1-preloader.png` });

  // Wait for intro to complete (veil display:none)
  await page.waitForFunction(() => {
    const veil = [...document.querySelectorAll('div')].find(
      (d) => d.className.includes?.('z-20') && d.textContent.includes('%'),
    );
    return !veil || getComputedStyle(veil).display === 'none';
  }, { timeout: 30000 });
  await page.waitForTimeout(500);

  const afterIntro = await page.evaluate(() => {
    const v = document.querySelector('video');
    return { scrollY: window.scrollY, currentTime: v?.currentTime, duration: v?.duration };
  });
  await page.screenshot({ path: `${OUT}/pw-${name}-2-intro-done.png` });

  // Mid-hero scrub: absolute scroll to 50% of the scrollable hero range
  const mid = await page.evaluate(() => {
    const wrapper = document.querySelector('.hero-grain')?.parentElement;
    const scrollable = wrapper.getBoundingClientRect().height - innerHeight;
    scrollTo(0, scrollable * 0.55);
    return scrollable;
  });
  await page.waitForTimeout(700);
  const midScrub = await page.evaluate(() => {
    const v = document.querySelector('video');
    return { scrollY: window.scrollY, currentTime: v?.currentTime };
  });
  await page.screenshot({ path: `${OUT}/pw-${name}-3-mid-scrub.png` });

  // End of hero → full bowl
  await page.evaluate((s) => scrollTo(0, s + 10), mid);
  await page.waitForTimeout(700);
  const endScrub = await page.evaluate(() => document.querySelector('video')?.currentTime);

  // Menu + marquee
  await page.evaluate((s) => scrollTo(0, s + 700), mid);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/pw-${name}-4-menu.png` });

  // Bottom CTA
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/pw-${name}-5-cta.png` });

  console.log(JSON.stringify({ name, afterIntro, midScrub, endScrub, consoleErrors: logs.slice(0, 5) }));
  await page.close();
}

await runViewport('desktop', { width: 1440, height: 900 });
await runViewport('mobile', { width: 375, height: 812 });
await browser.close();
