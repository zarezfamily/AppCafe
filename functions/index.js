const crypto = require('crypto');
const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');

admin.initializeApp();

const db = admin.firestore();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

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
