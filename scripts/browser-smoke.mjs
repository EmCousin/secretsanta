// Optional browser checks. Playwright is installed outside the repository.
// See docs/testing.md. These are separate from the dependency-free Node suite.
import assert from 'node:assert/strict';
import { encodeInvitation } from '../packages/core/invitations.js';

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
    await page.getByRole('button', { name: 'Reveal my person' }).waitFor();
    await page.keyboard.press('Tab');
    await page.getByRole('link', { name: 'Skip to the exchange' }).focus();
    await page.keyboard.press('Enter');
    assert.equal(page.url(), invitation, 'Skip navigation preserves the invitation fragment');
    assert.equal(await page.locator('[data-invitation-target="recipient"]').textContent(), '', 'Recipient absent before reveal');
    await page.getByRole('button', { name: 'Reveal my person' }).click();
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
    assert.equal(await page.locator('dialog').isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'Edit and draw again' }).evaluate(button => button === document.activeElement), true);
  });

  await check('malformed invitations recover; decoded markup remains text', async page => {
    await page.goto(`${base}#santa=1.bad`);
    await page.locator('[data-invitation-target="error"]:visible').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Reveal my person' }).count(), 0);
    await page.getByRole('link', { name: 'Create your own exchange' }).click();
    await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
    const payload = { v: 1, giver: 'Alice', recipient: '<img src=x onerror=alert(1)>', hint: '<script>bad()</script>', exchange: { name: 'Family', budget: '', date: '', instructions: '' } };
    await page.goto(base + encodeInvitation(payload));
    await page.getByRole('button', { name: 'Reveal my person' }).click();
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
  }, { javaScriptEnabled: false }, true);

  await check('failed initialization keeps controls disabled and a visible explanation', async page => {
    await page.route('**/apps/web/app.js', route => route.fulfill({ contentType: 'text/javascript', body: '// Application did not initialize.' }));
    await page.goto(base);
    assert.equal(await page.getByRole('button', { name: 'Draw names', exact: true }).isDisabled(), true);
    assert.equal(await page.locator('#startup').isVisible(), true);
    assert.equal(await page.locator('[data-exchange-target="storageButton"]').first().isDisabled(), true);
  }, {}, true);

  console.log(`${checks} browser scenarios passed.`);
} finally { await browser.close(); }
