/**
 * Update Hacendado catalog from Mercadona API (2026-04-27)
 * - Add 17 new products
 * - Mark 4 discontinued products
 * - Fix hacendado-capsulas-descafeinado price (2.85→3.85)
 * - Upload photos for all new products
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
          return fetchJSON(res.headers.location).then(resolve, reject);
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()));
          } catch (e) {
            reject(new Error('JSON parse error: ' + e.message));
          }
        });
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
          return fetchBuf(res.headers.location).then(resolve, reject);
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function uploadPhoto(docId, imageUrl) {
  const buf = await fetchBuf(imageUrl);
  if (buf.length < 500) {
    console.log('  SKIP photo (too small):', docId);
    return null;
  }
  const out = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(out, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

// New products to add (IDs not in current DB)
const NEW_IDS = [
  '23293',
  '52775', // DG capsules
  '11178',
  '15923',
  '13700',
  '13593', // Molido (new sizes)
  '13594',
  '52491',
  '11076', // Grano (replacements)
  '22718',
  '22164',
  '23406',
  '67660', // Soluble
  '10666',
  '10642',
  '10644',
  '10672', // Bebidas frías
];

// Discontinued product IDs (404 on API)
const DISCONTINUED = ['mercadona_14798', 'mercadona_14799', 'mercadona_19924', 'mercadona_11021'];

function determineType(slug, displayName, categories) {
  const n = (displayName + ' ' + slug).toLowerCase();
  if (n.includes('grano')) return { tipo: 'grano', formato: 'beans' };
  if (n.includes('molido')) return { tipo: 'molido', formato: 'ground' };
  if (n.includes('capsula') || n.includes('monodosis'))
    return { tipo: 'cápsula', formato: 'capsules' };
  if (n.includes('soluble')) return { tipo: 'soluble', formato: 'instant' };
  if (
    n.includes('leche') ||
    n.includes('cappuccino') ||
    n.includes('espresso') ||
    n.includes('cortado')
  )
    return { tipo: 'bebida', formato: 'ready-to-drink' };
  return { tipo: 'otro', formato: 'other' };
}

function formatSize(unitSize, sizeFormat) {
  if (sizeFormat === 'kg') {
    if (unitSize >= 1) return `${unitSize}kg`;
    return `${Math.round(unitSize * 1000)}g`;
  }
  if (sizeFormat === 'l') {
    if (unitSize >= 1) return `${unitSize}L`;
    return `${Math.round(unitSize * 1000)}ml`;
  }
  return `${unitSize}${sizeFormat}`;
}

(async () => {
  const now = new Date().toISOString();
  let added = 0,
    updated = 0,
    discontinued = 0;

  // 1. Add new products
  console.log('=== ADDING NEW PRODUCTS ===');
  for (const mid of NEW_IDS) {
    const docId = `mercadona_${mid}`;
    // Check if already exists
    const existing = await db.collection('cafes').doc(docId).get();
    if (existing.exists) {
      console.log(`SKIP (exists): ${docId}`);
      continue;
    }

    // Fetch product details from API
    let prod;
    try {
      prod = await fetchJSON(
        `https://tienda.mercadona.es/api/v1_1/products/${mid}/?lang=es&wh=mad1`
      );
    } catch (e) {
      console.log(`ERR fetching ${mid}: ${e.message}`);
      continue;
    }

    const pi = prod.price_instructions;
    const price = parseFloat(pi.unit_price);
    const { tipo, formato } = determineType(prod.slug, prod.display_name, prod.categories);
    const decaf =
      (prod.display_name + ' ' + prod.slug).toLowerCase().includes('descafeinado') ||
      (prod.display_name + ' ' + prod.slug).toLowerCase().includes('descaf');
    const size = formatSize(pi.unit_size, pi.size_format);

    // Get high-res photo URL
    const photoSrc =
      prod.photos && prod.photos[0] ? prod.photos[0].zoom || prod.photos[0].regular : null;

    // Upload photo to Storage
    let photoUrl = null;
    if (photoSrc) {
      try {
        photoUrl = await uploadPhoto(docId, photoSrc);
        console.log(`  Photo uploaded: ${docId}`);
      } catch (e) {
        console.log(`  Photo ERR ${docId}: ${e.message}`);
      }
    }

    const doc = {
      nombre: prod.display_name,
      name: prod.display_name,
      marca: 'Hacendado',
      roaster: 'Hacendado',
      mercadonaId: mid,
      ean: prod.ean || '',
      category: 'supermarket',
      coffeeCategory: 'daily',
      tipo,
      formato,
      format: formato,
      cantidad: pi.unit_size * 1000,
      tamano: size,
      precio: price,
      decaf,
      fuente: 'mercadona',
      fuentePais: 'ES',
      fuenteUrl: prod.share_url,
      urlProducto: prod.share_url,
      descripcion: prod.description || prod.display_name,
      legalName: prod.legal_name || '',
      fecha: now,
      puntuacion: 0,
      votos: 0,
      status: 'approved',
      reviewStatus: 'approved',
      appVisible: true,
      scannerVisible: true,
      provisional: false,
      adminReviewedAt: now,
      updatedAt: now,
      approvedAt: now,
      createdAt: now,
    };

    // Add unit info
    if (pi.total_units) {
      doc.unidades = pi.total_units;
      doc.unitName = pi.unit_name || '';
    }

    // Photo fields
    if (photoUrl) {
      doc.fotoUrl = photoUrl;
      doc.foto = photoUrl;
      doc.imageUrl = photoUrl;
      doc.officialPhoto = photoUrl;
      doc.bestPhoto = photoUrl;
      doc.imagenUrl = photoUrl;
      doc.photos = { selected: photoUrl, original: photoUrl, bgRemoved: photoUrl };
    } else {
      const mercaPhoto = photoSrc || '';
      doc.fotoUrl = mercaPhoto;
      doc.foto = mercaPhoto;
      doc.imageUrl = mercaPhoto;
      doc.officialPhoto = mercaPhoto;
      doc.bestPhoto = mercaPhoto;
      doc.imagenUrl = mercaPhoto;
    }

    await db.collection('cafes').doc(docId).set(doc);
    console.log(`ADDED: ${docId} - ${prod.display_name} - ${price}€ (${size})`);
    added++;
  }

  // 2. Mark discontinued products
  console.log('\n=== MARKING DISCONTINUED ===');
  for (const docId of DISCONTINUED) {
    const ref = db.collection('cafes').doc(docId);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`SKIP (not found): ${docId}`);
      continue;
    }
    await ref.update({
      appVisible: false,
      status: 'discontinued',
      discontinuedAt: now,
      updatedAt: now,
    });
    console.log(`DISCONTINUED: ${docId} - ${snap.data().nombre}`);
    discontinued++;
  }

  // 3. Fix hacendado-capsulas-descafeinado price
  console.log('\n=== PRICE FIXES ===');
  const capsDescRef = db.collection('cafes').doc('hacendado-capsulas-descafeinado');
  const capsDescSnap = await capsDescRef.get();
  if (capsDescSnap.exists && capsDescSnap.data().precio !== 3.85) {
    await capsDescRef.update({ precio: 3.85, updatedAt: now });
    console.log(`PRICE FIX: hacendado-capsulas-descafeinado ${capsDescSnap.data().precio} → 3.85€`);
    updated++;
  }

  // Also check/update hacendado-cafe-en-grano-natural and hacendado-cafe-en-grano-colombia as discontinued
  for (const dup of ['hacendado-cafe-en-grano-colombia', 'hacendado-cafe-en-grano-natural']) {
    const ref = db.collection('cafes').doc(dup);
    const snap = await ref.get();
    if (snap.exists && snap.data().appVisible !== false) {
      await ref.update({
        appVisible: false,
        status: 'discontinued',
        discontinuedAt: now,
        updatedAt: now,
      });
      console.log(`DISCONTINUED (dup): ${dup} - ${snap.data().nombre}`);
      discontinued++;
    }
  }

  console.log(
    `\n=== DONE: ${added} added, ${updated} price fixes, ${discontinued} discontinued ===`
  );
  process.exit(0);
})();
