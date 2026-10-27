import { I18n } from './i18n/index.js';

export const LANGUAGE_KEY = 'secretsanta.language';
let preference = '';
try { preference = localStorage.getItem(LANGUAGE_KEY) || ''; } catch { /* Preference saving is optional. */ }
export const i18n = new I18n(navigator.languages || [navigator.language], preference);

export function translateTree(root = document) {
  for (const [attribute, apply] of [
    ['data-i18n', (element, value) => { element.textContent = value; }],
    ['data-i18n-placeholder', (element, value) => { element.setAttribute('placeholder', value); }],
    ['data-i18n-aria-label', (element, value) => { element.setAttribute('aria-label', value); }],
    ['data-i18n-content', (element, value) => { element.setAttribute('content', value); }],
    // Updating defaultValue respects the browser's dirty-value flag, preserving
    // user-written and restored exchange names when the interface changes.
    ['data-i18n-default', (element, value) => { element.defaultValue = value; }],
  ]) {
    for (const element of root.querySelectorAll(`[${attribute}]`)) apply(element, i18n.t(element.getAttribute(attribute)));
  }
  for (const template of root.querySelectorAll('template')) translateTree(template.content);
}

export function setLanguage(preference) {
  i18n.setLanguage(navigator.languages || [navigator.language], preference);
  try {
    if (i18n.preference) localStorage.setItem(LANGUAGE_KEY, i18n.preference);
    else localStorage.removeItem(LANGUAGE_KEY);
  } catch { /* The selected language still works in memory. */ }
  document.documentElement.lang = i18n.locale;
  translateTree();
  document.dispatchEvent(new CustomEvent('locale:changed'));
}

document.documentElement.lang = i18n.locale;
translateTree();
