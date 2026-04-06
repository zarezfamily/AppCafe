import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated, Image, KeyboardAvoidingView, Modal, Platform,
    ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { saveCataOffline, syncPendingCatas } from '../core/offlineCatas';

export default function CataFormModal({
  s,
  theme,
  premiumAccent,
  visible,
  onClose,
  onSave,
  allCafes,
  // Campos desde el hook
  cafeNombre, setCafeNombre,
  cafeId, setCafeId,
  fechaHora, setFechaHora,
  metodoPreparacion, setMetodoPreparacion,
  dosis, setDosis,
  agua, setAgua,
  temperatura, setTemperatura,
  tiempoExtraccion, setTiempoExtraccion,
  puntuacion, setPuntuacion,
  notas, setNotas,
  foto, setFoto,
  contexto, setContexto,
  METODOS_PREPARACION,
  CONTEXTOS,
  guardando,
  isEditing,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(600)).current;

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [mostrarListaCafes, setMostrarListaCafes] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 110, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleDateChange = (_event, selectedDate) => {
    if (selectedDate) {
      const current = new Date(fechaHora);
      selectedDate.setHours(current.getHours(), current.getMinutes());
      setFechaHora(selectedDate.toISOString());
    }
    setShowDatePicker(false);
  };

  const handleTimeChange = (_event, selectedDate) => {
    if (selectedDate) {
      setFechaHora(selectedDate.toISOString());
    }
    setShowTimePicker(false);
  };

  const handleSelectFoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled) {
      setFoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!cafeNombre.trim()) {
      alert('Ingresa el nombre del café');
      return;
    }
    // Chequear conexión
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      // Guardar offline
      await saveCataOffline({
        cafeNombre,
        cafeId,
        fechaHora,
        metodoPreparacion,
        dosis,
        agua,
        temperatura,
        tiempoExtraccion,
        puntuacion,
        notas,
        foto,
        contexto,
        isEditing,
      });
      alert('Sin conexión: tu cata se guardó en el dispositivo y se subirá automáticamente cuando vuelvas a tener internet.');
      onClose();
      return;
    }
    await onSave();
    // Intentar sincronizar pendientes después de guardar online
    try {
      await syncPendingCatas(onSave);
    } catch {}
  };

  const fechaDisplay = new Date(fechaHora).toLocaleDateString('es-ES');
  const horaDisplay = new Date(fechaHora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  if (!visible) return null;

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
          height: '90%',
          backgroundColor: '#fff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 16, paddingTop: 12 }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={s.sectionTitle}>{isEditing ? 'Editar Cata' : 'Nueva Cata'}</Text>
              <TouchableOpacity onPress={onClose} disabled={guardando} style={{ padding: 6 }}>
                <Ionicons name="close" size={24} color={theme.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Café */}
            <Text style={[s.label, { marginTop: 0 }]}>Café</Text>
            <TouchableOpacity
              onPress={() => setMostrarListaCafes(!mostrarListaCafes)}
              style={{
                padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: mostrarListaCafes ? 0 : 16,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 14, color: cafeNombre ? theme.text.primary : theme.text.secondary,
                  fontWeight: cafeNombre ? '600' : '400',
                  flex: 1,
                }}
              >
                {cafeNombre || 'Selecciona o escribe un café'}
              </Text>
              <Ionicons name={mostrarListaCafes ? 'chevron-up' : 'chevron-down'} size={20} color={theme.text.secondary} />
            </TouchableOpacity>

            {mostrarListaCafes && (
              <View style={{ borderWidth: 1, borderColor: '#e8dfd5', borderRadius: 8, marginBottom: 16, maxHeight: 200 }}>
                <ScrollView>
                  {allCafes.map((cafe) => (
                    <TouchableOpacity
                      key={cafe.id}
                      onPress={() => {
                        setCafeNombre(cafe.nombre);
                        setCafeId(cafe.id);
                        setMostrarListaCafes(false);
                      }}
                      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
                        {cafe.nombre}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.text.secondary, marginTop: 2 }}>
                        {cafe.origen || 'Sin origen'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => {
                      setCafeNombre('');
                      setCafeId('');
                      setMostrarListaCafes(false);
                    }}
                    style={{ padding: 12 }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: premiumAccent }}>Escribir café a mano</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}

            {!mostrarListaCafes && (
              <TextInput
                style={[s.input, { marginBottom: 16 }]}
                placeholder="Ej: Ethiopian Yirgacheffe"
                placeholderTextColor="#b3a9a0"
                value={cafeNombre}
                onChangeText={setCafeNombre}
                editable={!guardando}
              />
            )}

            {/* Fecha y Hora */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { marginTop: 0 }]}>Fecha</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={{ padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
                    {fechaDisplay}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { marginTop: 0 }]}>Hora</Text>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  style={{ padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
                    {horaDisplay}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={new Date(fechaHora)}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={new Date(fechaHora)}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                is24Hour={true}
              />
            )}

            {/* Método */}
            <Text style={[s.label, { marginBottom: 8 }]}>Método de Preparación</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {METODOS_PREPARACION.map((metodo) => (
                <TouchableOpacity
                  key={metodo}
                  onPress={() => setMetodoPreparacion(metodo)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
                    backgroundColor: metodoPreparacion === metodo ? premiumAccent : '#f0f0f0',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12, fontWeight: '600',
                      color: metodoPreparacion === metodo ? '#fff' : theme.text.primary,
                    }}
                  >
                    {metodo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Parámetros */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { marginTop: 0 }]}>Dosis (g)</Text>
                <TextInput
                  style={s.input}
                  placeholder="18"
                  placeholderTextColor="#b3a9a0"
                  value={dosis}
                  onChangeText={setDosis}
                  keyboardType="decimal-pad"
                  editable={!guardando}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { marginTop: 0 }]}>Agua (ml)</Text>
                <TextInput
                  style={s.input}
                  placeholder="30"
                  placeholderTextColor="#b3a9a0"
                  value={agua}
                  onChangeText={setAgua}
                  keyboardType="decimal-pad"
                  editable={!guardando}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { marginTop: 0 }]}>Temp. (°C)</Text>
                <TextInput
                  style={s.input}
                  placeholder="92"
                  placeholderTextColor="#b3a9a0"
                  value={temperatura}
                  onChangeText={setTemperatura}
                  keyboardType="decimal-pad"
                  editable={!guardando}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { marginTop: 0 }]}>Extracción (s)</Text>
                <TextInput
                  style={s.input}
                  placeholder="28"
                  placeholderTextColor="#b3a9a0"
                  value={tiempoExtraccion}
                  onChangeText={setTiempoExtraccion}
                  keyboardType="decimal-pad"
                  editable={!guardando}
                />
              </View>
            </View>

            {/* Puntuación */}
            <Text style={[s.label, { marginBottom: 8 }]}>Puntuación</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map((num) => (
                <TouchableOpacity
                  key={num}
                  onPress={() => setPuntuacion(num)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 8,
                    backgroundColor: puntuacion >= num ? premiumAccent : '#f0f0f0',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16, fontWeight: '800',
                      color: puntuacion >= num ? '#fff' : theme.text.secondary,
                    }}
                  >
                    ⭐
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Contexto */}
            <Text style={[s.label, { marginBottom: 8 }]}>Contexto / Estado de ánimo</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {CONTEXTOS.map((ctx) => (
                <TouchableOpacity
                  key={ctx}
                  onPress={() => setContexto(ctx)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: contexto === ctx ? premiumAccent : '#f0f0f0',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11, fontWeight: '600',
                      color: contexto === ctx ? '#fff' : theme.text.primary,
                    }}
                  >
                    {ctx}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Foto */}
            <Text style={[s.label, { marginBottom: 8 }]}>Foto (opcional)</Text>
            <TouchableOpacity
              onPress={handleSelectFoto}
              disabled={guardando}
              style={{
                borderWidth: 2, borderColor: '#e8dfd5', borderStyle: 'dashed', borderRadius: 8,
                paddingVertical: 20, alignItems: 'center', marginBottom: 16,
              }}
            >
              {foto ? (
                <>
                  <Image source={{ uri: foto }} style={{ width: 80, height: 80, borderRadius: 8, marginBottom: 8 }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: premiumAccent }}>Cambiar foto</Text>
                </>
              ) : (
                <>
                  <Ionicons name="image-outline" size={32} color={theme.text.secondary} style={{ marginBottom: 6 }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary }}>Agregar foto</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Notas */}
            <Text style={[s.label, { marginBottom: 0 }]}>Notas personales</Text>
            <TextInput
              style={[s.input, { minHeight: 100, textAlignVertical: 'top' }]}
              placeholder="Describe lo que sentiste: sabor, aroma, cuerpo, acidez, etc."
              placeholderTextColor="#b3a9a0"
              value={notas}
              onChangeText={(v) => setNotas(v.slice(0, 500))}
              multiline
              editable={!guardando}
            />
            <Text style={{ fontSize: 10, color: theme.text.secondary, marginBottom: 16 }}>
              {notas.length}/500
            </Text>

          </ScrollView>

          {/* Botones fijos */}
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={onClose}
                disabled={guardando}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1.5, borderColor: premiumAccent }}
              >
                <Text style={{ textAlign: 'center', color: premiumAccent, fontWeight: '700', fontSize: 12 }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={guardando || !cafeNombre.trim()}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 8,
                  backgroundColor: !cafeNombre.trim() ? '#ccc' : premiumAccent,
                  alignItems: 'center',
                }}
              >
                {guardando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Guardar Cata</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}
