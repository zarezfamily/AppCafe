const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// Precios reales de Amazon.es / mercado
const PRICES = {
  bonka_natural_hosteleria_grano_1kg: 12.99,
  cafe_saula_gran_espresso_premium_grano_500g: 14.95,
  delta_platinum_grano_1kg: 16.99,
  el_criollo_colombia_especialidad_grano_1kg: 24.9,
  julius_meinl_wiener_grano_1kg: 18.99,
  kimbo_espresso_napoletano_grano_1kg: 14.49,
  lavazza_qualita_oro_grano_250g: 6.49,
  marcilla_gran_aroma_natural_grano_1kg: 11.99,
  mocay_etiqueta_oro_grano_1kg: 15.9,
  oquendo_mezcla_grano_1kg: 13.49,
  pellini_top_arabica_grano_1kg: 17.99,
  saimaza_tueste_natural_grano_1kg: 11.49,
  supracafe_descafeinado_grano_1kg: 19.9,
  vergnano_espresso_grano_1kg: 15.99,
};

// Notas de cata típicas por marca/producto
const NOTAS = {
  bonka_natural_hosteleria_grano_1kg:
    'Cacao, frutos secos, cuerpo medio. Mezcla equilibrada para hostelería.',
  cafe_saula_gran_espresso_premium_grano_500g:
    'Chocolate con leche, almendra, caramelo. Acidez suave y cuerpo redondo.',
  delta_platinum_grano_1kg:
    'Tostado intenso, chocolate negro, especias. Cuerpo pleno con final largo.',
  el_criollo_colombia_especialidad_grano_1kg:
    'Panela, frutos rojos, chocolate. Acidez media con dulzor pronunciado.',
  julius_meinl_wiener_grano_1kg:
    'Avellana, caramelo, cuerpo sedoso. Estilo vienés equilibrado y suave.',
  kimbo_espresso_napoletano_grano_1kg:
    'Chocolate, nuez, tostado. Crema persistente, estilo napolitano.',
  lavazza_qualita_oro_grano_250g: 'Floral, miel, fruta dulce. Acidez delicada y cuerpo ligero.',
  marcilla_gran_aroma_natural_grano_1kg:
    'Cereal, frutos secos, cacao suave. Aroma envolvente, cuerpo medio.',
  mocay_etiqueta_oro_grano_1kg: 'Frutos secos, caramelo, cacao. Blend cremoso para hostelería.',
  oquendo_mezcla_grano_1kg: 'Nuez, cacao, tostado medio. Cuerpo equilibrado, final limpio.',
  pellini_top_arabica_grano_1kg:
    'Floral, chocolate con leche, fruta madura. Aroma intenso y envolvente.',
  saimaza_tueste_natural_grano_1kg:
    'Cacao, cereal tostado, frutos secos. Cuerpo medio, sabor clásico.',
  supracafe_descafeinado_grano_1kg:
    'Caramelo, chocolate suave, nuez. Cuerpo medio, descafeinado por agua suiza.',
  vergnano_espresso_grano_1kg:
    'Chocolate negro, avellana, especias. Crema densa, estilo italiano clásico.',
  '7OCDtxmVAcnaQkA0GohV':
    'Floral, cítrico, chocolate. 100% Arábica con acidez elegante y cuerpo medio.',
};

(async () => {
  const now = new Date().toISOString();
  const batch = db.batch();
  let updates = 0;

  // 1) Fix timestamps for the 2 cafes missing updatedAt
  for (const id of ['k32C1FfcqVaauDvzAqQU', 'uLCcJb3oUGtdbxGmtoQf']) {
    batch.update(db.collection('cafes').doc(id), { updatedAt: now, createdAt: now });
    updates++;
  }

  // 2) Fix precios
  for (const [id, precio] of Object.entries(PRICES)) {
    batch.update(db.collection('cafes').doc(id), { precio });
    updates++;
  }

  // 3) Fix notas
  for (const [id, notas] of Object.entries(NOTAS)) {
    batch.update(db.collection('cafes').doc(id), { notas, notes: notas });
    updates++;
  }

  await batch.commit();
  console.log(`Done. ${updates} updates committed.`);
  console.log('- 2 cafes got updatedAt/createdAt (now visible in admin)');
  console.log('- 14 cafes got precio');
  console.log('- 15 cafes got notas');
  process.exit(0);
})();
