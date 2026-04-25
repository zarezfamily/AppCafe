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

const IDS = [
  'lor_coconut_iced',
  'lor_coffee_iced_07',
  'lor_doble_barista_selection_13',
  'lor_doble_espresso_descafeinado_06',
  'lor_doble_lungo_profondo_08',
  'lor_doble_ristretto_11',
  'lor_dubai_chocolate_style',
  'lor_espresso_avellana',
  'lor_espresso_bio_organic_09',
  'lor_espresso_brasil_08',
  'lor_espresso_caramel',
  'lor_espresso_chocolate',
  'lor_espresso_colombia_08',
  'lor_espresso_onyx_12',
  'lor_espresso_supremo_10',
  'lor_lungo_mattinata_05',
  'lor_lungo_profondo_08',
  'lor_passione_espresso_10',
  'lor_passione_ristretto_12',
  'lor_ristretto_11',
];

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

(async () => {
  let ok = 0,
    fail = 0;
  for (const id of IDS) {
    const doc = await db.collection('cafes').doc(id).get();
    if (!doc.exists) {
      console.log(`  ❌ ${id} NOT FOUND`);
      fail++;
      continue;
    }
    const d = doc.data();
    const srcUrl = d.foto || d.officialPhoto || d.imageUrl || d.imagenUrl;
    if (!srcUrl) {
      console.log(`  ❌ ${id} no source URL`);
      fail++;
      continue;
    }
    try {
      const raw = await downloadImage(srcUrl);
      const processed = await sharp(raw)
        .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .png()
        .toBuffer();

      const filePath = `cafe-photos-nobg/${id}.png`;
      const file = bucket.file(filePath);
      // Delete first for CDN cache
      try {
        await file.delete();
      } catch (_) {}
      await file.save(processed, {
        resumable: false,
        metadata: { contentType: 'image/png', cacheControl: 'public, max-age=60' },
      });
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/cafe-photos-nobg/${id}.png`;
      await db.collection('cafes').doc(id).update({
        fotoUrl: publicUrl,
        foto: publicUrl,
        imageUrl: publicUrl,
        officialPhoto: publicUrl,
        bestPhoto: publicUrl,
        imagenUrl: publicUrl,
        'photos.selected': publicUrl,
        'photos.original': srcUrl,
        'photos.bgRemoved': publicUrl,
      });
      ok++;
      console.log(`  ✅ ${id}`);
    } catch (e) {
      console.log(`  ❌ ${id}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\nDone: ${ok} ok, ${fail} failed`);
  process.exit(0);
})();
