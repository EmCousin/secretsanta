import { LIMITS, record, text, validateParticipants, validateExclusions, validateExchange, ValidationError } from '../../packages/core/validation.js';
import { Invitation } from '../../packages/core/invitations.js';

export const STORAGE_KEY = 'secretsanta.saved.v1';
const MAX_SAVED_LENGTH = 500000;

export function validateSaved(value) {
  record(value, 'Saved copy');
  if (value.v !== 1) throw new ValidationError('This saved copy uses an unsupported version.');
  const draft = record(value.draft, 'Saved draft');
  if (!Array.isArray(draft.participants) || draft.participants.length > LIMITS.participants) throw new ValidationError('The saved participant list is not valid.');
  const ids = new Set();
  const participants = draft.participants.map(person => {
    record(person, 'Saved person');
    if (typeof person.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(person.id) || ids.has(person.id)) throw new ValidationError('The saved participant IDs are not valid.');
    ids.add(person.id);
    return { id: person.id, name: text(person.name, 'Name', LIMITS.name), hint: text(person.hint ?? '', 'Gift hint', LIMITS.hint) };
  });
  record(draft.exchange, 'Saved exchange');
  const name = text(draft.exchange.name, 'Exchange name', LIMITS.title);
  const exchange = { ...validateExchange({ ...draft.exchange, name: name || 'Secret Santa' }), name };
  const exclusions = validateExclusions(draft.exclusions, participants);
  let invitations = null;
  if (value.invitations !== null) {
    validateParticipants(participants);
    validateExchange(exchange);
    if (!Array.isArray(value.invitations) || value.invitations.length !== participants.length) throw new ValidationError('The saved invitations are incomplete.');
    const givers = new Set();
    const recipients = new Set();
    invitations = value.invitations.map(item => {
      record(item, 'Saved invitation');
      const person = participants.find(person => person.id === item.giverId);
      const payload = Invitation.fromFragment(item.fragment);
      const recipient = participants.find(person => person.name === payload.recipient);
      if (!person || person.name !== payload.giver || !recipient || recipient.id === person.id || givers.has(person.id) || recipients.has(recipient.id) || exclusions.some(rule => rule.giverId === person.id && rule.recipientId === recipient.id)) {
        throw new ValidationError('The saved invitations do not match this exchange.');
      }
      if (JSON.stringify(payload.exchange) !== JSON.stringify(exchange) || payload.hint !== recipient.hint) throw new ValidationError('The saved invitation details do not match this exchange.');
      givers.add(person.id);
      recipients.add(recipient.id);
      return { giverId: person.id, fragment: item.fragment };
    });
  }
  return { v: 1, draft: { participants, exchange, exclusions }, invitations };
}

export function saveCopy(value, storage = localStorage) {
  const encoded = JSON.stringify(validateSaved(value));
  if (encoded.length > MAX_SAVED_LENGTH) throw new ValidationError('The saved copy is too large.');
  storage.setItem(STORAGE_KEY, encoded);
}

export function restoreCopy(storage = localStorage) {
  const encoded = storage.getItem(STORAGE_KEY);
  if (encoded === null) return null;
  if (encoded.length > MAX_SAVED_LENGTH) throw new ValidationError('The saved copy is too large to restore.');
  let value;
  try { value = JSON.parse(encoded); } catch { throw new ValidationError('The saved copy is damaged. You can delete it and start again.'); }
  return validateSaved(value);
}

export function deleteCopy(storage = localStorage) {
  storage.removeItem(STORAGE_KEY);
}
