const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

// ─── INFERENCE RULES ───

function inferTipo(nombre) {
  const n = (nombre || '').toLowerCase();
  if (
    /c[aá]psula|nespresso|dolce.?gusto|tassimo|a modo mio|lavazza.*point|ese\b|compostable/i.test(n)
  )
    return 'cápsula';
  if (/molido|ground|moka|filtro/i.test(n)) return 'molido';
  if (/grano|beans|grain|whole/i.test(n)) return 'grano';
  if (/soluble|instant|liofilizado/i.test(n)) return 'soluble';
  if (/monodosis|unidosis|pod|sobre/i.test(n)) return 'monodosis';
  // Default heuristics by context
  if (/1\s*kg|500\s*g|250\s*g/i.test(n)) return 'grano'; // most weight references are grano
  return null;
}

function inferPeso(nombre) {
  const n = (nombre || '').toLowerCase();
  // Try to extract weight patterns
  const m = n.match(/(\d+)\s*x\s*(\d+)\s*(?:g|gr)\b/i);
  if (m) return `${m[1]}x${m[2]}g`;
  const m2 = n.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilo)/i);
  if (m2) return m2[1].replace(',', '.') + 'kg';
  const m3 = n.match(/(\d+)\s*(?:g|gr|gramos)\b/i);
  if (m3) return m3[1] + 'g';
  const m4 = n.match(/(\d+)\s*(?:c[aá]psulas|caps|unidades|uds|monodosis|sobres|pods)/i);
  if (m4) return m4[1] + ' uds';
  return null;
}

function inferPesoGramos(peso) {
  if (!peso) return null;
  const p = peso.toLowerCase();
  const kgMatch = p.match(/([\d.]+)\s*kg/);
  if (kgMatch) return Math.round(parseFloat(kgMatch[1]) * 1000);
  const gMatch = p.match(/(\d+)\s*g/);
  if (gMatch) return parseInt(gMatch[1]);
  return null;
}

const COUNTRY_ORIGINS = {
  colombia: 'Colombia',
  colombiano: 'Colombia',
  nariño: 'Colombia',
  huila: 'Colombia',
  tolima: 'Colombia',
  brasil: 'Brasil',
  brazil: 'Brasil',
  etiopía: 'Etiopía',
  etiopia: 'Etiopía',
  ethiopia: 'Etiopía',
  yirgacheffe: 'Etiopía',
  sidamo: 'Etiopía',
  guatemala: 'Guatemala',
  antigua: 'Guatemala',
  'costa rica': 'Costa Rica',
  tarrazú: 'Costa Rica',
  perú: 'Perú',
  peru: 'Perú',
  kenia: 'Kenia',
  kenya: 'Kenia',
  honduras: 'Honduras',
  nicaragua: 'Nicaragua',
  méxico: 'México',
  mexico: 'México',
  chiapas: 'México',
  indonesia: 'Indonesia',
  sumatra: 'Indonesia',
  java: 'Indonesia',
  india: 'India',
  ruanda: 'Ruanda',
  rwanda: 'Ruanda',
  burundi: 'Burundi',
  tanzania: 'Tanzania',
  jamaica: 'Jamaica',
  panamá: 'Panamá',
  panama: 'Panamá',
  zambia: 'Zambia',
  papúa: 'Papúa Nueva Guinea',
  vietnam: 'Vietnam',
  cuba: 'Cuba',
  bolivia: 'Bolivia',
};

function inferOrigen(nombre) {
  const n = (nombre || '').toLowerCase();
  for (const [key, val] of Object.entries(COUNTRY_ORIGINS)) {
    if (n.includes(key)) return val;
  }
  // Check for "blend"
  if (/blend|mezcla|mix|selección/i.test(n)) return 'Blend';
  return null;
}

const BRAND_COUNTRY = {
  lavazza: 'Italia',
  illy: 'Italia',
  kimbo: 'Italia',
  segafredo: 'Italia',
  pellini: 'Italia',
  gimoka: 'Italia',
  garibaldi: 'Italia',
  'caffè mauro': 'Italia',
  'caffè corsini': 'Italia',
  delonghi: 'Italia',
  vergnano: 'Italia',
  hacendado: 'España',
  marcilla: 'España',
  bonka: 'España',
  nescafé: 'España',
  'cafés baqué': 'España',
  'cafes baqué': 'España',
  novell: 'España',
  catunambu: 'España',
  'cafés la mexicana': 'España',
  'cafe de finca': 'España',
  'cafes candelas': 'España',
  'café dromedario': 'España',
  'cafe fortaleza': 'España',
  'cafés granell': 'España',
  'cafés camuy': 'España',
  mogorttini: 'España',
  kfetea: 'España',
  'cafès pont': 'España',
  'la brasileña': 'España',
  'cafés guilis': 'España',
  toscaf: 'España',
  'café jurado': 'España',
  climent: 'España',
  valiente: 'España',
  tupinamba: 'España',
  montecelio: 'España',
  'el criollo': 'España',
  'cafés orús': 'España',
  'la estrella': 'España',
  saula: 'España',
  oquendo: 'España',
  "satan's coffee": 'España',
  'nomad coffee': 'España',
  'right side': 'España',
  'hola coffee': 'España',
  ineffable: 'España',
  syra: 'España',
  incapto: 'España',
  'cafés platino': 'España',
  barco: 'España',
  starbucks: 'Estados Unidos',
  "peet's": 'Estados Unidos',
  'la colombe': 'Estados Unidos',
  'blue bottle': 'Estados Unidos',
  'counter culture': 'Estados Unidos',
  'by amazon': 'Internacional',
  'der-franz': 'Alemania',
  delta: 'Portugal',
  zoegas: 'Suecia',
  'café royal': 'Suiza',
  "l'or": 'Países Bajos',
  'dolce gusto': 'Suiza',
  tassimo: 'Países Bajos',
  nespresso: 'Suiza',
  lidl: 'Alemania',
  aldi: 'Alemania',
  alcampo: 'España',
  'el corte inglés': 'España',
  'black donkey': 'Irlanda',
  'daddy long legs': 'Internacional',
  "note d'espresso": 'Italia',
  'crazy beans': 'Internacional',
  '69 crazybeans': 'Internacional',
};

function inferPais(marca, nombre) {
  const m = (marca || '').toLowerCase();
  const n = (nombre || '').toLowerCase();
  for (const [key, val] of Object.entries(BRAND_COUNTRY)) {
    if (m.includes(key) || n.includes(key)) return val;
  }
  return null;
}

function inferVariedad(nombre) {
  const n = (nombre || '').toLowerCase();
  if (/100%\s*ar[aá]bic/i.test(n)) return '100% Arábica';
  if (/ar[aá]bica\s*(?:y|&|\+)\s*robusta/i.test(n)) return 'Arábica y Robusta';
  if (/robusta/i.test(n)) return 'Robusta';
  if (/ar[aá]bic/i.test(n)) return 'Arábica';
  if (/geisha|gesha/i.test(n)) return 'Geisha';
  if (/bourbon/i.test(n)) return 'Bourbon';
  if (/typica/i.test(n)) return 'Typica';
  if (/caturra/i.test(n)) return 'Caturra';
  if (/maragogype/i.test(n)) return 'Maragogype';
  if (/sl34/i.test(n)) return 'SL34';
  if (/sidra/i.test(n)) return 'Sidra';
  if (/wush.?wush/i.test(n)) return 'Wush Wush';
  if (/catuai/i.test(n)) return 'Catuaí';
  return null;
}

function inferTueste(nombre) {
  const n = (nombre || '').toLowerCase();
  if (/torrefacto/i.test(n)) return 'torrefacto';
  if (/mezcla/i.test(n)) return 'mezcla';
  if (/dark\s*roast|intenso|forte|fuerte|ristretto/i.test(n)) return 'oscuro';
  if (/light\s*roast|ligero|blonde|suave/i.test(n)) return 'claro';
  if (/medium|medio/i.test(n)) return 'medio';
  if (/natural|classic|espresso/i.test(n)) return 'medio';
  if (/descafeinado|decaf|dek\b/i.test(n)) return 'medio';
  return 'medio'; // safe default for coffee
}

function inferDescripcion(data) {
  const parts = [];
  if (data.marca) parts.push(`Café de ${data.marca}.`);
  if (data.tipo) parts.push(`Formato: ${data.tipo}.`);
  if (data.origen && data.origen !== 'Blend') parts.push(`Origen: ${data.origen}.`);
  if (data.origen === 'Blend') parts.push('Mezcla de orígenes.');
  if (data.variedad) parts.push(`Variedad: ${data.variedad}.`);
  if (data.peso) parts.push(`Presentación de ${data.peso}.`);
  return parts.length > 0 ? parts.join(' ') : null;
}

(async () => {
  const snap = await db.collection('cafes').get();
  let updated = 0;
  let totalFields = 0;
  const batches = [];
  let batch = db.batch();
  let batchCount = 0;

  const empty = (v) => !v || (typeof v === 'string' && v.trim() === '');

  snap.forEach((d) => {
    const data = d.data();
    const nombre = data.nombre || '';
    const marca = data.marca || data.roaster || '';
    const updates = {};

    if (empty(data.tipo)) {
      const v = inferTipo(nombre);
      if (v) {
        updates.tipo = v;
        totalFields++;
      }
    }

    if (empty(data.peso)) {
      const v = inferPeso(nombre);
      if (v) {
        updates.peso = v;
        totalFields++;
      }
    }

    const pesoStr = updates.peso || data.peso;
    if (pesoStr && (!data.pesoGramos || data.pesoGramos === 0)) {
      const v = inferPesoGramos(typeof pesoStr === 'string' ? pesoStr : String(pesoStr));
      if (v) {
        updates.pesoGramos = v;
        totalFields++;
      }
    }

    if (empty(data.origen)) {
      const v = inferOrigen(nombre);
      if (v) {
        updates.origen = v;
        totalFields++;
      }
    }

    if (empty(data.pais)) {
      const v = inferPais(marca, nombre);
      if (v) {
        updates.pais = v;
        totalFields++;
      }
    }

    if (empty(data.variedad)) {
      const v = inferVariedad(nombre + ' ' + (data.descripcion || ''));
      if (v) {
        updates.variedad = v;
        totalFields++;
      }
    }

    if (empty(data.tueste)) {
      const v = inferTueste(nombre);
      if (v) {
        updates.tueste = v;
        totalFields++;
      }
    }

    if (!data.formato && (updates.tipo || data.tipo)) {
      updates.formato = updates.tipo || data.tipo;
      totalFields++;
    }

    if (empty(data.descripcion)) {
      const merged = { ...data, ...updates };
      const v = inferDescripcion(merged);
      if (v) {
        updates.descripcion = v;
        totalFields++;
      }
    }

    if (empty(data.marca) && data.roaster) {
      updates.marca = data.roaster;
      totalFields++;
    }

    if (Object.keys(updates).length > 0) {
      batch.update(db.collection('cafes').doc(d.id), updates);
      batchCount++;
      updated++;

      if (batchCount >= 499) {
        batches.push(batch);
        batch = db.batch();
        batchCount = 0;
      }
    }
  });

  if (batchCount > 0) batches.push(batch);

  console.log(`Updating ${updated} docs (${totalFields} fields) in ${batches.length} batches...`);
  for (let i = 0; i < batches.length; i++) {
    await batches[i].commit();
    console.log(`  Batch ${i + 1}/${batches.length} committed`);
  }

  console.log(`\nDone. Updated ${updated} cafes with ${totalFields} inferred fields.`);
  process.exit(0);
})();
