#!/usr/bin/env node
/**
 * _fix_dolce_gusto_photos.js
 * Re-downloads all 35 Dolce Gusto photos with proper browser headers
 * (the CDN blocks requests without Referer + sec-fetch headers)
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
const IMG_BASE =
  'https://www.dolce-gusto.es/media/catalog/product/cache/d22af66f75f51f60e100631e2c10a99a/';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9',
  Referer: 'https://www.dolce-gusto.es/',
  'sec-fetch-dest': 'image',
  'sec-fetch-mode': 'no-cors',
  'sec-fetch-site': 'same-origin',
};

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    const get = (u) =>
      https
        .get(u, { headers: HEADERS }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
            return get(res.headers.location);
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve({ buf: Buffer.concat(chunks), status: res.statusCode }));
          res.on('error', reject);
        })
        .on('error', reject);
    get(url);
  });
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

const items = [
  { d: 'mercadona_11931', i: 'bev0000015_16x_heroimage2026_1.png' },
  { d: 'mercadona_11869', i: 'bev0000016_16x_heroimage2026.png' },
  { d: 'mercadona_11801', i: 'bev0000060_16x_heroimage2026.png' },
  { d: 'mercadona_11785', i: 'bev0000064_16x_heroimage2026.png' },
  { d: 'mercadona_11918', i: 'bev0000010-16_mhi2026.jpg' },
  { d: 'dg_cafe_con_leche_intenso', i: 'bev0000062_16x_heroimage2026.png' },
  { d: 'dg_lungo', i: 'bev0000022-16.png' },
  { d: 'dg_ristretto_ardenza', i: 'bev0000020_16x_heroimage2026.png' },
  { d: 'dg_espresso', i: 'bev0000007_16x_hero_image.png' },
  { d: 'dg_latte_macchiato_caramel', i: 'bev0000056-16.png' },
  { d: 'dg_cafe_con_leche_descaf', i: 'bev0000061_16x_hero_image.png' },
  { d: 'dg_grande_intenso', i: '8445290448668_h_en_1702538884484_1.png' },
  { d: 'dg_cortado_descafeinado', i: 'bev0000065_16x_heroimage2026.png' },
  { d: 'dg_ristretto_bonka', i: '7613287300164_H__g-1_q-1_c-16_m-0.png' },
  { d: 'dg_cafe_con_leche_delicato', i: '7613037477481_H__g-1_q-1_c-16_m-0.png' },
  { d: 'dg_flat_white', i: 'bev0000050_16x_hero_image.png' },
  { d: 'dg_espresso_doppio', i: 'bev0000127_16x_heroimage2026.png' },
  { d: 'dg_mocha', i: 'bev0000044-16.png' },
  { d: 'dg_cappuccino', i: 'bev0000052_16x_hero_image.png' },
  { d: 'dg_americano_descaf', i: 'americano-descafeinado-single.png' },
  { d: 'dg_grande', i: 'bev0000003_16x_heroimage2026.png' },
  { d: 'dg_cortado_ginseng', i: 'cortado_ginseng_single.png' },
  { d: 'dg_lungo_descafeinado', i: 'bev0000023-16_heroimage_2026.png' },
  { d: 'dg_latte_macchiato', i: 'bev0000055_16x_hero_image_1.png' },
  { d: 'dg_cappuccino_light', i: 'bev0000053_16x_heroimage2026.png' },
  { d: 'dg_americano', i: 'bev0000001_16x_heroimage2026.png' },
  { d: 'dg_starbucks_espresso_roast', i: '7613036940498_H__g-1_q-1_c-12_m-0.png' },
  { d: 'dg_starbucks_caramel_macchiato', i: '7613037275704_h__g-1_q-1_c-6_m-6_2.png' },
  { d: 'dg_starbucks_house_blend', i: '7613036989268_h__g-1_q-1_c-12_m-0_1.png' },
  { d: 'dg_starbucks_cappuccino', i: '7613036927017_h__1_g-1_q-1_c-6_m-6.png' },
  { d: 'dg_starbucks_latte_macchiato', i: '7613036927031_h__g-1_q-1_c-6_m-6.png' },
  { d: 'dg_starbucks_caffe_latte', i: '7613039853153_h__g-1_q-1_c-12_m-0_1.png' },
  { d: 'dg_starbucks_espresso_colombia', i: 'colombia-espresso_1.png' },
  { d: 'dg_starbucks_vanilla_macchiato', i: 'bev0000126_heroimage_1.png' },
  { d: 'dg_starbucks_white_mocha', i: '8445290398222_H__g-1_q-1_c-6_m-6.png' },
];

(async () => {
  // First test one URL to confirm headers work
  const testImg = items[0].i;
  const tc1 = testImg[0].toLowerCase(),
    tc2 = testImg[1].toLowerCase();
  const testUrl = `${IMG_BASE}${tc1}/${tc2}/${testImg}`;
  console.log('Testing:', testUrl);
  const testRes = await fetchBuf(testUrl);
  console.log(`Test: status=${testRes.status}, size=${testRes.buf.length} bytes`);
  if (testRes.buf.length < 1000) {
    console.log('Headers still blocked. Aborting.');
    process.exit(1);
  }

  let ok = 0,
    fail = 0;
  for (const { d, i } of items) {
    try {
      const c1 = i[0].toLowerCase(),
        c2 = i[1].toLowerCase();
      const url = `${IMG_BASE}${c1}/${c2}/${i}`;
      const { buf, status } = await fetchBuf(url);
      if (buf.length < 1000) {
        console.log(`SKIP ${d}: ${buf.length}b (status:${status})`);
        fail++;
        continue;
      }
      const out = await sharp(buf)
        .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .png({ quality: 90 })
        .toBuffer();
      const sp = `${PREFIX}/${d}.png`;
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
      const pu = `https://storage.googleapis.com/${bucket.name}/${sp}`;
      await db
        .collection('cafes')
        .doc(d)
        .update({
          ...photoFields(pu),
          updatedAt: new Date().toISOString(),
        });
      ok++;
      console.log(`OK ${d}`);
    } catch (e) {
      console.log(`ERR ${d}: ${e.message}`);
      fail++;
    }
  }
  console.log('\n' + '='.repeat(60));
  console.log(`Done! OK: ${ok}, Failed: ${fail}, Total: ${items.length}`);
  console.log('='.repeat(60));
  process.exit(0);
})();
