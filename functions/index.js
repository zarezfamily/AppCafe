const crypto = require('crypto');
const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten,
} = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');

admin.initializeApp();

const db = admin.firestore();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const AI_AUTO_APPROVE_THRESHOLD = Number(process.env.AI_AUTO_APPROVE_THRESHOLD || 0.85);
const DATA_COMPLETENESS_THRESHOLD = Number(process.env.DATA_COMPLETENESS_THRESHOLD || 0.7);

const BARCODE_LOOKUP_API_URL = 'https://api.barcodelookup.com/v3/products';

const DAILY_AI_JOB_LIMIT_PER_USER = Number(process.env.DAILY_AI_JOB_LIMIT_PER_USER || 5);
const OPENAI_RETRY_DELAY_MS = Number(process.env.OPENAI_RETRY_DELAY_MS || 2500);
const OPENAI_MAX_RETRIES = 3;

const buildMessage = (token, title, body, data = {}) => ({
  to: token,
  title,
  body,
  data,
  sound: 'default',
  channelId: 'etiove-general',
  priority: 'high',
});

async function sendExpoPushMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return;

  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        logger.error('Expo push send failed', { status: res.status, body: json });
      }
    } catch (error) {
      logger.error('Expo push send error', error);
    }
  }
}

async function getAllPushSubscriptions() {
  const snap = await db.collection('push_subscriptions').get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// ── Safety net: ensure every new café has required visibility fields ──
exports.onCafeCreatedEnsureDefaults = onDocumentCreated('cafes/{cafeId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const now = new Date().toISOString();
  const patch = {};

  if (!data.fecha) patch.fecha = data.createdAt?.toDate?.().toISOString?.() || now;
  if (data.puntuacion === undefined || data.puntuacion === null) patch.puntuacion = 0;
  if (data.votos === undefined || data.votos === null) patch.votos = 0;
  if (!data.status) patch.status = 'approved';
  if (!data.reviewStatus) patch.reviewStatus = 'approved';
  if (data.appVisible === undefined || data.appVisible === null) patch.appVisible = true;

  if (Object.keys(patch).length === 0) return;

  logger.info(`Backfilling defaults on ${event.params.cafeId}:`, patch);
  await db.collection('cafes').doc(event.params.cafeId).update(patch);
});

exports.onCafeCreatedNotifyCommunity = onDocumentCreated('cafes/{cafeId}', async (event) => {
  const cafe = event.data?.data();
  if (!cafe) return;

  if (!cafe.appVisible || cafe.reviewStatus !== 'approved') return;

  const actorUid = String(cafe.uid || '');
  const cafeName = String(cafe.nombre || 'Un café nuevo');

  const subs = await getAllPushSubscriptions();
  const messages = subs
    .filter((s) => s.notificationsEnabled !== false)
    .filter((s) => !!s.expoPushToken)
    .filter((s) => s.uid !== actorUid)
    .map((s) =>
      buildMessage(
        s.expoPushToken,
        'Nuevo café en la comunidad',
        `${cafeName} ya está disponible en Etiove.`,
        { type: 'community_new_cafe', cafeId: event.params.cafeId }
      )
    );

  await sendExpoPushMessages(messages);
});

exports.onForumReplyCreatedNotifyThreadOwner = onDocumentCreated(
  'foro_respuestas/{replyId}',
  async (event) => {
    const reply = event.data?.data();
    if (!reply?.threadId || !reply?.authorUid) return;

    const threadRef = db.collection('foro_hilos').doc(String(reply.threadId));
    const threadSnap = await threadRef.get();
    if (!threadSnap.exists) return;

    const thread = threadSnap.data() || {};
    const ownerUid = String(thread.authorUid || '');
    const replierUid = String(reply.authorUid || '');
    if (!ownerUid || ownerUid === replierUid) return;

    const ownerSubSnap = await db.collection('push_subscriptions').doc(ownerUid).get();
    if (!ownerSubSnap.exists) return;

    const ownerSub = ownerSubSnap.data() || {};
    if (!ownerSub.expoPushToken || ownerSub.notificationsEnabled === false) return;

    await sendExpoPushMessages([
      buildMessage(
        ownerSub.expoPushToken,
        'Nueva respuesta en tu hilo',
        `Han respondido en "${thread.title || 'tu hilo'}".`,
        { type: 'forum_reply', threadId: String(reply.threadId) }
      ),
    ]);
  }
);

// Extracts @Name tokens from a body string (1–30 chars, letters/numbers/underscores/hyphens).
function extractMentionNames(body) {
  const raw = String(body || '');
  const matches = raw.match(/@([\w-]{1,30})/g) || [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

// Returns push subscription for a uid, or null if not found / disabled.
async function getActiveSub(uid) {
  const snap = await db.collection('push_subscriptions').doc(String(uid)).get();
  if (!snap.exists) return null;
  const sub = snap.data() || {};
  if (!sub.expoPushToken || sub.notificationsEnabled === false) return null;
  return sub;
}

exports.onForumReplyCreatedNotifyMentioned = onDocumentCreated(
  'foro_respuestas/{replyId}',
  async (event) => {
    const reply = event.data?.data();
    if (!reply?.authorUid || !reply?.threadId) return;

    const replierUid = String(reply.authorUid);
    const authorName = String(reply.authorName || 'Alguien');
    const threadId = String(reply.threadId);
    const threadRef = db.collection('foro_hilos').doc(threadId);
    const threadSnap = await threadRef.get();
    const threadTitle = threadSnap.exists
      ? String(threadSnap.data()?.title || 'un hilo')
      : 'un hilo';

    // Collect UIDs to notify, avoiding duplicates and self-notifications.
    const uidsToNotify = new Set();
    const messages = [];

    // 1. Notify parent reply author when this is a nested reply.
    const parentId = String(reply.parentId || '');
    if (parentId) {
      const parentSnap = await db.collection('foro_respuestas').doc(parentId).get();
      if (parentSnap.exists) {
        const parentAuthorUid = String(parentSnap.data()?.authorUid || '');
        if (parentAuthorUid && parentAuthorUid !== replierUid) {
          uidsToNotify.add(parentAuthorUid);
        }
      }
    }

    // 2. Detect @Name mentions in body and resolve to UIDs via user_profiles.
    const mentionNames = extractMentionNames(reply.body);
    if (mentionNames.length > 0) {
      const profilesSnap = await db
        .collection('user_profiles')
        .where('displayName', 'in', mentionNames.slice(0, 10))
        .get();
      profilesSnap.docs.forEach((doc) => {
        const uid = String(doc.data()?.uid || doc.id);
        if (uid && uid !== replierUid) uidsToNotify.add(uid);
      });
    }

    // Also notify the thread owner if they are mentioned or replied-to (skip if already covered
    // by onForumReplyCreatedNotifyThreadOwner — that function only fires for thread owner).
    // We intentionally do NOT re-notify the thread owner here to avoid double notifications.
    if (threadSnap.exists) {
      const threadOwnerUid = String(threadSnap.data()?.authorUid || '');
      uidsToNotify.delete(threadOwnerUid); // thread owner already notified by other function
    }

    // Build push messages for each unique UID.
    await Promise.all(
      [...uidsToNotify].map(async (uid) => {
        const sub = await getActiveSub(uid);
        if (!sub) return;
        messages.push(
          buildMessage(
            sub.expoPushToken,
            `${authorName} te ha mencionado`,
            `En el hilo "${threadTitle}": ${String(reply.body || '').slice(0, 80)}`,
            { type: 'forum_mention', threadId }
          )
        );
      })
    );

    await sendExpoPushMessages(messages);
  }
);

exports.onCafeScoreChangedNotifyFans = onDocumentUpdated('cafes/{cafeId}', async (event) => {
  const before = event.data?.before?.data() || {};
  const after = event.data?.after?.data() || {};

  const prev = Number(before.puntuacion || 0);
  const next = Number(after.puntuacion || 0);
  if (!Number.isFinite(prev) || !Number.isFinite(next) || prev === next) return;

  const cafeId = String(event.params.cafeId || '');
  if (!cafeId) return;

  const subsSnap = await db
    .collection('push_subscriptions')
    .where('favoriteCafeIds', 'array-contains', cafeId)
    .get();

  if (subsSnap.empty) return;

  const messages = subsSnap.docs
    .map((d) => d.data() || {})
    .filter((s) => !!s.expoPushToken)
    .filter((s) => s.notificationsEnabled !== false)
    .map((s) =>
      buildMessage(
        s.expoPushToken,
        'Cambió la puntuación de un favorito',
        `${after.nombre || 'Tu café favorito'} ahora tiene ${next.toFixed(1)} puntos.`,
        { type: 'favorite_score_changed', cafeId }
      )
    );

  await sendExpoPushMessages(messages);
});

const UPLOAD_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);
const UPLOAD_EXT_MAP = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};
const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

exports.uploadForumImage = onRequest(
  { region: 'europe-west1', cors: true, timeoutSeconds: 60, memory: '256MiB' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { idToken, base64, mimeType, folder } = req.body || {};
    if (!idToken || !base64 || !mimeType) {
      res.status(400).json({ error: 'Missing fields: idToken, base64, mimeType required' });
      return;
    }

    try {
      await admin.auth().verifyIdToken(String(idToken));
    } catch {
      res.status(401).json({ error: 'UNAUTHENTICATED' });
      return;
    }

    const mime = String(mimeType).toLowerCase();
    if (!UPLOAD_ALLOWED_MIME.has(mime)) {
      res.status(400).json({ error: 'UNSUPPORTED_IMAGE_TYPE' });
      return;
    }

    let buffer;
    try {
      buffer = Buffer.from(String(base64), 'base64');
    } catch {
      res.status(400).json({ error: 'INVALID_BASE64' });
      return;
    }

    if (buffer.length > UPLOAD_MAX_BYTES) {
      res.status(400).json({ error: 'IMAGE_TOO_LARGE' });
      return;
    }

    const safeFolder = String(folder || 'uploads').replace(/[^a-zA-Z0-9_\-/]/g, '');
    const ext = UPLOAD_EXT_MAP[mime] || 'jpg';
    const fileName = `${safeFolder}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const downloadToken = crypto.randomUUID();

    const bucket = admin.storage().bucket();
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      metadata: {
        contentType: mime,
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${downloadToken}`;
    res.status(200).json({ downloadUrl });
  }
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scores how complete a café record is (0-1).
 * Used alongside AI confidence to decide auto-approval.
 *
 * Fields & weights:
 *   nombre (0.20), marca (0.15), origen (0.12), ean (0.10),
 *   foto/bestPhoto (0.12), notas (0.08), proceso (0.06),
 *   variedad (0.05), tueste (0.04), formato (0.04), precio (0.04)
 */
function computeDataCompleteness(cafe) {
  const has = (v, min = 2) => String(v || '').trim().length >= min;
  const hasNum = (v) => typeof v === 'number' && v > 0;

  const fields = [
    { key: 'nombre', w: 0.2, ok: has(cafe?.nombre, 3) },
    { key: 'marca', w: 0.15, ok: has(cafe?.marca || cafe?.roaster, 2) },
    { key: 'origen', w: 0.12, ok: has(cafe?.origen || cafe?.origin || cafe?.pais, 2) },
    { key: 'ean', w: 0.1, ok: has(cafe?.ean, 8) },
    {
      key: 'foto',
      w: 0.12,
      ok: has(cafe?.photos?.selected || cafe?.bestPhoto || cafe?.officialPhoto || cafe?.foto, 8),
    },
    { key: 'notas', w: 0.08, ok: has(cafe?.notas || cafe?.notes, 3) },
    { key: 'proceso', w: 0.06, ok: has(cafe?.proceso || cafe?.process, 2) },
    { key: 'variedad', w: 0.05, ok: has(cafe?.variedad || cafe?.variety, 2) },
    { key: 'tueste', w: 0.04, ok: has(cafe?.tueste || cafe?.roastLevel, 2) },
    { key: 'formato', w: 0.04, ok: has(cafe?.formato || cafe?.format, 2) },
    { key: 'precio', w: 0.04, ok: hasNum(cafe?.precio) },
  ];

  let score = 0;
  const missing = [];
  for (const f of fields) {
    if (f.ok) score += f.w;
    else missing.push(f.key);
  }

  return {
    score: Math.round(score * 100) / 100,
    missing,
    total: fields.length,
    filled: fields.length - missing.length,
  };
}

/**
 * Robust OpenAI call with exponential backoff.
 * Retries on 429 (rate limit), 500, 502, 503, 529 (overloaded).
 * Also retries once on invalid JSON response.
 */
async function robustOpenAICall({ apiKey, body, maxRetries = OPENAI_MAX_RETRIES }) {
  const RETRYABLE_CODES = new Set([429, 500, 502, 503, 529]);
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await performOpenAIRequest({ apiKey, body });

      if (RETRYABLE_CODES.has(response.status)) {
        const delay = OPENAI_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn('OpenAI retryable error', {
          status: response.status,
          attempt,
          delayMs: delay,
        });
        if (attempt < maxRetries) {
          await sleep(delay);
          continue;
        }
        throw new Error(`OPENAI_REQUEST_FAILED_${response.status}`);
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        logger.error('OpenAI non-retryable error', { status: response.status, body: errBody });
        throw new Error(`OPENAI_REQUEST_FAILED_${response.status}`);
      }

      const json = await response.json().catch(() => null);
      const text = extractTextOutput(json);
      const parsed = tryExtractJsonObject(text);

      if (!parsed) {
        logger.warn('OpenAI returned invalid JSON', { attempt, text: (text || '').slice(0, 300) });
        if (attempt < maxRetries) {
          await sleep(OPENAI_RETRY_DELAY_MS);
          continue;
        }
        throw new Error('OPENAI_INVALID_JSON');
      }

      return parsed;
    } catch (error) {
      lastError = error;
      if (
        attempt < maxRetries &&
        String(error?.message || '').includes('OPENAI_REQUEST_FAILED_429')
      ) {
        await sleep(OPENAI_RETRY_DELAY_MS * Math.pow(2, attempt - 1));
        continue;
      }
      if (attempt >= maxRetries) throw error;
    }
  }

  throw lastError || new Error('OPENAI_MAX_RETRIES_EXHAUSTED');
}

function extractTextOutput(json) {
  if (!json) return '';

  if (typeof json.output_text === 'string' && json.output_text.trim()) {
    return json.output_text.trim();
  }

  const parts = [];
  for (const item of json.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) {
        parts.push(content.text);
      }
    }
  }
  return parts.join('\n').trim();
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function tryExtractJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  const direct = safeJsonParse(raw);
  if (direct) return direct;

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const candidate = raw.slice(start, end + 1);
    return safeJsonParse(candidate);
  }

  return null;
}

function pickFirstImage(product) {
  if (!product) return '';

  if (Array.isArray(product.images) && product.images.length > 0) {
    return String(product.images[0] || '').trim();
  }

  if (typeof product.image === 'string') return product.image.trim();
  if (typeof product.thumbnail === 'string') return product.thumbnail.trim();

  return '';
}

function normalizeText(value) {
  return String(value || '').trim();
}

function hasMeaningfulText(value, min = 2) {
  return normalizeText(value).length >= min;
}

function hasPhoto(value) {
  return hasMeaningfulText(value, 8);
}

function barcodeLookupLooksStrong(barcodeData) {
  if (!barcodeData) return false;

  return (
    hasMeaningfulText(barcodeData.nombre, 3) &&
    (hasMeaningfulText(barcodeData.marca, 2) || hasMeaningfulText(barcodeData.descripcion, 10))
  );
}

function shouldCallOpenAI({ job, cafe, barcodeData }) {
  const barcodeStrong = barcodeLookupLooksStrong(barcodeData);
  const userHasPhoto = hasPhoto(job?.foto) || hasPhoto(cafe?.foto);

  if (barcodeStrong && hasPhoto(barcodeData?.imagen)) {
    return false;
  }

  if (!userHasPhoto) {
    return false;
  }

  return true;
}

function pickBestPhoto({ userPhoto, officialPhoto, aiConfidence, isCoffeePackage }) {
  if (officialPhoto && isCoffeePackage && aiConfidence >= 0.6) {
    return officialPhoto;
  }

  return userPhoto || officialPhoto || '';
}

function pickSelectedPhotoSource({ officialPhoto, aiConfidence, isCoffeePackage }) {
  if (officialPhoto && isCoffeePackage && aiConfidence >= 0.6) {
    return 'official';
  }

  return 'user';
}

/**
 * Builds the canonical photos object for a café.
 *
 * photos: {
 *   official: string[],     // brand / barcode photos
 *   user: string[],         // user-uploaded photos
 *   selected: string,       // computed best photo URL
 *   source: 'official' | 'user' | 'fallback'
 * }
 */
function buildPhotosObject({
  officialPhotos = [],
  userPhotos = [],
  isCoffeePackage = true,
  aiConfidence = 0,
}) {
  const validUrl = (u) => typeof u === 'string' && u.startsWith('http') && u.length > 10;
  const official = officialPhotos.filter(validUrl);
  const user = userPhotos.filter(validUrl);

  let selected = '';
  let source = 'fallback';

  if (official.length > 0 && isCoffeePackage && aiConfidence >= 0.6) {
    selected = official[0];
    source = 'official';
  } else if (user.length > 0) {
    selected = user[0];
    source = 'user';
  } else if (official.length > 0) {
    selected = official[0];
    source = 'official';
  }

  return { official, user, selected, source };
}

function normalizeAiResult(parsed, cafe, job, barcodeData) {
  const confidence = Number(parsed?.confidence ?? parsed?.aiConfidenceScore ?? 0);
  const boundedConfidence = Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0;

  const isCoffeePackage = parsed?.isCoffeePackage !== false;
  const isSpecialty = typeof parsed?.isSpecialty === 'boolean' ? parsed.isSpecialty : false;

  return {
    nombre: String(
      parsed?.nombre ||
        parsed?.name ||
        barcodeData?.nombre ||
        cafe?.nombre ||
        'Pendiente de identificar'
    ).trim(),
    marca: String(parsed?.marca || parsed?.brand || barcodeData?.marca || cafe?.marca || '').trim(),
    origen: String(parsed?.origen || cafe?.origen || '').trim(),
    notasIA: String(parsed?.notasIA || parsed?.summary || '').trim(),
    isSpecialty,
    isCoffeePackage,
    confidence: boundedConfidence,
    imageReason: String(parsed?.imageReason || '').trim(),
    summary: String(parsed?.summary || parsed?.notasIA || '').trim(),
    raw: parsed,
    ean: String(parsed?.ean || barcodeData?.barcode || job?.ean || cafe?.ean || '').trim(),
  };
}

const SCA_CATEGORY_VALUES = ['specialty', 'supermarket', 'bio'];
const SCA_FORMAT_VALUES = ['beans', 'ground', 'capsules'];
const SCA_ROAST_LEVEL_VALUES = ['light', 'medium', 'dark'];
const SCA_SPECIES_VALUES = ['arabica', 'robusta', 'blend'];

function normalizeScaEnum(value, allowedValues = []) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return allowedValues.includes(normalized) ? normalized : '';
}

function normalizeScaNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeScaBoolean(value) {
  if (value === true || value === false) return value;

  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (['true', '1', 'yes', 'si', 'sí'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;

  return null;
}

function clampSca(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseScaNotesList(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  return raw
    .split(/[,;|·/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getScaValue(data = {}, keys = []) {
  for (const key of keys) {
    const value = data?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
}

function sanitizeCoffeeForSca(data = {}) {
  const category =
    normalizeScaEnum(data.category, SCA_CATEGORY_VALUES) ||
    (() => {
      const legacy = String(data.coffeeCategory || '')
        .trim()
        .toLowerCase();
      if (legacy === 'daily' || legacy === 'commercial') return 'supermarket';
      if (legacy === 'specialty') return 'specialty';
      return '';
    })();

  return {
    category,
    format: normalizeScaEnum(getScaValue(data, ['format', 'formato']), SCA_FORMAT_VALUES),
    roastLevel: normalizeScaEnum(
      getScaValue(data, ['roastLevel', 'tueste']),
      SCA_ROAST_LEVEL_VALUES
    ),
    species: normalizeScaEnum(getScaValue(data, ['species', 'especie']), SCA_SPECIES_VALUES),
    origin: String(getScaValue(data, ['origin', 'origen', 'pais']) || '').trim(),
    process: String(getScaValue(data, ['process', 'proceso']) || '').trim(),
    variety: String(getScaValue(data, ['variety', 'variedad']) || '').trim(),
    notes: String(getScaValue(data, ['notes', 'notas']) || '').trim(),
    roaster: String(getScaValue(data, ['roaster', 'marca']) || '').trim(),
    altitude: normalizeScaNumber(getScaValue(data, ['altitude', 'altura'])),
    scaScoreOfficial: normalizeScaNumber(getScaValue(data, ['scaScoreOfficial'])),
    decaf: normalizeScaBoolean(getScaValue(data, ['decaf', 'descafeinado'])),
  };
}

function buildAutomaticSca(data = {}) {
  const coffee = sanitizeCoffeeForSca(data);

  const officialScore = coffee.scaScoreOfficial;
  if (Number.isFinite(officialScore) && officialScore >= 60 && officialScore <= 100) {
    return {
      score: Number(clampSca(officialScore, 60, 100).toFixed(1)),
      type: 'official',
      confidence: 1,
      officialScore: Number(clampSca(officialScore, 60, 100).toFixed(1)),
      reasons: ['SCA oficial indicado manualmente'],
      signals: {
        category: coffee.category || '',
        format: coffee.format || '',
        roastLevel: coffee.roastLevel || '',
        origin: !!coffee.origin,
        process: !!coffee.process,
        variety: !!coffee.variety,
        altitude: !!coffee.altitude,
        notesCount: parseScaNotesList(coffee.notes).length,
      },
      lastCalculatedAt: new Date().toISOString(),
    };
  }

  let score = 70;
  let confidence = 0.3;
  const reasons = [];
  const notesList = parseScaNotesList(coffee.notes);

  if (coffee.category === 'specialty') {
    score += 8;
    confidence += 0.15;
    reasons.push('Café de especialidad');
  }

  if (coffee.category === 'bio') {
    score += 3;
    confidence += 0.08;
    reasons.push('Café bio');
  }

  if (coffee.category === 'supermarket') {
    score -= 1;
    reasons.push('Café de supermercado');
  }

  if (coffee.origin) {
    score += 2;
    confidence += 0.08;
    reasons.push('Origen definido');
  }

  if (coffee.process) {
    score += 2;
    confidence += 0.08;
    reasons.push('Proceso conocido');
  }

  if (coffee.variety) {
    score += 2;
    confidence += 0.08;
    reasons.push('Variedad identificada');
  }

  if (coffee.altitude && coffee.altitude >= 1000) {
    score += 2;
    confidence += 0.08;
    reasons.push('Altitud elevada');
  } else if (coffee.altitude && coffee.altitude > 0) {
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

  if (coffee.roaster) {
    score += 1;
    confidence += 0.04;
    reasons.push('Tostador identificado');
  }

  if (coffee.roastLevel === 'light') {
    score += 1.5;
    reasons.push('Tueste claro');
  } else if (coffee.roastLevel === 'medium') {
    score += 1;
    reasons.push('Tueste medio');
  } else if (coffee.roastLevel === 'dark') {
    score -= 1;
    reasons.push('Tueste oscuro');
  }

  if (coffee.format === 'beans') {
    score += 1;
    reasons.push('Formato grano');
  } else if (coffee.format === 'ground') {
    score -= 0.5;
    reasons.push('Formato molido');
  } else if (coffee.format === 'capsules') {
    score -= 2;
    reasons.push('Formato cápsulas');
  }

  if (coffee.species === 'arabica') {
    score += 1;
    reasons.push('Especie arábica');
  } else if (coffee.species === 'blend') {
    score += 0.3;
    reasons.push('Blend');
  } else if (coffee.species === 'robusta') {
    score -= 1.5;
    reasons.push('Presencia de robusta');
  }

  if (coffee.decaf === true) {
    score -= 0.5;
    reasons.push('Descafeinado');
  }

  score = clampSca(score, 60, 89);
  confidence = clampSca(confidence, 0.2, 0.95);

  return {
    score: Number(score.toFixed(1)),
    type: 'estimated',
    confidence: Number(confidence.toFixed(2)),
    officialScore: null,
    reasons,
    signals: {
      category: coffee.category || '',
      format: coffee.format || '',
      roastLevel: coffee.roastLevel || '',
      origin: !!coffee.origin,
      process: !!coffee.process,
      variety: !!coffee.variety,
      altitude: !!coffee.altitude,
      notesCount: notesList.length,
      species: coffee.species || '',
      decaf: coffee.decaf,
    },
    lastCalculatedAt: new Date().toISOString(),
  };
}

function areScaObjectsEqual(a = {}, b = {}) {
  return (
    Number(a?.score || 0) === Number(b?.score || 0) &&
    String(a?.type || '') === String(b?.type || '') &&
    Number(a?.confidence || 0) === Number(b?.confidence || 0) &&
    Number(a?.officialScore || 0) === Number(b?.officialScore || 0) &&
    JSON.stringify(Array.isArray(a?.reasons) ? a.reasons : []) ===
      JSON.stringify(Array.isArray(b?.reasons) ? b.reasons : []) &&
    JSON.stringify(a?.signals || {}) === JSON.stringify(b?.signals || {})
  );
}

/* =========================
   RANKING / SCORES BACKEND
   ========================= */

function normalizeScoreText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeCategoryForScores(data) {
  return data?.coffeeCategory === 'daily' ? 'daily' : 'specialty';
}

function isBioCoffeeForScores(data) {
  if (data?.isBio === true) return true;
  if (data?.isBio === false) return false;

  const text = [
    data?.certificaciones,
    data?.notas,
    data?.nombre,
    data?.marca,
    data?.roaster,
    data?.descripcion,
  ]
    .map(normalizeScoreText)
    .join(' ');

  return (
    text.includes('bio') ||
    text.includes('ecológico') ||
    text.includes('ecologico') ||
    text.includes('orgánico') ||
    text.includes('organico') ||
    text.includes('organic')
  );
}

function getRankingScore(data) {
  const puntuacion = Number(data?.puntuacion || 0);
  const votos = Number(data?.votos || 0);
  const isSpecialty = normalizeCategoryForScores(data) === 'specialty';
  const isBio = isBioCoffeeForScores(data);

  return Number(
    (puntuacion * 20 + Math.min(votos, 50) * 1.5 + (isSpecialty ? 6 : 0) + (isBio ? 3 : 0)).toFixed(
      2
    )
  );
}

function getTrendingScore(data) {
  const puntuacion = Number(data?.puntuacion || 0);
  const votos = Number(data?.votos || 0);

  return Number((puntuacion * 10 + votos * 1.2).toFixed(2));
}

function getValueScore(data) {
  const puntuacion = Number(data?.puntuacion || 0);
  const votos = Number(data?.votos || 0);
  const precio = Number(data?.precio || 0);

  if (precio <= 0) return 0;

  return Number(((puntuacion * 10 + Math.min(votos, 30)) / precio).toFixed(4));
}

function getBioScore(data) {
  if (!isBioCoffeeForScores(data)) return 0;

  const puntuacion = Number(data?.puntuacion || 0);
  const votos = Number(data?.votos || 0);

  return Number((puntuacion * 20 + Math.min(votos, 40) * 1.2 + 8).toFixed(2));
}

function buildCoffeeScores(data) {
  return {
    rankingScore: getRankingScore(data),
    trendingScore: getTrendingScore(data),
    valueScore: getValueScore(data),
    bioScore: getBioScore(data),
  };
}

exports.onCafeWriteRecalculateScores = onDocumentWritten(
  {
    document: 'cafes/{cafeId}',
    region: 'europe-west1',
  },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;

    const data = after.data() || {};
    const cafeId = String(event.params.cafeId || '');
    if (!cafeId) return;

    const nextScores = buildCoffeeScores(data);
    const currentScores = {
      rankingScore: Number(data?.rankingScore || 0),
      trendingScore: Number(data?.trendingScore || 0),
      valueScore: Number(data?.valueScore || 0),
      bioScore: Number(data?.bioScore || 0),
    };

    const unchanged =
      currentScores.rankingScore === nextScores.rankingScore &&
      currentScores.trendingScore === nextScores.trendingScore &&
      currentScores.valueScore === nextScores.valueScore &&
      currentScores.bioScore === nextScores.bioScore;

    if (unchanged) return;

    await db.collection('cafes').doc(cafeId).set(nextScores, { merge: true });

    logger.info('Coffee scores recalculated', {
      cafeId,
      ...nextScores,
    });
  }
);

exports.onCafeWriteRecalculateSca = onDocumentWritten(
  {
    document: 'cafes/{cafeId}',
    region: 'europe-west1',
  },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;

    const data = after.data() || {};
    const cafeId = String(event.params.cafeId || '');
    if (!cafeId) return;

    const nextSca = buildAutomaticSca(data);
    const currentSca = data?.sca || {};

    if (areScaObjectsEqual(currentSca, nextSca)) {
      return;
    }

    await db.collection('cafes').doc(cafeId).set(
      {
        sca: nextSca,
      },
      { merge: true }
    );

    logger.info('Coffee SCA recalculated', {
      cafeId,
      scaScore: nextSca.score,
      scaType: nextSca.type,
      scaConfidence: nextSca.confidence,
    });
  }
);

exports.adminBackfillCoffeeScores = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
      return;
    }

    try {
      const snapshot = await db.collection('cafes').get();

      let updated = 0;
      let batch = db.batch();
      let ops = 0;
      const batchLimit = 400;

      for (const doc of snapshot.docs) {
        const data = doc.data() || {};
        const scores = buildCoffeeScores(data);

        batch.set(doc.ref, scores, { merge: true });
        ops += 1;
        updated += 1;

        if (ops >= batchLimit) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }

      if (ops > 0) {
        await batch.commit();
      }

      logger.info('Coffee scores backfill completed', { updated });
      res.status(200).json({ ok: true, updated });
    } catch (error) {
      logger.error('adminBackfillCoffeeScores error', error);
      res.status(500).json({
        ok: false,
        error: String(error?.message || error),
      });
    }
  }
);

exports.adminBackfillCoffeeSca = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
      return;
    }

    try {
      const snapshot = await db.collection('cafes').get();

      let updated = 0;
      let batch = db.batch();
      let ops = 0;
      const batchLimit = 400;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() || {};
        const sca = buildAutomaticSca(data);

        batch.set(
          docSnap.ref,
          {
            sca,
          },
          { merge: true }
        );

        ops += 1;
        updated += 1;

        if (ops >= batchLimit) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }

      if (ops > 0) {
        await batch.commit();
      }

      logger.info('Coffee SCA backfill completed', { updated });
      res.status(200).json({ ok: true, updated });
    } catch (error) {
      logger.error('adminBackfillCoffeeSca error', error);
      res.status(500).json({
        ok: false,
        error: String(error?.message || error),
      });
    }
  }
);

async function lookupProductByBarcode(barcode) {
  const apiKey = process.env.BARCODE_LOOKUP_API_KEY;

  const normalized = String(barcode || '')
    .replace(/\D/g, '')
    .trim();

  if (!apiKey || !normalized) return null;

  try {
    const url =
      `${BARCODE_LOOKUP_API_URL}?barcode=${encodeURIComponent(normalized)}` +
      `&formatted=y&key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      logger.error('Barcode lookup failed', {
        status: res.status,
        barcode: normalized,
        body: json,
      });
      return null;
    }

    const product = Array.isArray(json?.products) ? json.products[0] : null;
    if (!product) return null;

    return {
      barcode: String(product.barcode_number || normalized).trim(),
      nombre: String(product.title || '').trim(),
      marca: String(product.brand || product.manufacturer || '').trim(),
      categoria: String(product.category || '').trim(),
      descripcion: String(product.description || '').trim(),
      imagen: pickFirstImage(product),
      raw: product,
    };
  } catch (error) {
    logger.error('Barcode lookup exception', {
      barcode: normalized,
      error: String(error?.message || error),
    });
    return null;
  }
}

async function performOpenAIRequest({ apiKey, body }) {
  return fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
}

async function callOpenAIForCoffeeEnrichment({ job, cafe, barcodeData }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
  }

  const prompt = `
Analiza este producto y responde siguiendo exactamente el esquema JSON requerido.
No inventes demasiado. Si no sabes algo, usa cadena vacía o false según corresponda.
`.trim();

  const content = [
    {
      type: 'input_text',
      text: `${prompt}

Datos previos del registro:
- ean: ${job?.ean || cafe?.ean || ''}
- nombre actual: ${cafe?.nombre || ''}
- origen actual: ${cafe?.origen || ''}
- notas actuales: ${cafe?.notas || ''}

Datos del lookup por barcode:
- nombre lookup: ${barcodeData?.nombre || ''}
- marca lookup: ${barcodeData?.marca || ''}
- categoría lookup: ${barcodeData?.categoria || ''}
- descripción lookup: ${barcodeData?.descripcion || ''}
- imagen lookup: ${barcodeData?.imagen || ''}
`,
    },
  ];

  if (job?.foto) {
    content.push({
      type: 'input_image',
      image_url: job.foto,
    });
  } else if (barcodeData?.imagen) {
    content.push({
      type: 'input_image',
      image_url: barcodeData.imagen,
    });
  }

  const body = {
    model: OPENAI_MODEL,
    input: [
      {
        role: 'user',
        content,
      },
    ],
    temperature: 0.2,
    text: {
      format: {
        type: 'json_schema',
        name: 'coffee_enrichment',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            nombre: { type: 'string' },
            marca: { type: 'string' },
            origen: { type: 'string' },
            isSpecialty: { type: 'boolean' },
            isCoffeePackage: { type: 'boolean' },
            confidence: { type: 'number' },
            imageReason: { type: 'string' },
            summary: { type: 'string' },
            ean: { type: 'string' },
          },
          required: [
            'nombre',
            'marca',
            'origen',
            'isSpecialty',
            'isCoffeePackage',
            'confidence',
            'imageReason',
            'summary',
            'ean',
          ],
        },
      },
    },
  };

  const parsed = await robustOpenAICall({ apiKey, body });

  return normalizeAiResult(parsed, cafe, job, barcodeData);
}

async function getTodaysAiJobsCountForUser(uid) {
  if (!uid) return 0;

  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();

  const snap = await db
    .collection('ai_jobs')
    .where('uid', '==', uid)
    .where('createdAt', '>=', start)
    .get();

  return snap.size;
}

function buildCafeUpdateFromBarcodeOnly({ cafe, job, barcodeData }) {
  const userPhoto = normalizeText(cafe?.foto || job?.foto || '');
  const officialPhoto = normalizeText(barcodeData?.imagen || '');

  // Build canonical photos object
  const existingOfficials = Array.isArray(cafe?.photos?.official) ? cafe.photos.official : [];
  const existingUsers = Array.isArray(cafe?.photos?.user) ? cafe.photos.user : [];
  const officialPhotos = [...new Set([officialPhoto, ...existingOfficials].filter(Boolean))];
  const userPhotos = [...new Set([userPhoto, ...existingUsers].filter(Boolean))];

  const photos = buildPhotosObject({
    officialPhotos,
    userPhotos,
    isCoffeePackage: true,
    aiConfidence: 0,
  });

  const bestPhoto = photos.selected || officialPhoto || userPhoto || '';
  const selectedBy =
    photos.source !== 'fallback' ? photos.source : officialPhoto ? 'official' : 'user';

  const merged = {
    ...cafe,
    nombre: barcodeData?.nombre || cafe?.nombre || '',
    marca: barcodeData?.marca || cafe?.marca || '',
    ean: barcodeData?.barcode || job?.ean || cafe?.ean || '',
    bestPhoto,
  };
  const completeness = computeDataCompleteness(merged);

  const update = {
    updatedAt: new Date().toISOString(),
    aiGenerated: false,
    aiStatus: 'barcode_completed',
    aiConfidenceScore: 0,
    confidenceScore: 0,
    dataCompletenessScore: completeness.score,
    dataSource: 'barcode',
    imageValidation: {
      status: bestPhoto ? 'approved' : 'not_provided',
      reason: 'barcode_lookup_only',
      confidence: 0,
    },
    enrichmentPipeline: {
      phase1_barcode: {
        found: !!barcodeData,
        strong: barcodeLookupLooksStrong(barcodeData),
        source: barcodeData ? 'barcodelookup.com' : null,
      },
      phase2_ai: { skipped: true, reason: 'barcode_sufficient_or_no_photo' },
      phase3_validation: {
        confidenceScore: 0,
        dataCompletenessScore: completeness.score,
        missingFields: completeness.missing,
        autoApproved: false,
        decision: 'pending_admin',
      },
      processedAt: new Date().toISOString(),
    },
    nombre: barcodeData?.nombre || cafe?.nombre || 'Pendiente de identificar',
    marca: barcodeData?.marca || cafe?.marca || '',
    origen: cafe?.origen || '',
    aiSuggestion: {
      nombre: barcodeData?.nombre || '',
      marca: barcodeData?.marca || '',
      origen: cafe?.origen || '',
      isSpecialty: !!cafe?.isSpecialty,
      ean: barcodeData?.barcode || job?.ean || cafe?.ean || '',
      summary: barcodeData?.descripcion || '',
      officialPhoto: officialPhoto || '',
      source: 'barcode_lookup',
    },
    photos,
    bestPhoto,
    photoSources: {
      userPhoto,
      officialPhoto,
      bestPhoto,
      selectedBy,
    },
  };

  if (barcodeData?.barcode) {
    update.ean = barcodeData.barcode;
  }

  if (officialPhoto) {
    update.officialPhoto = officialPhoto;
  }

  if (barcodeLookupLooksStrong(barcodeData)) {
    update.reviewStatus = 'pending';
    update.appVisible = false;
    update.scannerVisible = true;
  }

  return update;
}

exports.onAiJobCreatedProcessCoffee = onDocumentCreated(
  {
    document: 'ai_jobs/{jobId}',
    secrets: ['OPENAI_API_KEY'],
  },
  async (event) => {
    const job = event.data?.data();
    if (!job) return;

    if (job.type !== 'coffee_enrichment' || job.status !== 'queued') return;

    const jobId = String(event.params.jobId || '');
    const jobRef = db.collection('ai_jobs').doc(jobId);

    try {
      await jobRef.update({
        status: 'processing',
        updatedAt: new Date().toISOString(),
      });

      const targetCollection = String(job.targetCollection || 'cafes');
      const targetId = String(job.targetId || '');
      if (!targetId) throw new Error('MISSING_TARGET_ID');

      const cafeRef = db.collection(targetCollection).doc(targetId);
      const cafeSnap = await cafeRef.get();
      if (!cafeSnap.exists) throw new Error('CAFE_NOT_FOUND');

      const cafe = cafeSnap.data() || {};
      const uid = String(job.uid || cafe.uid || '').trim();

      if (cafe.aiStatus === 'auto_approved' || cafe.aiStatus === 'completed') {
        await jobRef.update({
          status: 'done',
          error: admin.firestore.FieldValue.delete(),
          skipped: true,
          skipReason: 'already_enriched',
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      const barcodeData = await lookupProductByBarcode(job?.ean || cafe?.ean || '');

      if (!shouldCallOpenAI({ job, cafe, barcodeData })) {
        const cafeUpdate = buildCafeUpdateFromBarcodeOnly({ cafe, job, barcodeData });
        await cafeRef.update(cafeUpdate);

        await jobRef.update({
          status: 'done',
          error: admin.firestore.FieldValue.delete(),
          result: {
            usedOpenAI: false,
            barcodeLookupFound: !!barcodeData,
            dataCompletenessScore: cafeUpdate.dataCompletenessScore,
            dataSource: 'barcode',
            selectedPhotoSource: cafeUpdate.photoSources?.selectedBy || 'user',
          },
          updatedAt: new Date().toISOString(),
        });

        logger.info('AI job resolved without OpenAI', {
          jobId,
          targetCollection,
          targetId,
          barcodeLookupFound: !!barcodeData,
        });
        return;
      }

      const todaysJobs = await getTodaysAiJobsCountForUser(uid);
      if (uid && todaysJobs > DAILY_AI_JOB_LIMIT_PER_USER) {
        throw new Error('DAILY_AI_LIMIT_REACHED');
      }

      const ai = await callOpenAIForCoffeeEnrichment({ job, cafe, barcodeData });

      const imageValidationStatus = ai.isCoffeePackage ? 'approved' : 'rejected';

      const userPhoto = normalizeText(cafe?.foto || job?.foto || '');
      const officialPhoto = normalizeText(barcodeData?.imagen || '');

      // Build merged café data for completeness scoring
      const mergedForCompleteness = {
        ...cafe,
        nombre: ai.nombre || barcodeData?.nombre || cafe?.nombre || '',
        marca: ai.marca || barcodeData?.marca || cafe?.marca || '',
        origen: ai.origen || cafe?.origen || '',
        ean: ai.ean || cafe?.ean || '',
        bestPhoto: officialPhoto || userPhoto || cafe?.bestPhoto || '',
      };
      const completeness = computeDataCompleteness(mergedForCompleteness);

      // Dual gate: confidence AND completeness
      const shouldAutoApprove =
        ai.isCoffeePackage &&
        ai.isSpecialty === true &&
        ai.confidence >= AI_AUTO_APPROVE_THRESHOLD &&
        completeness.score >= DATA_COMPLETENESS_THRESHOLD;

      // Determine source priority
      const dataSource =
        barcodeData && ai.confidence < 0.5 ? 'barcode' : ai.confidence >= 0.5 ? 'ai' : 'user';

      const cafeUpdate = {
        aiGenerated: true,
        aiSuggestion: {
          nombre: ai.nombre,
          marca: ai.marca,
          origen: ai.origen,
          isSpecialty: ai.isSpecialty,
          ean: ai.ean,
          summary: ai.summary,
          officialPhoto: officialPhoto || '',
          source: 'openai',
        },
        confidenceScore: ai.confidence,
        dataCompletenessScore: completeness.score,
        dataSource,
        aiConfidenceScore: ai.confidence,
        aiStatus: shouldAutoApprove ? 'auto_approved' : 'completed',
        updatedAt: new Date().toISOString(),
        imageValidation: {
          status: imageValidationStatus,
          reason: ai.imageReason || (ai.isCoffeePackage ? '' : 'not_coffee_package'),
          confidence: ai.confidence,
        },
        enrichmentPipeline: {
          phase1_barcode: {
            found: !!barcodeData,
            strong: barcodeLookupLooksStrong(barcodeData),
            source: barcodeData ? 'barcodelookup.com' : null,
          },
          phase2_ai: {
            model: OPENAI_MODEL,
            confidence: ai.confidence,
            isCoffeePackage: ai.isCoffeePackage,
            isSpecialty: ai.isSpecialty,
          },
          phase3_validation: {
            confidenceScore: ai.confidence,
            dataCompletenessScore: completeness.score,
            missingFields: completeness.missing,
            autoApproved: shouldAutoApprove,
            decision: !ai.isCoffeePackage
              ? 'rejected'
              : shouldAutoApprove
                ? 'auto_approved'
                : 'pending_admin',
          },
          processedAt: new Date().toISOString(),
        },
        nombre: ai.nombre || barcodeData?.nombre || cafe?.nombre || 'Pendiente de identificar',
        marca: ai.marca || barcodeData?.marca || cafe?.marca || '',
        origen: ai.origen || cafe?.origen || '',
      };

      if (ai.ean) {
        cafeUpdate.ean = ai.ean;
      }

      if (officialPhoto) {
        cafeUpdate.officialPhoto = officialPhoto;
      }

      // Build canonical photos object
      const existingOfficials = Array.isArray(cafe?.photos?.official) ? cafe.photos.official : [];
      const existingUsers = Array.isArray(cafe?.photos?.user) ? cafe.photos.user : [];
      const officialPhotos = [...new Set([officialPhoto, ...existingOfficials].filter(Boolean))];
      const userPhotos = [...new Set([userPhoto, ...existingUsers].filter(Boolean))];

      const photos = buildPhotosObject({
        officialPhotos,
        userPhotos,
        isCoffeePackage: ai.isCoffeePackage,
        aiConfidence: ai.confidence,
      });

      cafeUpdate.photos = photos;
      cafeUpdate.bestPhoto =
        photos.selected ||
        pickBestPhoto({
          userPhoto,
          officialPhoto,
          aiConfidence: ai.confidence,
          isCoffeePackage: ai.isCoffeePackage,
        });

      cafeUpdate.photoSources = {
        userPhoto: userPhoto || '',
        officialPhoto: officialPhoto || '',
        bestPhoto: cafeUpdate.bestPhoto || '',
        selectedBy:
          photos.source !== 'fallback'
            ? photos.source
            : pickSelectedPhotoSource({
                officialPhoto,
                aiConfidence: ai.confidence,
                isCoffeePackage: ai.isCoffeePackage,
              }),
      };

      if (!ai.isCoffeePackage) {
        cafeUpdate.reviewStatus = 'rejected';
        cafeUpdate.appVisible = false;
        cafeUpdate.scannerVisible = false;
        cafeUpdate.isSpecialty = false;
      } else if (shouldAutoApprove) {
        cafeUpdate.reviewStatus = 'approved';
        cafeUpdate.appVisible = true;
        cafeUpdate.scannerVisible = true;
        cafeUpdate.isSpecialty = true;
      }

      await cafeRef.update(cafeUpdate);

      await jobRef.update({
        status: 'done',
        error: admin.firestore.FieldValue.delete(),
        result: {
          usedOpenAI: true,
          aiConfidenceScore: ai.confidence,
          dataCompletenessScore: completeness.score,
          dataSource,
          missingFields: completeness.missing,
          isSpecialty: ai.isSpecialty,
          isCoffeePackage: ai.isCoffeePackage,
          autoApproved: shouldAutoApprove,
          barcodeLookupFound: !!barcodeData,
          selectedPhotoSource: cafeUpdate.photoSources?.selectedBy || 'user',
        },
        updatedAt: new Date().toISOString(),
      });

      logger.info('AI job processed successfully', {
        jobId,
        targetCollection,
        targetId,
        confidence: ai.confidence,
        completeness: completeness.score,
        dataSource,
        autoApproved: shouldAutoApprove,
        barcodeLookupFound: !!barcodeData,
        missingFields: completeness.missing,
        selectedPhotoSource: cafeUpdate.photoSources?.selectedBy || 'user',
      });
    } catch (error) {
      logger.error('AI job failed', {
        jobId,
        error: String(error?.message || error),
      });

      await jobRef.update({
        status: 'failed',
        error: String(error?.message || error),
        updatedAt: new Date().toISOString(),
      });
    }
  }
);

async function lookupProductByBarcodeForAdmin(barcode) {
  const apiKey = process.env.BARCODE_LOOKUP_API_KEY;
  const normalized = String(barcode || '')
    .replace(/\D/g, '')
    .trim();

  if (!apiKey || !normalized) return null;

  try {
    const url =
      `${BARCODE_LOOKUP_API_URL}?barcode=${encodeURIComponent(normalized)}` +
      `&formatted=y&key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) return null;

    const product = Array.isArray(json?.products) ? json.products[0] : null;
    if (!product) return null;

    return {
      nombre: String(product.title || '').trim(),
      marca: String(product.brand || product.manufacturer || '').trim(),
      categoria: String(product.category || '').trim(),
      descripcion: String(product.description || '').trim(),
      imagen: pickFirstImage(product),
      formato:
        String(product.size || '').trim() ||
        String(product.title || '').match(/\b(\d+\s?(g|kg|ml|l))\b/i)?.[0] ||
        '',
    };
  } catch (error) {
    logger.error('lookupProductByBarcodeForAdmin failed', {
      barcode: normalized,
      error: String(error?.message || error),
    });
    return null;
  }
}

async function callOpenAIForAdminDraft({ ean, nombre, marca, foto, barcodeData }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
  }

  const content = [
    {
      type: 'input_text',
      text: `
Devuelve SOLO JSON válido.

Esquema:
{
  "suggestedNombre": "string",
  "suggestedMarca": "string",
  "suggestedOrigen": "string",
  "suggestedFormato": "string",
  "suggestedNotas": "string",
  "suggestedOfficialPhoto": "string",
  "confidence": 0.0
}

Reglas:
- Usa el EAN si existe.
- Si no estás seguro, deja string vacío.
- confidence entre 0 y 1.
- suggestedOfficialPhoto debe ser URL si la tienes, o string vacío.
- No inventes demasiado.
- Si parece café comercial y no specialty, aun así devuelve la mejor ficha posible.
- Responde solo JSON.
      
Datos recibidos:
- ean: ${ean || ''}
- nombre: ${nombre || ''}
- marca: ${marca || ''}

Datos barcode:
- nombre lookup: ${barcodeData?.nombre || ''}
- marca lookup: ${barcodeData?.marca || ''}
- categoría lookup: ${barcodeData?.categoria || ''}
- descripción lookup: ${barcodeData?.descripcion || ''}
- imagen lookup: ${barcodeData?.imagen || ''}
- formato lookup: ${barcodeData?.formato || ''}
      `.trim(),
    },
  ];

  if (foto) {
    content.push({
      type: 'input_image',
      image_url: foto,
    });
  } else if (barcodeData?.imagen) {
    content.push({
      type: 'input_image',
      image_url: barcodeData.imagen,
    });
  }

  const body = {
    model: OPENAI_MODEL,
    input: [
      {
        role: 'user',
        content,
      },
    ],
    temperature: 0.2,
    text: {
      format: {
        type: 'json_schema',
        name: 'admin_coffee_draft',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            suggestedNombre: { type: 'string' },
            suggestedMarca: { type: 'string' },
            suggestedOrigen: { type: 'string' },
            suggestedFormato: { type: 'string' },
            suggestedNotas: { type: 'string' },
            suggestedOfficialPhoto: { type: 'string' },
            confidence: { type: 'number' },
          },
          required: [
            'suggestedNombre',
            'suggestedMarca',
            'suggestedOrigen',
            'suggestedFormato',
            'suggestedNotas',
            'suggestedOfficialPhoto',
            'confidence',
          ],
        },
      },
    },
  };

  const parsed = await robustOpenAICall({ apiKey, body });

  return {
    suggestedNombre: String(parsed.suggestedNombre || '').trim(),
    suggestedMarca: String(parsed.suggestedMarca || '').trim(),
    suggestedOrigen: String(parsed.suggestedOrigen || '').trim(),
    suggestedFormato: String(parsed.suggestedFormato || '').trim(),
    suggestedNotas: String(parsed.suggestedNotas || '').trim(),
    suggestedOfficialPhoto: String(parsed.suggestedOfficialPhoto || '').trim(),
    confidence: Number(parsed.confidence || 0),
  };
}

const RECOGNITION_MEMORY_THRESHOLD = 3;

function normalizeForMatch(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function buildMemoryKey(roaster, nombre) {
  const r = normalizeForMatch(roaster).replace(/\s+/g, '-');
  const n = normalizeForMatch(nombre).replace(/\s+/g, '-');
  return `${r}__${n}`.slice(0, 200);
}

async function lookupRecognitionMemory(roaster, nombre) {
  const key = buildMemoryKey(roaster, nombre);
  if (!key || key === '__') return null;
  const snap = await db.collection('recognition_memory').doc(key).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (Number(data.count || 0) >= RECOGNITION_MEMORY_THRESHOLD) {
    return { cafeId: data.cafeId, count: data.count };
  }
  return null;
}

async function incrementRecognitionMemory(roaster, nombre, cafeId) {
  const key = buildMemoryKey(roaster, nombre);
  if (!key || key === '__' || !cafeId) return;
  const ref = db.collection('recognition_memory').doc(key);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const data = snap.data() || {};
      if (data.cafeId === cafeId) {
        tx.update(ref, { count: (data.count || 0) + 1, updatedAt: new Date().toISOString() });
      } else if ((data.count || 0) <= 1) {
        tx.set(ref, { cafeId, count: 1, updatedAt: new Date().toISOString() });
      }
    } else {
      tx.set(ref, {
        cafeId,
        count: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

function tokenSimilarity(a, b) {
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.75;
  const tokA = na.split(/[\s\-_,]+/).filter(Boolean);
  const tokB = nb.split(/[\s\-_,]+/).filter(Boolean);
  const hits = tokA.filter((t) => tokB.some((tb) => tb === t || tb.includes(t) || t.includes(tb)));
  return hits.length / Math.max(tokA.length, tokB.length, 1);
}

function scoreCafeMatch(extracted, cafe) {
  const roaster = tokenSimilarity(extracted.roaster, cafe.roaster) * 40;
  const nombre = tokenSimilarity(extracted.nombre, cafe.nombre) * 35;
  const pais = tokenSimilarity(extracted.pais, cafe.pais || cafe.origen) * 15;
  const proceso = tokenSimilarity(extracted.proceso, cafe.proceso) * 10;
  return Math.round(roaster + nombre + pais + proceso);
}

async function callOpenAIForRecognition({ imageBase64 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');

  const body = {
    model: OPENAI_MODEL,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: [
              'Analiza la imagen de este packaging de café.',
              'Extrae: nombre del producto, roaster/tostador, país de origen y proceso de beneficiado.',
              'Si la imagen no muestra un café reconocible, responde con isCoffee: false.',
              'Si no puedes leer un campo, devuelve cadena vacía para ese campo.',
            ].join(' '),
          },
          {
            type: 'input_image',
            image_url: `data:image/jpeg;base64,${imageBase64}`,
          },
        ],
      },
    ],
    temperature: 0.1,
    text: {
      format: {
        type: 'json_schema',
        name: 'coffee_recognition',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            isCoffee: { type: 'boolean' },
            nombre: { type: 'string' },
            roaster: { type: 'string' },
            pais: { type: 'string' },
            proceso: { type: 'string' },
            confidence: { type: 'number' },
          },
          required: ['isCoffee', 'nombre', 'roaster', 'pais', 'proceso', 'confidence'],
        },
      },
    },
  };

  return robustOpenAICall({ apiKey, body });
}

exports.recognizeCoffee = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 30,
    memory: '256MiB',
    secrets: ['OPENAI_API_KEY'],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      return;
    }

    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) {
        res.status(401).json({ error: 'UNAUTHENTICATED' });
        return;
      }
      await admin.auth().verifyIdToken(token);

      const { imageBase64 } = req.body || {};
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'MISSING_IMAGE' });
        return;
      }

      const extracted = await callOpenAIForRecognition({ imageBase64 });

      logger.info('recognizeCoffee extracted', {
        isCoffee: extracted.isCoffee,
        nombre: extracted.nombre,
        roaster: extracted.roaster,
        pais: extracted.pais,
        proceso: extracted.proceso,
      });

      if (!extracted.isCoffee) {
        res.status(200).json({ ok: true, isCoffee: false, candidates: [] });
        return;
      }

      const [snapshot, memoryMatch] = await Promise.all([
        db.collection('cafes').get(),
        lookupRecognitionMemory(extracted.roaster, extracted.nombre),
      ]);

      const activeCafes = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => c.legacy !== true);

      if (memoryMatch) {
        const remembered = activeCafes.find((c) => c.id === memoryMatch.cafeId);
        if (remembered) {
          logger.info('recognizeCoffee memory hit', {
            cafeId: memoryMatch.cafeId,
            count: memoryMatch.count,
          });
          res.status(200).json({
            ok: true,
            isCoffee: true,
            extracted,
            confidence: 'high',
            fromMemory: true,
            candidates: [
              {
                id: remembered.id,
                nombre: remembered.nombre,
                roaster: remembered.roaster,
                pais: remembered.pais,
                proceso: remembered.proceso,
                officialPhoto:
                  remembered.photos?.selected ||
                  remembered.bestPhoto ||
                  remembered.officialPhoto ||
                  remembered.foto ||
                  null,
                puntuacion: remembered.puntuacion,
                score: 100,
              },
            ],
          });
          return;
        }
      }

      const allScored = activeCafes
        .map((cafe) => ({
          id: cafe.id,
          nombre: cafe.nombre,
          score: scoreCafeMatch(extracted, cafe),
        }))
        .sort((a, b) => b.score - a.score);

      logger.info('recognizeCoffee top scores', { top5: allScored.slice(0, 5) });

      const scored = allScored
        .filter((r) => r.score > 10)
        .slice(0, 3)
        .map(({ id, score }) => ({
          cafe: activeCafes.find((c) => c.id === id),
          score,
        }));

      const confidence =
        scored[0]?.score >= 70 ? 'high' : scored[0]?.score >= 45 ? 'medium' : 'low';

      res.status(200).json({
        ok: true,
        isCoffee: true,
        extracted,
        confidence,
        candidates: scored.map(({ cafe, score }) => ({
          id: cafe.id,
          nombre: cafe.nombre,
          roaster: cafe.roaster,
          pais: cafe.pais,
          proceso: cafe.proceso,
          officialPhoto:
            cafe.photos?.selected || cafe.bestPhoto || cafe.officialPhoto || cafe.foto || null,
          puntuacion: cafe.puntuacion,
          score,
        })),
      });
    } catch (error) {
      logger.error('recognizeCoffee error', { error: String(error?.message || error) });
      res.status(500).json({ ok: false, error: String(error?.message || error) });
    }
  }
);

exports.confirmRecognition = onRequest(
  { region: 'europe-west1', cors: true, timeoutSeconds: 15, memory: '128MiB' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      return;
    }
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) {
        res.status(401).json({ error: 'UNAUTHENTICATED' });
        return;
      }
      await admin.auth().verifyIdToken(token);

      const { extractedRoaster, extractedNombre, confirmedCafeId } = req.body || {};
      if (!extractedRoaster || !extractedNombre || !confirmedCafeId) {
        res.status(400).json({ error: 'MISSING_FIELDS' });
        return;
      }

      await incrementRecognitionMemory(extractedRoaster, extractedNombre, confirmedCafeId);
      res.status(200).json({ ok: true });
    } catch (error) {
      logger.error('confirmRecognition error', { error: String(error?.message || error) });
      res.status(500).json({ ok: false, error: String(error?.message || error) });
    }
  }
);

exports.adminEnrichCoffeeDraft = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 60,
    memory: '512MiB',
    secrets: ['OPENAI_API_KEY'],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      return;
    }

    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (!token) {
        res.status(401).json({ error: 'UNAUTHENTICATED' });
        return;
      }

      await admin.auth().verifyIdToken(token);

      const { ean, nombre, marca, foto } = req.body || {};

      const barcodeData = await lookupProductByBarcodeForAdmin(ean);
      const ai = await callOpenAIForAdminDraft({
        ean,
        nombre,
        marca,
        foto,
        barcodeData,
      });

      res.status(200).json({
        ok: true,
        proposal: {
          suggestedNombre: ai.suggestedNombre || barcodeData?.nombre || nombre || '',
          suggestedMarca: ai.suggestedMarca || barcodeData?.marca || marca || '',
          suggestedOrigen: ai.suggestedOrigen || '',
          suggestedFormato: ai.suggestedFormato || barcodeData?.formato || '',
          suggestedNotas: ai.suggestedNotas || barcodeData?.descripcion || '',
          suggestedOfficialPhoto: ai.suggestedOfficialPhoto || barcodeData?.imagen || '',
          confidence: ai.confidence || 0,
          barcodeLookupFound: !!barcodeData,
        },
      });
    } catch (error) {
      logger.error('adminEnrichCoffeeDraft error', {
        error: String(error?.message || error),
      });
      res.status(500).json({
        ok: false,
        error: String(error?.message || error),
      });
    }
  }
);

// ── Admin: retry full enrichment pipeline on a specific café ──
exports.adminRetryEnrichment = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 15,
    memory: '128MiB',
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      return;
    }

    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) {
        res.status(401).json({ error: 'UNAUTHENTICATED' });
        return;
      }

      const decoded = await admin.auth().verifyIdToken(token);
      const uid = decoded.uid;

      // Verify admin role
      const profileSnap = await db.collection('user_profiles').doc(uid).get();
      if (!profileSnap.exists || profileSnap.data()?.role !== 'admin') {
        res.status(403).json({ error: 'FORBIDDEN' });
        return;
      }

      const { cafeId } = req.body || {};
      if (!cafeId) {
        res.status(400).json({ error: 'MISSING_CAFE_ID' });
        return;
      }

      const cafeRef = db.collection('cafes').doc(cafeId);
      const cafeSnap = await cafeRef.get();
      if (!cafeSnap.exists) {
        res.status(404).json({ error: 'CAFE_NOT_FOUND' });
        return;
      }

      const cafe = cafeSnap.data() || {};

      // Reset aiStatus so the pipeline won't skip it
      await cafeRef.update({
        aiStatus: 'queued',
        updatedAt: new Date().toISOString(),
      });

      // Create ai_job to trigger the pipeline
      const jobRef = await db.collection('ai_jobs').add({
        type: 'coffee_enrichment',
        status: 'queued',
        targetCollection: 'cafes',
        targetId: cafeId,
        uid: cafe.uid || uid,
        ean: cafe.ean || '',
        foto: cafe.foto || cafe.imageUrl || '',
        adminRetry: true,
        retriggeredBy: uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      res.status(200).json({
        ok: true,
        jobId: jobRef.id,
        message: 'Enrichment pipeline retriggered',
      });
    } catch (error) {
      logger.error('adminRetryEnrichment error', {
        error: String(error?.message || error),
      });
      res.status(500).json({
        ok: false,
        error: String(error?.message || error),
      });
    }
  }
);
