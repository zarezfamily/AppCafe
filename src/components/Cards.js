import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PREMIUM_ACCENT, THEME } from '../constants/theme';
import { shared } from '../styles/sharedStyles';
import PackshotImage from './PackshotImage';
import Stars from './Stars';

export function CardHorizontal({ item, badge, onPress, favs = [], onToggleFav }) {
  const isFav = favs.includes(item.id);

  return (
    <TouchableOpacity style={styles.cardH} onPress={() => onPress?.(item)} activeOpacity={0.9}>
      <View style={styles.cardHImg}>
        <PackshotImage
          uri={item.foto || item.image}
          frameStyle={shared.packshotCardFrame}
          imageStyle={shared.packshotCardImage}
        />

        <View style={shared.badgeRed}>
          <Text style={shared.badgeText}>{badge}</Text>
        </View>

        {onToggleFav && (
          <TouchableOpacity style={styles.favBtnCard} onPress={() => onToggleFav(item)}>
            <Ionicons
              name={isFav ? 'star' : 'star-outline'}
              size={16}
              color={isFav ? THEME.status.favorite : THEME.text.inverse}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* 🔥 ROASTER */}
      <Text style={styles.cardHBrand} numberOfLines={1}>
        {item.roaster || 'Specialty Coffee'}
      </Text>

      {/* 🔥 NOMBRE */}
      <Text style={styles.cardHName} numberOfLines={2}>
        {item.nombre}
      </Text>

      {/* 🔥 INFO */}
      <Text style={styles.cardHMeta}>
        {item.pais} · {item.proceso}
      </Text>

      {/* ⭐ RATING */}
      <View style={styles.ratingRow}>
        <Ionicons name="star" size={13} color={PREMIUM_ACCENT} />
        <Text style={styles.cardHRating}>{item.puntuacion}.0</Text>
        <Text style={styles.cardHVotos}>({item.votos || 1})</Text>
      </View>

      {/* 💰 PRECIO */}
      {item.precio && <Text style={styles.price}>{item.precio} €</Text>}
    </TouchableOpacity>
  );
}

export function CardVertical({ item, onDelete, onPress, favs = [], onToggleFav }) {
  const isFav = favs.includes(item.id);

  return (
    <TouchableOpacity style={styles.cardV} onPress={() => onPress?.(item)} activeOpacity={0.9}>
      <View style={styles.cardVImg}>
        <PackshotImage
          uri={item.foto || item.image}
          frameStyle={shared.packshotListFrame}
          imageStyle={shared.packshotListImage}
        />

        <View style={shared.badgeRed}>
          <Text style={shared.badgeText}>{item.puntuacion}.0</Text>
        </View>

        {onToggleFav && (
          <TouchableOpacity
            style={[styles.favBtnCard, { top: 'auto', bottom: 6, right: 6 }]}
            onPress={() => onToggleFav(item)}
          >
            <Ionicons
              name={isFav ? 'star' : 'star-outline'}
              size={14}
              color={isFav ? THEME.status.favorite : THEME.text.inverse}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flex: 1 }}>
        {/* ROASTER */}
        <Text style={styles.cardVBrand}>{item.roaster || 'Specialty Coffee'}</Text>

        {/* NOMBRE */}
        <Text style={styles.cardVName}>{item.nombre}</Text>

        {/* META */}
        <Text style={styles.cardVMeta}>
          {item.pais} · {item.proceso}
        </Text>

        <Stars value={item.puntuacion} />

        {item.notas && (
          <Text style={styles.cardVNotas} numberOfLines={2}>
            {item.notas}
          </Text>
        )}

        {item.precio && <Text style={styles.priceV}>{item.precio} €</Text>}
      </View>

      <TouchableOpacity onPress={() => onDelete(item)} style={{ padding: 4 }}>
        <Ionicons name="trash-outline" size={18} color={THEME.icon.faint} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardH: { width: 170, marginRight: 8 },

  cardHImg: {
    width: 170,
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },

  cardHBrand: {
    fontSize: 11,
    color: '#8f5e3b',
    fontWeight: '700',
    marginBottom: 2,
  },

  cardHName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
    lineHeight: 20,
  },

  cardHMeta: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },

  cardHRating: {
    fontSize: 13,
    fontWeight: '700',
    color: PREMIUM_ACCENT,
  },

  cardHVotos: {
    fontSize: 11,
    color: THEME.text.secondary,
  },

  price: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },

  cardV: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: THEME.border.soft,
  },

  cardVImg: {
    width: 90,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
  },

  cardVBrand: {
    fontSize: 11,
    color: '#8f5e3b',
    fontWeight: '700',
  },

  cardVName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },

  cardVMeta: {
    fontSize: 11,
    color: '#777',
    marginBottom: 4,
  },

  cardVNotas: {
    fontSize: 12,
    color: THEME.text.muted,
    marginTop: 4,
  },

  priceV: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },

  favBtnCard: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
