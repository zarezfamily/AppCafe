/*
  Updates existing Nomad cafés in Firestore with missing fields (variedad, proceso, pais, altura, notas, etc.)
  scraped from nomadcoffee.es product pages.

  Uso:
    DRY_RUN=true node --env-file=.env scripts/update_nomad_fields.js
    node --env-file=.env scripts/update_nomad_fields.js
*/

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
let FIREBASE_AUTH_TOKEN = process.env.FIREBASE_AUTH_TOKEN || process.env.TOKEN || '';
const DRY_RUN = String(process.env.DRY_RUN || 'true').toLowerCase() === 'true';

if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
  console.error('Faltan FIREBASE_PROJECT_ID y/o FIREBASE_API_KEY');
  process.exit(1);
}

async function autoLogin() {
  if (FIREBASE_AUTH_TOKEN) return;
  const email = `etiove.import.${Date.now()}@example.com`;
  const password = `E${Date.now()}aA123456`;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ios-Bundle-Identifier': 'com.zarezfamily.etiove',
      },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const json = await res.json();
  if (!res.ok || !json.idToken)
    throw new Error(`Auth failed: ${json?.error?.message || res.status}`);
  FIREBASE_AUTH_TOKEN = json.idToken;
  console.log(`  Auto-login OK (${email})`);
}

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// Data scraped from nomadcoffee.es product pages on 2026-04-24
const NOMAD_UPDATES = [
  {
    id: 'nomad_e-co-cha',
    pais: 'Colombia',
    origen: 'Colombia',
    origin: 'Colombia',
    variedad: 'Castillo, Caturra',
    variety: 'Castillo, Caturra',
    altura: 1525,
    altitude: 1525,
    proceso: 'Lavado',
    process: 'Washed',
    notas: 'Chocolate con leche, panela, nueces de California',
    notes: 'Milk chocolate, panela, California walnuts',
    preparacion: 'Espresso',
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/E.CO.CHA.jpg?v=1769080405',
  },
  {
    id: 'nomad_e-et-hamb',
    pais: 'Etiopía',
    origen: 'Etiopía',
    origin: 'Ethiopia',
    variedad: 'Heirloom',
    variety: 'Heirloom',
    altura: 2300,
    altitude: 2300,
    proceso: 'Natural',
    process: 'Natural',
    notas: 'Cacao nibs, cereza, arándanos',
    notes: 'Cacao nibs, cherry, blueberries',
    preparacion: 'Espresso',
    officialPhoto:
      'https://nomadcoffee.es/cdn/shop/files/E.ET.HAMB_5713c2a2-b4b7-475f-84d6-b089ecf0ab30.jpg?v=1768555727',
  },
  {
    id: 'nomad_e-pe-timb',
    pais: 'Perú',
    origen: 'Perú',
    origin: 'Peru',
    variedad: 'Bourbon de Colasay',
    variety: 'Bourbon de Colasay',
    altura: 1620,
    altitude: 1620,
    proceso: 'Lavado',
    process: 'Washed',
    notas: 'Nueces, ciruela amarilla, toffee',
    notes: 'Walnuts, yellow plum, toffee',
    preparacion: 'Espresso',
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/E.PE.TIMB.jpg?v=1770641109',
  },
  {
    id: 'nomad_d-co-dcf',
    pais: 'Colombia',
    origen: 'Colombia',
    origin: 'Colombia',
    variedad: 'Castillo',
    variety: 'Castillo',
    altura: 1550,
    altitude: 1550,
    proceso: 'Lavado',
    process: 'Washed',
    notas: 'Chocolate 80%, azúcar moscovado, manzana golden',
    notes: 'Dark chocolate 80%, muscovado sugar, golden apple',
    preparacion: 'Espresso',
    decaf: true,
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/decaff.jpg?v=1705484759',
  },
  {
    id: 'nomad_e-cr-espe',
    pais: 'Costa Rica',
    origen: 'Costa Rica',
    origin: 'Costa Rica',
    variedad: 'Esperanza (Sarchimor T5296 x Etíope 25)',
    variety: 'Esperanza',
    altura: 1300,
    altitude: 1300,
    proceso: 'Honey',
    process: 'Honey',
    notas: 'Cacao en polvo, higos, nueces de California',
    notes: 'Cocoa powder, figs, California walnuts',
    preparacion: 'Espresso',
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/E.CR.ESPE_copy.webp?v=1775637798',
  },
  {
    id: 'nomad_e-et-samu',
    pais: 'Etiopía',
    origen: 'Etiopía',
    origin: 'Ethiopia',
    variedad: 'Variedades Locales',
    variety: 'Local Varieties',
    altura: 2380,
    altitude: 2380,
    proceso: 'Natural',
    process: 'Natural',
    notas: 'Naranja confitada, chocolate 70%, ciruela negra',
    notes: 'Candied orange, 70% chocolate, black plum',
    preparacion: 'Espresso',
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/E.ET.SAMU.webp?v=1773747761',
  },
  {
    id: 'nomad_e-sa-para',
    pais: 'El Salvador',
    origen: 'El Salvador',
    origin: 'El Salvador',
    variedad: 'Parainema',
    variety: 'Parainema',
    altura: 1325,
    altitude: 1325,
    proceso: 'Natural',
    process: 'Natural',
    notas: 'Frambuesa, chocolate con leche, cereza',
    notes: 'Raspberry, milk chocolate, cherry',
    preparacion: 'Espresso',
    officialPhoto:
      'https://nomadcoffee.es/cdn/shop/files/E.SA.PARA_d2a8cc3a-7814-4327-9485-1f2d216d1e39.jpg?v=1763639580',
  },
  {
    id: 'nomad_e-et-boch',
    pais: 'Etiopía',
    origen: 'Etiopía',
    origin: 'Ethiopia',
    variedad: '74110, 74112',
    variety: '74110, 74112',
    altura: 2050,
    altitude: 2050,
    proceso: 'Lavado',
    process: 'Washed',
    notas: 'Nectarina, mandarina, miel',
    notes: 'Nectarine, tangerine, honey',
    preparacion: 'Espresso',
    officialPhoto:
      'https://nomadcoffee.es/cdn/shop/files/E.ET.BOCH_ac043c45-aefd-44a4-848a-eb4246c0e448.jpg?v=1752669156',
  },
  {
    id: 'nomad_e-ke-kii1',
    pais: 'Kenia',
    origen: 'Kenia',
    origin: 'Kenya',
    variedad: 'SL-28, SL-34, Batian, Ruiru-11',
    variety: 'SL-28, SL-34, Batian, Ruiru-11',
    altura: 1600,
    altitude: 1600,
    proceso: 'Lavado',
    process: 'Washed',
    notas: 'Orejones, kiwi, piña',
    notes: 'Dried apricots, kiwi, pineapple',
    preparacion: 'Espresso',
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/E.KE.KII_1.jpg?v=1762255472',
  },
  {
    id: 'nomad_e-sa-paca',
    pais: 'El Salvador',
    origen: 'El Salvador',
    origin: 'El Salvador',
    variedad: 'Pacas',
    variety: 'Pacas',
    altura: 1275,
    altitude: 1275,
    proceso: 'Natural',
    process: 'Natural',
    notas: 'Almendra garrapiñada, canela, dátiles',
    notes: 'Candied almond, cinnamon, dates',
    preparacion: 'Espresso',
    officialPhoto:
      'https://nomadcoffee.es/cdn/shop/files/E.SA.PACA_1ed98b2f-7cf7-490a-94a2-561c254661f5.jpg?v=1768905660',
  },
  {
    id: 'nomad_f-et-ham',
    pais: 'Etiopía',
    origen: 'Etiopía',
    origin: 'Ethiopia',
    variedad: 'Heirloom',
    variety: 'Heirloom',
    altura: 2300,
    altitude: 2300,
    proceso: 'Natural',
    process: 'Natural',
    notas: 'Cacao nibs, cereza, arándanos',
    notes: 'Cacao nibs, cherry, blueberries',
    preparacion: 'Filtro',
    officialPhoto:
      'https://nomadcoffee.es/cdn/shop/files/F.ET.HAMB_1ebf78c2-943a-48ec-bccb-10e52b39d3df.jpg?v=1768555725',
  },
  {
    id: 'nomad_f-pe-timb',
    pais: 'Perú',
    origen: 'Perú',
    origin: 'Peru',
    variedad: 'Bourbon de Colasay',
    variety: 'Bourbon de Colasay',
    altura: 1620,
    altitude: 1620,
    proceso: 'Lavado',
    process: 'Washed',
    notas: 'Nueces, ciruela amarilla, toffee',
    notes: 'Walnuts, yellow plum, toffee',
    preparacion: 'Filtro',
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/F.PE.TIMB.jpg?v=1770641792',
  },
  {
    id: 'nomad_f-ke-kii2',
    pais: 'Kenia',
    origen: 'Kenia',
    origin: 'Kenya',
    variedad: 'SL-28, SL-34, Batian, Ruiru-11',
    variety: 'SL-28, SL-34, Batian, Ruiru-11',
    altura: 1600,
    altitude: 1600,
    proceso: 'Lavado',
    process: 'Washed',
    notas: 'Té blanco, paraguayo, limón confitado',
    notes: 'White tea, flat peach, candied lemon',
    preparacion: 'Filtro',
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/F.KE.KII_2.webp?v=1772815500',
  },
  {
    id: 'nomad_f-ke-kath',
    pais: 'Kenia',
    origen: 'Kenia',
    origin: 'Kenya',
    variedad: 'SL28, SL34, Ruiru 11, Batian',
    variety: 'SL28, SL34, Ruiru 11, Batian',
    altura: 1700,
    altitude: 1700,
    proceso: 'Lavado',
    process: 'Washed',
    notas: 'Yuzu, kiwi amarillo, orejones',
    notes: 'Yuzu, yellow kiwi, dried apricots',
    preparacion: 'Filtro',
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/F.KE.KATH.jpg?v=1769431232',
  },
  {
    id: 'nomad_f-sa-pama',
    pais: 'El Salvador',
    origen: 'El Salvador',
    origin: 'El Salvador',
    variedad: 'Pacamara',
    variety: 'Pacamara',
    altura: 1325,
    altitude: 1325,
    proceso: 'Semi-lavado',
    process: 'Semi-washed',
    notas: 'Kaki, miel de naranjo, dulce de leche',
    notes: 'Persimmon, orange blossom honey, dulce de leche',
    preparacion: 'Filtro',
    officialPhoto:
      'https://nomadcoffee.es/cdn/shop/files/F.SA.PAMA_831f808e-7377-4926-8406-447c8cecf451.jpg?v=1768908536',
  },
  {
    id: 'nomad_f-et-abeb',
    pais: 'Etiopía',
    origen: 'Etiopía',
    origin: 'Ethiopia',
    variedad: 'JARC 74110',
    variety: 'JARC 74110',
    altura: 2112,
    altitude: 2112,
    proceso: 'Natural',
    process: 'Natural',
    notas: 'Pera, manzanilla, níspero',
    notes: 'Pear, chamomile, loquat',
    preparacion: 'Filtro',
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/F.ET.ABEB.jpg?v=1762249807',
  },
  {
    id: 'nomad_f-ke-math',
    pais: 'Kenia',
    origen: 'Kenia',
    origin: 'Kenya',
    variedad: 'Heirloom',
    variety: 'Heirloom',
    altura: 1700,
    altitude: 1700,
    proceso: 'Lavado',
    process: 'Washed',
    notas: 'Ciruela amarilla, flor de jamaica, miel',
    notes: 'Yellow plum, hibiscus, honey',
    preparacion: 'Filtro',
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/F.KE.MATH.jpg?v=1760612072',
  },
  {
    id: 'nomad_f-bu-gah',
    pais: 'Burundi',
    origen: 'Burundi',
    origin: 'Burundi',
    variedad: 'Red Bourbon',
    variety: 'Red Bourbon',
    altura: 1800,
    altitude: 1800,
    proceso: 'Lavado',
    process: 'Washed',
    notas: 'Floral, mandarina, piña asada',
    notes: 'Floral, tangerine, roasted pineapple',
    preparacion: 'Filtro',
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/F.BU.GAH.jpg?v=1733833628',
  },
  {
    id: 'nomad_c-co-geshafellow',
    pais: 'Colombia',
    origen: 'Colombia',
    origin: 'Colombia',
    variedad: 'Gesha',
    variety: 'Gesha',
    altura: 1850,
    altitude: 1850,
    proceso: 'Lavado',
    process: 'Washed',
    notas: 'Rosas, lychee, naranja confitada',
    notes: 'Roses, lychee, candied orange',
    preparacion: 'Filtro',
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/C.CO.GESHAFELLOW.webp?v=1774633303',
  },
  {
    id: 'nomad_c-co-chir',
    pais: 'Colombia',
    origen: 'Colombia',
    origin: 'Colombia',
    variedad: 'Chiroso',
    variety: 'Chiroso',
    altura: 1750,
    altitude: 1750,
    proceso: 'Lavado',
    process: 'Washed',
    notas: 'Miel de romero, caramelo de limón, hierbaluisa',
    notes: 'Rosemary honey, lemon caramel, lemongrass',
    preparacion: 'Filtro',
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/C.CO.CHIR.webp?v=1772611854',
  },
  {
    id: 'nomad_c-co-sidr',
    pais: 'Colombia',
    origen: 'Colombia',
    origin: 'Colombia',
    variedad: 'Bourbon Sidra',
    variety: 'Bourbon Sidra',
    altura: 1750,
    altitude: 1750,
    proceso: 'Natural',
    process: 'Natural',
    notas: 'Cacao nibs, lychee, piña',
    notes: 'Cacao nibs, lychee, pineapple',
    preparacion: 'Filtro',
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/sidra_web.jpg?v=1761045539',
  },
  {
    id: 'nomad_c-co-aji',
    pais: 'Colombia',
    origen: 'Colombia',
    origin: 'Colombia',
    variedad: 'Bourbon Ají',
    variety: 'Bourbon Ají',
    altura: 1750,
    altitude: 1750,
    proceso: 'Lavado',
    process: 'Washed',
    notas: 'Uva moscatel, manteca de cacao, hierbaluisa',
    notes: 'Muscat grape, cocoa butter, lemongrass',
    preparacion: 'Filtro',
    officialPhoto: 'https://nomadcoffee.es/cdn/shop/files/C.CO.AJI.jpg?v=1763043742',
  },
];

async function findCafeByCustomId(customId) {
  const url = `${BASE_URL}/cafes?key=${FIREBASE_API_KEY}`;
  // Use structured query to find by id field
  const queryUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'cafes' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'importMeta.sourceType' },
          op: 'EQUAL',
          value: { stringValue: 'nomad' },
        },
      },
      limit: 1500,
    },
  };

  const res = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FIREBASE_AUTH_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Query failed: ${res.status} ${text}`);
  }

  const results = await res.json();
  return results
    .filter((r) => r.document)
    .map((r) => {
      const fields = r.document.fields || {};
      const docPath = r.document.name;
      const docId = docPath.split('/').pop();
      return { docId, fields, name: docPath };
    });
}

function extractStringField(fields, key) {
  return fields[key]?.stringValue || '';
}

async function updateDoc(docId, data) {
  const fields = {};
  const masks = [];
  for (const [key, value] of Object.entries(data)) {
    masks.push(key);
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: String(value) };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else {
      fields[key] = { stringValue: String(value || '') };
    }
  }

  const maskParam = masks.map((m) => `updateMask.fieldPaths=${m}`).join('&');
  const url = `${BASE_URL}/cafes/${docId}?${maskParam}&key=${FIREBASE_API_KEY}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FIREBASE_AUTH_TOKEN}`,
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update ${docId} failed: ${res.status} ${text}`);
  }
}

(async () => {
  console.log(`\n☕ Nomad fields update (${DRY_RUN ? 'DRY RUN' : 'APPLY MODE'})\n`);

  await autoLogin();

  // Fetch all Nomad cafés from Firestore
  console.log('Fetching Nomad cafés from Firestore...');
  const allNomadDocs = await findCafeByCustomId();
  console.log(`  Found ${allNomadDocs.length} Nomad docs in Firestore\n`);

  // Build a lookup: nombre -> docId
  const lookup = new Map();
  for (const doc of allNomadDocs) {
    const nombre = extractStringField(doc.fields, 'nombre');
    const sku = extractStringField(doc.fields, 'sku');
    // Use lowercase nombre as key for matching
    if (nombre) lookup.set(nombre.toLowerCase(), doc);
    if (sku) lookup.set(sku.toLowerCase(), doc);
  }

  let updated = 0;
  let skipped = 0;

  for (const update of NOMAD_UPDATES) {
    const idSuffix = update.id.replace('nomad_', '').toUpperCase().replace(/-/g, '.');
    const nombre = update.notas ? update.id : '';

    // Try matching by SKU-like pattern or nombre
    let doc = lookup.get(idSuffix.toLowerCase());
    if (!doc) {
      // Try by nombre from the existing data
      for (const [_key, d] of lookup) {
        const docNombre = extractStringField(d.fields, 'nombre');
        const docSku = extractStringField(d.fields, 'sku');
        if (docSku && update.id.includes(docSku.toLowerCase().replace(/\./g, '-'))) {
          doc = d;
          break;
        }
        // Match by nombre from update data
        const updateNombre = update.notas.split(',')[0]; // rough
        if (docNombre && docNombre.toLowerCase() === updateNombre?.toLowerCase()) {
          doc = d;
          break;
        }
      }
    }

    if (!doc) {
      // Fallback: search by the update ID pattern
      const parts = update.id.replace('nomad_', '').split('-');
      const skuCandidate = parts.map((p) => p.toUpperCase()).join('.');
      doc = lookup.get(skuCandidate.toLowerCase());
    }

    // If still not found, just use update.id as the Firestore doc id directly
    if (!doc) {
      console.log(`  ⚠ No match for ${update.id} — will use as doc ID`);
      doc = { docId: update.id };
    }

    const docId = doc.docId;
    const { id: _id, ...fieldsToUpdate } = update;

    // Build photos object
    if (fieldsToUpdate.officialPhoto) {
      fieldsToUpdate.bestPhoto = fieldsToUpdate.officialPhoto;
      fieldsToUpdate.foto = fieldsToUpdate.officialPhoto;
      fieldsToUpdate.imageUrl = fieldsToUpdate.officialPhoto;
    }

    fieldsToUpdate.updatedAt = new Date().toISOString();

    const nombreLabel = extractStringField(doc.fields || {}, 'nombre') || update.id;
    console.log(
      `  ${DRY_RUN ? '[DRY]' : '  ✓ '} ${nombreLabel} → ${Object.keys(fieldsToUpdate).length} fields`
    );

    if (!DRY_RUN) {
      await updateDoc(docId, fieldsToUpdate);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped/DryRun: ${skipped}`);
  if (DRY_RUN) console.log('ℹ️  Use without DRY_RUN to apply.');
})();
