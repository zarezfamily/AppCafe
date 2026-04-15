import { useEffect } from 'react';

import { LEVELS, getAchievementDefs, getLevelFromXp } from '../core/gamification';
import { getFlagForPais } from '../core/paises';

export default function useMainScreenProfileSummary({
  user,
  perfil,
  gamification,
  brandCardAnim,
  brandProgressAnim,
  setDocument,
}) {
  const currentLevel = getLevelFromXp(gamification.xp);
  const nextLevel = LEVELS.find((level) => level.minXp > gamification.xp) || null;
  const xpInLevel = nextLevel ? Math.max(0, gamification.xp - currentLevel.minXp) : gamification.xp;
  const xpRange = nextLevel
    ? Math.max(1, nextLevel.minXp - currentLevel.minXp)
    : Math.max(1, gamification.xp);
  const levelProgress = Math.min(1, xpInLevel / xpRange);

  const achievementDefs = getAchievementDefs();
  const unlockedAchievements = achievementDefs.filter((achievement) =>
    gamification.achievementIds.includes(achievement.id)
  );
  const pendingAchievements = achievementDefs.filter(
    (achievement) => !gamification.achievementIds.includes(achievement.id)
  );
  const achievementTotal = achievementDefs.length;
  const unlockedCount = unlockedAchievements.length;
  const achievementProgress = achievementTotal > 0 ? unlockedCount / achievementTotal : 0;

  const memberStatus =
    unlockedCount >= achievementTotal
      ? { icon: '👑', label: 'LEYENDA ETIOVE' }
      : unlockedCount >= Math.max(1, Math.ceil(achievementTotal * 0.75))
        ? { icon: '🏆', label: 'MAESTRO DE ORIGEN' }
        : unlockedCount >= Math.max(1, Math.ceil(achievementTotal * 0.4))
          ? { icon: '⭐', label: 'EXPLORADOR DE FINCA' }
          : { icon: '🌱', label: 'APRENDIZ DE TUESTE' };

  const brandCardTranslateY = brandCardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });
  const brandCardScale = brandCardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });
  const brandProgressWidth = brandProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const profileAlias = (
    perfil.alias ||
    perfil.nombre ||
    user?.email?.split('@')[0] ||
    'Catador'
  ).trim();
  const profileName =
    `${perfil.nombre || ''} ${perfil.apellidos || ''}`.trim() || user?.email || 'Miembro Etiove';
  const profileInitial = (profileAlias || '?')[0].toUpperCase();
  const forumAuthorName = (
    perfil.alias ||
    perfil.nombre ||
    user?.email?.split('@')[0] ||
    'Catador'
  ).trim();
  const newsletterEmail = (perfil.email || user?.email || '').trim();
  const newsletterHasEmail = !!newsletterEmail;
  const voteWeight = currentLevel.name === 'Maestro' ? 2 : 1;
  const flag = getFlagForPais(perfil.pais || 'España');

  const achievementCsv = (gamification.achievementIds || []).join(',');
  const countriesRatedCsv = (gamification.countriesRated || []).join(',');
  const specialOriginsCsv = (gamification.specialOriginsTasted || []).join(',');

  useEffect(() => {
    if (!user?.uid) return;

    const payload = {
      uid: user.uid,
      displayName: profileAlias,
      achievementCsv,
      achievementCount: unlockedCount,
      countriesRatedCsv,
      specialOriginsCsv,
      xp: gamification.xp,
      updatedAt: new Date().toISOString(),
    };

    const remoteAvatar = String(perfil?.foto || '').startsWith('http')
      ? String(perfil.foto).trim()
      : '';
    if (remoteAvatar) payload.avatarUrl = remoteAvatar;

    setDocument('user_profiles', user.uid, payload).catch(() => {});
  }, [
    achievementCsv,
    countriesRatedCsv,
    gamification.xp,
    perfil?.foto,
    profileAlias,
    setDocument,
    specialOriginsCsv,
    unlockedCount,
    user?.uid,
  ]);

  return {
    currentLevel,
    nextLevel,
    levelProgress,
    unlockedAchievements,
    pendingAchievements,
    achievementTotal,
    unlockedCount,
    achievementProgress,
    memberStatus,
    brandCardTranslateY,
    brandCardScale,
    brandProgressWidth,
    profileAlias,
    profileName,
    profileInitial,
    forumAuthorName,
    newsletterEmail,
    newsletterHasEmail,
    voteWeight,
    flag,
  };
}
