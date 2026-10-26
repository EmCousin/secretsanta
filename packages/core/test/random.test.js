import test from 'node:test';
import assert from 'node:assert/strict';
import { secureRandomInt } from '../utils/random.js';

test('secure random integers stay within the requested range', () => {
  for (const max of [1, 2, 3, 50, 2 ** 32]) {
    for (let i = 0; i < 50; i++) {
      const value = secureRandomInt(max);
      assert.ok(Number.isInteger(value) && value >= 0 && value < max);
    }
  }
  for (const max of [0, -1, 1.5, 2 ** 32 + 1]) assert.throws(() => secureRandomInt(max), RangeError);
});
