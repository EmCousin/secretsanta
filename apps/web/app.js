import { Application } from './vendor/stimulus.js';
import PageController from './controllers/page_controller.js';
import ExchangeController from './controllers/exchange_controller.js';
import InvitationController from './controllers/invitation_controller.js';
import ShareController from './controllers/share_controller.js';

const application = Application.start();
application.register('page', PageController);
application.register('exchange', ExchangeController);
application.register('invitation', InvitationController);
application.register('share', ShareController);

// Stimulus normally logs controller state with exceptions. Keep personal data out
// of logs and provide a visible recovery message instead.
application.handleError = () => {
  const status = document.getElementById('startup');
  status.hidden = false;
  status.textContent = 'Something did not load correctly. Reload the page before continuing. Nothing has been sent to an application server.';
};
