import { useMemo, useState } from 'react';
import { View } from 'react-native';
import MemberInfoModal from '../components/MemberInfoModal';
import {
  BestValueSection,
  BlogSection,
  DailyCoffeeSection,
  DailyTopSection,
  InicioTopBar,
  LatestSection,
  NearbyCafeteriasSection,
  ProcessDiscoverySection,
  RoasterSpotlightSection,
  SearchResultsSection,
  SpecialtyForYouSection,
  StepUpSection,
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

function normalizeCategory(item) {
  return item?.coffeeCategory === 'daily' ? 'daily' : 'specialty';
}

function sortByRating(items) {
  return [...(items || [])].sort((a, b) => Number(b?.puntuacion || 0) - Number(a?.puntuacion || 0));
}

function sortByValue(items) {
  return [...(items || [])].sort((a, b) => {
    const aScore = Number(a?.puntuacion || 0);
    const bScore = Number(b?.puntuacion || 0);
    const aPrice = Number(a?.precio || 999999);
    const bPrice = Number(b?.precio || 999999);

    const aValue = aPrice > 0 ? aScore / aPrice : 0;
    const bValue = bPrice > 0 ? bScore / bPrice : 0;

    return bValue - aValue;
  });
}

function buildStepUpPairs(dailyCafes, specialtyCafes) {
  const dailySorted = sortByRating(dailyCafes).slice(0, 4);
  const specialtySorted = sortByRating(specialtyCafes);

  return dailySorted
    .map((dailyCafe) => {
      const target = specialtySorted.find((specialtyCafe) => {
        const sameProcess =
          String(specialtyCafe?.proceso || '').trim() &&
          String(dailyCafe?.proceso || '').trim() &&
          String(specialtyCafe?.proceso || '').toLowerCase() ===
            String(dailyCafe?.proceso || '').toLowerCase();

        const sameOrigin =
          String(specialtyCafe?.origen || specialtyCafe?.pais || '').trim() &&
          String(dailyCafe?.origen || dailyCafe?.pais || '').trim() &&
          String(specialtyCafe?.origen || specialtyCafe?.pais || '').toLowerCase() ===
            String(dailyCafe?.origen || dailyCafe?.pais || '').toLowerCase();

        return sameProcess || sameOrigin;
      });

      return target
        ? {
            daily: dailyCafe,
            specialty: target,
          }
        : null;
    })
    .filter(Boolean);
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

  const specialtyCafes = useMemo(() => {
    return (allCafes || []).filter((item) => normalizeCategory(item) === 'specialty');
  }, [allCafes]);

  const dailyCafes = useMemo(() => {
    return (allCafes || []).filter((item) => normalizeCategory(item) === 'daily');
  }, [allCafes]);

  const specialtyTrendingCafes = useMemo(() => {
    return (trendingCafes || []).filter((item) => normalizeCategory(item) === 'specialty');
  }, [trendingCafes]);

  const quickTrendingFilters = useMemo(() => {
    return {
      paises: buildUniqueOptions(specialtyTrendingCafes, 'pais', 6),
      procesos: buildUniqueOptions(specialtyTrendingCafes, 'proceso', 6),
      roasters: buildUniqueOptions(specialtyTrendingCafes, 'roaster', 6),
    };
  }, [specialtyTrendingCafes]);

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

    specialtyCafes.forEach((cafe) => {
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
  }, [specialtyCafes]);

  const cafesPorProceso = useMemo(() => {
    const preferidos = ['Lavado', 'Natural', 'Honey', 'Anaeróbico', 'Experimental'];

    const grouped = {};
    specialtyCafes.forEach((cafe) => {
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
  }, [specialtyCafes]);

  const topDailyCafes = useMemo(() => {
    return sortByRating(dailyCafes);
  }, [dailyCafes]);

  const bestValueCafes = useMemo(() => {
    return sortByValue(allCafes).filter((item) => Number(item?.precio || 0) > 0);
  }, [allCafes]);

  const stepUpPairs = useMemo(() => {
    return buildStepUpPairs(dailyCafes, specialtyCafes);
  }, [dailyCafes, specialtyCafes]);

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
          <SpecialtyForYouSection
            s={s}
            cafes={specialtyCafes}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
          />

          <DailyCoffeeSection
            s={s}
            cafes={dailyCafes}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
          />

          <DailyTopSection
            s={s}
            cafes={topDailyCafes}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
          />

          <BestValueSection
            s={s}
            cafes={bestValueCafes}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
          />

          <StepUpSection
            s={s}
            pairs={stepUpPairs}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
          />

          <TrendingSection
            s={s}
            trendingCafes={specialtyTrendingCafes}
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
