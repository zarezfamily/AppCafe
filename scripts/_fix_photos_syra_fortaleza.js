// Fix Syra Guariroba (blurry) and Fortaleza Colombia (has "NUEVO" overlay)
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

const FIXES = [
  {
    id: 'syra_guariroba',
    nombre: 'Syra Coffee Guariroba',
    url: 'https://syra.coffee/cdn/shop/files/250gMockupSOLNACIENTEonline.png?v=1747657009',
  },
  {
    id: 'fortaleza_https-www-cafefortaleza-com-tienda-online-11202-cafe-grano-colombia-500g-html',
    nombre: 'Café Fortaleza Grano Colombia 500g',
    url: 'https://www.cafefortaleza.com/5867-large_default/cafe-grano-colombia-500g.jpg',
  },
];

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadImage(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

(async () => {
  for (const fix of FIXES) {
    console.log(`\n→ ${fix.nombre} [${fix.id}]`);
    try {
      const buf = await downloadImage(fix.url);
      console.log(`  Downloaded: ${buf.length} bytes`);
      if (buf.length < 1000) {
        console.log('  SKIP: too small');
        continue;
      }

      const processed = await sharp(buf)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
      console.log(`  Processed: ${processed.length} bytes`);

      const storagePath = `cafe-photos-nobg/${fix.id}.png`;
      await bucket.file(storagePath).save(processed, {
        metadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000' },
        public: true,
      });

      const photoUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
      await db.collection('cafes').doc(fix.id).update({
        'photos.selected': photoUrl,
        'photos.bgRemoved': false,
        'photos.original': fix.url,
        bestPhoto: photoUrl,
        officialPhoto: photoUrl,
        imagenUrl: photoUrl,
        foto: photoUrl,
        updatedAt: new Date().toISOString(),
      });
      console.log(`  ✓ Updated: ${photoUrl}`);
    } catch (err) {
      console.log(`  ✗ ${err.message}`);
    }
  }
  console.log('\nDone.');
  process.exit(0);
})();
