// Optional real-worker tests with a temporary loopback-only static server.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
import { Invitation } from '../packages/core/invitations.js';
import { chooseLanguage, openPanel, openStorage } from './browser-helpers.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
let release = 0;
let failInstall = false;
const requested = [];
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (request, response) => {
  requested.push(request.url);
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/party\//, '/');
    const path = resolve(root, `.${pathname.endsWith('/') ? pathname + 'index.html' : pathname}`);
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error('Invalid path');
    if (failInstall && pathname === '/apps/web/i18n/fr.js') {
      response.writeHead(503).end('Simulated install interruption');
      return;
    }
    let body = await readFile(path);
    if (pathname === '/service-worker.js') body = body.toString().replace(/(const CACHE_VERSION = ')([^']+)(')/, `$1$2-test-${release}$3`);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch { response.writeHead(404).end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true });

async function warm(page, base) {
  await page.goto(base);
  await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.waitForFunction(() => /Pronto|Prêt|Ready/.test(document.querySelector('[data-pwa-target="status"]').textContent));
}

async function update(page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const outcome = new Promise(resolve => registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' || worker.state === 'redundant') resolve(worker.state);
      });
    }, { once: true }));
    await registration.update();
    return outcome;
  });
}

try {
  for (const prefix of ['/', '/party/']) {
    release = 0;
    failInstall = false;
    const base = origin + prefix;
    const context = await browser.newContext({ locale: 'pt-BR', viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await warm(page, base);
      await page.evaluate(async () => { const cache = await caches.open('unrelated-cache'); await cache.put('./unrelated', new Response('keep')); });
      await page.locator('[data-field="name"]').nth(0).fill('Alice');
      await page.locator('[data-field="name"]').nth(1).fill('Bruno');
      await page.locator('button[type="submit"]').click();
      const originalLink = await page.locator('[data-share-target="link"]').first().inputValue();
      await openStorage(page);
      await page.locator('[data-action="exchange#save"]').click();

      await context.setOffline(true);
      await page.reload();
      await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
      assert.equal(await page.evaluate(async () => (await document.fonts.load('32px "Berkshire Swash"', 'Noël João')).length === 1), true, 'The festive font loads offline');
      await openStorage(page);
      await page.locator('[data-action="exchange#restore"]').click();
      assert.equal(await page.locator('[data-share-target="link"]').first().inputValue(), originalLink);
      await chooseLanguage(page, 'fr');
      assert.equal(await page.locator('html').getAttribute('lang'), 'fr');
      await page.waitForFunction(() => [...document.querySelectorAll('.language-icon')]
        .every(image => image.complete && image.naturalWidth > 0));
      assert.match(await page.locator('[data-locale-target="currentIcon"]').getAttribute('src'), /languages\/fr\.svg$/);
      const fresh = new Invitation({ v: 1, giver: 'Nouvel invité', recipient: 'Jamais visité', hint: 'Un livre', exchange: { name: 'Noël', date: '2026-12-25', budget: '25 €', instructions: '' } });
      const guest = await context.newPage();
      await guest.goto(fresh.toUrl(base));
      await guest.locator('[data-invitation-target="reveal"]:enabled').waitFor();
      assert.equal(await guest.locator('[data-invitation-target="recipient"]').textContent(), '');
      await guest.locator('[data-invitation-target="reveal"]').click();
      assert.equal(await guest.locator('[data-invitation-target="recipient"]').textContent(), 'Jamais visité');
      assert.match(await guest.locator('[data-invitation-target="date"]').textContent(), /25 décembre 2026/);
      await guest.close();
      await page.locator('[data-action="exchange#requestEdit"]').click();
      await page.locator('[data-action="exchange#edit"]').click();
      await page.locator('[data-field="name"]').nth(0).fill('Offline Alice');
      await page.locator('button[type="submit"]').click();
      const offlineLink = await page.locator('[data-share-target="link"]').first().inputValue();
      assert.notEqual(offlineLink, originalLink);
      const keys = await page.evaluate(async () => {
        const names = (await caches.keys()).filter(name => name.startsWith('secretsanta-shell:'));
        return (await Promise.all(names.map(async name => (await (await caches.open(name)).keys()).map(request => request.url)))).flat();
      });
      assert.ok(keys.length > 20);
      for (const key of keys) assert.ok(!/[?#]/.test(key) && !/Alice|Bruno|Jamais/.test(key));
      console.log(`PASS ${prefix} offline reload, local restore, language switching, new invitation and new draw; static-only cache`);

      await context.setOffline(false);
      release++;
      assert.equal(await update(page), 'installed');
      await page.locator('[data-pwa-target="update"]:visible').waitFor();
      assert.equal(await page.locator('[data-share-target="link"]').first().inputValue(), offlineLink, 'Update must not reload an unsaved draw');
      await page.locator('[data-action="pwa#requestUpdate"]').click();
      await page.locator('[data-action="pwa#cancelUpdate"]').click();
      assert.equal(await page.locator('[data-share-target="link"]').first().inputValue(), offlineLink);
      await page.locator('[data-action="pwa#requestUpdate"]').click();
      await Promise.all([page.waitForEvent('load'), page.locator('[data-action="pwa#applyUpdate"]').click()]);
      await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
      assert.equal(await page.evaluate(() => caches.has('unrelated-cache')), true);
      assert.equal(await page.evaluate(async () => (await caches.keys()).filter(name => name.startsWith('secretsanta-shell:')).length), 1);
      console.log(`PASS ${prefix} worker update waits for consent and preserves unrelated caches`);

      await openPanel(page, 'settings');
      await page.locator('#exchange-name').fill('Keep my unfinished draft');
      release++;
      failInstall = true;
      assert.equal(await update(page), 'redundant');
      assert.equal(await page.locator('#exchange-name').inputValue(), 'Keep my unfinished draft');
      assert.equal(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting)), false);
      assert.equal(await page.evaluate(async () => (await caches.keys()).filter(name => name.startsWith('secretsanta-shell:')).length), 1);
      await context.setOffline(true);
      await page.reload();
      await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
      console.log(`PASS ${prefix} interrupted update leaves the previous release usable offline`);
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  assert.ok(requested.every(url => !/Alice|Bruno|Jamais|santa=/.test(url)), 'No invitation payload in HTTP requests');
  console.log('6 real service-worker scenarios passed.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
