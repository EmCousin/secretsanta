import { Controller } from '../vendor/stimulus.js';
import { Invitation } from '../../../packages/core/invitations.js';
import { i18n } from '../localization.js';

export default class extends Controller {
  static targets = ['greeting', 'reveal', 'details', 'recipient', 'hint', 'exchange', 'budget', 'date', 'instructions', 'error'];

  connect() {
    this.load();
  }

  disconnect() {
    this.invitation = null;
    this.revealed = false;
    this.loadError = null;
    this.clear();
  }

  load() {
    this.clear();
    this.invitation = null;
    this.revealed = false;
    this.loadError = null;
    this.errorTarget.hidden = true;
    this.revealTarget.hidden = true;
    try {
      this.invitation = Invitation.fromFragment(location.hash);
      this.revealTarget.hidden = false;
      this.revealTarget.disabled = false;
    } catch (error) {
      this.loadError = error;
      this.errorTarget.hidden = false;
    }
    this.localize();
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
    this.revealed = true;
    this.localize();
    this.recipientTarget.focus();
  }

  localize() {
    if (this.loadError) {
      this.greetingTarget.textContent = i18n.t('participant.openError');
      this.errorTarget.textContent = i18n.error(this.loadError);
      return;
    }
    if (!this.invitation) return;
    this.greetingTarget.textContent = i18n.t('participant.greeting', { name: this.invitation.giver });
    if (!this.revealed) return;
    const { recipient, hint, exchange } = this.invitation;
    this.recipientTarget.textContent = recipient;
    this.exchangeTarget.textContent = exchange.name;
    this.hintTarget.textContent = hint;
    this.hintTarget.hidden = !hint;
    this.budgetTarget.textContent = exchange.budget ? i18n.t('participant.budget', { budget: exchange.budget }) : '';
    this.dateTarget.textContent = exchange.date ? i18n.t('participant.date', { date: i18n.date(exchange.date) }) : '';
    this.instructionsTarget.textContent = exchange.instructions;
    this.detailsTarget.hidden = false;
    this.revealTarget.hidden = true;
  }
}
