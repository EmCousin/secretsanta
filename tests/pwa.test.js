import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);

async function worker(overrides = {}) {
  const events = new Map();
  const cacheEntries = new Map();
  const removed = [];
  const cache = {
    async addAll(requests) { requests.forEach(request => cacheEntries.set(request.url, new Response('static'))); },
    async match(url) { return cacheEntries.get(String(url)); },
  };
  const self = {
    registration: { scope: 'https://example.com/party/' },
    clients: { async claim() {} },
    async skipWaiting() {},
    addEventListener: (name, handler) => events.set(name, handler),
  };
  const caches = { async has() { return false; }, async open() { return cache; }, async keys() { return []; }, async delete(name) { removed.push(name); } };
  const context = vm.createContext({ self, caches, URL, Request, fetch: async () => new Response('network'), ...overrides });
  vm.runInContext(await readFile(new URL('service-worker.js', root), 'utf8'), context);
  return { context, events, cacheEntries, removed, get: expression => vm.runInContext(expression, context) };
}

test('precache covers every shipped runtime asset and contains no personal URLs', async () => {
  const sw = await worker();
  const assets = Array.from(sw.get('ASSETS'));
  assert.equal(new Set(assets).size, assets.length);
  for (const asset of assets) {
    assert.match(asset, /^\.\//);
    assert.doesNotMatch(asset, /[?#]|https?:/);
    await readFile(new URL(asset, root));
  }
  for (const directory of ['apps/web/', 'packages/core/']) {
    const files = await readdir(new URL(directory, root), { recursive: true });
    for (const file of files.filter(file => /\.(?:js|css|svg|png|ttf|woff2)$/.test(file) && !file.startsWith('test/'))) {
      assert.ok(assets.includes(`./${directory}${file}`), `${file} must work offline`);
    }
  }
});

test('manifest and PNG icons are installable and scoped below the document root', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'));
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(icon => icon.sizes === `${size}x${size}`);
    const png = await readFile(new URL(icon.src, root));
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});

test('worker installs the allowlist and never caches invitation navigations', async () => {
  const sw = await worker();
  let pending;
  sw.events.get('install')({ waitUntil: promise => { pending = promise; } });
  await pending;
  const before = [...sw.cacheEntries.keys()];
  let response;
  sw.events.get('fetch')({ request: { method: 'GET', mode: 'navigate', url: 'https://example.com/party/?private=anything' }, respondWith: promise => { response = promise; } });
  assert.equal(await (await response).text(), 'static');
  assert.deepEqual([...sw.cacheEntries.keys()], before);
  for (const url of ['https://other.example/party/', 'https://example.com/another-app/', 'https://example.com/party/data.json', 'https://example.com/party/apps/web/app.js?private=anything']) {
    let intercepted = false;
    sw.events.get('fetch')({ request: { method: 'GET', mode: 'navigate', url }, respondWith() { intercepted = true; } });
    assert.equal(intercepted, false, url);
  }
});

test('activation only removes this scope’s old caches', async () => {
  const removed = [];
  const prefix = 'secretsanta-shell:%2Fparty%2F:';
  let current;
  const caches = { async keys() { return [`${prefix}old`, current, 'unrelated', 'secretsanta-shell:%2Fother%2F:old']; }, async delete(name) { removed.push(name); } };
  const sw = await worker({ caches });
  current = sw.get('CACHE_NAME');
  let pending;
  sw.events.get('activate')({ waitUntil: promise => { pending = promise; } });
  await pending;
  assert.deepEqual(removed, [`${prefix}old`]);
});

test('failed precache removes an incomplete new cache and never forces activation', async () => {
  const removed = [];
  const caches = { async has() { return false; }, async open() { return { async addAll() { throw new Error('Network interrupted'); } }; }, async delete(name) { removed.push(name); } };
  const sw = await worker({ caches });
  let pending;
  sw.events.get('install')({ waitUntil: promise => { pending = promise; } });
  await assert.rejects(pending, /interrupted/);
  assert.equal(removed.length, 1);
  assert.equal(removed[0], sw.get('CACHE_NAME'));
});
