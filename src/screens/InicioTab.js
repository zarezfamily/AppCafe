import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HorizontalCardRow from '../components/HorizontalCardRow';
import SectionHeaderNav from '../components/SectionHeaderNav';

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
  theme,
  cafesParaOfertas,
  abrirOfertasCafe,
  PackshotImage,
  abrirOfertaWeb,
  ofertasPorCafe,
  buscandoOfertaId,
  openOfferCafeId,
  errorOfertas,
}) {
  return (
    <View>
      <View style={s.topBar}>
        <View style={s.homeBrandWrap}>
          <Text style={s.homeWordmark}>ETIOVE</Text>
          <View style={s.homeLoverRow}>
            <Text style={s.homeLoverText}>SPECIALTY</Text>
            <View style={s.homeMiniSealOuter}>
              <View style={s.homeMiniSealMiddle}>
                <View style={s.homeMiniSealInner}>
                  <Text style={s.homeMiniSealText}>E</Text>
                </View>
              </View>
            </View>
            <Text style={s.homeLoverText}>COFFEE</Text>
          </View>
        </View>
        <TouchableOpacity style={s.locationPill} onPress={() => setShowProfile(true)}>
          <View style={s.brandDecorOne} />
          <View style={s.brandDecorTwo} />
          <View style={s.brandTopRule} />
          <Animated.View style={[s.brandPillContent, { opacity: brandCardAnim, transform: [{ translateY: brandCardTranslateY }, { scale: brandCardScale }] }]}>
            <Text style={s.brandEyebrow}>Member Roast Card</Text>
            <View style={s.brandMemberRow}>
              <View style={s.brandMemberIdentity}>
                {perfil.foto
                  ? <Image source={{ uri: perfil.foto }} style={s.brandMemberAvatar} />
                  : <View style={s.brandMemberAvatarFallback}><Text style={s.brandMemberAvatarText}>{profileInitial}</Text></View>
                }
                <View style={s.brandMemberCopy}>
                  <Text style={s.brandAlias}>@{profileAlias.replace(/^@+/, '')}</Text>
                  <Text style={s.brandName} numberOfLines={1}>{profileName}</Text>
                </View>
              </View>
              <View style={s.brandLevelBadge}>
                <Text style={s.brandLevelText}>{currentLevel.icon} {currentLevel.name}</Text>
              </View>
            </View>
            <View style={s.brandRow}>
              <View style={s.brandTitleWrap}>
                <Text style={s.brandXpText}>{gamification.xp} XP acumulados</Text>
              </View>
            </View>
            <View style={s.brandMetaRow}>
              <Text style={s.brandMetaText}>{nextLevel ? `Próximo nivel: ${nextLevel.name}` : 'Nivel máximo alcanzado'}</Text>
              {nextLevel && <Text style={s.brandMetaText}>{nextLevel.minXp} XP</Text>}
            </View>
            <View style={s.brandProgressTrack}>
              <Animated.View style={[s.brandProgressFill, { width: brandProgressWidth }]} />
            </View>
            <View style={s.brandStatsRow}>
              <View style={s.brandStatCard}>
                <Text style={s.brandStatValue}>{gamification.votesCount}</Text>
                <Text style={s.brandStatLabel}>Votos</Text>
              </View>
              <View style={s.brandStatCard}>
                <Text style={s.brandStatValue}>{gamification.photosCount}</Text>
                <Text style={s.brandStatLabel}>Fotos</Text>
              </View>
              <View style={s.brandStatCard}>
                <Text style={s.brandStatValue}>{gamification.reviewsCount}</Text>
                <Text style={s.brandStatLabel}>Reseñas</Text>
              </View>
              <View style={s.brandStatCard}>
                <Text style={s.brandStatValue}>{gamification.favoritesMarkedCount}</Text>
                <Text style={s.brandStatLabel}>Favoritos</Text>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>

      <SearchInput
        value={busqueda}
        onChangeText={setBusqueda}
        onSearch={(q) => { setBusqueda(q); }}
        allCafes={allCafes}
        placeholder="Buscar cualquier café..."
      />

      {busqueda.trim()
        ? <>
            <View style={s.sectionHeader}><Text style={s.sectionTitle}>Resultados ({filtrar(allCafes, busqueda).length})</Text></View>
            <View style={{ paddingHorizontal: 16 }}>
              {filtrar(allCafes, busqueda).map((item) => <CardVertical key={item.id} item={item} onDelete={() => {}} onPress={setCafeDetalle} favs={favs} onToggleFav={toggleFav} />)}
            </View>
          </>
        : <>
            <SectionHeaderNav s={s} title="Últimos añadidos" onPress={() => setActiveTab('Últimos añadidos')} />
            <Text style={s.sectionSub}>Los 10 más recientes de la comunidad</Text>
            <HorizontalCardRow
              s={s}
              loading={cargando}
              loadingColor={premiumAccent}
              items={ultimosGlobal}
              renderItem={(item) => (
                <CardHorizontal key={item.id} item={item} badge={`${item.puntuacion}.0`} onPress={setCafeDetalle} favs={favs} onToggleFav={toggleFav} />
              )}
              emptyText="Aún no hay cafés."
            />

            <SectionHeaderNav s={s} title={`Top cafés en ${perfil.pais || 'España'} ${flag}`} onPress={() => setActiveTab('Top cafés')} marginTop={28} />
            <Text style={s.sectionSub}>Los mejor puntuados · filtrando por tu país</Text>
            <HorizontalCardRow
              s={s}
              loading={cargando}
              loadingColor={premiumAccent}
              items={topCafesVista.slice(0, 10)}
              renderItem={(item) => (
                <CardHorizontal key={item.id} item={item} badge={`${item.puntuacion}.0 ⭐`} onPress={setCafeDetalle} favs={favs} onToggleFav={toggleFav} />
              )}
              emptyText="Aún no hay cafés."
            />

            <SectionHeaderNav s={s} title="Cafeterías cerca de ti" onPress={() => setActiveTab('Cafeterías')} marginTop={28} />
            <Text style={s.sectionSub}>Se cargan automáticamente al entrar en Inicio</Text>
            {cargandoCafInicio ? (
              <ActivityIndicator color={premiumAccent} style={{ margin: 18 }} />
            ) : errorCafInicio ? (
              <View style={{ paddingHorizontal: 16 }}>
                <Text style={[s.empty, { marginTop: 6 }]}>{errorCafInicio}</Text>
              </View>
            ) : (
              <HorizontalCardRow
                s={s}
                loading={false}
                loadingColor={premiumAccent}
                loadingMargin={18}
                items={cafeteriasInicio}
                renderItem={(cafItem) => (
                  <TouchableOpacity key={cafItem.id} style={s.cardH} onPress={() => setActiveTab('Cafeterías')} activeOpacity={0.88}>
                    <View style={s.cardHImg}>
                      {cafItem.foto
                        ? <Image source={{ uri: cafItem.foto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        : <View style={[styles.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2ece5' }]}><Text style={{ fontSize: 30 }}>☕</Text></View>
                      }
                      <View style={[s.badgeRed, { right: 8, left: 'auto' }]}>
                        <Text style={s.badgeText}>{cafItem.abierto === null ? '—' : cafItem.abierto ? 'Abierto' : 'Cerrado'}</Text>
                      </View>
                    </View>
                    <Text style={s.cardHName} numberOfLines={2}>{cafItem.nombre}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <Ionicons name="star" size={12} color={theme.status.favorite} />
                      <Text style={s.cardHRating}>{cafItem.rating}</Text>
                      <Text style={s.cardHVotos}>({cafItem.numResenas})</Text>
                    </View>
                    <Text style={s.cardHOrigin}>{cafItem.distancia < 1000 ? `${cafItem.distancia}m` : `${(cafItem.distancia / 1000).toFixed(1)}km`}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <SectionHeaderNav s={s} title="Ofertas de cafés (web)" onPress={() => setActiveTab('Ofertas')} marginTop={28} />
            <Text style={s.sectionSub}>Pulsa un café y te mostramos las 3 ofertas más baratas encontradas en Google</Text>
            <HorizontalCardRow
              s={s}
              loading={cargando}
              loadingColor={premiumAccent}
              loadingMargin={20}
              items={cafesParaOfertas.slice(0, 10)}
              renderItem={(cafe) => (
                <TouchableOpacity key={cafe.id} style={s.cardH} onPress={() => abrirOfertasCafe(cafe, { navigate: true })} activeOpacity={0.88}>
                  <View style={s.cardHImg}><PackshotImage uri={cafe.foto} frameStyle={s.packshotCardFrame} imageStyle={s.packshotCardImage} /></View>
                  <Text style={s.cardHOrigin} numberOfLines={1}>{cafe.pais || 'Sin país'}</Text>
                  <Text style={s.cardHName} numberOfLines={2}>{cafe.nombre}</Text>
                  <Text style={s.cardHVotos} numberOfLines={2}>Pulsa para ver 3 ofertas en Google</Text>
                </TouchableOpacity>
              )}
              emptyText="No hay cafés en base de datos."
            />
          </>
      }
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
