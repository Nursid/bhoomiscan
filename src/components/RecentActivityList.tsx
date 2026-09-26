import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UserGroupIcon, ShieldCheckIcon, ChevronRightIcon } from './icons';
import { COLORS, FONTS } from '../theme';
import { getPaymentSummary } from '../services/dashboardMetrics';

export interface RecentActivityListProps {
  profile?: any;
  onViewAllPress?: () => void;
}

export default function RecentActivityList({ profile, onViewAllPress }: RecentActivityListProps) {
  const activities = [];
  const formatTime = (value?: string) =>
    value
      ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Just now';

  const rawLoginTs = profile?.lastLoginAt;
  const loginTime = rawLoginTs
    ? formatTime(rawLoginTs)
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  activities.push({
    id: 'login',
    title: profile?.authProvider === 'google' ? 'Google OAuth 2.0 Session' : 'Encrypted Mobile Session',
    subtitle: `Logged in as ${profile?.email || 'User'}`,
    time: loginTime,
    notif: 'Session Active',
    type: 'user',
  });

  if (profile?.verifications?.aadhaar) {
    activities.push({
      id: 'aadhaar',
      title: 'Aadhaar ID verified',
      subtitle: profile.verifications.aadhaar.name
        ? `DigiLocker - ${profile.verifications.aadhaar.name}`
        : 'DigiLocker verification complete',
      time: formatTime(profile.verifications.aadhaar.timestamp),
      notif: 'Notification Sent',
      type: 'shield',
    });
  }

  if (profile?.verifications?.pan) {
    activities.push({
      id: 'pan',
      title: 'PAN verified',
      subtitle: profile.verifications.pan.panNo
        ? `PAN: ${profile.verifications.pan.panNo}`
        : 'Registered card matches identity',
      time: formatTime(profile.verifications.pan.timestamp),
      notif: 'Notification Sent',
      type: 'shield',
    });
  }

  if (profile?.verifications?.payment) {
    activities.push({
      id: 'payment',
      title: 'Registry fee captured',
      subtitle: getPaymentSummary(profile.verifications.payment),
      time: formatTime(profile.verifications.payment.timestamp),
      notif: 'Receipt Emailed',
      type: 'shield',
    });
  }

  if (profile?.verifications?.land) {
    activities.push({
      id: 'land',
      title: 'Land deed registered',
      subtitle: profile.verifications.land.village
        ? `${profile.verifications.land.village} plot linked`
        : 'Plot record linked successfully',
      time: formatTime(profile.verifications.land.timestamp),
      notif: 'Notification Sent',
      type: 'shield',
    });
  }

  if (activities.length === 1) {
    activities.push({
      id: 'onboard_pending',
      title: 'Identity setup pending',
      subtitle: 'Complete Aadhaar and PAN verification',
      time: 'Pending',
      notif: 'Action Required',
      type: 'user',
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onViewAllPress}
          style={styles.viewAllBtn}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <ChevronRightIcon size={12} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardContainer}>
        {activities.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.activityRow,
              index < activities.length - 1 && styles.borderBottom,
            ]}
          >
            {index < activities.length - 1 && <View style={styles.threadLine} />}

            <View style={styles.iconCircle}>
              {item.type === 'user' ? (
                <UserGroupIcon size={16} color={COLORS.primary} />
              ) : (
                <ShieldCheckIcon size={16} color={COLORS.primary} />
              )}
            </View>

            <View style={styles.activityInfo}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.itemTime}>{item.time}</Text>
              {item.notif ? (
                <Text style={styles.notifText}>
                  {item.notif}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
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
  cardContainer: {
    backgroundColor: '#0A0C12',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.42)',
    borderTopColor: 'rgba(255, 238, 178, 0.75)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(223, 176, 91, 0.15)',
  },
  threadLine: {
    position: 'absolute',
    left: 18,
    top: 36,
    bottom: -14,
    width: 1.5,
    backgroundColor: 'rgba(223, 176, 91, 0.3)',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1A140A',
    borderWidth: 1.2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    zIndex: 1,
  },
  activityInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: FONTS.medium,
  },
  itemSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  itemTime: {
    fontSize: 11,
    color: COLORS.primaryLight,
    fontWeight: '500',
  },
  notifText: {
    fontSize: 9.5,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
});
