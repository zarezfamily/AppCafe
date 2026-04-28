#!/usr/bin/env node
/**
 * _import_cafetearte.js – Import Cafetearte products (62 cafés)
 * Brand: Cafetearte – Madrid, Spain
 * Source: cafetearte.es
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
  // ═══ Natural / Origen (17) ═══
  {
    id: 'cafetearte_colombia_supremo',
    nombre: 'Cafetearte Colombia Supremo',
    url: 'https://www.cafetearte.es/natural/96-colombia-supremo.html',
    origen: 'Colombia',
  },
  {
    id: 'cafetearte_etiopia_limu',
    nombre: 'Cafetearte Etiopía Limu',
    url: 'https://www.cafetearte.es/natural/100-etiopia-limu.html',
    origen: 'Etiopía',
  },
  {
    id: 'cafetearte_caracolillo',
    nombre: 'Cafetearte Caracolillo',
    url: 'https://www.cafetearte.es/natural/97-caracolillo.html',
    origen: 'Brasil',
  },
  {
    id: 'cafetearte_honduras_marcala',
    nombre: 'Cafetearte Honduras Marcala',
    url: 'https://www.cafetearte.es/natural/101-honduras-marcala.html',
    origen: 'Honduras',
  },
  {
    id: 'cafetearte_guatemala_oro_plus',
    nombre: 'Cafetearte Guatemala Oro Plus',
    url: 'https://www.cafetearte.es/natural/98-guatemala-oro-plus.html',
    origen: 'Guatemala',
  },
  {
    id: 'cafetearte_costa_rica_tarrazu',
    nombre: 'Cafetearte Costa Rica Tarrazú',
    url: 'https://www.cafetearte.es/natural/99-costa-rica-tarrazu.html',
    origen: 'Costa Rica',
  },
  {
    id: 'cafetearte_kenia_aa_cimazul',
    nombre: 'Cafetearte Kenia AA Cimazul',
    url: 'https://www.cafetearte.es/natural/526-kenia-aa-cimazul.html',
    origen: 'Kenia',
  },
  {
    id: 'cafetearte_maragogype',
    nombre: 'Cafetearte Maragogype',
    url: 'https://www.cafetearte.es/natural/527-maragogype.html',
    origen: 'México',
  },
  {
    id: 'cafetearte_republica_dominicana',
    nombre: 'Cafetearte República Dominicana',
    url: 'https://www.cafetearte.es/natural/528-republica-dominicana.html',
    origen: 'República Dominicana',
  },
  {
    id: 'cafetearte_brasil_premium',
    nombre: 'Cafetearte Brasil Premium',
    url: 'https://www.cafetearte.es/natural/529-brasil-premium.html',
    origen: 'Brasil',
  },
  {
    id: 'cafetearte_brasil_sarutaia',
    nombre: 'Cafetearte Brasil Sarutaia',
    url: 'https://www.cafetearte.es/natural/530-brasil-sarutaia.html',
    origen: 'Brasil',
  },
  {
    id: 'cafetearte_papua_nueva_guinea',
    nombre: 'Cafetearte Papúa Nueva Guinea',
    url: 'https://www.cafetearte.es/natural/531-papua-nueva-guinea.html',
    origen: 'Papúa Nueva Guinea',
  },
  {
    id: 'cafetearte_australia_skybury',
    nombre: 'Cafetearte Australia Skybury',
    url: 'https://www.cafetearte.es/natural/1744-australia-skybury.html',
    origen: 'Australia',
  },
  {
    id: 'cafetearte_de_la_casa_premium',
    nombre: 'Cafetearte De la Casa Premium',
    url: 'https://www.cafetearte.es/natural/102-de-la-casa-premium.html',
    blend: true,
  },
  {
    id: 'cafetearte_de_la_casa_suave',
    nombre: 'Cafetearte De la Casa Suave',
    url: 'https://www.cafetearte.es/natural/103-de-la-casa-suave.html',
    blend: true,
  },
  {
    id: 'cafetearte_de_la_casa_medio',
    nombre: 'Cafetearte De la Casa Medio',
    url: 'https://www.cafetearte.es/natural/104-de-la-casa-medio.html',
    blend: true,
  },
  {
    id: 'cafetearte_de_la_casa_intenso',
    nombre: 'Cafetearte De la Casa Intenso',
    url: 'https://www.cafetearte.es/natural/105-de-la-casa-intenso.html',
    blend: true,
  },

  // ═══ Café de Sabores (13) ═══
  {
    id: 'cafetearte_sabor_galleta',
    nombre: 'Cafetearte Café Sabor Galleta',
    url: 'https://www.cafetearte.es/cafe-de-sabores/106-cafe-sabor-galleta.html',
    sabor: 'Galleta',
  },
  {
    id: 'cafetearte_sabor_melocoton',
    nombre: 'Cafetearte Café Sabor Melocotón',
    url: 'https://www.cafetearte.es/cafe-de-sabores/107-cafe-sabor-melocoton.html',
    sabor: 'Melocotón',
  },
  {
    id: 'cafetearte_sabor_avellana',
    nombre: 'Cafetearte Café Sabor Avellana',
    url: 'https://www.cafetearte.es/cafe-de-sabores/108-cafe-sabor-avellana.html',
    sabor: 'Avellana',
  },
  {
    id: 'cafetearte_sabor_canela',
    nombre: 'Cafetearte Café Sabor Canela',
    url: 'https://www.cafetearte.es/cafe-de-sabores/109-cafe-sabor-canela.html',
    sabor: 'Canela',
  },
  {
    id: 'cafetearte_sabor_chocolate',
    nombre: 'Cafetearte Café Sabor Chocolate',
    url: 'https://www.cafetearte.es/cafe-de-sabores/110-cafe-sabor-chocolate.html',
    sabor: 'Chocolate',
  },
  {
    id: 'cafetearte_sabor_vainilla',
    nombre: 'Cafetearte Café Sabor Vainilla',
    url: 'https://www.cafetearte.es/cafe-de-sabores/111-cafe-sabor-vainilla.html',
    sabor: 'Vainilla',
  },
  {
    id: 'cafetearte_sabor_chocolate_vainilla',
    nombre: 'Cafetearte Café Sabor Chocolate y Vainilla',
    url: 'https://www.cafetearte.es/cafe-de-sabores/112-cafe-sabor-chocolate-y-vainilla.html',
    sabor: 'Chocolate y Vainilla',
  },
  {
    id: 'cafetearte_sabor_naranja_chocolate',
    nombre: 'Cafetearte Café Sabor Naranja y Chocolate',
    url: 'https://www.cafetearte.es/cafe-de-sabores/113-cafe-sabor-naranja-y-chocolate.html',
    sabor: 'Naranja y Chocolate',
  },
  {
    id: 'cafetearte_sabor_toffee',
    nombre: 'Cafetearte Café Sabor Toffee',
    url: 'https://www.cafetearte.es/cafe-de-sabores/114-cafe-sabor-toffee.html',
    sabor: 'Toffee',
  },
  {
    id: 'cafetearte_sabor_chai',
    nombre: 'Cafetearte Café Sabor Chai',
    url: 'https://www.cafetearte.es/cafe-de-sabores/115-cafe-sabor-chai.html',
    sabor: 'Chai',
  },
  {
    id: 'cafetearte_sabor_calabaza',
    nombre: 'Cafetearte Café Sabor Calabaza',
    url: 'https://www.cafetearte.es/cafe-de-sabores/116-cafe-sabor-calabaza.html',
    sabor: 'Calabaza',
  },
  {
    id: 'cafetearte_sabor_navidad',
    nombre: 'Cafetearte Café Sabor Navidad',
    url: 'https://www.cafetearte.es/cafe-de-sabores/117-cafe-sabor-navidad.html',
    sabor: 'Navidad',
  },
  {
    id: 'cafetearte_sabor_fresa_chocolate',
    nombre: 'Cafetearte Café Sabor Fresa y Chocolate',
    url: 'https://www.cafetearte.es/cafe-de-sabores/2655-cafe-sabor-fresa-y-chocolate.html',
    sabor: 'Fresa y Chocolate',
  },

  // ═══ Descafeinados (7) ═══
  {
    id: 'cafetearte_descafeinado_mexico',
    nombre: 'Cafetearte Descafeinado México',
    url: 'https://www.cafetearte.es/cafe-descafeinado/120-descafeinado-mexico.html',
    descafeinado: true,
    origen: 'México',
  },
  {
    id: 'cafetearte_descafeinado',
    nombre: 'Cafetearte Descafeinado',
    url: 'https://www.cafetearte.es/cafe-descafeinado/119-descafeinado.html',
    descafeinado: true,
  },
  {
    id: 'cafetearte_descafeinado_galleta',
    nombre: 'Cafetearte Descafeinado Sabor Galleta',
    url: 'https://www.cafetearte.es/cafe-descafeinado/121-descafeinado-sabor-galleta.html',
    descafeinado: true,
    sabor: 'Galleta',
  },
  {
    id: 'cafetearte_descafeinado_canela',
    nombre: 'Cafetearte Descafeinado Sabor Canela',
    url: 'https://www.cafetearte.es/cafe-descafeinado/122-descafeinado-sabor-canela.html',
    descafeinado: true,
    sabor: 'Canela',
  },
  {
    id: 'cafetearte_descafeinado_chocolate',
    nombre: 'Cafetearte Descafeinado Sabor Chocolate',
    url: 'https://www.cafetearte.es/cafe-descafeinado/123-descafeinado-sabor-chocolate.html',
    descafeinado: true,
    sabor: 'Chocolate',
  },
  {
    id: 'cafetearte_descafeinado_vainilla',
    nombre: 'Cafetearte Descafeinado Sabor Vainilla',
    url: 'https://www.cafetearte.es/cafe-descafeinado/124-descafeinado-sabor-vainilla.html',
    descafeinado: true,
    sabor: 'Vainilla',
  },
  {
    id: 'cafetearte_descafeinado_avellana',
    nombre: 'Cafetearte Descafeinado Sabor Avellana',
    url: 'https://www.cafetearte.es/cafe-descafeinado/125-descafeinado-sabor-avellana.html',
    descafeinado: true,
    sabor: 'Avellana',
  },

  // ═══ Café Verde (6) ═══
  {
    id: 'cafetearte_verde_honduras',
    nombre: 'Cafetearte Café Verde Honduras Marcala',
    url: 'https://www.cafetearte.es/cafe-verde/126-cafe-verde-honduras-marcala.html',
    tipo: 'verde',
    origen: 'Honduras',
  },
  {
    id: 'cafetearte_verde_robusta_vietnam',
    nombre: 'Cafetearte Café Verde Robusta Vietnam',
    url: 'https://www.cafetearte.es/cafe-verde/127-cafe-verde-robusta-vietnam.html',
    tipo: 'verde',
    origen: 'Vietnam',
  },
  {
    id: 'cafetearte_verde_costa_rica',
    nombre: 'Cafetearte Café Verde Costa Rica Tarrazú',
    url: 'https://www.cafetearte.es/cafe-verde/128-cafe-verde-costa-rica-tarrazu.html',
    tipo: 'verde',
    origen: 'Costa Rica',
  },
  {
    id: 'cafetearte_verde_guatemala',
    nombre: 'Cafetearte Café Verde Guatemala Oro Plus',
    url: 'https://www.cafetearte.es/cafe-verde/129-cafe-verde-guatemala-oro-plus.html',
    tipo: 'verde',
    origen: 'Guatemala',
  },
  {
    id: 'cafetearte_verde_colombia',
    nombre: 'Cafetearte Café Verde Colombia Supremo',
    url: 'https://www.cafetearte.es/cafe-verde/130-cafe-verde-colombia-supremo.html',
    tipo: 'verde',
    origen: 'Colombia',
  },
  {
    id: 'cafetearte_verde_jamaica',
    nombre: 'Cafetearte Café Verde Jamaica Blue Mountain',
    url: 'https://www.cafetearte.es/cafe-verde/131-cafe-verde-jamaica-blue-mountain.html',
    tipo: 'verde',
    origen: 'Jamaica',
  },

  // ═══ Monodosis ESE (5) ═══
  {
    id: 'cafetearte_monodosis_natural',
    nombre: 'Cafetearte Monodosis ESE Natural',
    url: 'https://www.cafetearte.es/capsulas-y-monodosis/132-monodosis-natural.html',
    tipo: 'capsula',
    sistema: 'ESE',
  },
  {
    id: 'cafetearte_monodosis_colombia',
    nombre: 'Cafetearte Monodosis ESE Colombia',
    url: 'https://www.cafetearte.es/capsulas-y-monodosis/133-monodosis-colombia.html',
    tipo: 'capsula',
    sistema: 'ESE',
    origen: 'Colombia',
  },
  {
    id: 'cafetearte_monodosis_jamaica',
    nombre: 'Cafetearte Monodosis ESE Jamaica Blue Mountain',
    url: 'https://www.cafetearte.es/capsulas-y-monodosis/134-monodosis-jamaica-blue-mountain.html',
    tipo: 'capsula',
    sistema: 'ESE',
    origen: 'Jamaica',
  },
  {
    id: 'cafetearte_monodosis_brasil',
    nombre: 'Cafetearte Monodosis ESE Brasil',
    url: 'https://www.cafetearte.es/capsulas-y-monodosis/135-monodosis-brasil.html',
    tipo: 'capsula',
    sistema: 'ESE',
    origen: 'Brasil',
  },
  {
    id: 'cafetearte_monodosis_descafeinado',
    nombre: 'Cafetearte Monodosis ESE Descafeinado',
    url: 'https://www.cafetearte.es/capsulas-y-monodosis/136-monodosis-descafeinado.html',
    tipo: 'capsula',
    sistema: 'ESE',
    descafeinado: true,
  },

  // ═══ Cápsulas Nespresso (2 + 1 from p2) ═══
  {
    id: 'cafetearte_nespresso_organico',
    nombre: 'Cafetearte Cápsulas Nespresso Orgánico Biodegradables',
    url: 'https://www.cafetearte.es/comprar-capsulas-compatibles-nespresso/2621-capsulas-cafe-organico-biodegradables.html',
    tipo: 'capsula',
    sistema: 'Nespresso',
  },
  {
    id: 'cafetearte_nespresso_descafeinado',
    nombre: 'Cafetearte Cápsulas Nespresso Descafeinado Biodegradables',
    url: 'https://www.cafetearte.es/comprar-capsulas-compatibles-nespresso/2620-capsulas-cafe-descafeinado-biodegradables.html',
    tipo: 'capsula',
    sistema: 'Nespresso',
    descafeinado: true,
  },
  {
    id: 'cafetearte_nespresso_ristretto',
    nombre: 'Cafetearte Cápsulas Nespresso Ristretto Biodegradables',
    url: 'https://www.cafetearte.es/comprar-capsulas-compatibles-nespresso/2622-capsulas-cafe-ristretto-biodegradables.html',
    tipo: 'capsula',
    sistema: 'Nespresso',
  },

  // ═══ Page 2 – Natural exóticos (9, excl caps ristretto already above) ═══
  {
    id: 'cafetearte_galapagos',
    nombre: 'Cafetearte Café de Galápagos',
    url: 'https://www.cafetearte.es/natural/1745-6244-cafe-islas-galapagos.html',
    origen: 'Ecuador',
  },
  {
    id: 'cafetearte_puerto_rico_yauco',
    nombre: 'Cafetearte Puerto Rico Yauco',
    url: 'https://www.cafetearte.es/natural/398-3188-puerto-rico-yauco.html',
    origen: 'Puerto Rico',
  },
  {
    id: 'cafetearte_hawai_kona',
    nombre: 'Cafetearte Hawái Kona',
    url: 'https://www.cafetearte.es/natural/525-3264-hawai-kona.html',
    origen: 'Hawái',
  },
  {
    id: 'cafetearte_jamaica_blue_mountain',
    nombre: 'Cafetearte Jamaica Blue Mountain',
    url: 'https://www.cafetearte.es/natural/399-3184-jamaica-blue-mountain.html',
    origen: 'Jamaica',
  },
  {
    id: 'cafetearte_geisha_finca_esmeralda',
    nombre: 'Cafetearte Geisha Finca Esmeralda',
    url: 'https://www.cafetearte.es/natural/2489-7617-geisha-finca-esmeralda.html',
    origen: 'Panamá',
  },
  {
    id: 'cafetearte_kopi_luwak',
    nombre: 'Cafetearte Kopi Luwak Lata 125g',
    url: 'https://www.cafetearte.es/natural/911-kopi-luwak-lata.html',
    origen: 'Indonesia',
  },
  {
    id: 'cafetearte_guatemala_san_antonio',
    nombre: 'Cafetearte Guatemala San Antonio',
    url: 'https://www.cafetearte.es/natural/2683-7681-guatemala-san-antonio.html',
    origen: 'Guatemala',
  },
  {
    id: 'cafetearte_kenia_mugaya_ab',
    nombre: 'Cafetearte Kenia Mugaya AB',
    url: 'https://www.cafetearte.es/natural/2658-7669-kenia-mugaya-ab.html',
    origen: 'Kenia',
  },
  {
    id: 'cafetearte_etiopia_guji',
    nombre: 'Cafetearte Etiopía Guji',
    url: 'https://www.cafetearte.es/natural/2677-7677-etiopia-guji.html',
    origen: 'Etiopía',
  },
  {
    id: 'cafetearte_serenidad_imperial',
    nombre: 'Cafetearte Serenidad Imperial',
    url: 'https://www.cafetearte.es/natural/2612-7627-serenidad-imperial.html',
    blend: true,
  },
  {
    id: 'cafetearte_pacamara_double_diamond',
    nombre: 'Cafetearte Pacamara Double Diamond',
    url: 'https://www.cafetearte.es/natural/2609-7657-pacamara-double-diamond.html',
    origen: 'El Salvador',
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
    // PrestaShop og:image
    let m = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (m) return m[1];
    // product-cover
    m = html.match(/class=["']product-cover["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
    if (m) return m[1];
    // js-qv-product-cover
    m = html.match(/class=["']js-qv-product-cover["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
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
  console.log(`\n=== Importing ${ALL.length} Cafetearte products ===\n`);
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

    const tipoVal = p.tipo || 'grano';
    const data = {
      nombre: p.nombre,
      marca: 'Cafetearte',
      roaster: 'Cafetearte',
      tipo: tipoVal,
      tipoProducto: tipoVal === 'capsula' ? 'capsulas' : tipoVal,
      formato: p.formato || '250g',
      tamano: p.formato || '250g',
      fuente: 'cafetearte.es',
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
    if (p.sabor) data.sabor = p.sabor;
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
      console.log(` → ${imgUrl ? '📸' : '⚠️'}`);
    } catch (e) {
      console.log(` DB ERR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Created: ${created} | Skipped: ${skipped} | Photos: ${photos} | Errors: ${errors}`);
  process.exit(0);
})();
