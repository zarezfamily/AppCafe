#!/usr/bin/env node
/**
 * Scrape product details from cremashop.eu for all new brands
 * Get: description, origin, roast, weight, image, price
 * Then create import JSON for Firestore
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const https = require('https');
const fs = require('fs');
const sharp = require('sharp');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchPage(res.headers.location).then(resolve).catch(reject);
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
        res.on('end', () => resolve({ buf: Buffer.concat(chunks), status: res.statusCode }));
      })
      .on('error', reject);
  });
}

// Brand name mapping
const brandMap = {
  'miscela-d-oro': "Miscela d'Oro",
  crema: 'Crema',
  mokaflor: 'Mokaflor',
  lucaffe: 'Lucaffé',
  passalacqua: 'Passalacqua',
  'gringo-nordic': 'Gringo Nordic',
  bialetti: 'Bialetti',
  bergstrands: 'Bergstrands',
  paulig: 'Paulig',
  mokasirs: 'Mokasirs',
  pera: 'Pera',
  'helsingin-kahvipaahtimo': 'Helsingin Kahvipaahtimo',
  arcaffe: 'Arcaffè',
  'johan-nystrom': 'Johan & Nyström',
  'trung-nguyen': 'Trung Nguyen',
  lykke: 'Lykke',
  dallmayr: 'Dallmayr',
  'espoon-kahvipaahtimo': 'Espoon Kahvipaahtimo',
  'good-life-coffee': 'Good Life Coffee',
  jacobs: 'Jacobs',
  burg: 'Burg',
  carraro: 'Carraro',
  rost: 'Röst',
  mokambo: 'Mokambo',
  aromix: 'Aromix',
  saquella: 'Saquella',
  lofbergs: 'Löfbergs',
  'mr-viet': 'Mr. Viet',
  puro: 'Puro',
  'espresso-house': 'Espresso House',
  intenso: 'Intenso',
  carrao: 'Carrao',
  tchibo: 'Tchibo',
  'rwanda-farmers': 'Rwanda Farmers',
  'idee-kaffee': 'Idee Kaffee',
  minges: 'Minges',
};

// Brand origin mapping (country of origin/HQ for the brand)
const brandCountry = {
  "Miscela d'Oro": 'Italia',
  Mokaflor: 'Italia',
  Lucaffé: 'Italia',
  Passalacqua: 'Italia',
  Bialetti: 'Italia',
  Mokasirs: 'Italia',
  Pera: 'Italia',
  Arcaffè: 'Italia',
  Carraro: 'Italia',
  Mokambo: 'Italia',
  Saquella: 'Italia',
  Pellini: 'Italia',
  Intenso: 'Italia',
  Carrao: 'Italia',
  Segafredo: 'Italia',
  Dallmayr: 'Alemania',
  Melitta: 'Alemania',
  Jacobs: 'Alemania',
  Tchibo: 'Alemania',
  'Idee Kaffee': 'Alemania',
  Minges: 'Alemania',
  Burg: 'Alemania',
  Mövenpick: 'Alemania',
  Paulig: 'Finlandia',
  'Helsingin Kahvipaahtimo': 'Finlandia',
  'Espoon Kahvipaahtimo': 'Finlandia',
  'Good Life Coffee': 'Finlandia',
  Löfbergs: 'Suecia',
  'Johan & Nyström': 'Suecia',
  'Gringo Nordic': 'Suecia',
  Bergstrands: 'Suecia',
  Lykke: 'Suecia',
  Röst: 'Suecia',
  'Espresso House': 'Suecia',
  Gevalia: 'Suecia',
  'Trung Nguyen': 'Vietnam',
  'Mr. Viet': 'Vietnam',
  Crema: 'Finlandia',
  Puro: 'Bélgica',
  Aromix: 'Finlandia',
  'Rwanda Farmers': 'Ruanda',
};

function parseDescription(html) {
  // Get main description text from product page
  const descMatch = html.match(
    /<div[^>]*class="[^"]*product-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  );
  if (descMatch) {
    return descMatch[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500);
  }
  // Try meta description
  const metaMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  if (metaMatch) return metaMatch[1].trim();
  return '';
}

function parseSpecs(html) {
  const specs = {};
  // Look for specification table rows
  const specPattern = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  let m;
  while ((m = specPattern.exec(html)) !== null) {
    const key = m[1]
      .replace(/<[^>]+>/g, '')
      .trim()
      .toLowerCase();
    const val = m[2].replace(/<[^>]+>/g, '').trim();
    specs[key] = val;
  }
  // Also try th/td pattern
  const thPattern = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  while ((m = thPattern.exec(html)) !== null) {
    const key = m[1]
      .replace(/<[^>]+>/g, '')
      .trim()
      .toLowerCase();
    const val = m[2].replace(/<[^>]+>/g, '').trim();
    specs[key] = val;
  }
  return specs;
}

function parseImageUrl(html, brandSlug) {
  // Get high-res product image (direct content URL, not cached)
  const imgMatch = html.match(
    new RegExp(
      `content/products/${brandSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[^/]+/(\\d+-[a-f0-9]+)\\.jpg`
    )
  );
  if (imgMatch) {
    return `https://www.cremashop.eu/content/products/${brandSlug}/${imgMatch[0].split(`${brandSlug}/`)[1]}`;
  }
  // Fallback: any product image
  const fallback = html.match(/content\/products\/[^"'\s]+\.jpg/);
  if (fallback) {
    return 'https://www.cremashop.eu/' + fallback[0];
  }
  return null;
}

function inferRoast(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  if (text.includes('light roast') || text.includes('tueste ligero') || text.includes('blonde'))
    return 'light';
  if (
    text.includes('dark roast') ||
    text.includes('tueste oscuro') ||
    text.includes('forte') ||
    text.includes('intenso')
  )
    return 'dark';
  if (text.includes('medium') || text.includes('tueste medio')) return 'medium';
  if (text.includes('espresso')) return 'medium-dark';
  return 'medium';
}

function inferFormat(title, category) {
  if (category === 'ground') return 'ground';
  const t = title.toLowerCase();
  if (t.includes('molido') || t.includes('ground') || t.includes('café molido')) return 'ground';
  if (t.includes('grano') || t.includes('beans') || t.includes('café en grano')) return 'beans';
  return category === 'beans' ? 'beans' : 'ground';
}

function parseWeight(title) {
  const m = title.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/i);
  if (m) {
    let val = parseFloat(m[1].replace(',', '.'));
    const unit = m[2].toLowerCase();
    if (unit === 'kg') return val * 1000 + 'g';
    return val + 'g';
  }
  return '250g';
}

function parsePrice(html) {
  // Look for price
  const priceMatch = html.match(/(\d+)[,.](\d{2})\s*€/);
  if (priceMatch) return parseFloat(priceMatch[1] + '.' + priceMatch[2]);
  const euroMatch = html.match(/€\s*(\d+)[,.](\d{2})/);
  if (euroMatch) return parseFloat(euroMatch[1] + '.' + euroMatch[2]);
  return 0;
}

function computeSCA(data) {
  let score = 72;
  if (data.especie === 'arabica') score += 4;
  if (data.tueste === 'light') score += 3;
  else if (data.tueste === 'medium') score += 2;
  if (data.pais && data.pais.length > 3) score += 2;
  if (data.formato === 'beans') score += 1;
  if (data.descripcion && data.descripcion.length > 50) score += 1;
  if (data.categoria === 'especialidad') score += 5;
  return Math.min(score, 89);
}

(async () => {
  try {
    // Load products
    const products = JSON.parse(fs.readFileSync('/tmp/cremashop_all_products.json'));

    // Filter to new brands only (skip brands we already have)
    const existingBrandSlugs = new Set([
      'illy',
      'melitta',
      'movenpick',
      'starbucks',
      'segafredo',
      'lavazza',
      'pellini',
      'gevalia',
    ]);

    const newProducts = products.filter((p) => !existingBrandSlugs.has(p.brandSlug));
    console.log(`Products to process: ${newProducts.length}`);

    // Process each product - scrape detail page
    const importData = [];
    let processed = 0;
    let errors = 0;

    for (const p of newProducts) {
      processed++;
      if (processed % 20 === 0) {
        console.log(`Progress: ${processed}/${newProducts.length}`);
      }

      try {
        const html = await fetchPage(p.url);

        // Get image URL
        const imgMatch = html.match(/content\/products\/[^"'\s]+\.jpg/);
        let imageUrl = null;
        if (imgMatch) {
          imageUrl = 'https://www.cremashop.eu/' + imgMatch[0];
        }

        // Get description
        const description = parseDescription(html);

        // Get specs
        const specs = parseSpecs(html);

        // Get price
        const price = parsePrice(html);

        const marca = brandMap[p.brandSlug] || p.brandSlug;
        const formato = inferFormat(p.title, p.category);
        const peso = parseWeight(p.title);
        const tueste = inferRoast(p.title, description);

        // Determine origin from specs or title
        let pais = '';
        if (specs.origin) pais = specs.origin;
        else if (specs.origen) pais = specs.origen;
        else {
          // Try to extract from title
          const countries = [
            'Ethiopia',
            'Colombia',
            'Brazil',
            'Kenya',
            'Guatemala',
            'Peru',
            'Costa Rica',
            'Honduras',
            'Nicaragua',
            'Rwanda',
            'Indonesia',
            'India',
            'Vietnam',
            'Mexico',
            'Tanzania',
            'Uganda',
            'El Salvador',
            'Papua New Guinea',
            'Jamaica',
            'Ecuador',
            'Bolivia',
            'Congo',
            'Burundi',
          ];
          for (const c of countries) {
            if (p.title.includes(c)) {
              pais = c;
              break;
            }
          }
        }

        // Map country names to Spanish
        const countryES = {
          Ethiopia: 'Etiopía',
          Colombia: 'Colombia',
          Brazil: 'Brasil',
          Kenya: 'Kenia',
          Guatemala: 'Guatemala',
          Peru: 'Perú',
          'Costa Rica': 'Costa Rica',
          Honduras: 'Honduras',
          Nicaragua: 'Nicaragua',
          Rwanda: 'Ruanda',
          Indonesia: 'Indonesia',
          India: 'India',
          Vietnam: 'Vietnam',
          Mexico: 'México',
          Tanzania: 'Tanzania',
          Uganda: 'Uganda',
          'El Salvador': 'El Salvador',
          'Papua New Guinea': 'Papúa Nueva Guinea',
          Jamaica: 'Jamaica',
          Ecuador: 'Ecuador',
          Bolivia: 'Bolivia',
          Congo: 'Congo',
          Burundi: 'Burundi',
        };
        if (countryES[pais]) pais = countryES[pais];

        // Determine species
        let especie = 'arabica';
        const textLow = (p.title + ' ' + description).toLowerCase();
        if (textLow.includes('robusta')) {
          if (textLow.includes('arabica')) especie = 'blend';
          else especie = 'robusta';
        }

        // Category
        let categoria = 'comercial';
        if (
          textLow.includes('specialty') ||
          textLow.includes('especialidad') ||
          textLow.includes('single origin') ||
          textLow.includes('pure origin')
        ) {
          categoria = 'especialidad';
        } else if (textLow.includes('premium')) {
          categoria = 'premium';
        }

        // Create doc ID
        const docId = `${p.brandSlug}_${p.productSlug}`;

        const cafeData = {
          docId,
          nombre: p.title.replace(/\s*-\s*$/, '').trim(),
          marca,
          descripcion: description || `${marca} ${p.title}`,
          pais: pais || brandCountry[marca] || '',
          formato,
          peso,
          tueste,
          especie,
          categoria,
          precio: price,
          moneda: 'EUR',
          imageUrl: imageUrl,
          url: p.url,
          cremashopId: p.productId,
          origen: brandCountry[marca] || '',
        };

        cafeData.sca_score = computeSCA(cafeData);

        importData.push(cafeData);
      } catch (e) {
        errors++;
        console.error(`Error processing ${p.url}: ${e.message}`);
      }

      // Small delay to be respectful
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log(`\nProcessed: ${processed}, Errors: ${errors}`);
    console.log(`Import data entries: ${importData.length}`);

    // Filter out products without images
    const withImages = importData.filter((d) => d.imageUrl);
    console.log(`Products with images: ${withImages.length}`);
    console.log(`Products without images: ${importData.length - withImages.length}`);

    // Save import data
    fs.writeFileSync('/tmp/cremashop_import.json', JSON.stringify(withImages, null, 2));
    console.log(`\nSaved to /tmp/cremashop_import.json`);

    // Summary by brand
    const byBrand = {};
    for (const d of withImages) {
      if (!byBrand[d.marca]) byBrand[d.marca] = 0;
      byBrand[d.marca]++;
    }
    console.log('\nImport by brand:');
    for (const [b, c] of Object.entries(byBrand).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${b}: ${c}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();
