import { Application } from './vendor/stimulus.js';
import PageController from './controllers/page_controller.js';
import ExchangeController from './controllers/exchange_controller.js';
import InvitationController from './controllers/invitation_controller.js';
import ShareController from './controllers/share_controller.js';
import LocaleController from './controllers/locale_controller.js';
import PwaController from './controllers/pwa_controller.js';
import FestivityController from './controllers/festivity_controller.js';
import { i18n } from './localization.js';

// Hotwire Native's adapter needs Turbo. Keep normal browser navigation and the
// single-page form under this app's control rather than intercepting them.
if (/Hotwire Native (Android|iOS)/.test(navigator.userAgent)) {
  const turbo = await import('./vendor/turbo.js');
  turbo.session.drive = false;
}

const application = Application.start();
application.register('page', PageController);
application.register('exchange', ExchangeController);
application.register('invitation', InvitationController);
application.register('share', ShareController);
application.register('locale', LocaleController);
application.register('pwa', PwaController);
application.register('festivity', FestivityController);

// Stimulus normally logs controller state with exceptions. Keep personal data out
// of logs and provide a visible recovery message instead.
application.handleError = () => {
  const status = document.getElementById('startup');
  status.hidden = false;
  status.dataset.i18n = 'app.error';
  status.textContent = i18n.t('app.error');
};
