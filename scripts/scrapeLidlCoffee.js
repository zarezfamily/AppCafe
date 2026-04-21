const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const START_URLS = [
  'https://www.lidl.es/c/despensa-cafe/s10089293',
  'https://www.lidl.es/c/super-finde-proxima-semana/a10089609',
];

const OUTPUT_PATH = path.join(__dirname, 'cafe-import-lidl-real.json');

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function parseWeight(text) {
  const t = normalizeText(text).toLowerCase();

  const gMatch = t.match(/(\d+(?:[.,]\d+)?)\s*g\b/);
  if (gMatch) {
    return Math.round(parseFloat(gMatch[1].replace(',', '.')));
  }

  const kgMatch = t.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kgMatch) {
    return Math.round(parseFloat(kgMatch[1].replace(',', '.')) * 1000);
  }

  const capsMatch = t.match(/(\d+)\s*c[aá]psulas?\b/);
  if (capsMatch) {
    return `${capsMatch[1]} cápsulas`;
  }

  return null;
}

function parseIntensity(text) {
  const t = normalizeText(text).toLowerCase();

  const slashMatch = t.match(/intensidad\s*(\d+)\s*\/\s*10/);
  if (slashMatch) return Number(slashMatch[1]);

  const plainMatch = t.match(/intensidad\s*(\d{1,2})\b/);
  if (plainMatch) return Number(plainMatch[1]);

  return null;
}

function inferFormat(text) {
  const t = normalizeText(text).toLowerCase();

  if (t.includes('cápsulas') || t.includes('capsulas')) return 'capsulas';
  if (t.includes('molido')) return 'ground';
  if (t.includes('grano')) return 'beans';
  if (t.includes('soluble') || t.includes('instant')) return 'soluble';

  return '';
}

function inferBrand(text) {
  const t = normalizeText(text);

  if (/bellarom/i.test(t)) return 'Bellarom';
  if (/bio organic/i.test(t)) return 'Bio Organic';
  if (/l'or/i.test(t)) return "L'OR";

  return 'Lidl';
}

function inferCountry(text) {
  const countries = [
    'Perú',
    'Colombia',
    'Honduras',
    'Etiopía',
    'México',
    'Brasil',
    'Tanzania',
    'Guatemala',
    'Costa Rica',
    'Italia',
    'Portugal',
  ];

  const t = normalizeText(text).toLowerCase();
  const found = countries.find((c) => t.includes(c.toLowerCase()));
  return found || 'Mezcla';
}

function inferNotes(text) {
  const t = normalizeText(text).toLowerCase();
  const notes = [];

  const dictionary = [
    'chocolate',
    'cacao',
    'frutal',
    'afrutado',
    'cítrico',
    'floral',
    'suave',
    'intenso',
    'cremoso',
    'tostado',
    'equilibrado',
    'amargo',
  ];

  for (const note of dictionary) {
    if (t.includes(note)) notes.push(note);
  }

  return uniqueBy(notes, (x) => x);
}

function looksLikeRealProductImage(url) {
  const u = normalizeText(url).toLowerCase();

  if (!u.startsWith('http://') && !u.startsWith('https://')) return false;
  if (u.endsWith('.svg')) return false;
  if (u.includes('/logos/')) return false;
  if (u.includes('logo')) return false;
  if (u.includes('placeholder')) return false;
  if (u.includes('dummy')) return false;

  return true;
}

function looksLikeCoffeeName(name) {
  const n = normalizeText(name).toLowerCase();

  if (!n || n.length < 6) return false;

  const positive = [
    'cafe',
    'café',
    'espresso',
    'capsulas',
    'cápsulas',
    'grano',
    'molido',
    'lungo',
    'ristretto',
    'descafeinado',
    'bellarom',
    "l'or",
    'bio organic',
  ];

  const negative = [
    'marcas lidl',
    'ganadores de sorteos',
    'cocina y cuidado del hogar',
    'hogar',
    'sorteos',
    'promociones',
    'promocion',
    'super finde',
    'ofertas',
    'folleto',
    'catálogo',
    'catalogo',
  ];

  if (negative.some((x) => n.includes(x))) return false;
  return positive.some((x) => n.includes(x));
}

async function extractMeta(page) {
  return page.evaluate(() => {
    const getMeta = (selector, attr = 'content') =>
      document.querySelector(selector)?.getAttribute(attr) || '';

    const title =
      getMeta('meta[property="og:title"]') ||
      document.querySelector('h1')?.textContent ||
      document.title ||
      '';

    const description =
      getMeta('meta[property="og:description"]') || getMeta('meta[name="description"]') || '';

    const image =
      getMeta('meta[property="og:image"]') ||
      getMeta('meta[name="twitter:image"]') ||
      document.querySelector('img')?.src ||
      '';

    return {
      title,
      description,
      image,
      bodyText: document.body?.innerText || '',
    };
  });
}

async function discoverLinks(page, baseUrl) {
  const hrefs = await page.$$eval('a[href]', (els) =>
    els.map((a) => a.getAttribute('href')).filter(Boolean)
  );

  const links = hrefs
    .map((href) => {
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const coffeeLinks = links.filter((url) => {
    const u = url.toLowerCase();
    return (
      u.includes('/ofertas/') ||
      u.includes('/c/') ||
      u.includes('cafe') ||
      u.includes('cafes') ||
      u.includes('capsulas') ||
      u.includes('espresso') ||
      u.includes('bellarom')
    );
  });

  return uniqueBy(coffeeLinks, (x) => x);
}

async function scrapePage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const meta = await extractMeta(page);
  const blob = `${meta.title} ${meta.description} ${meta.bodyText}`;
  const text = normalizeText(blob);

  const nombre = normalizeText(meta.title || '')
    .replace(/\s+\|\s+Lidl.*$/i, '')
    .replace(/\s+\|\s+.*$/i, '');

  if (!looksLikeCoffeeName(nombre)) return null;

  const foto = meta.image && /^https?:\/\//i.test(meta.image) ? meta.image : '';
  if (!looksLikeRealProductImage(foto)) return null;

  const looksCoffee = /cafe|caf[eé]|capsulas|cápsulas|espresso|lungo|ristretto|bellarom/i.test(
    text
  );

  if (!looksCoffee) return null;

  const marca = inferBrand(text);
  const formato = inferFormat(text);
  const peso = parseWeight(text);
  const intensidad = parseIntensity(text);
  const pais = inferCountry(text);
  const notas = inferNotes(text);

  return {
    nombre,
    marca,
    roaster: marca,
    formato,
    peso,
    pais,
    intensidad,
    notas,
    fuente: 'Lidl',
    fuenteUrl: url,
    officialPhoto: foto,
    foto,
    ean: '',
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 ETIOVE/1.0',
  });

  const allLinks = [];

  for (const startUrl of START_URLS) {
    try {
      await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const links = await discoverLinks(page, startUrl);
      allLinks.push(startUrl, ...links);
      console.log(`🔎 Descubiertos desde ${startUrl}: ${links.length} enlaces`);
    } catch (error) {
      console.warn(`⚠️ No se pudo abrir ${startUrl}: ${error.message}`);
    }
  }

  const uniqueLinks = uniqueBy(allLinks, (x) => x);
  const results = [];

  for (const url of uniqueLinks) {
    try {
      const item = await scrapePage(page, url);
      if (!item) continue;

      results.push(item);
      console.log(`✅ ${item.nombre}`);
    } catch (error) {
      console.warn(`⚠️ Error en ${url}: ${error.message}`);
    }
  }

  const deduped = uniqueBy(results, (x) => slugify(`${x.marca}-${x.nombre}`));
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(deduped, null, 2), 'utf8');

  console.log('\n==============================');
  console.log(`✅ Cafés exportados: ${deduped.length}`);
  console.log(`📄 Archivo: ${OUTPUT_PATH}`);
  console.log('==============================\n');

  await browser.close();
}

main().catch((error) => {
  console.error('❌ Error fatal en scraper Lidl:', error);
  process.exit(1);
});
