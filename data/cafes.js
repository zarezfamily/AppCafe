const cafesSeed = [];

for (let i = 1; i <= 100; i++) {
  cafesSeed.push({
    nombre: `Café ${i}`,
    pais: 'Colombia',
    region: 'Huila',
    finca: `Finca ${i}`,
    productor: `Productor ${i}`,
    altura: 1500 + i,
    variedad: 'Caturra',
    proceso: 'Lavado',
    secado: 'Al sol',
    tueste: 'Medio',
    fechaTueste: null,
    notas: 'Chocolate, caramelo, cítricos',
    acidez: 'Media',
    cuerpo: 'Equilibrado',
    regusto: 'Largo y dulce',
    puntuacion: 5,
    sca: 86,
    votos: 10 + i,
    certificaciones: null,
    preparacion: 'V60, espresso',
    precio: 12 + i * 0.2,
    roaster: 'Nomad Coffee',
    formato: '250g',
    image: `https://picsum.photos/seed/cafe-${i}/600/600`,
  });
}

module.exports = cafesSeed;
