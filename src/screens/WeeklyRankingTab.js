import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import PackshotImage from '../components/PackshotImage';
import useSocialFeed from '../hooks/useSocialFeed';

const ACCENT = '#8f5e3b';
const GOLD = '#c8a97c';
const BG = '#fffdf9';
const CARD_BG = '#fffaf5';
const TEXT_DARK = '#24160f';
const TEXT_MID = '#6f5a4b';
const TEXT_MUTED = '#9e7c62';
const BORDER = '#eadbce';

const PODIUM_ICONS = ['🥇', '🥈', '🥉'];

function TastingBar({ count, max }) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 4;
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${pct}%` }]} />
    </View>
  );
}

function WeeklyRow({ entry, rank, onPress }) {
  const podium = rank <= 3 ? PODIUM_ICONS[rank - 1] : null;
  const foto = entry.cafe?.bestPhoto || entry.cafe?.officialPhoto || entry.cafe?.foto || null;

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress?.(entry)} activeOpacity={0.88}>
      <View style={styles.rankBadge}>
        {podium ? (
          <Text style={styles.rankPodium}>{podium}</Text>
        ) : (
          <Text style={styles.rankNum}>{rank}</Text>
        )}
      </View>

      <View style={styles.fotoWrap}>
        {foto ? (
          <PackshotImage uri={foto} style={styles.foto} />
        ) : (
          <View style={[styles.foto, styles.fotoFallback]}>
            <Text style={{ fontSize: 20 }}>☕</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.cafeName} numberOfLines={1}>
          {entry.cafeNombre}
        </Text>
        <View style={styles.statsRow}>
          <Ionicons name="people-outline" size={12} color={TEXT_MUTED} />
          <Text style={styles.countText}>{entry.count} personas lo cataron</Text>
        </View>
        {entry.avgPuntuacion > 0 && (
          <View style={styles.statsRow}>
            <Ionicons name="star" size={11} color={GOLD} />
            <Text style={styles.ratingText}>{entry.avgPuntuacion.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <TastingBar count={entry.count} max={entry._max || entry.count} />
    </TouchableOpacity>
  );
}

export default function WeeklyRankingTab({ allCafes, setCafeDetalle }) {
  const { weeklyHotCafes, loadingSocial } = useSocialFeed({ allCafes });

  // Inject _max for relative bar widths
  const max = weeklyHotCafes[0]?.count || 1;
  const entries = weeklyHotCafes.map((e) => ({ ...e, _max: max }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Ranking semanal</Text>
        <Text style={styles.subtitle}>Cafés más catados por la comunidad esta semana</Text>
      </View>

      {loadingSocial && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={styles.loaderText}>Calculando ranking semanal…</Text>
        </View>
      )}

      {!loadingSocial && entries.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>
            Aún no hay datos para esta semana.{'\n'}¡Añade una cata y sé el primero!
          </Text>
        </View>
      )}

      {!loadingSocial && entries.length > 0 && (
        <View style={styles.list}>
          {entries.map((entry, idx) => (
            <WeeklyRow
              key={entry.cafeId || entry.cafeNombre}
              entry={entry}
              rank={idx + 1}
              onPress={(e) => {
                if (e.cafe && setCafeDetalle) setCafeDetalle(e.cafe);
              }}
            />
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: TEXT_DARK,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: TEXT_MID,
  },
  loader: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  loaderText: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_MID,
    textAlign: 'center',
    lineHeight: 22,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  rankBadge: {
    width: 32,
    alignItems: 'center',
  },
  rankPodium: {
    fontSize: 20,
  },
  rankNum: {
    fontSize: 16,
    fontWeight: '900',
    color: TEXT_MUTED,
  },
  fotoWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
  },
  foto: {
    width: 48,
    height: 48,
  },
  fotoFallback: {
    backgroundColor: '#f4e8db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  cafeName: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
  },
  barTrack: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#eadbce',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
});
