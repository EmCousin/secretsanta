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

test('forced directed rules are respected and conflicting or impossible rules fail', () => {
  const forced = [{ giverId: 'p0', recipientId: 'p1' }];
  for (let i = 0; i < 30; i++) {
    const result = new SecretSantaDraw(people, [], { forced }).generate();
    valid(result, people);
    assert.equal(result.find(pair => pair.giverId === 'p0').recipientId, 'p1');
  }
  for (const rules of [
    [...forced, { giverId: 'p0', recipientId: 'p2' }],
    [...forced, { giverId: 'p2', recipientId: 'p1' }],
    [{ giverId: 'p0', recipientId: 'p0' }],
  ]) assert.throws(() => new SecretSantaDraw(people, [], { forced: rules }), error => error.code === 'validation.ruleConflict');
  assert.throws(() => new SecretSantaDraw(people, forced, { forced }), error => error.code === 'validation.ruleConflict');
  assert.throws(() => new SecretSantaDraw(people.slice(0, 3), [{ giverId: 'p1', recipientId: 'p2' }], { forced }).generate(), error => error.code === 'validation.impossible');
});

test('forced and excluded rules agree with exhaustive three-person matching', () => {
  const group = people.slice(0, 3);
  const edges = group.flatMap(giver => group.filter(recipient => giver.id !== recipient.id).map(recipient => ({ giverId: giver.id, recipientId: recipient.id })));
  const permutations = [[1, 2, 0], [2, 0, 1]];
  for (let forcedMask = 0; forcedMask < 64; forcedMask++) {
    const forced = edges.filter((_, i) => forcedMask & (1 << i));
    for (let excludedMask = 0; excludedMask < 64; excludedMask++) {
      const excluded = edges.filter((_, i) => excludedMask & (1 << i));
      const possible = permutations.some(permutation => {
        const assignment = group.map((giver, i) => ({ giverId: giver.id, recipientId: group[permutation[i]].id }));
        return forced.every(rule => assignment.some(pair => pair.giverId === rule.giverId && pair.recipientId === rule.recipientId))
          && excluded.every(rule => !assignment.some(pair => pair.giverId === rule.giverId && pair.recipientId === rule.recipientId));
      });
      let result;
      try { result = new SecretSantaDraw(group, excluded, { forced, randomInt: first }).generate(); } catch (error) {
        assert.ok(['validation.ruleConflict', 'validation.impossible', 'validation.forced'].includes(error.code));
      }
      assert.equal(Boolean(result), possible, `forced=${forcedMask}, excluded=${excludedMask}`);
      if (result) {
        valid(result, group, excluded);
        assert.ok(forced.every(rule => result.some(pair => pair.giverId === rule.giverId && pair.recipientId === rule.recipientId)));
      }
    }
  }
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
