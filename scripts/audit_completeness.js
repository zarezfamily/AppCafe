const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

// Fields we consider essential for a "complete" cafe
const REQUIRED = ['nombre', 'marca', 'tipo', 'pais'];
const PHOTO_FIELDS = ['bestPhoto', 'officialPhoto', 'imageUrl', 'foto'];
const NICE_TO_HAVE = ['precio', 'peso', 'descripcion', 'origen', 'variedad', 'tueste', 'ean'];

function getCafePhoto(data) {
  const sel = data.photos?.selected;
  if (sel && typeof sel === 'string' && sel.startsWith('http')) return sel;
  for (const f of PHOTO_FIELDS) {
    if (data[f] && typeof data[f] === 'string' && data[f].startsWith('http')) return data[f];
  }
  return null;
}

(async () => {
  const snap = await db.collection('cafes').get();
  let total = 0;
  let complete = 0;
  let hasPhoto = 0;
  let noPhoto = 0;
  const missingFields = {};
  const incompleteList = [];
  const noPhotoList = [];
  const brandCounts = {};

  snap.forEach((d) => {
    total++;
    const data = d.data();
    const photo = getCafePhoto(data);
    if (photo) hasPhoto++;
    else {
      noPhoto++;
      noPhotoList.push({ id: d.id, nombre: data.nombre || '??', marca: data.marca || '??' });
    }

    // Check required fields
    const missing = [];
    for (const f of REQUIRED) {
      if (!data[f] || (typeof data[f] === 'string' && data[f].trim() === '')) {
        missing.push(f);
        missingFields[f] = (missingFields[f] || 0) + 1;
      }
    }
    if (!photo) missing.push('foto');

    // Nice to have
    const missingNice = [];
    for (const f of NICE_TO_HAVE) {
      if (!data[f] || (typeof data[f] === 'string' && data[f].trim() === '')) {
        missingNice.push(f);
        missingFields[f] = (missingFields[f] || 0) + 1;
      }
    }

    if (missing.length === 0 && missingNice.length <= 2) {
      complete++;
    } else {
      incompleteList.push({
        id: d.id,
        nombre: data.nombre || '??',
        marca: data.marca || '??',
        missingRequired: missing,
        missingNice: missingNice,
      });
    }

    // Brand counts
    const brand = data.marca || data.roaster || 'UNKNOWN';
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
  });

  console.log('=== AUDIT RESULTS ===');
  console.log(`Total: ${total}`);
  console.log(`With photo: ${hasPhoto} | Without: ${noPhoto}`);
  console.log(`Complete (req + >=5/7 nice): ${complete}`);
  console.log(`Incomplete: ${incompleteList.length}`);
  console.log(`\n--- Missing field counts ---`);
  const sorted = Object.entries(missingFields).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([f, c]) => console.log(`  ${f}: ${c} missing`));

  console.log(`\n--- Top brands ---`);
  Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([b, c]) => console.log(`  ${b}: ${c}`));

  console.log(`\n--- Cafes WITHOUT photo (${noPhoto}) ---`);
  noPhotoList.slice(0, 30).forEach((c) => console.log(`  ${c.id} | ${c.nombre} | ${c.marca}`));
  if (noPhotoList.length > 30) console.log(`  ... and ${noPhotoList.length - 30} more`);

  console.log(`\n--- Sample incomplete cafes ---`);
  incompleteList.slice(0, 20).forEach((c) => {
    console.log(
      `  ${c.id} | ${c.nombre} | missing: ${[...c.missingRequired, ...c.missingNice.map((f) => f + '?')].join(', ')}`
    );
  });

  // Need 1000 - total = how many new to add
  console.log(`\n=== TO REACH 1000 ===`);
  console.log(`Need to add: ${Math.max(0, 1000 - total)} new cafes`);
  console.log(`Need to fix: ${incompleteList.length} incomplete cafes`);

  process.exit(0);
})();
