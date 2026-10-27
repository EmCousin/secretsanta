import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

test('festive font is pinned locally with its upstream licence and readable fallbacks', async () => {
  const font = await readFile(new URL('../apps/web/fonts/BerkshireSwash-Regular.ttf', import.meta.url));
  const blob = createHash('sha1').update(`blob ${font.length}\0`).update(font).digest('hex');
  assert.equal(blob, '0b673f442bdb6faacc40de90f36808a38acd2b08');
  const licence = await readFile(new URL('../apps/web/fonts/OFL.txt', import.meta.url), 'utf8');
  assert.match(licence, /Copyright.*Brian J\. Bonislawsky/);
  assert.match(licence, /SIL OPEN FONT LICENSE Version 1\.1/);
  const notes = await readFile(new URL('../apps/web/fonts/README.md', import.meta.url), 'utf8');
  assert.match(notes, /db548d2df61806b37598a2d6839040866c2d6ae2/);
  const css = await readFile(new URL('../apps/web/styles.css', import.meta.url), 'utf8');
  assert.match(css, /src: url\('\.\/fonts\/BerkshireSwash-Regular\.ttf'\)/);
  assert.match(css, /font-display: swap/);
  assert.doesNotMatch(css, /@import|url\(['"]?https?:/);
});
