import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, FONTS } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface CircularProgressLoaderProps {
  size?: number;
  strokeWidth?: number;
  initialPercentage?: number;
}

export default function CircularProgressLoader({
  size = 140,
  strokeWidth = 9,
  initialPercentage = 45,
}: CircularProgressLoaderProps) {
  const [percentDisplay, setPercentDisplay] = useState(initialPercentage);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(initialPercentage / 100)).current;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // 1. Rotating arc animation loop
    const rotationLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // 2. Pulse scale animation loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // 3. Smooth progress animation loop (15% -> 98%)
    const progressLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 0.98,
          duration: 5200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(progressAnim, {
          toValue: 0.15,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );

    const listenerId = progressAnim.addListener(({ value }) => {
      setPercentDisplay(Math.round(value * 100));
    });

    rotationLoop.start();
    pulseLoop.start();
    progressLoop.start();

    return () => {
      progressAnim.removeListener(listenerId);
      rotationLoop.stop();
      pulseLoop.stop();
      progressLoop.stop();
    };
  }, [animatedValue, rotateAnim, progressAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.03],
  });

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <Animated.View style={[styles.container, { width: size, height: size, transform: [{ scale: glowScale }] }]}>
      <Animated.View style={[styles.svgWrapper, { transform: [{ rotate: rotation }] }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <LinearGradient id="loaderEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#6EE7B7" />
              <Stop offset="50%" stopColor="#34D399" />
              <Stop offset="100%" stopColor="#10B981" />
            </LinearGradient>
          </Defs>

          {/* Background Dark Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(16, 185, 129, 0.16)"
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Active Glowing Neon Emerald Green Arc Ring */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#loaderEmeraldGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
      </Animated.View>

      {/* Percentage Center Text Display in Neon Emerald Green */}
      <View style={styles.textOverlay}>
        <Text style={styles.percentText}>{percentDisplay}%</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 14,
  },
  svgWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  textOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#34D399',
    fontFamily: FONTS.heading,
    letterSpacing: 0.5,
  },
});
