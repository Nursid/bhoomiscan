import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import CustomDrawerContent from '../components/CustomDrawerContent';
import CustomTabBar from '../components/CustomTabBar';

import {
  HomeIcon,
  LockIcon,
  UserGroupIcon,
  ActivityPulseIcon,
  SettingsCogIcon,
} from '../components/icons';

// Screen Imports
import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import { LoginScreen, SignUpScreen } from '../screens/AuthScreens';
import DashboardScreen from '../screens/DashboardScreen';
import VaultsScreen from '../screens/VaultsScreen';
import PeopleScreen from '../screens/PeopleScreen';
import ActivityScreen from '../screens/ActivityScreen';
import SettingsScreen from '../screens/SettingsScreen';
import VerifiedIdentityScreen from '../screens/VerifiedIdentityScreen';
import ConnectWalletScreen from '../screens/ConnectWalletScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AadhaarVerificationScreen from '../screens/AadhaarVerificationScreen';
import PanVerificationScreen from '../screens/PanVerificationScreen';
import RazorpayPaymentScreen from '../screens/RazorpayPaymentScreen';
import LandRegistrationScreen from '../screens/LandRegistrationScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

export const routes = {
  NAVIGATION_AUTH_LOADING_STACK: 'NAVIGATION_AUTH_LOADING_STACK',
  NAVIGATION_AUTH_LOADING_SCREEN: 'NAVIGATION_AUTH_LOADING_SCREEN',
  AUTHENTICATION_STACK: 'AUTHENTICATION_STACK',
  NONAUTHENTICATION_STACK: 'NONAUTHENTICATION_STACK',
  TAB_STACK: 'TAB_STACK',
  Drawer_Stack: 'Drawer_Stack',
  MainTabs: 'MainTabs',
  Splash: 'Splash',
  Welcome: 'Welcome',
  Login: 'Login',
  SignUp: 'SignUp',
  Home: 'Home',
  Dashboard: 'Dashboard',
  Vaults: 'Vaults',
  People: 'People',
  Activity: 'Activity',
  Settings: 'Settings',
  VerifiedIdentity: 'VerifiedIdentity',
  ConnectWallet: 'ConnectWallet',
  Profile: 'Profile',
  AadhaarVerification: 'AadhaarVerification',
  PanVerification: 'PanVerification',
  RazorpayPayment: 'RazorpayPayment',
  LandRegistration: 'LandRegistration',
  Notifications: 'Notifications',
};

export const horizontalAnimation = {
  gestureDirection: 'horizontal' as const,
  cardStyleInterpolator: ({ current, layouts }: any) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
      },
    };
  },
};

export const verticalAnimation = {
  gestureDirection: 'vertical' as const,
  cardStyleInterpolator: ({ current, layouts }: any) => {
    return {
      cardStyle: {
        transform: [
          {
            translateY: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.height, 0],
            }),
          },
        ],
      },
    };
  },
};

function renderTabBar(props: any) {
  return <CustomTabBar {...props} />;
}

function renderDrawerContent(props: any) {
  return <CustomDrawerContent {...props} />;
}

// Bottom Tab Navigator Component
export function TAB_STACK() {
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
        lazy: false,
      }}
    >
      <Tab.Screen
        name={routes.Home}
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color }) => <HomeIcon size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name={routes.Vaults}
        component={VaultsScreen}
        options={{
          tabBarIcon: ({ color }) => <LockIcon size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name={routes.People}
        component={PeopleScreen}
        options={{
          tabBarIcon: ({ color }) => <UserGroupIcon size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name={routes.Activity}
        component={ActivityScreen}
        options={{
          tabBarIcon: ({ color }) => <ActivityPulseIcon size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name={routes.Settings}
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color }) => <SettingsCogIcon size={20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Drawer Navigator Component
export function Drawer_Stack() {
  return (
    <Drawer.Navigator
      drawerContent={renderDrawerContent}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: {
          width: 280,
          backgroundColor: '#050608',
        },
      }}
    >
      <Drawer.Screen name="Tabs" component={TAB_STACK} />
    </Drawer.Navigator>
  );
}

export function AUTHENTICATION_STACK() {
  return (
    <Stack.Navigator
      initialRouteName={routes.Splash}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#050608' },
      }}
    >
      <Stack.Screen name={routes.Splash} component={SplashScreen} />
      <Stack.Screen name={routes.Welcome} component={WelcomeScreen} />
      <Stack.Screen name={routes.Login} component={LoginScreen} />
      <Stack.Screen name={routes.SignUp} component={SignUpScreen} />
    </Stack.Navigator>
  );
}

export function NONAUTHENTICATION_STACK() {
  return (
    <Stack.Navigator
      initialRouteName={routes.MainTabs}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#050608' },
      }}
    >
      <Stack.Screen name={routes.MainTabs} component={Drawer_Stack} />
      <Stack.Screen name={routes.Splash} component={SplashScreen} />
      <Stack.Screen name={routes.Welcome} component={WelcomeScreen} />
      <Stack.Screen name={routes.VerifiedIdentity} component={VerifiedIdentityScreen} />
      <Stack.Screen name={routes.ConnectWallet} component={ConnectWalletScreen} />
      <Stack.Screen name={routes.Profile} component={ProfileScreen} />
      <Stack.Screen name={routes.AadhaarVerification} component={AadhaarVerificationScreen} />
      <Stack.Screen name={routes.PanVerification} component={PanVerificationScreen} />
      <Stack.Screen name={routes.RazorpayPayment} component={RazorpayPaymentScreen} />
      <Stack.Screen name={routes.LandRegistration} component={LandRegistrationScreen} />
      <Stack.Screen name={routes.Notifications} component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

const RootStack = ({ user }: { user?: any }) => (
  <Stack.Navigator
    initialRouteName={routes.Splash}
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#050608' },
    }}
  >
    <Stack.Screen name={routes.Splash} component={SplashScreen} />
    <Stack.Screen name={routes.Login} component={LoginScreen} />
    <Stack.Screen name={routes.SignUp} component={SignUpScreen} />
    <Stack.Screen name={routes.Welcome} component={WelcomeScreen} />
    <Stack.Screen name={routes.MainTabs} component={Drawer_Stack} />
    <Stack.Screen name={routes.VerifiedIdentity} component={VerifiedIdentityScreen} />
    <Stack.Screen name={routes.ConnectWallet} component={ConnectWalletScreen} />
    <Stack.Screen name={routes.Profile} component={ProfileScreen} />
    <Stack.Screen name={routes.AadhaarVerification} component={AadhaarVerificationScreen} />
    <Stack.Screen name={routes.PanVerification} component={PanVerificationScreen} />
    <Stack.Screen name={routes.RazorpayPayment} component={RazorpayPaymentScreen} />
    <Stack.Screen name={routes.LandRegistration} component={LandRegistrationScreen} />
    <Stack.Screen name={routes.Notifications} component={NotificationsScreen} />
  </Stack.Navigator>
);

export { RootStack };
export default RootStack;
