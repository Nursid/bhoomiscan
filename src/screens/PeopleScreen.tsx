import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData, saveBeneficiariesData } from '../services/firebase';
import { sendCustomEmailNotification } from '../services/landApi';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { pick, types as documentTypes } from '@react-native-documents/picker';
import ScreenLoadingState from '../components/ScreenLoadingState';
import { getCachedProfile, setCachedProfile } from '../services/profileCache';
import HeaderDarkGold from '../components/HeaderDarkGold';
import {
  UserGroupIcon,
  PlusIcon,
} from '../components/icons';

import TopographyBackground from '../components/TopographyBackground';
import { COLORS, FONTS } from '../theme';

export interface PeopleScreenProps {
  navigation: any;
}

export interface Beneficiary {
  id: string;
  fullName: string;
  relationship: 'Spouse' | 'Child' | 'Parent' | 'Trustee';
  phone?: string;
  walletAddress?: string;
  email?: string;
  idProofName?: string;
  idProofUrl?: string;
  createdAt?: string;
}

function CloseCrossIcon({ size = 18, color = '#94A3B8' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function HeartIcon({ size = 15, color = '#DFB05B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ size = 16, color = '#E2E8F0' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function PeopleScreen({ navigation }: PeopleScreenProps) {
  const isFocused = useIsFocused();
  const [profile, setProfile] = useState<any>(() => getCachedProfile());
  const [loadingProfile, setLoadingProfile] = useState<boolean>(() => !getCachedProfile());
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Form States for Modal
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState<'Spouse' | 'Child' | 'Parent' | 'Trustee'>('Spouse');
  const [phone, setPhone] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [email, setEmail] = useState('');
  const [idProof, setIdProof] = useState<any>(null);
  const [uploadingIdProof, setUploadingIdProof] = useState(false);
  const [savingBeneficiary, setSavingBeneficiary] = useState(false);
  const [userId, setUserId] = useState('');

  const getBeneficiariesKey = async (currentUid?: string) => {
    try {
      const targetUid = currentUid || userId;
      if (targetUid) {
        return `@trustledge_beneficiaries_${targetUid}`;
      }
      const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
      const activeUser = activeUserStr ? JSON.parse(activeUserStr) : null;
      return activeUser?.uid ? `@trustledge_beneficiaries_${activeUser.uid}` : '@trustledge_beneficiaries';
    } catch {
      return '@trustledge_beneficiaries';
    }
  };

  const fetchProfileData = async () => {
    try {
      const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
      if (!activeUserStr) {
        setBeneficiaries([]);
        setLoadingProfile(false);
        return;
      }

      const activeUser = JSON.parse(activeUserStr);
      const uid = activeUser?.uid;
      if (!uid) {
        setBeneficiaries([]);
        setLoadingProfile(false);
        return;
      }

      setUserId(uid);
      const userKey = `@trustledge_beneficiaries_${uid}`;

      // 1. Fast local cache load for this specific user
      const savedLocal = await AsyncStorage.getItem(userKey);
      if (savedLocal !== null) {
        try {
          setBeneficiaries(JSON.parse(savedLocal));
        } catch { }
      } else {
        setBeneficiaries([]);
      }

      const cached = getCachedProfile();
      if (cached && (cached.uid === uid || cached.email === activeUser.email)) {
        setProfile(cached);
        setLoadingProfile(false);
      }

      // 2. Load fresh profile from DB for this exact user UID
      const freshProfile = await getUserData(uid);
      if (freshProfile) {
        setProfile(freshProfile);
        setCachedProfile(freshProfile);
        const dbBeneficiaries = freshProfile.verifications?.beneficiaries?.list ||
          (Array.isArray(freshProfile.verifications?.beneficiaries) ? freshProfile.verifications.beneficiaries : null);

        if (dbBeneficiaries && Array.isArray(dbBeneficiaries)) {
          // User has beneficiaries in DB -> show them and update local cache
          setBeneficiaries(dbBeneficiaries);
          await AsyncStorage.setItem(userKey, JSON.stringify(dbBeneficiaries));
        } else {
          // User has NO beneficiaries in DB -> clear state and local cache for this user
          setBeneficiaries([]);
          await AsyncStorage.setItem(userKey, JSON.stringify([]));
        }
      }
    } catch (error: any) {
      console.log('Error loading profile on People:', error.message);
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

  const handlePickIdProof = async () => {
    try {
      const [file] = await pick({
        type: [documentTypes.pdf, documentTypes.images],
        allowMultiSelection: false,
      });
      if (file) {
        setIdProof(file);
      }
    } catch (err: any) {
      console.log('ID proof pick cancelled/error:', err);
    }
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
            title="Loading people"
            subtitle="Loading verified beneficiaries and contacts..."
            initialPercentage={0}
            navigation={navigation}
            userInitials={getUserInitials()}
            showHeader={false}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleSaveBeneficiary = async () => {
    if (!fullName.trim()) {
      Alert.alert('Missing Field', 'Please enter the beneficiary full name.');
      return;
    }

    if (savingBeneficiary || uploadingIdProof) return;

    try {
      setSavingBeneficiary(true);

      let idProofUrl = '';
      if (idProof?.uri) {
        try {
          setUploadingIdProof(true);
          idProofUrl = await uploadToCloudinary(
            idProof.uri,
            idProof.name || 'id-proof',
            idProof.type || 'application/pdf'
          );
        } catch (uploadErr: any) {
          console.warn('ID Proof Cloudinary upload notice:', uploadErr);
        } finally {
          setUploadingIdProof(false);
        }
      }

      const newBeneficiary: Beneficiary = {
        id: Date.now().toString(),
        fullName: fullName.trim(),
        relationship,
        phone: phone.trim(),
        walletAddress: walletAddress.trim(),
        email: email.trim(),
        idProofName: idProof?.name || '',
        idProofUrl: idProofUrl || idProof?.uri || '',
        createdAt: new Date().toISOString(),
      };

      const updated = [newBeneficiary, ...beneficiaries];
      setBeneficiaries(updated);

      // Save to Database (Firestore DB)
      if (userId) {
        try {
          await saveBeneficiariesData(userId, { list: updated });
        } catch (dbErr: any) {
          console.warn('Beneficiary DB save notice:', dbErr);
        }
      }

      // Save Local Cache for this user
      const key = userId ? `@trustledge_beneficiaries_${userId}` : await getBeneficiariesKey();
      await AsyncStorage.setItem(key, JSON.stringify(updated));

      // Reset Form & Close Modal IMMEDIATELY so UI responds right away!
      setFullName('');
      setRelationship('Spouse');
      setPhone('');
      setWalletAddress('');
      setEmail('');
      setIdProof(null);
      setModalVisible(false);

      // Trigger Email Notifications Asynchronously in Background (Non-blocking)
      (async () => {
        try {
          const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
          const activeUser = activeUserStr ? JSON.parse(activeUserStr) : null;
          const targetEmail = profile?.email || activeUser?.email || profile?.verifications?.aadhaar?.email || '';
          const mainUserName = profile?.verifications?.aadhaar?.name || profile?.fullName || 'Valued Member';

          if (targetEmail) {
            sendCustomEmailNotification({
              to: targetEmail,
              type: 'beneficiary_added',
              userName: mainUserName,
              beneficiaryName: newBeneficiary.fullName,
              relationship: newBeneficiary.relationship,
              contactNumber: newBeneficiary.phone,
              beneficiaryEmail: newBeneficiary.email,
              walletAddress: newBeneficiary.walletAddress,
              idProofName: newBeneficiary.idProofName,
            }).catch(emailErr => console.warn('Main user beneficiary email notice:', emailErr));
          }

          if (newBeneficiary.email && newBeneficiary.email.includes('@')) {
            sendCustomEmailNotification({
              to: newBeneficiary.email.trim(),
              type: 'beneficiary_added',
              userName: newBeneficiary.fullName,
              beneficiaryName: newBeneficiary.fullName,
              relationship: newBeneficiary.relationship,
              contactNumber: newBeneficiary.phone,
              beneficiaryEmail: newBeneficiary.email,
              walletAddress: newBeneficiary.walletAddress,
              idProofName: newBeneficiary.idProofName,
            }).catch(emailErr => console.warn('Direct beneficiary email notice:', emailErr));
          }
        } catch (bgEmailErr) {
          console.warn('Background email notification error:', bgEmailErr);
        }
      })();

    } catch (err: any) {
      console.warn('Error saving beneficiary:', err);
      Alert.alert('Error', 'An error occurred while saving beneficiary. Please try again.');
    } finally {
      setSavingBeneficiary(false);
    }
  };

  const handleDeleteBeneficiary = (id: string) => {
    Alert.alert('Remove Beneficiary', 'Are you sure you want to remove this beneficiary from your inheritance protocol?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = beneficiaries.filter(b => b.id !== id);
          setBeneficiaries(updated);
          if (userId) {
            try {
              await saveBeneficiariesData(userId, { list: updated });
            } catch (dbErr: any) {
              console.warn('Beneficiary DB delete notice:', dbErr);
            }
          }
          const key = await getBeneficiariesKey();
          await AsyncStorage.setItem(key, JSON.stringify(updated));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050608" />

      {/* Pitch Dark Top Header */}
      <HeaderDarkGold navigation={navigation} onAvatarPress={() => navigation.navigate('Profile')} />

      <TopographyBackground opacity={0.3} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Screen Title & Right Plus Button */}
        <View style={styles.titleRow}>
          <View style={styles.titleTextCol}>
            <View style={styles.headingBadgeRow}>
              <Text style={styles.screenHeading}>People</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{beneficiaries.length} Active</Text>
              </View>
            </View>
            <Text style={styles.screenSubHeading}>
              Beneficiaries who inherit your encrypted property capsules upon protocol triggers.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.plusCircleBtn}
            onPress={() => setModalVisible(true)}
          >
            <PlusIcon size={20} color="#DFB05B" />
          </TouchableOpacity>
        </View>

        {/* Empty State Card (When 0 Beneficiaries) */}
        {beneficiaries.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <View style={styles.innerIconGlow} />
              <UserGroupIcon size={34} color="#DFB05B" />
            </View>
            <Text style={styles.emptyTitle}>No beneficiaries yet</Text>
            <Text style={styles.emptyDesc}>
              Add someone who'll inherit your encrypted capsules when your inactivity policy triggers.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.addBtn}
              onPress={() => setModalVisible(true)}
            >
              <UserGroupIcon size={18} color="#050608" />
              <Text style={styles.addBtnText}>Add Beneficiary</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Beneficiaries List Cards */
          <View style={styles.listWrapper}>
            {beneficiaries.map((b) => (
              <View key={b.id} style={styles.beneficiaryCard}>
                <View style={styles.cardHeaderLine} />
                <View style={styles.beneficiaryIconCircle}>
                  <Text style={styles.avatarInitialText}>
                    {b.fullName.substring(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.beneficiaryInfo}>
                  <View style={styles.nameRelRow}>
                    <Text style={styles.beneficiaryName}>{b.fullName}</Text>
                    <View style={styles.relationshipPill}>
                      <Text style={styles.relationshipText}>{b.relationship.toUpperCase()}</Text>
                    </View>
                  </View>

                  {b.phone ? <Text style={styles.beneficiaryDetail}>📞 {b.phone}</Text> : null}
                  {b.email ? <Text style={styles.beneficiaryDetail}>✉️ {b.email}</Text> : null}
                  {b.walletAddress ? (
                    <Text style={styles.beneficiaryDetail}>
                      👛 {b.walletAddress.substring(0, 12)}...{b.walletAddress.slice(-6)}
                    </Text>
                  ) : null}
                  {b.idProofUrl ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(b.idProofUrl!)}
                      style={{ marginTop: 2 }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.beneficiaryDetail, { color: '#DFB05B', fontWeight: '700', textDecorationLine: 'underline' }]}>
                        🆔 ID Proof: {b.idProofName || 'View Document'}
                      </Text>
                    </TouchableOpacity>
                  ) : b.idProofName ? (
                    <Text style={styles.beneficiaryDetail}>🆔 ID Proof: {b.idProofName}</Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  activeOpacity={0.75}
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteBeneficiary(b.id)}
                >
                  <TrashIcon size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Beneficiary Modal */}
      <Modal transparent animationType="slide" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <View style={styles.modalDragHandle} />

                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Add Beneficiary</Text>
                    <Text style={styles.modalSubTitle}>Who should inherit your protected assets?</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setModalVisible(false)}
                    style={styles.closeBtn}
                  >
                    <CloseCrossIcon size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                  {/* Field 1: Full Name */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>FULL NAME *</Text>
                    <TextInput
                      style={styles.inputCard}
                      placeholder="e.g. Priya Sharma"
                      placeholderTextColor="#525866"
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>

                  {/* Relationship Selector */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.relLabel}>RELATIONSHIP</Text>
                    <View style={styles.relPillsRow}>
                      {(['Spouse', 'Child', 'Parent', 'Trustee'] as const).map((r) => {
                        const isActive = relationship === r;
                        return (
                          <TouchableOpacity
                            key={r}
                            activeOpacity={0.8}
                            onPress={() => setRelationship(r)}
                            style={[styles.relPill, isActive && styles.relPillActive]}
                          >
                            {r === 'Spouse' ? <HeartIcon size={14} color={isActive ? '#DFB05B' : '#686D7F'} /> : null}
                            <Text style={[styles.relText, isActive && styles.relTextActive]}>{r}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Field 2: Contact Number */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>CONTACT NUMBER</Text>
                    <TextInput
                      style={styles.inputCard}
                      placeholder="+91 9876543210"
                      placeholderTextColor="#525866"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>

                  {/* Field 3: Email */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>EMAIL ADDRESS (OPTIONAL)</Text>
                    <TextInput
                      style={styles.inputCard}
                      placeholder="them@example.com"
                      placeholderTextColor="#525866"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  {/* Field 4: Wallet Address */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>WALLET ADDRESS (OPTIONAL)</Text>
                    <TextInput
                      style={styles.inputCard}
                      placeholder="0x..."
                      placeholderTextColor="#525866"
                      value={walletAddress}
                      onChangeText={setWalletAddress}
                    />
                  </View>

                  {/* Field 5: ID Proof Upload */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>ID PROOF UPLOAD (PDF / IMAGE)</Text>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#1E2330',
                        borderWidth: 1,
                        borderColor: idProof ? '#DFB05B' : '#333A4A',
                        borderRadius: 10,
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onPress={handlePickIdProof}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: idProof ? '#DFB05B' : '#94A3B8', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                        {idProof ? `✓ ${idProof.name}` : 'Choose ID Proof File'}
                      </Text>
                      {idProof ? (
                        <TouchableOpacity onPress={() => setIdProof(null)}>
                          <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Remove</Text>
                        </TouchableOpacity>
                      ) : null}
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                {/* Submit Action Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.saveBtn, (uploadingIdProof || savingBeneficiary) && { opacity: 0.6 }]}
                  onPress={handleSaveBeneficiary}
                  disabled={uploadingIdProof || savingBeneficiary}
                >
                  {uploadingIdProof || savingBeneficiary ? (
                    <ActivityIndicator size="small" color="#050608" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Beneficiary</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    paddingBottom: 30,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 18,
  },
  titleTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  headingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  screenHeading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONTS.heading,
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: 'rgba(223, 176, 91, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.45)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 10,
  },
  countBadgeText: {
    color: '#DFB05B',
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: FONTS.medium,
  },
  screenSubHeading: {
    fontSize: 13,
    color: '#717D96',
    lineHeight: 18,
    fontFamily: FONTS.light,
  },
  plusCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0A0C12',
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyCard: {
    backgroundColor: '#090B10',
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.42)',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0F121A',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  innerIconGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(223, 176, 91, 0.15)',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: FONTS.heading,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#717D96',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
    paddingHorizontal: 12,
    fontFamily: FONTS.light,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DFB05B',
    borderRadius: 20,
    paddingHorizontal: 26,
    paddingVertical: 13,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  addBtnText: {
    color: '#050608',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
    fontFamily: FONTS.medium,
  },
  listWrapper: {
    marginTop: 10,
  },
  beneficiaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090B10',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.42)',
    padding: 16,
    marginBottom: 14,
    position: 'relative',
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  cardHeaderLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(223, 176, 91, 0.25)',
  },
  beneficiaryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#141722',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarInitialText: {
    color: '#DFB05B',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: FONTS.heading,
  },
  beneficiaryInfo: {
    flex: 1,
  },
  nameRelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  beneficiaryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONTS.medium,
    marginRight: 8,
  },
  relationshipPill: {
    backgroundColor: 'rgba(223, 176, 91, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.45)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  relationshipText: {
    color: '#DFB05B',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  beneficiaryDetail: {
    fontSize: 12,
    color: '#717D96',
    marginTop: 2,
    fontFamily: FONTS.light,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  /* Modal Styling */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#090B10',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.45)',
    padding: 22,
    paddingBottom: 34,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(223, 176, 91, 0.35)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONTS.heading,
  },
  modalSubTitle: {
    fontSize: 13,
    color: '#717D96',
    marginTop: 3,
    fontFamily: FONTS.light,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#12141B',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#717D96',
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 6,
    fontFamily: FONTS.medium,
  },
  inputCard: {
    backgroundColor: '#0F121A',
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.35)',
    borderRadius: 16,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14.5,
    fontFamily: FONTS.regular,
  },
  relLabel: {
    fontSize: 11,
    color: '#717D96',
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
    fontFamily: FONTS.medium,
  },
  relPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  relPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F121A',
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.25)',
    borderRadius: 18,
    paddingVertical: 9,
    marginHorizontal: 3,
  },
  relPillActive: {
    backgroundColor: '#1C160B',
    borderColor: '#DFB05B',
  },
  relText: {
    fontSize: 12,
    color: '#686D7F',
    fontWeight: '500',
    marginLeft: 3,
  },
  relTextActive: {
    color: '#DFB05B',
    fontWeight: '700',
  },
  saveBtn: {
    height: 52,
    borderRadius: 18,
    backgroundColor: '#DFB05B',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtnText: {
    color: '#050608',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONTS.medium,
  },
});
