import { useState } from 'react';
import { Text, View } from 'react-native';
import MemberInfoModal from '../components/MemberInfoModal';
import {
  BlogSection,
  InicioTopBar,
  LatestSection,
  NearbyCafeteriasSection,
  SearchResultsSection,
  TopCountrySection,
} from './inicioTabSections';

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
  cargando,
  premiumAccent,
  CardHorizontal,
  topCafesVista,
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
        onSearch={(q) => { setBusqueda(q); }}
        allCafes={allCafes}
        placeholder="Buscar cualquier café..."
      />

      {busqueda.trim()
        ? <>
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
          </>
        : <>
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

            <BlogSection s={s} />

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
          </>
      }
    </View>
  );
}
