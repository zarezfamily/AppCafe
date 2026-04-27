#!/usr/bin/env node
/**
 * Fill missing tasting notes for 79 cafes.
 * Notes are generated based on product type, format, brand, origin and roast.
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

const notes = {
  // Nescafé soluble
  ean_3033710038381:
    'Sabor suave y equilibrado con notas tostadas. Café soluble clásico de aroma persistente.',
  ean_5601001322808: 'Aroma intenso con cuerpo medio. Notas de cereal tostado y un final limpio.',

  // Dolce Gusto cápsulas
  ean_7613032396350: 'Espresso intenso suavizado con leche cremosa. Notas de cacao y caramelo.',
  ean_7613033174667:
    'Café suave con leche cremosa. Notas de vainilla y un toque dulce equilibrado.',
  ean_7613035260924:
    'Espresso descafeinado intenso con cuerpo. Notas de cacao oscuro y frutos secos.',
  ean_7613036562874:
    'Ristretto napolitano con cuerpo robusto. Notas de chocolate amargo y especias.',
  ean_7613036862295:
    'Espresso intenso con crema densa. Notas de cacao, madera y un final persistente.',

  // Hacendado cápsulas (Dolce Gusto compatible)
  ean_8402001012365:
    'Doble espresso con cuerpo intenso. Notas de cacao tostado y un final prolongado.',
  ean_8402001013577: 'Cortado cremoso y equilibrado. Notas de caramelo suave con un toque de nuez.',
  ean_8402001022333: 'Café con leche suave y cremoso. Notas de vainilla y cereales tostados.',
  ean_8402001024511:
    'Origen Colombia con cuerpo medio. Notas de caramelo, cítricos suaves y frutos rojos.',
  ean_8402001037337: 'Cortado descafeinado equilibrado. Notas de caramelo y leche con final suave.',
  ean_8402001037344: 'Café con leche descafeinado cremoso. Notas dulces de vainilla y cereales.',
  ean_8402001041198: 'Cápsula con aroma a caramelo. Notas dulces y tostadas con final suave.',
  ean_8402001043277: 'Ristretto concentrado e intenso. Notas de chocolate negro y madera tostada.',

  // Hacendado molido
  ean_8402001031113:
    'Origen Colombia con tueste medio. Notas de caramelo, cítricos y cuerpo equilibrado.',

  // Hacendado soluble
  ean_8402001031830: 'Café soluble clásico suave. Notas de cereal tostado y cuerpo ligero.',
  ean_8402001031847: 'Café soluble clásico equilibrado. Aroma tostado con notas de malta.',
  ean_8402001031854: 'Soluble descafeinado suave. Notas de cereal y cacao con final limpio.',
  ean_8402001031861: 'Soluble descafeinado de aroma suave. Notas de malta y tostado ligero.',
  ean_8402001031878: 'Soluble clásico en sobres, práctico. Notas tostadas y cuerpo ligero.',
  ean_8402001031885: 'Soluble descafeinado en sobres. Notas suaves de cereal y final limpio.',

  // Hacendado grano
  ean_8402001037320: 'Grano Colombia con cuerpo medio. Notas de caramelo, nuez y cítricos suaves.',
  ean_8402001041174: 'Grano natural equilibrado. Notas de frutos secos tostados y cacao suave.',
  ean_8402001043239: 'Grano fuerte con cuerpo intenso. Notas de chocolate amargo y madera.',

  // Nescafé descafeinado
  ean_8410100021546:
    'Soluble descafeinado suave. Notas de cereal tostado con final limpio y agradable.',
  ean_8410100021553:
    'Descafeinado clásico equilibrado. Aroma tostado con notas de malta y cacao suave.',

  // Bonka molido
  ean_8410100024202:
    'Molido natural de tueste medio. Notas de frutos secos, caramelo y cuerpo equilibrado.',

  // Cafés Valiente
  ean_8411786101027: 'Molido natural valenciano. Notas de cacao, frutos secos y aroma intenso.',

  // Climent
  ean_8412837250015: 'Molido natural artesano. Notas de tostado, frutos secos y cuerpo medio.',
  ean_8412837250046:
    'Molido descafeinado artesano. Notas suaves de cacao y cereal con final limpio.',

  // Hacendado cápsulas Nespresso
  ean_8480000103505:
    'Cápsula extra fuerte con cuerpo robusto. Notas de chocolate negro y especias.',
  ean_8480000103529:
    'Cápsula espresso equilibrada. Notas de cacao, frutos secos y crema persistente.',
  ean_8480000103550: 'Cápsula descafeinada suave. Notas de cereal tostado y final limpio.',
  ean_8480000136343: 'Cápsula classic equilibrada. Notas de tostado medio, nuez y cacao suave.',
  ean_8480000136350: 'Cápsula forte con intensidad alta. Notas de chocolate y madera tostada.',
  ean_8480000136367: 'Cápsula extra forte muy intensa. Notas de cacao amargo y especias.',
  ean_8480000135964: 'Cápsula descafeinada espresso. Notas suaves de cacao y final equilibrado.',
  ean_8480000228017: 'Doble espresso con cuerpo pleno. Notas de chocolate tostado y nuez.',
  ean_8480000232939: 'Cápsula descafeinada suave y cremosa. Notas de cereales y cacao ligero.',

  // Hacendado grano
  ean_8480000110213:
    'Grano descafeinado equilibrado. Notas de frutos secos y cacao con cuerpo suave.',

  // Hacendado soluble
  ean_8480000111234: 'Soluble Espresso Creme con crema. Notas de tostado intenso y cacao.',

  // Hacendado molido
  ean_8480000111715: 'Molido fuerte con cuerpo intenso. Notas de chocolate amargo y madera.',
  ean_8480000111722: 'Molido natural equilibrado. Notas de frutos secos, caramelo y cuerpo medio.',
  ean_8480000111784: 'Molido natural suave. Notas de cereales tostados y final limpio.',
  ean_8480000117144: 'Molido natural espresso. Notas de cacao, nuez tostada y crema persistente.',
  ean_8480000137005: 'Molido fuerte con tueste oscuro. Notas de chocolate negro y aroma intenso.',
  ean_8480000135926: 'Molido descafeinado suave. Notas de cereal y cacao con final agradable.',
  ean_8480000135933: 'Molido descafeinado equilibrado. Notas de tostado suave y frutos secos.',
  ean_8480000159229: 'Molido mezcla con cuerpo medio. Notas de tostado, cereales y cacao.',
  ean_8480000159236: 'Molido mezcla equilibrada. Notas de frutos secos y caramelo suave.',

  // Hacendado monodosis
  ean_8480000117304: 'Monodosis mezcla con cuerpo medio. Notas de tostado y chocolate suave.',
  ean_8480000117700: 'Monodosis natural equilibrada. Notas de frutos secos y aroma tostado.',
  ean_8480000117779: 'Monodosis descafeinada natural. Notas suaves de cereal y final limpio.',

  // Tassimo
  ean_8711000501009: 'Espresso Tassimo con crema densa. Notas de cacao tostado y cuerpo medio.',
  ean_8711000502518: 'Café con leche Tassimo cremoso. Notas de vainilla y caramelo suave.',

  // Hacendado (non-EAN IDs)
  'hacendado-bebida-de-avena-con-cafe-hacendado-ground':
    'Bebida de avena con café suave. Notas de cereales y un toque de café tostado.',
  'hacendado-cafe-en-grano-colombia':
    'Grano Colombia con cuerpo medio. Notas de caramelo, cítricos y frutos rojos.',
  'hacendado-cafe-en-grano-fuerte':
    'Grano fuerte con tueste oscuro. Notas de chocolate amargo, especias y cuerpo pleno.',
  'hacendado-cafe-en-grano-natural':
    'Grano natural equilibrado. Notas de frutos secos, cacao suave y aroma tostado.',
  'hacendado-cafe-molido-colombia':
    'Molido Colombia con tueste medio. Notas de caramelo, cítricos y acidez suave.',
  'hacendado-cafe-molido-mezcla-fuerte':
    'Molido mezcla fuerte. Notas de chocolate negro, madera tostada y cuerpo intenso.',
  'hacendado-capsulas-descafeinado':
    'Cápsula descafeinada equilibrada. Notas de cacao suave y cereal con final limpio.',

  // Hola Coffee
  'hola-coffee-lucero-blend':
    'Blend de tueste ligero con acidez brillante. Notas florales, cítricas y de miel.',

  // Lidl Bio Organic
  'lidl-cafe-capsulas-bio-organic-espresso':
    'Cápsula bio espresso con cuerpo firme. Notas de chocolate, frutos secos y especias.',
  'lidl-cafe-capsulas-bio-organic-lungo':
    'Cápsula bio lungo suave. Notas de cereales, caramelo y final largo.',
  'lidl-cafe-en-grano-bio-organic-descafeinado':
    'Grano bio descafeinado. Notas de cacao suave, frutos secos y final limpio.',
  'lidl-cafe-en-grano-bio-organic-honduras':
    'Grano bio Honduras con cuerpo medio. Notas de chocolate, caramelo y nuez.',
  'lidl-cafe-en-grano-bio-organic-mexico':
    'Grano bio México con acidez suave. Notas de chocolate, nuez y especias.',
  'lidl-cafe-en-grano-bio-organic-peru':
    'Grano bio Perú con cuerpo equilibrado. Notas de cacao, frutos rojos y caramelo.',
  'lidl-cafe-molido-bio-organic-blend':
    'Molido bio blend equilibrado. Notas de frutos secos, cacao y cereal tostado.',
  'lidl-cafe-molido-bio-organic-colombia':
    'Molido bio Colombia. Notas de caramelo, cítricos suaves y cuerpo medio.',
  'lidl-cafe-molido-bio-organic-descafeinado':
    'Molido bio descafeinado. Notas de cacao suave, cereal y final agradable.',
  'lidl-cafe-molido-bio-organic-etiopia':
    'Molido bio Etiopía de tueste ligero. Notas florales, afrutadas y acidez brillante.',

  // Starbucks
  'starbucks-starbucks-caffe-verona':
    'Mezcla intensa con tueste oscuro. Notas de chocolate amargo, caramelo oscuro y cuerpo robusto.',
  'starbucks-starbucks-decaf-espresso-roast':
    'Espresso descafeinado con tueste intenso. Notas de caramelo, cacao y final suave.',
  'starbucks-starbucks-house-blend':
    'Mezcla equilibrada de tueste medio. Notas de nuez tostada, cacao y caramelo.',
  'starbucks-starbucks-pike-place-roast':
    'Tueste medio equilibrado. Notas de cacao, toffee y un final suave y limpio.',

  // Tassimo descafeinado
  'tassimo-cafe-en-capsula-descafeinado-tassimo-capsules':
    'Cápsula Tassimo descafeinada. Notas de cereales tostados y cacao con final suave.',
};

async function main() {
  console.log('=== Fill Missing Notes ===\n');
  let updated = 0,
    skipped = 0,
    errors = 0;

  for (const [id, notas] of Object.entries(notes)) {
    try {
      const ref = db.collection('cafes').doc(id);
      const doc = await ref.get();
      if (!doc.exists) {
        console.log(`  ❌ ${id}: not found`);
        errors++;
        continue;
      }
      const current = doc.data().notas;
      if (typeof current === 'string' && current.trim().length > 0) {
        console.log(`  ⏭  ${id}: already has notes`);
        skipped++;
        continue;
      }
      await ref.update({ notas });
      console.log(`  ✅ ${doc.data().nombre}`);
      updated++;
    } catch (e) {
      console.log(`  ❌ ${id}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n=== Done: ${updated} updated, ${skipped} skipped, ${errors} errors ===`);
  process.exit(0);
}

main();
