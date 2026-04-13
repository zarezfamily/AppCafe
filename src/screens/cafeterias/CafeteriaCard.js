import { Ionicons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View } from 'react-native';

import {
  PREMIUM_ACCENT,
  THEME,
} from '../../constants/theme';

export default function CafeteriaCard({ item, index, styles, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.88}>
      <View style={styles.cardImgWrap}>
        {item.foto ? (
          <Image source={{ uri: item.foto }} style={styles.cardImg} resizeMode="cover" />
        ) : (
          <View style={styles.cardPlaceholder}>
            <Text style={styles.cardPlaceholderEmoji}>☕</Text>
            <Text style={styles.cardPlaceholderNombre} numberOfLines={2}>
              {item.nombre}
            </Text>
          </View>
        )}

        <View style={styles.cardNum}>
          <Text style={styles.cardNumText}>{index + 1}</Text>
        </View>

        {item.abierto !== null && (
          <View style={[styles.cardEstado, { backgroundColor: item.abierto ? THEME.status.success : THEME.status.danger }]}>
            <Text style={styles.cardEstadoText}>{item.abierto ? 'Abierto' : 'Cerrado'}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardNombre} numberOfLines={1}>
          {item.nombre}
        </Text>
        <Text style={styles.cardTipo}>{item.tipo}</Text>

        <View style={styles.cardRatingRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Ionicons
              key={n}
              name={n <= Math.round(item.rating) ? 'star' : 'star-outline'}
              size={12}
              color={THEME.status.favorite}
            />
          ))}
          <Text style={styles.cardRatingNum}>{item.rating}</Text>
          <Text style={styles.cardReseñas}>({item.numResenas})</Text>
        </View>

        <View style={styles.cardTags}>
          <View style={styles.cardTag}>
            <Ionicons name="location-outline" size={11} color={PREMIUM_ACCENT} />
            <Text style={styles.cardTagText}>
              {item.distancia < 1000 ? `${item.distancia}m` : `${(item.distancia / 1000).toFixed(1)}km`}
            </Text>
          </View>

          {item.wifi && (
            <View style={styles.cardTag}>
              <Ionicons name="wifi-outline" size={11} color={THEME.text.tertiary} />
              <Text style={styles.cardTagText}>WiFi</Text>
            </View>
          )}

          {item.terraza && (
            <View style={styles.cardTag}>
              <Ionicons name="sunny-outline" size={11} color={THEME.text.tertiary} />
              <Text style={styles.cardTagText}>Terraza</Text>
            </View>
          )}

          {item.takeaway && (
            <View style={styles.cardTag}>
              <Ionicons name="bag-handle-outline" size={11} color={THEME.text.tertiary} />
              <Text style={styles.cardTagText}>Para llevar</Text>
            </View>
          )}
        </View>

        <Text style={styles.cardEspec} numberOfLines={1}>
          {item.especialidades}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
