import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import TabBtn from '../components/TabBtn';

export default function BottomBarNav({
  s,
  activeTab,
  setActiveTab,
  setScanning,
  favs,
  accentColor,
  inactiveColor,
}) {
  return (
    <View style={s.bottomBar}>
      <TabBtn s={s} icon="home" label="Inicio" tab="Inicio" active={activeTab} onPress={setActiveTab} accentColor={accentColor} inactiveColor={inactiveColor} />
      <TabBtn s={s} icon="people" label="Comunidad" tab="Comunidad" active={activeTab} onPress={setActiveTab} accentColor={accentColor} inactiveColor={inactiveColor} />
      <TouchableOpacity style={s.camBtn} onPress={() => setScanning(true)}>
        <Ionicons name="camera" size={28} color="#fff" />
      </TouchableOpacity>
      <TabBtn s={s} icon="cafe" label="Mis Cafés" tab="Mis Cafés" active={activeTab} onPress={setActiveTab} accentColor={accentColor} inactiveColor={inactiveColor} />
      <TabBtn s={s} icon="ellipsis-horizontal" label="Más" tab="Más" active={activeTab} onPress={setActiveTab} badge={favs.length} accentColor={accentColor} inactiveColor={inactiveColor} />
    </View>
  );
}
