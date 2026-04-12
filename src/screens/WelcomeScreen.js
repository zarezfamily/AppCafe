import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, SafeAreaView, StatusBar, Text, View } from 'react-native';
import { styles } from '../styles/welcomeScreenStyles';

export default function WelcomeScreen() {
  const targetText = 'WELCOME TO\nETIOVE';
  const [typedCount, setTypedCount] = useState(0);
  const [cursorOn, setCursorOn] = useState(true);
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
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

  const typed = targetText.slice(0, typedCount);
  const [topRaw = '', bottomRaw = ''] = typed.split('\n');
  const showCursorTop = cursorOn && !typed.includes('\n');
  const showCursorBottom = cursorOn && typed.includes('\n');
  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  return (
    <SafeAreaView style={styles.welcomeScreen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6efe7" />
      <View style={styles.welcomeAuraOne} />
      <View style={styles.welcomeAuraTwo} />
      <Animated.View style={[styles.welcomeCard, { transform: [{ translateY: floatTranslateY }] }]}> 
        <View style={styles.welcomeTypeBox}>
          <Text style={styles.welcomeLineTop}>{topRaw}{showCursorTop ? '|' : ' '}</Text>
          <Text style={styles.welcomeLineBottom}>{bottomRaw}{showCursorBottom ? '|' : ' '}</Text>
        </View>
        <Text style={styles.welcomeSub}>SPECIALTY COFFEE ATELIER</Text>
        <Text style={styles.welcomeCaption}>Donde nació el café</Text>
      </Animated.View>
    </SafeAreaView>
  );
}
