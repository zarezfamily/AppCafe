const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const https = require('https');
const sharp = require('sharp');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'es-ES,es;q=0.9',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
            return fetch(res.headers.location).then(resolve).catch(reject);
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () =>
            resolve({ status: res.statusCode, body: Buffer.concat(chunks), headers: res.headers })
          );
        }
      )
      .on('error', reject);
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getAmazonImage(asin) {
  const url = 'https://www.amazon.es/dp/' + asin;
  try {
    const res = await fetch(url);
    const html = res.body.toString();
    const m = html.match(/"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/);
    if (m) return m[1];
    const m2 = html.match(/"large"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/);
    if (m2) return m2[1];
  } catch (e) {}
  return null;
}

async function searchAmazon(query) {
  const url = 'https://www.amazon.es/s?k=' + encodeURIComponent(query);
  try {
    const res = await fetch(url);
    const html = res.body.toString();
    const m = html.match(/data-asin="(B[A-Z0-9]{9})"/);
    if (m) return m[1];
    const m2 = html.match(/\/dp\/(B[A-Z0-9]{9})/);
    if (m2) return m2[1];
  } catch (e) {}
  return null;
}

async function processAndUpload(imageUrl, docId) {
  try {
    const res = await fetch(imageUrl);
    if (res.status !== 200 || res.body.length < 5000) return false;
    const meta = await sharp(res.body).metadata();
    if (meta.width < 200 || meta.height < 200) return false;

    const maxDim = Math.max(meta.width, meta.height);
    const pad = Math.round(maxDim * 0.08);
    const processed = await sharp(res.body)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: { r: 255, g: 255, b: 255 },
      })
      .resize(800, 800, { fit: 'inside', withoutEnlargement: false })
      .png()
      .toBuffer();

    const file = bucket.file('cafe-photos-nobg/' + docId + '.png');
    await file.save(processed, { metadata: { contentType: 'image/png' } });
    await file.makePublic();

    const publicUrl =
      'https://storage.googleapis.com/miappdecafe.firebasestorage.app/cafe-photos-nobg/' +
      docId +
      '.png';
    await db.collection('cafes').doc(docId).update({
      imageUrl: publicUrl,
      imagenUrl: publicUrl,
      foto: publicUrl,
      officialPhoto: publicUrl,
      bestPhoto: publicUrl,
      'photos.selected': publicUrl,
      'photos.bgRemoved': true,
    });

    console.log('  OK:', processed.length, 'bytes');
    return true;
  } catch (e) {
    console.log('  Error:', e.message);
    return false;
  }
}

async function tryAsin(asin, docId) {
  const imgUrl = await getAmazonImage(asin);
  if (imgUrl) return await processAndUpload(imgUrl, docId);
  return false;
}

// All cafes needing photo fixes with search strategies
const cafes = [
  // La Estrella (6) - 0B files
  {
    id: 'laestrella_https-www-cafeslaestrella-com-productos-cafe-premium-grano-tueste-natural-html',
    search: 'La Estrella cafe grano premium natural',
  },
  {
    id: 'laestrella_https-www-cafeslaestrella-com-productos-grano-natural-html',
    search: 'La Estrella cafe grano natural',
  },
  {
    id: 'laestrella_https-www-cafeslaestrella-com-productos-grano-torrefacto-html',
    search: 'La Estrella cafe grano torrefacto',
  },
  {
    id: 'laestrella_https-www-cafeslaestrella-com-productos-molido-descafeinado-mezcla-html',
    search: 'La Estrella cafe molido descafeinado mezcla',
  },
  {
    id: 'laestrella_https-www-cafeslaestrella-com-productos-molido-mezcla-intensa-html',
    search: 'La Estrella cafe molido mezcla intensa',
  },
  {
    id: 'laestrella_https-www-cafeslaestrella-com-productos-molido-natural-html',
    search: 'La Estrella cafe molido natural',
  },

  // Cafes Orus (7) - 0B files
  {
    id: 'orus_https-cafesorus-es-tienda-producto-cafe-grano-brasil',
    search: 'Cafes Orus cafe grano Brasil',
  },
  {
    id: 'orus_https-cafesorus-es-tienda-producto-cafe-grano-colombianarino',
    search: 'Cafes Orus cafe grano Colombia Nariño',
  },
  {
    id: 'orus_https-cafesorus-es-tienda-producto-capsulas-puro-arabica',
    search: 'Cafes Orus capsulas Nespresso arabica',
  },
  {
    id: 'orus_https-cafesorus-es-tienda-producto-capsulas-tres-origenes',
    search: 'Cafes Orus capsulas Nespresso Colombia',
  },
  {
    id: 'orus_https-cafesorus-es-tienda-producto-capsulas-tueste-natural',
    search: 'Cafes Orus capsulas Nespresso natural',
  },
  {
    id: 'orus_https-cafesorus-es-tienda-producto-molto-piacere-cafe-con-leche',
    search: 'Cafes Orus Dolce Gusto cafe con leche',
  },
  {
    id: 'orus_https-cafesorus-es-tienda-producto-molto-piacere-descafeinado',
    search: 'Cafes Orus Dolce Gusto descafeinado',
  },

  // Der-Franz (2) - 1187B placeholder
  { id: 'der_franz_colombia_grano_1kg', search: 'Der Franz Colombia cafe grano 1kg' },
  { id: 'der_franz_espresso_grano_1kg', search: 'Der Franz Espresso cafe grano 1kg' },

  // Note d'Espresso (1) - 1187B placeholder
  { id: 'note_espresso_clasico_grano_1kg', search: 'Note d Espresso clasico cafe grano 1kg' },

  // #394 Cafe Colombia (Cafés La Mexicana)
  { id: 'lamexicana_21', search: 'Cafes La Mexicana Colombia Nariño El Tambo cafe' },

  // #543 Delta Cafes Lote Superior
  { id: 'delta_lote_superior_grano_1kg', search: 'Delta Cafes Lote Superior cafe grano 1kg' },

  // #191 Cafe Jurado - wrong photo (10KB)
  {
    id: 'jurado_dolcegusto_extra_intenso',
    search: 'Cafe Jurado capsulas Dolce Gusto Extra Intenso',
  },

  // #1043 Nespresso Ristretto - change photo
  { id: 'k32C1FfcqVaauDvzAqQU', search: 'Nespresso Ristretto capsulas cafe' },

  // Kfetea (4) - blurry (23-25KB)
  { id: 'ean_8436583660768', search: 'Kfetea Ristretto capsulas Nespresso cafe' },
  { id: 'ean_8436583660775', search: 'Kfetea Intenso capsulas Nespresso cafe' },
  { id: 'ean_8436583660782', search: 'Kfetea Colombia capsulas Nespresso cafe' },
  { id: 'ean_8436583660799', search: 'Kfetea Descafeinado capsulas Nespresso cafe' },

  // Marcilla wrong photos (14)
  {
    id: 'marcilla_www-marcilla-com-productos-capsulas-descafeinado',
    search: 'Marcilla capsulas descafeinado Nespresso',
  },
  {
    id: 'marcilla_www-marcilla-com-productos-capsulas-extra-intenso',
    search: 'Marcilla capsulas extra intenso Nespresso',
  },
  {
    id: 'marcilla_www-marcilla-com-productos-capsulas-intenso',
    search: 'Marcilla capsulas intenso Nespresso',
  },
  {
    id: 'marcilla_www-marcilla-com-productos-capsulas-puro-arabica-colombia',
    search: 'Marcilla capsulas puro arabica Colombia',
  },
  {
    id: 'marcilla_www-marcilla-com-productos-capsulas-puro-arabica-colombia-20-unidads',
    search: 'Marcilla capsulas puro arabica Colombia 20',
  },
  {
    id: 'marcilla_www-marcilla-com-productos-capsulas-puro-arabica-espresso',
    search: 'Marcilla capsulas puro arabica espresso',
  },
  {
    id: 'marcilla_www-marcilla-com-productos-creme-express-natural-molido',
    search: 'Marcilla Creme Express natural molido',
  },
  {
    id: 'marcilla_www-marcilla-com-productos-gran-aroma-extra',
    search: 'Marcilla Gran Aroma Extra Fuerte molido',
  },
  {
    id: 'marcilla_www-marcilla-com-productos-gran-aroma-mezcla-grano',
    search: 'Marcilla Gran Aroma mezcla cafe grano',
  },
  {
    id: 'marcilla_www-marcilla-com-productos-gran-aroma-natural-molido',
    search: 'Marcilla Gran Aroma natural molido',
  },
  {
    id: 'marcilla_www-marcilla-com-productos-gran-aroma-natural-grano',
    search: 'Marcilla Gran Aroma natural cafe grano',
  },
  {
    id: 'marcilla_www-marcilla-com-productos-marcilla-colombia-natural-molido',
    search: 'Marcilla Colombia natural molido',
  },
  { id: 'QKUAnsYTsKnyaTFmmo16', search: 'Marcilla Gran Aroma cafe molido' },
  {
    id: 'marcilla_www-marcilla-com-productos-puro-arabica-sudamerica',
    search: 'Marcilla puro arabica Sudamerica',
  },

  // ECI Selection pixelated (2)
  {
    id: 'el-corte-ingles-selection-cafe-en-grano-tueste-natural-100-arabica-brasil',
    search: 'El Corte Ingles Selection cafe grano arabica Brasil',
  },
  {
    id: 'el-corte-ingles-selection-cafe-en-grano-tueste-natural-100-arabica-colombia',
    search: 'El Corte Ingles Selection cafe grano arabica Colombia',
  },
];

(async () => {
  let ok = 0,
    fail = 0;
  for (const cafe of cafes) {
    console.log(cafe.id.substring(0, 60) + ':');

    // Strategy 1: Amazon search
    const asin = await searchAmazon(cafe.search);
    if (asin) {
      console.log('  ASIN:', asin);
      const success = await tryAsin(asin, cafe.id);
      if (success) {
        ok++;
        await delay(1500);
        continue;
      }
    } else {
      console.log('  No ASIN from search');
    }

    // Strategy 2: Try simpler search
    const words = cafe.search.split(' ').slice(0, 3).join(' ');
    const asin2 = await searchAmazon(words + ' cafe');
    if (asin2 && asin2 !== asin) {
      console.log('  Alt ASIN:', asin2);
      const success = await tryAsin(asin2, cafe.id);
      if (success) {
        ok++;
        await delay(1500);
        continue;
      }
    }

    console.log('  FAILED');
    fail++;
    await delay(1000);
  }
  console.log('\n=== DONE ===');
  console.log('OK:', ok, 'Failed:', fail);
  process.exit(0);
})();
