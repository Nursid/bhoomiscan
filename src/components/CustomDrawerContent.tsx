import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { getCachedProfile, setCachedProfile } from '../services/profileCache';
import { subscribeAuthState, getUserData, logoutUser } from '../services/firebase';
import NavigationService from '../screenRoute/navigationService';
import { routes } from '../screenRoute/stacks';
import { COLORS, FONTS } from '../theme';
import { DestinyBrandMark } from './DestinyBrand';
import {
  HomeIcon,
  LockIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  DocumentTextIcon,
  SettingsCogIcon,
  ProfileIcon,
  LogoutIcon,
  LandIcon,
} from './icons';

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const [profile, setProfile] = useState<any>(() => getCachedProfile());

  useEffect(() => {
    // Initial fetch from cache
    const cached = getCachedProfile();
    if (cached) {
      setProfile(cached);
    }

    // Subscribe to auth state updates to sync profile details
    const unsubscribe = subscribeAuthState(async (currentUser: any) => {
      if (currentUser && currentUser.uid) {
        try {
          const fresh = await getUserData(currentUser.uid);
          if (fresh) {
            setProfile(fresh);
            setCachedProfile(fresh);
          } else {
            setProfile(currentUser);
          }
        } catch {
          setProfile(currentUser);
        }
      } else {
        setProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const getActiveRouteName = () => {
    try {
      let state = props.state;
      let routeName = 'Home';

      while (state && state.index !== undefined && state.routes[state.index]) {
        const route = state.routes[state.index];
        routeName = route.name;
        if (route.state) {
          state = route.state as any;
        } else {
          break;
        }
      }

      if (routeName === 'Tabs') {
        return 'Home';
      }
      return routeName;
    } catch {
      return 'Home';
    }
  };

  const currentActiveTab = getActiveRouteName();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Destiny Protocol?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              props.navigation.closeDrawer();
              await logoutUser();
              NavigationService.reset(routes.Login);
            } catch (e: any) {
              Alert.alert('Sign Out Error', e?.message || 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getUserInitials = () => {
    const name = profile?.fullName || profile?.email || 'DP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const hasAadhaar = !!profile?.verifications?.aadhaar;
  const hasPan = !!profile?.verifications?.pan;
  const isPaid = !!profile?.verifications?.payment;
  const isKycComplete = hasAadhaar && hasPan && isPaid;

  const menuItems = [
    {
      label: 'Dashboard',
      icon: HomeIcon,
      target: 'Home',
      isTab: true,
    },
    {
      label: 'Vaults & Deeds',
      icon: LockIcon,
      target: 'Vaults',
      isTab: true,
    },
    {
      label: 'Register Property',
      icon: LandIcon,
      target: 'LandRegistration',
      isTab: false,
    },
    {
      label: 'Verified Identity (KYC)',
      icon: ShieldCheckIcon,
      target: 'VerifiedIdentity',
      isTab: false,
    },
    {
      label: 'Beneficiaries & Claims',
      icon: UserGroupIcon,
      target: 'People',
      isTab: true,
    },
    {
      label: 'Activity Logs & Time',
      icon: DocumentTextIcon,
      target: 'Activity',
      isTab: true,
    },
    {
      label: 'Profile',
      icon: ProfileIcon,
      target: 'Profile',
      isTab: false,
    },
    {
      label: 'Settings & Security',
      icon: SettingsCogIcon,
      target: 'Settings',
      isTab: true,
    },
  ];

  const navigateTo = (item: typeof menuItems[0]) => {
    props.navigation.closeDrawer();
    
    const hasAadhaar = !!profile?.verifications?.aadhaar;
    const hasPan = !!profile?.verifications?.pan;
    const isPaid = !!profile?.verifications?.payment;

    // 1. Vaults & Deeds requires Aadhaar Verification
    if (item.target === 'Vaults' && !hasAadhaar) {
      props.navigation.navigate('AadhaarVerification');
      return;
    }

    // 2. Beneficiaries & Claims (People) requires Aadhaar Verification
    if (item.target === 'People' && !hasAadhaar) {
      props.navigation.navigate('AadhaarVerification');
      return;
    }

    // 3. Register Property requires full KYC (Aadhaar + PAN + Payment)
    if (item.target === 'LandRegistration') {
      if (!hasAadhaar) {
        props.navigation.navigate('AadhaarVerification');
        return;
      }
      if (!hasPan) {
        props.navigation.navigate('PanVerification');
        return;
      }
      if (!isPaid) {
        props.navigation.navigate('RazorpayPayment');
        return;
      }
    }

    if (item.isTab) {
      props.navigation.navigate('Tabs', { screen: item.target });
    } else {
      props.navigation.navigate(item.target);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Drawer Header with Logo & Brand */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <DestinyBrandMark width={48} height={44} />
          <View style={styles.brandText}>
            <Text style={styles.brandTitle}>DESTINY</Text>
            <View style={styles.protocolRow}>
              <View style={styles.line} />
              <Text style={styles.brandSub}>PROTOCOL</Text>
              <View style={styles.line} />
            </View>
          </View>
        </View>

        {/* Glossy Profile Card */}
        <View style={styles.profileCard}>
          {/* Specular light sheen highlight layer */}
          <View style={styles.glossHighlight} />
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getUserInitials()}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName} numberOfLines={1}>
              {profile?.fullName || profile?.email?.split('@')[0] || 'Protocol User'}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {profile?.email || 'user@destiny.protocol'}
            </Text>
            <View style={[styles.statusPill, isKycComplete ? styles.statusPillVerified : styles.statusPillPending]}>
              <Text style={[styles.statusText, isKycComplete ? styles.statusTextVerified : styles.statusTextPending]}>
                {isKycComplete ? 'Verified Identity' : 'KYC Pending'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main framed list section */}
      <View style={styles.menuFrame}>
        <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
          {menuItems.map((item) => {
            const isActive = item.isTab
              ? currentActiveTab === item.target
              : false;

            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.8}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => navigateTo(item)}
              >
                <View style={styles.iconWrapper}>
                  <IconComponent size={20} color={isActive ? '#DFB05B' : '#798096'} />
                </View>
                <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Drawer Footer with Metallic Gradient Sign Out */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <View style={StyleSheet.absoluteFill}>
            <Svg height="100%" width="100%">
              <Defs>
                <LinearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#DFB05B" />
                  <Stop offset="50%" stopColor="#C69538" />
                  <Stop offset="100%" stopColor="#8A641A" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#bronzeGrad)" />
            </Svg>
          </View>
          {/* Speck highlight stroke */}
          <View pointerEvents="none" style={styles.buttonStroke} />
          <View style={styles.signOutContent}>
            <LogoutIcon size={18} color="#FFFFFF" />
            <Text style={styles.signOutText}>Disconnect Protocol</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.versionText}>Destiny Protocol • v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050608',
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandText: {
    marginLeft: 10,
    alignItems: 'flex-start',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DFB05B',
    letterSpacing: 4,
    fontFamily: FONTS.heading,
  },
  protocolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  line: {
    width: 12,
    height: 1,
    backgroundColor: '#B88E3C',
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B88E3C',
    letterSpacing: 3,
    marginHorizontal: 4,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0C12',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.42)',
    borderTopColor: 'rgba(255, 238, 178, 0.75)',
    padding: 14,
    marginTop: 4,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  glossHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1C160B',
    borderWidth: 1.5,
    borderColor: '#DFB05B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#DFB05B',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONTS.medium,
  },
  profileDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
    marginBottom: 2,
    backgroundColor: 'transparent',
  },
  profileEmail: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.light,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  statusPillVerified: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusPillPending: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTextVerified: {
    color: '#10B981',
  },
  statusTextPending: {
    color: '#EF4444',
  },
  menuFrame: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(223, 176, 91, 0.35)',
    borderTopColor: 'rgba(255, 238, 178, 0.6)',
    backgroundColor: '#090A0D',
    overflow: 'hidden',
    marginVertical: 12,
  },
  scrollList: {
    paddingVertical: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.08)',
    backgroundColor: '#0E1017',
    marginBottom: 8,
    marginHorizontal: 12,
  },
  menuItemActive: {
    backgroundColor: '#0E1017',
    borderColor: 'rgba(223, 176, 91, 0.8)',
    borderWidth: 1.2,
    borderTopColor: 'rgba(255, 238, 178, 0.9)',
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  iconWrapper: {
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
    backgroundColor: 'transparent',
  },
  menuLabelActive: {
    color: '#DFB05B',
    fontWeight: '700',
    backgroundColor: 'transparent',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 10,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 238, 178, 0.45)',
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonStroke: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  signOutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
    fontFamily: FONTS.medium,
    letterSpacing: 0.4,
  },
  versionText: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
  },
});
