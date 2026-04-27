#!/usr/bin/env node
/**
 * _update_club_del_gourmet.js
 * Updates Club del Gourmet coffee catalog from ECI website data (April 2026).
 *
 * Actions:
 * 1. Add new products: molido Kenya, molido Brasil, descaf grano Colombia, descaf molido Colombia
 * 2. Update existing products: prices, names, URLs
 * 3. Upload photos for all products without them (using known CDN URLs)
 */

const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

// ─── Known CDN photo URLs for grano products ───
const GRANO_PHOTOS = {
  kenya:
    'https://cdn.grupoelcorteingles.es/SGFM/dctm/MEDIA03/202005/26/00113322101265____9__1200x1200.jpg',
  etiopia:
    'https://cdn.grupoelcorteingles.es/SGFM/dctm/MEDIA03/202005/26/00113322101257____9__1200x1200.jpg',
  guatemala:
    'https://cdn.grupoelcorteingles.es/SGFM/dctm/MEDIA03/202005/26/00113322101240____9__1200x1200.jpg',
  brasil:
    'https://cdn.grupoelcorteingles.es/SGFM/dctm/MEDIA03/202005/26/00113322101273____9__1200x1200.jpg',
  colombia:
    'https://dam.elcorteingles.es/producto/www-001013322101281-00.jpg?height=1200&impolicy=Resize&width=1200',
};

// ─── All 12 Club del Gourmet products from ECI website ───
const PRODUCTS = [
  // GRANO - already in DB, just update prices/URLs
  {
    existingId:
      'club-del-gourmet-cafe-en-grano-tueste-natural-100-arabica-origen-kenya-club-del-gourmet',
    nombre: 'Café en grano tueste natural 100% Arábica origen Kenya Club del Gourmet',
    tipo: 'grano',
    pais: 'Kenia',
    paisCode: 'KE',
    precio: 12.9,
    peso: 250,
    fuenteUrl:
      'https://www.elcorteingles.es/club-del-gourmet/A32650435-cafe-en-grano-tueste-natural-100-arabica-origen-kenya-club-del-gourmet/',
    photoKey: 'kenya',
    ean: '8433329102889',
    notas:
      'Notas florales, toffee, canela y chocolate; se identifican notas de pimienta, acidez alta y agradable, buen dulzor y cuerpo meloso.',
    region: 'Bungoma',
    altura: 1700,
    variedad: 'SL 28, SL 34, K7, Ruiri 11',
    proceso: 'Lavado',
  },
  {
    existingId:
      'club-del-gourmet-cafe-en-grano-tueste-natural-100-arabica-origen-etiopia-club-del-gourmet',
    nombre: 'Café en grano tueste natural 100% Arábica origen Etiopía Club del Gourmet',
    tipo: 'grano',
    pais: 'Etiopía',
    paisCode: 'ET',
    precio: 11.5,
    peso: 250,
    fuenteUrl:
      'https://www.elcorteingles.es/club-del-gourmet/A32650170-cafe-en-grano-tueste-natural-100-arabica-origen-etiopia-club-del-gourmet/',
    photoKey: 'etiopia',
    ean: '8433329102896',
    notas:
      'Predominan las notas cítricas (bergamota) y uva blanca, caramelo, cedro, pimienta, balsámico, vainilla y cítricos claros; en boca, notas de papaya y uva.',
    region: 'Guji',
    altura: 2300,
    variedad: 'Variedad autóctona etíope',
    proceso: 'Lavado',
  },
  {
    existingId:
      'club-del-gourmet-cafe-en-grano-tueste-natural-100-arabica-origen-guatemala-club-del-gourmet',
    nombre: 'Café en grano tueste natural 100% Arábica origen Guatemala Club del Gourmet',
    tipo: 'grano',
    pais: 'Guatemala',
    paisCode: 'GT',
    precio: 10.5,
    peso: 250,
    fuenteUrl:
      'https://www.elcorteingles.es/club-del-gourmet/A32650031-cafe-en-grano-tueste-natural-100-arabica-origen-guatemala-club-del-gourmet/',
    photoKey: 'guatemala',
    ean: '8433329102872',
    notas:
      'Notas enzimáticas con fresa, ciruela pasa, azúcar caramelizado, chocolate, avellana y aroma a cacao.',
    region: 'Huehuetenango',
    altura: 1950,
    variedad: 'Caturra, Pache y Bourbon',
    proceso: 'Lavado',
  },
  {
    existingId:
      'club-del-gourmet-cafe-en-grano-tueste-natural-100-arabica-origen-brasil-club-del-gourmet',
    nombre: 'Café en grano tueste natural 100% Arábica origen Brasil Club del Gourmet',
    tipo: 'grano',
    pais: 'Brasil',
    paisCode: 'BR',
    precio: 10.5,
    peso: 250,
    fuenteUrl:
      'https://www.elcorteingles.es/club-del-gourmet/A32650686-cafe-en-grano-tueste-natural-100-arabica-origen-brasil-club-del-gourmet/',
    photoKey: 'brasil',
    ean: '8433329102902',
    notas:
      'Notas de miel y flor, muy dulce con ligeras notas lácticas; en boca es cremoso, con acidez media y buen cuerpo.',
    region: 'Cerrado Mineiro',
    altura: 1200,
    variedad: 'Mundo Novo, Catuaí',
    proceso: 'Natural',
  },
  {
    existingId:
      'club-del-gourmet-cafe-en-grano-tueste-natural-100-arabica-origen-colombia-club-del-gourmet',
    nombre: 'Café en grano tueste natural 100% Arábica origen Colombia Club del Gourmet',
    tipo: 'grano',
    pais: 'Colombia',
    paisCode: 'CO',
    precio: 8.9,
    peso: 250,
    fuenteUrl:
      'https://www.elcorteingles.es/club-del-gourmet/A32650902-cafe-en-grano-tueste-natural-100-arabica-origen-colombia-club-del-gourmet/',
    photoKey: 'colombia',
    ean: '8433329102919',
    notas:
      'Sabor dulce y fragancia aromática, con notas a chocolate y excelente equilibrio entre cuerpo y acidez.',
    region: 'Cauca',
    altura: 1800,
    variedad: 'Colombia y Castillo',
    proceso: 'Lavado',
  },
  // MOLIDO - 3 existing (colombia, etiopia, guatemala) + 2 new (kenya, brasil)
  {
    existingId: 'eci_cdg_molido_colombia_250',
    nombre: 'Café molido tueste natural 100% Arábica origen Colombia Club del Gourmet',
    tipo: 'molido',
    pais: 'Colombia',
    paisCode: 'CO',
    precio: 8.9,
    peso: 250,
    fuenteUrl:
      'https://www.elcorteingles.es/club-del-gourmet/A38905542-cafe-molido-tueste-natural-100-arabica-origen-colombia-club-del-gourmet/',
    photoKey: 'colombia',
    notas:
      'Sabor dulce y fragancia aromática, con notas a chocolate y excelente equilibrio entre cuerpo y acidez.',
    region: 'Cauca',
    altura: 1800,
    variedad: 'Colombia y Castillo',
    proceso: 'Lavado',
  },
  {
    existingId: 'eci_cdg_molido_etiopia_250',
    nombre: 'Café molido tueste natural 100% Arábica origen Etiopía Club del Gourmet',
    tipo: 'molido',
    pais: 'Etiopía',
    paisCode: 'ET',
    precio: 11.5,
    peso: 250,
    fuenteUrl:
      'https://www.elcorteingles.es/club-del-gourmet/A38905764-cafe-molido-tueste-natural-100-arabica-origen-etiopia-club-del-gourmet/',
    photoKey: 'etiopia',
    notas:
      'Predominan las notas cítricas (bergamota) y uva blanca, caramelo, cedro, pimienta, balsámico, vainilla y cítricos claros; en boca, notas de papaya y uva.',
    region: 'Guji',
    altura: 2300,
    variedad: 'Variedad autóctona etíope',
    proceso: 'Lavado',
  },
  {
    existingId: 'eci_cdg_molido_guatemala_250',
    nombre: 'Café molido tueste natural 100% Arábica origen Guatemala Club del Gourmet',
    tipo: 'molido',
    pais: 'Guatemala',
    paisCode: 'GT',
    precio: 10.5,
    peso: 250,
    fuenteUrl:
      'https://www.elcorteingles.es/club-del-gourmet/A38904828-cafe-molido-tueste-natural-100-arabica-origen-guatemala-club-del-gourmet/',
    photoKey: 'guatemala',
    notas:
      'Notas enzimáticas con fresa, ciruela pasa, azúcar caramelizado, chocolate, avellana y aroma a cacao.',
    region: 'Huehuetenango',
    altura: 1950,
    variedad: 'Caturra, Pache y Bourbon',
    proceso: 'Lavado',
  },
  {
    newId: 'cdg_molido_kenya_250',
    nombre: 'Café molido tueste natural 100% Arábica origen Kenya Club del Gourmet',
    tipo: 'molido',
    pais: 'Kenia',
    paisCode: 'KE',
    precio: 12.9,
    peso: 250,
    fuenteUrl:
      'https://www.elcorteingles.es/club-del-gourmet/A38904875-cafe-molido-tueste-natural-100-arabica-origen-kenya-club-del-gourmet/',
    photoKey: 'kenya',
    notas:
      'Notas florales, toffee, canela y chocolate; se identifican notas de pimienta, acidez alta y agradable, buen dulzor y cuerpo meloso.',
    region: 'Bungoma',
    altura: 1700,
    variedad: 'SL 28, SL 34, K7, Ruiri 11',
    proceso: 'Lavado',
  },
  {
    newId: 'cdg_molido_brasil_250',
    nombre: 'Café molido tueste natural 100% Arábica origen Brasil Club del Gourmet',
    tipo: 'molido',
    pais: 'Brasil',
    paisCode: 'BR',
    precio: 10.5,
    peso: 250,
    fuenteUrl:
      'https://www.elcorteingles.es/club-del-gourmet/A38905529-cafe-molido-tueste-natural-100-arabica-origen-brasil-club-del-gourmet/',
    photoKey: 'brasil',
    notas:
      'Notas de miel y flor, muy dulce con ligeras notas lácticas; en boca es cremoso, con acidez media y buen cuerpo.',
    region: 'Cerrado Mineiro',
    altura: 1200,
    variedad: 'Mundo Novo, Catuaí',
    proceso: 'Natural',
  },
  // DESCAFEINADO - update existing eci_cdg_descafeinado_250 → grano Colombia + add new molido
  {
    existingId: 'eci_cdg_descafeinado_250',
    nombre:
      'Café descafeinado en grano tueste natural 100% Arábica origen Colombia Club del Gourmet',
    tipo: 'grano',
    pais: 'Colombia',
    paisCode: 'CO',
    precio: 8.9,
    peso: 250,
    descafeinado: true,
    fuenteUrl:
      'https://www.elcorteingles.es/club-del-gourmet/A32651349-cafe-descafeinado-en-grano-tueste-natural-100-arabica-origen-colombia-club-del-gourmet/',
    photoKey: 'colombia',
    notas: 'Suave, cuerpo ligero, equilibrado. Descafeinado 100% Arábica de Colombia.',
    region: 'Cauca',
    variedad: 'Colombia y Castillo',
    proceso: 'Lavado',
  },
  {
    newId: 'cdg_descaf_molido_colombia_250',
    nombre: 'Café descafeinado molido tueste natural 100% Arábica origen Colombia Club del Gourmet',
    tipo: 'molido',
    pais: 'Colombia',
    paisCode: 'CO',
    precio: 8.9,
    peso: 250,
    descafeinado: true,
    fuenteUrl:
      'https://www.elcorteingles.es/club-del-gourmet/A38905679-cafe-descafeinado-molido-tueste-natural-100-arabica-origen-colombia-club-del-gourmet/',
    photoKey: 'colombia',
    notas: 'Suave, cuerpo ligero, equilibrado. Descafeinado molido 100% Arábica de Colombia.',
    region: 'Cauca',
    variedad: 'Colombia y Castillo',
    proceso: 'Lavado',
  },
];

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    const get = (u) =>
      https
        .get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
            return get(res.headers.location);
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        })
        .on('error', reject);
    get(url);
  });
}

async function uploadPhoto(docId, imageUrl) {
  const buf = await fetchBuf(imageUrl);
  if (buf.length < 500) {
    console.log(`  SKIP photo too small: ${docId} (${buf.length} bytes)`);
    return null;
  }
  const out = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(out, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

function photoFields(url) {
  return {
    fotoUrl: url,
    foto: url,
    imageUrl: url,
    officialPhoto: url,
    bestPhoto: url,
    imagenUrl: url,
    photos: { selected: url, original: url, bgRemoved: url },
  };
}

(async () => {
  let created = 0,
    updated = 0,
    photoCount = 0;

  for (const p of PRODUCTS) {
    const docId = p.existingId || p.newId;
    const isNew = !!p.newId;
    const action = isNew ? 'CREATE' : 'UPDATE';
    console.log(`\n${action}: ${docId}`);
    console.log(`  ${p.nombre} | ${p.tipo} | ${p.precio}€`);

    // Build doc data
    const data = {
      nombre: p.nombre,
      marca: 'Club del Gourmet',
      roaster: 'Club del Gourmet',
      tipo: p.tipo === 'grano' ? 'grano' : 'molido',
      tipoProducto: p.tipo === 'grano' ? 'cafe_en_grano' : 'cafe_molido',
      formato: '250 g',
      tamano: '250 g',
      peso: p.peso,
      pais: p.pais,
      paisCode: p.paisCode,
      precio: p.precio,
      arabica: 100,
      tueste: 'Tueste natural',
      coffeeCategory: 'specialty',
      fuente: 'Club del Gourmet (El Corte Inglés)',
      fuentePais: 'ES',
      fuenteUrl: p.fuenteUrl,
      notas: p.notas,
      notasCata: p.notas,
      updatedAt: new Date().toISOString(),
    };

    if (p.ean) data.ean = p.ean;
    if (p.region) data.region = p.region;
    if (p.altura) data.altura = p.altura;
    if (p.variedad) data.variedad = p.variedad;
    if (p.proceso) data.proceso = p.proceso;
    if (p.descafeinado) data.descafeinado = true;

    if (isNew) {
      data.fecha = new Date().toISOString();
      data.puntuacion = 0;
      data.votos = 0;
      data.status = 'approved';
      data.reviewStatus = 'approved';
      data.appVisible = true;
    }

    // Check if needs photo
    let needsPhoto = isNew;
    if (!isNew) {
      const doc = await db.collection('cafes').doc(docId).get();
      if (doc.exists) {
        const d = doc.data();
        needsPhoto = !d.fotoUrl || d.fotoUrl === '' || d.fotoUrl === 'NONE';
      }
    }

    // Upload photo if needed
    if (needsPhoto && p.photoKey && GRANO_PHOTOS[p.photoKey]) {
      try {
        console.log(`  Uploading photo (${p.photoKey})...`);
        const photoUrl = await uploadPhoto(docId, GRANO_PHOTOS[p.photoKey]);
        if (photoUrl) {
          Object.assign(data, photoFields(photoUrl));
          console.log(`  Photo OK: ${photoUrl}`);
          photoCount++;
        }
      } catch (e) {
        console.log(`  Photo ERROR: ${e.message}`);
      }
    } else if (!needsPhoto) {
      console.log('  Photo already exists, skipping');
    }

    // Write to Firestore
    if (isNew) {
      await db.collection('cafes').doc(docId).set(data);
      created++;
      console.log(`  CREATED: ${docId}`);
    } else {
      await db.collection('cafes').doc(docId).update(data);
      updated++;
      console.log(`  UPDATED: ${docId}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Done! Created: ${created}, Updated: ${updated}, Photos: ${photoCount}`);
  console.log('='.repeat(60));
  process.exit(0);
})();
