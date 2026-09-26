import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, Image } from 'react-native';
import { IMAGES } from '../assets';

export interface GoldDnaGraphicProps {
  size?: number;
}

export default function GoldDnaGraphic({ size = 200 }: GoldDnaGraphicProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous smooth 3D rotation
    const rotationLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Subtle pulsing halo animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    rotationLoop.start();
    pulseLoop.start();

    return () => {
      rotationLoop.stop();
      pulseLoop.stop();
    };
  }, [rotateAnim, pulseAnim]);

  const rotateY = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const haloScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.05],
  });

  const haloOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  return (
    <View style={[styles.container, { width: size, height: size * 1.1 }]}>
      {/* Outer Radiant Gold Halo Ring */}
      <Animated.View
        style={[
          styles.haloRing,
          {
            width: size * 1.15,
            height: size * 1.15,
            borderRadius: (size * 1.15) / 2,
            transform: [{ scale: haloScale }],
            opacity: haloOpacity,
          },
        ]}
      />

      {/* Outer Wave Arc Circle */}
      <View
        style={[
          styles.haloBorderCircle,
          {
            width: size * 1.1,
            height: size * 1.1,
            borderRadius: (size * 1.1) / 2,
          },
        ]}
      />

      {/* 3D Metallic Gold Logo Animated Container */}
      <Animated.View
        style={[
          styles.dnaWrapper,
          {
            transform: [{ rotateY }],
          },
        ]}
      >
        <Image
          source={IMAGES.logo}
          style={{ width: size * 0.9, height: size * 0.9 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  haloRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(223, 176, 91, 0.45)',
    backgroundColor: 'rgba(223, 176, 91, 0.05)',
  },
  haloBorderCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.22)',
  },
  dnaWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
