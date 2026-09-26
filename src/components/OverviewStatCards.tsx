import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ChevronRightIcon, UserGroupIcon } from './icons';
import { COLORS, FONTS } from '../theme';
import {
  KYC_STEP_TOTAL,
  getVerifiedStepCount,
} from '../services/dashboardMetrics';

export interface OverviewStatCardsProps {
  onViewAllPress?: () => void;
  profile?: any;
  beneficiaryCount?: number;
}

function ShieldStatIcon({ size = 18, color = COLORS.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="rgba(223, 176, 91, 0.15)" stroke={color} strokeWidth="1.8" />
      <Path d="M8 12L11 15L16 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function OverviewStatCards({ onViewAllPress, profile, beneficiaryCount = 0 }: OverviewStatCardsProps) {
  const verifiedCount = getVerifiedStepCount(profile);
  const kycPercentage = Math.round((verifiedCount / KYC_STEP_TOTAL) * 100);

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>ASSET OVERVIEW</Text>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onViewAllPress}
          style={styles.viewAllBtn}
        >
          <Text style={styles.viewAllText}>View Profile</Text>
          <ChevronRightIcon size={12} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* 2-Card Row Grid */}
      <View style={styles.grid}>
        {/* Card 1: KYC Verification */}
        <View style={styles.card}>
          <View style={styles.iconBadge}>
            <ShieldStatIcon size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.cardLabel}>KYC Verification</Text>
          <Text style={styles.cardValue}>{kycPercentage}%</Text>
          <Text style={[styles.subBadge, { color: verifiedCount >= 3 ? COLORS.success : COLORS.warning }]}>
            {verifiedCount}/{KYC_STEP_TOTAL} Steps Complete
          </Text>
        </View>

        {/* Card 2: Beneficiaries */}
        <View style={styles.card}>
          <View style={styles.iconBadge}>
            <UserGroupIcon size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.cardLabel}>Beneficiaries</Text>
          <Text style={styles.cardValue}>{beneficiaryCount}</Text>
          <Text style={[styles.subBadge, { color: COLORS.primaryLight }]} numberOfLines={1}>
            {beneficiaryCount ? 'Legacy claim active' : 'No nominees yet'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#0A0C12',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.42)',
    borderTopColor: 'rgba(255, 238, 178, 0.75)',
    padding: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1A140A',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: FONTS.medium,
  },
  subBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
});
