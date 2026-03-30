const PID   = 'miappdecafe';
const KEY   = 'AIzaSyA1BcU0iRk3HyFtV92CLrnalHFKLaOWH24';
const TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjM3MzAwNzY5YTA3ZTA1MTE2ZjdlNTEzOGZhOTA5MzY4NWVlYmMyNDAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vbWlhcHBkZWNhZmUiLCJhdWQiOiJtaWFwcGRlY2FmZSIsImF1dGhfdGltZSI6MTc3NDkwODQ1OSwidXNlcl9pZCI6ImtHOVV4MWcydllkVDBuSENLR0N4NXlaRVh5SDIiLCJzdWIiOiJrRzlVeDFnMnZZZFQwbkhDS0dDeDV5WkVYeUgyIiwiaWF0IjoxNzc0OTA4NDU5LCJleHAiOjE3NzQ5MTIwNTksImVtYWlsIjoiaXZhbmNhYmV6YUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiaXZhbmNhYmV6YUBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ.Tc6icrlX5iiXrESSKy7jfODIHxp3pEB_hkAAgQOYt33TF_KUpBvCuA4T0tGl8amz7qslZImONR5epOb5TTAyUK45YOwz2t3mJctNDBdaQzdLliMRNsarzF3X34we8OzSkrg9kW4CcaZq6IIOjeAGUKqCNq6OFNKdAB2z-GBbTbYkMm_cp6g7WUw8gjy_b-cO7KA1WwXgCxd2JU9DfnYqCH_uPCB1EKMQJsv9nivgD6BgcrRCK7vSfY7-VqoNdtsRt-qjxIYI5tE127GrbvQqvZki-Ct1mKLifrjbJvsT55gBv45od0a4Nub0z6Q9qLctuNjUrRM0JFQqpcPr2BzKcg';
const BASE  = `https://europe-west1-firestore.googleapis.com/v1/projects/${PID}/databases/(default)/documents`;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

const toFirestoreValue = (val) => {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string')  return { stringValue: val };
  if (typeof val === 'number')  return { integerValue: String(val) };
  if (typeof val === 'boolean') return { booleanValue: val };
  return { stringValue: String(val) };
};

const toFields = (obj) => {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) fields[key] = toFirestoreValue(val);
  return { fields };
};

const cafes = [
  { nombre: "Yirgacheffe Kochere G1", pais: "Etiopía", region: "Yirgacheffe", finca: "Washing Station Kochere", altura: 2050, variedad: "Heirloom", proceso: "Lavado", tueste: "Claro", notas: "Jazmín, bergamota, limón Meyer", acidez: "Brillante", cuerpo: "Ligero", puntuacion: 5, sca: 92, votos: 487, foto: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400", uid: "seed", fecha: new Date().toISOString() },
  { nombre: "Kenya AA Nyeri Kiangoi", pais: "Kenia", region: "Nyeri", finca: "Fábrica Kiangoi", altura: 1780, variedad: "SL28, SL34", proceso: "Lavado", tueste: "Claro", notas: "Grosella negra, tomate maduro, bergamota", acidez: "Muy brillante", cuerpo: "Denso", puntuacion: 5, sca: 92, votos: 512, foto: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400", uid: "seed", fecha: new Date().toISOString() },
  { nombre: "Huila Pink Bourbon Washed", pais: "Colombia", region: "Huila", finca: "La Palma y El Tucán", altura: 1850, variedad: "Pink Bourbon", proceso: "Lavado", tueste: "Claro", notas: "Melocotón, rosa, mandarina", acidez: "Delicada", cuerpo: "Sedoso", puntuacion: 5, sca: 92, votos: 467, foto: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400", uid: "seed", fecha: new Date().toISOString() },
  { nombre: "Geisha Elida Estate Washed", pais: "Panamá", region: "Boquete", finca: "Elida Estate", altura: 2100, variedad: "Geisha", proceso: "Lavado", tueste: "Claro", notas: "Jazmín, bergamota, té blanco, lichi", acidez: "Brillante", cuerpo: "Ligero", puntuacion: 5, sca: 96, votos: 578, foto: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400", uid: "seed", fecha: new Date().toISOString() },
  { nombre: "El Injerto Pacamara", pais: "Guatemala", region: "Huehuetenango", finca: "Finca El Injerto", altura: 1700, variedad: "Pacamara", proceso: "Lavado", tueste: "Claro", notas: "Durazno, jazmín, chocolate negro", acidez: "Brillante", cuerpo: "Cremoso", puntuacion: 5, sca: 93, votos: 489, foto: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400", uid: "seed", fecha: new Date().toISOString() },
  { nombre: "Tarrazú Black Honey Dota", pais: "Costa Rica", region: "Tarrazú", finca: "Micro-mill Dota", altura: 1800, variedad: "Caturra", proceso: "Black Honey", tueste: "Claro", notas: "Cereza negra, chocolate, ron", acidez: "Frutal", cuerpo: "Denso", puntuacion: 5, sca: 91, votos: 456, foto: "https://images.unsplash.com/photo-1504630083234-14187a9df0f5?w=400", uid: "seed", fecha: new Date().toISOString() },
  { nombre: "Jamaica Blue Mountain Grade 1", pais: "Jamaica", region: "Blue Mountains", finca: "Wallenford Estate", altura: 1500, variedad: "Typica", proceso: "Lavado", tueste: "Medio", notas: "Nuez, chocolate suave, hierbas", acidez: "Suave", cuerpo: "Sedoso", puntuacion: 5, sca: 90, votos: 523, foto: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400", uid: "seed", fecha: new Date().toISOString() },
  { nombre: "Yemen Mocha Mattari", pais: "Yemen", region: "Bani Matar", finca: "Fincas Mattari", altura: 2000, variedad: "Heirloom yemení", proceso: "Natural", tueste: "Medio", notas: "Chocolate negro, especias orientales, vino", acidez: "Baja y vinosa", cuerpo: "Denso", puntuacion: 5, sca: 90, votos: 456, foto: "https://images.unsplash.com/photo-1521302200778-33500795e128?w=400", uid: "seed", fecha: new Date().toISOString() },
  { nombre: "Cerrado Mineiro FAF Natural", pais: "Brasil", region: "Cerrado Mineiro", finca: "Fazenda Ambiental Fortaleza", altura: 1050, variedad: "Yellow Catuaí", proceso: "Natural", tueste: "Medio", notas: "Fresa, chocolate con leche, vainilla", acidez: "Baja", cuerpo: "Cremoso", puntuacion: 5, sca: 89, votos: 412, foto: "https://images.unsplash.com/photo-1542181961-9590d0c79dab?w=400", uid: "seed", fecha: new Date().toISOString() },
  { nombre: "Rwanda Huye Mountain Washed", pais: "Ruanda", region: "Huye", finca: "Huye Mountain Coffee", altura: 1850, variedad: "Red Bourbon", proceso: "Lavado", tueste: "Claro", notas: "Frambuesa, hibisco, chocolate", acidez: "Viva", cuerpo: "Sedoso", puntuacion: 5, sca: 91, votos: 423, foto: "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400", uid: "seed", fecha: new Date().toISOString() },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('\n☕ Subiendo 10 cafés con token Auth...\n');
  let ok = 0;
  for (const cafe of cafes) {
    const res = await fetch(`${BASE}/cafes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(toFields(cafe)),
    });
    if (res.ok) {
      ok++;
      console.log(`✅ ${cafe.nombre}`);
    } else {
      const e = await res.text();
      console.log(`❌ ${cafe.nombre}: ${e.substring(0, 120)}`);
    }
    await sleep(300);
  }
  console.log(`\n🎉 ${ok}/10 cafés subidos.\n`);
}
main();