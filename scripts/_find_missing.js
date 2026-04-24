const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const snap = await db.collection('cafes').get();
  const legacy = [];
  const noPrice = [];
  const noNotas = [];
  snap.forEach((d) => {
    const data = d.data();
    if (data.legacy) legacy.push({ id: d.id, nombre: data.nombre });
    if (!data.precio) noPrice.push({ id: d.id, nombre: data.nombre, marca: data.marca });
    if (!data.notas && !data.notes)
      noNotas.push({ id: d.id, nombre: data.nombre, marca: data.marca });
  });

  console.log(`Legacy cafes (hidden from admin): ${legacy.length}`);
  legacy.forEach((c) => console.log(`  ${c.id} - ${c.nombre}`));

  console.log(`\nWithout precio: ${noPrice.length}`);
  noPrice.forEach((c) => console.log(`  ${c.id} | ${c.marca} | ${c.nombre}`));

  console.log(`\nWithout notas: ${noNotas.length}`);
  noNotas.forEach((c) => console.log(`  ${c.id} | ${c.marca} | ${c.nombre}`));

  process.exit(0);
})();
