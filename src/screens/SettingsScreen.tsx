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
import Svg, { Path } from 'react-native-svg';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData, logoutUser } from '../services/firebase';
import ScreenLoadingState from '../components/ScreenLoadingState';
import HeaderDarkGold from '../components/HeaderDarkGold';
import { getCachedProfile, setCachedProfile } from '../services/profileCache';
import NavigationService from '../screenRoute/navigationService';
import { routes } from '../screenRoute/stacks';
import {
  ProfileIcon,
  PanCardIcon,
  GlobeIcon,
  ShieldCheckIcon,
  HelpCircleIcon,
  ChevronRightIcon,
  LogoutIcon,
} from '../components/icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import TopographyBackground from '../components/TopographyBackground';

export interface SettingsScreenProps {
  navigation: any;
}

function GreenCheckIcon({ size = 14, color = '#10B981' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const isFocused = useIsFocused();
  const [profile, setProfile] = useState<any>(() => getCachedProfile());
  const [loadingProfile, setLoadingProfile] = useState<boolean>(() => !getCachedProfile());

  const fetchProfileData = async () => {
    try {
      const cached = getCachedProfile();
      if (cached) {
        setProfile(cached);
        setLoadingProfile(false);
      }
      const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
      if (activeUserStr) {
        const activeUser = JSON.parse(activeUserStr);
        const freshProfile = await getUserData(activeUser.uid);
        if (freshProfile) {
          setProfile(freshProfile);
          setCachedProfile(freshProfile);
        }
      }
    } catch (error: any) {
      console.log('Error loading profile on Settings:', error.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchProfileData();
    }
  }, [isFocused]);

  const getUserInitials = () => {
    const displayName = profile?.verifications?.aadhaar?.name || profile?.fullName || profile?.email || '';
    if (!displayName) return 'U';
    const parts = displayName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const hasAadhaar = !!profile?.verifications?.aadhaar;
  const hasPan = !!profile?.verifications?.pan;
  const isIdentityVerified = hasAadhaar && hasPan;

  if (loadingProfile) {
    return <ScreenLoadingState concept="compassOrb" title="Loading settings" subtitle="Preparing your account controls." initialPercentage={45} />;
  }

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Destiny Protocol?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logoutUser();
            NavigationService.reset(routes.Login);
          } catch (e: any) {
            Alert.alert('Sign Out Error', e?.message || 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  };

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
        {/* Screen Title */}
        <Text style={styles.screenHeading}>Settings</Text>

        {/* User Profile Card */}
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => navigation.navigate('VerifiedIdentity')}
          style={styles.profileCard}
        >
          {/* Avatar Circle */}
          <View style={styles.profileAvatarCircle}>
            <Text style={styles.profileAvatarText}>{getUserInitials()}</Text>
          </View>

          {/* User Info */}
          <View style={styles.profileTextCol}>
            <Text style={styles.userName}>
              {profile?.verifications?.aadhaar?.name || profile?.fullName || profile?.email || 'User'}
            </Text>

            <View style={styles.userBadgeRow}>
              <View style={[styles.verifiedPill, !isIdentityVerified && styles.pendingPill]}>
                {isIdentityVerified ? <GreenCheckIcon size={10} color="#10B981" /> : null}
                <Text style={[styles.verifiedText, !isIdentityVerified && styles.pendingText]}>
                  {isIdentityVerified ? 'Verified' : 'KYC pending'}
                </Text>
              </View>
              <Text style={styles.userEmail} numberOfLines={1}>
                {profile?.email || 'User'}
              </Text>
            </View>
          </View>

          {/* Right Chevron */}
          <ChevronRightIcon size={16} color="#717D96" />
        </TouchableOpacity>

        {/* IDENTITY Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>IDENTITY & KYC</Text>

          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.itemCard}
            onPress={() => navigation.navigate('VerifiedIdentity')}
          >
            <View style={styles.itemIconBadge}>
              <ProfileIcon size={18} color="#DFB05B" />
            </View>

            <Text style={[styles.itemTitle, { flex: 1 }]}>
              {hasAadhaar ? 'Verified Aadhaar Identity' : 'Aadhaar Identity Verification'}
            </Text>

            {hasAadhaar ? (
              <View style={styles.checkWrapper}>
                <GreenCheckIcon size={14} color="#10B981" />
              </View>
            ) : null}
            <ChevronRightIcon size={16} color="#717D96" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.itemCard}
            onPress={() => navigation.navigate('PanVerification')}
          >
            <View style={styles.itemIconBadge}>
              <PanCardIcon size={18} color="#DFB05B" />
            </View>

            <Text style={[styles.itemTitle, { flex: 1 }]}>
              {hasPan ? 'PAN Card Verified' : 'PAN Card Verification'}
            </Text>

            {hasPan ? (
              <View style={styles.checkWrapper}>
                <GreenCheckIcon size={14} color="#10B981" />
              </View>
            ) : null}
            <ChevronRightIcon size={16} color="#717D96" />
          </TouchableOpacity>
        </View>

        {/* ACCOUNT PREFERENCES Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>

          {/* Language */}
          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.itemCard}
            onPress={() => Alert.alert('Language', 'Current language: English.')}
          >
            <View style={styles.itemIconBadge}>
              <GlobeIcon size={18} color="#DFB05B" />
            </View>
            <Text style={[styles.itemTitle, { flex: 1 }]}>Language</Text>
            <Text style={styles.preferenceValue}>English</Text>
            <ChevronRightIcon size={16} color="#717D96" />
          </TouchableOpacity>

          {/* Security & Recovery */}
          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.itemCard}
            onPress={() => Alert.alert('Security', '256-Bit Cryptographic Security active.')}
          >
            <View style={styles.itemIconBadge}>
              <ShieldCheckIcon size={18} color="#DFB05B" />
            </View>
            <Text style={[styles.itemTitle, { flex: 1 }]}>Security & Recovery</Text>
            <ChevronRightIcon size={16} color="#717D96" />
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.itemCard}
            onPress={() => Alert.alert('Help & Support', 'Destiny Protocol 24/7 Support Portal.')}
          >
            <View style={styles.itemIconBadge}>
              <HelpCircleIcon size={18} color="#DFB05B" />
            </View>
            <Text style={[styles.itemTitle, { flex: 1 }]}>Help & Support</Text>
            <ChevronRightIcon size={16} color="#717D96" />
          </TouchableOpacity>
        </View>

        {/* Red Outline Sign Out Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.signOutBtn}
          onPress={handleSignOut}
        >
          <LogoutIcon size={16} color="#EF4444" />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        {/* Footer Version */}
        <Text style={styles.footerVersionText}>Destiny Protocol • v0.1.0</Text>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050608',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  screenHeading: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
    marginVertical: 14,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1017',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.38)',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  profileAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1C160B',
    borderWidth: 1.5,
    borderColor: '#DFB05B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profileAvatarText: {
    color: '#DFB05B',
    fontSize: 18,
    fontWeight: '700',
  },
  profileTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 3,
  },
  pendingPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  pendingText: {
    color: '#EF4444',
    marginLeft: 0,
  },
  userEmail: {
    fontSize: 11.5,
    color: '#717D96',
    flex: 1,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C59B27',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1017',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.38)',
    padding: 16,
    marginBottom: 10,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  itemIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1C180E',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  checkWrapper: {
    marginRight: 8,
  },
  preferenceValue: {
    fontSize: 13,
    color: '#717D96',
    marginRight: 8,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A0E0E',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 18,
    paddingVertical: 14,
    marginTop: 10,
    marginBottom: 16,
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 14.5,
    fontWeight: '600',
    marginLeft: 8,
  },
  footerVersionText: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
  },
});
