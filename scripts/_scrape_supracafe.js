/**
 * Fetch Supracafé products from their Shopify API and build import JSON.
 * Only includes products with product_type "Cafe" (not Barista, Té, Tazas, etc.)
 */
const fs = require('fs');

(async () => {
  let allProducts = [];
  let page = 1;
  let url = 'https://www.supracafe.com/products.json?limit=250';

  while (url) {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    const data = await r.json();
    if (!data.products || data.products.length === 0) break;
    allProducts = allProducts.concat(data.products);
    if (data.products.length < 250) break;
    page++;
    url = `https://www.supracafe.com/products.json?limit=250&page=${page}`;
  }

  console.log(`Fetched ${allProducts.length} total products`);

  // Filter only coffee products
  const coffees = allProducts.filter((p) => p.product_type === 'Cafe' || p.product_type === 'cafe');
  console.log(`Coffee products: ${coffees.length}`);

  const cafes = coffees
    .map((p) => {
      const img = p.images && p.images.length > 0 ? p.images[0].src : '';
      const firstVariant = p.variants && p.variants[0];
      const price = firstVariant ? parseFloat(firstVariant.price) : null;

      // Extract tasting notes from body_html
      const bodyText = (p.body_html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const notasMatch = bodyText.match(/Notas(?:\s+de\s+cata)?:\s*([^.]+)/i);
      const notas = notasMatch ? notasMatch[1].trim() : '';

      const perfilMatch = bodyText.match(/Perfil:\s*([^.]+)/i);
      const perfil = perfilMatch ? perfilMatch[1].trim() : '';

      const procesoMatch = bodyText.match(/Proceso:\s*([^.]+)/i);
      const proceso = procesoMatch ? procesoMatch[1].trim().replace(/\s*Variedades.*/, '') : '';

      const variedadesMatch = bodyText.match(/Variedades:\s*([^.]+)/i);
      const variedades = variedadesMatch ? variedadesMatch[1].trim() : '';

      // Detect format
      let formato = 'grano';
      const titleLow = p.title.toLowerCase();
      const handleLow = p.handle.toLowerCase();
      if (
        handleLow.includes('capsul') ||
        titleLow.includes('cápsul') ||
        titleLow.includes('capsul')
      ) {
        formato = 'capsule';
      } else if (titleLow.includes('soluble') || titleLow.includes('liofiliz')) {
        formato = 'instant';
      }

      // Detect sistema capsula
      let sistemaCapsula = '';
      if (handleLow.includes('nespresso') || bodyText.toLowerCase().includes('nespresso')) {
        sistemaCapsula = 'nespresso';
      } else if (handleLow.includes('disco') || bodyText.toLowerCase().includes('formato disco')) {
        sistemaCapsula = 'nespresso_pro';
      }

      // Detect origin country
      let pais = 'Colombia';
      if (titleLow.includes('etiopía') || titleLow.includes('etiopia')) pais = 'Etiopía';
      else if (titleLow.includes('kenya') || titleLow.includes('kenia')) pais = 'Kenia';
      else if (titleLow.includes('costa rica')) pais = 'Costa Rica';
      else if (titleLow.includes('brasil')) pais = 'Brasil';
      else if (titleLow.includes('descafeinado swiss')) pais = 'Colombia';

      const isDecaf = /descaf|decaf/i.test(titleLow) || /descaf|decaf/i.test(handleLow);
      const isBio = /ecológi|organic|bio/i.test(titleLow) || /ecologico/i.test(handleLow);

      const id = 'supracafe_' + p.handle.replace(/-/g, '_').replace(/[^a-z0-9_]/g, '');

      return {
        id,
        nombre: p.title,
        marca: 'Supracafé',
        roaster: 'Supracafé',
        ean: 'N/A',
        descripcion: `${p.title}. Café de especialidad de Supracafé.${perfil ? ' Perfil: ' + perfil + '.' : ''}`,
        coffeeCategory: 'specialty',
        isSpecialty: true,
        formato,
        sistemaCapsula,
        tipoProducto:
          formato === 'capsule'
            ? 'capsulas nespresso'
            : formato === 'instant'
              ? 'cafe soluble'
              : 'cafe en grano',
        cantidad: formato === 'capsule' ? 10 : 1,
        tueste: 'medio',
        pais,
        origen: pais,
        notas: notas || perfil,
        decaf: isDecaf,
        precio: price,
        isBio,
        officialPhoto: img,
      };
    })
    .filter((c) => c.officialPhoto); // Must have photo

  const outPath = 'scripts/cafe-import-supracafe.json';
  fs.writeFileSync(outPath, JSON.stringify(cafes, null, 2));
  console.log(`Wrote ${cafes.length} Supracafé coffees to ${outPath}`);
})();
