import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PREMIUM_ACCENT, THEME } from '../constants/theme';
import PackshotImage from './PackshotImage';

function getScaScore(item) {
  if (item?.sca && typeof item.sca === 'object') {
    const score = Number(item.sca.score || 0);
    return Number.isFinite(score) ? score : 0;
  }

  const legacy = Number(item?.sca || 0);
  return Number.isFinite(legacy) ? legacy : 0;
}

function getOriginLabel(item) {
  return item?.pais || item?.origen || item?.origin || '';
}

function getPhoto(item) {
  return (
    item?.bestPhoto || item?.officialPhoto || item?.foto || item?.image || item?.imageUrl || null
  );
}

function StatPill({ icon, label, value }) {
  if (!value && value !== 0) return null;

  return (
    <View style={styles.statPill}>
      <Ionicons name={icon} size={12} color="#f3e2c9" />
      <Text style={styles.statPillText}>
        {label} {value}
      </Text>
    </View>
  );
}

export default function HeroCafeCard({
  item,
  variant,
  premiumAccent = PREMIUM_ACCENT,
  onOpenCafe,
  onOpenRanking,
}) {
  if (!item) return null;

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [item?.id, opacity, translateY]);

  const scaScore = getScaScore(item);
  const roaster = item.roaster || item.marca || 'ETIOVE';
  const origin = getOriginLabel(item);
  const photo = getPhoto(item);

  return (
    <Animated.View style={[styles.shell, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.card}>
        <View style={styles.bgGlowOne} />
        <View style={styles.bgGlowTwo} />

        <View style={styles.heroMedia}>
          <View style={styles.heroMediaTint} />
          <View style={styles.heroMediaBottom} />
          <View style={styles.heroMediaContent}>
            <View style={styles.badgeRow}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{variant?.badge || '☕ Seleccion ETIOVE'}</Text>
              </View>
            </View>

            <PackshotImage
              uri={photo}
              frameStyle={styles.packshotFrame}
              imageStyle={styles.packshotImage}
            />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.kicker}>{variant?.kicker || 'Curado para abrir la Home'}</Text>

          <Text style={styles.name} numberOfLines={2}>
            {item.nombre}
          </Text>

          <Text style={styles.roaster} numberOfLines={1}>
            {roaster}
          </Text>

          {!!origin && (
            <View style={styles.originRow}>
              <Ionicons name="earth-outline" size={13} color="#8f7a69" />
              <Text style={styles.originText} numberOfLines={1}>
                {origin}
              </Text>
            </View>
          )}

          <View style={styles.statsRow}>
            <StatPill
              icon="star"
              label="Comunidad"
              value={Number(item.puntuacion || 0).toFixed(1)}
            />
            {scaScore > 0 ? (
              <StatPill icon="ribbon-outline" label="SCA" value={scaScore.toFixed(1)} />
            ) : null}
            <StatPill
              icon="flame-outline"
              label="Momentum"
              value={Number(item.heroScore || 0).toFixed(1)}
            />
          </View>

          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>{variant?.title || 'Cafe HERO'}</Text>
            <Text style={styles.metaText} numberOfLines={2}>
              {variant?.editorial ||
                'Una portada editorial que rota entre cafes realmente fuertes en tendencia, calidad y valor.'}
            </Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.primaryBtn, { backgroundColor: premiumAccent }]}
              onPress={() => onOpenCafe?.(item)}
            >
              <Text style={styles.primaryBtnText}>Ver ficha</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.secondaryBtn}
              onPress={onOpenRanking}
            >
              <Text style={styles.secondaryBtnText}>{variant?.ctaSecondary || 'Ver ranking'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginTop: 18,
    marginHorizontal: 16,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#1d130f',
    borderWidth: 1,
    borderColor: '#4a3328',
  },
  bgGlowOne: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(214, 162, 106, 0.18)',
  },
  bgGlowTwo: {
    position: 'absolute',
    bottom: -80,
    left: -30,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(104, 66, 44, 0.22)',
  },
  heroMedia: {
    minHeight: 260,
    backgroundColor: '#251814',
  },
  heroMediaTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  heroMediaBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  heroMediaContent: {
    padding: 18,
    alignItems: 'center',
  },
  badgeRow: {
    width: '100%',
    marginBottom: 8,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 248, 238, 0.92)',
    borderWidth: 1,
    borderColor: '#ead9c7',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#6a4731',
    letterSpacing: 0.4,
  },
  packshotFrame: {
    width: '68%',
    height: 210,
    borderRadius: 26,
    padding: 14,
    backgroundColor: '#fffdf9',
    borderWidth: 1,
    borderColor: '#f4e8da',
  },
  packshotImage: {
    width: '88%',
    height: '88%',
  },
  body: {
    padding: 18,
    paddingTop: 16,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d5b08f',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  name: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: THEME.text.inverse,
  },
  roaster: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#f0dcc7',
  },
  originRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  originText: {
    flex: 1,
    fontSize: 13,
    color: '#bda694',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8efe6',
  },
  metaCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  metaTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff4ea',
  },
  metaText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: '#cdb8a6',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fffaf3',
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#f4e4d2',
    borderWidth: 1,
    borderColor: '#ead7c3',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#6e4b36',
  },
});
