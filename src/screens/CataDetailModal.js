import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Image, Modal, Platform, ScrollView, Text, TouchableOpacity, View,
} from 'react-native';

export default function CataDetailModal({
  s,
  theme,
  premiumAccent,
  visible,
  cata,
  onClose,
  onEdit,
  onDelete,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(600)).current;
  const [shouldRender, setShouldRender] = useState(false);
  const lastCataRef = useRef(cata);

  if (cata) lastCataRef.current = cata;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 110, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setShouldRender(false);
      });
    }
  }, [visible]);

  if (!shouldRender || !lastCataRef.current) return null;
  const cataData = lastCataRef.current;

  const fechaCompleta = new Date(cataData.fechaHora).toLocaleString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: fadeAnim,
        }}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '90%',
          backgroundColor: '#fff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 40 : 20 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 0,
            }}
          >
            <Text style={s.sectionTitle}>Detalle de Cata</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Ionicons name="close" size={24} color={theme.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Foto grande */}
          {cataData.foto && (
            <Image
              source={{ uri: cataData.foto }}
              style={{
                width: '100%',
                height: 300,
                marginTop: 12,
              }}
            />
          )}

          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            {/* Café + Puntuación */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: theme.text.primary, marginBottom: 6 }}>
                {cataData.cafeNombre}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: premiumAccent }}>
                  {'⭐'.repeat(cataData.puntuacion)}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary }}>
                  {cataData.puntuacion}/5
                </Text>
              </View>
            </View>

            {/* Fecha */}
            <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e8dfd5' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.secondary, textTransform: 'uppercase', marginBottom: 4 }}>
                Fecha y hora
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary, textTransform: 'capitalize' }}>
                {fechaCompleta}
              </Text>
            </View>

            {/* Parámetros */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.secondary, textTransform: 'uppercase', marginBottom: 10 }}>
                Parámetros de preparación
              </Text>
              <View style={{ gap: 8 }}>
                <ParameterRow label="Método" value={cataData.metodoPreparacion} icon="☕" />
                <ParameterRow label="Dosis" value={`${cataData.dosis}g`} icon="⚖️" />
                <ParameterRow label="Agua" value={`${cataData.agua}ml`} icon="💧" />
                <ParameterRow label="Temperatura" value={`${cataData.temperatura}°C`} icon="🌡️" />
                <ParameterRow label="Extracción" value={`${cataData.tiempoExtraccion}s`} icon="⏱️" />
              </View>
            </View>

            {/* Contexto */}
            <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e8dfd5' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.secondary, textTransform: 'uppercase', marginBottom: 4 }}>
                Contexto
              </Text>
              <View style={{ backgroundColor: '#f9f7f4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>
                  {cataData.contexto}
                </Text>
              </View>
            </View>

            {/* Notas */}
            {cataData.notas && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.secondary, textTransform: 'uppercase', marginBottom: 8 }}>
                  Notas personales
                </Text>
                <View style={{ backgroundColor: '#f9f7f4', borderRadius: 8, padding: 12 }}>
                  <Text style={{ fontSize: 13, lineHeight: 18, color: theme.text.primary }}>
                    {cataData.notas}
                  </Text>
                </View>
              </View>
            )}

            {/* Acciones */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onEdit?.(cata);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 1.5,
                  borderColor: premiumAccent,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: premiumAccent, fontWeight: '700', fontSize: 12 }}>✏️ Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onDelete?.(cataData.id);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#f5e5dc',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#a44f45', fontWeight: '700', fontSize: 12 }}>🗑️ Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function ParameterRow({ label, value, icon }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#888' }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#2d1d13' }}>{value}</Text>
    </View>
  );
}
