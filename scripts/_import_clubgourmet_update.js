#!/usr/bin/env node
/**
 * _import_clubgourmet_update.js – April 2026
 * Updates Club del Gourmet from downloaded images folder:
 *   - 5 NEW capsule products (10 cápsulas Nespresso): Brasil, Colombia, Etiopía, Guatemala, Kenia
 *   - Photo updates for existing products using local .avif/.jpg files
 */

const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

if (admin.apps.length === 0)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

const FOLDER = path.join(require('os').homedir(), 'Downloads', 'club gourmet');

// ─── NEW capsule products ───────────────────────────────────────
const NEW_CAPSULES = [
  {
    id: 'cdg_capsulas_brasil_10',
    nombre: 'Café de Brasil 100% Arábica 10 cápsulas Club del Gourmet',
    origen: 'Brasil',
    file: 'Café de Brasil 100% Arábica 10 cápsulas Club del Gourmet.avif',
  },
  {
    id: 'cdg_capsulas_colombia_10',
    nombre: 'Café de Colombia 100% Arábica 10 cápsulas Club del Gourmet',
    origen: 'Colombia',
    file: 'Café de Colombia 100% Arábica 10 cápsulas Club del Gourmet    .avif',
  },
  {
    id: 'cdg_capsulas_etiopia_10',
    nombre: 'Café de Etiopía 100% Arábica 10 cápsulas Club del Gourmet',
    origen: 'Etiopía',
    file: 'Café de Etiopía 100% Arábica 10 cápsulas Club del Gourmet.avif',
  },
  {
    id: 'cdg_capsulas_guatemala_10',
    nombre: 'Café de Guatemala 100% Arábica 10 cápsulas Club del Gourmet',
    origen: 'Guatemala',
    file: 'Café de Guatemala 100% Arábica 10 cápsulas Club del Gourmet Precio de venta.avif',
  },
  {
    id: 'cdg_capsulas_kenia_10',
    nombre: 'Café de Kenia 100% Arábica 10 cápsulas Club del Gourmet',
    origen: 'Kenia',
    file: 'Café de Kenia 100% Arábica 10 cápsulas Club del Gourmet.avif',
  },
];

// ─── Existing products → photo update mapping ──────────────────
const PHOTO_UPDATES = [
  // Grano
  {
    id: 'club-del-gourmet-cafe-en-grano-tueste-natural-100-arabica-origen-brasil-club-del-gourmet',
    file: 'Café en grano tueste natural 100% Arábica origen Brasil Club del Gourmet.avif',
  },
  {
    id: 'club-del-gourmet-cafe-en-grano-tueste-natural-100-arabica-origen-colombia-club-del-gourmet',
    file: 'Club del Gourmet Café en grano tueste natural 100% Arábica origen Colombia Club del Gourmet.avif',
  },
  {
    id: 'club-del-gourmet-cafe-en-grano-tueste-natural-100-arabica-origen-etiopia-club-del-gourmet',
    file: 'Club del Gourmet Café en grano tueste natural 100% Arábica origen Etiopía Club del Gourmet.avif',
  },
  {
    id: 'club-del-gourmet-cafe-en-grano-tueste-natural-100-arabica-origen-guatemala-club-del-gourmet',
    file: 'Club del Gourmet  Café en grano tueste natural 100% Arábica origen .avif',
  },
  {
    id: 'club-del-gourmet-cafe-en-grano-tueste-natural-100-arabica-origen-kenya-club-del-gourmet',
    file: 'Club del Gourmet  Café en grano tueste natural 100% Arábica origen.jpg',
  },
  // Descaf grano
  {
    id: 'eci_cdg_descafeinado_250',
    file: 'Club del Gourmet  Café descafeinado en grano tueste natural 100% Arábica origen Colombia Club del Gourmet Precio de venta+.avif',
  },
  // Molido
  {
    id: 'cdg_molido_brasil_250',
    file: 'Club del Gourmet Café molido tueste natural 100% Arábica origen Brasil Club del Gourmet.avif',
  },
  {
    id: 'eci_cdg_molido_colombia_250',
    file: 'Club del Gourmet Café molido tueste natural 100% Arábica origen Colombia Club del Gourmet.avif',
  },
  {
    id: 'cdg_molido_kenya_250',
    file: 'Club del Gourmet Café molido tueste natural 100% Arábica origen Kenya Club del Gourmet.avif',
  },
  {
    id: 'eci_cdg_molido_guatemala_250',
    file: 'Café molido tueste natural 100% Arábica origen Guatemala Club del Gourmet Precio de venta.avif',
  },
  { id: 'eci_cdg_molido_etiopia_250', file: null }, // no image in folder
  // Descaf molido
  {
    id: 'cdg_descaf_molido_colombia_250',
    file: 'Club del Gourmet  Café descafeinado molido tueste natural 100% Arábica origen Colombia Club del Gourmet Precio de venta.avif',
  },
];

// ─── Helpers ────────────────────────────────────────────────────

async function uploadPhoto(docId, filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 500) return null;
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

function photoFields(url) {
  return {
    fotoUrl: url,
    foto: url,
    imageUrl: url,
    officialPhoto: url,
    bestPhoto: url,
    imagenUrl: url,
    photos: { selected: url, original: url, bgRemoved: url },
  };
}

// ─── Main ───────────────────────────────────────────────────────

(async () => {
  console.log('\n=== Club del Gourmet Update ===\n');
  let created = 0,
    updated = 0,
    photos = 0,
    errors = 0;

  // 1) Create new capsule products
  console.log('--- NEW CAPSULE PRODUCTS ---');
  for (const p of NEW_CAPSULES) {
    const existing = await db.collection('cafes').doc(p.id).get();
    if (existing.exists) {
      console.log(`SKIP: ${p.id} (exists)`);
      continue;
    }

    console.log(`CREATE: ${p.id}`);
    const data = {
      nombre: p.nombre,
      marca: 'Club del Gourmet',
      roaster: 'Club del Gourmet',
      tipo: 'capsula',
      tipoProducto: 'capsulas',
      formato: '10 cápsulas',
      tamano: '10 cápsulas',
      capsulas: 10,
      sistema: 'Nespresso',
      compatibilidad: 'Nespresso',
      origen: p.origen,
      variedad: '100% Arábica',
      tueste: 'Natural',
      fuente: 'El Corte Inglés',
      fuentePais: 'ES',
      fecha: new Date().toISOString(),
      puntuacion: 0,
      votos: 0,
      status: 'approved',
      reviewStatus: 'approved',
      appVisible: true,
      updatedAt: new Date().toISOString(),
    };

    const filePath = path.join(FOLDER, p.file);
    if (fs.existsSync(filePath)) {
      try {
        const url = await uploadPhoto(p.id, filePath);
        if (url) {
          Object.assign(data, photoFields(url));
          photos++;
          console.log('  Photo OK');
        }
      } catch (e) {
        console.log(`  Photo ERR: ${e.message}`);
        errors++;
      }
    } else {
      console.log(`  File not found: ${p.file}`);
    }

    try {
      await db.collection('cafes').doc(p.id).set(data);
      created++;
      console.log(`  ${p.nombre}`);
    } catch (e) {
      console.log(`  DB ERR: ${e.message}`);
      errors++;
    }
  }

  // 2) Update photos for existing products
  console.log('\n--- PHOTO UPDATES ---');
  for (const u of PHOTO_UPDATES) {
    if (!u.file) continue;
    const filePath = path.join(FOLDER, u.file);
    if (!fs.existsSync(filePath)) {
      console.log(`SKIP: ${u.id} (file not found: ${u.file})`);
      continue;
    }

    const doc = await db.collection('cafes').doc(u.id).get();
    if (!doc.exists) {
      console.log(`SKIP: ${u.id} (not in DB)`);
      continue;
    }

    const da = doc.data();
    if (da.fotoUrl) {
      console.log(`SKIP: ${u.id} (already has photo)`);
      continue;
    }

    console.log(`UPDATE: ${u.id}`);
    try {
      const url = await uploadPhoto(u.id, filePath);
      if (url) {
        await db.collection('cafes').doc(u.id).update(photoFields(url));
        photos++;
        updated++;
        console.log('  Photo OK');
      }
    } catch (e) {
      console.log(`  Photo ERR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(
    `Created: ${created} | Updated photos: ${updated} | Total photos: ${photos} | Errors: ${errors}`
  );
  process.exit(0);
})();
