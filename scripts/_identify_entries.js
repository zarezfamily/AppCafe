// Identify all catalog entries referenced by the user
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  const snap = await db.collection('cafes').get();
  const cafes = [];
  snap.forEach((d) => cafes.push({ id: d.id, ...d.data() }));

  // Sort by brand then name (same as catalog generator)
  cafes.sort((a, b) => {
    const ma = (a.marca || '').toLowerCase();
    const mb = (b.marca || '').toLowerCase();
    if (ma !== mb) return ma.localeCompare(mb);
    return (a.nombre || '').localeCompare(b.nombre || '');
  });

  // Numbers referenced by user (1-indexed)
  const nums = [
    560, 561, 623, 628, 634, 671, 738, 739, 740, 746, 788, 790, 797, 900, 901, 902, 904, 905, 906,
    912, 918, 919, 924, 925, 926, 927, 929, 1069, 1148, 1152, 1170, 1178, 1247, 1250, 1301, 1332,
    1341, 1348, 1353, 1354,
  ];

  console.log('=== REFERENCED ENTRIES ===');
  for (const n of nums) {
    const c = cafes[n - 1];
    if (!c) {
      console.log(`#${n}: NOT FOUND`);
      continue;
    }
    const photoUrl = c.fotoUrl || c.imageUrl || c.foto || '';
    console.log(
      `#${n}: id=${c.id} | marca="${c.marca}" | nombre="${c.nombre}" | photo=${photoUrl ? photoUrl.substring(0, 80) : 'NONE'}`
    );
  }

  // Check brand duplicates
  console.log('\n=== BRAND LIST ===');
  const brands = {};
  cafes.forEach((c) => {
    const m = c.marca || 'SIN MARCA';
    brands[m] = (brands[m] || 0) + 1;
  });
  const sorted = Object.entries(brands).sort((a, b) =>
    a[0].toLowerCase().localeCompare(b[0].toLowerCase())
  );
  for (const [m, count] of sorted) {
    console.log(`  "${m}" (${count})`);
  }

  // Specific brand checks
  console.log('\n=== SPECIFIC BRANDS ===');
  const checkBrands = [
    'illy',
    'Illy',
    "L'OR",
    "L'OR ESPRESSO",
    'PRODUCTO ALCAMPO',
    'AUCHAN',
    'Saula',
    'Cafes Saula',
    'Cafès Saula',
  ];
  for (const b of checkBrands) {
    const items = cafes.filter((c) => c.marca === b);
    if (items.length) {
      console.log(`\n"${b}" (${items.length}):`);
      items.forEach((c, i) => {
        const idx = cafes.indexOf(c) + 1;
        console.log(`  #${idx}: ${c.id} - ${c.nombre}`);
      });
    }
  }

  // Check Lavazza entries for photo URLs (to identify blurry ones)
  console.log('\n=== LAVAZZA PHOTOS ===');
  const lavazza = cafes.filter((c) => (c.marca || '').toLowerCase().includes('lavazza'));
  for (const c of lavazza) {
    const idx = cafes.indexOf(c) + 1;
    const url = c.fotoUrl || c.imageUrl || c.foto || 'NONE';
    console.log(`  #${idx}: ${c.id} | ${url.substring(0, 100)}`);
  }

  // Marcilla entries
  console.log('\n=== MARCILLA PHOTOS ===');
  const marcilla = cafes.filter((c) => (c.marca || '').toLowerCase() === 'marcilla');
  for (const c of marcilla) {
    const idx = cafes.indexOf(c) + 1;
    const url = c.fotoUrl || c.imageUrl || c.foto || 'NONE';
    console.log(`  #${idx}: ${c.id} | ${c.nombre} | ${url.substring(0, 100)}`);
  }

  // Pellini entries
  console.log('\n=== PELLINI PHOTOS ===');
  const pellini = cafes.filter((c) => (c.marca || '').toLowerCase() === 'pellini');
  for (const c of pellini) {
    const idx = cafes.indexOf(c) + 1;
    const url = c.fotoUrl || c.imageUrl || c.foto || 'NONE';
    console.log(`  #${idx}: ${c.id} | ${c.nombre} | ${url.substring(0, 100)}`);
  }

  // Saimaza entries
  console.log('\n=== SAIMAZA PHOTOS ===');
  const saimaza = cafes.filter((c) => (c.marca || '').toLowerCase() === 'saimaza');
  for (const c of saimaza) {
    const idx = cafes.indexOf(c) + 1;
    const url = c.fotoUrl || c.imageUrl || c.foto || 'NONE';
    console.log(`  #${idx}: ${c.id} | ${c.nombre} | ${url.substring(0, 100)}`);
  }

  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
