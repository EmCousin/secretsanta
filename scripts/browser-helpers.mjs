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

export async function openPanel(page, name) {
  const panel = page.locator(`[data-exchange-target="${name}Panel"]`);
  if (!await panel.evaluate(element => element.classList.contains('is-active'))) await panel.locator(':scope > .workflow-header').click();
  await page.waitForFunction(name => {
    const panel = document.querySelector(`[data-exchange-target="${name}Panel"]`);
    return panel.classList.contains('is-active') && panel.querySelector('.workflow-body').getAnimations().length === 0
      && [...document.querySelectorAll('.workflow-panel')].every(other => other === panel || !other.classList.contains('is-active'));
  }, name);
}

export async function openStorage(page) {
  await openPanel(page, 'links');
  const storage = page.locator('.storage-panel');
  if (!await storage.evaluate(element => element.open)) await storage.locator('summary').click();
}
