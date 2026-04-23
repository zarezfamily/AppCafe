import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchNearbyPlaces, isGooglePlacesConfigured } from '../core/places';
import { mapPlacesToCafeterias } from '../screens/cafeterias/cafeteriasPlaceMapper';

import { loadCollectionOfflineCache, saveCollectionOfflineCache } from '../core/offlineCache';
import { enqueueAction } from '../core/syncQueue';
import { filterCoffeeList, selectTopCoffeesForCountry } from '../domain/coffee/coffeeFilters';

export default function useCoffeeData({ ...props }) {
  const {
    user,
    perfil,
    favs,
    setFavs,
    setCafeDetalle,
    registrarEventoGamificacion,
    busquedaMis,
    busquedaTop,
    googlePlacesKey,
    keyFavs,
    getUserCafes,
    getCollection,
    deleteDocument,
    openDialog,
  } = props;

  const [misCafes, setMisCafes] = useState([]);
  const [topCafes, setTopCafes] = useState([]);
  const [allCafes, setAllCafes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCargaDatos, setErrorCargaDatos] = useState(null);

  const [cafeteriasInicio, setCafeteriasInicio] = useState([]);
  const [cargandoCafInicio, setCargandoCafInicio] = useState(false);
  const [errorCafInicio, setErrorCafInicio] = useState(null);

  // 🔥 CARGA DATOS (igual pero mejoramos luego)
  const cargarDatos = async () => {
    if (!user?.uid) return;

    setCargando(true);
    setErrorCargaDatos(null);

    const cached = await loadCollectionOfflineCache(user.uid);
    if (cached) {
      setMisCafes(cached.misCafes || []);
      setTopCafes(cached.topCafes || []);
      setAllCafes(cached.allCafes || []);
    }

    try {
      const cafes = await getUserCafes(user.uid);
      const ranking = await getCollection('cafes', 'puntuacion', 1500);
      const todos = await getCollection('cafes', 'fecha', 1500);

      const cafesOrdenados = [...cafes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      setMisCafes(cafesOrdenados);
      setTopCafes(ranking);
      setAllCafes(todos);

      await saveCollectionOfflineCache(user.uid, {
        misCafes: cafesOrdenados,
        topCafes: ranking,
        allCafes: todos,
      });
    } catch (e) {
      setErrorCargaDatos('Error cargando datos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [user?.uid]);

  // ================================
  // 🔥 MEJORAS CLAVE
  // ================================

  // ✅ ÚLTIMOS CAFÉS REALES
  const ultimosGlobal = useMemo(() => {
    return [...allCafes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 10);
  }, [allCafes]);

  const ultimos100 = useMemo(() => {
    return [...allCafes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 100);
  }, [allCafes]);

  // ✅ TOP POR PAÍS
  const topCafesVista = useMemo(() => {
    return selectTopCoffeesForCountry(topCafes, perfil.pais);
  }, [topCafes, perfil.pais]);

  const top100 = topCafesVista.slice(0, 100);

  // 🔥 NUEVO: TRENDING CAFÉS (MUY IMPORTANTE)
  const trendingCafes = useMemo(() => {
    return [...allCafes]
      .map((c) => {
        const score = Number(c.puntuacion || 0);
        const votos = Number(c.votos || 0);

        // fórmula simple pero potente
        const trendingScore = score * Math.log10(votos + 1);

        return { ...c, trendingScore };
      })
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 10);
  }, [allCafes]);

  // 🔥 FAVORITOS
  const favCafes = useMemo(() => {
    const byId = new Map([...allCafes, ...misCafes].map((c) => [c.id, c]));
    return favs.map((id) => byId.get(id)).filter(Boolean);
  }, [allCafes, misCafes, favs]);

  // 🔥 FILTROS
  const filtrar = (lista, query) => filterCoffeeList(lista, query);

  const cafesFiltrados = useMemo(() => filtrar(misCafes, busquedaMis), [misCafes, busquedaMis]);

  const topFiltrados = useMemo(() => filtrar(topCafes, busquedaTop), [topCafes, busquedaTop]);

  // ================================
  // 🔥 FAVORITOS
  // ================================

  const toggleFav = async (cafe) => {
    const wasFav = favs.includes(cafe.id);
    const nf = wasFav ? favs.filter((f) => f !== cafe.id) : [...favs, cafe.id];

    // Always update local state immediately (optimistic)
    setFavs(nf);
    await SecureStore.setItemAsync(keyFavs, JSON.stringify(nf)).catch(() => {});

    if (!wasFav) {
      registrarEventoGamificacion('favorite_mark', { cafe });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    // Queue server-side fav sync if offline so it runs when connection is back
    const net = await NetInfo.fetch().catch(() => ({ isConnected: true }));
    if (!net.isConnected) {
      await enqueueAction('toggle_favorite', {
        uid: user?.uid,
        cafeId: cafe.id,
        value: !wasFav,
        allFavs: nf,
      });
    }
  };

  // ================================
  // 🔥 CAFETERÍAS CERCANAS (INICIO)
  // ================================

  const cargarCafeteriasInicio = useCallback(async () => {
    if (!isGooglePlacesConfigured(googlePlacesKey)) return;
    setCargandoCafInicio(true);
    setErrorCafInicio(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorCafInicio('Activa la ubicación para ver cafeterías cerca de ti');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lon } = loc.coords;
      const places = await fetchNearbyPlaces({
        apiKey: googlePlacesKey,
        lat,
        lon,
        maxResultCount: 8,
        radiusMeters: 3000,
        rankPreference: 'DISTANCE',
        fieldMask:
          'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.photos',
      });
      const result = mapPlacesToCafeterias({ places, lat, lon, apiKey: googlePlacesKey });
      setCafeteriasInicio(result);
    } catch (e) {
      setErrorCafInicio('No se pudieron cargar cafeterías cercanas');
    } finally {
      setCargandoCafInicio(false);
    }
  }, [googlePlacesKey]);

  useEffect(() => {
    if (user?.uid) cargarCafeteriasInicio();
  }, [user?.uid, cargarCafeteriasInicio]);

  // ================================
  // 🔥 DELETE
  // ================================

  const eliminarCafe = (item) => {
    openDialog?.('Eliminar', `¿Eliminar "${item.nombre}"?`, [
      { label: 'Cancelar' },
      {
        label: 'Eliminar',
        variant: 'danger',
        onPress: async () => {
          await deleteDocument('cafes', item.id);
          setCafeDetalle(null);
          cargarDatos();
        },
      },
    ]);
  };

  return {
    misCafes,
    topCafes,
    allCafes,
    cargando,
    errorCargaDatos,

    cafeteriasInicio,
    cargandoCafInicio,
    errorCafInicio,
    cargarCafeteriasInicio,

    cargarDatos,

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

    // 🔥 NUEVO
    trendingCafes,
  };
}
