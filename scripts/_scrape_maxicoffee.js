#!/usr/bin/env node
/**
 * Scrape ALL coffee beans from maxicoffee.com (all 17 pages)
 * Extract: brand, name, price, weight, URL, image URL
 */
const https = require('https');
const fs = require('fs');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'identity' } },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return fetchPage(res.headers.location).then(resolve).catch(reject);
          }
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve(data));
        }
      )
      .on('error', reject);
  });
}

(async () => {
  const allProducts = [];
  const totalPages = 17;

  for (let page = 1; page <= totalPages; page++) {
    const url =
      page === 1
        ? 'https://www.maxicoffee.com/en-eu/all-coffee-beans-c-58_1361.html'
        : `https://www.maxicoffee.com/en-eu/all-coffee-beans-c-58_1361.html?page=${page}`;

    console.log(`Fetching page ${page}/${totalPages}...`);
    const html = await fetchPage(url);

    // Extract product cards - each has: image, link, title, price
    // Pattern: product link with title
    const productPattern = /<a[^>]+class="stretched-link"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match;
    const pageProducts = [];

    while ((match = productPattern.exec(html)) !== null) {
      const prodUrl = match[1];
      const title = match[2].trim();
      // Skip value packs and multi-packs
      if (
        title.match(/\d+\s*x\s*\d+/i) ||
        title.match(/value pack/i) ||
        title.match(/selection pack/i)
      ) {
        continue;
      }
      pageProducts.push({ url: 'https://www.maxicoffee.com' + prodUrl, title });
    }

    // Extract image URLs for products
    const imgPattern = /content\/products\/([^/]+)\/([^/]+)\/(\d+-[a-f0-9]+)\.jpg/g;
    const images = {};
    while ((match = imgPattern.exec(html)) !== null) {
      const brand = match[1];
      const product = match[2];
      const hash = match[3];
      const key = `${brand}/${product}`;
      if (!images[key]) {
        images[key] = `https://www.cremashop.eu/content/products/${brand}/${product}/${hash}.jpg`;
      }
    }

    // Also extract maxicoffee's own image URLs
    const mcImgPattern = /src="(https:\/\/www\.maxicoffee\.com\/[^"]+\/(\d+)-[^"]+\.jpg)"/g;
    while ((match = mcImgPattern.exec(html)) !== null) {
      // Will use later if needed
    }

    // Extract prices
    const pricePattern = /(\d+)€(\d+)/g;

    for (const p of pageProducts) {
      // Parse brand from title: "Brand Name Product Name - Weight"
      // URL pattern: /products/brand/product/id
      const urlMatch = p.url.match(/\/products\/([^/]+)\/([^/]+)\/(\d+)/);
      if (urlMatch) {
        const brandSlug = urlMatch[1];
        const productSlug = urlMatch[2];
        const productId = urlMatch[3];
        const key = `${brandSlug}/${productSlug}`;

        // Parse weight from title
        const weightMatch = p.title.match(/(\d+(?:\.\d+)?)\s*(kg|g)\b/i);
        let weight = '';
        if (weightMatch) {
          weight = weightMatch[1] + weightMatch[2].toLowerCase();
        }

        // Clean brand name from slug
        const brandName = brandSlug
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        // Clean product name (remove brand prefix and weight suffix)
        let productName = p.title.replace(/\s*-?\s*\d+(?:\.\d+)?\s*(?:kg|g)\s*$/i, '').trim();

        p.brand = brandName;
        p.brandSlug = brandSlug;
        p.productSlug = productSlug;
        p.productId = productId;
        p.productName = productName;
        p.weight = weight;
        p.imageUrl = images[key] || `https://www.maxicoffee.com/images/products/${productId}.jpg`;

        allProducts.push(p);
      }
    }

    console.log(`  Page ${page}: ${pageProducts.length} products found`);
  }

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
    if (!byBrand[p.brand]) byBrand[p.brand] = [];
    byBrand[p.brand].push(p);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total unique products: ${unique.length}`);
  console.log(`Total brands: ${Object.keys(byBrand).length}`);
  console.log(`\nBrands and product counts:`);
  const sorted = Object.entries(byBrand).sort((a, b) => b[1].length - a[1].length);
  for (const [brand, products] of sorted) {
    console.log(`  ${brand}: ${products.length}`);
  }

  // Save full data
  fs.writeFileSync('/tmp/maxicoffee_all_products.json', JSON.stringify(unique, null, 2));
  console.log(`\nSaved to /tmp/maxicoffee_all_products.json`);
})();
