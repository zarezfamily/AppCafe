import { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CAFES_DATA } from '../data/cafes';

export default function MisCafes({ navigation }) {
  const [paso, setPaso] = useState(0);
  const [favoritos, setFavoritos] = useState([]);
  const [recomendados, setRecomendados] = useState([]);

  const preguntas = [
    { id: 'perfil', titulo: '¿Qué sabor prefieres?', opciones: ['Afrutado', 'Chocolatado', 'Especial'] },
    { id: 'intensidad', titulo: '¿Cómo te gusta de fuerte?', opciones: ['Suave', 'Media', 'Fuerte'] }
  ];

  const manejarSeleccion = (opcion) => {
    if (paso < preguntas.length - 1) {
      setPaso(paso + 1);
    } else {
      // Filtrar cafes según la última opción elegida (ejemplo simple)
      const filtrados = CAFES_DATA.filter(c => c.perfil === opcion || c.intensidad === opcion);
      setRecomendados(filtrados);
      setPaso(100); // Pantalla de resultados
    }
  };

  const toggleFavorito = (id) => {
    setFavoritos(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  // Renderizado de cada Tarjeta de Café
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('DetalleCafe', { cafe: item })}
    >
      <Image source={{ uri: item.imagen }} style={styles.img} />
      <View style={styles.info}>
        <Text style={styles.nombre}>{item.nombre}</Text>
        <Text style={styles.notas}>{item.notas}</Text>
      </View>
      <TouchableOpacity onPress={() => toggleFavorito(item.id)} style={styles.estrella}>
        <Text style={{ fontSize: 28, color: favoritos.includes(item.id) ? '#FFD700' : '#CCC' }}>
          {favoritos.includes(item.id) ? '★' : '☆'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {paso < 100 ? (
        <View style={styles.quizBox}>
          <Text style={styles.pregunta}>{preguntas[paso].titulo}</Text>
          {preguntas[paso].opciones.map(opt => (
            <TouchableOpacity key={opt} style={styles.btnOpt} onPress={() => manejarSeleccion(opt)}>
              <Text style={styles.btnText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={{flex: 1}}>
          <Text style={styles.header}>Recomendados para ti ☕️</Text>
          <FlatList data={recomendados} renderItem={renderItem} keyExtractor={item => item.id} />
          <TouchableOpacity onPress={() => setPaso(0)} style={styles.btnReset}>
            <Text style={{color: '#0055ff'}}>Repetir Cuestionario</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 20 },
  quizBox: { flex: 1, justifyContent: 'center' },
  pregunta: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 30, textAlign: 'center' },
  btnOpt: { backgroundColor: '#0055ff', padding: 20, borderRadius: 15, marginBottom: 15 },
  btnText: { color: '#fff', fontSize: 18, textAlign: 'center', fontWeight: '600' },
  header: { fontSize: 22, fontWeight: 'bold', marginVertical: 20 },
  card: { backgroundColor: '#fff', borderRadius: 15, flexDirection: 'row', padding: 12, marginBottom: 15, alignItems: 'center', elevation: 2 },
  img: { width: 70, height: 70, borderRadius: 10 },
  info: { flex: 1, marginLeft: 15 },
  nombre: { fontSize: 16, fontWeight: 'bold' },
  notas: { color: '#666', fontSize: 13 },
  estrella: { padding: 5 },
  btnReset: { padding: 20, alignItems: 'center' }
});