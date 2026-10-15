import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useAuthStore from '../stores/authStore';
import useServiceStore from '../stores/serviceStore';
import { getErrorMessage } from '../api/client';
import { useTheme, SIZES, SHADOW } from '../theme';
import { useNotificationStore } from '../stores/notificationStore';

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const services = useServiceStore((s) => s.services);
  const fetchServices = useServiceStore((s) => s.fetchServices);
  const servicesLoading = useServiceStore((s) => s.isLoading);
  const showToast = useNotificationStore((s) => s.showToast);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState('customer');
  const [serviceCategory, setServiceCategory] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [experienceYears, setExperienceYears] = useState('2');
  const [aadhar, setAadhar] = useState('');
  const [pan, setPan] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    if (services.length > 0 && !serviceCategory) {
      setServiceCategory(services[0].name);
    }
  }, [services, serviceCategory]);

  const handleRegister = async () => {
    if (!name || !email || !password || !phone || !address) {
      showToast('warning', 'Missing Details', 'Please fill in all required fields.');
      return;
    }

    if (!agreedTerms) {
      showToast('warning', 'Terms & Conditions', 'Please read and accept the Terms & Conditions to register.');
      return;
    }

    const payload = { name, email, password, phone, address, role, terms_agree: true };

    if (role === 'partner') {
      if (!serviceCategory || !hourlyRate || !experienceYears || !aadhar || !pan) {
        showToast('warning', 'Missing Info', 'Please complete all required partner fields.');
        return;
      }

      const exp = parseInt(experienceYears, 10);
      if (isNaN(exp) || exp < 2) {
        showToast('warning', 'Experience Required', 'Service partners must have a minimum of 2 years of professional experience.');
        return;
      }

      payload.service_category = serviceCategory;
      payload.hourly_rate = parseFloat(hourlyRate);
      payload.experience_years = exp;
      payload.aadhar_card = aadhar;
      payload.pan_card = pan.toUpperCase();
    }

    try {
      const data = await register(payload);
      // No session yet: the emailed 6-digit code must be confirmed first.
      showToast('success', 'Account Created', 'Enter the 6-digit code we emailed you to verify your address.');
      navigation.navigate('VerifyEmail', { email: (data?.email || email).trim().toLowerCase(), role });
    } catch (error) {
      showToast('error', 'Registration Error', getErrorMessage(error, 'Registration failed'));
    }
  };


  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.appLogoWrap}>
          <MaterialCommunityIcons name="shield-check" size={24} color={colors.primary} />
          <Text style={styles.appLogoText}>purakam</Text>
        </View>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Sign up to book trusted local home services.</Text>


        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Full Name<Text style={styles.requiredStar}> *</Text>
          </Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={colors.textMuted} />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Email<Text style={styles.requiredStar}> *</Text>
          </Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="hello@purakam.in" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.textMuted} />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Password<Text style={styles.requiredStar}> *</Text>
          </Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password (min 6 chars)"
              secureTextEntry={!showPassword}
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Phone<Text style={styles.requiredStar}> *</Text>
          </Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+91 9999 0000 99" keyboardType="phone-pad" placeholderTextColor={colors.textMuted} />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Address (Mumbai / Thane / Navi Mumbai)<Text style={styles.requiredStar}> *</Text>
          </Text>
          <TextInput style={[styles.input, { height: 80 }]} value={address} onChangeText={setAddress} placeholder="Full doorstep address" multiline placeholderTextColor={colors.textMuted} />
        </View>

        <View style={styles.switchRow}>
          <TouchableOpacity style={[styles.switchButton, role === 'customer' && styles.switchButtonActive]} onPress={() => setRole('customer')}>
            <Text style={[styles.switchText, role === 'customer' && styles.switchTextActive]}>Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.switchButton, role === 'partner' && styles.switchButtonActive]} onPress={() => setRole('partner')}>
            <Text style={[styles.switchText, role === 'partner' && styles.switchTextActive]}>Partner</Text>
          </TouchableOpacity>
        </View>

        {role === 'partner' && (
          <View style={styles.partnerSection}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Service Category<Text style={styles.requiredStar}> *</Text>
              </Text>
              {servicesLoading ? (
                <ActivityIndicator color={colors.accent} />
              ) : services.length === 0 ? (
                <Text style={styles.hintText}>No categories available. Check your connection.</Text>
              ) : (
                <View style={styles.categoryGrid}>
                  {services.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryChip, serviceCategory === cat.name && styles.categoryChipActive]}
                      onPress={() => setServiceCategory(cat.name)}
                    >
                      <Text style={[styles.categoryChipText, serviceCategory === cat.name && styles.categoryChipTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Hourly Rate (INR)<Text style={styles.requiredStar}> *</Text>
              </Text>
              <TextInput style={styles.input} value={hourlyRate} onChangeText={setHourlyRate} keyboardType="numeric" placeholder="499" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Professional Experience (Min 2 Years)<Text style={styles.requiredStar}> *</Text>
              </Text>
              <TextInput style={styles.input} value={experienceYears} onChangeText={setExperienceYears} keyboardType="numeric" placeholder="2" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Aadhar Card (12 digits)<Text style={styles.requiredStar}> *</Text>
              </Text>
              <TextInput style={styles.input} value={aadhar} onChangeText={setAadhar} placeholder="123456789012" keyboardType="numeric" maxLength={12} placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                PAN Card<Text style={styles.requiredStar}> *</Text>
              </Text>
              <TextInput style={styles.input} value={pan} onChangeText={setPan} placeholder="ABCDE1234F" autoCapitalize="characters" maxLength={10} placeholderTextColor={colors.textMuted} />
            </View>
          </View>
        )}


        {/* Terms & Conditions Agreement Box */}
        <View style={styles.termsBox}>
          <Text style={styles.termsTitle}>Partner Registration – Terms & Conditions</Text>
          <ScrollView style={styles.termsScroll} nestedScrollEnabled={true}>
            <Text style={styles.termsSectionTitle}>Damage / Loss:</Text>
            <Text style={styles.termsText}>
              Any damage to or loss of the company’s, customer’s, or any third party’s property caused by the Partner while performing the assigned work shall be the responsibility of the Partner.
            </Text>

            <Text style={styles.termsSectionTitle}>Termination / Suspension:</Text>
            <Text style={styles.termsText}>
              purakam reserves the right to suspend or terminate the Partner’s registration in case of violation of company policies, misconduct, negligence, poor service, or repeated customer complaints.
            </Text>

            <Text style={styles.termsSectionTitle}>Complaint Option:</Text>
            <Text style={styles.termsText}>
              Customers may submit complaints regarding the Partner’s services. purakam may review and investigate such complaints and take appropriate action as deemed necessary.
            </Text>

            <Text style={styles.termsSectionTitle}>Incident / Injury During Work:</Text>
            <Text style={styles.termsText}>
              If the Partner suffers any injury, accident, or other loss while performing the assigned work, the Partner shall be responsible for their own safety and well-being. purakam shall not be responsible for any such incident, to the extent permitted by applicable law.
            </Text>

            <Text style={styles.termsSectionTitle}>Declaration:</Text>
            <Text style={styles.termsText}>
              I have read, understood, and agreed to all the above Terms & Conditions. I agree to follow purakam’s rules, policies, and service standards while working as a purakam Partner.
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAgreedTerms(!agreedTerms)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={agreedTerms ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={22}
              color={agreedTerms ? colors.primary : colors.textMuted}
            />
            <Text style={styles.checkboxLabel}>
              I accept the <Text style={{ color: colors.primary, fontWeight: '700' }}>Terms & Conditions</Text> <Text style={styles.requiredStar}>*</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
          <Text style={styles.buttonText}>{isLoading ? 'Creating account...' : 'Create Account'}</Text>
        </TouchableOpacity>


        <View style={styles.footerTextRow}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}> Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: SIZES.padding + 10, paddingTop: 24 },
    title: { fontSize: 30, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 24 },
    formGroup: { marginBottom: 16 },
    label: {
      color: colors.textSecondary,
      marginBottom: 8,
      fontWeight: '600',
    },
    requiredStar: {
      color: colors.error,
      fontWeight: '700',
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: SIZES.radius,
      padding: 14,
      color: colors.textPrimary,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: SIZES.radius,
      backgroundColor: colors.surface,
    },
    passwordInput: { flex: 1, borderWidth: 0, marginBottom: 0, padding: 14, color: colors.textPrimary, backgroundColor: 'transparent' },
    eyeButton: { paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center'},
    switchRow: {
      flexDirection: 'row',
      marginBottom: 24,
      borderRadius: SIZES.radius,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    switchButton: { flex: 1, padding: 14, alignItems: 'center' },
    switchButtonActive: { backgroundColor: colors.primary },
    switchText: { fontWeight: '600', color: colors.textSecondary },
    switchTextActive: { color: colors.accentDark },
    button: {
      marginTop: 8,
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: SIZES.radius,
      alignItems: 'center',
      ...SHADOW,
    },
    buttonText: { color: colors.accentDark, fontWeight: '700', fontSize: 16 },
    footerTextRow: { marginTop: 22, flexDirection: 'row', justifyContent: 'center' },
    footerText: { color: colors.textSecondary },
    footerLink: { color: colors.primary, fontWeight: '700' },
    partnerSection: {
      marginBottom: 16,
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: SIZES.radius,
    },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    categoryChipActive: { backgroundColor: colors.primary },
    categoryChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
    categoryChipTextActive: { color: colors.accentDark },
    hintText: { color: colors.textMuted, fontStyle: 'italic' },
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
    termsBox: {
      marginTop: 16,
      marginBottom: 16,
      padding: 14,
      backgroundColor: colors.surface,
      borderRadius: SIZES.radius,
      borderWidth: 1,
      borderColor: colors.border,
    },
    termsTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 10,
    },
    termsScroll: {
      maxHeight: 130,
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    termsSectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      marginTop: 6,
      marginBottom: 2,
    },
    termsText: {
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 16,
      marginBottom: 6,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    checkboxLabel: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '500',
    },
  });


