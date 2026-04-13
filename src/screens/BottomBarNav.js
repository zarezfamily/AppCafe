import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import TabBtn from '../components/TabBtn';
import { MAIN_TABS } from './mainScreenTabs';

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
      <TabBtn s={s} icon="home" label={MAIN_TABS.HOME} tab={MAIN_TABS.HOME} active={activeTab} onPress={setActiveTab} accentColor={accentColor} inactiveColor={inactiveColor} />
      <TabBtn s={s} icon="people" label={MAIN_TABS.COMMUNITY} tab={MAIN_TABS.COMMUNITY} active={activeTab} onPress={setActiveTab} accentColor={accentColor} inactiveColor={inactiveColor} />
      <TouchableOpacity style={s.camBtn} onPress={() => setScanning(true)}>
        <Ionicons name="camera" size={28} color="#fff" />
      </TouchableOpacity>
      <TabBtn s={s} icon="cafe" label={MAIN_TABS.NOTEBOOK} tab={MAIN_TABS.NOTEBOOK} active={activeTab} onPress={setActiveTab} accentColor={accentColor} inactiveColor={inactiveColor} />
      <TabBtn s={s} icon="ellipsis-horizontal" label={MAIN_TABS.MORE} tab={MAIN_TABS.MORE} active={activeTab} onPress={setActiveTab} badge={favs.length} accentColor={accentColor} inactiveColor={inactiveColor} />
    </View>
  );
}
