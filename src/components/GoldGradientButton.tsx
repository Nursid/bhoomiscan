import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { BadgeShieldIcon, ArrowRightIcon } from './icons';
import { FONTS } from '../theme';

export interface GoldGradientButtonProps {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  showIcon?: boolean;
  showArrow?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function GoldGradientButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  showIcon = true,
  showArrow = true,
  style,
  textStyle,
}: GoldGradientButtonProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [loading, pulse]);

  const loadingOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.42],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.94}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.buttonContainer, disabled && styles.buttonDisabled, style]}
    >
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFE59D" />
              <Stop offset="38%" stopColor="#E4B553" />
              <Stop offset="72%" stopColor="#C69538" />
              <Stop offset="100%" stopColor="#F2CF72" />
            </LinearGradient>
            <LinearGradient id="goldSheen" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="48%" stopColor="#FFFFFF" stopOpacity="0.38" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#goldGrad)" />
          <Rect x="-18%" y="0" width="46%" height="100%" fill="url(#goldSheen)" />
        </Svg>
      </View>
      <View pointerEvents="none" style={styles.innerStroke} />
      {loading && <Animated.View pointerEvents="none" style={[styles.loadingWash, { opacity: loadingOpacity }]} />}

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#1A1405" />
          <Text style={styles.loadingText}>Securing</Text>
        </View>
      ) : (
        <View style={styles.contentRow}>
          {showIcon && (
            <View style={styles.iconWrapper}>
              <BadgeShieldIcon size={20} color="#1A1405" />
            </View>
          )}

          <Text style={[styles.buttonText, textStyle]}>{title}</Text>

          {showArrow && (
            <View style={styles.arrowWrapper}>
              <ArrowRightIcon size={22} color="#1A1405" />
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 12,
    shadowColor: '#E3B24D',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 7,
  },
  buttonDisabled: {
    opacity: 0.74,
  },
  innerStroke: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 238, 188, 0.42)',
  },
  loadingWash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#FFF1BD',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    zIndex: 1,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    color: '#1A1405',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.8,
    fontFamily: FONTS.medium,
  },
  iconWrapper: {
    marginRight: 12,
  },
  arrowWrapper: {
    marginLeft: 12,
  },
  buttonText: {
    color: '#1A1405',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontFamily: FONTS.medium,
  },
});
