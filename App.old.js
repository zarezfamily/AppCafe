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

// 1. IMPORTACIÓN ÚNICA Y BLINDADA (Clave para matar la 'S')
import * as Firestore from "firebase/firestore/lite";
import { db } from './firebaseConfig';

// Log de confirmación para la terminal
console.log("🚀 EJECUTANDO APP V3: Firestore Lite Activo");

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

  // --- CARGA DE DATOS (Versión Lite) ---
  const cargarDatos = async () => {
    if (!db) return;
    try {
      // Cargar Bodega Personal
      const qCafes = Firestore.query(
        Firestore.collection(db, "cafes"), 
        Firestore.orderBy("fecha", "desc")
      );
      const snapCafes = await Firestore.getDocs(qCafes);
      const docsCafes = [];
      snapCafes.forEach(d => docsCafes.push({ id: d.id, ...d.data() }));
      setMisCafes(docsCafes);

      // Cargar Ranking
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
      console.log("Error de carga V3:", e);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // --- LÓGICA DE GUARDADO ---
  const guardarCafe = async () => {
    if (!nombreCafe) return Alert.alert("Aviso", "Escribe el nombre del café");
    setSubiendo(true);
    try {
      // Guardar en la colección principal
      await Firestore.addDoc(Firestore.collection(db, "cafes"), {
        nombre: nombreCafe,
        puntuacion: rating,
        notas: notas,
        foto: foto,
        fecha: new Date().toISOString()
      });

      // Actualizar Ranking Global (Lógica manual para Lite)
      const refRank = Firestore.doc(db, "ranking", nombreCafe);
      const snapRank = await Firestore.getDoc(refRank);
      if (snapRank.exists()) {
        await Firestore.updateDoc(refRank, { votos: (snapRank.data().votos || 0) + 1 });
      } else {
        await Firestore.setDoc(refRank, { nombre: nombreCafe, votos: 1 });
      }

      Alert.alert("✅ Guardado", "Café registrado en la nube");
      setNombreCafe(''); setNotas(''); setRating(0); setFoto(null); setScanned(false);
      cargarDatos(); // Recarga manual
    } catch (e) {
      console.log("Error al guardar:", e);
      Alert.alert("Error", "No se pudo conectar con Firebase");
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
        <Text style={{ textAlign: 'center', margin: 20 }}>Permiso de cámara necesario.</Text>
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
          <View style={styles.overlay}><Text style={styles.overlayText}>Enfoca el paquete de café</Text></View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>☕ Nueva Entrada V3</Text>
          <Text style={styles.versionTag}>(BODEGA BLINDADA ACTIVADA)</Text>
          
          <TextInput style={styles.input} placeholder="Nombre del Café" value={nombreCafe} onChangeText={setNombreCafe} />

          <View style={styles.stars}>
            {[1,2,3,4,5].map(s => (
              <TouchableOpacity key={s} onPress={() => setRating(s)}>
                <Ionicons name={s <= rating ? "star" : "star-outline"} size={35} color="#6F4E37" />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={[styles.input, {height: 60}]} placeholder="Notas..." value={notas} onChangeText={setNotas} />

          <TouchableOpacity style={styles.btnSec} onPress={hacerFoto}>
            <Text style={styles.btnSecText}>HACER FOTO</Text>
          </TouchableOpacity>
          {foto && <Image source={{ uri: foto }} style={styles.preview} />}

          <TouchableOpacity style={styles.btn} onPress={guardarCafe} disabled={subiendo}>
            {subiendo ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>GUARDAR CAFÉ</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setScanned(false)}><Text style={styles.cancel}>Volver al Escáner</Text></TouchableOpacity>

          {/* RANKING */}
          <Text style={styles.subTitle}>🏆 Ranking Global</Text>
          {topCafes.map((c, i) => (
            <View key={c.id} style={styles.rankItem}>
              <Text>{i+1}. {c.nombre}</Text>
              <Text style={{fontWeight:'bold'}}>{c.votos} pts</Text>
            </View>
          ))}

          {/* BODEGA */}
          <Text style={styles.subTitle}>📦 Mi Bodega</Text>
          {misCafes.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={{flex:1}}>
                <Text style={styles.cardTitle}>{item.nombre}</Text>
                <Text style={{color:'#888'}}>{'⭐'.repeat(item.puntuacion)}</Text>
              </View>
              <TouchableOpacity onPress={async () => {
                await Firestore.deleteDoc(Firestore.doc(db, "cafes", item.id));
                cargarDatos();
              }}>
                <Ionicons name="trash" size={20} color="#FF6347" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF5E6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  scroll: { padding: 25, paddingTop: 60, paddingBottom: 50 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#4B2C20', textAlign: 'center' },
  versionTag: { fontSize: 10, color: '#2E8B57', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#D2B48C' },
  stars: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  btn: { backgroundColor: '#6F4E37', padding: 18, borderRadius: 30, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' },
  btnSec: { padding: 10, borderWidth: 1, borderColor: '#6F4E37', borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  btnSecText: { color: '#6F4E37', fontWeight: 'bold' },
  preview: { width: 100, height: 100, borderRadius: 15, alignSelf: 'center', marginBottom: 15 },
  cancel: { color: '#A52A2A', textAlign: 'center', marginTop: 25, fontWeight: 'bold' },
  overlay: { position: 'absolute', bottom: 60, alignSelf: 'center' },
  overlayText: { color: 'white', backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 15 },
  subTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 35, marginBottom: 15, color: '#4B2C20' },
  rankItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: 'white', marginBottom: 5, borderRadius: 10, borderWidth: 1, borderColor: '#EEE' },
  card: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10, alignItems: 'center' },
  cardTitle: { fontWeight: 'bold', fontSize: 16 }
});