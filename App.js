// 1. SEGURIDAD: Esto DEBE ser la primera línea del archivo
import "react-native-get-random-values";

// 2. LIBRERÍAS DE REACT Y EXPO
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

// 3. FIREBASE: Importamos TODO el bloque para que no se pierdan las referencias internas ('S')
import * as Firestore from "firebase/firestore";
import { db } from './firebaseConfig';

// Ignorar advertencias amarillas en el móvil
LogBox.ignoreAllLogs();

// --- COMPONENTE: ESTRELLAS DE CALIFICACIÓN ---
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

  // --- 1. ESCUCHADORES EN TIEMPO REAL (FIREBASE) ---
  useEffect(() => {
    if (!db) return;

    // Retraso de seguridad para evitar colisiones al arrancar
    const timer = setTimeout(() => {
      try {
        // Escuchar la colección "cafes" (Tu Bodega)
        const qCafes = Firestore.query(
          Firestore.collection(db, "cafes"), 
          Firestore.orderBy("fecha", "desc")
        );
        
        const unsubCafes = Firestore.onSnapshot(qCafes, (snap) => {
          const docs = [];
          snap.forEach((d) => docs.push({ id: d.id, ...d.data() }));
          setMisCafes(docs);
        }, (err) => console.log("Error en Bodega:", err));

        // Escuchar la colección "ranking" (Top 5)
        const qRanking = Firestore.query(
          Firestore.collection(db, "ranking"), 
          Firestore.orderBy("votos", "desc"), 
          Firestore.limit(5)
        );

        const unsubRanking = Firestore.onSnapshot(qRanking, (snap) => {
          const docs = [];
          snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
          setTopCafes(docs);
        }, (err) => console.log("Error en Ranking:", err));

        return () => {
          unsubCafes();
          unsubRanking();
        };
      } catch (e) {
        console.error("Fallo crítico al cargar Firestore:", e);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // --- 2. LÓGICA DE NEGOCIO ---
  
  const sumarVoto = async (nombre) => {
    try {
      const refRanking = Firestore.doc(db, "ranking", nombre);
      const docSnap = await Firestore.getDoc(refRanking);
      if (docSnap.exists()) {
        await Firestore.updateDoc(refRanking, { votos: Firestore.increment(1) });
      } else {
        await Firestore.setDoc(refRanking, { nombre: nombre, votos: 1 });
      }
    } catch (e) { console.log("Error al votar:", e); }
  };

  const hacerFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert("Error", "Necesitamos permiso de cámara");
    
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) setFotoTemporal(result.assets[0].uri);
  };

  const guardarCafe = async () => {
    if (!nombreCafe) return Alert.alert("Aviso", "Escribe el nombre del café");
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
      Alert.alert("🎉 ¡Éxito!", "Café guardado correctamente");
      setScanned(false);
      setNombreCafe(''); setNotas(''); setRating(0); setFotoTemporal(null);
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar en la base de datos");
    } finally { setSubiendo(false); }
  };

  const handleBarCodeScanned = ({ data }) => {
    setBarcode(data);
    setScanned(true);
    setNombreCafe("Nuevo Café Escaneado"); 
    sumarVoto("Nuevo Café Escaneado");
  };

  // --- 3. RENDERIZADO (VISTA) ---
  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>DAR PERMISO A LA CÁMARA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanned ? (
        <CameraView onBarcodeScanned={handleBarCodeScanned} style={StyleSheet.absoluteFillObject} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>☕ Mi Bodega de Café</Text>
          
          <TextInput style={styles.input} placeholder="Nombre del Grano/Marca" value={nombreCafe} onChangeText={setNombreCafe} />
          
          <StarRating rating={rating} setRating={setRating} interactive={true} />
          
          <TextInput style={[styles.input, {height: 80}]} placeholder="Notas de sabor..." multiline value={notas} onChangeText={setNotas} />

          <TouchableOpacity style={styles.btnSecundario} onPress={hacerFoto}>
            <Ionicons name="camera" size={20} color="#6F4E37" />
            <Text style={styles.btnSecundarioText}>HACER FOTO</Text>
          </TouchableOpacity>

          {fotoTemporal && <Image source={{ uri: fotoTemporal }} style={styles.preview} />}

          <TouchableOpacity style={styles.btn} onPress={guardarCafe} disabled={subiendo}>
            <Text style={styles.btnText}>{subiendo ? "GUARDANDO..." : "GUARDAR EN LA NUBE"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setScanned(false)}>
            <Text style={styles.cancel}>Volver a Escanear</Text>
          </TouchableOpacity>

          {/* SECCIÓN RANKING */}
          <View style={styles.rankingBox}>
            <Text style={styles.sectionTitle}>🔥 Más Valorados</Text>
            {topCafes.map((item, index) => (
              <View key={item.id} style={styles.rankingItem}>
                <Text style={styles.rankNum}>#{index + 1}</Text>
                <Text style={styles.rankName}>{item.nombre}</Text>
                <Text style={styles.rankVotes}>{item.votos} pts</Text>
              </View>
            ))}
          </View>

          {/* SECCIÓN LISTA PERSONAL */}
          <Text style={styles.sectionTitle}>🏺 Mi Colección</Text>
          {misCafes.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.nombre}</Text>
                <StarRating rating={item.puntuacion} />
              </View>
              <TouchableOpacity onPress={() => Firestore.deleteDoc(Firestore.doc(db, "cafes", item.id))}>
                <Ionicons name="trash-outline" size={20} color="#FF6347" />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scroll: { padding: 25, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#4B2C20', marginBottom: 25, textAlign: 'center' },
  input: { width: '100%', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#D2B48C' },
  starContainer: { flexDirection: 'row', marginBottom: 20, justifyContent: 'center' },
  btn: { backgroundColor: '#6F4E37', padding: 18, borderRadius: 30, width: '100%', alignItems: 'center', elevation: 3 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  btnSecundario: { flexDirection: 'row', padding: 12, borderHeight: 1, borderColor: '#6F4E37', borderRadius: 12, marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  btnSecundarioText: { color: '#6F4E37', marginLeft: 10, fontWeight: 'bold' },
  preview: { width: 120, height: 120, borderRadius: 15, marginBottom: 20, alignSelf: 'center' },
  cancel: { color: '#A52A2A', textAlign: 'center', marginTop: 20, fontWeight: 'bold' },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 35, marginBottom: 15, color: '#4B2C20', borderLeftWidth: 4, borderLeftColor: '#6F4E37', paddingLeft: 10 },
  rankingBox: { backgroundColor: '#FFF5EE', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#FFDAB9' },
  rankingItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, backgroundColor: 'white', padding: 10, borderRadius: 10 },
  rankNum: { fontWeight: 'bold', color: '#D2691E', width: 25 },
  rankName: { flex: 1, marginLeft: 10, color: '#4B2C20' },
  rankVotes: { fontSize: 12, color: '#888', fontWeight: 'bold' },
  card: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 12, alignItems: 'center', elevation: 2 },
  cardInfo: { flex: 1 },
  cardTitle: { fontWeight: 'bold', fontSize: 17, color: '#4B2C20' }
});