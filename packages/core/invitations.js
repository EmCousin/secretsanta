import { LIMITS, record, text, validateExchange, ValidationError } from './validation.js';

export const INVITATION_VERSION = 1;
export const MAX_FRAGMENT_LENGTH = 8000;

function validatePayload(value) {
  record(value, 'Invitation');
  if (value.v !== INVITATION_VERSION) throw new ValidationError('This invitation version is not supported. Ask the organiser for a compatible link.', 'invitation.version');
  return {
    v: INVITATION_VERSION,
    giver: text(value.giver, 'Invitation name', LIMITS.name, true),
    recipient: text(value.recipient, 'Recipient name', LIMITS.name, true),
    hint: text(value.hint ?? '', 'Gift hint', LIMITS.hint),
    exchange: validateExchange(value.exchange),
  };
}

function toBase64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export class Invitation {
  constructor(value) {
    Object.assign(this, validatePayload(value));
    Object.freeze(this.exchange);
    Object.freeze(this);
  }

  static fromFragment(fragment) {
    if (typeof fragment !== 'string' || fragment.length > MAX_FRAGMENT_LENGTH) throw new ValidationError('This invitation is too long or incomplete. Ask the organiser to resend it.', 'invitation.tooLong');
    const match = /^#santa=(\d+)\.([A-Za-z0-9_-]+)$/.exec(fragment);
    if (!match) throw new ValidationError('This invitation is incomplete or damaged. Ask the organiser to resend the whole link.', 'invitation.damaged');
    if (match[1] !== String(INVITATION_VERSION)) throw new ValidationError('This invitation version is not supported. Ask the organiser for a compatible link.', 'invitation.version');
    let value;
    try {
      const encoded = match[2].replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
      if (toBase64url(bytes) !== match[2]) throw new Error('Non-canonical encoding');
      value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
      throw new ValidationError('This invitation is incomplete or damaged. Ask the organiser to resend the whole link.', 'invitation.damaged');
    }
    return new Invitation(value);
  }

  toFragment() {
    const encoded = toBase64url(new TextEncoder().encode(JSON.stringify(this)));
    const fragment = `#santa=${INVITATION_VERSION}.${encoded}`;
    if (fragment.length > MAX_FRAGMENT_LENGTH) throw new ValidationError('This invitation is too long. Shorten the instructions or gift hint.', 'invitation.encodeLong');
    return fragment;
  }

  toUrl(base) {
    let url;
    try { url = new URL(base); } catch { throw new ValidationError('The website address is not valid.', 'invitation.url'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new ValidationError('Invitations need an HTTP or HTTPS website address without login details.', 'invitation.protocol');
    }
    url.search = '';
    url.hash = this.toFragment();
    return url.href;
  }

  toJSON() {
    return { v: this.v, giver: this.giver, recipient: this.recipient, hint: this.hint, exchange: { ...this.exchange } };
  }
}
