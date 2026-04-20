import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

function normalizeCategory(item) {
  const c = item?.coffeeCategory;
  if (c === 'daily') return 'daily';
  if (c === 'commercial') return 'commercial';
  return 'specialty';
}

export default function TrendingSection({
  s,
  theme,
  premiumAccent,
  trendingCafes = [],
  CardVertical,
  setCafeDetalle,
  favs,
  toggleFav,
  cargando,
}) {
  const [selectedCategory, setSelectedCategory] = useState('specialty');

  const cafesFiltrados = useMemo(() => {
    return trendingCafes.filter((item) => normalizeCategory(item) === selectedCategory);
  }, [trendingCafes, selectedCategory]);

  return (
    <View style={{ padding: 16 }}>
      <Text style={[s.sectionTitle, { color: theme.text }]}>🔥 Trending</Text>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 14 }}>
        <TouchableOpacity
          onPress={() => setSelectedCategory('specialty')}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: selectedCategory === 'specialty' ? premiumAccent : theme.card,
          }}
        >
          <Text style={{ color: selectedCategory === 'specialty' ? '#000' : theme.text }}>
            Especialidad
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedCategory('daily')}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: selectedCategory === 'daily' ? premiumAccent : theme.card,
          }}
        >
          <Text style={{ color: selectedCategory === 'daily' ? '#000' : theme.text }}>
            Café diario
          </Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {cafesFiltrados.map((item) => (
            <View key={item.id} style={{ marginRight: 12, width: 220 }}>
              <CardVertical
                item={item}
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
  );
}
