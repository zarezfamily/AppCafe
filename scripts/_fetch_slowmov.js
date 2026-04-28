const fs = require('fs');
(async () => {
  const r = await fetch('https://slowmov.com/products.json?limit=250', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const j = await r.json();
  fs.writeFileSync('scripts/_slowmov_products.json', JSON.stringify(j, null, 2));
  console.log('Saved', j.products.length, 'products');
  for (const p of j.products) {
    console.log(p.id, '|', p.product_type, '|', p.title);
  }
})();
