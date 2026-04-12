import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { SkeletonVerticalList } from '../components/SkeletonLoader';

export default function SimpleCoffeeListTab({
  s,
  setActiveTab,
  premiumAccent,
  cargando,
  title,
  subtitle,
  items,
  CardVertical,
  setCafeDetalle,
  favs,
  toggleFav,
  emptyText,
}) {
  return (
    <View style={{ paddingTop: 20 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <TouchableOpacity onPress={() => setActiveTab('Inicio')} style={s.backRow}>
          <Ionicons name="chevron-back" size={20} color={premiumAccent} />
          <Text style={s.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={s.pageTitle}>{title}</Text>
        <Text style={s.sectionSub}>{subtitle}</Text>
      </View>
      {cargando ? <SkeletonVerticalList /> : (
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
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
          {items.length === 0 && <Text style={s.empty}>{emptyText}</Text>}
        </View>
      )}
    </View>
  );
}
