export function initCookieBanner({
  bannerId = 'cookieBanner',
  acceptId = 'cookieAccept',
  rejectId = 'cookieReject',
  storageKey = 'etiove_cookie_consent',
} = {}) {
  const banner = document.getElementById(bannerId);

  if (!banner) {
    return;
  }

  if (!localStorage.getItem(storageKey)) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        banner.classList.add('visible');
      }, 600);
    });
  }

  function dismiss(value) {
    localStorage.setItem(storageKey, value);
    banner.classList.remove('visible');

    setTimeout(() => {
      banner.style.display = 'none';
    }, 450);
  }

  const acceptBtn = document.getElementById(acceptId);
  const rejectBtn = document.getElementById(rejectId);

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      dismiss('accepted');
    });
  }

  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => {
      dismiss('essential');
    });
  }
}
