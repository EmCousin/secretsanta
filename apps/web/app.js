import { Application } from './vendor/stimulus.js';
import PageController from './controllers/page_controller.js';
import ExchangeController from './controllers/exchange_controller.js';
import InvitationController from './controllers/invitation_controller.js';
import ShareController from './controllers/share_controller.js';
import LocaleController from './controllers/locale_controller.js';
import { i18n } from './localization.js';

const application = Application.start();
application.register('page', PageController);
application.register('exchange', ExchangeController);
application.register('invitation', InvitationController);
application.register('share', ShareController);
application.register('locale', LocaleController);

// Stimulus normally logs controller state with exceptions. Keep personal data out
// of logs and provide a visible recovery message instead.
application.handleError = () => {
  const status = document.getElementById('startup');
  status.hidden = false;
  status.dataset.i18n = 'app.error';
  status.textContent = i18n.t('app.error');
};
