import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import useAuthStore from '../stores/authStore';
import { getErrorMessage } from '../api/client';
import { useTheme, SIZES, SHADOW } from '../theme';
import { useNotificationStore } from '../stores/notificationStore';
import { googleLogin } from '../api/auth/authApi';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  const showToast = useNotificationStore((s) => s.showToast);
  const login = useAuthStore((s) => s.login);
  const signIn = useAuthStore((s) => s.signIn);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Google OAuth Hook
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  });

  // Mock Google Consent states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        setIsGoogleLoading(true);
        // The backend verifies this token with Google; the app never sends a bare email.
        googleLogin({ access_token: authentication.accessToken })
          .then(async (userData) => {
            await signIn(userData);
            showToast('success', 'Logged In', `Welcome, ${userData.name} (signed in with Google)!`);
          })
          .catch((err) => {
            showToast('error', 'Google Auth Error', getErrorMessage(err, 'Google sign-in failed'));
          })
          .finally(() => setIsGoogleLoading(false));
      }
    }
  }, [response]);

  const handleGooglePress = () => {
    if (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
      promptAsync();
    } else if (__DEV__) {
      // Development only: mock consent (backend needs ALLOW_MOCK_GOOGLE_LOGIN=true).
      setGoogleEmail('');
      setGoogleName('');
      setShowGoogleModal(true);
    } else {
      showToast('warning', 'Google Sign-In Unavailable', 'Please sign in with your email and password.');
    }
  };


  const handleGoogleSubmit = async () => {
    if (!googleEmail || !googleEmail.includes('@')) {
      showToast('warning', 'Invalid Email', 'Please enter a valid mock email address.');
      return;
    }
    if (!googleName.trim()) {
      showToast('warning', 'Name Required', 'Please enter a mock name.');
      return;
    }

    setIsGoogleLoading(true);
    try {
      const userData = await googleLogin({ email: googleEmail, name: googleName });
      await signIn(userData);
      setShowGoogleModal(false);
      showToast('success', 'Logged In', `Welcome, ${userData.name} (signed in with Google)!`);
    } catch (error) {
      const message = error?.response?.data?.detail || error.message || 'Google Auth failed';
      showToast('error', 'Authentication Failed', typeof message === 'string' ? message : 'Google Auth failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showToast('warning', 'Missing Credentials', 'Please enter email and password.');
      return;
    }

    try {
      await login(email, password);
      showToast('success', 'Logged In', 'Welcome back to purakam!');
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (detail === 'EMAIL_NOT_VERIFIED') {
        showToast('info', 'Verification Required', 'Your email address is not verified yet. Please enter the OTP code.');
        navigation.navigate('VerifyEmail', { email });
        return;
      }
      showToast('error', 'Login Failed', getErrorMessage(error, 'Login failed'));
    }
  };


  return (
    <SafeAreaView
      style={[styles.container, { paddingLeft: insets.left + 10, paddingRight: insets.right + 10 }]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.headerBlock}>
            <View style={styles.appLogoWrap}>
              <MaterialCommunityIcons name="shield-check" size={24} color={colors.primary} />
              <Text style={styles.appLogoText}>purakam</Text>
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Access your household service profile.</Text>
          </View>


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

            <View style={styles.fieldLabelRow}>
              <MaterialCommunityIcons name="lock-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.fieldLabel}>Password</Text>
            </View>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={isLoading}>
              <Text style={styles.primaryButtonText}>{isLoading ? 'Signing in...' : 'Sign In'}</Text>
              <MaterialCommunityIcons name="login" size={18} color={colors.accentDark} style={styles.buttonIcon} />
            </TouchableOpacity>

            <View style={styles.separatorRow}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>or</Text>
              <View style={styles.separatorLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGooglePress}
            >

              <FontAwesome5 name="google" size={16} color={colors.primary} />
              <Text style={styles.googleText}>Sign in with Google</Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.footerLink}>Register here</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Google Mock Consent Modal */}
      <Modal
        visible={showGoogleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGoogleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowGoogleModal(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Sign in with Google</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              {/* Sandbox Warning Notice */}
              <View style={styles.sandboxBanner}>
                <MaterialCommunityIcons name="alert-decagram-outline" size={20} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sandboxTitle}>Google OAuth Sandbox Mode</Text>
                  <Text style={styles.sandboxDesc}>
                    Real client credentials are not configured in environment. Displaying local test sandbox screen instead.
                  </Text>
                </View>
              </View>

              {/* Logo block */}
              <View style={styles.logoBlock}>
                <View style={styles.logoCircle}>
                  <MaterialCommunityIcons name="google" size={32} color={colors.primary} />
                </View>
                <Text style={styles.chooseAccountTitle}>Choose an account</Text>
                <Text style={styles.chooseAccountSubtitle}>to continue to purakam</Text>
              </View>

              {/* Input fields */}
              <Text style={styles.modalInputLabel}>Mock Full Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Google User"
                placeholderTextColor={colors.textMuted}
                value={googleName}
                onChangeText={setGoogleName}
              />

              <Text style={styles.modalInputLabel}>Mock Email Address</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="user@gmail.com"
                placeholderTextColor={colors.textMuted}
                value={googleEmail}
                onChangeText={setGoogleEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Predefined identity selector */}
              <Text style={styles.quickSelectHeader}>Quick Select Test Accounts</Text>
              <View style={styles.quickSelectGrid}>
                {[
                  { email: 'customer@purakam.in', name: 'Customer Test User', role: 'customer', icon: 'account-outline' },
                  { email: 'vijay@purakam.in', name: 'Vijay Professional', role: 'partner', icon: 'briefcase-outline' },
                  { email: 'new.google.user@gmail.com', name: 'New Google User', role: 'customer', icon: 'account-plus-outline' },
                ].map((acc) => (
                  <TouchableOpacity
                    key={acc.email}
                    style={styles.quickAccountBtn}
                    onPress={() => {
                      setGoogleEmail(acc.email);
                      setGoogleName(acc.name);
                    }}
                  >
                    <MaterialCommunityIcons name={acc.icon} size={18} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quickAccountEmail}>{acc.email}</Text>
                      <Text style={styles.quickAccountDesc}>
                        {acc.role === 'partner' ? 'Logs in existing Provider' : acc.email.startsWith('new') ? 'Registers brand new Customer' : 'Logs in existing Customer'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Authorize button */}
              <TouchableOpacity
                style={[styles.authorizeBtn, isGoogleLoading && styles.disabledBtn]}
                onPress={handleGoogleSubmit}
                disabled={isGoogleLoading}
              >
                <MaterialCommunityIcons name="shield-check-outline" size={20} color={colors.accentDark} />
                <Text style={styles.authorizeBtnText}>
                  {isGoogleLoading ? 'Authorizing...' : 'Authorize & Continue'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 24 },
    headerBlock: {
      marginBottom: 24,
    },
    appLogoWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    appLogoText: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: -0.5,
    },
    title: { color: colors.textPrimary, fontSize: 30, fontWeight: '700', marginBottom: 8 },
    subtitle: { color: colors.textSecondary, marginBottom: 24, fontSize: 15, lineHeight: 22 },
    form: { backgroundColor: colors.card, borderRadius: SIZES.radius, padding: SIZES.padding, ...SHADOW },
    input: {
      backgroundColor: colors.surface,
      borderRadius: SIZES.radius,
      padding: 14,
      marginBottom: 18,
      color: colors.textPrimary,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: SIZES.radius,
      backgroundColor: colors.surface,
      marginBottom: 18,
    },
    passwordInput: { flex: 1, borderWidth: 0, marginBottom: 0, padding: 14, color: colors.textPrimary, backgroundColor: 'transparent' },
    eyeButton: { paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: SIZES.radius,
      marginBottom: 18,
      ...SHADOW,
    },
    primaryButtonText: { color: colors.accentDark, fontWeight: '700', fontSize: 16 },
    buttonIcon: { marginLeft: 8 },
    separatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    separatorLine: { flex: 1, height: 1, backgroundColor: colors.border },
    separatorText: { marginHorizontal: 12, color: colors.textSecondary, fontWeight: '600' },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      borderRadius: SIZES.radius,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 18,
    },
    googleText: { color: colors.textPrimary, fontWeight: '700', marginLeft: 10 },
    fieldLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
    fieldLabel: { color: colors.textSecondary, fontWeight: '600' },
    footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
    footerText: { color: colors.textSecondary, marginRight: 6 },
    footerLink: { color: colors.primary, fontWeight: '700' },

    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 16,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalCloseBtn: {
      padding: 4,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    modalScrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    sandboxBanner: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.25)',
      borderRadius: 12,
      padding: 12,
      gap: 10,
      marginBottom: 20,
    },
    sandboxTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#F59E0B',
    },
    sandboxDesc: {
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 15,
      marginTop: 2,
    },
    logoBlock: {
      alignItems: 'center',
      marginBottom: 20,
    },
    logoCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      ...SHADOW,
    },
    chooseAccountTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    chooseAccountSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    modalInputLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    modalInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      color: colors.textPrimary,
      fontSize: 13,
      marginBottom: 16,
    },
    quickSelectHeader: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 6,
    },
    quickSelectGrid: {
      gap: 8,
      marginBottom: 22,
    },
    quickAccountBtn: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
      gap: 12,
    },
    quickAccountEmail: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    quickAccountDesc: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 2,
    },
    authorizeBtn: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...SHADOW,
    },
    authorizeBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.accentDark,
    },
    disabledBtn: {
      opacity: 0.6,
    },
  });
