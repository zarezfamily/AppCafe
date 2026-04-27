import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

import {
  defaultGamification,
  getAchievementDefs,
  normalizeGamification,
} from '../core/gamification';
import { normalize } from '../core/utils';

export default function useGamification({ storageKey }) {
  const [gamification, setGamification] = useState(defaultGamification());
  const [achievementToast, setAchievementToast] = useState(null);
  const achievementToastTimerRef = useRef(null);
  const achievementToastOpacity = useRef(new Animated.Value(0)).current;
  const achievementToastTranslateY = useRef(new Animated.Value(-22)).current;

  useEffect(() => {
    SecureStore.getItemAsync(storageKey)
      .then((v) => {
        if (!v) return;
        try {
          setGamification(normalizeGamification(JSON.parse(v)));
        } catch {}
      })
      .catch(() => {});
  }, [storageKey]);

  useEffect(
    () => () => {
      if (achievementToastTimerRef.current) clearTimeout(achievementToastTimerRef.current);
    },
    []
  );

  const closeAchievementToast = useCallback(() => {
    if (achievementToastTimerRef.current) {
      clearTimeout(achievementToastTimerRef.current);
      achievementToastTimerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(achievementToastOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(achievementToastTranslateY, {
        toValue: -18,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAchievementToast(null);
    });
  }, [achievementToastOpacity, achievementToastTranslateY]);

  const showAchievementToast = useCallback(
    (achievement, xpDelta) => {
      if (!achievement) return;
      if (achievementToastTimerRef.current) clearTimeout(achievementToastTimerRef.current);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setAchievementToast({
        icon: achievement.icon || '🏆',
        title: achievement.title || 'Logro desbloqueado',
        desc: achievement.desc || '',
        xpGained: Math.max(0, Number(xpDelta || 0)),
      });
      achievementToastOpacity.setValue(0);
      achievementToastTranslateY.setValue(-22);
      Animated.parallel([
        Animated.timing(achievementToastOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(achievementToastTranslateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      achievementToastTimerRef.current = setTimeout(() => {
        achievementToastTimerRef.current = null;
        closeAchievementToast();
      }, 4000);
    },
    [achievementToastOpacity, achievementToastTranslateY, closeAchievementToast]
  );

  const registrarEventoGamificacion = useCallback(
    (type, payload = {}) => {
      setGamification((prev) => {
        const base = { ...defaultGamification(), ...prev };
        const next = {
          ...base,
          countriesRated: [...(base.countriesRated || [])],
          specialOriginsTasted: [...(base.specialOriginsTasted || [])],
        };

        if (type === 'vote') {
          next.votesCount += 1;
          const p = payload?.cafe?.pais;
          if (p) next.countriesRated.push(p);
          const sig = normalize(
            `${payload?.cafe?.nombre || ''} ${payload?.cafe?.variedad || ''} ${payload?.cafe?.pais || ''}`
          );
          if (sig.includes('geisha')) next.specialOriginsTasted.push('geisha');
          if (sig.includes('bourbon pointu')) next.specialOriginsTasted.push('bourbon_pointu');
          if (sig.includes('yemen')) next.specialOriginsTasted.push('yemen');
        }

        if (type === 'favorite_mark') {
          next.favoritesMarkedCount += 1;
        }

        if (type === 'add_cafe') {
          next.cafesAddedCount += 1;
          if (payload?.hasPhoto) next.photosCount += 1;
          if (payload?.hasReview) next.reviewsCount += 1;
        }

        if (type === 'daily_challenge') {
          next.dailyChallengeCount = (next.dailyChallengeCount || 0) + 1;
          if (payload?.bestStreak) {
            next.bestStreak = Math.max(next.bestStreak || 0, payload.bestStreak);
          }
        }

        const normalized = normalizeGamification(next);
        const newAchievementIds = (normalized.achievementIds || []).filter(
          (id) => !(base.achievementIds || []).includes(id)
        );
        if (newAchievementIds.length > 0) {
          const achievementDefs = getAchievementDefs();
          const unlockedAchievement = achievementDefs.find((a) => a.id === newAchievementIds[0]);
          const xpDelta = Math.max(0, Number(normalized.xp || 0) - Number(base.xp || 0));
          showAchievementToast(unlockedAchievement, xpDelta);
        }

        SecureStore.setItemAsync(storageKey, JSON.stringify(normalized)).catch(() => {});
        return normalized;
      });
    },
    [showAchievementToast, storageKey]
  );

  return {
    gamification,
    registrarEventoGamificacion,
    achievementToast,
    closeAchievementToast,
    achievementToastOpacity,
    achievementToastTranslateY,
  };
}
