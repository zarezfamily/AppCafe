import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { SkeletonVerticalList } from '../components/SkeletonLoader';
import { MAIN_TABS } from './mainScreenTabs';

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
}) {
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
            ETIOVE DISCOVERY
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
          {items.map((item) => (
            <CardVertical
              key={item.id}
              item={item}
              onDelete={() => {}}
              onPress={setCafeDetalle}
              favs={favs}
              onToggleFav={toggleFav}
            />
          ))}

          {items.length === 0 ? (
            <Text style={[s.empty, { marginTop: 14 }]}>{emptyText}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
