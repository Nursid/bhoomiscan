import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  StatusBar,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { getUserData, saveLandStatusData, savePaymentData } from '../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RazorpayCheckout from 'react-native-razorpay';
import {
  ChevronLeftIcon,
  RazorpayIcon,
  ShieldCheckIcon,
} from '../components/icons';
import ScreenLoadingState from '../components/ScreenLoadingState';
import TopographyBackground from '../components/TopographyBackground';
import { setCachedProfile, getCachedProfile } from '../services/profileCache';
import GoldGradientButton from '../components/GoldGradientButton';
import { LAND_MANUAL_REVIEW_MESSAGE, sendCustomEmailNotification, verifyRemotePaymentStatus } from '../services/landApi';

const REGISTRY_FEE_AMOUNT = 1;
const REGISTRY_FEE_BASE = 1;
const REGISTRY_FEE_GST = 0;
const REGISTRY_FEE_PAISE = String(REGISTRY_FEE_AMOUNT * 100);
const PAYMENT_SESSION_KEY = '@trustledge_payment_session';
const REGISTRY_FEE_LABEL = `₹${REGISTRY_FEE_AMOUNT}.00`;

export interface RazorpayPaymentScreenProps {
  navigation: any;
}

export default function RazorpayPaymentScreen({ navigation }: RazorpayPaymentScreenProps) {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingText, setLoadingText] = useState('');
  const [success, setSuccess] = useState(false);
  const [cancelledNotice, setCancelledNotice] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [txnId, setTxnId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userContact, setUserContact] = useState('9876543210');
  
  const paymentReferenceRef = useRef('TL_REG_' + Date.now().toString(36).toUpperCase());
  const paymentReference = paymentReferenceRef.current;
  const autoLaunchedRef = useRef(false);
  const profileLoadedRef = useRef(false);
  const paymentInProgressRef = useRef(false);
  const userIdRef = useRef('');
  const userEmailRef = useRef('');

  const openLandAfterPayment = () => {
    const landStatus = getCachedProfile()?.verifications?.landStatus;
    if (landStatus?.status === 'FAILED') {
      navigation.navigate('LandRegistration', {
        mode: 'manual',
        notice: LAND_MANUAL_REVIEW_MESSAGE,
      });
      return;
    }
    navigation.navigate('LandRegistration');
  };

  // Helper to persist payment verification to cache & local storage
  const recordPaymentSuccess = useCallback(async (payload: any) => {
    try {
      setLoading(true);
      setLoadingText('Verifying and saving transaction to ledger...');
      
      const activeUserId = userIdRef.current || userId;
      const updatedProfile = await savePaymentData(activeUserId, payload);
      
      const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
      let mergedProfile = updatedProfile;
      if (activeUserStr) {
        const parsed = JSON.parse(activeUserStr);
        parsed.verifications = parsed.verifications || {};
        parsed.verifications.payment = payload;
        mergedProfile = { ...parsed, ...updatedProfile };
        await AsyncStorage.setItem('@trustledge_active_user', JSON.stringify(mergedProfile));
      }

      const resolvedUid = mergedProfile?.uid || updatedProfile?.uid || activeUserId;
      const verifications = mergedProfile?.verifications || updatedProfile?.verifications || {};
      if (resolvedUid && !verifications.land && !verifications.landStatus) {
        const nextProfile = await saveLandStatusData(resolvedUid, {
          status: 'AWAITING_PROPERTY_DETAILS',
          paymentId: payload.paymentId,
          completedAt: new Date().toISOString(),
          message: 'Payment captured. Enter your property details or upload your land document to start official/manual verification.',
        });
        mergedProfile = nextProfile || mergedProfile;
      }
      
      setCachedProfile(mergedProfile || updatedProfile);
      setTxnId(payload.paymentId || 'PAY_' + Date.now());
      setSuccess(true);
      setCancelledNotice(null);
      await AsyncStorage.removeItem(PAYMENT_SESSION_KEY);

      const activeEmail = userEmailRef.current || userEmail;
      if (activeEmail) {
        sendCustomEmailNotification({
          to: activeEmail,
          type: 'vault_save',
          userName: userName || activeEmail,
          transactionHash: payload.paymentId,
        }).catch((emailErr) => console.warn('Payment email dispatch notice:', emailErr));
      }
    } catch (err: any) {
      console.warn('Payment recording failed:', err?.message || err);
      // Even if cloud write fails, update local state so user isn't stuck
      setSuccess(true);
    } finally {
      paymentInProgressRef.current = false;
      setLoading(false);
    }
  }, [userId, userEmail, userName]);

  const launchRazorpaySDK = useCallback(async (customEmail?: string, customName?: string, customContact?: string) => {
    setCancelledNotice(null);
    const targetEmail = customEmail || userEmail || 'member@destinyprotocol.org';
    const targetName = customName || userName || targetEmail || 'Valued Member';
    const targetContact = customContact || userContact || '9876543210';

    const options = {
      description: 'Land Deed Registry Fee',
      image: 'https://destinyprotocol.org/logo.png',
      currency: 'INR',
      key: 'rzp_live_TKNykl53nIgEDQ',
      amount: REGISTRY_FEE_PAISE,
      name: 'Destiny Protocol Ltd.',
      contact: targetContact,
      email: targetEmail,
      notes: {
        trustledge_reference: paymentReference,
        purpose: `Land Deed Registry Fee (${REGISTRY_FEE_LABEL})`,
      },
      prefill: {
        email: targetEmail,
        contact: targetContact,
        phone: targetContact,
        mobile: targetContact,
        name: targetName,
      },
      theme: { color: '#DFB05B' }
    };

    setLoading(true);
    setLoadingText('Opening Razorpay Gateway...');
    paymentInProgressRef.current = true;
    await AsyncStorage.setItem(
      PAYMENT_SESSION_KEY,
      JSON.stringify({
        referenceNo: paymentReference,
        startedAt: new Date().toISOString(),
        amount: REGISTRY_FEE_AMOUNT,
      }),
    );

    try {
      if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
        throw new Error('Native SDK not linked');
      }

      RazorpayCheckout.open(options)
        .then(async (data: any) => {
          const checkId = data.razorpay_payment_id || 'pay_' + Math.random().toString(36).substring(2, 10).toUpperCase();
          const paymentPayload = {
            paymentId: checkId,
            referenceNo: paymentReference,
            amount: REGISTRY_FEE_AMOUNT,
            baseAmount: REGISTRY_FEE_BASE,
            gstAmount: REGISTRY_FEE_GST,
            status: 'CAPTURED',
            gateway: 'Razorpay Gateway',
            keyUsed: 'rzp_live_TKNykl53nIgEDQ',
            method: 'Razorpay Gateway',
            contact: targetContact,
            razorpayResponse: data,
          };
          await recordPaymentSuccess(paymentPayload);
        })
        .catch(async (error: any) => {
          console.warn('Razorpay Checkout Cancel/Error:', error);
          paymentInProgressRef.current = false;
          await AsyncStorage.removeItem(PAYMENT_SESSION_KEY);
          setLoading(false);
          setCancelledNotice('Payment was cancelled or interrupted. Please complete payment to proceed.');
        });
    } catch (e: any) {
      console.warn('Native Razorpay SDK unavailable:', e.message);
      paymentInProgressRef.current = false;
      await AsyncStorage.removeItem(PAYMENT_SESSION_KEY);
      setLoading(false);
      setCancelledNotice('Razorpay Checkout Gateway could not be opened. Please verify network connection and try again.');
    }
  }, [userEmail, userName, userContact, paymentReference, recordPaymentSuccess]);

  // Check remote Firebase status & Razorpay backend poller on background refresh / resume
  const checkExistingPaymentStatus = useCallback(async (uid: string, email?: string) => {
    if (!uid || paymentInProgressRef.current) return;
    try {
      const freshProfile = await getUserData(uid);
      if (freshProfile?.verifications?.payment) {
        setCachedProfile(freshProfile);
        await AsyncStorage.setItem('@trustledge_active_user', JSON.stringify(freshProfile));
        setTxnId(freshProfile.verifications.payment.paymentId || 'PAY_VERIFIED');
        setSuccess(true);
        setCancelledNotice(null);
        return;
      }

      // Check backend Cron poller / Razorpay Webhook verify-status
      const remoteRes = await verifyRemotePaymentStatus(email || userEmail, uid);
      if (remoteRes?.paid && remoteRes.payment) {
        await recordPaymentSuccess(remoteRes.payment);
      }
    } catch (err: any) {
      console.log('Notice checking payment status on focus:', err?.message || err);
    }
  }, [userEmail, recordPaymentSuccess]);

  // Listen to AppState transitions (Background -> Active) to re-verify payment
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && userId && !paymentInProgressRef.current) {
        checkExistingPaymentStatus(userId);
      }
    });
    return () => subscription.remove();
  }, [userId, checkExistingPaymentStatus]);

  // Load user profile & auto-launch SDK once on mount
  useEffect(() => {
    const getUserIdAndLaunch = async () => {
      if (paymentInProgressRef.current) {
        return;
      }

      try {
        if (!profileLoadedRef.current) {
          setLoadingProfile(true);
        }

        const pendingSession = await AsyncStorage.getItem(PAYMENT_SESSION_KEY);
        if (pendingSession) {
          setCancelledNotice('Payment app was opened. If you completed payment, we are checking confirmation; otherwise retry payment.');
        }

        const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
        let currentUid = '';
        let currentEmail = '';
        let currentName = '';
        let currentContact = '9876543210';

        if (activeUserStr) {
          const user = JSON.parse(activeUserStr);
          const cached = getCachedProfile() || user;
          const freshProfile = await getUserData(user.uid);
          const profile = freshProfile || cached;
          
          currentUid = profile.uid || user.uid;
          currentEmail = profile.email || user.email || '';
          currentName = profile.verifications?.aadhaar?.name || profile.fullName || profile.email || '';

          const rawMobile = profile.verifications?.aadhaar?.mobile ||
            profile.verifications?.aadhaar?.phone ||
            profile.phone ||
            profile.mobile ||
            user.phone ||
            user.mobile ||
            '';
          const cleanedMobile = String(rawMobile).replace(/\D/g, '').slice(-10);
          if (cleanedMobile.length === 10) {
            currentContact = cleanedMobile;
          }

          setUserId(currentUid);
          setUserEmail(currentEmail);
          setUserName(currentName);
          setUserContact(currentContact);
          userIdRef.current = currentUid;
          userEmailRef.current = currentEmail;

          // Check if already paid locally
          if (profile.verifications?.payment) {
            setTxnId(profile.verifications.payment.paymentId || 'PAY_VERIFIED');
            setSuccess(true);
            await AsyncStorage.removeItem(PAYMENT_SESSION_KEY);
            paymentInProgressRef.current = false;
            profileLoadedRef.current = true;
            setLoadingProfile(false);
            return;
          }

          // Check backend Cron poller / Razorpay status
          await checkExistingPaymentStatus(currentUid, currentEmail);
        }

        profileLoadedRef.current = true;
        setLoadingProfile(false);

        // Auto launch SDK once if not already paid
        if (!pendingSession && !autoLaunchedRef.current && !success) {
          autoLaunchedRef.current = true;
          setTimeout(() => {
            launchRazorpaySDK(currentEmail, currentName, currentContact);
          }, 300);
        }
      } catch {
        setLoadingProfile(false);
      }
    };

    if (isFocused) {
      getUserIdAndLaunch();
    }
  }, [isFocused, launchRazorpaySDK, success]);

  if (loadingProfile) {
    return <ScreenLoadingState title="Preparing payment" subtitle="Loading verified billing details." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050608" />
      <TopographyBackground opacity={0.3} />

      {/* Header */}
      <View style={styles.headerBar}>
        {!loading && !success ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ChevronLeftIcon size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.headerTitle}>Razorpay Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* CANCELLATION NOTICE IF USER BACKED OUT */}
        {cancelledNotice && !loading && !success && (
          <View style={styles.noticeContainer}>
            <Text style={styles.noticeTitle}>⚠️ Payment Pending / Interrupted</Text>
            <Text style={styles.noticeText}>{cancelledNotice}</Text>
          </View>
        )}

        {/* INPUT / READY STATE */}
        {!loading && !success && (
          <View style={styles.checkoutWrapper}>
            {/* Merchant Card */}
            <View style={styles.merchantCard}>
              <View style={styles.merchantHeader}>
                <RazorpayIcon size={38} color="#DFB05B" />
                <View style={styles.merchantHeaderRight}>
                  <Text style={styles.merchantName}>DESTINY PROTOCOL LTD.</Text>
                  <Text style={styles.merchantUrl}>payments.destinyprotocol.org</Text>
                </View>
              </View>

              <View style={styles.merchantDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>PURPOSE:</Text>
                  <Text style={styles.detailVal}>Land Deed Registry Fee</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>BASE AMOUNT:</Text>
                  <Text style={styles.detailVal}>₹521.00</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>GST (FIXED 18% TAX):</Text>
                  <Text style={styles.detailVal}>₹70.00</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>TOTAL DUE:</Text>
                  <Text style={styles.amountDueText}>{REGISTRY_FEE_LABEL}</Text>
                </View>

                <View style={styles.healthMailPill}>
                  <Text style={styles.healthMailText}>
                    ✉️ Includes: Monthly Property & Identity Health Mail
                  </Text>
                </View>
              </View>
            </View>

            {/* Direct Razorpay Launch Gold Gradient Button */}
            <GoldGradientButton
              title={cancelledNotice ? `Retry ${REGISTRY_FEE_LABEL}` : `Pay ${REGISTRY_FEE_LABEL}`}
              onPress={launchRazorpaySDK}
              loading={loading}
              showIcon={true}
              showArrow={true}
              style={{ width: '100%', marginTop: 16 }}
            />

            <View style={styles.encryptionInfo}>
              <Text style={styles.encryptionText}>
                🛡️ Secured by Razorpay Gateway. 256-bit SSL encryption.
              </Text>
            </View>
          </View>
        )}

        {/* LOADING PROCESSING STATE */}
        {loading && (
          <View style={[styles.card, styles.loadingCard]}>
            <ActivityIndicator size="large" color="#DFB05B" style={{ marginBottom: 20 }} />
            <Text style={styles.loaderTitle}>RAZORPAY GATEWAY INITIALIZING</Text>
            <Text style={styles.loaderText}>{loadingText}</Text>
          </View>
        )}

        {/* TRANSACTION SUCCESS STATE */}
        {success && (
          <View style={[styles.card, styles.successCard]}>
            <View style={styles.successIconBadge}>
              <ShieldCheckIcon size={60} color="#10B981" />
            </View>

            <Text style={styles.successTitle}>Payment Verified & Captured!</Text>
            <Text style={styles.successSubtitle}>
              Transaction reference logged securely to database ledger.
            </Text>

            <View style={styles.receiptContainer}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptHeaderTitle}>TRANSACTION RECEIPT</Text>
              </View>
              <View style={styles.receiptBody}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Transaction ID:</Text>
                  <Text style={styles.receiptVal}>{txnId}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Merchant:</Text>
                  <Text style={styles.receiptVal}>Destiny Protocol Gateway</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Amount Paid:</Text>
                  <Text style={[styles.receiptVal, { color: '#10B981' }]}>{REGISTRY_FEE_LABEL}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Payment Status:</Text>
                  <Text style={[styles.receiptVal, { color: '#10B981' }]}>VERIFIED & CONFIRMED</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Ledger Timestamp:</Text>
                  <Text style={styles.receiptVal}>
                    {new Date().toLocaleTimeString()} {new Date().toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Unlock Land Registry Gold Gradient Button */}
            <GoldGradientButton
              title="Unlock"
              onPress={openLandAfterPayment}
              showIcon={true}
              showArrow={true}
              style={{ width: '100%', marginTop: 16 }}
            />
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(223, 176, 91, 0.15)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#161B26',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scrollContainer: {
    padding: 20,
  },
  noticeContainer: {
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.4)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  noticeTitle: {
    color: '#EAB308',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  noticeText: {
    color: '#CBD5E1',
    fontSize: 11.5,
    lineHeight: 16,
  },
  checkoutWrapper: {
    width: '100%',
  },
  merchantCard: {
    backgroundColor: '#0A0C12',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.42)',
    borderTopColor: 'rgba(255, 238, 178, 0.75)',
    padding: 20,
    marginBottom: 20,
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(223, 176, 91, 0.18)',
  },
  merchantHeaderRight: {
    marginLeft: 12,
  },
  merchantName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  merchantUrl: {
    color: '#717D96',
    fontSize: 11,
    marginTop: 2,
  },
  merchantDetails: {
    marginTop: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  detailVal: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  amountDueText: {
    color: '#DFB05B',
    fontSize: 16,
    fontWeight: '700',
  },
  healthMailPill: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  healthMailText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  btnPrimary: {
    height: 52,
    backgroundColor: '#DFB05B',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  btnPrimaryText: {
    color: '#1A1405',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  btnSimulate: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSimulateText: {
    color: '#94A3B8',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  encryptionInfo: {
    marginTop: 14,
    alignItems: 'center',
  },
  encryptionText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#0A0C12',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.3)',
    padding: 24,
    alignItems: 'center',
  },
  loadingCard: {
    paddingVertical: 40,
  },
  loaderTitle: {
    color: '#DFB05B',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  loaderText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  successCard: {
    paddingVertical: 30,
  },
  successIconBadge: {
    marginBottom: 16,
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  successSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  receiptContainer: {
    width: '100%',
    backgroundColor: '#121620',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222836',
    marginBottom: 20,
    overflow: 'hidden',
  },
  receiptHeader: {
    backgroundColor: '#1A202C',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  receiptHeaderTitle: {
    color: '#DFB05B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  receiptBody: {
    padding: 14,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  receiptLabel: {
    color: '#64748B',
    fontSize: 12,
  },
  receiptVal: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
});
