import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
    ActivityIndicator, Animated, Dimensions, FlatList,
    Image, ScrollView, Text, TouchableOpacity, View,
} from 'react-native';

const { width: W } = Dimensions.get('window');
const CARD_SIZE = (W - 48) / 2; // 2 columns, 16px padding each side, 12px gap

export default function DiarioCatasSection({
  s,
  theme,
  premiumAccent,
  catas,
  catasFiltradas,
  stats,
  filtroPeriodo,
  setFiltroPeriodo,
  irAbrirModal,
  irAbrirDetail,
  cargando,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (!catas || catas.length === 0) {
    return (
      <View style={{ paddingHorizontal: 16, marginTop: 24, marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={s.sectionTitle}>📔 Mi Diario de Catas</Text>
          <TouchableOpacity onPress={() => irAbrirModal()} style={{ padding: 6 }}>
            <Ionicons name="add-circle" size={28} color={premiumAccent} />
          </TouchableOpacity>
        </View>
        <View style={{ backgroundColor: '#f9f7f4', borderRadius: 12, padding: 20, alignItems: 'center' }}>
          <Ionicons name="book-outline" size={40} color={theme.text.muted} style={{ marginBottom: 10 }} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.muted, textAlign: 'center' }}>
            Comienza a registrar tus catas
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 6, textAlign: 'center' }}>
            Fecha, método, parámetros y tus notas personales
          </Text>
          <TouchableOpacity
            onPress={() => irAbrirModal()}
            style={{
              marginTop: 14, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: premiumAccent,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>+ Nueva cata</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={{ marginTop: 24, marginBottom: 24, opacity: fadeAnim }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={s.sectionTitle}>📔 Mi Diario de Catas</Text>
          <TouchableOpacity onPress={() => irAbrirModal()} style={{ padding: 6 }}>
            <Ionicons name="add-circle" size={28} color={premiumAccent} />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <View style={{ flex: 1, backgroundColor: '#fff9f4', borderRadius: 8, padding: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: premiumAccent }}>{stats.totalCatas}</Text>
            <Text style={{ fontSize: 10, fontWeight: '600', color: theme.text.secondary, marginTop: 2 }}>CATAS</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fff9f4', borderRadius: 8, padding: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: premiumAccent }}>⭐ {stats.promedioPuntuacion}</Text>
            <Text style={{ fontSize: 10, fontWeight: '600', color: theme.text.secondary, marginTop: 2 }}>PROMEDIO</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fff9f4', borderRadius: 8, padding: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: premiumAccent }}>{stats.cafesProbados}</Text>
            <Text style={{ fontSize: 10, fontWeight: '600', color: theme.text.secondary, marginTop: 2 }}>CAFÉS</Text>
          </View>
        </View>

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {['hoy', 'semana', 'mes', 'todo'].map((periodo) => (
            <TouchableOpacity
              key={periodo}
              onPress={() => setFiltroPeriodo(periodo)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: filtroPeriodo === periodo ? premiumAccent : '#e8dfd5',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  textTransform: 'capitalize',
                  color: filtroPeriodo === periodo ? '#fff' : theme.text.primary,
                }}
              >
                {periodo === 'hoy' ? 'Hoy' : periodo === 'todo' ? 'Todo' : periodo === 'semana' ? 'Semana' : 'Mes'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Timeline Grid (2 columns estilo IG con foto + info superpuesta) */}
      {cargando ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          <ActivityIndicator color={premiumAccent} size="large" />
        </View>
      ) : catasFiltradas.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 20, alignItems: 'center' }}>
          <Text style={{ color: theme.text.secondary, fontSize: 12 }}>No hay catas en este período</Text>
        </View>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={catasFiltradas}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16, marginBottom: 12 }}
          renderItem={({ item }) => <CataCard cata={item} onPress={() => irAbrirDetail(item)} theme={theme} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 12 }}
        />
      )}
    </Animated.View>
  );
}

function CataCard({ cata, onPress, theme }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 8,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const fechaFormato = new Date(cata.fechaHora).toLocaleDateString('es-ES', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Animated.View
      style={[
        { flex: 1, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        {/* Foto con gradiente */}
        {cata.foto ? (
          <Image
            source={{ uri: cata.foto }}
            style={{
              width: '100%',
              height: CARD_SIZE,
              borderRadius: 12,
              backgroundColor: '#f0f0f0',
            }}
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: CARD_SIZE,
              borderRadius: 12,
              backgroundColor: '#e8dfd5',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="image-outline" size={32} color={theme.text.muted} />
          </View>
        )}

        {/* Info superpuesta (darkGradient) */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60%',
            borderRadius: 12,
            backgroundColor: 'rgba(0,0,0,0.4)',
            padding: 10,
            justifyContent: 'flex-end',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, marginBottom: 4 }} numberOfLines={2}>
            {cata.cafeNombre}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>⭐ {cata.puntuacion}/5</Text>
            <Text style={{ color: '#fff', fontWeight: '500', fontSize: 10 }}>{fechaFormato}</Text>
          </View>
          <Text style={{ color: '#fff', fontWeight: '500', fontSize: 10, marginTop: 2 }}>
            {cata.metodoPreparacion}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
