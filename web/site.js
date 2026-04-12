import { initCookieBanner } from '/js/shared/cookieBanner.js';
import { initRevealOnScroll } from '/js/shared/reveal.js';
import { initScrollTop } from '/js/shared/scrollTop.js';
import { initServiceWorkerUpdates } from '/js/shared/serviceWorker.js';

initRevealOnScroll({ threshold: 0.1, staggerMs: 100 });
initScrollTop({ buttonId: 'scrollTopBtn', threshold: 320 });
initCookieBanner({
  bannerId: 'cookieBanner',
  acceptId: 'cookieAccept',
  rejectId: 'cookieReject',
  storageKey: 'etiove_cookie_consent',
});
initServiceWorkerUpdates({ scriptUrl: '/sw.js' });
