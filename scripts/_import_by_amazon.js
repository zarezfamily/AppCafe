#!/usr/bin/env node
/**
 * Import/Update by Amazon cafés from local photos in ~/Downloads/by amazon/
 * - Updates existing docs with new photos
 * - Creates new docs for products not yet in catalog
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
const PREFIX = 'cafe-photos-nobg';

async function processAndUpload(docId, imgPath) {
  const buf = await sharp(imgPath)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(buf, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

const SRC = path.join(require('os').homedir(), 'Downloads', 'by amazon');

// Map filenames → product data
// Existing (update photo): amazon_classico_grano_1kg, amazon_colombiano_grano_1kg,
//   amazon_espresso_crema_grano_1kg, amazon_fuerte_grano_1kg, amazon_intenso_grano_1kg
// New products from the folder

const products = [
  // === EXISTING (update photos) ===
  {
    id: 'amazon_espresso_crema_grano_1kg',
    action: 'update',
    file: 'by Amazon - Café en grano Natural Espresso crema, tueste claro - Certificado Rainforest Alliance, 500g.jpg',
    updates: { peso: '500g', nombre: 'by Amazon Espresso Crema Grano 500g' },
  },
  {
    id: 'amazon_colombiano_grano_1kg',
    action: 'update',
    file: 'by Amazon Café En Grano Natural, Puro arabica, tueste medio, 1kg - certificados por Rainforest Alliance.jpg',
  },

  // === NEW: GRANOS ===
  {
    id: 'amazon_crema_grano_1kg',
    action: 'create',
    file: 'by Amazon Crema Café En Grano De Tueste Natural Intensidad 4 - Medio Fuerte, 1kg.webp',
    data: {
      nombre: 'by Amazon Crema Grano 1kg',
      formato: 'grano',
      peso: '1kg',
      notas: 'Tueste natural. Intensidad 4. Medio fuerte. Rainforest Alliance',
      tueste: 'medio',
    },
  },
  {
    id: 'amazon_house_blend_grano_1kg',
    action: 'create',
    file: 'by Amazon House Blend - Granos de café dorados de 1 kg, 1 paquete.webp',
    data: {
      nombre: 'by Amazon House Blend Grano 1kg',
      formato: 'grano',
      peso: '1kg',
      notas: 'House Blend. Granos dorados. Tueste ligero',
      tueste: 'claro',
    },
  },

  // === NEW: MOLIDO ===
  {
    id: 'amazon_clasico_molido_500g',
    action: 'create',
    file: 'by Amazon Café Tostado Molido Clásico 100% Arábica, Tostado Medio, 500g (1 Paquete de 500g), Certificado por Rainforest Alliance.jpg',
    data: {
      nombre: 'by Amazon Clásico Molido 500g',
      formato: 'molido',
      peso: '500g',
      notas: '100% Arábica. Tueste medio. Rainforest Alliance',
      variedad: '100% Arábica',
      tueste: 'medio',
    },
  },
  {
    id: 'amazon_crema_espresso_molido_500g',
    action: 'create',
    file: 'by Amazon Crema de café expreso molido, tostado ligero, gránulos, 500 g, certificación Rainforest Alliance.jpg',
    data: {
      nombre: 'by Amazon Crema Espresso Molido 500g',
      formato: 'molido',
      peso: '500g',
      notas: 'Tueste ligero. Crema espresso. Rainforest Alliance',
      tueste: 'claro',
    },
  },
  {
    id: 'amazon_fuerte_molido_250g',
    action: 'create',
    file: 'by Amazon Fuerte Café Molido De Tueste Natural, 250g.webp',
    data: {
      nombre: 'by Amazon Fuerte Molido 250g',
      formato: 'molido',
      peso: '250g',
      notas: 'Tueste natural. Fuerte',
      tueste: 'oscuro',
    },
  },

  // === NEW: CÁPSULAS NESPRESSO ===
  {
    id: 'amazon_espresso_caps_nespresso',
    action: 'create',
    file: 'by Amazon Cápsulas de Café Espresso de Plástico Compatibles con Nespresso, Tostado Medio, 100 Unidades (2 Paquetes de 50), Certificadas por Rainforest Alliance.jpg',
    data: {
      nombre: 'by Amazon Cápsulas Nespresso Espresso',
      formato: 'capsules',
      peso: '100 uds',
      notas: 'Compatible Nespresso. Plástico. Tueste medio. 100 cápsulas. Rainforest Alliance',
      tueste: 'medio',
    },
  },
  {
    id: 'amazon_espresso_intenso_caps_nespresso',
    action: 'create',
    file: 'by Amazon Espresso Intenso Cápsulas de café compatibles con Nespresso, Tueste oscuro, 50 unidad, Paquete de 2 - Certificado Rainforest Alliance.jpg',
    data: {
      nombre: 'by Amazon Cápsulas Nespresso Espresso Intenso',
      formato: 'capsules',
      peso: '100 uds',
      notas: 'Compatible Nespresso. Tueste oscuro. 100 cápsulas. Rainforest Alliance',
      tueste: 'oscuro',
    },
  },
  {
    id: 'amazon_lungo_caps_nespresso',
    action: 'create',
    file: 'by Amazon Cápsulas de Café Lungo de Plástico Compatibles con Nespresso, Tostado Medio, 100 Unidades (2 Paquetes de 50), Certificadas por Rainforest Alliance.jpg',
    data: {
      nombre: 'by Amazon Cápsulas Nespresso Lungo',
      formato: 'capsules',
      peso: '100 uds',
      notas:
        'Compatible Nespresso. Plástico. Lungo. Tueste medio. 100 cápsulas. Rainforest Alliance',
      tueste: 'medio',
    },
  },
  {
    id: 'amazon_lungo_descaf_caps_nespresso',
    action: 'create',
    file: 'by Amazon Cápsulas de Café Lungo Descafeinado de Plástico Compatibles con Nespresso, Tostado Medio, 100 Unidades (2 Paquetes de 50), Certificadas por Rainforest Alliance.jpg',
    data: {
      nombre: 'by Amazon Cápsulas Nespresso Lungo Descafeinado',
      formato: 'capsules',
      peso: '100 uds',
      notas:
        'Compatible Nespresso. Plástico. Lungo. Descafeinado. Tueste medio. 100 cápsulas. Rainforest Alliance',
      tueste: 'medio',
      decaf: true,
      tipo: 'descafeinado',
    },
  },
  {
    id: 'amazon_ristretto_caps_nespresso',
    action: 'create',
    file: 'by Amazon Cápsulas de Café Ristretto de Plástico Compatibles con Nespresso, Tostado Medio, 100 Unidades (2 Paquetes de 50), Certificadas por Rainforest Alliance.jpg',
    data: {
      nombre: 'by Amazon Cápsulas Nespresso Ristretto',
      formato: 'capsules',
      peso: '100 uds',
      notas:
        'Compatible Nespresso. Plástico. Ristretto. Tueste medio. 100 cápsulas. Rainforest Alliance',
      tueste: 'medio',
    },
  },
  {
    id: 'amazon_ristretto_intenso_caps_nespresso',
    action: 'create',
    file: 'by Amazon Cápsulas de Café Ristretto Intenso de Plástico Compatibles con Nespresso, Tostado Oscuro, 100 Unidades (2 Paquetes de 50), Certificadas por Rainforest Alliance.jpg',
    data: {
      nombre: 'by Amazon Cápsulas Nespresso Ristretto Intenso',
      formato: 'capsules',
      peso: '100 uds',
      notas:
        'Compatible Nespresso. Plástico. Ristretto Intenso. Tueste oscuro. 100 cápsulas. Rainforest Alliance',
      tueste: 'oscuro',
    },
  },
  {
    id: 'amazon_colombiano_caps_nespresso',
    action: 'create',
    file: 'by Amazon Cápsulas de Café Compostables en Casa Compatibles con Nespresso, 100% Arábica Colombiana, 20 Unidades, Certificadas por Rainforest Alliance.jpg',
    data: {
      nombre: 'by Amazon Cápsulas Nespresso Colombiano Compostable',
      formato: 'capsules',
      peso: '20 uds',
      notas:
        'Compatible Nespresso. Compostable. 100% Arábica colombiana. 20 cápsulas. Rainforest Alliance',
      variedad: '100% Arábica',
      origen: 'Colombia',
    },
  },

  // === NEW: MONODOSIS SENSEO ===
  {
    id: 'amazon_clasico_senseo',
    action: 'create',
    file: 'By Amazon - Café Clásico en Monodosis, 100% Arábica, Compatible con Senseo, 36 Unidades, Con Certificación Rainforest Alliance.jpg',
    data: {
      nombre: 'by Amazon Monodosis Senseo Clásico',
      formato: 'monodosis',
      peso: '36 uds',
      notas: '100% Arábica. Compatible Senseo. 36 monodosis. Rainforest Alliance',
      variedad: '100% Arábica',
    },
  },
  {
    id: 'amazon_intenso_senseo',
    action: 'create',
    file: 'by Amazon Monodosis Intensas, Aptas para Cafeteras Senseo, 36 Unidades (1 Paquete de 36), Certificadas por Rainforest Alliance.jpg',
    data: {
      nombre: 'by Amazon Monodosis Senseo Intenso',
      formato: 'monodosis',
      peso: '36 uds',
      notas: 'Compatible Senseo. Intenso. 36 monodosis. Rainforest Alliance',
    },
  },
  {
    id: 'amazon_crema_senseo',
    action: 'create',
    file: 'by Amazon Monodosis de Café Crema 100% Arábica, Aptas para Cafeteras Senseo, 36 Unidades (1 Paquete de 36), Certificadas por Rainforest Alliance.jpg',
    data: {
      nombre: 'by Amazon Monodosis Senseo Crema',
      formato: 'monodosis',
      peso: '36 uds',
      notas: '100% Arábica. Compatible Senseo. Crema. 36 monodosis. Rainforest Alliance',
      variedad: '100% Arábica',
    },
  },
  {
    id: 'amazon_descaf_senseo',
    action: 'create',
    file: 'by Amazon Monodosis de Café Descafeinado 100% Arábica, Aptas para Cafeteras Senseo, Tostado Medio, 36 Unidades (1 Paquete de 36), Certificadas por Rainforest Alliance.jpg',
    data: {
      nombre: 'by Amazon Monodosis Senseo Descafeinado',
      formato: 'monodosis',
      peso: '36 uds',
      notas:
        '100% Arábica. Compatible Senseo. Descafeinado. Tueste medio. 36 monodosis. Rainforest Alliance',
      variedad: '100% Arábica',
      decaf: true,
      tipo: 'descafeinado',
      tueste: 'medio',
    },
  },

  // === NEW: SOLUBLE ===
  {
    id: 'amazon_instantaneo_classic_200g',
    action: 'create',
    file: 'Café instantáneo de Amazon Classic de 200 g – Certificación Rainforest Alliance.jpg',
    data: {
      nombre: 'by Amazon Café Instantáneo Classic 200g',
      formato: 'soluble',
      peso: '200g',
      notas: 'Café instantáneo. Rainforest Alliance',
    },
  },
  {
    id: 'amazon_soluble_gold_200g',
    action: 'create',
    file: 'by Amazon - Café soluble liofilizado Gold, tueste medio, 200g, paquete de.jpg',
    data: {
      nombre: 'by Amazon Soluble Gold 200g',
      formato: 'soluble',
      peso: '200g',
      notas: 'Café soluble liofilizado. Gold. Tueste medio',
      tueste: 'medio',
    },
  },
  {
    id: 'amazon_soluble_descaf_200g',
    action: 'create',
    file: 'By Amazon Café soluble descafeinado, 200g, paquete de 1, Certificado Rainforest Alliance.jpg',
    data: {
      nombre: 'by Amazon Soluble Descafeinado 200g',
      formato: 'soluble',
      peso: '200g',
      notas: 'Café soluble descafeinado. Rainforest Alliance',
      decaf: true,
      tipo: 'descafeinado',
    },
  },
];

const baseData = {
  marca: 'by Amazon',
  pais: 'Varios',
  origen: '',
  variedad: '',
  tueste: '',
  tipo: 'natural',
  coffeeCategory: 'commercial',
  category: 'commercial',
  fuente: 'amazon.es',
  fuentePais: 'ES',
  isBio: false,
  decaf: false,
  notas: '',
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
  console.log(
    `=== by Amazon Import/Update ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  // Verify all files exist
  let missing = 0;
  for (const p of products) {
    const fp = path.join(SRC, p.file);
    if (!fs.existsSync(fp)) {
      console.log(`  MISSING: ${p.file}`);
      missing++;
    }
  }
  if (missing > 0) {
    console.log(`\n${missing} files missing, aborting.`);
    return;
  }
  console.log(`  All ${products.length} image files found.\n`);

  if (DRY) {
    products.forEach((p, i) =>
      console.log(
        `  ${(i + 1).toString().padStart(2)}. [${p.action}] ${p.id} ← ${p.file.slice(0, 60)}...`
      )
    );
    return;
  }

  let created = 0,
    updated = 0;
  for (const p of products) {
    try {
      const fp = path.join(SRC, p.file);
      const photoUrl = await processAndUpload(p.id, fp);
      const photoFields = {
        fotoUrl: photoUrl,
        foto: photoUrl,
        imageUrl: photoUrl,
        officialPhoto: photoUrl,
        bestPhoto: photoUrl,
        imagenUrl: photoUrl,
        photos: { selected: photoUrl, original: photoUrl, bgRemoved: photoUrl },
      };

      if (p.action === 'update') {
        const upd = { ...photoFields, updatedAt: new Date().toISOString(), ...(p.updates || {}) };
        await db.collection('cafes').doc(p.id).update(upd);
        updated++;
        process.stdout.write(`\r  Processed ${created + updated}/${products.length}`);
      } else {
        const doc = { ...baseData, ...p.data, ...photoFields };
        await db.collection('cafes').doc(p.id).set(doc);
        created++;
        process.stdout.write(`\r  Processed ${created + updated}/${products.length}`);
      }
    } catch (e) {
      console.log(`\n  ERROR ${p.id}: ${e.message}`);
    }
  }
  console.log(`\n\n=== Done: ${created} created, ${updated} updated ===`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
