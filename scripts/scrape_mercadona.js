#!/usr/bin/env node
// Scrape Mercadona coffee products via their API, fetch EANs, build import JSON
// Usage: node --env-file=.env scripts/scrape_mercadona.js

const fs = require('fs');
const path = require('path');

const CATEGORY_IDS = [81, 83, 84]; // cápsulas+monodosis, molido+grano, soluble+bebidas
const OUT = path.join(__dirname, 'cafe-import-mercadona-cafe-real.json');
const DELAY = 200; // ms between API calls

// Products to SKIP (not coffee)
const SKIP_IDS = new Set([
  '10449', // Crema de leche para café Campina
  '11187', // Cereales solubles con achicoria
  '60515', // Filtros de café
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function formatToFormat(catName, packaging, displayName) {
  const dn = displayName.toLowerCase();
  if (dn.includes('grano')) return 'beans';
  if (dn.includes('cápsula') || dn.includes('capsulas') || dn.includes('monodosis'))
    return 'capsules';
  if (dn.includes('soluble')) return 'instant';
  if (dn.includes('molido')) return 'ground';
  if (catName) {
    const cn = catName.toLowerCase();
    if (cn.includes('grano')) return 'beans';
    if (cn.includes('cápsula') || cn.includes('monodosis')) return 'capsules';
    if (cn.includes('soluble')) return 'instant';
    if (cn.includes('molido')) return 'ground';
  }
  return 'ground';
}

function isDecaf(displayName) {
  const dn = displayName.toLowerCase();
  return dn.includes('descafeinado') || dn.includes('descaf');
}

function extractBrand(displayName) {
  const brands = [
    'Nescafé',
    'Bonka',
    'Dolce Gusto',
    'Tassimo',
    'Cafés Valiente',
    'Climent',
    'Campina',
    'Bosque Verde',
  ];
  for (const b of brands) {
    if (displayName.includes(b)) return b;
  }
  return 'Hacendado';
}

function buildCoffeeCategory(brand) {
  if (['Nescafé', 'Bonka', 'Dolce Gusto', 'Tassimo'].includes(brand)) return 'daily';
  return 'daily';
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Extract all product stubs from category tree
function extractProducts(catData) {
  const products = [];
  function walk(node) {
    if (node.products) {
      for (const p of node.products) {
        if (!SKIP_IDS.has(p.id)) {
          products.push({
            id: p.id,
            slug: p.slug,
            display_name: p.display_name,
            thumbnail: p.thumbnail,
            price: p.price_instructions,
            catName: catData.name,
          });
        }
      }
    }
    if (node.categories) {
      for (const sub of node.categories) walk(sub);
    }
  }
  walk(catData);
  return products;
}

async function main() {
  console.log('=== Scraping Mercadona coffee products ===\n');

  // 1. Fetch all categories
  const allProducts = [];
  for (const catId of CATEGORY_IDS) {
    console.log(`Fetching category ${catId}...`);
    const catData = await fetchJSON(`https://tienda.mercadona.es/api/categories/${catId}/`);
    const prods = extractProducts(catData);
    console.log(`  → ${prods.length} products in "${catData.name}"`);
    allProducts.push(...prods);
    await sleep(DELAY);
  }

  // Dedupe by id
  const seen = new Set();
  const unique = allProducts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  console.log(`\nTotal unique products: ${unique.length}`);

  // 2. Fetch detail for each (to get EAN, photos, description)
  const results = [];
  for (let i = 0; i < unique.length; i++) {
    const stub = unique[i];
    console.log(
      `  [${i + 1}/${unique.length}] Fetching detail for ${stub.id} (${stub.display_name})...`
    );
    try {
      const detail = await fetchJSON(`https://tienda.mercadona.es/api/products/${stub.id}/`);
      results.push({ stub, detail });
    } catch (err) {
      console.warn(`    ⚠ Error fetching ${stub.id}: ${err.message}`);
    }
    await sleep(DELAY);
  }

  // 3. Build import JSON
  const nowIso = new Date().toISOString();
  const entries = results.map(({ stub, detail }) => {
    const pi = detail.price_instructions || stub.price;
    const brand = detail.brand || extractBrand(stub.display_name);
    const format = formatToFormat(stub.catName, detail.packaging, stub.display_name);
    const decaf = isDecaf(stub.display_name);
    const cantidad = pi.unit_size ? Math.round(pi.unit_size * 1000) : null;
    const precio = parseFloat(pi.unit_price);

    // Best photo: zoom > regular > thumbnail
    const photos = detail.photos || [];
    const bestPhoto = photos[0]?.zoom || photos[0]?.regular || stub.thumbnail;
    const allPhotos = photos.map((p) => p.zoom || p.regular || p.thumbnail);

    const origin = stub.display_name.includes('Colombia') ? 'Colombia' : null;

    const entry = {
      id: `mercadona_${detail.id}`,
      fuente: 'mercadona',
      fuentePais: 'ES',
      fuenteUrl: detail.share_url,
      urlProducto: detail.share_url,
      nombre: stub.display_name,
      name: stub.display_name,
      marca: brand,
      roaster: brand,
      mercadonaId: detail.id,
      ean: detail.ean || '',
      category: 'supermarket',
      coffeeCategory: buildCoffeeCategory(brand),
      formato: format,
      format,
      cantidad,
      precio,
      fecha: nowIso,
      puntuacion: 0,
      votos: 0,
      officialPhoto: bestPhoto,
      bestPhoto,
      imageUrl: bestPhoto,
      foto: bestPhoto,
      decaf,
      status: 'approved',
      reviewStatus: 'approved',
      provisional: false,
      appVisible: true,
      scannerVisible: true,
      adminReviewedAt: nowIso,
      updatedAt: nowIso,
      approvedAt: nowIso,
      createdAt: nowIso,
    };

    if (origin) entry.origin = origin;
    if (allPhotos.length > 1) entry.photos = allPhotos;
    if (detail.details?.description) entry.descripcion = detail.details.description;
    if (detail.details?.legal_name) entry.legalName = detail.details.legal_name;
    if (pi.total_units) entry.unidades = pi.total_units;
    if (pi.unit_name) entry.unitName = pi.unit_name;

    // SCA estimation
    entry.sca = {
      score: decaf
        ? 67
        : format === 'beans'
          ? 72
          : format === 'ground'
            ? 69.5
            : format === 'capsules'
              ? 68
              : 67,
      type: 'estimated',
      confidence: origin ? 0.38 : 0.34,
      officialScore: null,
      reasons: ['Café de supermercado', 'Marca identificada', `Formato ${format}`],
      signals: {
        category: 'supermarket',
        format,
        roastLevel: '',
        origin: !!origin,
        process: false,
        variety: false,
        altitude: false,
        notesCount: 0,
        species: '',
        decaf,
      },
      lastCalculatedAt: nowIso,
    };

    return entry;
  });

  // 4. Compare with existing
  let existingData = [];
  if (fs.existsSync(OUT)) {
    existingData = JSON.parse(fs.readFileSync(OUT, 'utf-8'));
  }
  const existingMap = new Map(existingData.map((e) => [e.mercadonaId, e]));
  const newMap = new Map(entries.map((e) => [e.mercadonaId, e]));

  let updated = 0,
    created = 0,
    unchanged = 0;
  const changes = [];

  for (const entry of entries) {
    const old = existingMap.get(entry.mercadonaId);
    if (!old) {
      changes.push(`NEW: ${entry.nombre} (${entry.mercadonaId}) - ${entry.precio}€`);
      created++;
    } else {
      const diffs = [];
      if (old.precio !== entry.precio) diffs.push(`precio: ${old.precio}→${entry.precio}`);
      if (old.ean !== entry.ean && entry.ean) diffs.push(`ean: "${old.ean || ''}"→"${entry.ean}"`);
      if (old.officialPhoto !== entry.officialPhoto) diffs.push('photo updated');
      if (!old.ean && entry.ean) diffs.push('ean added');
      if (diffs.length > 0) {
        changes.push(`UPD: ${entry.nombre} (${entry.mercadonaId}) - ${diffs.join(', ')}`);
        updated++;
      } else {
        unchanged++;
      }
    }
  }

  // Check for products in old but not in new (discontinued?)
  for (const [mId, old] of existingMap) {
    if (!newMap.has(mId)) {
      changes.push(`GONE: ${old.nombre} (${mId}) - not in current API categories`);
    }
  }

  console.log('\n=== Changes ===');
  changes.forEach((c) => console.log(`  ${c}`));
  console.log(`\nSummary: ${created} new, ${updated} updated, ${unchanged} unchanged`);

  // 5. Merge: keep old non-coffee items, update coffee items
  // Start with all new entries
  const finalEntries = [...entries];

  // Add old entries that are NOT in new (non-coffee items from search results)
  for (const [mId, old] of existingMap) {
    if (!newMap.has(mId)) {
      finalEntries.push(old);
    }
  }

  // Write
  fs.writeFileSync(OUT, JSON.stringify(finalEntries, null, 2), 'utf-8');
  console.log(`\nWrote ${finalEntries.length} entries to ${path.basename(OUT)}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
