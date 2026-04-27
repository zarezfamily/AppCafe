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

const BRANDS = [
  'Cafe de Finca',
  'Café Dromedario',
  'Cafe Fortaleza',
  'Cafe Platino',
  'Café Royal',
  'Cafe Saula',
  'Cafés Baqué',
  'Cafés Camuy',
  'Cafes Candelas',
  'Cafés El Criollo',
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
  let totalOk = 0,
    totalFail = 0;

  for (const marca of BRANDS) {
    const snap = await db.collection('cafes').where('marca', '==', marca).get();
    console.log(`\n=== ${marca} (${snap.size}) ===`);
    let ok = 0,
      fail = 0;

    for (const doc of snap.docs) {
      const id = doc.id;
      const d = doc.data();
      try {
        let raw = null;
        // Try photos.original first
        const origUrl = d.photos?.original;
        if (origUrl) {
          try {
            raw = await downloadImage(origUrl);
          } catch (_) {}
        }
        // Try foto/officialPhoto/imageUrl
        if (!raw) {
          const srcUrl = d.foto || d.officialPhoto || d.imageUrl || d.imagenUrl;
          if (srcUrl && !srcUrl.includes('storage.googleapis.com/miappdecafe')) {
            try {
              raw = await downloadImage(srcUrl);
            } catch (_) {}
          }
        }
        // Fallback: existing storage file
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
  console.log(`TOTAL: ${totalOk} reprocessed, ${totalFail} failed`);
  process.exit(0);
})();
