import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GOOGLE_PLACES_KEY, H, PREMIUM_ACCENT, PREMIUM_ACCENT_DEEP, THEME } from '../constants/theme';
import { buildPlacesPhotoUrl, calcDistanceMeters, fetchNearbyPlaces, isGooglePlacesConfigured } from '../core/places';

export default function CafeteriasScreen() {
  const [cafeterias, setCafeterias]     = useState([]);
  const [cargando, setCargando]         = useState(false);
  const [error, setError]               = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);

  useEffect(() => { cargarCafeterias(); }, []);

  const cargarCafeterias = async () => {
    setCargando(true); setError(null);
    try {
      if (!isGooglePlacesConfigured(GOOGLE_PLACES_KEY)) {
        setError('Configura una Google Places API key valida para habilitar cafeterias cercanas.');
        setCargando(false);
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setError('Activa la ubicacion para ver cafeterias cerca de ti'); setCargando(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lon } = loc.coords;

      const places = await fetchNearbyPlaces({
        apiKey: GOOGLE_PLACES_KEY,
        lat,
        lon,
        maxResultCount: 10,
        fieldMask: 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.regularOpeningHours,places.internationalPhoneNumber,places.websiteUri,places.photos,places.editorialSummary,places.types',
      });

      const result = places.map(function(p) {
        const geo  = p.location || {};
        const dist = calcDistanceMeters(lat, lon, geo.latitude || lat, geo.longitude || lon);
        const horarioTexto = (p.regularOpeningHours && p.regularOpeningHours.weekdayDescriptions)
          ? p.regularOpeningHours.weekdayDescriptions.join(', ')
          : null;
        const abierto = (p.currentOpeningHours && p.currentOpeningHours.openNow !== undefined)
          ? p.currentOpeningHours.openNow
          : null;
        const fotoUrl = (p.photos && p.photos[0] && p.photos[0].name)
          ? buildPlacesPhotoUrl(p.photos[0].name, GOOGLE_PLACES_KEY)
          : null;
        const fotosUrls = (p.photos || []).slice(0, 4).map(function(ph) {
          return buildPlacesPhotoUrl(ph.name, GOOGLE_PLACES_KEY);
        });
        return {
          id:          p.id,
          nombre:      (p.displayName && p.displayName.text) || 'Cafeteria',
          lat:         geo.latitude  || lat,
          lon:         geo.longitude || lon,
          distancia:   dist,
          direccion:   p.formattedAddress || null,
          telefono:    p.internationalPhoneNumber || null,
          web:         p.websiteUri || null,
          abierto:     abierto,
          horario:     horarioTexto,
          rating:      p.rating ? p.rating.toFixed(1) : '--',
          numResenas:  p.userRatingCount || 0,
          resenas:     [],
          descripcion: (p.editorialSummary && p.editorialSummary.text) || null,
          foto:        fotoUrl,
          fotos:       fotosUrls,
          wifi:        false,
          terraza:     false,
          takeaway:    (p.types || []).indexOf('meal_takeaway') !== -1,
        };
      }).sort(function(a, b) { return parseFloat(b.rating) - parseFloat(a.rating); });

      setCafeterias(result);
      if (result.length === 0) setError('No encontramos cafeterias cerca. Prueba en otra zona.');
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.includes('GOOGLE_PLACES_KEY_NOT_CONFIGURED')) {
        setError('Configura una Google Places API key valida para habilitar cafeterias cercanas.');
      } else if (msg.includes('GOOGLE_PLACES_API_ERROR')) {
        setError('Google Places no esta disponible: revisa permisos de API key y facturacion en Google Cloud.');
      } else {
        setError('Error al buscar cafeterias: ' + msg);
      }
    } finally {
      setCargando(false);
    }
  };

  const abrirMaps = (c) => {
    const url = Platform.OS === 'ios'
      ? `maps://maps.apple.com/?q=${encodeURIComponent(c.nombre)}&ll=${c.lat},${c.lon}`
      : `geo:${c.lat},${c.lon}?q=${encodeURIComponent(c.nombre)}`;
    Linking.openURL(url).catch(() => {});
  };

  if (cargando) return (
    <View style={caf.loadBox}>
      <Text style={caf.loadEmoji}>☕</Text>
      <ActivityIndicator color={PREMIUM_ACCENT} size="large" />
      <Text style={caf.loadTitle}>Buscando cafeterías</Text>
      <Text style={caf.loadSub}>Localizando las mejores cerca de ti...</Text>
    </View>
  );

  if (error && cafeterias.length === 0) return (
    <View style={caf.errorBox}>
      <Text style={{ fontSize: 48 }}>📍</Text>
      <Text style={caf.errorTitle}>Ups...</Text>
      <Text style={caf.errorText}>{error}</Text>
      <TouchableOpacity style={[shared.redBtn, { paddingHorizontal: 32 }]} onPress={cargarCafeterias}>
        <Text style={shared.redBtnText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {seleccionada && (
        <Modal visible animationType="slide" onRequestClose={() => setSeleccionada(null)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <StatusBar barStyle="dark-content" />
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={caf.detHero}>
                {seleccionada.foto
                  ? <Image source={{ uri: seleccionada.foto }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  : <View style={caf.detPlaceholder}><Text style={caf.detPlaceholderEmoji}>☕</Text></View>
                }
                <View style={caf.detHeroGrad} />
                <TouchableOpacity style={caf.detBack} onPress={() => setSeleccionada(null)}>
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={caf.detNavBtn} onPress={() => abrirMaps(seleccionada)}>
                  <Ionicons name="navigate" size={20} color="#fff" />
                </TouchableOpacity>
                {seleccionada.abierto !== null && (
                  <View style={[caf.badgeEstado, { backgroundColor: seleccionada.abierto ? THEME.status.success : THEME.status.danger }]}>
                    <Text style={caf.badgeEstadoText}>{seleccionada.abierto ? '🟢 Abierto ahora' : '🔴 Cerrado'}</Text>
                  </View>
                )}
                <View style={caf.detOverlay}>
                  <Text style={caf.detNombre}>{seleccionada.nombre}</Text>
                  <Text style={caf.detTipo}>{seleccionada.tipo}</Text>
                  <View style={caf.detRatingRow}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Ionicons key={n} name={n <= Math.round(seleccionada.rating) ? 'star' : 'star-outline'} size={14} color={THEME.status.favorite} />
                    ))}
                    <Text style={caf.detRatingNum}>{seleccionada.rating}</Text>
                    <Text style={caf.detReseñas}>({seleccionada.numResenas} reseñas)</Text>
                  </View>
                </View>
              </View>

              <View style={caf.detBody}>
                <View style={caf.detInfoRow}>
                  <View style={caf.detInfoItem}>
                    <Ionicons name="location" size={20} color={PREMIUM_ACCENT} />
                    <Text style={caf.detInfoLabel}>{seleccionada.distancia < 1000 ? `${seleccionada.distancia}m` : `${(seleccionada.distancia / 1000).toFixed(1)}km`}</Text>
                  </View>
                  {seleccionada.wifi     && <View style={caf.detInfoItem}><Ionicons name="wifi"        size={20} color={PREMIUM_ACCENT} /><Text style={caf.detInfoLabel}>WiFi</Text></View>}
                  {seleccionada.terraza  && <View style={caf.detInfoItem}><Ionicons name="sunny"       size={20} color={PREMIUM_ACCENT} /><Text style={caf.detInfoLabel}>Terraza</Text></View>}
                  {seleccionada.takeaway && <View style={caf.detInfoItem}><Ionicons name="bag-handle"  size={20} color={PREMIUM_ACCENT} /><Text style={caf.detInfoLabel}>Para llevar</Text></View>}
                  {seleccionada.vegano   && <View style={caf.detInfoItem}><Ionicons name="leaf"        size={20} color={THEME.status.success} /><Text style={[caf.detInfoLabel, { color: THEME.status.success }]}>Vegano</Text></View>}
                </View>

                <View style={caf.seccion}>
                  <Text style={caf.secTitulo}>☕ Especialidades</Text>
                  <Text style={caf.secTexto}>{seleccionada.especialidades}</Text>
                </View>

                {seleccionada.fotos && seleccionada.fotos.length > 1 && (
                  <View style={caf.seccion}>
                    <Text style={caf.secTitulo}>📸 Fotos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {seleccionada.fotos.map((f, i) => f && (
                        <Image key={i} source={{ uri: f }} style={{ width: 120, height: 90, borderRadius: 10, marginRight: 8 }} resizeMode="cover" />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {seleccionada.horario && (
                  <View style={caf.seccion}>
                    <Text style={caf.secTitulo}>🕐 Horario</Text>
                    <Text style={caf.secTexto}>{seleccionada.horario}</Text>
                  </View>
                )}

                {seleccionada.direccion && (
                  <View style={caf.seccion}>
                    <Text style={caf.secTitulo}>📍 Dirección</Text>
                    <Text style={caf.secTexto}>{seleccionada.direccion}{seleccionada.barrio ? `\n${seleccionada.barrio}` : ''}</Text>
                  </View>
                )}

                {(seleccionada.telefono || seleccionada.web) && (
                  <View style={caf.seccion}>
                    <Text style={caf.secTitulo}>📞 Contacto</Text>
                    {seleccionada.telefono && (
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${seleccionada.telefono}`)} style={caf.contactBtn}>
                        <Ionicons name="call-outline" size={16} color={PREMIUM_ACCENT} />
                        <Text style={caf.contactText}>{seleccionada.telefono}</Text>
                      </TouchableOpacity>
                    )}
                    {seleccionada.web && (
                      <TouchableOpacity onPress={() => Linking.openURL(seleccionada.web.startsWith('http') ? seleccionada.web : `https://${seleccionada.web}`)} style={caf.contactBtn}>
                        <Ionicons name="globe-outline" size={16} color={PREMIUM_ACCENT} />
                        <Text style={caf.contactText}>{seleccionada.web.replace('https://', '').replace('http://', '').split('/')[0]}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {seleccionada.resenas && seleccionada.resenas.length > 0 && (
                  <View style={caf.seccion}>
                    <Text style={caf.secTitulo}>💬 Opiniones de Google</Text>
                    {seleccionada.resenas.map((r, i) => (
                      <View key={i} style={caf.resena}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={caf.resenaAutor}>{r.autor}</Text>
                          <Text style={{ fontSize: 11, color: THEME.text.muted }}>{r.tiempo}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 2, marginBottom: 4 }}>
                          {[1, 2, 3, 4, 5].map(n => <Ionicons key={n} name={n <= r.nota ? 'star' : 'star-outline'} size={11} color={THEME.status.favorite} />)}
                        </View>
                        <Text style={caf.resenaTexto} numberOfLines={4}>{r.texto}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={[shared.redBtn, { marginTop: 8 }]} onPress={() => abrirMaps(seleccionada)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="navigate-outline" size={20} color="#fff" />
                    <Text style={shared.redBtnText}>Cómo llegar</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      <View style={caf.headerBox}>
        <View>
          <Text style={shared.pageTitle}>Cafeterías ☕</Text>
          <Text style={{ fontSize: 13, color: THEME.text.secondary }}>{cafeterias.length} cerca de ti · ordenadas por distancia</Text>
        </View>
        <TouchableOpacity onPress={cargarCafeterias} style={caf.refreshBtn}>
          <Ionicons name="refresh-outline" size={18} color={PREMIUM_ACCENT_DEEP} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={cafeterias}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={caf.card} onPress={() => setSeleccionada(item)} activeOpacity={0.88}>
            <View style={caf.cardImgWrap}>
              {item.foto
                ? <Image source={{ uri: item.foto }} style={caf.cardImg} resizeMode="cover" />
                : <View style={caf.cardPlaceholder}>
                    <Text style={caf.cardPlaceholderEmoji}>☕</Text>
                    <Text style={caf.cardPlaceholderNombre} numberOfLines={2}>{item.nombre}</Text>
                  </View>
              }
              <View style={caf.cardNum}><Text style={caf.cardNumText}>{index + 1}</Text></View>
              {item.abierto !== null && (
                <View style={[caf.cardEstado, { backgroundColor: item.abierto ? THEME.status.success : THEME.status.danger }]}>
                  <Text style={caf.cardEstadoText}>{item.abierto ? 'Abierto' : 'Cerrado'}</Text>
                </View>
              )}
            </View>
            <View style={caf.cardInfo}>
              <Text style={caf.cardNombre} numberOfLines={1}>{item.nombre}</Text>
              <Text style={caf.cardTipo}>{item.tipo}</Text>
              <View style={caf.cardRatingRow}>
                {[1, 2, 3, 4, 5].map(n => <Ionicons key={n} name={n <= Math.round(item.rating) ? 'star' : 'star-outline'} size={12} color={THEME.status.favorite} />)}
                <Text style={caf.cardRatingNum}>{item.rating}</Text>
                <Text style={caf.cardReseñas}>({item.numResenas})</Text>
              </View>
              <View style={caf.cardTags}>
                <View style={caf.cardTag}><Ionicons name="location-outline" size={11} color={PREMIUM_ACCENT} /><Text style={caf.cardTagText}>{item.distancia < 1000 ? `${item.distancia}m` : `${(item.distancia / 1000).toFixed(1)}km`}</Text></View>
                {item.wifi     && <View style={caf.cardTag}><Ionicons name="wifi-outline"       size={11} color={THEME.text.tertiary} /><Text style={caf.cardTagText}>WiFi</Text></View>}
                {item.terraza  && <View style={caf.cardTag}><Ionicons name="sunny-outline"      size={11} color={THEME.text.tertiary} /><Text style={caf.cardTagText}>Terraza</Text></View>}
                {item.takeaway && <View style={caf.cardTag}><Ionicons name="bag-handle-outline" size={11} color={THEME.text.tertiary} /><Text style={caf.cardTagText}>Para llevar</Text></View>}
              </View>
              <Text style={caf.cardEspec} numberOfLines={1}>{item.especialidades}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const caf = StyleSheet.create({
  loadBox:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  loadEmoji:       { fontSize: 48 },
  loadTitle:       { fontSize: 20, fontWeight: '700', color: '#111' },
  loadSub:         { fontSize: 14, color: THEME.text.secondary, textAlign: 'center' },
  errorBox:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  errorTitle:      { fontSize: 22, fontWeight: '700', color: '#111' },
  errorText:       { fontSize: 15, color: THEME.text.secondary, textAlign: 'center', lineHeight: 22 },
  headerBox:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  refreshBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f6ede3', alignItems: 'center', justifyContent: 'center' },
  card:            { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  cardImgWrap:     { position: 'relative', height: 140 },
  cardImg:         { width: '100%', height: '100%' },
  cardNum:         { position: 'absolute', top: 10, left: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  cardNumText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  cardEstado:      { position: 'absolute', top: 10, right: 10, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  cardEstadoText:  { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardInfo:        { padding: 12, gap: 4 },
  cardNombre:      { fontSize: 17, fontWeight: '800', color: '#111' },
  cardTipo:        { fontSize: 12, color: PREMIUM_ACCENT, fontWeight: '600', marginBottom: 2 },
  cardRatingRow:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardRatingNum:   { fontSize: 13, fontWeight: '700', color: '#333', marginLeft: 4 },
  cardReseñas:     { fontSize: 12, color: THEME.text.muted },
  cardTags:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  cardTag:         { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  cardTagText:     { fontSize: 11, color: '#555' },
  cardEspec:       { fontSize: 12, color: THEME.text.secondary, marginTop: 4, fontStyle: 'italic' },
  cardPlaceholder: { width: '100%', height: '100%', backgroundColor: '#1a0a00', alignItems: 'center', justifyContent: 'center', padding: 12 },
  cardPlaceholderEmoji:  { fontSize: 32, opacity: 0.5, marginBottom: 6 },
  cardPlaceholderNombre: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 18 },
  detHero:         { height: H * 0.38, position: 'relative' },
  detHeroGrad:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, backgroundColor: 'rgba(0,0,0,0.55)' },
  detPlaceholder:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1a0a00', alignItems: 'center', justifyContent: 'center' },
  detPlaceholderEmoji: { fontSize: 72, opacity: 0.4 },
  detBack:         { position: 'absolute', top: 52, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  detNavBtn:       { position: 'absolute', top: 52, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: PREMIUM_ACCENT_DEEP, alignItems: 'center', justifyContent: 'center' },
  badgeEstado:     { position: 'absolute', top: 52, left: 70, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  badgeEstadoText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  detOverlay:      { position: 'absolute', bottom: 16, left: 16, right: 16 },
  detNombre:       { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 2 },
  detTipo:         { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  detRatingRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detRatingNum:    { fontSize: 15, fontWeight: '700', color: THEME.status.favorite, marginLeft: 4 },
  detReseñas:      { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  detBody:         { padding: 20 },
  detInfoRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20, backgroundColor: '#f9f9f9', borderRadius: 14, padding: 14 },
  detInfoItem:     { alignItems: 'center', gap: 4, minWidth: 56 },
  detInfoLabel:    { fontSize: 11, color: '#555', fontWeight: '600' },
  seccion:         { marginBottom: 20 },
  secTitulo:       { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 8 },
  secTexto:        { fontSize: 14, color: '#555', lineHeight: 22 },
  contactBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  contactText:     { fontSize: 14, color: PREMIUM_ACCENT_DEEP, fontWeight: '500' },
  resena:          { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, marginBottom: 8 },
  resenaAutor:     { fontSize: 13, fontWeight: '700', color: '#111' },
  resenaTexto:     { fontSize: 13, color: '#555', marginTop: 4, lineHeight: 19 },
});
