import { Controller } from '../vendor/stimulus.js';
import { i18n } from '../localization.js';

export default class extends Controller {
  static targets = ['status', 'update', 'confirm'];

  async connect() {
    this.element.hidden = false;
    this.state = 'pwa.preparing';
    this.localize();
    this.abort = new AbortController();
    if (!('serviceWorker' in navigator) || !isSecureContext) {
      this.state = 'pwa.unsupported';
      this.localize();
      return;
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (this.applyingUpdate) location.reload();
      else this.inspect();
    }, { signal: this.abort.signal });
    try {
      const url = new URL('../../../service-worker.js', import.meta.url);
      this.registration = await navigator.serviceWorker.register(url, { scope: new URL('./', url).pathname, updateViaCache: 'none' });
      if (!this.element.isConnected) return;
      this.registration.addEventListener('updatefound', () => this.watchInstall(), { signal: this.abort.signal });
      this.watchInstall();
      this.inspect();
    } catch {
      this.state = 'pwa.failed';
      this.localize();
    }
  }

  disconnect() { this.abort?.abort(); }

  watchInstall() {
    const worker = this.registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'redundant' && !this.registration.active) this.state = 'pwa.failed';
      this.inspect();
    }, { signal: this.abort.signal });
  }

  inspect() {
    if (!this.registration) return;
    if (this.registration.active?.state === 'activated') this.state = 'pwa.ready';
    this.updateTarget.hidden = !this.registration.waiting;
    this.localize();
  }

  localize() {
    const key = this.state === 'pwa.ready' && !navigator.onLine ? 'pwa.offlineReady' : this.state;
    this.statusTarget.textContent = i18n.t(key || 'pwa.preparing');
  }

  requestUpdate() { this.confirmTarget.showModal(); }
  cancelUpdate() { this.confirmTarget.close(); }

  applyUpdate() {
    this.confirmTarget.close();
    this.applyingUpdate = true;
    if (this.registration.waiting) this.registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
    else location.reload();
  }
}
