function initBlogPostNav({
  triggerId = 'navHamburger',
  navId = 'navLinks',
  openClassName = 'open',
} = {}) {
  const button = document.getElementById(triggerId);
  const links = document.getElementById(navId);

  if (!button || !links) {
    return;
  }

  const closeNav = () => {
    links.classList.remove(openClassName);
    button.classList.remove(openClassName);
    button.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  const openNav = () => {
    links.classList.add(openClassName);
    button.classList.add(openClassName);
    button.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  button.addEventListener('click', () => {
    const isOpen = links.classList.contains(openClassName);
    if (isOpen) {
      closeNav();
      return;
    }

    openNav();
  });

  links.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && links.classList.contains(openClassName)) {
      closeNav();
    }
  });
}

initBlogPostNav();
