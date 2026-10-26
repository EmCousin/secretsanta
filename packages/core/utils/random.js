import { ValidationError } from '../validation.js';

export function secureRandomInt(max) {
  if (!Number.isSafeInteger(max) || max < 1 || max > 2 ** 32) throw new RangeError('Invalid random range.');
  if (!globalThis.crypto?.getRandomValues) throw new ValidationError('This browser cannot generate a secure draw. Try an up-to-date browser over HTTPS.');
  const limit = Math.floor(2 ** 32 / max) * max;
  const word = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(word); } while (word[0] >= limit);
  return word[0] % max;
}
