#!/usr/bin/env node
/**
 * upload_batch2_photos.js
 *
 * Uploads 18 already-downloaded product images from tmp_photos/ to Firebase Storage.
 * Resizes to 800x800, uploads as PNG, updates Firestore photo fields.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();
const TMP_DIR = path.join(__dirname, '..', 'tmp_photos');

// Map: docId -> { localFile, nombre, originalUrl }
const PHOTOS = {
  // --- Cafès Pont ---
  pont_arabica_premium_grano_250g: {
    localFile: 'pont_arabica_premium_grano_250g.jpg',
    nombre: 'Cafès Pont Arábica Premium Grano 250g',
    originalUrl:
      'https://cafespont.com/wp-content/uploads/2019/10/CAFE-EN-GRANO-NATURAL-ALIMENTACION-250G.jpg',
  },
  pont_descafeinado_grano_250g: {
    localFile: 'pont_descafeinado_grano_250g.jpg',
    nombre: 'Cafès Pont Descafeinado Grano 250g',
    originalUrl:
      'https://cafespont.com/wp-content/uploads/2019/10/CAFE-EN-GRANO-DESCAFEINADO-ALIMENTACION-250G.jpg',
  },
  // --- Caffè Corsini ---
  caffè_corsini_arabica_grano_1kg: {
    localFile: 'caffè_corsini_arabica_grano_1kg.jpg',
    nombre: 'Caffè Corsini 100% Arabica Grano 1kg',
    originalUrl:
      'https://cdn.shopify.com/s/files/1/0793/4971/1136/files/DAR024_chicchi.jpg?v=1718707040',
  },
  // --- Caffè Mauro ---
  caffe_mauro_100_arabica_grano_1kg: {
    localFile: 'caffe_mauro_100_arabica_grano_1kg.jpg',
    nombre: 'Caffè Mauro 100% Arabica Grano 1kg',
    originalUrl:
      'https://cdn.shopify.com/s/files/1/0603/0255/7366/files/grani-caffe-mauro-arabica.jpg?v=1717513472',
  },
  // --- El Criollo ---
  el_criollo_blend_especial_grano_250g: {
    localFile: 'el_criollo_blend_especial_grano_250g.webp',
    nombre: 'El Criollo Blend Especial Grano 250g',
    originalUrl: 'https://cafeselcriollo.com/wp-content/uploads/2020/10/blend-insignia-250g.webp',
  },
  el_criollo_colombia_specialty_250g: {
    localFile: 'el_criollo_colombia_specialty_250g.webp',
    nombre: 'El Criollo Colombia Specialty Grano 250g',
    originalUrl: 'https://cafeselcriollo.com/wp-content/uploads/2022/12/cafe-colombia-250g.webp',
  },
  el_criollo_etiopia_specialty_250g: {
    localFile: 'el_criollo_etiopia_specialty_250g.webp',
    nombre: 'El Criollo Etiopía Specialty Grano 250g',
    originalUrl:
      'https://cafeselcriollo.com/wp-content/uploads/2026/02/cafe-de-especialidad-de-etiopia.webp',
  },
  // --- Montecelio ---
  montecelio_brazil_grano_1kg: {
    localFile: 'montecelio_brazil_grano_1kg.png',
    nombre: 'Montecelio Earth Brazil Grano 1kg',
    originalUrl: 'https://montecelio.es/wp-content/uploads/2019/12/montecelio_earth_brazil-min.png',
  },
  montecelio_colombia_grano_1kg: {
    localFile: 'montecelio_colombia_grano_1kg.png',
    nombre: 'Montecelio Earth Colombia Grano 1kg',
    originalUrl: 'https://montecelio.es/wp-content/uploads/2019/12/earth_colombia-min.png',
  },
  montecelio_etiopia_grano_1kg: {
    localFile: 'montecelio_etiopia_grano_1kg.png',
    nombre: 'Montecelio Earth Etiopía Grano 1kg',
    originalUrl: 'https://montecelio.es/wp-content/uploads/2019/12/earth_ethiopia-min.png',
  },
  // --- La Brasileña ---
  la_brasilena_natural_grano_250g: {
    localFile: 'la_brasilena_natural_grano_250g.jpg',
    nombre: 'La Brasileña Natural Grano 250g',
    originalUrl:
      'https://www.cafeslabrasilena.es/wp-content/uploads/2024/08/BLEND-ARABICAS-250GRS-2.jpg',
  },
  la_brasilena_mezcla_grano_250g: {
    localFile: 'la_brasilena_mezcla_grano_250g.jpg',
    nombre: 'La Brasileña Mezcla Grano 250g',
    originalUrl:
      'https://www.cafeslabrasilena.es/wp-content/uploads/2024/08/BLEND-ARABICAS-250GRS-2.jpg',
  },
  // --- Toscaf ---
  toscaf_natural_grano_1kg: {
    localFile: 'toscaf_natural_grano_1kg.png',
    nombre: 'Toscaf Natural 100% Arábica Grano 1kg',
    originalUrl: 'https://cafestoscaf.es/web/wp-content/uploads/2018/04/Arabica_100.png',
  },
  toscaf_mezcla_grano_1kg: {
    localFile: 'toscaf_mezcla_grano_1kg.jpg',
    nombre: 'Toscaf Mezcla Grano 1kg',
    originalUrl:
      'https://cafestoscaf.es/web/wp-content/uploads/2015/10/Toscaf-Grano-Natural-500g-JPG.jpg',
  },
  toscaf_descafeinado_grano_500g: {
    localFile: 'toscaf_descafeinado_grano_500g.jpg',
    nombre: 'Toscaf Descafeinado Grano 500g',
    originalUrl:
      'https://cafestoscaf.es/web/wp-content/uploads/2015/10/Toscaf-Grano-Colombia-Descaf-1.jpg',
  },
  // --- Café Jurado (molido) ---
  jurado_natural_molido_250g: {
    localFile: 'jurado_natural_molido_250g.jpg',
    nombre: 'Café Jurado Natural Molido 250g',
    originalUrl: 'https://cafejurado.com/16-large_default/cafe-molido-100-arabica.jpg',
  },
  jurado_descafeinado_molido_250g: {
    localFile: 'jurado_descafeinado_molido_250g.jpg',
    nombre: 'Café Jurado Descafeinado Molido 250g',
    originalUrl: 'https://cafejurado.com/17-thickbox_default/cafe-molido-descafeinado.jpg',
  },
  jurado_ecologico_molido_250g: {
    localFile: 'jurado_ecologico_molido_250g.jpg',
    nombre: 'Café Jurado Ecológico Molido 250g',
    originalUrl:
      'https://cafejurado.com/19-thickbox_default/cafe-molido-ecologico-estuche-ecologico.jpg',
  },
};

async function processOne(docId, config) {
  console.log(`\n  [${config.nombre}] (${docId})`);

  const localPath = path.join(TMP_DIR, config.localFile);
  if (!fs.existsSync(localPath)) {
    console.log(`    SKIP - local file not found: ${config.localFile}`);
    return 'skip';
  }

  let imgBuf = fs.readFileSync(localPath);
  console.log(`    Loaded local: ${(imgBuf.length / 1024).toFixed(0)} KB`);

  // Validate it's a real image
  try {
    const meta = await sharp(imgBuf).metadata();
    console.log(`    Image: ${meta.width}x${meta.height} ${meta.format}`);
  } catch (e) {
    console.log(`    Invalid image: ${e.message}`);
    return 'error';
  }

  // Resize to max 800px and convert to PNG
  const metadata = await sharp(imgBuf).metadata();
  if (metadata.width > 800 || metadata.height > 800) {
    imgBuf = await sharp(imgBuf).resize(800, 800, { fit: 'inside' }).png().toBuffer();
  } else {
    imgBuf = await sharp(imgBuf).png().toBuffer();
  }
  console.log(`    Resized: ${(imgBuf.length / 1024).toFixed(0)} KB`);

  // Upload to Firebase Storage
  const storagePath = `cafe-photos-nobg/${docId}.png`;
  const file = bucket.file(storagePath);
  await file.save(Buffer.from(imgBuf), {
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000',
    },
    public: true,
  });

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  console.log(`    Uploaded: ${publicUrl}`);

  // Update Firestore
  await db
    .collection('cafes')
    .doc(docId)
    .update({
      imagenUrl: publicUrl,
      bestPhoto: publicUrl,
      officialPhoto: publicUrl,
      imageUrl: publicUrl,
      foto: publicUrl,
      'photos.selected': publicUrl,
      'photos.original': config.originalUrl || publicUrl,
      'photos.bgRemoved': false,
    });
  console.log(`    Firestore updated`);
  return 'ok';
}

async function main() {
  console.log('=== Upload Batch 2 Photos (18 scraped images) ===\n');

  if (!fs.existsSync(TMP_DIR)) {
    console.log('ERROR: tmp_photos directory not found');
    process.exit(1);
  }

  const results = { ok: 0, skip: 0, error: 0 };

  for (const [docId, config] of Object.entries(PHOTOS)) {
    try {
      const r = await processOne(docId, config);
      results[r]++;
    } catch (e) {
      console.log(`    ERROR: ${e.message}`);
      results.error++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`  OK: ${results.ok}, Skip: ${results.skip}, Error: ${results.error}`);
  process.exit(0);
}

main();
