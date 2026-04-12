import useCoffeeData from '../hooks/useCoffeeData';
import useNoteBook from '../hooks/useNoteBook';
import usePremium from '../hooks/usePremium';
import { createMainScreenNotebookHandlers } from './mainScreenNotebookHandlers';
import { createMainScreenOfferHandlers } from './mainScreenOfferHandlers';
import useMainScreenNotebookGate from './useMainScreenNotebookGate';
import useMainScreenPremium from './useMainScreenPremium';

export default function useMainScreenDomain({
  user,
  perfil,
  favs,
  setFavs,
  setCafeDetalle,
  registrarEventoGamificacion,
  busquedaMis,
  busquedaTop,
  googlePlacesKey,
  offersCacheTtlMs,
  keyFavs,
  keyOffersCache,
  getUserCafes,
  getCollection,
  deleteDocument,
  addDocument,
  queryCollection,
  uploadImageToStorage,
  getDocument,
  setDocument,
  setBuscandoOfertaId,
  setErrorOfertas,
  setOfertasPorCafe,
  setOpenOfferCafeId,
  setActiveTab,
  ofertasPorCafe,
  showDialog,
}) {
  const coffee = useCoffeeData({
    user,
    perfil,
    favs,
    setFavs,
    setCafeDetalle,
    registrarEventoGamificacion,
    busquedaMis,
    busquedaTop,
    googlePlacesKey,
    offersCacheTtlMs,
    keyFavs,
    getUserCafes,
    getCollection,
    deleteDocument,
    openDialog: showDialog,
  });

  const notebook = useNoteBook();
  const premium = usePremium({ user, getDocument, setDocument });

  const premiumUi = useMainScreenPremium({
    user,
    premium,
    showDialog,
  });

  const offerHandlers = createMainScreenOfferHandlers({
    ofertasPorCafe,
    setBuscandoOfertaId,
    setErrorOfertas,
    setOfertasPorCafe,
    setOpenOfferCafeId,
    setActiveTab,
    offersCacheTtlMs,
    keyOffersCache,
  });

  const notebookGate = useMainScreenNotebookGate({
    premium,
    notebook,
  });

  const notebookHandlers = createMainScreenNotebookHandlers({
    user,
    notebook,
    addDocument,
    deleteDocument,
    queryCollection,
    uploadImageToStorage,
    showDialog,
  });

  return {
    ...coffee,
    notebook,
    premium,
    ...premiumUi,
    ...offerHandlers,
    ...notebookGate,
    ...notebookHandlers,
  };
}
