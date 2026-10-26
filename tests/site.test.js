import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);

test('static entry point has local assets and prevents native form submission', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<noscript>/);
  assert.match(html, /form-action 'none'/);
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(html, /(?:src|href)="https?:/);
  for (const [, source] of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) {
    await readFile(new URL(source, root));
  }
});

test('vendored Stimulus has the pinned version and upstream licence', async () => {
  const module = await readFile(new URL('apps/web/vendor/stimulus.js', root), 'utf8');
  assert.equal(createHash('sha256').update(module).digest('hex'),
    '23deecdac6f36c08e8f39fbed6b27f60c850cacad3a34eb71194462b7b1647f3');
  const license = await readFile(new URL('apps/web/vendor/LICENSE.md', root), 'utf8');
  assert.match(license, /MIT License/);
  assert.match(license, /Permission is hereby granted/);
});

test('all project JavaScript parses without a build step', async () => {
  const files = await readdir(root, { recursive: true });
  for (const file of files.filter(file => file.endsWith('.js') && !file.startsWith('node_modules/'))) {
    const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(file, root))], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${file}: ${result.stderr}`);
  }
});

test('app code does not render decoded HTML or log private state', async () => {
  const files = await readdir(new URL('apps/web/', root), { recursive: true });
  for (const file of files.filter(file => file.endsWith('.js') && !file.startsWith('vendor/'))) {
    const source = await readFile(new URL(`apps/web/${file}`, root), 'utf8');
    assert.doesNotMatch(source, /\.innerHTML\s*=|insertAdjacentHTML|console\.(?:log|error|warn)/, file);
    assert.doesNotMatch(source, /\bfetch\s*\(|\bXMLHttpRequest\b|sendBeacon\s*\(/, file);
  }
});
