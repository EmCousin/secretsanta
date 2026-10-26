import { Controller } from '../vendor/stimulus.js';
import { i18n, setLanguage } from '../localization.js';

export default class extends Controller {
  static targets = ['select'];

  connect() {
    this.selectTarget.value = i18n.preference;
    this.selectTarget.disabled = false;
  }

  change() { setLanguage(this.selectTarget.value); }

  detect() {
    if (!i18n.preference) setLanguage('');
  }
}
