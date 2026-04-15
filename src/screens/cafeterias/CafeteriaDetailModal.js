import { Ionicons } from '@expo/vector-icons';
import {
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { PREMIUM_ACCENT, PREMIUM_ACCENT_DEEP, THEME } from '../../constants/theme';

export default function CafeteriaDetailModal({ cafeteria, styles, onClose, abrirMaps }) {
  if (!cafeteria) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.detailScreen}>
        <StatusBar barStyle="dark-content" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.detHero}>
            {cafeteria.foto ? (
              <Image
                source={{ uri: cafeteria.foto }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.detPlaceholder}>
                <Text style={styles.detPlaceholderEmoji}>☕</Text>
              </View>
            )}

            <View style={styles.detHeroGrad} />

            <TouchableOpacity style={styles.detBack} onPress={onClose}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.detNavBtn} onPress={() => abrirMaps(cafeteria)}>
              <Ionicons name="navigate" size={20} color="#fff" />
            </TouchableOpacity>

            {cafeteria.abierto !== null && (
              <View
                style={[
                  styles.badgeEstado,
                  {
                    backgroundColor: cafeteria.abierto ? THEME.status.success : THEME.status.danger,
                  },
                ]}
              >
                <Text style={styles.badgeEstadoText}>
                  {cafeteria.abierto ? '🟢 Abierto ahora' : '🔴 Cerrado'}
                </Text>
              </View>
            )}

            <View style={styles.detOverlay}>
              <Text style={styles.detNombre}>{cafeteria.nombre}</Text>
              <Text style={styles.detTipo}>{cafeteria.tipo}</Text>
              <View style={styles.detRatingRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Ionicons
                    key={n}
                    name={n <= Math.round(cafeteria.rating) ? 'star' : 'star-outline'}
                    size={14}
                    color={THEME.status.favorite}
                  />
                ))}
                <Text style={styles.detRatingNum}>{cafeteria.rating}</Text>
                <Text style={styles.detReseñas}>({cafeteria.numResenas} reseñas)</Text>
              </View>
            </View>
          </View>

          <View style={styles.detBody}>
            <View style={styles.detInfoRow}>
              <View style={styles.detInfoItem}>
                <Ionicons name="location" size={20} color={PREMIUM_ACCENT} />
                <Text style={styles.detInfoLabel}>
                  {cafeteria.distancia < 1000
                    ? `${cafeteria.distancia}m`
                    : `${(cafeteria.distancia / 1000).toFixed(1)}km`}
                </Text>
              </View>

              <View style={styles.detInfoItem}>
                <Ionicons name="star" size={20} color={THEME.status.favorite} />
                <Text style={styles.detInfoLabel}>
                  {cafeteria.rating} ({cafeteria.numResenas})
                </Text>
              </View>

              {cafeteria.wifi && (
                <View style={styles.detInfoItem}>
                  <Ionicons name="wifi" size={20} color={PREMIUM_ACCENT} />
                  <Text style={styles.detInfoLabel}>WiFi</Text>
                </View>
              )}

              {cafeteria.terraza && (
                <View style={styles.detInfoItem}>
                  <Ionicons name="sunny" size={20} color={PREMIUM_ACCENT} />
                  <Text style={styles.detInfoLabel}>Terraza</Text>
                </View>
              )}

              {cafeteria.takeaway && (
                <View style={styles.detInfoItem}>
                  <Ionicons name="bag-handle" size={20} color={PREMIUM_ACCENT} />
                  <Text style={styles.detInfoLabel}>Para llevar</Text>
                </View>
              )}
            </View>

            {cafeteria.descripcion && (
              <View style={styles.seccion}>
                <Text style={styles.secTitulo}>📝 Sobre esta cafetería</Text>
                <Text style={styles.secTexto}>{cafeteria.descripcion}</Text>
              </View>
            )}

            {cafeteria.categorias && (
              <View style={styles.seccion}>
                <Text style={styles.secTitulo}>🏷️ Categorías</Text>
                <Text style={styles.secTexto}>{cafeteria.categorias}</Text>
              </View>
            )}

            <View style={styles.seccion}>
              <Text style={styles.secTitulo}>☕ Especialidades</Text>
              <Text style={styles.secTexto}>{cafeteria.especialidades}</Text>
            </View>

            {cafeteria.fotos && cafeteria.fotos.length > 1 && (
              <View style={styles.seccion}>
                <Text style={styles.secTitulo}>📸 Fotos</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 8 }}
                >
                  {cafeteria.fotos.map(
                    (foto, index) =>
                      foto && (
                        <Image
                          key={index}
                          source={{ uri: foto }}
                          style={{ width: 120, height: 90, borderRadius: 10, marginRight: 8 }}
                          resizeMode="cover"
                        />
                      )
                  )}
                </ScrollView>
              </View>
            )}

            {cafeteria.horario && (
              <View style={styles.seccion}>
                <Text style={styles.secTitulo}>🕐 Horario</Text>
                <Text style={styles.secTexto}>{cafeteria.horario}</Text>
              </View>
            )}

            {cafeteria.direccion && (
              <View style={styles.seccion}>
                <Text style={styles.secTitulo}>📍 Dirección</Text>
                <Text style={styles.secTexto}>{cafeteria.direccion}</Text>
                <Text style={[styles.secTexto, { marginTop: 6 }]}>
                  Coordenadas: {Number(cafeteria.lat).toFixed(5)},{' '}
                  {Number(cafeteria.lon).toFixed(5)}
                </Text>
              </View>
            )}

            {(cafeteria.telefono || cafeteria.web) && (
              <View style={styles.seccion}>
                <Text style={styles.secTitulo}>📞 Contacto</Text>

                {cafeteria.telefono && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${cafeteria.telefono}`)}
                    style={styles.contactBtn}
                  >
                    <Ionicons name="call-outline" size={16} color={PREMIUM_ACCENT} />
                    <Text style={styles.contactText}>{cafeteria.telefono}</Text>
                  </TouchableOpacity>
                )}

                {cafeteria.web && (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        cafeteria.web.startsWith('http')
                          ? cafeteria.web
                          : `https://${cafeteria.web}`
                      )
                    }
                    style={styles.contactBtn}
                  >
                    <Ionicons name="globe-outline" size={16} color={PREMIUM_ACCENT} />
                    <Text style={styles.contactText}>
                      {cafeteria.web.replace('https://', '').replace('http://', '').split('/')[0]}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 8 }]}
              onPress={() => abrirMaps(cafeteria)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="navigate-outline" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Cómo llegar</Text>
              </View>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
