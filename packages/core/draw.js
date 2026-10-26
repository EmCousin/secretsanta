import { validateParticipants, validateExclusions, ValidationError } from './validation.js';

export function secureRandomInt(max) {
  if (!Number.isSafeInteger(max) || max < 1 || max > 2 ** 32) throw new RangeError('Invalid random range.');
  if (!globalThis.crypto?.getRandomValues) throw new ValidationError('This browser cannot generate a secure draw. Try an up-to-date browser over HTTPS.');
  const limit = Math.floor(2 ** 32 / max) * max;
  const word = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(word); } while (word[0] >= limit);
  return word[0] % max;
}

function shuffle(items, randomInt) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    if (!Number.isInteger(j) || j < 0 || j > i) throw new RangeError('Invalid random source.');
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Randomised bipartite matching. Complete for the supported constraints, O(n^3).
// Random edge/giver ordering is NOT uniform sampling of all valid assignments.
export function draw(participants, exclusions = [], { randomInt = secureRandomInt } = {}) {
  const people = validateParticipants(participants);
  const rules = validateExclusions(exclusions, people);
  const blocked = new Map(people.map(person => [person.id, new Set([person.id])]));
  for (const rule of rules) blocked.get(rule.giverId).add(rule.recipientId);
  const edges = new Map(people.map(giver => [giver.id,
    shuffle(people.filter(recipient => !blocked.get(giver.id).has(recipient.id)).map(person => person.id), randomInt),
  ]));
  const recipientOwners = new Map();

  function assign(giverId, visited) {
    for (const recipientId of edges.get(giverId)) {
      if (visited.has(recipientId)) continue;
      visited.add(recipientId);
      const owner = recipientOwners.get(recipientId);
      if (owner === undefined || assign(owner, visited)) {
        recipientOwners.set(recipientId, giverId);
        return true;
      }
    }
    return false;
  }

  for (const giver of shuffle(people, randomInt)) {
    if (!assign(giver.id, new Set())) {
      throw new ValidationError('These exclusions leave no possible draw. Remove an exclusion or add more people, then try again.');
    }
  }
  const recipients = new Map([...recipientOwners].map(([recipientId, giverId]) => [giverId, recipientId]));
  return people.map(giver => ({ giverId: giver.id, recipientId: recipients.get(giver.id) }));
}
