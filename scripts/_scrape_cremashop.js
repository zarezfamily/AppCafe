#!/usr/bin/env node
/**
 * Scrape ALL coffee beans from cremashop.eu (simpler HTML, same products as maxicoffee)
 * Then cross-reference with our Firestore DB to find new brands to import
 */
const https = require('https');
const fs = require('fs');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchPage(res.headers.location).then(resolve).catch(reject);
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

(async () => {
  const allProducts = [];

  // Check how many pages: beans, ground, and espresso
  const categories = [
    { name: 'beans', url: 'https://www.cremashop.eu/es/store/coffee/beans?view=all' },
    { name: 'ground', url: 'https://www.cremashop.eu/es/store/coffee/ground?view=all' },
  ];

  for (const cat of categories) {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = page === 1 ? cat.url : `${cat.url}&page=${page}`;
      console.log(`Fetching ${cat.name} page ${page}...`);
      const html = await fetchPage(url);

      // Extract product links and titles
      // Pattern: <a class="stretched-link" href="/es/products/brand/product/id">Title</a>
      const linkPattern =
        /<a\s+class="stretched-link"\s+href="(\/es\/products\/[^"]+)">([^<]+)<\/a>/g;
      let match;
      let pageCount = 0;

      while ((match = linkPattern.exec(html)) !== null) {
        const path = match[1];
        const title = match[2].trim();

        // Parse path: /es/products/brand/product/id or /es/products/brand/sub/product/id
        const parts = path.split('/').filter(Boolean);
        // parts = [es, products, brand, product, id] or [es, products, brand, sub, product, id]

        let brandSlug, productSlug, productId;
        if (parts.length === 5) {
          brandSlug = parts[2];
          productSlug = parts[3];
          productId = parts[4];
        } else if (parts.length === 6) {
          brandSlug = parts[2];
          productSlug = parts[4];
          productId = parts[5];
        } else {
          continue;
        }

        // Skip packs and multi-packs
        if (
          title.match(/\d+\s*x\s*\d+/i) ||
          title.match(/value pack/i) ||
          title.match(/pack.*\d/i)
        ) {
          continue;
        }

        pageCount++;
        allProducts.push({
          category: cat.name,
          path,
          title,
          brandSlug,
          productSlug,
          productId,
          url: 'https://www.cremashop.eu' + path,
        });
      }

      console.log(`  Found ${pageCount} products`);

      // Check for next page link
      if (html.includes(`page=${page + 1}`) && pageCount > 0) {
        page++;
      } else {
        hasMore = false;
      }
    }
  }

  // Extract image hashes from the listing pages for direct image URLs
  // We'll do this in the detail scraping phase

  // Deduplicate by productId
  const seen = new Set();
  const unique = allProducts.filter((p) => {
    if (seen.has(p.productId)) return false;
    seen.add(p.productId);
    return true;
  });

  // Group by brand
  const byBrand = {};
  for (const p of unique) {
    if (!byBrand[p.brandSlug]) byBrand[p.brandSlug] = [];
    byBrand[p.brandSlug].push(p);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total unique products: ${unique.length}`);
  console.log(`Total brands: ${Object.keys(byBrand).length}`);
  console.log(`\nBrands and product counts:`);
  const sorted = Object.entries(byBrand).sort((a, b) => b[1].length - a[1].length);
  for (const [brand, products] of sorted) {
    console.log(
      `  ${brand}: ${products.length} (${products
        .map((p) => p.category)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(',')})`
    );
  }

  // Save full data
  fs.writeFileSync('/tmp/cremashop_all_products.json', JSON.stringify(unique, null, 2));
  console.log(`\nSaved to /tmp/cremashop_all_products.json`);
})();
