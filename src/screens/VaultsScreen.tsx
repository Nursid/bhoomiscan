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
import Svg, { Circle, Rect, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData } from '../services/firebase';
import ScreenLoadingState from '../components/ScreenLoadingState';
import HeaderDarkGold from '../components/HeaderDarkGold';
import { getCachedProfile, setCachedProfile } from '../services/profileCache';
import {
  CubeIcon,
  ShieldCheckIcon,
  PlusIcon,
} from '../components/icons';
import TopographyBackground from '../components/TopographyBackground';

export interface VaultsScreenProps {
  navigation: any;
}

// Vault Emblem Graphic
function VaultSafeGraphic() {
  return (
    <Svg width="86" height="86" viewBox="0 0 100 100" fill="none">
      <Rect x="5" y="5" width="90" height="90" rx="14" stroke="#DFB05B" strokeWidth="2.5" fill="#12141B" />
      <Circle cx="50" cy="50" r="26" stroke="#F5D38F" strokeWidth="2" fill="none" />
      <Circle cx="50" cy="50" r="16" stroke="#DFB05B" strokeWidth="1.5" fill="none" />
      <Line x1="50" y1="28" x2="50" y2="72" stroke="#F5D38F" strokeWidth="2" />
      <Line x1="28" y1="50" x2="72" y2="50" stroke="#F5D38F" strokeWidth="2" />
      <SvgText x="50" y="38" fill="#DFB05B" fontSize="10" fontWeight="700" textAnchor="middle">DP</SvgText>
      <Circle cx="50" cy="50" r="4" fill="#FFFFFF" />
    </Svg>
  );
}

// Hexagon Badge with Letter
function HexagonLetterBadge({ letter = 'A' }: { letter?: string }) {
  return (
    <View style={styles.hexWrapper}>
      <Svg width="54" height="54" viewBox="0 0 60 60" fill="none">
        <Polygon
          points="30,3 54,16 54,44 30,57 6,44 6,16"
          stroke="#DFB05B"
          strokeWidth="1.8"
          fill="#161822"
        />
        <SvgText x="30" y="37" fill="#DFB05B" fontSize="20" fontWeight="600" textAnchor="middle">
          {letter}
        </SvgText>
      </Svg>
    </View>
  );
}

// 100% Circular Progress Arc
function Circular100Arc() {
  return (
    <View style={styles.arcWrapper}>
      <Svg width="54" height="54" viewBox="0 0 60 60">
        <Circle cx="30" cy="30" r="24" stroke="#222634" strokeWidth="3.5" fill="none" />
        <Circle
          cx="30"
          cy="30"
          r="24"
          stroke="#DFB05B"
          strokeWidth="3.5"
          strokeDasharray={150}
          strokeDashoffset={0}
          strokeLinecap="round"
          fill="none"
          transform="rotate(-90 30 30)"
        />
      </Svg>
      <View style={styles.arcTextContainer}>
        <Text style={styles.arcPercentText}>100%</Text>
      </View>
    </View>
  );
}

export default function VaultsScreen({ navigation }: VaultsScreenProps) {
  const isFocused = useIsFocused();
  const [activeFilter, setActiveFilter] = useState<'All' | 'Verified' | 'Verifying'>('All');
  const [profile, setProfile] = useState<any>(() => getCachedProfile());
  const [loadingProfile, setLoadingProfile] = useState<boolean>(() => !getCachedProfile());
  const hasAadhaar = !!profile?.verifications?.aadhaar;
  const hasPan = !!profile?.verifications?.pan;
  const isPaid = !!profile?.verifications?.payment;
  const canAccessLand = hasAadhaar && hasPan && isPaid;
  const landRecord = profile?.verifications?.land;
  const hasLandRecord = !!landRecord;
  const landNumber = landRecord?.surveyNo || landRecord?.khewatNo || landRecord?.registrationNumber || 'Official record';
  const landTitle = `${landRecord?.village || landRecord?.district || 'Land record'} • ${landNumber}`;

  const handleCreateVault = () => {
    if (!hasAadhaar) {
      navigation.navigate('AadhaarVerification');
    } else if (!hasPan) {
      navigation.navigate('PanVerification');
    } else if (!isPaid) {
      navigation.navigate('RazorpayPayment');
    } else {
      navigation.navigate('LandRegistration');
    }
  };

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
      console.log('Error loading profile on Vaults:', error.message);
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
    if (!displayName) return '';
    const parts = displayName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

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
            title="Loading vaults"
            subtitle="Opening encrypted vault security layers and verified asset inventory."
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
      <TopographyBackground opacity={0.3} />

      {/* Top Header Bar */}
      <HeaderDarkGold
        navigation={navigation}
        onAvatarPress={() => navigation.navigate('Profile')}
        userInitials={getUserInitials()}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* My Vaults Greeting Banner */}
        <View style={styles.bannerRow}>
          <View style={styles.bannerTextCol}>
            <Text style={styles.screenHeading}>My Vaults</Text>
            <Text style={styles.screenSubHeading}>
              Secure your digital assets with Destiny Protocol
            </Text>
          </View>
          <VaultSafeGraphic />
        </View>

        {/* 2 Stat Cards Row */}
        <View style={styles.statsRow}>
          {/* Card 1 */}
          <View style={[styles.statCard, { width: '48%' }]}>
            <View style={styles.statIconBadge}>
              <CubeIcon size={16} color="#DFB05B" />
            </View>
            <Text style={styles.statLabel}>Total Vaults</Text>
            <Text style={styles.statValue}>{hasLandRecord ? '1' : '0'}</Text>
            <Text style={[styles.statBadgeText, { color: hasLandRecord ? '#10B981' : '#717D96' }]}>
              {hasLandRecord ? 'Official Record' : 'Locked'}
            </Text>
          </View>

          {/* Card 2 */}
          <View style={[styles.statCard, { width: '48%' }]}>
            <View style={styles.statIconBadge}>
              <ShieldCheckIcon size={16} color="#DFB05B" />
            </View>
            <Text style={styles.statLabel}>Vault Security</Text>
            <Text style={styles.statValue}>{hasLandRecord ? 'Active' : 'Pending'}</Text>
            <Text style={[styles.statBadgeText, { color: hasLandRecord ? '#10B981' : '#717D96' }]}>
              {hasLandRecord ? 'Deed Sync Active' : 'Awaiting Records'}
            </Text>
          </View>
        </View>

        {/* Filter Tabs + Create Vault Row */}
        <View style={styles.actionFilterRow}>
          {/* Filter Pills */}
          <View style={styles.filterPillContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveFilter('All')}
              style={[styles.filterPill, activeFilter === 'All' && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, activeFilter === 'All' && styles.filterTextActive]}>
                All Vaults
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveFilter('Verified')}
              style={[styles.filterPill, activeFilter === 'Verified' && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, activeFilter === 'Verified' && styles.filterTextActive]}>
                Verified
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveFilter('Verifying')}
              style={[styles.filterPill, activeFilter === 'Verifying' && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, activeFilter === 'Verifying' && styles.filterTextActive]}>
                Verifying
              </Text>
            </TouchableOpacity>
          </View>

          {/* Create Vault Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.createVaultBtn}
            onPress={handleCreateVault}
          >
            <PlusIcon size={14} color="#DFB05B" />
            <Text style={styles.createVaultText}>Create Vault</Text>
          </TouchableOpacity>
        </View>

        {hasLandRecord ? (
          <>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('LandRegistration')}
              style={styles.vaultItemCard}
            >
              <HexagonLetterBadge letter="A" />

              <View style={styles.vaultItemInfo}>
                <Text style={styles.vaultItemTitle} numberOfLines={2}>{landTitle}</Text>
                <View style={styles.tagRow}>
                  <View style={styles.greenTag}>
                    <Text style={styles.greenTagText}>Verified</Text>
                  </View>
                  <Text style={styles.tagSubText} numberOfLines={2}>
                    {landRecord.source || `${landRecord.state || 'Official'} land record`}
                  </Text>
                </View>
                <Text style={styles.vaultSubDetail} numberOfLines={1}>
                  # {landNumber} • {landRecord.district || landRecord.state || 'Official'}
                </Text>
              </View>

              <View style={styles.arcLane}>
                <Circular100Arc />
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyVaultCard}>
            <Text style={styles.emptyVaultTitle}>No Active Vaults Found</Text>
            <Text style={styles.emptyVaultDesc}>
              Complete Aadhaar, PAN, and payment verification to register land deeds into Destiny Protocol encrypted storage.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.createVaultBtnLarge}
              onPress={handleCreateVault}
            >
              <PlusIcon size={16} color="#DFB05B" />
              <Text style={styles.createVaultTextLarge}>
                {!hasAadhaar ? 'Start Aadhaar KYC' : !hasPan ? 'Verify PAN Card' : !isPaid ? 'Pay Registry Fee' : 'Register Property'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
    paddingTop: 16,
    paddingBottom: 24,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  bannerTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  screenHeading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  screenSubHeading: {
    fontSize: 13,
    color: '#A0AEC0',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#12141B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.2)',
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1C1F2B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#717D96',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  filterPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#12141B',
    borderRadius: 20,
    padding: 4,
    flexShrink: 1,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterPillActive: {
    backgroundColor: '#DFB05B',
  },
  filterText: {
    fontSize: 12,
    color: '#717D96',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#050608',
    fontWeight: '700',
  },
  createVaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1F2B',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.3)',
    flexShrink: 0,
  },
  createVaultText: {
    color: '#DFB05B',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  vaultItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12141B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.25)',
  },
  hexWrapper: {
    marginRight: 14,
  },
  vaultItemInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  vaultItemTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  greenTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  greenTagText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  tagSubText: {
    flex: 1,
    minWidth: 0,
    color: '#717D96',
    fontSize: 11,
    lineHeight: 15,
  },
  vaultSubDetail: {
    color: '#A0AEC0',
    fontSize: 12,
  },
  arcLane: {
    width: 58,
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  arcWrapper: {
    width: 54,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arcTextContainer: {
    position: 'absolute',
  },
  arcPercentText: {
    color: '#DFB05B',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyVaultCard: {
    backgroundColor: '#12141B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.2)',
  },
  emptyVaultTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyVaultDesc: {
    color: '#717D96',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  createVaultBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1F2B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFB05B',
  },
  createVaultTextLarge: {
    color: '#DFB05B',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  scanWidget: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#12141B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.2)',
  },
  scanWidgetLeft: {
    flex: 1,
    paddingRight: 10,
  },
  scanWidgetTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  scanWidgetSub: {
    color: '#717D96',
    fontSize: 11,
  },
  runScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1F2B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.3)',
  },
  runScanText: {
    color: '#DFB05B',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
});
