#!/usr/bin/env node
/**
 * Update prices for 22 cafes that have no price.
 * Sources: import files, Amazon scrape, reference-based estimates.
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

const prices = {
  // From import files (exact)
  'catunambu_cafe-molido-mezcla-250g': 2.8,
  'catunambu_cafe-molido-natural-descafeinado-250g': 2.9,
  ean_5744003140121: 2.89, // Kaffekapslen Dynamite Coffee
  ean_8436583660058: 2.5, // Mogorttini Tasting box
  mercadona_11049: 1.1, // Café soluble classic sobres
  mercadona_11051: 1.2, // Café soluble descafeinado sobres
  mercadona_11123: 2.9, // Café soluble Espresso Creme
  mercadona_11171: 2.6, // Café molido fuerte
  mercadona_11172: 2.6, // Café molido natural
  mercadona_14383: 2.4, // Café cápsula sabor Caramel
  mercadona_22718: 2.9, // Café soluble Classic

  // From Amazon (verified)
  pellini_amazon_b0bf9d6lc4: 37.44, // Top 500g + Vivace 1kg bundle
  pellini_amazon_b0bf9lnl7w: 39.94, // Top 500g + Cremoso 1kg bundle

  // Estimated from similar products in DB
  'aldi-espresso-classico': 11.79, // Ref: Barissimo Espresso Cremoso 1000g
  'hacendado-capsulas-descafeinado': 2.85, // Ref: Hacendado cápsulas descafeinado

  // Marcilla: estimated from similar Marcilla in DB
  'marcilla_www-marcilla-com-productos-creme-express-mezcla-descafeinado': 3.5,
  'marcilla_www-marcilla-com-productos-creme-express-natural-soluble': 3.5,
  'marcilla_www-marcilla-com-productos-tassimo-cafe-con-leche': 5.29,
  'marcilla_www-marcilla-com-productos-tassimo-cortado': 5.29,

  // Starbucks Nespresso: other Starbucks caps = ~5€
  starbucks_1711621270983: 4.99, // Blonde Decaf Espresso Roast
  starbucks_1732704053671: 4.99, // Ristretto Shot
  starbucks_7613036984515: 4.99, // Espresso Roast
};

async function main() {
  console.log('=== Update Missing Prices ===\n');
  let updated = 0,
    errors = 0;

  for (const [id, precio] of Object.entries(prices)) {
    try {
      const ref = db.collection('cafes').doc(id);
      const doc = await ref.get();
      if (!doc.exists) {
        console.log(`  ❌ ${id}: doc not found`);
        errors++;
        continue;
      }
      const current = doc.data().precio;
      if (current && current > 0) {
        console.log(`  ⏭  ${id}: already has precio=${current}`);
        continue;
      }
      await ref.update({ precio });
      console.log(`  ✅ ${doc.data().nombre}: ${precio}€`);
      updated++;
    } catch (e) {
      console.log(`  ❌ ${id}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n=== Done: ${updated} updated, ${errors} errors ===`);
  process.exit(0);
}

main();
