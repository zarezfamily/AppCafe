const { blogPosts } = require('../data/blogPosts');
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

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugToUrl(slug) {
  return `https://etiove.com/blog/${slug}.html`;
}

function toSiteUrl(value) {
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith('/')) {
    return `https://etiove.com${value}`;
  }

  return value;
}

function getLocalSocialImage(post) {
  if (post.slug === 'como-elegir-el-mejor-cafe-de-etiopia') {
    return 'https://etiove.com/og-blog-etiopia.jpg';
  }

  return 'https://etiove.com/og-image.jpg';
}

function formatIsoDateEs(value) {
  if (!value) {
    return '';
  }

  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function findRelatedPosts(currentPost) {
  const currentMeta = blogPosts.find((item) => item.slug === currentPost.slug);
  if (!currentMeta) {
    return [];
  }

  const currentTerms = new Set(
    String(currentMeta.search || '')
      .split(/\s+/)
      .filter(Boolean)
  );

  return blogPosts
    .filter((item) => item.slug !== currentPost.slug)
    .map((item) => {
      const itemTerms = String(item.search || '')
        .split(/\s+/)
        .filter(Boolean);
      const sharedTerms = itemTerms.reduce(
        (count, term) => count + (currentTerms.has(term) ? 1 : 0),
        0
      );
      const categoryBoost = item.category === currentMeta.category ? 10 : 0;

      return {
        ...item,
        score: categoryBoost + sharedTerms,
      };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 3);
}

function renderRelatedPostsSection(post) {
  if (String(post.bodyHtml || '').includes('related-section')) {
    return '';
  }

  const relatedPosts = findRelatedPosts(post);
  if (!relatedPosts.length) {
    return '';
  }

  const itemList = relatedPosts
    .map(
      (item) => `
      <a class="related-card" href="/blog/${item.slug}.html">
        <img class="related-thumb" src="${item.image}" alt="${item.imageAlt}" loading="lazy" width="400" height="225" />
        <div class="related-body">
          <span class="related-tag">${item.categoryLabel}</span>
          <p class="related-title">${item.title}</p>
        </div>
      </a>`
    )
    .join('');

  return `
    <section class="related-section" aria-labelledby="related-posts-title">
      <p class="related-label">También te puede interesar</p>
      <h2 id="related-posts-title" class="related-heading">Sigue explorando el blog</h2>
      <div class="related-grid">${itemList}
      </div>
    </section>`;
}

function slugFromUrl(url) {
  if (!url) return null;
  const match = String(url).match(/\/blog\/([^/]+?)(?:\.html)?$/);
  return match ? match[1] : null;
}

function renderPostNavSection(post) {
  // Skip if bodyHtml already has a post-nav (old posts with embedded nav)
  if (String(post.bodyHtml || '').includes('post-nav')) {
    return '';
  }
  const { prevUrl, nextUrl } = post;
  if (!prevUrl && !nextUrl) return '';

  const prevSlug = slugFromUrl(prevUrl);
  const nextSlug = slugFromUrl(nextUrl);
  const prevPost = prevSlug ? blogPosts.find((p) => p.slug === prevSlug) : null;
  const nextPost = nextSlug ? blogPosts.find((p) => p.slug === nextSlug) : null;

  const prevLink = prevPost
    ? `<a class="post-nav-link" href="/blog/${prevPost.slug}.html">
        <p class="post-nav-label">← Anterior</p>
        <p class="post-nav-title">${prevPost.title}</p>
      </a>`
    : '';
  const nextLink = nextPost
    ? `<a class="post-nav-link post-nav-link--align-end" href="/blog/${nextPost.slug}.html">
        <p class="post-nav-label">Siguiente →</p>
        <p class="post-nav-title">${nextPost.title}</p>
      </a>`
    : '';

  return `
    <nav class="post-nav" aria-label="Navegación entre artículos">
      ${prevLink}
      ${nextLink}
    </nav>`;
}

function buildRelatedPostsJsonLd(post) {
  const relatedPosts = findRelatedPosts(post);
  if (!relatedPosts.length) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Artículos relacionados con ${post.title}`,
    itemListElement: relatedPosts.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: slugToUrl(item.slug),
      name: item.title,
    })),
  };
}

function renderEditorialMeta(post, options) {
  const { articleDatePublished, articleDateModified, articleSection } = options;
  const publishedLabel = formatIsoDateEs(articleDatePublished);
  const modifiedLabel = formatIsoDateEs(articleDateModified);
  const readingTime = post.articleJsonLd?.timeRequired
    ? String(post.articleJsonLd.timeRequired).replace(/^PT(\d+)M$/i, '$1 min')
    : '';
  const showModified = articleDateModified && articleDateModified !== articleDatePublished;

  return `
    <section class="editorial-meta" aria-label="Detalles del artículo">
      <div class="editorial-meta-grid">
        <div class="editorial-meta-item">
          <span class="editorial-meta-label">Autor</span>
          <span class="editorial-meta-value">Equipo Etiove</span>
        </div>
        <div class="editorial-meta-item">
          <span class="editorial-meta-label">Categoría</span>
          <span class="editorial-meta-value">${articleSection}</span>
        </div>
        <div class="editorial-meta-item">
          <span class="editorial-meta-label">Publicado</span>
          <span class="editorial-meta-value">${publishedLabel}</span>
        </div>
        <div class="editorial-meta-item">
          <span class="editorial-meta-label">Lectura</span>
          <span class="editorial-meta-value">${readingTime || 'Lectura breve'}</span>
        </div>${
          showModified
            ? `
        <div class="editorial-meta-item editorial-meta-item-wide">
          <span class="editorial-meta-label">Actualizado</span>
          <span class="editorial-meta-value">${modifiedLabel}</span>
        </div>`
            : ''
        }
      </div>
    </section>`;
}

function renderBlogPostPage(post) {
  const pageTitle = post.pageTitle || post.title;
  const ogTitle = post.ogTitle || `${pageTitle} | Blog Etiove`;
  const twitterTitle = post.twitterTitle || ogTitle;
  const ogImageAlt = post.ogImageAlt || post.hero.imageAlt;
  const socialImage = toSiteUrl(post.socialImage || getLocalSocialImage(post));
  const heroImage = post.hero?.image || '';
  const extraHeadHtml = post.extraHeadHtml ? `${post.extraHeadHtml}\n` : '';
  const bodyWrapperClass = post.bodyWrapperClass || 'page-body';
  const bodyInnerClass = post.bodyInnerClass || '';
  const beforeNavHtml = post.beforeNavHtml ? `${post.beforeNavHtml}\n` : '';
  const innerOpen = bodyInnerClass ? `\n    <div class="${bodyInnerClass}">` : '';
  const innerClose = bodyInnerClass ? '\n    </div>' : '';
  const relatedPostsJsonLd = buildRelatedPostsJsonLd(post);
  const extraJsonLd = [
    ...(post.extraJsonLd || []),
    ...(relatedPostsJsonLd ? [relatedPostsJsonLd] : []),
  ];
  const extraJsonLdBlocks = extraJsonLd.map((json) => renderJsonLdBlock(json)).join('\n');
  const articleDatePublished = post.articleJsonLd?.datePublished || '';
  const articleDateModified = post.articleJsonLd?.dateModified || articleDatePublished;
  const articleSection = post.articleSection || post.hero?.tag?.split('·')[0]?.trim() || 'Blog';
  const articleTags =
    post.keywords ||
    stripHtml(post.description)
      .split(/[,.]/)
      .map((token) => token.trim())
      .filter(Boolean)
      .slice(0, 6)
      .join(', ');
  const relatedPostsSection = renderRelatedPostsSection(post);
  const postNavSection = renderPostNavSection(post);
  const editorialMetaSection = renderEditorialMeta(post, {
    articleDatePublished,
    articleDateModified,
    articleSection,
  });
  const sharedInlineCss = `
    .post-body p, .post-body li { text-align: justify; }
    :root { --blog-nav-blur: 12px; }
    body > nav,
    .site-nav {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 100 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 20px 40px !important;
      background: rgba(246, 239, 231, 0.97) !important;
      backdrop-filter: blur(var(--blog-nav-blur)) !important;
      -webkit-backdrop-filter: blur(var(--blog-nav-blur)) !important;
      border-bottom: 1px solid var(--border-soft) !important;
      box-sizing: border-box !important;
    }
    .nav-wordmark {
      font-family: "Playfair Display", serif !important;
      font-size: 22px !important;
      font-weight: 500 !important;
      letter-spacing: 4px !important;
      color: var(--ink) !important;
      text-decoration: none !important;
      text-transform: uppercase !important;
    }
    .nav-links {
      display: flex !important;
      align-items: center !important;
      gap: 32px !important;
    }
    .nav-link {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      font-size: 11px !important;
      font-weight: 500 !important;
      letter-spacing: 2px !important;
      text-transform: uppercase !important;
      color: var(--ink-muted) !important;
      text-decoration: none !important;
      transition: color 0.2s !important;
    }
    .nav-link:hover,
    .nav-link--active {
      color: var(--accent) !important;
    }
    .nav-hamburger {
      display: none !important;
      flex-direction: column !important;
      gap: 5px !important;
      padding: 6px !important;
      border: none !important;
      background: none !important;
      cursor: pointer !important;
    }
    .nav-hamburger span {
      display: block !important;
      width: 22px !important;
      height: 2px !important;
      background: var(--ink) !important;
      border-radius: 2px !important;
      transition: transform 0.25s, opacity 0.25s !important;
    }
    footer {
      position: relative !important;
      z-index: 1 !important;
      display: grid !important;
      grid-template-columns: 1fr !important;
      gap: 0 !important;
      align-items: start !important;
      padding: 32px 40px !important;
      border-top: 1px solid var(--border-soft) !important;
      background: #f6efe7 !important;
      box-sizing: border-box !important;
    }
    .footer-copy {
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 12px !important;
      margin-top: 0 !important;
      padding-top: 24px !important;
      padding-bottom: 16px !important;
      border-top: none !important;
      color: var(--ink-muted) !important;
      font-size: 11px !important;
      font-weight: 300 !important;
      letter-spacing: 0.5px !important;
    }
    .footer-copy-center,
    .footer-legal-group {
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      gap: 14px !important;
    }
    .footer-legal-group { gap: 20px !important; }
    .footer-wordmark-sm {
      color: var(--ink-soft) !important;
      font-family: "Playfair Display", serif !important;
      font-size: 20px !important;
      font-weight: 400 !important;
      letter-spacing: 6px !important;
      text-transform: uppercase !important;
    }
    .social-row-inline {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
    }
    .social-link {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 38px !important;
      height: 38px !important;
      border: 1px solid var(--border) !important;
      border-radius: 50% !important;
      color: var(--ink-muted) !important;
      text-decoration: none !important;
      transition: all 0.3s !important;
    }
    .social-link:hover {
      border-color: var(--accent) !important;
      color: var(--accent) !important;
      transform: translateY(-2px) !important;
    }
    .social-link svg {
      width: 17px !important;
      height: 17px !important;
      fill: currentColor !important;
    }
    .footer-legal-link {
      color: var(--ink-muted) !important;
      font-size: 11px !important;
      font-weight: 500 !important;
      letter-spacing: 1px !important;
      opacity: 0.7 !important;
      text-decoration: none !important;
      text-transform: uppercase !important;
      transition: opacity 0.2s, color 0.2s !important;
    }
    .footer-legal-link:hover { color: var(--accent) !important; }
    .post-hero {
      position: relative !important;
      margin-top: 62px !important;
      height: min(500px, 55vw) !important;
      min-height: 240px !important;
      overflow: hidden !important;
      background: #1c120d !important;
    }
    .hero-img {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      display: block !important;
    }
    .hero-overlay {
      position: absolute !important;
      inset: 0 !important;
      background: linear-gradient(180deg, rgba(10, 8, 6, 0.2) 0%, rgba(10, 8, 6, 0.58) 100%) !important;
      pointer-events: none !important;
    }
    .hero-content {
      position: absolute !important;
      left: 50% !important;
      bottom: clamp(22px, 4vw, 42px) !important;
      width: min(920px, calc(100% - 40px)) !important;
      transform: translateX(-50%) !important;
      z-index: 1 !important;
      box-sizing: border-box !important;
    }
    .hero-tag {
      display: inline-block !important;
      margin-bottom: 10px !important;
      padding: 4px 10px !important;
      border-radius: 999px !important;
      background: rgba(143, 94, 59, 0.65) !important;
      color: rgba(255, 236, 210, 0.85) !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      letter-spacing: 2px !important;
      text-transform: uppercase !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    }
    .hero-title {
      margin: 0 0 7px !important;
      color: #fff9f1 !important;
      font-family: "Playfair Display", serif !important;
      font-size: clamp(22px, 3.5vw, 44px) !important;
      font-weight: 800 !important;
      line-height: 1.12 !important;
      text-wrap: balance !important;
    }
    .hero-meta {
      color: rgba(255, 249, 241, 0.6) !important;
      font-size: 12px !important;
      line-height: 1.5 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    }
    .editorial-meta {
      max-width: min(920px, calc(100% - 40px)) !important;
      margin: 24px auto 8px !important;
      background: rgba(255, 250, 245, 0.92) !important;
      border: 1px solid var(--border, #e4d3c2) !important;
      border-radius: 16px !important;
      box-shadow: 0 16px 40px rgba(28, 18, 13, 0.06) !important;
      box-sizing: border-box !important;
    }
    .editorial-meta-grid {
      display: grid !important;
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 0 !important;
    }
    .editorial-meta-item {
      padding: 16px 18px !important;
      border-right: 1px solid rgba(228, 211, 194, 0.7) !important;
    }
    .editorial-meta-item:last-child { border-right: 0 !important; }
    .editorial-meta-item-wide { grid-column: span 2 !important; }
    .editorial-meta-label {
      display: block !important;
      margin-bottom: 6px !important;
      color: var(--ink-muted, #8b7355) !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      letter-spacing: 1.8px !important;
      text-transform: uppercase !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    }
    .editorial-meta-value {
      display: block !important;
      color: var(--ink, #1c120d) !important;
      font-size: 14px !important;
      line-height: 1.45 !important;
    }
    .post-body blockquote,
    blockquote.pull-quote,
    .pull-quote {
      margin: 28px 0 !important;
      padding: 18px 20px !important;
      border-left: 4px solid var(--accent) !important;
      border-radius: 0 14px 14px 0 !important;
      background: rgba(143, 94, 59, 0.07) !important;
      color: var(--ink-soft) !important;
      box-sizing: border-box !important;
    }
    .post-body blockquote p,
    .pull-quote p {
      margin: 0 !important;
      color: var(--ink-soft) !important;
      font-size: 17px !important;
      line-height: 1.65 !important;
      font-style: italic !important;
    }
    .post-body blockquote cite,
    .pull-quote cite {
      display: block !important;
      margin-top: 10px !important;
      color: var(--ink-muted) !important;
      font-size: 12px !important;
      font-style: normal !important;
    }
    .tip,
    .info-box,
    .note-box,
    .summary-box,
    .callout {
      margin: 32px 0 !important;
      padding: 18px 20px !important;
      border: 1px solid rgba(143, 94, 59, 0.22) !important;
      border-left: 4px solid var(--accent) !important;
      border-radius: 0 14px 14px 0 !important;
      background: linear-gradient(180deg, rgba(255, 251, 247, 0.96) 0%, rgba(249, 241, 233, 0.92) 100%) !important;
      color: var(--ink-soft) !important;
      box-sizing: border-box !important;
    }
    .tip strong,
    .info-box strong,
    .note-box strong,
    .summary-box strong,
    .callout strong {
      color: var(--accent-deep) !important;
    }
    .post-body table,
    table.compare-table {
      width: 100% !important;
      margin: 28px 0 36px !important;
      border-collapse: collapse !important;
      border-spacing: 0 !important;
      overflow: hidden !important;
      border: 1px solid var(--border) !important;
      border-radius: 16px !important;
      background: rgba(255, 250, 245, 0.92) !important;
      box-shadow: 0 12px 28px rgba(28, 18, 13, 0.05) !important;
    }
    .post-body thead tr,
    table.compare-table thead tr {
      background: var(--ink) !important;
      color: #fff9f1 !important;
    }
    .post-body thead th,
    table.compare-table thead th {
      padding: 12px 16px !important;
      color: inherit !important;
      text-align: left !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    }
    .post-body tbody tr,
    table.compare-table tbody tr {
      border-bottom: 1px solid var(--border) !important;
    }
    .post-body tbody tr:nth-child(even),
    table.compare-table tbody tr:nth-child(even) {
      background: rgba(246, 239, 231, 0.5) !important;
    }
    .post-body tbody tr:last-child,
    table.compare-table tbody tr:last-child {
      border-bottom: 0 !important;
    }
    .post-body td,
    .post-body th,
    table.compare-table td,
    table.compare-table th {
      padding: 12px 16px !important;
      vertical-align: top !important;
    }
    .post-body td,
    table.compare-table td {
      color: var(--ink-soft) !important;
      font-size: 15px !important;
      line-height: 1.55 !important;
    }
    .post-body td:first-child,
    table.compare-table td:first-child {
      color: var(--ink) !important;
      font-weight: 600 !important;
    }
    .post-body figure {
      margin: 32px 0 !important;
    }
    .post-body figcaption {
      margin-top: 10px !important;
      color: var(--ink-muted) !important;
      font-size: 13px !important;
      line-height: 1.5 !important;
      text-align: center !important;
    }
    .post-actions {
      margin-top: 36px !important;
      padding-top: 22px !important;
      border-top: 1px solid var(--border) !important;
    }
    .section-label,
    .section-label--accent {
      margin-bottom: 11px !important;
      color: var(--ink-muted) !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      letter-spacing: 2px !important;
      text-transform: uppercase !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    }
    .share-row {
      display: flex !important;
      gap: 9px !important;
      flex-wrap: wrap !important;
      margin-bottom: 24px !important;
    }
    .share-btn {
      display: inline-flex !important;
      align-items: center !important;
      gap: 7px !important;
      border: 1px solid var(--border) !important;
      border-radius: 999px !important;
      padding: 8px 14px !important;
      background: var(--cream-alt) !important;
      color: var(--ink-soft) !important;
      text-decoration: none !important;
      font-weight: 700 !important;
      font-size: 13px !important;
      font-family: inherit !important;
      cursor: pointer !important;
      transition: border-color 0.2s, color 0.2s !important;
      box-sizing: border-box !important;
    }
    .share-btn:hover {
      border-color: var(--accent) !important;
      color: var(--accent) !important;
    }
    .share-btn svg {
      width: 14px !important;
      height: 14px !important;
      flex-shrink: 0 !important;
      fill: currentColor !important;
      stroke: currentColor !important;
    }
    .comment-help {
      margin-bottom: 10px !important;
      color: var(--ink-soft) !important;
      font-size: 14px !important;
    }
    .comment-help a {
      color: var(--accent) !important;
      font-weight: 700 !important;
      text-decoration: none !important;
    }
    .comment-box {
      width: 100% !important;
      min-height: 88px !important;
      padding: 11px 13px !important;
      margin-bottom: 10px !important;
      border: 1px solid var(--border) !important;
      border-radius: 12px !important;
      background: #fff !important;
      color: var(--ink) !important;
      font-size: 15px !important;
      font-family: inherit !important;
      resize: vertical !important;
      box-sizing: border-box !important;
    }
    .comment-send {
      border: none !important;
      border-radius: 999px !important;
      padding: 10px 20px !important;
      background: var(--accent-deep) !important;
      color: #fff !important;
      font-weight: 700 !important;
      font-size: 13px !important;
      cursor: pointer !important;
      font-family: inherit !important;
      transition: opacity 0.2s, background 0.2s !important;
    }
    .comment-send:hover { background: var(--accent) !important; }
    .comment-send:disabled {
      opacity: 0.45 !important;
      cursor: not-allowed !important;
    }
    .comment-status {
      margin-top: 10px !important;
      font-size: 13px !important;
      color: var(--ink-soft) !important;
    }
    .comment-list {
      margin-top: 18px !important;
      display: grid !important;
      gap: 9px !important;
    }
    .comment-item {
      border: 1px solid var(--border) !important;
      border-radius: 12px !important;
      background: rgba(255,250,245,0.75) !important;
      padding: 13px !important;
    }
    .comment-meta {
      margin-bottom: 5px !important;
      color: #7b6049 !important;
      font-size: 12px !important;
    }
    .comment-body {
      margin: 0 !important;
      color: #38251c !important;
      font-size: 15px !important;
      line-height: 1.65 !important;
      white-space: pre-wrap !important;
    }
    .editorial-meta {
      max-width: min(920px, calc(100% - 40px));
      margin: 24px auto 8px;
      background: rgba(255, 250, 245, 0.92);
      border: 1px solid var(--border, #e4d3c2);
      border-radius: 16px;
      box-shadow: 0 16px 40px rgba(28,18,13,0.06);
    }
    .editorial-meta-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0;
    }
    .editorial-meta-item {
      padding: 16px 18px;
      border-right: 1px solid rgba(228,211,194,0.7);
    }
    .editorial-meta-item:last-child { border-right: 0; }
    .editorial-meta-item-wide { grid-column: span 2; }
    .editorial-meta-label {
      display: block;
      margin-bottom: 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.8px;
      text-transform: uppercase;
      color: var(--ink-muted, #8b7355);
    }
    .editorial-meta-value {
      display: block;
      color: var(--ink, #1c120d);
      font-size: 14px;
      line-height: 1.45;
    }
    .related-section { margin: 48px 0 0; }
    .related-label {
      font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
      color: var(--ink-muted, #8b7355); margin-bottom: 8px;
    }
    .related-heading {
      font-family: 'Playfair Display', serif; font-size: clamp(22px, 3vw, 30px);
      line-height: 1.2; color: var(--ink, #1c120d); margin-bottom: 16px;
    }
    .related-grid {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 16px !important;
      width: 100% !important;
      align-items: stretch !important;
    }
    .related-grid > .related-card:last-child:nth-child(odd) {
      grid-column: 1 / -1 !important;
    }
    .related-card {
      display: flex !important; flex-direction: column !important; width: 100% !important; height: 100% !important; text-decoration: none !important; background: var(--cream-alt, #fffaf5) !important;
      border: 1px solid var(--border, #e4d3c2) !important; border-radius: 14px !important; overflow: hidden !important;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s !important;
      box-sizing: border-box !important;
    }
    .related-card:hover {
      transform: translateY(-2px); box-shadow: 0 10px 24px rgba(28,18,13,0.08);
      border-color: var(--accent, #8f5e3b);
    }
    .related-thumb {
      width: 100% !important;
      aspect-ratio: 16/9 !important;
      object-fit: cover !important;
      display: block !important;
      flex-shrink: 0 !important;
    }
    .related-body {
      display: flex !important;
      flex: 1 1 auto !important;
      flex-direction: column !important;
      justify-content: flex-start !important;
      padding: 14px 16px 16px !important;
      min-height: 118px !important;
      box-sizing: border-box !important;
    }
    .related-tag {
      display: inline-block !important; margin-bottom: 8px !important; font-size: 10px !important; font-weight: 700 !important;
      letter-spacing: 1.6px !important; text-transform: uppercase !important; color: var(--accent, #8f5e3b) !important;
    }
    .related-title {
      margin: 0 !important;
      color: var(--ink, #1c120d) !important;
      font-family: "Playfair Display", serif !important;
      font-size: 17px !important;
      line-height: 1.35 !important;
      text-wrap: balance !important;
    }
    @media (max-width: 720px) {
      body > nav,
      .site-nav { padding: 16px 20px !important; }
      .nav-hamburger { display: flex !important; }
      .nav-links {
        display: none !important;
        position: fixed !important;
        inset: 0 !important;
        z-index: 150 !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 32px !important;
        padding: 40px 24px !important;
        background: rgba(246, 239, 231, 0.98) !important;
        backdrop-filter: blur(16px) !important;
      }
      .nav-links.open { display: flex !important; }
      .nav-link {
        font-size: 16px !important;
        letter-spacing: 3px !important;
      }
      footer { padding: 28px 20px !important; }
      .footer-copy {
        flex-direction: column !important;
        align-items: flex-start !important;
      }
      .post-hero { height: min(280px, 62vw) !important; }
      .hero-content { width: calc(100% - 32px) !important; }
      .editorial-meta-grid { grid-template-columns: 1fr 1fr; }
      .editorial-meta-item:nth-child(2n) { border-right: 0; }
      .editorial-meta-item:nth-child(n + 3) { border-top: 1px solid rgba(228,211,194,0.7); }
      .editorial-meta-item-wide { grid-column: span 2; }
      .related-grid { grid-template-columns: 1fr !important; }
    }
    @media (max-width: 480px) {
      .post-hero { height: min(220px, 56vw) !important; }
      .hero-title { font-size: 20px !important; }
      .editorial-meta { max-width: calc(100% - 24px); }
      .editorial-meta-grid { grid-template-columns: 1fr; }
      .editorial-meta-item {
        border-right: 0;
        border-top: 1px solid rgba(228,211,194,0.7);
      }
      .editorial-meta-item:first-child { border-top: 0; }
      .editorial-meta-item-wide { grid-column: span 1; }
      .post-body table,
      table.compare-table {
        display: block !important;
        overflow-x: auto !important;
        white-space: nowrap !important;
      }
    }
  `;

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
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="keywords" content="${articleTags}" />
  <link rel="canonical" href="${post.canonicalUrl}" />
  <link rel="alternate" type="application/rss+xml" title="Blog Etiove - RSS" href="https://etiove.com/feed.xml" />${renderOptionalLink('prev', post.prevUrl)}${renderOptionalLink('next', post.nextUrl)}
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Etiove" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${post.ogDescription || post.description}" />
  <meta property="og:url" content="${post.canonicalUrl}" />
  <meta property="og:image" content="${socialImage}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${ogImageAlt}" />
  <meta property="article:section" content="${articleSection}" />
  <meta property="article:published_time" content="${articleDatePublished}" />
  <meta property="article:modified_time" content="${articleDateModified}" />
  <meta property="og:updated_time" content="${articleDateModified}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${twitterTitle}" />
  <meta name="twitter:description" content="${post.twitterDescription || post.description}" />
  <meta name="twitter:image" content="${socialImage}" />
  <meta name="twitter:image:alt" content="${ogImageAlt}" />
${extraHeadHtml}  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:wght@400;500&display=swap" />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/blog/post-shell.css" />
  <style>
${post.inlineCss}
${sharedInlineCss}
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
      src="${heroImage}"
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
${editorialMetaSection}

  <main class="${bodyWrapperClass}">${innerOpen}
${post.bodyHtml}${relatedPostsSection}${postNavSection}${innerClose}
  </main>

${renderScrollTopButton()}
  <script>
    window.ETIOVE_BLOG_POST_CONFIG = {
      postSlug: '${post.slug}',
    };
  </script>
  <script src="/js/config.js"></script>
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
