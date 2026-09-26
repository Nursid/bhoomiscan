import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';

export interface GoldenShieldDeedGraphicProps {
  size?: number;
}

export default function GoldenShieldDeedGraphic({ size = 200 }: GoldenShieldDeedGraphicProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const hoverAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 3D Shield expand & pulse loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Document hovering float loop
    const hoverLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(hoverAnim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(hoverAnim, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    hoverLoop.start();

    return () => {
      pulseLoop.stop();
      hoverLoop.stop();
    };
  }, [pulseAnim, hoverAnim]);

  const shieldScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.06],
  });

  const deedTranslateY = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 6],
  });

  const particleOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

  return (
    <View style={[styles.container, { width: size, height: size * 1.1 }]}>
      {/* Outer Halo Glow */}
      <View style={[styles.haloCircle, { width: size * 1.15, height: size * 1.15, borderRadius: (size * 1.15) / 2 }]} />

      {/* 3D Land Deed Document (Hovering Background Layer) */}
      <Animated.View
        style={[
          styles.deedWrapper,
          {
            transform: [{ translateY: deedTranslateY }],
          },
        ]}
      >
        <Svg width={size * 0.75} height={size * 0.9} viewBox="0 0 140 170" fill="none">
          <Defs>
            <LinearGradient id="deedGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#1A140A" />
              <Stop offset="50%" stopColor="#0A0C12" />
              <Stop offset="100%" stopColor="#141722" />
            </LinearGradient>
          </Defs>

          {/* Book / Deed Document Body */}
          <Rect x="15" y="10" width="110" height="145" rx="14" fill="url(#deedGoldGrad)" stroke="#DFB05B" strokeWidth="1.5" />
          <Rect x="25" y="24" width="90" height="4" rx="2" fill="#DFB05B" opacity="0.8" />
          <Rect x="25" y="36" width="70" height="3" rx="1.5" fill="#FFE5A4" opacity="0.6" />
          <Rect x="25" y="46" width="80" height="3" rx="1.5" fill="#DFB05B" opacity="0.4" />
          <Rect x="25" y="56" width="60" height="3" rx="1.5" fill="#DFB05B" opacity="0.4" />
        </Svg>
      </Animated.View>

      {/* Front 3D Golden Vault Shield Emblem Lock */}
      <Animated.View
        style={[
          styles.shieldWrapper,
          {
            transform: [{ scale: shieldScale }],
          },
        ]}
      >
        <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 140 140" fill="none">
          <Defs>
            <LinearGradient id="shieldMetallicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFF2B8" />
              <Stop offset="30%" stopColor="#DFB05B" />
              <Stop offset="70%" stopColor="#B88E3C" />
              <Stop offset="100%" stopColor="#6E4F18" />
            </LinearGradient>
          </Defs>

          {/* 3D Shield Outer Frame */}
          <Path
            d="M70 15 L120 35 V75 C120 105, 70 125, 70 125 C70 125, 20 105, 20 75 V35 L70 15 Z"
            fill="rgba(14, 16, 23, 0.9)"
            stroke="url(#shieldMetallicGrad)"
            strokeWidth="4"
            strokeLinejoin="round"
          />

          {/* Inner Shield Bevel Line */}
          <Path
            d="M70 24 L110 40 V72 C110 96, 70 114, 70 114 C70 114, 30 96, 30 72 V40 L70 24 Z"
            stroke="#FFE5A4"
            strokeWidth="1.8"
            fill="none"
            opacity="0.85"
          />

          {/* Center Checkmark Lock Icon */}
          <Path
            d="M52 68 L64 80 L88 56"
            stroke="url(#shieldMetallicGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>

      {/* Radiating Light Particles */}
      <Animated.View style={[styles.particlesContainer, { opacity: particleOpacity }]}>
        <Circle cx="30" cy="40" r="2.5" fill="#FFE5A4" />
        <Circle cx="170" cy="50" r="3" fill="#DFB05B" />
        <Circle cx="40" cy="160" r="2" fill="#DFB05B" />
        <Circle cx="160" cy="150" r="2.5" fill="#FFE5A4" />
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
  haloCircle: {
    position: 'absolute',
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.35)',
    backgroundColor: 'rgba(223, 176, 91, 0.06)',
  },
  deedWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
