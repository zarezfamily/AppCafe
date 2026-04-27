const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

const NAMES = [
  'saimaza gran selec',
  'nespresso ristretto',
  'daddy long legs kenya',
  'daddy long legs house blend',
  'pellini espresso bio',
  'starbucks colombia medium',
  'la colombe lyon',
  'la colombe bowery',
];

(async () => {
  const snap = await db.collection('cafes').get();
  const results = [];

  snap.forEach((d) => {
    const data = d.data();
    const nombre = (data.nombre || data.name || '').toLowerCase();
    for (const pattern of NAMES) {
      if (nombre.includes(pattern)) {
        const photo =
          data.photos?.selected ||
          data.photos?.bgRemoved ||
          data.bestPhoto ||
          data.officialPhoto ||
          data.imageUrl ||
          data.imagenUrl ||
          data.foto;
        results.push({
          id: d.id,
          nombre: data.nombre || data.name,
          marca: data.marca || data.roaster,
          photo: photo || 'NO PHOTO',
          bestPhoto: data.bestPhoto || '',
          officialPhoto: data.officialPhoto || '',
          imageUrl: data.imageUrl || '',
          imagenUrl: data.imagenUrl || '',
          foto: data.foto || '',
          photosSelected: data.photos?.selected || '',
          photosBgRemoved: data.photos?.bgRemoved || '',
          photosOriginal: data.photos?.original || '',
        });
      }
    }
  });

  results.sort((a, b) => a.nombre.localeCompare(b.nombre));
  for (const r of results) {
    console.log(`\n=== ${r.nombre} (${r.marca}) [${r.id}] ===`);
    console.log(`  photos.selected:  ${r.photosSelected}`);
    console.log(`  photos.bgRemoved: ${r.photosBgRemoved}`);
    console.log(`  photos.original:  ${r.photosOriginal}`);
    console.log(`  bestPhoto:        ${r.bestPhoto}`);
    console.log(`  officialPhoto:    ${r.officialPhoto}`);
    console.log(`  imageUrl:         ${r.imageUrl}`);
    console.log(`  imagenUrl:        ${r.imagenUrl}`);
    console.log(`  foto:             ${r.foto}`);
  }
  process.exit(0);
})();
