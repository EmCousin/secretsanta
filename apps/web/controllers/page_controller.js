import { Controller } from '../vendor/stimulus.js';

export default class extends Controller {
  static targets = ['organiser', 'invitation', 'startup', 'welcome', 'workspace', 'start'];

  connect() {
    this.route();
  }

  route(event) {
    const isInvitation = location.hash.startsWith('#santa=');
    this.element.dataset.view = isInvitation ? 'invitation' : 'organiser';
    this.welcomeTarget.hidden = isInvitation;
    this.organiserTarget.hidden = isInvitation;
    this.invitationTarget.hidden = !isInvitation;
    if (isInvitation) {
      this.invitationTarget.setAttribute('data-controller', 'invitation');
      this.invitationTarget.dispatchEvent(new Event('invitation:reload'));
    } else {
      this.invitationTarget.removeAttribute('data-controller');
    }
    if (event?.type === 'hashchange') this.workspaceTarget.focus();
  }

  ready(event) {
    this.startupTarget.hidden = true;
    if (event.target === this.organiserTarget) this.startTarget.disabled = false;
  }

  start() {
    this.organiserTarget.dispatchEvent(new Event('exchange:start'));
  }

  skip() {
    // The invitation lives in the URL fragment. Move focus without replacing it.
    this.workspaceTarget.focus();
  }
}
