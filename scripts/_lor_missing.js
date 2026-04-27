const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const IDS = [
  'lor_coconut_iced',
  'lor_coffee_iced_07',
  'lor_doble_barista_selection_13',
  'lor_doble_espresso_descafeinado_06',
  'lor_doble_lungo_profondo_08',
  'lor_doble_ristretto_11',
  'lor_dubai_chocolate_style',
  'lor_espresso_avellana',
  'lor_espresso_bio_organic_09',
  'lor_espresso_brasil_08',
  'lor_espresso_caramel',
  'lor_espresso_chocolate',
  'lor_espresso_colombia_08',
  'lor_espresso_onyx_12',
  'lor_espresso_supremo_10',
  'lor_lungo_mattinata_05',
  'lor_lungo_profondo_08',
  'lor_passione_espresso_10',
  'lor_passione_ristretto_12',
  'lor_ristretto_11',
];

(async () => {
  for (const id of IDS) {
    const doc = await db.collection('cafes').doc(id).get();
    if (!doc.exists) {
      console.log(`${id}: NOT FOUND`);
      continue;
    }
    const d = doc.data();
    console.log(
      `${id}: "${d.nombre}" | EAN: ${d.ean || 'N/A'} | foto: ${d.foto || 'N/A'} | imageUrl: ${d.imageUrl || 'N/A'} | officialPhoto: ${d.officialPhoto || 'N/A'} | photos.original: ${d.photos?.original || 'N/A'}`
    );
  }
  process.exit(0);
})();
