import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useState } from 'react';

import { loadCollectionOfflineCache, saveCollectionOfflineCache } from '../core/offlineCache';
import { buildPlacesPhotoUrl, calcDistanceMeters, fetchNearbyPlaces, isGooglePlacesConfigured } from '../core/places';
import { normalize } from '../core/utils';

export default function useCoffeeData({
  user,
  perfil,
  favs,
  setFavs,
  setCafeDetalle,
  registrarEventoGamificacion,
  busquedaMis,
  busquedaTop,
  googlePlacesKey,
  offersCacheTtlMs,
  keyFavs,
  getUserCafes,
  getCollection,
  deleteDocument,
  openDialog,
}) {
  const [misCafes, setMisCafes] = useState([]);
  const [topCafes, setTopCafes] = useState([]);
  const [allCafes, setAllCafes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCargaDatos, setErrorCargaDatos] = useState(null);
  const [cafeteriasInicio, setCafeteriasInicio] = useState([]);
  const [cargandoCafInicio, setCargandoCafInicio] = useState(false);
  const [errorCafInicio, setErrorCafInicio] = useState(null);

  const cargarDatos = async () => {
    if (!user?.uid) return;
    setCargando(true);
    setErrorCargaDatos(null);
    const cached = await loadCollectionOfflineCache(user.uid);
    if (cached) {
      setMisCafes(Array.isArray(cached.misCafes) ? cached.misCafes : []);
      setTopCafes(Array.isArray(cached.topCafes) ? cached.topCafes : []);
      setAllCafes(Array.isArray(cached.allCafes) ? cached.allCafes : []);
    }
    try {
      const cafes = await getUserCafes(user.uid);
      const ranking = await getCollection('cafes', 'puntuacion', 100);
      const todos = await getCollection('cafes', 'fecha', 100);
      const cafesPorFecha = [...cafes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setMisCafes(cafesPorFecha);
      setTopCafes(ranking);
      setAllCafes(todos);
      await saveCollectionOfflineCache(user.uid, {
        misCafes: cafesPorFecha,
        topCafes: ranking,
        allCafes: todos,
      });
    } catch (error) {
      const message = String(error?.message || error || '');
      console.log('[CoffeeData] Error cargar datos:', message);
      if (message.includes('NETWORK_UNAVAILABLE')) {
        setErrorCargaDatos(cached ? 'Sin conexión. Mostrando datos guardados.' : 'Sin conexión. No se pudieron cargar tus datos.');
      } else {
        setErrorCargaDatos(cached ? 'No pudimos refrescar los datos. Mostrando la última copia guardada.' : 'No se pudieron cargar tus datos.');
      }
    } finally {
      setCargando(false);
    }
  };

  const cargarCafeteriasInicio = async () => {
    if (!user?.uid) {
      setCafeteriasInicio([]);
      setErrorCafInicio(null);
      setCargandoCafInicio(false);
      return;
    }

    setCargandoCafInicio(true);
    setErrorCafInicio(null);
    try {
      if (!isGooglePlacesConfigured(googlePlacesKey)) {
        setErrorCafInicio('Configura una Google Places API key valida para activar cafeterias cercanas.');
        setCafeteriasInicio([]);
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setErrorCafInicio('Activa los servicios de ubicación para ver cafeterías cercanas.');
        setCafeteriasInicio([]);
        return;
      }

      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== 'granted') {
        setErrorCafInicio('Activa la ubicación para ver cafeterías cercanas.');
        setCafeteriasInicio([]);
        return;
      }

      const lastKnownLocation = await Location.getLastKnownPositionAsync();
      let loc = lastKnownLocation;

      try {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      } catch (positionError) {
        if (!lastKnownLocation) throw positionError;
      }

      if (!loc?.coords) {
        throw new Error('LOCATION_UNAVAILABLE');
      }

      const { latitude: lat, longitude: lon } = loc.coords;

      const places = await fetchNearbyPlaces({
        apiKey: googlePlacesKey,
        lat,
        lon,
        maxResultCount: 12,
        radiusMeters: 5000,
        rankPreference: 'DISTANCE',
        fieldMask: 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.photos,places.types',
      });

      const mapped = places.map((p) => {
        const geo = p.location || {};
        const dist = calcDistanceMeters(lat, lon, geo.latitude || lat, geo.longitude || lon);
        return {
          id: p.id,
          nombre: (p.displayName && p.displayName.text) || 'Cafetería',
          rating: Number(p.rating || 0).toFixed(1),
          numResenas: p.userRatingCount || 0,
          distancia: dist,
          abierto: (p.currentOpeningHours && p.currentOpeningHours.openNow !== undefined) ? p.currentOpeningHours.openNow : null,
          foto: (p.photos && p.photos[0] && p.photos[0].name)
            ? buildPlacesPhotoUrl(p.photos[0].name, googlePlacesKey)
            : null,
        };
      });

      setCafeteriasInicio(mapped);
      if (mapped.length === 0) setErrorCafInicio('No encontramos cafeterías cerca ahora mismo.');
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.includes('GOOGLE_PLACES_KEY_NOT_CONFIGURED')) {
        setErrorCafInicio('Configura una Google Places API key valida para activar cafeterias cercanas.');
      } else if (msg.includes('GOOGLE_PLACES_API_ERROR')) {
        setErrorCafInicio('Google Places no esta disponible: revisa API key, permisos y facturacion.');
      } else {
        setErrorCafInicio('No se pudieron cargar cafeterías cercanas.');
      }
      setCafeteriasInicio([]);
    } finally {
      setCargandoCafInicio(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setCafeteriasInicio([]);
      setErrorCafInicio(null);
      setCargandoCafInicio(false);
      return;
    }

    const timer = setTimeout(() => {
      cargarCafeteriasInicio();
    }, 300);

    return () => clearTimeout(timer);
  }, [user?.uid]);

  const toggleFav = async (cafe) => {
    const wasFav = favs.includes(cafe.id);
    const nf = wasFav ? favs.filter((f) => f !== cafe.id) : [...favs, cafe.id];
    setFavs(nf);
    await SecureStore.setItemAsync(keyFavs, JSON.stringify(nf)).catch(() => {});
    if (!wasFav) {
      registrarEventoGamificacion('favorite_mark', { cafe });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const eliminarCafe = (item) => {
    openDialog?.('Eliminar', `¿Eliminar "${item.nombre}"?`, [
      { label: 'Cancelar' },
      {
        label: 'Eliminar',
        variant: 'danger',
        onPress: async () => {
          try {
            await deleteDocument('cafes', item.id);
            setCafeDetalle(null);
            cargarDatos();
          } catch {
            openDialog?.('Error', 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  const filtrar = (lista, query) => {
    if (!query.trim()) return lista;
    const q = normalize(query);
    return lista.filter((c) => (
      normalize(c.nombre).includes(q)
      || normalize(c.pais).includes(q)
      || normalize(c.region).includes(q)
      || normalize(c.origen).includes(q)
      || normalize(c.variedad).includes(q)
      || normalize(c.proceso).includes(q)
      || normalize(c.notas).includes(q)
    )).slice(0, 50);
  };

  const favCafes = useMemo(() => allCafes.filter((c) => favs.includes(c.id)), [allCafes, favs]);
  const cafesFiltrados = useMemo(() => filtrar(misCafes, busquedaMis), [misCafes, busquedaMis]);
  const topFiltrados = useMemo(() => filtrar(topCafes, busquedaTop), [topCafes, busquedaTop]);
  const topCafesPais = useMemo(() => topCafes.filter((c) => normalize(c.pais) === normalize(perfil.pais || 'España')), [topCafes, perfil.pais]);
  const topCafesVista = topCafesPais.length > 0 ? topCafesPais : topCafes;
  const ultimosGlobal = allCafes.slice(0, 10);
  const ultimos100 = allCafes.slice(0, 100);
  const top100 = topCafesVista.slice(0, 100);
  const cafesParaOfertas = allCafes.slice(0, 30);

  return {
    misCafes,
    topCafes,
    allCafes,
    cargando,
    errorCargaDatos,
    setCargando,
    cafeteriasInicio,
    cargandoCafInicio,
    errorCafInicio,
    cargarDatos,
    cargarCafeteriasInicio,
    toggleFav,
    eliminarCafe,
    filtrar,
    favCafes,
    cafesFiltrados,
    topFiltrados,
    topCafesVista,
    ultimosGlobal,
    ultimos100,
    top100,
    cafesParaOfertas,
  };
}
