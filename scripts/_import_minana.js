#!/usr/bin/env node
/**
 * _import_minana.js – Import Cafés Miñana products (24 cafés)
 * Brand: Cafés Miñana – Manises, Valencia – since 1956
 * Source: cafesminana.es
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
  // ═══ Page 1 (12 products) ═══
  {
    id: 'minana_cafe_artesano_1kg',
    nombre: 'Cafés Miñana Café Artesano 1kg',
    precio: 22.0,
    tipo: 'grano',
    formato: '1kg',
    url: 'https://cafesminana.es/cafes/453-cafe-artesano.html',
  },
  {
    id: 'minana_arabica_seleccion_1kg',
    nombre: 'Cafés Miñana Arábica Selección 1kg',
    precio: 26.4,
    tipo: 'grano',
    formato: '1kg',
    url: 'https://cafesminana.es/cafes/89-cafe-arabica.html',
  },
  {
    id: 'minana_blend_tueste_natural_1kg',
    nombre: 'Cafés Miñana Blend Tueste Natural 1kg',
    precio: 18.5,
    tipo: 'grano',
    formato: '1kg',
    blend: true,
    url: 'https://cafesminana.es/cafes/454-cafe-tueste-natural.html',
  },
  {
    id: 'minana_mezcla_90_10',
    nombre: 'Cafés Miñana Mezcla 90/10',
    precio: 17.6,
    tipo: 'grano',
    formato: '1kg',
    blend: true,
    url: 'https://cafesminana.es/cafes/5-cafe-mezcla-90-10.html',
  },
  {
    id: 'minana_blend_80_20_1kg',
    nombre: 'Cafés Miñana Blend 80/20 1kg',
    precio: 17.6,
    tipo: 'grano',
    formato: '1kg',
    blend: true,
    url: 'https://cafesminana.es/cafes/455-cafe-mezcla-80-20.html',
  },
  {
    id: 'minana_descafeinado_1kg',
    nombre: 'Cafés Miñana Descafeinado 1kg',
    precio: 18.75,
    tipo: 'grano',
    formato: '1kg',
    descafeinado: true,
    url: 'https://cafesminana.es/cafes/456-cafe-descafeinado.html',
  },
  {
    id: 'minana_marengo_tueste_natural',
    nombre: 'Cafés Miñana Marengo Tueste Natural',
    precio: 16.5,
    tipo: 'grano',
    formato: '1kg',
    url: 'https://cafesminana.es/cafes/97-cafe-marengo-tueste-natural.html',
  },
  {
    id: 'minana_kamor_80_20',
    nombre: 'Cafés Miñana Kamor 80/20',
    precio: 16.5,
    tipo: 'grano',
    formato: '1kg',
    blend: true,
    url: 'https://cafesminana.es/cafes/301-cafe-kamor-mezcla-80-20.html',
  },
  {
    id: 'minana_descafeinado_espresso_sobres',
    nombre: 'Cafés Miñana Descafeinado Espresso en sobres',
    precio: 9.9,
    tipo: 'molido',
    formato: 'Sobres',
    descafeinado: true,
    url: 'https://cafesminana.es/cafes/9-cafe-cafe-descafeinado-espresso.html',
  },
  {
    id: 'minana_soluble_descafeinado',
    nombre: 'Cafés Miñana Soluble Descafeinado',
    precio: 10.0,
    tipo: 'soluble',
    formato: 'Soluble',
    descafeinado: true,
    url: 'https://cafesminana.es/cafes/84-cafe-soluble-minana.html',
  },
  {
    id: 'minana_ethiopia_sidamo',
    nombre: 'Cafés Miñana Ethiopia Sidamo',
    precio: 8.6,
    tipo: 'grano',
    formato: '250g',
    origen: 'Etiopía',
    url: 'https://cafesminana.es/productos/341-cafe-superior-gourmet-origenes-ethiopia-sidamo.html',
  },
  {
    id: 'minana_brasil_sarutaia',
    nombre: 'Cafés Miñana Brasil Sarutaia Premium Extra Dulce',
    precio: 7.55,
    tipo: 'grano',
    formato: '250g',
    origen: 'Brasil',
    url: 'https://cafesminana.es/productos/342-brasil-sarutaia-premium-extra-dulce.html',
  },

  // ═══ Page 2 (12 products) ═══
  {
    id: 'minana_nicaragua_shg',
    nombre: 'Cafés Miñana Nicaragua SHG +18',
    precio: 7.95,
    tipo: 'grano',
    formato: '250g',
    origen: 'Nicaragua',
    url: 'https://cafesminana.es/productos/343-nicaragua-shg-18.html',
  },
  {
    id: 'minana_jamaica_blue_mountain',
    nombre: 'Cafés Miñana Jamaica Blue Mountain',
    precio: 45.0,
    tipo: 'grano',
    formato: '250g',
    origen: 'Jamaica',
    url: 'https://cafesminana.es/productos/345-jamaica-blue-mountain.html',
  },
  {
    id: 'minana_guatemala_shb_volcan_de_oro',
    nombre: 'Cafés Miñana Guatemala SHB EP Volcán de Oro',
    precio: 8.25,
    tipo: 'grano',
    formato: '250g',
    origen: 'Guatemala',
    url: 'https://cafesminana.es/productos/346-guatemala-shb-ep-volcan-de-oro.html',
  },
  {
    id: 'minana_kenya_aa_cimazul',
    nombre: 'Cafés Miñana Kenya AA Cimazul',
    precio: 9.1,
    tipo: 'grano',
    formato: '250g',
    origen: 'Kenia',
    url: 'https://cafesminana.es/productos/347-kenya-aa-cimazul.html',
  },
  {
    id: 'minana_costa_rica_shb_guayabo',
    nombre: 'Cafés Miñana Costa Rica SHB EP Guayabo',
    precio: 8.25,
    tipo: 'grano',
    formato: '250g',
    origen: 'Costa Rica',
    url: 'https://cafesminana.es/productos/348-costa-rica-shb-ep-guayabo.html',
  },
  {
    id: 'minana_colombia_medellin_excelso',
    nombre: 'Cafés Miñana Colombia Medellín Excelso',
    precio: 7.55,
    tipo: 'grano',
    formato: '250g',
    origen: 'Colombia',
    url: 'https://cafesminana.es/productos/349-colombia-medellin-excelso.html',
  },
  {
    id: 'minana_honduras_shg',
    nombre: 'Cafés Miñana Honduras SHG',
    precio: 7.05,
    tipo: 'grano',
    formato: '250g',
    origen: 'Honduras',
    url: 'https://cafesminana.es/productos/350-honduras-shg.html',
  },
  {
    id: 'minana_espresso_blend',
    nombre: 'Cafés Miñana Espresso Blend',
    precio: 8.25,
    tipo: 'grano',
    formato: '250g',
    blend: true,
    url: 'https://cafesminana.es/productos/351-espresso-blend.html',
  },
  {
    id: 'minana_panama_geisha',
    nombre: 'Cafés Miñana Panamá Agrícola Geisha Alto Jaramillo',
    precio: 45.0,
    tipo: 'grano',
    formato: '250g',
    origen: 'Panamá',
    url: 'https://cafesminana.es/productos/352-panama-agricola-geisha-alto-jaramillo.html',
  },
  {
    id: 'minana_hawai_kona',
    nombre: 'Cafés Miñana Hawái Kona Aloha Farms',
    precio: 45.0,
    tipo: 'grano',
    formato: '250g',
    origen: 'Hawái',
    url: 'https://cafesminana.es/productos/353-hawai-kona-aloha-farms.html',
  },
  {
    id: 'minana_cafe_artesano_250g',
    nombre: 'Cafés Miñana Café Artesano 250g',
    precio: 6.5,
    tipo: 'grano',
    formato: '250g',
    url: 'https://cafesminana.es/productos/354-cafe-artesano-250g.html',
  },
  {
    id: 'minana_guatemala_descafeinado_co2',
    nombre: 'Cafés Miñana Guatemala Descafeinado SHG CO2',
    precio: 11.95,
    tipo: 'grano',
    formato: '250g',
    origen: 'Guatemala',
    descafeinado: true,
    url: 'https://cafesminana.es/productos/355-guatemala-descafeinado-shg-co2.html',
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
    // PrestaShop og:image or main product image
    let m = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (m) return m[1];
    // .product-cover img
    m = html.match(/class=["']product-cover["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
    if (m) return m[1];
    // Any large product image
    m = html.match(/id=["']bigpic["'][^>]*src=["']([^"']+)["']/i);
    if (m) return m[1];
    // Fallback - default-image
    m = html.match(/class=["']default-image["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
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
  console.log(`\n=== Importing ${ALL.length} Cafés Miñana products ===\n`);
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
      marca: 'Cafés Miñana',
      roaster: 'Cafés Miñana',
      tipo: p.tipo,
      tipoProducto: p.tipo === 'grano' ? 'grano' : p.tipo === 'molido' ? 'molido' : p.tipo,
      formato: p.formato,
      tamano: p.formato,
      precio: p.precio,
      fuente: 'cafesminana.es',
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
