const fs = require('fs');
const slugs = [
  'flat-white-cafe-diario-kaffekapslen-dolce-gusto',
  'irish-coffee-cafe-diario-kaffekapslen-dolce-gusto',
  'mocha-cafe-diario-kaffekapslen-dolce-gusto',
  'pistacho-cafe-diario-kaffekapslen-dolce-gusto',
  'white-chocolate-cafe-diario-kaffekapslen-dolce-gusto',
  'chocolate-caliente-kaffekapslen-dolce-gusto',
  'lungo-xxl-premium-kaffekapslen-nespresso',
  'cafe-vainilla-kaffekapslen-nespresso-pro',
  'hazelnootdrank-alledaagse-koffie-kaffekapslen-dolce-gusto',
];

(async () => {
  const results = [];
  for (const slug of slugs) {
    const url = `https://kaffek.es/${slug}.html`;
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html',
          'Accept-Language': 'es-ES,es;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      });
      const html = await r.text();

      // Extract product name from <title> or og:title
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i);
      const title = ogTitleMatch ? ogTitleMatch[1] : titleMatch ? titleMatch[1] : '?';

      // Extract product image from og:image or first product gallery image
      const ogImgMatch = html.match(/property="og:image"\s+content="([^"]+)"/i);
      const galleryImgMatch = html.match(/"full_image_url"\s*:\s*"([^"]+)"/);
      const imgMatch2 = html.match(
        /class="gallery-placeholder[^"]*"[^>]*>\s*<img[^>]+src="([^"]+)"/i
      );
      const anyImgMatch = html.match(
        /data-gallery-role="gallery-placeholder"[\s\S]*?src="([^"]+)"/i
      );
      const img = ogImgMatch
        ? ogImgMatch[1]
        : galleryImgMatch
          ? galleryImgMatch[1]
          : imgMatch2
            ? imgMatch2[1]
            : anyImgMatch
              ? anyImgMatch[1]
              : '';

      // Extract price
      const priceMatch =
        html.match(/"price"\s*:\s*"?(\d+[\.,]?\d*)/) || html.match(/data-price-amount="([^"]+)"/);
      const price = priceMatch ? priceMatch[1] : '?';

      // Extract EAN from schema or meta
      const eanMatch = html.match(/"gtin13"\s*:\s*"(\d+)"/) || html.match(/"ean"\s*:\s*"(\d+)"/);
      const ean = eanMatch ? eanMatch[1] : 'N/A';

      console.log(`${slug}:`);
      console.log(`  title: ${title}`);
      console.log(`  img:   ${img}`);
      console.log(`  price: ${price}`);
      console.log(`  ean:   ${ean}`);

      results.push({ slug, title, img, price, ean });
    } catch (e) {
      console.log(`${slug}: ERR ${e.message}`);
      results.push({ slug, title: '?', img: '', price: '?', ean: 'N/A' });
    }
  }
  fs.writeFileSync('scripts/_kaffek_missing_data.json', JSON.stringify(results, null, 2));
  console.log('\nSaved to _kaffek_missing_data.json');
})();
