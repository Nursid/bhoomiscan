import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ViewStyle,
  KeyboardTypeOptions,
} from 'react-native';
import { EyeIcon, EyeOffIcon, IconProps } from './icons';
import { COLORS, FONTS } from '../theme';

export interface CustomInputFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  leftIcon?: React.FC<IconProps>;
  isPassword?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  error?: string;
  maxLength?: number;
  containerStyle?: ViewStyle;
}

export default function CustomInputField({
  label,
  value,
  onChangeText,
  placeholder,
  leftIcon: LeftIcon,
  isPassword = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  editable = true,
  error = '',
  maxLength,
  containerStyle,
}: CustomInputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(isPassword);
  const inputRef = useRef<TextInput>(null);

  const handleCardPress = () => {
    if (editable && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const isValEmpty = !value || value.length === 0;

  return (
    <TouchableWithoutFeedback onPress={handleCardPress}>
      <View style={[styles.wrapper, containerStyle]}>
        <View
          style={[
            styles.inputCard,
            isFocused && styles.inputCardFocused,
            error.length > 0 && styles.inputCardError,
          ]}
        >
          {LeftIcon && (
            <View style={styles.leftIconWrapper}>
              <LeftIcon size={20} color={isFocused ? COLORS.primaryLight : COLORS.primary} />
            </View>
          )}

          <View style={styles.inputContent}>
            {label && <Text style={styles.label}>{label}</Text>}

            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={secureTextEntry}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              editable={editable}
              maxLength={maxLength}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={styles.textInput}
            />
          </View>

          {isPassword && !isValEmpty && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSecureTextEntry(!secureTextEntry)}
              style={styles.rightIconWrapper}
            >
              {secureTextEntry ? (
                <EyeIcon size={20} color={COLORS.primary} />
              ) : (
                <EyeOffIcon size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {error.length > 0 && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1017',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.32)',
    paddingHorizontal: 20,
    paddingVertical: 11,
    minHeight: 66,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  inputCardFocused: {
    borderColor: COLORS.primary,
    backgroundColor: '#141722',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  inputCardError: {
    borderColor: COLORS.danger,
  },
  leftIconWrapper: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContent: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: FONTS.light,
    letterSpacing: 0.5,
  },
  textInput: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    padding: 0,
    margin: 0,
    fontFamily: FONTS.medium,
  },
  rightIconWrapper: {
    padding: 6,
    marginLeft: 10,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
