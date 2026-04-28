const fs = require('fs');
(async () => {
  const r = await fetch('https://kaffek.es/sitemap/es/sitemap.xml');
  const t = await r.text();
  const locs = [...t.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]);
  console.log('Found', locs.length, 'URLs in sitemap index');
  locs.forEach((u) => console.log(u));

  // If it's a sitemap index, fetch product sitemaps
  const productSitemaps = locs.filter((u) => u.includes('product'));
  for (const sm of productSitemaps) {
    console.log('\n--- Fetching', sm, '---');
    const r2 = await fetch(sm);
    const t2 = await r2.text();
    const products = [...t2.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]);
    console.log('Products:', products.length);
    products.forEach((u) => console.log(u));
  }
})();
