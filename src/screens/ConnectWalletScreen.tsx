import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeftIcon,
  WalletIcon,
  ShieldCheckIcon,
  LockIcon,
  ArrowRightIcon,
} from '../components/icons';

import TopographyBackground from '../components/TopographyBackground';

export interface ConnectWalletScreenProps {
  navigation: any;
}

function CircleCheckIcon({ size = 20, color = '#DFB05B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
      <Path d="M8 12L11 15L16 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function ConnectWalletScreen({ navigation }: ConnectWalletScreenProps) {
  const handleChooseWallet = () => {
    Alert.alert(
      'Connect Web3 Wallet',
      'Select a Wallet to connect:',
      [
        { text: 'MetaMask', onPress: () => Alert.alert('Connected', 'MetaMask wallet connected successfully!') },
        { text: 'Trust Wallet', onPress: () => Alert.alert('Connected', 'Trust Wallet connected successfully!') },
        { text: 'Coinbase Wallet', onPress: () => Alert.alert('Connected', 'Coinbase Wallet connected successfully!') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

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

        <Text style={styles.headerTitle}>Connect Wallet</Text>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Center Emblem Hero Graphic */}
        <View style={styles.heroCircleWrapper}>
          <View style={styles.heroCircle}>
            <WalletIcon size={40} color="#DFB05B" />
          </View>
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.heroTitle}>Connect your wallet</Text>
        <Text style={styles.heroSubtitle}>
          Your wallet signs the encrypted capsule that anchors each property registration on-chain. One wallet, one identity, infinite property capsules.
        </Text>

        {/* 3 Security Feature Cards */}
        <View style={styles.cardsWrapper}>
          {/* Card 1: Non-custodial */}
          <View style={styles.featureCard}>
            <View style={styles.iconCircle}>
              <ShieldCheckIcon size={20} color="#DFB05B" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.cardTitle}>Non-custodial</Text>
              <Text style={styles.cardSubtitle}>
                We never see or store your private key. You sign locally; we just verify.
              </Text>
            </View>
          </View>

          {/* Card 2: One-time signature */}
          <View style={styles.featureCard}>
            <View style={styles.iconCircle}>
              <LockIcon size={20} color="#DFB05B" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.cardTitle}>One-time signature</Text>
              <Text style={styles.cardSubtitle}>
                A free message-signing request — no gas, no transaction.
              </Text>
            </View>
          </View>

          {/* Card 3: Linked to your verified identity */}
          <View style={styles.featureCard}>
            <View style={styles.iconCircle}>
              <CircleCheckIcon size={20} color="#DFB05B" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.cardTitle}>Linked to your verified identity</Text>
              <Text style={styles.cardSubtitle}>
                Your wallet inherits the trust of your verified Aadhaar.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Fixed Bottom Action Button */}
      <View style={styles.bottomBarContainer}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.chooseWalletBtn}
          onPress={handleChooseWallet}
        >
          <Text style={styles.chooseWalletText}>Choose a Wallet</Text>
          <ArrowRightIcon size={18} color="#1A1405" />
        </TouchableOpacity>
      </View>
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
  heroCircleWrapper: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  heroCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1C180E',
    borderWidth: 1.5,
    borderColor: 'rgba(223, 176, 91, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#717D96',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
    marginBottom: 28,
  },
  cardsWrapper: {
    marginTop: 4,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0E1017',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.38)',
    padding: 18,
    marginBottom: 14,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C180E',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  textCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#717D96',
    lineHeight: 16,
  },
  bottomBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#08090C',
  },
  chooseWalletBtn: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 18,
    backgroundColor: '#DFB05B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chooseWalletText: {
    color: '#1A1405',
    fontSize: 16,
    fontWeight: '600',
  },
});
