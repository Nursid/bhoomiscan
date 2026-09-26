import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BadgeShieldIcon } from './icons';
import { COLORS, FONTS } from '../theme';

export default function TrustBadgesRow() {
  return (
    <View style={styles.container}>
      {/* Badge 1 */}
      <View style={styles.badgeItem}>
        <BadgeShieldIcon size={14} color={COLORS.primary} />
        <Text style={styles.badgeText}>End-to-end{"\n"}Encrypted</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Badge 2 */}
      <View style={styles.badgeItem}>
        <BadgeShieldIcon size={14} color={COLORS.primary} />
        <Text style={styles.badgeText}>Audited{"\n"}Smart Contract</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Badge 3 */}
      <View style={styles.badgeItem}>
        <BadgeShieldIcon size={14} color={COLORS.primary} />
        <Text style={styles.badgeText}>10K+ Users{"\n"}Trust Us</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginVertical: 14,
  },
  badgeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginLeft: 6,
    lineHeight: 14,
    fontFamily: FONTS.light,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.surfaceBorder,
  },
});
