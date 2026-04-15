import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { normalize } from '../core/utils';
import QuizSection from './QuizSection';

export default function MisCafesTab({
  s,
  cargando,
  allCafes,
  quizSectionProps,
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
  notebook,
  theme,
  DiarioCatasSection,
}) {
  const query = (busquedaMis || '').trim();
  const hasQuery = query.length > 0;

  const containsQuery = (value) => normalize(String(value || '')).includes(normalize(query));
  const matchesCafe = (cafe) =>
    containsQuery(cafe?.nombre) ||
    containsQuery(cafe?.pais) ||
    containsQuery(cafe?.region) ||
    containsQuery(cafe?.origen) ||
    containsQuery(cafe?.variedad) ||
    containsQuery(cafe?.proceso) ||
    containsQuery(cafe?.notas);

  const cafesParaTiFiltrados = hasQuery ? (allCafes || []).filter(matchesCafe).slice(0, 8) : [];
  const favoritosFiltrados = hasQuery ? (favCafes || []).filter(matchesCafe).slice(0, 8) : [];

  const suggestionSource = [...(allCafes || []), ...(favCafes || []), ...(misCafes || [])].filter(
    (item, index, arr) => index === arr.findIndex((x) => x.id === item.id)
  );

  const sectionCardStyle = {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8dcc8',
    backgroundColor: '#faf8f5',
  };

  return (
    <View style={{ paddingTop: 20 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={s.pageTitle}>Mis Cafés</Text>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <SearchInput
          value={busquedaMis}
          onChangeText={setBusquedaMis}
          onSearch={setBusquedaMis}
          allCafes={suggestionSource}
          placeholder="Buscar en Cafés para ti, favoritos y tu colección"
        />
      </View>

      {!cargando && (
        <View style={sectionCardStyle}>
          <QuizSection {...quizSectionProps} />
        </View>
      )}

      {notebook && (
        <View style={sectionCardStyle}>
          <DiarioCatasSection
            s={s}
            theme={theme}
            premiumAccent={premiumAccent}
            catas={notebook.catas || []}
            catasFiltradas={notebook.catasFiltradas || []}
            stats={notebook.stats || { totalCatas: 0, promedioPuntuacion: 0, cafesProbados: 0 }}
            filtroPeriodo={notebook.filtroPeriodo}
            setFiltroPeriodo={notebook.setFiltroPeriodo}
            irAbrirModal={notebook.irAbrirModal}
            irAbrirDetail={notebook.irAbrirDetail}
          />
        </View>
      )}

      {favCafes.length > 0 && (
        <View style={sectionCardStyle}>
          <View style={[s.sectionHeader, { marginTop: 0 }]}>
            <Text style={s.sectionTitle}>⭐ Mis favoritos</Text>
          </View>
          <Text style={s.sectionSub}>{favCafes.length} cafés guardados</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}
          >
            {favCafes.map((item) => (
              <CardHorizontal
                key={item.id}
                item={item}
                badge={`${item.puntuacion}.0`}
                onPress={setCafeDetalle}
                favs={favs}
                onToggleFav={toggleFav}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={sectionCardStyle}>
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={[s.sectionTitle, { marginBottom: 12 }]}>Mi colección</Text>
          <Text style={s.sectionSub}>Tu archivo personal de catas y cafés guardados.</Text>
        </View>

        {hasQuery && (
          <>
            <View style={[s.sectionHeader, { marginTop: 12 }]}>
              <Text style={s.sectionTitle}>Coincidencias en Cafés para ti</Text>
            </View>
            <Text style={s.sectionSub}>{cafesParaTiFiltrados.length} resultados</Text>
            {cafesParaTiFiltrados.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}
              >
                {cafesParaTiFiltrados.map((item) => (
                  <CardHorizontal
                    key={`pt-${item.id}`}
                    item={item}
                    badge={`${item.puntuacion}.0`}
                    onPress={setCafeDetalle}
                    favs={favs}
                    onToggleFav={toggleFav}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={{ paddingHorizontal: 16 }}>
                <Text style={s.empty}>Sin resultados en Cafés para ti</Text>
              </View>
            )}

            <View style={[s.sectionHeader, { marginTop: 18 }]}>
              <Text style={s.sectionTitle}>Coincidencias en Mis favoritos</Text>
            </View>
            <Text style={s.sectionSub}>{favoritosFiltrados.length} resultados</Text>
            {favoritosFiltrados.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}
              >
                {favoritosFiltrados.map((item) => (
                  <CardHorizontal
                    key={`fav-${item.id}`}
                    item={item}
                    badge={`${item.puntuacion}.0`}
                    onPress={setCafeDetalle}
                    favs={favs}
                    onToggleFav={toggleFav}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={{ paddingHorizontal: 16 }}>
                <Text style={s.empty}>Sin resultados en favoritos</Text>
              </View>
            )}

            <View style={[s.sectionHeader, { marginTop: 18 }]}>
              <Text style={s.sectionTitle}>Coincidencias en Mi colección</Text>
            </View>
            <Text style={s.sectionSub}>{cafesFiltrados.length} resultados</Text>
          </>
        )}

        {cargando ? (
          <ActivityIndicator color={premiumAccent} style={{ margin: 30 }} />
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            {cafesFiltrados.map((item) => (
              <CardVertical
                key={item.id}
                item={item}
                onDelete={eliminarCafe}
                onPress={setCafeDetalle}
                favs={favs}
                onToggleFav={toggleFav}
              />
            ))}
            {cafesFiltrados.length === 0 && (
              <Text style={s.empty}>
                {busquedaMis ? 'Sin resultados' : 'No has añadido cafés aún'}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
