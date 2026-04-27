import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCafePhoto } from '../core/utils';
import { STREAK_BADGES } from '../hooks/useDailyChallenge';

/* ─── Streak flame: pulses when active ─── */
function StreakFlame({ streak, bestStreak }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (streak < 1) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.18,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [streak, pulse]);

  return (
    <Animated.View style={[styles.flameWrap, { transform: [{ scale: pulse }] }]}>
      <Text style={styles.flameEmoji}>🔥</Text>
      <Text style={styles.flameCount}>{streak}</Text>
    </Animated.View>
  );
}

/* ─── Badge row ─── */
function BadgeRow({ bestStreak }) {
  return (
    <View style={styles.badgeRow}>
      {STREAK_BADGES.map((badge) => {
        const earned = bestStreak >= badge.days;
        return (
          <View
            key={badge.id}
            style={[styles.badgePill, earned ? styles.badgePillEarned : styles.badgePillLocked]}
          >
            <Text style={styles.badgeIcon}>{badge.icon}</Text>
            <Text style={[styles.badgeLabel, earned ? styles.badgeLabelEarned : null]}>
              {badge.days}d
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ─── Main Section ─── */
export default function DailyChallengeSection({
  dailyCoffee,
  completedToday,
  streak,
  bestStreak,
  nextBadge,
  onComplete,
  onOpenCafe,
}) {
  if (!dailyCoffee) return null;

  const photo = getCafePhoto(dailyCoffee);
  const nombre = dailyCoffee.nombre || 'Café misterioso';
  const roaster = dailyCoffee.roaster || dailyCoffee.marca || '';
  const origin = dailyCoffee.pais || dailyCoffee.origen || '';
  const rating = Number(dailyCoffee.puntuacion || 0);

  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fadeIn]);

  return (
    <Animated.View style={[styles.card, { opacity: fadeIn }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.tagPill}>
            <Ionicons name="calendar-outline" size={12} color="#8f5e3b" />
            <Text style={styles.tagText}>CATA DEL DÍA</Text>
          </View>
          <Text style={styles.subtitle}>
            {completedToday ? '¡Completada hoy!' : 'Tu café de hoy te espera'}
          </Text>
        </View>
        {streak > 0 && <StreakFlame streak={streak} bestStreak={bestStreak} />}
      </View>

      {/* Coffee card */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onOpenCafe?.(dailyCoffee)}
        style={styles.coffeeRow}
      >
        <View style={styles.photoFrame}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <Ionicons name="cafe" size={28} color="#c4a98a" />
            </View>
          )}
        </View>

        <View style={styles.coffeeInfo}>
          <Text style={styles.coffeeName} numberOfLines={2}>
            {nombre}
          </Text>
          {!!roaster && (
            <Text style={styles.coffeeRoaster} numberOfLines={1}>
              {roaster}
            </Text>
          )}
          <View style={styles.metaRow}>
            {!!origin && (
              <View style={styles.metaPill}>
                <Ionicons name="earth-outline" size={11} color="#8f5e3b" />
                <Text style={styles.metaText}>{origin}</Text>
              </View>
            )}
            {rating > 0 && (
              <View style={styles.metaPill}>
                <Ionicons name="star" size={11} color="#d0a646" />
                <Text style={styles.metaText}>{rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#c4a98a" />
      </TouchableOpacity>

      {/* CTA button */}
      {!completedToday ? (
        <TouchableOpacity activeOpacity={0.85} onPress={onComplete} style={styles.ctaBtn}>
          <Ionicons name="cafe-outline" size={18} color="#fffaf5" />
          <Text style={styles.ctaText}>Hoy pruebo este</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.completedBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#5f8f61" />
          <Text style={styles.completedText}>¡Cata del día completada!</Text>
        </View>
      )}

      {/* Streak badges + next badge progress */}
      <BadgeRow bestStreak={bestStreak} />

      {nextBadge && !completedToday && (
        <Text style={styles.nextBadgeHint}>
          {nextBadge.icon} {nextBadge.days - streak} día{nextBadge.days - streak !== 1 ? 's' : ''}{' '}
          más para «{nextBadge.title}»
        </Text>
      )}

      {completedToday && streak > 1 && (
        <Text style={styles.streakMsg}>🔥 Llevas {streak} días seguidos catando — ¡sigue así!</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eadbce',
    backgroundColor: '#fffaf5',
    padding: 16,
    overflow: 'hidden',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: { flex: 1 },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#f4e8db',
    marginBottom: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#8f5e3b',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: '#6f5a4b',
    fontWeight: '600',
  },

  /* Streak flame */
  flameWrap: {
    alignItems: 'center',
    minWidth: 48,
  },
  flameEmoji: { fontSize: 26 },
  flameCount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#8f5e3b',
    marginTop: -2,
  },

  /* Coffee row */
  coffeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#faf8f5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eadbce',
    padding: 12,
  },
  photoFrame: {
    width: 64,
    height: 64,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#f4efe9',
  },
  photo: { width: '100%', height: '100%' },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  coffeeInfo: { flex: 1 },
  coffeeName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#24160f',
    lineHeight: 19,
  },
  coffeeRoaster: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8f5e3b',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6f5a4b',
  },

  /* CTA button */
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#8f5e3b',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fffaf5',
    letterSpacing: 0.3,
  },

  /* Completed */
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  completedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5f8f61',
  },

  /* Badges */
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 14,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgePillEarned: {
    borderColor: '#d0a646',
    backgroundColor: '#fef9ed',
  },
  badgePillLocked: {
    borderColor: '#e2d5c8',
    backgroundColor: '#faf7f2',
    opacity: 0.5,
  },
  badgeIcon: { fontSize: 14 },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#999',
  },
  badgeLabelEarned: {
    color: '#8f5e3b',
  },

  /* Hints */
  nextBadgeHint: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#8f5e3b',
    marginTop: 10,
  },
  streakMsg: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#5f8f61',
    marginTop: 10,
  },
});
