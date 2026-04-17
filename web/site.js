import { initCookieBanner } from '/js/shared/cookieBanner.js';
import { initMobileNav } from '/js/shared/mobileNav.js';
import { initRevealOnScroll } from '/js/shared/reveal.js';
import { initScrollTop } from '/js/shared/scrollTop.js';
import { initServiceWorkerUpdates } from '/js/shared/serviceWorker.js';

initMobileNav({ triggerId: 'navHamburger', navId: 'navLinks' });
initRevealOnScroll({ threshold: 0.05, staggerMs: 80 });
initScrollTop({ buttonId: 'scrollTopBtn', threshold: 320 });
initCookieBanner({
  bannerId: 'cookieBanner',
  acceptId: 'cookieAccept',
  rejectId: 'cookieReject',
  storageKey: 'etiove_cookie_consent',
});
initServiceWorkerUpdates({ scriptUrl: '/sw.js' });

const quizRoot = document.getElementById('webQuizRoot');

if (quizRoot) {
  let quizLoaded = false;
  const loadQuizModule = async () => {
    if (quizLoaded) return;
    quizLoaded = true;
    const { initQuiz } = await import('/quiz.js?v=20260417b');
    initQuiz();
  };
  // Cargar SIEMPRE el quiz, sin esperar al scroll/intersection
  loadQuizModule();
}
