import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  LogBox,
  ScrollView,
  StyleSheet, Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';
import "react-native-get-random-values";

// 1. IMPORTACIÓN LITE (Solución definitiva para el error 'S' y 'default')
import * as Firestore from "firebase/firestore/lite";
import { db } from './firebaseConfig';

// Ocultar avisos amarillos para que no molesten en la pantalla
LogBox.ignoreAllLogs();

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [nombreCafe, setNombreCafe] = useState('');
  const [notas, setNotas] = useState('');
  const [rating, setRating] = useState(0);
  const [foto, setFoto] = useState(null);
  const [misCafes, setMisCafes] = useState([]);
  const [topCafes, setTopCafes] = useState([]);
  const [subiendo, setSubiendo] = useState(false);

  // --- CARGA DE DATOS ---
  // Nota: 'lite' no soporta onSnapshot (tiempo real), usamos getDocs
  const cargarDatos = async () => {
    if (!db) return;
    try {
      const qCafes = Firestore.query(
        Firestore.collection(db, "cafes"), 
        Firestore.orderBy("fecha", "desc")
      );
      const snapCafes = await Firestore.getDocs(qCafes);
      const docsCafes = [];
      snapCafes.forEach(d => docsCafes.push({ id: d.id, ...d.data() }));
      setMisCafes(docsCafes);

      const qRank = Firestore.query(
        Firestore.collection(db, "ranking"), 
        Firestore.orderBy("votos", "desc"), 
        Firestore.limit(5)
      );
      const snapRank = await Firestore.getDocs(qRank);
      const docsRank = [];
      snapRank.forEach(d => docsRank.push({ id: d.id, ...d.data() }));
      setTopCafes(docsRank);
    } catch (e) {
      console.log("Error al cargar:", e);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // --- LÓGICA DE NEGOCIO ---
  const guardarCafe = async () => {
    if (!nombreCafe) return Alert.alert("Aviso", "Escribe el nombre del café");
    setSubiendo(true);
    try {
      // Guardar café
      await Firestore.addDoc(Firestore.collection(db, "cafes"), {
        nombre: nombreCafe,
        puntuacion: rating,
        notas: notas,
        foto: foto,
        fecha: new Date().toISOString()
      });

      // Actualizar Ranking
      const refRank = Firestore.doc(db, "ranking", nombreCafe);
      const snapRank = await Firestore.getDoc(refRank);
      if (snapRank.exists()) {
        await Firestore.updateDoc(refRank, { votos: (snapRank.data().votos || 0) + 1 });
      } else {
        await Firestore.setDoc(refRank, { nombre: nombreCafe, votos: 1 });
      }

      Alert.alert("✅ Éxito", "Café guardado");
      setNombreCafe(''); setNotas(''); setRating(0); setFoto(null); setScanned(false);
      cargarDatos(); // Recargar lista manualmente
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error de conexión");
    } finally { setSubiendo(false); }
  };

  const hacerFoto = async () => {
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5 });
    if (!res.canceled) setFoto(res.assets[0].uri);
  };

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="cafe" size={80} color="#6F4E37" />
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>ACTIVAR CÁMARA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanned ? (
        <View style={{ flex: 1 }}>
          <CameraView onBarcodeScanned={() => setScanned(true)} style={StyleSheet.absoluteFillObject} />
          <View style={styles.overlay}><Text style={styles.overlayText}>Escanea un código</Text></View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>☕ Nueva Entrada</Text>
          <TextInput style={styles.input} placeholder="Nombre" value={nombreCafe} onChangeText={setNombreCafe} />
          
          <View style={styles.stars}>
            {[1,2,3,4,5].map(s => (
              <TouchableOpacity key={s} onPress={() => setRating(s)}>
                <Ionicons name={s <= rating ? "star" : "star-outline"} size={35} color="#6F4E37" />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.btnSec} onPress={hacerFoto}>
            <Text style={styles.btnSecText}>TOMAR FOTO</Text>
          </TouchableOpacity>
          {foto && <Image source={{ uri: foto }} style={styles.preview} />}

          <TouchableOpacity style={styles.btn} onPress={guardarCafe} disabled={subiendo}>
            {subiendo ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>GUARDAR</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setScanned(false)}><Text style={styles.cancel}>Volver</Text></TouchableOpacity>

          <Text style={styles.subTitle}>🏆 Top 5</Text>
          {topCafes.map((c, i) => (
            <View key={c.id} style={styles.rankItem}><Text>{i+1}. {c.nombre}</Text><Text>{c.votos} pts</Text></View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF5E6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 25, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#4B2C20', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#D2B48C' },
  stars: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  btn: { backgroundColor: '#6F4E37', padding: 18, borderRadius: 30, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' },
  btnSec: { padding: 10, borderWidth: 1, borderColor: '#6F4E37', borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  btnSecText: { color: '#6F4E37', fontWeight: 'bold' },
  preview: { width: 100, height: 100, borderRadius: 15, alignSelf: 'center', marginBottom: 20 },
  cancel: { color: 'red', textAlign: 'center', marginTop: 20 },
  overlay: { position: 'absolute', bottom: 60, alignSelf: 'center' },
  overlayText: { color: 'white', backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 10 },
  subTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 30, marginBottom: 10 },
  rankItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: 'white', marginBottom: 5, borderRadius: 8 }
});