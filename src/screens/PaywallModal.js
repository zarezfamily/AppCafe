import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
    Alert,
    Animated,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { PREMIUM_FEATURES, PREMIUM_PLANS } from '../core/premium';

const ACCENT = '#8f5e3b';
const ACCENT_DEEP = '#5d4030';
const GOLD = '#d4a853';
const DARK = '#1c120d';
const CREAM = '#f6ede3';
const CREAM_ALT = '#fffaf5';
const BORDER = '#e4d3c2';

export default function PaywallModal({
  visible,
  onClose,
  onPurchase,
  onRestore,
  trigger,
  isPremium,
  purchasingPlan,
  restoring,
  revenueCatReady,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
    }
  }, [fadeAnim, slideAnim, visible]);

  const handlePurchase = (plan) => {
    if (!revenueCatReady) {
      Alert.alert('RevenueCat no configurado', 'Faltan las claves públicas de RevenueCat para esta plataforma.');
      return;
    }

    Alert.alert('Etiove Premium', `Vas a abrir la compra del plan ${PREMIUM_PLANS[plan].label} por ${PREMIUM_PLANS[plan].price}${plan === 'monthly' ? '/mes' : ' (pago único)'}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Continuar',
        onPress: () => {
          onPurchase?.(plan);
        },
      },
    ]);
  };

  const triggerMessages = {
    diario_limit: 'Has alcanzado el límite de 10 catas. Pasa a Premium para catas ilimitadas.',
    stats: 'Las estadísticas avanzadas son exclusivas de Premium.',
    export_pdf: 'Exportar en PDF está disponible en Premium.',
    forum_private: 'Este foro es exclusivo para miembros Premium.',
    editorial: 'El contenido editorial es exclusivo de Premium.',
    mas_tab: isPremium ? 'Ya tienes Premium activo.' : 'Desbloquea todas las ventajas de Etiove Premium.',
  };

  const triggerMsg = trigger ? triggerMessages[trigger] : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={ACCENT_DEEP} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.hero}>
              <View style={styles.sealOuter}>
                <View style={styles.sealMiddle}>
                  <View style={styles.sealInner}>
                    <Text style={styles.sealEmoji}>☕</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.heroTitle}>Etiove Premium</Text>
              <Text style={styles.heroSub}>Para los que se lo toman en serio</Text>
              {triggerMsg ? (
                <View style={styles.triggerBox}>
                  <Ionicons name="lock-closed-outline" size={14} color={ACCENT} />
                  <Text style={styles.triggerText}>{triggerMsg}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.featuresBox}>
              {PREMIUM_FEATURES.map((feature, index) => (
                <View
                  key={feature.title}
                  style={[styles.featureRow, index < PREMIUM_FEATURES.length - 1 && styles.featureRowBorder]}
                >
                  <View style={styles.featureIconBox}>
                    <Text style={styles.featureIcon}>{feature.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDesc}>{feature.desc}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={18} color={ACCENT} />
                </View>
              ))}
            </View>

            <Text style={styles.plansLabel}>Elige tu plan</Text>

            <TouchableOpacity style={styles.planCardHighlight} onPress={() => handlePurchase('lifetime')} activeOpacity={0.88}>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>MEJOR VALOR</Text>
              </View>
              <View style={styles.planRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitleLight}>{PREMIUM_PLANS.lifetime.label}</Text>
                  <Text style={styles.planSavings}>{PREMIUM_PLANS.lifetime.savings}</Text>
                </View>
                <View style={styles.planPriceBox}>
                  <Text style={styles.planPriceLight}>{PREMIUM_PLANS.lifetime.price}</Text>
                  <Text style={styles.planPeriodLight}>pago único</Text>
                </View>
              </View>
              <View style={styles.planBtn}>
                <Text style={styles.planBtnText}>{purchasingPlan === 'lifetime' ? 'Procesando...' : 'Comprar de por vida'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.planCard} onPress={() => handlePurchase('monthly')} activeOpacity={0.88}>
              <View style={styles.planRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{PREMIUM_PLANS.monthly.label}</Text>
                  <Text style={styles.planDesc}>Cancela cuando quieras</Text>
                </View>
                <View style={styles.planPriceBox}>
                  <Text style={styles.planPrice}>{PREMIUM_PLANS.monthly.price}</Text>
                  <Text style={styles.planPeriod}>/ mes</Text>
                </View>
              </View>
              <View style={styles.planBtnGhost}>
                <Text style={styles.planBtnGhostText}>{purchasingPlan === 'monthly' ? 'Procesando...' : 'Suscribirse mensualmente'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.restoreBtn} onPress={onRestore} activeOpacity={0.82}>
              <Text style={styles.restoreBtnText}>{restoring ? 'Restaurando compras...' : 'Restaurar compras'}</Text>
            </TouchableOpacity>

            {!revenueCatReady ? <Text style={styles.setupNote}>Configura las claves públicas de RevenueCat y usa una build nativa para habilitar compras reales.</Text> : null}

            <Text style={styles.legal}>
              El pago se procesará a través de App Store o Google Play. La suscripción mensual se renueva automáticamente. Puedes cancelar en cualquier momento desde los ajustes de tu cuenta.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CREAM_ALT, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 48 },
  hero: { alignItems: 'center', marginBottom: 28, gap: 8 },
  sealOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', backgroundColor: CREAM_ALT, marginBottom: 8 },
  sealMiddle: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(143,94,59,0.25)', alignItems: 'center', justifyContent: 'center' },
  sealInner: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: ACCENT, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2e7dc' },
  sealEmoji: { fontSize: 20 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: DARK, letterSpacing: 1 },
  heroSub: { fontSize: 14, color: ACCENT, fontWeight: '500', letterSpacing: 0.5 },
  triggerBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff5f0', borderWidth: 1, borderColor: '#f2d8cd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8 },
  triggerText: { fontSize: 13, color: ACCENT_DEEP, flex: 1, lineHeight: 18 },
  featuresBox: { backgroundColor: CREAM_ALT, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 4, marginBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  featureRowBorder: { borderBottomWidth: 0.5, borderBottomColor: BORDER },
  featureIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff5f0', alignItems: 'center', justifyContent: 'center' },
  featureIcon: { fontSize: 18 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 2 },
  featureDesc: { fontSize: 12, color: '#888', lineHeight: 17 },
  plansLabel: { fontSize: 11, fontWeight: '700', color: '#9a7963', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 14 },
  planCardHighlight: { backgroundColor: DARK, borderRadius: 18, padding: 20, marginBottom: 12, position: 'relative', overflow: 'hidden' },
  planBadge: { position: 'absolute', top: 14, right: 14, backgroundColor: GOLD, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  planBadgeText: { fontSize: 9, fontWeight: '800', color: DARK, letterSpacing: 1 },
  planRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  planTitleLight: { fontSize: 18, fontWeight: '800', color: '#fff9f1', marginBottom: 4 },
  planSavings: { fontSize: 12, color: GOLD, fontWeight: '500' },
  planPriceBox: { alignItems: 'flex-end' },
  planPriceLight: { fontSize: 26, fontWeight: '900', color: GOLD },
  planPeriodLight: { fontSize: 11, color: 'rgba(255,249,241,0.5)', fontWeight: '500' },
  planBtn: { backgroundColor: GOLD, borderRadius: 30, padding: 14, alignItems: 'center' },
  planBtnText: { color: DARK, fontWeight: '800', fontSize: 15 },
  planCard: { backgroundColor: CREAM_ALT, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 20, marginBottom: 12 },
  planTitle: { fontSize: 18, fontWeight: '800', color: DARK, marginBottom: 4 },
  planDesc: { fontSize: 12, color: '#9a7963' },
  planPrice: { fontSize: 26, fontWeight: '900', color: ACCENT_DEEP },
  planPeriod: { fontSize: 11, color: '#aaa', fontWeight: '500' },
  planBtnGhost: { borderWidth: 1.5, borderColor: ACCENT, borderRadius: 30, padding: 14, alignItems: 'center', marginTop: 4 },
  planBtnGhostText: { color: ACCENT_DEEP, fontWeight: '700', fontSize: 15 },
  restoreBtn: { alignItems: 'center', paddingVertical: 14 },
  restoreBtnText: { color: ACCENT_DEEP, fontWeight: '700', fontSize: 13, letterSpacing: 0.4 },
  setupNote: { fontSize: 12, color: '#9a7963', textAlign: 'center', lineHeight: 18, marginBottom: 6 },
  legal: { fontSize: 11, color: '#aaa', textAlign: 'center', lineHeight: 17, marginTop: 8 },
});
