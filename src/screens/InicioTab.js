import { useMemo, useState } from 'react';
import { View } from 'react-native';
import MemberInfoModal from '../components/MemberInfoModal';
import {
  BlogSection,
  InicioTopBar,
  LatestSection,
  NearbyCafeteriasSection,
  ProcessDiscoverySection,
  RoasterSpotlightSection,
  SearchResultsSection,
  TopCountrySection,
  TrendingQuickFiltersSection,
  TrendingSection,
} from './inicioTabSections';

function buildUniqueOptions(items, field, limit = 6) {
  const seen = new Set();

  return (items || [])
    .map((item) => String(item?.[field] || '').trim())
    .filter(Boolean)
    .filter((value) => {
      const normalized = value.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, limit);
}

export default function InicioTab({
  s,
  perfil,
  setShowProfile,
  brandCardAnim,
  brandCardTranslateY,
  brandCardScale,
  profileInitial,
  profileAlias,
  profileName,
  currentLevel,
  gamification,
  nextLevel,
  brandProgressWidth,
  busqueda,
  setBusqueda,
  SearchInput,
  allCafes,
  filtrar,
  CardVertical,
  setCafeDetalle,
  favs,
  toggleFav,
  ultimosGlobal,
  setActiveTab,
  setTrendingFilters,
  cargando,
  premiumAccent,
  CardHorizontal,
  topCafesVista,
  trendingCafes,
  flag,
  cargandoCafInicio,
  errorCafInicio,
  cafeteriasInicio,
  cargarCafeteriasInicio,
  theme,
}) {
  const [showMemberInfo, setShowMemberInfo] = useState(false);

  const handleMemberRoastLongPress = () => {
    setShowMemberInfo(true);
  };

  const quickTrendingFilters = useMemo(() => {
    return {
      paises: buildUniqueOptions(trendingCafes, 'pais', 6),
      procesos: buildUniqueOptions(trendingCafes, 'proceso', 6),
      roasters: buildUniqueOptions(trendingCafes, 'roaster', 6),
    };
  }, [trendingCafes]);

  const handleOpenTrendingFilter = ({ pais = null, proceso = null, roaster = null }) => {
    setTrendingFilters?.({
      pais,
      proceso,
      roaster,
    });
    setActiveTab('Trending');
  };

  const roastersDestacados = useMemo(() => {
    const grouped = {};

    (allCafes || []).forEach((cafe) => {
      const roaster = String(cafe?.roaster || '').trim();
      if (!roaster) return;
      if (!grouped[roaster]) grouped[roaster] = [];
      grouped[roaster].push(cafe);
    });

    return Object.entries(grouped)
      .map(([roaster, cafes]) => {
        const ordenados = [...cafes].sort((a, b) => {
          const scoreA = Number(a?.puntuacion || 0);
          const scoreB = Number(b?.puntuacion || 0);
          return scoreB - scoreA;
        });

        return {
          roaster,
          total: cafes.length,
          topCafe: ordenados[0],
        };
      })
      .sort((a, b) => {
        const aScore = Number(a?.topCafe?.puntuacion || 0);
        const bScore = Number(b?.topCafe?.puntuacion || 0);
        if (bScore !== aScore) return bScore - aScore;
        return b.total - a.total;
      })
      .slice(0, 10);
  }, [allCafes]);

  const cafesPorProceso = useMemo(() => {
    const preferidos = ['Lavado', 'Natural', 'Honey', 'Anaeróbico', 'Experimental'];

    const grouped = {};
    (allCafes || []).forEach((cafe) => {
      const proceso = String(cafe?.proceso || '').trim();
      if (!proceso) return;
      if (!grouped[proceso]) grouped[proceso] = [];
      grouped[proceso].push(cafe);
    });

    const procesosOrdenados = [
      ...preferidos.filter((p) => grouped[p]?.length),
      ...Object.keys(grouped).filter((p) => !preferidos.includes(p)),
    ];

    return procesosOrdenados
      .map((proceso) => ({
        proceso,
        cafes: [...grouped[proceso]]
          .sort((a, b) => Number(b?.puntuacion || 0) - Number(a?.puntuacion || 0))
          .slice(0, 10),
      }))
      .filter((section) => section.cafes.length > 0)
      .slice(0, 4);
  }, [allCafes]);

  return (
    <View>
      <MemberInfoModal visible={showMemberInfo} onClose={() => setShowMemberInfo(false)} />

      <InicioTopBar
        s={s}
        perfil={perfil}
        setShowProfile={setShowProfile}
        brandCardAnim={brandCardAnim}
        brandCardTranslateY={brandCardTranslateY}
        brandCardScale={brandCardScale}
        profileInitial={profileInitial}
        profileAlias={profileAlias}
        profileName={profileName}
        currentLevel={currentLevel}
        gamification={gamification}
        nextLevel={nextLevel}
        brandProgressWidth={brandProgressWidth}
        onLongPressMemberCard={handleMemberRoastLongPress}
      />

      <SearchInput
        value={busqueda}
        onChangeText={setBusqueda}
        onSearch={(q) => {
          setBusqueda(q);
        }}
        allCafes={allCafes}
        placeholder="Buscar café, origen, proceso o tostador..."
      />

      {busqueda?.trim() ? (
        <SearchResultsSection
          s={s}
          allCafes={allCafes}
          busqueda={busqueda}
          filtrar={filtrar}
          CardVertical={CardVertical}
          setCafeDetalle={setCafeDetalle}
          favs={favs}
          toggleFav={toggleFav}
        />
      ) : (
        <>
          <TrendingSection
            s={s}
            trendingCafes={trendingCafes}
            setActiveTab={setActiveTab}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
          />

          <TrendingQuickFiltersSection
            s={s}
            setActiveTab={setActiveTab}
            premiumAccent={premiumAccent}
            quickTrendingFilters={quickTrendingFilters}
            onOpenTrendingFilter={handleOpenTrendingFilter}
          />

          <TopCountrySection
            s={s}
            setActiveTab={setActiveTab}
            perfil={perfil}
            flag={flag}
            cargando={cargando}
            premiumAccent={premiumAccent}
            topCafesVista={topCafesVista}
            CardHorizontal={CardHorizontal}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
          />

          <LatestSection
            s={s}
            setActiveTab={setActiveTab}
            cargando={cargando}
            premiumAccent={premiumAccent}
            ultimosGlobal={ultimosGlobal}
            CardHorizontal={CardHorizontal}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
          />

          <RoasterSpotlightSection
            s={s}
            roasters={roastersDestacados}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
          />

          <ProcessDiscoverySection
            s={s}
            sections={cafesPorProceso}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
          />

          <NearbyCafeteriasSection
            s={s}
            setActiveTab={setActiveTab}
            cargandoCafInicio={cargandoCafInicio}
            premiumAccent={premiumAccent}
            errorCafInicio={errorCafInicio}
            cafeteriasInicio={cafeteriasInicio}
            cargarCafeteriasInicio={cargarCafeteriasInicio}
            theme={theme}
          />

          <BlogSection s={s} />
        </>
      )}
    </View>
  );
}
