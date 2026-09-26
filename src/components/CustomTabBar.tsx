import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon, Line, Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import {
  HomeIcon,
  LockIcon,
  UserGroupIcon,
  ActivityPulseIcon,
  SettingsCogIcon,
} from './icons';
import { FONTS } from '../theme';
import { getCachedProfile } from '../services/profileCache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH / 5;

export interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export default function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const activeIndex = state.index;
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(activeIndex)).current;
  const starPulseAnim = useRef(new Animated.Value(0)).current;
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 18) : insets.bottom;
  const tabBarHeight = 64 + bottomInset;

  useEffect(() => {
    // 100% Native UI Thread spring slide animation
    Animated.spring(slideAnim, {
      toValue: activeIndex,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();

    // 100% Native UI Thread cosmic star pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(starPulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(starPulseAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [activeIndex, slideAnim, starPulseAnim]);

  const flareTranslateX = slideAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [
      TAB_WIDTH * 0.5 - 40,
      TAB_WIDTH * 1.5 - 40,
      TAB_WIDTH * 2.5 - 40,
      TAB_WIDTH * 3.5 - 40,
      TAB_WIDTH * 4.5 - 40,
    ],
  });

  const starPulseScale = starPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.2],
  });

  const getIcon = (routeName: string, isFocused: boolean) => {
    const color = isFocused ? '#DFB05B' : '#525866';
    const size = 20;
    switch (routeName) {
      case 'Home':
        return <HomeIcon size={size} color={color} />;
      case 'Vaults':
        return <LockIcon size={size} color={color} />;
      case 'People':
        return <UserGroupIcon size={size} color={color} />;
      case 'Activity':
        return <ActivityPulseIcon size={size} color={color} />;
      case 'Settings':
      default:
        return <SettingsCogIcon size={size} color={color} />;
    }
  };

  return (
    <View style={[styles.tabBarContainer, { height: tabBarHeight, paddingBottom: bottomInset }]}>
      {/* Top Dark Hairline Border */}
      <View style={styles.topBorderLine} />

      {/* Cosmic Star Lens Flare Positioned Above Active Tab (100% Native Driver) */}
      <Animated.View
        style={[
          styles.activeFlareWrapper,
          {
            transform: [{ translateX: flareTranslateX }],
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: starPulseScale }], alignItems: 'center', justifyContent: 'center' }}>
          <Svg width="80" height="24" viewBox="0 0 80 24" fill="none">
            <Defs>
              <LinearGradient id="starBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#DFB05B" stopOpacity="0" />
                <Stop offset="30%" stopColor="#FFE5A4" stopOpacity="0.75" />
                <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="70%" stopColor="#FFE5A4" stopOpacity="0.75" />
                <Stop offset="100%" stopColor="#DFB05B" stopOpacity="0" />
              </LinearGradient>

              <LinearGradient id="verticalRayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.9" />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </LinearGradient>

              <RadialGradient id="starAuraGrad" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                <Stop offset="35%" stopColor="#FFE5A4" stopOpacity="0.6" />
                <Stop offset="70%" stopColor="#DFB05B" stopOpacity="0.25" />
                <Stop offset="100%" stopColor="#DFB05B" stopOpacity="0" />
              </RadialGradient>
            </Defs>

            {/* Wide Horizontal Star Beam Flare */}
            <Line x1="0" y1="12" x2="80" y2="12" stroke="url(#starBeamGrad)" strokeWidth="1.8" />

            {/* Vertical Lens Ray */}
            <Line x1="40" y1="2" x2="40" y2="22" stroke="url(#verticalRayGrad)" strokeWidth="1.5" />

            {/* Soft Radial Gold Aura Circle */}
            <Circle cx="40" cy="12" r="10" fill="url(#starAuraGrad)" />

            {/* Bright 4-Point Cosmic Diamond Star Core */}
            <Polygon
              points="40,4 42,10 48,12 42,14 40,20 38,14 32,12 38,10"
              fill="#FFFFFF"
            />
            <Polygon
              points="40,7 41,11 45,12 41,13 40,17 39,13 35,12 39,11"
              fill="#FFE5A4"
            />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* Tab Buttons Row */}
      <View style={styles.tabsRow}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          let label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          if (route.name === 'Vaults') label = 'Vault';
          if (route.name === 'People') label = 'Community';

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              const cached = getCachedProfile();
              const hasAadhaar = Boolean(cached?.verifications?.aadhaar);

              if ((route.name === 'Vaults' || route.name === 'People') && !hasAadhaar) {
                navigation.navigate('AadhaarVerification');
                return;
              }

              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.85}
            >
              <View style={[styles.iconContainer, isFocused && styles.activeIconScale]}>
                {getIcon(route.name, isFocused)}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? '#DFB05B' : '#525866' },
                  isFocused && styles.activeLabelWeight,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: '#06070A',
    height: 64,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  topBorderLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(253, 230, 138, 0.15)',
  },
  activeFlareWrapper: {
    position: 'absolute',
    top: -11,
    left: 0,
    width: 80,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 64,
    paddingBottom: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    fontFamily: FONTS.medium,
    letterSpacing: 0.3,
  },
  activeIconScale: {
    transform: [{ scale: 1.08 }],
  },
  activeLabelWeight: {
    fontWeight: '700',
  },
});
