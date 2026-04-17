import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Animated,
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

export function InicioTopBar({
  s,
  perfil,
  setShowProfile,
  brandCardAnim,
  brandCardTranslateY,
  brandCardScale,
  profileInitial,
  profileAlias,
  profileName,
  currentLevel,
  gamification,
  nextLevel,
  brandProgressWidth,
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

        <Animated.View
          style={[
            s.brandPillContent,
            {
              opacity: brandCardAnim,
              transform: [{ translateY: brandCardTranslateY }, { scale: brandCardScale }],
            },
          ]}
        >
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

          <View style={s.brandProgressTrack}>
            <Animated.View style={[s.brandProgressFill, { width: brandProgressWidth }]} />
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
        </Animated.View>
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

  return (
    <>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Resultados ({resultados.length})</Text>
      </View>

      <Text style={[s.sectionSub, { paddingHorizontal: 16 }]}>
        Cafés encontrados en la comunidad según tu búsqueda
      </Text>

      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        {resultados.map((item) => (
          <CardVertical
            key={item.id}
            item={item}
            onDelete={() => {}}
            onPress={setCafeDetalle}
            favs={favs}
            onToggleFav={toggleFav}
          />
        ))}
      </View>
    </>
  );
}

export function DiscoverForYouSection({
  s,
  personalizedCafes,
  personalizedReason,
  setCafeDetalle,
  favs,
  toggleFav,
  CardHorizontal,
}) {
  if (!personalizedCafes?.length) return null;

  return (
    <>
      <SectionHeaderNav s={s} title="Descubrir para ti" marginTop={28} hideAction />
      <Text style={s.sectionSub}>
        {personalizedReason ||
          'Una selección personalizada basada en tus favoritos y en los perfiles que más repites.'}
      </Text>

      <HorizontalCardRow
        s={s}
        loading={false}
        items={personalizedCafes}
        header="Selección personalizada"
        subheader="Ajustada a tus afinidades actuales dentro de ETIOVE"
        renderItem={(item) => (
          <CardHorizontal
            key={item.id}
            item={item}
            badge={`${item.puntuacion}.0`}
            onPress={setCafeDetalle}
            favs={favs}
            onToggleFav={toggleFav}
          />
        )}
      />
    </>
  );
}

export function TrendingQuickFiltersSection({
  s,
  setActiveTab,
  premiumAccent,
  quickTrendingFilters,
  onOpenTrendingFilter,
}) {
  const { paises = [], procesos = [], roasters = [] } = quickTrendingFilters || {};

  if (!paises.length && !procesos.length && !roasters.length) return null;

  return (
    <>
      <SectionHeaderNav
        s={s}
        title="Explora el trending"
        marginTop={28}
        onPress={() => setActiveTab(MAIN_TABS.TRENDING)}
        actionLabel="Abrir"
      />
      <Text style={s.sectionSub}>
        Atajos rápidos para descubrir qué está destacando por país, proceso o tostador
      </Text>

      {!!paises.length && (
        <View style={styles.quickBlock}>
          <Text style={styles.quickBlockTitle}>País</Text>
          <View style={styles.quickWrap}>
            {paises.map((pais) => (
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
          <Text style={styles.quickBlockTitle}>Proceso</Text>
          <View style={styles.quickWrap}>
            {procesos.map((proceso) => (
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
          <Text style={styles.quickBlockTitle}>Tostador</Text>
          <View style={styles.quickWrap}>
            {roasters.map((roaster) => (
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
    </>
  );
}

export function TrendingSection({
  s,
  trendingCafes,
  setActiveTab,
  setCafeDetalle,
  favs,
  toggleFav,
  CardHorizontal,
}) {
  if (!trendingCafes?.length) return null;

  return (
    <>
      <SectionHeaderNav
        s={s}
        title="Ahora en tendencia"
        marginTop={28}
        onPress={() => setActiveTab(MAIN_TABS.TRENDING)}
        actionLabel="Ver trending"
      />
      <Text style={s.sectionSub}>
        Los cafés que mejor combinan puntuación, votos y tracción de la comunidad
      </Text>

      <HorizontalCardRow
        s={s}
        loading={false}
        items={trendingCafes.slice(0, 10)}
        header="Trending now"
        subheader="Una mezcla de notas altas y movimiento real"
        renderItem={(item) => (
          <View key={item.id} style={styles.trendingItemWrap}>
            <CardHorizontal
              item={item}
              badge={`${item.puntuacion}.0 🔥`}
              onPress={setCafeDetalle}
              favs={favs}
              onToggleFav={toggleFav}
            />
            <View style={styles.trendingMetaRow}>
              <View style={styles.trendingMetaPill}>
                <Text style={styles.trendingMetaText}>{item.votos || 0} votos</Text>
              </View>
              {item.roaster ? (
                <Text style={styles.trendingRoaster} numberOfLines={1}>
                  {item.roaster}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      />
    </>
  );
}

export function LatestSection({
  s,
  setActiveTab,
  cargando,
  premiumAccent,
  ultimosGlobal,
  CardHorizontal,
  setCafeDetalle,
  favs,
  toggleFav,
}) {
  return (
    <>
      <SectionHeaderNav
        s={s}
        title="Últimos cafés descubiertos"
        onPress={() => setActiveTab(MAIN_TABS.LATEST)}
      />
      <Text style={s.sectionSub}>Las últimas incorporaciones de la comunidad ETIOVE</Text>

      <HorizontalCardRow
        s={s}
        loading={cargando}
        loadingColor={premiumAccent}
        items={ultimosGlobal}
        renderItem={(item) => (
          <CardHorizontal
            key={item.id}
            item={item}
            badge={`${item.puntuacion}.0`}
            onPress={setCafeDetalle}
            favs={favs}
            onToggleFav={toggleFav}
          />
        )}
        emptyText="Aún no hay cafés."
      />
    </>
  );
}

export function TopCountrySection({
  s,
  setActiveTab,
  perfil,
  flag,
  cargando,
  premiumAccent,
  topCafesVista,
  CardHorizontal,
  setCafeDetalle,
  favs,
  toggleFav,
}) {
  return (
    <>
      <SectionHeaderNav
        s={s}
        title={`Top cafés en ${perfil.pais || 'España'} ${flag}`}
        onPress={() => setActiveTab(MAIN_TABS.TOP)}
        marginTop={28}
      />
      <Text style={s.sectionSub}>Los mejor puntuados según tu país preferido</Text>

      <HorizontalCardRow
        s={s}
        loading={cargando}
        loadingColor={premiumAccent}
        items={topCafesVista.slice(0, 10)}
        renderItem={(item) => (
          <CardHorizontal
            key={item.id}
            item={item}
            badge={`${item.puntuacion}.0 ⭐`}
            onPress={setCafeDetalle}
            favs={favs}
            onToggleFav={toggleFav}
          />
        )}
        emptyText="Aún no hay cafés."
      />
    </>
  );
}

export function RoasterSpotlightSection({
  s,
  roasters,
  setCafeDetalle,
  favs,
  toggleFav,
  CardHorizontal,
}) {
  if (!roasters?.length) return null;

  return (
    <>
      <SectionHeaderNav s={s} title="Tostadores destacados" marginTop={28} hideAction />
      <Text style={s.sectionSub}>
        Marcas y tostadores que mejor están brillando ahora en la comunidad
      </Text>

      <HorizontalCardRow
        s={s}
        loading={false}
        items={roasters}
        renderItem={(entry) => {
          const item = {
            ...entry.topCafe,
            nombre: entry.topCafe?.nombre || entry.roaster,
            roaster: entry.roaster,
          };

          return (
            <View key={entry.roaster} style={styles.roasterWrap}>
              <View style={styles.roasterTop}>
                <Text style={styles.roasterLabel} numberOfLines={1}>
                  {entry.roaster}
                </Text>
                <Text style={styles.roasterCount}>{entry.total} cafés</Text>
              </View>

              <CardHorizontal
                item={item}
                badge={`${item?.puntuacion || 0}.0`}
                onPress={setCafeDetalle}
                favs={favs}
                onToggleFav={toggleFav}
              />
            </View>
          );
        }}
      />
    </>
  );
}

export function ProcessDiscoverySection({
  s,
  sections,
  setCafeDetalle,
  favs,
  toggleFav,
  CardHorizontal,
}) {
  if (!sections?.length) return null;

  return (
    <>
      <SectionHeaderNav s={s} title="Descubre por proceso" marginTop={28} hideAction />
      <Text style={s.sectionSub}>
        Explora perfiles distintos según cómo ha sido procesado el café
      </Text>

      <View style={{ gap: 22 }}>
        {sections.map((section) => (
          <View key={section.proceso}>
            <View style={styles.processHeader}>
              <Text style={styles.processTitle}>{section.proceso}</Text>
              <Text style={styles.processMeta}>{section.cafes.length} destacados</Text>
            </View>

            <HorizontalCardRow
              s={s}
              loading={false}
              items={section.cafes}
              renderItem={(item) => (
                <CardHorizontal
                  key={item.id}
                  item={item}
                  badge={`${item.puntuacion}.0`}
                  onPress={setCafeDetalle}
                  favs={favs}
                  onToggleFav={toggleFav}
                />
              )}
            />
          </View>
        ))}
      </View>
    </>
  );
}

export function BlogSection({ s }) {
  return (
    <>
      <SectionHeaderNav
        s={s}
        title="Desde el blog"
        onPress={() => Linking.openURL('https://etiove.com/blog/')}
        marginTop={28}
      />
      <Text style={s.sectionSub}>
        Guías y contenido editorial para seguir aprendiendo sobre café de especialidad
      </Text>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
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
    </>
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
    <>
      <SectionHeaderNav
        s={s}
        title="Cafeterías cerca de ti"
        onPress={() => setActiveTab(MAIN_TABS.CAFETERIAS)}
        marginTop={28}
      />
      <Text style={s.sectionSub}>
        Cargamos cafeterías cercanas automáticamente al entrar. Si algo falla, puedes reintentar.
      </Text>

      {cargandoCafInicio ? (
        <ActivityIndicator color={premiumAccent} style={{ margin: 18 }} />
      ) : errorCafInicio ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={[s.empty, { marginTop: 6 }]}>{errorCafInicio}</Text>
          <TouchableOpacity style={[s.redBtn, { marginTop: 12 }]} onPress={cargarCafeteriasInicio}>
            <Text style={s.redBtnText}>Reintentar cafeterías</Text>
          </TouchableOpacity>
        </View>
      ) : cafeteriasInicio.length === 0 ? (
        <View style={{ paddingHorizontal: 16 }}>
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
          items={cafeteriasInicio}
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
    </>
  );
}

const styles = StyleSheet.create({
  absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },

  quickBlock: {
    paddingHorizontal: 16,
    marginTop: 10,
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

  trendingItemWrap: {
    width: 190,
  },
  trendingMetaRow: {
    marginTop: 8,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  trendingMetaPill: {
    borderRadius: 999,
    backgroundColor: '#f3e7d9',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  trendingMetaText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8f5e3b',
  },
  trendingRoaster: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    color: '#7e6959',
    fontWeight: '700',
  },

  roasterWrap: {
    width: 190,
  },
  roasterTop: {
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  roasterLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2a1a12',
  },
  roasterCount: {
    marginTop: 2,
    fontSize: 11,
    color: '#7e6959',
  },

  processHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  processTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#24160f',
  },
  processMeta: {
    fontSize: 11,
    color: '#7e6959',
    fontWeight: '700',
  },
});
