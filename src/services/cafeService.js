import { getDocument, queryCollection, setDocument, updateDocument } from './firestoreService';

const CAFES_COLLECTION = 'cafes';

const CATEGORY_VALUES = ['specialty', 'supermarket', 'bio'];
const FORMAT_VALUES = ['beans', 'ground', 'capsules'];
const ROAST_LEVEL_VALUES = ['light', 'medium', 'dark'];
const SPECIES_VALUES = ['arabica', 'robusta', 'blend'];

export function normalizeEan(raw) {
  return String(raw || '')
    .replace(/\D/g, '')
    .trim();
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeEnum(value, allowedValues = []) {
  const normalized = normalizeText(value).toLowerCase();
  return allowedValues.includes(normalized) ? normalized : '';
}

function normalizeBoolean(value) {
  if (value === true || value === false) return value;

  const normalized = normalizeText(value).toLowerCase();
  if (['true', '1', 'yes', 'si', 'sí'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;

  return null;
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return null;

  const normalized = String(value).replace(',', '.').trim();
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseNotesList(value) {
  const raw = normalizeText(value);
  if (!raw) return [];

  return raw
    .split(/[,;|·/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildScaReason(label, condition) {
  return condition ? label : null;
}

function getLegacyAwareValue(payload = {}, keys = []) {
  for (const key of keys) {
    const value = payload?.[key];
    if (
      value !== undefined &&
      value !== null &&
      typeof value !== 'object' &&
      String(value).trim() !== ''
    ) {
      return value;
    }
  }
  return '';
}

export function sanitizeCafePayload(payload = {}) {
  const ean = normalizeEan(payload.ean || payload.normalizedEan);

  const name = normalizeText(getLegacyAwareValue(payload, ['name', 'nombre']));
  const roaster = normalizeText(getLegacyAwareValue(payload, ['roaster', 'marca']));
  const origin = normalizeText(getLegacyAwareValue(payload, ['origin', 'origen', 'pais']));
  const process = normalizeText(getLegacyAwareValue(payload, ['process', 'proceso']));
  const variety = normalizeText(getLegacyAwareValue(payload, ['variety', 'variedad']));
  const notes = normalizeText(getLegacyAwareValue(payload, ['notes', 'notas']));
  const imageUrl = normalizeText(
    getLegacyAwareValue(payload, ['imageUrl', 'bestPhoto', 'officialPhoto', 'foto', 'image'])
  );

  const category =
    normalizeEnum(payload.category, CATEGORY_VALUES) ||
    (() => {
      const coffeeCategory = normalizeText(payload.coffeeCategory).toLowerCase();
      if (coffeeCategory === 'daily' || coffeeCategory === 'commercial') return 'supermarket';
      if (coffeeCategory === 'specialty') return 'specialty';
      return '';
    })();

  const format = normalizeEnum(getLegacyAwareValue(payload, ['format', 'formato']), FORMAT_VALUES);

  const roastLevel = normalizeEnum(
    getLegacyAwareValue(payload, ['roastLevel', 'tueste']),
    ROAST_LEVEL_VALUES
  );

  const species = normalizeEnum(
    getLegacyAwareValue(payload, ['species', 'especie']),
    SPECIES_VALUES
  );

  const altitude = normalizeNumber(getLegacyAwareValue(payload, ['altitude', 'altura']));
  const scaScoreOfficial =
    normalizeNumber(getLegacyAwareValue(payload, ['scaScoreOfficial'])) ||
    (payload?.sca && typeof payload.sca === 'object'
      ? normalizeNumber(payload.sca.officialScore ?? payload.sca.score)
      : normalizeNumber(getLegacyAwareValue(payload, ['sca'])));

  const decaf = normalizeBoolean(getLegacyAwareValue(payload, ['decaf', 'descafeinado']));

  return {
    ean,
    normalizedEan: ean,
    name,
    nombre: name,

    roaster,
    marca: roaster,

    origin,
    origen: origin,
    pais: origin,

    process,
    proceso: process,

    variety,
    variedad: variety,

    notes,
    notas: notes,

    imageUrl,
    foto: imageUrl,

    category,
    coffeeCategory:
      category === 'supermarket' ? 'daily' : category === 'specialty' ? 'specialty' : '',
    format,
    formato: format,
    roastLevel,
    tueste: roastLevel,
    species,
    altitude,
    altura: altitude,
    scaScoreOfficial,
    decaf,
  };
}

export function isCafeIncomplete(cafe) {
  if (!cafe) return true;

  const name = String(cafe.name || cafe.nombre || '').trim();
  const roaster = String(cafe.roaster || cafe.marca || '').trim();
  const image = String(
    cafe.imageUrl || cafe.bestPhoto || cafe.officialPhoto || cafe.foto || cafe.image || ''
  ).trim();
  const ean = String(cafe.ean || cafe.normalizedEan || '').trim();

  return !(ean && name && roaster && image);
}

export function canBeApproved(cafe) {
  return !isCafeIncomplete(cafe);
}

export function buildCompletionStatus(cafe) {
  return isCafeIncomplete(cafe) ? 'incomplete' : 'ready';
}

export function computeAutomaticSca(payload = {}) {
  const cafe = sanitizeCafePayload(payload);

  const officialScore = cafe.scaScoreOfficial;
  if (Number.isFinite(officialScore) && officialScore >= 60 && officialScore <= 100) {
    return {
      score: Number(clamp(officialScore, 60, 100).toFixed(1)),
      type: 'official',
      confidence: 1,
      officialScore: Number(clamp(officialScore, 60, 100).toFixed(1)),
      reasons: ['SCA oficial indicado manualmente'],
      signals: {
        category: cafe.category || '',
        format: cafe.format || '',
        roastLevel: cafe.roastLevel || '',
        origin: !!cafe.origin,
        process: !!cafe.process,
        variety: !!cafe.variety,
        altitude: !!cafe.altitude,
        notesCount: parseNotesList(cafe.notes).length,
      },
    };
  }

  let score = 70;
  let confidence = 0.3;

  const notesList = parseNotesList(cafe.notes);
  const reasons = [];

  if (cafe.category === 'specialty') {
    score += 8;
    confidence += 0.15;
    reasons.push('Café de especialidad');
  }

  if (cafe.category === 'bio') {
    score += 3;
    confidence += 0.08;
    reasons.push('Café bio');
  }

  if (cafe.category === 'supermarket') {
    score -= 1;
    reasons.push('Café de supermercado');
  }

  if (cafe.origin) {
    score += 2;
    confidence += 0.08;
    reasons.push('Origen definido');
  }

  if (cafe.process) {
    score += 2;
    confidence += 0.08;
    reasons.push('Proceso conocido');
  }

  if (cafe.variety) {
    score += 2;
    confidence += 0.08;
    reasons.push('Variedad identificada');
  }

  if (cafe.altitude && cafe.altitude >= 1000) {
    score += 2;
    confidence += 0.08;
    reasons.push('Altitud elevada');
  } else if (cafe.altitude && cafe.altitude > 0) {
    score += 1;
    confidence += 0.04;
    reasons.push('Altitud disponible');
  }

  if (notesList.length >= 2) {
    score += 2;
    confidence += 0.06;
    reasons.push('Notas de cata definidas');
  } else if (notesList.length === 1) {
    score += 1;
    confidence += 0.03;
    reasons.push('Perfil sensorial básico');
  }

  if (cafe.roaster) {
    score += 1;
    confidence += 0.04;
    reasons.push('Tostador identificado');
  }

  if (cafe.roastLevel === 'light') {
    score += 1.5;
    reasons.push('Tueste claro');
  } else if (cafe.roastLevel === 'medium') {
    score += 1;
    reasons.push('Tueste medio');
  } else if (cafe.roastLevel === 'dark') {
    score -= 1;
    reasons.push('Tueste oscuro');
  }

  if (cafe.format === 'beans') {
    score += 1;
    reasons.push('Formato grano');
  } else if (cafe.format === 'ground') {
    score -= 0.5;
    reasons.push('Formato molido');
  } else if (cafe.format === 'capsules') {
    score -= 2;
    reasons.push('Formato cápsulas');
  }

  if (cafe.species === 'arabica') {
    score += 1;
    reasons.push('Especie arábica');
  } else if (cafe.species === 'blend') {
    score += 0.3;
    reasons.push('Blend');
  } else if (cafe.species === 'robusta') {
    score -= 1.5;
    reasons.push('Presencia de robusta');
  }

  if (cafe.decaf === true) {
    score -= 0.5;
    reasons.push('Descafeinado');
  }

  score = clamp(score, 60, 89);
  confidence = clamp(confidence, 0.2, 0.95);

  return {
    score: Number(score.toFixed(1)),
    type: 'estimated',
    confidence: Number(confidence.toFixed(2)),
    officialScore: null,
    reasons: reasons.filter(Boolean),
    signals: {
      category: cafe.category || '',
      format: cafe.format || '',
      roastLevel: cafe.roastLevel || '',
      origin: !!cafe.origin,
      process: !!cafe.process,
      variety: !!cafe.variety,
      altitude: !!cafe.altitude,
      notesCount: notesList.length,
      species: cafe.species || '',
      decaf: cafe.decaf,
    },
  };
}

export function buildScaPayload(payload = {}) {
  const sca = computeAutomaticSca(payload);

  return {
    ...sca,
    lastCalculatedAt: new Date().toISOString(),
  };
}

export async function findCafeByEan(rawEan) {
  const normalizedEan = normalizeEan(rawEan);
  if (!normalizedEan) return null;

  return await getDocument(CAFES_COLLECTION, normalizedEan);
}

/**
 * Compatibilidad por si ya tienes docs antiguos con auto-id.
 * Busca por normalizedEan si no existe docId = EAN.
 */
export async function findLegacyCafeByEan(rawEan) {
  const normalizedEan = normalizeEan(rawEan);
  if (!normalizedEan) return null;

  const docs = await queryCollection(CAFES_COLLECTION, 'normalizedEan', normalizedEan);
  return docs?.[0] ?? null;
}

export async function findAnyCafeByEan(rawEan) {
  const byDocId = await findCafeByEan(rawEan);
  if (byDocId) return byDocId;

  return await findLegacyCafeByEan(rawEan);
}

export async function createOrGetPendingCafeFromScan(rawEan, userId = null) {
  const normalizedEan = normalizeEan(rawEan);

  if (!normalizedEan) {
    throw new Error('EAN inválido');
  }

  const existing = await getDocument(CAFES_COLLECTION, normalizedEan);
  if (!existing) {
    const now = new Date().toISOString();
    const basePayload = {
      ean: normalizedEan,
      normalizedEan,
      name: '',
      nombre: '',
      roaster: '',
      marca: '',
      origin: '',
      origen: '',
      pais: '',
      process: '',
      proceso: '',
      variety: '',
      variedad: '',
      notes: '',
      notas: '',
      imageUrl: '',
      foto: '',
      category: '',
      coffeeCategory: '',
      format: '',
      formato: '',
      roastLevel: '',
      tueste: '',
      species: '',
      altitude: null,
      altura: null,
      scaScoreOfficial: null,
      decaf: null,
    };

    await setDocument(CAFES_COLLECTION, normalizedEan, {
      ...basePayload,
      sca: buildScaPayload(basePayload),
      status: 'pending',
      completionStatus: 'incomplete',
      provisional: true,
      createdFrom: 'scan',
      createdBy: userId,
      updatedBy: userId,
      approvedBy: null,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  return normalizedEan;
}

export async function getCafeById(cafeId) {
  if (!cafeId) return null;

  return await getDocument(CAFES_COLLECTION, cafeId);
}

export async function saveCafeDraft(cafeId, payload, userId = null) {
  if (!cafeId) {
    throw new Error('Falta cafeId');
  }

  const clean = sanitizeCafePayload(payload);

  if (!clean.normalizedEan) {
    throw new Error('EAN inválido');
  }

  const current = await getDocument(CAFES_COLLECTION, cafeId);
  if (!current) {
    throw new Error('El café no existe');
  }

  const merged = {
    ...current,
    ...clean,
  };

  const completionStatus = buildCompletionStatus(merged);
  const sca = buildScaPayload(merged);

  const now = new Date().toISOString();
  await updateDocument(CAFES_COLLECTION, cafeId, {
    ...clean,
    sca,
    status: 'pending',
    completionStatus,
    provisional: true,
    updatedBy: userId,
    updatedAt: now,
  });

  return cafeId;
}

export async function approveCafe(cafeId, userId = null) {
  if (!cafeId) {
    throw new Error('Falta cafeId');
  }

  const current = await getDocument(CAFES_COLLECTION, cafeId);
  if (!current) {
    throw new Error('El café no existe');
  }

  if (!canBeApproved(current)) {
    throw new Error('No se puede aprobar: faltan campos obligatorios');
  }

  const now = new Date().toISOString();
  await updateDocument(CAFES_COLLECTION, cafeId, {
    status: 'approved',
    completionStatus: 'complete',
    provisional: false,
    approvedBy: userId,
    approvedAt: now,
    updatedBy: userId,
    updatedAt: now,
  });
}

export async function rejectCafe(cafeId, userId = null) {
  if (!cafeId) {
    throw new Error('Falta cafeId');
  }

  const now = new Date().toISOString();
  await updateDocument(CAFES_COLLECTION, cafeId, {
    status: 'rejected',
    updatedBy: userId,
    updatedAt: now,
  });
}

export async function resolveScan(rawEan, userId = null) {
  const normalizedEan = normalizeEan(rawEan);

  if (!normalizedEan) {
    throw new Error('EAN inválido');
  }

  const existing = await findAnyCafeByEan(normalizedEan);

  if (!existing) {
    const cafeId = await createOrGetPendingCafeFromScan(normalizedEan, userId);

    return {
      action: 'edit_new_pending',
      cafeId,
    };
  }

  const incomplete =
    existing.status === 'pending' &&
    (existing.completionStatus === 'incomplete' || isCafeIncomplete(existing));

  if (incomplete) {
    return {
      action: 'continue_pending',
      cafeId: existing.id,
    };
  }

  if (existing.status === 'pending') {
    return {
      action: 'view_pending',
      cafeId: existing.id,
    };
  }

  if (existing.status === 'approved') {
    return {
      action: 'view_approved',
      cafeId: existing.id,
    };
  }

  return {
    action: 'view_existing',
    cafeId: existing.id,
  };
}
