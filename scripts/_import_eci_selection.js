#!/usr/bin/env node
/**
 * _import_eci_selection.js
 * ────────────────────────────────────────────────────────────
 * 1. Deletes existing "El Corte Inglés" cafés (NOT Club del Gourmet)
 * 2. Imports 29 new cafés from ~/Downloads/el corte ingles selection/
 * 3. Splits into "El Corte Inglés" vs "El Corte Inglés Selection"
 *
 * Usage:
 *   node scripts/_import_eci_selection.js --dry-run
 *   node scripts/_import_eci_selection.js
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();

const DRY_RUN = process.argv.includes('--dry-run');
const SRC_DIR = path.join(require('os').homedir(), 'Downloads', 'el corte ingles selection');
const STORAGE_PREFIX = 'cafe-photos-nobg';

// ── Helpers ────────────────────────────────────────────────────────

function nfd(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function slugify(str) {
  return nfd(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/_+/g, '_');
}

function isSelection(filename) {
  return /\bselection\b/i.test(nfd(filename));
}

function inferMarca(filename) {
  return isSelection(filename) ? 'El Corte Inglés Selection' : 'El Corte Inglés';
}

function cleanName(filename) {
  let name = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '').trim();
  // Remove brand prefix
  name = name
    .replace(/^el corte ingles selection\s*/i, '')
    .replace(/^el corte ingles\s*/i, '')
    .trim();
  // Capitalize first letter
  name = name.charAt(0).toUpperCase() + name.slice(1);
  // Clean trailing dots/spaces
  name = name.replace(/\.+$/, '').trim();
  return name;
}

function inferFormato(name) {
  const n = nfd(name).toLowerCase();
  if (/capsulas|compatibles/i.test(n)) return 'capsules';
  if (/grano/i.test(n)) return 'beans';
  if (/molido/i.test(n)) return 'ground';
  if (/soluble|instant/i.test(n)) return 'instant';
  if (/cappuccino|macchiatto|expresso.*arabica/i.test(n)) return 'capsules';
  return '';
}

function inferTipo(name) {
  const n = nfd(name).toLowerCase();
  if (/descafeinado|descaf/i.test(n)) return 'descafeinado';
  if (/mezcla|torrefacto/i.test(n)) return 'mezcla';
  return 'natural';
}

function inferOrigen(name) {
  const n = nfd(name).toLowerCase();
  if (/colombia/i.test(n)) return 'Colombia';
  if (/brasil/i.test(n)) return 'Brasil';
  if (/etiopia/i.test(n)) return 'Etiopía';
  if (/peru/i.test(n)) return 'Perú';
  if (/guatemala/i.test(n)) return 'Guatemala';
  if (/costa rica/i.test(n)) return 'Costa Rica';
  if (/kenya/i.test(n)) return 'Kenya';
  if (/honduras/i.test(n)) return 'Honduras';
  return '';
}

function inferVariedad(name) {
  if (/100\s*%?\s*ar[aá]bica/i.test(name)) return '100% Arábica';
  if (/ar[aá]bica/i.test(name)) return 'Arábica';
  return '';
}

function inferIntensidad(name) {
  const m = name.match(/intensidad\s*(\d{1,2})/i) || name.match(/\bI\s*(\d{1,2})\b/);
  return m ? parseInt(m[1], 10) : null;
}

function inferTueste(name) {
  const n = nfd(name).toLowerCase();
  if (/torrefacto/i.test(n)) return 'torrefacto';
  const intensidad = inferIntensidad(name);
  if (intensidad) {
    if (intensidad <= 5) return 'claro';
    if (intensidad <= 8) return 'medio';
    return 'oscuro';
  }
  if (/tueste natural|tostado natural/i.test(n)) return 'medio';
  return '';
}

function inferCompatibilidad(name) {
  const n = nfd(name).toLowerCase();
  if (/nespresso/i.test(n)) return 'Nespresso';
  if (/dolce\s*gusto/i.test(n)) return 'Dolce Gusto';
  return '';
}

function inferPeso(name) {
  const g = name.match(/(\d+)\s*g\b/i);
  if (g) return g[1] + 'g';
  const kg = name.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
  if (kg) return kg[1].replace(',', '.') + 'kg';
  const uds = name.match(/(\d+)\s*(?:uds|capsulas|caps)/i);
  if (uds) return uds[1] + ' uds';
  return '';
}

function buildDocId(filename) {
  const sel = isSelection(filename) ? 'eci_sel' : 'eci';
  const cleaned = cleanName(filename);
  const slug = slugify(cleaned);
  return `${sel}_${slug}`.slice(0, 90);
}

async function processImage(filePath) {
  const buf = fs.readFileSync(filePath);
  return sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
}

async function uploadPhoto(docId, imgBuffer) {
  const storagePath = `${STORAGE_PREFIX}/${docId}.png`;
  const file = bucket.file(storagePath);
  try {
    await file.delete();
  } catch {}
  await file.save(imgBuffer, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log(`=== Import ECI + ECI Selection ${DRY_RUN ? '[DRY RUN]' : ''} ===\n`);

  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .sort();
  console.log(`  Found ${files.length} photos\n`);

  const cafes = files.map((f) => {
    const marca = inferMarca(f);
    const nombre = cleanName(f);
    const docId = buildDocId(f);
    const formato = inferFormato(f);
    const tipo = inferTipo(f);
    const peso = inferPeso(f);
    const origen = inferOrigen(f);
    const variedad = inferVariedad(f);
    const intensidad = inferIntensidad(f);
    const tueste = inferTueste(f);
    const compat = inferCompatibilidad(f);

    return {
      file: f,
      docId,
      doc: {
        nombre,
        marca,
        pais: origen || 'España',
        origen,
        formato,
        tipo,
        peso,
        variedad,
        tueste,
        notas: [compat ? `Compatible ${compat}` : '', intensidad ? `Intensidad ${intensidad}` : '']
          .filter(Boolean)
          .join('. '),
        coffeeCategory: 'daily',
        category: 'supermarket',
        fuente: 'El Corte Inglés',
        fuentePais: 'ES',
        isBio: false,
        decaf: tipo === 'descafeinado',
        fecha: new Date().toISOString(),
        puntuacion: 0,
        votos: 0,
        status: 'approved',
        reviewStatus: 'approved',
        appVisible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  });

  // Check duplicates
  const ids = cafes.map((c) => c.docId);
  const counts = {};
  for (const c of cafes) {
    counts[c.docId] = (counts[c.docId] || 0) + 1;
    if (counts[c.docId] > 1) c.docId = `${c.docId}_${counts[c.docId]}`;
  }

  const selCount = cafes.filter((c) => c.doc.marca === 'El Corte Inglés Selection').length;
  const eciCount = cafes.filter((c) => c.doc.marca === 'El Corte Inglés').length;
  console.log(`  El Corte Inglés: ${eciCount}`);
  console.log(`  El Corte Inglés Selection: ${selCount}\n`);

  if (DRY_RUN) {
    cafes.forEach((c, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. [${c.doc.marca}] ${c.docId}`);
      console.log(`      ${c.doc.nombre}`);
      console.log(
        `      fmt=${c.doc.formato} tipo=${c.doc.tipo} peso=${c.doc.peso} pais=${c.doc.pais} var=${c.doc.variedad}`
      );
      if (c.doc.notas) console.log(`      ${c.doc.notas}`);
      console.log();
    });
    return;
  }

  // Phase 1: Delete existing ECI cafés (NOT Club del Gourmet)
  console.log('  Phase 1: Deleting existing El Corte Inglés cafés...');
  const existingSnap = await db.collection('cafes').where('marca', '==', 'El Corte Inglés').get();
  console.log(`    Found ${existingSnap.size} existing "El Corte Inglés" docs`);

  for (const doc of existingSnap.docs) {
    await doc.ref.delete();
    try {
      await bucket.file(`${STORAGE_PREFIX}/${doc.id}.png`).delete();
    } catch {}
  }
  console.log(`    Deleted ${existingSnap.size} docs`);

  // Also delete any existing "El Corte Inglés Selection"
  const selSnap = await db
    .collection('cafes')
    .where('marca', '==', 'El Corte Inglés Selection')
    .get();
  if (selSnap.size > 0) {
    console.log(`    Found ${selSnap.size} existing "El Corte Inglés Selection" docs`);
    for (const doc of selSnap.docs) {
      await doc.ref.delete();
      try {
        await bucket.file(`${STORAGE_PREFIX}/${doc.id}.png`).delete();
      } catch {}
    }
    console.log(`    Deleted ${selSnap.size} Selection docs`);
  }

  // Phase 2: Upload + create
  console.log(`\n  Phase 2: Creating ${cafes.length} new cafés...`);
  let created = 0;
  let errors = 0;

  for (const c of cafes) {
    try {
      const filePath = path.join(SRC_DIR, c.file);
      const imgBuf = await processImage(filePath);
      const photoUrl = await uploadPhoto(c.docId, imgBuf);

      const fullDoc = {
        ...c.doc,
        fotoUrl: photoUrl,
        foto: photoUrl,
        imageUrl: photoUrl,
        officialPhoto: photoUrl,
        bestPhoto: photoUrl,
        imagenUrl: photoUrl,
        photos: { selected: photoUrl, original: photoUrl, bgRemoved: photoUrl },
      };

      await db.collection('cafes').doc(c.docId).set(fullDoc);
      created++;
      process.stdout.write(`\r    Created ${created}/${cafes.length}`);
    } catch (err) {
      errors++;
      console.log(`\n    ERROR ${c.docId}: ${err.message}`);
    }
  }

  console.log(`\n\n=== Done ===`);
  console.log(`  Deleted: ${existingSnap.size + selSnap.size} old ECI cafés`);
  console.log(`  Created: ${created} new (${eciCount} ECI + ${selCount} Selection)`);
  if (errors > 0) console.log(`  Errors: ${errors}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
