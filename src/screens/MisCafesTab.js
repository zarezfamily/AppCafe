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
const GRID_GAP = 10;
const GRID_PADDING = 16;
const CARD_W = (SCREEN_W - GRID_PADDING * 2 - GRID_GAP) / 2;

// Paleta espresso premium
const BG = '#120a04';
const CARD = '#1e1108';
const CARD_LIGHT = '#271610';
const GOLD = '#c8a97c';
const GOLD_DIM = 'rgba(200,169,124,0.14)';
const GOLD_BORDER = 'rgba(200,169,124,0.22)';
const WARM = '#f0dcc8';
const MUTED = '#7a5c42';
const DIVIDER = 'rgba(200,169,124,0.12)';

function getImageUri(item) {
  return item.bestPhoto || item.officialPhoto || item.foto || item.image || null;
}

function StatPill({ icon, value, label }) {
  return (
    <View style={s.statPill}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function SecHead({ title, sub }) {
  return (
    <View style={s.secHead}>
      <View style={{ flex: 1 }}>
        <Text style={s.secTitle}>{title}</Text>
        {sub ? <Text style={s.secSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function DarkCard({ children, style }) {
  return <View style={[s.darkCard, style]}>{children}</View>;
}

function GridCard({ item, onPress, favs, onToggleFav }) {
  const isFav = favs.includes(item.id);
  const uri = getImageUri(item);

  return (
    <TouchableOpacity style={s.gridCard} onPress={() => onPress?.(item)} activeOpacity={0.85}>
      <View style={s.gridImg}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={s.gridImgEmpty}>
            <Text style={{ fontSize: 26 }}>☕</Text>
          </View>
        )}
        <View style={s.gridImgGradient} />
        <TouchableOpacity style={s.gridFav} onPress={() => onToggleFav?.(item)}>
          <Ionicons
            name={isFav ? 'star' : 'star-outline'}
            size={13}
            color={isFav ? GOLD : 'rgba(255,255,255,0.6)'}
          />
        </TouchableOpacity>
        {item.puntuacion ? (
          <View style={s.gridBadge}>
            <Text style={s.gridBadgeText}>{Number(item.puntuacion).toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
      <View style={s.gridInfo}>
        {item.marca || item.roaster ? (
          <Text style={s.gridBrand} numberOfLines={1}>
            {item.marca || item.roaster}
          </Text>
        ) : null}
        <Text style={s.gridName} numberOfLines={2}>
          {item.nombre}
        </Text>
        {item.pais || item.origen ? (
          <Text style={s.gridMeta} numberOfLines={1}>
            {item.pais || item.origen}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function computeProfile(favCafes) {
  if (!favCafes.length) return null;
  const specialty = favCafes.filter(
    (c) => c.coffeeCategory === 'specialty' || (!c.coffeeCategory && !c.category)
  ).length;
  const origins = {};
  const processes = {};
  favCafes.forEach((c) => {
    const o = c.pais || c.origen;
    if (o) origins[o] = (origins[o] || 0) + 1;
    const p = c.proceso;
    if (p) processes[p] = (processes[p] || 0) + 1;
  });
  return {
    specialtyPct: Math.round((specialty / favCafes.length) * 100),
    dailyPct: Math.round(((favCafes.length - specialty) / favCafes.length) * 100),
    topOrigins: Object.entries(origins)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k),
    topProcesses: Object.entries(processes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k),
  };
}

function TasteProfile({ favCafes, recs, setCafeDetalle }) {
  const profile = useMemo(() => computeProfile(favCafes), [favCafes]);
  if (!profile) return null;

  return (
    <DarkCard style={s.tasteCard}>
      <View style={s.tasteHeader}>
        <View style={s.tasteIconCircle}>
          <Text style={{ fontSize: 15, color: GOLD }}>✦</Text>
        </View>
        <View>
          <Text style={s.tasteTitle}>Tu perfil de sabor</Text>
          <Text style={s.tasteSub}>Calculado con {favCafes.length} favoritos</Text>
        </View>
      </View>

      <View style={s.tasteBars}>
        <View style={s.tasteBarRow}>
          <Text style={s.tasteBarLabel}>ESPECIALIDAD</Text>
          <View style={s.tasteBarTrack}>
            <View
              style={[s.tasteBarFill, { width: `${profile.specialtyPct}%`, backgroundColor: GOLD }]}
            />
          </View>
          <Text style={[s.tasteBarPct, { color: GOLD }]}>{profile.specialtyPct}%</Text>
        </View>
        <View style={s.tasteBarRow}>
          <Text style={s.tasteBarLabel}>CAFÉ DIARIO</Text>
          <View style={s.tasteBarTrack}>
            <View
              style={[
                s.tasteBarFill,
                { width: `${profile.dailyPct}%`, backgroundColor: '#7aaedc' },
              ]}
            />
          </View>
          <Text style={[s.tasteBarPct, { color: '#7aaedc' }]}>{profile.dailyPct}%</Text>
        </View>
      </View>

      <View style={s.tasteDivider} />

      <View style={s.tasteTags}>
        {profile.topOrigins.length > 0 && (
          <View>
            <Text style={s.tasteTagLabel}>🌍 ORÍGENES FAVORITOS</Text>
            <View style={s.tasteTagRow}>
              {profile.topOrigins.map((o) => (
                <View key={o} style={s.tasteTag}>
                  <Text style={s.tasteTagText}>{o}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {profile.topProcesses.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={s.tasteTagLabel}>⚙️ PROCESOS PREFERIDOS</Text>
            <View style={s.tasteTagRow}>
              {profile.topProcesses.map((p) => (
                <View key={p} style={[s.tasteTag, s.tasteTagBlue]}>
                  <Text style={[s.tasteTagText, { color: '#9dc8e8' }]}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {recs.length > 0 && (
        <View>
          <View style={s.tasteDivider} />
          <View style={s.tasteRecs}>
            <Text style={s.tasteTagLabel}>✦ SELECCIONADOS PARA TI</Text>
            <View style={s.tasteRecsRow}>
              {recs.slice(0, 3).map((item, idx) => {
                const uri = getImageUri(item);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={s.tasteRecCard}
                    onPress={() => setCafeDetalle({ cafes: recs, cafeIndex: idx })}
                    activeOpacity={0.82}
                  >
                    <View style={s.tasteRecImg}>
                      {uri ? (
                        <Image
                          source={{ uri }}
                          style={StyleSheet.absoluteFill}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ fontSize: 20, textAlign: 'center', color: MUTED }}>☕</Text>
                      )}
                      <View style={s.tasteRecScore}>
                        <Text style={s.tasteRecScoreText}>
                          {Number(item.puntuacion || 0).toFixed(1)}
                        </Text>
                      </View>
                    </View>
                    <Text style={s.tasteRecBrand} numberOfLines={1}>
                      {item.marca || item.roaster || ''}
                    </Text>
                    <Text style={s.tasteRecName} numberOfLines={2}>
                      {item.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </DarkCard>
  );
}

export default function MisCafesTab({
  s: ext,
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

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.pageTitle}>Mi espacio</Text>
        <View style={s.statsRow}>
          <StatPill icon="☕" value={misCafes.length} label="colección" />
          <View style={s.statDivider} />
          <StatPill icon="⭐" value={favCafes.length} label="favoritos" />
          <View style={s.statDivider} />
          <StatPill icon="📓" value={totalCatas} label="catas" />
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <SearchInput
          value={busquedaMis}
          onChangeText={setBusquedaMis}
          onSearch={setBusquedaMis}
          allCafes={suggestionSource}
          placeholder="Buscar cafés, marcas, países..."
        />
      </View>

      {/* Resultados búsqueda */}
      {hasQuery && (
        <DarkCard style={s.section}>
          <SecHead
            title={`${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''}`}
            sub={`"${query}"`}
          />
          {searchResults.length > 0 ? (
            <View style={s.grid}>
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
        </DarkCard>
      )}

      {/* Quiz */}
      {!hasQuery && !cargando && (
        <DarkCard style={[s.section, s.lightInner]}>
          <QuizSection {...quizSectionProps} />
        </DarkCard>
      )}

      {/* Favoritos */}
      {!hasQuery && favCafes.length > 0 && (
        <DarkCard style={s.section}>
          <SecHead title="Tus favoritos" sub={`${favCafes.length} cafés guardados`} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.hScroll}
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
        </DarkCard>
      )}

      {/* Perfil de sabor */}
      {!hasQuery && !cargando && favCafes.length > 0 && (
        <View style={s.section}>
          <TasteProfile
            favCafes={favCafes}
            recs={personalizedFeed?.items || []}
            setCafeDetalle={setCafeDetalle}
          />
        </View>
      )}

      {/* Diario de catas */}
      {!hasQuery && notebook && (
        <DarkCard style={[s.section, s.lightInner]}>
          <DiarioCatasSection
            s={ext}
            theme={theme}
            premiumAccent={premiumAccent || PREMIUM_ACCENT}
            catas={notebook.catas || []}
            catasFiltradas={notebook.catasFiltradas || []}
            stats={notebook.stats || { totalCatas: 0, promedioPuntuacion: 0, cafesProbados: 0 }}
            filtroPeriodo={notebook.filtroPeriodo}
            setFiltroPeriodo={notebook.setFiltroPeriodo}
            irAbrirModal={notebook.irAbrirModal}
            irAbrirDetail={notebook.irAbrirDetail}
          />
        </DarkCard>
      )}

      {/* Mi colección */}
      {!hasQuery && (
        <DarkCard style={s.section}>
          <SecHead
            title="Mi colección"
            sub={
              misCafes.length > 0
                ? `${misCafes.length} café${misCafes.length !== 1 ? 's' : ''} añadido${misCafes.length !== 1 ? 's' : ''}`
                : null
            }
          />
          {cargando ? (
            <ActivityIndicator color={GOLD} style={{ marginVertical: 32 }} />
          ) : cafesFiltrados.length > 0 ? (
            <View style={s.grid}>
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
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>☕</Text>
              <Text style={s.emptyTitle}>Tu colección está vacía</Text>
              <Text style={s.emptyText}>
                Escanea o añade cafés para empezar tu archivo personal
              </Text>
            </View>
          )}
        </DarkCard>
      )}

      <View style={{ height: 48 }} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    backgroundColor: BG,
    minHeight: '100%',
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: WARM,
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statPill: { flex: 1, alignItems: 'center', gap: 2 },
  statIcon: { fontSize: 17, marginBottom: 1 },
  statValue: { fontSize: 20, fontWeight: '800', color: GOLD, lineHeight: 24 },
  statLabel: {
    fontSize: 10,
    color: MUTED,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: { width: 1, height: 36, backgroundColor: GOLD_BORDER },

  searchWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },

  section: { marginHorizontal: 16, marginTop: 16 },

  darkCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    padding: 16,
    overflow: 'hidden',
  },
  lightInner: { padding: 0 },

  secHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  secTitle: { fontSize: 16, fontWeight: '800', color: WARM, letterSpacing: 0.2 },
  secSub: { fontSize: 11, color: MUTED, marginTop: 2 },

  hScroll: { paddingRight: 4, gap: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  gridCard: {
    width: CARD_W,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: CARD_LIGHT,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  gridImg: { width: '100%', height: CARD_W * 1.1, backgroundColor: '#1a0c04' },
  gridImgEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f1008',
  },
  gridImgGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: 'rgba(12,6,2,0.5)',
  },
  gridFav: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBadge: {
    position: 'absolute',
    bottom: 7,
    left: 7,
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gridBadgeText: { color: '#1a0c04', fontSize: 10, fontWeight: '800' },
  gridInfo: { padding: 9 },
  gridBrand: {
    fontSize: 9,
    fontWeight: '700',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  gridName: { fontSize: 12, fontWeight: '800', color: WARM, lineHeight: 16 },
  gridMeta: { fontSize: 10, color: MUTED, marginTop: 3 },

  emptyWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: WARM,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18 },
  empty: { color: MUTED, textAlign: 'center', marginVertical: 24, fontSize: 13 },

  // Taste profile
  tasteCard: { backgroundColor: '#1a0e07', borderColor: GOLD_BORDER },
  tasteHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  tasteIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GOLD_DIM,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tasteTitle: { fontSize: 16, fontWeight: '800', color: WARM },
  tasteSub: { fontSize: 11, color: MUTED, marginTop: 1 },
  tasteBars: { gap: 10, marginBottom: 14 },
  tasteBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tasteBarLabel: { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 0.7, width: 88 },
  tasteBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  tasteBarFill: { height: '100%', borderRadius: 3 },
  tasteBarPct: { fontSize: 12, fontWeight: '800', width: 34, textAlign: 'right' },
  tasteDivider: { height: 1, backgroundColor: DIVIDER, marginVertical: 4 },
  tasteTags: { paddingVertical: 12 },
  tasteTagLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  tasteTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tasteTag: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: GOLD_DIM,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  tasteTagBlue: {
    backgroundColor: 'rgba(122,174,220,0.1)',
    borderColor: 'rgba(122,174,220,0.22)',
  },
  tasteTagText: { fontSize: 11, fontWeight: '700', color: GOLD },
  tasteRecs: { paddingTop: 12 },
  tasteRecsRow: { flexDirection: 'row', gap: 10 },
  tasteRecCard: { flex: 1 },
  tasteRecImg: {
    width: '100%',
    aspectRatio: 0.9,
    borderRadius: 11,
    backgroundColor: '#231209',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  tasteRecScore: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: GOLD,
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  tasteRecScoreText: { fontSize: 9, fontWeight: '800', color: '#1a0c04' },
  tasteRecBrand: {
    fontSize: 9,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  tasteRecName: { fontSize: 11, fontWeight: '800', color: WARM, lineHeight: 14 },
});
