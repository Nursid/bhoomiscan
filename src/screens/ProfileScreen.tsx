import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { getUserData, logoutUser } from '../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChevronLeftIcon,
  AadhaarIcon,
  PanCardIcon,
  LandIcon,
  ShieldCheckIcon,
  LogoutIcon,
} from '../components/icons';

import TopographyBackground from '../components/TopographyBackground';
import ScreenLoadingState from '../components/ScreenLoadingState';
import { getCachedProfile, setCachedProfile } from '../services/profileCache';
import NavigationService from '../screenRoute/navigationService';
import { routes } from '../screenRoute/stacks';

export interface ProfileScreenProps {
  navigation: any;
}

const CustomAvatar = () => (
  <View style={styles.avatarPlaceholder}>
    <View style={styles.avatarHead} />
    <View style={styles.avatarBody} />
  </View>
);

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const isFocused = useIsFocused();
  const [profile, setProfile] = useState<any>(() => getCachedProfile());
  const [loading, setLoading] = useState<boolean>(() => !getCachedProfile());

  const loadProfile = async () => {
    try {
      const cached = getCachedProfile();
      if (cached) {
        setProfile(cached);
        setLoading(false);
      }
      const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
      if (activeUserStr) {
        const activeUser = JSON.parse(activeUserStr);
        const data = await getUserData(activeUser.uid);
        setProfile(data);
      }
    } catch (e: any) {
      console.warn('Profile load error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      setLoading(true);
      loadProfile();
    } else {
      setLoading(true);
    }
  }, [isFocused]);

  const handleLogout = async () => {
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

  if (loading) {
    return <ScreenLoadingState concept="compassOrb" title="Loading profile" subtitle="Retrieving verified identity and KYC records." initialPercentage={60} />;
  }

  const verifications = profile?.verifications || {};
  const hasAadhaar = !!verifications.aadhaar;
  const hasPan = !!verifications.pan;
  const hasLand = !!verifications.land;
  const aadhaar = verifications.aadhaar || {};
  const pan = verifications.pan || {};
  const aadhaarPhoto = aadhaar.photo
    ? { uri: aadhaar.photo.startsWith('data:') ? aadhaar.photo : `data:image/jpeg;base64,${aadhaar.photo}` }
    : null;
  const aadhaarNumber = aadhaar.aadhaarNo || 'Not returned by DigiLocker';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050608" />
      <TopographyBackground opacity={0.3} />

      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ChevronLeftIcon size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Digital Vault</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.userOverviewCard}>
          <View style={styles.userInitialCircle}>
            <Text style={styles.userInitialText}>
              {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.userOverviewText}>
            <Text style={styles.userName}>{profile?.fullName}</Text>
            <Text style={styles.userEmail}>{profile?.email}</Text>
            <Text style={styles.userJoined}>
              Secure Ledger Created:{' '}
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>

        {/* AADHAAR CARD SECTION */}
        <Text style={styles.sectionHeader}>VERIFIED AADHAAR RECORD</Text>
        {hasAadhaar ? (
          <View style={styles.aadhaarCard}>
            <View style={styles.aadhaarCardTop}>
              <View style={styles.aadhaarFlagStrip} />
              <View style={styles.aadhaarHeaderRow}>
                <AadhaarIcon size={28} color="#EF4444" />
                <View>
                  <Text style={styles.aadhaarTitleEn}>Unique Identification Authority of India</Text>
                  <Text style={styles.aadhaarTitleHi}>भारतीय विशिष्ट पहचान प्राधिकरण</Text>
                </View>
              </View>
            </View>

            <View style={styles.aadhaarCardBody}>
              <View style={styles.aadhaarPhotoContainer}>
                {aadhaarPhoto ? (
                  <Image source={aadhaarPhoto} style={styles.aadhaarPhoto} />
                ) : (
                  <CustomAvatar />
                )}
                <View style={styles.aadhaarPhotoVerifyBadge}>
                  <Text style={styles.aadhaarPhotoVerifyBadgeText}>✓</Text>
                </View>
              </View>
              <View style={styles.aadhaarDetails}>
                <Text style={styles.aadhaarLabel}>Name / नाम:</Text>
                <Text style={styles.aadhaarVal}>{aadhaar.name || 'Not returned'}</Text>

                <Text style={styles.aadhaarLabel}>DOB / जन्म तिथि:</Text>
                <Text style={styles.aadhaarVal}>{aadhaar.dob || 'Not returned'}</Text>

                <Text style={styles.aadhaarLabel}>Gender / लिंग:</Text>
                <Text style={styles.aadhaarVal}>{aadhaar.gender || 'Not returned'}</Text>

                <Text style={styles.aadhaarLabel}>Address / पता:</Text>
                <Text style={[styles.aadhaarVal, { fontSize: 10, lineHeight: 13 }]} numberOfLines={2}>
                  {aadhaar.address || 'Not returned'}
                </Text>
              </View>
            </View>

            <View style={styles.aadhaarCardFooter}>
              <Text style={styles.aadhaarNumberText}>
                {aadhaarNumber.replace(/(\d{4})/g, '$1 ').trim()}
              </Text>
              <View style={styles.verifiedStamp}>
                <ShieldCheckIcon size={14} color="#10B981" />
                <Text style={styles.verifiedStampText}>DIGILOCKER SECURE</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <AadhaarIcon size={30} color="#5A6578" />
            <Text style={styles.emptyCardText}>No Aadhaar linked to this vault.</Text>
            <TouchableOpacity
              style={styles.emptyCardBtn}
              onPress={() => navigation.navigate('AadhaarVerification')}
            >
              <Text style={styles.emptyCardBtnText}>LINK AADHAAR VIA DIGILOCKER</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PAN CARD SECTION */}
        <Text style={styles.sectionHeader}>INCOME TAX DEPARTMENT RECORD</Text>
        {hasPan ? (
          <View style={styles.panCard}>
            <View style={styles.panHeader}>
              <Text style={styles.panHeaderTitle}>आयकर विभाग</Text>
              <Text style={styles.panHeaderTitleEn}>INCOME TAX DEPARTMENT</Text>
              <Text style={styles.panSubHeader}>भारत सरकार / GOVT. OF INDIA</Text>
            </View>

            <View style={styles.panBody}>
              <View style={styles.panLeft}>
                <Text style={styles.panLabel}>Permanent Account Number / स्थायी खाता संख्या</Text>
                <Text style={styles.panNumber}>{pan.panNo}</Text>

                <Text style={styles.panLabel}>Name / नाम</Text>
                <Text style={styles.panVal}>{pan.holderName || 'Not returned'}</Text>

                <Text style={styles.panLabel}>Status / स्थिति</Text>
                <Text style={styles.panVal}>{pan.status || 'Verified'}</Text>
              </View>

              <View style={styles.panRight}>
                <View style={styles.panChip}>
                  <View style={styles.panChipLine} />
                  <View style={styles.panChipLine} />
                </View>
                <View style={styles.panVerifiedStamp}>
                  <ShieldCheckIcon size={12} color="#10B981" />
                  <Text style={styles.panVerifiedStampText}>{pan.category || 'PAN'}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <PanCardIcon size={30} color="#5A6578" />
            <Text style={styles.emptyCardText}>No PAN details linked to this vault.</Text>
            <TouchableOpacity
              style={[styles.emptyCardBtn, !hasAadhaar && styles.emptyCardBtnDisabled]}
              disabled={!hasAadhaar}
              onPress={() => navigation.navigate('PanVerification')}
            >
              <Text style={[styles.emptyCardBtnText, !hasAadhaar && { color: '#5A6578' }]}>
                {hasAadhaar ? 'LINK PAN CARD' : 'LINK AADHAAR FIRST'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LAND REGISTRATION DEED */}
        <Text style={styles.sectionHeader}>REGISTERED LAND DEEDS</Text>
        {hasLand ? (
          <View style={styles.landCard}>
            <View style={styles.landCardHeader}>
              <LandIcon size={22} color="#DFB05B" />
              <View style={styles.landCardTitles}>
                <Text style={styles.landRegNo}>{verifications.land.registrationNumber}</Text>
                <Text style={styles.landRegState}>
                  {verifications.land.subRegistrarOffice}, {verifications.land.district},{' '}
                  {verifications.land.state}
                </Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            </View>

            <View style={styles.landCardDivider} />

            <View style={styles.landCardGrid}>
              <View style={styles.landGridItem}>
                <Text style={styles.landGridLabel}>DEED OWNER</Text>
                <Text style={styles.landGridVal}>{verifications.land.ownerName}</Text>
              </View>
              <View style={styles.landGridItem}>
                <Text style={styles.landGridLabel}>PLOT SIZE</Text>
                <Text style={styles.landGridVal}>{verifications.land.area}</Text>
              </View>
              <View style={styles.landGridItem}>
                <Text style={styles.landGridLabel}>SURVEY NO</Text>
                <Text style={styles.landGridVal}>{verifications.land.surveyNo}</Text>
              </View>
              <View style={styles.landGridItem}>
                <Text style={styles.landGridLabel}>VALUATION</Text>
                <Text style={[styles.landGridVal, { color: '#DFB05B' }]}>
                  {verifications.land.estimatedValuation}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewMapButton}
              onPress={() => navigation.navigate('LandRegistration')}
            >
              <Text style={styles.viewMapButtonText}>VIEW SCHEMATIC BOUNDARIES</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <LandIcon size={30} color="#5A6578" />
            <Text style={styles.emptyCardText}>No registered properties found.</Text>
            <Text style={styles.emptyCardSubText}>
              Unlock land records by completing steps on Dashboard.
            </Text>
          </View>
        )}

        {/* Secure Vault Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogoutIcon size={19} color="#EF4444" />
          <Text style={styles.logoutBtnText}>LOGOUT</Text>
        </TouchableOpacity>

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
  loadingCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#050608',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(223, 176, 91, 0.18)',
  },
  backBtn: {
    padding: 8,
    marginRight: 14,
    backgroundColor: '#161822',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#222634',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 30,
  },
  userOverviewCard: {
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
  userInitialCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#261F0F',
    borderWidth: 1.2,
    borderColor: '#DFB05B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  userInitialText: {
    color: '#DFB05B',
    fontSize: 22,
    fontWeight: '700',
  },
  userOverviewText: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 13,
    color: '#717D96',
    marginTop: 2,
  },
  userJoined: {
    color: '#5A6578',
    marginTop: 4,
    fontSize: 10.5,
  },
  sectionHeader: {
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#5A6578',
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: '#12141B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222634',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyCardText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  emptyCardSubText: {
    fontSize: 11,
    color: '#5A6578',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyCardBtn: {
    marginTop: 14,
    backgroundColor: 'rgba(223, 176, 91, 0.12)',
    borderColor: '#DFB05B',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emptyCardBtnDisabled: {
    borderColor: '#222634',
    backgroundColor: 'transparent',
  },
  emptyCardBtnText: {
    color: '#DFB05B',
    fontWeight: '600',
    fontSize: 11,
  },
  /* Aadhaar Card */
  aadhaarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 20,
  },
  aadhaarCardTop: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#FF9933',
    paddingBottom: 8,
    marginBottom: 10,
  },
  aadhaarFlagStrip: {
    height: 3,
    backgroundColor: '#339900',
    marginBottom: 4,
    borderRadius: 2,
  },
  aadhaarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aadhaarTitleEn: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 10,
  },
  aadhaarTitleHi: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 10,
  },
  aadhaarCardBody: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  aadhaarPhotoContainer: {
    width: 76,
    height: 94,
    borderWidth: 1,
    borderColor: '#94A3B8',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  aadhaarPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  aadhaarPhotoVerifyBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aadhaarPhotoVerifyBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  avatarHead: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#94A3B8',
    marginTop: 18,
  },
  avatarBody: {
    width: 50,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#94A3B8',
    marginTop: 6,
  },
  aadhaarDetails: {
    flex: 1,
    paddingLeft: 14,
  },
  aadhaarLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },
  aadhaarVal: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0F172A',
  },
  aadhaarCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  aadhaarNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 2,
  },
  verifiedStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  verifiedStampText: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: '700',
    marginLeft: 4,
  },
  /* PAN Card */
  panCard: {
    backgroundColor: '#0F2C3F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E3E56',
    padding: 16,
    marginBottom: 20,
  },
  panHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#2B577A',
    paddingBottom: 6,
    marginBottom: 10,
  },
  panHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
  },
  panHeaderTitleEn: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DFB05B',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  panSubHeader: {
    fontSize: 8,
    fontWeight: '500',
    color: '#A5C4DB',
    textAlign: 'center',
    marginTop: 1,
  },
  panBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panLeft: {
    flex: 1,
  },
  panLabel: {
    fontSize: 8,
    color: '#A5C4DB',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  panNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginVertical: 2,
  },
  panVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F5D38F',
  },
  panRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: 60,
  },
  panChip: {
    width: 32,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#D4AF37',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  panChipLine: {
    width: '100%',
    height: 1.5,
    backgroundColor: '#8C6C0A',
    marginVertical: 2,
  },
  panVerifiedStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 15,
  },
  panVerifiedStampText: {
    fontSize: 8,
    color: '#10B981',
    fontWeight: '700',
    marginLeft: 3,
  },
  /* Land Card */
  landCard: {
    backgroundColor: '#12141B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    padding: 16,
    marginBottom: 20,
  },
  landCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  landCardTitles: {
    flex: 1,
    marginLeft: 10,
  },
  landRegNo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  landRegState: {
    fontSize: 11,
    color: '#717D96',
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  activeBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  landCardDivider: {
    height: 1,
    backgroundColor: '#222634',
    marginVertical: 14,
  },
  landCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  landGridItem: {
    width: '48%',
    marginBottom: 12,
  },
  landGridLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#5A6578',
    letterSpacing: 0.5,
  },
  landGridVal: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 2,
  },
  viewMapButton: {
    backgroundColor: 'rgba(223, 176, 91, 0.12)',
    borderWidth: 1,
    borderColor: '#DFB05B',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  viewMapButtonText: {
    color: '#DFB05B',
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12141B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    height: 50,
    marginTop: 10,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
