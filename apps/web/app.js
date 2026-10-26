import { Application, Controller } from './vendor/stimulus.js';

class HelloController extends Controller {
  static targets = ['status'];

  connect() {
    this.statusTarget.textContent = 'The static app is ready. The draw experience is being implemented in the next pull requests.';
  }
}

const application = Application.start();
application.register('hello', HelloController);
