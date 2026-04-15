import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  addDocument,
  getDocument,
  setDocument,
  updateDocument,
} from '../services/firestoreService';
import Stars from '../components/Stars';
import { useAuth } from '../context/AuthContext';

export default function FormScreen({ onSave, onBack, onCafeAdded, s, premiumAccent }) {
  const { user } = useAuth();
  const [nombreCafe, setNombreCafe] = useState('');
  const [origen, setOrigen] = useState('');
  const [notas, setNotas] = useState('');
  const [rating, setRating] = useState(0);
  const [foto, setFoto] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  const hacerFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitas permitir la cámara.');
      return;
    }

    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6 });
    if (!res.canceled) setFoto(res.assets[0].uri);
  };

  const guardarCafe = async () => {
    if (!nombreCafe.trim()) {
      Alert.alert('Aviso', 'Escribe el nombre del café');
      return;
    }

    setSubiendo(true);

    try {
      const cafePayload = {
        nombre: nombreCafe.trim(),
        origen: origen.trim(),
        puntuacion: rating,
        notas,
        foto: foto || '',
        fecha: new Date().toISOString(),
        uid: user.uid,
      };

      const created = await addDocument('cafes', cafePayload);

      const rankId = nombreCafe
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_');

      const existente = await getDocument('ranking', rankId);
      if (existente) {
        await updateDocument('ranking', rankId, { votos: (existente.votos || 0) + 1 });
      } else {
        await setDocument('ranking', rankId, { nombre: nombreCafe.trim(), votos: 1 });
      }

      onCafeAdded?.({
        ...cafePayload,
        id: created?.id || rankId,
      });
      onSave?.();
    } catch {
      Alert.alert('Error', 'No se pudo guardar el café.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={s.formScroll}>
        <TouchableOpacity onPress={onBack} style={s.backRow}>
          <Ionicons name="chevron-back" size={20} color={premiumAccent} />
          <Text style={s.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={s.formTitle}>Nuevo café</Text>

        <TouchableOpacity style={foto ? undefined : s.fotoEmpty} onPress={hacerFoto}>
          {foto ? (
            <Image source={{ uri: foto }} style={s.fotoFull} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={32} color="#aaa" />
              <Text style={s.fotoEmptyText}>Añadir foto</Text>
            </>
          )}
        </TouchableOpacity>
        {foto && (
          <TouchableOpacity onPress={hacerFoto}>
            <Text style={s.retake}>Cambiar foto</Text>
          </TouchableOpacity>
        )}

        <Text style={s.label}>Nombre del café</Text>
        <TextInput
          style={s.input}
          placeholder="Ej: Yirgacheffe Etiopía"
          placeholderTextColor="#bbb"
          value={nombreCafe}
          onChangeText={setNombreCafe}
        />

        <Text style={s.label}>Origen / Tostado</Text>
        <TextInput
          style={s.input}
          placeholder="Ej: Etiopía · Tostado medio · Floral"
          placeholderTextColor="#bbb"
          value={origen}
          onChangeText={setOrigen}
        />

        <Text style={s.label}>Puntuación</Text>
        <View style={{ marginBottom: 20 }}>
          <Stars value={rating} onPress={setRating} size={32} />
        </View>

        <Text style={s.label}>Notas de cata</Text>
        <TextInput
          style={[s.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Aromas, sabores, acidez..."
          placeholderTextColor="#bbb"
          value={notas}
          onChangeText={setNotas}
          multiline
        />

        <TouchableOpacity style={s.redBtn} onPress={guardarCafe} disabled={subiendo}>
          {subiendo ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.redBtnText}>Guardar café</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
