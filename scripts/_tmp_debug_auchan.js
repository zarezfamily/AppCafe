const fs = require('fs');
const path = require('path');
const dir = path.join(require('os').homedir(), 'Downloads', 'auchan');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.webp'));
let caps = 0;
const noCaps = [];
files.forEach((f) => {
  if (/c[aá]psulas?|capsulas/i.test(f)) caps++;
  else noCaps.push(f);
});
console.log('Capsulas detected:', caps);
console.log('Not capsulas:', noCaps.length);
noCaps.forEach((f) => console.log('  ' + f.slice(0, 90)));
