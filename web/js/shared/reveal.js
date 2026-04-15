export function initRevealOnScroll({
  selector = '.reveal',
  threshold = 0.05,
  staggerMs = 100,
} = {}) {
  const reveals = document.querySelectorAll(selector);

  if (!reveals.length) {
    return;
  }

  if (!('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }, index * staggerMs);
        }
      });
    },
    { threshold, rootMargin: '0px 0px -40px 0px' }
  );

  reveals.forEach((el) => observer.observe(el));
}
