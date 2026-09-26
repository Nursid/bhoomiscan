import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TopographyBackground from './TopographyBackground';
import OrbitalWirelinesBackground from './OrbitalWirelinesBackground';
import GoldDnaGraphic from './GoldDnaGraphic';
import HologramLandScanGraphic from './HologramLandScanGraphic';
import GoldenShieldDeedGraphic from './GoldenShieldDeedGraphic';
import InfinityGpsPulseGraphic from './InfinityGpsPulseGraphic';
import CompassLandOrbGraphic from './CompassLandOrbGraphic';
import CircularProgressLoader from './CircularProgressLoader';
import HeaderDarkGold from './HeaderDarkGold';
import { COLORS, FONTS } from '../theme';
import { getUserData } from '../services/firebase';

export type LoaderConceptType = 'compassOrb' | 'landScan' | 'goldenShield' | 'gpsPulse' | 'dna';

export interface ScreenLoadingStateProps {
  title?: string;
  subtitle?: string;
  concept?: LoaderConceptType;
  userName?: string;
  initialPercentage?: number;
  navigation?: any;
  userInitials?: string;
  showHeader?: boolean;
}

export default function ScreenLoadingState({
  title,
  subtitle,
  concept = 'compassOrb',
  userName,
  initialPercentage = 0,
  navigation,
  userInitials,
  showHeader = true,
}: ScreenLoadingStateProps) {
  const textPulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [resolvedUserName, setResolvedUserName] = useState<string>(userName || '');

  useEffect(() => {
    const fetchActiveUserName = async () => {
      if (userName && userName !== 'Suraj') {
        setResolvedUserName(userName);
        return;
      }
      try {
        const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
        if (activeUserStr) {
          const activeUser = JSON.parse(activeUserStr);
          let rawName = activeUser.displayName || activeUser.fullName || activeUser.email?.split('@')[0] || '';

          if (activeUser.uid) {
            const freshData = await getUserData(activeUser.uid);
            rawName = freshData?.verifications?.aadhaar?.name || freshData?.fullName || rawName;
          }

          if (rawName) {
            const firstName = rawName.trim().split(' ')[0];
            setResolvedUserName(firstName);
            return;
          }
        }
        setResolvedUserName(userName || 'User');
      } catch (e) {
        setResolvedUserName(userName || 'User');
      }
    };

    fetchActiveUserName();
  }, [userName]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // Text fading/pulsing effect loop
    const textPulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(textPulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(textPulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    textPulseLoop.start();
    return () => textPulseLoop.stop();
  }, [fadeAnim, textPulseAnim]);

  const textOpacity = textPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1],
  });

  const getDefaultTitle = () => {
    if (title && title !== 'Loading dashboard' && title !== 'Loading vaults') return title;
    switch (concept) {
      case 'compassOrb':
        return 'L O A D I N G';
      case 'landScan':
        return 'Verifying Land Records';
      case 'goldenShield':
        return 'Securing Land Title Deed';
      case 'gpsPulse':
        return 'Locating Property Coordinates';
      case 'dna':
      default:
        return 'Encrypting Property Records';
    }
  };

  const getDefaultSubtitle = () => {
    if (subtitle && subtitle !== 'Synchronizing verified profile and asset tapestry.') return subtitle;
    switch (concept) {
      case 'compassOrb':
        return 'Please wait while we prepare your secure dashboard.';
      case 'landScan':
        return 'Scanning 3D land topography map & survey coordinates';
      case 'goldenShield':
        return 'Applying 3D vault shield lock & DPDP cryptographic seal';
      case 'gpsPulse':
        return 'Triangulating satellite GPS plot coordinates & revenue records';
      case 'dna':
      default:
        return 'Synchronizing secure Destiny Protocol workspace';
    }
  };

  const renderConceptGraphic = () => {
    const displayName = resolvedUserName || userName || 'User';
    switch (concept) {
      case 'compassOrb':
        return <CompassLandOrbGraphic size={210} percentage={initialPercentage} userName={displayName} showCards={false} />;
      case 'landScan':
        return <HologramLandScanGraphic size={170} />;
      case 'goldenShield':
        return <GoldenShieldDeedGraphic size={170} />;
      case 'gpsPulse':
        return <InfinityGpsPulseGraphic size={170} />;
      case 'dna':
      default:
        return <GoldDnaGraphic size={170} />;
    }
  };

  return (
    <Animated.View style={[styles.safeArea, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#050608" />

      {/* 3D Curved Wirelines & Golden Beads Background */}
      <OrbitalWirelinesBackground />

      <TopographyBackground opacity={0.35} />

      {/* Main Loader Content Area - Fits exactly between Header and Bottom Tabs */}
      <View style={styles.centerContentBox}>
        {/* Dynamic Concept Graphic */}
        {renderConceptGraphic()}

        {concept !== 'compassOrb' ? (
          <CircularProgressLoader size={135} strokeWidth={9} initialPercentage={initialPercentage} />
        ) : null}

        {/* Title Row & Sheen Divider Line */}
        <Animated.View style={[styles.loadingTitleWrapper, { opacity: textOpacity }]}>
          <View style={styles.titleRow}>
            <Text style={styles.loadingTitle}>{getDefaultTitle()}</Text>
          </View>

          <Text style={styles.loadingSubtitle}>{getDefaultSubtitle()}</Text>

          {/* Glowing Golden Lens Flare Sheen Line Divider */}
          <View style={styles.sheenLineWrapper}>
            <View style={styles.sheenLine} />
            <View style={styles.sheenFlareDot} />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050608',
    width: '100%',
  },
  headerSafeArea: {
    backgroundColor: '#050608',
    zIndex: 10,
    width: '100%',
  },
  radialGoldGlow: {
    position: 'absolute',
    top: '22%',
    left: '8%',
    right: '8%',
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
  },
  centerContentBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
    width: '100%',
  },
  loadingTitleWrapper: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    color: '#F5D38F',
    fontSize: 22,
    fontWeight: '800',
    fontFamily: FONTS.heading,
    letterSpacing: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: FONTS.medium,
    marginTop: 10,
  },
  sheenLineWrapper: {
    width: 180,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    position: 'relative',
  },
  sheenLine: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(223, 176, 91, 0.45)',
  },
  sheenFlareDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFE5A4',
    shadowColor: '#FFE5A4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
});
