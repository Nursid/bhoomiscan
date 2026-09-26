import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  AppState,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { getUserData } from '../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DashboardHeader from '../components/DashboardHeader';
import WelcomeGreetingCard from '../components/WelcomeGreetingCard';
import OverviewStatCards from '../components/OverviewStatCards';
import YourAssetsSection from '../components/YourAssetsSection';
import RecentActivityList from '../components/RecentActivityList';
import QuickActionsGrid from '../components/QuickActionsGrid';
import CustomAlertModal from '../components/CustomAlertModal';
import TopographyBackground from '../components/TopographyBackground';
import ScreenLoadingState from '../components/ScreenLoadingState';
import { getCachedProfile, setCachedProfile } from '../services/profileCache';
import { getProtectionScore } from '../services/dashboardMetrics';
import { LAND_MANUAL_REVIEW_MESSAGE, sanitizeLandLookupMessage } from '../services/landApi';
import { FONTS } from '../theme';

export interface DashboardScreenProps {
  navigation: any;
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const isFocused = useIsFocused();
  const [profile, setProfile] = useState<any>(() => getCachedProfile());
  const [loadingProfile, setLoadingProfile] = useState<boolean>(() => !getCachedProfile());
  const [landCompletePopup, setLandCompletePopup] = useState(false);
  const [landPopupKey, setLandPopupKey] = useState('');
  const [beneficiaryCount, setBeneficiaryCount] = useState(0);

  const hasAadhaar = !!profile?.verifications?.aadhaar;
  const hasPan = !!profile?.verifications?.pan;
  const isPaid = !!profile?.verifications?.payment;
  const canAccessLand = hasAadhaar && hasPan && isPaid;
  const landRecord = profile?.verifications?.land;
  const landStatus = profile?.verifications?.landStatus;
  const landFailureMessage = sanitizeLandLookupMessage(landStatus?.errorMessage || landStatus?.message) || LAND_MANUAL_REVIEW_MESSAGE;
  const openLandManualUpload = () => navigation.navigate('LandRegistration', {
    mode: 'manual',
    notice: LAND_MANUAL_REVIEW_MESSAGE,
  });
  const openLandRegistration = () => {
    if (!landRecord && landStatus?.status === 'FAILED') {
      openLandManualUpload();
      return;
    }
    navigation.navigate('LandRegistration');
  };
  const landIdentifier = landRecord?.surveyNo || landRecord?.khewatNo || landRecord?.registrationNumber || 'Official record';
  const landLocation = [landRecord?.village, landRecord?.district, landRecord?.state].filter(Boolean).join(', ');

  const handleRegisterProperty = () => {
    if (!hasAadhaar) {
      navigation.navigate('AadhaarVerification');
      return;
    }

    if (!hasPan) {
      navigation.navigate('PanVerification');
      return;
    }

    if (!isPaid) {
      navigation.navigate('RazorpayPayment');
      return;
    }

    if (canAccessLand) openLandRegistration();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const loadBeneficiaryCount = useCallback(async (uid?: string) => {
    try {
      let activeUid = uid;
      if (!activeUid) {
        const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
        const activeUser = activeUserStr ? JSON.parse(activeUserStr) : null;
        activeUid = activeUser?.uid;
      }
      if (!activeUid) {
        setBeneficiaryCount(0);
        return;
      }
      const storageKey = `@trustledge_beneficiaries_${activeUid}`;
      const saved = await AsyncStorage.getItem(storageKey);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        setBeneficiaryCount(Array.isArray(parsed) ? parsed.length : 0);
      } else {
        setBeneficiaryCount(0);
      }
    } catch {
      setBeneficiaryCount(0);
    }
  }, []);

  const fetchProfileData = useCallback(async (silent = false) => {
    try {
      const cached = getCachedProfile();
      if (cached && !silent) {
        setProfile(cached);
        setLoadingProfile(false);
      } else if (!silent) {
        setLoadingProfile(!cached);
      }
      const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
      if (activeUserStr) {
        const activeUser = JSON.parse(activeUserStr);
        const uid = activeUser?.uid;
        if (uid) {
          // Load local count first for instant UI response
          await loadBeneficiaryCount(uid);

          const freshProfile = await getUserData(uid);
          if (freshProfile) {
            setProfile(freshProfile);
            setCachedProfile(freshProfile);
            const dbList = freshProfile.verifications?.beneficiaries?.list ||
              (Array.isArray(freshProfile.verifications?.beneficiaries) ? freshProfile.verifications.beneficiaries : null);
            const storageKey = `@trustledge_beneficiaries_${uid}`;
            if (Array.isArray(dbList)) {
              setBeneficiaryCount(dbList.length);
              await AsyncStorage.setItem(storageKey, JSON.stringify(dbList));
            } else {
              setBeneficiaryCount(0);
              await AsyncStorage.setItem(storageKey, JSON.stringify([]));
            }
          }
        }
      }
    } catch (error: any) {
      console.log('Error loading profile on Dashboard:', error.message);
    } finally {
      setLoadingProfile(false);
    }
  }, [loadBeneficiaryCount]);

  useEffect(() => {
    if (isFocused) {
      fetchProfileData();
    }
  }, [fetchProfileData, isFocused]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        fetchProfileData(true);
      }
    });
    return () => subscription.remove();
  }, [fetchProfileData]);

  useEffect(() => {
    if (!isFocused || landRecord || landStatus?.status !== 'PROCESSING') return undefined;

    const interval = setInterval(() => {
      fetchProfileData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchProfileData, isFocused, landRecord, landStatus?.status]);

  useEffect(() => {
    const checkLandCompletionPopup = async () => {
      if (!isFocused || loadingProfile || !landRecord) return;

      const recordKey = [
        profile?.uid || profile?.email || 'active-user',
        landRecord.registrationNumber || landRecord.surveyNo || landRecord.khewatNo || 'land',
        landRecord.timestamp || landStatus?.completedAt || '',
      ].join(':');
      const storageKey = `@trustledge_land_popup_seen:${recordKey}`;
      const hasSeen = await AsyncStorage.getItem(storageKey);

      if (!hasSeen) {
        setLandPopupKey(storageKey);
        setLandCompletePopup(true);
      }
    };

    checkLandCompletionPopup();
  }, [isFocused, landRecord, landStatus?.completedAt, loadingProfile, profile?.email, profile?.uid]);

  const closeLandCompletePopup = async () => {
    if (landPopupKey) {
      await AsyncStorage.setItem(landPopupKey, 'true');
    }
    setLandCompletePopup(false);
  };

  const getUserInitials = () => {
    if (loadingProfile) return '';
    const rawName = profile?.fullName || profile?.email || '';
    if (rawName && /socialmedia/i.test(rawName)) return 'GV';
    const name = rawName || 'Gourav';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#050608" />
        <DashboardHeader
          userInitials={getUserInitials()}
          navigation={navigation}
          onProfilePress={() => navigation.navigate('Profile')}
        />
        <View style={{ flex: 1 }}>
          <ScreenLoadingState
            concept="compassOrb"
            title="Loading dashboard"
            subtitle="Synchronizing verified profile and asset tapestry."
            initialPercentage={45}
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
      <TopographyBackground opacity={0.25} />
      <CustomAlertModal
        visible={landCompletePopup}
        type="success"
        title="Land Verification Complete"
        message={`${landIdentifier}${landRecord?.ownerName ? ` is verified under ${landRecord.ownerName}` : ' is verified'}${landLocation ? ` at ${landLocation}` : ''}.`}
        buttonText="View Dashboard"
        onClose={closeLandCompletePopup}
      />

      {/* Top Bar Custom Header Component */}
      <DashboardHeader
        userInitials={getUserInitials()}
        navigation={navigation}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Greeting Card Component */}
        <WelcomeGreetingCard
          userName={profile?.fullName || profile?.email || 'Gourav'}
          greeting={getGreeting()}
          kycPercentage={getProtectionScore(profile)}
          hasAadhaar={hasAadhaar}
          hasPan={hasPan}
          isPaid={isPaid}
          hasLand={!!landRecord}
          onActionPress={(action) => {
            if (action === 'kyc') {
              if (!hasAadhaar) navigation.navigate('AadhaarVerification');
              else if (!hasPan) navigation.navigate('PanVerification');
              else if (!isPaid) navigation.navigate('RazorpayPayment');
            } else {
              handleRegisterProperty();
            }
          }}
        />

        {/* Verification & Razorpay Payment Status Banner */}
        {!hasAadhaar ? (
          <TouchableOpacity
            style={styles.paymentBanner}
            onPress={() => navigation.navigate('AadhaarVerification')}
            activeOpacity={0.9}
          >
            <View style={styles.bannerHeader}>
              <View style={styles.badgePending}>
                <Text style={styles.badgeTextPending}>AADHAAR PENDING</Text>
              </View>
              <Text style={styles.bannerAmount}>KYC</Text>
            </View>
            <Text style={styles.bannerTitle}>Verify Aadhaar</Text>
            <Text style={styles.bannerDesc}>
              Complete DigiLocker Aadhaar verification before linking PAN and property records.
            </Text>
            <View style={styles.bannerActionBtn}>
              <Text style={styles.bannerActionText}>Verify</Text>
            </View>
          </TouchableOpacity>
        ) : !hasPan ? (
          <TouchableOpacity
            style={styles.paymentBanner}
            onPress={() => navigation.navigate('PanVerification')}
            activeOpacity={0.9}
          >
            <View style={styles.bannerHeader}>
              <View style={styles.badgePending}>
                <Text style={styles.badgeTextPending}>PAN PENDING</Text>
              </View>
              <Text style={styles.bannerAmount}>KYC</Text>
            </View>
            <Text style={styles.bannerTitle}>Verify PAN</Text>
            <Text style={styles.bannerDesc}>
              Aadhaar is verified. Link and verify your PAN with Decentro before activating land deed lookup.
            </Text>
            <View style={styles.bannerActionBtn}>
              <Text style={styles.bannerActionText}>Verify</Text>
            </View>
          </TouchableOpacity>
        ) : !isPaid ? (
          <TouchableOpacity
            style={styles.paymentBanner}
            onPress={() => navigation.navigate('RazorpayPayment')}
            activeOpacity={0.9}
          >
            <View style={styles.bannerHeader}>
              <View style={styles.badgePending}>
                <Text style={styles.badgeTextPending}>PAYMENT PENDING</Text>
              </View>
              <Text style={styles.bannerAmount}>₹591.00</Text>
            </View>
            <Text style={styles.bannerTitle}>Unlock Land Deed Registry</Text>
            <Text style={styles.bannerDesc}>
              Aadhaar & PAN are verified. Complete the ₹591.00 Registry Fee (Base ₹521 + Tax ₹70) via Razorpay to link property deeds and activate Monthly Health Mail.
            </Text>
            <View style={styles.bannerActionBtn}>
              <Text style={styles.bannerActionText}>Pay ₹591.00</Text>
            </View>
          </TouchableOpacity>
        ) : !landRecord && landStatus?.status === 'AWAITING_PROPERTY_DETAILS' ? (
          <TouchableOpacity
            style={[styles.paymentBanner, { borderColor: 'rgba(223, 176, 91, 0.5)' }]}
            onPress={() => navigation.navigate('LandRegistration', { mode: 'manual' })}
            activeOpacity={0.9}
          >
            <View style={styles.bannerHeader}>
              <View style={[styles.badgeActive, { backgroundColor: 'rgba(223, 176, 91, 0.15)', borderColor: '#DFB05B' }]}>
                <Text style={[styles.badgeTextActive, { color: '#DFB05B' }]}>DETAILS NEEDED</Text>
              </View>
              <Text style={[styles.bannerAmount, { color: '#DFB05B' }]}>STEP 4</Text>
            </View>
            <Text style={styles.bannerTitle}>Start Property Lookup</Text>
            <Text style={styles.bannerDesc}>
              Payment is confirmed. Enter district, village, and Khasra/Khata/registration details or upload your land document to find and structure your property report.
            </Text>
            <View style={[styles.bannerActionBtn, { backgroundColor: '#DFB05B' }]}>
              <Text style={[styles.bannerActionText, { color: '#0F172A' }]}>Manual Fetch</Text>
            </View>
          </TouchableOpacity>
        ) : !landRecord && landStatus?.status === 'PROCESSING' ? (
          <TouchableOpacity
            style={[styles.paymentBanner, { borderColor: 'rgba(223, 176, 91, 0.5)' }]}
            onPress={() => navigation.navigate('LandRegistration')}
            activeOpacity={0.9}
          >
            <View style={styles.bannerHeader}>
              <View style={[styles.badgeActive, { backgroundColor: 'rgba(223, 176, 91, 0.15)', borderColor: '#DFB05B' }]}>
                <Text style={[styles.badgeTextActive, { color: '#DFB05B' }]}>PENDING VERIFY</Text>
              </View>
              <Text style={[styles.bannerAmount, { color: '#DFB05B' }]}>LIVE</Text>
            </View>
            <Text style={styles.bannerTitle}>Land Verification In Progress</Text>
            <Text style={styles.bannerDesc}>
              We are checking official records for {landStatus.village || 'your property'}. Keep using the app; this dashboard will refresh automatically and show a completion popup when the record is found.
            </Text>
            <View style={[styles.bannerActionBtn, styles.processingActionBtn]}>
              <ActivityIndicator size="small" color="#DFB05B" />
              <Text style={[styles.bannerActionText, { color: '#E2E8F0' }]}>Checking Records</Text>
            </View>
          </TouchableOpacity>
        ) : !landRecord && landStatus?.status === 'PENDING_CONNECTOR' ? (
          <TouchableOpacity
            style={[styles.paymentBanner, { borderColor: 'rgba(223, 176, 91, 0.5)' }]}
            onPress={() => navigation.navigate('LandRegistration', { mode: 'manual' })}
            activeOpacity={0.9}
          >
            <View style={styles.bannerHeader}>
              <View style={[styles.badgeActive, { backgroundColor: 'rgba(223, 176, 91, 0.15)', borderColor: '#DFB05B' }]}>
                <Text style={[styles.badgeTextActive, { color: '#DFB05B' }]}>CONNECTOR QUEUED</Text>
              </View>
              <Text style={[styles.bannerAmount, { color: '#DFB05B' }]}>SAVED</Text>
            </View>
            <Text style={styles.bannerTitle}>Land Details Saved</Text>
            <Text style={styles.bannerDesc}>
              {landStatus.message || `Record details for ${landStatus.state || 'this state'} are saved for review.`}
            </Text>
            <View style={[styles.bannerActionBtn, { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' }]}>
              <Text style={[styles.bannerActionText, { color: '#E2E8F0' }]}>View</Text>
            </View>
          </TouchableOpacity>
        ) : !landRecord && landStatus?.status === 'FAILED' ? (
          <TouchableOpacity
            style={[styles.paymentBanner, { borderColor: 'rgba(16, 185, 129, 0.4)' }]}
            onPress={openLandManualUpload}
            activeOpacity={0.9}
          >
            <View style={styles.bannerHeader}>
              <View style={[styles.badgeActive, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' }]}>
                <Text style={[styles.badgeTextActive, { color: '#10B981' }]}>FAILED</Text>
              </View>
              <Text style={[styles.bannerAmount, { color: '#10B981' }]}>CHECK</Text>
            </View>
            <Text style={styles.bannerTitle}>Property Not Registered</Text>
            <Text style={styles.bannerDesc}>
              {landFailureMessage || LAND_MANUAL_REVIEW_MESSAGE}
            </Text>
            <View style={[styles.bannerActionBtn, { backgroundColor: '#10B981' }]}>
              <Text style={[styles.bannerActionText, { color: '#0F172A' }]}>Manual Fetch</Text>
            </View>
          </TouchableOpacity>
        ) : !landRecord ? (
          <View style={{ marginHorizontal: 20, marginVertical: 8 }}>
            {/* Separate Payment Status Confirmation */}
            <View style={styles.paymentSuccessPill}>
              <View style={styles.badgeActive}>
                <Text style={styles.badgeTextActive}>CONFIRMED</Text>
              </View>
              <Text style={styles.paymentSuccessDesc}>
                Razorpay payment captured successfully (₹591.00). Land deed registration unlocked.
              </Text>
            </View>

            {/* Distinct Land Registry Action Card */}
            <TouchableOpacity
              style={[styles.paymentBanner, { marginHorizontal: 0, marginTop: 10, borderColor: 'rgba(223, 176, 91, 0.5)' }]}
              onPress={() => navigation.navigate('LandRegistration', { mode: 'online' })}
              activeOpacity={0.9}
            >
              <View style={styles.bannerHeader}>
                <View style={[styles.badgeActive, { backgroundColor: 'rgba(223, 176, 91, 0.15)', borderColor: '#DFB05B' }]}>
                  <Text style={[styles.badgeTextActive, { color: '#DFB05B' }]}>ACTION REQUIRED</Text>
                </View>
                <Text style={[styles.bannerAmount, { color: '#DFB05B' }]}>STEP 4</Text>
              </View>
              <Text style={styles.bannerTitle}>Link Your Land Registry</Text>
              <Text style={styles.bannerDesc}>
                Link your official land deed & survey number to activate digital ownership protection on Destiny Protocol.
              </Text>
              <View style={[styles.bannerActionBtn, { backgroundColor: '#DFB05B' }]}>
                <Text style={[styles.bannerActionText, { color: '#0F172A' }]}>Link Registry</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.paymentBanner, { borderColor: 'rgba(223, 176, 91, 0.4)' }]}
            onPress={openLandRegistration}
            activeOpacity={0.9}
          >
            <View style={styles.bannerHeader}>
              <View style={[styles.badgeActive, { backgroundColor: 'rgba(223, 176, 91, 0.15)', borderColor: '#DFB05B' }]}>
                <Text style={[styles.badgeTextActive, { color: '#DFB05B' }]}>ACTIVE SYNCED</Text>
              </View>
              <Text style={[styles.bannerAmount, { color: '#DFB05B' }]}>LINKED</Text>
            </View>
            <Text style={styles.bannerTitle}>Land Deed Connected</Text>
            <Text style={styles.bannerDesc}>
              <Text style={{ color: '#DFB05B', fontWeight: '700' }}>{landIdentifier}</Text>
              {landRecord.ownerName ? ` is verified under ${landRecord.ownerName}` : ' is verified'}
              {landLocation ? ` at ${landLocation}` : ''}.
            </Text>
            <View style={[styles.bannerActionBtn, { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' }]}>
              <Text style={[styles.bannerActionText, { color: '#E2E8F0' }]}>View Land</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Overview Stat Cards Component */}
        <OverviewStatCards
          profile={profile}
          beneficiaryCount={beneficiaryCount}
          onViewAllPress={() => navigation.navigate('Profile')}
        />

        {landRecord ? (
          <YourAssetsSection
            profile={profile}
            onAllPress={handleRegisterProperty}
            onAssetPress={handleRegisterProperty}
          />
        ) : null}

        {/* Recent Activity List Component */}
        <RecentActivityList
          profile={profile}
          onViewAllPress={() => navigation.navigate('Profile')}
        />

        {/* Quick Actions 2x2 Grid Component */}
        <QuickActionsGrid
          onRegisterProperty={handleRegisterProperty}
          onMyIdentity={() => navigation.navigate('AadhaarVerification')}
          onAddBeneficiary={() => navigation.navigate('People')}
          onActivityLog={() => navigation.navigate('Activity')}
          showRegisterProperty={canAccessLand}
        />

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
  scrollContent: {
    paddingBottom: 10,
  },
  paymentBanner: {
    backgroundColor: '#0A0C12',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.42)',
    borderTopColor: 'rgba(255, 238, 178, 0.75)',
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 12,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgePending: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeTextPending: {
    color: '#EF4444',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeTextActive: {
    color: '#10B981',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bannerAmount: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: FONTS.medium,
  },
  bannerDesc: {
    color: '#717D96',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
    fontFamily: FONTS.light,
  },
  bannerActionBtn: {
    height: 40,
    backgroundColor: '#DFB05B',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingActionBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    gap: 8,
  },
  bannerActionText: {
    color: '#1A1405',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: FONTS.medium,
  },
  paymentSuccessPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentSuccessBadge: {
    color: '#10B981',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  paymentSuccessDesc: {
    color: '#94A3B8',
    fontSize: 11,
    flex: 1,
    marginLeft: 10,
  },
});
