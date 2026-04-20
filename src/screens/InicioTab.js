import { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MemberInfoModal from '../components/MemberInfoModal';
import {
  BioCoffeeSection,
  BlogSection,
  DailyCoffeeSection,
  InicioTopBar,
  NearbyCafeteriasSection,
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
    text.includes('ecológico') ||
    text.includes('ecologico') ||
    text.includes('orgánico') ||
    text.includes('organico') ||
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

function HomePill({ label }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#f3e7d9',
        borderWidth: 1,
        borderColor: '#eadbce',
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '800',
          color: '#8f5e3b',
        }}
      >
        {label}
      </Text>
    </View>
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

  const homeStats = useMemo(() => {
    return {
      specialty: specialtyCafes.length,
      daily: dailyCafes.length,
      bio: bioCafes.length,
      trending: specialtyTrendingCafes.length,
    };
  }, [specialtyCafes, dailyCafes, bioCafes, specialtyTrendingCafes]);

  const topSpecialty = specialtyCafes?.[0] || null;

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

      <View
        style={{
          marginTop: 10,
          marginHorizontal: 16,
          borderWidth: 1,
          borderColor: '#eadbce',
          backgroundColor: '#fffaf5',
          borderRadius: 22,
          padding: 16,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '900',
            color: '#8f5e3b',
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          ETIOVE HOME
        </Text>

        <Text
          style={{
            fontSize: 24,
            fontWeight: '900',
            color: '#24160f',
          }}
        >
          Inicio Premium
        </Text>

        <Text
          style={{
            marginTop: 8,
            fontSize: 14,
            lineHeight: 22,
            color: '#6f5a4b',
          }}
        >
          Tu punto de entrada a ETIOVE: specialty, diario, BIO, descubrimiento y cafeterías cercanas
          en una home más limpia.
        </Text>

        <View
          style={{
            marginTop: 14,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <HomePill label={`${homeStats.specialty} specialty`} />
          <HomePill label={`${homeStats.daily} diario`} />
          <HomePill label={`${homeStats.bio} BIO`} />
          <HomePill label={`${homeStats.trending} trending`} />
        </View>
      </View>

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
          {!!topSpecialty && (
            <View
              style={{
                marginTop: 18,
                marginHorizontal: 16,
                borderWidth: 1,
                borderColor: '#eadbce',
                backgroundColor: '#fffaf5',
                borderRadius: 20,
                padding: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '900',
                  color: '#8f5e3b',
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                RECOMENDACIÓN HOME
              </Text>

              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '900',
                  color: '#24160f',
                }}
              >
                {topSpecialty.nombre}
              </Text>

              <Text
                style={{
                  marginTop: 6,
                  fontSize: 14,
                  lineHeight: 20,
                  color: '#6f5a4b',
                }}
              >
                {topSpecialty.roaster || topSpecialty.marca || 'ETIOVE'}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity
                  onPress={() => setCafeDetalle(topSpecialty)}
                  activeOpacity={0.9}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    backgroundColor: '#111827',
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Ver ficha</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab(MAIN_TABS.TOP)}
                  activeOpacity={0.9}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    backgroundColor: '#f3e7d9',
                    borderWidth: 1,
                    borderColor: '#eadbce',
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#8f5e3b', fontSize: 13, fontWeight: '800' }}>
                    Ir a ranking
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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
