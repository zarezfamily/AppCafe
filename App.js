// 1. IMPORTACIONES DE SISTEMA
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  LogBox,
  ScrollView,
  StyleSheet, Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';
import "react-native-get-random-values";

// 2. CONFIGURACIÓN DE FIREBASE (Importación segura anti-error 'S')
import * as Firestore from "firebase/firestore";
import { db } from './firebaseConfig';

// Ignoramos warnings visuales para una interfaz limpia
LogBox.ignoreAllLogs();

// --- COMPONENTE DE ESTRELLAS ---
const StarRating = ({ rating, setRating, interactive = false }) => (
  <View style={styles.starContainer}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity 
        key={star} 
        disabled={!interactive} 
        onPress={() => setRating(star)}
      >
        <Ionicons 
          name={star <= rating ? "star" : "star-outline"} 
          size={24} 
          color={star <= rating ? "#FFD700" : "#C0C0C0"} 
          style={{ marginRight: 5 }}
        />
      </TouchableOpacity>
    ))}
  </View>
);

export default function App() {
  // --- ESTADOS ---
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [nombreCafe, setNombreCafe] = useState('');
  const [notas, setNotas] = useState('');
  const [rating, setRating] = useState(0);
  const [fotoTemporal, setFotoTemporal] = useState(null);
  const [misCafes, setMisCafes] = useState([]);
  const [topCafes, setTopCafes] = useState([]);
  const [subiendo, setSubiendo] = useState(false);

  // --- CARGA DE DATOS (ESCUCHA ACTIVA) ---
  useEffect(() => {
    if (!db) return;

    // Consulta Bodega Personal
    const qCafes = Firestore.query(
      Firestore.collection(db, "cafes"), 
      Firestore.orderBy("fecha", "desc")
    );
    
    const unsubCafes = Firestore.onSnapshot(qCafes, (snap) => {
      const docs = [];
      snap.forEach((d) => docs.push({ id: d.id, ...d.data() }));
      setMisCafes(docs);
    });

    // Consulta Ranking Global
    const qRanking = Firestore.query(
      Firestore.collection(db, "ranking"), 
      Firestore.orderBy("votos", "desc"), 
      Firestore.limit(5)
    );

    const unsubRanking = Firestore.onSnapshot(qRanking, (snap) => {
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      setTopCafes(docs);
    });

    return () => {
      unsubCafes();
      unsubRanking();
    };
  }, []);

  // --- LÓGICA DE NEGOCIO ---
  
  const sumarVoto = async (nombre) => {
    try {
      const refRanking = Firestore.doc(db, "ranking", nombre);
      const docSnap = await Firestore.getDoc(refRanking);
      if (docSnap.exists()) {
        await Firestore.updateDoc(refRanking, { votos: Firestore.increment(1) });
      } else {
        await Firestore.setDoc(refRanking, { nombre: nombre, votos: 1 });
      }
    } catch (e) { console.log("Error voto:", e); }
  };

  const hacerFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert("Error", "Permiso de cámara denegado");
    
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) setFotoTemporal(result.assets[0].uri);
  };

  const guardarCafe = async () => {
    if (!nombreCafe) return Alert.alert("Aviso", "Ponle un nombre a tu café");
    setSubiendo(true);
    try {
      await Firestore.addDoc(Firestore.collection(db, "cafes"), {
        nombre: nombreCafe,
        codigo: barcode,
        notas: notas,
        puntuacion: rating,
        foto: fotoTemporal,
        fecha: new Date().toISOString()
      });
      
      await sumarVoto(nombreCafe);
      
      Alert.alert("✅ Éxito", "Café añadido a tu bodega");
      setScanned(false);
      setNombreCafe(''); setNotas(''); setRating(0); setFotoTemporal(null);
    } catch (e) {
      Alert.alert("Error", "Error de conexión con Firebase");
      console.log(e);
    } finally { setSubiendo(false); }
  };

  const handleBarCodeScanned = ({ data }) => {
    setBarcode(data);
    setScanned(true);
  };

  // --- INTERFAZ ---
  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="cafe" size={80} color="#6F4E37" />
        <Text style={{ textAlign: 'center', margin: 20 }}>Bienvenido a tu Bodega de Café. Necesitamos la cámara para escanear.</Text>
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
           <CameraView onBarcodeScanned={handleBarCodeScanned} style={StyleSheet.absoluteFillObject} />
           <View style={styles.overlay}>
              <Text style={styles.overlayText}>Enfoca el código de barras</Text>
           </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>☕ Nueva Entrada</Text>
          
          <TextInput style={styles.input} placeholder="Nombre del Café" value={nombreCafe} onChangeText={setNombreCafe} />
          
          <StarRating rating={rating} setRating={setRating} interactive={true} />
          
          <TextInput style={[styles.input, {height: 80}]} placeholder="Notas de cata..." multiline value={notas} onChangeText={setNotas} />

          <TouchableOpacity style={styles.btnSecundario} onPress={hacerFoto}>
            <Ionicons name="camera" size={20} color="#6F4E37" />
            <Text style={styles.btnSecundarioText}>TOMAR FOTO</Text>
          </TouchableOpacity>

          {fotoTemporal && <Image source={{ uri: fotoTemporal }} style={styles.preview} />}

          <TouchableOpacity style={styles.btn} onPress={guardarCafe} disabled={subiendo}>
            <Text style={styles.btnText}>{subiendo ? "GUARDANDO..." : "GUARDAR EN BODEGA"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setScanned(false)}>
            <Text style={styles.cancel}>Volver al escáner</Text>
          </TouchableOpacity>

          {/* RANKING */}
          <View style={styles.rankingBox}>
            <Text style={styles.sectionTitle}>🏆 Los Favoritos</Text>
            {topCafes.map((item, index) => (
              <View key={item.id} style={styles.rankingItem}>
                <Text style={styles.rankNum}>{index + 1}.</Text>
                <Text style={styles.rankName}>{item.nombre}</Text>
                <Text style={styles.rankVotes}>{item.votos} votos</Text>
              </View>
            ))}
          </View>

          {/* MI BODEGA */}
          <Text style={styles.sectionTitle}>📦 Mi Bodega</Text>
          {misCafes.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.nombre}</Text>
                <StarRating rating={item.puntuacion} />
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
  input: { width: '100%', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#D2B48C' },
  starContainer: { flexDirection: 'row', marginBottom: 20, justifyContent: 'center' },
  btn: { backgroundColor: '#6F4E37', padding: 18, borderRadius: 30, width: '100%', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  btnSecundario: { flexDirection: 'row', padding: 12, borderWidth: 1, borderColor: '#6F4E37', borderRadius: 12, marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  btnSecundarioText: { color: '#6F4E37', marginLeft: 10, fontWeight: 'bold' },
  preview: { width: 150, height: 150, borderRadius: 15, marginBottom: 20, alignSelf: 'center' },
  cancel: { color: '#A52A2A', textAlign: 'center', marginTop: 25, fontWeight: 'bold' },
  overlay: { position: 'absolute', bottom: 60, width: '100%', alignItems: 'center' },
  overlayText: { color: 'white', backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 40, marginBottom: 15, color: '#4B2C20' },
  rankingBox: { backgroundColor: '#FFF5EE', padding: 15, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#D2B48C' },
  rankingItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#EEE' },
  rankNum: { fontWeight: 'bold', color: '#6F4E37' },
  rankName: { flex: 1, marginLeft: 10 },
  rankVotes: { color: '#888', fontSize: 12 },
  card: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10, alignItems: 'center', elevation: 2 },
  cardInfo: { flex: 1 },
  cardTitle: { fontWeight: 'bold', fontSize: 16, color: '#4B2C20' }
});