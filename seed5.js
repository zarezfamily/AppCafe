const PID   = 'miappdecafe';
const KEY   = 'AIzaSyA1BcU0iRk3HyFtV92CLrnalHFKLaOWH24';
const BASE  = `https://europe-west1-firestore.googleapis.com/v1/projects/${PID}/databases/(default)/documents`;

const toFirestoreValue = (val) => {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string')  return { stringValue: val };
  if (typeof val === 'number')  return { integerValue: String(val) };
  if (typeof val === 'boolean') return { booleanValue: val };
  return { stringValue: String(val) };
};
const toFields = (obj) => {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return { fields };
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── NECESITAS PEGAR AQUÍ UN TOKEN FRESCO ────────────────────────────────────
// Loguéate en la app con los logs activos y copia el TOKEN COMPLETO
const TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjM3MzAwNzY5YTA3ZTA1MTE2ZjdlNTEzOGZhOTA5MzY4NWVlYmMyNDAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vbWlhcHBkZWNhZmUiLCJhdWQiOiJtaWFwcGRlY2FmZSIsImF1dGhfdGltZSI6MTc3NDk4OTM3MiwidXNlcl9pZCI6ImtHOVV4MWcydllkVDBuSENLR0N4NXlaRVh5SDIiLCJzdWIiOiJrRzlVeDFnMnZZZFQwbkhDS0dDeDV5WkVYeUgyIiwiaWF0IjoxNzc0OTg5MzcyLCJleHAiOjE3NzQ5OTI5NzIsImVtYWlsIjoiaXZhbmNhYmV6YUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiaXZhbmNhYmV6YUBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ.VgAhUVB_12LuMuw-aT1qmNF46RobaKaT5tblFa1du3VfbwtPbTlay-BH2qYmKqEkM2t2NeQDgrPCcTwkzYAWZxIWNG203aRQe4z2ZdfF_3I0YFKtymqLM4HW17yDHBuHci9WgbwoXflHyb7F_uOFnz78ucl-9igr2gEstPrONUnwm5JEoDAyFx7_Te7SAtF9szUlFd2InxGCskKhIXQxX9EHwpJCcAcUn6JcLPjKHgLxHT3hlI2P3jHC0EXB3eSev1lzegry9j2VLlT30JRdWp4yz28J4FW1qbOL_ssAI4MiS9Jcmcm1jG4GwXKrSrxlfZL4NRmVhcRPIrUs1N4asg';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

const cafes = [
  {
    nombre: "Geisha Hacienda La Esmeralda",
    pais: "Panamá", region: "Boquete, Chiriquí",
    finca: "Hacienda La Esmeralda", productor: "Familia Price",
    altura: 1600, variedad: "Geisha",
    proceso: "Lavado", secado: "Camas africanas",
    tueste: "Claro", fechaTueste: "2026-03-20",
    notas: "Jazmín extremo, bergamota, lichi, melocotón perfumado, té blanco",
    acidez: "Delicada y única", cuerpo: "Etéreo y ligero", regusto: "Floral interminable",
    puntuacion: 5, sca: 97, votos: 612,
    certificaciones: "Best of Panama — récord histórico de precio",
    preparacion: "V60 o Chemex exclusivamente",
    precio: 80.00, foto: '', uid: 'seed', fecha: new Date().toISOString(),
  },
  {
    nombre: "Bourbon Pointu La Réunion",
    pais: "Francia (Reunión)", region: "La Réunion, Hauts de l'île",
    finca: "Cafés Bourbon Pointu ARRC", productor: "Cooperativa ARRC",
    altura: 1200, variedad: "Bourbon Pointu (Laurina)",
    proceso: "Lavado", secado: "Mecánico controlado",
    tueste: "Claro", fechaTueste: "2026-03-18",
    notas: "Floral muy intenso, cítrico complejo, acidez única, notas de té",
    acidez: "Muy brillante y única en el mundo", cuerpo: "Ligero y sedoso", regusto: "Floral prolongado",
    puntuacion: 5, sca: 95, votos: 534,
    certificaciones: "Varietal casi extinto — Indicación Geográfica protegida",
    preparacion: "V60, Aeropress",
    precio: 70.00, foto: '', uid: 'seed', fecha: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    nombre: "Yemen Haraazi Heirloom",
    pais: "Yemen", region: "Haraz, Al Mahwit",
    finca: "Terrazas ancestrales de Haraz", productor: "Comunidad Haraazi",
    altura: 2200, variedad: "Heirloom yemení ancestral",
    proceso: "Natural tradicional", secado: "Al sol en terrazas de piedra",
    tueste: "Medio", fechaTueste: "2026-03-15",
    notas: "Higo, dátil, cardamomo, tabaco suave, especias orientales",
    acidez: "Muy baja y vinosa", cuerpo: "Denso y complejo", regusto: "Especiado ancestral muy largo",
    puntuacion: 5, sca: 91, votos: 445,
    certificaciones: "Patrimonio cafetero de la humanidad",
    preparacion: "Café árabe tradicional, prensa francesa, moka",
    precio: 38.00, foto: '', uid: 'seed', fecha: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    nombre: "Colombia El Vergel Geisha Anaeróbico",
    pais: "Colombia", region: "Huila, El Agrado",
    finca: "Finca El Vergel", productor: "Shady y Camila Barreras",
    altura: 1850, variedad: "Geisha",
    proceso: "Anaeróbico natural 96 horas", secado: "Camas africanas",
    tueste: "Claro", fechaTueste: "2026-03-19",
    notas: "Pitaya, lichi, flores exóticas, vino blanco, fruta de la pasión",
    acidez: "Exótica y muy compleja", cuerpo: "Ligero y etéreo", regusto: "Floral frutal infinito",
    puntuacion: 5, sca: 95, votos: 567,
    certificaciones: "World Coffee Championships — proceso premiado internacionalmente",
    preparacion: "V60 exclusivamente con agua filtrada a 91°C",
    precio: 65.00, foto: '', uid: 'seed', fecha: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    nombre: "Jamaica Blue Mountain Grade 1 Wallenford",
    pais: "Jamaica", region: "Blue Mountains, Saint Andrew",
    finca: "Wallenford Estate", productor: "Wallenford Coffee Company",
    altura: 1500, variedad: "Typica jamaicana",
    proceso: "Lavado", secado: "Mecánico controlado en barril de madera",
    tueste: "Medio", fechaTueste: "2026-03-17",
    notas: "Nuez de macadamia, chocolate suave, hierbas alpinas, caramelo, sin amargor",
    acidez: "Suave y muy equilibrada", cuerpo: "Medio y sedoso", regusto: "Limpio, dulce y prolongado",
    puntuacion: 5, sca: 90, votos: 523,
    certificaciones: "Jamaica Blue Mountain Certified — exportado en barril de madera tradicional",
    preparacion: "Filtro, V60, prensa francesa",
    precio: 55.00, foto: '', uid: 'seed', fecha: new Date(Date.now() - 14400000).toISOString(),
  },
];

async function main() {
  if (TOKEN === 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjM3MzAwNzY5YTA3ZTA1MTE2ZjdlNTEzOGZhOTA5MzY4NWVlYmMyNDAiLCJ0eXAiOiJKV1QifQ') {
    console.log('\n⚠️  Primero pega tu token en la variable TOKEN del script.\n');
    console.log('Para obtenerlo: loguéate en la app y copia el TOKEN COMPLETO de los logs.\n');
    return;
  }
  console.log(`\n☕ Subiendo ${cafes.length} cafés premium...\n`);
  let ok = 0;
  for (const cafe of cafes) {
    const res = await fetch(`${BASE}/cafes`, { method: 'POST', headers, body: JSON.stringify(toFields(cafe)) });
    if (res.ok) { ok++; console.log(`✅ ${cafe.nombre}`); }
    else { const e = await res.text(); console.log(`❌ ${cafe.nombre}: ${e.substring(0, 80)}`); }
    await sleep(400);
  }
  console.log(`\n🎉 ${ok}/${cafes.length} cafés subidos.\n`);
}
main();
