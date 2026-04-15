export const isGooglePlacesConfigured = (apiKey) => {
  const key = String(apiKey || '').trim();
  if (!key) return false;
  if (key.includes('YOUR_') || key.includes('REPLACE_ME') || key.includes('<') || key.includes('>'))
    return false;
  return /^AIza[0-9A-Za-z_-]{20,}$/.test(key);
};

export const calcDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const buildPlacesPhotoUrl = (photoName, apiKey, maxWidthPx = 400) => {
  if (!photoName) return null;
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${apiKey}`;
};

export const fetchNearbyPlaces = async ({
  apiKey,
  lat,
  lon,
  maxResultCount = 20,
  radiusMeters = 5000,
  rankPreference = 'DISTANCE',
  fieldMask,
}) => {
  if (!isGooglePlacesConfigured(apiKey)) {
    throw new Error('GOOGLE_PLACES_KEY_NOT_CONFIGURED');
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify({
      includedTypes: ['cafe', 'coffee_shop'],
      maxResultCount,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lon },
          radius: radiusMeters,
        },
      },
      rankPreference,
    }),
  });

  const json = await res.json();
  if (!res.ok || json?.error) {
    const status = json?.error?.status || `HTTP_${res.status}`;
    const message = json?.error?.message || 'Google Places no disponible';
    throw new Error(`GOOGLE_PLACES_API_ERROR:${status}:${message}`);
  }

  return json?.places || [];
};
