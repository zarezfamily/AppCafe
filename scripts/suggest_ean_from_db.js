/*
  Sugiere EANs usando solo datos ya existentes en Firestore.

  Regla: solo propone matches de alta confianza entre cafes activos
  sin EAN y cafes activos con EAN.

  Criterios estrictos:
    - misma marca normalizada
    - mismo formato normalizado
    - nombre base muy similar

  No escribe nada en Firestore. Genera informe JSON y opcionalmente
  puede anexar overrides manuales de alta confianza.
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const WRITE_OVERRIDES = String(process.env.WRITE_OVERRIDES || '').toLowerCase() === 'true';
const REPORT_PATH = path.resolve(process.cwd(), 'scripts/cafes-ean-db-suggestions.json');
const OVERRIDES_PATH = path.resolve(process.cwd(), 'scripts/ean-manual-overrides.json');
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

function normalizeText(value) {
  return String(value || '')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanEan(value) {
  const cleaned = String(value || '')
    .replace(/\D/g, '')
    .trim();
  return cleaned.length >= 8 ? cleaned : '';
}

function normalizeKey(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeBrand(value) {
  const brand = normalizeKey(value);
  const map = {
    'cafe saula': 'saula',
    saula: 'saula',
    aula: 'saula',
    'cafes baque': 'baque',
    baque: 'baque',
    hacendado: 'hacendado',
    marcilla: 'marcilla',
    lavazza: 'lavazza',
    segafredo: 'segafredo',
    starbucks: 'starbucks',
    bonka: 'bonka',
  };
  return map[brand] || brand;
}

function normalizeFormat(doc) {
  const raw = normalizeKey(doc.formato || doc.format || doc.tipoProducto || '');
  if (raw.includes('capsul')) return 'capsules';
  if (raw.includes('molido') || raw.includes('ground')) return 'ground';
  if (raw.includes('grano') || raw.includes('beans')) return 'beans';
  return raw;
}

function baseName(doc) {
  let name = normalizeKey(doc.nombre || doc.name || '');
  const brand = normalizeBrand(doc.roaster || doc.marca || '');
  if (brand) {
    const brandTokens = brand.split(' ');
    for (const token of brandTokens) {
      name = name.replace(new RegExp(`\\b${token}\\b`, 'g'), ' ');
    }
  }

  return name
    .replace(/\b(cafe|cafes|coffee)\b/g, ' ')
    .replace(/\b(en grano|grano|molido|capsulas|capsula|compatible|compatibles)\b/g, ' ')
    .replace(/\b(\d+\s?(g|kg|uds|ud|capsulas|caps))\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(value) {
  return new Set(baseName({ nombre: value }).split(/\s+/).filter(Boolean));
}

function similarity(a, b) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  const intersection = [...A].filter((token) => B.has(token)).length;
  const union = new Set([...A, ...B]).size;
  return union ? intersection / union : 0;
}

function isHighConfidenceMatch(target, candidate) {
  const sameBrand =
    normalizeBrand(target.roaster || target.marca) ===
    normalizeBrand(candidate.roaster || candidate.marca);
  const sameFormat = normalizeFormat(target) === normalizeFormat(candidate);
  const score = similarity(target.nombre || target.name, candidate.nombre || candidate.name);
  const exactBase = baseName(target) && baseName(target) === baseName(candidate);

  return {
    ok: sameBrand && sameFormat && (exactBase || score >= 0.9),
    sameBrand,
    sameFormat,
    score,
    exactBase,
  };
}

async function main() {
  const snapshot = await db.collection('cafes').get();
  const docs = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((doc) => doc.legacy !== true);

  const withEan = docs.filter((doc) => cleanEan(doc.ean || doc.normalizedEan || doc.barcode));
  const withoutEan = docs.filter((doc) => !cleanEan(doc.ean || doc.normalizedEan || doc.barcode));

  const suggestions = [];

  for (const target of withoutEan) {
    const candidates = [];
    for (const candidate of withEan) {
      const verdict = isHighConfidenceMatch(target, candidate);
      if (!verdict.ok) continue;
      candidates.push({
        id: candidate.id,
        nombre: candidate.nombre || candidate.name || '',
        marca: candidate.roaster || candidate.marca || '',
        ean: cleanEan(candidate.ean || candidate.normalizedEan || candidate.barcode),
        score: verdict.score,
        exactBase: verdict.exactBase,
      });
    }

    candidates.sort((a, b) => {
      if (a.exactBase !== b.exactBase) return a.exactBase ? -1 : 1;
      return b.score - a.score;
    });

    const uniqueEans = [...new Set(candidates.map((item) => item.ean))];
    if (uniqueEans.length === 1 && candidates.length) {
      suggestions.push({
        id: target.id,
        fuente: target.fuente || '',
        nombre: target.nombre || target.name || '',
        marca: target.roaster || target.marca || '',
        formato: target.formato || target.format || '',
        url: target.fuenteUrl || target.urlProducto || '',
        suggestedEan: uniqueEans[0],
        confidence: candidates[0].exactBase ? 'high' : 'medium-high',
        matchedWith: candidates.slice(0, 5),
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      activeWithoutEan: withoutEan.length,
      suggestions: suggestions.length,
    },
    suggestions,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log(`[EAN-DB] Suggestions: ${suggestions.length}`);
  console.log(`[EAN-DB] Report: ${REPORT_PATH}`);

  if (!WRITE_OVERRIDES || !suggestions.length) return;

  const current = fs.existsSync(OVERRIDES_PATH)
    ? JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'))
    : [];

  const existingIds = new Set(current.map((item) => item.id).filter(Boolean));
  const appended = suggestions
    .filter((item) => !existingIds.has(item.id))
    .map((item) => ({
      id: item.id,
      url: item.url,
      ean: item.suggestedEan,
      source: 'db_high_confidence_match',
      note: `${item.marca} | ${item.nombre}`,
    }));

  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify([...current, ...appended], null, 2), 'utf8');
  console.log(`[EAN-DB] Overrides appended: ${appended.length}`);
}

main().catch((error) => {
  console.error('[EAN-DB] Error:', error?.stack || error);
  process.exit(1);
});
