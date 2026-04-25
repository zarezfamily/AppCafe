#!/usr/bin/env node
const https = require('https');
const fs = require('fs');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrl(res.headers.location).then(resolve).catch(reject);
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function downloadBuf(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadBuf(res.headers.location).then(resolve).catch(reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

(async () => {
  // 1) Find Starbucks Ristretto Shot image
  console.log('=== Looking for Ristretto Shot image ===');

  // Try starbucksathome.com
  try {
    const html = await fetchUrl('https://www.starbucksathome.com/es');
    const imgs = html.match(/https:\/\/www\.starbucksathome\.com\/es\/media\/image\/\d+/g);
    if (imgs) {
      console.log('StarbucksAtHome media images count:', imgs.length);
      // Image 2651 is the one referenced for ristretto shot
      // Let's download it and check size
      const buf = await downloadBuf('https://www.starbucksathome.com/es/media/image/2651');
      console.log('Image 2651 size:', buf.length);
      fs.writeFileSync('/tmp/cafe_photos/sb_ristretto_test.jpg', buf);
    }
  } catch (e) {
    console.log('starbucksathome error:', e.message);
  }

  // 2) Check ametllerorigen for Starbucks Colombia image
  console.log('\n=== Checking ametllerorigen for Starbucks Colombia ===');
  try {
    const html = await fetchUrl(
      'https://www.ametllerorigen.com/es/cafe-tostado-grano-colombia-starbucks-450g/p'
    );
    // Look for vtexassets image URLs
    const imgs = html.match(/https:\/\/[^"'\s]+vtexassets[^"'\s]+/g);
    if (imgs) {
      console.log(
        'VTEX images:',
        imgs.filter((u) => u.includes('jpg') || u.includes('png')).slice(0, 5)
      );
    }
    // Also look for any product image
    const allImgs = html.match(/https:\/\/[^"'\s]+\.(jpg|png|webp)/gi);
    if (allImgs) {
      const unique = [...new Set(allImgs)];
      console.log(
        'All images:',
        unique.filter((u) => !u.includes('icon') && !u.includes('logo') && !u.includes('svg'))
      );
    }
  } catch (e) {
    console.log('ametllerorigen error:', e.message);
  }

  // 3) Check cremashop for better bean-format Starbucks images
  // The user mentioned: decaf espresso roast borrosa, caffe verona borrosa
  // Those are bean format in our DB but we downloaded capsule images from cremashop
  // Let's check if there are bean-format images available
  console.log('\n=== Getting bean-format Starbucks images from cremashop ===');
  const beanProducts = [
    {
      slug: 'espresso-roast/10753',
      ourId: 'starbucks-starbucks-espresso-roast',
      label: 'Espresso Roast beans',
    },
    {
      slug: 'blonde-espresso-roast/10752',
      ourId: 'starbucks_7613036932073',
      label: 'Blonde Espresso Roast beans',
    },
  ];

  for (const bp of beanProducts) {
    const html = await fetchUrl('https://www.cremashop.eu/es/products/starbucks/' + bp.slug);
    const match = html.match(/product_lg\/content\/products\/starbucks\/[^"'\s]+/);
    if (match) {
      const url = 'https://www.cremashop.eu/media/cache/' + match[0].replace(/&amp;/g, '&');
      const buf = await downloadBuf(url);
      console.log(`${bp.label}: ${url} (${buf.length} bytes)`);
      fs.writeFileSync('/tmp/cafe_photos/sb_' + bp.slug.split('/')[0] + '.jpg', buf);
    }
  }

  // 4) Download full-page Starbucks images from cremashop product_lg (the larger size)
  // Try the product_hdpi images which are 2x resolution
  console.log('\n=== Trying hdpi images from cremashop ===');
  const hdpiProducts = [
    {
      slug: 'nespresso-espresso-roast-decaf/13312',
      label: 'Decaf Espresso Caps',
    },
    { slug: 'nespresso-caffe-verona/13321', label: 'Caffe Verona Caps' },
    {
      slug: 'nespresso-single-origin-colombia/13311',
      label: 'Colombia Caps',
    },
    {
      slug: 'nespresso-blonde-espresso-decaf/13308',
      label: 'Blonde Decaf Caps',
    },
  ];

  for (const hp of hdpiProducts) {
    const html = await fetchUrl('https://www.cremashop.eu/es/products/starbucks/' + hp.slug);
    // Try different cache sizes
    for (const size of ['gallery_full', 'product_lg_hdpi', 'gallery_square_hdpi']) {
      const re = new RegExp(size + '/content/products/starbucks/' + '[^"\'\\s]+', 'g');
      const match = html.match(re);
      if (match) {
        const url = 'https://www.cremashop.eu/media/cache/' + match[0].replace(/&amp;/g, '&');
        const buf = await downloadBuf(url);
        console.log(`${hp.label} (${size}): ${buf.length} bytes`);
        break;
      }
    }
  }

  console.log('\n=== Done ===');
})();
