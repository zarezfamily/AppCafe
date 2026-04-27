const fetch = require('node-fetch');

async function tryAsin(asin) {
  const res = await fetch(`https://www.amazon.es/dp/${asin}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'es-ES,es;q=0.9',
    },
  });
  const html = await res.text();
  // Get title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'NO TITLE';
  // Get hiRes
  const hiResMatches = [
    ...html.matchAll(/"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g),
  ];
  return { asin, title, hiRes: hiResMatches.map((m) => m[1]) };
}

(async () => {
  // Common Dolce Gusto ASINs
  const asins = [
    'B071VK4XKH',
    'B00G1SUQVU',
    'B01D97MV0O',
    'B079DD6YJ6',
    'B079DHCLPG',
    'B0CY1NPH7Q',
    'B0CXSPB3ZQ',
    'B08WRG4SZC',
    'B0BT2ZWGCK',
    'B09B7NWZHL',
    'B0B2HVXJ67',
    'B09BL7GCHD',
  ];

  for (const asin of asins) {
    const r = await tryAsin(asin);
    const shortTitle = r.title.substring(0, 80);
    console.log(`${asin}: ${shortTitle} | ${r.hiRes.length} imgs`);
    if (r.hiRes.length > 0) console.log(`  → ${r.hiRes[0].substring(0, 80)}`);
  }
  process.exit(0);
})();
