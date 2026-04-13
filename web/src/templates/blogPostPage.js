const { renderBlogPostFooter, renderBlogPostNav, renderScrollTopButton } = require('./partials');

function renderJsonLd(json) {
  return JSON.stringify(json, null, 2);
}

function renderOptionalLink(rel, href) {
  if (!href) {
    return '';
  }

  return `\n  <link rel="${rel}" href="${href}" />`;
}

function renderJsonLdBlock(json) {
  return `  <script type="application/ld+json">
${renderJsonLd(json)}
  </script>`;
}

function renderBlogPostPage(post) {
  const pageTitle = post.pageTitle || post.title;
  const ogTitle = post.ogTitle || `${pageTitle} | Blog Etiove`;
  const twitterTitle = post.twitterTitle || ogTitle;
  const ogImageAlt = post.ogImageAlt || post.hero.imageAlt;
  const extraHeadHtml = post.extraHeadHtml ? `${post.extraHeadHtml}\n` : '';
  const bodyWrapperClass = post.bodyWrapperClass || 'page-body';
  const bodyInnerClass = post.bodyInnerClass || '';
  const beforeNavHtml = post.beforeNavHtml ? `${post.beforeNavHtml}\n` : '';
  const innerOpen = bodyInnerClass ? `\n    <div class="${bodyInnerClass}">` : '';
  const innerClose = bodyInnerClass ? '\n    </div>' : '';
  const extraJsonLdBlocks = (post.extraJsonLd || [])
    .map((json) => renderJsonLdBlock(json))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-title" content="Etiove" />
  <meta name="theme-color" content="#21150f" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pageTitle} | Blog Etiove</title>
  <meta name="author" content="Etiove" />
  <meta name="description" content="${post.description}" />
  <link rel="canonical" href="${post.canonicalUrl}" />
  <link rel="alternate" type="application/rss+xml" title="Blog Etiove - RSS" href="https://etiove.com/feed.xml" />${renderOptionalLink('prev', post.prevUrl)}${renderOptionalLink('next', post.nextUrl)}
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Etiove" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${post.ogDescription || post.description}" />
  <meta property="og:url" content="${post.canonicalUrl}" />
  <meta property="og:image" content="${post.hero.imageSocial}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${ogImageAlt}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${twitterTitle}" />
  <meta name="twitter:description" content="${post.twitterDescription || post.description}" />
  <meta name="twitter:image" content="${post.hero.imageSocial}" />
${extraHeadHtml}  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:wght@400;500&display=swap" />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/blog/post-shell.css" />
  <style>
${post.inlineCss}
  </style>
${renderJsonLdBlock(post.articleJsonLd)}
${extraJsonLdBlocks ? `${extraJsonLdBlocks}\n` : ''}  <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
${renderJsonLdBlock(post.breadcrumbJsonLd)}
</head>
<body>
${beforeNavHtml}${renderBlogPostNav()}

  <header class="post-hero">
    <img
      class="hero-img"
      src="${post.hero.image}"
      alt="${post.hero.imageAlt}"
      loading="eager"
      fetchpriority="high"
      width="1400"
      height="700" />
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <span class="hero-tag">${post.hero.tag}</span>
      <h1 class="hero-title">${post.hero.title}</h1>
      <div class="hero-meta">${post.hero.meta}</div>
    </div>
  </header>

  <main class="${bodyWrapperClass}">${innerOpen}
${post.bodyHtml}${innerClose}
  </main>

${renderScrollTopButton()}
  <script>
    window.ETIOVE_BLOG_POST_CONFIG = {
      postSlug: '${post.slug}',
    };
  </script>
  <script src="/blog/post-shared.js" defer></script>
  <script type="module" src="/blog/post-page.js"></script>
${renderBlogPostFooter()}
</body>
</html>
`;
}

module.exports = {
  renderBlogPostPage,
};
