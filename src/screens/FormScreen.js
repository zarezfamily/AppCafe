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

  const recoveryCafe = scannedData?.recoveryCafe || null;
  const isRecoveryMode = !!(scannedData?.recoveryMode && recoveryCafe?.id);

  const [nombreCafe, setNombreCafe] = useState(recoveryCafe?.nombre || recoveryCafe?.name || '');
  const [origen, setOrigen] = useState(recoveryCafe?.origen || '');
  const [notas, setNotas] = useState(recoveryCafe?.notas || '');
  const [rating, setRating] = useState(Number(recoveryCafe?.puntuacion || 0));
  const [foto, setFoto] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [ean, setEan] = useState(scannedData?.ean || recoveryCafe?.ean || '');

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

    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.6,
    });

    if (!res.canceled) {
      setFoto(res.assets[0].uri);
    }
  };

  const guardarCafe = async () => {
    const hasBarcode = !!String(scannedData?.ean || ean || '').trim();
    const hasPhoto = !!foto;
    const canAutoEnrich = hasBarcode || hasPhoto || isRecoveryMode;

    if (!nombreCafe.trim() && !canAutoEnrich) {
      Alert.alert('Aviso', 'Añade al menos un nombre, una foto o un código de barras.');
      return;
    }

    if (isRecoveryMode && !foto) {
      Alert.alert('Añade una foto', 'Para completar este café pendiente necesitas hacer una foto.');
      return;
    }

    setSubiendo(true);

    try {
      const isFromScanner = !!scannedData?.ean && !isRecoveryMode;
      const isPhotoOnlyFlow = !isFromScanner && !!foto && !nombreCafe.trim() && !isRecoveryMode;
      const isAutoFlow = isFromScanner || isPhotoOnlyFlow || isRecoveryMode;

      const normalizedEan = String(ean || '')
        .replace(/\D/g, '')
        .trim();

      if (normalizedEan && !isRecoveryMode) {
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

      if (isRecoveryMode) {
        await updateDocument('cafes', recoveryCafe.id, {
          nombre:
            nombreCafe.trim() ||
            recoveryCafe?.nombre ||
            recoveryCafe?.name ||
            'Pendiente de identificar',
          origen: origen.trim(),
          notas,
          puntuacion: rating,
          foto: finalFoto || recoveryCafe?.foto || '',
          ean: normalizedEan || recoveryCafe?.ean || '',
          reviewStatus: 'pending',
          sourceType: 'photo_pending',
          aiGenerated: false,
          aiConfidenceScore: 0,
          aiSuggestion: {},
          aiStatus: 'queued',
          imageValidation: {
            status: finalFoto ? 'pending' : recoveryCafe?.foto ? 'pending' : 'not_provided',
          },
          appVisible: false,
          scannerVisible: true,
          updatedAt: now,
        });

        await addDocument('ai_jobs', {
          type: 'coffee_enrichment',
          targetCollection: 'cafes',
          targetId: recoveryCafe.id,
          status: 'queued',
          sourceType: 'photo_pending',
          ean: normalizedEan || recoveryCafe?.ean || '',
          foto: finalFoto || recoveryCafe?.foto || '',
          payload: {
            nombre: nombreCafe.trim(),
            origen: origen.trim(),
            notas,
          },
          createdAt: now,
          updatedAt: now,
          uid: user.uid,
        });

        onCafeAdded?.({
          ...(recoveryCafe || {}),
          id: recoveryCafe.id,
          nombre:
            nombreCafe.trim() ||
            recoveryCafe?.nombre ||
            recoveryCafe?.name ||
            'Pendiente de identificar',
          origen: origen.trim(),
          foto: finalFoto || recoveryCafe?.foto || '',
          ean: normalizedEan || recoveryCafe?.ean || '',
          aiJobQueued: true,
        });

        Alert.alert(
          'Foto enviada',
          'Hemos actualizado el café pendiente y relanzado la IA para completarlo automáticamente.'
        );

        onSave?.();
        return;
      }

      const cafePayload = {
        nombre: nombreCafe.trim() || 'Pendiente de identificar',
        origen: origen.trim(),
        puntuacion: rating,
        notas,
        foto: finalFoto,
        fecha: now,
        createdAt: now,
        updatedAt: now,
        uid: user.uid,
        ean: normalizedEan,

        reviewStatus: isAutoFlow ? 'pending' : 'approved',
        sourceType: isFromScanner
          ? 'scanner_pending'
          : isPhotoOnlyFlow
            ? 'photo_pending'
            : 'manual',
        aiGenerated: false,
        aiConfidenceScore: 0,
        aiSuggestion: {},
        aiStatus: isAutoFlow ? 'queued' : 'manual',
        imageValidation: {
          status: finalFoto ? 'pending' : 'not_provided',
        },
        isSpecialty: true,
        appVisible: !isAutoFlow,
        scannerVisible: true,
      };

      const created = await addDocument('cafes', cafePayload);

      if (isAutoFlow && created?.id) {
        await addDocument('ai_jobs', {
          type: 'coffee_enrichment',
          targetCollection: 'cafes',
          targetId: created.id,
          status: 'queued',
          sourceType: isFromScanner ? 'scanner_pending' : 'photo_pending',
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

      const rankId = (nombreCafe.trim() || 'pendiente_de_identificar')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_');

      const existente = await getDocument('ranking', rankId);
      if (existente) {
        await updateDocument('ranking', rankId, { votos: (existente.votos || 0) + 1 });
      } else {
        await setDocument('ranking', rankId, {
          nombre: nombreCafe.trim() || 'Pendiente de identificar',
          votos: 1,
        });
      }

      onCafeAdded?.({
        ...cafePayload,
        id: created?.id || rankId,
        aiJobQueued: isAutoFlow,
      });

      if (isAutoFlow) {
        Alert.alert(
          'Café enviado a revisión',
          'Se ha creado el café pendiente y se ha puesto en cola para enriquecimiento automático con IA.'
        );
      }

      onSave?.();
    } catch (error) {
      console.log('Error guardando café:', error);
      Alert.alert('Error', error?.message || 'No se pudo guardar el café.');
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

        <Text style={s.formTitle}>
          {isRecoveryMode ? 'Completar café pendiente' : 'Nuevo café'}
        </Text>

        {isRecoveryMode && (
          <View
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 12,
              backgroundColor: '#fff7ed',
              borderWidth: 1,
              borderColor: '#fed7aa',
            }}
          >
            <Text style={{ color: '#9a3412', fontWeight: '700' }}>
              Este café ya existe pero le faltan datos. Añade una foto para relanzar la IA.
            </Text>
          </View>
        )}

        <TouchableOpacity style={foto ? undefined : s.fotoEmpty} onPress={hacerFoto}>
          {foto ? (
            <Image source={{ uri: foto }} style={s.fotoFull} />
          ) : recoveryCafe?.foto ? (
            <Image source={{ uri: recoveryCafe.foto }} style={s.fotoFull} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={32} color="#aaa" />
              <Text style={s.fotoEmptyText}>
                {isRecoveryMode ? 'Añadir foto para completar' : 'Añadir foto'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {(foto || recoveryCafe?.foto) && (
          <TouchableOpacity onPress={hacerFoto}>
            <Text style={s.retake}>{foto ? 'Cambiar foto' : 'Añadir una nueva foto'}</Text>
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
          editable={!isRecoveryMode}
        />

        <Text style={s.label}>Nombre del café</Text>
        <TextInput
          style={s.input}
          placeholder="Opcional si hay foto o código de barras"
          placeholderTextColor="#bbb"
          value={nombreCafe}
          onChangeText={setNombreCafe}
        />

        <Text style={s.label}>Origen / Tostado</Text>
        <TextInput
          style={s.input}
          placeholder="Opcional"
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
          placeholder="Opcional"
          placeholderTextColor="#bbb"
          value={notas}
          onChangeText={setNotas}
          multiline
        />

        <TouchableOpacity style={s.redBtn} onPress={guardarCafe} disabled={subiendo}>
          {subiendo ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.redBtnText}>
              {isRecoveryMode ? 'Completar y relanzar IA' : 'Guardar café'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
