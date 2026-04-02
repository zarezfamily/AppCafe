import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, Image, SafeAreaView,
  ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { addDocument, getDocument, setDocument, updateDocument } from '../../firebaseConfig';
import { THEME } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { shared } from '../styles/sharedStyles';
import Stars from '../components/Stars';

export default function FormScreen({ onSave, onBack, onCafeAdded }) {
  const { user } = useAuth();
  const [nombreCafe, setNombreCafe] = useState('');
  const [origen, setOrigen]         = useState('');
  const [notas, setNotas]           = useState('');
  const [rating, setRating]         = useState(0);
  const [foto, setFoto]             = useState(null);
  const [subiendo, setSubiendo]     = useState(false);

  const hacerFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitas permitir la cámara.'); return; }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6 });
    if (!res.canceled) setFoto(res.assets[0].uri);
  };

  const guardarCafe = async () => {
    if (!nombreCafe.trim()) return Alert.alert('Aviso', 'Escribe el nombre del café');
    setSubiendo(true);
    try {
      await addDocument('cafes', { nombre: nombreCafe.trim(), origen: origen.trim(), puntuacion: rating, notas, foto: foto || '', fecha: new Date().toISOString(), uid: user.uid });
      const rankId = nombreCafe.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
      const ex = await getDocument('ranking', rankId);
      if (ex) await updateDocument('ranking', rankId, { votos: (ex.votos || 0) + 1 });
      else await setDocument('ranking', rankId, { nombre: nombreCafe.trim(), votos: 1 });
      onCafeAdded?.({
        nombre: nombreCafe.trim(),
        pais: '',
        origen: origen.trim(),
        variedad: '',
        foto: foto || '',
        notas: notas || '',
      });
      Alert.alert('✅ Guardado', 'Café añadido a tu colección');
      onSave();
    } catch { Alert.alert('Error', 'No se pudo conectar con Firebase'); }
    finally { setSubiendo(false); }
  };

  return (
    <SafeAreaView style={shared.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={shared.formScroll}>
        <TouchableOpacity onPress={onBack} style={shared.backRow}>
          <Ionicons name="chevron-back" size={20} color={THEME.brand.accentDeep} />
          <Text style={shared.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={shared.formTitle}>Nuevo café</Text>
        <TouchableOpacity style={foto ? {} : shared.fotoEmpty} onPress={hacerFoto}>
          {foto
            ? <Image source={{ uri: foto }} style={shared.fotoFull} />
            : <><Ionicons name="camera-outline" size={32} color={THEME.text.muted} /><Text style={shared.fotoEmptyText}>Añadir foto</Text></>
          }
        </TouchableOpacity>
        {foto && <TouchableOpacity onPress={hacerFoto}><Text style={shared.retake}>Cambiar foto</Text></TouchableOpacity>}
        <Text style={shared.label}>Nombre del café</Text>
        <TextInput style={shared.input} placeholder="Ej: Yirgacheffe Etiopía" placeholderTextColor="#bbb" value={nombreCafe} onChangeText={setNombreCafe} />
        <Text style={shared.label}>Origen / Tostado</Text>
        <TextInput style={shared.input} placeholder="Ej: Etiopía · Tostado medio" placeholderTextColor="#bbb" value={origen} onChangeText={setOrigen} />
        <Text style={shared.label}>Puntuación</Text>
        <View style={{ marginBottom: 20 }}><Stars value={rating} onPress={setRating} size={32} /></View>
        <Text style={shared.label}>Notas de cata</Text>
        <TextInput style={[shared.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Aromas, sabores, acidez..." placeholderTextColor="#bbb" value={notas} onChangeText={setNotas} multiline />
        <TouchableOpacity style={shared.redBtn} onPress={guardarCafe} disabled={subiendo}>
          {subiendo ? <ActivityIndicator color="#fff" /> : <Text style={shared.redBtnText}>Guardar café</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
