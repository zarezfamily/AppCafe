import * as SecureStore from 'expo-secure-store';
import { Linking } from 'react-native';

function parsePrecio(value) {
  if (typeof value === 'number') return value;
  if (!value) return Number.POSITIVE_INFINITY;
  const n = Number(String(value).replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : Number.POSITIVE_INFINITY;
}

function decodeHtmlText(value) {
  return String(value || '')
    .replace(/\\u003d/g, '=')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u00a0/g, ' ')
    .replace(/\\u20ac/g, '€')
    .replace(/\\\//g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function stripHtmlTags(value) {
  return decodeHtmlText(String(value || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizarGoogleLink(rawLink) {
  const clean = decodeHtmlText(rawLink);
  if (!clean) return null;
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  if (clean.startsWith('/url?')) {
    try {
      const params = new URLSearchParams(clean.split('?')[1] || '');
      return decodeURIComponent(params.get('q') || params.get('url') || '');
    } catch {
      return null;
    }
  }
  if (clean.startsWith('/')) return `https://www.google.com${clean}`;
  return null;
}

function inferTiendaFromLink(link) {
  try {
    const url = new URL(link);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'Google';
  }
}

function normalizarOfertaGoogle(raw) {
  const precio = parsePrecio(raw.price);
  const link = normalizarGoogleLink(raw.link);
  const tienda = decodeHtmlText(raw.store || raw.merchant || (link ? inferTiendaFromLink(link) : 'Google Shopping'));
  const titulo = stripHtmlTags(raw.title || 'Oferta de café');
  const priceText = decodeHtmlText(raw.price || 'Precio no visible');
  if (!titulo || !link) return null;
  return {
    id: `${titulo}-${tienda}-${priceText}`,
    titulo,
    tienda,
    precio,
    precioTexto: Number.isFinite(precio) ? `${precio.toFixed(2)}€` : priceText,
    link,
    fuente: 'Google',
  };
}

function extraerOfertasGoogleBusqueda(html) {
  const cards = html.split(/<a\s+href="\/url\?q=/i).slice(1);
  const offers = [];

  cards.forEach((fragment) => {
    const block = `/url?q=${fragment.slice(0, 1800)}`;
    const linkMatch = block.match(/^\/url\?q=([^&"]+)/i);
    const titleMatch = block.match(/<h3[^>]*>(.*?)<\/h3>/i) || block.match(/aria-label="([^"]{8,160})"/i);
    const priceMatch = block.match(/(\d{1,4}(?:[\.,]\d{2})\s?€)/i);
    if (!linkMatch || !titleMatch || !priceMatch) return;

    const link = decodeURIComponent(linkMatch[1]);
    const title = stripHtmlTags(titleMatch[1]);
    const store = inferTiendaFromLink(link);

    offers.push({
      title,
      price: priceMatch[1],
      merchant: store,
      link,
    });
  });

  return offers;
}

function extraerOfertasGoogle(html) {
  if (/trouble accessing Google Search|unusual traffic|SG_SS|detected unusual traffic/i.test(html)) {
    throw new Error('Google ha bloqueado temporalmente la consulta de ofertas');
  }

  const candidates = [];
  const patterns = [
    /"title":"([^\"]+?)".*?"price":"([^\"]+?)".*?"merchantName":"([^\"]+?)".*?"url":"([^\"]+?)"/g,
    /"fullTitle":"([^\"]+?)".*?"price":"([^\"]+?)".*?"merchantName":"([^\"]+?)".*?"url":"([^\"]+?)"/g,
    /"title":"([^\"]+?)".*?"merchantName":"([^\"]+?)".*?"price":"([^\"]+?)".*?"url":"([^\"]+?)"/g,
    /"name":"([^\"]+?)".*?"price":"([^\"]+?)".*?"sellerName":"([^\"]+?)".*?"url":"([^\"]+?)"/g,
    /"title":"([^\"]+?)".*?"formattedPrice":"([^\"]+?)".*?"merchantName":"([^\"]+?)".*?"url":"([^\"]+?)"/g,
    /"productTitle":"([^\"]+?)".*?"price":"([^\"]+?)".*?"storeName":"([^\"]+?)".*?"url":"([^\"]+?)"/g,
    /"title":"([^\"]+?)".*?"priceAmount":"([^\"]+?)".*?"merchantName":"([^\"]+?)".*?"url":"([^\"]+?)"/g,
  ];

  patterns.forEach((pattern, index) => {
    for (const match of html.matchAll(pattern)) {
      if (index === 2) {
        candidates.push({ title: match[1], merchant: match[2], price: match[3], link: match[4] });
      } else {
        candidates.push({ title: match[1], price: match[2], merchant: match[3], link: match[4] });
      }
    }
  });

  extraerOfertasGoogleBusqueda(html).forEach((offer) => candidates.push(offer));

  const seen = new Set();
  return candidates
    .map(normalizarOfertaGoogle)
    .filter((offer) => {
      if (!offer?.id || seen.has(offer.id)) return false;
      seen.add(offer.id);
      return Number.isFinite(offer.precio) && !!offer.link;
    })
    .sort((a, b) => a.precio - b.precio)
    .slice(0, 3);
}

export function createMainScreenOfferHandlers({
  ofertasPorCafe,
  setBuscandoOfertaId,
  setErrorOfertas,
  setOfertasPorCafe,
  setOpenOfferCafeId,
  setActiveTab,
  offersCacheTtlMs,
  keyOffersCache,
}) {
  const guardarCacheOfertas = async (nextByCafe) => {
    try {
      await SecureStore.setItemAsync(keyOffersCache, JSON.stringify({ byCafe: nextByCafe, savedAt: Date.now() }));
    } catch {}
  };

  const buscarOfertasCafe = async (cafe, forceRefresh = false) => {
    if (!cafe?.id || !cafe?.nombre) return;

    const now = Date.now();
    const cached = ofertasPorCafe[cafe.id];
    if (!forceRefresh && cached?.updatedAt && Array.isArray(cached?.offers) && (now - cached.updatedAt) <= offersCacheTtlMs) {
      return;
    }

    setBuscandoOfertaId(cafe.id);
    setErrorOfertas(null);

    try {
      const query = encodeURIComponent(`${cafe.nombre} café comprar precio`);
      const endpoints = [
        `https://www.google.com/search?tbm=shop&hl=es&gl=es&q=${query}`,
        `https://www.google.com/search?tbm=shop&gbv=1&hl=es&gl=es&q=${query}`,
        `https://www.google.com/search?hl=es&gl=es&q=${query}`,
      ];

      let ofertas = [];
      let lastError = null;

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            headers: {
              'Accept-Language': 'es-ES,es;q=0.9',
            },
          });
          if (!res.ok) {
            lastError = new Error(`Google respondió con ${res.status}`);
            continue;
          }
          const html = await res.text();
          ofertas = extraerOfertasGoogle(html);
          if (ofertas.length > 0) break;
        } catch (error) {
          lastError = error;
        }
      }

      if (ofertas.length === 0 && lastError) throw lastError;

      setOfertasPorCafe((prev) => {
        const next = {
          ...prev,
          [cafe.id]: {
            updatedAt: Date.now(),
            offers: ofertas,
          },
        };
        guardarCacheOfertas(next);
        return next;
      });

      if (ofertas.length === 0) {
        setErrorOfertas(`No encontramos ofertas en Google para ${cafe.nombre}.`);
      }
    } catch (error) {
      setErrorOfertas(`No se pudieron cargar ofertas de Google: ${error.message}`);
    } finally {
      setBuscandoOfertaId(null);
    }
  };

  const abrirOfertasCafe = async (cafe, options = {}) => {
    if (!cafe?.id) return;
    setOpenOfferCafeId(cafe.id);
    if (options.navigate) setActiveTab('Ofertas');
    await buscarOfertasCafe(cafe, !!options.forceRefresh);
  };

  const abrirOfertaWeb = (oferta) => {
    if (!oferta?.link) return;
    Linking.openURL(oferta.link).catch(() => {});
  };

  return {
    buscarOfertasCafe,
    abrirOfertasCafe,
    abrirOfertaWeb,
  };
}
