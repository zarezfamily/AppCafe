import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Paso 2 del refactor.
 *
 * Este fichero es un placeholder intencionado para que puedas empezar a sacar
 * el MainScreen real fuera de App.js sin bloquear el resto de la separación.
 *
 * Siguiente movimiento recomendado:
 * 1) Copiar aquí la implementación actual de MainScreen desde App.js.
 * 2) Ir moviendo después subbloques a /features:
 *    - coffee
 *    - forum
 *    - profile
 *    - premium
 */
export default function MainScreen({ onLogout }) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.card}>
        <Text style={styles.title}>MainScreen preparado para extracción</Text>
        <Text style={styles.body}>
          Este fichero ya existe para sacar la pantalla principal fuera de App.js.
          Ahora solo falta pegar aquí tu MainScreen real y seguir dividiéndolo en módulos.
        </Text>
        <TouchableOpacity style={styles.button} onPress={onLogout}>
          <Text style={styles.buttonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f6efe7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#fffaf5',
    borderWidth: 1,
    borderColor: '#eadbce',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f140f',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6f5444',
  },
  button: {
    marginTop: 12,
    backgroundColor: '#2f1d14',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff9f1',
    fontWeight: '800',
  },
});
