import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MenuIcon,
  BellIcon,
  HomeIcon,
  LockIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  DocumentTextIcon,
  SettingsCogIcon,
  ChevronRightIcon,
  CloseCircleIcon,
} from './icons';
import { DestinyBrandMark } from './DestinyBrand';
import { FONTS } from '../theme';
import { getCachedProfile } from '../services/profileCache';

export interface HeaderDarkGoldProps {
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  onAvatarPress?: () => void;
  userInitials?: string;
  navigation?: any;
}

export default function HeaderDarkGold({
  onMenuPress,
  onNotificationPress,
  onAvatarPress,
  userInitials,
  navigation,
}: HeaderDarkGoldProps) {
  const [initials, setInitials] = useState<string>(userInitials || 'SG');
  const [showNavMenu, setShowNavMenu] = useState(false);

  useEffect(() => {
    if (userInitials) {
      setInitials(userInitials);
      return;
    }
    const resolveInitials = async () => {
      try {
        const cached = getCachedProfile();
        let rawName = cached?.verifications?.aadhaar?.name || cached?.fullName || '';

        if (!rawName) {
          const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
          if (activeUserStr) {
            const user = JSON.parse(activeUserStr);
            rawName = user.displayName || user.fullName || user.email || '';
          }
        }

        if (rawName) {
          const parts = rawName.trim().split(' ');
          if (parts.length >= 2) {
            setInitials((parts[0][0] + parts[1][0]).toUpperCase());
          } else if (parts[0].length >= 2) {
            setInitials(parts[0].substring(0, 2).toUpperCase());
          } else {
            setInitials(parts[0][0].toUpperCase());
          }
        }
      } catch {
        setInitials('SG');
      }
    };
    resolveInitials();
  }, [userInitials]);

  const handleMenuTap = () => {
    if (onMenuPress) {
      onMenuPress();
    } else if (navigation && typeof navigation.openDrawer === 'function') {
      navigation.openDrawer();
    } else {
      setShowNavMenu(true);
    }
  };

  const handleNotifTap = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else if (navigation && typeof navigation.navigate === 'function') {
      const parentNavigation = typeof navigation.getParent === 'function' ? navigation.getParent() : null;
      if (parentNavigation && typeof parentNavigation.navigate === 'function') {
        parentNavigation.navigate('Notifications');
      } else {
        navigation.navigate('Notifications');
      }
    } else {
      navigateTo('Notifications');
    }
  };

  const navigateTo = (screenName: string) => {
    setShowNavMenu(false);
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate(screenName);
    }
  };

  return (
    <View style={styles.headerContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#050608" />

      {/* Left Menu Circle Button */}
      <View style={styles.leftGroup}>
        <TouchableOpacity activeOpacity={0.75} style={styles.circleBtn} onPress={handleMenuTap}>
          <MenuIcon size={18} color="#DFB05B" />
        </TouchableOpacity>

        {/* Center-Left Interlocking Gold DNA Destiny Protocol Brand */}
        <View style={styles.brandLockup}>
          <DestinyBrandMark width={70} height={65} />
          <View style={styles.brandTextCol}>
            <Text style={styles.brandTitle}>DESTINY</Text>
            <View style={styles.protocolRow}>
              <View style={styles.line} />
              <Text style={styles.brandSub}>PROTOCOL</Text>
              <View style={styles.line} />
            </View>
          </View>
        </View>
      </View>

      {/* Right Action Group: Bell + Avatar Pill */}
      <View style={styles.rightGroup}>
        <TouchableOpacity activeOpacity={0.75} style={styles.circleBtn} onPress={handleNotifTap}>
          <BellIcon size={18} color="#DFB05B" />
          <View style={styles.notifDot} />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.75} style={styles.avatarBtn} onPress={onAvatarPress}>
          <Text style={styles.avatarText}>{initials}</Text>
        </TouchableOpacity>
      </View>

      {/* DROPDOWN NAVIGATION MENU MODAL */}
      <Modal visible={showNavMenu} transparent animationType="fade" onRequestClose={() => setShowNavMenu(false)}>
        <TouchableWithoutFeedback onPress={() => setShowNavMenu(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.navMenuCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>NAVIGATION MENU</Text>
                  <TouchableOpacity onPress={() => setShowNavMenu(false)}>
                    <CloseCircleIcon size={20} color="#717D96" />
                  </TouchableOpacity>
                </View>

                <View style={styles.menuList}>
                  <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Home')}>
                    <HomeIcon size={18} color="#DFB05B" />
                    <Text style={styles.menuText}>Dashboard</Text>
                    <ChevronRightIcon size={14} color="#525866" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Vaults')}>
                    <LockIcon size={18} color="#DFB05B" />
                    <Text style={styles.menuText}>Vaults & Deeds</Text>
                    <ChevronRightIcon size={14} color="#525866" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('LandRegistration')}>
                    <HomeIcon size={18} color="#DFB05B" />
                    <Text style={styles.menuText}>Register Property</Text>
                    <ChevronRightIcon size={14} color="#525866" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('VerifiedIdentity')}>
                    <ShieldCheckIcon size={18} color="#DFB05B" />
                    <Text style={styles.menuText}>Verified Identity (KYC)</Text>
                    <ChevronRightIcon size={14} color="#525866" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('People')}>
                    <UserGroupIcon size={18} color="#DFB05B" />
                    <Text style={styles.menuText}>Beneficiaries & Claims</Text>
                    <ChevronRightIcon size={14} color="#525866" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Activity')}>
                    <DocumentTextIcon size={18} color="#DFB05B" />
                    <Text style={styles.menuText}>Activity Logs & Time</Text>
                    <ChevronRightIcon size={14} color="#525866" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Settings')}>
                    <SettingsCogIcon size={18} color="#DFB05B" />
                    <Text style={styles.menuText}>Settings & Security</Text>
                    <ChevronRightIcon size={14} color="#525866" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#050608',
    paddingHorizontal: 10,
    marginTop: -10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(223, 176, 91, 0.15)',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.35)',
    backgroundColor: '#0E1017',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.2,
    borderColor: '#DFB05B',
    backgroundColor: '#1C160B',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  avatarText: {
    color: '#DFB05B',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.medium,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  brandTextCol: {
    marginLeft: 6,
    alignItems: 'flex-start',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DFB05B',
    letterSpacing: 3,
    fontFamily: FONTS.heading,
    lineHeight: 17,
  },
  protocolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  line: {
    width: 10,
    height: 1,
    backgroundColor: '#B88E3C',
  },
  brandSub: {
    fontSize: 8,
    fontWeight: '700',
    color: '#B88E3C',
    letterSpacing: 2.2,
    marginHorizontal: 3,
  },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  navMenuCard: {
    backgroundColor: '#0E1017',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#DFB05B',
    padding: 18,
    shadowColor: '#DFB05B',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(223, 176, 91, 0.2)',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DFB05B',
    letterSpacing: 1.5,
  },
  menuList: {},
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  menuText: {
    flex: 1,
    marginLeft: 12,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
