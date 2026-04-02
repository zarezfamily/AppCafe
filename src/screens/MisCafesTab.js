import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

export default function MisCafesTab({
  s,
  cargando,
  allCafes,
  registrarEventoGamificacion,
  QuizSection,
  favCafes,
  CardHorizontal,
  setCafeDetalle,
  favs,
  toggleFav,
  busquedaMis,
  setBusquedaMis,
  misCafes,
  SearchInput,
  cafesFiltrados,
  CardVertical,
  eliminarCafe,
  premiumAccent,
}) {
  return (
    <View style={{ paddingTop: 20 }}>
      <View style={{ paddingHorizontal: 16 }}><Text style={s.pageTitle}>Mis Cafés</Text></View>
      {!cargando && <QuizSection allCafes={allCafes} onGamifyEvent={registrarEventoGamificacion} />}

      {favCafes.length > 0 && (
        <>
          <View style={[s.sectionHeader, { marginTop: 24 }]}><Text style={s.sectionTitle}>⭐ Mis favoritos</Text></View>
          <Text style={s.sectionSub}>{favCafes.length} cafés guardados</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
            {favCafes.map((item) => (
              <CardHorizontal key={item.id} item={item} badge={`${item.puntuacion}.0`} onPress={setCafeDetalle} favs={favs} onToggleFav={toggleFav} />
            ))}
          </ScrollView>
        </>
      )}

      <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
        <Text style={[s.sectionTitle, { marginBottom: 12 }]}>Mi colección</Text>
        <SearchInput value={busquedaMis} onChangeText={setBusquedaMis} onSearch={setBusquedaMis} allCafes={misCafes} placeholder="Buscar en tu colección" />
      </View>
      {cargando ? <ActivityIndicator color={premiumAccent} style={{ margin: 30 }} /> : (
        <View style={{ paddingHorizontal: 16 }}>
          {cafesFiltrados.map((item) => <CardVertical key={item.id} item={item} onDelete={eliminarCafe} onPress={setCafeDetalle} favs={favs} onToggleFav={toggleFav} />)}
          {cafesFiltrados.length === 0 && <Text style={s.empty}>{busquedaMis ? 'Sin resultados' : 'No has añadido cafés aún'}</Text>}
        </View>
      )}
    </View>
  );
}
