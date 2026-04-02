import { Ionicons } from '@expo/vector-icons';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function OnboardingModal({ visible, onClose, onStartQuiz }) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.kicker}>WELCOME TO ETIOVE</Text>
          <Text style={styles.title}>Tu primera ruta cafetera</Text>
          <Text style={styles.sub}>Antes de explorar, te guiamos en 3 pasos para que la app te recomiende mejor.</Text>

          <View style={styles.stepRow}>
            <Ionicons name="sparkles-outline" size={18} color="#8f5e3b" />
            <Text style={styles.stepText}>Haz el quiz de preferencias (2 minutos)</Text>
          </View>
          <View style={styles.stepRow}>
            <Ionicons name="camera-outline" size={18} color="#8f5e3b" />
            <Text style={styles.stepText}>Escanea o añade tu primer café</Text>
          </View>
          <View style={styles.stepRow}>
            <Ionicons name="trophy-outline" size={18} color="#8f5e3b" />
            <Text style={styles.stepText}>Desbloquea logros y sube de nivel</Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={onStartQuiz}>
            <Text style={styles.primaryBtnText}>Empezar quiz ahora</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
            <Text style={styles.secondaryBtnText}>Saltar por ahora</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 12, 9, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 22,
    padding: 20,
    backgroundColor: '#fffaf5',
    borderWidth: 1,
    borderColor: '#eadbce',
  },
  kicker: {
    color: '#8f5e3b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  title: {
    color: '#1f140f',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  sub: {
    color: '#6f5a4b',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stepText: {
    color: '#2f1d14',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  primaryBtn: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#2f1d14',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  primaryBtnText: {
    color: '#fff4e8',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbc7b6',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    backgroundColor: '#f7efe6',
  },
  secondaryBtnText: {
    color: '#6a4b39',
    fontSize: 13,
    fontWeight: '700',
  },
});
