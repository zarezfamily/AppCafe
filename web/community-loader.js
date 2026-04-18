const forumSection = document.getElementById('forum');

if (forumSection) {
  let communityLoaded = false;

  const loadCommunityScript = () => {
    if (communityLoaded) return;
    communityLoaded = true;

    const script = document.createElement('script');
    script.src = '/community.js?v=20260418a';
    script.defer = true;
    document.body.appendChild(script);
  };

  const shouldLoadImmediately = window.location.hash === '#forum';

  if (shouldLoadImmediately) {
    loadCommunityScript();
  } else if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          loadCommunityScript();
        });
      },
      {
        rootMargin: '600px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(forumSection);
  } else {
    loadCommunityScript();
  }
}
