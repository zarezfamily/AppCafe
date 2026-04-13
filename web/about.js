import { initMobileNav } from '/js/shared/mobileNav.js';
import { initScrollTop } from '/js/shared/scrollTop.js';

initMobileNav({
  triggerId: 'navHamburger',
  navId: 'navLinks',
  openClassName: 'is-open',
});

initScrollTop({ buttonId: 'scrollTopBtn', threshold: 200 });
