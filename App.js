import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  addDoc, collection, deleteDoc, doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy, query,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, LogBox, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from './firebaseConfig';

LogBox.ignoreAllLogs();

// --- COMPONENTE DE ESTRELLAS ---
const StarRating = ({ rating, setRating, interactive = false }) => (
  <View style={{ flexDirection: 'row', marginVertical: 10 }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity key={star} disabled={!interactive} onPress={() => setRating(star)}>
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
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [nombreCafe, setNombreCafe] = useState('');
  const [notas, setNotas] = useState('');
  const [misCafes, setMisCafes] = useState([]);
  const [topCafes, setTopCafes] = useState([]);
  const [rating, setRating] = useState(0);
  const [fotoTemporal, setFotoTemporal] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  // 1. ESCUCHADORES DE FIREBASE (Bodega y Ranking)
  useEffect(() => {
    // Escuchar Bodega
    const qCafes = query(collection(db, "cafes"), orderBy("fecha", "desc"));
    const unsubCafes = onSnapshot(qCafes, (snap) => {
      const docs = [];
      snap.forEach((d) => docs.push({ id: d.id, ...d.data() }));
      setMisCafes(docs);
    });

    // Escuchar Top 5
    const qRanking = query(collection(db, "ranking"), orderBy("votos", "desc"), limit(5));
    const unsubRanking = onSnapshot(qRanking, (snap) => {
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      setTopCafes(docs);
    });

    return () => {
      unsubCafes();
      unsubRanking();
    };
  }, []);

  // 2. FUNCIONES DE LÓGICA (Votos, Fotos y Guardar)
  const sumarVoto = async (nombre) => {
    if (!nombre) return;
    try {
      const refRanking = doc(db, "ranking", nombre);
      const docSnap = await getDoc(refRanking);
      if (docSnap.exists()) {
        await updateDoc(refRanking, { votos: increment(1) });
      } else {
        await setDoc(refRanking, { nombre: nombre, votos: 1 });
      }
    } catch (error) {
      console.log("Error al votar:", error);
    }
  };

  const hacerFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert("¡Necesitamos permiso para la cámara!");
      return;
    }
    let resultado = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!resultado.canceled) {
      setFotoTemporal(resultado.assets[0].uri);
    }
  };

  const subirFotoCloudinary = async (uriLocal) => {
    setSubiendo(true);
    try {
      const data = new FormData();
      data.append('file', { uri: uriLocal, type: 'image/jpeg', name: 'cafe.jpg' });
      data.append('upload_preset', 'cafes_preset'); 
      data.append('cloud_name', 'TU_CLOUD_NAME'); // <--- CAMBIA ESTO

      const res = await fetch('https://api.cloudinary.com/v1_1/TU_CLOUD_NAME/image/upload', { 
        method: 'POST',
        body: data,
      });
      const file = await res.json();
      setSubiendo(false);
      return file.secure_url;
    } catch (error) {
      console.error(error);
      setSubiendo(false);
      return null;
    }
  };

  const guardarEnFirebase = async () => {
    if (!nombreCafe) {
      alert("Ponle un nombre al café");
      return;
    }
    try {
      let urlFoto = null;
      if (fotoTemporal) {
        urlFoto = await subirFotoCloudinary(fotoTemporal);
      }

      await addDoc(collection(db, "cafes"), {
        nombre: nombreCafe,
        codigo: barcode,
        notas: notas,
        puntuacion: rating,
        foto: urlFoto,
        fecha: new Date().toISOString()
      });

      alert("✅ ¡Guardado!");
      setScanned(false);
      setNombreCafe('');
      setNotas('');
      setRating(0);
      setFotoTemporal(null);
    } catch (e) {
      alert("Error al conectar con Firebase.");
    }
  };

  const borrarCafe = (id) => {
    Alert.alert("Borrar", "¿Eliminar de tu bodega?", [
      { text: "No" },
      { text: "Sí", style: 'destructive', onPress: () => deleteDoc(doc(db, "cafes", id)) }
    ]);
  };

  const handleBarCodeScanned = async ({ data }) => {
    setBarcode(data);
    setScanned(true);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data}.json`);
      const info = await res.json();
      if (info.status === 1) {
        const nombreEncontrado = info.product.product_name || "Café Desconocido";
        setNombreCafe(nombreEncontrado);
        setNotas("Marca: " + (info.product.brands || "N/A"));
        sumarVoto(nombreEncontrado); // <--- Voto automático al escanear
      }
    } catch (error) {
      console.log("Error en búsqueda:", error);
    }
  };

  // 3. RENDER DE COMPONENTES
  const renderCafe = ({ item }) => (
    <View style={styles.card}>
      {item.foto ? (
        <Image source={{ uri: item.foto }} style={styles.fotoMini} />
      ) : (
        <View style={[styles.fotoMini, {backgroundColor: '#D2B48C', justifyContent: 'center', alignItems: 'center'}]}>
          <Text>☕</Text>
        </View>
      )}
      <View style={styles.infoCard}>
        <Text style={styles.nombreCard}>{item.nombre}</Text>
        <StarRating rating={item.puntuacion} />
        <Text style={styles.notasCard} numberOfLines={1}>{item.notas}</Text>
      </View>
      <TouchableOpacity onPress={() => borrarCafe(item.id)} style={{justifyContent: 'center', padding: 5}}>
        <Ionicons name="trash-outline" size={24} color="#FF6347" />
      </TouchableOpacity>
    </View>
  );

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.botonPrincipal} onPress={requestPermission}>
          <Text style={styles.botonTexto}>DAR PERMISO CÁMARA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanned ? (
        <CameraView onBarcodeScanned={handleBarCodeScanned} style={StyleSheet.absoluteFillObject} />
      ) : (
        <ScrollView contentContainerStyle={styles.formulario}>
          <Text style={styles.title}>¡Nuevo Café!</Text>
          
          <TextInput style={styles.input} placeholder="Nombre" value={nombreCafe} onChangeText={setNombreCafe} />
          
          <StarRating rating={rating} setRating={setRating} interactive={true} />
          
          <TextInput style={[styles.input, {height: 60}]} placeholder="Notas" multiline value={notas} onChangeText={setNotas} />

          {fotoTemporal ? (
            <Image source={{ uri: fotoTemporal }} style={styles.fotoPreview} />
          ) : (
            <TouchableOpacity style={styles.botonSecundario} onPress={hacerFoto}>
              <Ionicons name="camera" size={20} color="#6F4E37" />
              <Text style={{color: '#6F4E37', marginLeft: 10}}>HACER FOTO</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.botonPrincipal, {backgroundColor: subiendo ? '#ccc' : '#6F4E37'}]} 
            onPress={guardarEnFirebase}
            disabled={subiendo}
          >
            <Text style={styles.botonTexto}>{subiendo ? "SUBIENDO..." : "GUARDAR EN LA NUBE"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setScanned(false)}>
            <Text style={styles.cancelar}>Cancelar / Escanear otro</Text>
          </TouchableOpacity>

          {/* --- TOP 5 RANKING --- */}
          <View style={styles.rankingContainer}>
            <Text style={styles.rankingTitulo}>🔥 Top 5 Más Buscados</Text>
            {topCafes.map((item, index) => (
              <View key={item.id} style={styles.rankingItem}>
                <Text style={styles.rankingNumero}>#{index + 1}</Text>
                <Text style={styles.rankingNombre} numberOfLines={1}>{item.nombre}</Text>
                <View style={styles.votosBadge}>
                  <Text style={styles.votosTexto}>{item.votos} pts</Text>
                </View>
              </View>
            ))}
          </View>

          {/* --- BODEGA --- */}
          <View style={{ width: '100%', marginTop: 10 }}>
            <Text style={styles.listaTitulo}>Mi Bodega 🏺</Text>
            <FlatList 
              data={misCafes} 
              renderItem={renderCafe} 
              keyExtractor={item => item.id} 
              scrollEnabled={false} 
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF5E6' },
  formulario: { padding: 30, paddingTop: 60, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#4B2C20', marginBottom: 20 },
  input: { width: '100%', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#D2B48C' },
  botonPrincipal: { backgroundColor: '#6F4E37', padding: 18, borderRadius: 25, width: '100%', alignItems: 'center', marginTop: 10 },
  botonSecundario: { flexDirection: 'row', padding: 10, marginBottom: 20, borderWidth: 1, borderColor: '#6F4E37', borderRadius: 10 },
  botonTexto: { color: 'white', fontWeight: 'bold' },
  fotoPreview: { width: 120, height: 120, borderRadius: 10, marginBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: 'white', padding: 10, borderRadius: 15, marginBottom: 10, elevation: 2 },
  fotoMini: { width: 55, height: 55, borderRadius: 8 },
  infoCard: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  nombreCard: { fontWeight: 'bold', fontSize: 16, color: '#4B2C20' },
  notasCard: { fontSize: 12, color: '#666' },
  listaTitulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#4B2C20' },
  cancelar: { marginTop: 20, marginBottom: 30, color: '#A52A2A', fontWeight: 'bold' },
  rankingContainer: {
    width: '100%',
    backgroundColor: '#FFF5EE',
    borderRadius: 20,
    padding: 15,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFDAB9',
  },
  rankingTitulo: { fontSize: 18, fontWeight: 'bold', color: '#8B4513', marginBottom: 12, textAlign: 'center' },
  rankingItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8,
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 10,
  },
  rankingNumero: { fontWeight: 'bold', color: '#D2691E', width: 25 },
  rankingNombre: { flex: 1, color: '#4B2C20', fontSize: 14 },
  votosBadge: { backgroundColor: '#FDF5E6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  votosTexto: { fontSize: 11, color: '#FF4500', fontWeight: 'bold' }
});