#!/usr/bin/env node
/**
 * Import/Update Cafés El Criollo from cafeselcriollo.com
 * Scrapes product pages for og:image, creates/updates all coffee products
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
          return fetchBuf(res.headers.location).then(resolve, reject);
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function getOgImage(pageUrl) {
  try {
    const html = (await fetchBuf(pageUrl)).toString();
    const m = html.match(/property="og:image"\s*content="([^"]+)"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function processAndUpload(docId, imgUrl) {
  const buf = await fetchBuf(imgUrl);
  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(processed, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

const B = 'https://cafeselcriollo.com/producto';

const products = [
  // === SPECIALTY SINGLE ORIGINS (grano/molido 250g-500g) ===
  {
    id: 'criollo_burundi_musenyi',
    nombre: 'Café Burundi Musenyi',
    page: `${B}/cafe-burundi/`,
    fmt: 'grano',
    origen: 'Burundi',
    notas: 'Café de especialidad. Burundi Musenyi',
  },
  {
    id: 'criollo_colombia_pico_cristobal',
    nombre: 'Café Colombia Pico Cristóbal',
    page: `${B}/cafe-colombia/`,
    fmt: 'grano',
    origen: 'Colombia',
    notas: 'Café de especialidad. Colombia Pico Cristóbal',
  },
  {
    id: 'criollo_costa_rica_san_jose',
    nombre: 'Café Costa Rica San José',
    page: `${B}/cafe-costa-rica/`,
    fmt: 'grano',
    origen: 'Costa Rica',
    notas: 'Café de especialidad. Costa Rica San José',
  },
  {
    id: 'criollo_panama_la_mariana',
    nombre: 'Café Panamá La Mariana',
    page: `${B}/cafe-panama/`,
    fmt: 'grano',
    origen: 'Panamá',
    notas: 'Café de especialidad. Panamá La Mariana',
  },
  {
    id: 'criollo_ruanda_mujeres',
    nombre: 'El Café de las Mujeres – Ruanda',
    page: `${B}/cafe-de-las-mujeres/`,
    fmt: 'grano',
    origen: 'Ruanda',
    notas: 'Café de especialidad. Ruanda. Proyecto mujeres cafeteras',
  },
  {
    id: 'criollo_el_salvador_sgh',
    nombre: 'Café El Salvador SGH',
    page: `${B}/cafe-especialidad-el-salvador/`,
    fmt: 'grano',
    origen: 'El Salvador',
    notas: 'Café de especialidad. El Salvador SGH',
  },
  {
    id: 'criollo_etiopia_sidamo',
    nombre: 'Café Etiopía Sidamo',
    page: `${B}/cafe-etiopia/`,
    fmt: 'grano',
    origen: 'Etiopía',
    notas: 'Café de especialidad. Etiopía Sidamo',
  },
  {
    id: 'criollo_guatemala_huehuetenango',
    nombre: 'Café Guatemala Huehuetenango',
    page: `${B}/cafe-guatemala/`,
    fmt: 'grano',
    origen: 'Guatemala',
    notas: 'Café de especialidad. Guatemala Huehuetenango',
  },
  {
    id: 'criollo_brasil_cerrado',
    nombre: 'Café Brasil Cerrado',
    page: `${B}/cafe-brasil/`,
    fmt: 'grano',
    origen: 'Brasil',
    notas: 'Café de especialidad. Brasil Cerrado',
  },
  {
    id: 'criollo_kenia_kiamutuira_ab',
    nombre: 'Café Kenia Kiamutuira AB',
    page: `${B}/cafe-kenia/`,
    fmt: 'grano',
    origen: 'Kenia',
    notas: 'Café de especialidad. Kenia Kiamutuira AB',
  },
  {
    id: 'criollo_mexico_huatusco',
    nombre: 'Café México Huatusco',
    page: `${B}/cafe-mexico/`,
    fmt: 'grano',
    origen: 'México',
    notas: 'Café de especialidad. México Huatusco',
  },
  {
    id: 'criollo_india_malabar',
    nombre: 'Café India Malabar Monsooned',
    page: `${B}/cafe-india/`,
    fmt: 'grano',
    origen: 'India',
    notas: 'Café de especialidad. India Malabar Monsooned',
  },

  // === BLENDS ===
  {
    id: 'criollo_blend_insignia',
    nombre: 'Café Blend Insignia',
    page: `${B}/blend-insignia/`,
    fmt: 'grano',
    notas: 'Blend Insignia. Café de especialidad',
  },
  {
    id: 'criollo_mezcla_tradicion',
    nombre: 'Café Mezcla Tradición',
    page: `${B}/mezcla-tradicion/`,
    fmt: 'grano',
    notas: 'Mezcla Tradición. Natural y torrefacto',
  },

  // === DECAF ===
  {
    id: 'criollo_descafeinado_agua_250g',
    nombre: 'Café Descafeinado al Agua 250g',
    page: `${B}/descafeinado-al-agua/`,
    fmt: 'grano',
    peso: '250g',
    notas: 'Descafeinado al agua. Café de especialidad',
    decaf: true,
    tipo: 'descafeinado',
  },

  // === ECO / DOBLE LABEL ===
  {
    id: 'criollo_doble_label_250g',
    nombre: 'Café Doble Label Eco 250g',
    page: `${B}/cafe-ecologico-doble-label/`,
    fmt: 'grano',
    peso: '250g',
    notas: 'Bio & Fairtrade. Doble Label. Ecológico y comercio justo',
    isBio: true,
  },

  // === MOLIDOS GOURMET ===
  {
    id: 'criollo_colombia_gourmet_molido',
    nombre: 'Café Colombia Gourmet Molido',
    page: `${B}/cafe-de-colombia-gourmet-molido/`,
    fmt: 'molido',
    origen: 'Colombia',
    notas: 'Molido gourmet. Colombia',
  },
  {
    id: 'criollo_100_arabica_gourmet_molido',
    nombre: 'Café 100% Arábica Gourmet Molido',
    page: `${B}/cafe-100-arabica-gourmet-molido/`,
    fmt: 'molido',
    variedad: '100% Arábica',
    notas: 'Molido gourmet. 100% Arábica',
  },
  {
    id: 'criollo_brasil_gourmet_molido',
    nombre: 'Café Brasil Gourmet Molido',
    page: `${B}/cafe-de-brasil-gourmet-molido/`,
    fmt: 'molido',
    origen: 'Brasil',
    notas: 'Molido gourmet. Brasil',
  },

  // === CÁPSULAS NESPRESSO (aluminio) ===
  {
    id: 'criollo_caps_nespresso_descafeinado',
    nombre: 'Cápsulas Nespresso Descafeinado',
    page: `${B}/capsulas-descafeinado/`,
    fmt: 'capsules',
    notas: 'Compatible Nespresso. Aluminio. Descafeinado',
    decaf: true,
    tipo: 'descafeinado',
  },
  {
    id: 'criollo_caps_nespresso_colombia',
    nombre: 'Cápsulas Nespresso Colombia',
    page: `${B}/capsulas-colombia/`,
    fmt: 'capsules',
    origen: 'Colombia',
    notas: 'Compatible Nespresso. Aluminio. Colombia. Café de especialidad',
  },
  {
    id: 'criollo_caps_nespresso_ristretto',
    nombre: 'Cápsulas Nespresso Ristretto',
    page: `${B}/capsulas-ristretto/`,
    fmt: 'capsules',
    notas: 'Compatible Nespresso. Aluminio. Ristretto',
  },
  {
    id: 'criollo_caps_nespresso_intenso',
    nombre: 'Cápsulas Nespresso Intenso',
    page: `${B}/capsulas-intenso/`,
    fmt: 'capsules',
    notas: 'Compatible Nespresso. Aluminio. Intenso',
  },

  // === HOSTELERÍA GRANO 1KG ===
  {
    id: 'criollo_platinum_1kg',
    nombre: 'Café Platinum Grano 1kg',
    page: `${B}/platinum-3kg/`,
    fmt: 'grano',
    peso: '1kg',
    notas: 'Línea Hostelería. Platinum. Premium',
    cat: 'premium',
  },
  {
    id: 'criollo_sweet_espresso_1kg',
    nombre: 'Café Sweet Espresso Grano 1kg',
    page: `${B}/sweet-espresso/`,
    fmt: 'grano',
    peso: '1kg',
    notas: 'Línea Hostelería. Sweet Espresso',
  },
  {
    id: 'criollo_etiqueta_negra_1kg',
    nombre: 'Café Etiqueta Negra Grano 1kg',
    page: `${B}/etiqueta-negra/`,
    fmt: 'grano',
    peso: '1kg',
    notas: 'Línea Hostelería. Etiqueta Negra',
  },
  {
    id: 'criollo_doble_label_1kg',
    nombre: 'Café Doble Label Bio & Fairtrade Grano 1kg',
    page: `${B}/doble-label/`,
    fmt: 'grano',
    peso: '1kg',
    notas: 'Línea Hostelería. Bio & Fairtrade. Doble Label',
    isBio: true,
  },
  {
    id: 'criollo_descafeinado_agua_1kg',
    nombre: 'Café Descafeinado al Agua Grano 1kg',
    page: `${B}/cafe-descafeinado-al-agua/`,
    fmt: 'grano',
    peso: '1kg',
    notas: 'Línea Hostelería. Descafeinado al agua',
    decaf: true,
    tipo: 'descafeinado',
  },
  {
    id: 'criollo_extra_natural_1kg',
    nombre: 'Café Extra Natural Grano 1kg',
    page: `${B}/extra-natural/`,
    fmt: 'grano',
    peso: '1kg',
    notas: 'Línea Hostelería. Extra Natural',
  },
  {
    id: 'criollo_selecta_natural_1kg',
    nombre: 'Café Selecta Natural Grano 1kg',
    page: `${B}/selecta-natural/`,
    fmt: 'grano',
    peso: '1kg',
    notas: 'Línea Hostelería. Selecta Natural',
  },
  {
    id: 'criollo_alta_crema_1kg',
    nombre: 'Café Alta Crema Grano 1kg',
    page: `${B}/alta-crema/`,
    fmt: 'grano',
    peso: '1kg',
    notas: 'Línea Hostelería. Alta Crema',
  },
  {
    id: 'criollo_descafeinado_1kg',
    nombre: 'Café Descafeinado El Criollo Grano 1kg',
    page: `${B}/descafeinado-el-criollo/`,
    fmt: 'grano',
    peso: '1kg',
    notas: 'Línea Hostelería. Descafeinado',
    decaf: true,
    tipo: 'descafeinado',
  },
  {
    id: 'criollo_mezcla_extra_1kg',
    nombre: 'Café Mezcla Extra 85/15 Grano 1kg',
    page: `${B}/cafe-mezcla-extra-85-15/`,
    fmt: 'grano',
    peso: '1kg',
    notas: 'Línea Hostelería. Mezcla Extra 85% natural 15% torrefacto',
    tipo: 'mezcla',
  },
  {
    id: 'criollo_mezcla_selecta_1kg',
    nombre: 'Café Mezcla Selecta 85/15 Grano 1kg',
    page: `${B}/cafe-mezcla-selecta-85-15/`,
    fmt: 'grano',
    peso: '1kg',
    notas: 'Línea Hostelería. Mezcla Selecta 85% natural 15% torrefacto',
    tipo: 'mezcla',
  },
  {
    id: 'criollo_mezcla_alta_crema_1kg',
    nombre: 'Café Mezcla Alta Crema Grano 1kg',
    page: `${B}/mezcla-alta-crema/`,
    fmt: 'grano',
    peso: '1kg',
    notas: 'Línea Hostelería. Mezcla Alta Crema',
    tipo: 'mezcla',
  },

  // === CÁPSULAS LAVAZZA BLUE ===
  {
    id: 'criollo_caps_lavazza_alta_seleccion',
    nombre: 'Cápsulas Lavazza Blue Alta Selección 100uds',
    page: `${B}/capsulas-alta-seleccion/`,
    fmt: 'capsules',
    peso: '100 uds',
    notas: 'Compatible Lavazza Blue. Alta Selección',
  },
  {
    id: 'criollo_caps_lavazza_etiqueta_negra',
    nombre: 'Cápsulas Lavazza Blue Etiqueta Negra 100uds',
    page: `${B}/capsula-cafe-etiqueta-negra-100-uds/`,
    fmt: 'capsules',
    peso: '100 uds',
    notas: 'Compatible Lavazza Blue. Etiqueta Negra',
  },
  {
    id: 'criollo_caps_lavazza_descafeinado',
    nombre: 'Cápsulas Lavazza Blue Descafeinado 100uds',
    page: `${B}/capsulas-cafe-descafeinado/`,
    fmt: 'capsules',
    peso: '100 uds',
    notas: 'Compatible Lavazza Blue. Descafeinado',
    decaf: true,
    tipo: 'descafeinado',
  },

  // === CÁPSULAS LAVAZZA FIRMA (BLACK) ===
  {
    id: 'criollo_caps_firma_lungo',
    nombre: 'Cápsulas Lavazza Firma Black Lungo 96uds',
    page: `${B}/capsulas-black-lungo-96-uds/`,
    fmt: 'capsules',
    peso: '96 uds',
    notas: 'Compatible Lavazza Firma. Black Lungo',
  },
  {
    id: 'criollo_caps_firma_ristretto',
    nombre: 'Cápsulas Lavazza Firma Black Ristretto 96uds',
    page: `${B}/capsulas-black-ristretto-96-uds/`,
    fmt: 'capsules',
    peso: '96 uds',
    notas: 'Compatible Lavazza Firma. Black Ristretto',
  },
  {
    id: 'criollo_caps_firma_descafeinado',
    nombre: 'Cápsulas Lavazza Firma Black Descafeinado 96uds',
    page: `${B}/capsulas-black-descafeinado-96-uds/`,
    fmt: 'capsules',
    peso: '96 uds',
    notas: 'Compatible Lavazza Firma. Black Descafeinado',
    decaf: true,
    tipo: 'descafeinado',
  },

  // === CÁPSULAS ESPRESSO POINT ===
  {
    id: 'criollo_caps_ep_arabica',
    nombre: 'Cápsulas Espresso Point Arábica 50uds',
    page: `${B}/capsula-arabica-50ud/`,
    fmt: 'capsules',
    peso: '50 uds',
    notas: 'Compatible Espresso Point. 100% Arábica',
  },
  {
    id: 'criollo_caps_ep_forte',
    nombre: 'Cápsulas Espresso Point Forte 50uds',
    page: `${B}/capsula-forte-50ud/`,
    fmt: 'capsules',
    peso: '50 uds',
    notas: 'Compatible Espresso Point. Forte',
  },
  {
    id: 'criollo_caps_ep_descaffeinato',
    nombre: 'Cápsulas Espresso Point Descaffeinato 50uds',
    page: `${B}/capsula-descaffeinato/`,
    fmt: 'capsules',
    peso: '50 uds',
    notas: 'Compatible Espresso Point. Descafeinado',
    decaf: true,
    tipo: 'descafeinado',
  },

  // === SOLUBLE ===
  {
    id: 'criollo_descafeinado_soluble',
    nombre: 'Café Descafeinado Soluble El Criollo',
    page: `${B}/descafeinado-soluble-el-criollo/`,
    fmt: 'soluble',
    notas: 'Café soluble descafeinado. Sobres 2g',
    decaf: true,
    tipo: 'descafeinado',
  },
];

const baseData = {
  marca: 'Cafés El Criollo',
  pais: 'España',
  origen: '',
  variedad: '',
  tueste: '',
  tipo: 'natural',
  coffeeCategory: 'specialty',
  category: 'specialty',
  fuente: 'cafeselcriollo.com',
  fuentePais: 'ES',
  isBio: false,
  decaf: false,
  notas: '',
  peso: '',
  fecha: new Date().toISOString(),
  puntuacion: 0,
  votos: 0,
  status: 'approved',
  reviewStatus: 'approved',
  appVisible: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function main() {
  const DRY = process.argv.includes('--dry-run');
  console.log(
    `=== Cafés El Criollo Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) =>
      console.log(`  ${(i + 1).toString().padStart(2)}. ${p.id} ← ${p.nombre} [${p.fmt}]`)
    );
    return;
  }

  // Delete all existing
  const snap = await db.collection('cafes').where('marca', '==', 'Cafés El Criollo').get();
  console.log(`  Deleting ${snap.size} existing docs...`);
  for (const d of snap.docs) {
    await d.ref.delete();
    try {
      await bucket.file(`${PREFIX}/${d.id}.png`).delete();
    } catch {}
  }

  let ok = 0,
    noImg = 0;
  for (const p of products) {
    try {
      let photoUrl = '';
      const imgUrl = await getOgImage(p.page);
      if (imgUrl) {
        try {
          photoUrl = await processAndUpload(p.id, imgUrl);
        } catch (e) {
          console.log(`\n  WARN img ${p.id}: ${e.message}`);
          noImg++;
        }
      } else {
        noImg++;
      }

      const photoFields = photoUrl
        ? {
            fotoUrl: photoUrl,
            foto: photoUrl,
            imageUrl: photoUrl,
            officialPhoto: photoUrl,
            bestPhoto: photoUrl,
            imagenUrl: photoUrl,
            photos: { selected: photoUrl, original: photoUrl, bgRemoved: photoUrl },
          }
        : {};

      const doc = {
        ...baseData,
        nombre: p.nombre,
        formato: p.fmt,
        ...(p.origen ? { origen: p.origen } : {}),
        ...(p.peso ? { peso: p.peso } : {}),
        ...(p.variedad ? { variedad: p.variedad } : {}),
        ...(p.notas ? { notas: p.notas } : {}),
        ...(p.decaf ? { decaf: true } : {}),
        ...(p.tipo ? { tipo: p.tipo } : {}),
        ...(p.isBio ? { isBio: true } : {}),
        ...(p.cat ? { coffeeCategory: p.cat, category: p.cat } : {}),
        ...photoFields,
      };
      await db.collection('cafes').doc(p.id).set(doc);
      ok++;
      process.stdout.write(`\r  Created ${ok}/${products.length}`);
    } catch (e) {
      console.log(`\n  ERROR ${p.id}: ${e.message}`);
    }
  }
  console.log(`\n\n=== Done: deleted ${snap.size} old, created ${ok} (${noImg} without photo) ===`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
