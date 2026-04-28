const fs = require('fs');
const stores = [
  'threemarks.myshopify.com',
  'three-marks.myshopify.com',
  'threemarkscoffee.es',
  'www.threemarkscoffee.es',
  'holacoffee.es',
  'www.holacoffee.es',
  'hola-coffee.com',
  'pucherocoffee.com',
  'puchero-coffee.com',
  'puchero.es',
  'anomala.coffee',
  'www.anomala.coffee',
  'misioncafe.es',
  'www.misioncafe.es',
  'mokita.coffee',
  'mister-wilson.com',
  'misterwilsoncoffee.com',
  'tomacoffee.com',
  'toma-cafe.com',
  'hidden.coffee',
  'cafetomacafe.com',
];
const out = [];
(async () => {
  for (const s of stores) {
    try {
      const r = await fetch('https://' + s + '/products.json?limit=50', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      });
      const t = await r.text();
      let kind = '?';
      if (t.startsWith('{') && t.includes('"products"')) kind = 'shopify-json';
      else if (t.includes('<!DOCTYPE')) kind = 'html-page';
      const line = s + ': ' + r.status + ' [' + kind + '] len=' + t.length;
      console.log(line);
      out.push(line);
    } catch (e) {
      const line = s + ': ERR ' + e.message;
      console.log(line);
      out.push(line);
    }
  }
  fs.writeFileSync('probe2.txt', out.join('\n'));
})();
