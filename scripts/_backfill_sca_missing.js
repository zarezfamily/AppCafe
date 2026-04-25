// Backfill SCA for the 110 cafes missing it, using firebase-admin (fast).
// Reuses computeAutomaticSca logic from backfill_sca_firestore.js
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// ── SCA computation (copied from backfill_sca_firestore.js) ──

function normalizeText(value) {
  return String(value || '').trim();
}
function normalizeEnum(value, allowed = []) {
  const n = normalizeText(value).toLowerCase();
  return allowed.includes(n) ? n : '';
}
function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
}
function normalizeBoolean(value) {
  if (value === true || value === false) return value;
  const n = normalizeText(value).toLowerCase();
  if (['true', '1', 'yes', 'si', 'sí'].includes(n)) return true;
  if (['false', '0', 'no'].includes(n)) return false;
  return null;
}
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
function parseNotesList(value) {
  const raw = normalizeText(value);
  if (!raw) return [];
  return raw
    .split(/[,;|·/]+/)
    .map((i) => i.trim())
    .filter(Boolean);
}
function getLegacy(p, keys) {
  for (const k of keys) {
    const v = p?.[k];
    if (v !== undefined && v !== null && typeof v !== 'object' && String(v).trim() !== '') return v;
  }
  return '';
}

const CAT = ['specialty', 'supermarket', 'bio'];
const FMT = ['beans', 'ground', 'capsules'];
const RST = ['light', 'medium', 'dark'];
const SPE = ['arabica', 'robusta', 'blend'];

function sanitize(p) {
  const name = normalizeText(getLegacy(p, ['name', 'nombre']));
  const roaster = normalizeText(getLegacy(p, ['roaster', 'marca']));
  const origin = normalizeText(getLegacy(p, ['origin', 'origen', 'pais']));
  const process = normalizeText(getLegacy(p, ['process', 'proceso']));
  const variety = normalizeText(getLegacy(p, ['variety', 'variedad']));
  const notes = normalizeText(getLegacy(p, ['notes', 'notas']));
  const category =
    normalizeEnum(p.category, CAT) ||
    (() => {
      const cc = normalizeText(p.coffeeCategory).toLowerCase();
      if (cc === 'daily' || cc === 'commercial') return 'supermarket';
      if (cc === 'specialty') return 'specialty';
      return '';
    })();
  const format = normalizeEnum(getLegacy(p, ['format', 'formato']), FMT);
  const roastLevel = normalizeEnum(getLegacy(p, ['roastLevel', 'tueste']), RST);
  const species = normalizeEnum(getLegacy(p, ['species', 'especie']), SPE);
  const altitude = normalizeNumber(getLegacy(p, ['altitude', 'altura']));
  const scaOff =
    normalizeNumber(getLegacy(p, ['scaScoreOfficial'])) ||
    (p?.sca && typeof p.sca === 'object'
      ? normalizeNumber(p.sca.officialScore ?? p.sca.score)
      : normalizeNumber(getLegacy(p, ['sca'])));
  const decaf = normalizeBoolean(getLegacy(p, ['decaf', 'descafeinado']));
  return {
    name,
    roaster,
    origin,
    process,
    variety,
    notes,
    category,
    format,
    roastLevel,
    species,
    altitude,
    scaScoreOfficial: scaOff,
    decaf,
  };
}

function computeSca(payload) {
  const c = sanitize(payload);
  const off = c.scaScoreOfficial;
  if (Number.isFinite(off) && off >= 60 && off <= 100) {
    return {
      score: Number(clamp(off, 60, 100).toFixed(1)),
      type: 'official',
      confidence: 1,
      officialScore: Number(clamp(off, 60, 100).toFixed(1)),
      reasons: ['SCA oficial indicado manualmente'],
      signals: {
        category: c.category,
        format: c.format,
        roastLevel: c.roastLevel,
        origin: !!c.origin,
        process: !!c.process,
        variety: !!c.variety,
        altitude: !!c.altitude,
        notesCount: parseNotesList(c.notes).length,
      },
    };
  }

  let score = 70,
    confidence = 0.3;
  const nl = parseNotesList(c.notes);
  const reasons = [];

  if (c.category === 'specialty') {
    score += 8;
    confidence += 0.15;
    reasons.push('Café de especialidad');
  }
  if (c.category === 'bio') {
    score += 3;
    confidence += 0.08;
    reasons.push('Café bio');
  }
  if (c.category === 'supermarket') {
    score -= 1;
    reasons.push('Café de supermercado');
  }
  if (c.origin) {
    score += 2;
    confidence += 0.08;
    reasons.push('Origen definido');
  }
  if (c.process) {
    score += 2;
    confidence += 0.08;
    reasons.push('Proceso conocido');
  }
  if (c.variety) {
    score += 2;
    confidence += 0.08;
    reasons.push('Variedad identificada');
  }
  if (c.altitude && c.altitude >= 1000) {
    score += 2;
    confidence += 0.08;
    reasons.push('Altitud elevada');
  } else if (c.altitude && c.altitude > 0) {
    score += 1;
    confidence += 0.04;
    reasons.push('Altitud disponible');
  }
  if (nl.length >= 2) {
    score += 2;
    confidence += 0.06;
    reasons.push('Notas de cata definidas');
  } else if (nl.length === 1) {
    score += 1;
    confidence += 0.03;
    reasons.push('Perfil sensorial básico');
  }
  if (c.roaster) {
    score += 1;
    confidence += 0.04;
    reasons.push('Tostador identificado');
  }
  if (c.roastLevel === 'light') {
    score += 1.5;
    reasons.push('Tueste claro');
  } else if (c.roastLevel === 'medium') {
    score += 1;
    reasons.push('Tueste medio');
  } else if (c.roastLevel === 'dark') {
    score -= 1;
    reasons.push('Tueste oscuro');
  }
  if (c.format === 'beans') {
    score += 1;
    reasons.push('Formato grano');
  } else if (c.format === 'ground') {
    score -= 0.5;
    reasons.push('Formato molido');
  } else if (c.format === 'capsules') {
    score -= 2;
    reasons.push('Formato cápsulas');
  }
  if (c.species === 'arabica') {
    score += 1;
    reasons.push('Especie arábica');
  } else if (c.species === 'blend') {
    score += 0.3;
    reasons.push('Blend');
  } else if (c.species === 'robusta') {
    score -= 1.5;
    reasons.push('Presencia de robusta');
  }
  if (c.decaf === true) {
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
    reasons,
    signals: {
      category: c.category,
      format: c.format,
      roastLevel: c.roastLevel,
      origin: !!c.origin,
      process: !!c.process,
      variety: !!c.variety,
      altitude: !!c.altitude,
      notesCount: nl.length,
      species: c.species,
      decaf: c.decaf,
    },
  };
}

// ── Main ──

(async () => {
  const snap = await db.collection('cafes').get();
  const toFix = [];

  snap.forEach((d) => {
    const data = d.data();
    if (!data.sca || typeof data.sca !== 'object' || data.sca.score == null) {
      toFix.push({ id: d.id, data });
    }
  });

  console.log(`Total: ${snap.size}, Sin SCA: ${toFix.length}`);
  if (toFix.length === 0) {
    console.log('Nada que hacer.');
    process.exit(0);
  }

  let batch = db.batch();
  let ops = 0;
  let ok = 0;

  for (const { id, data } of toFix) {
    const sca = computeSca(data);
    sca.lastCalculatedAt = new Date().toISOString();

    batch.update(db.collection('cafes').doc(id), { sca });
    ops++;
    ok++;

    if (ops >= 400) {
      await batch.commit();
      console.log(`  Committed batch (${ok} so far)`);
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
    console.log(`  Committed final batch`);
  }

  console.log(`\nDone: ${ok} cafes updated with SCA scores.`);

  // Quick summary
  const scores = toFix.map(({ data }) => computeSca(data).score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  console.log(`  Scores: avg=${avg.toFixed(1)}, min=${min}, max=${max}`);

  process.exit(0);
})();
