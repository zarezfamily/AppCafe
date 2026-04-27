/**
 * Try known real EANs on Open Food Facts API (product endpoint, not search)
 * These are actual EANs found on product packaging
 */

const KNOWN_EANS = {
  'Lavazza Qualita Rossa': ['8000070053526', '8000070036383'],
  'Lavazza Qualita Oro': ['8000070020580', '8000070020573'],
  'Illy grano Arabica': ['8003753900223', '8003753970012'],
  'Illy Espresso Classico': ['8003753159263', '8003753900421'],
  'Marcilla grano Mezcla': ['8410091105218', '8410091105010'],
  'Marcilla molido Natural': ['8410091005816', '8410091105515'],
  'Marcilla Gran Aroma': ['8410091105317', '8433197600978'],
  'Bonka Natural': ['8410076421012', '8410076421029'],
  'Delta Cafes Platinum': ['5601060000052', '5601060000069'],
  'Starbucks House Blend': ['7613036932097', '7613036932103'],
  'Nespresso Ristretto': ['7630039615437', '7613036087261'],
  'Fortaleza Natural': ['8410091220218'],
  'Saula Premium': ['8414956010162'],
};

async function check(ean) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=product_name,brands,image_front_url,image_url`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ETIOVE-CoffeeApp/1.0 - contact@etiove.com' },
  });
  if (!res.ok) return null;
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function main() {
  for (const [name, eans] of Object.entries(KNOWN_EANS)) {
    let found = false;
    for (const ean of eans) {
      const data = await check(ean);
      const img = data?.product?.image_front_url || data?.product?.image_url || '';
      if (img && img.startsWith('http')) {
        console.log(`✅ ${name} (EAN ${ean})`);
        console.log(`   IMG: ${img}`);
        found = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    if (!found) {
      console.log(`❌ ${name} — not found`);
    }
    console.log('');
  }
}

main().catch(console.error);
