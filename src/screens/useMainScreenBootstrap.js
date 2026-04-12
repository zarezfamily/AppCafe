import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform, useEffect, useState } from 'react';

export default function useMainScreenBootstrap({
  user,
  perfil,
  favs,
  allCafes,
  forumThreads,
  setFavs,
  setVotes,
  setPerfil,
  setOfertasPorCafe,
  setDocument,
  getDocument,
  scheduleEtioveNotification,
  registerForPushNotificationsAsync,
  setActiveTab,
  communityNotificationBootRef,
  forumNotificationBootRef,
  favoriteNotificationBootRef,
  appVersion,
  keys,
  offersCacheTtlMs,
  showDialog,
}) {
  const [newsletterState, setNewsletterState] = useState({ subscribed: false, createdAt: '', subscribedAt: '', updatedAt: '' });
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSaving, setNewsletterSaving] = useState(false);
  const [interactionFeedbackSettings, setInteractionFeedbackSettings] = useState({ enabled: true, mode: 'haptic' });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [notificationsReady, setNotificationsReady] = useState(false);
  const [pushToken, setPushToken] = useState(null);

  useEffect(() => {
    SecureStore.getItemAsync(keys.favs).then((v) => v && setFavs(JSON.parse(v))).catch(() => {});
    SecureStore.getItemAsync(keys.votes).then((v) => v && setVotes(JSON.parse(v))).catch(() => {});
    SecureStore.getItemAsync(keys.profile).then((v) => v && setPerfil(JSON.parse(v))).catch(() => {});
    SecureStore.getItemAsync(keys.offersCache)
      .then((v) => {
        if (!v) return;
        const parsed = JSON.parse(v);
        const cache = parsed?.byCafe || {};
        const now = Date.now();
        const fresh = {};
        Object.entries(cache).forEach(([cafeId, entry]) => {
          if (!entry?.updatedAt || !Array.isArray(entry?.offers)) return;
          if ((now - entry.updatedAt) <= offersCacheTtlMs) fresh[cafeId] = entry;
        });
        setOfertasPorCafe(fresh);
      })
      .catch(() => {});
    SecureStore.getItemAsync(keys.onboardingDone)
      .then((v) => {
        if (v !== 'true') setShowOnboarding(true);
      })
      .catch(() => setShowOnboarding(true));
    SecureStore.getItemAsync(keys.feedbackSettings)
      .then((v) => {
        if (!v) return;
        const parsed = JSON.parse(v);
        setInteractionFeedbackSettings({
          enabled: !!parsed?.enabled,
          mode: parsed?.mode === 'sound' ? 'sound' : 'haptic',
        });
      })
      .catch(() => {});
    SecureStore.getItemAsync(keys.feedbackEnabled)
      .then((v) => {
        if (v === null) return;
        setInteractionFeedbackSettings((prev) => ({ ...prev, enabled: v === 'true' }));
      })
      .catch(() => {});

    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(() => {});
    return () => {
      notificationSubscription.remove();
    };
  }, [keys, offersCacheTtlMs, setFavs, setOfertasPorCafe, setPerfil, setVotes]);

  useEffect(() => {
    if (!user?.uid) return;
    registerForPushNotificationsAsync()
      .then(async ({ status, token }) => {
        setNotificationsReady(status === 'granted');
        setPushToken(token || null);
        if (!token) return;
        await setDocument('push_subscriptions', user.uid, {
          uid: user.uid,
          expoPushToken: token,
          platform: Platform.OS,
          appVersion,
          notificationsEnabled: true,
          favoriteCafeIds: Array.isArray(favs) ? favs : [],
          updatedAt: new Date().toISOString(),
        });
      })
      .catch(() => setNotificationsReady(false));
  }, [appVersion, favs, registerForPushNotificationsAsync, setDocument, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !notificationsReady || !pushToken) return;
    setDocument('push_subscriptions', user.uid, {
      uid: user.uid,
      expoPushToken: pushToken,
      platform: Platform.OS,
      appVersion,
      notificationsEnabled: true,
      favoriteCafeIds: Array.isArray(favs) ? favs : [],
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }, [appVersion, favs, notificationsReady, pushToken, setDocument, user?.uid]);

  const guardarFeedbackInteracciones = async (nextValue) => {
    const next = {
      ...interactionFeedbackSettings,
      enabled: !!nextValue,
    };
    setInteractionFeedbackSettings(next);
    try {
      await SecureStore.setItemAsync(keys.feedbackSettings, JSON.stringify(next));
      await SecureStore.setItemAsync(keys.feedbackEnabled, nextValue ? 'true' : 'false');
    } catch {}
  };

  const guardarModoFeedbackInteracciones = async (nextMode) => {
    const safeMode = nextMode === 'sound' ? 'sound' : 'haptic';
    const next = {
      ...interactionFeedbackSettings,
      mode: safeMode,
    };
    setInteractionFeedbackSettings(next);
    try {
      await SecureStore.setItemAsync(keys.feedbackSettings, JSON.stringify(next));
    } catch {}
  };

  const completeOnboarding = async () => {
    setShowOnboarding(false);
    try {
      await SecureStore.setItemAsync(keys.onboardingDone, 'true');
    } catch {}
  };

  const startQuizFromOnboarding = async () => {
    setActiveTab('Mis Cafés');
    await completeOnboarding();
  };

  useEffect(() => {
    if (!user?.uid) return;
    setNewsletterLoading(true);
    getDocument('newsletter_subscribers', user.uid)
      .then((doc) => {
        if (doc) {
          setNewsletterState({
            subscribed: !!doc.subscribed,
            createdAt: doc.createdAt || '',
            subscribedAt: doc.subscribedAt || '',
            updatedAt: doc.updatedAt || '',
          });
        } else {
          setNewsletterState({ subscribed: false, createdAt: '', subscribedAt: '', updatedAt: '' });
        }
      })
      .catch(() => {
        setNewsletterState({ subscribed: false, createdAt: '', subscribedAt: '', updatedAt: '' });
      })
      .finally(() => {
        setNewsletterLoading(false);
      });
  }, [getDocument, user?.uid]);

  useEffect(() => {
    if (!user?.uid || allCafes.length === 0 || !notificationsReady) return;
    const key = `${keys.notifyCommunitySnapshot}_${user.uid}`;
    const nextSnapshot = {
      latestCafeId: allCafes[0]?.id || '',
      latestCafeName: allCafes[0]?.nombre || '',
      latestCafeUid: allCafes[0]?.uid || '',
    };

    const syncSnapshot = async () => {
      const stored = await SecureStore.getItemAsync(key).catch(() => null);
      const prev = stored ? JSON.parse(stored) : null;
      const shouldNotify = communityNotificationBootRef.current
        && prev?.latestCafeId
        && prev.latestCafeId !== nextSnapshot.latestCafeId
        && nextSnapshot.latestCafeUid
        && nextSnapshot.latestCafeUid !== user.uid;

      if (shouldNotify) {
        await scheduleEtioveNotification({
          title: 'Nuevo café en la comunidad',
          body: `${nextSnapshot.latestCafeName || 'Un café nuevo'} ya está disponible en Etiove.`,
          data: { type: 'community_new_cafe' },
        });
      }

      communityNotificationBootRef.current = true;
      await SecureStore.setItemAsync(key, JSON.stringify(nextSnapshot)).catch(() => {});
    };

    syncSnapshot();
  }, [allCafes, communityNotificationBootRef, keys.notifyCommunitySnapshot, notificationsReady, scheduleEtioveNotification, user?.uid]);

  useEffect(() => {
    if (!user?.uid || forumThreads.length === 0 || !notificationsReady) return;
    const ownThreads = forumThreads.filter((thread) => thread.authorUid === user.uid);
    const key = `${keys.notifyForumSnapshot}_${user.uid}`;
    const nextSnapshot = ownThreads.reduce((acc, thread) => {
      acc[thread.id] = {
        replyCount: Number(thread.replyCount || 0),
        title: thread.title || 'Tu hilo',
      };
      return acc;
    }, {});

    const syncSnapshot = async () => {
      const stored = await SecureStore.getItemAsync(key).catch(() => null);
      const prev = stored ? JSON.parse(stored) : {};
      let changedThread = null;

      if (forumNotificationBootRef.current) {
        ownThreads.some((thread) => {
          const prevCount = Number(prev?.[thread.id]?.replyCount || 0);
          const nextCount = Number(thread.replyCount || 0);
          if (nextCount > prevCount) {
            changedThread = thread;
            return true;
          }
          return false;
        });
      }

      if (changedThread) {
        await scheduleEtioveNotification({
          title: 'Nueva respuesta en tu hilo',
          body: `Han respondido en "${changedThread.title || 'tu hilo'}".`,
          data: { type: 'forum_reply', threadId: changedThread.id },
        });
      }

      forumNotificationBootRef.current = true;
      await SecureStore.setItemAsync(key, JSON.stringify(nextSnapshot)).catch(() => {});
    };

    syncSnapshot();
  }, [forumNotificationBootRef, forumThreads, keys.notifyForumSnapshot, notificationsReady, scheduleEtioveNotification, user?.uid]);

  useEffect(() => {
    if (!user?.uid || allCafes.length === 0 || favs.length === 0 || !notificationsReady) return;
    const favoriteMap = allCafes
      .filter((cafe) => favs.includes(cafe.id))
      .reduce((acc, cafe) => {
        acc[cafe.id] = {
          nombre: cafe.nombre || 'Tu café favorito',
          puntuacion: Number(cafe.puntuacion || 0),
        };
        return acc;
      }, {});
    const key = `${keys.notifyFavoritesSnapshot}_${user.uid}`;

    const syncSnapshot = async () => {
      const stored = await SecureStore.getItemAsync(key).catch(() => null);
      const prev = stored ? JSON.parse(stored) : {};
      let changedFavorite = null;

      if (favoriteNotificationBootRef.current) {
        Object.entries(favoriteMap).some(([cafeId, cafe]) => {
          const previousScore = Number(prev?.[cafeId]?.puntuacion || 0);
          if (previousScore > 0 && previousScore !== Number(cafe.puntuacion || 0)) {
            changedFavorite = cafe;
            return true;
          }
          return false;
        });
      }

      if (changedFavorite) {
        await scheduleEtioveNotification({
          title: 'Cambió la puntuación de un favorito',
          body: `${changedFavorite.nombre} ahora tiene ${changedFavorite.puntuacion.toFixed(1)} puntos.`,
          data: { type: 'favorite_score_changed' },
        });
      }

      favoriteNotificationBootRef.current = true;
      await SecureStore.setItemAsync(key, JSON.stringify(favoriteMap)).catch(() => {});
    };

    syncSnapshot();
  }, [allCafes, favoriteNotificationBootRef, favs, keys.notifyFavoritesSnapshot, notificationsReady, scheduleEtioveNotification, user?.uid]);

  const guardarNewsletter = async (nextSubscribed) => {
    if (!user?.uid) return;
    const newsletterEmail = (perfil.email || user?.email || '').trim();
    const newsletterHasEmail = !!newsletterEmail;
    if (!newsletterHasEmail) {
      showDialog('Falta tu email', 'Completa tu perfil antes de suscribirte a la newsletter.');
      return;
    }

    setNewsletterSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        uid: user.uid,
        email: newsletterEmail,
        emailLower: newsletterEmail.toLowerCase(),
        alias: perfil.alias || '',
        nombre: perfil.nombre || '',
        apellidos: perfil.apellidos || '',
        subscribed: nextSubscribed,
        source: 'app_mas',
        createdAt: newsletterState.createdAt || now,
        subscribedAt: nextSubscribed ? (newsletterState.subscribedAt || now) : '',
        unsubscribedAt: nextSubscribed ? '' : now,
        updatedAt: now,
      };

      const ok = await setDocument('newsletter_subscribers', user.uid, payload);
      if (!ok) throw new Error('save_newsletter_failed');

      setNewsletterState({
        subscribed: nextSubscribed,
        createdAt: payload.createdAt,
        subscribedAt: payload.subscribedAt,
        updatedAt: payload.updatedAt,
      });
      showDialog(
        nextSubscribed ? 'Newsletter activada' : 'Newsletter pausada',
        nextSubscribed
          ? 'Te avisaremos por email de novedades, lanzamientos y selecciones especiales.'
          : 'Has dejado de recibir emails. Podrás activarlos otra vez cuando quieras.'
      );
    } catch {
      showDialog('Error', 'No se pudo guardar tu preferencia de newsletter.');
    } finally {
      setNewsletterSaving(false);
    }
  };

  return {
    newsletterState,
    newsletterLoading,
    newsletterSaving,
    interactionFeedbackSettings,
    showOnboarding,
    notificationsReady,
    completeOnboarding,
    startQuizFromOnboarding,
    guardarFeedbackInteracciones,
    guardarModoFeedbackInteracciones,
    guardarNewsletter,
  };
}
