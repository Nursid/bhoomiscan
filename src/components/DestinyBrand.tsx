import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { FONTS } from '../theme';
import { IMAGES } from '../assets';

type DestinyBrandMarkProps = {
  width?: number;
  height?: number;
};

export function DestinyBrandMark({ width = 112, height = 58 }: DestinyBrandMarkProps) {
  return (
    <Image
      source={IMAGES.logo}
      style={{ width, height, marginLeft: -10, marginTop: 8, marginRight: -5 }}
      resizeMode="contain"
    />
  );
}

type DestinyBrandLockupProps = {
  compact?: boolean;
};

export function DestinyBrandLockup({ compact = false }: DestinyBrandLockupProps) {
  return (
    <View style={styles.lockup}>
      <DestinyBrandMark width={compact ? 44 : 80} height={compact ? 24 : 44} />
      <View style={styles.wordmark}>
        <Text style={[styles.brandTitle, compact && styles.brandTitleCompact]}>DESTINY</Text>
        <View style={styles.protocolRow}>
          <View style={[styles.dash, compact && styles.dashCompact]} />
          <Text style={[styles.protocolText, compact && styles.protocolTextCompact]}>PROTOCOL</Text>
          <View style={[styles.dash, compact && styles.dashCompact]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    justifyContent: 'center',
    marginLeft: 8,
  },
  brandTitle: {
    color: '#F2C978',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
    fontFamily: FONTS.heading,
  },
  brandTitleCompact: {
    fontSize: 13,
    letterSpacing: 2.2,
  },
  protocolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dash: {
    width: 16,
    height: 1,
    backgroundColor: '#B98D3D',
    marginHorizontal: 4,
  },
  dashCompact: {
    width: 10,
    marginHorizontal: 3,
  },
  protocolText: {
    color: '#D8D2C6',
    fontSize: 9,
    letterSpacing: 2.4,
    fontFamily: FONTS.light,
  },
  protocolTextCompact: {
    fontSize: 7.5,
    letterSpacing: 1.8,
  },
});
