import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import TopographyBackground from './TopographyBackground';
import { COLORS, FONTS } from '../theme';

export interface WelcomeGreetingCardProps {
  userName?: string;
  greeting?: string;
  kycPercentage?: number;
  hasAadhaar?: boolean;
  hasPan?: boolean;
  isPaid?: boolean;
  hasLand?: boolean;
  onActionPress?: (action: 'kyc' | 'land') => void;
}

function formatDisplayName(rawName?: string): string {
  if (!rawName) return 'User';
  if (/socialmedia/i.test(rawName)) return 'User';
  const clean = rawName.split('@')[0].trim();
  if (!clean || /socialmedia/i.test(clean)) return 'User';
  const firstName = clean.split(' ')[0];
  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
}

function GoldAvatarHaloGraphic({ initials = 'GV' }: { initials?: string }) {
  return (
    <View style={styles.haloContainer}>
      <Svg width="90" height="90" viewBox="0 0 120 120" fill="none">
        <Defs>
          <LinearGradient id="goldRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFE7A4" />
            <Stop offset="50%" stopColor="#DFB05B" />
            <Stop offset="100%" stopColor="#9B6D25" />
          </LinearGradient>
        </Defs>

        <Circle cx="60" cy="60" r="56" stroke="rgba(223, 176, 91, 0.15)" strokeWidth="1" strokeDasharray="3 3" />
        <Circle cx="60" cy="60" r="50" stroke="rgba(223, 176, 91, 0.28)" strokeWidth="1" />
        <Circle cx="60" cy="60" r="44" stroke="url(#goldRingGrad)" strokeWidth="1.8" />
        <Circle cx="60" cy="60" r="38" stroke="rgba(223, 176, 91, 0.4)" strokeWidth="1.2" />
        <Circle cx="60" cy="60" r="32" fill="#120E08" stroke="#DFB05B" strokeWidth="1.8" />

        <Path d="M12 60 C 24 36, 96 36, 108 60" stroke="rgba(223, 176, 91, 0.3)" strokeWidth="1" fill="none" />
        <Path d="M12 60 C 24 84, 96 84, 108 60" stroke="rgba(223, 176, 91, 0.3)" strokeWidth="1" fill="none" />
      </Svg>

      <View style={styles.initialsContainer}>
        <Text style={styles.initialsText}>{initials}</Text>
      </View>
    </View>
  );
}

function ShieldPillIcon({ size = 14, color = '#DFB05B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="rgba(223, 176, 91, 0.15)" stroke={color} strokeWidth="1.8" />
      <Path d="M8 12L11 15L16 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function WelcomeGreetingCard({
  userName = 'User',
  greeting = 'Good Morning,',
  kycPercentage = 75,
  hasAadhaar = true,
  hasPan = true,
  isPaid = true,
  hasLand = false,
  onActionPress,
}: WelcomeGreetingCardProps) {
  const displayName = formatDisplayName(userName);
  const initials = displayName.length >= 2 ? displayName.substring(0, 2).toUpperCase() : 'GV';

  return (
    <View style={styles.container}>
      <TopographyBackground opacity={0.4} />

      {/* Top Section: Greeting & Core Security Positioning */}
      <View style={styles.topRow}>
        <View style={styles.leftContent}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.userNameText}>
            {displayName} <Text style={styles.handEmoji}>👋</Text>
          </Text>
          <View style={styles.headlineRow}>
            <Text style={styles.legacyHeadline}>Your Legacy is Secure 🔐</Text>
          </View>
          <Text style={styles.subtitleText}>
            Global Citizen | Secure Protocol Active
          </Text>
        </View>

        <View style={styles.rightGraphic}>
          <GoldAvatarHaloGraphic initials={initials} />
        </View>
      </View>

      {/* Key Metric Indicators & Action Required Prompts */}
      <View style={styles.pillsRow}>
        <View style={styles.badgePill}>
          <ShieldPillIcon size={14} color={COLORS.primary} />
          <Text style={styles.badgeText}>All Systems Secure</Text>
        </View>
        <View style={styles.kycPill}>
          <Text style={styles.kycLabel}>KYC Verification — </Text>
          <Text style={styles.kycPercentage}>{kycPercentage}% Complete</Text>
        </View>
      </View>

      {/* Direct Action Triggers */}
      <View style={styles.actionPromptRow}>
        {!hasAadhaar || !hasPan ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onActionPress?.('kyc')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Complete KYC</Text>
          </TouchableOpacity>
        ) : null}

        {!hasLand ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnGold]}
            onPress={() => onActionPress?.('land')}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionBtnText, styles.actionBtnTextGold]}>Add Record</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.allSecuredBadge}>
            <Text style={styles.allSecuredText}>✓ 100% Vault Protection Active</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A0C12',
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.42)',
    borderTopColor: 'rgba(255, 238, 178, 0.75)',
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 12,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  leftContent: {
    flex: 1,
    paddingRight: 10,
  },
  greetingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONTS.light,
    letterSpacing: 0.4,
  },
  userNameText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginVertical: 2,
    fontFamily: FONTS.heading,
  },
  handEmoji: {
    fontSize: 20,
  },
  headlineRow: {
    marginTop: 2,
    marginBottom: 4,
  },
  legacyHeadline: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.medium,
    letterSpacing: 0.2,
  },
  subtitleText: {
    fontSize: 11.5,
    color: COLORS.primaryLight,
    lineHeight: 16,
    fontFamily: FONTS.medium,
  },
  rightGraphic: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  haloContainer: {
    width: 84,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsContainer: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C160B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  initialsText: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(223, 176, 91, 0.18)',
    flexWrap: 'wrap',
    gap: 8,
    zIndex: 1,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A140A',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.45)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  kycPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(223, 176, 91, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  kycLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  kycPercentage: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  actionPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
    zIndex: 1,
  },
  actionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionBtnGold: {
    backgroundColor: 'rgba(223, 176, 91, 0.15)',
    borderColor: 'rgba(223, 176, 91, 0.5)',
  },
  actionBtnText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnTextGold: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  allSecuredBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  allSecuredText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
});
