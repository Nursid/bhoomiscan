import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import RootStack from './stacks';
import NavigationService from './navigationService';

export const DestinyTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#DFB05B',
    background: '#050608',
    card: '#050608',
    text: '#FFFFFF',
    border: 'rgba(223, 176, 91, 0.15)',
    notification: '#EF4444',
  },
};

interface NavigatorProps {
  user: any;
}

const Navigator = ({ user }: NavigatorProps) => {
  return (
    <NavigationContainer
      theme={DestinyTheme}
      ref={(navigatorRef: any) => {
        NavigationService.setTopLevelNavigator(navigatorRef);
      }}
    >
      <RootStack user={user} />
    </NavigationContainer>
  );
};

export default Navigator;
