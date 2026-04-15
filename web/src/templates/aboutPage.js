const { renderScrollTopButton, renderSiteFooter } = require('./partials');

function renderAboutPage(page) {
  const canonicalUrl = page.canonicalUrl || `https://etiove.com/${page.slug}.html`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${page.title}</title>
  <meta name="description" content="${page.description}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta name="robots" content="${page.robots}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Etiove" />
  <meta property="og:title" content="${page.ogTitle}" />
  <meta property="og:description" content="${page.ogDescription}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="https://etiove.com/og-image.jpg" />
  <meta property="og:image:alt" content="Etiove, comunidad de cafe de especialidad" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${page.ogTitle}" />
  <meta name="twitter:description" content="${page.ogDescription}" />
  <meta name="twitter:image" content="https://etiove.com/og-image.jpg" />
  <meta name="twitter:image:alt" content="Etiove, comunidad de cafe de especialidad" />
  <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
  <link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-title" content="Etiove" />
  <meta name="theme-color" content="#21150f" />
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="search" type="application/opensearchdescription+xml" title="Blog Etiove" href="/opensearch.xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": "${canonicalUrl}",
    "url": "${canonicalUrl}",
    "name": "${page.schemaName}",
    "description": "${page.schemaDescription}",
    "publisher": {
      "@type": "Organization",
      "@id": "https://etiove.com/#organization",
      "name": "Etiove",
      "url": "https://etiove.com/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://etiove.com/favicon.svg"
      },
      "foundingDate": "2025",
      "foundingLocation": { "@type": "Place", "addressCountry": "ES" },
      "sameAs": [
        "https://instagram.com/etiove_cafe",
        "https://x.com/etiove_cafe",
        "https://tiktok.com/@etiove"
      ]
    }
  }
  </script>

  <link rel="stylesheet" href="/about.css" />
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

  <div class="page-hero" id="main-content">
    <p class="page-eyebrow">Nuestra historia</p>
    <h1 class="page-title">El café de especialidad<br>merece una <em>comunidad</em><br>a su altura.</h1>
    <p class="page-lead">Etiove nació en España con una idea simple: que los amantes del café de especialidad merecen un lugar donde aprender, compartir y conectar sin ruido.</p>
  </div>

  <div class="content">
${page.bodyHtml}
  </div>
${renderSiteFooter()}
${renderScrollTopButton()}
  <script type="module" src="/about.js"></script>
</body>
</html>
`;
}

module.exports = {
  renderAboutPage,
};
