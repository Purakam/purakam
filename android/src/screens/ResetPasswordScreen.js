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
import { getErrorMessage } from '../api/client';

export default function ResetPasswordScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const { email } = route.params || {};

  const resetPassword = useAuthStore((s) => s.resetPassword);
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const isLoading = useAuthStore((s) => s.isLoading);
  const showToast = useNotificationStore((s) => s.showToast);

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  const handleOtpChange = (text, index) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (cleanText.length > 1) {
      const pasted = cleanText.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) newDigits[i] = pasted[i] || '';
      setOtpDigits(newDigits);
      inputRefs[5].current?.focus();
      return;
    }

    newDigits[index] = cleanText;
    setOtpDigits(newDigits);
    if (cleanText && index < 5) inputRefs[index + 1].current?.focus();
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleReset = async () => {
    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) {
      showToast('warning', 'Incomplete Code', 'Please enter all 6 digits of the reset code.');
      return;
    }
    if (newPassword.length < 6) {
      showToast('warning', 'Password Too Short', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('warning', 'Passwords Don\u2019t Match', 'Please make sure both password fields match.');
      return;
    }

    try {
      // Deliberately not signing the user in automatically here - send them
      // to Login so they confirm the new password actually works.
      await resetPassword(email, fullCode, newPassword);
      showToast('success', 'Password Reset', 'Your password has been changed. Please sign in with your new password.');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      showToast('error', 'Reset Failed', getErrorMessage(error, 'Invalid or expired reset code'));
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || !email) return;
    try {
      await forgotPassword(email);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs[0].current?.focus();
      setResendTimer(60);
      showToast('success', 'Code Resent', 'If an account exists for this email, a new reset code is on its way.');
    } catch (error) {
      showToast('error', 'Resend Failed', getErrorMessage(error, 'Please wait a moment before requesting another code.'));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="shield-check-outline" size={42} color="#22C55E" />
          </View>

          <Text style={styles.title}>Reset Your Password</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code we sent to:{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          <View style={styles.otpGrid}>
            {otpDigits.map((digit, index) => (
              <TextInput
                key={index}
                ref={inputRefs[index]}
                style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={6}
                selectTextOnFocus
                textAlign="center"
              />
            ))}
          </View>

          <View style={styles.form}>
            <View style={styles.fieldLabelRow}>
              <MaterialCommunityIcons name="lock-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.fieldLabel}>New Password</Text>
            </View>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeButton}>
                <MaterialCommunityIcons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldLabelRow}>
              <MaterialCommunityIcons name="lock-check-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.fieldLabel}>Confirm New Password</Text>
            </View>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Re-enter new password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                <MaterialCommunityIcons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.resetButton, isLoading && styles.disabledBtn]}
            onPress={handleReset}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.accentDark} />
            ) : (
              <>
                <Text style={styles.resetButtonText}>Reset Password</Text>
                <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.accentDark} />
              </>
            )}
          </TouchableOpacity>

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
    otpGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 28, gap: 8 },
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
    form: { width: '100%' },
    fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      marginBottom: 20,
      paddingRight: 8,
    },
    passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.textPrimary },
    eyeButton: { padding: 8 },
    resetButton: {
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
    resetButtonText: { fontSize: 16, fontWeight: '800', color: colors.accentDark },
    disabledBtn: { opacity: 0.6 },
    resendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    resendText: { color: colors.textSecondary, fontSize: 14 },
    resendLink: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    disabledResend: { color: colors.textMuted },
  });