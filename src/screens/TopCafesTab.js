import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { spreadByBrand } from '../utils/coffeeRanking';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SkeletonVerticalList } from '../components/SkeletonLoader';
import { MAIN_TABS } from './mainScreenTabs';

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

function TopBadge({ label }) {
  return (
    <View
      style={{
        borderRadius: 999,
        backgroundColor: '#f3e7d9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignSelf: 'flex-start',
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          color: '#8f5e3b',
          fontWeight: '800',
        }}
      >
        {label}
      </Text>
    </View>
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

export default function TopCafesTab({
  s,
  setActiveTab,
  premiumAccent,
  perfil,
  cargando,
  top100,
  CardVertical,
  setCafeDetalle,
  favs,
  toggleFav,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
}) {
  const country = perfil?.pais || 'España';

  const filteredItems = useMemo(() => {
    const sorted = [...(top100 || [])]
      .filter((item) => item?.coffeeCategory === 'specialty' && item?.qualityLevel !== 'commercial')
      .filter((item) => matchesSearch(item, searchQuery))
      .sort((a, b) => Number(b?.rankingScore || 0) - Number(a?.rankingScore || 0));
    return spreadByBrand(sorted);
  }, [top100, searchQuery]);

  const hero = filteredItems?.[0] || null;
  const rest = filteredItems?.slice(1) || [];
  const heroScore = hero ? Math.round(Number(hero?.rankingScore || 0) * 10) / 10 : 0;

  const buildHeroBadges = (item) => {
    if (!item) return [];

    const badges = [];
    if (Number(item?.rankingScore || 0) > 0) badges.push('Ranking backend');
    if (Number(item?.votos || 0) >= 10) badges.push('Muy votado');
    if (item?.isBio === true) badges.push('BIO');
    return badges;
  };

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

        <Text style={s.pageTitle}>Top cafés de especialidad</Text>
        <Text style={s.sectionSub}>Los cafés mejor posicionados ahora mismo en {country}</Text>

        <SearchBox
          value={searchQuery || ''}
          onChangeText={onSearchQueryChange}
          onClear={clearSearch}
          placeholder={searchPlaceholder || 'Buscar en ranking...'}
        />

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
            ETIOVE RANKING
          </Text>

          <Text
            style={{
              fontSize: 13,
              lineHeight: 19,
              color: '#6f5a4b',
            }}
          >
            Ranking ETIOVE calculado en backend según calidad, puntuación y confianza.
          </Text>

          <View
            style={{
              marginTop: 12,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <MatchBadge label="Ranking backend" />
            <MatchBadge label="Search global" />
            <MatchBadge label="Specialty" />
          </View>

          <View
            style={{
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: '#7d6a5a',
                fontWeight: '700',
              }}
            >
              {filteredItems.length} cafés en esta vista
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
                Especialidad
              </Text>
            </View>
          </View>
        </View>
      </View>

      {cargando ? (
        <SkeletonVerticalList />
      ) : (
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          {!!hero && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                const index = filteredItems.findIndex((c) => c.id === hero.id);
                setCafeDetalle({ cafes: filteredItems, cafeIndex: index });
              }}
              style={{
                marginBottom: 16,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: '#eadbce',
                backgroundColor: '#fffaf5',
                padding: 16,
              }}
            >
              <TopBadge label="TOP SPECIALTY" />
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#24160f' }}>
                {hero.nombre}
              </Text>
              <Text style={{ marginTop: 6, fontSize: 14, color: '#6f5a4b' }}>
                {hero.roaster || hero.marca || 'ETIOVE'}
              </Text>
              {!!buildHeroBadges(hero).length && (
                <View
                  style={{
                    marginTop: 10,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {buildHeroBadges(hero).map((badge) => (
                    <MatchBadge key={badge} label={badge} />
                  ))}
                </View>
              )}
              <Text style={{ marginTop: 10, fontSize: 14, color: '#8f5e3b', fontWeight: '800' }}>
                {Number(hero.puntuacion || 0).toFixed(1)} ⭐ · {hero.votos || 0} votos · score{' '}
                {heroScore}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity
                  onPress={() => {
                    const index = filteredItems.findIndex((c) => c.id === hero.id);
                    setCafeDetalle({ cafes: filteredItems, cafeIndex: index });
                  }}
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
                  onPress={() => setActiveTab(MAIN_TABS.HOME)}
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
                    Ir a inicio
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}

          {!!rest.length && (
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '900',
                  color: '#24160f',
                }}
              >
                Selección ranking
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  lineHeight: 19,
                  color: '#6f5a4b',
                }}
              >
                Una vista cuidada de los cafés specialty mejor posicionados en ETIOVE.
              </Text>
            </View>
          )}
          {rest.map((item) => (
            <View key={item.id} style={{ marginBottom: 10 }}>
              <CardVertical
                item={item}
                onDelete={() => {}}
                onPress={setCafeDetalle}
                favs={favs}
                onToggleFav={toggleFav}
              />
            </View>
          ))}

          {!filteredItems.length ? (
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
              <Text style={[s.empty, { marginTop: 0 }]}>
                No hay cafés de especialidad para esa búsqueda.
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
