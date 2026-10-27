export async function openLanguageMenu(page, { touch = false } = {}) {
  const menu = page.locator('[data-locale-target="menu"]');
  if (!await menu.evaluate(element => element.open)) {
    if (touch) await page.locator('#language').tap();
    else await page.locator('#language').click();
  }
  await page.locator('#language-options').waitFor({ state: 'visible' });
}

export async function chooseLanguage(page, preference, { touch = false } = {}) {
  await openLanguageMenu(page, { touch });
  const label = page.locator(`[data-locale-target="option"][value="${preference}"]`).locator('..');
  if (touch) await label.tap();
  else await label.click();
}
