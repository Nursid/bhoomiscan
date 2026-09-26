import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Image, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, LinearGradient, Stop, Line } from 'react-native-svg';
import { IMAGES } from '../assets';

export default function LuxuryDestinyDnaGraphic({ size = 270 }: { size?: number }) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Floating bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY: floatAnim }],
        }}
      >
        {/* 3D Dial Disk Background with Golden Bezel */}
        <Svg width={size} height={size} viewBox="0 0 300 300" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="dialBg" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#1C1F2A" stopOpacity="1" />
              <Stop offset="65%" stopColor="#0F1118" stopOpacity="1" />
              <Stop offset="100%" stopColor="#06070A" stopOpacity="1" />
            </RadialGradient>
            <RadialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFE5A4" stopOpacity="0.85" />
              <Stop offset="50%" stopColor="#DFB05B" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#DFB05B" stopOpacity="0" />
            </RadialGradient>
            <LinearGradient id="bezelBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#8A6A32" />
              <Stop offset="40%" stopColor="#222530" />
              <Stop offset="70%" stopColor="#12141C" />
              <Stop offset="100%" stopColor="#DFB05B" />
            </LinearGradient>
          </Defs>

          <Circle cx="150" cy="150" r="136" fill="url(#dialBg)" stroke="url(#bezelBorder)" strokeWidth="3" />
          <Circle cx="150" cy="150" r="128" fill="none" stroke="rgba(223, 176, 91, 0.3)" strokeWidth="1" strokeDasharray="4, 5" />
          <Circle cx="150" cy="150" r="75" fill="url(#goldGlow)" />
          <Circle cx="150" cy="150" r="68" fill="none" stroke="#F5D38F" strokeWidth="2" strokeOpacity="0.8" />

          <Circle cx="150" cy="150" r="112" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
          <Line x1="150" y1="20" x2="150" y2="28" stroke="#DFB05B" strokeWidth="2.2" />
          <Line x1="150" y1="272" x2="150" y2="280" stroke="#DFB05B" strokeWidth="2.2" />
          <Line x1="20" y1="150" x2="28" y2="150" stroke="#DFB05B" strokeWidth="2.2" />
          <Line x1="272" y1="150" x2="280" y2="150" stroke="#DFB05B" strokeWidth="2.2" />
        </Svg>

        {/* Project Assets logo.png Image */}
        <Image
          source={IMAGES.logo}
          style={{ width: size * 0.7, height: size * 0.7 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}
