/*
  Enriquece cafés en Firestore con IA (OpenAI) y heurísticas locales.

  ─────────────────────────────────────────────────────────────────────
  FASE 1 — LIMPIEZA (determinista, sin API)
    · Decodifica HTML entities en campos texto
    · Normaliza espacios y caracteres de control
    · Alinea campos duplicados (nombre↔name, marca↔roaster, etc.)
    · Corrige enums (format, roastLevel, species, category)

  FASE 2 — INFERENCIA LOCAL (heurísticas, sin API)
    · Deduce roastLevel desde intensidad + keywords
    · Deduce species desde keywords (arábica/robusta/mezcla)
    · Deduce decaf desde nombre/descripcion
    · Deduce isBio desde certificaciones/texto
    · Deduce format desde tipoProducto/nombre
    · Infiere coffeeCategory desde category si falta

  FASE 3 — ENRIQUECIMIENTO IA (OpenAI GPT-4.1-mini)
    · Completa campos faltantes: origen, proceso, variedad, tueste, notas
    · Genera notas de cata coherentes en español
    · Genera descripcionIA si no hay descripción propia
    · Solo llama a OpenAI cuando realmente faltan datos clave

  ─────────────────────────────────────────────────────────────────────
  Uso:
    node --env-file=.env scripts/enrich_cafes_ai.js          # dry-run (solo informe)
    APPLY=true node --env-file=.env scripts/enrich_cafes_ai.js
    SKIP_AI=true APPLY=true node --env-file=.env scripts/enrich_cafes_ai.js
    FORCE=true LIMIT=50 APPLY=true node --env-file=.env scripts/enrich_cafes_ai.js
    ONLY_INCOMPLETE=false APPLY=true node --env-file=.env scripts/enrich_cafes_ai.js

  Variables de entorno necesarias (.env):
    EXPO_PUBLIC_FIREBASE_PROJECT_ID
    EXPO_PUBLIC_FIREBASE_API_KEY
    FIREBASE_AUTH_TOKEN          ← token de autenticación Firebase
    OPENAI_API_KEY               ← solo para FASE 3
*/

'use strict';

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────

const APPLY = process.env.APPLY === 'true';
const DRY_RUN = !APPLY;
const SKIP_AI = process.env.SKIP_AI === 'true';
const FORCE = process.env.FORCE === 'true';
const ONLY_INCOMPLETE = process.env.ONLY_INCOMPLETE !== 'false'; // default: true
const LIMIT = parseInt(process.env.LIMIT || '0', 10) || 0;
const PAGE_SIZE = parseInt(process.env.PAGE_SIZE || '300', 10) || 300;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const OPENAI_RPM = parseInt(process.env.OPENAI_RPM || '30', 10) || 30; // requests/min
const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const REPORT_PATH = path.resolve(process.cwd(), 'scripts/cafes-ai-enrichment-report.json');

// ── Service-account JWT auth (no external packages needed) ─────────────
// Looks for serviceAccountKey.json in cwd or project root.
// Falls back to FIREBASE_AUTH_TOKEN env var if present.
const SA_KEY_PATH =
  process.env.SA_KEY_PATH ||
  (fs.existsSync(path.resolve(process.cwd(), 'serviceAccountKey.json'))
    ? path.resolve(process.cwd(), 'serviceAccountKey.json')
    : null);

let _serviceAccount = null;
let _cachedToken = null;
let _tokenExpiry = 0;

function loadServiceAccount() {
  if (_serviceAccount) return _serviceAccount;
  if (!SA_KEY_PATH) return null;
  try {
    _serviceAccount = JSON.parse(fs.readFileSync(SA_KEY_PATH, 'utf8'));
    return _serviceAccount;
  } catch {
    return null;
  }
}

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function mintAccessToken() {
  const sa = loadServiceAccount();
  if (!sa) return process.env.FIREBASE_AUTH_TOKEN || process.env.TOKEN || '';

  const now = Math.floor(Date.now() / 1000);
  if (_cachedToken && now < _tokenExpiry - 60) return _cachedToken;

  const header = base64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claim = base64url(
    Buffer.from(
      JSON.stringify({
        iss: sa.client_email,
        sub: sa.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope:
          'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
      })
    )
  );

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${claim}`);
  const signature = base64url(sign.sign(sa.private_key));

  const jwt = `${header}.${claim}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`Token mint failed: ${JSON.stringify(json)}`);

  _cachedToken = json.access_token;
  _tokenExpiry = now + (json.expires_in || 3600);
  return _cachedToken;
}

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
  loadServiceAccount()?.project_id ||
  '';

if (!PROJECT_ID) {
  console.error('❌  No se encontró EXPO_PUBLIC_FIREBASE_PROJECT_ID ni serviceAccountKey.json');
  process.exit(1);
}

if (!SA_KEY_PATH && !process.env.FIREBASE_AUTH_TOKEN && !process.env.TOKEN) {
  console.error('❌  No se encontró serviceAccountKey.json ni FIREBASE_AUTH_TOKEN');
  process.exit(1);
}

if (!SKIP_AI && !process.env.OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY no configurada → FASE 3 (IA) se omitirá automáticamente.');
}

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const authHeaders = async () => ({
  Authorization: `Bearer ${await mintAccessToken()}`,
  'Content-Type': 'application/json',
});

// ─────────────────────────────────────────────────────────────────────
// FIRESTORE HELPERS
// ─────────────────────────────────────────────────────────────────────

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number')
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val) {
  if (!val || typeof val !== 'object') return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) return (val.arrayValue?.values || []).map(fromFirestoreValue);
  if ('mapValue' in val) {
    const obj = {};
    for (const [k, v] of Object.entries(val.mapValue?.fields || {})) obj[k] = fromFirestoreValue(v);
    return obj;
  }
  return null;
}

function docToObject(doc) {
  if (!doc?.fields) return { id: doc?.name?.split('/').pop() || '' };
  const obj = {};
  for (const [key, val] of Object.entries(doc.fields)) obj[key] = fromFirestoreValue(val);
  obj.id = doc.name?.split('/').pop();
  return obj;
}

async function listAllCafes() {
  const docs = [];
  let pageToken = null;

  do {
    const url = `${BASE_URL}/cafes?pageSize=${PAGE_SIZE}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, { headers: await authHeaders() });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Firestore list failed ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    (json.documents || []).forEach((d) => docs.push(docToObject(d)));
    pageToken = json.nextPageToken || null;
  } while (pageToken);

  return docs;
}

async function patchCafe(cafeId, fields) {
  if (DRY_RUN) return;

  const updateMask = Object.keys(fields)
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join('&');

  const firestoreFields = {};
  for (const [k, v] of Object.entries(fields)) firestoreFields[k] = toFirestoreValue(v);

  const url = `${BASE_URL}/cafes/${encodeURIComponent(cafeId)}?${updateMask}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ fields: firestoreFields }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PATCH ${cafeId} failed ${res.status}: ${txt.slice(0, 200)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────
// PHASE 1 — CLEANING (deterministic, no API)
// ─────────────────────────────────────────────────────────────────────

const HTML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&ndash;': '–',
  '&mdash;': '—',
  '&ldquo;': '"',
  '&rdquo;': '"',
  '&lsquo;': '\u2018',
  '&rsquo;': '\u2019',
  '&#xae;': '®',
  '&#174;': '®',
  '&#x2122;': '™',
  '&#8211;': '–',
  '&#8212;': '—',
};

function decodeHtml(str) {
  if (typeof str !== 'string') return str;
  let s = str;
  for (const [ent, ch] of Object.entries(HTML_ENTITIES)) {
    s = s.replaceAll(ent, ch);
  }
  // Numeric hex entities: &#xHHHH;
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
  // Numeric decimal entities: &#DDDD;
  s = s.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  return s.replace(/\s+/g, ' ').trim();
}

const VALID_FORMATS = new Set(['beans', 'ground', 'capsules']);
const VALID_ROAST = new Set(['light', 'medium', 'dark']);
const VALID_SPECIES = new Set(['arabica', 'robusta', 'blend']);
const VALID_CATEGORY = new Set(['specialty', 'supermarket', 'bio']);

const FORMAT_ALIASES = {
  grano: 'beans',
  'en grano': 'beans',
  grain: 'beans',
  whole: 'beans',
  bean: 'beans',
  molido: 'ground',
  ground: 'ground',
  moído: 'ground',
  capsulas: 'capsules',
  cápsulas: 'capsules',
  capsule: 'capsules',
  capsula: 'capsules',
  nespresso: 'capsules',
  'dolce gusto': 'capsules',
  pods: 'capsules',
};
const ROAST_ALIASES = {
  claro: 'light',
  clara: 'light',
  tueste_claro: 'light',
  ligero: 'light',
  'light roast': 'light',
  medio: 'medium',
  media: 'medium',
  'medium roast': 'medium',
  'tueste medio': 'medium',
  oscuro: 'dark',
  oscura: 'dark',
  dark: 'dark',
  'dark roast': 'dark',
  tostado: 'dark',
  intenso: 'dark',
  intense: 'dark',
  fuerte: 'dark',
};
const SPECIES_ALIASES = {
  arabica: 'arabica',
  arábica: 'arabica',
  arabigo: 'arabica',
  'arabica 100%': 'arabica',
  '100% arabica': 'arabica',
  robusta: 'robusta',
  blend: 'blend',
  mezcla: 'blend',
  blended: 'blend',
};

function normalizeEnum(val, validSet, aliases) {
  if (!val) return '';
  const normalized = String(val).trim().toLowerCase();
  if (validSet.has(normalized)) return normalized;
  return aliases[normalized] || '';
}

function getTextFields(_cafe) {
  return ['nombre', 'name', 'descripcion', 'description', 'notas', 'notes', 'certificaciones'];
}

function cleanPhase(cafe) {
  const changes = {};

  // Decode HTML entities in all text fields
  for (const field of getTextFields(cafe)) {
    const raw = cafe[field];
    if (typeof raw === 'string') {
      const decoded = decodeHtml(raw);
      if (decoded !== raw) changes[field] = decoded;
    }
  }

  // Align duplicate text fields (use whichever is richer)
  const nombre = decodeHtml(cafe.nombre || cafe.name || '');
  const name = nombre;
  if (nombre && (!cafe.nombre || !cafe.name || cafe.nombre !== cafe.name)) {
    changes.nombre = nombre;
    changes.name = name;
  }

  const marca = decodeHtml(cafe.marca || cafe.roaster || '');
  if (marca) {
    if (cafe.marca !== marca) changes.marca = marca;
    if (cafe.roaster !== marca) changes.roaster = marca;
  }

  const origen = decodeHtml(cafe.origen || cafe.pais || cafe.origin || '');
  if (origen) {
    if (cafe.origen !== origen) changes.origen = origen;
    if (cafe.pais !== origen) changes.pais = origen;
    if (cafe.origin !== origen) changes.origin = origen;
  }

  const notas = decodeHtml(cafe.notas || cafe.notes || '');
  if (notas) {
    if (cafe.notas !== notas) changes.notas = notas;
    if (cafe.notes !== notas) changes.notes = notas;
  }

  const descripcion = decodeHtml(cafe.descripcion || cafe.description || '');
  if (descripcion) {
    if (cafe.descripcion !== descripcion) changes.descripcion = descripcion;
    if (cafe.description !== descripcion) changes.description = descripcion;
  }

  // Fix enums
  const format = normalizeEnum(cafe.formato || cafe.format, VALID_FORMATS, FORMAT_ALIASES);
  if (format && cafe.format !== format) {
    changes.format = format;
    changes.formato = format;
  }

  const roastLevel = normalizeEnum(cafe.tueste || cafe.roastLevel, VALID_ROAST, ROAST_ALIASES);
  if (roastLevel && cafe.roastLevel !== roastLevel) {
    changes.roastLevel = roastLevel;
    changes.tueste = roastLevel;
  }

  const species = normalizeEnum(cafe.especie || cafe.species, VALID_SPECIES, SPECIES_ALIASES);
  if (species && cafe.species !== species) {
    changes.species = species;
    changes.especie = species;
  }

  // Align category ↔ coffeeCategory
  const cat = normalizeEnum(cafe.category, VALID_CATEGORY, { supermarket: 'supermarket' });
  if (cat) {
    const expectedCoffeeCategory = cat === 'supermarket' ? 'daily' : cat;
    if (cafe.coffeeCategory !== expectedCoffeeCategory)
      changes.coffeeCategory = expectedCoffeeCategory;
  }

  return changes;
}

// ─────────────────────────────────────────────────────────────────────
// PHASE 2 — LOCAL INFERENCE (heuristics, no API)
// ─────────────────────────────────────────────────────────────────────

function textBag(cafe) {
  return [
    cafe.nombre,
    cafe.name,
    cafe.descripcion,
    cafe.description,
    cafe.notas,
    cafe.notes,
    cafe.certificaciones,
    cafe.tipoProducto,
  ]
    .map((v) => String(v || '').toLowerCase())
    .join(' ');
}

const ORIGIN_KEYWORDS = {
  etiopia: 'Etiopía',
  ethiopia: 'Etiopía',
  yirgacheffe: 'Etiopía',
  sidamo: 'Etiopía',
  harrar: 'Etiopía',
  guji: 'Etiopía',
  colombia: 'Colombia',
  colombiano: 'Colombia',
  huila: 'Colombia',
  nariño: 'Colombia',
  cauca: 'Colombia',
  brasil: 'Brasil',
  brazil: 'Brasil',
  brasileiro: 'Brasil',
  kenya: 'Kenya',
  kenia: 'Kenya',
  'costa rica': 'Costa Rica',
  costarica: 'Costa Rica',
  guatemala: 'Guatemala',
  guatelmala: 'Guatemala',
  peru: 'Perú',
  perú: 'Perú',
  honduras: 'Honduras',
  nicaragua: 'Nicaragua',
  'el salvador': 'El Salvador',
  panama: 'Panamá',
  panamá: 'Panamá',
  java: 'Indonesia',
  sumatra: 'Indonesia',
  indonesia: 'Indonesia',
  vietnam: 'Vietnam',
  'viet nam': 'Vietnam',
  india: 'India',
  monzón: 'India',
  rwanda: 'Ruanda',
  ruanda: 'Ruanda',
  tanzania: 'Tanzania',
  burundi: 'Burundi',
  mexico: 'México',
  méxico: 'México',
  chiapas: 'México',
  oaxaca: 'México',
  jamaica: 'Jamaica',
  'blue mountain': 'Jamaica',
  hawaii: 'Hawaii',
  kona: 'Hawaii',
  yemen: 'Yemen',
};

const PROCESS_KEYWORDS = {
  lavado: 'Lavado',
  washed: 'Lavado',
  'wet process': 'Lavado',
  natural: 'Natural',
  'dry process': 'Natural',
  'proceso natural': 'Natural',
  honey: 'Honey',
  miel: 'Honey',
  anaerobic: 'Anaeróbico',
  anaerobico: 'Anaeróbico',
  anaeróbico: 'Anaeróbico',
  'semi-lavado': 'Semi-lavado',
  'semi lavado': 'Semi-lavado',
  'doble fermentación': 'Doble fermentación',
  'double fermented': 'Doble fermentación',
};

const VARIETY_KEYWORDS = {
  bourbon: 'Bourbon',
  typica: 'Typica',
  geisha: 'Geisha',
  geshe: 'Geisha',
  pacamara: 'Pacamara',
  maragogipe: 'Maragogipe',
  catuai: 'Catuai',
  caturra: 'Caturra',
  castillo: 'Castillo',
  java: 'Java',
  sl28: 'SL28',
  sl34: 'SL34',
  ruiru: 'Ruiru 11',
  heirloom: 'Heirloom',
  heritage: 'Heirloom',
  sidra: 'Sidra',
  'wush wush': 'Wush Wush',
  laurina: 'Laurina',
  'mundo novo': 'Mundo Novo',
};

function inferPhase(cafe, alreadyCleaned) {
  const merged = { ...cafe, ...alreadyCleaned };
  const bag = textBag(merged);
  const changes = {};

  // Infer origin
  if (!merged.origen && !merged.pais) {
    for (const [kw, country] of Object.entries(ORIGIN_KEYWORDS)) {
      if (bag.includes(kw)) {
        changes.origen = country;
        changes.pais = country;
        changes.origin = country;
        break;
      }
    }
  }

  // Infer process
  if (!merged.proceso) {
    for (const [kw, proc] of Object.entries(PROCESS_KEYWORDS)) {
      if (bag.includes(kw)) {
        changes.proceso = proc;
        changes.process = proc;
        break;
      }
    }
  }

  // Infer variety
  if (!merged.variedad) {
    for (const [kw, variety] of Object.entries(VARIETY_KEYWORDS)) {
      if (bag.includes(kw)) {
        changes.variedad = variety;
        changes.variety = variety;
        break;
      }
    }
  }

  // Infer roastLevel from intensidad (1-5 scale → light/medium/dark)
  if (!merged.roastLevel && !alreadyCleaned.roastLevel) {
    const intensidad = Number(merged.intensidad || 0);
    if (intensidad >= 1 && intensidad <= 2) {
      changes.roastLevel = 'light';
      changes.tueste = 'light';
    } else if (intensidad >= 3 && intensidad <= 3) {
      changes.roastLevel = 'medium';
      changes.tueste = 'medium';
    } else if (intensidad >= 4) {
      changes.roastLevel = 'dark';
      changes.tueste = 'dark';
    }
  }

  // Infer species
  if (!merged.species && !alreadyCleaned.species) {
    if (
      bag.includes('arábica') ||
      bag.includes('arabica') ||
      bag.includes('arabigo') ||
      bag.includes('100% arábica') ||
      bag.includes('100% arabica')
    ) {
      changes.species = 'arabica';
      changes.especie = 'arabica';
    } else if (bag.includes('robusta')) {
      changes.species = 'robusta';
      changes.especie = 'robusta';
    } else if (bag.includes('blend') || bag.includes('mezcla') || bag.includes('combinación')) {
      changes.species = 'blend';
      changes.especie = 'blend';
    }
  }

  // Infer decaf
  if (merged.decaf === null || merged.decaf === undefined) {
    if (
      bag.includes('descafeinado') ||
      bag.includes('decaf') ||
      bag.includes('sin cafeína') ||
      bag.includes('descaf')
    ) {
      changes.decaf = true;
    }
  }

  // Infer isBio
  if (merged.isBio !== true) {
    const bioTerms = [
      'bio',
      'ecológico',
      'ecologico',
      'orgánico',
      'organico',
      'organic',
      'certificado ecológico',
    ];
    if (bioTerms.some((t) => bag.includes(t))) {
      changes.isBio = true;
    }
  }

  // Infer format from tipoProducto
  if (!merged.format && !alreadyCleaned.format) {
    const tipo = String(merged.tipoProducto || '').toLowerCase();
    if (tipo.includes('grano')) {
      changes.format = 'beans';
      changes.formato = 'beans';
    } else if (tipo.includes('molido')) {
      changes.format = 'ground';
      changes.formato = 'ground';
    } else if (tipo.includes('cápsula') || tipo.includes('capsula')) {
      changes.format = 'capsules';
      changes.formato = 'capsules';
    }
  }

  return changes;
}

// ─────────────────────────────────────────────────────────────────────
// PHASE 3 — AI ENRICHMENT (OpenAI)
// ─────────────────────────────────────────────────────────────────────

function needsAiEnrichment(cafe) {
  const missing = [];
  if (!String(cafe.origen || cafe.pais || '').trim()) missing.push('origen');
  if (!String(cafe.notas || cafe.notes || '').trim()) missing.push('notas');
  if (!String(cafe.proceso || '').trim()) missing.push('proceso');
  if (!String(cafe.descripcion || cafe.description || '').trim()) missing.push('descripcion');
  return missing;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const MIN_REQUEST_INTERVAL_MS = Math.ceil(60000 / OPENAI_RPM);

async function callOpenAI(cafe) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const contextLines = [
    cafe.nombre && `Nombre: ${cafe.nombre}`,
    cafe.marca && `Marca/Tostador: ${cafe.marca}`,
    cafe.categoria && `Categoría: ${cafe.category || cafe.coffeeCategory || ''}`,
    cafe.format && `Formato: ${cafe.format || cafe.formato || ''}`,
    cafe.roastLevel && `Tueste: ${cafe.roastLevel || ''}`,
    cafe.species && `Especie: ${cafe.species || ''}`,
    cafe.origen && `Origen conocido: ${cafe.origen}`,
    cafe.variedad && `Variedad conocida: ${cafe.variedad}`,
    cafe.proceso && `Proceso conocido: ${cafe.proceso}`,
    cafe.notas && `Notas conocidas: ${cafe.notas}`,
    cafe.descripcion && `Descripción existente: ${cafe.descripcion}`,
    cafe.intensidad && `Intensidad: ${cafe.intensidad}`,
    cafe.certificaciones && `Certificaciones: ${cafe.certificaciones}`,
    cafe.precio && `Precio: ${cafe.precio} €`,
  ]
    .filter(Boolean)
    .join('\n');

  const missingFields = needsAiEnrichment(cafe);

  const prompt = `Eres un experto en café de especialidad con amplio conocimiento del mercado español y latinoamericano.

Dados los datos de este café, completa los campos que faltan con información precisa y coherente.
NO inventes datos que no puedas inferir con alta confianza. Si no puedes deducirlo, deja el campo vacío ("").
Las notas de cata deben ser profesionales, descriptivas y en español.

DATOS DEL CAFÉ:
${contextLines}

CAMPOS QUE DEBES COMPLETAR (${missingFields.join(', ')}):
- origen: país de origen del café (string, en español)
- proceso: método de procesado del grano (Lavado/Natural/Honey/Anaeróbico/etc.)
- variedad: variedad del grano si se puede deducir (Bourbon, Typica, Geisha, Heirloom, etc.)
- roastLevel: nivel de tueste en inglés (light/medium/dark)
- notas: 4-6 notas de cata separadas por coma, en español, acordes con origen y proceso
- descripcionIA: descripción comercial de 1-2 frases en español, evocadora y precisa
- isSpecialty: true si es claramente un café de especialidad, false si no`;

  const body = {
    model: OPENAI_MODEL,
    input: [{ role: 'user', content: prompt }],
    temperature: 0.25,
    text: {
      format: {
        type: 'json_schema',
        name: 'coffee_enrichment',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            origen: { type: 'string' },
            proceso: { type: 'string' },
            variedad: { type: 'string' },
            roastLevel: { type: 'string', enum: ['light', 'medium', 'dark', ''] },
            notas: { type: 'string' },
            descripcionIA: { type: 'string' },
            isSpecialty: { type: 'boolean' },
          },
          required: [
            'origen',
            'proceso',
            'variedad',
            'roastLevel',
            'notas',
            'descripcionIA',
            'isSpecialty',
          ],
        },
      },
    },
  };

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    // Back-pressure: wait double the interval and retry once
    await sleep(MIN_REQUEST_INTERVAL_MS * 2);
    return callOpenAI(cafe);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  }

  // Extract JSON from output
  let outputText = '';
  if (typeof json?.output_text === 'string') {
    outputText = json.output_text.trim();
  } else {
    for (const item of json?.output || []) {
      for (const content of item?.content || []) {
        if (content.type === 'output_text' && content.text) outputText += content.text;
      }
    }
  }

  try {
    const start = outputText.indexOf('{');
    const end = outputText.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(outputText.slice(start, end + 1));
  } catch {}
  return null;
}

function buildAiChanges(cafe, aiResult) {
  if (!aiResult) return {};
  const changes = {};
  const now = new Date().toISOString();

  if (aiResult.origen && !String(cafe.origen || '').trim()) {
    changes.origen = aiResult.origen;
    changes.pais = aiResult.origen;
    changes.origin = aiResult.origen;
  }
  if (aiResult.proceso && !String(cafe.proceso || '').trim()) {
    changes.proceso = aiResult.proceso;
    changes.process = aiResult.proceso;
  }
  if (aiResult.variedad && !String(cafe.variedad || '').trim()) {
    changes.variedad = aiResult.variedad;
    changes.variety = aiResult.variedad;
  }
  if (aiResult.roastLevel && VALID_ROAST.has(aiResult.roastLevel) && !cafe.roastLevel) {
    changes.roastLevel = aiResult.roastLevel;
    changes.tueste = aiResult.roastLevel;
  }
  if (aiResult.notas && !String(cafe.notas || '').trim()) {
    changes.notas = aiResult.notas;
    changes.notes = aiResult.notas;
  }
  if (aiResult.descripcionIA) {
    changes.descripcionIA = aiResult.descripcionIA;
    // Only fill descripcion if truly empty
    if (!String(cafe.descripcion || cafe.description || '').trim()) {
      changes.descripcion = aiResult.descripcionIA;
      changes.description = aiResult.descripcionIA;
    }
  }
  if (typeof aiResult.isSpecialty === 'boolean') {
    changes.isSpecialty = aiResult.isSpecialty;
  }

  if (Object.keys(changes).length > 0) {
    changes.aiEnrichedAt = now;
    changes.aiEnrichedBy = OPENAI_MODEL;
  }

  return changes;
}

// ─────────────────────────────────────────────────────────────────────
// COMPLETENESS CHECK
// ─────────────────────────────────────────────────────────────────────

function isIncomplete(cafe) {
  const hasNombre = !!String(cafe.nombre || cafe.name || '').trim();
  const hasMarca = !!String(cafe.marca || cafe.roaster || '').trim();
  const hasFoto = !!(cafe.bestPhoto || cafe.officialPhoto || cafe.foto || cafe.imageUrl);
  const hasOrigen = !!String(cafe.origen || cafe.pais || '').trim();
  const hasNotas = !!String(cafe.notas || cafe.notes || '').trim();
  const hasFormat = !!(cafe.format || cafe.formato);

  return !hasNombre || !hasMarca || !hasFoto || !hasOrigen || !hasNotas || !hasFormat;
}

// ─────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n☕  ETIOVE — Enriquecimiento de cafés con IA`);
  console.log(
    `   Modo: ${DRY_RUN ? '🔍  DRY-RUN (sin escrituras)' : '✏️   APPLY (escribe en Firestore)'}`
  );
  console.log(`   SKIP_AI: ${SKIP_AI}, FORCE: ${FORCE}, ONLY_INCOMPLETE: ${ONLY_INCOMPLETE}`);
  if (LIMIT) console.log(`   Límite: ${LIMIT} documentos`);
  console.log();

  console.log('📥  Leyendo cafés de Firestore…');
  let cafes = await listAllCafes();
  console.log(`   ${cafes.length} cafés leídos`);

  // Filter out legacy docs
  cafes = cafes.filter((c) => !c.legacy);
  console.log(`   ${cafes.length} cafés activos (sin legacy)`);

  // Filter to incomplete only
  if (ONLY_INCOMPLETE) {
    cafes = cafes.filter((c) => isIncomplete(c));
    console.log(`   ${cafes.length} cafés incompletos (targets de enriquecimiento)`);
  }

  // Filter already AI-enriched unless FORCE
  if (!FORCE) {
    cafes = cafes.filter((c) => !c.aiEnrichedAt);
    console.log(`   ${cafes.length} cafés sin enriquecimiento previo`);
  }

  if (LIMIT && cafes.length > LIMIT) {
    cafes = cafes.slice(0, LIMIT);
    console.log(`   Limitado a ${cafes.length} cafés`);
  }

  if (cafes.length === 0) {
    console.log('\n✅  Nada que procesar.');
    return;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    skipAi: SKIP_AI,
    force: FORCE,
    total: cafes.length,
    phase1_cleaned: 0,
    phase2_inferred: 0,
    phase3_ai: 0,
    phase3_skipped: 0,
    applied: 0,
    errors: 0,
    results: [],
  };

  let lastOpenAiCall = 0;

  for (let i = 0; i < cafes.length; i++) {
    const cafe = cafes[i];
    const label = `[${i + 1}/${cafes.length}] ${cafe.nombre || cafe.name || cafe.id}`;
    const entry = { id: cafe.id, nombre: cafe.nombre || '', changes: {} };

    try {
      // ── Phase 1: Clean ──────────────────────────────────────────────
      const cleanChanges = cleanPhase(cafe);

      // ── Phase 2: Infer ──────────────────────────────────────────────
      const inferChanges = inferPhase(cafe, cleanChanges);

      // ── Phase 3: AI Enrich ──────────────────────────────────────────
      let aiChanges = {};

      const stateAfterPhases12 = { ...cafe, ...cleanChanges, ...inferChanges };
      const stillMissing = needsAiEnrichment(stateAfterPhases12);

      if (!SKIP_AI && process.env.OPENAI_API_KEY && stillMissing.length > 0) {
        // Rate-limit OpenAI calls
        const now = Date.now();
        const elapsed = now - lastOpenAiCall;
        if (elapsed < MIN_REQUEST_INTERVAL_MS) {
          await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
        }

        try {
          const aiResult = await callOpenAI(stateAfterPhases12);
          lastOpenAiCall = Date.now();
          aiChanges = buildAiChanges(stateAfterPhases12, aiResult);

          if (Object.keys(aiChanges).length > 0) {
            report.phase3_ai++;
            entry.aiResult = aiResult;
          } else {
            report.phase3_skipped++;
          }
        } catch (aiErr) {
          console.warn(`     ⚠️  OpenAI error para ${cafe.id}: ${aiErr.message}`);
          entry.aiError = aiErr.message;
          report.phase3_skipped++;
          lastOpenAiCall = Date.now();
        }
      } else if (stillMissing.length === 0) {
        report.phase3_skipped++;
      } else {
        report.phase3_skipped++;
      }

      // ── Merge all changes ───────────────────────────────────────────
      const allChanges = { ...cleanChanges, ...inferChanges, ...aiChanges };
      entry.changes = allChanges;

      const hasClean = Object.keys(cleanChanges).length > 0;
      const hasInfer = Object.keys(inferChanges).length > 0;
      const hasAi = Object.keys(aiChanges).length > 0;

      if (hasClean) report.phase1_cleaned++;
      if (hasInfer) report.phase2_inferred++;

      const anyChange = Object.keys(allChanges).length > 0;

      if (anyChange) {
        // Always add updatedAt
        allChanges.updatedAt = new Date().toISOString();

        if (!DRY_RUN) {
          await patchCafe(cafe.id, allChanges);
          report.applied++;
        }

        const badge = DRY_RUN ? '🔍' : '✅';
        const phases = [hasClean && 'clean', hasInfer && 'infer', hasAi && 'AI']
          .filter(Boolean)
          .join('+');
        console.log(
          `${badge}  ${label}  [${phases}]  (+${Object.keys(allChanges).length - 1} campos)`
        );
      } else {
        console.log(`⏭️   ${label}  [ya completo]`);
      }
    } catch (err) {
      console.error(`❌  ${label}: ${err.message}`);
      entry.error = err.message;
      report.errors++;
    }

    report.results.push(entry);
  }

  // ── Write report ──────────────────────────────────────────────────
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('\n─────────────────────────────────────────────────────────');
  console.log(`☕  Resumen:`);
  console.log(`   Total procesados : ${report.total}`);
  console.log(`   Fase 1 (limpieza): ${report.phase1_cleaned}`);
  console.log(`   Fase 2 (inferencia): ${report.phase2_inferred}`);
  console.log(`   Fase 3 (IA): ${report.phase3_ai}  (omitidos: ${report.phase3_skipped})`);
  if (!DRY_RUN) console.log(`   Escrituras Firestore: ${report.applied}`);
  if (report.errors) console.log(`   Errores: ${report.errors}`);
  console.log(`   Informe: ${REPORT_PATH}`);
  if (DRY_RUN) console.log('\n💡  Ejecuta con APPLY=true para aplicar los cambios en Firestore.');
  console.log();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
