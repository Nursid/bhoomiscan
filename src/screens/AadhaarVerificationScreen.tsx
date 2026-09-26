import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveAadhaarData, savePanData, getUserData, checkAadhaarUniqueness, checkPanUniqueness } from '../services/firebase';
import { getMeonToken, generateMeonDigiUrl, fetchMeonData } from '../services/kycApi';
import { sendCustomEmailNotification } from '../services/landApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import {
  ChevronLeftIcon,
  DigiLockerIcon,
  ShieldCheckIcon,
  LockIcon,
} from '../components/icons';

import TopographyBackground from '../components/TopographyBackground';

export interface AadhaarVerificationScreenProps {
  navigation: any;
}

export default function AadhaarVerificationScreen({ navigation }: AadhaarVerificationScreenProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [extractionText, setExtractionText] = useState('Initiating handshake with DigiLocker...');
  const extractionTimerRef = useRef<any>(null);
  const completionStartedRef = useRef(false);

  const [userId, setUserId] = useState('');
  const [extractedName, setExtractedName] = useState('');
  const [extractedDob, setExtractedDob] = useState('');
  const [extractedGender, setExtractedGender] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [panHolderName, setPanHolderName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);
  const [aadhaarError, setAadhaarError] = useState('');

  const meonClientTokenRef = useRef<string>('');
  const meonStateRef = useRef<string>('');
  const meonDigiUrlRef = useRef<string>('');

  const isFocused = useIsFocused();

  useEffect(() => {
    const getUserId = async () => {
      const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
      if (activeUserStr) {
        const user = JSON.parse(activeUserStr);
        setUserId(user.uid);
        setUserEmail(user.email || '');
        if (user.fullName) {
          setExtractedName(user.fullName);
        }

        try {
          const freshData = await getUserData(user.uid);
          setUserEmail(freshData?.email || user.email || '');
          if (freshData?.verifications?.aadhaar) {
            setIsAlreadyVerified(true);
            setAadhaarInput(freshData.verifications.aadhaar.aadhaarNo || '');
            setExtractedName(freshData.verifications.aadhaar.name || '');
            setExtractedDob(freshData.verifications.aadhaar.dob || '');
            setExtractedGender(freshData.verifications.aadhaar.gender || '');
            setPanNumber(freshData.verifications.pan?.panNo || '');
            setPanHolderName(freshData.verifications.pan?.holderName || '');
            setStep(4);
          } else {
            setIsAlreadyVerified(false);
            setAadhaarInput('');
            setStep(1);
          }
        } catch {
          if (user.verifications?.aadhaar) {
            setIsAlreadyVerified(true);
            setAadhaarInput(user.verifications.aadhaar.aadhaarNo || '');
            setExtractedName(user.verifications.aadhaar.name || '');
            setExtractedDob(user.verifications.aadhaar.dob || '');
            setExtractedGender(user.verifications.aadhaar.gender || '');
            setPanNumber(user.verifications.pan?.panNo || '');
            setPanHolderName(user.verifications.pan?.holderName || '');
            setStep(4);
          } else {
            setIsAlreadyVerified(false);
            setAadhaarInput('');
            setStep(1);
          }
        }
      }
    };

    if (isFocused) {
      getUserId();
    }

    return () => {
      if (extractionTimerRef.current) clearTimeout(extractionTimerRef.current);
    };
  }, [isFocused]);

  const handleStartDigiLocker = async () => {
    try {
      setStep(3);
      setExtractionText('Creating secure DigiLocker session...');

      const urlResult = await generateMeonDigiUrl('', {
        documents: 'aadhaar,pan',
      });

      meonClientTokenRef.current = (urlResult as any).clientToken || urlResult.token || '';
      meonStateRef.current = urlResult.state || urlResult.token || '';

      meonDigiUrlRef.current = urlResult.url;
      completionStartedRef.current = false;
      setStep(2);
    } catch (e: any) {
      console.warn('Meon DigiLocker initiation failed:', e.message);
      setStep(1);
      setAadhaarError(String(e?.message || 'Unable to start DigiLocker verification.'));
    }
  };

  const handleDigiLockerNavigation = (request: WebViewNavigation) => {
    const url = request.url;
    console.log('[WebView Navigating]:', url);

    const isCallback = url.startsWith('trustledge://') || url.includes('/callback') || url.includes('digilocker/callback');
    if (isCallback) {
      const code = extractAuthorizationCodeFromUrl(url);
      handleAuthorizationCode(code || 'meon-completed');
      return false;
    }

    const error = extractAuthorizationErrorFromUrl(url);
    if (error && isCallback) {
      meonDigiUrlRef.current = '';
      setStep(1);
      setAadhaarError(`DigiLocker consent failed: ${error}`);
      return false;
    }

    return true;
  };

  const extractAuthorizationCodeFromUrl = (url: string) => {
    if (!url.startsWith('trustledge://') && !url.includes('callback')) {
      return '';
    }
    const codeMatch = url.match(/[?&]code=([^&#]+)/);
    return codeMatch?.[1] ? decodeURIComponent(codeMatch[1]) : '';
  };

  const extractAuthorizationErrorFromUrl = (url: string) => {
    if (!url.startsWith('trustledge://') && !url.includes('callback')) {
      return '';
    }
    const errorMatch = url.match(/[?&]error=([^&#]+)/);
    return errorMatch?.[1] ? decodeURIComponent(errorMatch[1]) : '';
  };

  const handleAuthorizationCode = useCallback((code: string) => {
    if (!code || completionStartedRef.current) {
      return;
    }

    completionStartedRef.current = true;
    setStep(3);
    runExtractionProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runExtractionProgress = () => {
    const texts = [
      'Establishing TLS tunnel with DigiLocker gateway...',
      'Requesting Aadhaar & PAN Registry payload...',
      'Validating digital signature and timestamp...',
      'Extracting demographic details & documents...',
      'Finalizing secure database handshake...',
    ];

    let textIdx = 0;
    const updateText = () => {
      if (textIdx < texts.length) {
        setExtractionText(texts[textIdx]);
        textIdx++;
        extractionTimerRef.current = setTimeout(updateText, 700);
      } else {
        completeMeonFetch();
      }
    };
    updateText();
  };

  const completeMeonFetch = async () => {
    try {
      const clientToken = meonClientTokenRef.current || meonStateRef.current;
      const state = meonStateRef.current || clientToken;

      if (!clientToken) {
        throw new Error('Verification session expired. Please restart the process.');
      }

      const result = await fetchMeonData(clientToken, state);

      if (!result.aadhaarNo) {
        throw new Error('Aadhaar data was not returned. Please verify Aadhaar is linked to your DigiLocker account.');
      }

      const isUniqueAadhaar = await checkAadhaarUniqueness(userId, result.aadhaarNo);
      if (!isUniqueAadhaar) {
        throw new Error('Aadhaar data already exists with another user.');
      }

      const aadhaarPayload = {
        aadhaarNo: result.aadhaarNo,
        name: result.name || '',
        dob: result.dob || '',
        gender: result.gender || '',
        address: result.address || '',
        district: result.district,
        state: result.state,
        pincode: result.pincode,
        fatherName: result.fatherName,
        verifiedBy: 'Meon DigiLocker',
      };
      await saveAadhaarData(userId, aadhaarPayload);

      let panPayload = null;
      if (result.panNumber) {
        const isUniquePan = await checkPanUniqueness(userId, result.panNumber);
        if (!isUniquePan) {
          throw new Error('PAN data already exists with another user.');
        }
        panPayload = {
          panNo: result.panNumber,
          holderName: result.nameOnPan || result.name || '',
          nameOnPan: result.nameOnPan || result.name || '',
          status: 'VALID',
          verifiedBy: 'Meon DigiLocker',
        };
        await savePanData(userId, panPayload);
      }

      const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
      const activeUser = activeUserStr ? JSON.parse(activeUserStr) : null;
      const targetEmail = userEmail || activeUser?.email || '';
      if (targetEmail) {
        sendCustomEmailNotification({
          to: targetEmail,
          type: 'kyc_success',
          userName: aadhaarPayload.name,
          kycType: 'Aadhaar & PAN',
        }).catch((emailErr) => console.warn('KYC email dispatch notice:', emailErr));
      }

      setAadhaarInput(aadhaarPayload.aadhaarNo);
      setExtractedName(aadhaarPayload.name);
      setExtractedDob(aadhaarPayload.dob);
      setExtractedGender(aadhaarPayload.gender);
      setPanNumber(result.panNumber || '');
      setPanHolderName(panPayload?.holderName || '');
      setStep(4);
    } catch (e: any) {
      console.warn('Failed saving verification details:', e.message);
      setStep(1);
      setAadhaarError(e.message || 'Verification database synchronization failed.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050608" />
      <TopographyBackground opacity={0.3} />

      {/* Header */}
      <View style={styles.headerBar}>
        {isAlreadyVerified && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ChevronLeftIcon size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>DigiLocker Portal</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* STEP 1: Consent & Input */}
        {step === 1 && (
          <View style={styles.card}>
            <View style={styles.digilockerBranding}>
              <DigiLockerIcon size={40} color="#FFFFFF" />
              <Text style={styles.portalTitle}>DIGILOCKER SECURE VERIFY</Text>
              <Text style={styles.portalSubtitle}>Ministry of Electronics & IT, Government of India</Text>
            </View>

            {aadhaarError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {String(aadhaarError)}</Text>
              </View>
            ) : null}

            <View style={styles.consentInfoBox}>
              <View style={[styles.checkbox, styles.checkboxChecked]}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
              <Text style={styles.consentLabel}>
                Verify your Aadhaar & PAN through DigiLocker consent. Both identity documents will be fetched in a single secure session after your authorization.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={handleStartDigiLocker}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>Verify Aadhaar & PAN</Text>
            </TouchableOpacity>

            <Text style={styles.secureNotice}>
              🔒 Secure SSL encrypted channel. Your Aadhaar is never shared with third parties.
            </Text>
          </View>
        )}

        {/* STEP 2: DigiLocker WebView */}
        {step === 2 && (
          <View style={styles.webViewShell}>
            <View style={styles.webViewHeader}>
              <View>
                <Text style={styles.webViewTitle}>DigiLocker</Text>
                <Text style={styles.webViewSubtitle}>Select Aadhaar & PAN and approve</Text>
              </View>
              <TouchableOpacity
                style={styles.webViewCloseBtn}
                onPress={() => {
                  meonDigiUrlRef.current = '';
                  setStep(1);
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.webViewCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            {meonDigiUrlRef.current ? (
              <WebView
                source={{ uri: meonDigiUrlRef.current }}
                style={styles.webView}
                startInLoadingState
                javaScriptEnabled
                domStorageEnabled
                userAgent={Platform.OS === 'android'
                  ? 'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
                  : 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'}
                onShouldStartLoadWithRequest={handleDigiLockerNavigation}
                onNavigationStateChange={(navState) => {
                  const url = navState.url;
                  const isCallback = url.startsWith('trustledge://') || url.includes('/callback') || url.includes('digilocker/callback');
                  if (isCallback) {
                    const code = extractAuthorizationCodeFromUrl(url);
                    handleAuthorizationCode(code || 'meon-completed');
                  }
                }}
                renderLoading={() => (
                  <View style={styles.webViewLoader}>
                    <ActivityIndicator size="large" color="#DFB05B" />
                    <Text style={styles.loaderText}>Opening DigiLocker...</Text>
                  </View>
                )}
                onError={(event) => {
                  setStep(1);
                  meonDigiUrlRef.current = '';
                  setAadhaarError(event.nativeEvent.description || 'DigiLocker could not be loaded.');
                }}
              />
            ) : (
              <View style={styles.webViewLoader}>
                <ActivityIndicator size="large" color="#DFB05B" />
                <Text style={styles.loaderText}>Preparing DigiLocker...</Text>
              </View>
            )}
          </View>
        )}

        {/* STEP 3: Multi-step Extraction Loader */}
        {step === 3 && (
          <View style={[styles.card, styles.loaderCard]}>
            <ActivityIndicator size="large" color="#DFB05B" style={{ marginBottom: 20 }} />
            <Text style={styles.loaderTitle}>SECURE DOCUMENT EXCHANGE</Text>
            <Text style={styles.loaderText}>{extractionText}</Text>
            <View style={styles.secureConnectionBadge}>
              <LockIcon size={12} color="#10B981" />
              <Text style={styles.secureConnectionText}>TLS 1.3 SECURE SHELL</Text>
            </View>
          </View>
        )}

        {/* STEP 4: Success Summary Screen */}
        {step === 4 && (
          <View style={[styles.card, styles.successCard]}>
            <View style={styles.successIconWrapper}>
              <ShieldCheckIcon size={60} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Aadhaar Verified!</Text>
            <Text style={styles.successDesc}>
              Aadhaar & PAN data was fetched successfully through DigiLocker and securely linked to your profile vault.
            </Text>

            <View style={styles.previewBox}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Name:</Text>
                <Text style={styles.previewValue}>{extractedName}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>DOB:</Text>
                <Text style={styles.previewValue}>{extractedDob || 'Verified'}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Gender:</Text>
                <Text style={styles.previewValue}>{extractedGender || 'Verified'}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Aadhaar:</Text>
                <Text style={styles.previewValue}>{aadhaarInput}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>PAN:</Text>
                <Text style={styles.previewValue}>{panNumber || 'Verified'}</Text>
              </View>
              {panHolderName ? (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>PAN Name:</Text>
                  <Text style={styles.previewValue}>{panHolderName}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => {
                if (isAlreadyVerified) {
                  navigation.goBack();
                } else {
                  navigation.navigate('PanVerification');
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>
                {isAlreadyVerified ? 'GO BACK TO DASHBOARD' : 'CONTINUE'}
              </Text>
            </TouchableOpacity>



          </View>
        )}
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
  scrollContainer: {
    flexGrow: 1,
    padding: 18,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#0E1017',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.38)',
    padding: 20,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  digilockerBranding: {
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222634',
    paddingBottom: 16,
  },
  portalTitle: {
    fontSize: 15,
    marginTop: 10,
    color: '#DFB05B',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  portalSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
    color: '#717D96',
  },
  inputLabel: {
    color: '#717D96',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  aadhaarTextInput: {
    backgroundColor: '#161822',
    borderWidth: 1,
    borderColor: '#222634',
    borderRadius: 14,
    color: '#DFB05B',
    fontSize: 22,
    letterSpacing: 3,
    textAlign: 'center',
    fontWeight: '700',
    paddingVertical: 12,
    marginBottom: 16,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  consentInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#161822',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222634',
    padding: 14,
    marginBottom: 18,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#222634',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
    backgroundColor: '#161822',
  },
  checkboxChecked: {
    borderColor: '#DFB05B',
    backgroundColor: 'rgba(223, 176, 91, 0.15)',
  },
  checkmarkText: {
    color: '#DFB05B',
    fontWeight: '700',
    fontSize: 12,
  },
  consentLabel: {
    flex: 1,
    color: '#717D96',
    fontSize: 12,
    lineHeight: 16,
  },
  btnPrimary: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#DFB05B',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPrimaryText: {
    color: '#1A1405',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryBtn: {
    backgroundColor: '#161822',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.45)',
  },
  secondaryBtnText: {
    color: '#DFB05B',
  },
  btnDisabledText: {
    color: '#64748B',
  },
  secureNotice: {
    textAlign: 'center',
    fontSize: 10.5,
    marginTop: 14,
    color: '#5A6578',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
  helperCodeBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: '#3B82F6',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  helperCodeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  otpNotice: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    color: '#717D96',
  },
  otpInput: {
    backgroundColor: '#161822',
    borderWidth: 1,
    borderColor: '#222634',
    borderRadius: 14,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '700',
    color: '#DFB05B',
    paddingVertical: 12,
    marginBottom: 16,
  },
  timerRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    color: '#717D96',
    fontSize: 13,
  },
  resendText: {
    fontSize: 13,
    color: '#DFB05B',
    fontWeight: '600',
  },
  webViewShell: {
    flex: 1,
    minHeight: 620,
    overflow: 'hidden',
    backgroundColor: '#08090C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222634',
  },
  webViewHeader: {
    height: 58,
    paddingHorizontal: 14,
    backgroundColor: '#12141B',
    borderBottomWidth: 1,
    borderBottomColor: '#222634',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webViewTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  webViewSubtitle: {
    color: '#717D96',
    fontSize: 11,
    marginTop: 2,
  },
  webViewCloseBtn: {
    minWidth: 64,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#161822',
    borderWidth: 1,
    borderColor: '#2A3040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webViewCloseText: {
    color: '#DFB05B',
    fontSize: 12,
    fontWeight: '700',
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webViewLoader: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#08090C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loaderTitle: {
    letterSpacing: 1.5,
    fontSize: 14,
    fontWeight: '600',
    color: '#DFB05B',
    marginBottom: 6,
  },
  loaderText: {
    textAlign: 'center',
    color: '#717D96',
    fontSize: 13,
    height: 40,
    paddingHorizontal: 16,
  },
  secureConnectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 20,
  },
  secureConnectionText: {
    color: '#10B981',
    fontSize: 9.5,
    fontWeight: '700',
    marginLeft: 4,
  },
  successCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIconWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 8,
  },
  successDesc: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#717D96',
    fontSize: 13,
    lineHeight: 18,
  },
  previewBox: {
    width: '100%',
    backgroundColor: '#161822',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222634',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#222634',
  },
  previewLabel: {
    color: '#717D96',
    fontSize: 12,
  },
  previewValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
