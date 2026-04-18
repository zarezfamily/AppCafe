import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
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

import Stars from '../components/Stars';
import { useAuth } from '../context/AuthContext';
import {
  addDocument,
  getDocument,
  queryCollection,
  setDocument,
  updateDocument,
} from '../services/firestoreService';
import { uploadImageToStorage } from '../services/storageService';

export default function FormScreen({ onSave, onBack, onCafeAdded, s, premiumAccent, scannedData }) {
  const { user } = useAuth();
  const [nombreCafe, setNombreCafe] = useState('');
  const [origen, setOrigen] = useState('');
  const [notas, setNotas] = useState('');
  const [rating, setRating] = useState(0);
  const [foto, setFoto] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [ean, setEan] = useState(scannedData?.ean || '');

  useEffect(() => {
    if (scannedData?.ean) {
      setEan(scannedData.ean);
    }
  }, [scannedData]);

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
      const isFromScanner = !!scannedData?.ean;
      const normalizedEan = String(ean || '')
        .replace(/\s+/g, '')
        .trim();

      if (normalizedEan) {
        const existingByEan = await queryCollection('cafes', 'ean', normalizedEan);
        if (existingByEan?.length) {
          Alert.alert('Ya existe', 'Ya hay un café con ese EAN en la base de datos.');
          setSubiendo(false);
          return;
        }
      }

      let finalFoto = foto || '';
      if (finalFoto && !String(finalFoto).startsWith('http')) {
        finalFoto = await uploadImageToStorage(finalFoto, 'cafes');
      }

      const now = new Date().toISOString();

      const cafePayload = {
        nombre: nombreCafe.trim(),
        origen: origen.trim(),
        puntuacion: rating,
        notas,
        foto: finalFoto,
        fecha: now,
        createdAt: now,
        updatedAt: now,
        uid: user.uid,
        ean: normalizedEan,

        reviewStatus: isFromScanner ? 'pending' : 'approved',
        sourceType: isFromScanner ? 'scanner_pending' : 'manual',
        aiGenerated: false,
        aiConfidenceScore: 0,
        aiSuggestion: {},
        aiStatus: isFromScanner ? 'queued' : 'manual',
        imageValidation: {
          status: finalFoto ? 'pending' : 'not_provided',
        },
        isSpecialty: true,
        appVisible: !isFromScanner,
        scannerVisible: true,
      };

      const created = await addDocument('cafes', cafePayload);

      if (isFromScanner && created?.id) {
        await addDocument('ai_jobs', {
          type: 'coffee_enrichment',
          targetCollection: 'cafes',
          targetId: created.id,
          status: 'queued',
          sourceType: 'scanner_pending',
          ean: normalizedEan,
          foto: finalFoto || '',
          payload: {
            nombre: nombreCafe.trim(),
            origen: origen.trim(),
            notas,
          },
          createdAt: now,
          updatedAt: now,
          uid: user.uid,
        });
      }

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
        aiJobQueued: isFromScanner,
      });

      if (isFromScanner) {
        Alert.alert(
          'Café enviado a revisión',
          'Se ha creado el café pendiente y se ha puesto en cola para enriquecimiento automático con IA.'
        );
      }

      onSave?.();
    } catch (error) {
      console.log('Error guardando café:', error);
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

        <Text style={s.label}>EAN (código de barras)</Text>
        <TextInput
          style={s.input}
          placeholder="Ej: 8411234567890"
          placeholderTextColor="#bbb"
          value={ean}
          onChangeText={setEan}
          keyboardType="number-pad"
        />

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
