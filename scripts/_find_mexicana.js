const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
async function m() {
  for (const b of [
    'Cafes La Mexicana',
    'Cafés La Mexicana',
    'La Mexicana',
    'Cafe La Mexicana',
    'Cafes la Mexicana',
  ]) {
    const s = await db.collection('cafes').where('marca', '==', b).get();
    if (s.size > 0) {
      console.log(b + ': ' + s.size);
      s.docs.forEach((d) => {
        const data = d.data();
        console.log(
          '  ' + d.id + ' | ' + data.nombre + ' | foto:' + (data.fotoUrl || '').substring(0, 60)
        );
      });
    }
  }
  // Also find the Colombia Nariño El Tambo specifically
  const all = await db.collection('cafes').get();
  all.docs.forEach((d) => {
    const n = (d.data().nombre || '').toLowerCase();
    if (n.includes('nariño') && n.includes('tambo')) {
      console.log(
        '\nNARINO TAMBO: ' + d.id + ' | ' + d.data().nombre + ' | marca:' + d.data().marca
      );
      console.log('  foto: ' + (d.data().fotoUrl || 'NONE'));
    }
  });
  process.exit(0);
}
m();
