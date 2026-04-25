#!/usr/bin/env node
/**
 * Generate an HTML catalog viewer for all cafes in Firestore.
 * Outputs a single HTML file with photos, names, brands, numbered and ordered by brand.
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

function getPhoto(d) {
  return (
    d.photos?.selected ||
    d.bestPhoto ||
    d.officialPhoto ||
    d.imageUrl ||
    d.imagenUrl ||
    d.foto ||
    ''
  );
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CACHE_BUST = 'v=' + Date.now();
function bustCache(url) {
  if (!url || !url.includes('storage.googleapis.com')) return url;
  return url + (url.includes('?') ? '&' : '?') + CACHE_BUST;
}

(async () => {
  const snap = await db.collection('cafes').get();
  console.log(`Total cafes: ${snap.size}`);

  const cafes = [];
  snap.forEach((d) => {
    const data = d.data();
    cafes.push({
      id: d.id,
      nombre: data.nombre || '',
      marca: data.marca || data.roaster || 'Sin marca',
      pais: data.pais || data.origen || '',
      sca: typeof data.sca === 'object' ? data.sca?.score : data.sca_score || data.sca || '',
      photo: getPhoto(data),
      formato: data.formato || '',
      source: data.source || '',
    });
  });

  // Sort by brand then name
  cafes.sort((a, b) => {
    const cmp = a.marca.localeCompare(b.marca, 'es');
    return cmp !== 0 ? cmp : a.nombre.localeCompare(b.nombre, 'es');
  });

  // Group by brand
  const byBrand = {};
  for (const c of cafes) {
    if (!byBrand[c.marca]) byBrand[c.marca] = [];
    byBrand[c.marca].push(c);
  }

  let num = 0;
  let cardsHtml = '';
  const brandNav = [];

  for (const [brand, items] of Object.entries(byBrand).sort(([a], [b]) =>
    a.localeCompare(b, 'es')
  )) {
    const brandId = `brand-${brand.replace(/[^a-zA-Z0-9]/g, '_')}`;
    brandNav.push({ brand, id: brandId, count: items.length });
    cardsHtml += `<div class="brand-header" id="${esc(brandId)}"><h2>${esc(brand)} <span class="count">(${items.length})</span></h2></div>\n`;
    cardsHtml += `<div class="grid">\n`;
    for (const c of items) {
      num++;
      const scaStr = c.sca ? Number(c.sca).toFixed(1) : '';
      cardsHtml += `<div class="card">
  <div class="num">#${num}</div>
  <div class="img-wrap">${c.photo ? `<img src="${esc(bustCache(c.photo))}" loading="lazy" alt="${esc(c.nombre)}"/>` : `<div class="no-img">☕</div>`}</div>
  <div class="info">
    <div class="brand">${esc(c.marca)}</div>
    <div class="name">${esc(c.nombre)}</div>
    ${c.pais ? `<div class="meta">${esc(c.pais)}</div>` : ''}
    ${scaStr ? `<div class="sca">SCA ${scaStr}</div>` : ''}
    ${c.formato ? `<div class="meta">${esc(c.formato)}</div>` : ''}
  </div>
</div>\n`;
    }
    cardsHtml += `</div>\n`;
  }

  const navHtml = brandNav
    .map((b) => `<a href="#${esc(b.id)}" class="nav-link">${esc(b.brand)} (${b.count})</a>`)
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Catálogo de Cafés — Etiove (${cafes.length} cafés, ${Object.keys(byBrand).length} marcas)</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#faf8f5;color:#24160f}
.header{background:#1a0e07;color:#c8a97c;padding:20px 24px;position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(0,0,0,.3)}
.header h1{font-size:22px;margin-bottom:4px}
.header .stats{font-size:13px;color:#9e7c62}
.search-wrap{padding:12px 24px;background:#fff;border-bottom:1px solid #eadbce;position:sticky;top:68px;z-index:99}
.search-wrap input{width:100%;padding:10px 14px;border:1px solid #eadbce;border-radius:10px;font-size:14px;background:#faf8f5}
.nav{display:flex;flex-wrap:wrap;gap:6px;padding:12px 24px;background:#fffaf5;border-bottom:1px solid #eadbce}
.nav-link{font-size:11px;padding:4px 10px;background:#f4e8db;border-radius:12px;color:#8f5e3b;text-decoration:none;font-weight:600}
.nav-link:hover{background:#8f5e3b;color:#fff}
.container{max-width:1400px;margin:0 auto;padding:0 16px}
.brand-header{padding:20px 8px 8px;border-bottom:2px solid #eadbce;margin-top:24px}
.brand-header h2{font-size:18px;color:#8f5e3b;font-weight:800}
.brand-header .count{color:#9e7c62;font-weight:400;font-size:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;padding:12px 0}
.card{background:#fff;border:1px solid #eadbce;border-radius:14px;overflow:hidden;position:relative;transition:transform .15s}
.card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.08)}
.num{position:absolute;top:6px;left:6px;background:rgba(0,0,0,.5);color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:8px;z-index:1}
.img-wrap{width:100%;aspect-ratio:1;background:#f5ede3;display:flex;align-items:center;justify-content:center;overflow:hidden}
.img-wrap img{width:100%;height:100%;object-fit:contain}
.no-img{font-size:40px}
.info{padding:10px}
.brand{font-size:10px;font-weight:700;color:#8f5e3b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
.name{font-size:13px;font-weight:800;color:#24160f;line-height:1.3;margin-bottom:4px}
.meta{font-size:11px;color:#9e7c62;margin-bottom:2px}
.sca{font-size:10px;font-weight:700;background:#c8a97c;color:#fff;display:inline-block;padding:2px 6px;border-radius:6px;margin-top:2px}
.hidden{display:none!important}
@media(max-width:600px){.grid{grid-template-columns:repeat(2,1fr);gap:8px}.header h1{font-size:18px}}
</style>
</head>
<body>
<div class="header">
<h1>☕ Catálogo Etiove</h1>
<div class="stats">${cafes.length} cafés · ${Object.keys(byBrand).length} marcas</div>
</div>
<div class="search-wrap">
<input type="text" id="search" placeholder="Buscar café, marca, país..." autocomplete="off"/>
</div>
<div class="nav">${navHtml}</div>
<div class="container">
${cardsHtml}
</div>
<script>
const input=document.getElementById('search');
const cards=document.querySelectorAll('.card');
const brands=document.querySelectorAll('.brand-header');
input.addEventListener('input',()=>{
  const q=input.value.toLowerCase().trim();
  if(!q){cards.forEach(c=>c.classList.remove('hidden'));brands.forEach(b=>b.classList.remove('hidden'));return}
  brands.forEach(b=>b.classList.add('hidden'));
  cards.forEach(c=>{
    const txt=c.textContent.toLowerCase();
    c.classList.toggle('hidden',!txt.includes(q));
  });
});
</script>
</body>
</html>`;

  const outDir = path.join(__dirname, '..', 'web');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'catalogo.html');
  fs.writeFileSync(outPath, html);
  console.log(`Generated: ${outPath}`);
  console.log(`${cafes.length} cafes, ${Object.keys(byBrand).length} brands, numbered 1-${num}`);
  process.exit(0);
})();
