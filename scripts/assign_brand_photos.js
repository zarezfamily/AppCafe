require('dotenv').config();
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const PHOTO_FIELDS = ['foto', 'bestPhoto', 'officialPhoto', 'imageUrl'];

// Manual photo overrides for brands NOT in Firestore
const MANUAL_BRAND_PHOTOS = {
  'hidden coffee roasters':
    'https://hiddencoffeeroasters.com/wp-content/uploads/2022/06/Captura-Lince_00000.jpg',
  'right side coffee':
    'https://cdn.shopify.com/s/files/1/0858/2801/0328/files/LosJuiciosos-Shopi_E.png?v=1746776799',
  'the fix coffee':
    'https://cdn.shopify.com/s/files/1/0858/2801/0328/files/LosJuiciosos-Shopi_E.png?v=1746776799', // use Right Side as placeholder
  'puchero coffee roasters':
    'https://hiddencoffeeroasters.com/wp-content/uploads/2022/06/Captura-Lince_00000.jpg', // use Hidden as placeholder
  nespresso:
    'https://www.nespresso.com/shared_res/agility/n-components/pdp/sku-main-info/coffee-702_desktop_2x.png',
  aldi: 'https://prod-mercadona.imgix.net/images/edd29aec84e91e5051d8dc7890e6ef42.jpg', // generic coffee placeholder
};

async function main() {
  const snapshot = await db.collection('cafes').get();
  console.log('Total docs:', snapshot.size);

  // Step 1: Build brand -> representative photo from existing docs WITH photos
  const brandPhotos = {};
  for (const doc of snapshot.docs) {
    const d = doc.data();
    const foto = d.foto || '';
    if (foto && foto.startsWith('http')) {
      // Index by both marca and roaster (lowercase)
      const marca = (d.marca || '').toLowerCase().trim();
      const roaster = (d.roaster || '').toLowerCase().trim();
      if (marca && !brandPhotos[marca]) brandPhotos[marca] = foto;
      if (roaster && !brandPhotos[roaster]) brandPhotos[roaster] = foto;
    }
  }

  // Add manual overrides
  for (const [brand, photo] of Object.entries(MANUAL_BRAND_PHOTOS)) {
    if (!brandPhotos[brand]) {
      brandPhotos[brand] = photo;
    }
  }

  // Step 2: Update all docs without photos
  let updated = 0;
  let noMatch = 0;
  const unmatched = [];

  for (const doc of snapshot.docs) {
    const d = doc.data();
    const foto = d.foto || '';
    if (foto && foto.startsWith('http')) continue;

    // Try marca first, then roaster
    const marca = (d.marca || '').toLowerCase().trim();
    const roaster = (d.roaster || '').toLowerCase().trim();
    const representativePhoto = brandPhotos[marca] || brandPhotos[roaster];

    if (representativePhoto) {
      const updates = {};
      for (const field of PHOTO_FIELDS) {
        const val = d[field] || '';
        if (!val || !val.startsWith('http')) {
          updates[field] = representativePhoto;
        }
      }
      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates);
        updated++;
        console.log('OK', d.nombre || doc.id, '(' + (d.marca || d.roaster || '?') + ')');
      }
    } else {
      noMatch++;
      unmatched.push(d.nombre || doc.id);
    }
  }

  console.log('\n--- RESUMEN ---');
  console.log('Fotos asignadas:', updated);
  console.log('Sin coincidencia:', noMatch);
  if (unmatched.length > 0) {
    console.log('No asignados:', unmatched.join(', '));
  }

  // Final count
  let withPhoto = 0;
  const snap2 = await db.collection('cafes').get();
  for (const doc of snap2.docs) {
    const f = doc.data().foto || '';
    if (f && f.startsWith('http')) withPhoto++;
  }
  console.log('\nTotal cafes:', snap2.size);
  console.log('Con foto:', withPhoto, '(' + Math.round((withPhoto / snap2.size) * 100) + '%)');
  console.log('Sin foto:', snap2.size - withPhoto);

  process.exit(0);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
