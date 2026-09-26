import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../theme';

export interface AuthTabSwitcherProps {
  activeTab: 'Login' | 'SignUp';
  onTabChange: (tab: 'Login' | 'SignUp') => void;
}

export default function AuthTabSwitcher({ activeTab, onTabChange }: AuthTabSwitcherProps) {
  const tabs: Array<'Login' | 'SignUp'> = ['Login', 'SignUp'];

  return (
    <View style={styles.container}>
      {tabs.map(tab => {
        const selected = activeTab === tab;
        const label = tab === 'SignUp' ? 'Sign Up' : 'Login';

        return (
          <Pressable
            key={tab}
            onPress={() => onTabChange(tab)}
            style={[styles.tabButton, selected && styles.activeTab]}
          >
            <Text style={[styles.tabText, selected ? styles.activeTabText : styles.inactiveTabText]}>
              {label}
            </Text>
            {selected && <View style={styles.activeUnderline} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0A0C10',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.4)',
    padding: 4,
    marginTop: 18,
    marginBottom: 14,
    height: 56,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#1C160B',
    borderWidth: 1.2,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  inactiveTabText: {
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 6,
    width: 26,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.primary,
  },
});
