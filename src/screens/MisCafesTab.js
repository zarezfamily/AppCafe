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
import CollapsibleSectionHeader from '../components/CollapsibleSectionHeader';
import { PREMIUM_ACCENT } from '../constants/theme';
import { normalize } from '../core/utils';
import { getPersonalizedCoffeeFeed } from '../domain/coffee/personalizedCoffee';
import useCollapsibleSections from '../hooks/useCollapsibleSections';
import QuizSection from './QuizSection';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = 10;
const GRID_PADDING = 16;
const CARD_W = (SCREEN_W - GRID_PADDING * 2 - GRID_GAP) / 2;

// Paleta crema premium (consistente con Inicio)
const BG = '#fffdf9';
const CARD_BG = '#fffaf5';
const CARD_BORDER = '#eadbce';
const ACCENT = '#8f5e3b';
const ACCENT_LIGHT = '#f4e8db';
const TEXT_DARK = '#24160f';
const _TEXT_MID = '#6f5a4b';
const TEXT_MUTED = '#9e7c62';

// Paleta oscura para el widget destacado
const DARK_BG = '#1a0e07';
const GOLD = '#c8a97c';
const GOLD_DIM = 'rgba(200,169,124,0.14)';
const GOLD_BORDER = 'rgba(200,169,124,0.22)';
const WARM = '#f0dcc8';
const MUTED = '#7a5c42';

function getImageUri(item) {
  return item.bestPhoto || item.officialPhoto || item.foto || item.image || null;
}

// ─── Componentes UI ──────────────────────────────────────────────────────────

function Section({ children, style }) {
  return <View style={[styles.sectionCard, style]}>{children}</View>;
}

function SecHead({ title, sub, right }) {
  return (
    <View style={styles.secHead}>
      <View style={{ flex: 1 }}>
        <Text style={styles.secTitle}>{title}</Text>
        {sub ? <Text style={styles.secSub}>{sub}</Text> : null}
      </View>
      {right || null}
    </View>
  );
}

function StatStrip({ misCafes, favCafes, totalCatas }) {
  return (
    <View style={styles.statsStrip}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{misCafes}</Text>
        <Text style={styles.statLabel}>colección</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{favCafes}</Text>
        <Text style={styles.statLabel}>favoritos</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{totalCatas}</Text>
        <Text style={styles.statLabel}>catas</Text>
      </View>
    </View>
  );
}

function GridCard({ item, onPress, favs, onToggleFav }) {
  const isFav = favs.includes(item.id);
  const uri = getImageUri(item);

  // Mostrar solo marca, nombre, país/origen y SCA si existe
  return (
    <TouchableOpacity style={styles.gridCard} onPress={() => onPress?.(item)} activeOpacity={0.85}>
      <View style={styles.gridImg}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={styles.gridImgEmpty}>
            <Text style={{ fontSize: 26 }}>☕</Text>
          </View>
        )}
        <TouchableOpacity style={styles.gridFav} onPress={() => onToggleFav?.(item)}>
          <Ionicons
            name={isFav ? 'star' : 'star-outline'}
            size={13}
            color={isFav ? PREMIUM_ACCENT : 'rgba(255,255,255,0.7)'}
          />
        </TouchableOpacity>
        {item.sca || (item.sca && typeof item.sca === 'object' && item.sca.score) ? (
          <View style={styles.gridBadge}>
            <Text style={styles.gridBadgeText}>
              {typeof item.sca === 'object'
                ? Number(item.sca.score).toFixed(1)
                : Number(item.sca).toFixed(1)}
            </Text>
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

// ─── Widget oscuro: Perfil de sabor ─────────────────────────────────────────

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
    <View style={styles.tasteWrap}>
      {/* Eyebrow */}
      <View style={styles.tasteEyebrow}>
        <View style={styles.tasteEyebrowLine} />
        <Text style={styles.tasteEyebrowText}>TU PERFIL DE SABOR</Text>
        <View style={styles.tasteEyebrowLine} />
      </View>

      <View style={styles.tasteCard}>
        {/* Barras */}
        <View style={styles.tasteBars}>
          <View style={styles.tasteBarRow}>
            <Text style={styles.tasteBarLabel}>ESPECIALIDAD</Text>
            <View style={styles.tasteBarTrack}>
              <View
                style={[
                  styles.tasteBarFill,
                  { width: `${profile.specialtyPct}%`, backgroundColor: GOLD },
                ]}
              />
            </View>
            <Text style={[styles.tasteBarPct, { color: GOLD }]}>{profile.specialtyPct}%</Text>
          </View>
          <View style={styles.tasteBarRow}>
            <Text style={styles.tasteBarLabel}>CAFÉ DIARIO</Text>
            <View style={styles.tasteBarTrack}>
              <View
                style={[
                  styles.tasteBarFill,
                  { width: `${profile.dailyPct}%`, backgroundColor: '#7aaedc' },
                ]}
              />
            </View>
            <Text style={[styles.tasteBarPct, { color: '#7aaedc' }]}>{profile.dailyPct}%</Text>
          </View>
        </View>

        <View style={styles.tasteDivider} />

        {/* Tags */}
        <View style={styles.tasteTags}>
          {profile.topOrigins.length > 0 && (
            <View>
              <Text style={styles.tasteTagLabel}>🌍 ORÍGENES</Text>
              <View style={styles.tasteTagRow}>
                {profile.topOrigins.map((o) => (
                  <View key={o} style={styles.tasteTag}>
                    <Text style={styles.tasteTagText}>{o}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {profile.topProcesses.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.tasteTagLabel}>⚙️ PROCESOS</Text>
              <View style={styles.tasteTagRow}>
                {profile.topProcesses.map((p) => (
                  <View key={p} style={[styles.tasteTag, styles.tasteTagBlue]}>
                    <Text style={[styles.tasteTagText, { color: '#9dc8e8' }]}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Recomendaciones */}
        {recs.length > 0 && (
          <View>
            <View style={styles.tasteDivider} />
            <Text style={[styles.tasteTagLabel, { paddingTop: 12 }]}>✦ SELECCIONADOS PARA TI</Text>
            <View style={styles.tasteRecsRow}>
              {recs.slice(0, 3).map((item, idx) => {
                const uri = getImageUri(item);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.tasteRecCard}
                    onPress={() => setCafeDetalle({ cafes: recs, cafeIndex: idx })}
                    activeOpacity={0.82}
                  >
                    <View style={styles.tasteRecImg}>
                      {uri ? (
                        <Image
                          source={{ uri }}
                          style={StyleSheet.absoluteFill}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ fontSize: 18, textAlign: 'center', color: MUTED }}>☕</Text>
                      )}
                      <View style={styles.tasteRecScore}>
                        <Text style={styles.tasteRecScoreText}>
                          {Number(item.puntuacion || 0).toFixed(1)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.tasteRecBrand} numberOfLines={1}>
                      {item.marca || item.roaster || ''}
                    </Text>
                    <Text style={styles.tasteRecName} numberOfLines={2}>
                      {item.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

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
  eliminarCafe: _eliminarCafe,
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

  const { isCollapsed, toggle } = useCollapsibleSections(['favoritos', 'diario', 'coleccion']);

  const renderContent = () => {
    if (hasQuery) {
      return (
        <Section>
          <SecHead
            title={`${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''}`}
            sub={`"${query}"`}
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
            <Text style={styles.empty}>Sin resultados para "{query}"</Text>
          )}
        </Section>
      );
    }

    return (
      <View>
        {!cargando ? (
          <View style={[styles.sectionCard, { padding: 0, overflow: 'hidden' }]}>
            <QuizSection {...quizSectionProps} />
          </View>
        ) : null}

        {favCafes.length > 0 ? (
          <Section>
            <View style={{ position: 'relative' }}>
              <SecHead title="⭐  Tus favoritos" sub={`${favCafes.length} cafés guardados`} />
              <CollapsibleSectionHeader
                collapsed={isCollapsed('favoritos')}
                onToggle={() => toggle('favoritos')}
              />
            </View>
            {isCollapsed('favoritos') ? null : (
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
            )}
          </Section>
        ) : null}

        {!cargando && favCafes.length > 0 ? (
          <View style={styles.tasteOuter}>
            <TasteProfile
              favCafes={favCafes}
              recs={personalizedFeed?.items || []}
              setCafeDetalle={setCafeDetalle}
            />
          </View>
        ) : null}

        {notebook ? (
          <View style={[styles.sectionCard, { padding: 0, overflow: 'hidden' }]}>
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
              collapsed={isCollapsed('diario')}
              onToggle={() => toggle('diario')}
            />
          </View>
        ) : null}

        <Section>
          <View style={{ position: 'relative' }}>
            <SecHead
              title="Mi colección"
              sub={
                misCafes.length > 0
                  ? `${misCafes.length} café${misCafes.length !== 1 ? 's' : ''} añadido${misCafes.length !== 1 ? 's' : ''}`
                  : null
              }
            />
            <CollapsibleSectionHeader
              collapsed={isCollapsed('coleccion')}
              onToggle={() => toggle('coleccion')}
            />
          </View>
          {isCollapsed('coleccion') ? null : (
            <>
              {cargando ? (
                <ActivityIndicator color={ACCENT} style={{ marginVertical: 32 }} />
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
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyIcon}>☕</Text>
                  <Text style={styles.emptyTitle}>Tu colección está vacía</Text>
                  <Text style={styles.emptyText}>
                    Escanea o añade cafés para empezar tu archivo personal
                  </Text>
                </View>
              )}
            </>
          )}
        </Section>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Mi espacio</Text>
        <StatStrip misCafes={misCafes.length} favCafes={favCafes.length} totalCatas={totalCatas} />
      </View>

      <View style={styles.searchWrap}>
        <SearchInput
          value={busquedaMis}
          onChangeText={setBusquedaMis}
          onSearch={setBusquedaMis}
          allCafes={suggestionSource}
          placeholder="Buscar cafés, marcas, países..."
        />
      </View>

      {renderContent()}

      <View style={{ height: 48 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: BG },

  header: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: TEXT_DARK, marginBottom: 14 },

  // Stats
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: ACCENT },
  statLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: { width: 1, height: 32, backgroundColor: CARD_BORDER },

  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },

  // Secciones
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: CARD_BG,
    padding: 16,
  },
  secHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  secTitle: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  secSub: { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },

  hScroll: { paddingRight: 4, gap: 12 },

  // Grid colección
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  gridCard: {
    width: CARD_W,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  gridImg: { width: '100%', height: CARD_W * 1.1, backgroundColor: ACCENT_LIGHT },
  gridImgEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5ede3',
  },
  gridFav: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBadge: {
    position: 'absolute',
    bottom: 7,
    left: 7,
    backgroundColor: PREMIUM_ACCENT,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gridBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  gridInfo: { padding: 9, backgroundColor: '#fff' },
  gridBrand: {
    fontSize: 9,
    fontWeight: '700',
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  gridName: { fontSize: 12, fontWeight: '800', color: TEXT_DARK, lineHeight: 16 },
  gridMeta: { fontSize: 10, color: TEXT_MUTED, marginTop: 3 },

  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  empty: { color: TEXT_MUTED, textAlign: 'center', marginVertical: 24, fontSize: 13 },

  // Taste profile (widget oscuro)
  tasteOuter: { marginHorizontal: 16, marginTop: 16 },
  tasteEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  tasteEyebrowLine: { flex: 1, height: 1, backgroundColor: CARD_BORDER },
  tasteEyebrowText: { fontSize: 10, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 1 },
  tasteWrap: {},
  tasteCard: {
    backgroundColor: DARK_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    padding: 16,
  },
  tasteBars: { gap: 10 },
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
  tasteDivider: { height: 1, backgroundColor: 'rgba(200,169,124,0.12)', marginVertical: 4 },
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
  tasteTagBlue: { backgroundColor: 'rgba(122,174,220,0.1)', borderColor: 'rgba(122,174,220,0.22)' },
  tasteTagText: { fontSize: 11, fontWeight: '700', color: GOLD },
  tasteRecsRow: { flexDirection: 'row', gap: 10, paddingTop: 10 },
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
