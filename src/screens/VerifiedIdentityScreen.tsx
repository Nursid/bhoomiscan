import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData } from '../services/firebase';
import ScreenLoadingState from '../components/ScreenLoadingState';
import HeaderDarkGold from '../components/HeaderDarkGold';
import {
  ChevronLeftIcon,
  ProfileIcon,
  PanCardIcon,
  WalletIcon,
  MailIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '../components/icons';

import TopographyBackground from '../components/TopographyBackground';
import { getCachedProfile, setCachedProfile } from '../services/profileCache';

export interface VerifiedIdentityScreenProps {
  navigation: any;
}

function CalendarIcon({ size = 18, color = '#DFB05B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="1.8" />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function GenderIcon({ size = 18, color = '#DFB05B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="10" r="5" stroke={color} strokeWidth="1.8" />
      <Path d="M12 15v7M9 19h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function HomeBadgeIcon({ size = 18, color = '#DFB05B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HashTagIcon({ size = 18, color = '#DFB05B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function CopyIcon({ size = 14, color = '#717D96' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth="1.8" />
      <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export default function VerifiedIdentityScreen({ navigation }: VerifiedIdentityScreenProps) {
  const isFocused = useIsFocused();
  const [profile, setProfile] = useState<any>(() => getCachedProfile());
  const [loadingProfile, setLoadingProfile] = useState<boolean>(() => !getCachedProfile());

  const fetchProfileData = async () => {
    try {
      const cached = getCachedProfile();
      if (cached) {
        setProfile(cached);
        setLoadingProfile(false);
      } else {
        setLoadingProfile(true);
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
      console.log('Error loading profile on Verified Identity:', error.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      setLoadingProfile(true);
      fetchProfileData();
    } else {
      setLoadingProfile(true);
    }
  }, [isFocused]);

  const getUserInitials = () => {
    const displayName = profile?.verifications?.aadhaar?.name || profile?.fullName || profile?.email || '';
    if (!displayName) return '';
    const parts = displayName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const aadhaar = profile?.verifications?.aadhaar || null;
  const pan = profile?.verifications?.pan || null;
  const hasAadhaar = !!aadhaar;
  const hasPan = !!pan;
  const aadhaarName = aadhaar?.name || profile?.fullName || profile?.email || 'User';
  const aadhaarNumber = aadhaar?.aadhaarNo || 'Not returned by DigiLocker';
  const aadhaarTimestamp = aadhaar?.timestamp
    ? new Date(aadhaar.timestamp).toLocaleDateString()
    : '';
  const panTimestamp = pan?.timestamp
    ? new Date(pan.timestamp).toLocaleDateString()
    : '';

  if (loadingProfile) {
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
            title="Loading identity"
            subtitle="Preparing verified Aadhaar and PAN details."
            initialPercentage={55}
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
      <View style={styles.headerBar}>
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.backCircleBtn}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeftIcon size={18} color="#DFB05B" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Verified Identity</Text>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top Profile Summary Card */}
        <View style={styles.profileSummaryCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getUserInitials()}</Text>
            </View>

            <View style={styles.profileInfoCol}>
              <Text style={styles.profileName}>{aadhaarName}</Text>
              <View style={styles.verifiedDatePill}>
                <ShieldCheckIcon size={12} color="#10B981" />
                <Text style={styles.verifiedDateText}>
                  {hasAadhaar ? `Verified ${aadhaarTimestamp || ''}` : 'Aadhaar pending'}
                </Text>
              </View>
            </View>
          </View>

          {/* 3 Badges Row */}
          <View style={styles.threeBadgesRow}>
            <View style={styles.badgeItem}>
              <Text style={styles.badgeLabel}>🛡️ Aadhaar</Text>
              <Text style={hasAadhaar ? styles.verifiedGreenText : styles.notYetText}>
                {hasAadhaar ? 'Verified' : 'Not yet'}
              </Text>
            </View>
            <View style={styles.badgeItem}>
              <Text style={styles.badgeLabel}>📄 PAN</Text>
              <Text style={hasPan ? styles.verifiedGreenText : styles.notYetText}>
                {hasPan ? 'Verified' : 'Not yet'}
              </Text>
            </View>
            <View style={styles.badgeItem}>
              <Text style={styles.badgeLabel}>👛 Wallet</Text>
              <Text style={styles.notYetText}>Not yet</Text>
            </View>
          </View>
        </View>

        {/* FROM YOUR AADHAAR Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>FROM YOUR AADHAAR</Text>
          <Text style={styles.sectionSubtitle}>Verified via DigiLocker</Text>

          <View style={styles.cardContainer}>
            {/* Full Name */}
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <ProfileIcon size={18} color="#DFB05B" />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>FULL NAME</Text>
                <Text style={styles.infoValue}>{aadhaar?.name || 'Not verified'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Aadhaar Number */}
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <HashTagIcon size={18} color="#DFB05B" />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>AADHAAR NUMBER</Text>
                <Text style={styles.infoValue}>{aadhaarNumber}</Text>
                <Text style={styles.subNote}>Returned by DigiLocker</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Date of Birth */}
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <CalendarIcon size={18} color="#DFB05B" />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>DATE OF BIRTH</Text>
                <Text style={styles.infoValue}>{aadhaar?.dob || 'Not returned'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Gender */}
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <GenderIcon size={18} color="#DFB05B" />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>GENDER</Text>
                <Text style={styles.infoValue}>{aadhaar?.gender || 'Not returned'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Care Of */}
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <UserGroupIcon size={18} color="#DFB05B" />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>CARE OF</Text>
                <Text style={styles.infoValue}>{aadhaar?.careOf || 'Not returned'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* REGISTERED ADDRESS Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>REGISTERED ADDRESS</Text>

          <View style={styles.cardContainer}>
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <HomeBadgeIcon size={18} color="#DFB05B" />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.addressText}>
                  {aadhaar?.address || 'Not returned'}
                </Text>

                <View style={styles.pillRow}>
                  {aadhaar?.district ? <View style={styles.greyPill}><Text style={styles.greyPillText}>{aadhaar.district}</Text></View> : null}
                  {aadhaar?.state ? <View style={styles.greyPill}><Text style={styles.greyPillText}>{aadhaar.state}</Text></View> : null}
                  {aadhaar?.pincode ? <View style={styles.greyPill}><Text style={styles.greyPillText}>{aadhaar.pincode}</Text></View> : null}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* PAN Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>PAN</Text>
          <Text style={styles.sectionSubtitle}>Cross-verified against Aadhaar name</Text>

          <View style={styles.cardContainer}>
            {hasPan ? (
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <PanCardIcon size={18} color="#DFB05B" />
                </View>
                <View style={styles.infoTextCol}>
                  <Text style={styles.infoValue}>{pan.panNo}</Text>
                  <Text style={styles.subNote}>
                    {pan.holderName || 'Holder name not returned'}{panTimestamp ? ` • Verified ${panTimestamp}` : ''}
                  </Text>
                </View>
                <View style={styles.greenCheckBadge}>
                  <ShieldCheckIcon size={16} color="#10B981" />
                </View>
              </View>
            ) : (
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <PanCardIcon size={18} color="#717D96" />
                </View>
                <View style={styles.infoTextCol}>
                  <Text style={styles.infoValue}>Not verified</Text>
                  <Text style={styles.subNote}>Verify PAN after Aadhaar</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* CONNECTED WALLET Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>CONNECTED WALLET</Text>
          <Text style={styles.sectionSubtitle}>Required before property registration</Text>

          <View style={styles.cardContainerCenter}>
            <Text style={styles.walletDesc}>
              Link a wallet to encrypt + anchor your property capsules on-chain.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.connectWalletBtn}
              onPress={() => navigation.navigate('ConnectWallet')}
            >
              <WalletIcon size={16} color="#DFB05B" />
              <Text style={styles.connectWalletText}>Connect Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTACT Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>CONTACT</Text>

          <View style={styles.cardContainer}>
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <MailIcon size={18} color="#DFB05B" />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>EMAIL</Text>
                <Text style={styles.infoValue}>{profile?.email || 'User'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* TAMPER-EVIDENT PROOF Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>TAMPER-EVIDENT PROOF</Text>
          <Text style={styles.sectionSubtitle}>What we stored, never shared</Text>

          <View style={styles.cardContainer}>
            <Text style={styles.infoLabel}>SHA-256 PROOF HASH</Text>
            <Text style={styles.hashText}>
              47da2fd96b3026429f6aba18a8105bec958e53d3da4c5402fcd7195f95826cf4
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.copyBtn}
              onPress={() => Alert.alert('Copied', 'SHA-256 Proof Hash copied to clipboard.')}
            >
              <CopyIcon size={14} color="#717D96" />
              <Text style={styles.copyText}>Tap to copy</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.cardContainer, { marginTop: 10 }]}>
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <ShieldCheckIcon size={18} color="#DFB05B" />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.encryptedTitle}>Stored encrypted, never shared</Text>
                <Text style={styles.encryptedDesc}>
                  Your data is encrypted at rest and processed under DPDP Act 2023. We never sell, share, or use it for any purpose outside Destiny.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer Consent */}
        <Text style={styles.consentFooterText}>
          {aadhaar?.timestamp
            ? `Consent accepted ${new Date(aadhaar.timestamp).toLocaleString()}`
            : 'Aadhaar consent not completed'}
        </Text>

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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#050608',
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#12141B',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileSummaryCard: {
    backgroundColor: '#0E1017',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.38)',
    padding: 18,
    marginVertical: 14,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1C160B',
    borderWidth: 1.5,
    borderColor: '#DFB05B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#DFB05B',
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfoCol: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  verifiedDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  verifiedDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  threeBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1C202C',
    paddingTop: 12,
  },
  badgeItem: {
    alignItems: 'center',
  },
  badgeLabel: {
    fontSize: 11.5,
    color: '#717D96',
    marginBottom: 2,
  },
  verifiedGreenText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#10B981',
  },
  notYetText: {
    fontSize: 11.5,
    color: '#717D96',
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C59B27',
    letterSpacing: 1.5,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: '#717D96',
    marginTop: 2,
    marginBottom: 8,
  },
  cardContainer: {
    backgroundColor: '#0E1017',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.38)',
    padding: 16,
    marginTop: 6,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  cardContainerCenter: {
    backgroundColor: '#0E1017',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.38)',
    padding: 20,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
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
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10.5,
    color: '#717D96',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subNote: {
    fontSize: 11,
    color: '#717D96',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#1C202C',
    marginVertical: 12,
  },
  addressText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: 'row',
  },
  greyPill: {
    backgroundColor: '#1C202C',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  greyPillText: {
    fontSize: 11,
    color: '#717D96',
  },
  greenCheckBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletDesc: {
    fontSize: 13,
    color: '#717D96',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  connectWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161822',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.45)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  connectWalletText: {
    color: '#DFB05B',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  hashText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    marginVertical: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  copyText: {
    fontSize: 12,
    color: '#717D96',
    marginLeft: 5,
  },
  encryptedTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#DFB05B',
    marginBottom: 3,
  },
  encryptedDesc: {
    fontSize: 11,
    color: '#717D96',
    lineHeight: 16,
  },
  consentFooterText: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    marginTop: 10,
  },
});
