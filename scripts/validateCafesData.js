const fs = require('fs');
const path = require('path');

const CAFES_JSON_PATH = path.join(__dirname, 'cafes.json');
const REPORT_JSON_PATH = path.join(__dirname, 'cafes-validation-report.json');

// Cambia a false si no quieres guardar informe en archivo
const WRITE_REPORT_FILE = true;

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function cleanEan(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/\D/g, '');
  return cleaned.length >= 8 ? cleaned : null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function looksLikeUrl(value) {
  return isNonEmptyString(value) && /^https?:\/\//i.test(value.trim());
}

function looksLikeRealImageUrl(value) {
  if (!looksLikeUrl(value)) return false;

  const v = value.toLowerCase();

  if (v.includes('via.placeholder.com')) return false;
  if (v.includes('placeholder')) return false;
  if (v.includes('dummyimage')) return false;
  if (v.includes('fake')) return false;

  return true;
}

function getField(obj, ...keys) {
  for (const key of keys) {
    if (obj[key] !== undefined) return obj[key];
  }
  return undefined;
}

function hasValue(value) {
  if (typeof value === 'number') return true;
  return isNonEmptyString(value) || isNonEmptyArray(value);
}

function validateOneCafe(cafe, index) {
  const issues = [];
  const warnings = [];
  const strengths = [];
  let score = 0;

  const nombre = getField(cafe, 'nombre', 'name');
  const marca = getField(cafe, 'marca', 'brand');
  const roaster = getField(cafe, 'roaster');
  const ean = cleanEan(getField(cafe, 'ean', 'barcode'));
  const foto = getField(cafe, 'foto', 'image_url');
  const officialPhoto = getField(cafe, 'officialPhoto');
  const fuenteUrl = getField(cafe, 'fuenteUrl', 'urlProducto', 'product_url');
  const pais = getField(cafe, 'pais', 'country_brand');
  const origen = getField(cafe, 'origen', 'origin_label');
  const notas = getField(cafe, 'notas', 'tasting_notes');
  const tipoProducto = getField(cafe, 'tipoProducto', 'subcategory');
  const formato = getField(cafe, 'formato', 'format');
  const intensidad = getField(cafe, 'intensidad', 'intensity');
  const peso = getField(cafe, 'peso', 'weight_g', 'weight');
  const proceso = getField(cafe, 'proceso', 'process');
  const variedad = getField(cafe, 'variedad', 'variety');
  const tueste = getField(cafe, 'tueste', 'roast_level', 'roast_type');
  const precio = getField(cafe, 'precio', 'price_eur');
  const categoria = getField(cafe, 'categoria', 'category');
  const desc = getField(cafe, 'descripcion', 'description_short', 'description_long');

  if (isNonEmptyString(nombre)) {
    score += 12;
    strengths.push('nombre');
  } else {
    issues.push('Falta nombre');
  }

  if (isNonEmptyString(marca) || isNonEmptyString(roaster)) {
    score += 10;
    strengths.push('marca/roaster');
  } else {
    issues.push('Falta marca o roaster');
  }

  if (ean) {
    score += 15;
    strengths.push('ean');
  } else {
    warnings.push('Sin EAN');
  }

  const hasOfficialPhoto = looksLikeRealImageUrl(officialPhoto);
  const hasPhoto = looksLikeRealImageUrl(foto);

  if (hasOfficialPhoto) {
    score += 15;
    strengths.push('officialPhoto');
  } else if (hasPhoto) {
    score += 10;
    strengths.push('foto');
    warnings.push('Tiene foto pero no officialPhoto');
  } else {
    issues.push('Sin foto real');
  }

  if (looksLikeUrl(fuenteUrl)) {
    score += 10;
    strengths.push('fuenteUrl/urlProducto');
  } else {
    warnings.push('Sin URL de producto/fuente');
  }

  if (isNonEmptyString(origen) || isNonEmptyString(pais)) {
    score += 8;
    strengths.push('origen/pais');
  } else {
    warnings.push('Sin origen o país');
  }

  if (isNonEmptyString(tipoProducto) || isNonEmptyString(formato)) {
    score += 8;
    strengths.push('tipoProducto/formato');
  } else {
    warnings.push('Sin tipoProducto/formato');
  }

  if ((typeof intensidad === 'number' && intensidad > 0) || isNonEmptyString(intensidad)) {
    score += 5;
    strengths.push('intensidad');
  } else {
    warnings.push('Sin intensidad');
  }

  if ((typeof peso === 'number' && peso > 0) || isNonEmptyString(peso)) {
    score += 5;
    strengths.push('peso');
  } else {
    warnings.push('Sin peso');
  }

  if (isNonEmptyString(tueste) || isNonEmptyString(proceso) || isNonEmptyString(variedad)) {
    score += 4;
    strengths.push('tueste/proceso/variedad');
  } else {
    warnings.push('Sin tueste, proceso ni variedad');
  }

  if (
    isNonEmptyString(desc) ||
    isNonEmptyString(precio) ||
    (typeof precio === 'number' && precio > 0)
  ) {
    score += 3;
    strengths.push('descripcion/precio');
  }

  if (isNonEmptyString(categoria) || isNonEmptyString(tipoProducto)) {
    score += 3;
    strengths.push('categoria');
  }

  if (isNonEmptyArray(notas) || isNonEmptyString(notas)) {
    score += 2;
    strengths.push('notas');
  } else {
    warnings.push('Sin notas de cata');
  }

  if (score > 100) score = 100;

  let quality = 'poor';
  if (score >= 85) quality = 'excellent';
  else if (score >= 70) quality = 'good';
  else if (score >= 50) quality = 'fair';

  const missingFields = [];
  if (!ean) missingFields.push('ean');
  if (!hasOfficialPhoto) missingFields.push('officialPhoto');
  if (!hasPhoto && !hasOfficialPhoto) missingFields.push('fotoReal');
  if (!looksLikeUrl(fuenteUrl)) missingFields.push('fuenteUrl');
  if (!isNonEmptyString(origen) && !isNonEmptyString(pais)) missingFields.push('origenOPais');
  if (!isNonEmptyString(tipoProducto) && !isNonEmptyString(formato))
    missingFields.push('tipoOFormato');
  if (!hasValue(intensidad)) missingFields.push('intensidad');
  if (!hasValue(peso)) missingFields.push('peso');
  if (!isNonEmptyString(tueste) && !isNonEmptyString(proceso) && !isNonEmptyString(variedad))
    missingFields.push('tuesteProcesoVariedad');
  if (!isNonEmptyArray(notas) && !isNonEmptyString(notas)) missingFields.push('notas');

  const improvementPotential = missingFields.length;

  return {
    index,
    id: getField(cafe, 'id') || null,
    nombre: nombre || `(sin nombre #${index})`,
    marca: marca || roaster || null,
    ean: ean || null,
    quality,
    score,
    issues,
    warnings,
    strengths,
    missingFields,
    improvementPotential,
    hasRealPhoto: hasOfficialPhoto || hasPhoto,
    hasOfficialPhoto,
    hasPhoto,
    hasEan: Boolean(ean),
    hasSourceUrl: looksLikeUrl(fuenteUrl),
    hasOrigen: isNonEmptyString(origen) || isNonEmptyString(pais),
    hasPeso: hasValue(peso),
    hasIntensidad: hasValue(intensidad),
    hasNotas: isNonEmptyArray(notas) || isNonEmptyString(notas),
  };
}

function buildGlobalSummary(results) {
  const summary = {
    total: results.length,
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
    withRealPhoto: 0,
    withOfficialPhoto: 0,
    withoutOfficialPhoto: 0,
    withEan: 0,
    withoutEan: 0,
    withSourceUrl: 0,
    withoutSourceUrl: 0,
    withoutPeso: 0,
    withoutIntensidad: 0,
    withoutOrigen: 0,
    withoutNotas: 0,
    averageScore: 0,
  };

  let totalScore = 0;

  for (const item of results) {
    totalScore += item.score;
    summary[item.quality] += 1;
    if (item.hasRealPhoto) summary.withRealPhoto += 1;
    if (item.hasOfficialPhoto) summary.withOfficialPhoto += 1;
    if (!item.hasOfficialPhoto) summary.withoutOfficialPhoto += 1;
    if (item.hasEan) summary.withEan += 1;
    if (!item.hasEan) summary.withoutEan += 1;
    if (item.hasSourceUrl) summary.withSourceUrl += 1;
    if (!item.hasSourceUrl) summary.withoutSourceUrl += 1;
    if (!item.hasPeso) summary.withoutPeso += 1;
    if (!item.hasIntensidad) summary.withoutIntensidad += 1;
    if (!item.hasOrigen) summary.withoutOrigen += 1;
    if (!item.hasNotas) summary.withoutNotas += 1;
  }

  summary.averageScore = results.length ? Number((totalScore / results.length).toFixed(2)) : 0;

  return summary;
}

function buildMissingFieldRanking(results) {
  const counts = {};

  for (const item of results) {
    for (const field of item.missingFields) {
      counts[field] = (counts[field] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count);
}

function buildQuickWins(results) {
  return [...results]
    .filter((item) => item.quality === 'poor' || item.quality === 'fair')
    .sort((a, b) => {
      if (a.improvementPotential !== b.improvementPotential) {
        return a.improvementPotential - b.improvementPotential;
      }
      return a.score - b.score;
    })
    .slice(0, 10);
}

function printSummary(summary) {
  console.log('\n==============================');
  console.log('VALIDACIÓN ETIOVE - RESUMEN');
  console.log('==============================');
  console.log(`☕ Total cafés:        ${summary.total}`);
  console.log(`🌟 Excellent:         ${summary.excellent}`);
  console.log(`✅ Good:              ${summary.good}`);
  console.log(`🟡 Fair:              ${summary.fair}`);
  console.log(`❌ Poor:              ${summary.poor}`);
  console.log(`🖼️ Con foto real:     ${summary.withRealPhoto}`);
  console.log(`📷 Con officialPhoto: ${summary.withOfficialPhoto}`);
  console.log(`🕳️ Sin officialPhoto: ${summary.withoutOfficialPhoto}`);
  console.log(`🔢 Con EAN:           ${summary.withEan}`);
  console.log(`🕳️ Sin EAN:           ${summary.withoutEan}`);
  console.log(`🔗 Con URL fuente:    ${summary.withSourceUrl}`);
  console.log(`🕳️ Sin URL fuente:    ${summary.withoutSourceUrl}`);
  console.log(`⚖️ Sin peso:          ${summary.withoutPeso}`);
  console.log(`🔥 Sin intensidad:    ${summary.withoutIntensidad}`);
  console.log(`🌍 Sin origen:        ${summary.withoutOrigen}`);
  console.log(`👃 Sin notas:         ${summary.withoutNotas}`);
  console.log(`📊 Media calidad:     ${summary.averageScore}`);
  console.log('==============================\n');
}

function printTopProblems(results) {
  const poor = results.filter((x) => x.quality === 'poor').sort((a, b) => a.score - b.score);

  const fair = results.filter((x) => x.quality === 'fair').sort((a, b) => a.score - b.score);

  console.log('Peores cafés detectados:\n');

  const selection = [...poor.slice(0, 10), ...fair.slice(0, 5)].slice(0, 15);

  if (!selection.length) {
    console.log('No hay cafés problemáticos.\n');
    return;
  }

  for (const item of selection) {
    console.log(`- ${item.nombre} | score=${item.score} | quality=${item.quality}`);
    if (item.issues.length) {
      console.log(`  Problemas: ${item.issues.join('; ')}`);
    }
    if (item.warnings.length) {
      console.log(`  Avisos: ${item.warnings.join('; ')}`);
    }
  }

  console.log('');
}

function printBestCafes(results) {
  const best = [...results].sort((a, b) => b.score - a.score).slice(0, 10);

  console.log('Mejores cafés detectados:\n');

  for (const item of best) {
    console.log(`- ${item.nombre} | score=${item.score} | quality=${item.quality}`);
  }

  console.log('');
}

function printMissingFieldRanking(ranking) {
  console.log('Campos más ausentes:\n');

  if (!ranking.length) {
    console.log('No hay campos ausentes detectados.\n');
    return;
  }

  for (const item of ranking.slice(0, 10)) {
    console.log(`- ${item.field}: ${item.count}`);
  }

  console.log('');
}

function printQuickWins(quickWins) {
  console.log('Cafés más fáciles de mejorar ahora:\n');

  if (!quickWins.length) {
    console.log('No hay quick wins detectados.\n');
    return;
  }

  for (const item of quickWins) {
    console.log(
      `- ${item.nombre} | score=${item.score} | faltan=${item.improvementPotential} | campos=${item.missingFields.join(', ')}`
    );
  }

  console.log('');
}

function main() {
  if (!fs.existsSync(CAFES_JSON_PATH)) {
    throw new Error(`No existe cafes.json en: ${CAFES_JSON_PATH}`);
  }

  const raw = fs.readFileSync(CAFES_JSON_PATH, 'utf8');
  const cafes = JSON.parse(raw);

  if (!Array.isArray(cafes)) {
    throw new Error('cafes.json debe ser un array');
  }

  const results = cafes.map((cafe, index) => validateOneCafe(cafe, index));
  const summary = buildGlobalSummary(results);
  const missingFieldRanking = buildMissingFieldRanking(results);
  const quickWins = buildQuickWins(results);

  printSummary(summary);
  printTopProblems(results);
  printBestCafes(results);
  printMissingFieldRanking(missingFieldRanking);
  printQuickWins(quickWins);

  if (WRITE_REPORT_FILE) {
    const report = {
      generatedAt: new Date().toISOString(),
      summary,
      missingFieldRanking,
      quickWins,
      results,
    };

    fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(report, null, 2), 'utf8');
    console.log(`Informe guardado en: ${REPORT_JSON_PATH}\n`);
  }
}

try {
  main();
} catch (error) {
  console.error('❌ Error validando cafes.json:', error.message);
  process.exit(1);
}
