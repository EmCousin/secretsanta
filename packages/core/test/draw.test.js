import test from 'node:test';
import assert from 'node:assert/strict';
import { SecretSantaDraw } from '../draw.js';
import { validateExchange } from '../validation.js';

const people = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, name: `Person ${i}` }));
const first = () => 0;

function valid(result, participants, rules = []) {
  assert.equal(result.length, participants.length);
  assert.equal(new Set(result.map(pair => pair.giverId)).size, participants.length);
  assert.equal(new Set(result.map(pair => pair.recipientId)).size, participants.length);
  const ids = new Set(participants.map(person => person.id));
  for (const pair of result) {
    assert.ok(ids.has(pair.giverId) && ids.has(pair.recipientId));
    assert.notEqual(pair.giverId, pair.recipientId);
    assert.ok(!rules.some(rule => rule.giverId === pair.giverId && rule.recipientId === pair.recipientId));
  }
}

test('two people draw each other and inputs are unchanged', () => {
  const input = structuredClone(people.slice(0, 2));
  assert.deepEqual(new SecretSantaDraw(input).generate(), [{ giverId: 'p0', recipientId: 'p1' }, { giverId: 'p1', recipientId: 'p0' }]);
  assert.deepEqual(input, people.slice(0, 2));
});

test('draws respect directed exclusions, including at the participant limit', () => {
  const large = Array.from({ length: 50 }, (_, i) => ({ id: `p${i}`, name: `Person ${i}` }));
  const rules = [{ giverId: 'p0', recipientId: 'p1' }, { giverId: 'p1', recipientId: 'p0' }];
  const solver = new SecretSantaDraw(large, rules);
  for (let i = 0; i < 100; i++) valid(solver.generate(), large, rules);
});

test('impossible constraints fail, including shared-recipient bottlenecks', () => {
  assert.throws(() => new SecretSantaDraw(people.slice(0, 2), [{ giverId: 'p0', recipientId: 'p1' }]).generate(), /no possible draw/);
  const rules = [{ giverId: 'p0', recipientId: 'p1' }, { giverId: 'p1', recipientId: 'p0' }];
  assert.throws(() => new SecretSantaDraw(people.slice(0, 3), rules).generate(), /no possible draw/);
});

test('matching agrees with exhaustive search for all four-person constraint sets', () => {
  const participants = people.slice(0, 4);
  const possible = participants.flatMap(giver => participants.filter(person => person.id !== giver.id)
    .map(recipient => ({ giverId: giver.id, recipientId: recipient.id })));
  function possibleDraw(rules, i = 0, used = new Set()) {
    if (i === participants.length) return true;
    return participants.some(person => {
      if (used.has(person.id) || person.id === participants[i].id || rules.some(rule => rule.giverId === participants[i].id && rule.recipientId === person.id)) return false;
      return possibleDraw(rules, i + 1, new Set([...used, person.id]));
    });
  }
  for (let mask = 0; mask < 2 ** possible.length; mask++) {
    const rules = possible.filter((_, index) => mask & (1 << index));
    const solver = new SecretSantaDraw(participants, rules, { randomInt: first });
    if (possibleDraw(rules)) valid(solver.generate(), participants, rules);
    else assert.throws(() => solver.generate(), /no possible draw/);
  }
});

test('bad participant data and exclusions produce useful validation errors', () => {
  for (const input of [[], people.slice(0, 1), null, Array(51).fill(people[0])]) assert.throws(() => new SecretSantaDraw(input), /between 2 and 50/);
  assert.throws(() => new SecretSantaDraw([people[0], { id: 'p1', name: ' person 0 ' }]), /distinct names/);
  assert.throws(() => new SecretSantaDraw([people[0], { id: 'p1', name: ' ' }]), /required/);
  assert.throws(() => new SecretSantaDraw([people[0], { ...people[1], id: people[0].id }]), /unique valid ID/);
  assert.throws(() => new SecretSantaDraw(people, [{ giverId: 'missing', recipientId: 'p1' }]), /no longer/);
  assert.throws(() => new SecretSantaDraw(people, Array(2).fill({ giverId: 'p0', recipientId: 'p1' })), /already/);
  assert.throws(() => new SecretSantaDraw(people, [], { randomInt: () => -1 }).generate(), /random source/);
});

test('solver instances own their state and returned results are independent', () => {
  const input = structuredClone(people);
  const rules = [{ giverId: 'p0', recipientId: 'p1' }];
  const solver = new SecretSantaDraw(input, rules, { randomInt: first });
  const other = new SecretSantaDraw(people.slice(0, 2));
  input[0].id = 'changed';
  rules[0].recipientId = 'changed';
  const result = solver.generate();
  const snapshot = structuredClone(result);
  valid(other.generate(), people.slice(0, 2));
  valid(solver.generate(), people, [{ giverId: 'p0', recipientId: 'p1' }]);
  assert.deepEqual(result, snapshot);
  result[0].recipientId = 'changed';
  valid(solver.generate(), people, [{ giverId: 'p0', recipientId: 'p1' }]);
});

test('calendar dates are checked, including leap-year rules', () => {
  for (const date of ['2026-02-29', '2026-13-01', '0000-01-01', '2026-04-31', 'today', '1900-02-29']) {
    assert.throws(() => validateExchange({ name: 'Family', date }), /date/);
  }
  assert.equal(validateExchange({ name: 'Family', date: '2000-02-29' }).date, '2000-02-29');
});
