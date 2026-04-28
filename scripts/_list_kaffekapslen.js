const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const snap = await db.collection('cafes').where('marca', '==', 'Kaffekapslen').get();
  if (snap.empty) {
    // Try lowercase
    const snap2 = await db.collection('cafes').get();
    const results = [];
    snap2.forEach((d) => {
      const m = (d.data().marca || '').toLowerCase();
      if (m.includes('kaffek')) results.push(d);
    });
    console.log('Found via scan:', results.length);
    results.forEach((d) => {
      const c = d.data();
      console.log(d.id + ' | ' + c.nombre + ' | ' + (c.formato || '') + ' | ' + (c.cantidad || ''));
    });
  } else {
    console.log('Found:', snap.size);
    snap.forEach((d) => {
      const c = d.data();
      console.log(d.id + ' | ' + c.nombre + ' | ' + (c.formato || '') + ' | ' + (c.cantidad || ''));
    });
  }
  process.exit(0);
})();
