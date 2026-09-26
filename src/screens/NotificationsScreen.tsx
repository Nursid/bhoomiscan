import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import TopographyBackground from '../components/TopographyBackground';
import { getCachedProfile, setCachedProfile } from '../services/profileCache';
import { getUserData } from '../services/firebase';
import {
  BellIcon,
  ChevronLeftIcon,
  ShieldCheckIcon,
  WarningIcon,
  LandIcon,
  CardIcon,
  AadhaarIcon,
  RazorpayIcon,
} from '../components/icons';

type NotificationItem = {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  tone: 'success' | 'warning' | 'neutral';
  icon: React.ReactNode;
};

export default function NotificationsScreen({ navigation }: { navigation: any }) {
  const isFocused = useIsFocused();
  const [profile, setProfile] = useState<any>(() => getCachedProfile());

  const loadProfile = useCallback(async () => {
    try {
      const cached = getCachedProfile();
      if (cached) {
        setProfile(cached);
      }

      const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
      if (!activeUserStr) return;

      const activeUser = JSON.parse(activeUserStr);
      if (!activeUser?.uid) return;

      const freshProfile = await getUserData(activeUser.uid);
      if (freshProfile) {
        setProfile(freshProfile);
        setCachedProfile(freshProfile);
      }
    } catch (error: any) {
      console.log('Notification profile load failed:', error?.message || error);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadProfile();
    }
  }, [isFocused, loadProfile]);

  const notifications: NotificationItem[] = [
    {
      id: 'welcome',
      title: 'Welcome to Destiny Protocol',
      desc: 'Your secure property intelligence workspace is ready.',
      time: 'Active',
      read: true,
      tone: 'neutral',
      icon: <BellIcon size={18} color="#DFB05B" />,
    },
  ];

  if (profile?.verifications?.aadhaar) {
    notifications.push({
      id: 'aadhaar_success',
      title: 'Aadhaar Identity Linked',
      desc: `Aadhaar verified under ${profile.verifications.aadhaar.name || 'verified user'}.`,
      time: 'Verified',
      read: true,
      tone: 'success',
      icon: <AadhaarIcon size={18} color="#10B981" />,
    });
  } else {
    notifications.push({
      id: 'aadhaar_pending',
      title: 'Aadhaar KYC Required',
      desc: 'Verify Aadhaar to continue property verification.',
      time: 'Action Required',
      read: false,
      tone: 'warning',
      icon: <WarningIcon size={18} color="#F59E0B" />,
    });
  }

  if (profile?.verifications?.pan) {
    notifications.push({
      id: 'pan_success',
      title: 'PAN Linked Successfully',
      desc: `PAN record ${profile.verifications.pan.panNo || ''} is saved.`,
      time: 'Verified',
      read: true,
      tone: 'success',
      icon: <CardIcon size={18} color="#10B981" />,
    });
  } else {
    notifications.push({
      id: 'pan_pending',
      title: 'PAN Verification Pending',
      desc: 'Verify PAN to unlock payment and land registration.',
      time: 'Action Required',
      read: false,
      tone: 'warning',
      icon: <WarningIcon size={18} color="#F59E0B" />,
    });
  }

  if (profile?.verifications?.payment) {
    notifications.push({
      id: 'payment_success',
      title: 'Registry Service Active',
      desc: 'Payment is complete. Land verification is available.',
      time: 'Active',
      read: true,
      tone: 'success',
      icon: <RazorpayIcon size={18} color="#10B981" />,
    });
  } else {
    notifications.push({
      id: 'payment_pending',
      title: 'Service Payment Pending',
      desc: 'Complete the registry payment to continue.',
      time: 'Action Required',
      read: false,
      tone: 'warning',
      icon: <WarningIcon size={18} color="#F59E0B" />,
    });
  }

  if (profile?.verifications?.land) {
    notifications.push({
      id: 'land_success',
      title: 'Land Parcel Secured',
      desc: `Survey/Khewat ${profile.verifications.land.surveyNo || profile.verifications.land.khewatNo || 'record'} is saved in your vault.`,
      time: profile.verifications.land.lookupMode === 'manual_upload' ? 'Review Saved' : 'Secured',
      read: true,
      tone: 'success',
      icon: <LandIcon size={18} color="#10B981" />,
    });
  } else {
    notifications.push({
      id: 'land_pending',
      title: 'No Active Land Assets',
      desc: 'Run official land sync or upload property details manually.',
      time: 'Status',
      read: true,
      tone: 'neutral',
      icon: <LandIcon size={18} color="#DFB05B" />,
    });
  }

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050608" />
      <TopographyBackground opacity={0.3} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <ChevronLeftIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>
            {unreadCount ? `${unreadCount} action required` : 'All checks are up to date'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {notifications.map((item) => (
          <View key={item.id} style={[styles.notificationCard, styles[`${item.tone}Card`]]}>
            <View style={[styles.iconBadge, styles[`${item.tone}Icon`]]}>{item.icon}</View>
            <View style={styles.notificationBody}>
              <View style={styles.notificationTitleRow}>
                <Text style={styles.notificationTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.statusPill, styles[`${item.tone}Pill`]]} numberOfLines={1}>
                  {item.time}
                </Text>
              </View>
              <Text style={styles.notificationDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}

        <View style={styles.infoPanel}>
          <ShieldCheckIcon size={20} color="#DFB05B" />
          <View style={styles.infoTextCol}>
            <Text style={styles.infoTitle}>Verification Timeline</Text>
            <Text style={styles.infoDesc}>
              Your dashboard updates automatically after each successful KYC, payment, or land record save.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050608',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(223, 176, 91, 0.14)',
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#12141B',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  headerSub: {
    color: '#DFB05B',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  notificationCard: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#12141B',
  },
  successCard: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  warningCard: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  neutralCard: {
    borderColor: 'rgba(223, 176, 91, 0.22)',
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  successIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  warningIcon: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  neutralIcon: {
    backgroundColor: 'rgba(223, 176, 91, 0.12)',
  },
  notificationBody: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  notificationTitle: {
    flex: 1,
    minWidth: 0,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  statusPill: {
    maxWidth: 108,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
    color: '#050608',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  successPill: {
    backgroundColor: '#10B981',
  },
  warningPill: {
    backgroundColor: '#F59E0B',
  },
  neutralPill: {
    backgroundColor: '#DFB05B',
  },
  notificationDesc: {
    color: '#A0AEC0',
    fontSize: 12,
    lineHeight: 18,
  },
  infoPanel: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.25)',
    backgroundColor: 'rgba(223, 176, 91, 0.08)',
    padding: 14,
    marginTop: 6,
  },
  infoTextCol: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  infoDesc: {
    color: '#A0AEC0',
    fontSize: 12,
    lineHeight: 18,
  },
});
