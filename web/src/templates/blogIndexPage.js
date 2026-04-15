const { blogCategories } = require('../data/blogCategories');
const { blogPosts } = require('../data/blogPosts');
const { renderSiteFooter, renderScrollTopButton } = require('./partials');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPostCards() {
  return blogPosts
    .map(
      (post) => `
        <article class="card" data-category="${escapeHtml(post.category)}" data-post-url="/blog/${escapeHtml(post.slug)}.html" data-search="${escapeHtml(post.search)}">
          <a class="card-link" href="/blog/${escapeHtml(post.slug)}.html">
            <div class="card-thumb">
              <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}" loading="lazy" width="900" height="248" />
              <span class="card-tag">${escapeHtml(post.categoryLabel)}</span>
            </div>
            <div class="card-body">
              <p class="card-date">${escapeHtml(post.dateLabel)}</p>
              <h2 class="card-title">${escapeHtml(post.title)}</h2>
              <p class="card-excerpt">${escapeHtml(post.excerpt)}</p>
              <span class="read-link">Leer artículo <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>
            </div>
          </a>
        </article>`
    )
    .join('\n');
}

function renderFilterButtons() {
  return blogCategories
    .map(
      (category, index) => `
        <button class="filter-btn${index === 0 ? ' active' : ''}" data-filter="${escapeHtml(category.slug)}">${escapeHtml(category.label)}</button>`
    )
    .join('');
}

function renderItemListJson() {
  const itemListElement = blogPosts.map((post, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `https://etiove.com/blog/${post.slug}.html`,
    name: post.title,
  }));

  return JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Blog',
          '@id': 'https://etiove.com/blog/#blog',
          name: 'Blog Etiove',
          description: 'Guías, tutoriales y análisis para amantes del café de especialidad.',
          url: 'https://etiove.com/blog/',
          inLanguage: 'es-ES',
          publisher: {
            '@type': 'Organization',
            '@id': 'https://etiove.com/#organization',
            name: 'Etiove',
            url: 'https://etiove.com/',
            logo: {
              '@type': 'ImageObject',
              url: 'https://etiove.com/favicon.svg',
              width: 512,
              height: 512,
            },
          },
        },
        {
          '@type': 'ItemList',
          '@id': 'https://etiove.com/blog/#posts',
          name: 'Artículos del blog Etiove',
          url: 'https://etiove.com/blog/',
          numberOfItems: blogPosts.length,
          itemListElement,
        },
      ],
    },
    null,
    2
  );
}

function renderBlogIndexPage() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
  <link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-title" content="Etiove" />
  <meta name="theme-color" content="#21150f" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Blog Etiove | Café de Especialidad</title>
  <meta name="description" content="Guías, tutoriales y análisis para amantes del café de especialidad. Aprende, cata y elige mejor cada taza con Etiove." />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <link rel="canonical" href="https://etiove.com/blog/" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Etiove" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:title" content="Blog Etiove | Café de Especialidad" />
  <meta property="og:description" content="Guías y contenido para amantes del café de especialidad: aprende, cata y elige mejor cada taza." />
  <meta property="og:url" content="https://etiove.com/blog/" />
  <meta property="og:image" content="https://etiove.com/og-image.jpg" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1500" />
  <meta property="og:image:height" content="500" />
  <meta property="og:image:alt" content="Blog Etiove sobre cafe de especialidad" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Blog Etiove | Café de Especialidad" />
  <meta name="twitter:description" content="Guías y contenido para amantes del café de especialidad." />
  <meta name="twitter:image" content="https://etiove.com/og-image.jpg" />
  <meta name="twitter:image:alt" content="Blog Etiove sobre cafe de especialidad" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:wght@400;500&display=swap" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/blog/index.css" />
  <script type="application/ld+json">
${renderItemListJson()}
  </script>
  <link rel="search" type="application/opensearchdescription+xml" title="Blog Etiove" href="/opensearch.xml" />
</head>
<body>

  <nav>
    <a class="nav-wordmark" href="/">Etiove</a>
    <div class="nav-links" id="navLinks">
      <a class="nav-link" href="/">Inicio</a>
      <a class="nav-link" href="/blog/">Blog</a>
      <a class="nav-link" href="/comunidad.html">Comunidad</a>
    </div>
    <button class="nav-hamburger" id="navHamburger" aria-label="Menú" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </nav>

  <section class="hero">
    <div class="hero-bg"></div>
    <div class="hero-overlay"></div>
    <div class="aura aura-1" aria-hidden="true"></div>
    <div class="aura aura-2" aria-hidden="true"></div>
    <div class="hero-content">
      <p class="hero-eyebrow">Blog Etiove &middot; Caf&eacute; de Especialidad</p>
      <h1 class="hero-title">El Arte <em>del Caf&eacute;</em></h1>
      <p class="hero-tagline">Gu&iacute;as, tutoriales y an&aacute;lisis para entender el origen, la molienda y cada m&eacute;todo de preparaci&oacute;n</p>
      <div class="hero-divider"><span></span></div>
      <span class="hero-badge">Contenido curado Etiove</span>
    </div>
    <div class="hero-scroll" aria-hidden="true">
      <span>Scroll</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </div>
  </section>

  <section class="articles">
    <div class="container">
      <p class="section-label">Art&iacute;culos</p>
      <h2 class="section-title">Aprende, cata y elige mejor</h2>
      <p class="section-intro">Contenido editorial de Etiove para profundizar en café de especialidad, molienda, origen, métodos y decisiones de compra con más criterio.</p>

      <div class="filters">
${renderFilterButtons()}
        <div class="search-wrap">
          <input id="postSearch" class="search-box" type="search" placeholder="Busca palabras o frases dentro de los posts" aria-label="Buscar dentro de los posts" />
          <span id="searchCount" class="search-count">${blogPosts.length} posts</span>
          <button id="clearSearch" class="search-clear" type="button" aria-label="Limpiar búsqueda">×</button>
        </div>
      </div>

      <div id="searchStatus" class="search-status"></div>

      <div class="grid" id="postGrid">
${renderPostCards()}
      </div>
      <div id="blogPager"></div>
    </div>
  </section>

${renderSiteFooter()}
${renderScrollTopButton()}
  <script type="module" src="/blog/index.js"></script>
</body>
</html>
`;
}

module.exports = {
  renderBlogIndexPage,
};
