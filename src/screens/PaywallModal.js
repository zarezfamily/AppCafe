import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
} from 'react-native';
import { PREMIUM_PLANS } from '../core/premium';

export default function PaywallModal({
  visible,
  onClose,
  onPurchase,
  onRestore,
  _trigger,
  _isPremium,
  purchasingPlan,
  restoring,
  revenueCatReady,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
    }
  }, [fadeAnim, slideAnim, visible]);

  const handlePurchase = (plan) => {
    if (!revenueCatReady) {
      Alert.alert(
        'RevenueCat no configurado',
        'Faltan las claves públicas de RevenueCat para esta plataforma.'
      );
      return;
    }

    Alert.alert(
      'Etiove Premium',
      `Vas a abrir la compra del plan ${PREMIUM_PLANS[plan].label} por ${PREMIUM_PLANS[plan].price}${plan === 'monthly' ? '/mes' : ' (pago único)'}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', onPress: () => onPurchase?.(plan) },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />

        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={22} />
        </TouchableOpacity>

        <ScrollView>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <TouchableOpacity onPress={() => handlePurchase('lifetime')}>
              <Text>{purchasingPlan === 'lifetime' ? 'Procesando...' : 'Comprar de por vida'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handlePurchase('monthly')}>
              <Text>
                {purchasingPlan === 'monthly' ? 'Procesando...' : 'Suscribirse mensualmente'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onRestore}>
              <Text>{restoring ? 'Restaurando compras...' : 'Restaurar compras'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}