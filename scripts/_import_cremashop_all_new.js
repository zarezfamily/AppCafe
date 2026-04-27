#!/usr/bin/env node
/**
 * Scrape ALL cremashop categories, find new products we don't have,
 * scrape their details, download photos, and import to Firestore.
 * Handles encoding properly (no HTML entities).
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const https = require('https');
const fs = require('fs');
const sharp = require('sharp');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

function dl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
          return dl(res.headers.location).then(resolve).catch(reject);
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

function decodeHtml(s) {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&rlm;/g, '')
    .replace(/&lrm;/g, '')
    .replace(/&copy;/g, '\u00A9')
    .replace(/&reg;/g, '\u00AE')
    .replace(/&trade;/g, '\u2122')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const BRAND_NAMES = {
  'miscela-d-oro': "Miscela d'Oro",
  crema: 'Crema',
  mokaflor: 'Mokaflor',
  lucaffe: 'Lucaffé',
  passalacqua: 'Passalacqua',
  'gringo-nordic': 'Gringo Nordic',
  bialetti: 'Bialetti',
  bergstrands: 'Bergstrands',
  paulig: 'Paulig',
  mokasirs: 'Mokasirs',
  pera: 'Pera',
  'helsingin-kahvipaahtimo': 'Helsingin Kahvipaahtimo',
  arcaffe: 'Arcaffè',
  'johan-nystrom': 'Johan & Nyström',
  'trung-nguyen': 'Trung Nguyen',
  lykke: 'Lykke',
  dallmayr: 'Dallmayr',
  'espoon-kahvipaahtimo': 'Espoon Kahvipaahtimo',
  'good-life-coffee': 'Good Life Coffee',
  jacobs: 'Jacobs',
  burg: 'Burg',
  carraro: 'Carraro',
  rost: 'Röst',
  mokambo: 'Mokambo',
  aromix: 'Aromix',
  saquella: 'Saquella',
  lofbergs: 'Löfbergs',
  'mr-viet': 'Mr. Viet',
  puro: 'Puro',
  'espresso-house': 'Espresso House',
  intenso: 'Intenso',
  carrao: 'Carrao',
  tchibo: 'Tchibo',
  'rwanda-farmers': 'Rwanda Farmers',
  'idee-kaffee': 'Idee Kaffee',
  minges: 'Minges',
  illy: 'illy',
  misc: 'Varios',
};

function formatName(slug) {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bNespresso\b/gi, 'Nespresso')
    .replace(/\bDolce Gusto\b/gi, 'Dolce Gusto')
    .replace(/\bEse\b/gi, 'ESE')
    .replace(/\bPod\b/gi, 'Pod')
    .replace(/\bPods\b/gi, 'Pods')
    .replace(/\bCapsule\b/gi, 'Cápsulas')
    .replace(/\bDecaf\b/gi, 'Descafeinado');
}

function detectFormat(slug) {
  const s = slug.toLowerCase();
  if (s.includes('nespresso-capsule') || s.includes('nespresso')) return 'capsulas-nespresso';
  if (s.includes('dolce-gusto')) return 'capsulas-dolce-gusto';
  if (s.includes('pod') || s.includes('ese')) return 'monodosis';
  if (s.includes('capsule')) return 'capsulas';
  if (s.includes('ground') || s.includes('molido')) return 'molido';
  if (s.includes('instant')) return 'instantaneo';
  return 'grano';
}

function computeSCA(data) {
  let score = 72;
  if (data.especie === 'arabica') score += 4;
  else if (data.especie === 'blend') score += 2;
  if (data.tueste === 'light') score += 3;
  else if (data.tueste === 'medium') score += 2;
  else if (data.tueste === 'medium-dark') score += 1;
  if (data.pais && data.pais.length > 3) score += 2;
  if (data.formato === 'grano' || data.formato === 'beans') score += 1;
  if (data.descripcion && data.descripcion.length > 50) score += 1;
  return Math.min(score, 89);
}

(async () => {
  try {
    // 1. Scrape ALL category pages
    const categories = [
      'https://www.cremashop.eu/es/store/coffee/capsules-and-pods?view=all',
      'https://www.cremashop.eu/es/store/coffee/instant-coffee?view=all',
      'https://www.cremashop.eu/es/store/coffee/ground-coffee?view=all',
    ];

    const allProducts = {};

    for (const catUrl of categories) {
      console.log(`Scraping: ${catUrl}`);
      const html = (await dl(catUrl)).toString();

      const linkRe = /href="\/es\/products\/([^/]+)\/([^/]+)\/(\d+)"/g;
      let m;
      while ((m = linkRe.exec(html))) {
        const key = `${m[1]}/${m[2]}`;
        if (!allProducts[key]) {
          allProducts[key] = { brandSlug: m[1], productSlug: m[2], id: m[3] };
        }
      }

      // Extract images
      const imgRe = /content\/products\/([^/]+)\/([^/]+)\/(\d+)-([a-f0-9]+)\.jpg/g;
      while ((m = imgRe.exec(html))) {
        const key = `${m[1]}/${m[2]}`;
        if (allProducts[key]) {
          allProducts[key].listingImgHash = m[4];
        }
      }
    }

    const prodList = Object.values(allProducts);
    console.log(`\nTotal products across all categories: ${prodList.length}`);

    // 2. Check which are new
    const newProducts = [];
    for (const p of prodList) {
      if (p.brandSlug === 'misc') continue; // Skip variety packs
      const docId = `${p.brandSlug}_${p.productSlug}`.replace(/[^a-z0-9_-]/g, '');
      const doc = await db.collection('cafes').doc(docId).get();
      if (!doc.exists) {
        p.docId = docId;
        newProducts.push(p);
      }
    }

    console.log(`New products not in DB: ${newProducts.length}`);

    if (newProducts.length === 0) {
      console.log('Nothing new to import!');
      process.exit(0);
    }

    // Group by brand for display
    const brands = {};
    for (const p of newProducts) {
      if (!brands[p.brandSlug]) brands[p.brandSlug] = [];
      brands[p.brandSlug].push(p);
    }
    console.log('\nNew products by brand:');
    Object.entries(brands)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([b, ps]) => console.log(`  ${b}: ${ps.length}`));

    // 3. Scrape details and import each
    let imported = 0;
    let photoOk = 0;
    let photoErr = 0;

    for (const prod of newProducts) {
      imported++;

      // Scrape product page
      let nombre = formatName(prod.productSlug);
      let descripcion = '';
      let peso = '';
      let precio = 0;
      let imgHash = prod.listingImgHash || '';

      try {
        const pageHtml = (
          await dl(
            `https://www.cremashop.eu/es/products/${prod.brandSlug}/${prod.productSlug}/${prod.id}`
          )
        ).toString();

        // Title from <h1>
        const h1 = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        if (h1) nombre = decodeHtml(h1[1]);

        // Description
        const descMatch = pageHtml.match(
          /<div[^>]*class="[^"]*product-description[^"]*"[^>]*>([\s\S]*?)<\/div>/
        );
        if (descMatch) descripcion = decodeHtml(descMatch[1]).substring(0, 500);

        // Price
        const priceMatch = pageHtml.match(/(\d+[.,]\d{2})\s*\u20AC|\u20AC\s*(\d+[.,]\d{2})/);
        if (priceMatch) {
          precio = parseFloat((priceMatch[1] || priceMatch[2]).replace(',', '.'));
        }

        // Weight
        const weightMatch = pageHtml.match(/(\d+)\s*(g|kg)\b/i);
        if (weightMatch) {
          peso =
            weightMatch[2].toLowerCase() === 'kg'
              ? String(Number(weightMatch[1]) * 1000) + 'g'
              : weightMatch[1] + 'g';
        }

        // Better image hash from product page (gallery_square)
        const prodImgMatch = pageHtml.match(
          new RegExp(
            `content/products/${prod.brandSlug}/${prod.productSlug}/${prod.id}-([a-f0-9]+)\\.jpg`
          )
        );
        if (prodImgMatch) imgHash = prodImgMatch[1];
      } catch (e) {
        // Use basic data
      }

      // Download photo - prefer gallery_square
      let officialPhoto = '';
      let bestPhoto = '';
      const imgUrl = imgHash
        ? `https://www.cremashop.eu/media/cache/gallery_square/content/products/${prod.brandSlug}/${prod.productSlug}/${prod.id}-${imgHash}.jpg`
        : '';

      if (imgUrl) {
        try {
          const { buf, status } = await dl(imgUrl).then((b) => ({
            buf: b,
            status: 200,
          }));
          const meta = await sharp(buf).metadata();
          if (meta.width > 50 && buf.length > 1000) {
            // Square with padding
            const w = meta.width;
            const h = meta.height;
            const size = Math.max(w, h);
            const margin = Math.round(size * 0.08);
            const finalSize = size + margin * 2;
            const padLeft = Math.round((finalSize - w) / 2);
            const padTop = Math.round((finalSize - h) / 2);

            const processed = await sharp(buf)
              .flatten({ background: { r: 255, g: 255, b: 255 } })
              .extend({
                top: padTop,
                bottom: finalSize - h - padTop,
                left: padLeft,
                right: finalSize - w - padLeft,
                background: { r: 255, g: 255, b: 255 },
              })
              .resize(800, 800, { fit: 'inside', withoutEnlargement: false })
              .png()
              .toBuffer();

            const destPath = `cafe-photos-nobg/${prod.docId}.png`;
            const file = bucket.file(destPath);
            await file.save(processed, { contentType: 'image/png' });
            await file.makePublic();
            officialPhoto = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${destPath}`;
            bestPhoto = officialPhoto;
            photoOk++;
          } else {
            photoErr++;
          }
        } catch (e) {
          photoErr++;
        }
      } else {
        photoErr++;
      }

      // Skip products without photos
      if (!officialPhoto) {
        if (imported % 10 === 0)
          console.log(`Progress: ${imported}/${newProducts.length} (photos: ${photoOk})`);
        continue;
      }

      const marca = BRAND_NAMES[prod.brandSlug] || prod.brandSlug;
      const formato = detectFormat(prod.productSlug);

      const docData = {
        nombre,
        marca,
        descripcion,
        formato,
        peso,
        pais: '',
        tueste: '',
        especie: 'blend',
        categoria: 'comercial',
        precio: precio || '',
        moneda: 'EUR',
        sca_score: computeSCA({ especie: 'blend', descripcion, formato }),
        source: 'cremashop',
        officialPhoto,
        bestPhoto,
        photos: {
          official: [officialPhoto],
          user: [],
          selected: officialPhoto,
          source: 'official',
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('cafes').doc(prod.docId).set(docData);

      if (imported % 10 === 0)
        console.log(`Progress: ${imported}/${newProducts.length} (photos: ${photoOk})`);

      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`\n=== IMPORT COMPLETE ===`);
    console.log(`Processed: ${imported}`);
    console.log(`Photos OK: ${photoOk}`);
    console.log(`Photo errors/skipped: ${photoErr}`);
    process.exit(0);
  } catch (e) {
    console.error('Fatal:', e);
    process.exit(1);
  }
})();
