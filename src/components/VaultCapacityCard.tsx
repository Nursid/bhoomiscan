import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ChevronRightIcon } from './icons';
import { COLORS, FONTS } from '../theme';
import { getVaultUsage } from '../services/dashboardMetrics';

export interface VaultCapacityCardProps {
  onManagePress?: () => void;
  profile?: any;
}

function ProgressRing({ percentage = 16 }: { percentage?: number }) {
  const radius = 32;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

  return (
    <View style={styles.ringWrapper}>
      <Svg width="78" height="78" viewBox="0 0 78 78">
        <Defs>
          <LinearGradient id="arcGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFE7A4" />
            <Stop offset="50%" stopColor="#DFB05B" />
            <Stop offset="100%" stopColor="#9B6D25" />
          </LinearGradient>
        </Defs>

        {/* Background Track */}
        <Circle
          cx="39"
          cy="39"
          r={radius}
          stroke="rgba(223, 176, 91, 0.15)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Active Gold Arc */}
        <Circle
          cx="39"
          cy="39"
          r={radius}
          stroke="url(#arcGoldGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform="rotate(-90 39 39)"
        />
      </Svg>
      <View style={styles.ringTextWrapper}>
        <Text style={styles.ringText}>{percentage}%</Text>
      </View>
    </View>
  );
}

export default function VaultCapacityCard({ onManagePress, profile }: VaultCapacityCardProps) {
  const usage = getVaultUsage(profile);
  const fillWidth = `${usage.percentage}%` as `${number}%`;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>VAULT CAPACITY</Text>

        <View style={styles.contentRow}>
          {/* Left Details */}
          <View style={styles.leftDetails}>
            <View style={styles.usageValueRow}>
              <Text style={styles.percentText}>{usage.percentage}%</Text>
              <Text style={styles.usedLabel}> Used</Text>
            </View>
            <Text style={styles.gbText}>
              {usage.usedGb} GB of {usage.totalGb} GB used
            </Text>

            {/* Linear Progress Bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: fillWidth }]} />
            </View>
          </View>

          {/* Right Circular Progress Ring */}
          <ProgressRing percentage={usage.percentage} />
        </View>

        {/* Manage Vaults Link */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onManagePress}
          style={styles.manageBtn}
        >
          <Text style={styles.manageText}>Manage Vaults</Text>
          <ChevronRightIcon size={12} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 6,
  },
  card: {
    backgroundColor: '#0A0C12',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.42)',
    borderTopColor: 'rgba(255, 238, 178, 0.75)',
    padding: 18,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 10,
    fontFamily: FONTS.heading,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftDetails: {
    flex: 1,
    paddingRight: 16,
  },
  usageValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  percentText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONTS.medium,
  },
  usedLabel: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  gbText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginVertical: 4,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: 'rgba(223, 176, 91, 0.15)',
    borderRadius: 2.5,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    width: '0%',
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2.5,
  },
  ringWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ringTextWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(223, 176, 91, 0.15)',
  },
  manageText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: 4,
  },
});
