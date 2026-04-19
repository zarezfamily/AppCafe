import { useMemo, useState } from 'react';
import { View } from 'react-native';
import MemberInfoModal from '../components/MemberInfoModal';
import {
  BioCoffeeSection,
  BlogSection,
  DailyCoffeeSection,
  ExploreHomeSection,
  InicioTopBar,
  NearbyCafeteriasSection,
  SearchResultsSection,
  SpecialtyForYouSection,
  StepUpSection,
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

function hasBioTag(item) {
  const text = [item?.certificaciones, item?.notas, item?.nombre, item?.marca, item?.roaster]
    .map((v) => String(v || '').toLowerCase())
    .join(' ');

  return (
    text.includes('bio') ||
    text.includes('ecológico') ||
    text.includes('ecologico') ||
    text.includes('orgánico') ||
    text.includes('organico')
  );
}

function buildStepUpPairs(dailyCafes, specialtyCafes) {
  const dailySorted = sortByRating(dailyCafes).slice(0, 3);
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
  profileInitial,
  profileAlias,
  profileName,
  currentLevel,
  gamification,
  nextLevel,
  busqueda,
  setBusqueda,
  SearchInput,
  allCafes,
  filtrar,
  CardVertical,
  setCafeDetalle,
  favs,
  toggleFav,
  setActiveTab,
  setTrendingFilters,
  premiumAccent,
  CardHorizontal,
  trendingCafes,
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

  const bioCafes = useMemo(() => {
    return (allCafes || []).filter((item) => hasBioTag(item));
  }, [allCafes]);

  const specialtyTrendingCafes = useMemo(() => {
    return (trendingCafes || []).filter((item) => normalizeCategory(item) === 'specialty');
  }, [trendingCafes]);

  const quickTrendingFilters = useMemo(() => {
    return {
      paises: buildUniqueOptions(specialtyTrendingCafes, 'pais', 4),
      procesos: buildUniqueOptions(specialtyTrendingCafes, 'proceso', 4),
      roasters: buildUniqueOptions(specialtyTrendingCafes, 'roaster', 4),
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
        profileInitial={profileInitial}
        profileAlias={profileAlias}
        profileName={profileName}
        currentLevel={currentLevel}
        gamification={gamification}
        nextLevel={nextLevel}
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

          <BioCoffeeSection
            s={s}
            cafes={bioCafes}
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

          <ExploreHomeSection
            s={s}
            setActiveTab={setActiveTab}
            premiumAccent={premiumAccent}
            onOpenTrendingFilter={handleOpenTrendingFilter}
            quickTrendingFilters={quickTrendingFilters}
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
