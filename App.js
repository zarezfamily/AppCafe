import { CameraView, useCameraPermissions } from 'expo-camera';
import { addDoc, collection, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useState } from 'react';
import { FlatList, Image, LogBox, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// 🛡️ ACTUALIZA EL ESCUDO ANTI-BORRADO:
const preventDelete = [collection, query, onSnapshot, orderBy, FlatList, Image];
// --------------------------------------
// Silenciamos los avisos de sistema para que no te molesten en el móvil
LogBox.ignoreAllLogs();

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [nombreCafe, setNombreCafe] = useState('');
  const [notas, setNotas] = useState('');
  const [misCafes, setMisCafes] = useState([]);

// Este efecto "escucha" a Firebase. Si añades un café en el móvil, aparece al instante.
useEffect(() => {
  const q = query(collection(db, "cafes"), orderBy("fecha", "desc"));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const cafes = [];
    querySnapshot.forEach((doc) => {
      cafes.push({ id: doc.id, ...doc.data() });
    });
    setMisCafes(cafes);
  });
  return () => unsubscribe();
}, []);

  if (!permission) return <View style={styles.container}><Text>Cargando...</Text></View>;
  
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>☕ Mi App de Café</Text>
        <Text style={{textAlign: 'center', marginBottom: 20}}>Necesitamos permiso para usar la cámara</Text>
        <TouchableOpacity style={styles.botonPrincipal} onPress={requestPermission}>
          <Text style={styles.botonTexto}>DAR PERMISO</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }) => {
    setBarcode(data);
    setScanned(true);

    try {
      // Aquí es donde "anclamos" los imports para que VS Code no los borre
      const q = query(collection(db, "cafes"), where("codigo", "==", data));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const cafeExistente = querySnapshot.docs[0].data();
        setNombreCafe(cafeExistente.nombre);
        setNotas(cafeExistente.notas + " (Ya en nuestra base de datos)");
        alert("📍 ¡Café de especialidad reconocido!");
        return; 
      }

      // Si no está en nuestra base, buscamos en la pública
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data}.json`);
      const info = await res.json();

      if (info.status === 1) {
        setNombreCafe(info.product.product_name || "");
        setNotas("Marca: " + info.product.brands);
      }
    } catch (error) {
      console.log("Error en la búsqueda:", error);
    }
  };

  const guardarEnFirebase = async () => {
    if (!nombreCafe) {
      alert("Ponle un nombre al café, ¡no seas timida!");
      return;
    }

    try {
      // Aquí usamos 'collection' y 'db', así VS Code se queda tranquilo
      const docRef = await addDoc(collection(db, "cafes"), {
        nombre: nombreCafe,
        codigo: barcode,
        notas: notas,
        fecha: new Date().toISOString()
      });
      alert("✅ ¡Café guardado en la nube!");
      setScanned(false);
      setNombreCafe('');
      setNotas('');
    } catch (e) {
      console.error("Error al guardar: ", e);
      alert("Error al conectar con Firebase. Revisa la consola.");
    }
  };
  return (
    <View style={styles.container}>
      {!scanned ? (
        // --- MODO CÁMARA ---
        <View style={styles.full}>
          <CameraView
            onBarcodeScanned={handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.guiaCamara}>
            <Text style={styles.textoGuia}>Apunta al código del café</Text>
          </View>
        </View>
      ) : (
        // --- MODO FORMULARIO ---
        <ScrollView contentContainerStyle={styles.formulario}>
          <Text style={styles.emoji}>☕</Text>
          <Text style={styles.title}>¡Nuevo Café!</Text>
          <Text style={styles.sub}>ID: {barcode}</Text>

          <Text style={styles.label}>Nombre del Café</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ej: Etiopía Sidamo" 
            value={nombreCafe}
            onChangeText={setNombreCafe}
          />

          <Text style={styles.label}>Notas de Cata</Text>
          <TextInput 
            style={[styles.input, {height: 80}]} 
            placeholder="¿A qué sabe? (Frutal, chocolate...)" 
            multiline
            value={notas}
            onChangeText={setNotas}
          />

          <TouchableOpacity 
            style={styles.botonPrincipal} 
            onPress={guardarEnFirebase} // <-- Cambia esto aquí
          >
            <Text style={styles.botonTexto}>GUARDAR EN LA NUBE</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setScanned(false)}>
            <Text style={styles.cancelar}>Escanear otro diferente</Text>
          </TouchableOpacity>
          {/* --- AQUÍ PEGA LA BODEGA --- */}
          <View style={{ width: '100%', marginTop: 40 }}>
            <Text style={styles.listaTitulo}>Mi Bodega 🏺</Text>
            <FlatList
              data={misCafes}
              renderItem={renderCafe}
              keyExtractor={item => item.id}
              scrollEnabled={false} // Para que no choque con el scroll del formulario
            />
          </View>
          {/* ---------------------------- */}
        </ScrollView>
      )}
    </View>
  );
}

const renderCafe = ({ item }) => (
  <View style={styles.card}>
    {item.foto ? (
      <Image source={{ uri: item.foto }} style={styles.fotoMini} />
    ) : (
      <View style={[styles.fotoMini, {backgroundColor: '#D2B48C'}]}><Text>☕</Text></View>
    )}
    <View style={styles.infoCard}>
      <Text style={styles.nombreCard}>{item.nombre}</Text>
      <Text style={styles.notasCard} numberOfLines={1}>{item.notas}</Text>
      <Text style={styles.fechaCard}>{new Date(item.fecha).toLocaleDateString()}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF5E6' }, // Color crema suave
  full: { flex: 1 },
  formulario: { padding: 40, paddingTop: 80, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#4B2C20', marginBottom: 5 },
  sub: { color: '#8B4513', marginBottom: 30, fontSize: 12 },
  emoji: { fontSize: 50, marginBottom: 10 },
  label: { alignSelf: 'flex-start', fontWeight: 'bold', color: '#4B2C20', marginBottom: 5 },
  input: { 
    width: '100%', 
    backgroundColor: 'white', 
    padding: 15, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#D2B48C', 
    marginBottom: 20 
  },
  botonPrincipal: { 
    backgroundColor: '#6F4E37', // Marrón café
    paddingVertical: 15, 
    paddingHorizontal: 30, 
    borderRadius: 25, 
    width: '100%', 
    alignItems: 'center',
    marginTop: 10
  },
  botonTexto: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  guiaCamara: { 
    position: 'absolute', 
    bottom: 100, 
    alignSelf: 'center', 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    padding: 15, 
    borderRadius: 20 
  },
  textoGuia: { color: 'white', fontWeight: 'bold' },
  cancelar: { marginTop: 25, color: '#A52A2A', fontWeight: '500' }
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 10,
    marginBottom: 15,
    marginHorizontal: 20,
    elevation: 3, // Sombra en Android
    shadowColor: '#000', // Sombra en iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  fotoMini: { width: 60, height: 60, borderRadius: 10 },
  infoCard: { marginLeft: 15, justifyContent: 'center', flex: 1 },
  nombreCard: { fontSize: 18, fontWeight: 'bold', color: '#4B2C20' },
  notasCard: { color: '#8B4513', fontSize: 14 },
  fechaCard: { fontSize: 10, color: '#A9A9A9', marginTop: 5 },
  listaTitulo: { fontSize: 22, fontWeight: 'bold', marginLeft: 25, marginVertical: 15, color: '#4B2C20' }
});