#!/usr/bin/env node
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const https = require('https');
const http = require('http');
const fs = require('fs');
const sharp = require('sharp');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetch(res.headers.location).then(resolve).catch(reject);
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadBuffer(res.headers.location).then(resolve).catch(reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

async function processAndUpload(docId, imageUrl, label) {
  console.log(`\n=== ${label} ===`);
  console.log(`  Downloading: ${imageUrl}`);
  const buf = await downloadBuffer(imageUrl);
  console.log(`  Downloaded: ${buf.length} bytes`);

  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  console.log(`  Processed: ${processed.length} bytes`);

  const destPath = `cafe-photos-nobg/${docId}.png`;
  const file = bucket.file(destPath);
  await file.save(processed, { contentType: 'image/png' });
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${destPath}`;

  await db.collection('cafes').doc(docId).update({
    officialPhoto: publicUrl,
    bestPhoto: publicUrl,
    'photos.selected': publicUrl,
  });
  console.log(`  Uploaded & updated: ${docId}`);
  return publicUrl;
}

(async () => {
  try {
    // ===== STEP 1: La Colombe Lyon - update photo =====
    await processAndUpload(
      'lacolombe_lyon',
      'https://cdn.shopify.com/s/files/1/0056/4562/products/LYON_DTC_Abbey_Lossing_Whole.jpg?v=1767130413',
      'La Colombe Lyon'
    );

    // ===== STEP 2: La Colombe Bowery - update photo =====
    await processAndUpload(
      'lacolombe_bowery-blend',
      'https://cdn.shopify.com/s/files/1/0056/4562/files/Bowery2023_Blend_Coffee_Web.jpg?v=1767130244',
      'La Colombe Bowery Blend'
    );

    // ===== STEP 3: Starbucks - get images from cremashop =====
    const cremashopProducts = [
      {
        slug: 'blonde-espresso-roast/10752',
        name: 'Starbucks Blonde Espresso Roast (beans)',
      },
      {
        slug: 'espresso-roast/10753',
        name: 'Starbucks Espresso Roast (beans)',
      },
      {
        slug: 'nespresso-espresso-roast-decaf/13312',
        name: 'Starbucks Decaf Espresso Nespresso',
      },
      {
        slug: 'nespresso-caffe-verona/13321',
        name: 'Starbucks Caffe Verona Nespresso',
      },
      {
        slug: 'nespresso-single-origin-colombia/13311',
        name: 'Starbucks Colombia Nespresso',
      },
      {
        slug: 'nespresso-blonde-espresso-decaf/13308',
        name: 'Starbucks Blonde Decaf Nespresso',
      },
      { slug: 'pike-place/10754', name: 'Starbucks Pike Place (beans)' },
      {
        slug: 'veranda-blend/11664',
        name: 'Starbucks Veranda Blend (beans)',
      },
      {
        slug: 'house-blend/11665',
        name: 'Starbucks House Blend (ground)',
      },
    ];

    // Collect cremashop image URLs
    const cremashopImages = {};
    for (const p of cremashopProducts) {
      const html = await fetch('https://www.cremashop.eu/es/products/starbucks/' + p.slug);
      const match = html.match(/product_lg\/content\/products\/starbucks\/[^"'\s]+/);
      if (match) {
        cremashopImages[p.slug] = {
          url: 'https://www.cremashop.eu/media/cache/' + match[0].replace(/&amp;/g, '&'),
          name: p.name,
        };
        console.log(`\nFound image for ${p.name}`);
      } else {
        console.log(`\nNo image for ${p.name}`);
      }
    }

    // Map our Firestore doc IDs to cremashop slugs for photos that need fixing
    // User mentioned: decaf espresso roast borrosa, caffe verona borrosa, colombia medium roast vacia,
    // blonde decaf espresso sin foto, ristretto shot sin foto
    const starbucksPhotoFixes = [
      {
        docId: 'starbucks-starbucks-decaf-espresso-roast',
        cremashopSlug: 'nespresso-espresso-roast-decaf/13312',
        alt: 'espresso-roast/10753',
        label: 'Starbucks Decaf Espresso Roast',
      },
      {
        docId: 'starbucks-starbucks-caffe-verona',
        cremashopSlug: 'nespresso-caffe-verona/13321',
        alt: null,
        label: 'Starbucks Caffè Verona',
      },
      {
        docId: 'starbucks-starbucks-colombia',
        cremashopSlug: 'nespresso-single-origin-colombia/13311',
        alt: null,
        label: 'Starbucks Colombia Medium Roast',
      },
      {
        docId: 'starbucks_1711621270983',
        cremashopSlug: 'nespresso-blonde-espresso-decaf/13308',
        alt: null,
        label: 'Starbucks Blonde Decaf Espresso Roast (capsules)',
      },
      {
        docId: 'starbucks_1732704053671',
        cremashopSlug: null,
        alt: null,
        label: 'Starbucks Ristretto Shot (capsules)',
      },
    ];

    // Check current photo status of all starbucks
    const allSB = await db.collection('cafes').where('marca', '==', 'Starbucks').get();
    console.log('\n=== Current Starbucks photo status ===');
    const sbDocs = {};
    allSB.forEach((d) => {
      const data = d.data();
      sbDocs[d.id] = data;
      const photo =
        (data.photos && data.photos.selected) || data.officialPhoto || data.bestPhoto || '';
      const hasGoodPhoto =
        photo && photo.includes('storage.googleapis.com') && !photo.includes('undefined');
      console.log(
        `  ${d.id} | ${data.nombre} | photo: ${hasGoodPhoto ? 'OK' : 'NEEDS FIX'} | ${photo.substring(0, 60)}`
      );
    });

    // Fix Starbucks photos
    for (const fix of starbucksPhotoFixes) {
      let imageUrl = null;
      if (fix.cremashopSlug && cremashopImages[fix.cremashopSlug]) {
        imageUrl = cremashopImages[fix.cremashopSlug].url;
      } else if (fix.alt && cremashopImages[fix.alt]) {
        imageUrl = cremashopImages[fix.alt].url;
      }

      if (imageUrl) {
        await processAndUpload(fix.docId, imageUrl, fix.label);
      } else {
        console.log(`\n=== ${fix.label} === SKIPPED (no source image found)`);
      }
    }

    // Also fix Starbucks Colombia from ametllerorigen (separate product page image)
    // The user provided ametllerorigen link for Colombia - let's try getting image from there
    console.log('\n=== Trying ametllerorigen for Starbucks Colombia ===');
    const ametllerHtml = await fetch(
      'https://www.ametllerorigen.com/es/cafe-tostado-grano-colombia-starbucks-450g/p'
    );
    const ametllerMatch = ametllerHtml.match(
      /https:\/\/[^"'\s]+starbucks[^"'\s]*\.(jpg|png|webp)/i
    );
    if (ametllerMatch) {
      console.log('  Found ametller image:', ametllerMatch[0]);
    } else {
      // Try a broader image search
      const imgMatches = ametllerHtml.match(/https:\/\/[^"'\s]+\.(jpg|png|webp)/gi);
      if (imgMatches) {
        const productImgs = imgMatches.filter(
          (u) => u.includes('product') || u.includes('vtexassets') || u.includes('cafe')
        );
        console.log('  Product images found:', productImgs.slice(0, 5));
      }
    }

    console.log('\n=== DONE ===');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
