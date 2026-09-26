import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polygon } from 'react-native-svg';
import { COLORS } from '../theme';

export interface IconProps {
  size?: number;
  color?: string;
}

const wrapIcon = (Component: React.FC<{ size: number; color: string }>) => {
  return ({ size = 24, color = COLORS.textPrimary }: IconProps) => (
    <Component size={size} color={color} />
  );
};

export const AadhaarIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="45" stroke={COLORS.primary} strokeWidth="1.5" strokeDasharray="4,4" />
    <Circle cx="50" cy="50" r="10" fill={COLORS.primary} />
    <Path d="M25 50C25 36.19 36.19 25 50 25C63.81 25 75 36.19 75 50" stroke={color} strokeWidth="4" strokeLinecap="round" />
    <Path d="M33 50C33 40.61 40.61 33 50 33C59.39 33 67 40.61 67 50" stroke={COLORS.primary} strokeWidth="4" strokeLinecap="round" />
    <Path d="M41 50C41 45.03 45.03 41 50 41C54.97 41 59 45.03 59 50" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <Path d="M50 50V80" stroke={COLORS.primary} strokeWidth="5" strokeLinecap="round" />
    <Path d="M42 60C46 64 54 64 58 60" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <Path d="M38 72C44 77 56 77 62 72" stroke={COLORS.primary} strokeWidth="3" strokeLinecap="round" />
  </Svg>
));

export const DigiLockerIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L3 6V12C3 17.52 7.03 22.48 12 24C16.97 22.48 21 17.52 21 12V6L12 2Z" fill="rgba(59, 130, 246, 0.15)" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="9" r="3" stroke={color} strokeWidth="2" />
    <Path d="M12 12V18M12 15H14.5M12 17.5H14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Rect x="8" y="14" width="2" height="2" rx="0.5" fill="#3B82F6" />
  </Svg>
));

export const PanCardIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="4" width="20" height="16" rx="3" stroke={color} strokeWidth="2" />
    <Rect x="5" y="8" width="4" height="3" rx="0.5" fill={COLORS.primary} />
    <Line x1="11" y1="9" x2="19" y2="9" stroke={COLORS.textSecondary} strokeWidth="2" strokeLinecap="round" />
    <Line x1="11" y1="12" x2="17" y2="12" stroke={COLORS.textSecondary} strokeWidth="2" strokeLinecap="round" />
    <Line x1="5" y1="16" x2="13" y2="16" stroke={COLORS.textMuted} strokeWidth="1.5" strokeDasharray="2,2" />
    <Rect x="16" y="14" width="3" height="3" rx="0.5" stroke={COLORS.primary} strokeWidth="1" />
  </Svg>
));

export const RazorpayIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <Path d="M10 90L50 10L90 90H65L50 60L35 90H10Z" fill="rgba(212, 175, 55, 0.1)" stroke={COLORS.primary} strokeWidth="3" strokeLinejoin="round" />
    <Path d="M35 90H10L50 10L62 34L45 68L35 90Z" fill={COLORS.primary} />
    <Path d="M50 60L65 90H90L50 10L42 26L50 60Z" fill="#3B82F6" />
    <Circle cx="50" cy="40" r="6" fill="#FFFFFF" />
  </Svg>
));

export const LandIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M2 12L7 9L13 11L18 8L22 10V21L18 19L13 22L7 20L2 22V12Z" fill="rgba(16, 185, 129, 0.12)" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="7" y1="9" x2="7" y2="20" stroke={COLORS.border} strokeWidth="1.5" />
    <Line x1="13" y1="11" x2="13" y2="22" stroke={COLORS.border} strokeWidth="1.5" />
    <Line x1="18" y1="8" x2="18" y2="19" stroke={COLORS.border} strokeWidth="1.5" />
    <Circle cx="13" cy="7" r="3" fill={COLORS.primary} />
    <Path d="M13 10V14" stroke={COLORS.primary} strokeWidth="2" strokeLinecap="round" />
  </Svg>
));

export const ProfileIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M20 21C20 18.2386 16.4183 16 12 16C7.58172 16 4 18.2386 4 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
));

export const LockIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="11" width="16" height="10" rx="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="15" r="1.5" fill={color} />
  </Svg>
));

export const ShieldCheckIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="rgba(16, 185, 129, 0.15)" stroke={COLORS.success} strokeWidth="2" />
    <Path d="M8 12L11 15L16 9" stroke={COLORS.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const WarningIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polygon points="12,2 22,20 2,20" fill="rgba(245, 158, 11, 0.15)" stroke={COLORS.warning} strokeWidth="2" strokeLinejoin="round" />
    <Line x1="12" y1="9" x2="12" y2="13" stroke={COLORS.warning} strokeWidth="2.5" strokeLinecap="round" />
    <Circle cx="12" cy="17" r="1" fill={COLORS.warning} />
  </Svg>
));

export const EyeIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12S5 4 12 4s11 8 11 8-4 8-12 8-11-8-11-8Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const EyeOffIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.18 3.18m-3.2 1.34A10.14 10.14 0 0 1 12 19c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94M1 1l22 22" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const ChevronRightIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 5L16 12L9 19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const ChevronLeftIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 19L8 12L15 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const LogoutIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 17L21 12L16 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 12H9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const CardIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth="2" />
    <Line x1="2" y1="10" x2="22" y2="10" stroke={color} strokeWidth="2" />
    <Rect x="5" y="14" width="4" height="2" fill={color} />
  </Svg>
));

export const BankIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 22H21" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M6 18V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M10 18V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M14 18V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M18 18V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M12 2L2 7V10H22V7L12 2Z" fill="rgba(212, 175, 55, 0.1)" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const PhoneIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const MailIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="4" width="20" height="16" rx="3" stroke={color} strokeWidth="1.8" />
    <Path d="M22 6L12 13L2 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const UserGroupIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const GlobeIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
    <Path d="M2 12H22" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2617 12 22C9.49872 19.2617 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const ChevronDownIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9L12 15L18 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const CheckSquareIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="4" stroke={color} strokeWidth="2" fill="rgba(212, 175, 55, 0.15)" />
    <Path d="M9 12L11 14L15 9" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const SquareIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="4" stroke={color} strokeWidth="1.8" />
  </Svg>
));

export const ArrowRightIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12H19M19 12L12 5M19 12L12 19" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const BadgeShieldIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L4 6V12C4 17.52 7.4 22.5 12 24C16.6 22.5 20 17.52 20 12V6L12 2Z" fill="rgba(212, 175, 55, 0.1)" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 12L11 14L15 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const BellIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const AwardMedalIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="6" stroke={color} strokeWidth="1.8" />
    <Path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const PlusIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const ActivityPulseIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const SettingsCogIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const HomeIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 22V12h6v10" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const DocumentTextIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const MenuIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
));

export const CubeIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const PieGaugeIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21.21 15.89A10 10 0 1 1 8 2.83" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 12A10 10 0 0 0 12 2v10z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const ScanIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const WalletIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5zm0 0h-4a2 2 0 0 0 0 4h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="16" cy="14" r="1" fill={color} />
  </Svg>
));

export const HelpCircleIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
    <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
));

export const ExternalLinkIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M15 3h6v6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10 14L21 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const CloseCircleIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
    <Path d="M15 9L9 15M9 9L15 15" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));

export const DownloadIcon = wrapIcon(({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 10L12 15L17 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 15V3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
));
