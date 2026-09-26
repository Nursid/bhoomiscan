import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import { FONTS } from '../theme';
import LuxuryDestinyDnaGraphic from '../components/LuxuryDestinyDnaGraphic';
import OrbitalWirelinesBackground from '../components/OrbitalWirelinesBackground';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface SplashScreenProps {
  navigation: any;
}

// 4-Point Diamond Sparkle Icon Component
function DiamondSparkleIcon({ size = 12, color = '#DFB05B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z"
        fill={color}
      />
    </Svg>
  );
}

export default function SplashScreen({ navigation }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const [statusText, setStatusText] = useState('ESTABLISHING SECURE GATEWAY...');

  useEffect(() => {
    // 1. Entrance animation (Emblem fade & scale up)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.4)),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.4)),
      }),
    ]).start();

    // 2. Text entrance after logo
    Animated.timing(textFadeAnim, {
      toValue: 1,
      duration: 800,
      delay: 350,
      useNativeDriver: true,
    }).start();

    // 3. Smooth progress bar animation over 2.6 seconds
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      useNativeDriver: false,
    }).start();

    // Dynamic status updates
    const t1 = setTimeout(() => setStatusText('SYNCHRONIZING VAULT PROTOCOL...'), 1000);
    const t2 = setTimeout(() => setStatusText('AUTHENTICATING ENCRYPTED KEYS...'), 1800);

    // 4. Navigation after splash completes
    let isMounted = true;
    const navTimer = setTimeout(async () => {
      try {
        const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
        if (activeUserStr && isMounted) {
          navigation.replace('MainTabs');
        } else if (isMounted) {
          navigation.replace('Login');
        }
      } catch {
        if (isMounted) {
          navigation.replace('Login');
        }
      }
    }, 2800);

    return () => {
      isMounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(navTimer);
    };
  }, [fadeAnim, scaleAnim, progressAnim, textFadeAnim, navigation]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07080B" />

      {/* 3D Curved Wirelines & Golden Beads Ambient Background */}
      <OrbitalWirelinesBackground />

      {/* Center Content: 3D Emblem & Brand Typography */}
      <View style={styles.centerContent}>
        {/* 3D Glossy Dial with Interlocking Diamond DNA Helixes */}
        <Animated.View
          style={[
            styles.emblemWrapper,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LuxuryDestinyDnaGraphic size={270} />
        </Animated.View>

        {/* Brand Typography Lockup */}
        <Animated.View style={[styles.typographyWrapper, { opacity: textFadeAnim }]}>
          {/* DESTINY */}
          <Text style={styles.brandDestiny}>DESTINY</Text>

          {/* — PROTOCOL — */}
          <View style={styles.protocolRow}>
            <View style={styles.protocolLine} />
            <Text style={styles.protocolText}>PROTOCOL</Text>
            <View style={styles.protocolLine} />
          </View>

          {/* SECURE TODAY. PROTECT TOMORROW. */}
          <Text style={styles.mottoText}>SECURE TODAY. PROTECT TOMORROW.</Text>
        </Animated.View>
      </View>

      {/* Bottom Metallic Rose Gold Liquid Progress Capsule & Status */}
      <View style={styles.footerContainer}>
        {/* Capsule Metallic Progress Bar */}
        <View style={styles.capsuleTrack}>
          <Animated.View style={[styles.capsuleFill, { width: progressWidth }]}>
            {/* Liquid Shimmer Flare Dot at Tip */}
            <View style={styles.tipFlare} />
          </Animated.View>
        </View>

        {/* Status Text & Diamond Sparkle */}
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>{statusText}</Text>
          <DiamondSparkleIcon size={13} color="#FFE5A4" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07080B',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: -20,
  },
  emblemWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  typographyWrapper: {
    alignItems: 'center',
    marginTop: 8,
  },
  brandDestiny: {
    fontSize: 38,
    fontFamily: FONTS.heading,
    color: '#F4D084',
    letterSpacing: 11,
    textAlign: 'center',
    textShadowColor: 'rgba(244, 208, 132, 0.45)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 14,
  },
  protocolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  protocolLine: {
    width: 28,
    height: 1.2,
    backgroundColor: '#D4AF37',
    marginHorizontal: 10,
    opacity: 0.8,
  },
  protocolText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: '#D4AF37',
    letterSpacing: 4.5,
    textTransform: 'uppercase',
  },
  mottoText: {
    fontSize: 10.5,
    fontFamily: FONTS.regular,
    color: 'rgba(223, 176, 91, 0.65)',
    letterSpacing: 3.2,
    textAlign: 'center',
    marginTop: 18,
    textTransform: 'uppercase',
  },
  footerContainer: {
    width: '100%',
    paddingHorizontal: 36,
    paddingBottom: 48,
    alignItems: 'center',
  },
  capsuleTrack: {
    width: SCREEN_WIDTH * 0.84,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#E6C594',
    backgroundColor: 'rgba(15, 17, 24, 0.95)',
    padding: 2.5,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  capsuleFill: {
    height: '100%',
    borderRadius: 8.5,
    backgroundColor: '#F5D38F',
    shadowColor: '#FFE5A4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 8,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  tipFlare: {
    width: 12,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    opacity: 0.8,
    marginRight: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONTS.heading,
    color: '#DFB05B',
    letterSpacing: 2.2,
    marginRight: 6,
    textAlign: 'center',
  },
});
