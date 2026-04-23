import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useNetwork } from '../context/NetworkContext';
import usePendingActions from '../hooks/usePendingActions';

export default function OfflineBanner() {
  const { isOnline, justReconnected } = useNetwork();
  const { pendingCount, isSyncing } = usePendingActions();

  const translateY = useRef(new Animated.Value(-48)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Show banner when offline, just reconnected, or syncing with pending actions
  const isVisible = !isOnline || justReconnected || (isSyncing && pendingCount > 0);
  const isBack = isOnline && (justReconnected || isSyncing);

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -48, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [isVisible, translateY, opacity]);

  const offlineLabel =
    pendingCount > 0
      ? `Sin conexión · ${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}`
      : 'Sin conexión · modo offline';

  const onlineLabel =
    pendingCount > 0
      ? `Sincronizando ${pendingCount} acción${pendingCount > 1 ? 'es' : ''}…`
      : 'Conexión restaurada ✓';

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.banner, { transform: [{ translateY }], opacity }]}
    >
      <View style={[styles.pill, isBack ? styles.pillOnline : styles.pillOffline]}>
        <Text style={styles.dot}>{isBack ? '●' : '●'}</Text>
        <Text style={styles.label}>{isBack ? onlineLabel : offlineLabel}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingTop: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  pillOffline: {
    backgroundColor: '#2a1a0f',
  },
  pillOnline: {
    backgroundColor: '#1a3a1a',
  },
  dot: {
    fontSize: 8,
    color: '#c8a97c',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f0dcc8',
    letterSpacing: 0.2,
  },
});
