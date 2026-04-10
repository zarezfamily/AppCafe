#!/usr/bin/env node
/**
 * Etiove — generate-sitemap.js
 * Genera sitemap.xml automáticamente leyendo los posts del blog y las páginas estáticas.
 * Uso: node generate-sitemap.js  (ejecutar desde la raíz del proyecto antes del deploy)
 *
 * En Cloudflare Pages, añadir como build command:
 *   node generate-sitemap.js && <tu comando de build actual>
 */

const fs   = require('fs');
const path = require('path');

const BASE_URL  = 'https://etiove.com';
const BLOG_DIR  = path.join(__dirname, 'blog');
const OUT_FILE  = path.join(__dirname, 'sitemap.xml');
const TODAY     = new Date().toISOString().slice(0, 10);

// ── Páginas estáticas (no se escanean, se declaran a mano) ────────────────────
const STATIC_PAGES = [
  { loc: '/',                  lastmod: TODAY,       changefreq: 'weekly',  priority: '1.0' },
  { loc: '/comunidad.html',    lastmod: TODAY,       changefreq: 'daily',   priority: '0.9' },
  { loc: '/blog/',             lastmod: TODAY,       changefreq: 'weekly',  priority: '0.9' },
  { loc: '/perfil/',           lastmod: TODAY,       changefreq: 'weekly',  priority: '0.5' },
  { loc: '/sobre.html',        lastmod: TODAY,       changefreq: 'monthly', priority: '0.6' },
  { loc: '/privacidad.html',   lastmod: '2026-04-09', changefreq: 'yearly', priority: '0.3' },
  { loc: '/terminos.html',     lastmod: '2026-04-09', changefreq: 'yearly', priority: '0.3' },
  { loc: '/cookies.html',      lastmod: '2026-04-09', changefreq: 'yearly', priority: '0.3' },
];

// ── Leer posts del blog automáticamente ──────────────────────────────────────
function readBlogPosts() {
  if (!fs.existsSync(BLOG_DIR)) {
    console.warn('⚠ Directorio /blog no encontrado. Sólo se generarán páginas estáticas.');
    return [];
  }

  return fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .map(f => {
      const filePath = path.join(BLOG_DIR, f);
      const content  = fs.readFileSync(filePath, 'utf8');

      // Extraer datePublished del schema JSON-LD
      const dateMatch = content.match(/"datePublished"\s*:\s*"([^"]+)"/);
      const lastmod   = dateMatch ? dateMatch[1] : TODAY;

      return {
        loc:        `/blog/${f}`,
        lastmod,
        changefreq: 'monthly',
        priority:   '0.8',
      };
    })
    .sort((a, b) => b.lastmod.localeCompare(a.lastmod)); // más recientes primero
}

// ── Construir XML ─────────────────────────────────────────────────────────────
function buildSitemap(pages) {
  const urls = pages.map(p => `  <url>
    <loc>${BASE_URL}${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${urls}

</urlset>
`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const blogPosts = readBlogPosts();
const allPages  = [...STATIC_PAGES, ...blogPosts];
const xml       = buildSitemap(allPages);

fs.writeFileSync(OUT_FILE, xml, 'utf8');
console.log(`✅ sitemap.xml generado con ${allPages.length} URLs (${blogPosts.length} posts del blog)`);
allPages.forEach(p => console.log(`   ${p.loc}`));
