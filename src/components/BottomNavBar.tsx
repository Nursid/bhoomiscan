import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HomeIcon, LockIcon, UserGroupIcon, ActivityPulseIcon, SettingsCogIcon } from './icons';

export interface BottomNavBarProps {
  activeTab?: string;
  onTabPress?: (tabName: string) => void;
}

export default function BottomNavBar({
  activeTab = 'Home',
  onTabPress,
}: BottomNavBarProps) {
  const [currentTab, setCurrentTab] = useState(activeTab);

  const tabs = [
    { name: 'Home', icon: HomeIcon },
    { name: 'Vaults', icon: LockIcon },
    { name: 'People', icon: UserGroupIcon },
    { name: 'Activity', icon: ActivityPulseIcon },
    { name: 'Settings', icon: SettingsCogIcon },
  ];

  const handlePress = (tabName: string) => {
    setCurrentTab(tabName);
    if (onTabPress) onTabPress(tabName);
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = currentTab === tab.name;
        const iconColor = isActive ? '#DFB05B' : '#64748B';

        return (
          <TouchableOpacity
            key={tab.name}
            activeOpacity={0.75}
            onPress={() => handlePress(tab.name)}
            style={styles.tabBtn}
          >
            <IconComponent size={20} color={iconColor} />
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#0F1117',
    borderTopWidth: 1,
    borderTopColor: '#222634',
    paddingVertical: 8,
    paddingBottom: 12,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  tabLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '400',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#DFB05B',
    fontWeight: '600',
  },
});
