#!/usr/bin/env node
/**
 * Import/Update Gimoka — caffeteas.es (April 2026)
 * 2 existing beans (update) + 15 new capsules
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

if (admin.apps.length === 0) {
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
    const mod = url.startsWith('https') ? https : http;
    mod
      .get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return fetchBuf(
              res.headers.location.startsWith('http')
                ? res.headers.location
                : new URL(res.headers.location, url).href
            ).then(resolve, reject);
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }
      )
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

const CT = 'https://caffeteas.es/wp-content/uploads';

const products = [
  // ══════ UPDATE existing beans ══════
  {
    id: 'ean_8003012000954',
    marca: 'Gimoka',
    nombre: 'Gimoka Dulcis Vitae Grano 1kg',
    peso: '1kg',
    precio: 11.59,
    formato: 'beans',
    variedad: 'Blend',
    img: '',
  }, // keep existing photo
  {
    id: 'ean_8003012012582',
    marca: 'Gimoka',
    nombre: 'Gimoka Supremo Grano 1kg',
    peso: '1kg',
    precio: 12.69,
    formato: 'beans',
    variedad: 'Blend',
    img: '',
  }, // keep existing photo

  // ══════ NEW — Nespresso compatible (aluminio) ══════
  {
    id: 'gimoka_classico_nesp_100',
    marca: 'Gimoka',
    nombre: 'Gimoka Classico 100 cápsulas Nespresso aluminio',
    peso: '100 cápsulas',
    precio: 19.99,
    formato: 'capsules',
    variedad: 'Blend',
    notas: 'Especias, Cacao amargo',
    tueste: 'medio-oscuro',
    img: `${CT}/2025/06/cafe-ristretto.webp`,
  },
  {
    id: 'gimoka_colombia_nesp_100',
    marca: 'Gimoka',
    nombre: 'Gimoka Colombia 100 cápsulas Nespresso aluminio',
    peso: '100 cápsulas',
    precio: 19.99,
    formato: 'capsules',
    variedad: 'Arábica',
    notas: 'Cítricos, Caramelo, Fruta amarilla',
    tueste: 'medio',
    origen: 'Colombia',
    img: `${CT}/2025/06/COLOMBIA.webp`,
  },
  {
    id: 'gimoka_ristretto_nesp_100',
    marca: 'Gimoka',
    nombre: 'Gimoka Ristretto 100 cápsulas Nespresso aluminio',
    peso: '100 cápsulas',
    precio: 19.99,
    formato: 'capsules',
    variedad: 'Blend',
    notas: 'Chocolate',
    tueste: 'oscuro',
    img: `${CT}/2021/01/nespresso-alluminio-sublime-gimoka.jpg`,
  },
  {
    id: 'gimoka_sublime_nesp_100',
    marca: 'Gimoka',
    nombre: 'Gimoka Sublime 100 cápsulas Nespresso aluminio',
    peso: '100 cápsulas',
    precio: 19.99,
    formato: 'capsules',
    variedad: 'Blend',
    notas: 'Almendra',
    tueste: 'medio',
    img: `${CT}/2025/06/SUBLIME.webp`,
  },

  // ══════ NEW — Nespresso compatible (compostables) ══════
  {
    id: 'gimoka_arabica_compost_nesp_200',
    marca: 'Gimoka',
    nombre: 'Gimoka 100% Arabica 200 cápsulas compostables Nespresso',
    peso: '200 cápsulas',
    precio: 36.0,
    formato: 'capsules',
    variedad: 'Arábica',
    notas: 'Chocolate, Frutas',
    isBio: true,
    img: `${CT}/2025/06/arabica.webp`,
  },
  {
    id: 'gimoka_crema_compost_nesp_200',
    marca: 'Gimoka',
    nombre: 'Gimoka Crema 200 cápsulas compostables Nespresso',
    peso: '200 cápsulas',
    precio: 36.0,
    formato: 'capsules',
    variedad: 'Blend',
    notas: 'Avellanas, Frutas secas',
    isBio: true,
    img: `${CT}/2025/06/crema.webp`,
  },
  {
    id: 'gimoka_forte_compost_nesp_200',
    marca: 'Gimoka',
    nombre: 'Gimoka Forte 200 cápsulas compostables Nespresso',
    peso: '200 cápsulas',
    precio: 36.0,
    formato: 'capsules',
    variedad: 'Blend',
    notas: '',
    isBio: true,
    img: `${CT}/2025/06/forte.webp`,
  },

  // ══════ NEW — Nespresso compatible (plástico) ══════
  {
    id: 'gimoka_cremoso_nesp_200',
    marca: 'Gimoka',
    nombre: 'Gimoka Cremoso 200 cápsulas Nespresso',
    peso: '200 cápsulas',
    precio: 32.0,
    formato: 'capsules',
    variedad: 'Blend',
    notas: '',
    img: `${CT}/2016/03/nespresso-cremoso-gimoka-600x600-2.jpg`,
  },
  {
    id: 'gimoka_intenso_nesp_200',
    marca: 'Gimoka',
    nombre: 'Gimoka Intenso 200 cápsulas Nespresso',
    peso: '200 cápsulas',
    precio: 32.0,
    formato: 'capsules',
    variedad: 'Blend',
    notas: '',
    img: `${CT}/2016/03/nespresso-intenso-gimoka-600x600-1.jpg`,
  },
  {
    id: 'gimoka_vellutato_nesp_200',
    marca: 'Gimoka',
    nombre: 'Gimoka Vellutato 200 cápsulas Nespresso',
    peso: '200 cápsulas',
    precio: 32.0,
    formato: 'capsules',
    variedad: 'Arábica',
    notas: '',
    img: `${CT}/2016/03/nespresso-vellutato-gimoka-600x600-1.jpg`,
  },
  {
    id: 'gimoka_descafeinado_nesp_200',
    marca: 'Gimoka',
    nombre: 'Gimoka Descafeinado 200 cápsulas Nespresso',
    peso: '200 cápsulas',
    precio: 32.0,
    formato: 'capsules',
    variedad: 'Blend',
    notas: '',
    decaf: true,
    img: `${CT}/2016/03/nespresso-deca-gimoka-600x600-1.jpg`,
  },

  // ══════ NEW — Dolce Gusto compatible ══════
  {
    id: 'gimoka_intenso_dg_48',
    marca: 'Gimoka',
    nombre: 'Gimoka Intenso 48 cápsulas Dolce Gusto',
    peso: '48 cápsulas',
    precio: 11.0,
    formato: 'capsules',
    variedad: 'Blend',
    notas: '',
    img: `${CT}/2016/02/dolcegusto-intenso-16-capsule-gimoka-1-600x600-1.jpg`,
  },
  {
    id: 'gimoka_cremoso_dg_48',
    marca: 'Gimoka',
    nombre: 'Gimoka Cremoso 48 cápsulas Dolce Gusto',
    peso: '48 cápsulas',
    precio: 11.0,
    formato: 'capsules',
    variedad: 'Blend',
    notas: '',
    img: `${CT}/2016/02/dolcegusto-cremoso-16-capsule-gimoka-1-600x600-1.jpg`,
  },
  {
    id: 'gimoka_vellutato_dg_48',
    marca: 'Gimoka',
    nombre: 'Gimoka Vellutato 48 cápsulas Dolce Gusto',
    peso: '48 cápsulas',
    precio: 11.0,
    formato: 'capsules',
    variedad: 'Arábica',
    notas: '',
    img: `${CT}/2016/02/dolcegusto-vellutato-16-capsule-gimoka-1-600x600-1.jpg`,
  },
  {
    id: 'gimoka_descafeinado_dg_48',
    marca: 'Gimoka',
    nombre: 'Gimoka Descafeinado 48 cápsulas Dolce Gusto',
    peso: '48 cápsulas',
    precio: 11.0,
    formato: 'capsules',
    variedad: 'Blend',
    notas: '',
    decaf: true,
    img: `${CT}/2016/02/dolcegusto-decaffeinato-16-capsule-gimoka-1-600x600-1.jpg`,
  },
];

function baseData() {
  return {
    marca: 'Gimoka',
    pais: 'Italia',
    origen: '',
    variedad: 'Blend',
    tueste: 'natural',
    tipo: 'natural',
    coffeeCategory: 'commercial',
    category: 'commercial',
    fuente: 'caffeteas.es',
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
}

async function main() {
  const DRY = process.argv.includes('--dry-run');
  console.log(`=== Gimoka Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`);

  if (DRY) {
    products.forEach((p, i) => {
      const tag = p.id.startsWith('ean_') ? 'UPD' : 'NEW';
      console.log(
        `  ${(i + 1).toString().padStart(2)}. [${tag}] ${p.id} — ${p.nombre} ${p.precio}€`
      );
    });
    const newCount = products.filter((p) => !p.id.startsWith('ean_')).length;
    const updCount = products.filter((p) => p.id.startsWith('ean_')).length;
    console.log(`\n  Total: ${products.length} (${updCount} updates + ${newCount} new)`);
    return;
  }

  let created = 0,
    updated = 0,
    noImg = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    try {
      const existing = await db.collection('cafes').doc(p.id).get();
      const isUpdate = existing.exists;

      let photoUrl = '';
      if (p.img) {
        try {
          photoUrl = await processAndUpload(p.id, p.img);
        } catch (e) {
          console.log(`\n  WARN img ${p.id}: ${e.message}`);
          noImg++;
        }
      }

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

      const doc = {
        ...baseData(),
        nombre: p.nombre,
        peso: p.peso,
        precio: p.precio,
        formato: p.formato,
        ...(p.variedad ? { variedad: p.variedad } : {}),
        ...(p.notas !== undefined ? { notas: p.notas } : {}),
        ...(p.tueste ? { tueste: p.tueste } : {}),
        ...(p.origen ? { origen: p.origen } : {}),
        ...(p.isBio ? { isBio: true } : {}),
        ...(p.decaf ? { decaf: true } : {}),
        ...photoFields,
      };

      if (isUpdate) {
        const { createdAt, ...upd } = doc;
        upd.updatedAt = new Date().toISOString();
        // Don't overwrite photos on update if we have no new img
        if (!p.img) {
          delete upd.fotoUrl;
          delete upd.foto;
          delete upd.imageUrl;
          delete upd.officialPhoto;
          delete upd.bestPhoto;
          delete upd.imagenUrl;
          delete upd.photos;
        }
        await db.collection('cafes').doc(p.id).update(upd);
        updated++;
      } else {
        await db.collection('cafes').doc(p.id).set(doc);
        created++;
      }
      process.stdout.write(`\r  Processed ${i + 1}/${products.length}`);
    } catch (e) {
      console.log(`\n  ERR ${p.id}: ${e.message}`);
    }
  }

  console.log(`\n\n=== Done ===`);
  console.log(`  Created: ${created} new | Updated: ${updated}`);
  console.log(`  Without photo: ${noImg}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
