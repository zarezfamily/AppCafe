/*
  Enriquece precios de cafes activos que siguen sin `precio` en Firestore.

  Estrategia:
    1) Intenta extraer precio desde la ficha origen:
       - Shopify product.js
       - API de Mercadona
       - JSON-LD/meta/regex en HTML
       - parsers puntuales para Amazon
    2) Si la ficha no expone precio, intenta encontrar ofertas con Google Shopping.

  Uso:
    node scripts/enrich_prices_from_sources.js
    APPLY=true node scripts/enrich_prices_from_sources.js
    SOURCE_FILTER=bonka LIMIT=20 node scripts/enrich_prices_from_sources.js
    NO_GOOGLE=true SOURCE_FILTER=lavazza node scripts/enrich_prices_from_sources.js
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const APPLY = String(process.env.APPLY || '').toLowerCase() === 'true';
const LIMIT = Number.parseInt(process.env.LIMIT || '', 10);
const SOURCE_FILTER = normalizeText(process.env.SOURCE_FILTER || '').toLowerCase();
const NO_GOOGLE = String(process.env.NO_GOOGLE || '').toLowerCase() === 'true';
const FETCH_TIMEOUT_MS = Number.parseInt(process.env.FETCH_TIMEOUT_MS || '15000', 10);
const REPORT_PATH = path.resolve(process.cwd(), 'scripts/cafes-price-enrichment-report.json');
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const SOURCE_PAGE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

const API_REQUEST_HEADERS = {
  ...SOURCE_PAGE_HEADERS,
  Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
};

const GOOGLE_REQUEST_HEADERS = {
  ...SOURCE_PAGE_HEADERS,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
  Referer: 'https://www.google.com/',
};

function normalizeText(value) {
  return String(value || '')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function decodeHtmlText(value) {
  return String(value || '')
    .replace(/\\u003d/g, '=')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u00a0/g, ' ')
    .replace(/\\u20ac/g, 'EUR')
    .replace(/\\\//g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parsePrice(value, options = {}) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    if (options.cents === true) return Number((value / 100).toFixed(2));
    return Number(value.toFixed(2));
  }

  const raw = normalizeText(value);
  if (!raw) return null;

  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  const digitsOnly = raw.replace(/\D/g, '');

  let normalized = raw.replace(/[^\d,.-]/g, '');
  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = normalized.replace(',', '.');
  }

  let parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  if (options.cents === true) {
    parsed = parsed / 100;
  } else if (
    options.integerMeansCents === true &&
    !hasComma &&
    !hasDot &&
    /^\d+$/.test(digitsOnly)
  ) {
    parsed = parsed / 100;
  }

  parsed = Number(parsed.toFixed(2));
  return parsed > 0 ? parsed : null;
}

async function fetchText(url, extraHeaders = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const response = await fetch(url, {
    headers: { ...SOURCE_PAGE_HEADERS, ...extraHeaders },
    redirect: 'follow',
    signal: controller.signal,
  });
  try {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP_${response.status} ${url} ${text.slice(0, 180)}`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, extraHeaders = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const response = await fetch(url, {
    headers: { ...API_REQUEST_HEADERS, ...extraHeaders },
    redirect: 'follow',
    signal: controller.signal,
  });
  try {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP_${response.status} ${url} ${text.slice(0, 180)}`);
    }
    const parsed = safeJsonParse(text);
    if (!parsed) {
      throw new Error(`INVALID_JSON ${url} ${text.slice(0, 180)}`);
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

function collectPriceCandidates(obj, out = [], trail = []) {
  if (!obj || typeof obj !== 'object') return out;

  if (Array.isArray(obj)) {
    for (const item of obj) collectPriceCandidates(item, out, trail);
    return out;
  }

  const currency = normalizeText(
    obj.priceCurrency || obj.currency || obj.currencyCode || obj.price_currency || ''
  );

  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = String(key).toLowerCase();
    if (
      normalizedKey === 'price' ||
      normalizedKey === 'lowprice' ||
      normalizedKey === 'highprice'
    ) {
      const price = parsePrice(value);
      if (price) {
        out.push({
          price,
          currency: currency || 'EUR',
          source: trail.length ? `json:${trail.join('.')}.${key}` : `json:${key}`,
        });
      }
    }

    if (typeof value === 'object') {
      collectPriceCandidates(value, out, [...trail, key]);
    }
  }

  return out;
}

function extractJsonLdPrices(html) {
  const scripts = [
    ...String(html || '').matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];
  const hits = [];

  for (const match of scripts) {
    const parsed = safeJsonParse(match[1]);
    if (!parsed) continue;
    collectPriceCandidates(parsed, hits, ['jsonld']);
  }

  return hits;
}

function extractMetaPrices(html) {
  const hits = [];
  const patterns = [
    /itemprop=["']price["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
    /content=["']([^"']+)["'][^>]*itemprop=["']price["'][^>]*>/gi,
    /property=["']product:price:amount["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
    /content=["']([^"']+)["'][^>]*property=["']product:price:amount["'][^>]*>/gi,
  ];

  for (const pattern of patterns) {
    for (const match of String(html || '').matchAll(pattern)) {
      const price = parsePrice(match[1]);
      if (price) hits.push({ price, currency: 'EUR', source: 'meta' });
    }
  }

  return hits;
}

function extractRegexPrices(html) {
  const hits = [];
  const patterns = [
    /["']price["']\s*:\s*["']([^"']+)["']/gi,
    /["']price["']\s*:\s*(\d+(?:[.,]\d{1,2})?)/gi,
    /["']salePrice["']\s*:\s*["']([^"']+)["']/gi,
    /["']salePrice["']\s*:\s*(\d+(?:[.,]\d{1,2})?)/gi,
    /["']priceAmount["']\s*:\s*["']?(\d+(?:[.,]\d{1,2})?)["']?/gi,
    /(?:EUR|€)\s*(\d+(?:[.,]\d{1,2})?)/gi,
    /(\d+(?:[.,]\d{1,2}))\s*(?:EUR|€)/gi,
  ];

  for (const pattern of patterns) {
    for (const match of String(html || '').matchAll(pattern)) {
      const isPriceAmount = /priceAmount/i.test(pattern.source);
      const price = parsePrice(match[1], { integerMeansCents: isPriceAmount });
      if (price)
        hits.push({
          price,
          currency: 'EUR',
          source: isPriceAmount ? 'regex_price_amount' : 'regex',
        });
    }
  }

  return hits;
}

function extractAmazonPrices(html) {
  const hits = [];
  const jsonAmountMatches = [
    ...String(html || '').matchAll(/"priceAmount"\s*:\s*"?(\d+(?:[.,]\d{2})?)"?/gi),
  ];
  for (const match of jsonAmountMatches) {
    const price = parsePrice(match[1], { integerMeansCents: true });
    if (price) hits.push({ price, currency: 'EUR', source: 'amazon_price_amount' });
  }

  const whole = normalizeText(String(html || '').match(/a-price-whole">([^<]+)/i)?.[1] || '');
  const fraction = normalizeText(String(html || '').match(/a-price-fraction">([^<]+)/i)?.[1] || '');
  if (whole) {
    const price = parsePrice(`${whole},${fraction || '00'}`);
    if (price) hits.push({ price, currency: 'EUR', source: 'amazon_dom_price' });
  }

  return hits;
}

async function extractShopifyProductJsPrice(url) {
  if (!/\/products\//i.test(url)) return [];

  try {
    const json = await fetchJson(url.replace(/\/$/, '') + '.js');
    const hits = [];
    for (const variant of json.variants || []) {
      const price = parsePrice(variant?.price, { cents: true });
      if (!price) continue;
      hits.push({
        price,
        currency: normalizeText(json.currency || 'USD'),
        source: 'shopify_product_js',
        available: Boolean(variant.available),
      });
    }
    return hits;
  } catch {
    return [];
  }
}

async function extractMercadonaApiPrice(url) {
  const match =
    normalizeText(url).match(/tienda\.mercadona\.es\/product\/(\d+)/i) ||
    normalizeText(url).match(/mercadona\.es\/product\/(\d+)/i);
  if (!match) return [];

  try {
    const productId = match[1];
    const json = await fetchJson(`https://tienda.mercadona.es/api/products/${productId}`);
    const price = parsePrice(
      json?.price_instructions?.unit_price ?? json?.price_instructions?.bulk_price
    );
    if (!price) return [];
    return [{ price, currency: 'EUR', source: 'mercadona_api' }];
  } catch {
    return [];
  }
}

function extractElCorteInglesPrices(html, url) {
  if (!/elcorteingles\.es/i.test(normalizeText(url))) return [];

  const match = String(html || '').match(
    /"offers"\s*:\s*\{[\s\S]{0,800}?"priceCurrency"\s*:\s*"([A-Z]{3})"[\s\S]{0,200}?"price"\s*:\s*(\d+(?:[.,]\d+)?)/i
  );
  if (!match) return [];

  const price = parsePrice(match[2]);
  if (!price) return [];

  return [
    {
      price,
      currency: normalizeText(match[1] || 'EUR') || 'EUR',
      source: 'eci_offer_jsonld',
    },
  ];
}

function pickBestCandidate(candidates) {
  const priority = {
    shopify_product_js: 100,
    mercadona_api: 95,
    eci_offer_jsonld: 94,
    amazon_dom_price: 92,
    amazon_price_amount: 90,
    'json:jsonld.offers.price': 88,
    'json:jsonld.offers.lowPrice': 86,
    'json:jsonld.offers.highPrice': 40,
    meta: 80,
    regex_price_amount: 70,
    regex: 60,
    google: 50,
  };

  const deduped = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const key = `${candidate.source}|${candidate.price}|${candidate.currency || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(candidate);
  }

  const eurPreferred = deduped.some((candidate) => candidate.currency === 'EUR')
    ? deduped.filter((candidate) => candidate.currency === 'EUR')
    : deduped;

  return (
    eurPreferred.sort((a, b) => {
      const byPriority = (priority[b.source] || 0) - (priority[a.source] || 0);
      if (byPriority !== 0) return byPriority;
      if (a.available !== b.available) return a.available ? -1 : 1;
      return a.price - b.price;
    })[0] || null
  );
}

function parseGooglePrice(value) {
  return parsePrice(value);
}

function normalizarGoogleLink(rawLink) {
  const clean = decodeHtmlText(rawLink);
  if (!clean) return null;

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  if (clean.startsWith('/url?')) {
    try {
      const params = new URLSearchParams(clean.split('?')[1] || '');
      return decodeURIComponent(params.get('q') || params.get('url') || '');
    } catch {
      return null;
    }
  }

  if (clean.startsWith('/')) {
    return `https://www.google.com${clean}`;
  }

  return null;
}

function inferTiendaFromLink(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return 'Google';
  }
}

function stripHtmlTags(value) {
  return decodeHtmlText(String(value || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extraerOfertasGoogleBusqueda(html) {
  const cards = String(html || '')
    .split(/<a\s+href="\/url\?q=/i)
    .slice(1);
  const offers = [];

  cards.forEach((fragment) => {
    const block = `/url?q=${fragment.slice(0, 1800)}`;
    const linkMatch = block.match(/^\/url\?q=([^&"]+)/i);
    const titleMatch =
      block.match(/<h3[^>]*>(.*?)<\/h3>/i) || block.match(/aria-label="([^"]{8,160})"/i);
    const priceMatch = block.match(/(\d{1,4}(?:[\.,]\d{2})\s?(?:€|EUR))/i);

    if (!linkMatch || !titleMatch || !priceMatch) return;

    const link = decodeURIComponent(linkMatch[1]);
    offers.push({
      title: stripHtmlTags(titleMatch[1]),
      price: priceMatch[1],
      merchant: inferTiendaFromLink(link),
      link,
    });
  });

  return offers;
}

function extraerOfertasGoogle(html) {
  if (/trouble accessing Google Search|unusual traffic|detected unusual traffic/i.test(html)) {
    throw new Error('google_blocked');
  }

  const patterns = [
    /"title":"([^"]+?)".*?"price":"([^"]+?)".*?"merchantName":"([^"]+?)".*?"url":"([^"]+?)"/g,
    /"fullTitle":"([^"]+?)".*?"price":"([^"]+?)".*?"merchantName":"([^"]+?)".*?"url":"([^"]+?)"/g,
    /"title":"([^"]+?)".*?"formattedPrice":"([^"]+?)".*?"merchantName":"([^"]+?)".*?"url":"([^"]+?)"/g,
    /"title":"([^"]+?)".*?"priceAmount":"([^"]+?)".*?"merchantName":"([^"]+?)".*?"url":"([^"]+?)"/g,
  ];

  const raw = [];
  for (const pattern of patterns) {
    for (const match of String(html || '').matchAll(pattern)) {
      raw.push({
        title: match[1],
        price: match[2],
        merchant: match[3],
        link: match[4],
      });
    }
  }

  raw.push(...extraerOfertasGoogleBusqueda(html));

  const offers = [];
  const seen = new Set();
  for (const item of raw) {
    const link = normalizarGoogleLink(item.link);
    const price = parseGooglePrice(item.price);
    if (!link || !price) continue;
    const offer = {
      price,
      currency: 'EUR',
      source: 'google',
      merchant: decodeHtmlText(item.merchant || inferTiendaFromLink(link)),
      link,
      title: stripHtmlTags(item.title || ''),
    };
    const key = `${offer.link}|${offer.price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    offers.push(offer);
  }

  return offers.sort((a, b) => a.price - b.price).slice(0, 5);
}

function buildGoogleOfferSearchUrls(cafe) {
  const nombre = normalizeText(cafe.nombre || cafe.name || '');
  const marca = normalizeText(cafe.roaster || cafe.marca || '');
  const cantidad = Number.isFinite(Number(cafe.cantidad)) ? String(cafe.cantidad) : '';
  const query = encodeURIComponent(`${marca} ${nombre} cafe ${cantidad} precio comprar`);
  return [
    `https://www.google.com/search?tbm=shop&hl=es&gl=es&q=${query}`,
    `https://www.google.com/search?tbm=shop&gbv=1&hl=es&gl=es&q=${query}`,
  ];
}

async function fetchGooglePriceCandidates(cafe) {
  const endpoints = buildGoogleOfferSearchUrls(cafe);
  let lastError = null;

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: {
          ...GOOGLE_REQUEST_HEADERS,
          'Accept-Language': 'es-ES,es;q=0.9',
        },
      });
      const html = await response.text();
      if (!response.ok) {
        lastError = new Error(`google_http_${response.status}`);
        continue;
      }

      const offers = extraerOfertasGoogle(html);
      if (offers.length > 0) return offers;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}

async function enrichOneCafe(cafe) {
  const url = normalizeText(cafe.fuenteUrl || cafe.urlProducto || '');
  const source = normalizeKey(cafe.fuente || '');
  const candidates = [];

  if (url) {
    candidates.push(...(await extractMercadonaApiPrice(url)));
    candidates.push(...(await extractShopifyProductJsPrice(url)));

    try {
      const html = await fetchText(url);
      candidates.push(...extractElCorteInglesPrices(html, url));
      candidates.push(...extractJsonLdPrices(html));
      candidates.push(...extractMetaPrices(html));
      candidates.push(...extractRegexPrices(html));
      if (url.includes('amazon.')) {
        candidates.push(...extractAmazonPrices(html));
      }
    } catch (error) {
      const message = String(error?.message || error);
      if (!/HTTP_403|HTTP_404|HTTP_429|HTTP_451/i.test(message)) {
        throw error;
      }
    }
  }

  if (!NO_GOOGLE) {
    try {
      candidates.push(...(await fetchGooglePriceCandidates(cafe)));
    } catch (error) {
      if (
        !['lavazza', 'bonka', 'marcilla', 'segafredo', 'saimaza', 'laestrella', 'peets'].includes(
          source
        )
      ) {
        // Keep non-fatal to preserve best effort on protected sources.
      }
    }
  }

  const filtered = candidates.filter(
    (candidate) => candidate && candidate.price && candidate.price >= 1 && candidate.price <= 500
  );
  const chosen = pickBestCandidate(filtered);
  if (!chosen) {
    return { ok: false, reason: 'price_not_found', candidates: [] };
  }

  return {
    ok: true,
    precio: chosen.price,
    currency: chosen.currency || 'EUR',
    confidence: chosen.source === 'google' ? 'medium' : 'high',
    chosen,
    candidates: filtered,
  };
}

async function main() {
  console.log('[PRICE] Loading cafes from Firestore...');
  const snapshot = await db.collection('cafes').get();
  const cafes = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((doc) => doc.legacy !== true)
    .filter(
      (doc) => doc.precio == null || Number.isNaN(Number(doc.precio)) || Number(doc.precio) <= 0
    )
    .filter((doc) =>
      SOURCE_FILTER
        ? normalizeText(doc.fuente || '')
            .toLowerCase()
            .includes(SOURCE_FILTER)
        : true
    )
    .filter((doc) => normalizeText(doc.fuenteUrl || doc.urlProducto || doc.nombre || doc.name));

  const target = Number.isFinite(LIMIT) ? cafes.slice(0, LIMIT) : cafes;
  console.log(
    `[PRICE] Active without price: ${cafes.length}${Number.isFinite(LIMIT) ? ` (processing ${target.length})` : ''}`
  );

  const results = [];
  let found = 0;
  let applied = 0;
  let failed = 0;

  for (const cafe of target) {
    try {
      const result = await enrichOneCafe(cafe);
      const entry = {
        id: cafe.id,
        fuente: cafe.fuente || '',
        nombre: cafe.nombre || cafe.name || '',
        marca: cafe.roaster || cafe.marca || '',
        url: cafe.fuenteUrl || cafe.urlProducto || '',
        ...result,
      };
      results.push(entry);

      if (!result.ok) continue;

      found += 1;
      console.log(
        `[PRICE] Found: ${entry.nombre} -> ${result.precio} ${result.currency} (${result.chosen.source})`
      );

      if (APPLY) {
        await db.collection('cafes').doc(cafe.id).set(
          {
            precio: result.precio,
            currency: result.currency,
            priceSource: result.chosen.source,
            priceUpdatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        applied += 1;
      }
    } catch (error) {
      failed += 1;
      results.push({
        id: cafe.id,
        fuente: cafe.fuente || '',
        nombre: cafe.nombre || cafe.name || '',
        marca: cafe.roaster || cafe.marca || '',
        url: cafe.fuenteUrl || cafe.urlProducto || '',
        ok: false,
        reason: String(error?.message || error),
        candidates: [],
      });
      console.log(`[PRICE] Error: ${cafe.id} -> ${error.message}`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: !APPLY,
    totals: {
      activeWithoutPrice: cafes.length,
      processed: target.length,
      found,
      applied,
      failed,
      noGoogle: NO_GOOGLE,
    },
    sampleFound: results.filter((item) => item.ok).slice(0, 50),
    sampleMissing: results.filter((item) => !item.ok).slice(0, 50),
    results,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(`[PRICE] Found: ${found}/${target.length}`);
  console.log(`[PRICE] Applied: ${applied}`);
  console.log(`[PRICE] Failed: ${failed}`);
  console.log(`[PRICE] Report: ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error('[PRICE] Error:', error?.stack || error);
  process.exit(1);
});
