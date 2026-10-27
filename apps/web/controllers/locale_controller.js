import { Controller } from '../vendor/stimulus.js';
import { i18n, setLanguage } from '../localization.js';

export default class extends Controller {
  static targets = ['menu', 'trigger', 'current', 'currentIcon', 'choices', 'option'];

  connect() {
    this.render();
    this.choicesTarget.disabled = false;
    this.triggerTarget.removeAttribute('aria-disabled');
  }

  change(event) {
    if (this.optionTargets.includes(event.target) && event.target.checked) setLanguage(event.target.value);
  }

  render() {
    for (const option of this.optionTargets) option.checked = option.value === i18n.preference;
    const choice = this.optionTargets.find(option => option.checked).nextElementSibling;
    this.currentTarget.textContent = choice.querySelector('.language-name').textContent;
    this.currentIconTarget.setAttribute('src', choice.querySelector('img').getAttribute('src'));
    this.position();
  }

  choose(event) {
    // Label activation dispatches a click on its native radio. Keyboard clicks
    // have detail 0: keep arrows/Space usable until Enter or Escape closes it.
    if (event.detail > 0 && this.optionTargets.includes(event.target)) this.close(true);
  }

  commit() { this.close(true); }

  focusOptions() {
    this.menuTarget.open = true;
    this.position();
    this.optionTargets.find(option => option.checked).focus();
  }

  close(restoreFocus = false) {
    const wasOpen = this.menuTarget.open;
    this.menuTarget.open = false;
    if (wasOpen && restoreFocus) this.triggerTarget.focus({ preventScroll: true });
  }

  outside(event) {
    if (!this.element.contains(event.target)) this.close();
  }

  escape(event) {
    if (!this.menuTarget.open) return;
    event.preventDefault();
    this.close(true);
  }

  position() {
    if (!this.menuTarget.open) return;
    const trigger = this.triggerTarget.getBoundingClientRect();
    if (trigger.bottom <= 0 || trigger.top >= innerHeight) {
      this.close();
      return;
    }
    const below = innerHeight - trigger.bottom - 16;
    const above = trigger.top - 16;
    const upwards = below < 160 && above > below;
    this.menuTarget.classList.toggle('opens-up', upwards);
    // Only a numeric viewport measurement reaches CSS, never user content.
    this.choicesTarget.style.maxHeight = `${Math.max(0, Math.floor(upwards ? above : below))}px`;
  }

  detect() {
    if (!i18n.preference) setLanguage('');
  }
}
