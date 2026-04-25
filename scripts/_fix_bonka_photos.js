const fetch = require('node-fetch');
const sharp = require('sharp');
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const bucket = admin.storage().bucket();
const db = admin.firestore();

// ASIN -> docId mapping from Amazon search results
const ASIN_MAP = {
  // Grano
  B08GGQGQXR: 'bonka_grano-natural', // Bonka Café Tostado Grano Natural 500g
  B01DUWNQP0: 'bonka_grano-natural', // Bonka Café Grano Natural 500g (alt listing)
  B07W8NJMMC: 'bonka_grano-arabica', // Bonka Grano Puro Arábica 500g
  B098KD5486: 'bonka_grano-descafeinado', // Bonka Grano Descafeinado 500g
  B09ZVPP3DN: 'bonka_grano-colombia', // Bonka Grano Colombia 500g
  B09L6TR2YY: 'bonka_grano-mezcla-intensa', // Bonka Grano Mezcla 500g
  B0FC6HHC4Q: 'bonka_grano-brasil', // BONKA Cafe Grano Natural Arábica Brasil 800g
  B00XA1QUGE: 'bonka_natural_hosteleria_grano_1kg', // Bonka hostelería mezcla grano 1kg
  // Molido
  B00XA7JLDM: 'bonka_molido-natural-250gr', // Bonka Molido Natural 250g
  B07PVL5CNT: 'bonka_molido-natural-500gr', // Bonka Molido Natural 500g
  B079ZYK8V8: 'bonka_molido-mezcla-250gr', // Bonka Molido Mezcla 250g
  B09BNCL2N3: 'bonka_molido-mezcla-500gr', // Bonka Molido Mezcla 500g
  B003XUEGQI: 'bonka_molido-extrafuerte-250gr', // Bonka Molido Extrafuerte 250g
  B00XACPGPO: 'bonka_molido-descafeinado-250gr', // Bonka Molido Descafeinado 250g
  B003XU91A4: 'bonka_premium-colombia', // Bonka Molido Colombia 250g
  B07HHCSKF2: 'bonka_premium-ecologico', // Bonka Molido Ecológico 250g
  B098PCM7GW: 'bonka_premium-natural', // Bonka Molido Extrafuerte (use for premium-natural)
};

// Remove duplicates (keep first ASIN per docId)
const docToAsin = {};
for (const [asin, docId] of Object.entries(ASIN_MAP)) {
  if (!docToAsin[docId]) docToAsin[docId] = asin;
}

async function getHiResImage(asin) {
  const url = `https://www.amazon.es/dp/${asin}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'es-ES,es;q=0.9',
    },
    redirect: 'follow',
    timeout: 15000,
  });
  if (!res.ok) return null;
  const html = await res.text();

  // Extract hiRes images
  const hiRes = [
    ...html.matchAll(/"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g),
  ];
  if (hiRes.length > 0) return hiRes[0][1];

  // Fallback: data-old-hires
  const oldHires = html.match(
    /data-old-hires="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/
  );
  if (oldHires) return oldHires[1];

  // Fallback: landingImage src
  const landing = html.match(
    /id="landingImage"[^>]*src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/
  );
  if (landing) return landing[1];

  return null;
}

async function processAndUpload(imgUrl, docId) {
  const res = await fetch(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
  if (!res.ok) throw new Error('Download failed: ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());

  const inputMeta = await sharp(buf).metadata();
  console.log(
    `    Source: ${inputMeta.width}x${inputMeta.height} ${(buf.length / 1024).toFixed(0)}KB`
  );

  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  const storagePath = `cafe-photos-nobg/${docId}.png`;
  const file = bucket.file(storagePath);
  try {
    await file.delete();
  } catch (e) {}

  await file.save(processed, {
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
    public: true,
    resumable: false,
  });

  const publicUrl = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${storagePath}`;

  await db.collection('cafes').doc(docId).update({
    fotoUrl: publicUrl,
    foto: publicUrl,
    imageUrl: publicUrl,
    officialPhoto: publicUrl,
    bestPhoto: publicUrl,
    imagenUrl: publicUrl,
    'photos.selected': publicUrl,
    'photos.original': publicUrl,
    'photos.bgRemoved': true,
  });

  return { size: processed.length, dims: '800x800' };
}

(async () => {
  console.log(`Processing ${Object.keys(docToAsin).length} Bonka products...\n`);

  let ok = 0,
    fail = 0;
  for (const [docId, asin] of Object.entries(docToAsin)) {
    console.log(`[${docId}] ASIN: ${asin}`);
    try {
      const imgUrl = await getHiResImage(asin);
      if (!imgUrl) {
        console.log('    No image found, skipping');
        fail++;
        continue;
      }
      console.log(`    Image: ...${imgUrl.substring(imgUrl.lastIndexOf('/') + 1)}`);

      const result = await processAndUpload(imgUrl, docId);
      console.log(`    OK: ${(result.size / 1024).toFixed(0)}KB ${result.dims}`);
      ok++;
    } catch (e) {
      console.log(`    ERROR: ${e.message}`);
      fail++;
    }

    // Delay between requests
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\nDone: ${ok} updated, ${fail} failed`);

  // Handle remaining ones without ASIN mappings
  const mapped = new Set(Object.keys(docToAsin));
  const snap = await db.collection('cafes').where('marca', '==', 'Bonka').get();
  const unmapped = [];
  snap.forEach((d) => {
    if (!mapped.has(d.id)) unmapped.push(d.id);
  });
  if (unmapped.length) {
    console.log(`\nUnmapped Bonka docs (no Amazon ASIN): ${unmapped.join(', ')}`);
  }

  process.exit(0);
})();
