// Import Carrefour and AUCHAN coffees into Firestore
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const sharp = require('sharp');
const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

const NOW = new Date().toISOString();

// ======================== CARREFOUR ========================
const carrefourProducts = [
  {
    id: 'carrefour_molido_natural_250',
    nombre: 'Café molido natural Carrefour Classic 250 g',
    formato: 'ground',
    format: 'ground',
    tipoProducto: 'cafe molido',
    cantidad: 250,
    precio: 2.47,
    tueste: 'medio',
    variedad: 'Arábica, Robusta',
    descafeinado: false,
    sistemaCapsula: '',
    imgId: '236780_00_1',
    sku: 'R-521003000',
  },
  {
    id: 'carrefour_molido_natural_500',
    nombre: 'Café molido natural Carrefour Classic 500 g',
    formato: 'ground',
    format: 'ground',
    tipoProducto: 'cafe molido',
    cantidad: 500,
    precio: 4.89,
    tueste: 'medio',
    variedad: 'Arábica, Robusta',
    descafeinado: false,
    sistemaCapsula: '',
    imgId: '331397_00_1',
    sku: 'R-fprod1280764',
  },
  {
    id: 'carrefour_soluble_natural_200',
    nombre: 'Café soluble natural Carrefour Classic 200 g',
    formato: 'instant',
    format: 'instant',
    tipoProducto: 'cafe soluble',
    cantidad: 200,
    precio: 4.29,
    tueste: 'medio',
    variedad: '',
    descafeinado: false,
    sistemaCapsula: '',
    imgId: '230408_00_1',
    sku: 'R-521003045',
  },
  {
    id: 'carrefour_capsulas_intenso_dg_30',
    nombre: 'Café intenso en cápsulas Carrefour compatible con Dolce Gusto 30 uds',
    formato: 'capsules',
    format: 'capsules',
    tipoProducto: 'capsulas',
    cantidad: 210,
    precio: 6.45,
    tueste: 'medio',
    variedad: 'Arábica, Robusta',
    descafeinado: false,
    sistemaCapsula: 'Dolce Gusto',
    imgId: '331362_00_1',
    intensidad: 10,
    sku: 'R-fprod1280743',
  },
  {
    id: 'carrefour_molido_descafeinado_250',
    nombre: 'Café molido natural descafeinado Carrefour Classic 250 g',
    formato: 'ground',
    format: 'ground',
    tipoProducto: 'cafe molido',
    cantidad: 250,
    precio: 2.85,
    tueste: 'medio',
    variedad: 'Arábica, Robusta',
    descafeinado: true,
    sistemaCapsula: '',
    imgId: '236781_00_1',
    sku: 'R-521003002',
  },
  {
    id: 'carrefour_capsulas_colombia_nesp_20',
    nombre: 'Café cápsulas Colombia Carrefour Extra compatible con Nespresso 20 uds',
    formato: 'capsules',
    format: 'capsules',
    tipoProducto: 'capsulas',
    cantidad: 104,
    precio: 3.79,
    tueste: 'medio',
    variedad: 'Arábica',
    descafeinado: false,
    sistemaCapsula: 'Nespresso',
    pais: 'Colombia',
    imgId: '276184_00_1',
    intensidad: 10,
    sku: 'R-526413995',
  },
  {
    id: 'carrefour_capsulas_intenso_dg_16',
    nombre: 'Café cápsulas intenso Carrefour Extra compatible con Dolce Gusto 16 uds',
    formato: 'capsules',
    format: 'capsules',
    tipoProducto: 'capsulas',
    cantidad: 112,
    precio: 3.51,
    tueste: 'medio',
    variedad: '',
    descafeinado: false,
    sistemaCapsula: 'Dolce Gusto',
    imgId: null, // Will try to derive
    sku: 'R-fprod1280761',
  },
  {
    id: 'carrefour_capsulas_descaf_dg_30',
    nombre: 'Café cápsulas descafeinado al agua Carrefour Extra Dolce Gusto 30 uds',
    formato: 'capsules',
    format: 'capsules',
    tipoProducto: 'capsulas',
    cantidad: 210,
    precio: 6.45,
    tueste: 'medio',
    variedad: '',
    descafeinado: true,
    sistemaCapsula: 'Dolce Gusto',
    imgId: null,
    sku: 'R-fprod1280762',
  },
  {
    id: 'carrefour_capsulas_descaf_dg_16',
    nombre: 'Café cápsulas descafeinado al agua Carrefour Extra Dolce Gusto 16 uds',
    formato: 'capsules',
    format: 'capsules',
    tipoProducto: 'capsulas',
    cantidad: 112,
    precio: 3.51,
    tueste: 'medio',
    variedad: '',
    descafeinado: true,
    sistemaCapsula: 'Dolce Gusto',
    imgId: null,
    sku: 'R-fprod1280742',
  },
  {
    id: 'carrefour_soluble_colombia_100',
    nombre: 'Café Colombia soluble liofilizado Carrefour Extra 100 g',
    formato: 'instant',
    format: 'instant',
    tipoProducto: 'cafe soluble',
    cantidad: 100,
    precio: 3.99,
    tueste: 'medio',
    variedad: 'Arábica',
    descafeinado: false,
    sistemaCapsula: '',
    pais: 'Colombia',
    imgId: null,
    sku: 'R-VC4AECOMM-676925',
  },
  {
    id: 'carrefour_capsulas_descaf_nesp_50',
    nombre: 'Café descafeinado en cápsulas Carrefour Extra compatible con Nespresso 50 uds',
    formato: 'capsules',
    format: 'capsules',
    tipoProducto: 'capsulas',
    cantidad: 260,
    precio: 9.25,
    tueste: 'medio',
    variedad: '',
    descafeinado: true,
    sistemaCapsula: 'Nespresso',
    imgId: null,
    sku: 'R-540202030',
  },
  {
    id: 'carrefour_grano_descaf_1kg',
    nombre: 'Café en grano descafeinado Carrefour Classic 1 kg',
    formato: 'beans',
    format: 'beans',
    tipoProducto: 'cafe en grano',
    cantidad: 1000,
    precio: 12.49,
    tueste: 'medio',
    variedad: '',
    descafeinado: true,
    sistemaCapsula: '',
    imgId: null,
    sku: 'R-VC4AECOMM-675388',
  },
  {
    id: 'carrefour_capsulas_extrafuerte_dg_16',
    nombre: 'Café cápsulas extrafuerte Carrefour Extra compatible con Dolce Gusto 16 uds',
    formato: 'capsules',
    format: 'capsules',
    tipoProducto: 'capsulas',
    cantidad: 112,
    precio: 3.55,
    tueste: 'oscuro',
    variedad: '',
    descafeinado: false,
    sistemaCapsula: 'Dolce Gusto',
    imgId: null,
    sku: 'R-VC4AECOMM-675365',
  },
];

// ======================== AUCHAN (from Open Food Facts - sold in Spain) ========================
const auchanProducts = [
  {
    id: 'auchan_tradition_250',
    ean: '3245678169032',
    nombre: 'AUCHAN Café molido Tradición 250 g',
    formato: 'ground',
    format: 'ground',
    tipoProducto: 'cafe molido',
    cantidad: 250,
    precio: null,
    tueste: 'medio',
    variedad: '',
    descafeinado: false,
    offImg: 'https://images.openfoodfacts.org/images/products/324/567/816/9032/front_en.32.400.jpg',
  },
  {
    id: 'auchan_espresso_intense_dg',
    ean: '3245678151648',
    nombre: 'AUCHAN Espresso Intense cápsulas Dolce Gusto 30 uds',
    formato: 'capsules',
    format: 'capsules',
    tipoProducto: 'capsulas',
    cantidad: 210,
    precio: null,
    tueste: 'oscuro',
    variedad: '',
    descafeinado: false,
    sistemaCapsula: 'Dolce Gusto',
    offImg: 'https://images.openfoodfacts.org/images/products/324/567/815/1648/front_fr.51.400.jpg',
  },
  {
    id: 'auchan_fortissimo_nesp',
    ean: '3245678093870',
    nombre: 'AUCHAN Fortissimo cápsulas aluminio Nespresso 10 uds',
    formato: 'capsules',
    format: 'capsules',
    tipoProducto: 'capsulas',
    cantidad: 52,
    precio: null,
    tueste: 'oscuro',
    variedad: '',
    descafeinado: false,
    sistemaCapsula: 'Nespresso',
    offImg: 'https://images.openfoodfacts.org/images/products/324/567/809/3870/front_fr.68.400.jpg',
  },
  {
    id: 'auchan_soluble_colombia',
    ean: '8411010206702',
    nombre: 'AUCHAN Café soluble Colombia 100 g',
    formato: 'instant',
    format: 'instant',
    tipoProducto: 'cafe soluble',
    cantidad: 100,
    precio: null,
    tueste: 'medio',
    variedad: 'Arábica',
    descafeinado: false,
    pais: 'Colombia',
    offImg: 'https://images.openfoodfacts.org/images/products/841/101/020/6702/front_es.3.400.jpg',
  },
  {
    id: 'auchan_descaf_nesp_20',
    ean: '3245678093764',
    nombre: 'AUCHAN Espresso Descafeinado cápsulas Nespresso 20 uds',
    formato: 'capsules',
    format: 'capsules',
    tipoProducto: 'capsulas',
    cantidad: 104,
    precio: null,
    tueste: 'medio',
    variedad: '',
    descafeinado: true,
    sistemaCapsula: 'Nespresso',
    offImg: 'https://images.openfoodfacts.org/images/products/324/567/809/3764/front_en.24.400.jpg',
  },
  {
    id: 'auchan_100_arabica_espresso_250',
    ean: '3245678169100',
    nombre: 'AUCHAN 100% Arábica Espresso molido 250 g',
    formato: 'ground',
    format: 'ground',
    tipoProducto: 'cafe molido',
    cantidad: 250,
    precio: null,
    tueste: 'medio-oscuro',
    variedad: 'Arábica',
    descafeinado: false,
    offImg: 'https://images.openfoodfacts.org/images/products/324/567/816/9100/front_fr.17.400.jpg',
  },
  {
    id: 'auchan_clasico_soluble_200',
    ean: '8431610021734',
    nombre: 'AUCHAN Clásico café soluble 200 g',
    formato: 'instant',
    format: 'instant',
    tipoProducto: 'cafe soluble',
    cantidad: 200,
    precio: null,
    tueste: 'medio',
    variedad: '',
    descafeinado: false,
    offImg: 'https://images.openfoodfacts.org/images/products/843/161/002/1734/front_es.3.400.jpg',
  },
  {
    id: 'auchan_cafe_descafeinado',
    ean: '8431610021697',
    nombre: 'AUCHAN Café descafeinado molido 250 g',
    formato: 'ground',
    format: 'ground',
    tipoProducto: 'cafe molido',
    cantidad: 250,
    precio: null,
    tueste: 'medio',
    variedad: '',
    descafeinado: true,
    offImg: 'https://images.openfoodfacts.org/images/products/843/161/002/1697/front_es.3.400.jpg',
  },
  {
    id: 'auchan_classic_soluble_50',
    ean: '3245678115527',
    nombre: 'AUCHAN Classic café soluble 50 g',
    formato: 'instant',
    format: 'instant',
    tipoProducto: 'cafe soluble',
    cantidad: 50,
    precio: null,
    tueste: 'medio',
    variedad: '',
    descafeinado: false,
    offImg: 'https://images.openfoodfacts.org/images/products/324/567/811/5527/front_fr.26.400.jpg',
  },
  {
    id: 'auchan_bio_honduras_molido_250',
    ean: '3245677722085',
    nombre: 'AUCHAN Bio Café Honduras molido ecológico 250 g',
    formato: 'ground',
    format: 'ground',
    tipoProducto: 'cafe molido',
    cantidad: 250,
    precio: null,
    tueste: 'medio',
    variedad: 'Arábica',
    descafeinado: false,
    pais: 'Honduras',
    isBio: true,
    certificaciones: 'Ecológico',
    offImg: 'https://images.openfoodfacts.org/images/products/324/567/772/2085/front_en.18.400.jpg',
  },
  {
    id: 'auchan_bio_100_arabica_1kg',
    ean: '3245678168905',
    nombre: 'AUCHAN Bio 100% Arábica en grano ecológico 1 kg',
    formato: 'beans',
    format: 'beans',
    tipoProducto: 'cafe en grano',
    cantidad: 1000,
    precio: null,
    tueste: 'medio',
    variedad: 'Arábica',
    descafeinado: false,
    isBio: true,
    certificaciones: 'Ecológico',
    offImg: 'https://images.openfoodfacts.org/images/products/324/567/816/8905/front_en.16.400.jpg',
  },
  {
    id: 'auchan_bio_mexico_nesp',
    ean: '3245677722092',
    nombre: 'AUCHAN Bio Café México cápsulas Nespresso ecológico 10 uds',
    formato: 'capsules',
    format: 'capsules',
    tipoProducto: 'capsulas',
    cantidad: 52,
    precio: null,
    tueste: 'medio',
    variedad: 'Arábica',
    descafeinado: false,
    pais: 'México',
    sistemaCapsula: 'Nespresso',
    isBio: true,
    certificaciones: 'Ecológico',
    offImg: 'https://images.openfoodfacts.org/images/products/324/567/772/2092/front_en.20.400.jpg',
  },
  {
    id: 'auchan_gourmet_bresil_250',
    ean: '3245678169315',
    nombre: 'AUCHAN Gourmet Brasil molido 250 g',
    formato: 'ground',
    format: 'ground',
    tipoProducto: 'cafe molido',
    cantidad: 250,
    precio: null,
    tueste: 'medio',
    variedad: 'Arábica',
    descafeinado: false,
    pais: 'Brasil',
    offImg: 'https://images.openfoodfacts.org/images/products/324/567/816/9315/front_en.27.400.jpg',
  },
  {
    id: 'auchan_gourmet_ethiopie_250',
    ean: '3245678169391',
    nombre: 'AUCHAN Gourmet Etiopía molido 250 g',
    formato: 'ground',
    format: 'ground',
    tipoProducto: 'cafe molido',
    cantidad: 250,
    precio: null,
    tueste: 'medio',
    variedad: 'Arábica',
    descafeinado: false,
    pais: 'Etiopía',
    offImg: 'https://images.openfoodfacts.org/images/products/324/567/816/9391/front_en.26.400.jpg',
  },
  {
    id: 'auchan_gourmet_colombia_250',
    ean: '3245678169353',
    nombre: 'AUCHAN Gourmet Colombia molido 250 g',
    formato: 'ground',
    format: 'ground',
    tipoProducto: 'cafe molido',
    cantidad: 250,
    precio: null,
    tueste: 'medio',
    variedad: 'Arábica',
    descafeinado: false,
    pais: 'Colombia',
    offImg: 'https://images.openfoodfacts.org/images/products/324/567/816/9353/front_en.14.400.jpg',
  },
  {
    id: 'auchan_gourmet_burundi_250',
    ean: '3245678169445',
    nombre: 'AUCHAN Gourmet Burundi molido 250 g',
    formato: 'ground',
    format: 'ground',
    tipoProducto: 'cafe molido',
    cantidad: 250,
    precio: null,
    tueste: 'medio',
    variedad: 'Arábica',
    descafeinado: false,
    pais: 'Burundi',
    offImg: 'https://images.openfoodfacts.org/images/products/324/567/816/9445/front_en.22.400.jpg',
  },
];

async function processAndUpload(docId, imageUrl) {
  try {
    const resp = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 15000,
    });
    if (!resp.ok) {
      console.log(`    ❌ HTTP ${resp.status} for ${imageUrl.substring(0, 60)}`);
      return null;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 2000) {
      console.log(`    ❌ Too small (${buf.length}b)`);
      return null;
    }
    const processed = await sharp(buf)
      .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();
    const path = `cafe-photos-nobg/${docId}.png`;
    const file = bucket.file(path);
    try {
      await file.delete();
    } catch {}
    await file.save(processed, {
      contentType: 'image/png',
      metadata: { cacheControl: 'public, max-age=60' },
      public: true,
      resumable: false,
    });
    return `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${path}`;
  } catch (err) {
    console.log(`    ❌ ${err.message}`);
    return null;
  }
}

function buildDoc(p, marca, fuente, photoUrl) {
  return {
    fuente,
    fuentePais: 'ES',
    nombre: p.nombre,
    name: p.nombre,
    marca,
    roaster: marca,
    ean: p.ean || '',
    normalizedEan: p.ean || '',
    sku: p.sku || '',
    mpn: '',
    descripcion: p.nombre,
    description: p.nombre,
    category: 'daily',
    coffeeCategory: 'daily',
    isSpecialty: false,
    legacy: false,
    formato: p.formato,
    format: p.format,
    sistemaCapsula: p.sistemaCapsula || '',
    tipoProducto: p.tipoProducto,
    cantidad: p.cantidad,
    intensidad: p.intensidad || null,
    tueste: p.tueste || 'medio',
    roastLevel: p.tueste || 'medio',
    variedad: p.variedad || '',
    pais: p.pais || '',
    origen: p.pais || '',
    proceso: '',
    notas: '',
    notes: '',
    decaf: p.descafeinado || false,
    precio: p.precio,
    currency: 'EUR',
    certificaciones: p.certificaciones || '',
    isBio: p.isBio || false,
    inStock: true,
    fecha: NOW,
    puntuacion: 0,
    votos: 0,
    fotoUrl: photoUrl || '',
    officialPhoto: photoUrl || '',
    bestPhoto: photoUrl || '',
    imageUrl: photoUrl || '',
    imagenUrl: photoUrl || '',
    foto: photoUrl || '',
    photos: photoUrl ? { selected: photoUrl, original: photoUrl, bgRemoved: photoUrl } : {},
    status: 'approved',
    reviewStatus: 'approved',
    provisional: false,
    appVisible: true,
    scannerVisible: true,
    adminReviewedAt: NOW,
    updatedAt: NOW,
    approvedAt: NOW,
    createdAt: NOW,
    importMeta: {
      importedAt: NOW,
      sourceType: fuente,
    },
  };
}

async function main() {
  let okCarrefour = 0,
    okAuchan = 0,
    failCarrefour = 0,
    failAuchan = 0;

  // ======================== CARREFOUR ========================
  console.log('=== CARREFOUR ===');
  for (const p of carrefourProducts) {
    // Check if already exists
    const existing = await db.collection('cafes').doc(p.id).get();
    if (existing.exists) {
      console.log(`  ⏭ ${p.id} already exists`);
      continue;
    }

    let photoUrl = null;
    if (p.imgId) {
      // Try high-res first, then standard
      const hiRes = `https://static.carrefour.es/hd_1280x_/img_pim_food/${p.imgId}.jpg`;
      const stdRes = `https://static.carrefour.es/hd_510x_/img_pim_food/${p.imgId}.jpg`;
      photoUrl = await processAndUpload(p.id, hiRes);
      if (!photoUrl) photoUrl = await processAndUpload(p.id, stdRes);
    }

    if (!photoUrl) {
      // Try to scrape product page for image
      try {
        const pageUrl = `https://www.carrefour.es/supermercado/${p.sku}/p`;
        // We'll skip image for now if not available
        console.log(`    ⚠ No image for ${p.id}`);
      } catch {}
    }

    const doc = buildDoc(p, 'Carrefour', 'carrefour', photoUrl);
    await db.collection('cafes').doc(p.id).set(doc);
    console.log(`  ✅ ${p.id} ${photoUrl ? '(with photo)' : '(no photo)'}`);
    okCarrefour++;
  }

  // ======================== AUCHAN ========================
  console.log('\n=== AUCHAN ===');
  for (const p of auchanProducts) {
    const existing = await db.collection('cafes').doc(p.id).get();
    if (existing.exists) {
      console.log(`  ⏭ ${p.id} already exists`);
      continue;
    }

    let photoUrl = null;
    if (p.offImg) {
      photoUrl = await processAndUpload(p.id, p.offImg);
    }

    const doc = buildDoc(p, 'AUCHAN', 'alcampo', photoUrl);
    await db.collection('cafes').doc(p.id).set(doc);
    console.log(`  ✅ ${p.id} ${photoUrl ? '(with photo)' : '(no photo)'}`);
    okAuchan++;
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Carrefour: ${okCarrefour} added`);
  console.log(`AUCHAN: ${okAuchan} added`);
  console.log(`Total: ${okCarrefour + okAuchan} new cafes`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
