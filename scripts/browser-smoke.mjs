// Optional browser checks. Playwright is installed outside the repository.
// See docs/testing.md. These are separate from the dependency-free Node suite.
import assert from 'node:assert/strict';
import { Invitation } from '../packages/core/invitations.js';
import { I18n } from '../apps/web/i18n/index.js';
import { chooseLanguage, openPanel, openStorage } from './browser-helpers.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:8000/';
let checks = 0;

async function check(name, run, options = {}, expectUninitialised = false) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (new URL(request.url()).origin !== new URL(base).origin) external.push(request.url()); });
  try {
    await run(page, context);
    assert.equal(await page.locator('#startup').isVisible(), expectUninitialised, 'Initialization state is visible and correct');
    assert.deepEqual(errors, [], 'No runtime errors');
    assert.deepEqual(external, [], 'No external requests');
    console.log(`PASS ${name}`);
    checks++;
  } finally { await context.close(); }
}

async function open(page) {
  await page.goto(base);
  await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
  await page.evaluate(() => document.fonts.ready.then(() => null));
}

async function fillPeople(page, names = ['Alice', 'Bob', 'Charlie']) {
  for (let index = 0; index < names.length; index++) {
    if (index > 1) await page.getByRole('button', { name: 'Add another person' }).click();
    await page.locator('[data-field="name"]').nth(index).fill(names[index]);
  }
}

async function drawNames(page) {
  await page.getByRole('button', { name: 'Match everyone', exact: true }).click();
  await page.locator('[data-exchange-target="results"]:visible').waitFor();
  await openPanel(page, 'links');
}

try {
  for (const locale of ['en', 'fr', 'pt-BR']) {
    await check(`${locale} simple start, compact names, and direct invitation entrance`, async page => {
      await open(page);
      const start = page.locator('[data-page-target="start"]');
      assert.equal(await start.isDisabled(), false);
      assert.equal(await start.textContent(), new I18n([locale]).t('hero.start'));
      assert.equal(await start.evaluate(element => {
        const box = element.getBoundingClientRect();
        return box.top >= 0 && box.bottom <= innerHeight;
      }), true, 'Start is visible on the first mobile screen');
      assert.equal(await page.locator('#exchange-name, #budget, #date').count(), 0, 'Exchange name, budget and date are not requested');
      assert.equal(await page.locator('.storage-panel').isVisible(), false, 'Saving is tucked into Links to share');
      const originalUrl = page.url();
      await start.click();
      assert.equal(page.url(), originalUrl, 'Start does not replace fragments or navigate');
      const names = page.locator('[data-field="name"]');
      assert.equal(await names.first().evaluate(element => element === document.activeElement), true);
      assert.equal(await names.first().evaluate(element => {
        const box = element.getBoundingClientRect();
        return box.top >= 0 && box.bottom <= innerHeight;
      }), true, 'CTA brings the actual input into the visible viewport');
      assert.equal(await page.locator('.person-row').first().evaluate(element => element.getBoundingClientRect().height < 120), true, 'Name rows are compact');
      await names.first().fill('Alice');
      await names.first().press('Enter');
      assert.equal(await names.count(), 2);
      assert.equal(await names.nth(1).evaluate(element => element === document.activeElement), true);
      await names.nth(1).press('Enter');
      assert.equal(await names.count(), 2, 'Empty Enter does not add rows or draw');
      await names.nth(1).fill('Bruno');
      await names.nth(1).dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
      assert.equal(await names.count(), 2, 'IME confirmation does not add a row');
      await names.nth(1).press('Enter');
      assert.equal(await names.count(), 3);
      await names.nth(2).fill('Charlie');
      await page.locator('[data-remove]').nth(1).click();
      assert.equal(await names.nth(1).inputValue(), 'Charlie');
      assert.equal(await names.nth(1).evaluate(element => element === document.activeElement), true, 'Removal focuses the neighbouring name');
      await page.locator('.hint-details summary').first().click();
      await page.locator('[data-field="hint"]').first().fill('Books');
      await page.locator('[data-field="hint"]').first().press('Enter');
      assert.equal(await names.count(), 2, 'Enter in hints remains a newline');
      assert.equal(await page.locator('[data-exchange-target="results"]').isVisible(), false);
      await names.last().press('Enter');
      assert.equal(await names.count(), 3, 'Enter leaves a new row ready for the next name');
      await page.locator('button[type="submit"]').click();
      assert.equal(await names.count(), 2, 'Draw ignores an unused trailing row');
      const links = await page.locator('[data-share-target="link"]').evaluateAll(elements => elements.map(element => element.value));
      assert.equal(links.length, 2);
      await openPanel(page, 'links');
      assert.equal(await page.locator('[data-exchange-target="participantsPanel"]').evaluate(element => element.open), false);
      await start.click();
      assert.deepEqual(await page.locator('[data-share-target="link"]').evaluateAll(elements => elements.map(element => element.value)), links, 'Start does not reset an existing draw');
      assert.equal(await page.locator('#results-title').evaluate(element => element === document.activeElement), true);
      assert.equal(await page.evaluate(() => localStorage.getItem('secretsanta.saved.v1')), null);

      await page.goto(links[0]);
      await page.locator('[data-invitation-target="reveal"]:enabled').waitFor();
      assert.equal(await page.locator('.site-header').isVisible(), false, 'Guests skip the organiser hero');
      assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), '');
      const reveal = page.locator('[data-invitation-target="reveal"]');
      assert.equal(await reveal.evaluate(element => {
        const box = element.getBoundingClientRect();
        return box.top >= 0 && box.bottom <= innerHeight;
      }), true, 'Reveal is visible on the first mobile screen');
      const invitationUrl = page.url();
      await chooseLanguage(page, locale === 'en' ? 'fr' : 'en');
      assert.equal(page.url(), invitationUrl);
      assert.equal(await page.locator('.site-header').isVisible(), false);
      await reveal.click();
      assert.equal(await page.locator('[data-invitation-target="details"]').isVisible(), true);
      await page.reload();
      await page.locator('[data-invitation-target="reveal"]:enabled').waitFor();
      assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), '', 'Reload requires an explicit reveal again');
      await page.evaluate(() => { location.hash = ''; });
      await page.locator('.site-header').waitFor({ state: 'visible' });
      assert.equal(await page.locator('[data-invitation-target="details"]').isVisible(), false);
      assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), '', 'Leaving the invitation clears revealed text');
    }, { locale, viewport: { width: 375, height: 667 } });
  }

  for (const locale of ['en', 'fr', 'pt-BR']) {
    for (const [width, height] of [[1366, 768], [1440, 900]]) {
      await check(`${locale}/${width} desktop workspace fits without page scrolling`, async page => {
        await open(page);
        await page.waitForFunction(preparing => document.querySelector('[data-pwa-target="status"]').textContent !== preparing,
          new I18n([locale]).t('pwa.preparing'));
        await page.locator('.people').evaluate(async element => {
          await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => null)));
        });
        assert.equal(await page.locator('main').evaluate(element => {
          const welcome = document.querySelector('.site-header').getBoundingClientRect();
          const workspace = element.getBoundingClientRect();
          return workspace.left > welcome.right && workspace.top < welcome.bottom;
        }), true, 'Welcome and workspace sit side by side');
        assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, 'Default desktop page fits its viewport');
        assert.equal(await page.locator('main').evaluate(element => element.scrollHeight <= element.clientHeight + 1), true, 'The workspace itself does not overflow');
        assert.equal(await page.locator('button[type="submit"]').evaluate(element => element.getBoundingClientRect().bottom <= innerHeight), true);
        const positions = () => page.locator('.site-header, main').evaluateAll(elements => elements.map(element => {
          const box = element.getBoundingClientRect();
          return { top: box.top + scrollY, left: box.left + scrollX };
        }));
        const before = await positions();
        if (locale === 'en' && width === 1366) await page.screenshot({ path: '/tmp/opencode/secretsanta-workspace-1366.png', fullPage: false, animations: 'disabled' });
        for (const hint of await page.locator('.hint-details summary').all()) {
          await hint.click();
          const after = await positions();
          for (let index = 0; index < before.length; index++) {
            assert.ok(Math.abs(after[index].top - before[index].top) <= 1, 'Opening hints does not vertically recenter either column');
            assert.ok(Math.abs(after[index].left - before[index].left) <= 1, 'Scrollbar appearance does not shift the columns sideways');
          }
          const row = hint.locator('..').locator('..');
          assert.equal(await row.evaluate(element => getComputedStyle(element).backgroundColor !== 'rgba(0, 0, 0, 0)'), true, 'Expanded hints are visually grouped with their participant');
          assert.equal(await page.locator('[data-field="name"]').evaluateAll(elements => {
            const left = elements[0].getBoundingClientRect().left;
            return elements.every(element => Math.abs(element.getBoundingClientRect().left - left) <= 1);
          }), true, 'Expanded and collapsed participant inputs stay aligned');
          assert.equal(await row.evaluate(element => {
            const next = element.nextElementSibling;
            if (!next) return true;
            const hint = element.querySelector('[data-field="hint"]').getBoundingClientRect();
            const name = next.querySelector('[data-field="name"]').getBoundingClientRect();
            return name.top - hint.bottom >= 24;
          }), true, 'Expanded hint has breathing room before the next participant name');
        }
        if (locale === 'en' && width === 1366) await page.screenshot({ path: '/tmp/opencode/secretsanta-workspace-expanded.png', fullPage: true, animations: 'disabled' });
        for (const hint of await page.locator('.hint-details summary').all()) await hint.click();
        const names = page.locator('[data-field="name"]');
        await names.nth(0).fill('Alice');
        await names.nth(1).fill('Bruno');
        for (let index = 2; index < 8; index++) {
          await page.locator('[data-exchange-target="addButton"]').click();
          await names.nth(index).fill(`Person ${index + 1}`);
        }
        assert.equal(await page.locator('.people').evaluate(element => getComputedStyle(element).maxHeight === 'none' && getComputedStyle(element).overflowY === 'visible'), true, 'Large groups grow naturally, without a capped name list');
        await page.locator('[data-page-target="start"]').click();
        assert.equal(await names.first().evaluate(element => element === document.activeElement), true);
        assert.equal(await page.locator('#participants-body').evaluate(element => element.scrollTop), 0, 'CTA scrolls the active section back to its first input');
        assert.equal(await names.first().evaluate(element => {
          const box = element.getBoundingClientRect();
          const list = element.closest('.people').getBoundingClientRect();
          return box.top >= list.top && box.bottom <= list.bottom && box.top >= 0 && box.bottom <= innerHeight;
        }), true);
        assert.equal(await names.first().evaluate(element => getComputedStyle(element).outlineOffset), '0px', 'Focused input has one close-fitting ring');
        assert.equal(await page.locator('.person-row').first().evaluate(element => getComputedStyle(element).borderTopStyle), 'none', 'No competing focus border surrounds the row');
        await page.locator('.hint-details summary').first().click();
        assert.equal(await page.locator('.people').evaluate(element => getComputedStyle(element).maxHeight === 'none' && getComputedStyle(element).overflowY === 'visible'), true, 'Expanded hints never get clipped inside a capped list');
        assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, 'Expanded hints scroll only inside the Participants section');
        await page.locator('[data-field="hint"]').first().fill('A warm scarf');
        await page.locator('button[type="submit"]').click();
        await page.locator('[data-exchange-target="results"]:visible').waitFor();
        await openPanel(page, 'links');
        assert.equal(await page.locator('[data-share-target="link"]').count(), 8);
        assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, 'Long results scroll only inside Links to share');
        await openStorage(page);
        await page.locator('[data-action="exchange#save"]').click();
        assert.equal(await page.locator('[data-exchange-target="status"]').isVisible(), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      }, { locale, viewport: { width, height } });
    }
  }

  await check('accordion switches rapidly and supports keyboard navigation', async page => {
    await open(page);
    const participants = page.locator('#participants-title');
    const settings = page.locator('#settings-title');
    const links = page.locator('#links-title');
    await participants.focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('#rules-title').evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('End');
    assert.equal(await links.evaluate(element => element === document.activeElement), true);
    await page.evaluate(() => {
      document.querySelector('#settings-title').click();
      document.querySelector('#links-title').click();
      document.querySelector('#participants-title').click();
    });
    await openPanel(page, 'participants');
    assert.equal(await page.locator('.workflow-panel[open]').count(), 1);
    assert.equal(await participants.getAttribute('aria-expanded'), 'true');
    assert.equal(await links.getAttribute('aria-expanded'), 'false');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openPanel(page, 'settings');
    assert.equal(await page.locator('.workflow-body').evaluateAll(elements => elements.every(element => element.getAnimations().length === 0)), true);
  }, { viewport: { width: 1366, height: 768 } });

  await check('section movement uses a short CSS transition', async page => {
    await open(page);
    await page.locator('#settings-title').click();
    const transition = await page.locator('#settings-body').evaluate(element => ({
      duration: getComputedStyle(element).transitionDuration,
      animations: element.getAnimations().map(animation => animation.transitionProperty),
    }));
    assert.equal(transition.duration, '0.12s');
    assert.ok(transition.animations.includes('height'));
    await openPanel(page, 'settings');
    assert.equal(await page.locator('#settings-body').evaluate(element => element.style.overflow), '', 'Scrolling is restored after the transition');
  }, { viewport: { width: 1366, height: 768 }, reducedMotion: 'no-preference' });

  await check('mobile accordion settles after interrupted transitions and motion preference changes', async page => {
    await open(page);
    await page.locator('#settings-title').click();
    assert.equal(await page.locator('#settings-body').evaluate(element => element.getAnimations().length), 0, 'Mobile section switches are instant');
    assert.equal(await page.locator('.snow-layer').first().evaluate(element => getComputedStyle(element).animationName), 'snowfall', 'Snow continues while section transitions are disabled');
    assert.equal(await page.locator('.scene-sleigh').evaluate(element => getComputedStyle(element).animationName), 'sleigh-drift', 'Santa continues while section transitions are disabled');
    await page.evaluate(() => {
      document.querySelector('#settings-title').click();
      document.querySelector('#rules-title').click();
      document.querySelector('#participants-title').click();
    });
    await openPanel(page, 'participants');
    assert.equal(await page.locator('.workflow-panel[open]').count(), 1);
    assert.equal(await page.locator('#participants-body').evaluate(element => getComputedStyle(element).overflowY), 'visible');
    await page.locator('#settings-title').click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openPanel(page, 'settings');
    assert.equal(await page.locator('.workflow-panel[open]').count(), 1);
    assert.equal(await page.locator('.workflow-body').evaluateAll(elements => elements.every(element => !element.getAnimations().length && !element.classList.contains('is-transitioning'))), true);
  }, { viewport: { width: 390, height: 667 }, reducedMotion: 'no-preference' });

  await check('mobile swipes over the beige workspace scroll the page', async page => {
    await open(page);
    for (let index = 2; index < 10; index++) await page.locator('[data-exchange-target="addButton"]').click();
    const body = page.locator('#participants-body');
    assert.equal(await body.evaluate(element => getComputedStyle(element).overflowY), 'visible');
    await page.evaluate(() => window.scrollTo(0, document.querySelector('main').offsetTop));
    const before = await page.evaluate(() => window.scrollY);
    const box = await body.boundingBox();
    const x = box.x + box.width - 12;
    const y = Math.min(570, Math.max(300, box.y + 180));
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let offset = 30; offset <= 210; offset += 30) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - offset }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(start => window.scrollY > start + 20, before);
    assert.equal(await body.evaluate(element => element.scrollTop), 0, 'Mobile has no nested participant scroller');
    await session.detach();
  }, { viewport: { width: 390, height: 667 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });

  await check('desktop panel scrolling chains to the page at its edge', async page => {
    await open(page);
    for (let index = 2; index < 10; index++) await page.locator('[data-exchange-target="addButton"]').click();
    const body = page.locator('#participants-body');
    assert.equal(await body.evaluate(element => getComputedStyle(element).overscrollBehaviorY), 'auto');
    await page.evaluate(() => {
      document.body.style.minHeight = '180vh';
      const panel = document.querySelector('#participants-body');
      panel.scrollTop = panel.scrollHeight;
      window.scrollTo(0, 0);
    });
    const box = await body.boundingBox();
    await page.mouse.move(box.x + 25, box.y + 30);
    await page.mouse.wheel(0, 450);
    await page.waitForTimeout(150);
    await page.mouse.wheel(0, 450);
    await page.waitForFunction(() => window.scrollY > 0);
  }, { viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });

  await check('CTA explicitly scrolls off-screen inputs on short mobile screens', async page => {
    await open(page);
    const first = page.locator('[data-field="name"]').first();
    assert.ok(await first.evaluate(element => element.getBoundingClientRect().bottom) > 400);
    const original = page.url();
    await page.locator('[data-page-target="start"]').click();
    assert.equal(await first.evaluate(element => element === document.activeElement), true);
    assert.equal(await first.evaluate(element => {
      const box = element.getBoundingClientRect();
      return box.top >= 0 && box.bottom <= innerHeight;
    }), true);
    assert.ok(await page.evaluate(() => scrollY) > 0);
    assert.equal(page.url(), original);
    await first.fill('Keep my name');
    await chooseLanguage(page, 'fr');
    assert.equal(await first.inputValue(), 'Keep my name');
  }, { viewport: { width: 375, height: 400 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });

  await check('name entry handles limits, empty lists, and collapsed-field validation', async page => {
    await open(page);
    for (let index = 0; index < 2; index++) await page.locator('[data-remove]').first().click();
    assert.equal(await page.locator('[data-field="name"]').count(), 0);
    assert.equal(await page.locator('[data-exchange-target="addButton"]').evaluate(element => element === document.activeElement), true);
    await page.locator('[data-page-target="start"]').click();
    assert.equal(await page.locator('[data-exchange-target="addButton"]').evaluate(element => element === document.activeElement), true);
    await page.reload();
    await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
    for (let index = 2; index < 50; index++) await page.locator('[data-exchange-target="addButton"]').click();
    const names = page.locator('[data-field="name"]');
    await names.last().fill('Last person');
    await names.last().press('Enter');
    assert.equal(await names.count(), 50);
    assert.equal(await page.locator('[data-exchange-target="error"]').isVisible(), true);
    assert.equal(await page.locator('[data-exchange-target="results"]').isVisible(), false);
    await page.reload();
    await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
    await fillPeople(page, ['Alice', 'Bruno']);
    await page.locator('[data-exchange-target="addButton"]').click();
    await page.locator('.hint-details summary').last().click();
    await page.locator('[data-field="hint"]').last().fill('Keep this hint');
    await page.locator('button[type="submit"]').click();
    assert.equal(await names.count(), 3, 'An unnamed person with a hint is never discarded');
    assert.equal(await page.locator('[data-field="hint"]').last().inputValue(), 'Keep this hint');
    assert.equal(await page.locator('[data-exchange-target="results"]').isVisible(), false);
    await page.locator('[data-field="hint"]').last().fill('');
    await openPanel(page, 'rules');
    await page.locator('#excluded-giver').selectOption({ index: 3 });
    await page.locator('#excluded-recipient').selectOption({ index: 1 });
    await page.locator('[data-action="exchange#addRule"]').click();
    await page.locator('button[type="submit"]').click();
    assert.equal(await names.count(), 3, 'An unnamed person referenced by an exclusion is never discarded');
    assert.equal(await page.locator('.rules li').count(), 1);
  });

  await check('mobile draw, private reveal, save/restore/delete, redraw confirmation', async page => {
    await open(page);
    await fillPeople(page);
    await openPanel(page, 'settings');
    await drawNames(page);
    assert.equal(await page.locator('[data-share-target="link"]').count(), 3);
    assert.equal(await page.evaluate(() => localStorage.length), 0, 'No automatic saving');
    const invitation = await page.locator('[data-share-target="link"]').first().inputValue();
    await openStorage(page);
    await page.getByRole('button', { name: 'Save on this device', exact: true }).click();
    await page.reload();
    await openStorage(page);
    await page.getByRole('button', { name: 'Restore saved copy' }).click();
    assert.equal(await page.locator('[data-share-target="link"]').first().inputValue(), invitation);
    await page.evaluate(() => localStorage.setItem('unrelated', 'keep'));
    await page.getByRole('button', { name: 'Delete saved copy' }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('unrelated')), 'keep');
    assert.equal(await page.evaluate(() => localStorage.getItem('secretsanta.saved.v1')), null);
    await page.getByRole('button', { name: 'Edit and draw again' }).click();
    await page.getByRole('button', { name: 'Keep this draw' }).click();
    assert.equal(await page.locator('[data-share-target="link"]').count(), 3);
    await page.getByRole('button', { name: 'Edit and draw again' }).click();
    await page.getByRole('button', { name: 'Edit this exchange', exact: true }).click();
    await page.locator('[data-exchange-target="form"]:visible').waitFor();
    await page.goto(invitation);
    await page.getByRole('button', { name: 'See who I got' }).waitFor();
    await page.keyboard.press('Tab');
    await page.getByRole('link', { name: 'Skip to the exchange' }).focus();
    await page.keyboard.press('Enter');
    assert.equal(page.url(), invitation, 'Skip navigation preserves the invitation fragment');
    assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), '', 'Recipient absent before reveal');
    await page.getByRole('button', { name: 'See who I got' }).click();
    assert.ok(['Bob', 'Charlie'].includes(await page.locator('[data-invitation-target="recipient"]').textContent()));
    assert.equal(await page.title(), 'Secret Santa');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow');
  }, { viewport: { width: 320, height: 740 } });

  await check('exclusions and impossible constraints have useful errors', async page => {
    await open(page);
    await fillPeople(page, ['Alice', 'Bob']);
    await openPanel(page, 'rules');
    await page.getByLabel('This person', { exact: true }).selectOption({ label: 'Alice' });
    await page.getByLabel('The other person', { exact: true }).selectOption({ label: 'Bob' });
    await page.getByRole('button', { name: 'Add rule', exact: true }).click();
    await page.locator('[data-exchange-target="error"]:visible').waitFor();
    assert.match(await page.locator('[data-exchange-target="error"]').textContent(), /no possible draw/);
    assert.equal(await page.locator('.rules li').count(), 0);
    await drawNames(page);
  });

  await check('forced rules reject conflicts and survive saving and drawing', async page => {
    await open(page);
    await fillPeople(page, ['Alice', 'Bob', 'Charlie']);
    await openPanel(page, 'rules');
    await page.locator('#rule-type').selectOption('force');
    await page.locator('#excluded-giver').selectOption({ label: 'Alice' });
    await page.locator('#excluded-recipient').selectOption({ label: 'Bob' });
    await page.locator('[data-action="exchange#addRule"]').click();
    assert.match(await page.locator('.rules').textContent(), /Alice must draw Bob/);
    await page.locator('#rule-type').selectOption('exclude');
    await page.locator('[data-action="exchange#addRule"]').click();
    assert.match(await page.locator('[data-exchange-target="error"]').textContent(), /conflict/);
    assert.equal(await page.locator('.rules li').count(), 1);
    await openStorage(page);
    await page.locator('[data-action="exchange#save"]').click();
    await page.reload();
    await openStorage(page);
    await page.locator('[data-action="exchange#restore"]').click();
    await openPanel(page, 'rules');
    assert.match(await page.locator('.rules').textContent(), /Alice must draw Bob/);
    await drawNames(page);
    const link = await page.locator('[data-share-target="link"]').first().inputValue();
    assert.equal(Invitation.fromFragment(new URL(link).hash).recipient, 'Bob');
  });

  await check('legacy saved exchange details and invitations remain readable', async page => {
    await open(page);
    await page.evaluate(() => localStorage.setItem('secretsanta.saved.v1', JSON.stringify({
      v: 1,
      draft: {
        participants: [{ id: 'alice', name: 'Alice', hint: '' }, { id: 'bob', name: 'Bob', hint: '' }],
        exclusions: [], exchange: { name: 'Family Christmas', budget: '25 €', date: '2026-12-25', instructions: '' },
      },
      invitations: null,
    })));
    await openStorage(page);
    await page.locator('[data-action="exchange#restore"]').click();
    await drawNames(page);
    const link = await page.locator('[data-share-target="link"]').first().inputValue();
    const invitation = Invitation.fromFragment(new URL(link).hash);
    assert.equal(invitation.exchange.name, 'Family Christmas');
    assert.equal(invitation.exchange.budget, '25 €');
    assert.equal(invitation.exchange.date, '2026-12-25');
    await page.goto(link);
    await page.locator('[data-invitation-target="reveal"]').click();
    assert.equal(await page.locator('[data-invitation-target="exchange"]').textContent(), 'Family Christmas');
    assert.match(await page.locator('[data-invitation-target="budget"]').textContent(), /25 €/);
    assert.match(await page.locator('[data-invitation-target="date"]').textContent(), /2026/);
  });

  await check('missing APIs and blocked storage keep usable fallbacks', async (page, context) => {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined });
      Object.defineProperty(navigator, 'clipboard', { value: undefined });
      for (const method of ['getItem', 'setItem', 'removeItem']) Storage.prototype[method] = () => { throw new Error('Blocked'); };
    });
    await open(page);
    await fillPeople(page, ['Alice', 'Bob']);
    await drawNames(page);
    assert.equal(await page.getByRole('button', { name: 'Copy invitation' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Send privately' }).count(), 0);
    assert.ok((await page.locator('[data-share-target="link"]').first().inputValue()).includes('#santa=1.'));
    await openStorage(page);
    for (const name of ['Save on this device', 'Restore saved copy', 'Delete saved copy']) {
      await page.getByRole('button', { name, exact: true }).click();
      assert.match(await page.locator('[data-exchange-target="status"]').textContent(), /could not/);
    }
  });

  await check('permission failures and share cancellation remain recoverable', async (page, context) => {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Denied'); } } });
      Object.defineProperty(navigator, 'share', { value: async () => { throw new DOMException('Cancelled', 'AbortError'); } });
    });
    await open(page);
    await fillPeople(page, ['Alice', 'Bob']);
    await drawNames(page);
    const card = page.locator('.invitation-card').first();
    await card.getByRole('button', { name: 'Copy invitation' }).click();
    assert.match(await card.locator('[role="status"]').textContent(), /blocked/);
    await card.getByRole('button', { name: 'Send privately' }).click();
    assert.match(await card.locator('[role="status"]').textContent(), /cancelled/);
  });

  await check('successful sharing contains only the intended invitation; selection and keyboard work', async (page, context) => {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async value => { window.copied = value; } } });
      Object.defineProperty(navigator, 'share', { value: async value => { window.shared = value; } });
    });
    await open(page);
    await fillPeople(page, ['Maël 🎄', '李雷']);
    await drawNames(page);
    const card = page.locator('.invitation-card').first();
    const link = await card.locator('input').inputValue();
    await card.getByRole('button', { name: 'Copy invitation' }).click();
    assert.equal(await page.evaluate(() => window.copied), link);
    await card.getByRole('button', { name: 'Send privately' }).click();
    const shared = await page.evaluate(() => window.shared);
    assert.equal(shared.url, link);
    assert.ok(shared.text.includes('Maël 🎄'));
    assert.ok(!shared.text.includes('李雷'));
    await card.locator('input').click();
    assert.equal(await card.locator('input').evaluate(input => input.selectionEnd - input.selectionStart), link.length);
    await page.getByRole('button', { name: 'Edit and draw again' }).click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-exchange-target="confirm"]').isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'Edit and draw again' }).evaluate(button => button === document.activeElement), true);
  });

  await check('malformed invitations recover; decoded markup remains text', async page => {
    await page.goto(`${base}#santa=1.bad`);
    await page.locator('[data-invitation-target="error"]:visible').waitFor();
    assert.equal(await page.getByRole('button', { name: 'See who I got' }).count(), 0);
    await page.getByRole('link', { name: 'Create your own exchange' }).click();
    await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
    const payload = { v: 1, giver: 'Alice', recipient: '<img src=x onerror=alert(1)>', hint: '<script>bad()</script>', exchange: { name: 'Family', budget: '', date: '', instructions: '' } };
    await page.goto(base + new Invitation(payload).toFragment());
    await page.getByRole('button', { name: 'See who I got' }).click();
    assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), payload.recipient);
    assert.equal(await page.locator('.reveal-card img, .reveal-card script').count(), 0);
    await page.goto(`${base}#santa=2.bad`);
    await page.locator('[data-invitation-target="error"]:visible').waitFor();
    assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), '');
  });

  await check('corrupted saved copy does not replace the current form', async page => {
    await open(page);
    await fillPeople(page, ['Alice', 'Bob']);
    await page.evaluate(() => localStorage.setItem('secretsanta.saved.v1', '{'));
    await openStorage(page);
    await page.getByRole('button', { name: 'Restore saved copy' }).click();
    assert.match(await page.locator('[data-exchange-target="status"]').textContent(), /damaged/);
    assert.equal(await page.locator('[data-field="name"]').first().inputValue(), 'Alice');
  });

  await check('JavaScript-disabled view explains the requirement and disables controls', async page => {
    await page.goto(base);
    assert.equal(await page.getByRole('button', { name: 'Match everyone', exact: true }).isDisabled(), true);
    assert.match(await page.locator('noscript').textContent(), /JavaScript is required/);
    assert.equal(await page.locator('[data-exchange-target="controls"]').getAttribute('disabled'), '');
    assert.equal(await page.locator('[data-locale-target="option"]').first().isDisabled(), true);
    assert.equal(await page.locator('[data-page-target="start"]').isDisabled(), true);
  }, { javaScriptEnabled: false }, true);

  await check('failed initialization keeps controls disabled and a visible explanation', async page => {
    await page.route('**/apps/web/app.js', route => route.fulfill({ contentType: 'text/javascript', body: '// Application did not initialize.' }));
    await page.goto(base);
    assert.equal(await page.getByRole('button', { name: 'Match everyone', exact: true }).isDisabled(), true);
    assert.equal(await page.locator('#startup').isVisible(), true);
    assert.equal(await page.locator('[data-exchange-target="storageButton"]').first().isDisabled(), true);
    assert.equal(await page.locator('[data-locale-target="option"]').first().isDisabled(), true);
    assert.equal(await page.locator('[data-page-target="start"]').isDisabled(), true);
  }, {}, true);

  await check('Portuguese detection and live language switching preserve the draw and reveal', async page => {
    await open(page);
    assert.equal(await page.locator('html').getAttribute('lang'), 'pt-BR');
    await chooseLanguage(page, 'fr');
    await openPanel(page, 'participants');
    await page.locator('[data-field="name"]').nth(0).fill('Maël');
    await page.locator('[data-field="name"]').nth(1).fill('João');
    await openPanel(page, 'settings');
    await page.locator('#instructions').fill('A note for everyone');
    await page.locator('button[type="submit"]').click();
    const link = await page.locator('[data-share-target="link"]').first().inputValue();
    await chooseLanguage(page, 'en');
    assert.equal(await page.locator('[data-share-target="link"]').first().inputValue(), link);
    assert.equal(await page.locator('#instructions').inputValue(), 'A note for everyone');
    assert.match(await page.locator('.invitation-card h3').first().textContent(), /Invitation for Maël/);
    await page.goto(link);
    await page.locator('[data-invitation-target="reveal"]:enabled').waitFor();
    await chooseLanguage(page, 'pt-BR');
    assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), '');
    await page.locator('[data-invitation-target="reveal"]').click();
    assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), 'João');
    assert.equal(await page.locator('[data-invitation-target="instructions"]').textContent(), 'A note for everyone');
    await chooseLanguage(page, 'fr');
    assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), 'João');
    assert.equal(await page.locator('[data-invitation-target="exchange"]').textContent(), 'Secret Santa');
    assert.equal(await page.locator('[data-invitation-target="date"]').textContent(), '');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }, { locale: 'pt-BR', viewport: { width: 320, height: 740 } });

  await check('unsupported languages fall back to English and explicit preferences persist', async page => {
    await open(page);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    await chooseLanguage(page, 'fr');
    await page.reload();
    await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'fr');
    await chooseLanguage(page, '');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(await page.evaluate(() => localStorage.getItem('secretsanta.language')), null);
  }, { locale: 'de-DE' });

  await check('French errors and Portuguese switching work when preference storage is blocked', async (page, context) => {
    await context.addInitScript(() => {
      for (const method of ['getItem', 'setItem', 'removeItem']) Storage.prototype[method] = () => { throw new Error('Blocked'); };
    });
    await open(page);
    await page.locator('[data-field="name"]').nth(0).fill('Alice');
    await page.locator('[data-field="name"]').nth(1).fill('alice');
    await page.locator('button[type="submit"]').click();
    assert.match(await page.locator('[data-exchange-target="error"]').textContent(), /noms distincts/);
    await chooseLanguage(page, 'pt-BR');
    assert.match(await page.locator('[data-exchange-target="error"]').textContent(), /nomes diferentes/);
    await page.goto(`${base}#santa=1.bad`);
    await page.locator('[data-invitation-target="error"]:visible').waitFor();
    assert.match(await page.locator('[data-invitation-target="error"]').textContent(), /incompleto ou danificado/);
    await page.reload();
    await page.locator('[data-invitation-target="error"]:visible').waitFor();
    assert.match(await page.locator('[data-invitation-target="error"]').textContent(), /incomplète ou endommagée/);
  }, { locale: 'fr-FR' });

  console.log(`${checks} browser scenarios passed.`);
} finally { await browser.close(); }
