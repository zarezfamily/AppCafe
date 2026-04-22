/*
  Enriquece EAN/GTIN directamente desde la ficha origen del producto.

  Estrategia:
    - Lee cafes activos sin EAN en Firestore.
    - Intenta extraer GTIN/EAN desde:
      1) JSON-LD Product / Offer
      2) product.js en tiendas Shopify
      3) meta/itemprop HTML
      4) regex sobre HTML para gtin/ean/barcode
    - Genera informe JSON y, si APPLY=true, actualiza Firestore.

  Uso:
    node scripts/enrich_ean_from_sources.js
    APPLY=true LIMIT=200 node scripts/enrich_ean_from_sources.js
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const APPLY = String(process.env.APPLY || '').toLowerCase() === 'true';
const LIMIT = Number.parseInt(process.env.LIMIT || '', 10);
const SOURCE_FILTER = normalizeText(process.env.SOURCE_FILTER || '').toLowerCase();
const REPORT_PATH = path.resolve(process.cwd(), 'scripts/cafes-ean-enrichment-report.json');
const MANUAL_OVERRIDES_PATH = path.resolve(process.cwd(), 'scripts/ean-manual-overrides.json');
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  Referer: 'https://www.google.com/',
};

function normalizeText(value) {
  return String(value || '')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanEan(value) {
  const cleaned = String(value || '')
    .replace(/\D/g, '')
    .trim();
  if (!cleaned) return '';
  return cleaned.length >= 8 && cleaned.length <= 14 ? cleaned : '';
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function loadManualOverrides() {
  if (!fs.existsSync(MANUAL_OVERRIDES_PATH)) return [];
  const parsed = safeJsonParse(fs.readFileSync(MANUAL_OVERRIDES_PATH, 'utf8'));
  return Array.isArray(parsed) ? parsed : [];
}

async function fetchText(url) {
  const response = await fetch(url, { headers: REQUEST_HEADERS, redirect: 'follow' });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP_${response.status} ${url} ${text.slice(0, 180)}`);
  }
  return text;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: REQUEST_HEADERS, redirect: 'follow' });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP_${response.status} ${url} ${text.slice(0, 180)}`);
  }
  const parsed = safeJsonParse(text);
  if (!parsed) {
    throw new Error(`INVALID_JSON ${url} ${text.slice(0, 180)}`);
  }
  return parsed;
}

function collectGtinValues(obj, out = [], trail = []) {
  if (!obj || typeof obj !== 'object') return out;

  if (Array.isArray(obj)) {
    for (const item of obj) collectGtinValues(item, out, trail);
    return out;
  }

  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = String(key).toLowerCase();
    if (
      normalizedKey === 'gtin' ||
      normalizedKey === 'gtin8' ||
      normalizedKey === 'gtin12' ||
      normalizedKey === 'gtin13' ||
      normalizedKey === 'gtin14' ||
      normalizedKey === 'ean' ||
      normalizedKey === 'barcode' ||
      normalizedKey === 'barcode_number'
    ) {
      const ean = cleanEan(value);
      if (ean) {
        out.push({
          ean,
          source: trail.length ? `json:${trail.join('.')}.${key}` : `json:${key}`,
        });
      }
    }

    if (typeof value === 'object') {
      collectGtinValues(value, out, [...trail, key]);
    }
  }

  return out;
}

function extractJsonLdEans(html) {
  const scripts = [
    ...String(html || '').matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];
  const hits = [];

  for (const match of scripts) {
    const parsed = safeJsonParse(match[1]);
    if (!parsed) continue;
    collectGtinValues(parsed, hits, ['jsonld']);
  }

  return hits;
}

function extractMetaEans(html) {
  const hits = [];
  const patterns = [
    /itemprop=["']gtin(?:13|14|12|8)?["'][^>]*content=["'](\d{8,14})["']/gi,
    /content=["'](\d{8,14})["'][^>]*itemprop=["']gtin(?:13|14|12|8)?["']/gi,
    /itemprop=["']barcode["'][^>]*content=["'](\d{8,14})["']/gi,
    /content=["'](\d{8,14})["'][^>]*itemprop=["']barcode["']/gi,
  ];

  for (const pattern of patterns) {
    for (const match of String(html || '').matchAll(pattern)) {
      const ean = cleanEan(match[1]);
      if (ean) hits.push({ ean, source: 'meta' });
    }
  }

  return hits;
}

function extractRegexEans(html) {
  const hits = [];
  const patterns = [
    /["']gtin(?:13|14|12|8)?["']\s*[:=]\s*["'](\d{8,14})["']/gi,
    /["']ean["']\s*[:=]\s*["'](\d{8,14})["']/gi,
    /["']barcode["']\s*[:=]\s*["'](\d{8,14})["']/gi,
    /\bgtin(?:13|14|12|8)?\b[\s"'=:>-]{0,20}(\d{8,14})/gi,
    /\bean\b[\s"'=:>-]{0,20}(\d{8,14})/gi,
    /\bbarcode\b[\s"'=:>-]{0,20}(\d{8,14})/gi,
  ];

  for (const pattern of patterns) {
    for (const match of String(html || '').matchAll(pattern)) {
      const ean = cleanEan(match[1]);
      if (ean) hits.push({ ean, source: 'regex' });
    }
  }

  return hits;
}

async function extractShopifyProductJsEans(url) {
  if (!/\/products\//i.test(url)) return [];
  const jsonUrl = url.replace(/\/$/, '') + '.js';
  try {
    const text = await fetchText(jsonUrl);
    const parsed = safeJsonParse(text);
    if (!parsed) return [];

    const hits = [];
    for (const variant of parsed.variants || []) {
      const ean = cleanEan(variant?.barcode || '');
      if (ean) hits.push({ ean, source: 'shopify_product_js' });
    }
    return hits;
  } catch {
    return [];
  }
}

async function extractMercadonaApiEans(url) {
  const match =
    normalizeText(url).match(/tienda\.mercadona\.es\/product\/(\d+)/i) ||
    normalizeText(url).match(/mercadona\.es\/product\/(\d+)/i);
  if (!match) return [];

  try {
    const productId = match[1];
    const json = await fetchJson(`https://tienda.mercadona.es/api/products/${productId}`);
    const hits = collectGtinValues(json, [], ['mercadona_api']);
    return hits;
  } catch {
    return [];
  }
}

function pickBestCandidate(candidates) {
  const counts = new Map();
  for (const candidate of candidates) {
    const current = counts.get(candidate.ean) || { ean: candidate.ean, count: 0, sources: [] };
    current.count += 1;
    current.sources.push(candidate.source);
    counts.set(candidate.ean, current);
  }

  const ranked = [...counts.values()].sort((a, b) => {
    const sourceWeight = (sources) =>
      sources.reduce((sum, source) => {
        if (source.startsWith('json:jsonld') || source === 'shopify_product_js') return sum + 3;
        if (source === 'meta') return sum + 2;
        return sum + 1;
      }, 0);
    const byCount = b.count - a.count;
    if (byCount !== 0) return byCount;
    return sourceWeight(b.sources) - sourceWeight(a.sources);
  });

  return ranked[0] || null;
}

async function enrichOneCafe(cafe) {
  const url = normalizeText(cafe.fuenteUrl || cafe.urlProducto || '');
  if (!url) {
    return { ok: false, reason: 'missing_url', candidates: [] };
  }

  const isShopifyProduct = /\/products\//i.test(url);
  const candidates = [
    ...(await extractMercadonaApiEans(url)),
    ...(await extractShopifyProductJsEans(url)),
  ];

  if (!candidates.length && isShopifyProduct) {
    return { ok: false, reason: 'ean_not_found_shopify', candidates: [] };
  }

  if (!candidates.length) {
    try {
      const html = await fetchText(url);
      candidates.push(
        ...extractJsonLdEans(html),
        ...extractMetaEans(html),
        ...extractRegexEans(html)
      );
    } catch (error) {
      const message = String(error?.message || error);
      if (message.includes('HTTP_429')) {
        return { ok: false, reason: 'source_blocked_429', candidates: [] };
      }
      throw error;
    }
  }

  const uniqueCandidates = unique(candidates.map((entry) => `${entry.ean}|${entry.source}`)).map(
    (key) => {
      const [ean, source] = key.split('|');
      return { ean, source };
    }
  );

  const best = pickBestCandidate(uniqueCandidates);
  if (!best) {
    return { ok: false, reason: 'ean_not_found', candidates: [] };
  }

  return {
    ok: true,
    ean: best.ean,
    confidence: best.sources?.length > 1 ? 'high' : 'medium',
    candidates: uniqueCandidates,
    chosen: best,
  };
}

async function main() {
  const manualOverrides = loadManualOverrides();
  const snapshot = await db.collection('cafes').get();
  const cafes = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((doc) => doc.legacy !== true)
    .filter((doc) => !cleanEan(doc.ean || doc.normalizedEan || doc.barcode))
    .filter((doc) =>
      SOURCE_FILTER
        ? normalizeText(doc.fuente || '')
            .toLowerCase()
            .includes(SOURCE_FILTER)
        : true
    )
    .filter((doc) => normalizeText(doc.fuenteUrl || doc.urlProducto));

  const target = Number.isFinite(LIMIT) ? cafes.slice(0, LIMIT) : cafes;
  console.log(
    `[EAN] Active without EAN: ${cafes.length}${Number.isFinite(LIMIT) ? ` (processing ${target.length})` : ''}`
  );

  const results = [];
  let found = 0;
  let applied = 0;
  let failed = 0;

  for (const cafe of target) {
    try {
      const manual = manualOverrides.find((entry) => {
        const entryId = normalizeText(entry?.id);
        const entryUrl = normalizeText(entry?.url);
        return (
          (entryId && entryId === cafe.id) ||
          (entryUrl && entryUrl === normalizeText(cafe.fuenteUrl || cafe.urlProducto || ''))
        );
      });

      const result =
        manual && cleanEan(manual.ean)
          ? {
              ok: true,
              ean: cleanEan(manual.ean),
              confidence: 'manual',
              candidates: [{ ean: cleanEan(manual.ean), source: 'manual_override' }],
              chosen: { ean: cleanEan(manual.ean), count: 1, sources: ['manual_override'] },
            }
          : await enrichOneCafe(cafe);

      const entry = {
        id: cafe.id,
        fuente: cafe.fuente || '',
        nombre: cafe.nombre || cafe.name || '',
        marca: cafe.roaster || cafe.marca || '',
        url: cafe.fuenteUrl || cafe.urlProducto || '',
        ...result,
      };
      results.push(entry);

      if (result.ok) {
        found += 1;
        console.log(`[EAN] Found: ${entry.nombre} -> ${result.ean}`);

        if (APPLY) {
          await db
            .collection('cafes')
            .doc(cafe.id)
            .set(
              {
                ean: result.ean,
                normalizedEan: result.ean,
                barcode: result.ean,
                eanSource: result.chosen?.sources?.join(',') || result.chosen?.source || '',
                eanUpdatedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          applied += 1;
        }
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
      console.log(`[EAN] Error: ${cafe.id} -> ${error.message}`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: !APPLY,
    totals: {
      activeWithoutEan: cafes.length,
      processed: target.length,
      manualOverrides: manualOverrides.length,
      found,
      applied,
      failed,
    },
    sampleFound: results.filter((item) => item.ok).slice(0, 50),
    sampleMissing: results.filter((item) => !item.ok).slice(0, 50),
    results,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(`[EAN] Found: ${found}/${target.length}`);
  console.log(`[EAN] Applied: ${applied}`);
  console.log(`[EAN] Failed: ${failed}`);
  console.log(`[EAN] Report: ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error('[EAN] Error:', error?.stack || error);
  process.exit(1);
});
