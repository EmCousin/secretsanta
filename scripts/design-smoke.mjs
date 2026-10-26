import assert from 'node:assert/strict';
import { I18n } from '../apps/web/i18n/index.js';
import { Invitation } from '../packages/core/invitations.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:8000/';
const screenshotDir = process.env.SCREENSHOT_DIR || '/tmp/opencode';

try {
  for (const locale of ['en', 'fr', 'pt-BR']) {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({ locale, viewport: { width, height: 1000 } });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base);
        await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
        assert.equal(await page.locator('body').getAttribute('data-motion'), 'playing');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${locale}/${width}`);
        await page.locator('[data-festivity-target="toggle"]').click();
        assert.equal(await page.locator('body').getAttribute('data-motion'), 'paused');
        assert.equal(await page.locator('.snow-layer').first().evaluate(element => getComputedStyle(element).animationPlayState), 'paused');
        await page.reload();
        await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
        assert.equal(await page.locator('body').getAttribute('data-motion'), 'paused', 'Explicit pause survives reload');
        if (locale === 'en' && (width === 390 || width === 1440)) {
          await page.screenshot({ path: `${screenshotDir}/secretsanta-christmas-${width}.png`, fullPage: true, animations: 'disabled' });
        }
        const invitation = new Invitation({ v: 1, giver: 'Alice', recipient: 'João', hint: 'Un beau livre', exchange: { name: 'Christmas together', date: '2026-12-25', budget: '25 €', instructions: 'A little joy for everyone.' } });
        await page.goto(invitation.toUrl(base));
        await page.locator('[data-invitation-target="reveal"]:enabled').waitFor();
        await page.locator('[data-invitation-target="reveal"]').click();
        assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), 'João');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        if (locale === 'en' && width === 390) await page.screenshot({ path: `${screenshotDir}/secretsanta-christmas-reveal.png`, fullPage: true, animations: 'disabled' });
        assert.deepEqual(errors, []);
        console.log(`PASS ${locale}/${width}px Christmas layout, pause persistence, and reveal`);
      } finally { await context.close(); }
    }
  }

  const context = await browser.newContext({ reducedMotion: 'reduce', locale: 'fr', viewport: { width: 320, height: 740 } });
  try {
    const page = await context.newPage();
    await page.goto(base);
    await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
    assert.equal(await page.locator('body').getAttribute('data-motion'), 'paused');
    assert.equal(await page.locator('[data-festivity-target="toggle"]').isDisabled(), true);
    assert.equal(await page.locator('.snow-layer').first().evaluate(element => getComputedStyle(element).animationName), 'none');
    assert.equal(await page.locator('.garland span').first().evaluate(element => getComputedStyle(element).animationName), 'none');
    await page.locator('#language').selectOption('pt-BR');
    assert.equal(await page.locator('[data-festivity-target="toggle"]').textContent(), new I18n(['pt-BR']).t('design.motionReduced'));
    console.log('PASS system reduced motion disables all effects and stays translated');
  } finally { await context.close(); }
  console.log('13 design browser scenarios passed.');
} finally { await browser.close(); }
