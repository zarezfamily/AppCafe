const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const https = require('https');
const http = require('http');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve({ status: 0, ok: false });
    const client = url.startsWith('https') ? https : http;
    const req = client.request(
      url,
      { method: 'HEAD', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } },
      (res) => {
        resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
      }
    );
    req.on('error', () => resolve({ status: 0, ok: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, ok: false });
    });
    req.end();
  });
}

(async () => {
  // Find all cafes from the new import
  const snap = await db.collection('cafes').where('fuente', '==', 'import_nuevas_marcas_es').get();
  console.log('Cafes from import_nuevas_marcas_es:', snap.size);

  let broken = 0,
    working = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const bestPhoto = d.bestPhoto || '';
    const officialPhoto = d.officialPhoto || '';
    const imageUrl = d.imageUrl || '';
    const foto = d.foto || '';
    const photosSel = d.photos?.selected || '';

    // Check the URL the app would actually use (getCafePhoto priority)
    const appUrl = photosSel || bestPhoto || officialPhoto || imageUrl || foto || '';
    const result = await checkUrl(appUrl);

    if (!result.ok) {
      broken++;
      console.log('BROKEN', result.status, (d.nombre || '?').substring(0, 35).padEnd(37));
      console.log('  bestPhoto:', bestPhoto.substring(0, 80));
      console.log('  officialPhoto:', officialPhoto.substring(0, 80));
      console.log('  photos.selected:', photosSel.substring(0, 80));
    } else {
      working++;
    }
  }

  console.log('\nTotal:', snap.size, '| Working:', working, '| Broken:', broken);

  // Also check a few non-firebase URLs to see if they're accessible
  console.log('\n--- Sample URL check from import ---');
  let i = 0;
  for (const doc of snap.docs) {
    if (i >= 10) break;
    const d = doc.data();
    const url = d.bestPhoto || d.officialPhoto || '';
    const isFirebase = url.includes('firebasestorage') || url.includes('storage.googleapis.com');
    const result = await checkUrl(url);
    console.log(
      result.ok ? 'OK' : 'FAIL',
      result.status,
      isFirebase ? 'FIREBASE' : 'EXTERNAL',
      (d.nombre || '?').substring(0, 30).padEnd(32),
      url.substring(0, 90)
    );
    i++;
  }

  process.exit(0);
})();
