import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PREMIUM_ACCENT } from '../constants/theme';
import { normalize } from '../core/utils';
import { getPersonalizedCoffeeFeed } from '../domain/coffee/personalizedCoffee';
import QuizSection from './QuizSection';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = 12;
const GRID_PADDING = 16;

const ESPRESSO = '#1c0f07';
const ESPRESSO_CARD = '#2a1508';
const GOLD = '#c8a97c';
const GOLD_DIM = 'rgba(200,169,124,0.18)';
const GOLD_BORDER = 'rgba(200,169,124,0.28)';
const WARM_TEXT = '#f0dcc8';
const MUTED_BROWN = '#8a6a52';

function computeTasteProfile(favCafes) {
  if (!favCafes.length) return null;

  const specialty = favCafes.filter(
    (c) => c.coffeeCategory === 'specialty' || (!c.coffeeCategory && !c.category)
  ).length;
  const daily = favCafes.length - specialty;

  const origins = {};
  const processes = {};
  favCafes.forEach((c) => {
    const o = c.pais || c.origen;
    if (o) origins[o] = (origins[o] || 0) + 1;
    const p = c.proceso;
    if (p) processes[p] = (processes[p] || 0) + 1;
  });

  const topOrigins = Object.entries(origins)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
  const topProcesses = Object.entries(processes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  return {
    specialtyPct: Math.round((specialty / favCafes.length) * 100),
    dailyPct: Math.round((daily / favCafes.length) * 100),
    topOrigins,
    topProcesses,
  };
}

function TasteProfileSection({ favCafes, recommendations, setCafeDetalle }) {
  const profile = useMemo(() => computeTasteProfile(favCafes), [favCafes]);

  if (!profile) return null;

  return (
    <View style={tp.wrap}>
      {/* Header */}
      <View style={tp.header}>
        <View style={tp.titleRow}>
          <View style={tp.iconCircle}>
            <Text style={{ fontSize: 16 }}>✦</Text>
          </View>
          <View>
            <Text style={tp.title}>Tu perfil de sabor</Text>
            <Text style={tp.subtitle}>Basado en {favCafes.length} favoritos</Text>
          </View>
        </View>
      </View>

      {/* Barras de categoría */}
      <View style={tp.barsSection}>
        <View style={tp.barRow}>
          <Text style={tp.barLabel}>ESPECIALIDAD</Text>
          <View style={tp.barTrack}>
            <View style={[tp.barFill, { width: `${profile.specialtyPct}%` }]} />
          </View>
          <Text style={tp.barPct}>{profile.specialtyPct}%</Text>
        </View>
        <View style={tp.barRow}>
          <Text style={tp.barLabel}>CAFÉ DIARIO</Text>
          <View style={tp.barTrack}>
            <View
              style={[tp.barFill, { width: `${profile.dailyPct}%`, backgroundColor: '#7aaedc' }]}
            />
          </View>
          <Text style={tp.barPct}>{profile.dailyPct}%</Text>
        </View>
      </View>

      <View style={tp.divider} />

      {/* Orígenes y procesos */}
      <View style={tp.tagsSection}>
        {profile.topOrigins.length > 0 && (
          <View style={tp.tagGroup}>
            <Text style={tp.tagGroupLabel}>🌍 ORÍGENES</Text>
            <View style={tp.tagRow}>
              {profile.topOrigins.map((o) => (
                <View key={o} style={tp.tag}>
                  <Text style={tp.tagText}>{o}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {profile.topProcesses.length > 0 && (
          <View style={[tp.tagGroup, { marginTop: 12 }]}>
            <Text style={tp.tagGroupLabel}>⚙️ PROCESOS</Text>
            <View style={tp.tagRow}>
              {profile.topProcesses.map((p) => (
                <View key={p} style={[tp.tag, tp.tagProcess]}>
                  <Text style={[tp.tagText, { color: '#b8d4f0' }]}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Recomendaciones */}
      {recommendations.length > 0 && (
        <View>
          <View style={tp.divider} />
          <View style={tp.recsSection}>
            <Text style={tp.recsLabel}>✦ PARA TI HOY</Text>
            <View style={tp.recsRow}>
              {recommendations.slice(0, 3).map((item, idx) => {
                const uri = item.bestPhoto || item.officialPhoto || item.foto || null;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={tp.recCard}
                    onPress={() => setCafeDetalle({ cafes: recommendations, cafeIndex: idx })}
                    activeOpacity={0.82}
                  >
                    <View style={tp.recImg}>
                      {uri ? (
                        <Image
                          source={{ uri }}
                          style={StyleSheet.absoluteFill}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ fontSize: 22, textAlign: 'center' }}>☕</Text>
                      )}
                      <View style={tp.recScoreBadge}>
                        <Text style={tp.recScoreText}>
                          {Number(item.puntuacion || 0).toFixed(1)}
                        </Text>
                      </View>
                    </View>
                    <Text style={tp.recBrand} numberOfLines={1}>
                      {item.marca || item.roaster || ''}
                    </Text>
                    <Text style={tp.recName} numberOfLines={2}>
                      {item.nombre}
                    </Text>
                    {item.recommendationReason ? (
                      <Text style={tp.recReason} numberOfLines={2}>
                        {item.recommendationReason}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const REC_W = (SCREEN_W - GRID_PADDING * 2 - GOLD_DIM.length + 24) / 3;

const tp = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: ESPRESSO,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: GOLD_DIM,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: WARM_TEXT,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    color: MUTED_BROWN,
    marginTop: 1,
  },
  barsSection: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 10,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: MUTED_BROWN,
    letterSpacing: 0.6,
    width: 90,
  },
  barTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: GOLD,
  },
  barPct: {
    fontSize: 12,
    fontWeight: '800',
    color: GOLD,
    width: 34,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 18,
    marginVertical: 4,
  },
  tagsSection: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  tagGroup: {},
  tagGroupLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: MUTED_BROWN,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: GOLD_DIM,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  tagProcess: {
    backgroundColor: 'rgba(122,174,220,0.12)',
    borderColor: 'rgba(122,174,220,0.25)',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
  },
  recsSection: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },
  recsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: MUTED_BROWN,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  recsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  recCard: {
    flex: 1,
  },
  recImg: {
    width: '100%',
    aspectRatio: 0.85,
    borderRadius: 12,
    backgroundColor: ESPRESSO_CARD,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  recScoreBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recScoreText: {
    fontSize: 10,
    fontWeight: '800',
    color: ESPRESSO,
  },
  recBrand: {
    fontSize: 9,
    fontWeight: '700',
    color: MUTED_BROWN,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  recName: {
    fontSize: 12,
    fontWeight: '800',
    color: WARM_TEXT,
    lineHeight: 15,
  },
  recReason: {
    fontSize: 10,
    color: MUTED_BROWN,
    marginTop: 4,
    lineHeight: 13,
  },
});
const CARD_W = (SCREEN_W - GRID_PADDING * 2 - GRID_GAP) / 2;

function getImageUri(item) {
  return item.bestPhoto || item.officialPhoto || item.foto || item.image || null;
}

function StatPill({ icon, value, label, accent }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statIcon]}>{icon}</Text>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, subtitle, action, onAction }) {
  return (
    <View style={styles.sectionHead}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function GridCard({ item, onPress, favs, onToggleFav }) {
  const isFav = favs.includes(item.id);
  const uri = getImageUri(item);

  return (
    <TouchableOpacity style={styles.gridCard} onPress={() => onPress?.(item)} activeOpacity={0.88}>
      <View style={styles.gridImg}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={styles.gridImgPlaceholder}>
            <Text style={{ fontSize: 28 }}>☕</Text>
          </View>
        )}
        <View style={styles.gridOverlay} />
        <TouchableOpacity style={styles.gridFavBtn} onPress={() => onToggleFav?.(item)}>
          <Ionicons
            name={isFav ? 'star' : 'star-outline'}
            size={14}
            color={isFav ? PREMIUM_ACCENT : '#fff'}
          />
        </TouchableOpacity>
        {item.puntuacion ? (
          <View style={styles.gridScore}>
            <Text style={styles.gridScoreText}>{Number(item.puntuacion).toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.gridInfo}>
        {item.marca || item.roaster ? (
          <Text style={styles.gridBrand} numberOfLines={1}>
            {item.marca || item.roaster}
          </Text>
        ) : null}
        <Text style={styles.gridName} numberOfLines={2}>
          {item.nombre}
        </Text>
        {item.pais || item.origen ? (
          <Text style={styles.gridMeta} numberOfLines={1}>
            {item.pais || item.origen}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function MisCafesTab({
  s,
  cargando,
  allCafes,
  quizSectionProps,
  favCafes,
  CardHorizontal,
  setCafeDetalle,
  favs,
  toggleFav,
  busquedaMis,
  setBusquedaMis,
  misCafes,
  SearchInput,
  cafesFiltrados,
  eliminarCafe,
  premiumAccent,
  notebook,
  theme,
  DiarioCatasSection,
}) {
  const query = (busquedaMis || '').trim();
  const hasQuery = query.length > 0;

  const containsQuery = (value) => normalize(String(value || '')).includes(normalize(query));
  const matchesCafe = (cafe) =>
    containsQuery(cafe?.marca) ||
    containsQuery(cafe?.nombre) ||
    containsQuery(cafe?.pais) ||
    containsQuery(cafe?.region) ||
    containsQuery(cafe?.origen) ||
    containsQuery(cafe?.variedad) ||
    containsQuery(cafe?.proceso) ||
    containsQuery(cafe?.notas);

  const searchResults = hasQuery
    ? [
        ...new Map(
          [...(allCafes || []), ...(favCafes || []), ...(misCafes || [])]
            .filter(matchesCafe)
            .map((c) => [c.id, c])
        ).values(),
      ].slice(0, 30)
    : [];

  const personalizedFeed = useMemo(
    () => getPersonalizedCoffeeFeed(allCafes || [], favs || []),
    [allCafes, favs]
  );

  const suggestionSource = [...(allCafes || []), ...(favCafes || []), ...(misCafes || [])].filter(
    (item, index, arr) => index === arr.findIndex((x) => x.id === item.id)
  );

  const totalCatas = notebook?.stats?.totalCatas || 0;
  const accent = premiumAccent || PREMIUM_ACCENT;

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Mi espacio</Text>
        <View style={styles.statsRow}>
          <StatPill icon="☕" value={misCafes.length} label="colección" accent={accent} />
          <View style={styles.statDivider} />
          <StatPill icon="⭐" value={favCafes.length} label="favoritos" accent={accent} />
          <View style={styles.statDivider} />
          <StatPill icon="📓" value={totalCatas} label="catas" accent={accent} />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <SearchInput
          value={busquedaMis}
          onChangeText={setBusquedaMis}
          onSearch={setBusquedaMis}
          allCafes={suggestionSource}
          placeholder="Buscar cafés, marcas, países..."
        />
      </View>

      {/* Search results */}
      {hasQuery && (
        <View style={styles.section}>
          <SectionTitle
            title={`${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''}`}
            subtitle={`Búsqueda: "${query}"`}
          />
          {searchResults.length > 0 ? (
            <View style={styles.grid}>
              {searchResults.map((item, idx) => (
                <GridCard
                  key={item.id}
                  item={item}
                  onPress={() => setCafeDetalle({ cafes: searchResults, cafeIndex: idx })}
                  favs={favs}
                  onToggleFav={toggleFav}
                />
              ))}
            </View>
          ) : (
            <Text style={s.empty}>Sin resultados para "{query}"</Text>
          )}
        </View>
      )}

      {/* Quiz (solo sin búsqueda) */}
      {!hasQuery && !cargando && (
        <View style={styles.quizWrap}>
          <QuizSection {...quizSectionProps} />
        </View>
      )}

      {/* Favoritos */}
      {!hasQuery && favCafes.length > 0 && (
        <View style={styles.section}>
          <SectionTitle title="Tus favoritos" subtitle={`${favCafes.length} cafés guardados`} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {favCafes.map((item, idx) => (
              <CardHorizontal
                key={item.id}
                item={item}
                badge={`${Number(item.puntuacion || 0).toFixed(1)}`}
                onPress={() => setCafeDetalle({ cafes: favCafes, cafeIndex: idx })}
                favs={favs}
                onToggleFav={toggleFav}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Perfil de sabor */}
      {!hasQuery && !cargando && favCafes.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <TasteProfileSection
            favCafes={favCafes}
            recommendations={personalizedFeed?.items || []}
            setCafeDetalle={setCafeDetalle}
          />
        </View>
      )}

      {/* Diario de catas */}
      {!hasQuery && notebook && (
        <View style={styles.section}>
          <DiarioCatasSection
            s={s}
            theme={theme}
            premiumAccent={accent}
            catas={notebook.catas || []}
            catasFiltradas={notebook.catasFiltradas || []}
            stats={notebook.stats || { totalCatas: 0, promedioPuntuacion: 0, cafesProbados: 0 }}
            filtroPeriodo={notebook.filtroPeriodo}
            setFiltroPeriodo={notebook.setFiltroPeriodo}
            irAbrirModal={notebook.irAbrirModal}
            irAbrirDetail={notebook.irAbrirDetail}
          />
        </View>
      )}

      {/* Mi colección — grid */}
      {!hasQuery && (
        <View style={styles.section}>
          <SectionTitle
            title="Mi colección"
            subtitle={
              misCafes.length > 0
                ? `${misCafes.length} café${misCafes.length !== 1 ? 's' : ''} añadido${misCafes.length !== 1 ? 's' : ''}`
                : null
            }
          />

          {cargando ? (
            <ActivityIndicator color={accent} style={{ marginVertical: 40 }} />
          ) : cafesFiltrados.length > 0 ? (
            <View style={styles.grid}>
              {cafesFiltrados.map((item, idx) => (
                <GridCard
                  key={item.id}
                  item={item}
                  onPress={() => setCafeDetalle({ cafes: cafesFiltrados, cafeIndex: idx })}
                  favs={favs}
                  onToggleFav={toggleFav}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyCollection}>
              <Text style={styles.emptyIcon}>☕</Text>
              <Text style={styles.emptyTitle}>Tu colección está vacía</Text>
              <Text style={styles.emptyText}>
                Escanea o añade cafés para empezar a construir tu archivo personal
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111',
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#faf8f5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ede7dc',
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#e5ddd2',
  },

  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },

  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  sectionSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
    color: PREMIUM_ACCENT,
    paddingTop: 2,
  },

  hScroll: {
    paddingRight: 8,
    gap: 12,
  },

  quizWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ede7dc',
    backgroundColor: '#faf8f5',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridCard: {
    width: CARD_W,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#f5f0ea',
  },
  gridImg: {
    width: '100%',
    height: CARD_W * 1.15,
    backgroundColor: '#ede7dc',
  },
  gridImgPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0ebe3',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    background: 'transparent',
  },
  gridFavBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridScore: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: PREMIUM_ACCENT,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  gridScoreText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  gridInfo: {
    padding: 10,
  },
  gridBrand: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8f5e3b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  gridName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111',
    lineHeight: 17,
  },
  gridMeta: {
    fontSize: 11,
    color: '#888',
    marginTop: 3,
  },

  // Empty state
  emptyCollection: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#222',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 19,
  },
});
