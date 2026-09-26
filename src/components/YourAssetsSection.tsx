import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ChevronRightIcon } from './icons';
import TopographyBackground from './TopographyBackground';
import { COLORS, FONTS } from '../theme';

export interface YourAssetsSectionProps {
  profile?: any;
  onAllPress?: () => void;
  onAssetPress?: (assetId: string) => void;
}

export default function YourAssetsSection({ profile, onAllPress, onAssetPress }: YourAssetsSectionProps) {
  const land = profile?.verifications?.land;

  if (!land) return null;

  const primaryNumber = land.surveyNo || land.khewatNo || land.registrationNumber || 'Official record';
  const assets = [{
    id: land.registrationNumber || primaryNumber || 'land_record',
    title: `${land.village || land.district || 'Land record'} - ${primaryNumber}`,
    subtitle: land.source || `${land.state || 'Official'} land record`,
    primaryNumber,
    location: land.district || land.state || 'Official',
  }];

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>YOUR ASSETS</Text>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onAllPress}
          style={styles.viewAllBtn}
        >
          <Text style={styles.viewAllText}>All {assets.length}</Text>
          <ChevronRightIcon size={12} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {assets.map((asset) => (
          <TouchableOpacity
            key={asset.id}
            activeOpacity={0.82}
            onPress={() => onAssetPress && onAssetPress(asset.id)}
            style={styles.assetCard}
          >
            <TopographyBackground opacity={0.3} />

            <View style={styles.topPillRow}>
              <View style={styles.landPill}>
                <Text style={styles.landPillText}>REGISTERED DEED</Text>
              </View>
              <View style={styles.anchoredPill}>
                <View style={styles.goldDot} />
                <Text style={styles.anchoredText}>ANCHORED</Text>
              </View>
            </View>

            <Text style={styles.assetTitle}>{asset.title}</Text>
            <Text style={styles.assetSubtitle}>{asset.subtitle}</Text>

            <View style={styles.divider} />

            <View style={styles.bottomInfoRow}>
              <Text style={styles.infoText}>{asset.primaryNumber}</Text>
              <Text style={styles.infoText}>{asset.location}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 2,
    fontFamily: FONTS.heading,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: 4,
  },
  scrollContent: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  assetCard: {
    width: 250,
    backgroundColor: '#0A0C12',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.42)',
    borderTopColor: 'rgba(255, 238, 178, 0.75)',
    padding: 18,
    marginRight: 14,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  topPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    zIndex: 1,
  },
  landPill: {
    backgroundColor: '#1A140A',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  landPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  anchoredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  goldDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  anchoredText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.8,
  },
  assetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    zIndex: 1,
    fontFamily: FONTS.medium,
  },
  assetSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
    zIndex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(223, 176, 91, 0.18)',
    marginVertical: 8,
    zIndex: 1,
  },
  bottomInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  infoText: {
    fontSize: 11,
    color: COLORS.primaryLight,
    fontWeight: '500',
  },
});
