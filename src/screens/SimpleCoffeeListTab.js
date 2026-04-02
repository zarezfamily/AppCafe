import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

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
      {cargando ? <ActivityIndicator color={premiumAccent} style={{ margin: 30 }} /> : (
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
