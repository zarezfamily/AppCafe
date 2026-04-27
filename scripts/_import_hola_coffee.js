#!/usr/bin/env node
/**
 * Import/Update Hola Coffee from official hola.coffee Shopify store
 * Deletes discontinued, updates existing, creates new products with photos
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

async function processAndUpload(docId, imgUrl) {
  const buf = await fetchBuf(imgUrl);
  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(processed, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

function mapOrigin(tags) {
  const origins = [
    'Brasil',
    'Colombia',
    'Costa Rica',
    'Etiopía',
    'Guatemala',
    'Kenia',
    'México',
    'Indonesia',
  ];
  const found = origins.filter((o) => tags.includes(o));
  return found.length === 1 ? found[0] : found.join(', ');
}

function mapTueste(tags) {
  if (tags.includes('Light')) return 'claro';
  if (tags.includes('Medium')) return 'medio';
  return '';
}

function mapProceso(tags) {
  if (tags.includes('Proceso Natural') && tags.includes('Proceso Lavado'))
    return 'Natural y lavado';
  if (tags.includes('Proceso Natural')) return 'Natural';
  if (tags.includes('Proceso Lavado')) return 'Lavado';
  if (tags.includes('Proceso Honey')) return 'Honey';
  return '';
}

function mapPerfil(tags) {
  const perfiles = [
    'Acaramelado',
    'Achocolatado',
    'Cremoso',
    'Especiado',
    'Floral',
    'Frutal',
    'Jugoso',
  ];
  return perfiles.filter((p) => tags.includes(p)).join(', ');
}

function extractBody(html) {
  if (!html) return {};
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const info = {};
  const altM = text.match(/Altitud:\s*([^P\n]+)/i);
  if (altM) info.altitud = altM[1].trim().replace(/\s+/g, ' ');
  const varM = text.match(/Varietal:\s*([^P\n]+)/i);
  if (varM) info.varietal = varM[1].trim().replace(/\s+/g, ' ');
  const prodM = text.match(/Productor:\s*([^C\n]+)/i);
  if (prodM) info.productor = prodM[1].trim().replace(/\s+/g, ' ');
  const cosM = text.match(/Cosecha:\s*(\d{4})/i);
  if (cosM) info.cosecha = cosM[1];
  return info;
}

const baseData = {
  marca: 'Hola Coffee',
  pais: 'España',
  tipo: 'natural',
  coffeeCategory: 'specialty',
  category: 'specialty',
  fuente: 'hola.coffee',
  fuentePais: 'ES',
  isBio: false,
  decaf: false,
  fecha: new Date().toISOString(),
  puntuacion: 0,
  votos: 0,
  status: 'approved',
  reviewStatus: 'approved',
  appVisible: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function main() {
  const DRY = process.argv.includes('--dry-run');

  // Fetch products from Shopify JSON API
  console.log('Fetching products from hola.coffee...');
  const json = (
    await fetchBuf('https://hola.coffee/collections/cafe-en-grano-o-molido/products.json?limit=250')
  ).toString();
  const { products } = JSON.parse(json);
  console.log(`  Found ${products.length} products in collection\n`);

  // Filter: skip tarjeta regalo, bundles, pack descubrimiento
  const skipHandles = [
    'tarjetas-regalo',
    'on-off-bundle-lucero-blend-no-molestar-decaf',
    'blend-bundle',
    'caja-descubrimiento-4-cafes-de-100gr',
  ];
  const coffees = products.filter((p) => !skipHandles.includes(p.handle));
  console.log(`  ${coffees.length} coffee products after filtering\n`);

  // Map existing doc IDs
  const existingMap = {
    luceroblend: 'hola-coffee-lucero-blend',
    'colombia-cold-washed': 'hola-coffee-colombia-cold-washed',
  };
  const toDelete = ['hola-coffee-brazil-fazenda-serra']; // discontinued

  console.log(
    `=== Hola Coffee Import ${DRY ? '[DRY RUN]' : ''} === (${coffees.length} products, ${toDelete.length} to delete)\n`
  );

  if (DRY) {
    toDelete.forEach((id) => console.log(`  DELETE: ${id}`));
    coffees.forEach((p, i) => {
      const action = existingMap[p.handle] ? 'UPDATE' : 'CREATE';
      const docId = existingMap[p.handle] || `hola_coffee_${p.handle.replace(/-/g, '_')}`;
      console.log(`  ${(i + 1).toString().padStart(2)}. [${action}] ${docId} ← ${p.title}`);
    });
    return;
  }

  // Delete discontinued
  for (const id of toDelete) {
    try {
      await db.collection('cafes').doc(id).delete();
      try {
        await bucket.file(`${PREFIX}/${id}.png`).delete();
      } catch {}
      console.log(`  Deleted: ${id}`);
    } catch (e) {
      console.log(`  WARN delete ${id}: ${e.message}`);
    }
  }

  let created = 0,
    updated = 0;
  for (const p of coffees) {
    const handle = p.handle;
    const isUpdate = !!existingMap[handle];
    const docId = existingMap[handle] || `hola_coffee_${handle.replace(/-/g, '_')}`;

    try {
      // Get image
      const imgUrl = p.images && p.images[0] ? p.images[0].src : null;
      let photoUrl = '';
      if (imgUrl) {
        photoUrl = await processAndUpload(docId, imgUrl);
      }

      const tags = p.tags || [];
      const perfil = mapPerfil(tags);
      const proceso = mapProceso(tags);
      const origen = mapOrigin(tags);
      const tueste = mapTueste(tags);
      const bodyInfo = extractBody(p.body_html);
      const isDecaf = tags.includes('Descafeinado');

      // Build notas
      const notasParts = [];
      if (proceso) notasParts.push(`Proceso: ${proceso}`);
      if (bodyInfo.varietal) notasParts.push(`Varietal: ${bodyInfo.varietal}`);
      if (bodyInfo.altitud) notasParts.push(`Altitud: ${bodyInfo.altitud}`);
      if (bodyInfo.productor) notasParts.push(`Productor: ${bodyInfo.productor}`);
      if (perfil) notasParts.push(`Perfil: ${perfil}`);
      if (bodyInfo.cosecha) notasParts.push(`Cosecha: ${bodyInfo.cosecha}`);

      // Determine formato from product type and tags
      let formato = 'grano';
      if (tags.includes('Cápsulas')) formato = 'capsules';

      const photoFields = photoUrl
        ? {
            fotoUrl: photoUrl,
            foto: photoUrl,
            imageUrl: photoUrl,
            officialPhoto: photoUrl,
            bestPhoto: photoUrl,
            imagenUrl: photoUrl,
            photos: { selected: photoUrl, original: photoUrl, bgRemoved: photoUrl },
          }
        : {};

      if (isUpdate) {
        await db
          .collection('cafes')
          .doc(docId)
          .update({
            nombre: p.title,
            origen,
            tueste,
            notas: notasParts.join('. '),
            ...(isDecaf ? { decaf: true, tipo: 'descafeinado' } : {}),
            ...photoFields,
            updatedAt: new Date().toISOString(),
          });
        updated++;
      } else {
        const doc = {
          ...baseData,
          nombre: p.title,
          formato,
          origen,
          tueste,
          variedad: bodyInfo.varietal || '',
          peso: '',
          notas: notasParts.join('. '),
          ...(isDecaf ? { decaf: true, tipo: 'descafeinado' } : {}),
          ...photoFields,
        };
        await db.collection('cafes').doc(docId).set(doc);
        created++;
      }
      process.stdout.write(`\r  Processed ${created + updated}/${coffees.length}`);
    } catch (e) {
      console.log(`\n  ERROR ${docId}: ${e.message}`);
    }
  }
  console.log(
    `\n\n=== Done: ${toDelete.length} deleted, ${created} created, ${updated} updated ===`
  );
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
