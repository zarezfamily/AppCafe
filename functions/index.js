const admin = require('firebase-admin');
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
    .map((s) => buildMessage(
      s.expoPushToken,
      'Nuevo café en la comunidad',
      `${cafeName} ya está disponible en Etiove.`,
      { type: 'community_new_cafe', cafeId: event.params.cafeId }
    ));

  await sendExpoPushMessages(messages);
});

exports.onForumReplyCreatedNotifyThreadOwner = onDocumentCreated('foro_respuestas/{replyId}', async (event) => {
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
});

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
    .map((s) => buildMessage(
      s.expoPushToken,
      'Cambió la puntuación de un favorito',
      `${after.nombre || 'Tu café favorito'} ahora tiene ${next.toFixed(1)} puntos.`,
      { type: 'favorite_score_changed', cafeId }
    ));

  await sendExpoPushMessages(messages);
});
