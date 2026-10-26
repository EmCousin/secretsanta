import { Controller } from '../vendor/stimulus.js';

export default class extends Controller {
  static targets = ['link', 'copy', 'share', 'status'];
  static values = { giver: String };

  connect() {
    this.copyTarget.hidden = typeof navigator.clipboard?.writeText !== 'function';
    this.shareTarget.hidden = typeof navigator.share !== 'function';
  }

  select() {
    this.linkTarget.focus();
    this.linkTarget.select();
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.linkTarget.value);
      this.statusTarget.textContent = 'Copied. Send this link only to the person named above.';
    } catch {
      this.select();
      this.statusTarget.textContent = 'Copy was blocked. Select and copy the invitation link manually.';
    }
  }

  async share() {
    try {
      await navigator.share({
        title: 'Your Secret Santa invitation',
        text: `${this.giverValue}, here is your Secret Santa invitation. Please keep this link private.`,
        url: this.linkTarget.value,
      });
      this.statusTarget.textContent = 'Sharing finished. We cannot check whether the invitation was delivered.';
    } catch (error) {
      if (error.name === 'AbortError') {
        this.statusTarget.textContent = 'Sharing cancelled. You can send the invitation later.';
      } else {
        this.select();
        this.statusTarget.textContent = 'Sharing is unavailable. Copy the invitation link and send it privately.';
      }
    }
  }
}
