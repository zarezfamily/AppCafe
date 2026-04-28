const fs = require('fs');
const out = [];
const stores = [
  'threemarkscoffee.com',
  'www.threemarkscoffee.com',
  'www.misioncafe.com',
  'misioncafe.com',
  'www.puchero.coffee',
  'puchero.coffee',
  'www.anomalacoffee.com',
  'anomalacoffee.com',
  'misterwilson.es',
  'www.misterwilson.es',
  'tomacafe.es',
  'www.tomacafe.es',
  'hiddencoffeeroasters.com',
  'www.hiddencoffeeroasters.com',
  'mokita.es',
  'mokitacoffee.com',
  'www.mokita.es',
  'tomacafe.com',
];
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
      console.log(s + ': ' + r.status + ' [' + kind + '] len=' + t.length);
      out.push(s + ': ' + r.status + ' [' + kind + '] len=' + t.length);
    } catch (e) {
      console.log(s + ': ERR ' + e.message);
      out.push(s + ': ERR ' + e.message);
    }
  }
  fs.writeFileSync('probe.txt', out.join('\n'));
})();
