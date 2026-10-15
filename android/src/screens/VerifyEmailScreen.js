import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useAuthStore from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useTheme, SIZES, SHADOW } from '../theme';
import { resendVerification } from '../api/auth/authApi';
import { getErrorMessage } from '../api/client';

export default function VerifyEmailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const { email, role } = route.params || {};

  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const isLoading = useAuthStore((s) => s.isLoading);
  const showToast = useNotificationStore((s) => s.showToast);
  const showSuccessModal = useNotificationStore((s) => s.showSuccessModal);

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  // Resend Timer Countdown
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  const handleOtpChange = (text, index) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (cleanText.length > 1) {
      // Handle paste of 6 digits
      const pasted = cleanText.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      inputRefs[5].current?.focus();
      return;
    }

    newDigits[index] = cleanText;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (cleanText && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) {
      showToast('warning', 'Incomplete Code', 'Please enter all 6 digits of the OTP code.');
      return;
    }

    try {
      await verifyEmail(email, fullCode);
      showSuccessModal(
        'Email Verified!',
        `Your ${role === 'partner' ? 'Service Partner' : 'Customer'} account has been verified successfully. Welcome to Purakam!`,
        'ACCOUNT VERIFIED'
      );
    } catch (error) {
      const message = error?.response?.data?.detail || error.message || 'Verification failed';
      showToast('error', 'Verification Failed', typeof message === 'string' ? message : 'Invalid OTP code');
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      await resendVerification(email);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs[0].current?.focus();
      setResendTimer(60);
      showToast('success', 'Code Resent', 'If your account is awaiting verification, a new 6-digit code is on its way.');
    } catch (error) {
      showToast('error', 'Resend Failed', getErrorMessage(error, 'Failed to resend verification code.'));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Header */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="email-check-outline" size={42} color="#22C55E" />
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We have sent a 6-digit OTP verification code to:{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          {/* 6 OTP Boxes */}
          <View style={styles.otpGrid}>
            {otpDigits.map((digit, index) => (
              <TextInput
                key={index}
                ref={inputRefs[index]}
                style={[
                  styles.otpInput,
                  digit ? styles.otpInputFilled : null,
                ]}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={6} // Allows paste
                selectTextOnFocus
                textAlign="center"
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.verifyButton, isLoading && styles.disabledBtn]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.accentDark} />
            ) : (
              <>
                <Text style={styles.verifyButtonText}>Verify & Complete Registration</Text>
                <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.accentDark} />
              </>
            )}
          </TouchableOpacity>

          {/* Resend Link */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0}>
              <Text style={[styles.resendLink, resendTimer > 0 && styles.disabledResend]}>
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingHorizontal: SIZES.padding, paddingTop: 20, paddingBottom: 40, alignItems: 'center' },
    backButton: { alignSelf: 'flex-start', marginBottom: 20, padding: 4 },
    iconCircle: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: 'rgba(34, 197, 94, 0.12)',
      borderWidth: 2,
      borderColor: 'rgba(34, 197, 94, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    emailText: { color: colors.primary, fontWeight: '700' },
    devBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.3)',
      borderRadius: 16,
      padding: 14,
      gap: 10,
      width: '100%',
      marginBottom: 24,
    },
    devBannerTitle: { fontSize: 11, fontWeight: '800', color: '#F59E0B', textTransform: 'uppercase' },
    devBannerCode: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
    otpGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 32, gap: 8 },
    otpInput: {
      flex: 1,
      height: 56,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    otpInputFilled: {
      borderColor: '#22C55E',
      backgroundColor: 'rgba(34, 197, 94, 0.06)',
    },
    verifyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#22C55E',
      borderRadius: 16,
      paddingVertical: 16,
      width: '100%',
      gap: 8,
      marginBottom: 24,
      ...SHADOW,
    },
    verifyButtonText: { fontSize: 16, fontWeight: '800', color: colors.accentDark },
    disabledBtn: { opacity: 0.6 },
    resendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    resendText: { color: colors.textSecondary, fontSize: 14 },
    resendLink: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    disabledResend: { color: colors.textMuted },
  });
