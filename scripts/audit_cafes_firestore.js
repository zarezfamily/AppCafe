/*
  Audita cafes en Firestore para detectar duplicados e invalidos.

  Modos:
    - Por defecto: solo informe (dry-run)
    - APPLY=true: marca duplicados/invalidos como legacy

  Salidas:
    - scripts/cafes-firestore-audit-report.json

  Criterios:
    - Duplicados por EAN
    - Duplicados por marca + nombre + formato
    - Invalidos claros: sin nombre o sin marca o sin foto real
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const APPLY = String(process.env.APPLY || '').toLowerCase() === 'true';
const REPORT_PATH = path.resolve(process.cwd(), 'scripts/cafes-firestore-audit-report.json');
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

function normalizeKey(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cleanEan(value) {
  const cleaned = String(value || '').replace(/\D/g, '');
  return cleaned.length >= 8 ? cleaned : '';
}

function hasHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function isStorageUrl(value) {
  const url = String(value || '');
  return (
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('.firebasestorage.app') ||
    url.includes('.appspot.com/o/')
  );
}

function getBestPhoto(doc) {
  return normalizeText(doc.bestPhoto || doc.officialPhoto || doc.foto || doc.imageUrl || doc.image);
}

function getDuplicateKey(doc) {
  return [
    normalizeKey(doc.roaster || doc.marca),
    normalizeKey(doc.nombre || doc.name),
    normalizeKey(doc.formato || doc.format),
  ].join('|');
}

function getSourcePriority(doc) {
  const fuente = normalizeKey(doc.fuente);
  const sourceUrl = normalizeKey(doc.fuenteUrl || doc.urlProducto);
  const brand = normalizeKey(doc.roaster || doc.marca);

  const priorityMap = {
    lavazza: 120,
    starbucks: 120,
    saula: 115,
    aula: 80,
    peets: 115,
    onyx: 115,
    stumptown: 115,
    lacolombe: 115,
    pellini_amazon: 60,
    eci_supermercado: 40,
    eci: 40,
    alcampo: 35,
    mercadona: 35,
    web_mercadona: 35,
    hipercor: 35,
    kaffek: 70,
  };

  let score = priorityMap[fuente] || 50;

  if (brand && fuente && brand.includes(fuente)) score += 20;
  if (brand && sourceUrl && sourceUrl.includes(brand)) score += 10;
  if (doc.id && String(doc.id).startsWith('ean_')) score += 8;
  if (fuente === 'saula') score += 5;
  if (fuente === 'aula') score -= 5;

  return score;
}

function scoreDoc(doc) {
  const photo = getBestPhoto(doc);
  const ean = cleanEan(doc.ean || doc.normalizedEan || doc.barcode);
  let score = 0;

  if (ean) score += 40;
  if (
    doc.sca &&
    typeof doc.sca === 'object' &&
    doc.sca.score !== null &&
    doc.sca.score !== undefined
  ) {
    score += 15;
  }
  if (photo) score += 10;
  if (isStorageUrl(photo)) score += 25;
  if (normalizeText(doc.nombre || doc.name).length >= 3) score += 10;
  if (normalizeText(doc.roaster || doc.marca).length >= 2) score += 10;
  if (doc.legacy === true) score -= 200;

  score += getSourcePriority(doc);
  return score;
}

function pickCanonical(docs) {
  return [...docs].sort((a, b) => {
    const byScore = scoreDoc(b) - scoreDoc(a);
    if (byScore !== 0) return byScore;
    const byUpdated = String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    if (byUpdated !== 0) return byUpdated;
    return String(a.id).localeCompare(String(b.id));
  })[0];
}

function isClearlyInvalid(doc) {
  const name = normalizeText(doc.nombre || doc.name);
  const brand = normalizeText(doc.roaster || doc.marca);
  const photo = getBestPhoto(doc);

  return !name || !brand || !hasHttpUrl(photo);
}

function toSummary(doc) {
  return {
    id: doc.id,
    fuente: doc.fuente || '',
    nombre: doc.nombre || doc.name || '',
    marca: doc.roaster || doc.marca || '',
    ean: cleanEan(doc.ean || doc.normalizedEan || doc.barcode),
    formato: doc.formato || doc.format || '',
    legacy: doc.legacy === true,
    hasSca: Boolean(
      doc.sca &&
      typeof doc.sca === 'object' &&
      doc.sca.score !== null &&
      doc.sca.score !== undefined
    ),
    photo: getBestPhoto(doc),
    photoInStorage: isStorageUrl(getBestPhoto(doc)),
    canonicalScore: scoreDoc(doc),
  };
}

async function fetchAllCafes() {
  const snapshot = await db.collection('cafes').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function markLegacy(docId, reason, keepId = '') {
  await db
    .collection('cafes')
    .doc(docId)
    .set(
      {
        legacy: true,
        duplicateOf: keepId || null,
        legacyReason: reason,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
}

async function main() {
  const allDocs = await fetchAllCafes();
  const activeDocs = allDocs.filter((doc) => doc.legacy !== true);

  const byEan = new Map();
  const byKey = new Map();

  for (const doc of activeDocs) {
    const ean = cleanEan(doc.ean || doc.normalizedEan || doc.barcode);
    if (ean) {
      if (!byEan.has(ean)) byEan.set(ean, []);
      byEan.get(ean).push(doc);
    }

    const key = getDuplicateKey(doc);
    if (key !== '||') {
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(doc);
    }
  }

  const duplicateEanGroups = [...byEan.entries()]
    .filter(([, docs]) => docs.length > 1)
    .map(([ean, docs]) => {
      const canonical = pickCanonical(docs);
      const duplicates = docs.filter((doc) => doc.id !== canonical.id);
      return {
        type: 'ean',
        key: ean,
        canonical: toSummary(canonical),
        duplicates: duplicates.map(toSummary),
      };
    });

  const duplicateKeyGroups = [...byKey.entries()]
    .filter(([, docs]) => docs.length > 1)
    .map(([key, docs]) => {
      const canonical = pickCanonical(docs);
      const duplicates = docs.filter((doc) => doc.id !== canonical.id);
      return {
        type: 'brand_name_format',
        key,
        canonical: toSummary(canonical),
        duplicates: duplicates.map(toSummary),
      };
    });

  const invalidDocs = activeDocs.filter(isClearlyInvalid).map(toSummary);

  const duplicateIdsToLegacy = new Map();
  for (const group of [...duplicateEanGroups, ...duplicateKeyGroups]) {
    for (const duplicate of group.duplicates) {
      if (!duplicateIdsToLegacy.has(duplicate.id)) {
        duplicateIdsToLegacy.set(duplicate.id, {
          keepId: group.canonical.id,
          reason: `duplicate_${group.type}`,
        });
      }
    }
  }

  const invalidIdsToLegacy = new Map();
  for (const doc of invalidDocs) {
    if (!duplicateIdsToLegacy.has(doc.id)) {
      invalidIdsToLegacy.set(doc.id, { reason: 'invalid_missing_core_fields' });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: !APPLY,
    totals: {
      total: allDocs.length,
      active: activeDocs.length,
      legacy: allDocs.length - activeDocs.length,
      duplicateEanGroups: duplicateEanGroups.length,
      duplicateEanDocs: duplicateEanGroups.reduce((sum, group) => sum + group.duplicates.length, 0),
      duplicateKeyGroups: duplicateKeyGroups.length,
      duplicateKeyDocs: duplicateKeyGroups.reduce((sum, group) => sum + group.duplicates.length, 0),
      invalidDocs: invalidDocs.length,
      toMarkLegacy: duplicateIdsToLegacy.size + invalidIdsToLegacy.size,
    },
    duplicateEanGroups,
    duplicateKeyGroups,
    invalidDocs,
    actions: {
      duplicateDocsToLegacy: [...duplicateIdsToLegacy.entries()].map(([id, payload]) => ({
        id,
        ...payload,
      })),
      invalidDocsToLegacy: [...invalidIdsToLegacy.entries()].map(([id, payload]) => ({
        id,
        ...payload,
      })),
    },
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(`[AUDIT] Total docs: ${report.totals.total}`);
  console.log(`[AUDIT] Active docs: ${report.totals.active}`);
  console.log(`[AUDIT] Duplicate EAN groups: ${report.totals.duplicateEanGroups}`);
  console.log(`[AUDIT] Duplicate brand/name/format groups: ${report.totals.duplicateKeyGroups}`);
  console.log(`[AUDIT] Invalid docs: ${report.totals.invalidDocs}`);
  console.log(`[AUDIT] Candidate legacy updates: ${report.totals.toMarkLegacy}`);
  console.log(`[AUDIT] Report: ${REPORT_PATH}`);

  if (!APPLY) {
    console.log('[AUDIT] Dry-run only. No changes applied.');
    return;
  }

  let applied = 0;
  for (const [id, payload] of duplicateIdsToLegacy.entries()) {
    await markLegacy(id, payload.reason, payload.keepId);
    applied += 1;
  }
  for (const [id, payload] of invalidIdsToLegacy.entries()) {
    await markLegacy(id, payload.reason);
    applied += 1;
  }

  console.log(`[AUDIT] Applied legacy updates: ${applied}`);
}

main().catch((error) => {
  console.error('[AUDIT] Error:', error?.stack || error);
  process.exit(1);
});
