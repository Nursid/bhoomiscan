import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IMAGES } from '../assets';
import { FONTS } from '../theme';
import TopographyBackground from '../components/TopographyBackground';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface WelcomeScreenProps {
  navigation: any;
}

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Smooth 2.5-second progress bar animation (2500ms)
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      useNativeDriver: false,
    }).start();

    // 2. Navigation timer after 2.5 seconds
    let isMounted = true;
    const timer = setTimeout(async () => {
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
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [navigation, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050608" translucent />

      {/* Background Constellation Lines & Tapestry Nodes */}
      <TopographyBackground opacity={0.4} />

      {/* Center Hero Disc Content */}
      <View style={styles.centerContainer}>
        <View style={styles.circleHaloDisc}>
          {/* Gold Infinity DNA Logo */}
          <View style={styles.logoWrapper}>
            <Image
              source={IMAGES.logo}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* DESTINY PROTOCOL Typography */}
          <View style={styles.typographyWrapper}>
            <Text style={styles.brandTitle}>DESTINY</Text>

            <View style={styles.protocolRow}>
              <View style={styles.goldLine} />
              <Text style={styles.protocolText}>PROTOCOL</Text>
              <View style={styles.goldLine} />
            </View>

            <Text style={styles.tagline}>SECURE TODAY. PROTECT TOMORROW.</Text>
          </View>
        </View>
      </View>

      {/* Bottom Minimal Progress Indicator */}
      <View style={styles.footerContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.secureText}>ESTABLISHING SECURE GATEWAY...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050608',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  circleHaloDisc: {
    width: SCREEN_WIDTH * 0.84,
    height: SCREEN_WIDTH * 0.84,
    maxWidth: 330,
    maxHeight: 330,
    borderRadius: 165,
    backgroundColor: 'rgba(12, 14, 20, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 6,
  },
  logoWrapper: {
    width: 140,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  typographyWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#DFB05B',
    letterSpacing: 9,
    fontFamily: FONTS.heading,
    textAlign: 'center',
  },
  protocolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  goldLine: {
    width: 22,
    height: 1.2,
    backgroundColor: '#DFB05B',
    opacity: 0.8,
  },
  protocolText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#DFB05B',
    letterSpacing: 4,
    marginHorizontal: 8,
    fontFamily: FONTS.medium,
  },
  tagline: {
    color: '#798096',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2.5,
    textAlign: 'center',
    fontFamily: FONTS.light,
  },
  footerContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingBottom: 45,
  },
  progressTrack: {
    width: '76%',
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DFB05B',
    borderRadius: 2,
  },
  secureText: {
    color: '#DFB05B',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: FONTS.medium,
    textAlign: 'center',
  },
});
