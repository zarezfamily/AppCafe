const https = require('https');
const sharp = require('sharp');
function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
            return fetch(res.headers.location).then(resolve).catch(reject);
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () =>
            resolve({ status: res.statusCode, body: Buffer.concat(chunks), headers: res.headers })
          );
        }
      )
      .on('error', reject);
  });
}
(async () => {
  const urls = [
    'https://www.bonka.es/cafe/grano-colombia',
    'https://www.bonka.es/cafe/grano-natural',
    'https://www.bonka.es/cafe/molido-natural-250gr',
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u);
      console.log(u, '->', r.status, r.body.length, 'bytes');
      const html = r.body.toString();
      const imgs = html.match(/https?:\/\/[^"'\s)]+\.(png|jpg|jpeg|webp)/gi);
      if (imgs) {
        const unique = [...new Set(imgs)].filter(
          (i) =>
            !i.includes('favicon') &&
            !i.includes('logo') &&
            !i.includes('icon') &&
            !i.includes('analytics')
        );
        console.log('  Images:', unique.length);
        unique.forEach((i) => console.log('   ', i));
      }
    } catch (e) {
      console.log(u, '-> ERROR', e.message);
    }
  }
  process.exit(0);
})();
