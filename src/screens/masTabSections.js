import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Image,
  Linking,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MAIN_TABS } from './mainScreenTabs';
import PremiumBadge from './PremiumBadge';

export function MasItem({ icon, label, sub, onPress, mas, premiumAccent, iconFaint }) {
  return (
    <TouchableOpacity style={mas.item} onPress={onPress} activeOpacity={0.7}>
      <View style={mas.iconWrap}>
        <Ionicons name={icon} size={22} color={premiumAccent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={mas.label}>{label}</Text>
        {sub && <Text style={mas.sub}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={iconFaint} />
    </TouchableOpacity>
  );
}

export function SocialIconButton({ icon, onPress, premiumAccent }) {
  return (
    <TouchableOpacity
      style={{
        width: 58,
        height: 58,
        borderRadius: 16,
        backgroundColor: '#faf8f5',
        borderWidth: 1,
        borderColor: '#e8dcc8',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={icon} size={28} color={premiumAccent} />
    </TouchableOpacity>
  );
}

export function MemberStatusCard({
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
  onLongPress,
  onEditProfile,
}) {
  return (
    <TouchableOpacity
      style={mas.premiumCard}
      activeOpacity={0.95}
      onLongPress={onLongPress}
      delayLongPress={280}
    >
      <View style={mas.premiumGlow} />
      <View style={mas.premiumGlowTwo} />
      <Text style={mas.clubTag}>ETIOVE MEMBER STATUS</Text>
      <View style={mas.premiumTopRow}>
        <View style={mas.premiumIdentity}>
          {perfil.foto ? (
            <Image source={{ uri: perfil.foto }} style={mas.premiumAvatar} />
          ) : (
            <View style={mas.premiumAvatarFallback}>
              <Text style={mas.premiumAvatarText}>{profileInitial}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={mas.premiumAlias}>@{profileAlias.replace(/^@+/, '')}</Text>
            <Text style={mas.premiumName} numberOfLines={1}>
              {profileName}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onEditProfile && (
            <TouchableOpacity
              onPress={onEditProfile}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(255,248,241,0.12)',
                borderWidth: 1,
                borderColor: 'rgba(250,229,206,0.22)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil" size={14} color="#fff4ea" />
            </TouchableOpacity>
          )}
          <View style={mas.premiumLevelBadge}>
            <Text style={mas.premiumLevelText}>
              {memberStatus.icon} {memberStatus.label}
            </Text>
          </View>
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
        <Text style={mas.memberProgressText}>
          {unlockedCount}/{achievementTotal} LOGROS
        </Text>
        <Text style={mas.memberProgressText}>
          {pendingAchievements[0]
            ? `SIGUIENTE: ${pendingAchievements[0].title.toUpperCase()}`
            : 'STATUS COMPLETO'}
        </Text>
      </View>
      <View style={mas.memberProgressBar}>
        <View style={[mas.memberProgressFill, { width: `${achievementProgress * 100}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

export function PremiumSection({ mas, isPremium, premiumDaysLeft, onOpenPaywall }) {
  return (
    <>
      <Text style={mas.blockTitle}>ETIOVE PREMIUM</Text>
      <View style={mas.achievementsCard}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            {isPremium ? (
              <PremiumBadge size="lg" />
            ) : (
              <Text style={mas.achievementTitle}>Desbloquea Etiove Premium</Text>
            )}
            <Text style={[mas.achievementDesc, { marginTop: 8 }]}>
              Diario ilimitado, estadísticas avanzadas, PDF y ventajas exclusivas en la comunidad.
            </Text>
            {isPremium ? (
              <Text style={[mas.quickSub, { marginTop: 8 }]}>
                {premiumDaysLeft == null
                  ? 'Plan de por vida activo'
                  : `${premiumDaysLeft} días restantes en tu plan`}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={[
              mas.newsletterBtn,
              { paddingHorizontal: 18, paddingVertical: 12, minWidth: 126 },
              isPremium && mas.newsletterBtnDisabled,
            ]}
            onPress={onOpenPaywall}
            activeOpacity={0.85}
          >
            <Text style={mas.newsletterBtnText}>{isPremium ? 'VER PLAN' : 'HAZTE PREMIUM'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

export function BlogSection({ mas }) {
  return (
    <>
      <Text style={mas.blockTitle}>Blog</Text>
      <TouchableOpacity
        style={mas.blogCard}
        activeOpacity={0.9}
        onPress={() => Linking.openURL('https://etiove.com/blog/')}
      >
        <View style={mas.blogCardGlow} />
        <Text style={mas.blogKicker}>ETIOVE JOURNAL</Text>
        <Text style={mas.blogTitle}>Lee el blog de Etiove desde la app</Text>
        <Text style={mas.blogDesc}>
          Guías de molienda, métodos, cafés recomendados y contenido editorial para seguir
          descubriendo café de especialidad.
        </Text>
        <View style={mas.blogActionRow}>
          <View style={mas.blogActionPill}>
            <Ionicons name="newspaper-outline" size={16} color="#fff5eb" />
            <Text style={mas.blogActionText}>Abrir blog</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#8f5e3b" />
        </View>
      </TouchableOpacity>
    </>
  );
}

export function QuickAccessSection({ mas, premiumAccentDeep, setShowProfile, setActiveTab }) {
  return (
    <>
      <Text style={mas.blockTitle}>Accesos</Text>
      <View style={mas.quickGrid}>
        <TouchableOpacity
          style={[mas.quickCard, mas.quickCardDark]}
          onPress={() => setShowProfile(true)}
        >
          <Ionicons name="person-circle-outline" size={20} color="#f8e7d5" />
          <Text style={mas.quickTitleDark}>Mi Perfil</Text>
          <Text style={mas.quickSubDark}>Editar datos y foto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[mas.quickCard, mas.quickCardSoft]}
          onPress={() => setActiveTab(MAIN_TABS.NOTEBOOK)}
        >
          <Ionicons name="heart-outline" size={20} color={premiumAccentDeep} />
          <Text style={mas.quickTitle}>Mis Cafés</Text>
          <Text style={mas.quickSub}>Tu colección personal</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

export function AchievementsSection({ mas, unlockedAchievements, pendingAchievements }) {
  return (
    <>
      <Text style={mas.blockTitle}>Logros conseguidos</Text>
      <View style={mas.achievementsCard}>
        {unlockedAchievements.length > 0 ? (
          unlockedAchievements.slice(0, 4).map((a) => (
            <View key={a.id} style={mas.achievementOn}>
              <Text style={mas.achievementIcon}>{a.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={mas.achievementTitle}>{a.title}</Text>
                <Text style={mas.achievementDesc}>{a.desc}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={mas.emptyAchText}>
            Aún no has desbloqueado logros. Empieza a catar y guardar cafés.
          </Text>
        )}
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
    </>
  );
}

export function NewsletterSection({
  mas,
  newsletterState,
  guardarNewsletter,
  newsletterLoading,
  newsletterSaving,
  newsletterHasEmail,
  newsletterEmail,
}) {
  return (
    <>
      <Text style={mas.blockTitle}>NEWSLETTER</Text>
      <View style={mas.newsletterCard}>
        <View style={mas.newsletterTopRow}>
          <View style={mas.newsletterTitleWrap}>
            <Text style={mas.newsletterTitle}>BE ETIOVE BY EMAIL</Text>
            <Text style={mas.newsletterSub}>Recibe lanzamientos, cafés y novedades</Text>
          </View>
          <Switch
            value={!!newsletterState?.subscribed}
            onValueChange={guardarNewsletter}
            disabled={!!newsletterLoading || !!newsletterSaving || !newsletterHasEmail}
            trackColor={{ false: '#d8cbbf', true: '#6b4a37' }}
            thumbColor="#fffdf8"
          />
        </View>

        <View style={mas.newsletterMetaRow}>
          <View
            style={[
              mas.newsletterStatusPill,
              newsletterState.subscribed ? mas.newsletterStatusOn : mas.newsletterStatusOff,
            ]}
          >
            <Text
              style={[
                mas.newsletterStatusText,
                newsletterState.subscribed
                  ? mas.newsletterStatusTextOn
                  : mas.newsletterStatusTextOff,
              ]}
            >
              {newsletterLoading
                ? 'CARGANDO'
                : newsletterState.subscribed
                  ? 'SUSCRIPCIÓN ACTIVA'
                  : 'NO SUSCRITO'}
            </Text>
          </View>
          <Text style={mas.newsletterEmail}>
            {newsletterHasEmail
              ? newsletterEmail.toUpperCase()
              : 'AÑADE UN EMAIL EN TU PERFIL PARA ACTIVAR LA NEWSLETTER.'}
          </Text>
        </View>

        <Text style={mas.newsletterNote}>
          Guardamos tus consentimientos para que seas un ETIOVER
        </Text>

        <TouchableOpacity
          style={[
            mas.newsletterBtn,
            (!newsletterHasEmail || newsletterSaving) && mas.newsletterBtnDisabled,
          ]}
          onPress={() => guardarNewsletter(!newsletterState.subscribed)}
          disabled={!newsletterHasEmail || !!newsletterSaving}
        >
          {newsletterSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={mas.newsletterBtnText}>
              {newsletterState.subscribed ? 'DARME DE BAJA' : 'SUSCRIBIRME AHORA'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

export function ModerationSection({
  mas,
  isAdmin,
  isStaff,
  openDialog,
  onOpenAdminPanel,
  premiumAccent,
  iconFaint,
}) {
  if (!isAdmin && !isStaff) return null;

  const title = isAdmin ? 'Panel de administración' : 'Panel de staff';
  const subtitle = isAdmin
    ? 'Revisa cafés pendientes, aprueba specialty, marca no specialty y rechaza contenido inválido.'
    : 'Accede a herramientas internas de moderación y revisión.';

  return (
    <>
      <Text style={mas.blockTitle}>Panel interno</Text>

      <View
        style={[
          mas.achievementsCard,
          {
            padding: 16,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#eadbce',
            backgroundColor: '#fffaf5',
            marginBottom: 14,
          },
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '900',
                color: '#8f5e3b',
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              ETIOVE ADMIN
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '900',
                color: '#24160f',
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 13,
                lineHeight: 19,
                color: '#6f5a4b',
              }}
            >
              {subtitle}
            </Text>
          </View>

          <View
            style={{
              minWidth: 84,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 16,
              backgroundColor: '#24160f',
            }}
          >
            <Text style={{ color: '#fff7ef', fontSize: 11, fontWeight: '900' }}>
              {isAdmin ? 'ADMIN' : 'STAFF'}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <View
            style={{
              borderRadius: 999,
              backgroundColor: '#f3e7d9',
              borderWidth: 1,
              borderColor: '#eadbce',
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#8f5e3b' }}>
              Revisar pendientes
            </Text>
          </View>
          <View
            style={{
              borderRadius: 999,
              backgroundColor: '#f3e7d9',
              borderWidth: 1,
              borderColor: '#eadbce',
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#8f5e3b' }}>
              Aprobar specialty
            </Text>
          </View>
          <View
            style={{
              borderRadius: 999,
              backgroundColor: '#f3e7d9',
              borderWidth: 1,
              borderColor: '#eadbce',
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#8f5e3b' }}>
              Marcar no specialty
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            if (isAdmin && onOpenAdminPanel) {
              onOpenAdminPanel();
              return;
            }
            openDialog(
              title,
              'Las herramientas de moderación estarán disponibles en este módulo.',
              [{ label: 'Cerrar' }]
            );
          }}
          style={[
            mas.newsletterBtn,
            {
              alignSelf: 'flex-start',
              paddingHorizontal: 18,
              paddingVertical: 12,
              borderRadius: 999,
            },
          ]}
        >
          <Text style={mas.newsletterBtnText}>
            {isAdmin ? 'ABRIR PANEL ADMIN' : 'ABRIR MODERACIÓN'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

export function SettingsSection({
  mas,
  interactionFeedbackEnabled,
  interactionFeedbackMode,
  abrirAjustesFeedback,
  appVersion,
  openDialog,
  premiumAccent,
  iconFaint,
}) {
  return (
    <>
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
          onPress={() =>
            openDialog(
              'Etiove',
              `Versión ${appVersion}\n\nReact Native + Expo\nFirebase Firestore`,
              [{ label: 'Cerrar' }]
            )
          }
          mas={mas}
          premiumAccent={premiumAccent}
          iconFaint={iconFaint}
        />
      </View>
    </>
  );
}

export function SocialSection({ mas, premiumAccent }) {
  return (
    <>
      <Text style={mas.blockTitle}>Dónde estamos</Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 20,
          gap: 12,
        }}
      >
        <SocialIconButton
          icon="logo-instagram"
          premiumAccent={premiumAccent}
          onPress={() => Linking.openURL('https://instagram.com/etiove_cafe')}
        />
        <SocialIconButton
          icon="logo-x"
          premiumAccent={premiumAccent}
          onPress={() => Linking.openURL('https://x.com/etiove_cafe')}
        />
        <SocialIconButton
          icon="logo-tiktok"
          premiumAccent={premiumAccent}
          onPress={() => Linking.openURL('https://tiktok.com/@etiove')}
        />
        <SocialIconButton
          icon="globe-outline"
          premiumAccent={premiumAccent}
          onPress={() => Linking.openURL('https://etiove.com')}
        />
      </View>
    </>
  );
}

export function LogoutSection({ mas, onLogout, openDialog }) {
  return (
    <TouchableOpacity
      style={mas.logoutBtn}
      onPress={() =>
        openDialog('Cerrar sesión', '¿Seguro que quieres salir de tu cuenta?', [
          { label: 'Cancelar' },
          { label: 'Salir', variant: 'danger', onPress: onLogout },
        ])
      }
    >
      <Ionicons name="log-out-outline" size={20} color="#fff" />
      <Text style={mas.logoutText}>Cerrar sesión</Text>
    </TouchableOpacity>
  );
}
