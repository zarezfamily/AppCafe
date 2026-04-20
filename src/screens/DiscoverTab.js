import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SkeletonVerticalList } from '../components/SkeletonLoader';
import { MAIN_TABS } from './mainScreenTabs';

/* ======================
   HELPERS BASE
====================== */

function normalizeCategory(item) {
  return item?.coffeeCategory === 'daily' ? 'daily' : 'specialty';
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function parseDateValue(value) {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

/* ======================
   PRO MAX HELPERS
====================== */

function isBioCoffee(item) {
  if (item?.isBio === true) return true;
  if (item?.isBio === false) return false;

  const text = [
    item?.certificaciones,
    item?.notas,
    item?.nombre,
    item?.marca,
    item?.roaster,
    item?.descripcion,
  ]
    .map(normalizeText)
    .join(' ');

  return (
    text.includes('bio') ||
    text.includes('ecológico') ||
    text.includes('ecologico') ||
    text.includes('orgánico') ||
    text.includes('organico') ||
    text.includes('organic')
  );
}

function getStablePersonalizedScore(item) {
  const score = Number(item?.personalizedScore || 0);
  const votos = Number(item?.votos || 0);
  const puntuacion = Number(item?.puntuacion || 0);
  const bioBoost = isBioCoffee(item) ? 0.35 : 0;

  return score + Math.min(votos, 20) * 0.12 + puntuacion * 0.05 + bioBoost;
}

function hasMinimumDiscoverSignals(item) {
  return (
    Number(item?.votos || 0) >= 2 ||
    Number(item?.personalizedScore || 0) >= 8 ||
    Number(item?.puntuacion || 0) >= 4
  );
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
    isBioCoffee(item) ? 'bio' : '',
  ]
    .map(normalizeText)
    .join(' ');

  return haystack.includes(q);
}

/* ======================
   COMPONENTES UI
====================== */

function FilterChip({ label, active, onPress, accentColor }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? accentColor : '#e2d5c8',
        backgroundColor: active ? '#f3e7d9' : '#faf7f2',
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
    </TouchableOpacity>
  );
}

function ActiveFilterChip({ label, onRemove, accentColor }) {
  return (
    <TouchableOpacity
      onPress={onRemove}
      activeOpacity={0.9}
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
      <Text style={{ fontSize: 10, fontWeight: '800', color: '#8f5e3b' }}>{label}</Text>
    </View>
  );
}

function SortChip({ label, active, onPress, accentColor }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? accentColor : '#e2d5c8',
        backgroundColor: active ? '#f3e7d9' : '#faf7f2',
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
    </TouchableOpacity>
  );
}

function ExploreShortcutCard({ icon, title, subtitle, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: 168,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: active ? '#8f5e3b' : '#eadbce',
        backgroundColor: active ? '#f7efe6' : '#fffaf5',
        padding: 14,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: '#f3e7d9',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Ionicons name={icon} size={18} color="#8f5e3b" />
      </View>

      <Text
        style={{
          fontSize: 14,
          fontWeight: '900',
          color: '#24160f',
          marginBottom: 4,
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          fontSize: 12,
          lineHeight: 18,
          color: '#6f5a4b',
        }}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

function QuickActionCard({ icon, title, subtitle, onPress, compact = false }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        flex: compact ? 1 : undefined,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#eadbce',
        backgroundColor: '#faf8f5',
        padding: 14,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: '#f3e7d9',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
        }}
      >
        <Ionicons name={icon} size={18} color="#8f5e3b" />
      </View>

      <Text
        style={{
          fontSize: 14,
          fontWeight: '800',
          color: '#24160f',
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          marginTop: 4,
          fontSize: 12,
          lineHeight: 18,
          color: '#6f5a4b',
        }}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '900',
          color: '#24160f',
        }}
      >
        {title}
      </Text>
      {!!subtitle && (
        <Text
          style={{
            marginTop: 4,
            fontSize: 13,
            lineHeight: 19,
            color: '#6f5a4b',
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

/* ======================
   MAIN
====================== */

export default function DiscoverTab({
  s,
  setActiveTab,
  premiumAccent,
  cargando,
  personalizedCafes,
  CardVertical,
  setCafeDetalle,
  favs,
  toggleFav,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
}) {
  const [categorySelected, setCategorySelected] = useState('specialty');
  const [onlyBio, setOnlyBio] = useState(false);
  const [sortBy, setSortBy] = useState('personalized');
  const [localSearchText, setLocalSearchText] = useState('');

  const effectiveSearchText = typeof searchQuery === 'string' ? searchQuery : localSearchText;

  const setEffectiveSearchText = (value) => {
    if (typeof onSearchQueryChange === 'function') {
      onSearchQueryChange(value);
      return;
    }
    setLocalSearchText(value);
  };

  const cafesBase = useMemo(() => {
    return (personalizedCafes || [])
      .filter((item) => normalizeCategory(item) === categorySelected)
      .filter((item) => (onlyBio ? isBioCoffee(item) : true))
      .filter((item) => matchesSearch(item, effectiveSearchText));
  }, [personalizedCafes, categorySelected, onlyBio, effectiveSearchText]);

  const itemsFiltrados = useMemo(() => {
    const base =
      sortBy === 'personalized' ? cafesBase.filter(hasMinimumDiscoverSignals) : cafesBase;

    return [...base]
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
          return Number(b?.personalizedScore || 0) - Number(a?.personalizedScore || 0);
        }

        const personalizedDiff = getStablePersonalizedScore(b) - getStablePersonalizedScore(a);
        if (personalizedDiff !== 0) return personalizedDiff;

        const votesDiff = Number(b?.votos || 0) - Number(a?.votos || 0);
        if (votesDiff !== 0) return votesDiff;

        return Number(b?.puntuacion || 0) - Number(a?.puntuacion || 0);
      })
      .slice(0, 50);
  }, [cafesBase, sortBy]);

  const top = itemsFiltrados[0];

  const categoryTitle = categorySelected === 'daily' ? 'Café diario' : 'Especialidad';
  const categorySubtitle =
    categorySelected === 'daily'
      ? 'Opciones de uso diario con mejor encaje para ti.'
      : 'Cafés con más carácter, trazabilidad y afinidad contigo.';

  const hasActiveFilters =
    onlyBio ||
    !!effectiveSearchText ||
    sortBy !== 'personalized' ||
    categorySelected !== 'specialty';

  const activeResultsCount = itemsFiltrados.length;
  const topAffinity = top ? Math.round(getStablePersonalizedScore(top) * 10) / 10 : 0;

  const clearSearch = () => setEffectiveSearchText('');
  const clearAllFilters = () => {
    setOnlyBio(false);
    setCategorySelected('specialty');
    setSortBy('personalized');
    setEffectiveSearchText('');
  };

  const buildMatchReasons = (item) => {
    const reasons = [];
    if (Number(item?.personalizedScore || 0) >= 8) reasons.push('Alta afinidad');
    if (Number(item?.votos || 0) >= 10) reasons.push('Muy votado');
    if (isBioCoffee(item)) reasons.push('BIO');
    return reasons.slice(0, 3);
  };

  return (
    <View style={{ paddingTop: 20 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <TouchableOpacity onPress={() => setActiveTab(MAIN_TABS.HOME)} style={s.backRow}>
          <Ionicons name="chevron-back" size={20} color={premiumAccent} />
          <Text style={s.backText}>Volver</Text>
        </TouchableOpacity>

        <View
          style={{
            marginTop: 6,
            borderWidth: 1,
            borderColor: '#eadbce',
            backgroundColor: '#fffaf5',
            borderRadius: 24,
            padding: 18,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '900',
              color: '#8f5e3b',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            ETIOVE EXPLORE
          </Text>

          <Text
            style={{
              fontSize: 26,
              fontWeight: '900',
              color: '#24160f',
            }}
          >
            Explore Premium
          </Text>

          <Text
            style={{
              marginTop: 8,
              fontSize: 14,
              lineHeight: 22,
              color: '#6f5a4b',
            }}
          >
            Descubre cafés con una experiencia más visual, filtrada y coherente con tu búsqueda
            global.
          </Text>

          <View
            style={{
              marginTop: 14,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <MatchBadge label={categoryTitle} />
            {onlyBio ? <MatchBadge label="BIO" /> : null}
            <MatchBadge label={`Top ${Math.min(itemsFiltrados.length, 50)}`} />
          </View>
        </View>

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
            value={effectiveSearchText}
            onChangeText={setEffectiveSearchText}
            placeholder={searchPlaceholder || 'Buscar café, origen, proceso, tostador...'}
            placeholderTextColor="#9b8573"
            style={{
              flex: 1,
              fontSize: 14,
              color: '#24160f',
              paddingVertical: 0,
            }}
          />
          {!!effectiveSearchText && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color="#8f5e3b" />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ marginTop: 18 }}>
          <SectionTitle
            title="Explorar por estilo"
            subtitle="Elige cómo quieres descubrir café hoy."
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 8 }}
          >
            <ExploreShortcutCard
              icon="cafe-outline"
              title="Especialidad"
              subtitle="Más carácter, origen y experiencia."
              active={categorySelected === 'specialty' && !onlyBio}
              onPress={() => {
                setCategorySelected('specialty');
                setOnlyBio(false);
              }}
            />

            <ExploreShortcutCard
              icon="bag-handle-outline"
              title="Diario"
              subtitle="Compra práctica para tu día a día."
              active={categorySelected === 'daily' && !onlyBio}
              onPress={() => {
                setCategorySelected('daily');
                setOnlyBio(false);
              }}
            />

            <ExploreShortcutCard
              icon="leaf-outline"
              title="BIO"
              subtitle="Selección ecológica y orgánica."
              active={onlyBio}
              onPress={() => setOnlyBio((prev) => !prev)}
            />
          </ScrollView>
        </View>

        <View style={{ marginTop: 18 }}>
          <SectionTitle
            title="Ordenar descubrimiento"
            subtitle="Prioriza afinidad, puntuación, votos o novedades."
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 8 }}
          >
            <SortChip
              label="Afinidad"
              active={sortBy === 'personalized'}
              onPress={() => setSortBy('personalized')}
              accentColor={premiumAccent}
            />
            <SortChip
              label="Puntuación"
              active={sortBy === 'rating'}
              onPress={() => setSortBy('rating')}
              accentColor={premiumAccent}
            />
            <SortChip
              label="Votos"
              active={sortBy === 'votes'}
              onPress={() => setSortBy('votes')}
              accentColor={premiumAccent}
            />
            <SortChip
              label="Recientes"
              active={sortBy === 'recent'}
              onPress={() => setSortBy('recent')}
              accentColor={premiumAccent}
            />
          </ScrollView>
        </View>

        {hasActiveFilters && (
          <View style={{ marginTop: 18 }}>
            <SectionTitle
              title="Filtros activos"
              subtitle="Quita lo que no necesites para volver a una vista más amplia."
            />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {categorySelected !== 'specialty' && (
                <ActiveFilterChip
                  label={categoryTitle}
                  accentColor={premiumAccent}
                  onRemove={() => setCategorySelected('specialty')}
                />
              )}

              {onlyBio && (
                <ActiveFilterChip
                  label="BIO"
                  accentColor={premiumAccent}
                  onRemove={() => setOnlyBio(false)}
                />
              )}

              {!!effectiveSearchText && (
                <ActiveFilterChip
                  label={`Buscar: ${effectiveSearchText}`}
                  accentColor={premiumAccent}
                  onRemove={clearSearch}
                />
              )}

              {sortBy !== 'personalized' && (
                <ActiveFilterChip
                  label={`Orden: ${sortBy}`}
                  accentColor={premiumAccent}
                  onRemove={() => setSortBy('personalized')}
                />
              )}

              <TouchableOpacity
                onPress={clearAllFilters}
                activeOpacity={0.9}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: '#8f5e3b',
                  backgroundColor: '#fffaf5',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#8f5e3b' }}>
                  Limpiar todo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ marginTop: 18 }}>
          <SectionTitle
            title="Resumen de exploración"
            subtitle="Lo que está viendo ahora mismo tu sesión Explore."
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#eadbce',
                backgroundColor: '#fffaf5',
                borderRadius: 18,
                padding: 14,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#8f5e3b', marginBottom: 6 }}>
                RESULTADOS
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#24160f' }}>
                {activeResultsCount}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: '#6f5a4b', lineHeight: 18 }}>
                Cafés visibles en esta vista.
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#eadbce',
                backgroundColor: '#fffaf5',
                borderRadius: 18,
                padding: 14,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#8f5e3b', marginBottom: 6 }}>
                TOP AFINIDAD
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#24160f' }}>
                {topAffinity}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: '#6f5a4b', lineHeight: 18 }}>
                Afinidad del mejor café actual.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 18 }}>
          <SectionTitle
            title="Accesos rápidos"
            subtitle="Salta a las zonas más útiles de ETIOVE."
          />

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <QuickActionCard
                compact
                icon="flame-outline"
                title="Trending"
                subtitle="Qué está subiendo ahora."
                onPress={() => setActiveTab(MAIN_TABS.TRENDING)}
              />

              <QuickActionCard
                compact
                icon="trophy-outline"
                title="Ranking"
                subtitle="Los mejores posicionados."
                onPress={() => setActiveTab(MAIN_TABS.TOP)}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <QuickActionCard
                compact
                icon="time-outline"
                title="Últimos"
                subtitle="Lo más reciente en ETIOVE."
                onPress={() => setActiveTab(MAIN_TABS.LATEST)}
              />

              <QuickActionCard
                compact
                icon="home-outline"
                title="Inicio"
                subtitle="Volver a la home principal."
                onPress={() => setActiveTab(MAIN_TABS.HOME)}
              />
            </View>
          </View>
        </View>

        <View
          style={{
            marginTop: 14,
            borderWidth: 1,
            borderColor: '#eadbce',
            backgroundColor: '#fffaf5',
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              lineHeight: 18,
              color: '#6f5a4b',
              fontWeight: '600',
            }}
          >
            Search PRO: busca por café, origen, proceso, tostador y BIO. Esta pantalla ya queda
            preparada para compartir búsqueda global con Home y Ranking.
          </Text>
        </View>
      </View>

      {cargando ? (
        <SkeletonVerticalList />
      ) : (
        <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
          {!!top && (
            <View
              style={{
                marginBottom: 18,
                borderWidth: 1,
                borderColor: '#eadbce',
                backgroundColor: '#fffaf5',
                borderRadius: 22,
                padding: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '900',
                  color: '#8f5e3b',
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                RECOMENDACIÓN PRO
              </Text>

              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '900',
                  color: '#24160f',
                }}
              >
                {top.nombre}
              </Text>

              <Text
                style={{
                  marginTop: 6,
                  fontSize: 14,
                  lineHeight: 21,
                  color: '#6f5a4b',
                }}
              >
                {categorySubtitle}
              </Text>

              <Text
                style={{
                  marginTop: 10,
                  fontSize: 14,
                  fontWeight: '800',
                  color: '#8f5e3b',
                }}
              >
                {top.puntuacion} ⭐ · {top.votos} votos · afinidad{' '}
                {Math.round(getStablePersonalizedScore(top) * 10) / 10}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {buildMatchReasons(top).map((reason) => (
                  <MatchBadge key={reason} label={reason} />
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity
                  onPress={() => setCafeDetalle(top)}
                  activeOpacity={0.9}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    backgroundColor: '#111827',
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Ver ficha</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab(MAIN_TABS.TOP)}
                  activeOpacity={0.9}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    backgroundColor: '#f3e7d9',
                    borderWidth: 1,
                    borderColor: '#eadbce',
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#8f5e3b', fontSize: 13, fontWeight: '800' }}>
                    Ir a ranking
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <SectionTitle
            title={`Selección ${categoryTitle}`}
            subtitle="Una vista más cuidada, útil y filtrada para descubrir mejor. Pulsa cualquier café para abrir su ficha completa."
          />

          {itemsFiltrados.map((item) => (
            <View key={item.id} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                {buildMatchReasons(item).map((r) => (
                  <MatchBadge key={r} label={r} />
                ))}
              </View>

              <CardVertical
                item={item}
                onPress={setCafeDetalle}
                favs={favs}
                onToggleFav={toggleFav}
              />
            </View>
          ))}

          {itemsFiltrados.length === 0 && (
            <View
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: '#eadbce',
                backgroundColor: '#fffaf5',
                borderRadius: 18,
                padding: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: '#24160f',
                  marginBottom: 6,
                }}
              >
                No hay resultados ahora mismo
              </Text>
              <Text style={s.empty}>
                No hay resultados con suficiente señal para esta búsqueda global o combinación de
                filtros.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
