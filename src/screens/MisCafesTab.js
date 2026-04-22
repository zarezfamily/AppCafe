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

      {/* Para ti */}
      {!hasQuery && !cargando && personalizedFeed?.items?.length > 0 && (
        <View style={styles.section}>
          <SectionTitle
            title={personalizedFeed.title || 'Para ti'}
            subtitle={personalizedFeed.subtitle || 'Basado en lo que ya te gusta'}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {personalizedFeed.items.slice(0, 12).map((item, idx) => (
              <CardHorizontal
                key={`pt-${item.id}`}
                item={item}
                badge="Para ti"
                recommendationText={item.recommendationReason || ''}
                onPress={() => setCafeDetalle({ cafes: personalizedFeed.items, cafeIndex: idx })}
                favs={favs}
                onToggleFav={toggleFav}
              />
            ))}
          </ScrollView>
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
