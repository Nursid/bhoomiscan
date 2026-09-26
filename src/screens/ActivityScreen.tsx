import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData } from '../services/firebase';
import ScreenLoadingState from '../components/ScreenLoadingState';
import HeaderDarkGold from '../components/HeaderDarkGold';
import { getCachedProfile, setCachedProfile } from '../services/profileCache';
import { DestinyBrandLockup } from '../components/DestinyBrand';
import {
  MenuIcon,
  BellIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  LockIcon,
} from '../components/icons';

import TopographyBackground from '../components/TopographyBackground';
import { getPaymentSummary } from '../services/dashboardMetrics';

export interface ActivityScreenProps {
  navigation: any;
}

export interface ActivityLogItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  notif?: string;
  type: 'user' | 'shield' | 'lock';
}

export default function ActivityScreen({ navigation }: ActivityScreenProps) {
  const isFocused = useIsFocused();
  const [profile, setProfile] = useState<any>(() => getCachedProfile());
  const [loadingProfile, setLoadingProfile] = useState<boolean>(() => !getCachedProfile());
  const verifications = profile?.verifications || {};
  const landRecord = profile?.verifications?.land;
  const landNumber = landRecord?.surveyNo || landRecord?.khewatNo || landRecord?.registrationNumber || 'Official record';
  const landLabel = `${landRecord?.village || landRecord?.district || 'Land record'} • ${landNumber}`;

  const rawLoginTs = profile?.lastLoginAt;
  const loginTime = rawLoginTs
    ? `${new Date(rawLoginTs).toLocaleDateString()} • ${new Date(rawLoginTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : `Today • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const activityLogs: ActivityLogItem[] = [
    {
      id: 'session',
      title: profile?.authProvider === 'google' ? 'Google OAuth 2.0 Session' : 'Encrypted Mobile Session',
      subtitle: `Logged in as ${profile?.email || 'User'}`,
      time: loginTime,
      notif: 'Session Active',
      type: 'user' as const,
    },
    ...(verifications?.aadhaar
      ? [
        {
          id: 'aadhaar',
          title: 'Aadhaar verified',
          subtitle: verifications.aadhaar.name ? `DigiLocker • ${verifications.aadhaar.name}` : 'DigiLocker identity verified',
          time: verifications.aadhaar.timestamp
            ? `${new Date(verifications.aadhaar.timestamp).toLocaleDateString()} • ${new Date(verifications.aadhaar.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Verified',
          notif: 'Notification Sent',
          type: 'shield' as const,
        },
      ]
      : []),
    ...(verifications?.pan
      ? [
        {
          id: 'pan',
          title: 'PAN verified',
          subtitle: verifications.pan.panNo ? `PAN: ${verifications.pan.panNo}` : 'PAN record verified',
          time: verifications.pan.timestamp
            ? `${new Date(verifications.pan.timestamp).toLocaleDateString()} • ${new Date(verifications.pan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Verified',
          notif: 'Notification Sent',
          type: 'shield' as const,
        },
      ]
      : []),
    ...(verifications?.payment
      ? [
        {
          id: 'payment',
          title: 'Registry fee paid',
          subtitle: getPaymentSummary(verifications.payment),
          time: verifications.payment.timestamp
            ? `${new Date(verifications.payment.timestamp).toLocaleDateString()} • ${new Date(verifications.payment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Captured',
          notif: 'Receipt Emailed',
          type: 'lock' as const,
        },
      ]
      : []),
    ...(landRecord
      ? [
        {
          id: 'land_registered',
          title: 'Property registered',
          subtitle: landLabel,
          time: landRecord.timestamp
            ? `${new Date(landRecord.timestamp).toLocaleDateString()} • ${new Date(landRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Registered',
          notif: 'Notification Sent',
          type: 'lock' as const,
        },
      ]
      : []),
  ];

  if (activityLogs.length === 1) {
    activityLogs.push({
      id: 'onboard_pending',
      title: 'Identity setup pending',
      subtitle: 'Complete Aadhaar and PAN verification',
      time: 'Pending',
      notif: 'Action Required',
      type: 'user' as const,
    });
  }

  const fetchProfileData = async () => {
    try {
      const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
      if (activeUserStr) {
        const user = JSON.parse(activeUserStr);
        const freshData = await getUserData(user.uid);
        if (freshData) {
          setProfile(freshData);
          setCachedProfile(freshData);
        }
      }
    } catch (e: any) {
      console.warn('Failed loading activity profile:', e?.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const getUserInitials = () => {
    const name = profile?.verifications?.aadhaar?.name || profile?.fullName || profile?.email || 'SG';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loadingProfile && !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#050608" />
        <HeaderDarkGold
          navigation={navigation}
          onAvatarPress={() => navigation.navigate('Profile')}
          userInitials={getUserInitials()}
        />
        <View style={{ flex: 1 }}>
          <ScreenLoadingState
            concept="compassOrb"
            title="Loading activity"
            subtitle="Loading forensic activity log..."
            navigation={navigation}
            userInitials={getUserInitials()}
            showHeader={false}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050608" />
      <TopographyBackground opacity={0.3} />

      {/* Top Header Bar */}
      <HeaderDarkGold
        navigation={navigation}
        onAvatarPress={() => navigation.navigate('Profile')}
        userInitials={getUserInitials()}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Screen Heading & Subheading */}
        <View style={styles.titleBlock}>
          <Text style={styles.screenHeading}>Activity</Text>
          <Text style={styles.screenSubHeading}>
            Forensic audit log of every action on your account.
          </Text>
        </View>

        {/* Activity Cards List */}
        <View style={styles.listContainer}>
          {activityLogs.map((item: any) => {
            let iconBadgeBg = 'rgba(16, 185, 129, 0.15)';
            let iconElement = <UserGroupIcon size={18} color="#10B981" />;

            if (item.type === 'shield') {
              iconBadgeBg = 'rgba(16, 185, 129, 0.15)';
              iconElement = <ShieldCheckIcon size={18} color="#10B981" />;
            } else if (item.type === 'lock') {
              iconBadgeBg = 'rgba(223, 176, 91, 0.15)';
              iconElement = <LockIcon size={18} color="#DFB05B" />;
            }

            return (
              <View key={item.id} style={styles.activityCard}>
                {/* Left Icon Badge */}
                <View style={[styles.iconCircle, { backgroundColor: iconBadgeBg }]}>
                  {iconElement}
                </View>

                {/* Center Title & Subtitle */}
                <View style={styles.textCol}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                </View>

                {/* Right Timestamp & Notification */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.itemTime}>{item.time}</Text>
                  <Text style={{ fontSize: 9.5, color: '#10B981', fontWeight: '600', marginTop: 2 }}>
                    🔔 {item.notif || 'Logged'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050608',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#050608',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(223, 176, 91, 0.18)',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#12141B',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1C160B',
    borderWidth: 1.2,
    borderColor: '#DFB05B',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  avatarText: {
    color: '#DFB05B',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  titleBlock: {
    marginVertical: 16,
  },
  screenHeading: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  screenSubHeading: {
    fontSize: 13,
    color: '#717D96',
    lineHeight: 18,
  },
  listContainer: {
    marginTop: 4,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1017',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.38)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#717D96',
    marginTop: 2,
  },
  itemTime: {
    fontSize: 11.5,
    color: '#5A6578',
  },
});
