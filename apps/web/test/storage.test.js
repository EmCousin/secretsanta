import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, saveCopy, restoreCopy, deleteCopy } from '../storage.js';
import { Invitation } from '../../../packages/core/invitations.js';

function memoryStorage() {
  const values = new Map();
  return { setItem: (key, value) => values.set(key, value), getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key) };
}

const draft = {
  participants: [{ id: 'alice', name: 'Alice', hint: 'Books' }, { id: 'bob', name: 'Bob', hint: 'Coffee' }],
  exclusions: [],
  exchange: { name: 'Family', budget: '25 €', date: '2026-12-25', instructions: '' },
};
const invitations = [
  { giverId: 'alice', fragment: new Invitation({ v: 1, giver: 'Alice', recipient: 'Bob', hint: 'Coffee', exchange: draft.exchange }).toFragment() },
  { giverId: 'bob', fragment: new Invitation({ v: 1, giver: 'Bob', recipient: 'Alice', hint: 'Books', exchange: draft.exchange }).toFragment() },
];

test('drafts can be incomplete and saved results restore without a new draw', () => {
  const storage = memoryStorage();
  const incomplete = { v: 1, draft: { ...draft, participants: [], exchange: { ...draft.exchange, name: '' } }, invitations: null };
  saveCopy(incomplete, storage);
  assert.deepEqual(restoreCopy(storage), incomplete);
  const completed = { v: 1, draft, invitations };
  saveCopy(completed, storage);
  assert.deepEqual(restoreCopy(storage), completed);
});

test('deletion only removes this app key and never unrelated origin data', () => {
  const storage = memoryStorage();
  storage.setItem('unrelated', 'keep');
  saveCopy({ v: 1, draft, invitations: null }, storage);
  deleteCopy(storage);
  assert.equal(restoreCopy(storage), null);
  assert.equal(storage.getItem('unrelated'), 'keep');
});

test('unavailable/full storage errors reach the controller for a fallback message', () => {
  const storage = { setItem() { throw new Error('quota'); }, getItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.throws(() => saveCopy({ v: 1, draft, invitations: null }, storage), /quota/);
  assert.throws(() => restoreCopy(storage), /blocked/);
  assert.throws(() => deleteCopy(storage), /blocked/);
});

test('corrupt or inconsistent saved data fails before changing the interface', () => {
  const storage = memoryStorage();
  for (const encoded of ['{', 'null', 'x'.repeat(500001), JSON.stringify({ v: 2 }), JSON.stringify({ v: 1, draft, invitations: [invitations[0], invitations[0]] }), JSON.stringify({ v: 1, draft: { ...draft, exclusions: [{ giverId: 'alice', recipientId: 'bob' }] }, invitations }), JSON.stringify({ v: 1, draft, invitations: [{ ...invitations[0], fragment: '#santa=1.bad' }, invitations[1]] })]) {
    storage.setItem(STORAGE_KEY, encoded);
    assert.throws(() => restoreCopy(storage));
  }
});
