#!/usr/bin/env node
/**
 * _import_senseo_kaffek.js – April 2026
 * Import ALL Senseo monodosis from kaffek.es (52 products, 2 pages)
 * Brands: Senseo(20), Kaffekapslen(11), Café René(9), Gimoka(4),
 *         Grand'Mère(2), Friele(2), Baileys(1), Douwe Egberts(1), Milka(1), Segafredo(1)
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
  // ═══ Senseo (20) ═══
  {
    slug: 'cafe-latte-senseo',
    nombre: 'Senseo Café Latte 8 monodosis para Senseo',
    marca: 'Senseo',
    pods: 8,
    precio: 2.99,
  },
  {
    slug: 'strong-48-senseo-senseo',
    nombre: 'Senseo Strong 48 monodosis para Senseo',
    marca: 'Senseo',
    pods: 48,
    precio: 9.29,
  },
  {
    slug: 'descafeinado-senseo',
    nombre: 'Senseo Descafeinado 36 monodosis para Senseo',
    marca: 'Senseo',
    pods: 36,
    precio: 7.89,
    descafeinado: true,
  },
  {
    slug: 'cappuccino-senseo-16',
    nombre: 'Senseo Cappuccino 16 monodosis para Senseo',
    marca: 'Senseo',
    pods: 16,
    precio: 4.99,
    sabor: 'Cappuccino',
  },
  {
    slug: 'extra-strong-big-pack-medium-cup-senseo-senseo',
    nombre: 'Senseo Extra Strong 36 monodosis para Senseo',
    marca: 'Senseo',
    pods: 36,
    precio: 7.19,
  },
  {
    slug: 'cappuccino-choco-senseo-senseo',
    nombre: 'Senseo Choco Cappuccino 8 monodosis para Senseo',
    marca: 'Senseo',
    pods: 8,
    precio: 2.75,
    sabor: 'Chocolate',
  },
  {
    slug: 'corse-xl-senseo-senseo',
    nombre: 'Senseo Corsé XL 60 monodosis para Senseo',
    marca: 'Senseo',
    pods: 60,
    precio: 11.59,
  },
  {
    slug: 'mild-xl-senseo-senseo',
    nombre: 'Senseo Mild 48 monodosis para Senseo',
    marca: 'Senseo',
    pods: 48,
    precio: 8.39,
  },
  {
    slug: 'big-pack-classic-senseo',
    nombre: 'Senseo Classic 36 monodosis para Senseo',
    marca: 'Senseo',
    pods: 36,
    precio: 6.39,
  },
  {
    slug: 'caramelo-senseo-senseo',
    nombre: 'Senseo Caramelo 32 monodosis para Senseo',
    marca: 'Senseo',
    pods: 32,
    precio: 4.99,
    sabor: 'Caramelo',
  },
  {
    slug: 'vanilla-cafe-latte-senseo-senseo',
    nombre: 'Senseo Vanilla Café Latte 8 monodosis para Senseo',
    marca: 'Senseo',
    pods: 8,
    precio: 2.75,
    sabor: 'Vainilla',
  },
  {
    slug: 'cappuccino-senseo',
    nombre: 'Senseo Cappuccino 8 monodosis para Senseo',
    marca: 'Senseo',
    pods: 8,
    precio: 2.69,
  },
  {
    slug: 'senseo-decaf-40-senseo-senseo',
    nombre: 'Senseo Decaf 40 monodosis para Senseo',
    marca: 'Senseo',
    pods: 40,
    precio: 8.49,
    descafeinado: true,
  },
  {
    slug: 'caramel-cappuccino-senseo-senseo',
    nombre: 'Senseo Caramel Cappuccino 8 monodosis para Senseo',
    marca: 'Senseo',
    pods: 8,
    precio: 2.75,
    sabor: 'Caramelo',
  },
  {
    slug: 'gold-36-senseo-senseo',
    nombre: 'Senseo Gold 36 monodosis para Senseo',
    marca: 'Senseo',
    pods: 36,
    precio: 7.29,
  },
  {
    slug: 'xl-morning-cafe-guten-morgen-senseo-senseo',
    nombre: 'Senseo XL Buenos Días 10 monodosis para Senseo',
    marca: 'Senseo',
    pods: 10,
    precio: 3.29,
  },
  {
    slug: 'cafe-latte-dubai-chocolate-style-senseo-8',
    nombre: 'Senseo Café Latte Dubai Chocolate Style 8 monodosis para Senseo',
    marca: 'Senseo',
    pods: 8,
    precio: 2.75,
    sabor: 'Chocolate',
  },
  {
    slug: 'classic-48-senseo-senseo',
    nombre: 'Senseo Classic 48 monodosis para Senseo',
    marca: 'Senseo',
    pods: 48,
    precio: 9.19,
  },
  {
    slug: 'vainilla-senseo-senseo',
    nombre: 'Senseo Vainilla 32 monodosis para Senseo',
    marca: 'Senseo',
    pods: 32,
    precio: 5.79,
    sabor: 'Vainilla',
  },
  {
    slug: 'espresso-senseo-senseo',
    nombre: 'Senseo Espresso 16 monodosis para Senseo',
    marca: 'Senseo',
    pods: 16,
    precio: 3.29,
  },

  // ═══ Kaffekapslen (11) ═══
  {
    slug: 'avellana-cafe-diario-kaffekapslen-senseo',
    nombre: 'Kaffekapslen Avellana 36 monodosis para Senseo',
    marca: 'Kaffekapslen',
    pods: 36,
    precio: 4.39,
    sabor: 'Avellana',
  },
  {
    slug: 'extra-strong-cafe-diario-kaffekapslen-senseo',
    nombre: 'Kaffekapslen Extra Strong 36 monodosis para Senseo',
    marca: 'Kaffekapslen',
    pods: 36,
    precio: 2.69,
  },
  {
    slug: 'chocolate-cafe-diario-kaffekapslen-senseo',
    nombre: 'Kaffekapslen Chocolate 36 monodosis para Senseo',
    marca: 'Kaffekapslen',
    pods: 36,
    precio: 4.09,
    sabor: 'Chocolate',
  },
  {
    slug: 'strong-cafe-diario-kaffekapslen-senseo',
    nombre: 'Kaffekapslen Strong 36 monodosis para Senseo',
    marca: 'Kaffekapslen',
    pods: 36,
    precio: 2.89,
  },
  {
    slug: 'classic-cafe-diario-kaffekapslen-senseo',
    nombre: 'Kaffekapslen Classic 36 monodosis para Senseo',
    marca: 'Kaffekapslen',
    pods: 36,
    precio: 3.19,
  },
  {
    slug: 'caramelo-cafe-diario-kaffekapslen-senseo',
    nombre: 'Kaffekapslen Caramelo 36 monodosis para Senseo',
    marca: 'Kaffekapslen',
    pods: 36,
    precio: 4.59,
    sabor: 'Caramelo',
  },
  {
    slug: 'vainilla-cafe-diario-kaffekapslen-senseo',
    nombre: 'Kaffekapslen Vainilla 36 monodosis para Senseo',
    marca: 'Kaffekapslen',
    pods: 36,
    precio: 3.89,
    sabor: 'Vainilla',
  },
  {
    slug: 'dynamite-coffee-kaffekapslen-senseo',
    nombre: 'Kaffekapslen Dynamite Coffee 18 monodosis para Senseo',
    marca: 'Kaffekapslen',
    pods: 18,
    precio: 1.89,
  },
  {
    slug: 'descafeinado-cafe-diario-kaffekapslen-senseo',
    nombre: 'Kaffekapslen Descafeinado 36 monodosis para Senseo',
    marca: 'Kaffekapslen',
    pods: 36,
    precio: 2.99,
    descafeinado: true,
  },
  {
    slug: 'strong-xl-cafe-diario-kaffekapslen-senseo',
    nombre: 'Kaffekapslen Strong XL 20 monodosis para Senseo',
    marca: 'Kaffekapslen',
    pods: 20,
    precio: 3.29,
  },
  {
    slug: 'classic-xl-cafe-diario-kaffekapslen-senseo',
    nombre: 'Kaffekapslen Classic XL 20 monodosis para Senseo',
    marca: 'Kaffekapslen',
    pods: 20,
    precio: 3.29,
  },

  // ═══ Café René (9) ═══
  {
    slug: 'big-pack-36-espresso-cafe-rene-senseo',
    nombre: 'Café René Espresso 36 monodosis para Senseo',
    marca: 'Café René',
    pods: 36,
    precio: 3.89,
  },
  {
    slug: 'big-pack-36-classic-cafe-rene-senseo',
    nombre: 'Café René Classic 36 monodosis para Senseo',
    marca: 'Café René',
    pods: 36,
    precio: 3.59,
  },
  {
    slug: 'vainilla-cafe-rene-senseo',
    nombre: 'Café René Vainilla 18 monodosis para Senseo',
    marca: 'Café René',
    pods: 18,
    precio: 2.49,
    sabor: 'Vainilla',
  },
  {
    slug: 'classic-xl-large-cup-cafe-rene-senseo',
    nombre: 'Café René Classic (Taza grande) 20 monodosis para Senseo',
    marca: 'Café René',
    pods: 20,
    precio: 3.49,
  },
  {
    slug: 'avellana-cafe-rene-senseo',
    nombre: 'Café René Avellana 18 monodosis para Senseo',
    marca: 'Café René',
    pods: 18,
    precio: 2.49,
    sabor: 'Avellana',
  },
  {
    slug: 'karamel-cafe-rene-senseo',
    nombre: 'Café René Caramelo 18 monodosis para Senseo',
    marca: 'Café René',
    pods: 18,
    precio: 2.49,
    sabor: 'Caramelo',
  },
  {
    slug: 'strong-xl-large-cup-cafe-rene-senseo',
    nombre: 'Café René Strong (Taza grande) 20 monodosis para Senseo',
    marca: 'Café René',
    pods: 20,
    precio: 3.49,
  },
  {
    slug: 'almendra-cafe-rene-senseo',
    nombre: 'Café René Almendra 18 monodosis para Senseo',
    marca: 'Café René',
    pods: 18,
    precio: 2.49,
    sabor: 'Almendra',
  },
  {
    slug: 'big-pack-strong-cafe-rene-senseo',
    nombre: 'Café René Strong 36 monodosis para Senseo',
    marca: 'Café René',
    pods: 36,
    precio: 3.49,
  },

  // ═══ Gimoka (4) ═══
  {
    slug: 'classic-36-gimoka-senseo',
    nombre: 'Gimoka Classic 36 monodosis para Senseo',
    marca: 'Gimoka',
    pods: 36,
    precio: 5.79,
  },
  {
    slug: 'mild-gimoka-senseo',
    nombre: 'Gimoka Mild 36 monodosis para Senseo',
    marca: 'Gimoka',
    pods: 36,
    precio: 5.29,
  },
  {
    slug: 'strong-gimoka-senseo',
    nombre: 'Gimoka Strong 36 monodosis para Senseo',
    marca: 'Gimoka',
    pods: 36,
    precio: 5.79,
  },
  {
    slug: 'decaf-gimoka-senseo',
    nombre: 'Gimoka Decaf 36 monodosis para Senseo',
    marca: 'Gimoka',
    pods: 36,
    precio: 6.89,
    descafeinado: true,
  },

  // ═══ Grand'Mère (2) ═══
  {
    slug: 'corse-grand-mere-senseo',
    nombre: "Grand'Mère Corsé 54 monodosis para Senseo",
    marca: "Grand'Mère",
    pods: 54,
    precio: 6.59,
  },
  {
    slug: 'classique-grand-mere-senseo',
    nombre: "Grand'Mère Classique 54 monodosis para Senseo",
    marca: "Grand'Mère",
    pods: 54,
    precio: 7.29,
  },

  // ═══ Friele (2) ═══
  {
    slug: 'big-pack-medium-cup-friele-senseo',
    nombre: 'Friele 36 monodosis para Senseo',
    marca: 'Friele',
    pods: 36,
    precio: 5.79,
  },
  {
    slug: 'xl-large-cup-friele-senseo',
    nombre: 'Friele (Taza grande) 20 monodosis para Senseo',
    marca: 'Friele',
    pods: 20,
    precio: 5.89,
  },

  // ═══ Baileys (1) ═══
  {
    slug: 'cappuccino-baileys-senseo',
    nombre: 'Baileys Cappuccino 8 monodosis para Senseo',
    marca: 'Baileys',
    pods: 8,
    precio: 2.95,
    sabor: 'Baileys',
  },

  // ═══ Douwe Egberts (1) ═══
  {
    slug: 'aroma-rood-54-douwe-egberts-senseo',
    nombre: 'Douwe Egberts Aroma Rood 54 monodosis para Senseo',
    marca: 'Douwe Egberts',
    pods: 54,
    precio: 10.39,
  },

  // ═══ Milka (1) — already imported via earlier script, skip check by ID ═══
  // milka_senseo_cacao_8 already exists

  // ═══ Segafredo (1) ═══
  {
    slug: 'intermezzeo-segafredo-senseo',
    nombre: 'Segafredo Intermezzo 16 monodosis para Senseo',
    marca: 'Segafredo',
    pods: 16,
    precio: 3.59,
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
  console.log(`\n=== Importing ${ALL.length} Senseo monodosis from kaffek.es ===\n`);
  let created = 0,
    skipped = 0,
    photos = 0,
    errors = 0;

  for (const p of ALL) {
    const docId = 'senseo_' + slugToId(p.slug);
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
      tipo: 'capsula',
      tipoProducto: 'capsulas',
      formato: `${p.pods} monodosis`,
      tamano: `${p.pods} monodosis`,
      capsulas: p.pods,
      precio: p.precio,
      sistema: 'Senseo',
      compatibilidad: 'Senseo',
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
