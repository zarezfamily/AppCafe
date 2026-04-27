// MASSIVE REPROCESS: Re-download from original sources, process with white bg
// Also: fix Cafes Orus photos, delete Lavazza Qualità Oro
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const sharp = require('sharp');
const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

// ==================== HELPERS ====================
async function downloadAndProcess(imageUrl) {
  const resp = await fetch(imageUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
    timeout: 20000,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length < 2000) throw new Error(`Too small ${buf.length}b`);
  return sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();
}

async function uploadAndUpdate(docId, processed, originalUrl) {
  const path = `cafe-photos-nobg/${docId}.png`;
  const file = bucket.file(path);
  try {
    await file.delete();
  } catch {}
  await file.save(processed, {
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
    public: true,
    resumable: false,
  });
  const publicUrl = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${path}`;
  await db
    .collection('cafes')
    .doc(docId)
    .update({
      fotoUrl: publicUrl,
      foto: publicUrl,
      imageUrl: publicUrl,
      officialPhoto: publicUrl,
      bestPhoto: publicUrl,
      imagenUrl: publicUrl,
      'photos.selected': publicUrl,
      'photos.original': originalUrl || publicUrl,
      'photos.bgRemoved': publicUrl,
    });
  return publicUrl;
}

async function reprocessFromOriginal(docId, data) {
  // Priority: photos.original > officialPhoto > bestPhoto > imageUrl > fotoUrl > foto
  const origUrl = data.photos?.original || '';
  // If original is our own storage URL, download from storage directly
  const storageUrl = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/cafe-photos-nobg/${docId}.png`;

  // Try original first (non-storage), then storage
  const candidates = [];
  if (origUrl && !origUrl.includes('miappdecafe.firebasestorage.app')) {
    candidates.push(origUrl);
  }
  // Always try storage as fallback (re-process existing with white bg)
  candidates.push(storageUrl);

  for (const url of candidates) {
    try {
      const processed = await downloadAndProcess(url);
      await uploadAndUpdate(docId, processed, origUrl || url);
      return true;
    } catch {}
  }
  return false;
}

// ==================== MAIN ====================
async function main() {
  const stats = { ok: 0, fail: 0, deleted: 0 };

  // ==================== 1. DELETE LAVAZZA QUALITÀ ORO ====================
  console.log('=== DELETING LAVAZZA QUALITÀ ORO ===');
  const oroIds = [
    'AF2gqonWWfxf4Ez7PkIy',
    'lavazza_8000070012783',
    'lavazza_8000070019362',
    'lavazza_8000070020559',
    'lavazza_8000070053465',
    'lavazza_8000070074736',
    'lavazza_8000070084735',
    'lavazza_qualita_oro_grano_250g',
    'lavazza-cafe-en-grano-100-arabica-intensidad-5-10-qualita-oro',
  ];
  for (const id of oroIds) {
    try {
      const doc = await db.collection('cafes').doc(id).get();
      if (doc.exists) {
        await db.collection('cafes').doc(id).delete();
        // Also delete photo from storage
        try {
          await bucket.file(`cafe-photos-nobg/${id}.png`).delete();
        } catch {}
        stats.deleted++;
        console.log(`  🗑 ${id}`);
      }
    } catch (e) {
      console.log(`  ❌ ${id}: ${e.message}`);
    }
  }

  // ==================== 2. REPROCESS BRANDS WITH WHITE BG ====================
  const BRANDS_TO_REPROCESS = [
    "De'Longhi",
    'Dolce Gusto',
    'Hacendado',
    'illy',
    'INCAPTO',
    'Ineffable Coffee',
    'Kaffekapslen',
    'Kfetea',
    'Kimbo',
    "L'OR",
    'La Colombe',
    'Melitta',
    'Mogorttini',
    'Montecelio',
    'Mövenpick',
    'Nomad Coffee',
    'Novell',
    'Onyx Coffee Lab',
    "Peet's",
    'Right Side Coffee',
    'San Jorge Coffee Roasters',
    'Cafes Orus',
  ];

  for (const marca of BRANDS_TO_REPROCESS) {
    const snap = await db.collection('cafes').where('marca', '==', marca).get();
    console.log(`\n=== ${marca} (${snap.size}) ===`);
    let brandOk = 0,
      brandFail = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const success = await reprocessFromOriginal(doc.id, data);
      if (success) {
        brandOk++;
        stats.ok++;
      } else {
        brandFail++;
        stats.fail++;
        console.log(`  ❌ ${doc.id}`);
      }
    }
    console.log(`  ✅ ${brandOk}/${snap.size}`);
  }

  console.log(`\n========================================`);
  console.log(`TOTAL: ${stats.ok} reprocessed, ${stats.fail} failed, ${stats.deleted} deleted`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
