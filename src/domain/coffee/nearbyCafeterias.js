import { buildPlacesPhotoUrl, calcDistanceMeters } from '../../core/places';

const formatPlaceType = (types = []) => {
  if (types.includes('coffee_shop') || types.includes('cafe')) return 'Coffee Shop';
  return 'Cafetería';
};

const formatPlaceCategories = (types = []) =>
  types
    .filter((type) => type !== 'point_of_interest' && type !== 'establishment')
    .slice(0, 4)
    .map((type) => type.replace(/_/g, ' '))
    .join(' · ');

export const mapPlacesToNearbyCafeterias = ({ places, lat, lon, apiKey }) =>
  (places || [])
    .map((place) => {
      const geo = place.location || {};
      const placeTypes = place.types || [];
      const distancia = calcDistanceMeters(lat, lon, geo.latitude || lat, geo.longitude || lon);
      const horarioTexto = place.regularOpeningHours?.weekdayDescriptions
        ? place.regularOpeningHours.weekdayDescriptions.join(', ')
        : null;
      const abierto = place.currentOpeningHours?.openNow ?? null;
      const descripcion = place.editorialSummary?.text || null;
      const fotoUrl = place.photos?.[0]?.name ? buildPlacesPhotoUrl(place.photos[0].name, apiKey) : null;
      const fotosUrls = (place.photos || [])
        .slice(0, 4)
        .map((photo) => buildPlacesPhotoUrl(photo.name, apiKey))
        .filter(Boolean);

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
        tipo: formatPlaceType(placeTypes),
        categorias: formatPlaceCategories(placeTypes),
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

export const mapPlacesToHomeNearbyCafeterias = ({ places, lat, lon, apiKey }) =>
  (places || []).map((place) => {
    const geo = place.location || {};
    const distancia = calcDistanceMeters(lat, lon, geo.latitude || lat, geo.longitude || lon);

    return {
      id: place.id,
      nombre: place.displayName?.text || 'Cafetería',
      rating: Number(place.rating || 0).toFixed(1),
      numResenas: place.userRatingCount || 0,
      distancia,
      abierto: place.currentOpeningHours?.openNow ?? null,
      foto: place.photos?.[0]?.name
        ? buildPlacesPhotoUrl(place.photos[0].name, apiKey)
        : null,
    };
  });
