import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PREMIUM_ACCENT, THEME } from '../constants/theme';
import { shared } from '../styles/sharedStyles';
import PackshotImage from './PackshotImage';
import Stars from './Stars';

export function CardHorizontal({ item, badge, onPress, favs = [], onToggleFav }) {
  const isFav = favs.includes(item.id);
  return (
    <TouchableOpacity style={styles.cardH} onPress={() => onPress?.(item)} activeOpacity={0.85}>
      <View style={styles.cardHImg}>
        <PackshotImage uri={item.foto} frameStyle={shared.packshotCardFrame} imageStyle={shared.packshotCardImage} />
        <View style={shared.badgeRed}><Text style={shared.badgeText}>{badge}</Text></View>
        {onToggleFav && (
          <TouchableOpacity style={styles.favBtnCard} onPress={() => onToggleFav(item)}>
            <Ionicons name={isFav ? 'star' : 'star-outline'} size={16} color={isFav ? THEME.status.favorite : THEME.text.inverse} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.cardHOrigin} numberOfLines={1}>{item.region || item.pais || item.origen || 'Sin origen'}</Text>
      <Text style={styles.cardHName} numberOfLines={2}>{item.nombre}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <Ionicons name="star" size={13} color={PREMIUM_ACCENT} />
        <Text style={styles.cardHRating}>{item.puntuacion}.0</Text>
        <Text style={styles.cardHVotos}>({item.votos || 1})</Text>
      </View>
    </TouchableOpacity>
  );
}

export function CardVertical({ item, onDelete, onPress, favs = [], onToggleFav }) {
  const isFav = favs.includes(item.id);
  return (
    <TouchableOpacity style={styles.cardV} onPress={() => onPress?.(item)} activeOpacity={0.85}>
      <View style={styles.cardVImg}>
        <PackshotImage uri={item.foto} frameStyle={shared.packshotListFrame} imageStyle={shared.packshotListImage} />
        <View style={shared.badgeRed}><Text style={shared.badgeText}>{item.puntuacion}.0</Text></View>
        {onToggleFav && (
          <TouchableOpacity style={[styles.favBtnCard, { top: 'auto', bottom: 6, right: 6 }]} onPress={() => onToggleFav(item)}>
            <Ionicons name={isFav ? 'star' : 'star-outline'} size={14} color={isFav ? THEME.status.favorite : THEME.text.inverse} />
          </TouchableOpacity>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardVOrigin}>{item.region || item.pais || item.origen || 'Sin origen'}</Text>
        <Text style={styles.cardVName}>{item.nombre}</Text>
        <Stars value={item.puntuacion} />
        {item.notas ? <Text style={styles.cardVNotas} numberOfLines={2}>{item.notas}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => onDelete(item)} style={{ padding: 4 }}>
        <Ionicons name="trash-outline" size={18} color={THEME.icon.faint} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardH:       { width: 160, marginRight: 4 },
  cardHImg:    { width: 160, height: 200, borderRadius: 10, backgroundColor: '#f8f7f4', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  cardHOrigin: { fontSize: 12, color: THEME.text.secondary, marginBottom: 2 },
  cardHName:   { fontSize: 14, fontWeight: '700', color: '#111', lineHeight: 19 },
  cardHRating: { fontSize: 13, fontWeight: '600', color: PREMIUM_ACCENT },
  cardHVotos:  { fontSize: 12, color: THEME.text.secondary },
  cardV:       { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: THEME.border.soft },
  cardVImg:    { width: 80, height: 100, borderRadius: 10, backgroundColor: '#f8f7f4', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  cardVOrigin: { fontSize: 12, color: THEME.text.secondary, marginBottom: 2 },
  cardVName:   { fontSize: 15, fontWeight: '700', color: THEME.text.primary, marginBottom: 5 },
  cardVNotas:  { fontSize: 12, color: THEME.text.muted, marginTop: 5, lineHeight: 17 },
  favBtnCard:  { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
});
