import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlobeIcon, ChevronDownIcon } from './icons';
import { FONTS } from '../theme';
import { DestinyBrandMark } from './DestinyBrand';

export interface DestinyLogoHeaderProps {
  selectedLanguage?: string;
  onLanguagePress?: () => void;
}

export default function DestinyLogoHeader({
  selectedLanguage = 'English',
  onLanguagePress,
}: DestinyLogoHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onLanguagePress}
          style={styles.languagePill}
        >
          <GlobeIcon size={14} color="#DFB05B" />
          <Text style={styles.languageText}>{selectedLanguage}</Text>
          <ChevronDownIcon size={13} color="#DFB05B" />
        </TouchableOpacity>
      </View>

      <View style={styles.emblemWrapper}>
        <DestinyBrandMark width={300} height={280} />
      </View>

      <Text style={styles.brandTitle}>DESTINY</Text>

      <View style={styles.protocolRow}>
        <View style={styles.dashLine} />
        <Text style={styles.protocolText}>PROTOCOL</Text>
        <View style={styles.dashLine} />
      </View>

      <Text style={styles.tagline}>SECURE TODAY. PROTECT TOMORROW. LEGACY FOREVER.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 18,
  },
  topRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  languagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E0E11',
    borderWidth: 1,
    borderColor: 'rgba(196, 146, 62, 0.58)',
    borderRadius: 28,
    paddingHorizontal: 15,
    paddingVertical: 7,
  },
  languageText: {
    color: '#EBC77C',
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 9,
    fontFamily: FONTS.medium,
  },
  emblemWrapper: {
    width: '100%',
    height: 164,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '600',
    color: '#F0C16C',
    letterSpacing: 6,
    marginTop: -50,
    textAlign: 'center',
    fontFamily: FONTS.heading,
  },
  protocolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dashLine: {
    width: 34,
    height: 1,
    backgroundColor: '#B98D3D',
    marginHorizontal: 12,
  },
  protocolText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 5,
    fontFamily: FONTS.heading,
  },
  tagline: {
    fontSize: 8,
    fontWeight: '400',
    color: '#C69B4B',
    letterSpacing: 2,
    marginTop: 12,
    fontFamily: FONTS.light,
  },
});
