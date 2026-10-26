import { Controller } from '../vendor/stimulus.js';
import { Invitation } from '../../../packages/core/invitations.js';

export default class extends Controller {
  static targets = ['greeting', 'reveal', 'details', 'recipient', 'hint', 'exchange', 'budget', 'date', 'instructions', 'error'];

  connect() {
    this.load();
  }

  disconnect() {
    this.invitation = null;
    this.clear();
  }

  load() {
    this.clear();
    this.invitation = null;
    this.errorTarget.hidden = true;
    this.revealTarget.hidden = true;
    try {
      this.invitation = Invitation.fromFragment(location.hash);
      this.greetingTarget.textContent = `${this.invitation.giver}, your Secret Santa draw is ready.`;
      this.revealTarget.hidden = false;
      this.revealTarget.disabled = false;
    } catch (error) {
      this.greetingTarget.textContent = 'We could not open this invitation.';
      this.errorTarget.textContent = error.message;
      this.errorTarget.hidden = false;
    }
    this.dispatch('ready');
  }

  clear() {
    this.detailsTarget.hidden = true;
    for (const name of ['recipient', 'hint', 'exchange', 'budget', 'date', 'instructions']) {
      this[`${name}Target`].textContent = '';
    }
  }

  reveal() {
    if (!this.invitation) return;
    const { recipient, hint, exchange } = this.invitation;
    this.recipientTarget.textContent = recipient;
    this.exchangeTarget.textContent = exchange.name;
    this.hintTarget.textContent = hint;
    this.hintTarget.hidden = !hint;
    this.budgetTarget.textContent = exchange.budget ? `Budget: ${exchange.budget}` : '';
    this.dateTarget.textContent = exchange.date ? `Exchange date: ${exchange.date}` : '';
    this.instructionsTarget.textContent = exchange.instructions;
    this.detailsTarget.hidden = false;
    this.revealTarget.hidden = true;
    this.recipientTarget.focus();
  }
}
