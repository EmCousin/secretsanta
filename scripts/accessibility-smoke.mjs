// Optional tooling only; axe and Playwright are installed outside the repo.
import assert from 'node:assert/strict';
import { Invitation } from '../packages/core/invitations.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { default: AxeBuilder } = await import(process.env.AXE_MODULE || '@axe-core/playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:8000/';
let count = 0;

async function check(page, name) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(result.violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), [], name);
  count++;
  console.log(`PASS ${name}`);
}

try {
  for (const locale of ['en', 'fr', 'pt-BR']) {
    const context = await browser.newContext({ locale, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      await page.goto(base);
      await page.locator('[data-exchange-target="controls"]:enabled').waitFor();
      for (const detail of await page.locator('details.optional').all()) await detail.locator('summary').click();
      await page.locator('[data-field="name"]').nth(0).fill('Alice');
      await page.locator('[data-field="name"]').nth(1).fill('Bob');
      await check(page, `${locale} organiser and expanded options`);
      await page.locator('button[type="submit"]').click();
      await check(page, `${locale} invitation cards`);
      await page.locator('[data-action="exchange#requestEdit"]').click();
      await check(page, `${locale} redraw confirmation dialog`);
      await page.locator('[data-action="exchange#cancelEdit"]').click();
      const invitation = new Invitation({ v: 1, giver: 'Alice', recipient: 'Bob', hint: 'Books', exchange: { name: 'Christmas', date: '2026-12-25', budget: '25 €', instructions: '' } });
      await page.goto(invitation.toUrl(base));
      await page.locator('[data-invitation-target="reveal"]:enabled').waitFor();
      await check(page, `${locale} invitation before reveal`);
      await page.locator('[data-invitation-target="reveal"]').click();
      await check(page, `${locale} revealed assignment`);
    } finally { await context.close(); }
  }
  console.log(`${count} axe WCAG A/AA scenarios passed. Automated checks do not replace screen-reader and keyboard review.`);
} finally { await browser.close(); }
