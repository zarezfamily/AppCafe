const crypto = require('crypto');
const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');

admin.initializeApp();

const db = admin.firestore();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const AI_AUTO_APPROVE_THRESHOLD = Number(process.env.AI_AUTO_APPROVE_THRESHOLD || 0.85);

const BARCODE_LOOKUP_API_URL = 'https://api.barcodelookup.com/v3/products';

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

function pickFirstImage(product) {
  if (!product) return '';

  if (Array.isArray(product.images) && product.images.length > 0) {
    return String(product.images[0] || '').trim();
  }

  if (typeof product.image === 'string') return product.image.trim();
  if (typeof product.thumbnail === 'string') return product.thumbnail.trim();

  return '';
}

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

async function callOpenAIForCoffeeEnrichment({ job, cafe, barcodeData }) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
  }

  const prompt = `
Analiza este producto y responde SOLO en JSON válido.
No añadas texto extra.

Devuelve este esquema exacto:
{
  "nombre": "string",
  "marca": "string",
  "origen": "string",
  "isSpecialty": true,
  "isCoffeePackage": true,
  "confidence": 0.0,
  "imageReason": "string",
  "summary": "string",
  "ean": "string"
}

Reglas:
- "isCoffeePackage" debe ser false si la imagen o el contexto no parecen un paquete o producto de café.
- "isSpecialty" debe indicar si probablemente es café de especialidad.
- "confidence" entre 0 y 1.
- Si no sabes un campo, devuelve cadena vacía.
- Si el lookup por código de barras sugiere otro tipo de producto, tenlo en cuenta.
- No inventes demasiado.
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

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: 'user',
          content,
        },
      ],
      temperature: 0.2,
    }),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    logger.error('OpenAI request failed', {
      status: response.status,
      body: json,
    });
    throw new Error(`OPENAI_REQUEST_FAILED_${response.status}`);
  }

  const text = extractTextOutput(json);
  const parsed = safeJsonParse(text);

  if (!parsed) {
    logger.error('OpenAI returned non-JSON output', { text });
    throw new Error('OPENAI_INVALID_JSON');
  }

  return normalizeAiResult(parsed, cafe, job, barcodeData);
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

exports.onAiJobCreatedProcessCoffee = onDocumentCreated('ai_jobs/{jobId}', async (event) => {
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

    const barcodeData = await lookupProductByBarcode(job?.ean || cafe?.ean || '');
    const ai = await callOpenAIForCoffeeEnrichment({ job, cafe, barcodeData });

    const imageValidationStatus = ai.isCoffeePackage ? 'approved' : 'rejected';
    const shouldAutoApprove =
      ai.isCoffeePackage && ai.isSpecialty === true && ai.confidence >= AI_AUTO_APPROVE_THRESHOLD;

    const userPhoto = String(cafe?.foto || job?.foto || '').trim();
    const officialPhoto = String(barcodeData?.imagen || '').trim();

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
      },
      aiConfidenceScore: ai.confidence,
      aiStatus: shouldAutoApprove ? 'auto_approved' : 'completed',
      updatedAt: new Date().toISOString(),
      imageValidation: {
        status: imageValidationStatus,
        reason: ai.imageReason || (ai.isCoffeePackage ? '' : 'not_coffee_package'),
        confidence: ai.confidence,
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

    cafeUpdate.bestPhoto = pickBestPhoto({
      userPhoto,
      officialPhoto,
      aiConfidence: ai.confidence,
      isCoffeePackage: ai.isCoffeePackage,
    });

    cafeUpdate.photoSources = {
      userPhoto: userPhoto || '',
      officialPhoto: officialPhoto || '',
      bestPhoto: cafeUpdate.bestPhoto || '',
      selectedBy: pickSelectedPhotoSource({
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
      result: {
        aiConfidenceScore: ai.confidence,
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
      autoApproved: shouldAutoApprove,
      barcodeLookupFound: !!barcodeData,
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
});
