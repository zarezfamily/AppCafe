import { MAIN_TABS } from './mainScreenTabs';
import * as SecureStore from 'expo-secure-store';
import { Linking } from 'react-native';
import { fetchGoogleOffersForCafe } from '../domain/offers/googleOffers';

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
      const ofertas = await fetchGoogleOffersForCafe(cafe.nombre);

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
    if (options.navigate) setActiveTab(MAIN_TABS.OFFERS);
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
