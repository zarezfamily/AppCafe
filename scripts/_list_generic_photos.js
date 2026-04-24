#!/usr/bin/env node
/**
 * List all cafes with generic/placeholder/missing photos.
 * Groups by: placeholder, fallback OFF image, no photo, broken external URL.
 */
const admin = require('firebase-admin');
const https = require('https');
const http = require('http');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();

const PLACEHOLDER = 'generic-coffee-placeholder.png';
const CLEAN_COFFEE = 'images/products/761/303/656/9927/front_en';
const OFF_FALLBACK = 'images/products/327/019/002/5765/front_fr';

function _checkUrl(url) {
  return new Promise((resolve) => {
    if (!url || url.length < 10) return resolve(false);
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      { headers: { 'User-Agent': 'EtioveApp/1.0' }, timeout: 10000 },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const snap = await db.collection('cafes').get();
  console.log(`Total cafes in Firestore: ${snap.size}\n`);

  const placeholder = [];
  const offFallback = [];
  const noPhoto = [];
  const cleared = []; // fields deleted/empty

  for (const doc of snap.docs) {
    const d = doc.data();
    const url = d.bestPhoto || d.officialPhoto || d.imageUrl || d.foto || d.imagenUrl || '';
    const nombre = d.nombre || doc.id;
    const marca = d.marca || d.roaster || '';
    const selected = d.photos && d.photos.selected ? d.photos.selected : '';

    const effectiveUrl = url || selected;

    if (!effectiveUrl || effectiveUrl.length < 10) {
      noPhoto.push({ id: doc.id, nombre, marca });
    } else if (effectiveUrl.includes(PLACEHOLDER)) {
      placeholder.push({ id: doc.id, nombre, marca, ean: d.ean || '' });
    } else if (effectiveUrl.includes(CLEAN_COFFEE) || effectiveUrl.includes(OFF_FALLBACK)) {
      offFallback.push({ id: doc.id, nombre, marca, ean: d.ean || '' });
    }
  }

  // Print results
  if (placeholder.length > 0) {
    console.log(`=== PLACEHOLDER GENÉRICO (☕) — ${placeholder.length} cafés ===`);
    console.log('Estos tienen la imagen genérica de café subida a Storage:\n');
    for (const c of placeholder.sort((a, b) => a.marca.localeCompare(b.marca))) {
      console.log(
        `  ${c.marca.padEnd(22)} | ${c.nombre.padEnd(55)} | EAN: ${c.ean || 'N/A'} | ID: ${c.id}`
      );
    }
  }

  if (offFallback.length > 0) {
    console.log(`\n=== FALLBACK OFF (imagen genérica externa) — ${offFallback.length} cafés ===`);
    console.log('Estos apuntan a Open Food Facts genérico (puede no cargar):\n');
    for (const c of offFallback.sort((a, b) => a.marca.localeCompare(b.marca))) {
      console.log(
        `  ${c.marca.padEnd(22)} | ${c.nombre.padEnd(55)} | EAN: ${c.ean || 'N/A'} | ID: ${c.id}`
      );
    }
  }

  if (noPhoto.length > 0) {
    console.log(`\n=== SIN FOTO (campos vacíos/borrados) — ${noPhoto.length} cafés ===\n`);
    for (const c of noPhoto.sort((a, b) => a.marca.localeCompare(b.marca))) {
      console.log(`  ${c.marca.padEnd(22)} | ${c.nombre.padEnd(55)} | ID: ${c.id}`);
    }
  }

  if (cleared.length > 0) {
    console.log(`\n=== CLEARED — ${cleared.length} cafés ===\n`);
    for (const c of cleared) {
      console.log(`  ${c.marca.padEnd(22)} | ${c.nombre.padEnd(55)} | ID: ${c.id}`);
    }
  }

  const total = placeholder.length + offFallback.length + noPhoto.length + cleared.length;
  console.log(`\n=== RESUMEN ===`);
  console.log(`  Placeholder genérico: ${placeholder.length}`);
  console.log(`  Fallback OFF externo: ${offFallback.length}`);
  console.log(`  Sin foto:             ${noPhoto.length}`);
  console.log(`  TOTAL sin foto real:  ${total}`);
  console.log(`  Con foto real:        ${snap.size - total}`);
  console.log(`  Total en BD:          ${snap.size}`);

  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
