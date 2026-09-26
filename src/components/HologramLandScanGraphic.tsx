import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path, Polygon, Line, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

export interface HologramLandScanGraphicProps {
  size?: number;
}

export default function HologramLandScanGraphic({ size = 200 }: HologramLandScanGraphicProps) {
  const scanAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Top-to-bottom scanning laser beam loop
    const scanLoop = Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );

    // Subtle 3D terrain rotation loop
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    scanLoop.start();
    rotateLoop.start();

    return () => {
      scanLoop.stop();
      rotateLoop.stop();
    };
  }, [scanAnim, rotateAnim]);

  // Laser beam translates from top Y = -60 to bottom Y = 70
  const laserTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-65, 75],
  });

  const laserOpacity = scanAnim.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0.2, 1, 1, 0.2],
  });

  const terrainRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-12deg', '12deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size * 1.1 }]}>
      {/* Outer Golden Topo Halo Circle */}
      <View style={[styles.haloCircle, { width: size * 1.15, height: size * 1.15, borderRadius: (size * 1.15) / 2 }]} />

      {/* 3D Rotating Holographic Land Terrain */}
      <Animated.View
        style={[
          styles.terrainWrapper,
          {
            transform: [{ rotate: terrainRotate }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
          <Defs>
            <LinearGradient id="goldHoloGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFF2B8" stopOpacity="0.9" />
              <Stop offset="40%" stopColor="#DFB05B" stopOpacity="0.75" />
              <Stop offset="80%" stopColor="#B88E3C" stopOpacity="0.5" />
              <Stop offset="100%" stopColor="#6E4F18" stopOpacity="0.2" />
            </LinearGradient>

            <LinearGradient id="laserBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#DFB05B" stopOpacity="0" />
              <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="100%" stopColor="#DFB05B" stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Isometric Land Grid Polygon Planes */}
          <Polygon points="100,20 175,60 100,100 25,60" fill="url(#goldHoloGrad)" stroke="#DFB05B" strokeWidth="1.5" />
          <Polygon points="25,60 100,100 100,175 25,135" fill="url(#goldHoloGrad)" stroke="#B88E3C" strokeWidth="1.2" opacity="0.65" />
          <Polygon points="100,100 175,60 175,135 100,175" fill="url(#goldHoloGrad)" stroke="#DFB05B" strokeWidth="1.2" opacity="0.85" />

          {/* Topographic Elevation Contour Peaks */}
          <Path d="M45 50 Q 80 28 100 45 T 155 50" stroke="#FFF2B8" strokeWidth="1.8" fill="none" />
          <Path d="M55 65 Q 90 40 100 60 T 145 65" stroke="#DFB05B" strokeWidth="1.5" fill="none" />
          <Path d="M65 80 Q 95 60 100 75 T 135 80" stroke="#FFE5A4" strokeWidth="1.4" fill="none" />

          {/* Land Survey Grid Nodes & Lines */}
          <Line x1="100" y1="20" x2="100" y2="100" stroke="#FFE5A4" strokeWidth="1" strokeDasharray="3,3" />
          <Line x1="25" y1="60" x2="175" y2="60" stroke="#FFE5A4" strokeWidth="1" strokeDasharray="3,3" />

          <Circle cx="100" cy="45" r="4" fill="#FFFFFF" />
          <Circle cx="75" cy="55" r="3.5" fill="#DFB05B" />
          <Circle cx="125" cy="55" r="3.5" fill="#DFB05B" />
          <Circle cx="100" cy="75" r="4.5" fill="#FFE5A4" />
        </Svg>
      </Animated.View>

      {/* Laser Scanning Beam (Moving Top to Bottom) */}
      <Animated.View
        style={[
          styles.laserContainer,
          {
            transform: [{ translateY: laserTranslateY }],
            opacity: laserOpacity,
          },
        ]}
      >
        <View style={styles.laserLine} />
        <View style={styles.laserGlow} />
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
    backgroundColor: 'rgba(223, 176, 91, 0.05)',
  },
  terrainWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  laserContainer: {
    position: 'absolute',
    width: 170,
    alignItems: 'center',
  },
  laserLine: {
    width: '100%',
    height: 2.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
    shadowColor: '#FFE5A4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  laserGlow: {
    position: 'absolute',
    top: -6,
    width: '100%',
    height: 14,
    backgroundColor: 'rgba(223, 176, 91, 0.35)',
    borderRadius: 7,
  },
});
