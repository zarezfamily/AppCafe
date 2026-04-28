const https = require('https');
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// URLs from my original import JSON
const cafes = require('./cafe-import-siboney.json');
const urlMap = {};
for (const c of cafes) {
  urlMap[c.id] = c.url;
}

function fetchPage(url) {
  return new Promise((resolve) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve(d));
      })
      .on('error', () => resolve(''));
  });
}

function extractMainImage(html) {
  // Try multiple patterns - WordPress lazy loading uses data attributes
  const patterns = [
    // Full fit URL (normal or &amp; encoded)
    /https:\/\/i\d\.wp\.com\/www\.cafesiboney\.com\/wp-content\/uploads\/\d{4}\/\d{2}\/[^"'\s)]+\?fit=\d+(%2C|,)\d+(&amp;|&)ssl=1/gi,
    // data-large-file or data-orig-file
    /https:\/\/i\d\.wp\.com\/www\.cafesiboney\.com\/wp-content\/uploads\/\d{4}\/\d{2}\/[^"'\s?)]+\.jpe?g/gi,
    // Direct wp-content URL
    /https:\/\/www\.cafesiboney\.com\/wp-content\/uploads\/\d{4}\/\d{2}\/[^"'\s?)]+\.jpe?g/gi,
  ];

  for (const re of patterns) {
    const matches = [];
    let m;
    while ((m = re.exec(html)) !== null) {
      const url = m[0].replace(/&amp;/g, '&');
      // Skip tiny thumbnails
      if (url.includes('150x150') || url.includes('100x100') || url.includes('50x50')) continue;
      if (!matches.includes(url)) matches.push(url);
    }
    if (matches.length > 0) {
      // Return first match, adding CDN prefix + fit params if needed
      let best = matches[0];
      if (!best.includes('i0.wp.com')) {
        best = 'https://i0.wp.com/' + best.replace('https://', '');
      }
      if (!best.includes('?')) {
        best += '?fit=1181%2C1181&ssl=1';
      }
      return best;
    }
  }
  return '';
}

(async () => {
  const snap = await db.collection('cafes').where('fuente', '==', 'import_siboney').get();
  console.log('Total Siboney docs:', snap.size);

  let fixed = 0,
    already = 0,
    nofix = 0;
  const batchSize = 5;
  const docs = snap.docs;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (d) => {
        const data = d.data();
        const productUrl = urlMap[d.id] || data.url || '';
        if (!productUrl) return { id: d.id, status: 'nourl' };

        const html = await fetchPage(productUrl);
        const img = extractMainImage(html);

        if (!img) return { id: d.id, status: 'noimg', productUrl };
        if (img === data.officialPhoto) return { id: d.id, status: 'ok' };
        return { id: d.id, status: 'fix', newPhoto: img, productUrl };
      })
    );

    for (const r of results) {
      if (r.status === 'ok') {
        already++;
      } else if (r.status === 'fix') {
        await db.collection('cafes').doc(r.id).update({
          officialPhoto: r.newPhoto,
          bestPhoto: r.newPhoto,
          imageUrl: r.newPhoto,
          foto: r.newPhoto,
          url: r.productUrl,
        });
        console.log('FIXED:', r.id);
        fixed++;
      } else {
        console.log('NO FIX:', r.id, r.status, r.productUrl || '');
        nofix++;
      }
    }
    console.log(`  Progress: ${i + batch.length}/${docs.length}`);
  }

  console.log('\nDone. Fixed:', fixed, 'Already OK:', already, 'No fix:', nofix);
  process.exit(0);
})();
