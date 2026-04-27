#!/usr/bin/env node
/**
 * _import_auchan_v2.js
 * ────────────────────────────────────────────────────────────
 * 1. Deletes ALL existing AUCHAN cafés from Firestore + Storage
 * 2. Parses the 71 filenames from ~/Downloads/auchan/
 * 3. Infers all metadata from the product name
 * 4. Uploads photos (800x800 white bg PNG) to Storage
 * 5. Creates new café docs in Firestore with full data
 *
 * Usage:
 *   node scripts/_import_auchan_v2.js --dry-run   # preview
 *   node scripts/_import_auchan_v2.js              # execute
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
const SRC_DIR = path.join(require('os').homedir(), 'Downloads', 'auchan');
const STORAGE_PREFIX = 'cafe-photos-nobg';

// ── Helpers ────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/_+/g, '_');
}

function nfd(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function inferFormato(name) {
  const n = nfd(name);
  if (/capsulas?/i.test(n)) return 'capsules';
  if (/grano/i.test(n)) return 'beans';
  if (/molido/i.test(n)) return 'ground';
  if (/soluble|instant/i.test(n)) return 'instant';
  if (/monodosis/i.test(n)) return 'capsules';
  if (/bebida|\d+\s*ml/i.test(n)) return 'ready_to_drink';
  if (/sticks?/i.test(n)) return 'instant';
  return '';
}

function inferTipo(name) {
  if (/descafeinado|descaf/i.test(name)) return 'descafeinado';
  if (/mezcla/i.test(name)) return 'mezcla';
  return 'natural';
}

function inferPeso(name) {
  const g = name.match(/(\d+)\s*g\b/i);
  if (g) return g[1] + 'g';
  const kg = name.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
  if (kg) return kg[1].replace(',', '.') + 'kg';
  const ml = name.match(/(\d+)\s*ml\b/i);
  if (ml) return ml[1] + 'ml';
  const uds = name.match(/(\d+)\s*uds\b/i);
  if (uds) return uds[1] + ' uds';
  return '';
}

function inferOrigen(name) {
  const n = nfd(name).toLowerCase();
  if (/colombia/i.test(n)) return 'Colombia';
  if (/brasil/i.test(n)) return 'Brasil';
  if (/etiopia/i.test(n)) return 'Etiopía';
  if (/peru/i.test(n)) return 'Perú';
  if (/honduras/i.test(n)) return 'Honduras';
  if (/mexico/i.test(n)) return 'México';
  if (/burundi/i.test(n)) return 'Burundi';
  if (/america latina/i.test(n)) return 'América Latina';
  return '';
}

function inferVariedad(name) {
  if (/100\s*%?\s*ar[aá]bica/i.test(name)) return '100% Arábica';
  if (/ar[aá]bica/i.test(name)) return 'Arábica';
  return '';
}

function inferIntensidad(name) {
  const m = name.match(/\bI\s*(\d{1,2})\b/i) || name.match(/intensidad\s*(\d{1,2})/i);
  return m ? parseInt(m[1], 10) : null;
}

function inferTueste(name) {
  const intensidad = inferIntensidad(name);
  if (!intensidad) return '';
  if (intensidad <= 5) return 'claro';
  if (intensidad <= 8) return 'medio';
  return 'oscuro';
}

function inferCompatibilidad(name) {
  const n = nfd(name).toLowerCase();
  if (/nespresso|nesp/i.test(n)) return 'Nespresso';
  if (/dolce\s*gusto/i.test(n)) return 'Dolce Gusto';
  // Detect Nespresso-style by unit count (10, 20, 30 uds = Nespresso typical)
  // Detect Dolce Gusto by 16 uds typical
  return '';
}

function inferIsBio(name) {
  const n = nfd(name);
  return /bio|ecologic|organic/i.test(n);
}

function inferMarca(name) {
  if (/ALCAMPO ECOL[OÓ]GICO/i.test(name)) return 'AUCHAN';
  if (/AUCHAN Bio/i.test(name)) return 'AUCHAN';
  if (/Producto Alcampo|PRODUCTO ALCAMPO/i.test(name)) return 'AUCHAN';
  if (/auchan/i.test(name)) return 'AUCHAN';
  return 'AUCHAN';
}

function cleanProductName(filename) {
  // Remove extension
  let name = filename.replace(/\.webp$/i, '').trim();
  // Normalize NFD for matching
  const norm = nfd(name);

  // Detect and strip brand prefixes (could repeat 2-4 times in filename)
  const prefixPatterns = [
    /PRODUCTO ALCAMPO\s*/gi,
    /ALCAMPO ECOLOGICO\s*/gi,
    /AUCHAN Bio\s*/gi,
    /Producto Alcampo\s*/gi,
  ];

  let stripped = norm;
  for (const re of prefixPatterns) {
    stripped = stripped.replace(re, '');
  }
  stripped = stripped
    .replace(/^[.\s]+/, '')
    .replace(/\.+$/, '')
    .trim();

  // If the name was duplicated, take only the first occurrence
  // e.g. "Cafe X I6, 10 uds. Cafe X I6, 10 uds." → "Cafe X I6, 10 uds."
  const halfLen = Math.floor(stripped.length / 2);
  const firstHalf = stripped.slice(0, halfLen);
  if (stripped.length > 20 && stripped.slice(halfLen).includes(firstHalf.slice(0, 15))) {
    // Find first sentence-like break
    const dotBreak = stripped.match(/^(.{15,}?(?:uds|g|kg|ml))\.?\s/i);
    if (dotBreak) stripped = dotBreak[1].replace(/\.+$/, '').trim();
  }

  // Restore proper accents for display
  stripped = stripped
    .replace(/\bCafe\b/g, 'Café')
    .replace(/\bcapsulas\b/gi, 'cápsulas')
    .replace(/\bEtiopia\b/gi, 'Etiopía')
    .replace(/\bArabica\b/gi, 'Arábica')
    .replace(/\bClassico\b/gi, 'Clásico')
    .replace(/\bEcologico\b/gi, 'Ecológico')
    .replace(/\bMexico\b/gi, 'México')
    .replace(/\bPeru\b/gi, 'Perú');

  return stripped;
}

function buildNombre(filename) {
  const cleaned = cleanProductName(filename);
  const isBio = inferIsBio(filename);
  if (isBio) {
    return `${cleaned} (AUCHAN Bio)`.trim();
  }
  return cleaned.trim();
}

function buildDocId(filename) {
  const cleaned = cleanProductName(filename);
  const isBio = inferIsBio(filename);
  const prefix = isBio ? 'alcampo_bio' : 'alcampo';
  const slug = slugify(cleaned);
  return `${prefix}_${slug}`.slice(0, 90);
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

  // Delete first for CDN cache
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
  console.log(`=== Import AUCHAN v2 ${DRY_RUN ? '[DRY RUN]' : ''} ===\n`);

  // 1. Read files
  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => f.endsWith('.webp'))
    .sort();
  console.log(`  Found ${files.length} photos\n`);

  // 2. Parse all cafés
  const cafes = files.map((f) => {
    const nombre = buildNombre(f);
    const docId = buildDocId(f);
    const formato = inferFormato(f);
    const tipo = inferTipo(f);
    const peso = inferPeso(f);
    const origen = inferOrigen(f);
    const variedad = inferVariedad(f);
    const intensidad = inferIntensidad(f);
    const tueste = inferTueste(f);
    const compat = inferCompatibilidad(f);
    const isBio = inferIsBio(f);

    return {
      file: f,
      docId,
      doc: {
        nombre,
        marca: 'AUCHAN',
        pais: origen || 'Internacional',
        origen,
        formato,
        tipo,
        peso,
        variedad,
        tueste,
        notas: [
          compat ? `Compatible ${compat}` : '',
          intensidad ? `Intensidad ${intensidad}` : '',
          isBio ? 'Ecológico / Bio' : '',
        ]
          .filter(Boolean)
          .join('. '),
        coffeeCategory: 'daily',
        category: 'supermarket',
        fuente: 'Alcampo',
        fuentePais: 'ES',
        isBio,
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

  // Check for duplicate IDs
  const ids = cafes.map((c) => c.docId);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length > 0) {
    console.log('  WARNING: Duplicate IDs detected:');
    dupes.forEach((d) => console.log(`    ${d}`));
    // Dedupe by appending _2, _3 etc.
    const counts = {};
    for (const c of cafes) {
      counts[c.docId] = (counts[c.docId] || 0) + 1;
      if (counts[c.docId] > 1) {
        c.docId = `${c.docId}_${counts[c.docId]}`;
      }
    }
  }

  if (DRY_RUN) {
    console.log('  Preview of cafés to create:\n');
    cafes.forEach((c, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${c.docId}`);
      console.log(`      ${c.doc.nombre}`);
      console.log(
        `      fmt=${c.doc.formato} tipo=${c.doc.tipo} peso=${c.doc.peso} pais=${c.doc.pais} bio=${c.doc.isBio}`
      );
      if (c.doc.notas) console.log(`      ${c.doc.notas}`);
      console.log();
    });
    console.log(`  Total: ${cafes.length} cafés`);
    return;
  }

  // 3. Delete existing AUCHAN cafés
  console.log('  Phase 1: Deleting existing AUCHAN cafés...');
  const existingSnap = await db.collection('cafes').where('marca', '==', 'AUCHAN').get();
  console.log(`    Found ${existingSnap.size} existing AUCHAN docs`);

  const BATCH_SIZE = 450;
  const existingDocs = existingSnap.docs;
  for (let i = 0; i < existingDocs.length; i += BATCH_SIZE) {
    const chunk = existingDocs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const doc of chunk) {
      batch.delete(doc.ref);
      // Also delete photo
      try {
        await bucket.file(`${STORAGE_PREFIX}/${doc.id}.png`).delete();
      } catch {}
    }
    await batch.commit();
    console.log(`    Deleted batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} docs)`);
  }

  // 4. Upload photos + create docs
  console.log(`\n  Phase 2: Creating ${cafes.length} new AUCHAN cafés...`);

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
        photos: {
          selected: photoUrl,
          original: photoUrl,
          bgRemoved: photoUrl,
        },
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
  console.log(`  Deleted: ${existingDocs.length} old AUCHAN cafés`);
  console.log(`  Created: ${created} new AUCHAN cafés`);
  if (errors > 0) console.log(`  Errors: ${errors}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
