import { useCameraPermissions } from 'expo-camera';
import * as SecureStore from 'expo-secure-store';
import { useRef, useState } from 'react';
import { Animated } from 'react-native';

export default function useMainScreenUiState({ keyProfile }) {
  const [activeTab, setActiveTab] = useState('Inicio');
  const [scanning, setScanning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaTop, setBusquedaTop] = useState('');
  const [busquedaMis, setBusquedaMis] = useState('');
  const [cafeDetalle, setCafeDetalle] = useState(null);
  const [favs, setFavs] = useState([]);
  const [votes, setVotes] = useState([]);
  const [perfil, setPerfil] = useState({ pais: 'España' });
  const [ofertasPorCafe, setOfertasPorCafe] = useState({});
  const [buscandoOfertaId, setBuscandoOfertaId] = useState(null);
  const [openOfferCafeId, setOpenOfferCafeId] = useState(null);
  const [errorOfertas, setErrorOfertas] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ title: '', description: '', actions: [] });
  const forumThreadScrollRef = useRef(null);
  const forumReplyInputRef = useRef(null);
  const communityNotificationBootRef = useRef(false);
  const forumNotificationBootRef = useRef(false);
  const favoriteNotificationBootRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const brandCardAnim = useRef(new Animated.Value(0)).current;
  const brandProgressAnim = useRef(new Animated.Value(0)).current;

  const refrescarPerfil = async () => {
    try {
      const v = await SecureStore.getItemAsync(keyProfile);
      if (v) setPerfil(JSON.parse(v));
    } catch {}
  };

  const showDialog = (title, description, actions = [{ label: 'Cerrar' }]) => {
    setDialogConfig({ title, description, actions });
    setDialogVisible(true);
  };

  const closeDialog = () => setDialogVisible(false);

  const closeScannerAndOpenForm = () => {
    setScanning(false);
    setShowForm(true);
  };

  const closeFormAndRefreshData = (onRefresh) => {
    setShowForm(false);
    setActiveTab('Mis Cafés');
    onRefresh?.();
  };

  const closeCafeDetail = (onRefresh) => {
    setCafeDetalle(null);
    onRefresh?.();
  };

  const closeProfile = async () => {
    setShowProfile(false);
    try {
      const v = await SecureStore.getItemAsync(keyProfile);
      if (v) setPerfil(JSON.parse(v));
    } catch {}
  };

  return {
    activeTab,
    setActiveTab,
    scanning,
    setScanning,
    showForm,
    setShowForm,
    showProfile,
    setShowProfile,
    busqueda,
    setBusqueda,
    busquedaTop,
    setBusquedaTop,
    busquedaMis,
    setBusquedaMis,
    cafeDetalle,
    setCafeDetalle,
    favs,
    setFavs,
    votes,
    setVotes,
    perfil,
    setPerfil,
    ofertasPorCafe,
    setOfertasPorCafe,
    buscandoOfertaId,
    setBuscandoOfertaId,
    openOfferCafeId,
    setOpenOfferCafeId,
    errorOfertas,
    setErrorOfertas,
    dialogVisible,
    dialogConfig,
    forumThreadScrollRef,
    forumReplyInputRef,
    communityNotificationBootRef,
    forumNotificationBootRef,
    favoriteNotificationBootRef,
    permission,
    requestPermission,
    brandCardAnim,
    brandProgressAnim,
    refrescarPerfil,
    showDialog,
    closeDialog,
    closeScannerAndOpenForm,
    closeFormAndRefreshData,
    closeCafeDetail,
    closeProfile,
  };
}
