#!/usr/bin/env node
/**
 * _import_bm.js
 * ────────────────────────────────────────────────────────────
 * 1. Deletes ALL existing "BM" cafés from Firestore + Storage
 * 2. Imports new BM cafés from ~/Downloads/BM/
 *
 * Usage:
 *   node scripts/_import_bm.js --dry-run
 *   node scripts/_import_bm.js
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
const SRC_DIR = path.join(require('os').homedir(), 'Downloads', 'BM');
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

function cleanName(filename) {
  let name = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '').trim();
  // Remove brand prefix "BM " or "bm "
  name = name.replace(/^bm\s+/i, '').trim();
  // Capitalize first letter
  name = name.charAt(0).toUpperCase() + name.slice(1);
  return name;
}

function inferFormato(name) {
  const n = nfd(name).toLowerCase();
  if (/capsulas|compatibles|capsula/i.test(n)) return 'capsules';
  if (/grano/i.test(n)) return 'beans';
  if (/molido/i.test(n)) return 'ground';
  if (/soluble|instant/i.test(n)) return 'instant';
  if (/latte|cappuccino/i.test(n)) return 'ready_to_drink';
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
  return '';
}

function inferCompatibilidad(name) {
  const n = nfd(name).toLowerCase();
  if (/nespresso/i.test(n)) return 'Nespresso';
  if (/dolce\s*gusto/i.test(n)) return 'Dolce Gusto';
  return '';
}

function inferPeso(name) {
  const ml = name.match(/(\d+)\s*ml\b/i);
  if (ml) return ml[1] + 'ml';
  const g = name.match(/(\d+)\s*g\b/i);
  if (g) return g[1] + 'g';
  const kg = name.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
  if (kg) return kg[1].replace(',', '.') + 'kg';
  const uds = name.match(/(\d+)\s*(?:uds|unidades|capsulas|caps)/i);
  if (uds) return uds[1] + ' uds';
  return '';
}

function buildDocId(filename) {
  const cleaned = cleanName(filename);
  const slug = slugify(cleaned);
  return `bm_${slug}`.slice(0, 90);
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
  console.log(`=== Import BM ${DRY_RUN ? '[DRY RUN]' : ''} ===\n`);

  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .sort();
  console.log(`  Found ${files.length} photos\n`);

  const cafes = files.map((f) => {
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
        marca: 'BM',
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
        fuente: 'BM Supermercados',
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

  // Handle duplicate IDs
  const counts = {};
  for (const c of cafes) {
    counts[c.docId] = (counts[c.docId] || 0) + 1;
    if (counts[c.docId] > 1) c.docId = `${c.docId}_${counts[c.docId]}`;
  }

  console.log(`  Total: ${cafes.length} cafés\n`);

  if (DRY_RUN) {
    cafes.forEach((c, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${c.docId}`);
      console.log(`      ${c.doc.nombre}`);
      console.log(
        `      fmt=${c.doc.formato} tipo=${c.doc.tipo} peso=${c.doc.peso} pais=${c.doc.pais} var=${c.doc.variedad}`
      );
      if (c.doc.notas) console.log(`      ${c.doc.notas}`);
      console.log();
    });
    return;
  }

  // Phase 1: Delete existing BM cafés
  console.log('  Phase 1: Deleting existing BM cafés...');
  const existingSnap = await db.collection('cafes').where('marca', '==', 'BM').get();
  console.log(`    Found ${existingSnap.size} existing "BM" docs`);

  for (const doc of existingSnap.docs) {
    await doc.ref.delete();
    try {
      await bucket.file(`${STORAGE_PREFIX}/${doc.id}.png`).delete();
    } catch {}
  }
  console.log(`    Deleted ${existingSnap.size} docs`);

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
  console.log(`  Deleted: ${existingSnap.size} old BM cafés`);
  console.log(`  Created: ${created} new BM cafés`);
  if (errors > 0) console.log(`  Errors: ${errors}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
