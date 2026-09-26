import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { IMAGES } from '../assets';
import { FONTS } from '../theme';

const { width, height } = Dimensions.get('window');

export interface GoogleAccount {
  name: string;
  email: string;
  avatarColor: string;
  initials: string;
}

export interface GoogleAccountPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAccount: (email: string, name: string) => void;
}

const DEFAULT_ACCOUNTS: GoogleAccount[] = [
  {
    name: 'Alex Mercer',
    email: 'alex.mercer.google@gmail.com',
    avatarColor: '#4285F4',
    initials: 'A',
  },
  {
    name: 'Mohit Garg',
    email: 'mohit.garg.dev@gmail.com',
    avatarColor: '#EA4335',
    initials: 'M',
  },
];

function CloseIcon({ size = 18, color = '#94A3B8' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function PlusIcon({ size = 20, color = '#EBC77C' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5V19M5 12H19" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export default function GoogleAccountPickerModal({
  visible,
  onClose,
  onSelectAccount,
}: GoogleAccountPickerModalProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  if (!visible) return null;

  const handleCustomSubmit = () => {
    if (!customEmail.trim()) return;
    const finalName = customName.trim() || customEmail.split('@')[0];
    onSelectAccount(customEmail.trim(), finalName);
    setShowCustomInput(false);
    setCustomName('');
    setCustomEmail('');
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalCard}>
              {/* Header Close & Google Branding */}
              <View style={styles.topBar}>
                <View style={styles.brandingRow}>
                  <View style={styles.googleIconBox}>
                    <Image
                      source={IMAGES.googleLogo}
                      style={styles.googleLogo}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.headerTitle}>Sign in with Google</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={styles.closeBtn}
                >
                  <CloseIcon size={18} color="#A19A8E" />
                </TouchableOpacity>
              </View>

              <Text style={styles.subTitle}>
                Choose an account to continue to <Text style={styles.brandBold}>Destiny Protocol</Text>
              </Text>

              <ScrollView style={{ maxHeight: height * 0.45 }} showsVerticalScrollIndicator={false}>
                {/* Predefined Accounts */}
                {DEFAULT_ACCOUNTS.map((acc, index) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.75}
                    style={styles.accountRow}
                    onPress={() => onSelectAccount(acc.email, acc.name)}
                  >
                    <View style={[styles.avatarCircle, { backgroundColor: acc.avatarColor }]}>
                      <Text style={styles.avatarText}>{acc.initials}</Text>
                    </View>
                    <View style={styles.accountDetails}>
                      <Text style={styles.accountName}>{acc.name}</Text>
                      <Text style={styles.accountEmail}>{acc.email}</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Add Another Account Toggle */}
                {!showCustomInput ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={styles.addAccountRow}
                    onPress={() => setShowCustomInput(true)}
                  >
                    <View style={styles.addIconCircle}>
                      <PlusIcon size={18} color="#EBC77C" />
                    </View>
                    <Text style={styles.addAccountText}>Use another account</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.customFormBox}>
                    <Text style={styles.customFormTitle}>Enter Google Account Details</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Display Name (e.g. Rahul Sharma)"
                      placeholderTextColor="#6E675E"
                      value={customName}
                      onChangeText={setCustomName}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Google Email (e.g. rahul@gmail.com)"
                      placeholderTextColor="#6E675E"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={customEmail}
                      onChangeText={setCustomEmail}
                    />
                    <View style={styles.customActionRow}>
                      <TouchableOpacity
                        style={styles.cancelCustomBtn}
                        onPress={() => setShowCustomInput(false)}
                      >
                        <Text style={styles.cancelCustomText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.submitCustomBtn}
                        onPress={handleCustomSubmit}
                      >
                        <Text style={styles.submitCustomText}>Continue</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={styles.footerInfo}>
                <Text style={styles.footerText}>
                  To continue, Google will share your name, email address, and profile picture with Destiny Protocol.
                </Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#101117',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(228, 184, 93, 0.35)',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  googleLogo: {
    width: 16,
    height: 16,
  },
  headerTitle: {
    color: '#F8F3EA',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  closeBtn: {
    padding: 6,
  },
  subTitle: {
    color: '#9E978C',
    fontSize: 13.5,
    marginBottom: 20,
    fontFamily: FONTS.light,
  },
  brandBold: {
    color: '#EBC77C',
    fontWeight: '600',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181A24',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    color: '#F0ECE1',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  accountEmail: {
    color: '#8A847B',
    fontSize: 13,
    marginTop: 2,
    fontFamily: FONTS.light,
  },
  addAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(235, 199, 124, 0.06)',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(235, 199, 124, 0.25)',
    marginBottom: 12,
  },
  addIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(235, 199, 124, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  addAccountText: {
    color: '#EBC77C',
    fontSize: 14.5,
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  customFormBox: {
    backgroundColor: '#181A24',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(235, 199, 124, 0.3)',
    marginBottom: 12,
  },
  customFormTitle: {
    color: '#EBC77C',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#101117',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F0ECE1',
    fontSize: 14,
    marginBottom: 10,
  },
  customActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  cancelCustomBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
  },
  cancelCustomText: {
    color: '#9E978C',
    fontSize: 14,
  },
  submitCustomBtn: {
    backgroundColor: '#EBC77C',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  submitCustomText: {
    color: '#101117',
    fontSize: 14,
    fontWeight: '600',
  },
  footerInfo: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  footerText: {
    color: '#6E675E',
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: FONTS.light,
  },
});
