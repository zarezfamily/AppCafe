#!/usr/bin/env node
/**
 * Scrape cremashop capsule product details and import to Firestore.
 * Reads /tmp/cremashop_capsules_new.json, scrapes each product page,
 * downloads photos, and imports to Firestore.
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

function downloadBuf(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadBuf(res.headers.location).then(resolve).catch(reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ buf: Buffer.concat(chunks), status: res.statusCode }));
      })
      .on('error', reject);
  });
}

function downloadText(url) {
  return downloadBuf(url).then((r) => r.buf.toString());
}

const BRAND_NAMES = {
  carraro: 'Carraro',
  'miscela-d-oro': "Miscela d'Oro",
  lucaffe: 'Lucaffé',
  mokaflor: 'Mokaflor',
  illy: 'illy',
  passalacqua: 'Passalacqua',
  pera: 'Pera',
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
    .replace(/\bCapsule\b/gi, 'Cápsulas');
}

function computeSCA(data) {
  let score = 70; // capsules start slightly lower
  if (data.especie === 'arabica') score += 4;
  else if (data.especie === 'blend') score += 2;
  if (data.tueste === 'medium') score += 2;
  else if (data.tueste === 'light') score += 3;
  if (data.pais && data.pais.length > 3) score += 2;
  if (data.descripcion && data.descripcion.length > 50) score += 1;
  if (data.categoria === 'especialidad') score += 5;
  else if (data.categoria === 'premium') score += 3;
  return Math.min(score, 85);
}

function detectFormat(slug, name) {
  const s = (slug + ' ' + name).toLowerCase();
  if (s.includes('nespresso')) return 'capsulas-nespresso';
  if (s.includes('dolce gusto') || s.includes('dolce-gusto')) return 'capsulas-dolce-gusto';
  if (s.includes('pod') || s.includes('ese')) return 'monodosis';
  return 'capsulas';
}

(async () => {
  try {
    const newProducts = JSON.parse(fs.readFileSync('/tmp/cremashop_capsules_new.json'));
    console.log(`Products to process: ${newProducts.length}`);

    // Filter out 'misc' brand (selection packs)
    const products = newProducts.filter((p) => p.brandSlug !== 'misc');
    console.log(`After filtering misc: ${products.length}`);

    // Remove duplicates by slug
    const seen = new Set();
    const unique = products.filter((p) => {
      const key = p.brandSlug + '/' + p.productSlug;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    console.log(`Unique products: ${unique.length}`);

    let imported = 0;
    let photoSuccess = 0;
    let photoErrors = 0;

    for (const prod of unique) {
      imported++;
      const docId = (prod.brandSlug + '_' + prod.productSlug).replace(/[^a-z0-9_-]/g, '');

      // Check if already exists
      const existing = await db.collection('cafes').doc(docId).get();
      if (existing.exists) {
        console.log(`  Skip (exists): ${docId}`);
        continue;
      }

      // Scrape product page for details
      let descripcion = '';
      let peso = '';
      let precio = '';
      let imgHash = '';
      try {
        const url = `https://www.cremashop.eu/es/products/${prod.brandSlug}/${prod.productSlug}/${prod.id}`;
        const html = await downloadText(url);

        // Description
        const descMatch = html.match(
          /<div[^>]*class="[^"]*product-description[^"]*"[^>]*>([\s\S]*?)<\/div>/
        );
        if (descMatch) {
          descripcion = descMatch[1]
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 500);
        }

        // Price
        const priceMatch = html.match(/(\d+[.,]\d{2})\s*€|€\s*(\d+[.,]\d{2})/);
        if (priceMatch) {
          precio = parseFloat((priceMatch[1] || priceMatch[2]).replace(',', '.'));
        }

        // Weight
        const weightMatch = html.match(/(\d+)\s*(g|kg)\b/i);
        if (weightMatch) {
          peso =
            weightMatch[2].toLowerCase() === 'kg'
              ? String(Number(weightMatch[1]) * 1000) + 'g'
              : weightMatch[1] + 'g';
        }

        // Image hash from product page (gallery_square is best)
        const imgMatch = html.match(
          new RegExp(
            `content/products/${prod.brandSlug}/${prod.productSlug}/${prod.id}-([a-f0-9]+)\\.jpg`
          )
        );
        if (imgMatch) imgHash = imgMatch[1];
      } catch (e) {
        // Continue with basic data
      }

      // Download photo - try gallery_square first (best quality)
      let officialPhoto = '';
      let bestPhoto = '';
      const imgSource = imgHash
        ? `https://www.cremashop.eu/media/cache/gallery_square/content/products/${prod.brandSlug}/${prod.productSlug}/${prod.id}-${imgHash}.jpg`
        : prod.imageUrl;

      if (imgSource) {
        try {
          const { buf, status } = await downloadBuf(imgSource);
          if (status === 200 && buf.length > 1000) {
            const metadata = await sharp(buf).metadata();
            if (metadata.width > 50) {
              // Make square with padding (same as fix script)
              const w = metadata.width;
              const h = metadata.height;
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
                .resize(800, 800, {
                  fit: 'inside',
                  withoutEnlargement: false,
                })
                .png()
                .toBuffer();

              const destPath = `cafe-photos-nobg/${docId}.png`;
              const file = bucket.file(destPath);
              await file.save(processed, { contentType: 'image/png' });
              await file.makePublic();
              officialPhoto = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${destPath}`;
              bestPhoto = officialPhoto;
              photoSuccess++;
            }
          }
        } catch (e) {
          photoErrors++;
        }
      }

      const marca = BRAND_NAMES[prod.brandSlug] || prod.brandSlug;
      const nombre = formatName(prod.productSlug);
      const formato = detectFormat(prod.productSlug, nombre);

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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (officialPhoto) {
        docData.officialPhoto = officialPhoto;
        docData.bestPhoto = bestPhoto;
        docData.photos = {
          official: [officialPhoto],
          user: [],
          selected: officialPhoto,
          source: 'official',
        };
      }

      await db.collection('cafes').doc(docId).set(docData);

      if (imported % 10 === 0) {
        console.log(
          `Progress: ${imported}/${unique.length} (photos: ${photoSuccess}, errors: ${photoErrors})`
        );
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`\n=== IMPORT COMPLETE ===`);
    console.log(`Imported: ${imported}`);
    console.log(`Photos: ${photoSuccess}`);
    console.log(`Photo errors: ${photoErrors}`);
    process.exit(0);
  } catch (e) {
    console.error('Fatal:', e);
    process.exit(1);
  }
})();
