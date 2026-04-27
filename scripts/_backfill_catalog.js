/**
 * Backfill missing data across the entire catalog.
 * Infers: origen, variedad, proceso, tueste, notas, tipo, peso, SCA.
 * Does NOT overwrite existing data — only fills empty fields.
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();

// ══════════════════════════════════════════════════════════
// Inference helpers
// ══════════════════════════════════════════════════════════

function inferOrigen(nombre, docId) {
  const n = (nombre || '').toLowerCase() + ' ' + (docId || '').toLowerCase();
  const origins = {
    colombia: 'Colombia',
    colombiano: 'Colombia',
    brasil: 'Brasil',
    brazil: 'Brasil',
    brazilian: 'Brasil',
    etiopía: 'Etiopía',
    etiopia: 'Etiopía',
    ethiopia: 'Etiopía',
    ethiopian: 'Etiopía',
    yirgacheffe: 'Etiopía',
    sidamo: 'Etiopía',
    guji: 'Etiopía',
    guatemala: 'Guatemala',
    guatemalteco: 'Guatemala',
    'costa rica': 'Costa Rica',
    costarricense: 'Costa Rica',
    tarrazú: 'Costa Rica',
    perú: 'Perú',
    peru: 'Perú',
    peruano: 'Perú',
    kenia: 'Kenia',
    kenya: 'Kenia',
    honduras: 'Honduras',
    hondureño: 'Honduras',
    nicaragua: 'Nicaragua',
    méxico: 'México',
    mexico: 'México',
    chiapas: 'México',
    oaxaca: 'México',
    indonesia: 'Indonesia',
    sumatra: 'Indonesia',
    java: 'Indonesia',
    sulawesi: 'Indonesia',
    india: 'India',
    malabar: 'India',
    monsoon: 'India',
    ruanda: 'Ruanda',
    rwanda: 'Ruanda',
    tanzania: 'Tanzania',
    kilimanjaro: 'Tanzania',
    jamaica: 'Jamaica',
    'blue mountain': 'Jamaica',
    panamá: 'Panamá',
    panama: 'Panamá',
    geisha: 'Panamá',
    bolivia: 'Bolivia',
    cuba: 'Cuba',
    uganda: 'Uganda',
    'el salvador': 'El Salvador',
    salvador: 'El Salvador',
    burundi: 'Burundi',
    congo: 'Congo',
    camerún: 'Camerún',
    camerun: 'Camerún',
    vietnam: 'Vietnam',
    papúa: 'Papúa Nueva Guinea',
    papua: 'Papúa Nueva Guinea',
    'república dominicana': 'República Dominicana',
    dominicana: 'República Dominicana',
    haití: 'Haití',
    haiti: 'Haití',
    venezuela: 'Venezuela',
    ecuador: 'Ecuador',
  };
  for (const [key, val] of Object.entries(origins)) {
    if (n.includes(key)) return val;
  }
  return null; // don't guess "Blend" — leave empty so admin knows
}

function inferVariedad(nombre, marca, origen) {
  const n = (nombre || '').toLowerCase();
  const m = (marca || '').toLowerCase();
  if (/100%\s*ar[aá]bic/i.test(n)) return '100% Arábica';
  if (/ar[aá]bica\s*(?:y|&|\+|\/)\s*robusta/i.test(n)) return 'Arábica y Robusta';
  if (/robusta/i.test(n)) return 'Robusta';
  if (/ar[aá]bic/i.test(n)) return 'Arábica';
  if (/geisha|gesha/i.test(n)) return 'Geisha';
  if (/bourbon/i.test(n)) return 'Bourbon';
  if (/caturra/i.test(n)) return 'Caturra';
  if (/typica|típica/i.test(n)) return 'Typica';
  if (/castillo/i.test(n)) return 'Castillo';
  if (/sl28|sl-28|sl 28/i.test(n)) return 'SL28';

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
    'ruanda',
    'rwanda',
    'tanzania',
    'panamá',
    'panama',
    'el salvador',
    'burundi',
    'bolivia',
    'ecuador',
  ];
  const o = (origen || '').toLowerCase();
  if (singleOrigins.some((s) => n.includes(s) || o.includes(s))) return 'Arábica';

  const italianBlend = [
    'lavazza',
    'illy',
    'kimbo',
    'segafredo',
    'pellini',
    'bialetti',
    'passalacqua',
    'corsini',
    'vergnano',
    'pera',
    'garibaldi',
    'arcaffè',
    'mokasirs',
    'mokaflor',
    'saquella',
    'mauro',
    'gimoka',
    'carraro',
    'lucaffé',
  ];
  if (italianBlend.some((b) => m.includes(b))) return 'Arábica y Robusta';

  const spanishBlend = [
    'marcilla',
    'bonka',
    'hacendado',
    'la estrella',
    'fortaleza',
    'baqué',
    'candelas',
    'saimaza',
    'oquendo',
    'tupinamba',
    'toscaf',
    'mocay',
  ];
  if (spanishBlend.some((b) => m.includes(b))) return 'Arábica y Robusta';
  return null;
}

function inferTueste(nombre, docId) {
  const n = ((nombre || '') + ' ' + (docId || '')).toLowerCase();
  if (/torrefacto/i.test(n)) return 'torrefacto';
  if (/extra.?intenso|fortissimo|forte|ristretto|intensísimo/i.test(n)) return 'oscuro';
  if (/oscuro|dark|intenso|roast.?dark/i.test(n)) return 'oscuro';
  if (/claro|light|blonde|suave|ligero|filter/i.test(n)) return 'claro';
  if (/medio|medium|balanced|equilibrad/i.test(n)) return 'medio';
  if (/descafeinado|decaf/i.test(n)) return 'medio';
  if (/espresso/i.test(n)) return 'medio-oscuro';
  return 'medio';
}

function inferProceso(nombre, origen, variedad) {
  const n = (nombre || '').toLowerCase();
  if (/natural|sun.?dried|seco/i.test(n)) return 'natural';
  if (/lavado|washed/i.test(n)) return 'lavado';
  if (/honey|miel/i.test(n)) return 'honey';
  if (/anaer[oó]bic/i.test(n)) return 'anaeróbico';
  if (/semi.?lavado|semi.?washed|pulped/i.test(n)) return 'semi-lavado';
  if (/wet.?hull|giling basah/i.test(n)) return 'wet-hulled';
  // Regional inference
  const o = (origen || '').toLowerCase();
  if (o.includes('indonesia') || o.includes('sumatra')) return 'wet-hulled';
  return null;
}

function inferNotas(nombre, marca, origen, tueste, formato, variedad, docId) {
  const n = ((nombre || '') + ' ' + (docId || '')).toLowerCase();
  const m = (marca || '').toLowerCase();
  const o = (origen || '').toLowerCase();
  const t = (tueste || '').toLowerCase();
  const f = (formato || '').toLowerCase();
  const notes = [];

  // Direct name matches
  if (/chocolate/i.test(n)) notes.push('chocolate');
  if (/caramelo|caramel|toffee/i.test(n)) notes.push('caramelo');
  if (/vainilla|vanilla/i.test(n)) notes.push('vainilla');
  if (/avellana|hazelnut/i.test(n)) notes.push('avellana');
  if (/canela|cinnamon/i.test(n)) notes.push('canela');
  if (/coco|coconut/i.test(n)) notes.push('coco');
  if (/menta|mint/i.test(n)) notes.push('menta');
  if (/frambuesa|raspberry/i.test(n)) notes.push('frambuesa');
  if (/naranja|orange/i.test(n)) notes.push('naranja');
  if (/galleta|cookie/i.test(n)) notes.push('galleta');
  if (/maple|arce/i.test(n)) notes.push('arce');
  if (/nuez|walnut/i.test(n)) notes.push('nuez');

  if (notes.length > 0) return notes.join(', ');

  // Origin-based typical notes
  if (o.includes('etiop') || o.includes('ethiopia')) return 'floral, cítrico, afrutado';
  if (o.includes('kenia') || o.includes('kenya')) return 'cítrico, frutas rojas, intenso';
  if (o.includes('colombia')) return 'caramelo, nuez, equilibrado';
  if (o.includes('brasil')) return 'chocolate, nuez, cuerpo';
  if (o.includes('guatemala')) return 'chocolate, especiado, cuerpo';
  if (o.includes('costa rica')) return 'miel, cítrico, limpio';
  if (o.includes('honduras')) return 'caramelo, chocolate, suave';
  if (o.includes('per') && (o.includes('ú') || o.includes('u'))) return 'chocolate, nuez, suave';
  if (o.includes('nicaragua')) return 'chocolate, caramelo, cremoso';
  if (o.includes('indonesia') || o.includes('sumatra')) return 'terroso, especiado, cuerpo';
  if (o.includes('méxico') || o.includes('mexico')) return 'chocolate, nuez, medio';
  if (o.includes('rwanda') || o.includes('ruanda')) return 'cítrico, afrutado, floral';
  if (o.includes('tanzania')) return 'cítrico, afrutado, brillante';
  if (o.includes('burundi')) return 'cítrico, cereza, complejo';
  if (o.includes('el salvador')) return 'caramelo, chocolate, suave';
  if (o.includes('bolivia')) return 'floral, miel, complejo';
  if (o.includes('india')) return 'especiado, cuerpo, bajo ácido';
  if (o.includes('jamaica')) return 'suave, equilibrado, dulce';
  if (o.includes('panamá') || o.includes('panama')) return 'floral, jasmine, complejo';
  if (o.includes('ecuador')) return 'chocolate, caramelo, afrutado';
  if (o.includes('cuba')) return 'tabaco, terroso, intenso';
  if (o.includes('uganda')) return 'chocolate, nuez, cuerpo';
  if (o.includes('vietnam')) return 'intenso, chocolate oscuro, cuerpo';

  // Tueste-based notes
  if (t.includes('oscuro') || t.includes('dark')) return 'intenso, chocolate oscuro, tostado';
  if (t.includes('claro') || t.includes('light')) return 'afrutado, cítrico, floral';
  if (t.includes('torrefacto')) return 'intenso, tostado, amargo';

  // Format-based
  if (f.includes('capsul') || /nespresso|dolce/i.test(n)) return 'equilibrado, cremoso';
  if (f.includes('instant') || /soluble/i.test(n)) return 'suave, equilibrado';

  // Italian brands
  const italianBrands = [
    'lavazza',
    'illy',
    'kimbo',
    'segafredo',
    'pellini',
    'bialetti',
    'passalacqua',
    'corsini',
    'vergnano',
    'pera',
    'garibaldi',
    'arcaffè',
    'mokasirs',
    'mokaflor',
    'saquella',
    'mauro',
    'gimoka',
    'carraro',
    'lucaffé',
  ];
  if (italianBrands.some((b) => m.includes(b))) return 'intenso, cremoso, cuerpo';

  // Spanish brands
  const spanishBrands = [
    'marcilla',
    'bonka',
    'hacendado',
    'saimaza',
    'oquendo',
    'candelas',
    'fortaleza',
    'baqué',
    'tupinamba',
    'toscaf',
    'mocay',
  ];
  if (spanishBrands.some((b) => m.includes(b))) return 'tostado, cuerpo, intenso';

  // Specialty brands
  if (/nomad|incapto|ineffable|right side|syra|hola coffee|finca|dromedario/i.test(m))
    return 'complejo, afrutado, dulce';

  // Generic fallback
  return 'equilibrado, tostado';
}

function inferFormato(nombre, docId) {
  const n = ((nombre || '') + ' ' + (docId || '')).toLowerCase();
  if (/soluble|instant|liofiliz/i.test(n)) return 'instant';
  if (
    /c[aá]psula|capsul|nespresso|compatible|compostable|monodosis|dolce gusto|tassimo|modo mio/i.test(
      n
    )
  )
    return 'capsules';
  if (/molido|ground|moka|filtro/i.test(n)) return 'ground';
  if (/grano|beans|grain|whole|en gra/i.test(n)) return 'beans';
  if (/1\s*kg|500\s*g/i.test(n)) return 'beans';
  return null;
}

function inferPeso(nombre, formato) {
  const n = (nombre || '').toLowerCase();
  const m2 = n.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilo)/i);
  if (m2) return m2[1].replace(',', '.') + 'kg';
  const m3 = n.match(/(\d+)\s*(?:g|gr|gramos)\b/i);
  if (m3) return m3[1] + 'g';
  const m4 = n.match(/(\d+)\s*(?:c[aá]psulas|caps|unidades|uds|pods|sobres)/i);
  if (m4) return m4[1] + ' uds';
  if (formato === 'capsules') return '10 uds';
  if (formato === 'ground') return '250g';
  return '250g';
}

// ══════════════════════════════════════════════════════════
// SCA auto-calculation (mirroring cafeService logic)
// ══════════════════════════════════════════════════════════

function computeSca(cafe) {
  const category = cafe.coffeeCategory || (cafe.category === 'supermarket' ? 'daily' : 'specialty');
  const o = !!(cafe.origen || cafe.origin);
  const p = !!(cafe.proceso || cafe.process);
  const v = !!(cafe.variedad || cafe.variety);
  const alt = cafe.altura || cafe.altitude || 0;
  const notes = String(cafe.notas || cafe.notes || '')
    .split(/[,;]/)
    .filter((n) => n.trim()).length;
  const formato = String(cafe.formato || cafe.format || '').toLowerCase();
  const tueste = String(cafe.tueste || cafe.roastLevel || '').toLowerCase();
  const nombre = String(cafe.nombre || cafe.name || '').toLowerCase();

  if (cafe.scaScoreOfficial && Number(cafe.scaScoreOfficial) >= 60) {
    return {
      score: Number(Number(cafe.scaScoreOfficial).toFixed(1)),
      type: 'official',
      confidence: 1,
    };
  }

  let score = 70,
    confidence = 0.3;
  const reasons = [];

  if (category === 'specialty') {
    score += 8;
    confidence += 0.15;
    reasons.push('Especialidad');
  }
  if (category === 'daily') {
    score -= 1;
    reasons.push('Café diario');
  }
  if (o) {
    score += 2;
    confidence += 0.08;
  }
  if (p) {
    score += 2;
    confidence += 0.08;
  }
  if (v) {
    score += 2;
    confidence += 0.08;
  }
  if (alt >= 1000) {
    score += 2;
    confidence += 0.08;
  } else if (alt > 0) {
    score += 1;
    confidence += 0.04;
  }
  if (notes >= 2) {
    score += 2;
    confidence += 0.06;
  } else if (notes === 1) {
    score += 1;
    confidence += 0.03;
  }
  if (tueste.includes('claro') || tueste.includes('light')) score += 1.5;
  else if (tueste.includes('oscuro') || tueste.includes('dark')) score -= 1;
  if (formato.includes('beans') || formato.includes('grano')) score += 1;
  else if (formato.includes('capsul')) score -= 2;
  else if (formato.includes('ground') || formato.includes('molido')) score -= 0.5;
  if (/100%\s*ar[aá]bic/i.test(nombre)) score += 1;
  if (/robusta/i.test(nombre)) score -= 1.5;
  if (/descafeinado|decaf/i.test(nombre)) score -= 0.5;

  score = Math.max(60, Math.min(89, score));
  confidence = Math.max(0.2, Math.min(0.95, confidence));

  return {
    score: Number(score.toFixed(1)),
    type: 'estimated',
    confidence: Number(confidence.toFixed(2)),
  };
}

// ══════════════════════════════════════════════════════════
// Main backfill
// ══════════════════════════════════════════════════════════

(async () => {
  console.log('Loading cafes...');
  const snap = await db.collection('cafes').get();
  const cafes = [];
  snap.forEach((d) => cafes.push({ id: d.id, ...d.data() }));
  console.log(`Loaded ${cafes.length} cafés\n`);

  const has = (v, min = 2) => String(v || '').trim().length >= min;
  let updated = 0,
    skipped = 0;
  const fieldCounts = {
    origen: 0,
    variedad: 0,
    proceso: 0,
    tueste: 0,
    notas: 0,
    formato: 0,
    peso: 0,
    sca: 0,
  };

  for (const cafe of cafes) {
    const updates = {};
    const nombre = cafe.nombre || cafe.name || '';
    const marca = cafe.marca || cafe.roaster || '';
    const docId = cafe.id;

    // Origen
    if (!has(cafe.origen) && !has(cafe.origin)) {
      const o = inferOrigen(nombre, docId);
      if (o) {
        updates.origen = o;
        updates.origin = o;
        updates.pais = o;
        fieldCounts.origen++;
      }
    }

    // Use existing + new origen for subsequent inferences
    const origen = updates.origen || cafe.origen || cafe.origin || '';

    // Variedad
    if (!has(cafe.variedad) && !has(cafe.variety)) {
      const v = inferVariedad(nombre, marca, origen);
      if (v) {
        updates.variedad = v;
        updates.variety = v;
        fieldCounts.variedad++;
      }
    }

    // Proceso
    if (!has(cafe.proceso) && !has(cafe.process)) {
      const p = inferProceso(nombre, origen, cafe.variedad || updates.variedad);
      if (p) {
        updates.proceso = p;
        updates.process = p;
        fieldCounts.proceso++;
      }
    }

    // Tueste
    if (!has(cafe.tueste) && !has(cafe.roastLevel)) {
      const t = inferTueste(nombre, docId);
      if (t) {
        updates.tueste = t;
        updates.roastLevel = t;
        fieldCounts.tueste++;
      }
    }

    // Formato
    if (!has(cafe.formato) && !has(cafe.format)) {
      const f = inferFormato(nombre, docId);
      if (f) {
        updates.formato = f;
        updates.format = f;
        fieldCounts.formato++;
      }
    }

    // Peso
    const formatoFinal = updates.formato || cafe.formato || cafe.format || '';
    if (!has(cafe.peso) && !has(cafe.pesoGramos)) {
      const w = inferPeso(nombre, formatoFinal);
      if (w) {
        updates.peso = w;
        fieldCounts.peso++;
      }
    }

    // Notas
    if (!has(cafe.notas, 3) && !has(cafe.notes, 3)) {
      const tueste = updates.tueste || cafe.tueste || '';
      const notas = inferNotas(
        nombre,
        marca,
        origen,
        tueste,
        formatoFinal,
        cafe.variedad || updates.variedad,
        docId
      );
      if (notas) {
        updates.notas = notas;
        updates.notes = notas;
        fieldCounts.notas++;
      }
    }

    // SCA — recalculate for all entries that have no SCA or estimated SCA
    const currentSca = cafe.sca;
    const merged = { ...cafe, ...updates };
    const newSca = computeSca(merged);
    if (!currentSca || (currentSca.type === 'estimated' && newSca.score !== currentSca.score)) {
      updates.sca = { ...newSca, lastCalculatedAt: new Date().toISOString() };
      fieldCounts.sca++;
    }

    // Data completeness
    const dcFields = [
      { w: 0.2, ok: has(merged.nombre || merged.name, 3) },
      { w: 0.15, ok: has(merged.marca || merged.roaster, 2) },
      { w: 0.12, ok: has(merged.origen || merged.origin, 2) },
      { w: 0.1, ok: has(merged.ean, 8) },
      { w: 0.12, ok: has(merged.bestPhoto || merged.officialPhoto || merged.foto, 8) },
      { w: 0.08, ok: has(merged.notas || merged.notes, 3) },
      { w: 0.06, ok: has(merged.proceso || merged.process, 2) },
      { w: 0.05, ok: has(merged.variedad || merged.variety, 2) },
      { w: 0.04, ok: has(merged.tueste || merged.roastLevel, 2) },
      { w: 0.04, ok: has(merged.formato || merged.format, 2) },
      { w: 0.04, ok: typeof merged.precio === 'number' && merged.precio > 0 },
    ];
    let dcScore = 0;
    for (const f of dcFields) if (f.ok) dcScore += f.w;
    updates.dataCompletenessScore = Math.round(dcScore * 100) / 100;

    updates.updatedAt = new Date().toISOString();

    // Only write if we have real field updates (not just updatedAt + dataCompleteness)
    const realUpdates = Object.keys(updates).filter(
      (k) => !['updatedAt', 'dataCompletenessScore', 'sca'].includes(k)
    );
    const scaChanged = updates.sca && (!currentSca || currentSca.score !== updates.sca.score);

    if (realUpdates.length > 0 || scaChanged) {
      await db.collection('cafes').doc(cafe.id).update(updates);
      updated++;
      if (updated % 50 === 0) console.log(`  ... ${updated} actualizados`);
    } else {
      // Still update dataCompletenessScore if missing
      if (cafe.dataCompletenessScore === undefined || cafe.dataCompletenessScore === null) {
        await db.collection('cafes').doc(cafe.id).update({
          dataCompletenessScore: updates.dataCompletenessScore,
          updatedAt: updates.updatedAt,
        });
      }
      skipped++;
    }
  }

  console.log('\n========================================');
  console.log(`TOTAL: ${cafes.length} cafés`);
  console.log(`Actualizados: ${updated}`);
  console.log(`Sin cambios: ${skipped}`);
  console.log('');
  console.log('Campos rellenados:');
  for (const [k, v] of Object.entries(fieldCounts)) {
    console.log(`  ${k}: ${v}`);
  }
  console.log('========================================');
  process.exit(0);
})();
