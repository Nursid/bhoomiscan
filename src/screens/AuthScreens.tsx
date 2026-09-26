import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DestinyLogoHeader from '../components/DestinyLogoHeader';
import AuthTabSwitcher from '../components/AuthTabSwitcher';
import CustomInputField from '../components/CustomInputField';
import GoldGradientButton from '../components/GoldGradientButton';
import GoogleAuthButton from '../components/GoogleAuthButton';
import TrustBadgesRow from '../components/TrustBadgesRow';
import CustomAlertModal from '../components/CustomAlertModal';

import TopographyBackground from '../components/TopographyBackground';
import ScreenLoadingState from '../components/ScreenLoadingState';
import { MailIcon, LockIcon, UserGroupIcon, CheckSquareIcon, SquareIcon } from '../components/icons';
import { loginUser, signUpUser, AuthService } from '../services/firebase';
import { sendCustomEmailNotification } from '../services/landApi';
import NavigationService from '../screenRoute/navigationService';
import { COLORS, FONTS } from '../theme';


export interface AuthScreenProps {
  initialTab?: 'Login' | 'SignUp';
  navigation?: any;
}

// ============================================================================
// UNIFIED STATE-MANAGED AUTH SCREEN WITH CUSTOM ALERT MODAL
// ============================================================================
export function AuthScreen({ initialTab = 'Login', navigation }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<'Login' | 'SignUp'>(initialTab);

  // Input States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Status States
  const [loading, setLoading] = useState(false);

  // Custom Alert Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    type: 'error' | 'success';
    title: string;
    message: string;
  }>({
    type: 'error',
    title: 'Sign in failed',
    message: 'Validation failed',
  });

  const showAlert = (title: string, message: string, type: 'error' | 'success' = 'error') => {
    setAlertConfig({ title, message, type });
    setModalVisible(true);
  };

  const goToMainTabs = () => {
    if (navigation && typeof navigation.reset === 'function') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
      return;
    }

    if (navigation && typeof navigation.replace === 'function') {
      navigation.replace('MainTabs');
      return;
    }

    NavigationService.reset('MainTabs');
  };

  // Switch Tab Handler
  const handleTabSwitch = (tab: 'Login' | 'SignUp') => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  const handleAuthAction = async () => {
    if (loading) return;

    if (activeTab === 'SignUp' && !fullName.trim()) {
      showAlert('Sign up failed', 'Please enter your display name.');
      return;
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      showAlert(
        activeTab === 'Login' ? 'Sign in failed' : 'Sign up failed',
        'Please enter a valid email address.'
      );
      return;
    }
    if (!password || (activeTab === 'SignUp' && password.length < 6)) {
      showAlert(
        activeTab === 'Login' ? 'Sign in failed' : 'Sign up failed',
        activeTab === 'SignUp'
          ? 'Password must be at least 6 characters long.'
          : 'Please enter your password.'
      );
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'Login') {
        await loginUser(email, password);
      } else {
        await signUpUser(email, password, fullName);
        sendCustomEmailNotification({
          to: email.trim(),
          type: 'welcome',
          userName: fullName.trim(),
        }).catch((emailErr) => console.warn('Welcome email dispatch notice:', emailErr));
      }
      goToMainTabs();
    } catch (error: any) {
      console.log('Auth error:', error.message);
      let errMsg = 'Authentication failed. Please try again.';
      if (
        error.message.includes('invalid-credential') ||
        error.message.includes('user-not-found') ||
        error.message.includes('wrong-password')
      ) {
        errMsg = 'Invalid email or password combination.';
      } else if (error.message.includes('email-already-in-use')) {
        errMsg = 'This email address is already registered.';
      }
      showAlert(
        activeTab === 'Login' ? 'Sign in failed' : 'Sign up failed',
        errMsg
      );
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const authResult = await AuthService.signInWithGoogle();
      if (authResult) {
        goToMainTabs();
        return;
      }
    } catch (error: any) {
      if (error?.message !== 'SIGN_IN_CANCELLED' && error?.message !== 'CANCELLED') {
        const googleMessage = error?.message || 'Could not complete Google authentication. Please try again.';
        console.log('Google Auth error:', googleMessage);
        showAlert(
          'Sign in failed',
          googleMessage
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSelector = () => {
    showAlert('Language', 'English (Default) selected.', 'success');
  };

  const handleForgotPassword = () => {
    showAlert(
      'Reset Password',
      'Password reset link sent to your registered email address.',
      'success'
    );
  };

  if (loading) {
    return (
      <ScreenLoadingState
        concept="compassOrb"
        title={activeTab === 'Login' ? 'Authenticating account' : 'Creating verified account'}
        subtitle="Establishing encrypted session gateway with Destiny Protocol..."
        initialPercentage={65}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050608" />
      <TopographyBackground opacity={0.35} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Brand & Logo Header */}
          <DestinyLogoHeader
            selectedLanguage="English"
            onLanguagePress={handleLanguageSelector}
          />

          {/* Dynamic Section Titles */}
          <View style={styles.titleBlock}>
            <Text style={styles.mainHeading}>
              {activeTab === 'Login' ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={styles.subHeading}>
              Secure your digital world with Destiny Protocol
            </Text>
          </View>

          {/* Tab Switcher */}
          <AuthTabSwitcher
            activeTab={activeTab}
            onTabChange={handleTabSwitch}
          />

          {/* Display Name Input (Only for Sign Up) */}
          {activeTab === 'SignUp' && (
            <CustomInputField
              label="Display Name"
              placeholder="Your name"
              value={fullName}
              onChangeText={setFullName}
              leftIcon={UserGroupIcon}
              autoCapitalize="words"
              editable={!loading}
            />
          )}

          {/* Email Address Input */}
          <CustomInputField
            label="Email Address"
            placeholder="youremail@gmail.com"
            value={email}
            onChangeText={setEmail}
            leftIcon={MailIcon}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          {/* Password Input */}
          <CustomInputField
            label="Password"
            placeholder="••••••••••••"
            value={password}
            onChangeText={setPassword}
            leftIcon={LockIcon}
            isPassword={true}
            editable={!loading}
          />

          {/* Remember Me & Forgot Password Row (Only for Login) */}
          {activeTab === 'Login' && (
            <View style={styles.optionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.rememberMeBtn}
                onPress={() => setRememberMe(!rememberMe)}
              >
                {rememberMe ? (
                  <CheckSquareIcon size={22} color="#E4B85D" />
                ) : (
                  <SquareIcon size={22} color="#E4B85D" />
                )}
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Golden Gradient Primary Action Button */}
          <GoldGradientButton
            title={activeTab === 'Login' ? 'Login Securely' : 'Create Account'}
            onPress={handleAuthAction}
            loading={loading}
          />

          {/* Social Auth Button */}
          <GoogleAuthButton onPress={handleGoogleSignIn} disabled={loading} />

          {/* Security Trust Badges Bar */}
          <TrustBadgesRow />

          {/* Dynamic Footer Link to toggle activeTab state */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              {activeTab === 'Login'
                ? 'New here? '
                : 'Already have an account? '}
            </Text>
            <TouchableOpacity
              onPress={() =>
                handleTabSwitch(activeTab === 'Login' ? 'SignUp' : 'Login')
              }
            >
              <Text style={styles.footerLink}>
                {activeTab === 'Login' ? 'Create an account' : 'Login'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Reusable Custom Alert Modal Popup */}
      <CustomAlertModal
        visible={modalVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// Named Wrappers for Navigation Stack
export function LoginScreen(props: any) {
  return <AuthScreen {...props} initialTab="Login" />;
}

export function SignUpScreen(props: any) {
  return <AuthScreen {...props} initialTab="SignUp" />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050608',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 34,
  },
  titleBlock: {
    marginTop: 0,
  },
  mainHeading: {
    fontSize: 28,
    fontWeight: '600',
    color: '#F8F3EA',
    marginBottom: 7,
    fontFamily: FONTS.medium,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '400',
    color: '#A19A8E',
    fontFamily: FONTS.light,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 0,
    paddingHorizontal: 2,
  },
  rememberMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberText: {
    color: '#C6BFB4',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    fontFamily: FONTS.light,
  },
  forgotText: {
    color: '#EBC77C',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  footerText: {
    color: '#8F887B',
    fontSize: 15,
    fontWeight: '400',
    fontFamily: FONTS.light,
  },
  footerLink: {
    color: '#EBC77C',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
});
