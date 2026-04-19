import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { SkeletonVerticalList } from '../components/SkeletonLoader';
import { MAIN_TABS } from './mainScreenTabs';

function TopBadge({ label }) {
  return (
    <View
      style={{
        borderRadius: 999,
        backgroundColor: '#f3e7d9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignSelf: 'flex-start',
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          color: '#8f5e3b',
          fontWeight: '800',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function SimpleCoffeeListTab({
  s,
  setActiveTab,
  premiumAccent,
  cargando,
  title,
  subtitle,
  helperText,
  items,
  categoryLabel = 'Especialidad',
  CardVertical,
  setCafeDetalle,
  favs,
  toggleFav,
  emptyText,
  heroBadge = 'TOP ETIOVE',
}) {
  const hero = items?.[0] || null;
  const rest = items?.slice(1) || [];

  return (
    <View style={{ paddingTop: 20 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <TouchableOpacity onPress={() => setActiveTab(MAIN_TABS.HOME)} style={s.backRow}>
          <Ionicons name="chevron-back" size={20} color={premiumAccent} />
          <Text style={s.backText}>Volver</Text>
        </TouchableOpacity>

        <Text style={s.pageTitle}>{title}</Text>
        <Text style={s.sectionSub}>{subtitle}</Text>

        <View
          style={{
            marginTop: 14,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: '#eadbce',
            backgroundColor: '#faf7f2',
            padding: 14,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: '#8f5e3b',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            ETIOVE RANKING
          </Text>

          <Text
            style={{
              fontSize: 13,
              lineHeight: 19,
              color: '#6f5a4b',
            }}
          >
            {helperText || 'Explora esta selección de cafés de la comunidad.'}
          </Text>

          <View
            style={{
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: '#7d6a5a',
                fontWeight: '700',
              }}
            >
              {items.length} cafés en esta vista
            </Text>

            <View
              style={{
                borderRadius: 999,
                backgroundColor: '#f3e7d9',
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: '#8f5e3b',
                  fontWeight: '800',
                }}
              >
                {categoryLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {cargando ? (
        <SkeletonVerticalList />
      ) : (
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          {!!hero && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setCafeDetalle(hero)}
              style={{
                marginBottom: 16,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: '#eadbce',
                backgroundColor: '#fffaf5',
                padding: 16,
              }}
            >
              <TopBadge label={heroBadge} />
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#24160f' }}>
                {hero.nombre}
              </Text>
              <Text style={{ marginTop: 6, fontSize: 14, color: '#6f5a4b' }}>
                {hero.roaster || hero.marca || 'ETIOVE'}
              </Text>
              <Text style={{ marginTop: 8, fontSize: 14, color: '#8f5e3b', fontWeight: '800' }}>
                {hero.puntuacion || 0}.0 ⭐ · {hero.votos || 0} votos
              </Text>
            </TouchableOpacity>
          )}

          {rest.map((item) => (
            <CardVertical
              key={item.id}
              item={item}
              onDelete={() => {}}
              onPress={setCafeDetalle}
              favs={favs}
              onToggleFav={toggleFav}
            />
          ))}

          {!items.length ? <Text style={[s.empty, { marginTop: 14 }]}>{emptyText}</Text> : null}
        </View>
      )}
    </View>
  );
}
