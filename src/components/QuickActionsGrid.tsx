import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PlusIcon, ShieldCheckIcon, UserGroupIcon, DocumentTextIcon, HomeIcon } from './icons';
import { COLORS, FONTS } from '../theme';

export interface QuickActionsGridProps {
  onRegisterProperty?: () => void;
  onMyIdentity?: () => void;
  onAddBeneficiary?: () => void;
  onActivityLog?: () => void;
  showRegisterProperty?: boolean;
}

export default function QuickActionsGrid({
  onRegisterProperty,
  onMyIdentity,
  onAddBeneficiary,
  onActivityLog,
  showRegisterProperty = true,
}: QuickActionsGridProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>

      <View style={styles.grid}>
        {showRegisterProperty ? (
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={onRegisterProperty}
            style={[styles.card, { borderColor: '#DFB05B', backgroundColor: '#141722' }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#DFB05B' }]}>
              <PlusIcon size={22} color="#1A1405" />
            </View>
            <Text style={[styles.cardText, { color: '#DFB05B', fontWeight: '700' }]}>+ Add Asset / Land</Text>
          </TouchableOpacity>
        ) : null}

        {/* Card 2: My Identity */}
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onMyIdentity}
          style={styles.card}
        >
          <View style={styles.iconCircle}>
            <ShieldCheckIcon size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.cardText}>My Identity</Text>
        </TouchableOpacity>

        {/* Card 3: Add Beneficiary */}
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onAddBeneficiary}
          style={styles.card}
        >
          <View style={styles.iconCircle}>
            <UserGroupIcon size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.cardText}>Add Beneficiary</Text>
        </TouchableOpacity>

        {/* Card 4: Activity Log */}
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onActivityLog}
          style={styles.card}
        >
          <View style={styles.iconCircle}>
            <DocumentTextIcon size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.cardText}>Activity Log</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 14,
    fontFamily: FONTS.heading,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#0A0C12',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.42)',
    borderTopColor: 'rgba(255, 238, 178, 0.75)',
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A140A',
    borderWidth: 1.2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryLight,
    letterSpacing: 0.3,
  },
});
