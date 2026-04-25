// All brand changes, duplicate unifications, and pack deletion
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  const snap = await db.collection('cafes').get();
  const cafes = [];
  snap.forEach((d) => cafes.push({ id: d.id, ...d.data() }));

  const batch = db.batch();
  let changes = 0;

  // 1. El Corte Inglés Selection → Lavazza
  const eciIds = cafes.filter((c) => c.marca === 'El Corte Inglés Selection').map((c) => c.id);
  for (const id of eciIds) {
    batch.update(db.collection('cafes').doc(id), { marca: 'Lavazza' });
    changes++;
    console.log(`ECI→Lavazza: ${id}`);
  }

  // 2. Illy → illy (unify to lowercase)
  const illyUpper = cafes.filter((c) => c.marca === 'Illy');
  for (const c of illyUpper) {
    batch.update(db.collection('cafes').doc(c.id), { marca: 'illy' });
    changes++;
    console.log(`Illy→illy: ${c.id}`);
  }

  // 3. L'OR ESPRESSO → L'OR
  const lorEspresso = cafes.filter((c) => c.marca === "L'OR ESPRESSO");
  for (const c of lorEspresso) {
    batch.update(db.collection('cafes').doc(c.id), { marca: "L'OR" });
    changes++;
    console.log(`L'OR ESPRESSO→L'OR: ${c.id} (${c.nombre})`);
  }

  // 4. PRODUCTO ALCAMPO → AUCHAN
  const alcampo = cafes.filter((c) => c.marca === 'PRODUCTO ALCAMPO');
  for (const c of alcampo) {
    batch.update(db.collection('cafes').doc(c.id), { marca: 'AUCHAN' });
    changes++;
    console.log(`PRODUCTO ALCAMPO→AUCHAN: ${c.id}`);
  }

  // 5. Saula → Cafe Saula (existing brand)
  const saulaAlone = cafes.filter((c) => c.marca === 'Saula');
  for (const c of saulaAlone) {
    batch.update(db.collection('cafes').doc(c.id), { marca: 'Cafe Saula' });
    changes++;
    console.log(`Saula→Cafe Saula: ${c.id} (${c.nombre})`);
  }

  // 6. SUPRACAFÉ vs Supracafé - unify to Supracafé
  const supraUpper = cafes.filter((c) => c.marca === 'SUPRACAFÉ');
  for (const c of supraUpper) {
    batch.update(db.collection('cafes').doc(c.id), { marca: 'Supracafé' });
    changes++;
    console.log(`SUPRACAFÉ→Supracafé: ${c.id} (${c.nombre})`);
  }

  // 7. Additional brand normalization - check for more duplicates
  const brandMap = {};
  cafes.forEach((c) => {
    const m = c.marca || '';
    const key = m.toLowerCase().replace(/[^a-záéíóúñü]/g, '');
    if (!brandMap[key]) brandMap[key] = {};
    brandMap[key][m] = (brandMap[key][m] || 0) + 1;
  });

  console.log('\n=== POTENTIAL DUPLICATES ===');
  for (const [key, variants] of Object.entries(brandMap)) {
    const names = Object.keys(variants);
    if (names.length > 1) {
      console.log(`  Key "${key}": ${names.map((n) => `"${n}"(${variants[n]})`).join(', ')}`);
    }
  }

  // 8. Delete Kfetea pack (user says #746)
  // From our data: #746 is ean_8436583660751 = "Kfetea Descafeinado Café en grano Especial para bares bolsa 1kg"
  // But user says to delete "Extra Intenso marca Kfetea 4 cajas de 48 unidades por caja para Dolce Gusto"
  // Let me find that specific one
  const kfeteaPack = cafes.find(
    (c) =>
      c.marca === 'Kfetea' &&
      c.nombre &&
      c.nombre.includes('Extra Intenso') &&
      c.nombre.includes('4 cajas')
  );
  if (kfeteaPack) {
    console.log(`\nWill delete Kfetea pack: ${kfeteaPack.id} - ${kfeteaPack.nombre}`);
    batch.delete(db.collection('cafes').doc(kfeteaPack.id));
    changes++;
  } else {
    // Check what #746 actually is - maybe user description doesn't match exactly
    // Sort like catalog
    cafes.sort((a, b) => {
      const ma = (a.marca || '').toLowerCase();
      const mb = (b.marca || '').toLowerCase();
      if (ma !== mb) return ma.localeCompare(mb);
      return (a.nombre || '').localeCompare(b.nombre || '');
    });
    const entry746 = cafes[745]; // 0-indexed
    console.log(`\n#746 is: ${entry746?.id} - ${entry746?.nombre}`);
    // List all Kfetea entries to find the pack
    const kfeteas = cafes.filter((c) => c.marca === 'Kfetea');
    console.log('\nAll Kfetea entries:');
    kfeteas.forEach((c) => {
      const idx = cafes.indexOf(c) + 1;
      console.log(`  #${idx}: ${c.id} - ${c.nombre}`);
    });
  }

  if (changes > 0) {
    await batch.commit();
    console.log(`\n✅ ${changes} brand changes committed`);
  }

  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
