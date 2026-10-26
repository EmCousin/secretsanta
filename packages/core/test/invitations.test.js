import test from 'node:test';
import assert from 'node:assert/strict';
import { Invitation } from '../invitations.js';

const invitation = { v: 1, giver: 'Alice', recipient: 'Bob', hint: '', exchange: { name: 'Family', budget: '', date: '', instructions: '' } };
const raw = value => `#santa=1.${Buffer.from(JSON.stringify(value)).toString('base64url')}`;

test('v1 fixture remains readable across code changes', () => {
  const fixture = '#santa=1.eyJ2IjoxLCJnaXZlciI6IkFsaWNlIiwicmVjaXBpZW50IjoiQm9iIiwiaGludCI6IiIsImV4Y2hhbmdlIjp7Im5hbWUiOiJGYW1pbHkiLCJidWRnZXQiOiIiLCJkYXRlIjoiIiwiaW5zdHJ1Y3Rpb25zIjoiIn19';
  assert.ok(Invitation.fromFragment(fixture) instanceof Invitation);
  assert.deepEqual(Invitation.fromFragment(fixture).toJSON(), invitation);
  assert.equal(new Invitation(invitation).toFragment(), fixture);
});

test('Unicode and markup stay plain text through the codec', () => {
  const value = { ...invitation, giver: 'Maël 🎄', recipient: '李雷', hint: '<img src=x onerror=alert(1)>', exchange: { name: 'Noël', budget: '25 €', date: '2026-12-25', instructions: 'Bring a gift 🎁\nKeep it secret.' } };
  assert.deepEqual(Invitation.fromFragment(new Invitation(value).toFragment()).toJSON(), value);
});

test('links keep data in fragments and strip unrelated query parameters', () => {
  const encoded = new Invitation(invitation);
  const url = new URL(encoded.toUrl('https://example.com/party/index.html?tracking=1#old'));
  assert.equal(url.search, '');
  assert.equal(url.pathname, '/party/index.html');
  assert.deepEqual(Invitation.fromFragment(url.hash).toJSON(), invitation);
  for (const base of ['javascript:alert(1)', 'file:///tmp/index.html', 'not a URL', 'https://user:pass@example.com']) {
    assert.throws(() => encoded.toUrl(base));
  }
});

test('malformed, oversized, unsupported, and wrongly typed payloads fail', () => {
  for (const fragment of ['', '#', '#santa=1.a', '#santa=1.@@', '#santa=01.YQ', '#santa=2.YQ', '#santa=1._w', '#santa=1.' + 'x'.repeat(8001), raw(null), raw([]), raw({ ...invitation, v: 2 }), raw({ ...invitation, giver: 1 }), raw({ ...invitation, recipient: '' }), raw({ ...invitation, hint: 'x'.repeat(241) }), raw({ ...invitation, exchange: null }), raw({ ...invitation, exchange: { name: 'Family', date: '2026-02-30' } })]) {
    assert.throws(() => Invitation.fromFragment(fragment));
  }
});

test('only intended fields are retained, never the full draw', () => {
  const value = { ...invitation, participants: ['Alice', 'Bob', 'Charlie'], assignments: ['secret'], exchange: { ...invitation.exchange, extra: 'private' } };
  assert.deepEqual(Invitation.fromFragment(new Invitation(value).toFragment()).toJSON(), invitation);
});

test('invitation values are immutable and serialise without shared mutable fields', () => {
  const input = structuredClone(invitation);
  const value = new Invitation(input);
  input.giver = 'Changed';
  input.exchange.name = 'Changed';
  assert.equal(value.giver, 'Alice');
  assert.equal(value.exchange.name, 'Family');
  assert.throws(() => { value.giver = 'Changed'; }, TypeError);
  assert.throws(() => { value.exchange.name = 'Changed'; }, TypeError);
  const output = value.toJSON();
  output.exchange.name = 'Changed';
  assert.equal(value.exchange.name, 'Family');
  assert.deepEqual(JSON.parse(JSON.stringify(value)), invitation);
});
