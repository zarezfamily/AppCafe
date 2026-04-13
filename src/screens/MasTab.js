import { useState } from 'react';
import { Text, View } from 'react-native';
import AppDialogModal from '../components/AppDialogModal';
import MemberInfoModal from '../components/MemberInfoModal';
import mas from './masStyles';
import {
  AchievementsSection,
  BlogSection,
  LogoutSection,
  MemberStatusCard,
  ModerationSection,
  NewsletterSection,
  PremiumSection,
  QuickAccessSection,
  SettingsSection,
  SocialSection,
} from './masTabSections';

export default function MasTab({
  s,
  perfil,
  profileInitial,
  profileAlias,
  profileName,
  memberStatus,
  unlockedCount,
  achievementTotal,
  pendingAchievements,
  achievementProgress,
  setShowProfile,
  setActiveTab,
  premiumAccentDeep,
  unlockedAchievements,
  newsletterState,
  guardarNewsletter,
  newsletterLoading,
  newsletterSaving,
  newsletterHasEmail,
  newsletterEmail,
  onLogout,
  appVersion,
  premiumAccent,
  isPremium,
  premiumDaysLeft,
  onOpenPaywall,
  iconFaint,
  interactionFeedbackEnabled,
  interactionFeedbackMode,
  guardarFeedbackInteracciones,
  guardarModoFeedbackInteracciones,
}) {
  // Panel especial para admin/staff
  const isAdmin = perfil?.role === 'admin';
  const isStaff = perfil?.role === 'staff';
  const [showMemberInfo, setShowMemberInfo] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ title: '', description: '', actions: [] });

  const openDialog = (title, description, actions) => {
    setDialogConfig({ title, description, actions });
    setDialogVisible(true);
  };

  const abrirAjustesFeedback = () => {
    openDialog(
      'Feedback sensorial',
      `Estado: ${interactionFeedbackEnabled ? 'Activo' : 'Inactivo'}\nModo: ${interactionFeedbackMode === 'haptic' ? 'Táctil' : 'Sonido'}`,
      [
        {
          label: interactionFeedbackEnabled ? 'Desactivar' : 'Activar',
          onPress: () => guardarFeedbackInteracciones(!interactionFeedbackEnabled),
        },
        {
          label: 'Modo táctil',
          onPress: () => {
            if (!interactionFeedbackEnabled) guardarFeedbackInteracciones(true);
            guardarModoFeedbackInteracciones('haptic');
          },
        },
        {
          label: 'Modo sonido',
          onPress: () => {
            if (!interactionFeedbackEnabled) guardarFeedbackInteracciones(true);
            guardarModoFeedbackInteracciones('sound');
          },
        },
        { label: 'Cerrar' },
      ]
    );
  };

  return (
    <View style={{ paddingTop: 20 }}>
      <MemberInfoModal visible={showMemberInfo} onClose={() => setShowMemberInfo(false)} />
      <AppDialogModal
        visible={!!dialogVisible}
        onClose={() => setDialogVisible(false)}
        title={dialogConfig.title}
        description={dialogConfig.description}
        actions={dialogConfig.actions}
      />

      <View style={{ paddingHorizontal: 16 }}>
        <Text style={s.pageTitle}>Más</Text>

        <MemberStatusCard
          mas={mas}
          perfil={perfil}
          profileInitial={profileInitial}
          profileAlias={profileAlias}
          profileName={profileName}
          memberStatus={memberStatus}
          unlockedCount={unlockedCount}
          achievementTotal={achievementTotal}
          pendingAchievements={pendingAchievements}
          achievementProgress={achievementProgress}
          onLongPress={() => setShowMemberInfo(true)}
        />

        <PremiumSection
          mas={mas}
          isPremium={isPremium}
          premiumDaysLeft={premiumDaysLeft}
          onOpenPaywall={onOpenPaywall}
        />

        <BlogSection mas={mas} />

        <QuickAccessSection
          mas={mas}
          premiumAccentDeep={premiumAccentDeep}
          setShowProfile={setShowProfile}
          setActiveTab={setActiveTab}
        />

        <AchievementsSection
          mas={mas}
          unlockedAchievements={unlockedAchievements}
          pendingAchievements={pendingAchievements}
        />

        <NewsletterSection
          mas={mas}
          newsletterState={newsletterState}
          guardarNewsletter={guardarNewsletter}
          newsletterLoading={newsletterLoading}
          newsletterSaving={newsletterSaving}
          newsletterHasEmail={newsletterHasEmail}
          newsletterEmail={newsletterEmail}
        />

        <ModerationSection
          mas={mas}
          isAdmin={isAdmin}
          isStaff={isStaff}
          openDialog={openDialog}
          premiumAccent={premiumAccent}
          iconFaint={iconFaint}
        />

        <SettingsSection
          mas={mas}
          interactionFeedbackEnabled={interactionFeedbackEnabled}
          interactionFeedbackMode={interactionFeedbackMode}
          abrirAjustesFeedback={abrirAjustesFeedback}
          appVersion={appVersion}
          openDialog={openDialog}
          premiumAccent={premiumAccent}
          iconFaint={iconFaint}
        />

        <SocialSection mas={mas} premiumAccent={premiumAccent} />

        <LogoutSection mas={mas} onLogout={onLogout} openDialog={openDialog} />
      </View>
      <View style={{ height: 20 }} />
    </View>
  );
}
