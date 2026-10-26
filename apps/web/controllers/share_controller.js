import { Controller } from '../vendor/stimulus.js';
import { i18n } from '../localization.js';

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
      this.say('share.copied');
    } catch {
      this.select();
      this.say('share.copyFailed');
    }
  }

  async share() {
    try {
      await navigator.share({
        title: i18n.t('share.title'),
        text: i18n.t('share.text', { name: this.giverValue }),
        url: this.linkTarget.value,
      });
      this.say('share.finished');
    } catch (error) {
      if (error.name === 'AbortError') {
        this.say('share.cancelled');
      } else {
        this.select();
        this.say('share.failed');
      }
    }
  }

  say(key) {
    this.statusKey = key;
    this.localize();
  }

  localize() {
    if (this.statusKey) this.statusTarget.textContent = i18n.t(this.statusKey);
  }
}
