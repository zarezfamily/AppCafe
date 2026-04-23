require('dotenv').config();
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const brands = [
  'Cafe Saula',
  'illy',
  'San Jorge',
  'Cafes Orus',
  'Starbucks',
  'Marcilla',
  'La Mexicana',
  'La Estrella',
  'Fortaleza',
  'Nomad',
];

(async () => {
  const snap = await db.collection('cafes').get();
  for (const brand of brands) {
    const matching = snap.docs.filter((d) => {
      const m = (d.data().marca || '').toLowerCase();
      return m.includes(brand.toLowerCase());
    });
    const withPhoto = matching.filter((d) => {
      const f = d.data().foto;
      return f && typeof f === 'string' && f.startsWith('http');
    });
    const withoutPhoto = matching.filter((d) => {
      const f = d.data().foto;
      return !f || typeof f !== 'string' || !f.startsWith('http');
    });
    console.log(
      `${brand}: ${matching.length} total, ${withPhoto.length} con foto, ${withoutPhoto.length} sin foto`
    );
    if (withoutPhoto.length > 0) {
      withoutPhoto.forEach((d) => console.log(`  SIN FOTO: ${d.data().nombre || d.id}`));
    }
    if (withPhoto.length > 0) {
      const sample = withPhoto[0].data();
      console.log(`  ejemplo: ${(sample.foto || '').substring(0, 100)}`);
    }
  }
  process.exit(0);
})();
