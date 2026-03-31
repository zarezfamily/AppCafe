const PID   = "miappdecafe";
const KEY   = "AIzaSyA1BcU0iRk3HyFtV92CLrnalHFKLaOWH24";
const TOKEN = "PEGA_AQUI_TU_TOKEN";
const BASE  = "https://europe-west1-firestore.googleapis.com/v1/projects/" + PID + "/databases/(default)/documents";

const headers = {
  "Content-Type": "application/json",
  "Authorization": "Bearer " + TOKEN,
};

function toVal(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string")  return { stringValue: val };
  if (typeof val === "number")  return { integerValue: String(val) };
  if (typeof val === "boolean") return { booleanValue: val };
  return { stringValue: String(val) };
}

function toFields(obj) {
  const fields = {};
  for (const k in obj) fields[k] = toVal(obj[k]);
  return { fields };
}

const sleep = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };

const cafes = [
  { nombre: "Geisha Hacienda La Esmeralda", pais: "Panama", region: "Boquete", finca: "Hacienda La Esmeralda", productor: "Familia Price", altura: 1600, variedad: "Geisha", proceso: "Lavado", secado: "Camas africanas", tueste: "Claro", fechaTueste: "2026-03-20", notas: "Jazmin extremo, bergamota, lichi, melocoton perfumado, te blanco", acidez: "Delicada y unica", cuerpo: "Etereo y ligero", regusto: "Floral interminable", puntuacion: 5, sca: 97, votos: 612, certificaciones: "Best of Panama record historico", preparacion: "V60 o Chemex exclusivamente", precio: 80, foto: "", uid: "seed", fecha: new Date().toISOString() },
  { nombre: "Yemen Haraazi Heirloom", pais: "Yemen", region: "Haraz, Al Mahwit", finca: "Terrazas ancestrales de Haraz", productor: "Comunidad Haraazi", altura: 2200, variedad: "Heirloom yemeni ancestral", proceso: "Natural tradicional", secado: "Al sol en terrazas de piedra", tueste: "Medio", fechaTueste: "2026-03-15", notas: "Higo, datil, cardamomo, tabaco suave, especias orientales", acidez: "Muy baja y vinosa", cuerpo: "Denso y complejo", regusto: "Especiado ancestral muy largo", puntuacion: 5, sca: 91, votos: 445, certificaciones: "Patrimonio cafetero de la humanidad", preparacion: "Cafe arabe, prensa francesa, moka", precio: 38, foto: "", uid: "seed", fecha: new Date(Date.now() - 3600000).toISOString() },
  { nombre: "Colombia El Vergel Geisha Anaerobico", pais: "Colombia", region: "Huila, El Agrado", finca: "Finca El Vergel", productor: "Shady y Camila Barreras", altura: 1850, variedad: "Geisha", proceso: "Anaerobico natural 96 horas", secado: "Camas africanas", tueste: "Claro", fechaTueste: "2026-03-19", notas: "Pitaya, lichi, flores exoticas, vino blanco, fruta de la pasion", acidez: "Exotica y muy compleja", cuerpo: "Ligero y etereo", regusto: "Floral frutal infinito", puntuacion: 5, sca: 95, votos: 567, certificaciones: "World Coffee Championships proceso premiado", preparacion: "V60 exclusivamente a 91C", precio: 65, foto: "", uid: "seed", fecha: new Date(Date.now() - 7200000).toISOString() },
  { nombre: "Jamaica Blue Mountain Grade 1 Wallenford", pais: "Jamaica", region: "Blue Mountains, Saint Andrew", finca: "Wallenford Estate", productor: "Wallenford Coffee Company", altura: 1500, variedad: "Typica jamaicana", proceso: "Lavado", secado: "Mecanico controlado en barril", tueste: "Medio", fechaTueste: "2026-03-17", notas: "Nuez de macadamia, chocolate suave, hierbas alpinas, caramelo", acidez: "Suave y muy equilibrada", cuerpo: "Medio y sedoso", regusto: "Limpio, dulce y prolongado", puntuacion: 5, sca: 90, votos: 523, certificaciones: "Jamaica Blue Mountain Certified", preparacion: "Filtro, V60, prensa francesa", precio: 55, foto: "", uid: "seed", fecha: new Date(Date.now() - 10800000).toISOString() },
  { nombre: "Kona Extra Fancy Greenwell", pais: "Estados Unidos", region: "Hawaii, Costa Kona", finca: "Greenwell Farms", productor: "Familia Greenwell", altura: 600, variedad: "Kona Typica", proceso: "Lavado", secado: "Mecanico", tueste: "Medio", fechaTueste: "2026-03-18", notas: "Macadamia, miel de flores, citrico suave, vainilla", acidez: "Suave y equilibrada", cuerpo: "Medio y redondo", regusto: "Dulce y prolongado", puntuacion: 5, sca: 89, votos: 489, certificaciones: "100% Kona Certified", preparacion: "Filtro, V60, prensa francesa", precio: 48, foto: "", uid: "seed", fecha: new Date(Date.now() - 14400000).toISOString() },
];

async function main() {
  if (TOKEN === "PEGA_AQUI_TU_TOKEN") {
    console.log("Primero pega tu token en la variable TOKEN del script.");
    return;
  }
  console.log("Subiendo " + cafes.length + " cafes...");
  let ok = 0;
  for (let i = 0; i < cafes.length; i++) {
    const cafe = cafes[i];
    const res = await fetch(BASE + "/cafes", { method: "POST", headers: headers, body: JSON.stringify(toFields(cafe)) });
    if (res.ok) { ok++; console.log("OK: " + cafe.nombre); }
    else { const e = await res.text(); console.log("ERROR: " + cafe.nombre + ": " + e.substring(0, 80)); }
    await sleep(400);
  }
  console.log("Completado: " + ok + "/" + cafes.length);
}

main();
