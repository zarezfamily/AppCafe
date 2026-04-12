const {
  renderLegalFooter,
  renderLegalNav,
  renderScrollTopButton,
} = require('./partials');

function renderLegalPage(page) {
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
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&display=swap" />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet" defer />
  <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
  <link rel="alternate" type="application/rss+xml" title="Blog Etiove - RSS" href="https://etiove.com/feed.xml" />
  <title>${page.title} | Etiove</title>
  <meta name="description" content="${page.description}" />
  <link rel="canonical" href="https://etiove.com/${page.slug}.html" />
  <meta name="robots" content="noindex, follow" />
  <link rel="stylesheet" href="/legal.css" />
</head>
<body>
${renderLegalNav()}

  <div class="page-wrap">
    <p class="page-eyebrow">Legal</p>
    <h1 class="page-title">${page.title}</h1>
    <p class="page-date">Última actualización: ${page.lastUpdated}</p>

    <div class="legal-body">
${page.bodyHtml}
    </div>
  </div>
${renderLegalFooter()}
${renderScrollTopButton()}
  <script type="module" src="/legal.js"></script>
</body>
</html>
`;
}

module.exports = {
  renderLegalPage,
};
