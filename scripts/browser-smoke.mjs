// Optional browser checks. Playwright is installed outside the repository.
// See docs/testing.md. These are separate from the dependency-free Node suite.
import assert from 'node:assert/strict';
import { Invitation } from '../packages/core/invitations.js';
import { I18n } from '../apps/web/i18n/index.js';
import { chooseLanguage } from './browser-helpers.mjs';

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
}

async function fillPeople(page, names = ['Alice', 'Bob', 'Charlie']) {
  for (let index = 0; index < names.length; index++) {
    if (index > 1) await page.getByRole('button', { name: 'Add another person' }).click();
    await page.locator('[data-field="name"]').nth(index).fill(names[index]);
  }
}

async function drawNames(page) {
  await page.getByRole('button', { name: 'Draw names', exact: true }).click();
  await page.locator('[data-exchange-target="results"]:visible').waitFor();
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
      assert.equal(await page.locator('#exchange-name').isVisible(), false, 'Prefilled exchange name stays in optional details');
      assert.equal(await page.locator('.storage-panel').evaluate(element =>
        element.getBoundingClientRect().top > document.querySelector('button[type="submit"]').getBoundingClientRect().bottom), true);
      const originalUrl = page.url();
      await start.click();
      assert.equal(page.url(), originalUrl, 'Start does not replace fragments or navigate');
      const names = page.locator('[data-field="name"]');
      assert.equal(await names.first().evaluate(element => element === document.activeElement), true);
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
      assert.equal(await page.locator('[data-exchange-target="setupHeading"]').isVisible(), false);
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
    await page.locator('[data-i18n="form.options"]').click();
    await page.locator('#exchange-name').fill('');
    await page.locator('[data-i18n="form.options"]').click();
    await page.locator('button[type="submit"]').click();
    assert.equal(await page.locator('#exchange-name').isVisible(), true, 'Native invalid fields expand their details');
    assert.equal(await page.locator('#exchange-name').evaluate(element => element === document.activeElement), true);
    assert.equal(await page.locator('[data-exchange-target="results"]').isVisible(), false);
    await page.locator('#exchange-name').fill('Test exchange');
    await page.locator('[data-exchange-target="addButton"]').click();
    await page.locator('.hint-details summary').last().click();
    await page.locator('[data-field="hint"]').last().fill('Keep this hint');
    await page.locator('button[type="submit"]').click();
    assert.equal(await names.count(), 3, 'An unnamed person with a hint is never discarded');
    assert.equal(await page.locator('[data-field="hint"]').last().inputValue(), 'Keep this hint');
    assert.equal(await page.locator('[data-exchange-target="results"]').isVisible(), false);
    await page.locator('[data-field="hint"]').last().fill('');
    await page.locator('[data-i18n="form.exclusions"]').click();
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
    await page.locator('.optional > summary').first().click();
    await page.getByLabel('Budget', { exact: false }).fill('25 €');
    await page.getByLabel('Exchange date', { exact: false }).fill('2026-12-25');
    await drawNames(page);
    assert.equal(await page.locator('[data-share-target="link"]').count(), 3);
    assert.equal(await page.evaluate(() => localStorage.length), 0, 'No automatic saving');
    const invitation = await page.locator('[data-share-target="link"]').first().inputValue();
    await page.getByText('Save or restore on this device', { exact: true }).click();
    await page.getByRole('button', { name: 'Save on this device', exact: true }).click();
    await page.reload();
    await page.getByText('Save or restore on this device', { exact: true }).click();
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
    await page.getByText("Who shouldn't draw whom?", { exact: true }).click();
    await page.getByLabel('This person', { exact: true }).selectOption({ label: 'Alice' });
    await page.getByLabel('should not draw', { exact: true }).selectOption({ label: 'Bob' });
    await page.getByRole('button', { name: 'Add exclusion', exact: true }).click();
    await page.getByRole('button', { name: 'Draw names', exact: true }).click();
    await page.locator('[data-exchange-target="error"]:visible').waitFor();
    assert.match(await page.locator('[data-exchange-target="error"]').textContent(), /no possible draw/);
    await page.getByRole('button', { name: 'Remove exclusion:', exact: false }).click();
    await drawNames(page);
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
    await page.getByText('Save or restore on this device', { exact: true }).click();
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
    await page.getByText('Save or restore on this device', { exact: true }).click();
    await page.getByRole('button', { name: 'Restore saved copy' }).click();
    assert.match(await page.locator('[data-exchange-target="status"]').textContent(), /damaged/);
    assert.equal(await page.locator('[data-field="name"]').first().inputValue(), 'Alice');
  });

  await check('JavaScript-disabled view explains the requirement and disables controls', async page => {
    await page.goto(base);
    assert.equal(await page.getByRole('button', { name: 'Draw names', exact: true }).isDisabled(), true);
    assert.match(await page.locator('noscript').textContent(), /JavaScript is required/);
    assert.equal(await page.locator('[data-exchange-target="controls"]').getAttribute('disabled'), '');
    assert.equal(await page.locator('[data-locale-target="option"]').first().isDisabled(), true);
    assert.equal(await page.locator('[data-page-target="start"]').isDisabled(), true);
  }, { javaScriptEnabled: false }, true);

  await check('failed initialization keeps controls disabled and a visible explanation', async page => {
    await page.route('**/apps/web/app.js', route => route.fulfill({ contentType: 'text/javascript', body: '// Application did not initialize.' }));
    await page.goto(base);
    assert.equal(await page.getByRole('button', { name: 'Draw names', exact: true }).isDisabled(), true);
    assert.equal(await page.locator('#startup').isVisible(), true);
    assert.equal(await page.locator('[data-exchange-target="storageButton"]').first().isDisabled(), true);
    assert.equal(await page.locator('[data-locale-target="option"]').first().isDisabled(), true);
    assert.equal(await page.locator('[data-page-target="start"]').isDisabled(), true);
  }, {}, true);

  await check('Portuguese detection and live language switching preserve the draw and reveal', async page => {
    await open(page);
    assert.equal(await page.locator('html').getAttribute('lang'), 'pt-BR');
    assert.equal(await page.locator('#exchange-name').inputValue(), 'Nosso Amigo Secreto');
    await chooseLanguage(page, 'fr');
    assert.equal(await page.locator('#exchange-name').inputValue(), 'Notre Père Noël secret');
    await page.locator('[data-i18n="form.options"]').click();
    await page.locator('#exchange-name').fill('Natal em família');
    await page.locator('[data-field="name"]').nth(0).fill('Maël');
    await page.locator('[data-field="name"]').nth(1).fill('João');
    await page.locator('#date').fill('2026-12-25');
    await page.locator('#budget').fill('R$ 50');
    await page.locator('button[type="submit"]').click();
    const link = await page.locator('[data-share-target="link"]').first().inputValue();
    await chooseLanguage(page, 'en');
    assert.equal(await page.locator('[data-share-target="link"]').first().inputValue(), link);
    assert.equal(await page.locator('#exchange-name').inputValue(), 'Natal em família');
    assert.match(await page.locator('.invitation-card h3').first().textContent(), /Invitation for Maël/);
    await page.goto(link);
    await page.locator('[data-invitation-target="reveal"]:enabled').waitFor();
    await chooseLanguage(page, 'pt-BR');
    assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), '');
    await page.locator('[data-invitation-target="reveal"]').click();
    assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), 'João');
    assert.match(await page.locator('[data-invitation-target="date"]').textContent(), /25 de dezembro de 2026/);
    await chooseLanguage(page, 'fr');
    assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), 'João');
    assert.equal(await page.locator('[data-invitation-target="exchange"]').textContent(), 'Natal em família');
    assert.match(await page.locator('[data-invitation-target="date"]').textContent(), /25 décembre 2026/);
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
