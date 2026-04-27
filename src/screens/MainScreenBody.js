import { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import OfflineBanner from '../components/OfflineBanner';
import AdminPanelScreen from './AdminPanelScreen'; // 🔥 NUEVO
import BottomBarNav from './BottomBarNav';
import CafeteriasScreen from './CafeteriasScreen';
import CataDetailModal from './CataDetailModal';
import CataFormModal from './CataFormModal';
import CommunityTab from './CommunityTab';
import DiscoverTab from './DiscoverTab';
import InicioTab from './InicioTab';
import MasTab from './MasTab';
import MisCafesTab from './MisCafesTab';
import OfertasTab from './OfertasTab';
import PaywallModal from './PaywallModal';
import RankingTab from './RankingTab';
import TrendingTab from './TrendingTab';
import UltimosAnadidosTab from './UltimosAnadidosTab';

import { MAIN_TABS } from './mainScreenTabs';

export default function MainScreenBody({
  activeTab,
  setActiveTab,
  communityTabProps,
  inicioTabProps,
  misCafesTabProps,
  ultimosAnadidosTabProps,
  topCafesTabProps,
  discoverTabProps,
  trendingTabProps,
  ofertasTabProps,
  masTabProps,
  bottomBarProps,
  forumThread,
  notebook,
  guardarCata,
  eliminarCata,
  allCafes,
  theme,
  s,
  premiumAccent,
  premium,
  handleRestorePurchases,
  purchasingPlan,
  restoringPurchases,
  purchasesReady,
  handlePremiumPurchase,
}) {
  const contentScrollRef = useRef(null);

  useEffect(() => {
    if (activeTab === MAIN_TABS.CAFETERIAS || activeTab === MAIN_TABS.COMMUNITY) {
      return;
    }

    requestAnimationFrame(() => {
      contentScrollRef.current?.scrollTo?.({ y: 0, animated: false });
    });
  }, [activeTab]);

  const renderActiveTab = () => {
    if (activeTab === MAIN_TABS.CAFETERIAS) {
      return (
        <View style={{ flex: 1 }}>
          <CafeteriasScreen onBack={() => setActiveTab(MAIN_TABS.HOME)} />
        </View>
      );
    }
    if (activeTab === MAIN_TABS.COMMUNITY) return <CommunityTab {...communityTabProps} />;
    if (activeTab === MAIN_TABS.ADMIN) {
      return (
        <View style={{ flex: 1 }}>
          <AdminPanelScreen />
        </View>
      );
    }
    return (
      <ScrollView
        ref={contentScrollRef}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === MAIN_TABS.HOME && <InicioTab {...inicioTabProps} />}
        {activeTab === MAIN_TABS.NOTEBOOK && <MisCafesTab {...misCafesTabProps} />}
        {activeTab === MAIN_TABS.LATEST && <UltimosAnadidosTab {...ultimosAnadidosTabProps} />}
        {activeTab === MAIN_TABS.TOP && <RankingTab {...topCafesTabProps} />}
        {activeTab === MAIN_TABS.DISCOVER && <DiscoverTab {...discoverTabProps} />}
        {activeTab === MAIN_TABS.TRENDING && <TrendingTab {...trendingTabProps} />}
        {activeTab === MAIN_TABS.OFFERS && <OfertasTab {...ofertasTabProps} />}
        {activeTab === MAIN_TABS.MORE && <MasTab {...masTabProps} />}
      </ScrollView>
    );
  };

  const showBottomBar = !(activeTab === MAIN_TABS.COMMUNITY && !!forumThread);

  const renderBodyContent = () => (
    <>
      <OfflineBanner />
      {renderActiveTab()}
      {showBottomBar ? <BottomBarNav {...bottomBarProps} /> : null}

      <CataFormModal
        visible={!!notebook.modalFormOpen}
        onClose={notebook.irCerrarModal}
        onSave={guardarCata}
        allCafes={allCafes}
        cafeNombre={notebook.cafeNombre}
        setCafeNombre={notebook.setCafeNombre}
        cafeId={notebook.cafeId}
        setCafeId={notebook.setCafeId}
        fechaHora={notebook.fechaHora}
        setFechaHora={notebook.setFechaHora}
        metodoPreparacion={notebook.metodoPreparacion}
        setMetodoPreparacion={notebook.setMetodoPreparacion}
        dosis={notebook.dosis}
        setDosis={notebook.setDosis}
        agua={notebook.agua}
        setAgua={notebook.setAgua}
        temperatura={notebook.temperatura}
        setTemperatura={notebook.setTemperatura}
        tiempoExtraccion={notebook.tiempoExtraccion}
        setTiempoExtraccion={notebook.setTiempoExtraccion}
        puntuacion={notebook.puntuacion}
        setPuntuacion={notebook.setPuntuacion}
        notas={notebook.notas}
        setNotas={notebook.setNotas}
        foto={notebook.foto}
        setFoto={notebook.setFoto}
        contexto={notebook.contexto}
        setContexto={notebook.setContexto}
        METODOS_PREPARACION={notebook.METODOS_PREPARACION}
        CONTEXTOS={notebook.CONTEXTOS}
        guardando={notebook.guardando}
        isEditing={notebook.isEditing}
        theme={theme}
        s={s}
        premiumAccent={premiumAccent}
      />

      <CataDetailModal
        visible={!!notebook.modalDetailOpen}
        cata={notebook.cataSeleccionada}
        onClose={notebook.irCerrarDetail}
        onEdit={(cata) => {
          notebook.setCafeNombre(cata.cafeNombre);
          notebook.setCafeId(cata.cafeId || '');
          notebook.setFechaHora(cata.fechaHora || new Date().toISOString());
          notebook.setMetodoPreparacion(cata.metodoPreparacion);
          notebook.setDosis(String(cata.dosis));
          notebook.setAgua(String(cata.agua));
          notebook.setTemperatura(String(cata.temperatura));
          notebook.setTiempoExtraccion(String(cata.tiempoExtraccion));
          notebook.setPuntuacion(cata.puntuacion);
          notebook.setNotas(cata.notas);
          notebook.setFoto(cata.foto);
          notebook.setContexto(cata.contexto);
          notebook.setIsEditing(true);
          notebook.irCerrarDetail();
          notebook.irAbrirModal();
        }}
        onDelete={(cataId) => eliminarCata(cataId)}
        theme={theme}
        s={s}
        premiumAccent={premiumAccent}
      />

      <PaywallModal
        visible={!!premium.showPaywall}
        onClose={premium.closePaywall}
        onRestore={handleRestorePurchases}
        trigger={premium.paywallTrigger}
        isPremium={premium.isPremium}
        purchasingPlan={purchasingPlan}
        restoring={restoringPurchases}
        revenueCatReady={purchasesReady}
        onPurchase={handlePremiumPurchase}
      />
    </>
  );

  return <View style={{ flex: 1 }}>{renderBodyContent()}</View>;
}
