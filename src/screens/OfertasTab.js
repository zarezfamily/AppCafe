import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { MAIN_TABS } from './mainScreenTabs';
export default function OfertasTab({
  s,
  setActiveTab,
  premiumAccent,
  cafesParaOfertas,
  ofertasPorCafe,
  buscandoOfertaId,
  openOfferCafeId,
  abrirOfertasCafe,
  PackshotImage,
  abrirOfertaWeb,
  theme,
  premiumAccentDeep,
  errorOfertas,
}) {
  return (
    <View style={{ paddingTop: 20 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <TouchableOpacity onPress={() => setActiveTab(MAIN_TABS.HOME)} style={s.backRow}>
          <Ionicons name="chevron-back" size={20} color={premiumAccent} />
          <Text style={s.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={s.pageTitle}>Ofertas de cafés</Text>
        <Text style={s.sectionSub}>Pulsa cualquier café para cargar sus 3 ofertas más baratas encontradas en Google</Text>
      </View>
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        {cafesParaOfertas.map((cafe) => {
          const ofertas = ofertasPorCafe[cafe.id]?.offers || [];
          const buscando = buscandoOfertaId === cafe.id;
          const expanded = openOfferCafeId === cafe.id;
          return (
            <TouchableOpacity
              key={cafe.id}
              style={[s.cardV, { borderBottomColor: '#f2f2f2', marginBottom: 18 }]}
              activeOpacity={0.9}
              onPress={() => abrirOfertasCafe(cafe, { forceRefresh: expanded })}
            >
              <View style={s.cardVImg}>
                <PackshotImage uri={cafe.foto} frameStyle={s.packshotListFrame} imageStyle={s.packshotListImage} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardVName}>{cafe.nombre}</Text>
                <Text style={s.cardVOrigin}>{cafe.pais || 'Sin país'} {cafe.marca ? `· ${cafe.marca}` : ''}</Text>
                <Text style={s.offerHint}>{buscando ? 'Buscando ofertas en Google...' : expanded ? 'Pulsa de nuevo para refrescar resultados' : 'Pulsa para ver las 3 ofertas más baratas en Google'}</Text>

                {buscando && <ActivityIndicator color={premiumAccent} style={{ marginTop: 12, alignSelf: 'flex-start' }} />}

                {expanded && ofertas.length > 0 && (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {ofertas.map((of) => (
                      <TouchableOpacity
                        key={of.id}
                        onPress={() => abrirOfertaWeb(of)}
                        style={{ backgroundColor: theme.surface.subtle, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: theme.border.soft }}
                      >
                        <View style={s.offerMetaRow}>
                          <Text style={{ fontSize: 12, color: '#777', flex: 1 }}>{of.tienda}</Text>
                          <Text style={s.offerSourceBadge}>Google</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text.primary }} numberOfLines={2}>{of.titulo}</Text>
                        <Text style={{ fontSize: 13, color: premiumAccentDeep, fontWeight: '700' }}>{of.precioTexto} · Ver oferta</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        {cafesParaOfertas.length === 0 && <Text style={s.empty}>No hay cafés en base de datos.</Text>}
        {!!errorOfertas && <Text style={[s.empty, { marginTop: 8 }]}>{errorOfertas}</Text>}
      </View>
    </View>
  );
}
