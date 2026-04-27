const c = require('./cafe-import-nuevas-marcas-es.json');
console.log('Total:', c.length);
const noPhoto = c.filter((x) => !x.officialPhoto);
console.log('Sin officialPhoto:', noPhoto.length);
noPhoto.slice(0, 5).forEach((x) => console.log('  ', x.nombre, x.marca));
const withPhoto = c.filter((x) => x.officialPhoto);
console.log('Con officialPhoto:', withPhoto.length);
withPhoto
  .slice(0, 3)
  .forEach((x) => console.log('  ', x.nombre, '->', x.officialPhoto.substring(0, 100)));
