import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Image, Switch, Text, TouchableOpacity, View } from 'react-native';

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
  iconFaint,
  interactionFeedbackEnabled,
  interactionFeedbackMode,
  guardarFeedbackInteracciones,
  guardarModoFeedbackInteracciones,
}) {
  return (
    <View style={{ paddingTop: 20 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={s.pageTitle}>Más</Text>

        <View style={mas.premiumCard}>
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
              <Text style={mas.newsletterSub}>recibe lanzamientos, cafes destacados y novedades de la comunidad.</Text>
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

          <Text style={mas.newsletterNote}>guardamos tu consentimiento en base de datos para poder incluirte despues en envios a todos los suscritos.</Text>

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

        <Text style={mas.blockTitle}>Aplicación</Text>
        <View style={mas.listCard}>
          <View style={mas.item}>
            <View style={mas.iconWrap}><Ionicons name="pulse-outline" size={22} color={premiumAccent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={mas.label}>Feedback sensorial</Text>
              <Text style={mas.sub}>Modo actual: {interactionFeedbackMode === 'haptic' ? 'táctil' : 'suave'} · estable</Text>
            </View>
            <Switch
              value={interactionFeedbackEnabled}
              onValueChange={guardarFeedbackInteracciones}
              trackColor={{ false: '#d8cbbf', true: '#6b4a37' }}
              thumbColor="#fffdf8"
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: interactionFeedbackMode === 'haptic' ? '#6b4a37' : '#e2d4c7',
                backgroundColor: interactionFeedbackMode === 'haptic' ? '#f2e6d9' : '#fffaf6',
              }}
              onPress={() => guardarModoFeedbackInteracciones('haptic')}
              disabled={!interactionFeedbackEnabled}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: interactionFeedbackMode === 'haptic' ? '#5d4030' : '#9a8a7d' }}>Táctil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: interactionFeedbackMode === 'sound' ? '#6b4a37' : '#e2d4c7',
                backgroundColor: interactionFeedbackMode === 'sound' ? '#f2e6d9' : '#fffaf6',
              }}
              onPress={() => guardarModoFeedbackInteracciones('sound')}
              disabled={!interactionFeedbackEnabled}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: interactionFeedbackMode === 'sound' ? '#5d4030' : '#9a8a7d' }}>Sonido</Text>
            </TouchableOpacity>
          </View>
          <MasItem
            icon="information-circle-outline"
            label="Versión"
            sub={`Etiove v${appVersion}`}
            onPress={() => Alert.alert('Etiove', `Versión ${appVersion}\n\nReact Native + Expo\nFirebase Firestore`)}
            mas={mas}
            premiumAccent={premiumAccent}
            iconFaint={iconFaint}
          />
        </View>

        <TouchableOpacity style={mas.logoutBtn} onPress={() => Alert.alert('Cerrar sesión', '¿Seguro?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Salir', style: 'destructive', onPress: onLogout }])}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={mas.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 20 }} />
    </View>
  );
}
