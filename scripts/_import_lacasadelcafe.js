#!/usr/bin/env node
/**
 * _import_lacasadelcafe.js – Import La Casa del Café products (30 unique)
 * Brand: La Casa del Café – Donostia-San Sebastián
 * Source: lacasadelcafe.es
 * 13 grano + 10 molido + 6 cápsulas + 1 verde = 30 products
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
  // ═══ Café en grano (13) ═══
  {
    id: 'lacasadelcafe_grano_blend_colombia_kenia',
    nombre: 'La Casa del Café Blend Colombia + Kenia en grano 250g',
    precio: 7.46,
    tipo: 'grano',
    blend: true,
    url: 'https://lacasadelcafe.es/comprar/blend-colombia-kenia/',
  },
  {
    id: 'lacasadelcafe_grano_blend_colombia_brasil',
    nombre: 'La Casa del Café Blend Colombia + Brasil en grano 250g',
    precio: 7.06,
    tipo: 'grano',
    blend: true,
    url: 'https://lacasadelcafe.es/comprar/blend-colombia-brasil/',
  },
  {
    id: 'lacasadelcafe_grano_colombia',
    nombre: 'La Casa del Café Colombia en grano 250g',
    precio: 7.3,
    tipo: 'grano',
    origen: 'Colombia',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-colombia-en-grano/',
  },
  {
    id: 'lacasadelcafe_grano_kenia',
    nombre: 'La Casa del Café Kenia en grano 250g',
    precio: 8.1,
    tipo: 'grano',
    origen: 'Kenia',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-kenia-en-grano/',
  },
  {
    id: 'lacasadelcafe_grano_costa_rica',
    nombre: 'La Casa del Café Costa Rica en grano 250g',
    precio: 7.8,
    tipo: 'grano',
    origen: 'Costa Rica',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-costa-rica-100-arabica/',
  },
  {
    id: 'lacasadelcafe_grano_guatemala',
    nombre: 'La Casa del Café Guatemala en grano 250g',
    precio: 7.8,
    tipo: 'grano',
    origen: 'Guatemala',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-guatemala-en-grano-100-arabica/',
  },
  {
    id: 'lacasadelcafe_grano_brasil',
    nombre: 'La Casa del Café Brasil en grano 250g',
    precio: 7.0,
    tipo: 'grano',
    origen: 'Brasil',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-brasil-en-grano-100-arabica/',
  },
  {
    id: 'lacasadelcafe_grano_etiopia',
    nombre: 'La Casa del Café Etiopía en grano 250g',
    precio: 7.8,
    tipo: 'grano',
    origen: 'Etiopía',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-etiopia-en-grano-100-arabica/',
  },
  {
    id: 'lacasadelcafe_grano_vietnam',
    nombre: 'La Casa del Café Vietnam en grano 250g',
    precio: 5.35,
    tipo: 'grano',
    origen: 'Vietnam',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-vietnam-en-grano-100-arabica/',
  },
  {
    id: 'lacasadelcafe_grano_descafeinado',
    nombre: 'La Casa del Café Descafeinado en grano 250g',
    precio: 7.5,
    tipo: 'grano',
    descafeinado: true,
    url: 'https://lacasadelcafe.es/comprar/cafe-descafeinado-en-grano-100-arabica/',
  },
  {
    id: 'lacasadelcafe_grano_comercio_justo',
    nombre: 'La Casa del Café Comercio Justo Natural en grano 250g',
    precio: 7.8,
    tipo: 'grano',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-comercio-justo-natural/',
  },
  {
    id: 'lacasadelcafe_grano_uganda',
    nombre: 'La Casa del Café Uganda en grano 250g',
    precio: 5.35,
    tipo: 'grano',
    origen: 'Uganda',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-uganda-en-grano/',
  },
  {
    id: 'lacasadelcafe_grano_ecologico',
    nombre: 'La Casa del Café Ecológico Arábica en grano 250g',
    precio: 8.25,
    tipo: 'grano',
    url: 'https://lacasadelcafe.es/comprar/cafe-ecologico-arabica/',
  },

  // ═══ Café molido (10) ═══
  {
    id: 'lacasadelcafe_molido_colombia',
    nombre: 'La Casa del Café Colombia molido 250g',
    precio: 7.3,
    tipo: 'molido',
    origen: 'Colombia',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-colombia-molido/',
  },
  {
    id: 'lacasadelcafe_molido_kenia',
    nombre: 'La Casa del Café Kenia molido 250g',
    precio: 8.1,
    tipo: 'molido',
    origen: 'Kenia',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-kenia-molido/',
  },
  {
    id: 'lacasadelcafe_molido_costa_rica',
    nombre: 'La Casa del Café Costa Rica molido 250g',
    precio: 7.8,
    tipo: 'molido',
    origen: 'Costa Rica',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-costa-rica-molido-100-arabica/',
  },
  {
    id: 'lacasadelcafe_molido_guatemala',
    nombre: 'La Casa del Café Guatemala molido 250g',
    precio: 7.8,
    tipo: 'molido',
    origen: 'Guatemala',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-guatemala-molido-100-arabica/',
  },
  {
    id: 'lacasadelcafe_molido_brasil',
    nombre: 'La Casa del Café Brasil molido 250g',
    precio: 7.0,
    tipo: 'molido',
    origen: 'Brasil',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-brasil-molido-100-arabica/',
  },
  {
    id: 'lacasadelcafe_molido_etiopia',
    nombre: 'La Casa del Café Etiopía molido 250g',
    precio: 7.8,
    tipo: 'molido',
    origen: 'Etiopía',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-etiopia-molido-100-arabica/',
  },
  {
    id: 'lacasadelcafe_molido_vietnam',
    nombre: 'La Casa del Café Vietnam molido 250g',
    precio: 5.35,
    tipo: 'molido',
    origen: 'Vietnam',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-vietnam-molido-100-arabica/',
  },
  {
    id: 'lacasadelcafe_molido_descafeinado',
    nombre: 'La Casa del Café Descafeinado molido 250g',
    precio: 7.5,
    tipo: 'molido',
    descafeinado: true,
    url: 'https://lacasadelcafe.es/comprar/cafe-descafeinado-molido-100-arabica/',
  },
  {
    id: 'lacasadelcafe_molido_comercio_justo',
    nombre: 'La Casa del Café Comercio Justo Natural molido 250g',
    precio: 7.8,
    tipo: 'molido',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-comercio-justo-molido/',
  },
  {
    id: 'lacasadelcafe_molido_uganda',
    nombre: 'La Casa del Café Uganda molido',
    precio: 5.35,
    tipo: 'molido',
    origen: 'Uganda',
    url: 'https://lacasadelcafe.es/comprar/cafe-de-uganda-molido/',
  },

  // ═══ Cápsulas (6) ═══
  {
    id: 'lacasadelcafe_koffeecup_colombia',
    nombre: 'La Casa del Café Cápsulas Koffee Cup Colombia',
    precio: 23.75,
    tipo: 'capsula',
    sistema: 'Koffee Cup',
    origen: 'Colombia',
    url: 'https://lacasadelcafe.es/comprar/capsulas-koffee-cup-de-cafe-de-colombia/',
  },
  {
    id: 'lacasadelcafe_koffeecup_arabicas_intenso',
    nombre: 'La Casa del Café Cápsulas Koffee Cup Arábicas Intenso',
    precio: 23.75,
    tipo: 'capsula',
    sistema: 'Koffee Cup',
    url: 'https://lacasadelcafe.es/comprar/capsulas-koffee-cup-de-cafe-arabicas-intenso/',
  },
  {
    id: 'lacasadelcafe_koffeecup_descafeinado',
    nombre: 'La Casa del Café Cápsulas Koffee Cup Descafeinado',
    precio: 23.75,
    tipo: 'capsula',
    sistema: 'Koffee Cup',
    descafeinado: true,
    url: 'https://lacasadelcafe.es/comprar/capsulas-koffee-cup-de-cafe-descafeinado/',
  },
  {
    id: 'lacasadelcafe_nespresso_colombia',
    nombre: 'La Casa del Café Cápsulas Nespresso Colombia 10 uds',
    precio: 5.9,
    tipo: 'capsula',
    sistema: 'Nespresso',
    origen: 'Colombia',
    url: 'https://lacasadelcafe.es/comprar/capsulas-de-cafe-colombia-nespresso/',
  },
  {
    id: 'lacasadelcafe_nespresso_descafeinado',
    nombre: 'La Casa del Café Cápsulas Nespresso Descafeinado 10 uds',
    precio: 5.9,
    tipo: 'capsula',
    sistema: 'Nespresso',
    descafeinado: true,
    url: 'https://lacasadelcafe.es/comprar/capsulas-de-cafe-descafeinado-compatibles-nespresso/',
  },
  {
    id: 'lacasadelcafe_nespresso_arabicas_intenso',
    nombre: 'La Casa del Café Cápsulas Nespresso Arábicas Intenso 10 uds',
    precio: 5.9,
    tipo: 'capsula',
    sistema: 'Nespresso',
    url: 'https://lacasadelcafe.es/comprar/capsulas-de-cafe-arabicas-nespresso/',
  },

  // ═══ Café verde (1) ═══
  {
    id: 'lacasadelcafe_verde_brasil',
    nombre: 'La Casa del Café Café Verde de Brasil en grano 250g',
    precio: 6.52,
    tipo: 'verde',
    origen: 'Brasil',
    url: 'https://lacasadelcafe.es/comprar/cafe-verde-de-brasil-en-grano/',
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
    // WooCommerce og:image
    let m = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (m) return m[1];
    // WooCommerce main product image
    m = html.match(
      /class=["']woocommerce-product-gallery__image[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i
    );
    if (m) return m[1];
    // wp-post-image
    m = html.match(/<img[^>]+class=["'][^"']*wp-post-image[^"']*["'][^>]+src=["']([^"']+)["']/i);
    if (m) return m[1];
    return null;
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

(async () => {
  console.log(`\n=== Importing ${ALL.length} La Casa del Café products ===\n`);
  let created = 0,
    skipped = 0,
    photos = 0,
    errors = 0;

  for (const p of ALL) {
    const docId = p.id;
    const existing = await db.collection('cafes').doc(docId).get();
    if (existing.exists) {
      console.log(`SKIP: ${docId}`);
      skipped++;
      continue;
    }

    process.stdout.write(`CREATE: ${docId}`);

    let imgUrl = null;
    try {
      imgUrl = await discoverImageUrl(p.url);
    } catch {}

    const data = {
      nombre: p.nombre,
      marca: 'La Casa del Café',
      roaster: 'La Casa del Café',
      tipo: p.tipo,
      tipoProducto: p.tipo === 'capsula' ? 'capsulas' : p.tipo,
      formato: '250g',
      tamano: '250g',
      precio: p.precio,
      fuente: 'lacasadelcafe.es',
      fuentePais: 'ES',
      fuenteUrl: p.url,
      fecha: new Date().toISOString(),
      puntuacion: 0,
      votos: 0,
      status: 'approved',
      reviewStatus: 'approved',
      appVisible: true,
      updatedAt: new Date().toISOString(),
    };
    if (p.origen) data.origen = p.origen;
    if (p.descafeinado) data.descafeinado = true;
    if (p.blend) data.blend = true;
    if (p.sistema) {
      data.sistema = p.sistema;
      data.compatibilidad = p.sistema;
    }

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
