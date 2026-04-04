import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Switch, Text, TouchableOpacity, View } from 'react-native';
import AppDialogModal from '../components/AppDialogModal';
import MemberInfoModal from '../components/MemberInfoModal';
import PremiumBadge from './PremiumBadge';

function MasItem({ icon, label, sub, onPress, mas, premiumAccent, iconFaint }) {
  return (
    <TouchableOpacity style={mas.item} onPress={onPress} activeOpacity={0.7}>
      <View style={mas.iconWrap}><Ionicons name={icon} size={22} color={premiumAccent} /></View>
      <View style={{ flex: 1 }}>
        <Text style={mas.label}>{label}</Text>
        {sub && <Text style={mas.sub}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={iconFaint} />
    </TouchableOpacity>
  );
}

export default function MasTab({
  s,
  mas,
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
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        title={dialogConfig.title}
        description={dialogConfig.description}
        actions={dialogConfig.actions}
      />

      <View style={{ paddingHorizontal: 16 }}>
        <Text style={s.pageTitle}>Más</Text>

        <TouchableOpacity style={mas.premiumCard} activeOpacity={0.95} onLongPress={() => setShowMemberInfo(true)} delayLongPress={280}>
          <View style={mas.premiumGlow} />
          <View style={mas.premiumGlowTwo} />
          <Text style={mas.clubTag}>ETIOVE MEMBER STATUS</Text>
          <View style={mas.premiumTopRow}>
            <View style={mas.premiumIdentity}>
              {perfil.foto
                ? <Image source={{ uri: perfil.foto }} style={mas.premiumAvatar} />
                : <View style={mas.premiumAvatarFallback}><Text style={mas.premiumAvatarText}>{profileInitial}</Text></View>
              }
              <View style={{ flex: 1 }}>
                <Text style={mas.premiumAlias}>@{profileAlias.replace(/^@+/, '')}</Text>
                <Text style={mas.premiumName} numberOfLines={1}>{profileName}</Text>
              </View>
            </View>
            <View style={mas.premiumLevelBadge}>
              <Text style={mas.premiumLevelText}>{memberStatus.icon} {memberStatus.label}</Text>
            </View>
          </View>

          <View style={mas.premiumStatsRow}>
            <View style={mas.premiumStatCard}>
              <Text style={mas.premiumStatValue}>{unlockedCount}</Text>
              <Text style={mas.premiumStatLabel}>LOGROS</Text>
            </View>
            <View style={mas.premiumStatCard}>
              <Text style={mas.premiumStatValue}>{achievementTotal}</Text>
              <Text style={mas.premiumStatLabel}>OBJETIVOS</Text>
            </View>
            <View style={mas.premiumStatCard}>
              <Text style={mas.premiumStatValue}>{pendingAchievements.length}</Text>
              <Text style={mas.premiumStatLabel}>PENDIENTES</Text>
            </View>
          </View>

          <View style={mas.memberProgressRow}>
            <Text style={mas.memberProgressText}>{unlockedCount}/{achievementTotal} LOGROS</Text>
            <Text style={mas.memberProgressText}>{pendingAchievements[0] ? `SIGUIENTE: ${pendingAchievements[0].title.toUpperCase()}` : 'STATUS COMPLETO'}</Text>
          </View>
          <View style={mas.memberProgressBar}><View style={[mas.memberProgressFill, { width: `${achievementProgress * 100}%` }]} /></View>
        </TouchableOpacity>

        <Text style={mas.blockTitle}>ETIOVE PREMIUM</Text>
        <View style={mas.achievementsCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              {isPremium ? <PremiumBadge size="lg" /> : <Text style={mas.achievementTitle}>Desbloquea Etiove Premium</Text>}
              <Text style={[mas.achievementDesc, { marginTop: 8 }]}>Diario ilimitado, estadísticas avanzadas, PDF y ventajas exclusivas en la comunidad.</Text>
              {isPremium ? (
                <Text style={[mas.quickSub, { marginTop: 8 }]}>
                  {premiumDaysLeft == null ? 'Plan de por vida activo' : `${premiumDaysLeft} días restantes en tu plan`}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={[mas.newsletterBtn, { paddingHorizontal: 18, paddingVertical: 12, minWidth: 126 }, isPremium && mas.newsletterBtnDisabled]}
              onPress={onOpenPaywall}
              activeOpacity={0.85}
            >
              <Text style={mas.newsletterBtnText}>{isPremium ? 'VER PLAN' : 'HAZTE PREMIUM'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={mas.blockTitle}>Accesos</Text>
        <View style={mas.quickGrid}>
          <TouchableOpacity style={[mas.quickCard, mas.quickCardDark]} onPress={() => setShowProfile(true)}>
            <Ionicons name="person-circle-outline" size={20} color="#f8e7d5" />
            <Text style={mas.quickTitleDark}>Mi Perfil</Text>
            <Text style={mas.quickSubDark}>Editar datos y foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[mas.quickCard, mas.quickCardSoft]} onPress={() => setActiveTab('Mis Cafés')}>
            <Ionicons name="heart-outline" size={20} color={premiumAccentDeep} />
            <Text style={mas.quickTitle}>Mis Cafés</Text>
            <Text style={mas.quickSub}>Tu colección personal</Text>
          </TouchableOpacity>
        </View>

        <Text style={mas.blockTitle}>Logros conseguidos</Text>
        <View style={mas.achievementsCard}>
          {unlockedAchievements.length > 0 ? unlockedAchievements.slice(0, 4).map((a) => (
            <View key={a.id} style={mas.achievementOn}>
              <Text style={mas.achievementIcon}>{a.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={mas.achievementTitle}>{a.title}</Text>
                <Text style={mas.achievementDesc}>{a.desc}</Text>
              </View>
            </View>
          )) : <Text style={mas.emptyAchText}>Aún no has desbloqueado logros. Empieza a catar y guardar cafés.</Text>}
        </View>

        <Text style={mas.blockTitle}>Siguiente por conseguir</Text>
        <View style={mas.achievementsCard}>
          {pendingAchievements.slice(0, 3).map((a) => (
            <View key={a.id} style={mas.achievementOff}>
              <Text style={mas.achievementIconOff}>🔒</Text>
              <View style={{ flex: 1 }}>
                <Text style={mas.achievementTitleOff}>{a.title}</Text>
                <Text style={mas.achievementDesc}>{a.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={mas.blockTitle}>NEWSLETTER</Text>
        <View style={mas.newsletterCard}>
          <View style={mas.newsletterTopRow}>
            <View style={mas.newsletterTitleWrap}>
              <Text style={mas.newsletterTitle}>BE ETIOVE BY EMAIL</Text>
              <Text style={mas.newsletterSub}>Recibe lanzamientos, cafes y novedades</Text>
            </View>
            <Switch
              value={newsletterState.subscribed}
              onValueChange={guardarNewsletter}
              disabled={newsletterLoading || newsletterSaving || !newsletterHasEmail}
              trackColor={{ false: '#d8cbbf', true: '#6b4a37' }}
              thumbColor="#fffdf8"
            />
          </View>

          <View style={mas.newsletterMetaRow}>
            <View style={[mas.newsletterStatusPill, newsletterState.subscribed ? mas.newsletterStatusOn : mas.newsletterStatusOff]}>
              <Text style={[mas.newsletterStatusText, newsletterState.subscribed ? mas.newsletterStatusTextOn : mas.newsletterStatusTextOff]}>
                {newsletterLoading ? 'CARGANDO' : newsletterState.subscribed ? 'SUSCRIPCION ACTIVA' : 'NO SUSCRITO'}
              </Text>
            </View>
            <Text style={mas.newsletterEmail}>{newsletterHasEmail ? newsletterEmail.toUpperCase() : 'ANADE UN EMAIL EN TU PERFIL PARA ACTIVAR LA NEWSLETTER.'}</Text>
          </View>

          <Text style={mas.newsletterNote}>Guardamos tus consentimientos para que seas un ETIOVER</Text>

          <TouchableOpacity
            style={[mas.newsletterBtn, (!newsletterHasEmail || newsletterSaving) && mas.newsletterBtnDisabled]}
            onPress={() => guardarNewsletter(!newsletterState.subscribed)}
            disabled={!newsletterHasEmail || newsletterSaving}
          >
            {newsletterSaving
              ? <ActivityIndicator color="#fff" />
              : <Text style={mas.newsletterBtnText}>{newsletterState.subscribed ? 'DARME DE BAJA' : 'SUSCRIBIRME AHORA'}</Text>
            }
          </TouchableOpacity>
        </View>

        {(isAdmin || isStaff) && (
          <>
            <Text style={mas.blockTitle}>Panel de Moderación</Text>
            <View style={mas.listCard}>
              <MasItem
                icon="shield-checkmark-outline"
                label={isAdmin ? 'Panel de administración' : 'Panel de staff'}
                sub={isAdmin ? 'Gestión total del sistema' : 'Herramientas de moderación'}
                onPress={() => setActiveTab('PanelAdmin')}
                mas={mas}
                premiumAccent={premiumAccent}
                iconFaint={iconFaint}
              />
            </View>
          </>
        )}
        <Text style={mas.blockTitle}>Ajustes</Text>
        <View style={mas.listCard}>
          <MasItem
            icon="pulse-outline"
            label="Feedback sensorial"
            sub={`Estado: ${interactionFeedbackEnabled ? 'Activo' : 'Inactivo'} · Modo: ${interactionFeedbackMode === 'haptic' ? 'Táctil' : 'Sonido'}`}
            onPress={abrirAjustesFeedback}
            mas={mas}
            premiumAccent={premiumAccent}
            iconFaint={iconFaint}
          />
          <MasItem
            icon="information-circle-outline"
            label="Versión"
            sub={`Etiove v${appVersion}`}
            onPress={() => openDialog('Etiove', `Versión ${appVersion}\n\nReact Native + Expo\nFirebase Firestore`, [{ label: 'Cerrar' }])}
            mas={mas}
            premiumAccent={premiumAccent}
            iconFaint={iconFaint}
          />
        </View>

        {/* ─── DONDE ESTAMOS ─── */}
        <Text style={mas.blockTitle}>Donde Estamos</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingVertical: 20, gap: 12 }}>
          <TouchableOpacity
            style={{ flexDirection: 'column', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#faf8f5', borderWidth: 1, borderColor: '#e8dcc8', flex: 1 }}
            onPress={() => Linking.openURL('https://instagram.com/etiove')}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-instagram" size={32} color="#E4405F" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1f140f', textAlign: 'center' }}>Instagram</Text>
            <Text style={{ fontSize: 10, color: '#8b7355', textAlign: 'center' }}>@etiove</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'column', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#faf8f5', borderWidth: 1, borderColor: '#e8dcc8', flex: 1 }}
            onPress={() => Linking.openURL('https://twitter.com/etiove')}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-x" size={32} color="#1DA1F2" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1f140f', textAlign: 'center' }}>X</Text>
            <Text style={{ fontSize: 10, color: '#8b7355', textAlign: 'center' }}>@etiove</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'column', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#faf8f5', borderWidth: 1, borderColor: '#e8dcc8', flex: 1 }}
            onPress={() => Linking.openURL('https://tiktok.com/@etiove')}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-tiktok" size={32} color="#000000" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1f140f', textAlign: 'center' }}>TikTok</Text>
            <Text style={{ fontSize: 10, color: '#8b7355', textAlign: 'center' }}>@etiove</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'column', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#faf8f5', borderWidth: 1, borderColor: '#e8dcc8', flex: 1 }}
            onPress={() => Linking.openURL('https://etiove.com/comunidad.html')}
            activeOpacity={0.7}
          >
            <Ionicons name="globe-outline" size={32} color="#5B7FA6" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1f140f', textAlign: 'center' }}>Comunidad web</Text>
            <Text style={{ fontSize: 10, color: '#8b7355', textAlign: 'center' }}>etiove.com/comunidad</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={mas.logoutBtn}
          onPress={() => openDialog('Cerrar sesión', '¿Seguro que quieres salir de tu cuenta?', [
            { label: 'Cancelar' },
            { label: 'Salir', variant: 'danger', onPress: onLogout },
          ])}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={mas.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 20 }} />
    </View>
  );
}
