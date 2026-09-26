import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';

const { width } = Dimensions.get('window');

export interface CustomAlertModalProps {
  visible: boolean;
  type?: 'error' | 'success' | 'warning' | 'info';
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

function ErrorCrossIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2" fill="rgba(239, 68, 68, 0.15)" />
      <Path d="M15 9L9 15M9 9L15 15" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function SuccessCheckIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke="#10B981" strokeWidth="2" fill="rgba(16, 185, 129, 0.15)" />
      <Path d="M8 12L11 15L16 9" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CloseCrossIcon({ size = 18, color = '#94A3B8' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export default function CustomAlertModal({
  visible,
  type = 'error',
  title,
  message,
  buttonText = 'Close',
  onClose,
}: CustomAlertModalProps) {
  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalCard}>
              {/* Top Right Close Button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                style={styles.closeBtn}
              >
                <CloseCrossIcon size={16} color="#94A3B8" />
              </TouchableOpacity>

              {/* Center Type Badge Icon */}
              <View style={styles.iconCircle}>
                {type === 'error' ? (
                  <ErrorCrossIcon size={56} />
                ) : (
                  <SuccessCheckIcon size={56} />
                )}
              </View>

              {/* Title & Message */}
              <Text style={styles.titleText}>{title}</Text>
              <Text style={styles.messageText}>{message}</Text>

              {/* Divider Line */}
              <View style={styles.divider} />

              {/* Gold Gradient Action Button */}
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={onClose}
                style={styles.actionButton}
              >
                <Text style={styles.actionButtonText}>{buttonText}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: width * 0.86,
    backgroundColor: '#161822',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.45)',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    zIndex: 10,
  },
  iconCircle: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#222634',
    marginBottom: 16,
  },
  actionButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#DFB05B',
    borderWidth: 1,
    borderColor: '#F5D38F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  actionButtonText: {
    color: '#1A1405',
    fontSize: 16,
    fontWeight: '600',
  },
});
