import { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';

const CARD_BG = '#f0e8df';
const SHIMMER_W = 140;
const LOOP_MS = 1100;

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
      })
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

export function HeroCafeSkeleton() {
  const x = useShimmer(420);

  return (
    <View style={styles.heroShell}>
      <View style={[styles.heroCard, styles.overflow]}>
        <Shimmer x={x} />

        <View style={styles.heroBadgeLine} />

        <View style={styles.heroMediaWrap}>
          <View style={styles.heroPackshot} />
        </View>

        <View style={styles.heroBody}>
          <View style={styles.heroKicker} />
          <View style={styles.heroNameLg} />
          <View style={styles.heroNameSm} />
          <View style={styles.heroMeta} />

          <View style={styles.heroPillsRow}>
            <View style={styles.heroPill} />
            <View style={styles.heroPill} />
            <View style={styles.heroPillWide} />
          </View>

          <View style={styles.heroPanel} />

          <View style={styles.heroActionsRow}>
            <View style={styles.heroAction} />
            <View style={styles.heroAction} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overflow: { overflow: 'hidden' },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SHIMMER_W,
    backgroundColor: 'rgba(255,255,255,0.36)',
  },
  vertWrap: { paddingHorizontal: 16, marginTop: 8 },
  cardH: { width: 160 },
  cardHImg: {
    width: 160,
    height: 200,
    borderRadius: 10,
    backgroundColor: CARD_BG,
    marginBottom: 8,
  },
  lineOrigin: {
    height: 11,
    borderRadius: 6,
    backgroundColor: CARD_BG,
    marginBottom: 5,
    width: '70%',
  },
  lineName: { height: 14, borderRadius: 7, backgroundColor: CARD_BG, marginBottom: 5 },
  lineRating: { height: 11, borderRadius: 6, backgroundColor: CARD_BG, width: '45%' },
  heroShell: {
    marginTop: 18,
    marginHorizontal: 16,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: '#ede2d5',
    minHeight: 520,
  },
  heroBadgeLine: {
    width: 130,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#e2d4c5',
    marginTop: 18,
    marginLeft: 18,
  },
  heroMediaWrap: {
    alignItems: 'center',
    marginTop: 14,
  },
  heroPackshot: {
    width: '68%',
    height: 210,
    borderRadius: 26,
    backgroundColor: '#f8f1e9',
    borderWidth: 1,
    borderColor: '#e9ddcf',
  },
  heroBody: {
    padding: 18,
  },
  heroKicker: {
    width: 160,
    height: 10,
    borderRadius: 8,
    backgroundColor: '#e2d4c5',
  },
  heroNameLg: {
    width: '82%',
    height: 26,
    borderRadius: 10,
    backgroundColor: '#e2d4c5',
    marginTop: 12,
  },
  heroNameSm: {
    width: '58%',
    height: 26,
    borderRadius: 10,
    backgroundColor: '#e2d4c5',
    marginTop: 8,
  },
  heroMeta: {
    width: '48%',
    height: 14,
    borderRadius: 8,
    backgroundColor: '#e2d4c5',
    marginTop: 10,
  },
  heroPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  heroPill: {
    width: 84,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#e2d4c5',
  },
  heroPillWide: {
    width: 110,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#e2d4c5',
  },
  heroPanel: {
    width: '100%',
    height: 70,
    borderRadius: 18,
    backgroundColor: '#e2d4c5',
    marginTop: 16,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  heroAction: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#e2d4c5',
  },
  cardV: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  cardVImg: { width: 80, height: 100, borderRadius: 10, backgroundColor: CARD_BG, flexShrink: 0 },
});
