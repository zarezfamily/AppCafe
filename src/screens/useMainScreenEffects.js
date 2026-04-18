import { useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { refreshIdToken } from '../services/authService';
import { MAIN_TABS } from './mainScreenTabs';

export default function useMainScreenEffects({
  brandCardAnim,
  brandProgressAnim,
  levelProgress,
  userId,
  restoreAuthTokenFromSecureStore,
  cargarCatas,
  activeTab,
  forumThreadsLength,
  forumLoading,
  cargarForo,
}) {
  useEffect(() => {
    Animated.timing(brandCardAnim, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [brandCardAnim]);

  useEffect(() => {
    Animated.timing(brandProgressAnim, {
      toValue: levelProgress,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [brandProgressAnim, levelProgress]);

  useEffect(() => {
    if (!userId) return;
    restoreAuthTokenFromSecureStore()
      .then(() => refreshIdToken().catch(() => null))
      .then(() => cargarCatas())
      .catch((e) => console.warn('[Auth Token] Error:', e));
  }, [cargarCatas, restoreAuthTokenFromSecureStore, userId]);

  useEffect(() => {
    if (activeTab === MAIN_TABS.COMMUNITY && forumThreadsLength === 0 && !forumLoading) {
      cargarForo();
    }
  }, [activeTab, cargarForo, forumLoading, forumThreadsLength]);
}
