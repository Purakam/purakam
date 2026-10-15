import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useAuthStore from '../stores/authStore';
import useUserStore from '../stores/userStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useTheme, SIZES, SHADOW } from '../theme';

const QUICK_ACTIONS = [
  { icon: 'map-marker-radius', label: 'My Addresses', route: 'SavedAddresses' },
  { icon: 'wallet-outline', label: 'Payments', route: 'PaymentMethods' },
  { icon: 'bell-outline', label: 'Notifications', route: 'Notifications' },
  { icon: 'help-circle-outline', label: 'Support', route: 'Support' },
];

const ACCOUNT_MENU = [
  { icon: 'account-cog-outline', label: 'Profile Settings', route: 'ProfileDetails' },
  { icon: 'map-outline', label: 'Saved Addresses', route: 'SavedAddresses' },
  { icon: 'credit-card-settings-outline', label: 'Payment Methods', route: 'PaymentMethods' },
  { icon: 'bell-outline', label: 'Notification Settings', route: 'Notifications' },
  { icon: 'palette-outline', label: 'Theme & Appearance', route: 'Theme' },
  { icon: 'gift-outline', label: 'Referral Program', route: 'Referrals' },
];

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, themeMode, setThemeMode } = useTheme();
  const styles = getStyles(colors);

  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const profile = useUserStore((s) => s.profile);
  const fetchProfile = useUserStore((s) => s.fetchProfile);

  const displayUser = profile || user;
  const isPartner = displayUser?.role === 'partner';

  const loadProfile = async () => {
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      try {
        await fetchProfile();
        await refreshUser();
      } catch (err) {
        console.log('Error loading settings profile:', err);
      }
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const showDialog = useNotificationStore((s) => s.showDialog);

  const handleLogout = () => {
    showDialog({
      icon: 'logout',
      title: 'Sign Out',
      description: 'Are you sure you want to sign out of your Purakam account?',
      primaryText: 'Logout',
      secondaryText: 'Stay Logged In',
      primaryAccent: colors.error,
      onConfirm: async () => {
        await signOut();
      },
    });
  };

  const handleEarnWithPurakam = () => {
    showDialog({
      icon: 'logout',
      title: 'Logout Required',
      description: 'You will be logged out. Do you want to logout?',
      primaryText: 'Yes',
      secondaryText: 'No',
      primaryAccent: colors.error,
      onConfirm: async () => {
        await signOut();
      },
    });
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={{ paddingHorizontal: SIZES.padding }}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile Hub</Text>
            <Text style={styles.subtitle}>
              Sign in to manage addresses, bookings, payment options, and themes.
            </Text>
          </View>
          <View style={styles.authCard}>
            <TouchableOpacity
              style={styles.authButton}
              onPress={() => navigation.getParent()?.getParent()?.navigate('Auth', { screen: 'Login' })}
            >
              <Text style={styles.authButtonText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authButton, styles.authButtonSecondary]}
              onPress={() => navigation.getParent()?.getParent()?.navigate('Auth', { screen: 'Register' })}
            >
              <Text style={[styles.authButtonText, styles.authButtonSecondaryText]}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SIZES.padding,
          paddingBottom: insets.bottom + 130,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayUser?.name?.charAt(0)?.toUpperCase() || 'P'}
              </Text>
            </View>
          </View>
          <Text style={styles.name}>{displayUser?.name}</Text>
          <Text style={styles.email}>{displayUser?.email}</Text>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.quickCard}
              onPress={() => navigation.getParent()?.navigate(item.route) || navigation.navigate(item.route)}
            >
              <View style={styles.quickIconCircle}>
                <MaterialCommunityIcons name={item.icon} size={22} color={colors.textPrimary} />
              </View>
              <Text style={styles.quickCardLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Uber-like Partner Promo Card */}
        {!isPartner && (
          <TouchableOpacity
            style={styles.partnerBanner}
            onPress={handleEarnWithPurakam}
          >
            <View style={styles.partnerBannerLeft}>
              <Text style={styles.partnerBannerTitle}>Earn with Purakam</Text>
              <Text style={styles.partnerBannerDesc}>
                Register as a certified service professional and get paid daily.
              </Text>
            </View>
            <View style={styles.partnerBannerRight}>
              <MaterialCommunityIcons name="arrow-right-bold-circle" size={32} color="#ffffff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Account Menu Section */}
        <Text style={styles.sectionHeaderTitle}>Account Settings</Text>
        <View style={styles.menuList}>
          {ACCOUNT_MENU.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuRow, index === ACCOUNT_MENU.length - 1 && styles.menuRowLast]}
              onPress={() => navigation.getParent()?.navigate(item.route) || navigation.navigate(item.route)}
            >
              <View style={styles.menuRowLeft}>
                <MaterialCommunityIcons name={item.icon} size={20} color={colors.textSecondary} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Action */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out of Account</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Purakam Client App v2.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    profileHeader: { alignItems: 'center', marginBottom: 26, marginTop: 20 },
    avatarContainer: { position: 'relative', marginBottom: 14 },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: { color: colors.accentDark, fontSize: 36, fontWeight: '800' },
    vipBadge: {
      position: 'absolute',
      bottom: -6,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    vipBadgeText: { color: '#F59E0B', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    name: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
    email: { color: colors.textSecondary, marginTop: 4, fontSize: 14 },

    quickGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    quickCard: {
      width: '48%',
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 14,
      alignItems: 'center',
      gap: 10,
      ...SHADOW,
    },
    quickIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    quickCardLabel: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },

    partnerBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.primary,
      borderRadius: 22,
      padding: 16,
      marginBottom: 20,
      gap: 14,
      ...SHADOW,
    },
    partnerBannerLeft: { flex: 1, gap: 4 },
    partnerBannerTitle: { color: colors.accentDark, fontWeight: '800', fontSize: 16 },
    partnerBannerDesc: { color: colors.primary === '#F5F1E8' ? 'rgba(11, 11, 11, 0.8)' : 'rgba(22, 22, 22, 0.8)', fontSize: 12, lineHeight: 16 },
    partnerBannerRight: { justifyContent: 'center', alignItems: 'center' },

    themeCard: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 16,
      marginBottom: 24,
      ...SHADOW,
    },
    themeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    themeTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 4,
    },
    segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    segmentBtnActive: { backgroundColor: colors.card, ...SHADOW },
    segmentText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
    segmentTextActive: { color: colors.textPrimary },

    sectionHeaderTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 14,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    menuList: {
      backgroundColor: colors.card,
      borderRadius: 22,
      paddingHorizontal: 16,
      marginBottom: 24,
      ...SHADOW,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    menuRowLast: { borderBottomWidth: 0 },
    menuRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    menuLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },

    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      padding: 16,
      borderRadius: 22,
    },
    logoutText: { color: colors.error, fontWeight: '800', fontSize: 14 },
    versionText: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 24 },

    title: { fontSize: 28, color: colors.textPrimary, fontWeight: '800', marginBottom: 10 },
    subtitle: { color: colors.textSecondary, lineHeight: 22, marginBottom: 24 },
    authCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 24,
    },
    authButton: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 14,
      alignItems: 'center',
      marginBottom: 12,
    },
    authButtonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
    authButtonText: { fontWeight: '800', color: colors.accentDark },
    authButtonSecondaryText: { color: colors.textPrimary },
  });
