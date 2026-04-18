import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
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
}) {
  const [paisSeleccionado, setPaisSeleccionado] = useState(null);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState(null);
  const [roasterSeleccionado, setRoasterSeleccionado] = useState(null);
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

  const paises = useMemo(() => buildRankedOptions(trendingCafes, 'pais'), [trendingCafes]);
  const procesos = useMemo(() => buildRankedOptions(trendingCafes, 'proceso'), [trendingCafes]);
  const roasters = useMemo(() => buildRankedOptions(trendingCafes, 'roaster'), [trendingCafes]);

  const itemsFiltrados = useMemo(() => {
    const base = (trendingCafes || []).filter((item) => {
      const okPais = !paisSeleccionado || item?.pais === paisSeleccionado;
      const okProceso = !procesoSeleccionado || item?.proceso === procesoSeleccionado;
      const okRoaster = !roasterSeleccionado || item?.roaster === roasterSeleccionado;
      return okPais && okProceso && okRoaster;
    });

    return [...base].sort((a, b) => {
      if (sortBy === 'rating') return Number(b?.puntuacion || 0) - Number(a?.puntuacion || 0);
      if (sortBy === 'votes') return Number(b?.votos || 0) - Number(a?.votos || 0);
      if (sortBy === 'recent') return parseDateValue(b?.fecha) - parseDateValue(a?.fecha);
      return Number(b?.trendingScore || 0) - Number(a?.trendingScore || 0);
    });
  }, [trendingCafes, paisSeleccionado, procesoSeleccionado, roasterSeleccionado, sortBy]);

  const filtrosActivos = [paisSeleccionado, procesoSeleccionado, roasterSeleccionado].filter(
    Boolean
  ).length;

  const topDestacado = itemsFiltrados?.[0] || null;
  const top10 = itemsFiltrados.slice(0, 10);
  const screenWidth = Dimensions.get('window').width;
  const heroCafe = top10?.[0] || null;
  const rankingRest = top10.slice(1);

  const topPaisBase = useMemo(() => {
    const first = buildRankedOptions(trendingCafes, 'pais')[0];
    return first?.label || null;
  }, [trendingCafes]);

  const topProcesoBase = useMemo(() => {
    const first = buildRankedOptions(trendingCafes, 'proceso')[0];
    return first?.label || null;
  }, [trendingCafes]);

  const topRoasterBase = useMemo(() => {
    const first = buildRankedOptions(trendingCafes, 'roaster')[0];
    return first?.label || null;
  }, [trendingCafes]);

  const buildMatchReasons = (item) => {
    const reasons = [];
    if (topPaisBase && item?.pais === topPaisBase) reasons.push('Top país');
    if (topProcesoBase && item?.proceso === topProcesoBase) reasons.push('Top proceso');
    if (topRoasterBase && item?.roaster === topRoasterBase) reasons.push('Top tostador');
    if (Number(item?.trendingScore || 0) >= 4) reasons.push('Alta tracción');
    return reasons.slice(0, 3);
  };

  const clearFilters = () => {
    setPaisSeleccionado(null);
    setProcesoSeleccionado(null);
    setRoasterSeleccionado(null);
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
            Los cafés que mejor combinan valoración, votos y movimiento real dentro de la comunidad.
          </Text>

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
                {filtrosActivos > 0 ? `${filtrosActivos} filtros` : 'Sin filtros'}
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
          {/* TOP 10 APPLE STYLE */}
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
                  onPress={() => setCafeDetalle(heroCafe)}
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
                    HERO COFFEE
                  </Text>

                  <Text
                    style={{ fontSize: 24, fontWeight: '900', color: '#24160f', paddingRight: 48 }}
                  >
                    {heroCafe.nombre}
                  </Text>

                  <Text style={{ marginTop: 6, fontSize: 14, color: '#6f5a4b' }}>
                    {heroCafe.pais || 'Origen no indicado'}
                    {heroCafe.proceso ? ` · ${heroCafe.proceso}` : ''}
                    {heroCafe.roaster ? ` · ${heroCafe.roaster}` : ''}
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
                        onPress={setCafeDetalle}
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
                  TOP DESTACADO
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#24160f' }}>
                  {topDestacado.nombre}
                </Text>
                <Text style={{ marginTop: 4, fontSize: 13, color: '#6f5a4b' }}>
                  {topDestacado.pais || 'Origen no indicado'}
                  {topDestacado.proceso ? ` · ${topDestacado.proceso}` : ''}
                  {topDestacado.roaster ? ` · ${topDestacado.roaster}` : ''}
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
                <Text style={[s.empty, { marginTop: 0 }]}>No hay cafés con esos filtros.</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
