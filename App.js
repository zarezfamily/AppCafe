import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FS from "firebase/firestore/lite";
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, LogBox, SafeAreaView,
  ScrollView,
  StyleSheet, Text,
  TouchableOpacity,
  View
} from 'react-native';
import "react-native-get-random-values";
import { db } from './firebaseConfig';

LogBox.ignoreAllLogs();

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [nombreCafe, setNombreCafe] = useState('');
  const [rating, setRating] = useState(0);
  const [misCafes, setMisCafes] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = async () => {
    try {
      const q = FS.query(FS.collection(db, "cafes"), FS.orderBy("fecha", "desc"));
      const snap = await FS.getDocs(q);
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      setMisCafes(docs);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
          <Text style={styles.btnText}>DAR PERMISO A LA CÁMARA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!scanned ? (
        <View style={styles.mainContainer}>
          <View style={styles.header}>
            <Text style={styles.brand}>BODEGA CAFE</Text>
            <TouchableOpacity><Ionicons name="person-circle-outline" size={30} color="#333" /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Tus Cafés Recientes</Text>
            {loading ? <ActivityIndicator color="#6F4E37" /> : (
              misCafes.map(item => (
                <View key={item.id} style={styles.wineCard}>
                  <View style={styles.cardImagePlaceholder}>
                    <Ionicons name="cafe" size={40} color="#D2B48C" />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardBrand}>Tostaduría Artesanal</Text>
                    <Text style={styles.cardName}>{item.nombre}</Text>
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingText}>{item.puntuacion}.0</Text>
                      <Ionicons name="star" size={14} color="#B22222" />
                      <Text style={styles.dateText}> • {new Date(item.fecha).toLocaleDateString()}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* BOTÓN FLOTANTE ESTILO VIVINO */}
          <TouchableOpacity style={styles.fab} onPress={() => setScanned(true)}>
            <Ionicons name="camera" size={30} color="white" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          <CameraView onBarcodeScanned={() => setScanned(false)} style={StyleSheet.absoluteFillObject} />
          <TouchableOpacity style={styles.closeCam} onPress={() => setScanned(false)}>
            <Ionicons name="close-circle" size={50} color="white" />
          </TouchableOpacity>
          <View style={styles.camOverlay}>
            <Text style={styles.camText}>Enfoca la etiqueta del café</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  mainContainer: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60 },
  brand: { fontSize: 18, fontWeight: '900', letterSpacing: 2, color: '#333' },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', marginVertical: 20, color: '#1a1a1a' },
  wineCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 15, 
    marginBottom: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
  },
  cardImagePlaceholder: { width: 70, height: 90, backgroundColor: '#F9F9F9', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  cardInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  cardBrand: { fontSize: 12, color: '#888', textTransform: 'uppercase', fontWeight: 'bold' },
  cardName: { fontSize: 18, fontWeight: '700', color: '#333', marginVertical: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 16, fontWeight: 'bold', color: '#B22222', marginRight: 4 },
  dateText: { fontSize: 12, color: '#999' },
  fab: { 
    position: 'absolute', bottom: 30, alignSelf: 'center', 
    backgroundColor: '#B22222', width: 70, height: 70, borderRadius: 35, 
    justifyContent: 'center', alignItems: 'center', elevation: 5, shadowOpacity: 0.3 
  },
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  closeCam: { position: 'absolute', top: 50, right: 20 },
  camOverlay: { position: 'absolute', bottom: 100, width: '100%', alignItems: 'center' },
  camText: { color: 'white', backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 20 }
});