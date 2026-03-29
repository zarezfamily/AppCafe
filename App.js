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

// 1. IMPORTACIÓN BLINDADA (Clave para matar el error 'S')
import * as Firestore from "firebase/firestore";
import { db } from './firebaseConfig';

// Ignorar alertas visuales para una interfaz limpia
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

  // --- CARGA DE DATOS DESDE FIREBASE ---
  useEffect(() => {
    if (!db) return;

    // Escuchar Bodega Personal
    const qCafes = Firestore.query(
      Firestore.collection(db, "cafes"), 
      Firestore.orderBy("fecha", "desc")
    );
    const unsubCafes = Firestore.onSnapshot(qCafes, (snap) => {
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      setMisCafes(docs);
    }, (err) => console.log("Error Firestore:", err));

    // Escuchar Ranking Global
    const qRank = Firestore.query(
      Firestore.collection(db, "ranking"), 
      Firestore.orderBy("votos", "desc"), 
      Firestore.limit(5)
    );
    const unsubRank = Firestore.onSnapshot(qRank, (snap) => {
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      setTopCafes(docs);
    }, (err) => console.log("Error Ranking:", err));

    return () => { unsubCafes(); unsubRank(); };
  }, []);

  // --- LÓGICA DE GUARDADO ---
  const guardarCafe = async () => {
    if (!nombreCafe) return Alert.alert("Aviso", "Escribe el nombre del café");
    setSubiendo(true);
    try {
      // Guardar en la colección de cafés
      await Firestore.addDoc(Firestore.collection(db, "cafes"), {
        nombre: nombreCafe,
        puntuacion: rating,
        notas: notas,
        foto: foto,
        fecha: new Date().toISOString()
      });

      // Actualizar Ranking Global
      const refRanking = Firestore.doc(db, "ranking", nombreCafe);
      const docSnap = await Firestore.getDoc(refRanking);
      if (docSnap.exists()) {
        await Firestore.updateDoc(refRanking, { votos: Firestore.increment(1) });
      } else {
        await Firestore.setDoc(refRanking, { nombre: nombreCafe, votos: 1 });
      }

      Alert.alert("✅ Guardado", "Tu café ya está en la bodega");
      limpiarFormulario();
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo conectar con la base de datos");
    } finally { setSubiendo(false); }
  };

  const limpiarFormulario = () => {
    setNombreCafe(''); setNotas(''); setRating(0); setFoto(null); setScanned(false);
  };

  const hacerFoto = async () => {
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5 });
    if (!res.canceled) setFoto(res.assets[0].uri);
  };

  // --- RENDERIZADO ---
  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="cafe" size={80} color="#6F4E37" />
        <Text style={{ textAlign: 'center', margin: 20 }}>Necesitamos permiso de cámara para escanear tus cafés.</Text>
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
          <Text style={styles.title}>☕ Nueva Entrada</Text>
          
          <TextInput style={styles.input} placeholder="Nombre del Café" value={nombreCafe} onChangeText={setNombreCafe} />

          <View style={styles.stars}>
            {[1,2,3,4,5].map(s => (
              <TouchableOpacity key={s} onPress={() => setRating(s)}>
                <Ionicons name={s <= rating ? "star" : "star-outline"} size={35} color="#6F4E37" />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={[styles.input, {height: 80}]} placeholder="Notas de sabor..." multiline value={notas} onChangeText={setNotas} />

          <TouchableOpacity style={styles.btnSec} onPress={hacerFoto}>
            <Ionicons name="camera" size={20} color="#6F4E37" />
            <Text style={styles.btnSecText}>HACER FOTO</Text>
          </TouchableOpacity>

          {foto && <Image source={{ uri: foto }} style={styles.preview} />}

          <TouchableOpacity style={styles.btn} onPress={guardarCafe} disabled={subiendo}>
            {subiendo ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>GUARDAR EN LA NUBE</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={limpiarFormulario}><Text style={styles.cancel}>Volver a Escanear</Text></TouchableOpacity>

          {/* SECCIÓN RANKING */}
          <View style={styles.rankingBox}>
            <Text style={styles.subTitle}>🏆 Ranking Global</Text>
            {topCafes.map((c, i) => (
              <View key={c.id} style={styles.rankItem}>
                <Text>{i+1}. {c.nombre}</Text>
                <Text style={{fontWeight:'bold'}}>{c.votos} pts</Text>
              </View>
            ))}
          </View>

          {/* SECCIÓN BODEGA PERSONAL */}
          <Text style={styles.subTitle}>📦 Mi Bodega</Text>
          {misCafes.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={{flex:1}}>
                <Text style={styles.cardTitle}>{item.nombre}</Text>
                <Text style={{color:'#888'}}>{'⭐'.repeat(item.puntuacion)}</Text>
              </View>
              <TouchableOpacity onPress={() => Firestore.deleteDoc(Firestore.doc(db, "cafes", item.id))}>
                <Ionicons name="trash" size={20} color="#FF6347" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// --- ESTILOS ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF5E6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  scroll: { padding: 25, paddingTop: 60, paddingBottom: 50 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#4B2C20', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#D2B48C' },
  stars: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  btn: { backgroundColor: '#6F4E37', padding: 18, borderRadius: 30, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' },
  btnSec: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, padding: 10, borderWidth: 1, borderColor: '#6F4E37', borderRadius: 12 },
  btnSecText: { color: '#6F4E37', marginLeft: 10, fontWeight: 'bold' },
  preview: { width: 120, height: 120, borderRadius: 15, alignSelf: 'center', marginBottom: 20 },
  cancel: { color: '#A52A2A', textAlign: 'center', marginTop: 25, fontWeight: 'bold' },
  overlay: { position: 'absolute', bottom: 60, alignSelf: 'center' },
  overlayText: { color: 'white', backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 15 },
  subTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 35, marginBottom: 15, color: '#4B2C20' },
  rankingBox: { backgroundColor: '#FFF5EE', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#D2B48C' },
  rankItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#EEE' },
  card: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10, alignItems: 'center', elevation: 2 },
  cardTitle: { fontWeight: 'bold', fontSize: 16 }
});