import { useCallback, useRef, useState } from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { resolveScan } from '../services/cafeService';
// Si tienes auth/contexto, cámbialo aquí:
// import { useAuth } from '../context/AuthContext';

export default function ScanScreen({ navigation }) {
  // const { user } = useAuth();
  const user = null;

  const [loading, setLoading] = useState(false);
  const lockRef = useRef(false);

  const handleResolvedNavigation = useCallback(
    (result) => {
      if (!result?.cafeId) {
        Alert.alert('Error', 'No se pudo resolver el café escaneado');
        return;
      }

      switch (result.action) {
        case 'edit_new_pending':
        case 'continue_pending':
          navigation.navigate('CafeEditorScreen', {
            cafeId: result.cafeId,
            mode: result.action,
          });
          break;

        case 'view_pending':
        case 'view_approved':
        case 'view_existing':
        default:
          navigation.navigate('CafeDetailScreen', {
            cafeId: result.cafeId,
            mode: result.action,
          });
          break;
      }
    },
    [navigation]
  );

  const onBarcodeDetected = useCallback(
    async (rawEan) => {
      if (lockRef.current || loading) return;

      try {
        lockRef.current = true;
        setLoading(true);

        const result = await resolveScan(rawEan, user?.uid || null);
        handleResolvedNavigation(result);
      } catch (error) {
        Alert.alert('Error', error?.message || 'No se pudo procesar el escaneo');
      } finally {
        setLoading(false);
        setTimeout(() => {
          lockRef.current = false;
        }, 1200);
      }
    },
    [handleResolvedNavigation, loading, user]
  );

  /**
   * Integra aquí tu lector real.
   * Este botón es solo para prueba rápida.
   */
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Escanear café</Text>
      <Text style={styles.subtitle}>
        Escanea un EAN y el sistema decidirá si crear, completar o mostrar la ficha.
      </Text>

      <Button
        title={loading ? 'Procesando...' : 'Simular escaneo'}
        disabled={loading}
        onPress={() => onBarcodeDetected('8414606900012')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 20,
    color: '#555',
  },
});
