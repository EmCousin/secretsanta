import { Controller } from '../vendor/stimulus.js';

export default class extends Controller {
  static targets = ['organiser', 'invitation', 'startup'];

  connect() {
    this.route();
  }

  route() {
    const isInvitation = location.hash.startsWith('#santa=');
    this.organiserTarget.hidden = isInvitation;
    this.invitationTarget.hidden = !isInvitation;
    if (isInvitation) {
      this.invitationTarget.setAttribute('data-controller', 'invitation');
      this.invitationTarget.dispatchEvent(new Event('invitation:reload'));
    } else {
      this.invitationTarget.removeAttribute('data-controller');
    }
  }

  ready() {
    this.startupTarget.hidden = true;
  }

  skip() {
    // The invitation lives in the URL fragment. Move focus without replacing it.
    this.element.focus();
  }
}
