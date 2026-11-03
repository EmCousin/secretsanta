import { Controller } from '../vendor/stimulus.js';

export default class extends Controller {
  static targets = ['dialog'];

  open() {
    if (!this.dialogTarget.open) this.dialogTarget.showModal();
  }

  close() {
    if (this.dialogTarget.open) this.dialogTarget.close();
  }

  backdrop(event) {
    if (event.target === this.dialogTarget) this.close();
  }
}
