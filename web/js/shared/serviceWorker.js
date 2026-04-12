export function initServiceWorkerUpdates({
  scriptUrl = '/sw.js',
} = {}) {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(scriptUrl)
      .then((reg) => {
        reg.update();
      })
      .catch(() => {
        /* SW not critical */
      });
  });
}
