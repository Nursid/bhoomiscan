import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

export interface InfinityGpsPulseGraphicProps {
  size?: number;
}

export default function InfinityGpsPulseGraphic({ size = 200 }: InfinityGpsPulseGraphicProps) {
  const radarAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Radar/GPS waves expanding outward loop
    const radarLoop = Animated.loop(
      Animated.timing(radarAnim, {
        toValue: 1,
        duration: 2600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );

    // Floating infinity logo rotation/oscillation loop
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    radarLoop.start();
    floatLoop.start();

    return () => {
      radarLoop.stop();
      floatLoop.stop();
    };
  }, [radarAnim, floatAnim]);

  // Radar wave 1 scale & opacity
  const radarScale1 = radarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.45],
  });

  const radarOpacity1 = radarAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.8, 0.4, 0],
  });

  // Radar wave 2 (delayed phase)
  const radarScale2 = radarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1.2],
  });

  const radarOpacity2 = radarAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.9, 0.5, 0],
  });

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-5, 5],
  });

  return (
    <View style={[styles.container, { width: size, height: size * 1.1 }]}>
      {/* Outer Expanding Radar GPS Pulse Wave 1 */}
      <Animated.View
        style={[
          styles.radarWave,
          {
            width: size * 1.1,
            height: size * 1.1,
            borderRadius: (size * 1.1) / 2,
            transform: [{ scale: radarScale1 }],
            opacity: radarOpacity1,
          },
        ]}
      />

      {/* Outer Expanding Radar GPS Pulse Wave 2 */}
      <Animated.View
        style={[
          styles.radarWave,
          {
            width: size * 1.1,
            height: size * 1.1,
            borderRadius: (size * 1.1) / 2,
            transform: [{ scale: radarScale2 }],
            opacity: radarOpacity2,
          },
        ]}
      />

      {/* Floating 3D Gold Infinity DNA Emblem */}
      <Animated.View
        style={[
          styles.infinityWrapper,
          {
            transform: [{ translateY: floatY }],
          },
        ]}
      >
        <Svg width={size * 0.85} height={size * 0.55} viewBox="0 0 180 100" fill="none">
          <Defs>
            <LinearGradient id="infinityGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFF2B8" />
              <Stop offset="30%" stopColor="#DFB05B" />
              <Stop offset="70%" stopColor="#B88E3C" />
              <Stop offset="100%" stopColor="#9B6D25" />
            </LinearGradient>
          </Defs>

          {/* 3D Double Loop Infinity Ribbon */}
          <Path
            d="M45 50 C20 15, 20 85, 45 50 C70 15, 110 85, 135 50 C160 15, 160 85, 135 50 C110 15, 70 85, 45 50 Z"
            stroke="url(#infinityGoldGrad)"
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />

          {/* High Gloss Inner Sheen Line */}
          <Path
            d="M45 50 C20 15, 20 85, 45 50 C70 15, 110 85, 135 50 C160 15, 160 85, 135 50 C110 15, 70 85, 45 50 Z"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.8"
          />

          {/* GPS Coordinate Node Dots */}
          <Circle cx="45" cy="50" r="4.5" fill="#FFFFFF" />
          <Circle cx="135" cy="50" r="4.5" fill="#FFFFFF" />
          <Circle cx="90" cy="50" r="5" fill="#DFB05B" />
        </Svg>
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
  radarWave: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(223, 176, 91, 0.55)',
    backgroundColor: 'rgba(223, 176, 91, 0.06)',
  },
  infinityWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});
