/*
  Importa cafes Pellini vendidos en Amazon ES a Firestore.

  Fuente:
    https://www.amazon.es/s?k=Pellini+Caf%C3%A9&i=grocery

  Estrategia:
    - Recorre varias paginas de resultados de Amazon ES para la busqueda Pellini Cafe.
    - Extrae ASINs unicos del listado.
    - Lee cada ficha /dp/<ASIN> para obtener nombre, precio, imagen y bullets.
    - Filtra sets y articulos que no sean cafe Pellini.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const { chromium } = require('playwright');

const SEARCH_PAGES = [1, 2, 3, 4];
const SEARCH_URL = 'https://www.amazon.es/s?k=Pellini+Caf%C3%A9&i=grocery';
const BASE_SITE = 'https://www.amazon.es';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON ||
  path.resolve(process.cwd(), 'scripts/cafe-import-pellini-amazon-real.json');
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const LIMIT = Number.parseInt(process.env.LIMIT || '', 10);
const CAFES_COLLECTION = 'cafes';
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  Referer: 'https://www.google.com/',
};

function normalizeText(value) {
  return String(value || '')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForSlug(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function slugify(value) {
  return normalizeForSlug(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
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

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(html) {
  return normalizeText(
    decodeHtmlEntities(
      String(html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
    )
  );
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    redirect: 'follow',
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP_${response.status} ${url} ${text.slice(0, 200)}`);
  }
  return text;
}

function ensureAdmin() {
  if (admin.apps.length) return;
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function parsePrice(text) {
  const clean = normalizeText(text).replace(/\./g, '').replace(',', '.');
  const value = Number.parseFloat(clean);
  return Number.isFinite(value) ? value : null;
}

function parseQuantity(text, format) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (format === 'capsules') {
    const cap = haystack.match(/(\d+)\s*(capsulas|caps|pods|monodosis|ese)\b/);
    if (cap) return Number.parseInt(cap[1], 10);
  }
  const pack = haystack.match(/(\d+)\s*(?:paquetes|x)\s*de\s*(\d+)\s*g\b/);
  if (pack) return Number.parseInt(pack[1], 10) * Number.parseInt(pack[2], 10);
  const oneBy = haystack.match(/1\s*x\s*(\d+)\s*kg\b/);
  if (oneBy) return Number.parseInt(oneBy[1], 10) * 1000;
  const kilo = haystack.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kilo) return Math.round(Number.parseFloat(kilo[1].replace(',', '.')) * 1000);
  const gram = haystack.match(/(\d+)\s*g\b/);
  if (gram) return Number.parseInt(gram[1], 10);
  return format === 'capsules' ? 18 : null;
}

function inferFormat(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('capsula') || haystack.includes('monodosis') || haystack.includes('ese')) {
    return 'capsules';
  }
  if (haystack.includes('molido') || haystack.includes('moka')) return 'ground';
  return 'beans';
}

function inferSystem(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('ese')) return 'ese';
  return '';
}

function inferCategory(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (
    haystack.includes('100 arabica') ||
    haystack.includes('100% arabica') ||
    haystack.includes('bio')
  ) {
    return 'specialty';
  }
  return 'daily';
}

function inferOrigin(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('100 arabica') || haystack.includes('100% arabica')) return 'Blend arabica';
  if (haystack.includes('arabica y robusta')) return 'Blend arabica/robusta';
  return '';
}

function inferRoast(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('tueste delicado')) return 'light';
  if (haystack.includes('tueste oscuro') || haystack.includes('tueste decidido')) return 'dark';
  return 'medium';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    ['cacao', 'cacao'],
    ['citric', 'citrico'],
    ['regaliz', 'regaliz'],
    ['aroma', 'aromatico'],
    ['envolvente', 'envolvente'],
    ['armonioso', 'armonioso'],
    ['aterciopelado', 'aterciopelado'],
    ['intenso', 'intenso'],
    ['suave', 'suave'],
  ];
  return [
    ...new Set(dictionary.filter(([needle]) => haystack.includes(needle)).map(([, note]) => note)),
  ];
}

function extractTitle(html) {
  const title =
    html.match(/<span id="productTitle"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ||
    html.match(/<title>([^<]+)<\/title>/i)?.[1] ||
    '';
  return normalizeText(decodeHtmlEntities(title))
    .replace(/\s*: Amazon\.[^:]+:.*$/i, '')
    .trim();
}

function extractImage(html) {
  return (
    normalizeText(html.match(/data-old-hires="([^"]+)"/i)?.[1] || '') ||
    normalizeText(html.match(/"hiRes":"([^"]+)"/i)?.[1] || '').replace(/\\u0026/g, '&') ||
    normalizeText(html.match(/"large":"([^"]+)"/i)?.[1] || '').replace(/\\u0026/g, '&')
  );
}

function extractPrice(html) {
  const jsonPrice = html.match(/"priceAmount":\s*"?(.*?)"?(,|})/i)?.[1] || '';
  if (jsonPrice) return parsePrice(jsonPrice.replace(/,$/, ''));
  const whole = normalizeText(html.match(/a-price-whole">([^<]+)/i)?.[1] || '');
  const fraction = normalizeText(html.match(/a-price-fraction">([^<]+)/i)?.[1] || '');
  if (whole) return parsePrice(`${whole},${fraction || '00'}`);
  return null;
}

function extractBullets(html) {
  const source = String(html || '');
  const matches = [...source.matchAll(/<span class="a-list-item">\s*([\s\S]*?)\s*<\/span>/gi)];
  return uniqueBy(
    matches
      .map((match) => stripTags(match[1]))
      .filter(Boolean)
      .filter((text) => text.length > 8)
      .filter((text) => !/^imagen no disponible/i.test(text))
      .filter((text) => !/^nº\d/i.test(text))
      .filter((text) => !/^alimentacion/i.test(text))
      .filter((text) => !/^cafe, te/i.test(text))
      .filter((text) => !/^cafe$/i.test(text))
      .filter((text) => !/^granos de cafe enteros$/i.test(text))
      .filter((text) => !/^cafe de grano tostado$/i.test(text)),
    (text) => text
  );
}

function shouldSkip(name, description) {
  const haystack = normalizeForSlug(`${name} ${description}`).toLowerCase();
  return (
    !haystack.includes('pellini') ||
    haystack.includes('set de degustacion') ||
    haystack.includes('degustacion') ||
    haystack.includes('gift box') ||
    haystack.includes('multigusto') ||
    haystack.includes('2 latas') ||
    haystack.includes(' & ') ||
    haystack.includes('mug') ||
    haystack.includes('taza')
  );
}

async function discoverAsins() {
  const asins = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    locale: 'es-ES',
    userAgent: REQUEST_HEADERS['User-Agent'],
  });

  try {
    for (const pageNumber of SEARCH_PAGES) {
      const url = `${SEARCH_URL}&page=${pageNumber}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(3500);
      const html = await page.content();
      const found = [...html.matchAll(/data-asin="([A-Z0-9]{10})"/g)].map((match) => match[1]);
      asins.push(...found);
    }
  } finally {
    await page.close();
    await browser.close();
  }

  const unique = uniqueBy(asins.filter(Boolean), (asin) => asin);
  return Number.isFinite(LIMIT) ? unique.slice(0, LIMIT) : unique;
}

async function enrichAsin(asin, now) {
  const url = `${BASE_SITE}/dp/${asin}`;
  const html = await fetchText(url);
  const name = extractTitle(html);
  const bullets = extractBullets(html);
  const description = bullets.join(' ');
  if (!name || shouldSkip(name, description)) return null;

  const detailText = `${name} ${description}`;
  const format = inferFormat(detailText);
  const category = inferCategory(detailText);
  const image = extractImage(html);

  return {
    id: `pellini_amazon_${asin.toLowerCase()}`,
    fuente: 'pellini_amazon',
    fuentePais: 'ES',
    fuenteUrl: url,
    urlProducto: url,

    nombre: name,
    name,
    marca: 'Pellini',
    roaster: 'Pellini',

    ean: '',
    normalizedEan: '',
    sku: asin,
    mpn: '',
    asin,

    descripcion: description,
    description,

    category,
    coffeeCategory: category === 'specialty' ? 'specialty' : 'daily',
    isSpecialty: category === 'specialty',
    legacy: false,

    formato: format,
    format,
    sistemaCapsula: format === 'capsules' ? inferSystem(detailText) : '',
    tipoProducto:
      format === 'capsules'
        ? 'capsulas de cafe'
        : format === 'ground'
          ? 'cafe molido'
          : 'cafe en grano',
    cantidad: parseQuantity(detailText, format),
    intensidad: null,
    tueste: inferRoast(detailText),
    roastLevel: inferRoast(detailText),
    pais: inferOrigin(detailText),
    origen: inferOrigin(detailText),
    proceso: '',
    notas: inferNotes(detailText).join(', '),
    notes: inferNotes(detailText).join(', '),
    decaf: /descafeinad|decaf/i.test(normalizeForSlug(detailText)),

    precio: extractPrice(html),
    currency: 'EUR',
    certificaciones: /\bbio\b|biologica|biologico|organica|organico/i.test(
      normalizeForSlug(detailText)
    )
      ? 'organico'
      : '',
    isBio: /\bbio\b|biologica|biologico|organica|organico/i.test(normalizeForSlug(detailText)),
    inStock: !/No disponible|Actualmente no disponible/i.test(html),

    fecha: now,
    puntuacion: 0,
    votos: 0,

    officialPhoto: image,
    bestPhoto: image,
    imageUrl: image,
    foto: image,

    status: 'approved',
    reviewStatus: 'approved',
    provisional: false,
    appVisible: true,
    scannerVisible: true,
    adminReviewedAt: now,
    updatedAt: now,
    approvedAt: now,
    createdAt: now,
    importMeta: {
      importedAt: now,
      sourceType: 'amazon_search',
      sourceSearchUrl: SEARCH_URL,
      sourceAsin: asin,
      bulletsCount: bullets.length,
    },
  };
}

async function main() {
  const now = new Date().toISOString();
  const asins = await discoverAsins();

  console.log(`[PELLINI] Search pages: ${SEARCH_PAGES.length}`);
  console.log(`[PELLINI] ASINs discovered: ${asins.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const asin of asins) {
    try {
      const cafe = await enrichAsin(asin, now);
      if (!cafe) continue;
      cafes.push(cafe);
      console.log(`[PELLINI] Prepared: ${cafe.nombre}`);
    } catch (error) {
      console.log(`[PELLINI] Skip error: ${asin} -> ${error.message}`);
    }
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[PELLINI] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

  ensureAdmin();
  const db = admin.firestore();

  let written = 0;
  for (const cafe of cafes) {
    const { id, ...payload } = cafe;
    if (!id) continue;
    if (!DRY_RUN) {
      await db.collection(CAFES_COLLECTION).doc(id).set(payload, { merge: true });
    }
    written += 1;
  }

  console.log(`[PELLINI] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[PELLINI] Error:', error?.stack || error);
  process.exit(1);
});
