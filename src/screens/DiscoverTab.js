import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
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
    { id: 'personalized', label: 'Para ti' },
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

export default function DiscoverTab({
  s,
  setActiveTab,
  premiumAccent,
  cargando,
  personalizedCafes,
  personalizedReason,
  CardVertical,
  setCafeDetalle,
  favs,
  toggleFav,
}) {
  const [paisSeleccionado, setPaisSeleccionado] = useState(null);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState(null);
  const [roasterSeleccionado, setRoasterSeleccionado] = useState(null);
  const [sortBy, setSortBy] = useState('personalized');

  const paises = useMemo(() => buildRankedOptions(personalizedCafes, 'pais'), [personalizedCafes]);
  const procesos = useMemo(
    () => buildRankedOptions(personalizedCafes, 'proceso'),
    [personalizedCafes]
  );
  const roasters = useMemo(
    () => buildRankedOptions(personalizedCafes, 'roaster'),
    [personalizedCafes]
  );

  const itemsFiltrados = useMemo(() => {
    const base = (personalizedCafes || []).filter((item) => {
      const okPais = !paisSeleccionado || item?.pais === paisSeleccionado;
      const okProceso = !procesoSeleccionado || item?.proceso === procesoSeleccionado;
      const okRoaster = !roasterSeleccionado || item?.roaster === roasterSeleccionado;
      return okPais && okProceso && okRoaster;
    });

    return [...base].sort((a, b) => {
      if (sortBy === 'rating') return Number(b?.puntuacion || 0) - Number(a?.puntuacion || 0);
      if (sortBy === 'votes') return Number(b?.votos || 0) - Number(a?.votos || 0);
      if (sortBy === 'recent') return parseDateValue(b?.fecha) - parseDateValue(a?.fecha);
      return Number(b?.personalizedScore || 0) - Number(a?.personalizedScore || 0);
    });
  }, [personalizedCafes, paisSeleccionado, procesoSeleccionado, roasterSeleccionado, sortBy]);

  const filtrosActivos = [paisSeleccionado, procesoSeleccionado, roasterSeleccionado].filter(
    Boolean
  ).length;

  const topDestacado = itemsFiltrados?.[0] || null;

  const topPaisBase = useMemo(() => {
    const first = buildRankedOptions(personalizedCafes, 'pais')[0];
    return first?.label || null;
  }, [personalizedCafes]);

  const topProcesoBase = useMemo(() => {
    const first = buildRankedOptions(personalizedCafes, 'proceso')[0];
    return first?.label || null;
  }, [personalizedCafes]);

  const topRoasterBase = useMemo(() => {
    const first = buildRankedOptions(personalizedCafes, 'roaster')[0];
    return first?.label || null;
  }, [personalizedCafes]);

  const buildMatchReasons = (item) => {
    const reasons = [];
    if (topPaisBase && item?.pais === topPaisBase) reasons.push('Match país');
    if (topProcesoBase && item?.proceso === topProcesoBase) reasons.push('Match proceso');
    if (topRoasterBase && item?.roaster === topRoasterBase) reasons.push('Match tostador');
    if (Number(item?.personalizedScore || 0) >= 8) reasons.push('Alta afinidad');
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

        <Text style={s.pageTitle}>Descubrir para ti</Text>
        <Text style={s.sectionSub}>
          {personalizedReason ||
            'Selección personalizada basada en tus favoritos y afinidades dentro de ETIOVE'}
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
            ETIOVE FOR YOU
          </Text>

          <Text
            style={{
              fontSize: 13,
              lineHeight: 19,
              color: '#6f5a4b',
            }}
          >
            Aquí priorizamos lo que mejor encaja contigo: países, procesos y tostadores que más se
            repiten en tus gustos recientes y en tus cafés favoritos.
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
              Filtrar recomendaciones
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
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}
              >
                TOP RECOMENDADO
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

          {itemsFiltrados.map((item) => (
            <View key={item.id} style={{ marginBottom: 10 }}>
              {!!buildMatchReasons(item).length && (
                <View
                  style={{
                    marginBottom: 8,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {buildMatchReasons(item).map((reason) => (
                    <MatchBadge key={`${item.id}-${reason}`} label={reason} />
                  ))}
                </View>
              )}

              <CardVertical
                item={item}
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
                No hay recomendaciones con esa combinación de filtros.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
