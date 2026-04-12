export function initRevealOnScroll({
  selector = '.reveal',
  threshold = 0.1,
  staggerMs = 100,
} = {}) {
  const reveals = document.querySelectorAll(selector);

  if (!reveals.length) {
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, index * staggerMs);
      }
    });
  }, { threshold });

  reveals.forEach((el) => observer.observe(el));
}
