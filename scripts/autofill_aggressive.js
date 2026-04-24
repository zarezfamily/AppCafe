const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

const empty = (v) => !v || (typeof v === 'string' && v.trim() === '');

// Brand-specific defaults for tipo
const CAPSULE_BRANDS = ['dolce gusto', 'tassimo', 'nespresso', 'a modo mio'];
const SPECIALTY_GRANO_BRANDS = [
  'nomad',
  'ineffable',
  'right side',
  'hola coffee',
  'syra',
  'satan',
  'peet',
  'la colombe',
  'blue bottle',
  'counter culture',
];

function inferTipoAggressive(nombre, marca, docId) {
  const n = (nombre || '').toLowerCase();
  const m = (marca || '').toLowerCase();
  const id = (docId || '').toLowerCase();

  // Capsule indicators
  if (CAPSULE_BRANDS.some((b) => n.includes(b) || m.includes(b) || id.includes(b)))
    return 'cápsula';
  if (/c[aá]psula|capsul|nespresso|compatible|compostable|monodosis|unidosis|pod/i.test(n))
    return 'cápsula';

  // Molido
  if (/molido|ground|moka|filtro|moulu/i.test(n)) return 'molido';

  // Soluble
  if (/soluble|instant|liofiliz/i.test(n)) return 'soluble';

  // Grano explicit
  if (/grano|beans|grain|whole|en gra/i.test(n)) return 'grano';

  // Specialty brands default to grano
  if (SPECIALTY_GRANO_BRANDS.some((b) => m.includes(b) || id.includes(b))) return 'grano';

  // Check doc ID patterns
  if (id.includes('grano') || id.includes('bean')) return 'grano';
  if (id.includes('molido') || id.includes('ground')) return 'molido';
  if (id.includes('capsul')) return 'cápsula';

  // Weight heuristics
  if (/1\s*kg|500\s*g/i.test(n)) return 'grano';
  if (/250\s*g/i.test(n)) return 'molido'; // 250g more likely molido

  // If has "espresso" in name and brand is coffee roaster, likely grano
  if (/espresso|crema|classico|intenso|premium|natural|descafeinado/i.test(n)) return 'grano';

  return 'grano'; // ultimate default for a coffee app
}

function inferPesoAggressive(nombre, tipo) {
  const n = (nombre || '').toLowerCase();

  // Try numeric patterns
  const m2 = n.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilo)/i);
  if (m2) return m2[1].replace(',', '.') + 'kg';
  const m3 = n.match(/(\d+)\s*(?:g|gr|gramos)\b/i);
  if (m3) return m3[1] + 'g';
  const m4 = n.match(/(\d+)\s*(?:c[aá]psulas|caps|unidades|uds|cáps|pods|sobres)/i);
  if (m4) return m4[1] + ' uds';
  const mx = n.match(/(\d+)\s*x\s*(\d+)\s*(?:g|gr)/i);
  if (mx) return `${mx[1]}x${mx[2]}g`;

  // Try from doc format
  if (n.includes('1kg') || n.includes('1 kg')) return '1kg';
  if (n.includes('500g') || n.includes('500 g')) return '500g';
  if (n.includes('250g') || n.includes('250 g')) return '250g';

  // Default by tipo
  if (tipo === 'cápsula') return '10 uds';
  if (tipo === 'molido') return '250g';
  if (tipo === 'grano') return '250g';
  if (tipo === 'soluble') return '200g';
  return '250g';
}

function inferVariedadAggressive(nombre, marca, origen) {
  const n = (nombre || '').toLowerCase();
  const m = (marca || '').toLowerCase();

  if (/100%\s*ar[aá]bic/i.test(n)) return '100% Arábica';
  if (/ar[aá]bica\s*(?:y|&|\+|\/)\s*robusta/i.test(n)) return 'Arábica y Robusta';
  if (/robusta/i.test(n)) return 'Robusta';
  if (/ar[aá]bic/i.test(n)) return 'Arábica';
  if (/geisha|gesha/i.test(n)) return 'Geisha';
  if (/bourbon/i.test(n)) return 'Bourbon';
  if (/typica/i.test(n)) return 'Typica';
  if (/caturra(?!mbu)/i.test(n)) return 'Caturra';
  if (/catuai/i.test(n)) return 'Catuaí';
  if (/maragogype/i.test(n)) return 'Maragogype';
  if (/sl34/i.test(n)) return 'SL34';
  if (/sidra/i.test(n)) return 'Sidra';
  if (/wush/i.test(n)) return 'Wush Wush';

  // Specialty single origins are usually Arábica
  const singleOrigins = [
    'colombia',
    'etiopía',
    'etiopia',
    'guatemala',
    'costa rica',
    'kenia',
    'kenya',
    'perú',
    'peru',
    'honduras',
    'nicaragua',
    'brasil',
    'brazil',
    'ruanda',
    'rwanda',
    'burundi',
    'tanzania',
    'méxico',
    'mexico',
    'panamá',
    'india',
    'sumatra',
    'java',
    'jamaica',
    'bolivia',
  ];
  const o = (origen || '').toLowerCase();
  if (singleOrigins.some((s) => n.includes(s) || o.includes(s))) return 'Arábica';

  // Specialty brands = Arábica
  const specBrands = [
    'nomad',
    'ineffable',
    'right side',
    'hola coffee',
    'syra',
    'satan',
    'peet',
    'la colombe',
    'incapto',
    'cafe de finca',
  ];
  if (specBrands.some((b) => m.includes(b))) return 'Arábica';

  // Italian espresso brands often use blends
  const italianBlend = ['lavazza', 'illy', 'kimbo', 'segafredo', 'pellini', 'gimoka'];
  if (italianBlend.some((b) => m.includes(b))) return 'Arábica y Robusta';

  // Spanish traditional brands
  const spanishBlend = [
    'marcilla',
    'bonka',
    'hacendado',
    'la estrella',
    'fortaleza',
    'baqué',
    'candelas',
  ];
  if (spanishBlend.some((b) => m.includes(b))) return 'Arábica y Robusta';

  return 'Arábica'; // safe default
}

function inferOrigenAggressive(nombre, _marca) {
  const n = (nombre || '').toLowerCase();
  const origins = {
    colombia: 'Colombia',
    colombiano: 'Colombia',
    nariño: 'Colombia',
    huila: 'Colombia',
    brasil: 'Brasil',
    brazil: 'Brasil',
    fazenda: 'Brasil',
    etiopía: 'Etiopía',
    etiopia: 'Etiopía',
    ethiopia: 'Etiopía',
    yirgacheffe: 'Etiopía',
    guatemala: 'Guatemala',
    'costa rica': 'Costa Rica',
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
    zambia: 'Zambia',
    papúa: 'Papúa Nueva Guinea',
    cuba: 'Cuba',
    bolivia: 'Bolivia',
  };
  for (const [key, val] of Object.entries(origins)) {
    if (n.includes(key)) return val;
  }
  if (
    /blend|mezcla|mix|selección|classico|crema|espresso bar|natural$|descafeinado|premium/i.test(n)
  )
    return 'Blend';
  return 'Blend'; // most commercial coffees are blends
}

function inferPaisAggressive(marca, nombre) {
  const m = (marca || '').toLowerCase();
  const brands = {
    lavazza: 'Italia',
    illy: 'Italia',
    kimbo: 'Italia',
    segafredo: 'Italia',
    pellini: 'Italia',
    gimoka: 'Italia',
    garibaldi: 'Italia',
    mauro: 'Italia',
    corsini: 'Italia',
    delonghi: 'Italia',
    vergnano: 'Italia',
    'note d': 'Italia',
    hacendado: 'España',
    marcilla: 'España',
    bonka: 'España',
    nescafé: 'España',
    baqué: 'España',
    novell: 'España',
    catunambu: 'España',
    mexicana: 'España',
    finca: 'España',
    candelas: 'España',
    dromedario: 'España',
    fortaleza: 'España',
    granell: 'España',
    camuy: 'España',
    mogorttini: 'España',
    kfetea: 'España',
    pont: 'España',
    brasileña: 'España',
    guilis: 'España',
    toscaf: 'España',
    jurado: 'España',
    climent: 'España',
    valiente: 'España',
    tupinamba: 'España',
    montecelio: 'España',
    criollo: 'España',
    orús: 'España',
    estrella: 'España',
    saula: 'España',
    oquendo: 'España',
    satan: 'España',
    nomad: 'España',
    'right side': 'España',
    'hola coffee': 'España',
    ineffable: 'España',
    syra: 'España',
    incapto: 'España',
    platino: 'España',
    barco: 'España',
    'cafés baqué': 'España',
    puchero: 'España',
    alcampo: 'España',
    'corte inglés': 'España',
    starbucks: 'EEUU',
    peet: 'EEUU',
    colombe: 'EEUU',
    amazon: 'Internacional',
    franz: 'Alemania',
    delta: 'Portugal',
    zoegas: 'Suecia',
    royal: 'Suiza',
    "l'or": 'Países Bajos',
    'lor ': 'Países Bajos',
    nespresso: 'Suiza',
    lidl: 'Alemania',
    aldi: 'Alemania',
    donkey: 'Irlanda',
    'daddy long': 'Internacional',
    crazy: 'Internacional',
  };
  for (const [key, val] of Object.entries(brands)) {
    if (m.includes(key)) return val;
  }
  const n = (nombre || '').toLowerCase();
  for (const [key, val] of Object.entries(brands)) {
    if (n.includes(key)) return val;
  }
  return 'Internacional';
}

(async () => {
  const snap = await db.collection('cafes').get();
  let updated = 0;
  let totalFields = 0;
  const batches = [];
  let batch = db.batch();
  let batchCount = 0;

  snap.forEach((d) => {
    const data = d.data();
    const nombre = data.nombre || '';
    const marca = data.marca || data.roaster || '';
    const updates = {};

    if (empty(data.tipo)) {
      updates.tipo = inferTipoAggressive(nombre, marca, d.id);
      totalFields++;
    }

    if (empty(data.peso)) {
      updates.peso = inferPesoAggressive(nombre, updates.tipo || data.tipo);
      totalFields++;
    }

    // pesoGramos
    const pesoStr = updates.peso || data.peso;
    if (pesoStr && (!data.pesoGramos || data.pesoGramos === 0)) {
      const p = (typeof pesoStr === 'string' ? pesoStr : String(pesoStr)).toLowerCase();
      const kgM = p.match(/([\d.]+)\s*kg/);
      const gM = p.match(/(\d+)\s*g/);
      if (kgM) {
        updates.pesoGramos = Math.round(parseFloat(kgM[1]) * 1000);
        totalFields++;
      } else if (gM) {
        updates.pesoGramos = parseInt(gM[1]);
        totalFields++;
      }
    }

    if (empty(data.origen)) {
      updates.origen = inferOrigenAggressive(nombre, marca);
      totalFields++;
    }

    if (empty(data.pais)) {
      updates.pais = inferPaisAggressive(marca, nombre);
      totalFields++;
    }

    if (empty(data.variedad)) {
      updates.variedad = inferVariedadAggressive(nombre, marca, updates.origen || data.origen);
      totalFields++;
    }

    if (empty(data.tueste)) {
      const n = nombre.toLowerCase();
      if (/torrefacto/i.test(n)) updates.tueste = 'torrefacto';
      else if (/dark|intenso|forte|fuerte|ristretto/i.test(n)) updates.tueste = 'oscuro';
      else if (/light|ligero|blonde|suave/i.test(n)) updates.tueste = 'claro';
      else updates.tueste = 'medio';
      totalFields++;
    }

    if (!data.formato && (updates.tipo || data.tipo)) {
      updates.formato = updates.tipo || data.tipo;
      totalFields++;
    }

    if (empty(data.descripcion)) {
      const merged = { ...data, ...updates };
      const parts = [];
      if (merged.marca) parts.push(`Café de ${merged.marca}.`);
      if (merged.tipo) parts.push(`Formato: ${merged.tipo}.`);
      if (merged.origen && merged.origen !== 'Blend') parts.push(`Origen: ${merged.origen}.`);
      else parts.push('Mezcla de orígenes.');
      if (merged.variedad) parts.push(`Variedad: ${merged.variedad}.`);
      if (merged.peso) parts.push(`Presentación de ${merged.peso}.`);
      if (parts.length > 0) {
        updates.descripcion = parts.join(' ');
        totalFields++;
      }
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
  console.log(`Done. Updated ${updated} cafes with ${totalFields} fields.`);
  process.exit(0);
})();
