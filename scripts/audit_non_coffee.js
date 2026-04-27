#!/usr/bin/env node
/**
 * audit_non_coffee.js
 *
 * Audita la colección 'cafes' y detecta documentos que NO son café real.
 * Categorías de eliminación:
 *   1. Productos no-café: mugs, filtros, pins, chocolate bars, libros, etc.
 *   2. Packs/bundles de múltiples cafés
 *   3. Bebidas preparadas (lattes, cappuccinos, mochas) — no son café en grano/molido
 *   4. No-alimentos: refrescos, caramelos, cremas, bebidas de soja
 *   5. Duplicados "Lote X" generados artificialmente por seed scripts
 *
 * Uso:
 *   node scripts/audit_non_coffee.js            # Solo auditar
 *   node scripts/audit_non_coffee.js --delete   # Auditar y eliminar
 */

require('dotenv').config();
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function classifyItem(id, data) {
  const nombre = normalize(data.nombre || data.name || '');
  const desc = normalize(data.descripcion || data.description || '');
  const formato = normalize(data.formato || data.format || '');
  const allText = `${nombre} ${desc}`;

  // ── 1. Productos que claramente NO son café ──

  // Mugs, tazas (como producto), pins, merchandising
  if (/\bmug\b/.test(nombre) || /\bpin set\b/.test(nombre) || /\benamel pin\b/.test(nombre)) {
    return { delete: true, category: 'Merchandising', reason: nombre };
  }

  // Filtros de papel (no café)
  if (
    /\bfiltro[s]?\b/.test(nombre) &&
    (/\bpapel\b/.test(nombre) ||
      /\bfilter[s]?\b/.test(nombre) ||
      /\bcoffee maker\b/.test(allText) ||
      /\bbonded\b/.test(nombre))
  ) {
    return { delete: true, category: 'Accesorio (filtros)', reason: nombre };
  }
  if (/\bfiltros de cafe para cafetera/.test(nombre)) {
    return { delete: true, category: 'Accesorio (filtros)', reason: nombre };
  }
  // Peet's paper filters
  if (/\bpaper filter/.test(nombre)) {
    return { delete: true, category: 'Accesorio (filtros)', reason: nombre };
  }

  // Chemex coffeemaker (no es café)
  if (/\bchemex\b/.test(nombre) && /\bcoffeemaker\b/.test(nombre)) {
    return { delete: true, category: 'Accesorio (cafetera)', reason: nombre };
  }

  // Chocolate bars
  if (
    /\bchocolate bar\b/.test(nombre) ||
    /\bpeppermint bar\b/.test(nombre) ||
    /\bexploding coal\b/.test(nombre)
  ) {
    return { delete: true, category: 'No-café (chocolate)', reason: nombre };
  }

  // Sandwiches, food items
  if (/\bsandwich\b/.test(nombre) || /\bbacon\b/.test(nombre) || /\begg\b/.test(nombre)) {
    return { delete: true, category: 'No-café (comida)', reason: nombre };
  }

  // ── 2. Bebidas preparadas (lattes, cappuccinos, mochas, frappes) ──
  // Estos son de Peet's y similares — son bebidas de café hechas, no café en grano/molido
  const drinkPatterns = [
    /\blatte\b/,
    /\bcappuccino\b/,
    /\bmocha\b/,
    /\bfrappe\b/,
    /\bfrappé\b/,
    /\bmacchiato\b/,
    /\bhorchata\b/,
    /\bsparkling\b/,
    /\blemonade\b/,
    /\bpumpkin spice\b/,
    /\bpumpkin latte\b/,
    /\bcold brew.*latte\b/,
    /\bcold brew.*oat\b/,
    /\bprotein latte\b/,
    /\bgolden protein\b/,
  ];
  for (const pat of drinkPatterns) {
    if (pat.test(nombre)) {
      return { delete: true, category: 'Bebida preparada', reason: nombre };
    }
  }

  // ── 3. No-alimentos o productos no-café ──

  // Refrescos, caramelos, bebidas de soja
  if (/\brefresco\b/.test(nombre) || /\bcola\b.*\bzero\b/.test(nombre)) {
    return { delete: true, category: 'No-café (refresco)', reason: nombre };
  }
  if (/\bcaramelo[s]?\b/.test(nombre) && !/\bnotas\b/.test(nombre)) {
    return { delete: true, category: 'No-café (caramelos)', reason: nombre };
  }
  if (/\bbebida de soja\b/.test(nombre)) {
    return { delete: true, category: 'No-café (bebida soja)', reason: nombre };
  }
  if (/\bcrema de leche\b/.test(nombre)) {
    return { delete: true, category: 'No-café (crema)', reason: nombre };
  }

  // Café con leche LÍQUIDO en brick (no es café en grano/molido)
  if (/\bcafe con leche\b/.test(nombre) || /\bcafé con leche\b/.test(nombre)) {
    // Check formato — if it's instant or liquid, it's a drink
    if (formato === 'instant' || formato === 'ground' || !formato) {
      // Hacendado "café con leche" son bricks de bebida
      if (/hacendado/.test(normalize(data.marca || data.roaster || ''))) {
        return { delete: true, category: 'No-café (bebida líquida)', reason: nombre };
      }
    }
  }

  // ── 4. Packs / bundles ──
  // Solo si "pack" está en el NOMBRE como producto principal
  if (/\bpack\b/.test(nombre)) {
    // "Pack Degustación", "Pack Exótico", "Pack Amor", "Welcome Pack", etc.
    if (
      /\bpack\s+(de|degustaciou?n|exou?tico|amor|clau?sicos?|nuestros|welcome|honduras|madrileu?o|dulce|quemex|llamame)\b/.test(
        nombre
      ) ||
      /\bwelcome pack\b/.test(nombre) ||
      /\bpack.*regalo\b/.test(nombre) ||
      /\bpack.*taza\b/.test(nombre) ||
      /\bpack.*filtro/.test(nombre) ||
      /\bpack.*cafe[s]?\b/.test(nombre)
    ) {
      return { delete: true, category: 'Pack/bundle', reason: nombre };
    }
  }

  // ── 5. Duplicados "Lote X" generados por seeds ──
  // Pattern: "Marca · País Región Lote N [250g]" where N is a round/sequential number
  // Real coffee lots exist but wouldn't have sequential numbers from the SAME origin
  const loteMatch = nombre.match(/\blote\s+(\d+)\b/);
  if (loteMatch) {
    const loteNum = parseInt(loteMatch[1], 10);
    // If lote number is between 1-100 and very "round" looking, likely generated
    // Check if it follows the pattern: same brand + same origin + sequential lotes
    // The key indicator: real coffee lots have specific names, not just numbers
    // All the flagged ones are like "Colombia Huila Lote 10", "Lote 20", "Lote 30"...
    if (loteNum >= 1 && loteNum <= 100) {
      // Check: does this doc have minimal data (sign of seed generation)?
      const hasNotas = !!(data.notas || data.notes);
      const hasPrecio = data.precio !== undefined && data.precio !== null;
      const hasSca = data.sca && (typeof data.sca === 'object' ? data.sca.score : data.sca);

      // If it has notas AND precio AND sca, it's probably a real coffee
      if (hasNotas && hasPrecio && hasSca) {
        return { delete: false };
      }

      // Otherwise, flag as likely generated
      return { delete: true, category: 'Duplicado seed (Lote X)', reason: nombre };
    }
  }

  // ── 6. IDs de Peet's que son claramente bebidas/no-café por el ID pattern ──
  if (id.startsWith('peets_')) {
    const peetsNoCafe = [
      'peets_caffe-latte',
      'peets_caffe-mocha',
      'peets_caffe-macchiato',
      'peets_caffe-americano',
      'peets_espresso',
      'peets_iced-espresso',
      'peets_coffee-of-the-day',
      'peets_peets-enamel-pin-set',
      'peets_traditional-cappuccino',
      'peets_iced-cappuccino',
      'peets_black-tie',
    ];
    if (peetsNoCafe.includes(id)) {
      return { delete: true, category: "Peet's no-producto", reason: nombre };
    }
  }

  return { delete: false };
}

async function main() {
  const DELETE = process.argv.includes('--delete');

  console.log('🔍 Auditando colección cafes…');
  const snap = await db.collection('cafes').get();
  console.log(`   ${snap.size} documentos total.\n`);

  const toDelete = [];
  const clean = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const result = classifyItem(doc.id, data);
    if (result.delete) {
      toDelete.push({
        id: doc.id,
        nombre: data.nombre || data.name || '(sin nombre)',
        marca: data.marca || data.roaster || '(sin marca)',
        category: result.category,
        reason: result.reason,
      });
    } else {
      clean.push(doc.id);
    }
  }

  console.log(`✅ ${clean.length} cafés legítimos`);
  console.log(`🗑️  ${toDelete.length} a eliminar:\n`);

  // Group by category
  const byCategory = {};
  for (const item of toDelete) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }

  for (const [cat, items] of Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n── ${cat} (${items.length}) ──`);
    for (const item of items) {
      console.log(`  ${item.id}  →  ${item.marca} · ${item.nombre}`);
    }
  }

  if (DELETE && toDelete.length > 0) {
    console.log(`\n🗑️  Eliminando ${toDelete.length} documentos…`);
    let count = 0;
    let batch = db.batch();
    for (const item of toDelete) {
      batch.delete(db.collection('cafes').doc(item.id));
      count++;
      if (count % 490 === 0) {
        await batch.commit();
        batch = db.batch();
        console.log(`   ${count} eliminados…`);
      }
    }
    if (count % 490 !== 0) {
      await batch.commit();
    }
    console.log(`\n✅ ${toDelete.length} documentos eliminados de Firestore.`);
  } else if (!DELETE && toDelete.length > 0) {
    console.log(`\n⚠️  Modo auditoría. Para eliminar, ejecuta:`);
    console.log(`   node scripts/audit_non_coffee.js --delete`);
  }
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
