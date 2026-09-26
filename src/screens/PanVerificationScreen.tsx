import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { savePanData, getUserData, checkPanUniqueness } from '../services/firebase';
import { verifyPan } from '../services/kycApi';
import { sendCustomEmailNotification } from '../services/landApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import {
  ChevronLeftIcon,
  PanCardIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from '../components/icons';

import TopographyBackground from '../components/TopographyBackground';

export interface PanVerificationScreenProps {
  navigation: any;
}


const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.message;

  if (typeof message === 'string' && message && message !== '[object Object]') {
    try {
      const parsed = JSON.parse(message);
      if (parsed?.responseCode === 'E00021') {
        return 'No PAN record was found for this PAN number. Please check the PAN and try again.';
      }
      return parsed?.message || parsed?.error || parsed?.details || message;
    } catch {}
    return message;
  }

  if (typeof error === 'string' && error) {
    return error;
  }

  try {
    const serialized = JSON.stringify(error);
    return serialized && serialized !== '{}' ? serialized : fallback;
  } catch {
    return fallback;
  }
};

export default function PanVerificationScreen({ navigation }: PanVerificationScreenProps) {
  const [panNumber, setPanNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const [userId, setUserId] = useState('');
  const [holderName, setHolderName] = useState('');
  const [aadhaarRef, setAadhaarRef] = useState('');
  const [panStatus, setPanStatus] = useState('');
  const [panCategory, setPanCategory] = useState('');
  const [panReferenceId, setPanReferenceId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);

  const isFocused = useIsFocused();

  useEffect(() => {
    const fetchAadhaarName = async () => {
      try {
        const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
        if (activeUserStr) {
          const user = JSON.parse(activeUserStr);
          setUserId(user.uid);
          setUserEmail(user.email || '');

          const details = await getUserData(user.uid);
          setUserEmail(details?.email || user.email || '');
          if (details?.verifications?.aadhaar?.name) {
            setHolderName(details.verifications.aadhaar.name);
            setAadhaarRef(details.verifications.aadhaar.aadhaarNo || '');
          } else {
            setHolderName('');
            setAadhaarRef('');
          }

          if (details?.verifications?.pan) {
            setIsAlreadyVerified(true);
            setPanNumber(details.verifications.pan.panNo || '');
            setHolderName(details.verifications.pan.holderName || '');
            setPanStatus(details.verifications.pan.status || '');
            setPanCategory(details.verifications.pan.category || '');
            setPanReferenceId(details.verifications.pan.referenceId || '');
            setSuccess(true);
          } else if (user.verifications?.pan) {
            setIsAlreadyVerified(true);
            setPanNumber(user.verifications.pan.panNo || '');
            setHolderName(user.verifications.pan.holderName || '');
            setPanStatus(user.verifications.pan.status || '');
            setPanCategory(user.verifications.pan.category || '');
            setPanReferenceId(user.verifications.pan.referenceId || '');
            setSuccess(true);
          } else {
            setIsAlreadyVerified(false);
            setPanNumber('');
            setSuccess(false);
          }
        }
      } catch (e: any) {
        console.warn('Failed pulling Aadhaar details for PAN check', e);
      }
    };
    if (isFocused) {
      fetchAadhaarName();
    }
  }, [isFocused]);

  const handlePanChange = (text: string) => {
    setErrorMessage('');
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length <= 10) {
      setPanNumber(cleaned);
    }
  };

  const handleVerifyPan = async () => {
    setErrorMessage('');
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(panNumber)) {
      setErrorMessage('Invalid PAN Format. Must be 5 letters, 4 numbers, and 1 letter (e.g. ABCDE1234F).');
      return;
    }

    setLoading(true);
    try {
      const verifiedPan = await verifyPan(panNumber);

      const isUnique = await checkPanUniqueness(userId, verifiedPan.panNo);
      if (!isUnique) {
        throw new Error('PAN data already exists with another user.');
      }

      const panPayload = {
        panNo: verifiedPan.panNo,
        holderName: verifiedPan.holderName,
        category: verifiedPan.category || '',
        status: verifiedPan.status,
        referenceId: verifiedPan.referenceId,
      };
      await savePanData(userId, panPayload);
      const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
      const activeUser = activeUserStr ? JSON.parse(activeUserStr) : null;
      const targetEmail = userEmail || activeUser?.email || '';
      if (targetEmail) {
        sendCustomEmailNotification({
          to: targetEmail,
          type: 'kyc_success',
          userName: panPayload.holderName,
          kycType: 'PAN',
        }).catch((emailErr) => console.warn('PAN KYC email dispatch notice:', emailErr));
      }
      setHolderName(panPayload.holderName);
      setPanStatus(panPayload.status);
      setPanCategory(panPayload.category);
      setPanReferenceId(panPayload.referenceId || '');
      setSuccess(true);
    } catch (error: any) {
      const message = getErrorMessage(error, 'PAN verification failed. Check network connection.');
      console.warn('PAN saving error:', message, error);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050608" />
      <TopographyBackground opacity={0.3} />
  
        {/* Header Bar */}
        <View style={styles.headerBar}>
          {isAlreadyVerified ? (
            <TouchableOpacity
              style={styles.backCircleBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.75}
            >
              <ChevronLeftIcon size={18} color="#DFB05B" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
  
          <Text style={styles.headerTitle}>Verify your PAN</Text>
  
          <View style={{ width: 38 }} />
        </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* INPUT STATE */}
        {!loading && !success && (
          <View style={styles.formContainer}>

            {/* Verified Identity On File Card */}
            <View style={styles.identityCard}>
              <View style={styles.identityHeaderRow}>
                <View style={styles.shieldIconCircle}>
                  <ShieldCheckIcon size={16} color="#10B981" />
                </View>
                <View style={styles.identityTextCol}>
                  <Text style={styles.identityLabel}>Verified identity on file</Text>
                  <Text style={styles.identityName}>{holderName || 'Aadhaar verified via DigiLocker'}</Text>
                  <Text style={styles.aadhaarText}>{aadhaarRef || 'Aadhaar reference not returned'}</Text>
                </View>
              </View>
              <Text style={styles.crossCheckText}>
                We'll cross-check your PAN name against this. They must match.
              </Text>
            </View>

            {/* PAN Number Input Field Card */}
            <View style={styles.inputFieldCard}>
              <View style={styles.panIconBadge}>
                <PanCardIcon size={20} color="#DFB05B" />
              </View>
              <View style={styles.inputTextCol}>
                <Text style={styles.inputLabel}>PAN Number</Text>
                <TextInput
                  style={styles.panTextInput}
                  placeholder="ABCDE1234F"
                  placeholderTextColor="#475569"
                  autoCapitalize="characters"
                  maxLength={10}
                  value={panNumber}
                  onChangeText={handlePanChange}
                />
              </View>
            </View>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* LOADING STATE */}
        {loading && (
          <View style={styles.centerCard}>
            <ActivityIndicator size="large" color="#DFB05B" style={{ marginBottom: 20 }} />
            <Text style={styles.loaderTitle}>NSDL & ITD GATEWAY TUNNEL</Text>
            <Text style={styles.loaderDesc}>Verifying PAN {panNumber} with Decentro...</Text>
          </View>
        )}

        {/* SUCCESS STATE */}
        {success && (
          <View style={styles.centerCard}>
            <View style={styles.successBadge}>
              <ShieldCheckIcon size={54} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>PAN Verified Successfully!</Text>
            <Text style={styles.successDesc}>
              Tax registry records returned holder name{' '}
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{holderName}</Text>.
            </Text>

            <View style={styles.deedCard}>
              <View style={styles.deedHeader}>
                <Text style={styles.deedHeaderTitle}>INCOME TAX DEPARTMENT</Text>
              </View>
              <View style={styles.deedBody}>
                <View style={styles.deedRow}>
                  <Text style={styles.deedLabel}>Permanent Account Number</Text>
                  <Text style={styles.deedVal}>{panNumber}</Text>
                </View>
                <View style={styles.deedRow}>
                  <Text style={styles.deedLabel}>Card Category</Text>
                  <Text style={styles.deedVal}>{panCategory}</Text>
                </View>
                <View style={[styles.deedRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <Text style={styles.deedLabel}>Status Code</Text>
                  <Text style={styles.deedVal}>
                    {panStatus}{panReferenceId ? ` (${panReferenceId})` : ''}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('MainTabs')}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>Dashboard</Text>
            </TouchableOpacity>



          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Fixed Bottom Action Button (In Input State) */}
      {!loading && !success && (
        <View style={styles.bottomBarContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, panNumber.length !== 10 && styles.btnDisabled]}
            disabled={panNumber.length !== 10}
            onPress={handleVerifyPan}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>Verify</Text>
            <ArrowRightIcon size={18} color="#1A1405" />
          </TouchableOpacity>
        </View>
      )}
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
  formContainer: {
    marginTop: 10,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0E1017',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.38)',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  noteIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C180E',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    fontSize: 12.5,
    color: '#717D96',
    lineHeight: 18,
  },
  identityCard: {
    backgroundColor: '#0E1017',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.38)',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  identityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  identityTextCol: {
    flex: 1,
  },
  identityLabel: {
    fontSize: 12,
    color: '#717D96',
    marginBottom: 2,
  },
  identityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  aadhaarText: {
    fontSize: 12,
    color: '#717D96',
    marginTop: 2,
  },
  crossCheckText: {
    fontSize: 12,
    color: '#717D96',
    lineHeight: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1C202C',
    paddingTop: 10,
  },
  inputFieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161822',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#222634',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  panIconBadge: {
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
  inputTextCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11.5,
    color: '#717D96',
    marginBottom: 2,
  },
  panTextInput: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    padding: 0,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
  centerCard: {
    width: '100%',
    backgroundColor: '#12141B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222634',
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  loaderTitle: {
    color: '#DFB05B',
    letterSpacing: 1,
    marginBottom: 6,
    fontWeight: '600',
    fontSize: 14,
  },
  loaderDesc: {
    fontSize: 13,
    textAlign: 'center',
    color: '#717D96',
  },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 8,
  },
  successDesc: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#717D96',
    fontSize: 13,
  },
  deedCard: {
    width: '100%',
    backgroundColor: '#161822',
    borderWidth: 1,
    borderColor: '#222634',
    borderRadius: 14,
    marginBottom: 20,
  },
  deedHeader: {
    backgroundColor: 'rgba(223, 176, 91, 0.08)',
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222634',
  },
  deedHeaderTitle: {
    color: '#DFB05B',
    fontWeight: '700',
    fontSize: 10.5,
    letterSpacing: 1,
  },
  deedBody: {
    padding: 16,
  },
  deedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222634',
  },
  deedLabel: {
    color: '#717D96',
    fontSize: 12.5,
    flex: 4.5,
  },
  deedVal: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'right',
    flex: 5.5,
  },
  bottomBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#08090C',
  },
  actionBtn: {
    width: '100%',
    flexDirection: 'row',
    height: 54,
    borderRadius: 18,
    backgroundColor: '#DFB05B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionBtn: {
    backgroundColor: '#161822',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.45)',
  },
  secondaryActionBtnText: {
    color: '#DFB05B',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    color: '#1A1405',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 6,
  },
});
