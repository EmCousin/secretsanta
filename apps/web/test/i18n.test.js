import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CATALOGUES, I18n, resolveLanguage } from '../i18n/index.js';
import { validateParticipants, ValidationError } from '../../../packages/core/validation.js';

test('browser language negotiation uses supported regional variants and English fallback', () => {
  for (const [languages, expected] of [
    [['en-GB'], 'en'], [['fr-CA'], 'fr'], [['pt-br'], 'pt-BR'], [['pt-PT'], 'pt-BR'],
    [['es-MX', 'fr-FR'], 'fr'], [['de-DE', 'ja-JP'], 'en'], [[], 'en'], [[null, 'pt_BR'], 'pt-BR'],
  ]) assert.equal(resolveLanguage(languages), expected);
  assert.equal(new I18n(['fr-FR'], 'pt-BR').locale, 'pt-BR');
  assert.equal(new I18n(['fr-FR'], 'unsupported').locale, 'fr');
});

test('all catalogues have matching nonempty keys and interpolation parameters', () => {
  const parameters = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  const keys = Object.keys(CATALOGUES.en).sort();
  for (const catalogue of Object.values(CATALOGUES)) {
    assert.deepEqual(Object.keys(catalogue).sort(), keys);
    for (const key of keys) {
      assert.equal(typeof catalogue[key], 'string', key);
      assert.ok(catalogue[key].length > 0, key);
      assert.deepEqual(parameters(catalogue[key]), parameters(CATALOGUES.en[key]), key);
    }
  }
});

test('HTML translations refer to known keys, including template attributes', async () => {
  const html = await readFile(new URL('../../../index.html', import.meta.url), 'utf8');
  for (const [, key] of html.matchAll(/data-i18n(?:-placeholder|-aria-label|-content|-default)?="([^"]+)"/g)) {
    assert.ok(Object.hasOwn(CATALOGUES.en, key), key);
  }
});

test('the no-JavaScript HTML copy stays in sync with the English catalogue', async () => {
  const html = await readFile(new URL('../../../index.html', import.meta.url), 'utf8');
  const entities = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };
  for (const [, key, text] of html.matchAll(/data-i18n="([^"]+)"(?:[^>"']|"[^"]*"|'[^']*')*>([^<]*)</g)) {
    const decoded = text.trim().replace(/&amp;|&quot;|&#39;|&lt;|&gt;/g, entity => entities[entity]);
    assert.equal(decoded, CATALOGUES.en[key], key);
  }
});

test('missing translations fall back to English; interpolation is plain text', () => {
  const i18n = new I18n(['fr']);
  CATALOGUES.en['test.fallback'] = 'English fallback';
  try { assert.equal(i18n.t('test.fallback'), 'English fallback'); }
  finally { delete CATALOGUES.en['test.fallback']; }
  const name = '<img src=x onerror=alert(1)>';
  assert.equal(i18n.t('people.invitationFor', { name }), `Invitation pour ${name}`);
});

test('domain error codes translate without inspecting diagnostic English messages', () => {
  let error;
  try { validateParticipants([{ id: 'a', name: 'Alice' }, { id: 'b', name: 'alice' }]); }
  catch (caught) { error = caught; }
  assert.equal(error.code, 'validation.duplicateName');
  assert.deepEqual(error.params, { name: 'alice' });
  error.message = 'An unrelated diagnostic';
  assert.match(new I18n(['pt-BR']).error(error), /nomes diferentes.*alice/);
  assert.match(new I18n(['fr']).error(new ValidationError('diagnostic', 'validation.people', { max: 50 })), /2 et 50/);
  assert.match(new I18n(['fr']).error(new Error('private diagnostic')), /Une erreur/);
});

test('dates use the UI locale and retain the calendar day', () => {
  assert.equal(new I18n(['en']).date('2026-12-25'), 'December 25, 2026');
  assert.equal(new I18n(['fr']).date('2026-12-25'), '25 décembre 2026');
  assert.equal(new I18n(['pt-BR']).date('2026-12-25'), '25 de dezembro de 2026');
});
