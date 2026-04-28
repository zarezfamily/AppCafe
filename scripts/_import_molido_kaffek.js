#!/usr/bin/env node
/**
 * _import_molido_kaffek.js – April 2026
 * Import ALL café molido from kaffek.es (19 products)
 * Brands: Lavazza, illy, Segafredo, Kaffekapslen, Costa, Starbucks
 */

const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (admin.apps.length === 0)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

const ALL = [
  // ═══ Lavazza (5) ═══
  {
    slug: 'espresso-italiano-classico-lavazza-cafe-molido-250',
    nombre: 'Lavazza Espresso Italiano Classico 250 g Café molido',
    marca: 'Lavazza',
    peso: '250 g',
    precio: 6.19,
  },
  {
    slug: 'qualita-oro-lavazza-cafe-molido-250',
    nombre: 'Lavazza Qualità Oro 250 g Café molido',
    marca: 'Lavazza',
    peso: '250 g',
    precio: 6.49,
  },
  {
    slug: 'qualita-rossa-lavazza-granos-de-cafe-250',
    nombre: 'Lavazza Qualità Rossa 250 g Café molido',
    marca: 'Lavazza',
    peso: '250 g',
    precio: 5.79,
  },
  {
    slug: 'cafe-descafeinado-lavazza-granos-de-cafe-250',
    nombre: 'Lavazza Café Descafeinado 250 g Café molido',
    marca: 'Lavazza',
    peso: '250 g',
    precio: 5.79,
    descafeinado: true,
  },
  {
    slug: 'crema-e-gusto-lavazza-granos-de-cafe-250',
    nombre: 'Lavazza Crema e Gusto 250 g Café molido',
    marca: 'Lavazza',
    peso: '250 g',
    precio: 5.09,
  },

  // ═══ illy (4) ═══
  {
    slug: 'descafeinado-cafe-molido-125-g-illy',
    nombre: 'illy Descafeinado 125 g Café molido',
    marca: 'illy',
    peso: '125 g',
    precio: 4.19,
    descafeinado: true,
  },
  {
    slug: 'descafeinado-cafe-molido-illy',
    nombre: 'illy Descafeinado 250 g Café molido',
    marca: 'illy',
    peso: '250 g',
    precio: 7.49,
    descafeinado: true,
  },
  {
    slug: 'classico-classic-roast-cafe-molido-250-g-illy',
    nombre: 'illy Classico Espresso Roast 250 g Café molido',
    marca: 'illy',
    peso: '250 g',
    precio: 7.39,
  },
  {
    slug: 'classico-moka-illy',
    nombre: 'illy Classico para cafetera moka 250 g Café molido',
    marca: 'illy',
    peso: '250 g',
    precio: 6.29,
  },

  // ═══ Kaffekapslen (4) ═══
  {
    slug: 'cafe-de-vainilla-kaffekapslen-cafe-molido',
    nombre: 'Kaffekapslen Café de Vainilla 250 g Café molido',
    marca: 'Kaffekapslen',
    peso: '250 g',
    precio: 6.39,
    sabor: 'Vainilla',
  },
  {
    slug: 'cafe-caramelo-kaffekapslen-cafe-molido',
    nombre: 'Kaffekapslen Café Caramelo 250 g Café molido',
    marca: 'Kaffekapslen',
    peso: '250 g',
    precio: 5.69,
    sabor: 'Caramelo',
  },
  {
    slug: 'cafe-chocolatado-kaffekapslen-cafe-molido',
    nombre: 'Kaffekapslen Café Chocolatado 250 g Café molido',
    marca: 'Kaffekapslen',
    peso: '250 g',
    precio: 5.09,
    sabor: 'Chocolate',
  },
  {
    slug: 'cafe-avellana-kaffekapslen-cafe-molido',
    nombre: 'Kaffekapslen Café Avellana 250 g Café molido',
    marca: 'Kaffekapslen',
    peso: '250 g',
    precio: 5.89,
    sabor: 'Avellana',
  },

  // ═══ Segafredo (2) ═══
  {
    slug: 'intermezzo-segafredo-cafe-molido',
    nombre: 'Segafredo Intermezzo 250 g Café molido',
    marca: 'Segafredo',
    peso: '250 g',
    precio: 4.29,
  },
  {
    slug: 'espresso-casa-segafredo-cafe-molido',
    nombre: 'Segafredo Espresso Casa 250 g Café molido',
    marca: 'Segafredo',
    peso: '250 g',
    precio: 4.39,
  },

  // ═══ Costa (2) ═══
  {
    slug: 'intense-amazonian-blend-costa-coffee-cafe-molido-200',
    nombre: 'Costa Intense Amazonian Blend 200 g Café molido',
    marca: 'Costa',
    peso: '200 g',
    precio: 4.99,
  },
  {
    slug: 'signature-blend-costa-coffee-cafe-molido-200',
    nombre: 'Costa Signature Blend 200 g Café molido',
    marca: 'Costa',
    peso: '200 g',
    precio: 4.99,
  },

  // ═══ Starbucks (2) ═══
  {
    slug: 'holiday-blend-starbucks-190-g-cafe-molido',
    nombre: 'Starbucks Holiday Blend 190 g Café molido',
    marca: 'Starbucks',
    peso: '190 g',
    precio: 3.69,
  },
  {
    slug: 'holiday-blend-950-g-cafe-molido',
    nombre: 'Starbucks Holiday Blend 950 g Café molido',
    marca: 'Starbucks',
    peso: '950 g',
    precio: 17.49,
  },
];

function httpGet(url, wantBuf = false) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,image/webp,*/*;q=0.8',
      },
    };
    const get = (o) =>
      https
        .get(o, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const loc = res.headers.location.startsWith('http')
              ? res.headers.location
              : `https://${parsed.hostname}${res.headers.location}`;
            const p2 = new URL(loc);
            return get({
              hostname: p2.hostname,
              path: p2.pathname + p2.search,
              headers: o.headers,
            });
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const buf = Buffer.concat(chunks);
            resolve({ data: wantBuf ? buf : buf.toString(), status: res.statusCode });
          });
          res.on('error', reject);
        })
        .on('error', reject);
    get(opts);
  });
}

async function discoverImageUrl(productUrl) {
  try {
    const { data: html, status } = await httpGet(productUrl);
    if (status !== 200) return null;
    let m = html.match(
      /https:\/\/kaffekapslen\.media\/media\/catalog\/product\/cache\/[^"'\s]+?-1201\.webp/
    );
    if (m) return m[0];
    m = html.match(
      /https:\/\/kaffekapslen\.media\/media\/catalog\/product\/cache\/[^"'\s]+?-0001\.(jpg|webp)/
    );
    if (m) return m[0];
    m = html.match(
      /https:\/\/kaffekapslen\.media\/media\/catalog\/product\/cache\/[^"'\s]+?\.(webp|jpg)/
    );
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

async function uploadPhoto(docId, imgUrl) {
  const { data: buf } = await httpGet(imgUrl, true);
  if (buf.length < 1000) return null;
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

function slugToId(slug) {
  return slug.replace(/-/g, '_').substring(0, 60);
}

(async () => {
  console.log(`\n=== Importing ${ALL.length} café molido from kaffek.es ===\n`);
  let created = 0,
    skipped = 0,
    photos = 0,
    errors = 0;

  for (const p of ALL) {
    const docId = 'molido_' + slugToId(p.slug);
    const existing = await db.collection('cafes').doc(docId).get();
    if (existing.exists) {
      console.log(`SKIP: ${docId}`);
      skipped++;
      continue;
    }

    const productUrl = `https://kaffek.es/${p.slug}.html`;
    process.stdout.write(`CREATE: ${docId}`);

    let imgUrl = null;
    try {
      imgUrl = await discoverImageUrl(productUrl);
    } catch {}

    const data = {
      nombre: p.nombre,
      marca: p.marca,
      roaster: p.marca,
      tipo: 'molido',
      tipoProducto: 'molido',
      formato: `Café molido ${p.peso}`,
      tamano: p.peso,
      peso: p.peso,
      precio: p.precio,
      fuente: 'KaffeK',
      fuentePais: 'ES',
      fuenteUrl: productUrl,
      fecha: new Date().toISOString(),
      puntuacion: 0,
      votos: 0,
      status: 'approved',
      reviewStatus: 'approved',
      appVisible: true,
      updatedAt: new Date().toISOString(),
    };
    if (p.sabor) data.sabor = p.sabor;
    if (p.descafeinado) data.descafeinado = true;

    if (imgUrl) {
      try {
        const photoUrl = await uploadPhoto(docId, imgUrl);
        if (photoUrl) {
          Object.assign(data, photoFields(photoUrl));
          photos++;
        }
      } catch (e) {
        console.log(` Photo ERR: ${e.message}`);
        errors++;
      }
    }

    try {
      await db.collection('cafes').doc(docId).set(data);
      created++;
      console.log(` → ${p.precio}€ ${imgUrl ? '📸' : '⚠️'}`);
    } catch (e) {
      console.log(` DB ERR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Created: ${created} | Skipped: ${skipped} | Photos: ${photos} | Errors: ${errors}`);
  process.exit(0);
})();
