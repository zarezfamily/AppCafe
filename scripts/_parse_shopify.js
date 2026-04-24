// Quick scraper to find working image URLs from Hola Coffee
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(Buffer.concat(chunks));
    for (const p of data.products) {
      console.log(p.title + ' | ' + (p.images?.[0]?.src || ''));
    }
  } catch (e) {
    console.log('Parse error:', e.message);
  }
});
