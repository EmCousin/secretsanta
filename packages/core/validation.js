export const LIMITS = Object.freeze({ participants: 50, name: 60, hint: 240, title: 80, budget: 80, instructions: 600 });

export class ValidationError extends Error {
  constructor(message, code = 'validation.invalid', params = {}) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.params = Object.freeze({ ...params });
  }
}

export function text(value, label, max, required = false) {
  if (typeof value !== 'string') throw new ValidationError(`${label} must be text.`, 'validation.text');
  const result = value.trim().normalize('NFC');
  if (required && !result) throw new ValidationError(`${label} is required.`, 'validation.required');
  if (result.length > max) throw new ValidationError(`${label} must be ${max} characters or fewer.`, 'validation.max', { max });
  return result;
}

export function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${label} is not valid.`);
  }
  return value;
}

export function validateExchange(value) {
  record(value, 'Exchange');
  const date = text(value.date ?? '', 'Date', 10);
  if (date) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!match) throw new ValidationError('Choose a valid date.', 'validation.date');
    const [, year, month, day] = match.map(Number);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (!year || !month || month > 12 || !day || day > days[month - 1]) {
      throw new ValidationError('Choose a valid date.', 'validation.date');
    }
  }
  return {
    name: text(value.name, 'Exchange name', LIMITS.title, true),
    budget: text(value.budget ?? '', 'Budget', LIMITS.budget),
    date,
    instructions: text(value.instructions ?? '', 'Instructions', LIMITS.instructions),
  };
}

export function validateParticipants(value) {
  if (!Array.isArray(value) || value.length < 2 || value.length > LIMITS.participants) {
    throw new ValidationError(`Add between 2 and ${LIMITS.participants} people.`, 'validation.people', { max: LIMITS.participants });
  }
  const ids = new Set();
  const names = new Set();
  return value.map((participant, index) => {
    record(participant, `Person ${index + 1}`);
    const id = participant.id;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(id) || ids.has(id)) {
      throw new ValidationError('Each person needs a unique valid ID.', 'validation.id');
    }
    const name = text(participant.name, `Name for person ${index + 1}`, LIMITS.name, true);
    const comparison = name.toLowerCase();
    if (names.has(comparison)) throw new ValidationError(`Use distinct names. Add a surname or nickname for ${name}.`, 'validation.duplicateName', { name });
    ids.add(id);
    names.add(comparison);
    return { id, name, hint: text(participant.hint ?? '', `Gift hint for ${name}`, LIMITS.hint) };
  });
}

export function validateExclusions(value, participants) {
  if (!Array.isArray(value) || value.length > LIMITS.participants ** 2) {
    throw new ValidationError('The exclusion list is not valid.', 'validation.exclusions');
  }
  const ids = new Set(participants.map(person => person.id));
  const seen = new Set();
  return value.map(rule => {
    record(rule, 'Exclusion');
    if (!ids.has(rule.giverId) || !ids.has(rule.recipientId)) {
      throw new ValidationError('An exclusion refers to someone who is no longer in the exchange.', 'validation.missingPerson');
    }
    const key = JSON.stringify([rule.giverId, rule.recipientId]);
    if (seen.has(key)) throw new ValidationError('That exclusion is already in the list.', 'validation.duplicateRule');
    seen.add(key);
    return { giverId: rule.giverId, recipientId: rule.recipientId };
  });
}
