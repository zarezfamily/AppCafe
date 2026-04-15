import { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';

import BottomBarNav from './BottomBarNav';
import CafeteriasScreen from './CafeteriasScreen';
import CataDetailModal from './CataDetailModal';
import CataFormModal from './CataFormModal';
import CommunityTab from './CommunityTab';
import InicioTab from './InicioTab';
import MasTab from './MasTab';
import MisCafesTab from './MisCafesTab';
import OfertasTab from './OfertasTab';
import PaywallModal from './PaywallModal';
import TopCafesTab from './TopCafesTab';
import UltimosAnadidosTab from './UltimosAnadidosTab';
import { MAIN_TABS } from './mainScreenTabs';

export default function MainScreenBody({
  activeTab,
  communityTabProps,
  inicioTabProps,
  misCafesTabProps,
  ultimosAnadidosTabProps,
  topCafesTabProps,
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
    if (activeTab === MAIN_TABS.CAFETERIAS || activeTab === MAIN_TABS.COMMUNITY) return;
    requestAnimationFrame(() => {
      contentScrollRef.current?.scrollTo?.({ y: 0, animated: false });
    });
  }, [activeTab]);

  return (
    <>
      {activeTab === MAIN_TABS.CAFETERIAS && (
        <View style={{ flex: 1 }}>
          <CafeteriasScreen />
        </View>
      )}

      {activeTab === MAIN_TABS.COMMUNITY && <CommunityTab {...communityTabProps} />}

      {activeTab !== MAIN_TABS.CAFETERIAS && activeTab !== MAIN_TABS.COMMUNITY && (
        <ScrollView
          ref={contentScrollRef}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === MAIN_TABS.HOME && <InicioTab {...inicioTabProps} />}
          {activeTab === MAIN_TABS.NOTEBOOK && <MisCafesTab {...misCafesTabProps} />}
          {activeTab === MAIN_TABS.LATEST && <UltimosAnadidosTab {...ultimosAnadidosTabProps} />}
          {activeTab === MAIN_TABS.TOP && <TopCafesTab {...topCafesTabProps} />}
          {activeTab === MAIN_TABS.OFFERS && <OfertasTab {...ofertasTabProps} />}
          {activeTab === MAIN_TABS.MORE && <MasTab {...masTabProps} />}
        </ScrollView>
      )}

      {!(activeTab === MAIN_TABS.COMMUNITY && !!forumThread) && (
        <BottomBarNav {...bottomBarProps} />
      )}

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
}
