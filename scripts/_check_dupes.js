const data = require('./scraped_photo_urls.json');
const alipende = Object.entries(data).filter(([k]) => k.startsWith('ahorramas_alipende'));
const urlCount = {};
for (const [id, url] of alipende) {
  const short = url.match(/Assets\/([^/]+)/)?.[1] || url.substring(0, 60);
  if (!urlCount[short]) urlCount[short] = [];
  urlCount[short].push(id.replace('ahorramas_alipende_', ''));
}
for (const [url, ids] of Object.entries(urlCount)) {
  console.log('\n' + url + ' (' + ids.length + ' productos):');
  ids.forEach((id) => console.log('  - ' + id));
}
