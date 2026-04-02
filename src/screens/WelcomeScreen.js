import { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, SafeAreaView, StatusBar, StyleSheet, Text, View,
} from 'react-native';

export default function WelcomeScreen() {
  const targetText = 'WELCOME TO\nETIOVE';
  const [typedCount, setTypedCount] = useState(0);
  const [cursorOn, setCursorOn]     = useState(true);
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const typingTimer = setInterval(() => {
      setTypedCount((prev) => {
        if (prev >= targetText.length) return prev;
        return prev + 1;
      });
    }, 95);
    return () => clearInterval(typingTimer);
  }, []);

  useEffect(() => {
    const cursorTimer = setInterval(() => setCursorOn((v) => !v), 430);
    return () => clearInterval(cursorTimer);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

  const typed          = targetText.slice(0, typedCount);
  const [topRaw = '', bottomRaw = ''] = typed.split('\n');
  const showCursorTop    = cursorOn && !typed.includes('\n');
  const showCursorBottom = cursorOn && typed.includes('\n');
  const floatTranslateY  = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6efe7" />
      <View style={styles.auraOne} />
      <View style={styles.auraTwo} />
      <Animated.View style={[styles.card, { transform: [{ translateY: floatTranslateY }] }]}>
        <View style={styles.typeBox}>
          <Text style={styles.lineTop}>{topRaw}{showCursorTop ? '|' : ' '}</Text>
          <Text style={styles.lineBottom}>{bottomRaw}{showCursorBottom ? '|' : ' '}</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: '#f6efe7', alignItems: 'center', justifyContent: 'center', padding: 24 },
  auraOne:    { position: 'absolute', top: 90, right: -20, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(119, 82, 57, 0.08)' },
  auraTwo:    { position: 'absolute', bottom: 80, left: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255, 248, 241, 0.76)' },
  card:       { width: '100%', borderRadius: 30, backgroundColor: '#fffaf5', borderWidth: 1, borderColor: '#eadbce', paddingVertical: 34, paddingHorizontal: 22, alignItems: 'center', shadowColor: '#3a2416', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  typeBox:    { width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: 130, gap: 6 },
  lineTop:    { fontSize: 24, fontWeight: '900', letterSpacing: 4.1, color: '#5e4332' },
  lineBottom: { fontSize: 44, fontWeight: '900', letterSpacing: 5.8, color: '#1c120d' },
});
