import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import HorizontalCardRow from '../components/HorizontalCardRow';
import SectionHeaderNav from '../components/SectionHeaderNav';
import { MAIN_TABS } from './mainScreenTabs';

export const FEATURED_BLOG_POSTS = [
  {
    title: 'Guía de molienda por método',
    desc: 'Ajusta V60, espresso, AeroPress y prensa francesa sin perderte entre moliendas demasiado finas o gruesas.',
    url: 'https://etiove.com/blog/guia-de-molienda-por-metodo.html',
    icon: 'options-outline',
  },
  {
    title: 'Cold brew en casa',
    desc: 'Proporciones, tiempos y trucos para preparar cold brew limpio, dulce y fácil de repetir.',
    url: 'https://etiove.com/blog/cold-brew-en-casa-guia-completa.html',
    icon: 'snow-outline',
  },
];

function QuickFilterChip({ label, onPress, accentColor, icon }) {
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.quickChip}>
      {!!icon && <Ionicons name={icon} size={13} color={accentColor} />}
      <Text style={[styles.quickChipText, { color: accentColor }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ActionCard({ title, desc, icon, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.actionCard}>
      <View style={styles.actionIconWrap}>
        <Ionicons name={icon} size={20} color="#8f5e3b" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#8f5e3b" />
    </TouchableOpacity>
  );
}

function HomeSectionCard({ children }) {
  return <View style={styles.homeSectionCard}>{children}</View>;
}

function SectionPill({ label }) {
  return (
    <View style={styles.sectionPill}>
      <Text style={styles.sectionPillText}>{label}</Text>
    </View>
  );
}

function SectionIntro({ title, subtitle, pills = [] }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.sectionIntroTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.sectionIntroSubtitle}>{subtitle}</Text>}
      {!!pills.length && (
        <View style={styles.sectionPillRow}>
          {pills.map((pill) => (
            <SectionPill key={pill} label={pill} />
          ))}
        </View>
      )}
    </View>
  );
}

export function InicioTopBar({
  s,
  perfil,
  setShowProfile,
  profileInitial,
  profileAlias,
  profileName,
  currentLevel,
  gamification,
  nextLevel,
  onLongPressMemberCard,
}) {
  return (
    <View style={s.topBar}>
      <View style={s.homeBrandWrap}>
        <Text style={s.homeWordmark}>ETIOVE</Text>
        <View style={s.homeLoverRow}>
          <Text style={s.homeLoverText}>SPECIALTY</Text>
          <View style={s.homeMiniSealOuter}>
            <View style={s.homeMiniSealMiddle}>
              <View style={s.homeMiniSealInner}>
                <Text style={s.homeMiniSealText}>E</Text>
              </View>
            </View>
          </View>
          <Text style={s.homeLoverText}>COFFEE</Text>
        </View>
        <Text style={s.wordmarkTag}>Dónde nació el café</Text>
      </View>

      <TouchableOpacity
        style={s.locationPill}
        onPress={() => setShowProfile(true)}
        onLongPress={onLongPressMemberCard}
        delayLongPress={280}
      >
        <View style={s.brandDecorOne} />
        <View style={s.brandDecorTwo} />
        <View style={s.brandTopRule} />

        <View style={s.brandPillContent}>
          <Text style={s.brandEyebrow}>Member Roast Card</Text>

          <View style={s.brandMemberRow}>
            <View style={s.brandMemberIdentity}>
              {perfil.foto ? (
                <Image source={{ uri: perfil.foto }} style={s.brandMemberAvatar} />
              ) : (
                <View style={s.brandMemberAvatarFallback}>
                  <Text style={s.brandMemberAvatarText}>{profileInitial}</Text>
                </View>
              )}

              <View style={s.brandMemberCopy}>
                <Text style={s.brandAlias}>@{profileAlias.replace(/^@+/, '')}</Text>
                <Text style={s.brandName} numberOfLines={1}>
                  {profileName}
                </Text>
              </View>
            </View>

            <View style={s.brandLevelBadge}>
              <Text style={s.brandLevelText}>
                {currentLevel.icon} {currentLevel.name}
              </Text>
            </View>
          </View>

          <View style={s.brandRow}>
            <View style={s.brandTitleWrap}>
              <Text style={s.brandXpText}>{gamification.xp} XP acumulados</Text>
            </View>
          </View>

          <View style={s.brandMetaRow}>
            <Text style={s.brandMetaText}>
              {nextLevel ? `Próximo nivel: ${nextLevel.name}` : 'Nivel máximo alcanzado'}
            </Text>
            {nextLevel && <Text style={s.brandMetaText}>{nextLevel.minXp} XP</Text>}
          </View>

          <View style={s.brandStatsRow}>
            <View style={s.brandStatCard}>
              <Text style={s.brandStatValue}>{gamification.votesCount}</Text>
              <Text style={s.brandStatLabel}>Votos</Text>
            </View>
            <View style={s.brandStatCard}>
              <Text style={s.brandStatValue}>{gamification.photosCount}</Text>
              <Text style={s.brandStatLabel}>Fotos</Text>
            </View>
            <View style={s.brandStatCard}>
              <Text style={s.brandStatValue}>{gamification.reviewsCount}</Text>
              <Text style={s.brandStatLabel}>Reseñas</Text>
            </View>
            <View style={s.brandStatCard}>
              <Text style={s.brandStatValue}>{gamification.favoritesMarkedCount}</Text>
              <Text style={s.brandStatLabel}>Favoritos</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function SearchResultsSection({
  s,
  allCafes,
  busqueda,
  filtrar,
  CardVertical,
  setCafeDetalle,
  favs,
  toggleFav,
}) {
  const resultados = filtrar(allCafes, busqueda);

  const handlePress = (item) => {
    const index = resultados.findIndex((c) => c.id === item.id);
    setCafeDetalle({ cafes: resultados, cafeIndex: index });
  };
  return (
    <HomeSectionCard>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Resultados ({resultados.length})</Text>
      </View>
      <Text style={[s.sectionSub, { paddingHorizontal: 0 }]}>
        Cafés encontrados en la comunidad según tu búsqueda
      </Text>
      <View style={{ marginTop: 10 }}>
        {resultados.map((item) => (
          <View key={item.id} style={{ marginBottom: 10 }}>
            <CardVertical
              item={item}
              onDelete={() => {}}
              onPress={() => handlePress(item)}
              favs={favs}
              onToggleFav={toggleFav}
            />
          </View>
        ))}
      </View>
    </HomeSectionCard>
  );
}

export function SpecialtyForYouSection({
  s,
  cafes,
  setCafeDetalle,
  favs,
  toggleFav,
  CardHorizontal,
}) {
  if (!cafes?.length) return null;

  const sorted = [...cafes].sort(
    (a, b) =>
      Number(b?.rankingScore || b?.puntuacion || 0) - Number(a?.rankingScore || a?.puntuacion || 0)
  );
  const top = sorted.slice(0, 25);
  const items = top;
  const handlePress = (item) => {
    const index = top.findIndex((c) => c.id === item.id);
    setCafeDetalle({ cafes: top, cafeIndex: index });
  };
  return (
    <HomeSectionCard>
      <SectionHeaderNav s={s} title="Especialidad para ti" marginTop={0} hideAction />
      <Text style={[s.sectionSub, { paddingHorizontal: 0 }]}>
        Cafés curados y bien valorados para descubrir algo especial sin perderte entre demasiadas
        opciones
      </Text>
      <HorizontalCardRow
        s={s}
        loading={false}
        items={items}
        renderItem={(item, index) => (
          <CardHorizontal
            key={item.id}
            item={item}
            badge={`#${index + 1} Especialidad`}
            onPress={() => handlePress(item)}
            favs={favs}
            onToggleFav={toggleFav}
          />
        )}
      />
    </HomeSectionCard>
  );
}

export function PersonalizedForYouSection({
  s,
  title = 'Para ti',
  subtitle,
  cafes,
  setCafeDetalle,
  favs,
  toggleFav,
  CardHorizontal,
}) {
  if (!cafes?.length) return null;

  const items = cafes.slice(0, 8);
  const handlePress = (item) => {
    const index = items.findIndex((c) => c.id === item.id);
    setCafeDetalle({ cafes: items, cafeIndex: index });
  };

  return (
    <HomeSectionCard>
      <SectionHeaderNav s={s} title={title} marginTop={0} hideAction />
      <Text style={[s.sectionSub, { paddingHorizontal: 0 }]}>
        {subtitle || 'Cafes que encajan con lo que ya te gusta dentro de ETIOVE.'}
      </Text>
      <HorizontalCardRow
        s={s}
        loading={false}
        items={items}
        renderItem={(item) => (
          <CardHorizontal
            key={item.id}
            item={item}
            badge="Para ti"
            recommendationText={item.recommendationReason || ''}
            onPress={() => handlePress(item)}
            favs={favs}
            onToggleFav={toggleFav}
          />
        )}
      />
    </HomeSectionCard>
  );
}

export function LiveRankingSection({
  s,
  rankingBuckets,
  setCafeDetalle,
  favs,
  toggleFav,
  CardHorizontal,
}) {
  const [activeBucket, setActiveBucket] = useState('weeklyTop');

  const config = {
    weeklyTop: {
      label: 'Top semanal',
      icon: 'trophy-outline',
      subtitle: 'Los cafes con mejor combinacion de traccion, votos y presencia esta semana.',
      accent: '#8f5e3b',
      softBg: '#f4e8db',
      statsLabel: 'Top en movimiento',
    },
    risers: {
      label: 'Subidas',
      icon: 'trending-up-outline',
      subtitle: 'Cafes que hoy estan acelerando por encima de su posicion base.',
      accent: '#1d6b4f',
      softBg: '#e4f4ec',
      statsLabel: 'Mas empuje ahora',
    },
    fallers: {
      label: 'Bajadas',
      icon: 'trending-down-outline',
      subtitle: 'Siguen siendo relevantes, pero ahora mismo empujan menos que otros.',
      accent: '#8a5a2b',
      softBg: '#f8eddc',
      statsLabel: 'Pierden ritmo',
    },
    newcomers: {
      label: 'Nuevos',
      icon: 'sparkles-outline',
      subtitle: 'Entradas recientes con senal suficiente para aparecer en radar.',
      accent: '#245b91',
      softBg: '#e7f1fb',
      statsLabel: 'Recien entrados',
    },
  };

  const availableKeys = Object.keys(config).filter((key) => rankingBuckets?.[key]?.length);
  if (!availableKeys.length) return null;

  const currentKey = availableKeys.includes(activeBucket) ? activeBucket : availableKeys[0];
  const currentConfig = config[currentKey];
  const items = rankingBuckets?.[currentKey] || [];

  const handlePress = (item) => {
    const index = items.findIndex((c) => c.id === item.id);
    setCafeDetalle({ cafes: items, cafeIndex: index });
  };

  return (
    <HomeSectionCard>
      <SectionHeaderNav s={s} title="Rankings vivos" marginTop={0} hideAction />
      <Text style={[s.sectionSub, { paddingHorizontal: 0 }]}>
        Lectura rapida de lo que sube, baja y entra nuevo dentro de ETIOVE.
      </Text>

      <View style={styles.liveRankingTabs}>
        {availableKeys.map((key) => {
          const tab = config[key];
          const active = key === currentKey;
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.88}
              onPress={() => setActiveBucket(key)}
              style={[styles.liveRankingTab, active && styles.liveRankingTabActive]}
            >
              <Ionicons name={tab.icon} size={13} color={active ? '#fffaf5' : '#8f5e3b'} />
              <Text style={[styles.liveRankingTabText, active && styles.liveRankingTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.liveRankingHero}>
        <View style={[styles.liveRankingHeroIcon, { backgroundColor: currentConfig.softBg }]}>
          <Ionicons name={currentConfig.icon} size={18} color={currentConfig.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.liveRankingHeroTitle}>{currentConfig.label}</Text>
          <Text style={styles.liveRankingHeroSub}>{currentConfig.subtitle}</Text>
        </View>
      </View>

      <View style={styles.liveRankingStatsRow}>
        <View style={styles.liveRankingStatCard}>
          <Text style={[styles.liveRankingStatValue, { color: currentConfig.accent }]}>
            {items.length}
          </Text>
          <Text style={styles.liveRankingStatLabel}>{currentConfig.statsLabel}</Text>
        </View>
        <View style={styles.liveRankingStatCard}>
          <Text style={[styles.liveRankingStatValue, { color: currentConfig.accent }]}>
            {Number(items[0]?.puntuacion || 0).toFixed(1)}
          </Text>
          <Text style={styles.liveRankingStatLabel}>Mejor nota visible</Text>
        </View>
        <View style={styles.liveRankingStatCard}>
          <Text style={[styles.liveRankingStatValue, { color: currentConfig.accent }]}>
            {Math.max(...items.map((item) => Number(item?.votos || 0)), 0)}
          </Text>
          <Text style={styles.liveRankingStatLabel}>Pico de votos</Text>
        </View>
      </View>

      <HorizontalCardRow
        s={s}
        loading={false}
        items={items}
        renderItem={(item, index) => (
          <CardHorizontal
            key={item.id}
            item={item}
            badge={`#${index + 1} ${item.rankingTag}`}
            recommendationText={item.rankingReason || ''}
            secondaryText={item.rankingMomentum || ''}
            onPress={() => handlePress(item)}
            favs={favs}
            onToggleFav={toggleFav}
          />
        )}
      />
    </HomeSectionCard>
  );
}

export function DailyCoffeeSection({ s, cafes, setCafeDetalle, favs, toggleFav, CardHorizontal }) {
  if (!cafes?.length) return null;

  const sorted = [...cafes].sort((a, b) => Number(b?.puntuacion || 0) - Number(a?.puntuacion || 0));
  const top = sorted.slice(0, 25);
  const items = top;
  const handlePress = (item) => {
    const index = top.findIndex((c) => c.id === item.id);
    setCafeDetalle({ cafes: top, cafeIndex: index });
  };
  return (
    <HomeSectionCard>
      <SectionHeaderNav s={s} title="Tu café diario" marginTop={0} hideAction />
      <Text style={[s.sectionSub, { paddingHorizontal: 0 }]}>
        Cafés habituales del día a día para comparar y decidir mejor tu compra
      </Text>
      <HorizontalCardRow
        s={s}
        loading={false}
        items={items}
        renderItem={(item, index) => (
          <CardHorizontal
            key={item.id}
            item={item}
            badge={`#${index + 1} Diario`}
            onPress={() => handlePress(item)}
            favs={favs}
            onToggleFav={toggleFav}
          />
        )}
      />
    </HomeSectionCard>
  );
}

export function BioCoffeeSection({ s, cafes, setCafeDetalle, favs, toggleFav, CardHorizontal }) {
  if (!cafes?.length) return null;

  const sorted = [...cafes].sort((a, b) => Number(b?.puntuacion || 0) - Number(a?.puntuacion || 0));
  const top = sorted.slice(0, 25);
  const items = top;
  const handlePress = (item) => {
    const index = top.findIndex((c) => c.id === item.id);
    setCafeDetalle({ cafes: top, cafeIndex: index });
  };

  return (
    <HomeSectionCard>
      <SectionHeaderNav s={s} title="Cafés BIO" marginTop={0} hideAction />
      <Text style={[s.sectionSub, { paddingHorizontal: 0 }]}>
        Una selección de cafés BIO y ecológicos, tanto diarios como de especialidad
      </Text>

      <HorizontalCardRow
        s={s}
        loading={false}
        items={items}
        renderItem={(item, index) => (
          <CardHorizontal
            key={item.id}
            item={item}
            badge={`#${index + 1} BIO`}
            onPress={() => handlePress(item)}
            favs={favs}
            onToggleFav={toggleFav}
          />
        )}
      />
    </HomeSectionCard>
  );
}

export function StepUpSection({ s, pairs, setCafeDetalle, favs, toggleFav, CardHorizontal }) {
  const [activeIndex, setActiveIndex] = useState(() => {
    if (!pairs?.length) return 0;
    const favIdx = pairs.findIndex(
      (p) => favs?.includes(p.daily?.id) || favs?.includes(p.daily?.uid)
    );
    return favIdx >= 0 ? favIdx : 0;
  });

  if (!pairs?.length) return null;

  const total = pairs.length;
  const pair = pairs[activeIndex] || pairs[0];

  const cycleNext = () => setActiveIndex((prev) => (prev + 1) % total);

  return (
    <HomeSectionCard>
      <View style={styles.stepUpHeader}>
        <View style={{ flex: 1 }}>
          <SectionHeaderNav s={s} title="Da el salto" marginTop={0} hideAction />
          <Text style={[s.sectionSub, { paddingHorizontal: 0 }]}>
            Si te gusta un café diario, aquí tienes una opción specialty parecida para subir de
            nivel
          </Text>
        </View>

        {total > 1 && (
          <TouchableOpacity onPress={cycleNext} activeOpacity={0.8} style={styles.stepUpCycleBtn}>
            <Text style={styles.stepUpCycleBtnText}>
              {activeIndex + 1}/{total}
            </Text>
            <Ionicons name="chevron-forward" size={13} color="#8f5e3b" />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ marginTop: 10 }}>
        <View
          key={`${pair.daily?.id || 'daily'}-${pair.specialty?.id || 'specialty'}`}
          style={styles.stepUpCard}
        >
          <View style={styles.stepUpTop}>
            <View style={styles.stepUpBadgeDaily}>
              <Text style={styles.stepUpBadgeDailyText}>Café diario</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#8f5e3b" />
            <View style={styles.stepUpBadgeSpecialty}>
              <Text style={styles.stepUpBadgeSpecialtyText}>Especialidad</Text>
            </View>
          </View>

          <View style={styles.stepUpColumns}>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepUpLabel}>Empiezas con</Text>
              <CardHorizontal
                item={pair.daily}
                badge="☕ Diario"
                onPress={setCafeDetalle}
                favs={favs}
                onToggleFav={toggleFav}
              />
            </View>

            <View style={{ width: 10 }} />

            <View style={{ flex: 1 }}>
              <Text style={styles.stepUpLabel}>Prueba después</Text>
              <CardHorizontal
                item={pair.specialty}
                badge="⭐ Specialty"
                onPress={setCafeDetalle}
                favs={favs}
                onToggleFav={toggleFav}
              />
            </View>
          </View>
        </View>
      </View>
    </HomeSectionCard>
  );
}

export function ExploreHomeSection({
  s,
  setActiveTab,
  premiumAccent,
  onOpenTrendingFilter,
  quickTrendingFilters,
}) {
  const { paises = [], procesos = [], roasters = [] } = quickTrendingFilters || {};

  return (
    <HomeSectionCard>
      <SectionHeaderNav s={s} title="Explora ETIOVE" marginTop={0} hideAction />
      <Text style={[s.sectionSub, { paddingHorizontal: 0 }]}>
        Accesos rápidos para explorar sin recargar la pantalla de inicio
      </Text>

      <SectionIntro
        title="Rutas rápidas"
        subtitle="Accesos pensados para descubrir mejor sin perderte entre bloques largos."
        pills={['Trending', 'Explore', 'Ranking']}
      />

      <View style={{ marginTop: 10, gap: 12 }}>
        <ActionCard
          title="Ver trending"
          desc="Los cafés que mejor se están moviendo ahora"
          icon="flame-outline"
          onPress={() => setActiveTab(MAIN_TABS.TRENDING)}
        />

        <ActionCard
          title="Explorar cafés"
          desc="Descubre specialty y café diario con filtros"
          icon="compass-outline"
          onPress={() => setActiveTab(MAIN_TABS.DISCOVER)}
        />

        <ActionCard
          title="Ranking"
          desc="Consulta los mejores cafés según la comunidad"
          icon="trophy-outline"
          onPress={() => setActiveTab(MAIN_TABS.TOP)}
        />
      </View>

      {!!paises.length && (
        <View style={styles.quickBlock}>
          <Text style={styles.quickBlockTitle}>Trending por país</Text>
          <View style={styles.quickWrap}>
            {paises.slice(0, 4).map((pais) => (
              <QuickFilterChip
                key={`pais-${pais}`}
                label={pais}
                icon="earth-outline"
                accentColor={premiumAccent}
                onPress={() => onOpenTrendingFilter?.({ pais })}
              />
            ))}
          </View>
        </View>
      )}

      {!!procesos.length && (
        <View style={styles.quickBlock}>
          <Text style={styles.quickBlockTitle}>Trending por proceso</Text>
          <View style={styles.quickWrap}>
            {procesos.slice(0, 4).map((proceso) => (
              <QuickFilterChip
                key={`proceso-${proceso}`}
                label={proceso}
                icon="water-outline"
                accentColor={premiumAccent}
                onPress={() => onOpenTrendingFilter?.({ proceso })}
              />
            ))}
          </View>
        </View>
      )}

      {!!roasters.length && (
        <View style={styles.quickBlock}>
          <Text style={styles.quickBlockTitle}>Trending por tostador</Text>
          <View style={styles.quickWrap}>
            {roasters.slice(0, 4).map((roaster) => (
              <QuickFilterChip
                key={`roaster-${roaster}`}
                label={roaster}
                icon="flame-outline"
                accentColor={premiumAccent}
                onPress={() => onOpenTrendingFilter?.({ roaster })}
              />
            ))}
          </View>
        </View>
      )}
    </HomeSectionCard>
  );
}

export function NearbyCafeteriasSection({
  s,
  setActiveTab,
  cargandoCafInicio,
  premiumAccent,
  errorCafInicio,
  cafeteriasInicio,
  cargarCafeteriasInicio,
  theme,
}) {
  return (
    <HomeSectionCard>
      <SectionHeaderNav
        s={s}
        title="Cafeterías cerca de ti"
        onPress={() => setActiveTab(MAIN_TABS.CAFETERIAS)}
        marginTop={0}
      />
      <Text style={[s.sectionSub, { paddingHorizontal: 0 }]}>
        Cafeterías cercanas para tomar buen café fuera de casa
      </Text>

      {cargandoCafInicio ? (
        <ActivityIndicator color={premiumAccent} style={{ margin: 18 }} />
      ) : errorCafInicio ? (
        <View style={{ marginTop: 10 }}>
          <Text style={[s.empty, { marginTop: 6 }]}>{errorCafInicio}</Text>
          <TouchableOpacity style={[s.redBtn, { marginTop: 12 }]} onPress={cargarCafeteriasInicio}>
            <Text style={s.redBtnText}>Reintentar cafeterías</Text>
          </TouchableOpacity>
        </View>
      ) : cafeteriasInicio.length === 0 ? (
        <View style={{ marginTop: 10 }}>
          <Text style={[s.empty, { marginTop: 6 }]}>
            Todavía no hemos cargado cafeterías cercanas en esta sesión.
          </Text>
          <TouchableOpacity style={[s.redBtn, { marginTop: 12 }]} onPress={cargarCafeteriasInicio}>
            <Text style={s.redBtnText}>Cargar cafeterías cercanas</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <HorizontalCardRow
          s={s}
          loading={false}
          items={cafeteriasInicio.slice(0, 8)}
          renderItem={(cafItem) => (
            <TouchableOpacity
              key={cafItem.id}
              style={s.cardH}
              onPress={() => setActiveTab(MAIN_TABS.CAFETERIAS)}
              activeOpacity={0.88}
            >
              <View style={s.cardHImg}>
                {cafItem.foto ? (
                  <Image
                    source={{ uri: cafItem.foto }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.absoluteFill,
                      {
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f2ece5',
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 30 }}>☕</Text>
                  </View>
                )}

                <View style={[s.badgeRed, { right: 8, left: 'auto' }]}>
                  <Text style={s.badgeText}>
                    {cafItem.abierto === null ? '—' : cafItem.abierto ? 'Abierto' : 'Cerrado'}
                  </Text>
                </View>
              </View>

              <Text style={s.cardHName} numberOfLines={2}>
                {cafItem.nombre}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <Ionicons name="star" size={12} color={theme.status.favorite} />
                <Text style={s.cardHRating}>{cafItem.rating}</Text>
                <Text style={s.cardHVotos}>({cafItem.numResenas})</Text>
              </View>

              <Text style={s.cardHOrigin}>
                {cafItem.distancia < 1000
                  ? `${cafItem.distancia}m`
                  : `${(cafItem.distancia / 1000).toFixed(1)}km`}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </HomeSectionCard>
  );
}

export function BlogSection({ s }) {
  return (
    <HomeSectionCard>
      <SectionHeaderNav
        s={s}
        title="Desde el blog"
        onPress={() => Linking.openURL('https://etiove.com/blog/')}
        marginTop={0}
      />
      <Text style={[s.sectionSub, { paddingHorizontal: 0 }]}>
        Guías y contenido editorial para aprender más sin saturar la Home
      </Text>

      <SectionIntro
        title="Lecturas recomendadas"
        subtitle="Contenido editorial útil para aprender más sobre café, métodos y preparación."
        pills={['Guías', 'Métodos', 'Aprender']}
      />

      <View style={{ marginTop: 10, gap: 12 }}>
        {FEATURED_BLOG_POSTS.map((post) => (
          <TouchableOpacity
            key={post.url}
            activeOpacity={0.88}
            onPress={() => Linking.openURL(post.url)}
            style={styles.blogCard}
          >
            <View style={styles.blogIconWrap}>
              <Ionicons name={post.icon} size={20} color="#8f5e3b" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.blogTitle}>{post.title}</Text>
              <Text style={styles.blogDesc}>{post.desc}</Text>
            </View>

            <Ionicons name="arrow-forward" size={18} color="#8f5e3b" />
          </TouchableOpacity>
        ))}
      </View>
    </HomeSectionCard>
  );
}

const styles = StyleSheet.create({
  absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },

  homeSectionCard: {
    marginTop: 24,
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eadbce',
    backgroundColor: '#fffaf5',
    padding: 16,
  },

  sectionIntroTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#24160f',
  },
  sectionIntroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: '#6f5a4b',
  },
  sectionPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  sectionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#eadbce',
    backgroundColor: '#faf7f2',
  },
  sectionPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8f5e3b',
  },

  quickBlock: {
    marginTop: 14,
  },
  quickBlockTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8f5e3b',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  quickWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2d5c8',
    backgroundColor: '#faf7f2',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '800',
    maxWidth: 150,
  },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#faf8f5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eadbce',
    padding: 14,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f4e8db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#24160f',
  },
  actionDesc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#6f5a4b',
  },

  blogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#faf8f5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eadbce',
    padding: 14,
  },
  blogIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f4e8db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blogTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#24160f',
  },
  blogDesc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#6f5a4b',
  },

  stepUpHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepUpCycleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#eadbce',
    backgroundColor: '#fffaf5',
  },
  stepUpCycleBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8f5e3b',
  },
  stepUpCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eadbce',
    backgroundColor: '#fffaf5',
    padding: 14,
  },
  stepUpTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  stepUpBadgeDaily: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e7f3ff',
    borderWidth: 1,
    borderColor: '#c8def7',
  },
  stepUpBadgeDailyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#245b91',
  },
  stepUpBadgeSpecialty: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f5e8d6',
    borderWidth: 1,
    borderColor: '#eadbce',
  },
  stepUpBadgeSpecialtyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8f5e3b',
  },
  stepUpColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepUpLabel: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
    color: '#6f5a4b',
  },

  rankingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#eadbce',
    backgroundColor: '#faf7f2',
  },
  rankingToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8f5e3b',
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eadbce',
    backgroundColor: '#faf8f5',
  },
  rankingPos: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#f3e7d9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingPosText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#8f5e3b',
  },
  rankingName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#24160f',
  },
  rankingMeta: {
    marginTop: 2,
    fontSize: 11,
    color: '#6f5a4b',
  },
  rankingScore: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8f5e3b',
  },
  liveRankingTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  liveRankingTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#eadbce',
    backgroundColor: '#faf7f2',
  },
  liveRankingTabActive: {
    backgroundColor: '#2f2219',
    borderColor: '#2f2219',
  },
  liveRankingTabText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8f5e3b',
  },
  liveRankingTabTextActive: {
    color: '#fffaf5',
  },
  liveRankingHero: {
    marginTop: 14,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eadbce',
    backgroundColor: '#faf8f5',
    padding: 14,
  },
  liveRankingHeroIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f3e7d9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveRankingHeroTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#24160f',
  },
  liveRankingHeroSub: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#6f5a4b',
  },
  liveRankingStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  liveRankingStatCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eadbce',
    backgroundColor: '#fff',
    padding: 12,
  },
  liveRankingStatValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  liveRankingStatLabel: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
    color: '#7a6556',
    fontWeight: '700',
  },
});
