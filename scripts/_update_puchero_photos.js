const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// Mapping: each Puchero "Lote" doc → unique 600x600 product photo from somospuchero.com
const photoMap = {
  // Lote 5 → Perú La Cima (Espresso)
  XyyWQNrHgXvf395N9Fob:
    'https://somospuchero.com/wp-content/uploads/2026/03/250g_espresso-5-600x600.png',
  // Lote 15 → Colombia Pueblo Nuevo (Espresso)
  '4EG39tT042Da1qvtoRDy':
    'https://somospuchero.com/wp-content/uploads/2026/03/250g_espresso-3-600x600.png',
  // Lote 25 → Kenia Gikirima (Filtro)
  XhjsSRUJe8aOcOohGpvZ:
    'https://somospuchero.com/wp-content/uploads/2026/03/250g_filtro-1-600x600.png',
  // Lote 35 → Ruanda Inzovu (Espresso)
  OETA7ZE268xVU19WFMS2:
    'https://somospuchero.com/wp-content/uploads/2026/03/250g_espresso-1-600x600.png',
  // Lote 45 → Etiopía Banko Gotiti (Espresso)
  '9W2Rg1lVzSk59N8FJkpj':
    'https://somospuchero.com/wp-content/uploads/2026/03/250g_espresso-600x600.png',
  // Lote 55 → Brasil Fazenda Promissão (Espresso)
  mL8afp7jXz8wlshmWhHw:
    'https://somospuchero.com/wp-content/uploads/2026/03/250g_espresso-4-600x600.png',
  // Lote 65 → Etiopía Korate (Filtro)
  sNx1CuX8HYU7yCDGDgr4:
    'https://somospuchero.com/wp-content/uploads/2026/03/250g_filtro-600x600.png',
  // Lote 75 → Colombia Chévere Decaf (Espresso)
  ZRX6E4kJQamacxKXpZ79:
    'https://somospuchero.com/wp-content/uploads/2026/02/250g_espresso-600x600.png',
  // Lote 85 → Ruanda Rutsiro (Espresso)
  YyAQmAUm0aMl0ViU9ymj:
    'https://somospuchero.com/wp-content/uploads/2026/02/250g_espresso-600x600.jpg',
  // Lote 95 → Etiopía Okoluu (Filtro)
  zKlrNC48FhkhTV0ySmGL:
    'https://somospuchero.com/wp-content/uploads/2026/02/250g_filtro-600x600.jpg',
};

(async () => {
  const batch = db.batch();
  let count = 0;

  for (const [docId, photoUrl] of Object.entries(photoMap)) {
    const ref = db.collection('cafes').doc(docId);
    const doc = await ref.get();
    if (!doc.exists) {
      console.log(`⚠️ Doc ${docId} not found, skipping`);
      continue;
    }
    const data = doc.data();
    console.log(`✅ ${docId} (${data.nombre || data.name}) → ${photoUrl.split('/').pop()}`);

    batch.update(ref, {
      'photos.selected': photoUrl,
      bestPhoto: photoUrl,
      officialPhoto: photoUrl,
      imageUrl: photoUrl,
      foto: photoUrl,
    });
    count++;
  }

  if (count > 0) {
    await batch.commit();
    console.log(`\n🎉 Updated ${count} Puchero docs with unique photos`);
  } else {
    console.log('No docs updated');
  }
  process.exit(0);
})();
