import { validateParticipants, validateExclusions, validateForced, ValidationError } from './validation.js';
import { secureRandomInt } from './utils/random.js';

// Randomised bipartite matching. Complete for the supported constraints, O(n^3).
// Random edge/giver ordering is NOT uniform sampling of all valid assignments.
export class SecretSantaDraw {
  #people;
  #candidates;
  #randomInt;
  #edges;
  #recipientOwners;

  constructor(participants, exclusions = [], { randomInt = secureRandomInt, forced = [] } = {}) {
    this.#people = validateParticipants(participants);
    const rules = validateExclusions(exclusions, this.#people);
    const forcedRules = validateForced(forced, this.#people, rules);
    if (typeof randomInt !== 'function') throw new TypeError('A random integer source is required.');
    this.#randomInt = randomInt;

    const blocked = new Map(this.#people.map(person => [person.id, new Set([person.id])]));
    for (const rule of rules) blocked.get(rule.giverId).add(rule.recipientId);
    this.#candidates = new Map(this.#people.map(giver => [giver.id,
      this.#people.filter(recipient => !blocked.get(giver.id).has(recipient.id) && (!forcedRules.some(rule => rule.giverId === giver.id) || forcedRules.some(rule => rule.giverId === giver.id && rule.recipientId === recipient.id))).map(person => person.id),
    ]));
  }

  generate() {
    // Each run owns fresh matching state, so reusing a solver cannot retain an
    // earlier assignment or mutate a result returned to its caller.
    this.#edges = new Map([...this.#candidates].map(([giverId, recipients]) => [giverId, this.#shuffle(recipients)]));
    this.#recipientOwners = new Map();
    for (const giver of this.#shuffle(this.#people)) {
      if (!this.#assign(giver.id, new Set())) {
        throw new ValidationError('These exclusions leave no possible draw. Remove an exclusion or add more people, then try again.', 'validation.impossible');
      }
    }
    const recipients = new Map([...this.#recipientOwners].map(([recipientId, giverId]) => [giverId, recipientId]));
    return this.#people.map(giver => ({ giverId: giver.id, recipientId: recipients.get(giver.id) }));
  }

  #assign(giverId, visited) {
    for (const recipientId of this.#edges.get(giverId)) {
      if (visited.has(recipientId)) continue;
      visited.add(recipientId);
      const owner = this.#recipientOwners.get(recipientId);
      if (owner === undefined || this.#assign(owner, visited)) {
        this.#recipientOwners.set(recipientId, giverId);
        return true;
      }
    }
    return false;
  }

  #shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.#randomInt(i + 1);
      if (!Number.isInteger(j) || j < 0 || j > i) throw new RangeError('Invalid random source.');
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
