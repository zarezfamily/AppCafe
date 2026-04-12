export function initMobileNav({
  triggerId = 'navHamburger',
  navId = 'navLinks',
  openClassName = 'is-open',
} = {}) {
  const hamburger = document.getElementById(triggerId);
  const navLinks = document.getElementById(navId);

  if (!hamburger || !navLinks) {
    return;
  }

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle(openClassName);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });
}
