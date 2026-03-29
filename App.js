import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet, Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';
import "react-native-get-random-values";

// IMPORTACIÓN BLINDADA: Importamos todo como 'Firestore'
import * as Firestore from "firebase/firestore";
import { db } from './firebaseConfig';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [nombreCafe, setNombreCafe] = useState('');
  const [notas, setNotas] = useState('');
  const [rating, setRating] = useState(0);
  const [foto, setFoto] = useState(null);
  const [misCafes, setMisCafes] = useState([]);
  const [topCafes, setTopCafes] = useState([]);
  const [cargando, setCargando] = useState(false);

  // --- CARGA DE DATOS ---
  useEffect(() => {
    if (!db) return;

    // Escuchar Bodega (Mis Cafés)
    const qCafes = Firestore.query(
      Firestore.collection(db, "cafes"), 
      Firestore.orderBy("fecha", "desc")
    );
    const unsub1 = Firestore.onSnapshot(qCafes, (snap) => {
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      setMisCafes(docs);
    });

    // Escuchar Ranking
    const qRank = Firestore.query(
      Firestore.collection(db, "ranking"), 
      Firestore.orderBy("votos", "desc"), 
      Firestore.limit(5)
    );
    const unsub2 = Firestore.onSnapshot(qRank, (snap) => {
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      setTopCafes(docs);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  // --- FUNCIONES ---
  const guardarEnFirebase = async () => {
    if (!nombreCafe) return Alert.alert("Error", "El nombre es obligatorio");
    setCargando(true);
    try {
      // 1. Guardar en bodega
      await Firestore.addDoc(Firestore.collection(db, "cafes"), {
        nombre: nombreCafe,
        puntuacion: rating,
        notas: notas,
        foto: foto,
        fecha: new Date().toISOString()
      });

      // 2. Actualizar Ranking
      const refRank = Firestore.doc(db, "ranking", nombreCafe);
      const snapRank = await Firestore.getDoc(refRank);
      if (snapRank.exists()) {
        await Firestore.updateDoc(refRank, { votos: Firestore.increment(1) });
      } else {
        await Firestore.setDoc(refRank, { nombre: nombreCafe, votos: 1 });
      }

      Alert.alert("¡Éxito!", "Café guardado correctamente");
      resetForm();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo conectar con Firebase");
    } finally { setCargando(false); }
  };

  const resetForm = () => {
    setNombreCafe(''); setNotas(''); setRating(0); setFoto(null); setScanned(false);
  };

  const tomarFoto = async () => {
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5 });
    if (!res.canceled) setFoto(res.assets[0].uri);
  };

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 20 }}>Necesitamos permiso de cámara</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Permitir Cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanned ? (
        <View style={{ flex: 1 }}>
          <CameraView 
            onBarcodeScanned={() => setScanned(true)} 
            style={StyleSheet.absoluteFillObject} 
          />
          <View style={styles.overlay}><Text style={styles.overlayText}>Escanea un café</Text></View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>☕ Nuevo Registro</Text>
          
          <TextInput 
            style={styles.input} 
            placeholder="Nombre del Café" 
            value={nombreCafe} 
            onChangeText={setNombreCafe} 
          />

          <View style={styles.stars}>
            {[1,2,3,4,5].map(s => (
              <TouchableOpacity key={s} onPress={() => setRating(s)}>
                <Ionicons name={s <= rating ? "star" : "star-outline"} size={32} color="#6F4E37" />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput 
            style={[styles.input, {height: 80}]} 
            placeholder="Notas de sabor..." 
            multiline 
            value={notas} 
            onChangeText={setNotas} 
          />

          <TouchableOpacity style={styles.btnSec} onPress={tomarFoto}>
            <Ionicons name="camera" size={20} color="#6F4E37" />
            <Text style={styles.btnSecText}>Añadir Foto</Text>
          </TouchableOpacity>

          {foto && <Image source={{ uri: foto }} style={styles.preview} />}

          <TouchableOpacity style={styles.btn} onPress={guardarEnFirebase} disabled={cargando}>
            {cargando ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>GUARDAR</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={resetForm}><Text style={styles.cancel}>Cancelar</Text></TouchableOpacity>

          <Text style={styles.sub}>🏆 Ranking</Text>
          {topCafes.map((c, i) => (
            <View key={c.id} style={styles.rankItem}>
              <Text>{i+1}. {c.nombre}</Text>
              <Text style={{fontWeight:'bold'}}>{c.votos} votos</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF5E6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 30, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#4B2C20', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#D2B48C' },
  stars: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  btn: { backgroundColor: '#6F4E37', padding: 18, borderRadius: 30, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' },
  btnSec: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, padding: 10 },
  btnSecText: { color: '#6F4E37', marginLeft: 10, fontWeight: 'bold' },
  preview: { width: 100, height: 100, borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  cancel: { color: 'red', textAlign: 'center', marginTop: 20 },
  overlay: { position: 'absolute', bottom: 50, alignSelf: 'center' },
  overlayText: { color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 10 },
  sub: { fontSize: 18, fontWeight: 'bold', marginTop: 30, marginBottom: 10 },
  rankItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: 'white', borderRadius: 5, marginBottom: 5 }
});