const fs = require('fs');

const brands = [
  'Nomad Coffee',
  'Hola Coffee',
  'Right Side Coffee',
  'Hidden Coffee Roasters',
  'Syra Coffee',
  'The Fix Coffee',
  'Ineffable Coffee',
  'Puchero Coffee',
  'Cafes El Magnifico',
  'Sibarist',
];

const coffees = [];

brands.forEach((brand) => {
  for (let i = 1; i <= 10; i++) {
    const id = `${brand}-${i}`.toLowerCase().replace(/\s+/g, '-');

    coffees.push({
      id,
      name: `Selección Especial ${i}`,
      brand,
      roaster: brand,
      country: 'Etiopía',
      region: 'Yirgacheffe',
      species: 'Arabica',
      variety: ['Heirloom'],
      process: 'Lavado',
      roastLevel: 'Medio',
      score: 85 + Math.floor(Math.random() * 5),
      flavorNotes: ['floral', 'cítrico', 'dulce'],
      body: 'Ligero',
      acidity: 'Alta',
      sweetness: 'Alta',
      format: 'Grano',
      weightGrams: 250,
      ean: '',
      price: {
        amount: 12 + Math.floor(Math.random() * 8),
        currency: 'EUR',
      },
      buyUrl: 'https://etiove.com',
      imageCover: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93',
      images: ['https://images.unsplash.com/photo-1509042239860-f550ce710b93'],
      description: `Café de especialidad seleccionado por ${brand} con perfil equilibrado.`,
      recommendedMethods: ['V60', 'Aeropress'],
      availability: 'active',
      sourceType: 'seed',
      searchTokens: ['cafe', 'especialidad', brand.toLowerCase()],
    });
  }
});

// crear carpeta si no existe
if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
}

// guardar archivo
fs.writeFileSync('data/spain-specialty-coffees.json', JSON.stringify(coffees, null, 2));

console.log('✅ JSON generado en data/spain-specialty-coffees.json');
