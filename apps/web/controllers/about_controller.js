import { Controller } from '../vendor/stimulus.js';

export default class extends Controller {
  static targets = ['dialog'];

  open() {
    this.dialogTarget.showModal();
  }

  close() {
    this.dialogTarget.close();
  }
}
