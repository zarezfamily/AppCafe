import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PREMIUM_ACCENT, THEME } from '../constants/theme';
import { shared } from '../styles/sharedStyles';
import PackshotImage from './PackshotImage';
import Stars from './Stars';

function getCoffeeCategory(item) {
  const c = item?.coffeeCategory;
  if (c === 'daily') return 'daily';
  if (c === 'commercial') return 'commercial';
  return 'specialty';
}

function getCategoryLabel(item) {
  return getCoffeeCategory(item) === 'daily' ? 'Café diario' : 'Especialidad';
}

function getBrandLabel(item) {
  if (getCoffeeCategory(item) === 'daily') {
    return item.marca || item.roaster || 'Café diario';
  }
  return item.roaster || item.marca || 'Specialty Coffee';
}

function getMetaLabel(item) {
  const category = getCoffeeCategory(item);

  if (category === 'daily') {
    const left = item.origen || item.pais || 'Café comercial';
    const right = item.formato || item.proceso || '';
    return [left, right].filter(Boolean).join(' · ');
  }

  const left = item.pais || item.origen || '';
  const right = item.proceso || '';
  return [left, right].filter(Boolean).join(' · ');
}

function getImageUri(item) {
  return item.bestPhoto || item.officialPhoto || item.foto || item.image || null;
}

function CategoryBadge({ item }) {
  const isDaily = getCoffeeCategory(item) === 'daily';

  return (
    <View
      style={[
        styles.categoryBadge,
        isDaily ? styles.categoryBadgeDaily : styles.categoryBadgeSpecialty,
      ]}
    >
      <Text
        style={[
          styles.categoryBadgeText,
          isDaily ? styles.categoryBadgeTextDaily : styles.categoryBadgeTextSpecialty,
        ]}
      >
        {getCategoryLabel(item)}
      </Text>
    </View>
  );
}

export function CardHorizontal({ item, badge, onPress, favs = [], onToggleFav }) {
  const isFav = favs.includes(item.id);
  const imageUri = getImageUri(item);

  return (
    <TouchableOpacity style={styles.cardH} onPress={() => onPress?.(item)} activeOpacity={0.9}>
      <View style={styles.cardHImg}>
        <PackshotImage
          uri={imageUri}
          frameStyle={shared.packshotCardFrame}
          imageStyle={shared.packshotCardImage}
        />

        <View style={shared.badgeRed}>
          <Text style={shared.badgeText}>{badge}</Text>
        </View>

        <View style={styles.categoryBadgeWrap}>
          <CategoryBadge item={item} />
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

      <Text style={styles.cardHBrand} numberOfLines={1}>
        {getBrandLabel(item)}
      </Text>

      <Text style={styles.cardHName} numberOfLines={2}>
        {item.nombre}
      </Text>

      <Text style={styles.cardHMeta}>{getMetaLabel(item)}</Text>

      <View style={styles.ratingRow}>
        <Ionicons name="star" size={13} color={PREMIUM_ACCENT} />
        <Text style={styles.cardHRating}>{item.puntuacion || 0}.0</Text>
        <Text style={styles.cardHVotos}>({item.votos || 0})</Text>
      </View>

      {item.precio ? <Text style={styles.price}>{item.precio} €</Text> : null}
    </TouchableOpacity>
  );
}

export function CardVertical({ item, onDelete, onPress, favs = [], onToggleFav }) {
  const isFav = favs.includes(item.id);
  const imageUri = getImageUri(item);

  return (
    <TouchableOpacity style={styles.cardV} onPress={() => onPress?.(item)} activeOpacity={0.9}>
      <View style={styles.cardVImg}>
        <PackshotImage
          uri={imageUri}
          frameStyle={shared.packshotListFrame}
          imageStyle={shared.packshotListImage}
        />

        <View style={shared.badgeRed}>
          <Text style={shared.badgeText}>{item.puntuacion || 0}.0</Text>
        </View>

        <View style={styles.categoryBadgeWrapVertical}>
          <CategoryBadge item={item} />
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
        <Text style={styles.cardVBrand}>{getBrandLabel(item)}</Text>

        <Text style={styles.cardVName}>{item.nombre}</Text>

        <Text style={styles.cardVMeta}>{getMetaLabel(item)}</Text>

        <Stars value={item.puntuacion || 0} />

        {item.notas ? (
          <Text style={styles.cardVNotas} numberOfLines={2}>
            {item.notas}
          </Text>
        ) : null}

        {item.precio ? <Text style={styles.priceV}>{item.precio} €</Text> : null}
      </View>

      {onDelete ? (
        <TouchableOpacity onPress={() => onDelete(item)} style={{ padding: 4 }}>
          <Ionicons name="trash-outline" size={18} color={THEME.icon.faint} />
        </TouchableOpacity>
      ) : null}
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

  categoryBadgeWrap: {
    position: 'absolute',
    left: 8,
    bottom: 8,
  },

  categoryBadgeWrapVertical: {
    position: 'absolute',
    left: 6,
    bottom: 6,
  },

  categoryBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
  },
  categoryBadgeSpecialty: {
    backgroundColor: 'rgba(245, 232, 214, 0.96)',
    borderColor: '#e4d3c2',
  },
  categoryBadgeDaily: {
    backgroundColor: 'rgba(231, 243, 255, 0.96)',
    borderColor: '#c8def7',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  categoryBadgeTextSpecialty: {
    color: '#8f5e3b',
  },
  categoryBadgeTextDaily: {
    color: '#245b91',
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
    minHeight: 16,
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
    minHeight: 16,
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
