const admin = require('firebase-admin'),
  sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
(async () => {
  const all = [
    'eci_cdg_grano_costarica_250',
    'eci_cdg_grano_honduras_250',
    'eci_cdg_grano_peru_250',
    'alcampo_mmm_capsulas_colombia_nesp_10',
    'alcampo_mmm_capsulas_etiopia_nesp_10',
    'alcampo_mmm_grano_100_arabica_250',
    'alcampo_mmm_molido_colombia_250',
    'alcampo_mmm_molido_etiopia_250',
    'alcampo_mmm_molido_kenya_250',
    'carrefour_bio_grano_arabica_500',
    'carrefour_bio_molido_arabica_250',
    'carrefour_classic_grano_descaf_500',
    'carrefour_classic_grano_mezcla_1kg',
    'carrefour_classic_grano_natural_1kg',
    'carrefour_classic_molido_mezcla_250',
    'consum_capsulas_colombia_nesp_10',
    'consum_grano_natural_500',
    'coviran_capsulas_espresso_nesp_10',
    'coviran_grano_natural_500',
    'spar_capsulas_espresso_nesp_10',
    'spar_grano_natural_500',
  ];
  for (const id of all) {
    const snap = await db.collection('cafes').doc(id).get();
    if (!snap.exists) {
      console.log(id, 'NOT FOUND');
      continue;
    }
    const d = snap.data();
    console.log(
      id,
      '| ean:',
      d.ean || '-',
      '| fuenteUrl:',
      d.fuenteUrl || '-',
      '| originalUrl:',
      d.originalUrl || (d.photos && d.photos.original) || '-'
    );
  }
  process.exit(0);
})();
