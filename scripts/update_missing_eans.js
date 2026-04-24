const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (admin.apps.length === 0) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const updates = [
  // EANs verificados
  { id: 'hacendado-bebida-de-avena-con-cafe-hacendado-ground', ean: '8480000106889' },
  { id: 'tassimo-cafe-en-capsula-descafeinado-tassimo-capsules', ean: '8711000501009' },
  // Ineffable Coffee - café de especialidad sin EAN estándar
  { id: 'ineffable-coffee-atoq-beans-bolivia', ean: 'N/A' },
  { id: 'ineffable-coffee-boku-snap-anaerobic-72h-beans-etiopia', ean: 'N/A' },
  { id: 'ineffable-coffee-chapoleros-wush-wush-beans-colombia', ean: 'N/A' },
  { id: 'ineffable-coffee-descafeinado-swiss-water-beans-mexico', ean: 'N/A' },
  { id: 'ineffable-coffee-efren-echeverria-beans-colombia', ean: 'N/A' },
  { id: 'ineffable-coffee-friends-of-tolima-beans-colombia', ean: 'N/A' },
  { id: 'ineffable-coffee-gigante-cherry-beans-colombia', ean: 'N/A' },
  { id: 'ineffable-coffee-jose-g-gesha-beans-colombia', ean: 'N/A' },
  { id: 'ineffable-coffee-la-coipa-beans-peru', ean: 'N/A' },
  { id: 'ineffable-coffee-munyinya-long-miles-beans-burundi', ean: 'N/A' },
  { id: 'ineffable-coffee-nestor-lasso-sidra-48h-beans-colombia', ean: 'N/A' },
  { id: 'ineffable-coffee-romario-umana-beans-costa-rica', ean: 'N/A' },
  { id: 'ineffable-coffee-sasaba-beans-etiopia', ean: 'N/A' },
  { id: 'ineffable-coffee-sitio-amoreira-beans-brasil', ean: 'N/A' },
  { id: 'ineffable-coffee-tibebu-roba-beans-etiopia', ean: 'N/A' },
  { id: 'ineffable-coffee-typica-mossto-decaf-beans-colombia', ean: 'N/A' },
  // Right Side Coffee - café de especialidad sin EAN estándar
  { id: 'right-side-coffee-alfredo-ordonez-maragogype-filtro-beans-peru', ean: 'N/A' },
  { id: 'right-side-coffee-ausberto-oblitas-filtro-beans-peru', ean: 'N/A' },
  { id: 'right-side-coffee-benjamin-paz-espresso-beans-honduras', ean: 'N/A' },
  { id: 'right-side-coffee-esperanza-sl34-natural-mystic-filtro-beans-nicaragua', ean: 'N/A' },
  { id: 'right-side-coffee-heleanna-s-secret-filtro-beans-etiopia', ean: 'N/A' },
  { id: 'right-side-coffee-los-juiciosos-espresso-beans-colombia', ean: 'N/A' },
  { id: 'right-side-coffee-maracaturra-shake-filtro-beans-nicaragua', ean: 'N/A' },
  { id: 'right-side-coffee-sallique-typica-espresso-beans-peru', ean: 'N/A' },
  { id: 'right-side-coffee-sallique-typica-filtro-beans-peru', ean: 'N/A' },
  { id: 'right-side-coffee-swiss-water-decaf-espresso-beans-mexico', ean: 'N/A' },
  { id: 'right-side-coffee-urdd-catuai-natural-espresso-beans-nicaragua', ean: 'N/A' },
  { id: 'right-side-coffee-volcancitos-honey-espresso-beans-nicaragua', ean: 'N/A' },
];

async function main() {
  let ok = 0,
    fail = 0;
  for (const u of updates) {
    try {
      await db.collection('cafes').doc(u.id).update({ ean: u.ean });
      console.log(`✅ ${u.id} → ${u.ean}`);
      ok++;
    } catch (e) {
      console.log(`❌ ${u.id}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\nResultado: ${ok} actualizados, ${fail} errores (total: ${updates.length})`);
  process.exit(0);
}
main();
