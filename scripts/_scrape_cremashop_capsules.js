#!/usr/bin/env node
/**
 * Scrape cremashop capsules & pods listing page
 * Check what brands are available that we don't already have
 */
const https = require('https');

function downloadPage(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadPage(res.headers.location).then(resolve).catch(reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString()));
      })
      .on('error', reject);
  });
}

(async () => {
  console.log('Fetching cremashop capsules listing...');
  const html = await downloadPage(
    'https://www.cremashop.eu/es/store/coffee/capsules-and-pods?view=all'
  );

  // Extract product entries: <a href="/es/products/BRAND/PRODUCT/ID" ...>
  const productRegex =
    /href="\/es\/products\/([^/]+)\/([^/]+)\/(\d+)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/g;
  const products = [];
  const seen = new Set();
  let m;
  while ((m = productRegex.exec(html))) {
    const key = `${m[1]}/${m[2]}/${m[3]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    products.push({
      brandSlug: m[1],
      productSlug: m[2],
      id: m[3],
      name: m[4].replace(/<[^>]+>/g, '').trim(),
    });
  }

  console.log(`Found ${products.length} capsule/pod products`);

  // Group by brand
  const brands = {};
  for (const p of products) {
    if (!brands[p.brandSlug]) brands[p.brandSlug] = [];
    brands[p.brandSlug].push(p);
  }

  console.log(`\nBrands (${Object.keys(brands).length}):`);
  Object.entries(brands)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([b, prods]) => {
      console.log(`  ${b}: ${prods.length} products`);
    });

  // Also try to extract image URLs
  const imgRegex = /content\/products\/([^/]+)\/([^/]+)\/(\d+)-([a-f0-9]+)\.jpg/g;
  const images = {};
  while ((m = imgRegex.exec(html))) {
    const key = `${m[1]}/${m[2]}/${m[3]}`;
    if (!images[key]) images[key] = `${m[1]}/${m[2]}/${m[3]}-${m[4]}.jpg`;
  }
  console.log(`\nProducts with images: ${Object.keys(images).length}`);

  // Save for detail scraping
  const fs = require('fs');
  fs.writeFileSync('/tmp/cremashop_capsules.json', JSON.stringify({ products, images }, null, 2));
  console.log('Saved to /tmp/cremashop_capsules.json');
})();
