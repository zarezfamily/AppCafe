export function initScrollTop({
  buttonId = 'scrollTopBtn',
  threshold = 200,
} = {}) {
  const scrollTopBtn = document.getElementById(buttonId);

  if (!scrollTopBtn) {
    return;
  }

  window.addEventListener('scroll', () => {
    scrollTopBtn.classList.toggle('visible', window.scrollY > threshold);
  });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
