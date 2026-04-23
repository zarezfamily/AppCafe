import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const METHOD_ICONS = {
  Espresso: 'cafe-outline',
  V60: 'filter-outline',
  Chemex: 'flask-outline',
  Aeropress: 'fitness-outline',
  'Prensa francesa': 'water-outline',
  Moka: 'flame-outline',
  'Cold brew': 'snow-outline',
};

function Stars({ value }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= value ? 'star' : 'star-outline'}
          size={11}
          color={i <= value ? '#c8a97c' : '#d4c4b4'}
        />
      ))}
    </View>
  );
}

function Avatar({ method }) {
  const icon = METHOD_ICONS[method] || 'cafe-outline';
  return (
    <View style={styles.avatar}>
      <Ionicons name={icon} size={16} color="#c8a97c" />
    </View>
  );
}

/**
 * SocialCataCard
 *
 * Displays an anonymised community tasting entry.
 * Props:
 *   cata     – { cafeNombre, puntuacion, metodoPreparacion, contexto, fechaHora, notas }
 *   onPress  – called with the card (to navigate to the cafe)
 */
export default function SocialCataCard({ cata, onPress }) {
  if (!cata) return null;

  const dateStr = (() => {
    try {
      const d = new Date(cata.fechaHora);
      const now = new Date();
      const diffH = Math.floor((now - d) / 3600000);
      if (diffH < 1) return 'hace un momento';
      if (diffH < 24) return `hace ${diffH}h`;
      const diffD = Math.floor(diffH / 24);
      if (diffD === 1) return 'ayer';
      if (diffD < 7) return `hace ${diffD}d`;
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  })();

  const hasNotes = !!String(cata.notas || '').trim();

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(cata)} activeOpacity={0.88}>
      <View style={styles.header}>
        <Avatar method={cata.metodoPreparacion} />
        <View style={styles.headerText}>
          <Text style={styles.cafeName} numberOfLines={1}>
            {cata.cafeNombre}
          </Text>
          <Text style={styles.meta}>
            {cata.metodoPreparacion}
            {cata.contexto ? ` · ${cata.contexto}` : ''}
          </Text>
        </View>
        <Text style={styles.dateStr}>{dateStr}</Text>
      </View>

      {cata.puntuacion > 0 && <Stars value={cata.puntuacion} />}

      {hasNotes && (
        <Text style={styles.notes} numberOfLines={2}>
          "{cata.notas}"
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    backgroundColor: '#fffdf9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eadbce',
    padding: 12,
    marginRight: 10,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a1a0f',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
  },
  cafeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#24160f',
    lineHeight: 17,
  },
  meta: {
    fontSize: 11,
    color: '#9e7c62',
    marginTop: 1,
  },
  dateStr: {
    fontSize: 10,
    color: '#b0967c',
    flexShrink: 0,
    marginTop: 1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  notes: {
    fontSize: 12,
    color: '#6f5a4b',
    fontStyle: 'italic',
    lineHeight: 17,
  },
});
