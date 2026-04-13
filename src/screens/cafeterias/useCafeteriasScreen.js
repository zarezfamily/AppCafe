import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { GOOGLE_PLACES_KEY } from '../../constants/theme';
import { fetchNearbyPlaces, isGooglePlacesConfigured } from '../../core/places';
import { mapPlacesToCafeterias } from './cafeteriasPlaceMapper';

export const RADIOS_DISPONIBLES = [2, 5, 10];

const GOOGLE_PLACES_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.regularOpeningHours,places.internationalPhoneNumber,places.websiteUri,places.photos,places.editorialSummary,places.types';

export default function useCafeteriasScreen() {
  const [cafeterias, setCafeterias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);
  const [radioKm, setRadioKm] = useState(5);
  const [soloAbiertas, setSoloAbiertas] = useState(false);

  useEffect(() => {
    cargarCafeterias(radioKm);
  }, [radioKm]);

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
        fieldMask: GOOGLE_PLACES_FIELD_MASK,
      });

      const result = mapPlacesToCafeterias({
        places,
        lat,
        lon,
        apiKey: GOOGLE_PLACES_KEY,
      });

      setCafeterias(result);
      if (result.length === 0) {
        setError('No encontramos cafeterías cerca. Prueba en otra zona.');
      }
    } catch (loadError) {
      const message = String(loadError?.message || '');
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

  const cafeteriasVisibles = useMemo(
    () => (soloAbiertas ? cafeterias.filter((cafeteria) => cafeteria.abierto === true) : cafeterias),
    [cafeterias, soloAbiertas]
  );

  return {
    abrirMaps,
    cafeterias,
    cafeteriasVisibles,
    cargarCafeterias,
    cargando,
    error,
    radioKm,
    seleccionada,
    setRadioKm,
    setSeleccionada,
    soloAbiertas,
    setSoloAbiertas,
  };
}
