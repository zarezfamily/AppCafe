import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
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
      <Text
        style={{
          fontSize: 12,
          fontWeight: '800',
          color: accentColor,
        }}
      >
        {label}
      </Text>
      <Ionicons name="close" size={14} color={accentColor} />
    </TouchableOpacity>
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
  const [paisSeleccionado, setPaisSeleccionado] = useState(trendingFilters?.pais || null);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState(trendingFilters?.proceso || null);
  const [roasterSeleccionado, setRoasterSeleccionado] = useState(trendingFilters?.roaster || null);
  const [sortBy, setSortBy] = useState('trending');

  useEffect(() => {
    setPaisSeleccionado(trendingFilters?.pais || null);
    setProcesoSeleccionado(trendingFilters?.proceso || null);
    setRoasterSeleccionado(trendingFilters?.roaster || null);
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
      if (sortBy === 'rating') {
        return Number(b?.puntuacion || 0) - Number(a?.puntuacion || 0);
      }

      if (sortBy === 'votes') {
        return Number(b?.votos || 0) - Number(a?.votos || 0);
      }

      if (sortBy === 'recent') {
        return parseDateValue(b?.fecha) - parseDateValue(a?.fecha);
      }

      return Number(b?.trendingScore || 0) - Number(a?.trendingScore || 0);
    });
  }, [trendingCafes, paisSeleccionado, procesoSeleccionado, roasterSeleccionado, sortBy]);

  const filtrosActivos = [paisSeleccionado, procesoSeleccionado, roasterSeleccionado].filter(
    Boolean
  ).length;

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
        <Text style={s.sectionSub}>
          Los cafés que mejor combinan valoración, votos y movimiento real dentro de ETIOVE
        </Text>

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
            Aquí no solo mandan las estrellas: también cuentan los votos y la tracción de la
            comunidad. Úsalo para descubrir qué cafés están realmente vivos ahora.
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

        <View
          style={{
            marginTop: 14,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: '#eadbce',
            backgroundColor: '#fffaf5',
            padding: 14,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '800',
                color: '#24160f',
              }}
            >
              Filtrar trending
            </Text>

            {filtrosActivos > 0 && (
              <TouchableOpacity onPress={clearFilters} activeOpacity={0.85}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: premiumAccent,
                  }}
                >
                  Limpiar filtros
                </Text>
              </TouchableOpacity>
            )}
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
        </View>

        {filtrosActivos > 0 && (
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
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          {itemsFiltrados.map((item) => (
            <CardVertical
              key={item.id}
              item={item}
              onDelete={() => {}}
              onPress={setCafeDetalle}
              favs={favs}
              onToggleFav={toggleFav}
            />
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
                No hay cafés trending con esa combinación de filtros.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
