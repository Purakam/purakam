import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useAuthStore from '../../stores/authStore';
import useUserStore from '../../stores/userStore';
import { useTheme, SIZES, SHADOW } from '../../theme';
import { useNotificationStore } from '../../stores/notificationStore';

export default function PartnerProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const styles = getStyles(colors, isDark);

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const profile = useUserStore((s) => s.profile);
  const isLoading = useUserStore((s) => s.isLoading);
  const error = useUserStore((s) => s.error);
  const fetchProfile = useUserStore((s) => s.fetchProfile);

  const displayUser = profile || user;
  const partnerProfile = displayUser?.partner_profile || {};

  const loadProfile = useCallback(async () => {
    await fetchProfile();
    await refreshUser();
  }, [fetchProfile, refreshUser]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProfile();
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const showDialog = useNotificationStore((s) => s.showDialog);

  const handleLogout = () => {
    showDialog({
      icon: 'logout',
      title: 'Sign Out',
      description: 'Are you sure you want to sign out?',
      primaryText: 'Logout',
      secondaryText: 'Stay Logged In',
      primaryAccent: colors.error,
      onConfirm: () => signOut(),
    });
  };

  const maskDocument = (value) => {
    if (!value) return 'Not on file';
    if (value.length <= 4) return value;
    return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.header}>Settings</Text>
            <Text style={styles.subheader}>{displayUser?.email}</Text>
          </View>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="account-circle" size={40} color={colors.primary} />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadProfile}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isLoading && !displayUser ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* App Theme selector for Partners */}
            <View style={styles.themeContainerCard}>
              <View style={styles.themeHeaderRow}>
                <MaterialCommunityIcons name="theme-light-dark" size={20} color={colors.textPrimary} />
                <Text style={styles.themeTitle}>App Theme</Text>
              </View>
              <View style={styles.segmentedControl}>
                {['system', 'light', 'dark'].map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.segmentButton,
                      themeMode === mode && styles.segmentButtonActive,
                    ]}
                    onPress={() => setThemeMode(mode)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        themeMode === mode && styles.segmentTextActive,
                      ]}
                    >
                      {mode.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{displayUser?.name}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{displayUser?.phone || '—'}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.value}>{displayUser?.address || '—'}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.label}>Service Category</Text>
              <Text style={styles.value}>{partnerProfile?.service_category || '—'}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.label}>Hourly Rate</Text>
              <Text style={styles.value}>₹{partnerProfile?.hourly_rate ?? '—'} / hr</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.label}>Rating</Text>
              <Text style={styles.value}>{partnerProfile?.rating ?? '—'} ★</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.label}>Completed Jobs</Text>
              <Text style={styles.value}>{partnerProfile?.completed_jobs ?? 0}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.label}>Availability Status</Text>
              <Text style={[styles.value, { color: '#22C55E' }]}>🟢 Online & Active</Text>
            </View>

            {partnerProfile?.bio ? (
              <View style={styles.detailCard}>
                <Text style={styles.label}>Bio</Text>
                <Text style={styles.value}>{partnerProfile.bio}</Text>
              </View>
            ) : null}
            <View style={styles.detailCard}>
              <Text style={styles.label}>Aadhar Card</Text>
              <Text style={styles.value}>{maskDocument(partnerProfile?.aadhar_card)}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.label}>PAN Card</Text>
              <Text style={styles.value}>{maskDocument(partnerProfile?.pan_card)}</Text>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingHorizontal: SIZES.padding, paddingTop: 4 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 22,
      marginTop: 10,
    },
    header: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
    subheader: { color: colors.textSecondary, marginTop: 6 },
    avatarCircle: {
      width: 62,
      height: 62,
      borderRadius: 18,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      ...SHADOW,
    },
    detailCard: {
      backgroundColor: colors.surface,
      borderRadius: SIZES.radius,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
    },
    label: { color: colors.textSecondary, marginBottom: 6, fontWeight: '600' },
    value: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
    
    themeContainerCard: {
      backgroundColor: colors.surface,
      borderRadius: SIZES.radius,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
    },
    themeHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    themeTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segmentButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
    },
    segmentButtonActive: {
      backgroundColor: colors.surface,
      ...SHADOW,
    },
    segmentText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: colors.textPrimary,
      fontWeight: '700',
    },

    logoutButton: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: SIZES.radius,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 8,
    },
    logoutText: { color: colors.error, fontWeight: '700' },
    errorBox: {
      backgroundColor: isDark ? '#3b2424' : '#fef2f2',
      borderRadius: SIZES.radius,
      padding: 12,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
    },
    errorText: { color: colors.error, flex: 1 },
    retryText: { color: colors.accentDark, fontWeight: '700' },
  });
