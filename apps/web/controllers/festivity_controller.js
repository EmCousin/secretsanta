import { Controller } from '../vendor/stimulus.js';

export default class extends Controller {
  connect() {
    this.media = matchMedia('(prefers-reduced-motion: reduce)');
    this.abort = new AbortController();
    this.media.addEventListener('change', () => this.render(), { signal: this.abort.signal });
    this.render();
  }

  disconnect() { this.abort.abort(); }

  render() {
    this.element.dataset.motion = this.media.matches ? 'paused' : 'playing';
  }
}
