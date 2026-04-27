import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import DailyChallengeSection from '../components/DailyChallengeSection';
import HeroCafeCard from '../components/HeroCafeCard';
import MemberInfoModal from '../components/MemberInfoModal';
import { HeroCafeSkeleton } from '../components/SkeletonLoader';
import { getHeroCafe } from '../domain/coffee/heroCoffee';
import { getLiveRankingBuckets } from '../domain/coffee/liveRankings';
import useCollapsibleSections from '../hooks/useCollapsibleSections';
import useDailyChallenge from '../hooks/useDailyChallenge';
import {
  BioCoffeeSection,
  DailyCoffeeSection,
  InicioTopBar,
  LiveRankingSection,
  NearbyCafeteriasSection,
  SearchResultsSection,
  SocialFeedSection,
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

function HeroArea({ showHeroSkeleton, heroEntry, premiumAccent, setCafeDetalle, setActiveTab }) {
  if (showHeroSkeleton) return <HeroCafeSkeleton />;
  if (!heroEntry?.cafe) return null;
  return (
    <HeroCafeCard
      item={heroEntry.cafe}
      variant={heroEntry.variant}
      premiumAccent={premiumAccent}
      onOpenCafe={(item) => setCafeDetalle(item)}
      onOpenRanking={() => setActiveTab(MAIN_TABS.TOP)}
    />
  );
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
  cargandoCafInicio,
  errorCafInicio,
  cafeteriasInicio,
  cargarCafeteriasInicio,
  theme,
  onGamifyEvent,
}) {
  const [showMemberInfo, setShowMemberInfo] = useState(false);

  const { isCollapsed, toggle } = useCollapsibleSections([
    'liveRanking',
    'specialty',
    'daily',
    'bio',
    'stepUp',
    'social',
    'cafeterias',
  ]);

  const handleMemberRoastLongPress = () => {
    setShowMemberInfo(true);
  };

  const daily = useDailyChallenge({ allCafes });

  const handleDailyComplete = useCallback(() => {
    const newBadge = daily.completeDailyChallenge();
    onGamifyEvent?.('daily_challenge', {
      bestStreak: daily.bestStreak,
      coffeeId: daily.dailyCoffee?.id,
    });
    return newBadge;
  }, [daily, onGamifyEvent]);

  const specialtyCafes = useMemo(() => {
    return (allCafes || []).filter(
      (item) => normalizeCategory(item) === 'specialty' && item?.qualityLevel !== 'commercial'
    );
  }, [allCafes]);

  const dailyCafes = useMemo(() => {
    return (allCafes || []).filter((item) => normalizeCategory(item) === 'daily');
  }, [allCafes]);

  const specialtyTopIds = useMemo(() => {
    const sorted = [...specialtyCafes].sort(
      (a, b) =>
        Number(b?.rankingScore || b?.puntuacion || 0) -
        Number(a?.rankingScore || a?.puntuacion || 0)
    );
    return new Set(sorted.slice(0, 25).map((c) => c.id));
  }, [specialtyCafes]);

  const bioCafes = useMemo(() => {
    return (allCafes || []).filter((item) => hasBioTag(item) && !specialtyTopIds.has(item.id));
  }, [allCafes, specialtyTopIds]);

  const stepUpPairs = useMemo(() => {
    return buildStepUpPairs(dailyCafes, specialtyCafes);
  }, [dailyCafes, specialtyCafes]);

  const heroEntry = useMemo(
    () => getHeroCafe(allCafes, { userSeedKey: profileAlias || perfil?.uid || '' }),
    [allCafes, perfil?.uid, profileAlias]
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
        <View>
          <HeroArea
            showHeroSkeleton={showHeroSkeleton}
            heroEntry={heroEntry}
            premiumAccent={premiumAccent}
            setCafeDetalle={setCafeDetalle}
            setActiveTab={setActiveTab}
          />

          <DailyChallengeSection
            dailyCoffee={daily.dailyCoffee}
            completedToday={daily.completedToday}
            streak={daily.streak}
            bestStreak={daily.bestStreak}
            nextBadge={daily.nextBadge}
            onComplete={handleDailyComplete}
            onOpenCafe={(item) => setCafeDetalle(item)}
          />

          <LiveRankingSection
            s={s}
            rankingBuckets={liveRankingBuckets}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
            collapsed={isCollapsed('liveRanking')}
            onToggle={() => toggle('liveRanking')}
          />

          <SpecialtyForYouSection
            s={s}
            cafes={specialtyCafes}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
            collapsed={isCollapsed('specialty')}
            onToggle={() => toggle('specialty')}
          />

          <DailyCoffeeSection
            s={s}
            cafes={dailyCafes}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
            collapsed={isCollapsed('daily')}
            onToggle={() => toggle('daily')}
          />

          <BioCoffeeSection
            s={s}
            cafes={bioCafes}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
            collapsed={isCollapsed('bio')}
            onToggle={() => toggle('bio')}
          />

          <StepUpSection
            s={s}
            pairs={stepUpPairs}
            setCafeDetalle={setCafeDetalle}
            favs={favs}
            toggleFav={toggleFav}
            CardHorizontal={CardHorizontal}
            collapsed={isCollapsed('stepUp')}
            onToggle={() => toggle('stepUp')}
          />

          <SocialFeedSection
            s={s}
            allCafes={allCafes}
            setCafeDetalle={setCafeDetalle}
            setActiveTab={setActiveTab}
            collapsed={isCollapsed('social')}
            onToggle={() => toggle('social')}
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
            collapsed={isCollapsed('cafeterias')}
            onToggle={() => toggle('cafeterias')}
          />
        </View>
      )}
    </View>
  );
}
