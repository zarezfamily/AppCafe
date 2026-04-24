/**
 * Search Open Food Facts for working product images by brand name.
 */

const searches = [
  { query: 'Lavazza Qualita Rossa', brand: 'lavazza' },
  { query: 'Lavazza Qualita Oro', brand: 'lavazza' },
  { query: 'Illy grano arabica', brand: 'illy' },
  { query: 'Illy Espresso Classico', brand: 'illy' },
  { query: 'Marcilla cafe grano mezcla', brand: 'marcilla' },
  { query: 'Marcilla cafe molido natural', brand: 'marcilla' },
  { query: 'Marcilla Gran Aroma', brand: 'marcilla' },
  { query: 'Bonka Natural', brand: 'bonka' },
  { query: 'Delta Cafes Platinum', brand: 'delta' },
  { query: 'Starbucks House Blend', brand: 'starbucks' },
  { query: 'Nespresso Ristretto', brand: 'nespresso' },
  { query: 'Fortaleza Natural cafe', brand: 'fortaleza' },
  { query: 'Oquendo Espresso', brand: 'oquendo' },
  { query: 'Saula Premium Original', brand: 'saula' },
];

async function searchOFF(query) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=3&fields=product_name,brands,image_front_url,image_url,code`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ETIOVE-CoffeeApp/1.0 - contact@etiove.com' },
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.log('   (rate limited, retrying...)');
    await new Promise((r) => setTimeout(r, 5000));
    const res2 = await fetch(url, {
      headers: { 'User-Agent': 'ETIOVE-CoffeeApp/1.0 - contact@etiove.com' },
    });
    return res2.json();
  }
}

async function main() {
  for (const { query, brand } of searches) {
    const data = await searchOFF(query);
    const products = (data.products || []).filter((p) => {
      const b = (p.brands || '').toLowerCase();
      return b.includes(brand);
    });

    if (products.length > 0) {
      const p = products[0];
      const img = p.image_front_url || p.image_url || '';
      console.log(`✅ ${query}`);
      console.log(`   EAN: ${p.code} | ${p.product_name} | ${p.brands}`);
      console.log(`   IMG: ${img}`);
    } else {
      console.log(`❌ ${query} — no match in OFF`);
    }
    console.log('');

    // Rate limit
    await new Promise((r) => setTimeout(r, 2000));
  }
}

main().catch(console.error);
