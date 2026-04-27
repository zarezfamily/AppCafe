const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const sharp = require('sharp');

// === STEP 1: DELETE entries ===
const TO_DELETE = [
  'jurado_dolcegusto_extra_intenso', // Café Jurado Cápsulas Dolce Gusto Extra Intenso
  '7OCDtxmVAcnaQkA0GohV', // Duplicate: Café Natural Arábico en Grano Novell
  'peets_simply-oatmeal', // Peet's Simply Oatmeal (not coffee)
];

// === STEP 2: ALL remaining brands to reprocess ===
const BRANDS = [
  'Lavazza',
  'Marcilla',
  'Cafes Granell',
  "Miscela d'Oro",
  'Catunambu',
  'Cafés La Mexicana',
  'Gringo Nordic',
  'Lucaffé',
  'Segafredo',
  'Bonka',
  'Carraro',
  'Starbucks',
  'Mokaflor',
  'Pellini',
  'Syra Coffee',
  'Bergstrands',
  'Bialetti',
  'beanies',
  'Cafés Oquendo',
  'Passalacqua',
  'Crema',
  'Saimaza',
  'Johan & Nyström',
  'Pera',
  'Bio Organic',
  'Lykke',
  'Mokasirs',
  'Tupinamba',
  'Barissimo',
  'Dallmayr',
  'Helsingin Kahvipaahtimo',
  'littles',
  'Paulig',
  'Arcaffè',
  'Espoon Kahvipaahtimo',
  'Zoégas',
  'Jacobs',
  'Cafès Serra',
  'by Amazon',
  'Club del Gourmet',
  'davidoff',
  'Delta Cafés',
  'Black Coffee Roasters',
  'Good Life Coffee',
  'Stumptown Coffee',
  'Aromix',
  'Burg',
  'Domus Barista',
  'Café Jurado',
  'Mokambo',
  'Mr. Viet',
  'Garibaldi',
  'Cafés Guilis',
  'Hola Coffee',
  'Cafes La Estrella',
  'Tassimo',
  'mount-hagen',
  'Röst',
  'Toscaf',
  'Barco',
  'Cafés El Magnífico',
  'clipper',
  '69 CrazyBeans',
  'Der-Franz',
  'Costa',
  'Gimoka',
  'Gevalia',
  'Supracafé',
  'Espresso House',
  'Cafés La Brasileña',
  'Löfbergs',
  'Nescafé',
  'Climent',
  'Cafès Pont',
  'Puro',
  'Saquella',
  'Caffè Mauro',
  'Caffè Corsini',
  'Carrao',
  'Idee Kaffee',
  'Intenso',
  'Julius Meinl',
  'Nespresso',
  'Cafés Valiente',
  'Minges',
  'Mocay',
  "Note d'Espresso",
  'Rwanda Farmers',
  'Tchibo',
  'Caffè Vergnano',
];

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function getFromStorage(id) {
  const file = bucket.file(`cafe-photos-nobg/${id}.png`);
  const [exists] = await file.exists();
  if (exists) {
    const [buf] = await file.download();
    return buf;
  }
  return null;
}

(async () => {
  // STEP 1: Deletions
  console.log('=== DELETING ENTRIES ===');
  for (const id of TO_DELETE) {
    try {
      await db.collection('cafes').doc(id).delete();
      try {
        await bucket.file(`cafe-photos-nobg/${id}.png`).delete();
      } catch (_) {}
      console.log(`  🗑 ${id}`);
    } catch (e) {
      console.log(`  ❌ ${id}: ${e.message}`);
    }
  }

  // STEP 2: Reprocess all remaining brands
  let totalOk = 0,
    totalFail = 0,
    totalSkip = 0;

  for (const marca of BRANDS) {
    const snap = await db.collection('cafes').where('marca', '==', marca).get();
    if (snap.empty) continue;
    console.log(`\n=== ${marca} (${snap.size}) ===`);
    let ok = 0,
      fail = 0;

    for (const doc of snap.docs) {
      const id = doc.id;
      const d = doc.data();
      try {
        let raw = null;
        let origUrl = d.photos?.original;

        // Try photos.original
        if (origUrl) {
          try {
            raw = await downloadImage(origUrl);
          } catch (_) {}
        }
        // Try foto/officialPhoto/imageUrl (skip our own storage URLs)
        if (!raw) {
          const srcUrl = d.foto || d.officialPhoto || d.imageUrl || d.imagenUrl;
          if (srcUrl && !srcUrl.includes('storage.googleapis.com/miappdecafe')) {
            try {
              raw = await downloadImage(srcUrl);
              origUrl = origUrl || srcUrl;
            } catch (_) {}
          }
        }
        // Fallback: existing storage
        if (!raw) {
          raw = await getFromStorage(id);
        }
        if (!raw) {
          console.log(`  ❌ ${id}: no source`);
          fail++;
          continue;
        }

        const processed = await sharp(raw)
          .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .png()
          .toBuffer();

        const filePath = `cafe-photos-nobg/${id}.png`;
        const file = bucket.file(filePath);
        try {
          await file.delete();
        } catch (_) {}
        await file.save(processed, {
          resumable: false,
          metadata: { contentType: 'image/png', cacheControl: 'public, max-age=60' },
        });
        await file.makePublic();

        const publicUrl = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/cafe-photos-nobg/${id}.png`;
        const update = {
          fotoUrl: publicUrl,
          foto: publicUrl,
          imageUrl: publicUrl,
          officialPhoto: publicUrl,
          bestPhoto: publicUrl,
          imagenUrl: publicUrl,
          'photos.selected': publicUrl,
          'photos.bgRemoved': publicUrl,
        };
        if (origUrl) update['photos.original'] = origUrl;
        await db.collection('cafes').doc(id).update(update);
        ok++;
      } catch (e) {
        console.log(`  ❌ ${id}: ${e.message}`);
        fail++;
      }
    }
    console.log(`  ✅ ${ok}/${snap.size}`);
    totalOk += ok;
    totalFail += fail;
  }

  console.log(`\n========================================`);
  console.log(`DELETED: ${TO_DELETE.length}`);
  console.log(`REPROCESSED: ${totalOk} ok, ${totalFail} failed`);
  process.exit(0);
})();
