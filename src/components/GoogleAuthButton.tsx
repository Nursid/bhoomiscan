import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { IMAGES } from '../assets';
import { COLORS, FONTS } from '../theme';

export interface GoogleAuthButtonProps {
  onPress?: () => void;
  disabled?: boolean;
}

export default function GoogleAuthButton({ onPress, disabled = false }: GoogleAuthButtonProps) {
  return (
    <View style={styles.container}>
      {/* OR Divider Line */}
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.line} />
      </View>

      {/* Social Google Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={disabled}
        style={styles.button}
      >
        <View style={styles.iconCircle}>
          <Image
            source={IMAGES.googleLogo}
            style={styles.googleIcon}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.buttonText}>Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    marginBottom: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(125, 93, 42, 0.34)',
  },
  orText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#81796E',
    marginHorizontal: 18,
    letterSpacing: 3,
    fontFamily: FONTS.light,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101014',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(125, 93, 42, 0.42)',
    height: 58,
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  googleIcon: {
    width: 16,
    height: 16,
  },
  buttonText: {
    color: '#F7F1E7',
    fontSize: 15.5,
    fontWeight: '500',
    fontFamily: FONTS.medium,
  },
});
