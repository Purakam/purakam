import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useAuthStore from '../../stores/authStore';
import usePartnerStore from '../../stores/partnerStore';
import { formatStatus, computePartnerActiveJobs } from '../../utils/bookings';
import { useTheme, SIZES, SHADOW } from '../../theme';
import { useNotificationStore } from '../../stores/notificationStore';

export default function PartnerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  const showToast = useNotificationStore((s) => s.showToast);

  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const profile = user?.partner_profile || {};

  const isLoading = usePartnerStore((s) => s.isLoading);
  const error = usePartnerStore((s) => s.error);
  const incomingBookings = usePartnerStore((s) => s.incomingBookings);
  const assignedBookings = usePartnerStore((s) => s.assignedBookings);
  const earnings = usePartnerStore((s) => s.earnings);
  const fetchDashboard = usePartnerStore((s) => s.fetchDashboard);
  const updateAvailability = usePartnerStore((s) => s.updateAvailability);
  const acceptJob = usePartnerStore((s) => s.acceptJob);
  const declineJob = usePartnerStore((s) => s.declineJob);
  const progressJob = usePartnerStore((s) => s.progressJob);
  const isUpdatingAvailability = usePartnerStore((s) => s.isUpdatingAvailability);

  const [available, setAvailable] = useState(profile?.availability_status ?? false);
  const [otpInputs, setOtpInputs] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setAvailable(profile?.availability_status ?? false);
  }, [profile?.availability_status]);

  const loadDashboard = useCallback(async () => {
    await fetchDashboard();
    await refreshUser();
  }, [fetchDashboard, refreshUser]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboard();
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 15000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const handleAvailabilityToggle = async (value) => {
    setAvailable(value);
    try {
      await updateAvailability(value);
      await refreshUser();
      showToast('success', 'Status Updated', `You are now ${value ? 'Online' : 'Offline'}`);
    } catch (e) {
      setAvailable(!value);
      showToast('error', 'Update Failed', 'Failed to update availability status.');
    }
  };

  const showSuccessModal = useNotificationStore((s) => s.showSuccessModal);

  const handleAcceptJob = async (job) => {
    try {
      await acceptJob(job.id);
      showSuccessModal(
        'Job Accepted!',
        `You have successfully accepted booking #${job.id} for ${job.service_category}. You can now navigate to the customer location.`,
        'JOB ASSIGNED',
        () => loadDashboard()
      );
    } catch (e) {
      showToast('error', 'Acceptance Failed', e?.response?.data?.detail || e.message || 'Could not accept job');
    }
  };

  const activeJobs = computePartnerActiveJobs(assignedBookings);

  const completedCount = assignedBookings.filter((b) => b.status === 'completed').length;

  const getProgressLabel = (status) => {
    if (status === 'accepted') return 'Start Travel';
    if (status === 'on_the_way') return 'Start Work';
    if (status === 'in_progress') return 'Mark Completed';
    return '';
  };

  const handleProgress = async (job) => {
    if (job.status === 'on_the_way') {
      const otp = otpInputs[job.id];
      if (!otp || otp.length !== 6) {
        showToast('warning', 'OTP Required', 'Please enter the 6-digit customer OTP.');
        return;
      }
      await progressJob(job.id, job.status, otp);
    } else {
      await progressJob(job.id, job.status);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.header}>Partner Dashboard</Text>
            <Text style={styles.subheader}>{profile?.service_category || 'Service Provider'}</Text>
          </View>
          <View style={styles.onlineBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.onlineBadgeText}>Online & Ready</Text>
          </View>
        </View>


        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadDashboard}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{activeJobs.length}</Text>
            <Text style={styles.summaryLabel}>Active Jobs</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{incomingBookings.length}</Text>
            <Text style={styles.summaryLabel}>Pending Requests</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{completedCount}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{profile?.rating ?? '—'}★</Text>
            <Text style={styles.summaryLabel}>Rating</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Earnings Overview</Text>
          <Text style={styles.cardText}>Total: ₹{earnings.total.toFixed(0)}</Text>
          <Text style={styles.cardText}>Today: ₹{earnings.today.toFixed(0)}</Text>
        </View>

        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="bell-ring" size={18} color={colors.warning} />
          <Text style={styles.sectionTitle}> Incoming Requests</Text>
        </View>
        {isLoading && incomingBookings.length === 0 ? (
          <ActivityIndicator color={colors.accent} style={{ marginBottom: 18 }} />
        ) : incomingBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="bell-off-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {available ? 'No incoming requests right now.' : 'Go online to receive incoming requests.'}
            </Text>
          </View>
        ) : (
          incomingBookings.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              <Text style={styles.jobTitle}>#{job.id} · {job.service_category}</Text>
              <Text style={styles.jobMeta}>{job.booking_date} · {job.time_slot}</Text>
              <Text style={styles.jobMeta}>{job.address}</Text>
              {job.area_name ? <Text style={styles.jobMeta}>Area: {job.area_name}</Text> : null}
              <Text style={styles.jobPrice}>₹{job.price}</Text>
              <View style={styles.jobActions}>
                <TouchableOpacity style={styles.declineButton} onPress={() => declineJob(job.id)}>
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptJob(job)}>
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>

              </View>
            </View>
          ))
        )}

        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="briefcase" size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}> Active Jobs</Text>
        </View>
        {activeJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No active jobs. Accept incoming requests to get started.</Text>
          </View>
        ) : (
          activeJobs.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <Text style={styles.jobTitle}>#{job.id}</Text>
                <Text style={styles.statusBadge}>{formatStatus(job.status)}</Text>
              </View>
              <Text style={styles.jobMeta}>{job.address}</Text>
              <Text style={styles.jobMeta}>{job.booking_date} · {job.time_slot}</Text>
              {job.details ? <Text style={styles.jobDetails}>"{job.details}"</Text> : null}
              <Text style={styles.jobPrice}>₹{job.price}</Text>
              {job.status === 'on_the_way' && (
                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter customer OTP"
                  placeholderTextColor={colors.textMuted}
                  value={otpInputs[job.id] || ''}
                  onChangeText={(text) => setOtpInputs((prev) => ({ ...prev, [job.id]: text }))}
                  keyboardType="numeric"
                  maxLength={6}
                />
              )}
              <TouchableOpacity style={styles.progressButton} onPress={() => handleProgress(job)}>
                <Text style={styles.progressText}>{getProgressLabel(job.status)}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: SIZES.padding },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
      marginTop: 10,
    },
    header: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
    subheader: { color: colors.textSecondary, marginTop: 4 },
    statusRow: { alignItems: 'flex-end' },
    statusLabel: { color: colors.textPrimary, fontWeight: '700', marginBottom: 6 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, gap: 10 },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: SIZES.radius,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
    },
    summaryNumber: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
    summaryLabel: { color: colors.textSecondary },
    card: {
      backgroundColor: colors.card,
      borderRadius: SIZES.radius,
      padding: 18,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
    cardText: { color: colors.textSecondary, lineHeight: 22, marginBottom: 4 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    jobCard: {
      backgroundColor: colors.card,
      borderRadius: SIZES.radius,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
    },
    jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    jobTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
    jobMeta: { color: colors.textSecondary, fontSize: 13, marginBottom: 4 },
    jobDetails: { color: colors.textMuted, fontStyle: 'italic', fontSize: 13, marginVertical: 6 },
    jobPrice: { color: colors.success, fontWeight: '700', fontSize: 16, marginTop: 8 },
    jobActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    acceptButton: {
      flex: 1,
      backgroundColor: colors.accent,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    acceptText: { fontWeight: '700', color: '#111827' },
    declineButton: {
      flex: 1,
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    declineText: { fontWeight: '700', color: colors.textSecondary },
    statusBadge: {
      color: colors.accentDark,
      fontWeight: '700',
      fontSize: 12,
      textTransform: 'capitalize',
    },
    otpInput: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginTop: 10,
      color: colors.textPrimary,
      textAlign: 'center',
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    progressButton: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
    },
    progressText: { color: colors.background, fontWeight: '700' },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: SIZES.radius,
      padding: 24,
      alignItems: 'center',
      marginBottom: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 20 },
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
    onlineBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(34, 197, 94, 0.12)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    pulseDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#22C55E',
    },
    onlineBadgeText: {
      color: '#22C55E',
      fontWeight: '800',
      fontSize: 12,
    },
  });

