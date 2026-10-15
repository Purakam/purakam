import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useAuthStore from '../stores/authStore';
import useUserStore from '../stores/userStore';
import { useTheme, SIZES, SHADOW } from '../theme';
import { useNotificationStore } from '../stores/notificationStore';

export default function ProfileDetailsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const profile = useUserStore((s) => s.profile);
  const fetchProfile = useUserStore((s) => s.fetchProfile);

  const displayUser = profile || user;

  const loadProfile = async () => {
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      try {
        await fetchProfile();
        await refreshUser();
      } catch (err) {
        console.log('Error loading profile details:', err);
      }
    }
  };

  const [deletedAddress, setDeletedAddress] = useState(false);
  const showToast = useNotificationStore((s) => s.showToast);
  const showDialog = useNotificationStore((s) => s.showDialog);

  const handleDeleteAddress = () => {
    showDialog({
      icon: 'trash',
      title: 'Delete Address',
      description: 'Are you sure you want to delete this address? This action cannot be undone.',
      primaryText: 'Delete',
      secondaryText: 'Cancel',
      primaryAccent: '#EF4444',
      onConfirm: () => {
        setDeletedAddress(true);
        showToast('success', 'Address Deleted', 'Your doorstep address has been successfully removed.');
      },
    });
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Please sign in to view profile details.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header Row */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Summary */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayUser?.name?.charAt(0)?.toUpperCase() || 'P'}</Text>
          </View>
          <Text style={styles.name}>{displayUser?.name}</Text>
          <Text style={styles.roleLabel}>{displayUser?.role?.toUpperCase() || 'CLIENT'}</Text>
        </View>

        {/* Structured Details Card */}
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="account-outline" size={20} color={colors.textSecondary} />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>{displayUser?.name}</Text>
            </View>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="phone-outline" size={20} color={colors.textSecondary} />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              <Text style={styles.detailValue}>{displayUser?.phone || '—'}</Text>
            </View>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="email-outline" size={20} color={colors.textSecondary} />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{displayUser?.email}</Text>
            </View>
          </View>
        </View>

        {/* Saved Address Section */}
        <Text style={styles.sectionTitle}>Saved Addresses</Text>
        <View style={styles.addressContainer}>
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <MaterialCommunityIcons name="home-outline" size={20} color={colors.primary} />
                <Text style={styles.addressLabel}>Default Address</Text>
              </View>
              {displayUser?.address && !deletedAddress ? (
                <TouchableOpacity onPress={handleDeleteAddress} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.addressValue}>
              {deletedAddress ? 'No doorstep address configured yet.' : (displayUser?.address || 'No doorstep address configured yet.')}
            </Text>
          </View>

          <TouchableOpacity style={styles.addAddressCard}>
            <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.addAddressText}>Add New Address</Text>
          </TouchableOpacity>
        </View>

        {/* Account Details Panel */}
        <Text style={styles.sectionTitle}>System Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.textSecondary} />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Client Since</Text>
              <Text style={styles.detailValue}>
                {displayUser?.created_at
                  ? new Date(displayUser.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: colors.background,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    scrollContent: { padding: SIZES.padding },
    avatarSection: { alignItems: 'center', marginBottom: 26, marginTop: 10 },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    avatarText: { color: colors.accentDark, fontSize: 36, fontWeight: '800' },
    name: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
    roleLabel: {
      color: colors.primary,
      marginTop: 6,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
 
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 12,
      marginTop: 20,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    detailsCard: {
      backgroundColor: colors.card,
      borderRadius: 22,
      paddingHorizontal: 16,
      ...SHADOW,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      gap: 14,
    },
    detailDivider: {
      height: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    detailTextContainer: {
      flex: 1,
    },
    detailLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    detailValue: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
      marginTop: 2,
    },
 
    addressContainer: {
      gap: 12,
    },
    addressCard: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 16,
      gap: 10,
      ...SHADOW,
    },
    addressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    addressLabel: {
      color: colors.textPrimary,
      fontWeight: '800',
      fontSize: 14,
    },
    addressValue: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    addAddressCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary === '#F5F1E8' ? 'rgba(245, 241, 232, 0.08)' : 'rgba(216, 198, 176, 0.15)',
      borderRadius: 22,
      padding: 16,
      gap: 8,
      marginTop: 4,
    },
    addAddressText: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 14,
    },
 
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorText: { color: colors.textSecondary, fontSize: 16, textAlign: 'center' },
  });
