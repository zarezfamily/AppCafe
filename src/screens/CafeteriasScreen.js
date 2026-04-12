import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  GOOGLE_PLACES_KEY,
  H,
  PREMIUM_ACCENT,
  PREMIUM_ACCENT_DEEP,
  PREMIUM_BORDER_SOFT,
  PREMIUM_SURFACE_SOFT,
  THEME,
} from '../constants/theme';
import { buildPlacesPhotoUrl, calcDistanceMeters, fetchNearbyPlaces, isGooglePlacesConfigured } from '../core/places';

export default function CafeteriasScreen() {
  const [cafeterias, setCafeterias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);
  const [radioKm, setRadioKm] = useState(5);
  const [soloAbiertas, setSoloAbiertas] = useState(false);

  const radiosDisponibles = [2, 5, 10];

  useEffect(() => {
    cargarCafeterias(radioKm);
  }, [radioKm]);

  const formatearTipo = (types = []) => {
    if (types.includes('coffee_shop') || types.includes('cafe')) return 'Coffee Shop';
    return 'Cafetería';
  };

  const formatearCategorias = (types = []) =>
    types
      .filter((type) => type !== 'point_of_interest' && type !== 'establishment')
      .slice(0, 4)
      .map((type) => type.replace(/_/g, ' '))
      .join(' · ');

  const cargarCafeterias = async (radiusKm = radioKm) => {
    setCargando(true);
    setError(null);

    try {
      if (!isGooglePlacesConfigured(GOOGLE_PLACES_KEY)) {
        setError('Configura una Google Places API key válida para habilitar cafeterías cercanas.');
        setCargando(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Activa la ubicación para ver cafeterías cerca de ti');
        setCargando(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lon } = loc.coords;

      const places = await fetchNearbyPlaces({
        apiKey: GOOGLE_PLACES_KEY,
        lat,
        lon,
        maxResultCount: 20,
        radiusMeters: radiusKm * 1000,
        rankPreference: 'DISTANCE',
        fieldMask:
          'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.regularOpeningHours,places.internationalPhoneNumber,places.websiteUri,places.photos,places.editorialSummary,places.types',
      });

      const result = places
        .map((place) => {
          const geo = place.location || {};
          const distancia = calcDistanceMeters(lat, lon, geo.latitude || lat, geo.longitude || lon);
          const horarioTexto = place.regularOpeningHours?.weekdayDescriptions
            ? place.regularOpeningHours.weekdayDescriptions.join(', ')
            : null;
          const abierto = place.currentOpeningHours?.openNow ?? null;
          const fotoUrl = place.photos?.[0]?.name ? buildPlacesPhotoUrl(place.photos[0].name, GOOGLE_PLACES_KEY) : null;
          const fotosUrls = (place.photos || []).slice(0, 4).map((photo) => buildPlacesPhotoUrl(photo.name, GOOGLE_PLACES_KEY));
          const placeTypes = place.types || [];
          const descripcion = place.editorialSummary?.text || null;

          return {
            id: place.id,
            nombre: place.displayName?.text || 'Cafetería',
            lat: geo.latitude || lat,
            lon: geo.longitude || lon,
            distancia,
            direccion: place.formattedAddress || null,
            telefono: place.internationalPhoneNumber || null,
            web: place.websiteUri || null,
            abierto,
            horario: horarioTexto,
            rating: place.rating ? place.rating.toFixed(1) : '--',
            numResenas: place.userRatingCount || 0,
            resenas: [],
            descripcion,
            foto: fotoUrl,
            fotos: fotosUrls,
            tipo: formatearTipo(placeTypes),
            categorias: formatearCategorias(placeTypes),
            especialidades: descripcion || 'Café de especialidad, espresso y métodos de filtro',
            wifi: false,
            terraza: false,
            takeaway: placeTypes.includes('meal_takeaway'),
          };
        })
        .sort((a, b) => {
          if (a.distancia !== b.distancia) return a.distancia - b.distancia;
          return parseFloat(b.rating) - parseFloat(a.rating);
        });

      setCafeterias(result);
      if (result.length === 0) {
        setError('No encontramos cafeterías cerca. Prueba en otra zona.');
      }
    } catch (error) {
      const message = String(error?.message || '');
      if (message.includes('GOOGLE_PLACES_KEY_NOT_CONFIGURED')) {
        setError('Configura una Google Places API key válida para habilitar cafeterías cercanas.');
      } else if (message.includes('GOOGLE_PLACES_API_ERROR')) {
        setError('Google Places no está disponible: revisa permisos de API key y facturación en Google Cloud.');
      } else {
        setError(`Error al buscar cafeterías: ${message}`);
      }
    } finally {
      setCargando(false);
    }
  };

  const abrirMaps = (cafeteria) => {
    const url =
      Platform.OS === 'ios'
        ? `maps://maps.apple.com/?q=${encodeURIComponent(cafeteria.nombre)}&ll=${cafeteria.lat},${cafeteria.lon}`
        : `geo:${cafeteria.lat},${cafeteria.lon}?q=${encodeURIComponent(cafeteria.nombre)}`;

    Linking.openURL(url).catch(() => {});
  };

  const cafeteriasVisibles = soloAbiertas ? cafeterias.filter((cafeteria) => cafeteria.abierto === true) : cafeterias;

  if (cargando) {
    return (
      <View style={styles.loadBox}>
        <Text style={styles.loadEmoji}>☕</Text>
        <ActivityIndicator color={PREMIUM_ACCENT} size="large" />
        <Text style={styles.loadTitle}>Buscando cafeterías</Text>
        <Text style={styles.loadSub}>Localizando las mejores cerca de ti...</Text>
      </View>
    );
  }

  if (error && cafeterias.length === 0) {
    return (
      <View style={styles.errorBox}>
        <Text style={{ fontSize: 48 }}>📍</Text>
        <Text style={styles.errorTitle}>Ups...</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => cargarCafeterias()}>
          <Text style={styles.primaryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {seleccionada && (
        <Modal visible animationType="slide" onRequestClose={() => setSeleccionada(null)}>
          <SafeAreaView style={styles.detailScreen}>
            <StatusBar barStyle="dark-content" />
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detHero}>
                {seleccionada.foto ? (
                  <Image source={{ uri: seleccionada.foto }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                ) : (
                  <View style={styles.detPlaceholder}>
                    <Text style={styles.detPlaceholderEmoji}>☕</Text>
                  </View>
                )}

                <View style={styles.detHeroGrad} />

                <TouchableOpacity style={styles.detBack} onPress={() => setSeleccionada(null)}>
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.detNavBtn} onPress={() => abrirMaps(seleccionada)}>
                  <Ionicons name="navigate" size={20} color="#fff" />
                </TouchableOpacity>

                {seleccionada.abierto !== null && (
                  <View
                    style={[
                      styles.badgeEstado,
                      { backgroundColor: seleccionada.abierto ? THEME.status.success : THEME.status.danger },
                    ]}
                  >
                    <Text style={styles.badgeEstadoText}>{seleccionada.abierto ? '🟢 Abierto ahora' : '🔴 Cerrado'}</Text>
                  </View>
                )}

                <View style={styles.detOverlay}>
                  <Text style={styles.detNombre}>{seleccionada.nombre}</Text>
                  <Text style={styles.detTipo}>{seleccionada.tipo}</Text>
                  <View style={styles.detRatingRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons
                        key={n}
                        name={n <= Math.round(seleccionada.rating) ? 'star' : 'star-outline'}
                        size={14}
                        color={THEME.status.favorite}
                      />
                    ))}
                    <Text style={styles.detRatingNum}>{seleccionada.rating}</Text>
                    <Text style={styles.detReseñas}>({seleccionada.numResenas} reseñas)</Text>
                  </View>
                </View>
              </View>

              <View style={styles.detBody}>
                <View style={styles.detInfoRow}>
                  <View style={styles.detInfoItem}>
                    <Ionicons name="location" size={20} color={PREMIUM_ACCENT} />
                    <Text style={styles.detInfoLabel}>
                      {seleccionada.distancia < 1000
                        ? `${seleccionada.distancia}m`
                        : `${(seleccionada.distancia / 1000).toFixed(1)}km`}
                    </Text>
                  </View>

                  <View style={styles.detInfoItem}>
                    <Ionicons name="star" size={20} color={THEME.status.favorite} />
                    <Text style={styles.detInfoLabel}>
                      {seleccionada.rating} ({seleccionada.numResenas})
                    </Text>
                  </View>

                  {seleccionada.wifi && (
                    <View style={styles.detInfoItem}>
                      <Ionicons name="wifi" size={20} color={PREMIUM_ACCENT} />
                      <Text style={styles.detInfoLabel}>WiFi</Text>
                    </View>
                  )}

                  {seleccionada.terraza && (
                    <View style={styles.detInfoItem}>
                      <Ionicons name="sunny" size={20} color={PREMIUM_ACCENT} />
                      <Text style={styles.detInfoLabel}>Terraza</Text>
                    </View>
                  )}

                  {seleccionada.takeaway && (
                    <View style={styles.detInfoItem}>
                      <Ionicons name="bag-handle" size={20} color={PREMIUM_ACCENT} />
                      <Text style={styles.detInfoLabel}>Para llevar</Text>
                    </View>
                  )}
                </View>

                {seleccionada.descripcion && (
                  <View style={styles.seccion}>
                    <Text style={styles.secTitulo}>📝 Sobre esta cafetería</Text>
                    <Text style={styles.secTexto}>{seleccionada.descripcion}</Text>
                  </View>
                )}

                {seleccionada.categorias && (
                  <View style={styles.seccion}>
                    <Text style={styles.secTitulo}>🏷️ Categorías</Text>
                    <Text style={styles.secTexto}>{seleccionada.categorias}</Text>
                  </View>
                )}

                <View style={styles.seccion}>
                  <Text style={styles.secTitulo}>☕ Especialidades</Text>
                  <Text style={styles.secTexto}>{seleccionada.especialidades}</Text>
                </View>

                {seleccionada.fotos && seleccionada.fotos.length > 1 && (
                  <View style={styles.seccion}>
                    <Text style={styles.secTitulo}>📸 Fotos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {seleccionada.fotos.map(
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

                {seleccionada.horario && (
                  <View style={styles.seccion}>
                    <Text style={styles.secTitulo}>🕐 Horario</Text>
                    <Text style={styles.secTexto}>{seleccionada.horario}</Text>
                  </View>
                )}

                {seleccionada.direccion && (
                  <View style={styles.seccion}>
                    <Text style={styles.secTitulo}>📍 Dirección</Text>
                    <Text style={styles.secTexto}>{seleccionada.direccion}</Text>
                    <Text style={[styles.secTexto, { marginTop: 6 }]}>
                      Coordenadas: {Number(seleccionada.lat).toFixed(5)}, {Number(seleccionada.lon).toFixed(5)}
                    </Text>
                  </View>
                )}

                {(seleccionada.telefono || seleccionada.web) && (
                  <View style={styles.seccion}>
                    <Text style={styles.secTitulo}>📞 Contacto</Text>

                    {seleccionada.telefono && (
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${seleccionada.telefono}`)} style={styles.contactBtn}>
                        <Ionicons name="call-outline" size={16} color={PREMIUM_ACCENT} />
                        <Text style={styles.contactText}>{seleccionada.telefono}</Text>
                      </TouchableOpacity>
                    )}

                    {seleccionada.web && (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(seleccionada.web.startsWith('http') ? seleccionada.web : `https://${seleccionada.web}`)
                        }
                        style={styles.contactBtn}
                      >
                        <Ionicons name="globe-outline" size={16} color={PREMIUM_ACCENT} />
                        <Text style={styles.contactText}>
                          {seleccionada.web.replace('https://', '').replace('http://', '').split('/')[0]}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <TouchableOpacity style={[styles.primaryButton, { marginTop: 8 }]} onPress={() => abrirMaps(seleccionada)}>
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
      )}

      <View style={styles.headerBox}>
        <View>
          <Text style={styles.pageTitle}>Cafeterías ☕</Text>
          <Text style={styles.headerMeta}>
            {cafeteriasVisibles.length} cerca de ti · radio {radioKm} km · ordenadas por distancia
          </Text>
        </View>

        <TouchableOpacity onPress={() => cargarCafeterias(radioKm)} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={18} color={PREMIUM_ACCENT_DEEP} />
        </TouchableOpacity>
      </View>

      <View style={styles.radiusRow}>
        {radiosDisponibles.map((km) => {
          const activo = radioKm === km;
          return (
            <TouchableOpacity
              key={String(km)}
              onPress={() => setRadioKm(km)}
              activeOpacity={0.85}
              style={[styles.radiusChip, activo && styles.radiusChipActive]}
            >
              <Text style={[styles.radiusChipText, activo && styles.radiusChipTextActive]}>Hasta {km} km</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => setSoloAbiertas((prev) => !prev)}
          activeOpacity={0.85}
          style={[styles.radiusChip, soloAbiertas && styles.radiusChipActive]}
        >
          <Text style={[styles.radiusChipText, soloAbiertas && styles.radiusChipTextActive]}>Solo abiertas</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cafeteriasVisibles}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No hay cafeterías abiertas en este radio</Text>
            <Text style={styles.emptySub}>Prueba ampliar el radio o desactivar el filtro.</Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSeleccionada(item)} activeOpacity={0.88}>
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
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  loadEmoji: { fontSize: 48 },
  loadTitle: { fontSize: 20, fontWeight: '700', color: '#111' },
  loadSub: { fontSize: 14, color: THEME.text.secondary, textAlign: 'center' },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  errorTitle: { fontSize: 22, fontWeight: '700', color: '#111' },
  errorText: { fontSize: 15, color: THEME.text.secondary, textAlign: 'center', lineHeight: 22 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 12 },
  headerMeta: { fontSize: 13, color: THEME.text.secondary },
  headerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PREMIUM_SURFACE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  radiusChip: {
    borderWidth: 1,
    borderColor: PREMIUM_BORDER_SOFT,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  radiusChipActive: { backgroundColor: PREMIUM_ACCENT_DEEP, borderColor: PREMIUM_ACCENT_DEEP },
  radiusChipText: { fontSize: 12, fontWeight: '700', color: THEME.text.secondary },
  radiusChipTextActive: { color: '#fff' },
  emptyBox: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: PREMIUM_BORDER_SOFT,
    borderRadius: 14,
    padding: 14,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#1f140f' },
  emptySub: { fontSize: 12, color: THEME.text.secondary, marginTop: 4 },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardImgWrap: { position: 'relative', height: 140 },
  cardImg: { width: '100%', height: '100%' },
  cardNum: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cardEstado: { position: 'absolute', top: 10, right: 10, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  cardEstadoText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardInfo: { padding: 12, gap: 4 },
  cardNombre: { fontSize: 17, fontWeight: '800', color: '#111' },
  cardTipo: { fontSize: 12, color: PREMIUM_ACCENT, fontWeight: '600', marginBottom: 2 },
  cardRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardRatingNum: { fontSize: 13, fontWeight: '700', color: '#333', marginLeft: 4 },
  cardReseñas: { fontSize: 12, color: THEME.text.muted },
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  cardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  cardTagText: { fontSize: 11, color: '#555' },
  cardEspec: { fontSize: 12, color: THEME.text.secondary, marginTop: 4, fontStyle: 'italic' },
  detailScreen: { flex: 1, backgroundColor: '#fff' },
  detHero: { height: H * 0.38, position: 'relative' },
  detHeroGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, backgroundColor: 'rgba(0,0,0,0.55)' },
  detPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a0a00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detPlaceholderEmoji: { fontSize: 72, opacity: 0.4 },
  cardPlaceholder: { width: '100%', height: '100%', backgroundColor: '#1a0a00', alignItems: 'center', justifyContent: 'center', padding: 12 },
  cardPlaceholderEmoji: { fontSize: 32, opacity: 0.5, marginBottom: 6 },
  cardPlaceholderNombre: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 18 },
  detBack: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detNavBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PREMIUM_ACCENT_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEstado: { position: 'absolute', top: 52, left: 70, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  badgeEstadoText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  detOverlay: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  detNombre: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 2 },
  detTipo: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  detRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detRatingNum: { fontSize: 15, fontWeight: '700', color: THEME.status.favorite, marginLeft: 4 },
  detReseñas: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  detBody: { padding: 20 },
  detInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20, backgroundColor: '#f9f9f9', borderRadius: 14, padding: 14 },
  detInfoItem: { alignItems: 'center', gap: 4, minWidth: 56 },
  detInfoLabel: { fontSize: 11, color: '#555', fontWeight: '600' },
  seccion: { marginBottom: 20 },
  secTitulo: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 8 },
  secTexto: { fontSize: 14, color: '#555', lineHeight: 22 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  contactText: { fontSize: 14, color: PREMIUM_ACCENT_DEEP, fontWeight: '500' },
  primaryButton: {
    backgroundColor: THEME.brand.primary,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.brand.primaryBorder,
    shadowColor: THEME.brand.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  primaryButtonText: {
    color: THEME.brand.onPrimary,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
