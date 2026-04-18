import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function TrendingSection({
  s,
  theme,
  premiumAccent,
  trendingCafes = [],
  trendingFilters = {},
  setTrendingFilters,
  CardVertical,
  setCafeDetalle,
  favs,
  toggleFav,
  cargando,
}) {
  // 🧠 Filtros dinámicos
  const cafesFiltrados = useMemo(() => {
    return trendingCafes.filter((cafe) => {
      if (trendingFilters.pais && cafe.pais !== trendingFilters.pais) return false;
      if (trendingFilters.proceso && cafe.proceso !== trendingFilters.proceso) return false;
      if (trendingFilters.tostador && cafe.tostador !== trendingFilters.tostador) return false;
      return true;
    });
  }, [trendingCafes, trendingFilters]);

  // 🎯 Opciones únicas
  const paises = [...new Set(trendingCafes.map((c) => c.pais))];
  const procesos = [...new Set(trendingCafes.map((c) => c.proceso))];
  const tostadores = [...new Set(trendingCafes.map((c) => c.tostador))];

  const renderFilter = (label, key, options) => (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: theme.text, marginBottom: 5 }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((opt) => {
          const active = trendingFilters[key] === opt;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() =>
                setTrendingFilters((prev) => ({
                  ...prev,
                  [key]: prev[key] === opt ? null : opt,
                }))
              }
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                marginRight: 8,
                borderRadius: 20,
                backgroundColor: active ? premiumAccent : theme.card,
              }}
            >
              <Text style={{ color: active ? '#000' : theme.text }}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ padding: 16 }}>
      <Text style={[s.sectionTitle, { color: theme.text }]}>🔥 Trending</Text>

      {/* FILTROS */}
      {renderFilter('País', 'pais', paises)}
      {renderFilter('Proceso', 'proceso', procesos)}
      {renderFilter('Tostador', 'tostador', tostadores)}

      {/* LOADING */}
      {cargando ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {cafesFiltrados.map((cafe) => (
            <CardVertical
              key={cafe.id}
              cafe={cafe}
              onPress={() => setCafeDetalle(cafe)}
              fav={favs?.includes(cafe.id)}
              onFav={() => toggleFav(cafe.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
