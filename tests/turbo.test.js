import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

test('vendored Turbo is pinned with its upstream licence', async () => {
  const source = await readFile(new URL('../apps/web/vendor/turbo.js', import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'), 'b9d35d123a07614f55eaaf993f74d687a503ae41ba50ef835aafa18dbb265a13');
  assert.match(await readFile(new URL('../apps/web/vendor/TURBO-LICENSE.md', import.meta.url), 'utf8'), /Permission is hereby granted/);
});
