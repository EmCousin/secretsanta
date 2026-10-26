import { Controller } from '../vendor/stimulus.js';
import { i18n } from '../localization.js';

const MOTION_KEY = 'secretsanta.motion';

export default class extends Controller {
  static targets = ['toggle'];

  connect() {
    this.media = matchMedia('(prefers-reduced-motion: reduce)');
    try { this.paused = localStorage.getItem(MOTION_KEY) === 'paused'; } catch { this.paused = false; }
    this.abort = new AbortController();
    this.media.addEventListener('change', () => this.render(), { signal: this.abort.signal });
    this.render();
  }

  disconnect() { this.abort.abort(); }

  toggle() {
    if (this.media.matches) return;
    this.paused = !this.paused;
    try { localStorage.setItem(MOTION_KEY, this.paused ? 'paused' : 'playing'); } catch { /* Motion control still works in memory. */ }
    this.render();
  }

  render() {
    const reduced = this.media.matches;
    const paused = reduced || this.paused;
    this.element.dataset.motion = paused ? 'paused' : 'playing';
    this.toggleTarget.disabled = reduced;
    this.toggleTarget.textContent = i18n.t(reduced ? 'design.motionReduced' : paused ? 'design.play' : 'design.pause');
  }
}
