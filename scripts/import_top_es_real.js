/*
  Importa cafes reales del mercado espanol desde Open Food Facts
  y los guarda en Firestore para que aparezcan en la app.

  Nota: Open Food Facts no publica ventas exactas. Usamos un proxy de popularidad
  (unique_scans_n / popularity_key) para aproximar los mas vendidos.

  Uso:
    FIREBASE_PROJECT_ID=miappdecafe \
    FIREBASE_API_KEY=AIza... \
    FIREBASE_AUTH_TOKEN=eyJ... \
    node scripts/import_top_es_real.js

  Variables opcionales:
    IMPORT_LIMIT=100
    DRY_RUN=true
*/

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const FIREBASE_AUTH_TOKEN = process.env.FIREBASE_AUTH_TOKEN || process.env.TOKEN || '';

const IMPORT_LIMIT = Math.max(1, Math.min(Number(process.env.IMPORT_LIMIT || 100), 100));
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
  console.error('Faltan FIREBASE_PROJECT_ID y/o FIREBASE_API_KEY en variables de entorno.');
  process.exit(1);
}

if (!DRY_RUN && !FIREBASE_AUTH_TOKEN) {
  console.error('Falta FIREBASE_AUTH_TOKEN para escribir en Firestore (usa DRY_RUN=true para solo previsualizar).');
  process.exit(1);
}

const BASE_URL = `https://europe-west1-firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const toFirestoreValue = (val) => {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'boolean') return { booleanValue: val };
  return { stringValue: String(val) };
};

const toFields = (obj) => {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return { fields };
};

const normalize = (s) => String(s || '').toLowerCase();

const looksLikeCoffee = (p) => {
  const text = [
    p.product_name,
    p.product_name_es,
    p.brands,
    p.categories,
    p.categories_tags?.join(' '),
  ].join(' ');
  const t = normalize(text);
  return t.includes('cafe') || t.includes('caf') || t.includes('coffee') || t.includes('nescafe');
};

const scoreProduct = (p) => {
  const scans = Number(p.unique_scans_n || 0);
  const popularity = Number(String(p.popularity_key || 0).replace(/[^0-9.-]/g, ''));
  return scans * 100000 + popularity;
};

const toCafeDoc = (product, idx) => {
  const scans = Number(product.unique_scans_n || 0);
  const nombreBase = (product.product_name_es || product.product_name || '').trim();
  const brand = (product.brands || '').split(',')[0]?.trim();
  const nombre = [nombreBase, brand].filter(Boolean).join(' - ');

  const rankBoost = Math.max(0, 5 - Math.floor(idx / 20));
  const puntuacion = Math.min(5, Math.max(3, 3 + rankBoost));

  return {
    nombre: nombre || `Cafe comercial #${idx + 1}`,
    pais: 'Espana',
    region: 'Mercado retail',
    finca: 'N/A',
    productor: brand || 'N/A',
    altura: null,
    variedad: 'Blend comercial',
    proceso: 'Industrial',
    secado: null,
    tueste: 'Medio',
    fechaTueste: null,
    notas: 'Producto comercial importado de Open Food Facts',
    acidez: 'Media',
    cuerpo: 'Medio',
    regusto: 'Comercial',
    puntuacion,
    sca: null,
    votos: scans,
    certificaciones: null,
    preparacion: 'Espresso, moka o filtro',
    precio: null,
    foto: product.image_front_url || product.image_url || '',
    uid: 'seed_off_es',
    fecha: new Date(Date.now() - idx * 60000).toISOString(),
    fuente: 'Open Food Facts',
    fuentePais: 'ES',
    barcode: String(product.code || ''),
    popularityKey: String(product.popularity_key || ''),
    uniqueScans: scans,
  };
};

const fetchTopProductsSpain = async (limit) => {
  const url = 'https://world.openfoodfacts.org/api/v2/search' +
    '?categories_tags=coffee' +
    '&countries_tags=spain' +
    '&fields=code,product_name,product_name_es,brands,categories,categories_tags,image_front_url,image_url,unique_scans_n,popularity_key' +
    '&page_size=300';

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Etiove/1.0 (github.com/zarezfamily/etiove)',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Open Food Facts error ${res.status}`);
  }

  const data = await res.json();
  const products = Array.isArray(data.products) ? data.products : [];

  const filtered = products
    .filter((p) => p && looksLikeCoffee(p))
    .filter((p) => (p.image_front_url || p.image_url))
    .filter((p) => (p.product_name || p.product_name_es || '').trim().length > 2)
    .sort((a, b) => scoreProduct(b) - scoreProduct(a))
    .slice(0, limit);

  return filtered;
};

const writeCafe = async (cafeDoc) => {
  const res = await fetch(`${BASE_URL}/cafes?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FIREBASE_AUTH_TOKEN}`,
    },
    body: JSON.stringify(toFields(cafeDoc)),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Firestore ${res.status}: ${txt.slice(0, 200)}`);
  }
};

(async () => {
  try {
    console.log(`Buscando hasta ${IMPORT_LIMIT} cafes reales de Espana...`);
    const products = await fetchTopProductsSpain(IMPORT_LIMIT);

    if (products.length === 0) {
      console.log('No se encontraron productos validos para importar.');
      return;
    }

    const docs = products.map((p, idx) => toCafeDoc(p, idx));

    console.log(`Encontrados ${docs.length} productos.`);
    console.log('Preview top 5:');
    docs.slice(0, 5).forEach((d, i) => {
      console.log(`${i + 1}. ${d.nombre} | votos=${d.votos} | foto=${Boolean(d.foto)}`);
    });

    if (DRY_RUN) {
      console.log('DRY_RUN=true, no se ha escrito nada en Firestore.');
      return;
    }

    let ok = 0;
    for (const doc of docs) {
      try {
        await writeCafe(doc);
        ok += 1;
        console.log(`OK ${ok}/${docs.length}: ${doc.nombre}`);
      } catch (e) {
        console.log(`ERROR: ${doc.nombre} -> ${e.message}`);
      }
    }

    console.log(`Importacion finalizada: ${ok}/${docs.length} guardados.`);
  } catch (e) {
    console.error('Fallo en importacion:', e.message);
    process.exit(1);
  }
})();
