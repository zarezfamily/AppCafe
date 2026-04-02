import { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';

const CARD_BG    = '#f0e8df';
const SHIMMER_W  = 140;
const LOOP_MS    = 1100;

function Shimmer({ x }) {
  return (
    <Animated.View
      style={[styles.shimmer, { transform: [{ translateX: x }] }]}
      pointerEvents="none"
    />
  );
}

function useShimmer(toValue = 360) {
  const x = useRef(new Animated.Value(-SHIMMER_W)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(x, {
        toValue,
        duration: LOOP_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [x, toValue]);
  return x;
}

// ── Horizontal card row (replaces HorizontalCardRow loading state) ────────────
export function SkeletonHorizontalRow({ count = 4 }) {
  const x = useShimmer(300);
  return (
    <ScrollView
      horizontal
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.cardH}>
          <View style={[styles.cardHImg, styles.overflow]}>
            <Shimmer x={x} />
          </View>
          <View style={[styles.lineOrigin, styles.overflow]}>
            <Shimmer x={x} />
          </View>
          <View style={[styles.lineName, styles.overflow]}>
            <Shimmer x={x} />
          </View>
          <View style={[styles.lineRating, styles.overflow]}>
            <Shimmer x={x} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Vertical list (replaces SimpleCoffeeListTab / MisCafesTab loading state) ─
export function SkeletonVerticalList({ count = 4 }) {
  const x = useShimmer(400);
  return (
    <View style={styles.vertWrap}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.cardV}>
          <View style={[styles.cardVImg, styles.overflow]}>
            <Shimmer x={x} />
          </View>
          <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
            <View style={[styles.lineOrigin, styles.overflow, { width: '50%' }]}>
              <Shimmer x={x} />
            </View>
            <View style={[styles.lineName, styles.overflow, { width: '82%' }]}>
              <Shimmer x={x} />
            </View>
            <View style={[styles.lineRating, styles.overflow, { width: '38%' }]}>
              <Shimmer x={x} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overflow:   { overflow: 'hidden' },
  shimmer:    { position: 'absolute', top: 0, bottom: 0, width: SHIMMER_W, backgroundColor: 'rgba(255,255,255,0.36)' },
  vertWrap:   { paddingHorizontal: 16, marginTop: 8 },
  cardH:      { width: 160 },
  cardHImg:   { width: 160, height: 200, borderRadius: 10, backgroundColor: CARD_BG, marginBottom: 8 },
  lineOrigin: { height: 11, borderRadius: 6, backgroundColor: CARD_BG, marginBottom: 5, width: '70%' },
  lineName:   { height: 14, borderRadius: 7, backgroundColor: CARD_BG, marginBottom: 5 },
  lineRating: { height: 11, borderRadius: 6, backgroundColor: CARD_BG, width: '45%' },
  cardV:      { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  cardVImg:   { width: 80, height: 100, borderRadius: 10, backgroundColor: CARD_BG, flexShrink: 0 },
});
