import React from 'react';
import HeaderDarkGold from './HeaderDarkGold';

export interface DashboardHeaderProps {
  userInitials?: string;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  navigation?: any;
}

export default function DashboardHeader({
  userInitials,
  onMenuPress,
  onNotificationPress,
  onProfilePress,
  navigation,
}: DashboardHeaderProps) {
  return (
    <HeaderDarkGold
      userInitials={userInitials}
      onMenuPress={onMenuPress}
      onNotificationPress={onNotificationPress}
      onAvatarPress={onProfilePress}
      navigation={navigation}
    />
  );
}
