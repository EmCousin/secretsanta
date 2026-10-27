import assert from 'node:assert/strict';
import { I18n } from '../apps/web/i18n/index.js';
import { Invitation } from '../packages/core/invitations.js';
import { chooseLanguage, openLanguageMenu } from './browser-helpers.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:8000/';
const screenshotDir = process.env.SCREENSHOT_DIR || '/tmp/opencode';

async function checkPickerAlignment(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('.language-icon')]
    .every(image => image.complete && image.naturalWidth > 0));
  const rows = await page.locator('#language-options label').evaluateAll(labels => labels.map(label => {
    const [radio, icon, text] = [label.querySelector('input'), label.querySelector('img'), label.querySelector('.language-name')]
      .map(element => element.getBoundingClientRect());
    return {
      radioX: radio.x, iconX: icon.x, textX: text.x,
      radioY: radio.y + radio.height / 2, iconY: icon.y + icon.height / 2, textY: text.y + text.height / 2,
    };
  }));
  for (const row of rows) {
    assert.ok(Math.abs(row.radioY - row.textY) <= 1 && Math.abs(row.iconY - row.textY) <= 1, 'Radio, flag, and label share a vertical centre, even with wrapped text');
    for (const column of ['radioX', 'iconX', 'textX']) assert.ok(Math.abs(row[column] - rows[0][column]) <= 1, 'Choice columns line up across rows');
  }
  assert.equal(await page.getByRole('radio', { name: 'English', exact: true }).count(), 1, 'Flags do not change accessible language names');
}

async function checkTouchPicker(page, locale, width) {
  for (const preference of ['', 'en', 'fr', 'pt-BR']) {
    const trigger = page.locator('#language');
    const layout = await trigger.evaluate(element => {
      const box = element.getBoundingClientRect();
      return {
        height: box.height, width: box.width,
        fontSize: parseFloat(getComputedStyle(element).fontSize),
        reachable: element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)),
      };
    });
    assert.ok(layout.height >= 48 && layout.fontSize >= 16, 'Touch picker has readable text and a full-size hit area');
    assert.ok(layout.width <= width / 2, 'The closed language control stays compact');
    assert.equal(layout.reachable, true, 'Decoration and neighbouring controls cannot intercept a tap');
    await openLanguageMenu(page, { touch: true });
    await page.waitForFunction(() => {
      const panel = document.querySelector('#language-options');
      const box = panel.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
    });
    const panel = page.locator('#language-options');
    assert.ok((await panel.boundingBox()).width > layout.width, 'Full language choices have room independently of the compact trigger');
    assert.equal(await panel.evaluate(element => element.scrollWidth <= element.clientWidth), true, 'The OPEN options panel has no horizontal overflow');
    await checkPickerAlignment(page);
    if (width === 375 && locale === 'fr' && preference === 'pt-BR') {
      await page.screenshot({ path: `${screenshotDir}/secretsanta-language-open-375.png`, fullPage: false });
    }
    await chooseLanguage(page, preference, { touch: true });
    const expected = new I18n([locale], preference).locale;
    await page.waitForFunction(expected => document.documentElement.lang === expected, expected);
    assert.equal(await trigger.locator('[data-i18n="language.short"]').textContent(), new I18n([locale], preference).t('language.short'));
    assert.equal(await page.locator(`[data-locale-target="option"][value="${preference}"]`).isChecked(), true);
    assert.equal(await page.locator('[data-locale-target="currentIcon"]').getAttribute('src'), `./apps/web/art/languages/${preference || 'auto'}.svg`, 'The closed picker shows the selected flag or Automatic globe');
    assert.equal(await page.locator('[data-locale-target="menu"]').evaluate(element => element.open), false);
    assert.equal(await trigger.evaluate(element => element === document.activeElement), true, 'Selection returns focus to the trigger');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  // Leave the page in its original automatic language for the remaining checks.
  await chooseLanguage(page, '', { touch: true });
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
        if (touch) await checkTouchPicker(page, locale, width);
        assert.equal(await page.locator('body').getAttribute('data-motion'), 'playing');
        const moving = await page.locator('.scene-layer, .scene-star, .snow-crystals span').evaluateAll(elements =>
          elements.every(element => element.getAnimations().some(animation => animation.playState === 'running')));
        assert.equal(moving, true, 'Sleigh, smoke, windows, star and snowflakes animate');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${locale}/${width}`);
        assert.equal(await page.locator('.motion-toggle, [data-festivity-target]').count(), 0, 'There is no in-app motion control');
        await page.reload();
        await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
        assert.equal(await page.locator('body').getAttribute('data-motion'), 'playing', 'Motion starts automatically after reload');
        if (locale === 'en' && (width === 375 || width === 390 || width === 1440)) {
          await page.screenshot({ path: `${screenshotDir}/secretsanta-christmas-${width}.png`, fullPage: true, animations: 'disabled' });
          if (width === 390) {
            await page.locator('[data-page-target="start"]').click();
            await page.locator('main').screenshot({ path: `${screenshotDir}/secretsanta-ux-entry.png`, animations: 'disabled' });
          }
        }
        const invitation = new Invitation({ v: 1, giver: 'Alice', recipient: 'João', hint: 'Un beau livre', exchange: { name: 'Family Christmas', date: '2026-12-25', budget: '25 €', instructions: 'Bring your gift on Christmas Day.' } });
        await page.goto(invitation.toUrl(base));
        await page.locator('[data-invitation-target="reveal"]:enabled').waitFor();
        assert.equal(await page.locator('.site-header').isVisible(), false, 'Invitation entry skips the organiser welcome');
        assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), '');
        if (locale === 'en' && width === 375) {
          const guest = await context.newPage();
          await guest.goto(invitation.toUrl(base));
          await guest.locator('[data-invitation-target="reveal"]:enabled').waitFor();
          await guest.screenshot({ path: `${screenshotDir}/secretsanta-ux-invitation.png`, fullPage: false, animations: 'disabled' });
          await guest.close();
        }
        await page.locator('[data-invitation-target="reveal"]').click();
        assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), 'João');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        if (locale === 'en' && width === 390) await page.screenshot({ path: `${screenshotDir}/secretsanta-christmas-reveal.png`, fullPage: true, animations: 'disabled' });
        assert.deepEqual(errors, []);
        console.log(`PASS ${locale}/${width}px Christmas layout, automatic motion, and reveal`);
      } finally { await context.close(); }
    }
  }

  const pickerContext = await browser.newContext({ locale: 'fr', viewport: { width: 375, height: 667 } });
  try {
    const page = await pickerContext.newPage();
    await page.goto(base);
    await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
    const trigger = page.locator('#language');
    const menu = page.locator('[data-locale-target="menu"]');
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('[data-locale-target="option"]:checked').evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(await menu.evaluate(element => element.open), true, 'Native radio arrows do not close the choices');
    await page.keyboard.press('Enter');
    assert.equal(await menu.evaluate(element => element.open), false);
    assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('Space');
    await page.locator('#language-options').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    assert.equal(await menu.evaluate(element => element.open), false);
    await openLanguageMenu(page);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    assert.equal(await menu.evaluate(element => element.open), false, 'Tabbing out closes the menu without trapping focus');
    await openLanguageMenu(page);
    await page.locator('.wordmark').click();
    assert.equal(await menu.evaluate(element => element.open), false, 'Outside taps close the menu');

    for (const [width, height, fontSize] of [[667, 375, 16], [375, 280, 16], [320, 667, 32], [1440, 900, 16]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, fontSize);
      await openLanguageMenu(page);
      await page.waitForFunction(() => {
        const box = document.querySelector('#language-options').getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
      });
      assert.equal(await page.locator('#language-options').evaluate(element => element.scrollWidth <= element.clientWidth), true);
      await checkPickerAlignment(page);
      await chooseLanguage(page, 'pt-BR');
      assert.equal(await page.locator('html').getAttribute('lang'), 'pt-BR', 'Last option stays reachable in a constrained panel');
    }
    console.log('PASS language picker keyboard, outside dismissal, landscape, short screen, and enlarged text');
  } finally { await pickerContext.close(); }

  const storageContext = await browser.newContext();
  try {
    await storageContext.addInitScript(() => {
      Storage.prototype.setItem.call(localStorage, 'secretsanta.motion', 'paused');
      Storage.prototype.setItem.call(localStorage, 'unrelated', 'keep');
      window.motionStorageCalls = [];
      for (const method of ['getItem', 'setItem', 'removeItem']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (key, ...args) {
          if (key === 'secretsanta.motion') window.motionStorageCalls.push(method);
          return original.call(this, key, ...args);
        };
      }
    });
    const page = await storageContext.newPage();
    await page.goto(base);
    await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
    assert.equal(await page.locator('body').getAttribute('data-motion'), 'playing', 'Legacy motion preferences are ignored');
    await chooseLanguage(page, 'fr');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.body.dataset.motion === 'paused');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => document.body.dataset.motion === 'playing');
    assert.deepEqual(await page.evaluate(() => window.motionStorageCalls), [], 'Motion never reads, writes, or deletes localStorage');
    assert.equal(await page.evaluate(() => localStorage.getItem('unrelated')), 'keep');
    await page.reload();
    await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
    assert.equal(await page.locator('body').getAttribute('data-motion'), 'playing');
    assert.deepEqual(await page.evaluate(() => window.motionStorageCalls), []);
    console.log('PASS legacy motion settings are ignored without accessing storage');
  } finally { await storageContext.close(); }

  const context = await browser.newContext({ reducedMotion: 'reduce', locale: 'fr', viewport: { width: 320, height: 740 } });
  try {
    const page = await context.newPage();
    await page.goto(base);
    await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
    assert.equal(await page.locator('body').getAttribute('data-motion'), 'paused');
    assert.equal(await page.locator('.snow-layer').first().evaluate(element => getComputedStyle(element).animationName), 'none');
    assert.equal(await page.locator('.garland span').first().evaluate(element => getComputedStyle(element).animationName), 'none');
    assert.equal(await page.locator('.ambient-motion').evaluateAll(elements =>
      elements.every(element => getComputedStyle(element).animationName === 'none')), true);
    await chooseLanguage(page, 'pt-BR');
    assert.equal(await page.locator('body').getAttribute('data-motion'), 'paused', 'Changing languages does not change the system motion setting');
    await page.locator('[data-field="name"]').nth(0).fill('Alice');
    await page.locator('[data-field="name"]').nth(1).fill('Bob');
    await page.locator('button[type="submit"]').click();
    assert.equal(await page.locator('.invitation-card').first().evaluate(element => getComputedStyle(element).animationName), 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => document.body.dataset.motion === 'playing');
    await page.waitForFunction(() => [...document.querySelectorAll('.ambient-motion')].every(element =>
      element.getAnimations().some(animation => animation.playState === 'running')));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.body.dataset.motion === 'paused');
    assert.equal(await page.locator('.invitation-card').first().evaluate(element =>
      getComputedStyle(element).animationName === 'none' && getComputedStyle(element).opacity === '1'), true, 'Live reduced-motion changes never leave cards hidden');
    console.log('PASS system reduced motion disables all effects and follows live changes');
  } finally { await context.close(); }
  console.log('18 design browser scenarios passed, including automatic/system motion and OPEN panel bounds at 320/375/390px.');
} finally { await browser.close(); }
