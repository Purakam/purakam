import React, { useState } from 'react';
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

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  const showToast = useNotificationStore((s) => s.showToast);
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [email, setEmail] = useState('');

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      showToast('warning', 'Email Required', 'Please enter a valid email address.');
      return;
    }

    try {
      await forgotPassword(trimmed);
    } catch (error) {
      // Still proceed to the reset screen even on a non-2xx response: the
      // backend intentionally returns a generic message either way, so the
      // visible rate-limit case (429) is the only one worth surfacing here.
      const message = getErrorMessage(error, '');
      if (message && message.toLowerCase().includes('wait')) {
        showToast('warning', 'Please Wait', message);
        return;
      }
    }

    showToast('success', 'Check Your Email', 'If an account exists for this email, a 6-digit reset code has been sent.');
    navigation.navigate('ResetPassword', { email: trimmed });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="key-variant" size={38} color={colors.primary} />
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your account email and we'll send you a 6-digit code to reset your password.
          </Text>

          <View style={styles.form}>
            <View style={styles.fieldLabelRow}>
              <MaterialCommunityIcons name="email-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.fieldLabel}>Email Address</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="name@email.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleSend} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color={colors.accentDark} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Send Reset Code</Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color={colors.accentDark} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Remembered your password?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingHorizontal: SIZES.padding, paddingTop: 20, paddingBottom: 40 },
    backButton: { alignSelf: 'flex-start', marginBottom: 20, padding: 4 },
    iconCircle: {
      alignSelf: 'center',
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.1)',
      borderWidth: 2,
      borderColor: 'rgba(99, 102, 241, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28, paddingHorizontal: 8 },
    form: { width: '100%' },
    fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.textPrimary,
      marginBottom: 20,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#22C55E',
      borderRadius: 16,
      paddingVertical: 16,
      gap: 8,
      marginTop: 4,
      ...SHADOW,
    },
    primaryButtonText: { fontSize: 16, fontWeight: '800', color: colors.accentDark },
    footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24 },
    footerText: { color: colors.textSecondary, fontSize: 14 },
    footerLink: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  });