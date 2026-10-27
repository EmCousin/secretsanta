import assert from 'node:assert/strict';
import { I18n } from '../apps/web/i18n/index.js';
import { Invitation } from '../packages/core/invitations.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:8000/';
const screenshotDir = process.env.SCREENSHOT_DIR || '/tmp/opencode';

async function checkTouchPicker(page, locale) {
  for (const [index, preference] of ['', 'en', 'fr', 'pt-BR'].entries()) {
    const select = page.locator('#language');
    const layout = await select.evaluate(element => {
      const box = element.getBoundingClientRect();
      return {
        height: box.height, width: box.width, right: box.right,
        fontSize: parseFloat(getComputedStyle(element).fontSize),
        labelWidth: element.labels[0].getBoundingClientRect().width,
        pickerWidth: element.parentElement.getBoundingClientRect().width,
        reachable: document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === element,
      };
    });
    assert.ok(layout.height >= 48 && layout.fontSize >= 16, 'Touch picker has readable text and a full-size hit area');
    assert.ok(layout.width >= layout.pickerWidth - layout.labelWidth - 12, 'Picker fills its mobile row instead of using a fixed width');
    assert.equal(layout.reachable, true, 'Decoration and neighbouring controls cannot intercept a tap');
    await select.tap();
    assert.equal(await select.evaluate(element => element.matches(':open')), true, 'A real touch gesture opens the native picker');
    await page.keyboard.press('Home');
    for (let i = 0; i < index; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    const expected = new I18n([locale], preference).locale;
    await page.waitForFunction(expected => document.documentElement.lang === expected, expected);
    assert.equal(await select.inputValue(), preference);
    assert.equal(await select.evaluate(element => element.matches(':open')), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  // Leave the page in its original automatic language for the remaining checks.
  await page.locator('#language').tap();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
}

try {
  for (const locale of ['en', 'fr', 'pt-BR']) {
    for (const width of [320, 375, 390, 768, 1440]) {
      const touch = width <= 390;
      const context = await browser.newContext({ locale, viewport: { width, height: width === 375 ? 667 : 1000 }, hasTouch: touch, isMobile: touch });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base);
        await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
        if (touch) await checkTouchPicker(page, locale);
        assert.equal(await page.locator('body').getAttribute('data-motion'), 'playing');
        const moving = await page.locator('.scene-layer, .scene-star, .snow-crystals span').evaluateAll(elements =>
          elements.every(element => element.getAnimations().some(animation => animation.playState === 'running')));
        assert.equal(moving, true, 'Sleigh, smoke, windows, star and snowflakes animate');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${locale}/${width}`);
        await page.locator('[data-festivity-target="toggle"]').click();
        assert.equal(await page.locator('body').getAttribute('data-motion'), 'paused');
        assert.equal(await page.locator('.snow-layer').first().evaluate(element => getComputedStyle(element).animationPlayState), 'paused');
        assert.equal(await page.locator('.ambient-motion').evaluateAll(elements =>
          elements.every(element => element.getAnimations().every(animation => animation.playState === 'paused'))), true, 'One control pauses every ambient effect');
        assert.equal(await page.locator('.scene-sleigh').evaluate(async element => {
          const animation = element.getAnimations()[0];
          await animation.ready;
          const before = animation.currentTime;
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return animation.currentTime === before;
        }), true, 'Paused animations stop advancing');
        await page.reload();
        await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
        assert.equal(await page.locator('body').getAttribute('data-motion'), 'paused', 'Explicit pause survives reload');
        if (locale === 'en' && (width === 375 || width === 390 || width === 1440)) {
          await page.screenshot({ path: `${screenshotDir}/secretsanta-christmas-${width}.png`, fullPage: true, animations: 'disabled' });
        }
        const invitation = new Invitation({ v: 1, giver: 'Alice', recipient: 'João', hint: 'Un beau livre', exchange: { name: 'Family Christmas', date: '2026-12-25', budget: '25 €', instructions: 'Bring your gift on Christmas Day.' } });
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
    assert.equal(await page.locator('.ambient-motion').evaluateAll(elements =>
      elements.every(element => getComputedStyle(element).animationName === 'none')), true);
    await page.locator('#language').selectOption('pt-BR');
    assert.equal(await page.locator('[data-festivity-target="toggle"]').textContent(), new I18n(['pt-BR']).t('design.motionReduced'));
    await page.locator('[data-field="name"]').nth(0).fill('Alice');
    await page.locator('[data-field="name"]').nth(1).fill('Bob');
    await page.locator('button[type="submit"]').click();
    assert.equal(await page.locator('.invitation-card').first().evaluate(element => getComputedStyle(element).animationName), 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => document.body.dataset.motion === 'playing');
    assert.equal(await page.locator('[data-festivity-target="toggle"]').isDisabled(), false);
    await page.locator('[data-festivity-target="toggle"]').click();
    assert.equal(await page.locator('.invitation-card').first().evaluate(element => getComputedStyle(element).animationName), 'none', 'Pausing never hides cards in their entrance animation');
    console.log('PASS system reduced motion disables all effects and stays translated');
  } finally { await context.close(); }
  console.log('16 design browser scenarios passed, including native-picker touch checks at 320/375/390px.');
} finally { await browser.close(); }
