import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { MenuIcon, BellIcon } from './icons';
import { FONTS } from '../theme';

export interface HeaderGoldBannerProps {
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
}

export default function HeaderGoldBanner({
  onMenuPress = () => Alert.alert('Menu', 'Destiny Protocol Navigation Menu'),
  onNotificationPress = () => Alert.alert('Notifications', 'All Destiny Protocol security systems active.'),
}: HeaderGoldBannerProps) {
  return (
    <View style={styles.bannerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#DFB05B" />

      {/* Left Menu Button */}
      <TouchableOpacity activeOpacity={0.75} style={styles.iconBtn} onPress={onMenuPress}>
        <MenuIcon size={20} color="#0A0C12" />
      </TouchableOpacity>

      {/* Center Integrated Brand Lockup */}
      <View style={styles.brandLockup}>
        <Svg width="36" height="20" viewBox="0 0 60 35" fill="none">
          {/* Interlocking DNA Rings */}
          <Path
            d="M20 17.5 C10 5, 10 30, 20 17.5 C30 5, 50 30, 40 17.5 C30 5, 10 30, 20 17.5 Z"
            stroke="#0A0C12"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M40 17.5 C50 5, 50 30, 40 17.5 C30 5, 10 30, 20 17.5 C10 5, 30 30, 40 17.5 Z"
            stroke="#0A0C12"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>

        <View style={styles.brandTextCol}>
          <Text style={styles.brandTitle}>DESTINY</Text>
          <View style={styles.subRow}>
            <View style={styles.line} />
            <Text style={styles.brandSub}>PROTOCOL</Text>
            <View style={styles.line} />
          </View>
        </View>
      </View>

      {/* Right Bell Notification Button */}
      <TouchableOpacity activeOpacity={0.75} style={styles.iconBtn} onPress={onNotificationPress}>
        <BellIcon size={20} color="#0A0C12" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#DFB05B',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#B88E3C',
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTextCol: {
    marginLeft: 8,
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A0C12',
    letterSpacing: 4,
    fontFamily: FONTS.heading,
    lineHeight: 18,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  line: {
    width: 10,
    height: 1,
    backgroundColor: '#0A0C12',
  },
  brandSub: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#0A0C12',
    letterSpacing: 3,
    marginHorizontal: 4,
  },
});
