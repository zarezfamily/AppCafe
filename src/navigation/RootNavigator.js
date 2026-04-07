import { createStackNavigator } from '@react-navigation/stack';
import BottomBarNav from '../screens/BottomBarNav';
import CafeDetailScreen from '../screens/CafeDetailScreen';
import CafeteriasScreen from '../screens/CafeteriasScreen';
import CataDetailModal from '../screens/CataDetailModal';
import CataFormModal from '../screens/CataFormModal';
import CommunityTab from '../screens/CommunityTab';
import DiarioCatasSection from '../screens/DiarioCatasSection';
import HomeScreen from '../screens/HomeScreen';
import InicioTab from '../screens/InicioTab';
import MasTab from '../screens/MasTab';
import MisCafesTab from '../screens/MisCafesTab';
import OfertasTab from '../screens/OfertasTab';
import PaywallModal from '../screens/PaywallModal';
import PremiumBadge from '../screens/PremiumBadge';
import ProfileScreen from '../screens/ProfileScreen';
import TopCafesTab from '../screens/TopCafesTab';
import UltimosAnadidosTab from '../screens/UltimosAnadidosTab';

const Stack = createStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="CafeDetail" component={CafeDetailScreen} />
      <Stack.Screen name="Cafeterias" component={CafeteriasScreen} />
      <Stack.Screen name="Community" component={CommunityTab} />
      <Stack.Screen name="DiarioCatas" component={DiarioCatasSection} />
      <Stack.Screen name="CataDetail" component={CataDetailModal} />
      <Stack.Screen name="CataForm" component={CataFormModal} />
      <Stack.Screen name="BottomBar" component={BottomBarNav} />
      <Stack.Screen name="Inicio" component={InicioTab} />
      <Stack.Screen name="Mas" component={MasTab} />
      <Stack.Screen name="MisCafes" component={MisCafesTab} />
      <Stack.Screen name="Ofertas" component={OfertasTab} />
      <Stack.Screen name="Paywall" component={PaywallModal} />
      <Stack.Screen name="PremiumBadge" component={PremiumBadge} />
      <Stack.Screen name="TopCafes" component={TopCafesTab} />
      <Stack.Screen name="UltimosAnadidos" component={UltimosAnadidosTab} />
    </Stack.Navigator>
  );
}
