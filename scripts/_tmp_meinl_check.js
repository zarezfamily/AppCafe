const https = require('https');
function fetch(url) {
  return new Promise((res, rej) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location)
          return fetch(r.headers.location).then(res, rej);
        let d = '';
        r.on('data', (c) => (d += c));
        r.on('end', () => res(d));
      })
      .on('error', rej);
  });
}
(async () => {
  const html = await fetch('https://juliusmeinl.com/for-home-use/capsules');
  // Find ALL getmedia URLs
  const imgs = html.match(/getmedia\/[^"'\s)]+/gi) || [];
  const unique = [...new Set(imgs)];
  console.log('ALL getmedia on capsules page:', unique.length);
  unique.forEach((i) => console.log('  ' + i));

  // Also look for capsule-specific image names
  const capsNames =
    html.match(/[Ee]spresso[^"'\s<>]*|[Ll]ungo[^"'\s<>]*|[Rr]istretto[^"'\s<>]*/gi) || [];
  console.log('\nCapsule name patterns:', [...new Set(capsNames)].slice(0, 20));
})();
