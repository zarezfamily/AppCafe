import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SkeletonVerticalList } from '../components/SkeletonLoader';
import { MAIN_TABS } from './mainScreenTabs';

function buildRankedOptions(items, field) {
  const counts = new Map();

  (items || []).forEach((item) => {
    const value = String(item?.[field] || '').trim();
    if (!value) return;
    const key = value.toLowerCase();
    const existing = counts.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        label: value,
        count: 1,
      });
    }
  });

  return [...counts.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label, 'es');
  });
}

function normalizeCategory(item) {
  const c = item?.coffeeCategory;
  if (c === 'daily') return 'daily';
  if (c === 'commercial') return 'commercial';
  return 'specialty';
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function matchesSearch(item, query) {
  const q = normalizeText(query);
  if (!q) return true;

  const haystack = [
    item?.nombre,
    item?.marca,
    item?.roaster,
    item?.origen,
    item?.pais,
    item?.proceso,
    item?.notas,
    item?.descripcion,
    item?.certificaciones,
    item?.coffeeCategory === 'daily' ? 'diario' : 'especialidad',
    item?.isBio ? 'bio' : '',
  ]
    .map(normalizeText)
    .join(' ');

  return haystack.includes(q);
}

function FilterChip({ label, active, onPress, accentColor, count }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? accentColor : '#e2d5c8',
        backgroundColor: active ? '#f3e7d9' : '#faf7f2',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '800',
          color: active ? accentColor : '#6f5a4b',
        }}
      >
        {label}
      </Text>

      {typeof count === 'number' && (
        <View
          style={{
            minWidth: 18,
            height: 18,
            borderRadius: 999,
            paddingHorizontal: 5,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: active ? '#e6d1bc' : '#f1e6da',
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '900',
              color: active ? accentColor : '#8b6d57',
            }}
          >
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function SearchBox({ value, onChangeText, onClear, placeholder }) {
  return (
    <View
      style={{
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#eadbce',
        backgroundColor: '#faf7f2',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <Ionicons name="search" size={18} color="#8f5e3b" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9b8573"
        style={{
          flex: 1,
          fontSize: 14,
          color: '#24160f',
          paddingVertical: 0,
        }}
      />
      {!!value && (
        <TouchableOpacity onPress={onClear}>
          <Ionicons name="close-circle" size={18} color="#8f5e3b" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function ActiveFilterChip({ label, onRemove, accentColor }) {
  return (
    <TouchableOpacity
      onPress={onRemove}
      activeOpacity={0.88}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#dcc5af',
        backgroundColor: '#f5ebdf',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '800', color: accentColor }}>{label}</Text>
      <Ionicons name="close" size={14} color={accentColor} />
    </TouchableOpacity>
  );
}

function MatchBadge({ label }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: '#f3e7d9',
        borderWidth: 1,
        borderColor: '#eadbce',
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '800',
          color: '#8f5e3b',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function FilterSection({ title, options, selected, onSelect, accentColor }) {
  if (!options?.length) return null;

  return (
    <View style={{ marginTop: 14 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '800',
          color: '#8f5e3b',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {title}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 8, gap: 8 }}
      >
        <FilterChip
          label="Todos"
          active={!selected}
          onPress={() => onSelect(null)}
          accentColor={accentColor}
        />

        {options.map((option) => (
          <FilterChip
            key={option.label}
            label={option.label}
            count={option.count}
            active={selected === option.label}
            onPress={() => onSelect(option.label)}
            accentColor={accentColor}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function SortSection({ sortBy, setSortBy, accentColor }) {
  const options = [
    { id: 'trending', label: 'Trending' },
    { id: 'rating', label: 'Puntuación' },
    { id: 'votes', label: 'Votos' },
    { id: 'recent', label: 'Recientes' },
  ];

  return (
    <View style={{ marginTop: 14 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '800',
          color: '#8f5e3b',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        Ordenar por
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 8, gap: 8 }}
      >
        {options.map((option) => (
          <FilterChip
            key={option.id}
            label={option.label}
            active={sortBy === option.id}
            onPress={() => setSortBy(option.id)}
            accentColor={accentColor}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function parseDateValue(value) {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getStableTrendingScore(item) {
  const score = Number(item?.trendingScore || 0);
  const votos = Number(item?.votos || 0);
  const puntuacion = Number(item?.puntuacion || 0);

  return score + Math.min(votos, 20) * 0.15 + puntuacion * 0.05;
}

function hasMinimumTrendingSignals(item) {
  return Number(item?.votos || 0) >= 2 || Number(item?.trendingScore || 0) >= 8;
}

export default function TrendingTab({
  s,
  setActiveTab,
  premiumAccent,
  cargando,
  trendingCafes,
  trendingFilters,
  setTrendingFilters,
  CardVertical,
  setCafeDetalle,
  favs,
  toggleFav,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
}) {
  const [paisSeleccionado, setPaisSeleccionado] = useState(null);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState(null);
  const [roasterSeleccionado, setRoasterSeleccionado] = useState(null);
  const [categorySelected, setCategorySelected] = useState('specialty');
  const [sortBy, setSortBy] = useState('trending');

  useEffect(() => {
    if (!trendingFilters) return;
    setPaisSeleccionado(trendingFilters.pais || null);
    setProcesoSeleccionado(trendingFilters.proceso || null);
    setRoasterSeleccionado(trendingFilters.roaster || null);
  }, [trendingFilters]);

  useEffect(() => {
    setTrendingFilters?.({
      pais: paisSeleccionado,
      proceso: procesoSeleccionado,
      roaster: roasterSeleccionado,
    });
  }, [paisSeleccionado, procesoSeleccionado, roasterSeleccionado, setTrendingFilters]);

  const cafesBase = useMemo(() => {
    return (trendingCafes || [])
      .filter((item) => normalizeCategory(item) === categorySelected)
      .filter((item) => matchesSearch(item, searchQuery));
  }, [trendingCafes, categorySelected, searchQuery]);

  const paises = useMemo(() => buildRankedOptions(cafesBase, 'pais'), [cafesBase]);
  const procesos = useMemo(() => buildRankedOptions(cafesBase, 'proceso'), [cafesBase]);
  const roasters = useMemo(() => buildRankedOptions(cafesBase, 'roaster'), [cafesBase]);

  const itemsFiltrados = useMemo(() => {
    const base = cafesBase.filter((item) => {
      const okPais =
        !paisSeleccionado || normalizeText(item?.pais) === normalizeText(paisSeleccionado);

      const okProceso =
        !procesoSeleccionado || normalizeText(item?.proceso) === normalizeText(procesoSeleccionado);

      const okRoaster =
        !roasterSeleccionado || normalizeText(item?.roaster) === normalizeText(roasterSeleccionado);

      return okPais && okProceso && okRoaster;
    });

    const filteredBase =
      sortBy === 'trending' ? base.filter((item) => hasMinimumTrendingSignals(item)) : base;

    return [...filteredBase]
      .sort((a, b) => {
        if (sortBy === 'rating') {
          const ratingDiff = Number(b?.puntuacion || 0) - Number(a?.puntuacion || 0);
          if (ratingDiff !== 0) return ratingDiff;
          return Number(b?.votos || 0) - Number(a?.votos || 0);
        }

        if (sortBy === 'votes') {
          const votesDiff = Number(b?.votos || 0) - Number(a?.votos || 0);
          if (votesDiff !== 0) return votesDiff;
          return Number(b?.puntuacion || 0) - Number(a?.puntuacion || 0);
        }

        if (sortBy === 'recent') {
          const recentDiff = parseDateValue(b?.fecha) - parseDateValue(a?.fecha);
          if (recentDiff !== 0) return recentDiff;
          return Number(b?.trendingScore || 0) - Number(a?.trendingScore || 0);
        }

        const trendingDiff = getStableTrendingScore(b) - getStableTrendingScore(a);
        if (trendingDiff !== 0) return trendingDiff;

        const votesDiff = Number(b?.votos || 0) - Number(a?.votos || 0);
        if (votesDiff !== 0) return votesDiff;

        return Number(b?.puntuacion || 0) - Number(a?.puntuacion || 0);
      })
      .slice(0, 50);
  }, [cafesBase, paisSeleccionado, procesoSeleccionado, roasterSeleccionado, sortBy]);

  const filtrosActivos = [paisSeleccionado, procesoSeleccionado, roasterSeleccionado].filter(
    Boolean
  ).length;

  const topDestacado = itemsFiltrados?.[0] || null;
  const top10 = itemsFiltrados.slice(0, 10);
  const screenWidth = Dimensions.get('window').width;
  const heroCafe = top10?.[0] || null;
  const rankingRest = top10.slice(1);

  const topPaisBase = useMemo(() => {
    const first = buildRankedOptions(cafesBase, 'pais')[0];
    return first?.label || null;
  }, [cafesBase]);

  const topProcesoBase = useMemo(() => {
    const first = buildRankedOptions(cafesBase, 'proceso')[0];
    return first?.label || null;
  }, [cafesBase]);

  const topRoasterBase = useMemo(() => {
    const first = buildRankedOptions(cafesBase, 'roaster')[0];
    return first?.label || null;
  }, [cafesBase]);

  const buildMatchReasons = (item) => {
    const reasons = [];
    if (topPaisBase && normalizeText(item?.pais) === normalizeText(topPaisBase)) {
      reasons.push('Top país');
    }
    if (topProcesoBase && normalizeText(item?.proceso) === normalizeText(topProcesoBase)) {
      reasons.push('Top proceso');
    }
    if (topRoasterBase && normalizeText(item?.roaster) === normalizeText(topRoasterBase)) {
      reasons.push('Top tostador');
    }
    if (Number(item?.trendingScore || 0) >= 8) reasons.push('Alta tracción');
    if (Number(item?.votos || 0) >= 10) reasons.push('Muy votado');
    return reasons.slice(0, 3);
  };

  const clearFilters = () => {
    setPaisSeleccionado(null);
    setProcesoSeleccionado(null);
    setRoasterSeleccionado(null);
  };

  const categoryLabel = categorySelected === 'daily' ? 'Café diario' : 'Especialidad';
  const clearSearch = () => {
    if (typeof onSearchQueryChange === 'function') {
      onSearchQueryChange('');
    }
  };

  return (
    <View style={{ paddingTop: 20 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <TouchableOpacity onPress={() => setActiveTab(MAIN_TABS.HOME)} style={s.backRow}>
          <Ionicons name="chevron-back" size={20} color={premiumAccent} />
          <Text style={s.backText}>Volver</Text>
        </TouchableOpacity>

        <Text style={s.pageTitle}>Trending ahora</Text>

        <View
          style={{
            marginTop: 14,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: '#eadbce',
            backgroundColor: '#faf7f2',
            padding: 14,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: '#8f5e3b',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            ETIOVE TRENDING
          </Text>

          <Text
            style={{
              fontSize: 13,
              lineHeight: 19,
              color: '#6f5a4b',
            }}
          >
            Los cafés que mejor combinan tracción real, votos y valoración, evitando tops falsos con
            muy poca base.
          </Text>

          <SearchBox
            value={searchQuery || ''}
            onChangeText={onSearchQueryChange}
            onClear={clearSearch}
            placeholder={searchPlaceholder || 'Buscar en trending...'}
          />

          <View
            style={{
              marginTop: 12,
              flexDirection: 'row',
              gap: 10,
            }}
          >
            <FilterChip
              label="Especialidad"
              active={categorySelected === 'specialty'}
              onPress={() => {
                setCategorySelected('specialty');
                clearFilters();
              }}
              accentColor={premiumAccent}
            />
            <FilterChip
              label="Café diario"
              active={categorySelected === 'daily'}
              onPress={() => {
                setCategorySelected('daily');
                clearFilters();
              }}
              accentColor={premiumAccent}
            />
          </View>

          <View
            style={{
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: '#7d6a5a',
                fontWeight: '700',
              }}
            >
              {itemsFiltrados.length} cafés visibles
            </Text>

            <View
              style={{
                borderRadius: 999,
                backgroundColor: '#f3e7d9',
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: '#8f5e3b',
                  fontWeight: '800',
                }}
              >
                {categoryLabel}
              </Text>
            </View>
          </View>
        </View>

        <SortSection sortBy={sortBy} setSortBy={setSortBy} accentColor={premiumAccent} />

        <FilterSection
          title="País"
          options={paises}
          selected={paisSeleccionado}
          onSelect={setPaisSeleccionado}
          accentColor={premiumAccent}
        />

        <FilterSection
          title="Proceso"
          options={procesos}
          selected={procesoSeleccionado}
          onSelect={setProcesoSeleccionado}
          accentColor={premiumAccent}
        />

        <FilterSection
          title="Tostador"
          options={roasters}
          selected={roasterSeleccionado}
          onSelect={setRoasterSeleccionado}
          accentColor={premiumAccent}
        />

        {filtrosActivos > 0 && (
          <TouchableOpacity onPress={clearFilters} style={{ marginTop: 10 }}>
            <Text style={{ color: premiumAccent, fontWeight: '800' }}>Limpiar filtros</Text>
          </TouchableOpacity>
        )}

        {filtrosActivos > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#8f5e3b',
                marginBottom: 8,
              }}
            >
              Filtros activos
            </Text>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {!!paisSeleccionado && (
                <ActiveFilterChip
                  label={`País: ${paisSeleccionado}`}
                  accentColor={premiumAccent}
                  onRemove={() => setPaisSeleccionado(null)}
                />
              )}

              {!!procesoSeleccionado && (
                <ActiveFilterChip
                  label={`Proceso: ${procesoSeleccionado}`}
                  accentColor={premiumAccent}
                  onRemove={() => setProcesoSeleccionado(null)}
                />
              )}

              {!!roasterSeleccionado && (
                <ActiveFilterChip
                  label={`Tostador: ${roasterSeleccionado}`}
                  accentColor={premiumAccent}
                  onRemove={() => setRoasterSeleccionado(null)}
                />
              )}
            </View>
          </View>
        )}
      </View>

      {cargando ? (
        <SkeletonVerticalList />
      ) : (
        <View style={{ marginTop: 16 }}>
          {!!top10.length && (
            <View style={{ marginBottom: 22 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '900',
                  color: '#8f5e3b',
                  paddingHorizontal: 16,
                  marginBottom: 12,
                  letterSpacing: 1,
                }}
              >
                🔥 TOP 10 ETIOVE
              </Text>

              {!!heroCafe && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    const index = top10.findIndex((c) => c.id === heroCafe.id);
                    setCafeDetalle({ cafes: top10, cafeIndex: index });
                  }}
                  style={{
                    marginHorizontal: 16,
                    marginBottom: 14,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: '#eadbce',
                    backgroundColor: '#fffaf5',
                    padding: 18,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      backgroundColor: '#24160f',
                      borderRadius: 999,
                      width: 38,
                      height: 38,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>#1</Text>
                  </View>

                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '900',
                      color: '#8f5e3b',
                      letterSpacing: 1,
                      marginBottom: 8,
                    }}
                  >
                    TRENDING HERO
                  </Text>

                  <Text
                    style={{ fontSize: 24, fontWeight: '900', color: '#24160f', paddingRight: 48 }}
                  >
                    {heroCafe.nombre}
                  </Text>

                  <Text style={{ marginTop: 6, fontSize: 14, color: '#6f5a4b' }}>
                    {heroCafe.pais || heroCafe.origen || 'Origen no indicado'}
                    {heroCafe.proceso ? ` · ${heroCafe.proceso}` : ''}
                    {heroCafe.roaster || heroCafe.marca
                      ? ` · ${heroCafe.roaster || heroCafe.marca}`
                      : ''}
                  </Text>

                  <Text
                    style={{ marginTop: 10, fontSize: 14, color: '#8f5e3b', fontWeight: '900' }}
                  >
                    {heroCafe.puntuacion || 0}.0 ⭐ · {heroCafe.votos || 0} votos
                  </Text>

                  {!!buildMatchReasons(heroCafe).length && (
                    <View
                      style={{
                        marginTop: 12,
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      {buildMatchReasons(heroCafe).map((reason) => (
                        <MatchBadge key={`hero-${reason}`} label={reason} />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {!!rankingRest.length && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToAlignment="start"
                  snapToInterval={screenWidth * 0.44}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
                >
                  {rankingRest.map((cafe, index) => (
                    <View
                      key={cafe.id}
                      style={{
                        width: screenWidth * 0.4,
                      }}
                    >
                      <View
                        style={{
                          position: 'absolute',
                          top: -6,
                          left: -6,
                          zIndex: 2,
                          backgroundColor: '#24160f',
                          borderRadius: 999,
                          width: 30,
                          height: 30,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: '#fff',
                            fontWeight: '900',
                            fontSize: 12,
                          }}
                        >
                          {index + 2}
                        </Text>
                      </View>

                      {!!buildMatchReasons(cafe).length && (
                        <View
                          style={{
                            marginBottom: 8,
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                        >
                          {buildMatchReasons(cafe).map((reason) => (
                            <MatchBadge key={`top10-${cafe.id}-${reason}`} label={reason} />
                          ))}
                        </View>
                      )}

                      <CardVertical
                        item={cafe}
                        onDelete={() => {}}
                        onPress={() => {
                          const index = top10.findIndex((c) => c.id === cafe.id);
                          setCafeDetalle({ cafes: top10, cafeIndex: index });
                        }}
                        favs={favs}
                        onToggleFav={toggleFav}
                      />
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          <View style={{ paddingHorizontal: 16 }}>
            {!!topDestacado && (
              <View
                style={{
                  marginBottom: 14,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: '#eadbce',
                  backgroundColor: '#fffaf5',
                  padding: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: '#8f5e3b',
                    marginBottom: 6,
                  }}
                >
                  DESTACADO EN TENDENCIA
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#24160f' }}>
                  {topDestacado.nombre}
                </Text>
                <Text style={{ marginTop: 4, fontSize: 13, color: '#6f5a4b' }}>
                  {topDestacado.pais || topDestacado.origen || 'Origen no indicado'}
                  {topDestacado.proceso ? ` · ${topDestacado.proceso}` : ''}
                  {topDestacado.roaster || topDestacado.marca
                    ? ` · ${topDestacado.roaster || topDestacado.marca}`
                    : ''}
                </Text>
                <Text style={{ marginTop: 8, fontSize: 13, color: '#8f5e3b', fontWeight: '800' }}>
                  {topDestacado.puntuacion || 0}.0 ⭐ · {topDestacado.votos || 0} votos
                </Text>
                {!!buildMatchReasons(topDestacado).length && (
                  <View
                    style={{
                      marginTop: 10,
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    {buildMatchReasons(topDestacado).map((reason) => (
                      <MatchBadge key={reason} label={reason} />
                    ))}
                  </View>
                )}
              </View>
            )}

            {itemsFiltrados.slice(10).map((cafe) => (
              <View key={cafe.id} style={{ marginBottom: 10 }}>
                {!!buildMatchReasons(cafe).length && (
                  <View
                    style={{
                      marginBottom: 8,
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    {buildMatchReasons(cafe).map((reason) => (
                      <MatchBadge key={`${cafe.id}-${reason}`} label={reason} />
                    ))}
                  </View>
                )}

                <CardVertical
                  item={cafe}
                  onDelete={() => {}}
                  onPress={setCafeDetalle}
                  favs={favs}
                  onToggleFav={toggleFav}
                />
              </View>
            ))}

            {itemsFiltrados.length === 0 && (
              <View
                style={{
                  marginTop: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#eadbce',
                  backgroundColor: '#faf7f2',
                  padding: 16,
                }}
              >
                <Text style={[s.empty, { marginTop: 0 }]}>
                  No hay cafés con suficiente señal para esa combinación de filtros.
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
