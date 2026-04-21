import { useMemo, useState } from 'react';
import { View } from 'react-native';
import HeroCafeCard from '../components/HeroCafeCard';
import MemberInfoModal from '../components/MemberInfoModal';
import { HeroCafeSkeleton } from '../components/SkeletonLoader';
import { getHeroCafe } from '../domain/coffee/heroCoffee';
import { getLiveRankingBuckets } from '../domain/coffee/liveRankings';
import { getPersonalizedCoffeeFeed } from '../domain/coffee/personalizedCoffee';
import {
  BioCoffeeSection,
  BlogSection,
  DailyCoffeeSection,
  InicioTopBar,
  LiveRankingSection,
  NearbyCafeteriasSection,
  PersonalizedForYouSection,
  SearchResultsSection,
  SpecialtyForYouSection,
  StepUpSection,
} from './inicioTabSections';
import { MAIN_TABS } from './mainScreenTabs';

function normalizeCategory(item) {
  const c = item?.coffeeCategory;
  if (c === 'daily') return 'daily';
  if (c === 'commercial') return 'commercial';
  return 'specialty';
}

function sortByRating(items) {
  return [...(items || [])].sort((a, b) => Number(b?.puntuacion || 0) - Number(a?.puntuacion || 0));
}

function hasBioTag(item) {
  if (item?.isBio === true) return true;
  if (item?.isBio === false) return false;

  const text = [item?.certificaciones, item?.notas, item?.nombre, item?.marca, item?.roaster]
    .map((v) => String(v || '').toLowerCase())
    .join(' ');

  return (
    text.includes('bio') ||
    text.includes('ecologico') ||
    text.includes('ecológico') ||
    text.includes('organico') ||
    text.includes('orgánico') ||
    text.includes('organic')
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
    return (allCafes || []).filter(
      (item) => item?.coffeeCategory === 'specialty' && item?.qualityLevel !== 'commercial'
    );
  }, [allCafes]);

  const dailyCafes = useMemo(() => {
    return (allCafes || []).filter((item) => normalizeCategory(item) === 'daily');
  }, [allCafes]);

  const bioCafes = useMemo(() => {
    return (allCafes || []).filter((item) => hasBioTag(item));
  }, [allCafes]);

  const specialtyTrendingCafes = useMemo(() => {
    return (trendingCafes || []).filter(
      (item) => item?.coffeeCategory === 'specialty' && item?.qualityLevel !== 'commercial'
    );
  }, [trendingCafes]);

  const stepUpPairs = useMemo(() => {
    return buildStepUpPairs(dailyCafes, specialtyCafes);
  }, [dailyCafes, specialtyCafes]);

  const heroEntry = useMemo(
    () => getHeroCafe(allCafes, { userSeedKey: profileAlias || perfil?.uid || '' }),
    [allCafes, perfil?.uid, profileAlias]
  );
  const personalizedFeed = useMemo(
    () => getPersonalizedCoffeeFeed(allCafes, favs),
    [allCafes, favs]
  );
  const liveRankingBuckets = useMemo(() => getLiveRankingBuckets(allCafes), [allCafes]);
  const showHeroSkeleton = !busqueda?.trim() && (!Array.isArray(allCafes) || allCafes.length === 0);

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

      <View style={{ marginTop: 14, marginHorizontal: 16 }}>
        <SearchInput
          value={busqueda}
          onChangeText={setBusqueda}
          onSearch={(q) => {
            setBusqueda(q);
          }}
          allCafes={allCafes}
          placeholder="Buscar en ETIOVE... café, origen, proceso o tostador"
        />
      </View>

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
          {showHeroSkeleton ? <HeroCafeSkeleton /> : null}

          {!!heroEntry?.cafe && (
            <HeroCafeCard
              item={heroEntry.cafe}
              variant={heroEntry.variant}
              premiumAccent={premiumAccent}
              onOpenCafe={(item) => setCafeDetalle(item)}
              onOpenRanking={() => setActiveTab(MAIN_TABS.TOP)}
            />
          )}

          <PersonalizedForYouSection
            s={s}
            title={personalizedFeed?.title}
            subtitle={personalizedFeed?.subtitle}
            cafes={personalizedFeed?.items || []}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
          />

          <PersonalizedForYouSection
            s={s}
            title={personalizedFeed?.dailyUpgrade?.title}
            subtitle={personalizedFeed?.dailyUpgrade?.subtitle}
            cafes={personalizedFeed?.dailyUpgrade?.items || []}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
          />

          <LiveRankingSection
            s={s}
            rankingBuckets={liveRankingBuckets}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
          />

          <SpecialtyForYouSection
            s={s}
            cafes={specialtyTrendingCafes.length ? specialtyTrendingCafes : specialtyCafes}
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
