/**
 * SyncStatusBadge
 *
 * Compact animated badge showing pending offline actions count.
 * Use inside any screen/tab that benefits from sync visibility.
 *
 * Props:
 *   pendingCount  → number of pending actions (0 hides badge)
 *   isSyncing     → shows spinner animation instead of count
 *   style         → optional container style override
 */
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export default function SyncStatusBadge({ pendingCount = 0, isSyncing = false, style }) {
  const scale = useRef(new Animated.Value(0)).current;
  const visible = pendingCount > 0 || isSyncing;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  }, [visible, scale]);

  if (!visible && scale._value === 0) return null;

  return (
    <Animated.View style={[styles.badge, style, { transform: [{ scale }] }]}>
      {isSyncing ? (
        <View style={styles.spinner}>
          <Text style={styles.spinnerIcon}>⟳</Text>
        </View>
      ) : (
        <Text style={styles.count}>{pendingCount > 99 ? '99+' : pendingCount}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#c8a97c',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  count: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a0e06',
    textAlign: 'center',
  },
  spinner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerIcon: {
    fontSize: 13,
    color: '#1a0e06',
    fontWeight: '700',
  },
});
