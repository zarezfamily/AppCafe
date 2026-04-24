#!/usr/bin/env node
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (admin.apps.length === 0) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  const snap = await db.collection('cafes').get();
  const sinPrecio = [];
  snap.forEach((doc) => {
    const d = doc.data();
    if (!d.precio && d.precio !== 0) {
      sinPrecio.push({
        id: doc.id,
        nombre: d.nombre,
        marca: d.marca,
        formato: d.formato,
        tienda: d.tienda,
        peso: d.peso,
      });
    }
  });
  console.log('Total cafes:', snap.size);
  console.log('Sin precio:', sinPrecio.length);
  console.log();
  sinPrecio.forEach((c, i) => {
    console.log(
      `${i + 1}. ${c.nombre} | ${c.marca || '?'} | ${c.formato || '?'} | ${c.peso || '?'} | ${c.tienda || '?'} | ${c.id}`
    );
  });
  process.exit(0);
}
main();
