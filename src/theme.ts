import { Platform } from 'react-native';

export const COLORS = {
  background: '#050608', // Deep Pitch Obsidian Black
  backgroundAlt: '#090A0E', // Secondary Obsidian Layer
  surface: '#0A0C12', // Rich Obsidian Gloss Surface Card
  surfaceElevated: '#121520', // Elevated Obsidian Card
  surfaceBorder: 'rgba(223, 176, 91, 0.42)', // Polished Metallic Gold Hairline Border
  surfaceBorderLight: 'rgba(223, 176, 91, 0.2)', // Subtle Hairline Border

  // Metallic Gold Color Suite
  primary: '#DFB05B', // Core Polished Gold
  primaryDark: '#B88E3C', // Deep Antique Bronze Gold
  primaryLight: '#F5D38F', // Champagne Bright Gold
  goldHighlight: '#FFE5A4', // Lustrous Gold Sheen
  goldGlow: 'rgba(223, 176, 91, 0.26)', // Soft Radiant Gold Halo Glow

  // Text Colors
  textPrimary: '#FFFFFF', // Pure Crisp White
  textSecondary: '#C5C9D6', // Soft Platinum White/Secondary Text
  textMuted: '#798096', // Readable Metallic Muted Text
  textGold: '#DFB05B', // Highlight Gold Text

  // Status & Utility Colors
  success: '#10B981', // Muted Emerald Green
  warning: '#F59E0B', // Amber Warning
  danger: '#EF4444', // Crimson Red
  border: 'rgba(223, 176, 91, 0.26)',

  // Gold Badge Tokens
  goldBadgeBg: '#1C160B', // Warm Translucent Gold-Tinted Background
  goldBadgeBorder: 'rgba(223, 176, 91, 0.48)', // Rich Gold Badge Border
};

export const FONTS = {
  // Premium Serif for Headings and Brand Identity
  heading: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'serif',
  }),
  // Clean Sans-Serif-Medium for buttons, tabs, input values, and subheadings
  medium: Platform.select({
    ios: 'AvenirNext-Medium',
    android: 'sans-serif-medium',
    default: 'sans-serif-medium',
  }),
  // Elegant light font for labels, secondary texts, and body
  light: Platform.select({
    ios: 'AvenirNext-Regular',
    android: 'sans-serif-light',
    default: 'sans-serif-light',
  }),
  // Extra light/thin font for very premium large headings/numbers
  thin: Platform.select({
    ios: 'AvenirNext-UltraLight',
    android: 'sans-serif-thin',
    default: 'sans-serif-thin',
  }),
  // Regular font
  regular: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    default: 'sans-serif',
  }),
};

export const PREMIUM_CARD_BOX = {
  backgroundColor: '#0A0C12', // Black Gloss Shine
  borderRadius: 20,
  borderWidth: 1.2,
  borderColor: 'rgba(223, 176, 91, 0.42)', // Polished Gold Outer Border
  borderTopColor: 'rgba(255, 238, 178, 0.75)', // Specular Lite Gold Sheen Top Border
  shadowColor: '#DFB05B', // Lite Gold Ambient Glow Shadow
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.22,
  shadowRadius: 14,
  elevation: 6,
};

export const GLOBAL_STYLES = {
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: PREMIUM_CARD_BOX,
};
