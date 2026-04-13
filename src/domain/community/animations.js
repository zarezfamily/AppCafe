import { Animated } from 'react-native';

export const ensureIndexedAnimatedValue = (ref, idx, initialValue = 1) => {
  if (!ref.current[idx]) {
    ref.current[idx] = new Animated.Value(initialValue);
  }
  return ref.current[idx];
};

export const runCommunityPressIn = (anim) => {
  Animated.spring(anim, {
    toValue: 0.975,
    friction: 8,
    tension: 180,
    useNativeDriver: true,
  }).start();
};

export const runCommunityPressOut = (anim) => {
  Animated.spring(anim, {
    toValue: 1,
    friction: 7,
    tension: 170,
    useNativeDriver: true,
  }).start();
};

export const runCommunityModalOpen = (anim) => {
  anim.setValue(0);
  Animated.spring(anim, {
    toValue: 1,
    friction: 8,
    tension: 110,
    useNativeDriver: true,
  }).start();
};

export const runCommunityModalClose = (anim, onClosed) => {
  Animated.timing(anim, {
    toValue: 0,
    duration: 180,
    useNativeDriver: true,
  }).start(({ finished }) => {
    if (finished && onClosed) onClosed();
  });
};

export const prepareStaggeredAnimatedValues = (rowsRef, pressRef, length, initialValue = 0) => {
  while (rowsRef.current.length < length) {
    rowsRef.current.push(new Animated.Value(initialValue));
  }
  rowsRef.current = rowsRef.current.slice(0, length);
  pressRef.current = pressRef.current.slice(0, length);
  rowsRef.current.forEach((anim) => anim.setValue(initialValue));
};

export const runFadeIn = (anim, duration) => {
  Animated.timing(anim, {
    toValue: 1,
    duration,
    useNativeDriver: true,
  }).start();
};

export const runStaggeredFadeIn = (anims, staggerMs, durationMs) => {
  Animated.stagger(
    staggerMs,
    anims.map((anim) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: durationMs,
        useNativeDriver: true,
      })
    )
  ).start();
};

export const startShimmerLoop = (anim, loopRef, duration = 1050) => {
  anim.setValue(0);
  loopRef.current = Animated.loop(
    Animated.timing(anim, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    })
  );
  loopRef.current.start();
};

export const stopShimmerLoop = (loopRef) => {
  if (loopRef.current) {
    loopRef.current.stop();
    loopRef.current = null;
  }
};
