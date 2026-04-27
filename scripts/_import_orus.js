#!/usr/bin/env node
/**
 * Import/Update Cafés Orús — Full catalog from cafesorus.es
 * 39 products: 10 grano + 15 molido + 3 soluble + 4 Nespresso + 4 Dolce Gusto + 3 hostelería grano
 * Deletes 5 old docs with messy IDs, creates all fresh.
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod
      .get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const loc = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, url).href;
            return fetchBuf(loc).then(resolve, reject);
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }
      )
      .on('error', reject);
  });
}

async function processAndUpload(docId, imgUrl) {
  const buf = await fetchBuf(imgUrl);
  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(processed, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

const T = 'https://cafesorus.es/tienda/wp-content/uploads';
const W = 'https://cafesorus.es/wp-content/uploads';

const products = [
  // ============ GRANO — ORÍGENES (250g) ============
  {
    id: 'orus_grano_brasil',
    nombre: 'Café en Grano Origen Brasil 250g',
    formato: 'beans',
    peso: '250g',
    precio: 6.14,
    origen: 'Brasil',
    img: `${T}/2023/08/Brasil_en-grano.png`,
    notas: 'Café en grano origen Brasil. Colección Orígenes',
  },

  {
    id: 'orus_grano_colombia',
    nombre: 'Café en Grano Origen Colombia 250g',
    formato: 'beans',
    peso: '250g',
    precio: 6.78,
    origen: 'Colombia',
    img: `${T}/2023/08/Grano-Colombia.png`,
    notas: 'Café en grano origen Colombia. Colección Orígenes',
  },

  {
    id: 'orus_grano_colombia_narino',
    nombre: 'Café en Grano Colombia Nariño El Tambo 250g',
    formato: 'beans',
    peso: '250g',
    precio: 6.5,
    origen: 'Colombia',
    region: 'Nariño',
    img: `${T}/2023/08/grano-colombia-narino.png`,
    notas: 'Café en grano origen Colombia Nariño El Tambo. Colección Orígenes',
  },

  {
    id: 'orus_grano_etiopia',
    nombre: 'Café en Grano Etiopía Sidamo 250g',
    formato: 'beans',
    peso: '250g',
    precio: 8.35,
    origen: 'Etiopía',
    region: 'Sidamo',
    img: `${T}/2023/08/Etiopia-Sidamo-copia-1.png`,
    notas: 'Café en grano origen Etiopía Sidamo. Colección Orígenes',
  },

  {
    id: 'orus_grano_kenia',
    nombre: 'Café en Grano Kenia 250g',
    formato: 'beans',
    peso: '250g',
    precio: 9.34,
    origen: 'Kenia',
    img: `${T}/2023/08/Grano_Kenia.png`,
    notas: 'Café en grano origen Kenia. Colección Orígenes',
  },

  {
    id: 'orus_grano_nicaragua',
    nombre: 'Café en Grano Nicaragua 250g',
    formato: 'beans',
    peso: '250g',
    precio: 6.78,
    origen: 'Nicaragua',
    img: `${T}/2023/08/grano-Nicaragua.png`,
    notas: 'Café en grano origen Nicaragua. Colección Orígenes',
  },

  {
    id: 'orus_grano_tanzania',
    nombre: 'Café en Grano Tanzania 250g',
    formato: 'beans',
    peso: '250g',
    precio: 9.34,
    origen: 'Tanzania',
    img: `${T}/2023/08/Tanzania.png`,
    notas: 'Café en grano origen Tanzania. Colección Orígenes',
  },

  {
    id: 'orus_grano_zambia',
    nombre: 'Café en Grano Zambia AAA 250g',
    formato: 'beans',
    peso: '250g',
    precio: 7.35,
    origen: 'Zambia',
    img: `${T}/2023/08/granoZambia.png`,
    notas: 'Café en grano origen Zambia AAA. Colección Orígenes',
  },

  // ============ GRANO — BLENDS (500g) ============
  {
    id: 'orus_grano_cosecha_1902',
    nombre: 'Café en Grano Cosecha 1902 500g',
    formato: 'beans',
    peso: '500g',
    precio: 15.77,
    img: `${T}/2024/07/Cosecha-1902-1024x1024.png`,
    notas: 'Café en grano Cosecha 1902. Blend premium',
    variedad: 'Blend',
  },

  {
    id: 'orus_grano_descafeinado',
    nombre: 'Café en Grano Descafeinado Natural 500g',
    formato: 'beans',
    peso: '500g',
    precio: 16.63,
    decaf: true,
    img: `${T}/2024/07/Descafeinado500GR.png`,
    notas: 'Café en grano descafeinado natural. Cafeína extraída por procesos naturales',
  },

  // ============ GRANO — HOSTELERÍA exclusivos (sin precio retail) ============
  {
    id: 'orus_grano_mezcla_seleccion',
    nombre: 'Café en Grano Mezcla Selección (Hostelería)',
    formato: 'beans',
    peso: '1kg',
    img: `${W}/seleccion.png`,
    tueste: 'mezcla',
    notas: 'Café mezcla selección para hostelería. Sabor suave y delicado aroma. Canal profesional',
  },

  {
    id: 'orus_grano_expresso_intensso',
    nombre: 'Café en Grano Expresso Intensso (Hostelería)',
    formato: 'beans',
    peso: '1kg',
    variedad: '100% Arábica',
    img: `${W}/EXPRESS.png`,
    notas:
      'Café expresso intenso 100% Arábica para hostelería. Sabor profundo con cuerpo y aromas definidos. Canal profesional',
  },

  {
    id: 'orus_grano_crema',
    nombre: 'Café en Grano Crema (Hostelería)',
    formato: 'beans',
    peso: '1kg',
    img: `${W}/grANO-CREMA.png`,
    notas:
      'Café en grano Crema para hostelería. Blends seleccionados con sabor inconfundible. Canal profesional',
  },

  // ============ MOLIDO — CLÁSICOS ============
  {
    id: 'orus_molido_natural',
    nombre: 'Café Molido Natural 250g',
    formato: 'ground',
    peso: '250g',
    precio: 4.35,
    img: `${T}/2016/11/cafe-molido-natural.png`,
    notas: 'Café molido natural. Sabor suave y delicado aroma',
  },

  {
    id: 'orus_molido_gourmet',
    nombre: 'Café Molido Gourmet 250g',
    formato: 'ground',
    peso: '250g',
    precio: 4.35,
    tueste: 'mezcla',
    img: `${T}/2016/11/cafe-molido-gourmet.png`,
    notas: 'Café molido gourmet mezcla. Arábicas de Centroamérica, natural y torrefacto',
  },

  {
    id: 'orus_molido_express',
    nombre: 'Café Molido Express 250g',
    formato: 'ground',
    peso: '250g',
    precio: 4.35,
    tueste: 'mezcla',
    img: `${T}/2021/04/cafe-molido-express-1.png`,
    notas: 'Café molido express mezcla 50/50 natural y torrefacto. Cuerpo e intenso aroma',
  },

  {
    id: 'orus_molido_descaf_natural',
    nombre: 'Café Molido Descafeinado Natural 250g',
    formato: 'ground',
    peso: '250g',
    precio: 4.35,
    decaf: true,
    img: `${T}/2016/11/Descafeinado-Molido-Cafes-Orus.png`,
    notas: 'Café molido descafeinado natural. Cafeína extraída por procesos naturales',
  },

  {
    id: 'orus_molido_descaf_mezcla',
    nombre: 'Café Molido Descafeinado Mezcla 250g',
    formato: 'ground',
    peso: '250g',
    precio: 4.35,
    decaf: true,
    tueste: 'mezcla',
    img: `${T}/2023/08/Descafeinado-mezcla.png`,
    notas:
      'Café molido descafeinado mezcla natural y torrefacto. Cafeína extraída por procesos naturales',
  },

  {
    id: 'orus_molido_ecologico',
    nombre: 'Café Molido Ecológico 250g',
    formato: 'ground',
    peso: '250g',
    precio: 5.67,
    isBio: true,
    img: `${T}/2018/05/ecologico2.png`,
    notas: 'Café molido ecológico. Cultivo orgánico certificado',
  },

  {
    id: 'orus_molido_agora',
    nombre: 'Café Molido Ágora Puro Arábica 250g',
    formato: 'ground',
    peso: '250g',
    precio: 6.29,
    variedad: '100% Arábica',
    img: `${T}/2016/11/ARABICA-1024x1024.png`,
    notas: 'Café molido Ágora 100% Puro Arábica. Especialidad premium. Suave y equilibrado',
  },

  // ============ MOLIDO — ORÍGENES (250g) ============
  {
    id: 'orus_molido_brasil',
    nombre: 'Café Molido Origen Brasil 250g',
    formato: 'ground',
    peso: '250g',
    precio: 4.35,
    origen: 'Brasil',
    img: `${T}/2023/08/molido-brasil.png`,
    notas: 'Café molido origen Brasil. Colección Orígenes',
  },

  {
    id: 'orus_molido_colombia',
    nombre: 'Café Molido Origen Colombia 250g',
    formato: 'ground',
    peso: '250g',
    precio: 6.78,
    origen: 'Colombia',
    img: `${T}/2023/08/molido-colombia.png`,
    notas: 'Café molido origen Colombia. Colección Orígenes',
  },

  {
    id: 'orus_molido_colombia_narino',
    nombre: 'Café Molido Colombia Nariño El Tambo 250g',
    formato: 'ground',
    peso: '250g',
    precio: 6.5,
    origen: 'Colombia',
    region: 'Nariño',
    img: `${T}/2023/08/molido-colombianarino.png`,
    notas: 'Café molido origen Colombia Nariño El Tambo. Colección Orígenes',
  },

  {
    id: 'orus_molido_etiopia',
    nombre: 'Café Molido Etiopía Sidamo 250g',
    formato: 'ground',
    peso: '250g',
    precio: 8.35,
    origen: 'Etiopía',
    region: 'Sidamo',
    img: `${T}/2023/08/molido_etiopia.png`,
    notas: 'Café molido origen Etiopía Sidamo. Colección Orígenes',
  },

  {
    id: 'orus_molido_kenia',
    nombre: 'Café Molido Kenia 250g',
    formato: 'ground',
    peso: '250g',
    precio: 9.34,
    origen: 'Kenia',
    img: `${T}/2023/08/Grano_Kenia.png`,
    notas: 'Café molido origen Kenia. Colección Orígenes',
  },

  {
    id: 'orus_molido_nicaragua',
    nombre: 'Café Molido Nicaragua 250g',
    formato: 'ground',
    peso: '250g',
    precio: 6.78,
    origen: 'Nicaragua',
    img: `${T}/2023/08/grano-Nicaragua.png`,
    notas: 'Café molido origen Nicaragua. Colección Orígenes',
  },

  {
    id: 'orus_molido_tanzania',
    nombre: 'Café Molido Tanzania 250g',
    formato: 'ground',
    peso: '250g',
    precio: 9.34,
    origen: 'Tanzania',
    img: `${T}/2023/08/molido-tanzania.png`,
    notas: 'Café molido origen Tanzania. Colección Orígenes',
  },

  {
    id: 'orus_molido_zambia',
    nombre: 'Café Molido Zambia AAA 250g',
    formato: 'ground',
    peso: '250g',
    precio: 7.35,
    origen: 'Zambia',
    img: `${T}/2023/08/molido-zambia.png`,
    notas: 'Café molido origen Zambia AAA. Colección Orígenes',
  },

  // ============ SOLUBLE ============
  {
    id: 'orus_soluble_natural',
    nombre: 'Café Soluble Natural (frasco)',
    formato: 'soluble',
    peso: '100g',
    precio: 7.43,
    img: `${T}/2017/01/cafe-soluble-natural.png`,
    notas: 'Café soluble natural en frasco. Crema, aroma y sabor',
  },

  {
    id: 'orus_soluble_descafeinado',
    nombre: 'Café Soluble Descafeinado (frasco)',
    formato: 'soluble',
    peso: '100g',
    precio: 8.1,
    decaf: true,
    img: `${T}/2017/01/cafe-soluble-descafeinado.png`,
    notas: 'Café soluble descafeinado en frasco. Cafeína extraída por procesos naturales',
  },

  {
    id: 'orus_soluble_descaf_100_sobres',
    nombre: 'Café Soluble Descafeinado 100 sobres',
    formato: 'soluble',
    peso: '100 sobres',
    precio: 14.41,
    decaf: true,
    img: `${T}/2025/02/Descafeinado-Soluble-1024x1024.png`,
    notas: 'Café soluble descafeinado en 100 sobres individuales',
  },

  // ============ CÁPSULAS NESPRESSO (10 cáps) ============
  {
    id: 'orus_caps_natural',
    nombre: 'Cápsulas Nespresso Natural 10 uds',
    formato: 'capsules',
    peso: '10 cápsulas',
    precio: 4.02,
    compatibleCon: 'Nespresso',
    img: `${T}/2016/11/compatible-nespresso-natural.png`,
    notas: 'Cápsulas de aluminio compatibles Nespresso. Tueste natural',
  },

  {
    id: 'orus_caps_arabica',
    nombre: 'Cápsulas Nespresso Puro Arábica 10 uds',
    formato: 'capsules',
    peso: '10 cápsulas',
    precio: 4.1,
    compatibleCon: 'Nespresso',
    variedad: '100% Arábica',
    img: `${T}/2016/11/compatible-nespresso-arabica.png`,
    notas: 'Cápsulas de aluminio compatibles Nespresso. 100% Puro Arábica',
  },

  {
    id: 'orus_caps_colombia',
    nombre: 'Cápsulas Nespresso Colombia 10 uds',
    formato: 'capsules',
    peso: '10 cápsulas',
    precio: 4.1,
    compatibleCon: 'Nespresso',
    origen: 'Colombia',
    img: `${T}/2016/11/compatible-nespresso-origen.png`,
    notas: 'Cápsulas de aluminio compatibles Nespresso. 100% Café de Colombia certificado',
  },

  {
    id: 'orus_caps_descafeinado',
    nombre: 'Cápsulas Nespresso Descafeinado 10 uds',
    formato: 'capsules',
    peso: '10 cápsulas',
    precio: 4.38,
    compatibleCon: 'Nespresso',
    decaf: true,
    img: `${T}/2016/11/compatible-nespresso-descafeinado.png`,
    notas: 'Cápsulas de aluminio compatibles Nespresso. Descafeinado',
  },

  // ============ CÁPSULAS DOLCE GUSTO (16 cáps) ============
  {
    id: 'orus_dg_cafe_con_leche',
    nombre: 'Cápsulas Dolce Gusto Café con Leche 16 uds',
    formato: 'capsules',
    peso: '16 cápsulas',
    precio: 5.04,
    compatibleCon: 'Dolce Gusto',
    img: `${T}/2016/11/Cafe-con-Leche-e1672241031846.png`,
    notas: 'Cápsulas compatibles Dolce Gusto. Café con leche',
  },

  {
    id: 'orus_dg_cortado',
    nombre: 'Cápsulas Dolce Gusto Cortado 16 uds',
    formato: 'capsules',
    peso: '16 cápsulas',
    precio: 4.55,
    compatibleCon: 'Dolce Gusto',
    img: `${T}/2016/11/Cortado-e1672240882182.png`,
    notas: 'Cápsulas compatibles Dolce Gusto. Café cortado',
  },

  {
    id: 'orus_dg_descafeinado',
    nombre: 'Cápsulas Dolce Gusto Descafeinado 16 uds',
    formato: 'capsules',
    peso: '16 cápsulas',
    precio: 4.77,
    compatibleCon: 'Dolce Gusto',
    decaf: true,
    img: `${T}/2016/11/34_Caja-16-c%C3%A1psulas-Descafeinado_3d-copia-1-e1672241570508.png`,
    notas: 'Cápsulas compatibles Dolce Gusto. Espresso descafeinado',
  },

  {
    id: 'orus_dg_espresso',
    nombre: 'Cápsulas Dolce Gusto Solo Espresso 16 uds',
    formato: 'capsules',
    peso: '16 cápsulas',
    precio: 4.64,
    compatibleCon: 'Dolce Gusto',
    img: `${T}/2016/11/33_Caja-16-c%C3%A1psulas-Espresso_3d-copia-1-e1672241413167.png`,
    notas: 'Cápsulas compatibles Dolce Gusto. Solo espresso',
  },
];

const baseData = {
  marca: 'Cafés Orús',
  pais: 'España',
  origen: '',
  variedad: 'Blend',
  tueste: 'natural',
  tipo: 'natural',
  coffeeCategory: 'commercial',
  category: 'commercial',
  fuente: 'cafesorus.es',
  fuentePais: 'ES',
  isBio: false,
  decaf: false,
  notas: '',
  fecha: new Date().toISOString(),
  puntuacion: 0,
  votos: 0,
  status: 'approved',
  reviewStatus: 'approved',
  appVisible: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function main() {
  const DRY = process.argv.includes('--dry-run');
  console.log(
    `=== Cafés Orús Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) =>
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${p.id} ← ${p.nombre} [${p.formato}] ${p.precio || 'N/A'}€`
      )
    );
    return;
  }

  // Delete ALL existing Orús docs (both brand name variants)
  let delCount = 0;
  for (const marca of ['Cafes Orus', 'Cafés Orús']) {
    const snap = await db.collection('cafes').where('marca', '==', marca).get();
    for (const d of snap.docs) {
      await d.ref.delete();
      try {
        await bucket.file(`${PREFIX}/${d.id}.png`).delete();
      } catch {}
      delCount++;
    }
  }
  console.log(`  Deleted ${delCount} old docs\n`);

  let ok = 0,
    noImg = 0;
  for (const p of products) {
    try {
      let photoUrl = '';
      if (p.img) {
        try {
          photoUrl = await processAndUpload(p.id, p.img);
        } catch (e) {
          console.log(`\n  WARN img ${p.id}: ${e.message}`);
          noImg++;
        }
      }

      const photoFields = photoUrl
        ? {
            fotoUrl: photoUrl,
            foto: photoUrl,
            imageUrl: photoUrl,
            officialPhoto: photoUrl,
            bestPhoto: photoUrl,
            imagenUrl: photoUrl,
            photos: { selected: photoUrl, original: photoUrl, bgRemoved: photoUrl },
          }
        : {};

      const doc = {
        ...baseData,
        nombre: p.nombre,
        formato: p.formato,
        peso: p.peso,
        ...(p.precio ? { precio: p.precio } : {}),
        ...(p.origen ? { origen: p.origen } : {}),
        ...(p.region ? { region: p.region } : {}),
        ...(p.variedad ? { variedad: p.variedad } : {}),
        ...(p.notas ? { notas: p.notas } : {}),
        ...(p.decaf ? { decaf: true, tipo: 'descafeinado' } : {}),
        ...(p.isBio ? { isBio: true } : {}),
        ...(p.tueste ? { tueste: p.tueste } : {}),
        ...(p.compatibleCon ? { compatibleCon: p.compatibleCon } : {}),
        ...photoFields,
      };
      await db.collection('cafes').doc(p.id).set(doc);
      ok++;
      process.stdout.write(`\r  Created ${ok}/${products.length}`);
    } catch (e) {
      console.log(`\n  ERROR ${p.id}: ${e.message}`);
    }
  }
  console.log(
    `\n\n=== Done: deleted ${delCount} old, created ${ok} new (${noImg} without photo) ===`
  );
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
