import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useAuthStore from '../stores/authStore';
import useBookingStore from '../stores/bookingStore';
import { formatStatus, isActiveBooking, isUpcomingBooking, isCompletedBooking, isCancelledBooking } from '../utils/bookings';
import { useTheme, SIZES, SHADOW } from '../theme';
import { useNotificationStore } from '../stores/notificationStore';
import { payForBooking } from '../utils/razorpayPayment';
import { getServiceIcon } from '../utils/icons';
import { BookingsShimmer } from '../components/Shimmer';
import BroadcastingTimer from '../components/BroadcastingTimer';


const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const LIFECYCLE = [
  { key: 'requested', label: 'Requested' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'on_the_way', label: 'En Route' },
  { key: 'in_progress', label: 'Working' },
  { key: 'completed', label: 'Completed' },
];

function StatusBadge({ status, colors }) {
  const styles = getStyles(colors);
  const label = formatStatus(status).toUpperCase();
  const isDone = status === 'completed';
  const isCxl = status === 'cancelled';

  return (
    <View
      style={[
        styles.badge,
        isDone && styles.badgeSuccess,
        isCxl && styles.badgeDanger,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          isDone && styles.badgeTextSuccess,
          isCxl && styles.badgeTextDanger,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function ProgressTimeline({ status, colors }) {
  const styles = getStyles(colors);
  const currentIndex = LIFECYCLE.findIndex((s) => s.key === status);
  
  return (
    <View style={styles.timeline}>
      <View style={styles.timelineTrack} />
      <View
        style={[
          styles.timelineTrackFill,
          { width: `${(Math.max(0, currentIndex) / (LIFECYCLE.length - 1)) * 100}%` },
        ]}
      />
      {LIFECYCLE.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;
        
        let iconName = 'circle-outline';
        let iconSize = 8;
        if (isDone) {
          iconName = 'circle';
          iconSize = 8;
        } else if (isCurrent) {
          iconName = 'circle';
          iconSize = 12;
        }

        return (
          <View key={step.key} style={styles.timelineStep}>
            <MaterialCommunityIcons
              name={iconName}
              size={iconSize}
              color={isDone || isCurrent ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.timelineLabel,
                (isDone || isCurrent) && styles.timelineLabelActive,
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ActiveBookingCard({ item, onCancel, onPayNow, navigation, colors }) {
  const styles = getStyles(colors);
  const canCancel = ['requested', 'accepted'].includes(item.status);
  // An online (UPI) booking whose payment was never completed - e.g. the
  // payment sheet was closed - can be paid from here at any time.
  const needsPayment = item.payment_method === 'UPI' && item.payment_status === 'pending';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name={getServiceIcon(item.service_category)} size={20} color={colors.accentDark} />
          </View>
          <View>
            <Text style={styles.cardTitle}>{item.service_category}</Text>
            <Text style={styles.cardSub}>ID: #SRV{item.id}</Text>
          </View>
        </View>
        <StatusBadge status={item.status} colors={colors} />
      </View>

      <View style={styles.cardBody}>
        {/* Date & Location Details */}
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>{item.booking_date} at {item.time_slot}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="map-marker-radius-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText} numberOfLines={1}>{item.address}</Text>
        </View>

        {/* Progress Timeline Indicator */}
        <ProgressTimeline status={item.status} colors={colors} />

        {/* Assigned Partner Profile block */}
        {item.partner?.name ? (
          <View style={styles.partnerWidget}>
            <View style={styles.partnerMeta}>
              <View style={styles.partnerAvatarCircle}>
                <Text style={styles.partnerAvatarText}>{item.partner.name[0]?.toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.partnerLabel}>ASSIGNED SPECIALIST</Text>
                <Text style={styles.partnerName}>{item.partner.name}</Text>
              </View>
            </View>
            <View style={styles.partnerActions}>
              <TouchableOpacity
                style={styles.actionBtnCircle}
                onPress={() => navigation.navigate('Chat', { bookingId: item.id, partnerName: item.partner.name })}
              >
                <MaterialCommunityIcons name="chat-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnCircle, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Tracking', { bookingId: item.id, partnerName: item.partner.name })}
              >
                <MaterialCommunityIcons name="navigation-variant-outline" size={16} color={colors.accentDark} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <BroadcastingTimer createdAt={item.created_at} onTimeout={() => onCancel(item.id)} />
        )}



        {/* Active Verification OTP Section */}
        {item.otp && item.partner?.name && (
          <View style={styles.otpBanner}>
            <View>
              <Text style={styles.otpTitle}>Work Start OTP</Text>
              <Text style={styles.otpHelp}>Share with partner at doorstep</Text>
            </View>
            <View style={styles.otpBox}>
              <Text style={styles.otpDigits}>{item.otp}</Text>
            </View>
          </View>
        )}

        {/* Price & Cancellation actions */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.footerLabel}>TOTAL AMOUNT</Text>
            <Text style={styles.footerValue}>₹{Math.round(item.price)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {needsPayment && (
              <TouchableOpacity style={styles.payNowBtn} onPress={() => onPayNow(item)}>
                <MaterialCommunityIcons name="credit-card-outline" size={16} color={colors.accentDark} />
                <Text style={styles.payNowText}>Pay Now</Text>
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(item.id)}>
                <MaterialCommunityIcons name="close-circle-outline" size={16} color={colors.error} />
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function PastBookingCard({ item, navigation, colors, onRateJob }) {
  const styles = getStyles(colors);
  const isCxl = item.status === 'cancelled';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.iconCircle, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name={getServiceIcon(item.service_category)} size={18} color={colors.textSecondary} />
          </View>
          <View>
            <Text style={styles.cardTitle}>{item.service_category}</Text>
            <Text style={styles.cardSub}>ID: #SRV{item.id} · {item.booking_date}</Text>
          </View>
        </View>
        <StatusBadge status={item.status} colors={colors} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.footerRow}>
          <View>
            <Text style={styles.footerLabel}>GRAND TOTAL</Text>
            <Text style={styles.footerValue}>₹{Math.round(item.price)}</Text>
          </View>
          
          {!isCxl && (
            item.review ? (
              <View style={styles.ratingOverview}>
                <Text style={styles.stars}>{'★'.repeat(item.review.rating)}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.reviewBtn}
                onPress={() => onRateJob(item)}
              >
                <MaterialCommunityIcons name="star-outline" size={14} color={colors.accentDark} />
                <Text style={styles.reviewBtnText}>Rate Job</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </View>
  );
}

export default function BookingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const token = useAuthStore((s) => s.token);
  const isLoading = useBookingStore((s) => s.isLoading);
  const error = useBookingStore((s) => s.error);
  const bookings = useBookingStore((s) => s.bookings);
  const activeFilter = useBookingStore((s) => s.activeFilter);
  const fetchBookings = useBookingStore((s) => s.fetchBookings);
  const setActiveFilter = useBookingStore((s) => s.setActiveFilter);
  const cancelBooking = useBookingStore((s) => s.cancelBooking);

  const showToast = useNotificationStore((s) => s.showToast);
  const showDialog = useNotificationStore((s) => s.showDialog);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Rating bottom sheet states
  const [ratingBooking, setRatingBooking] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const COMPLIMENT_TAGS = ['On Time', 'Clean Work', 'Professional', 'Polite', 'Good Value', 'Helpful'];

  const handlePayNow = async (booking) => {
    const result = await payForBooking(booking, useAuthStore.getState().user);
    if (result.success) {
      showToast('success', 'Payment Complete', 'Your payment was received. Thank you!');
    } else if (result.cancelled) {
      showToast('warning', 'Payment Not Completed', 'You can pay any time from here.');
    } else {
      showToast('error', 'Payment Issue', result.message);
    }
    // Refresh either way - the status may have changed (e.g. the webhook
    // recorded a payment our own confirmation call never got to).
    try {
      await fetchBookings();
    } catch (err) {
      console.log('Error refreshing bookings after payment:', err);
    }
  };

  const handleOpenRatingTray = (booking) => {
    setRatingBooking(booking);
    setRatingValue(5); // Default to 5 stars
    setRatingComment('');
    setSelectedTags([]);
  };

  const handleToggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const submitReview = useBookingStore((s) => s.submitReview);

  const handleSubmitReview = async () => {
    if (ratingValue === 0) return;
    setIsSubmittingReview(true);
    try {
      const tagsString = selectedTags.length > 0 ? ` [${selectedTags.join(', ')}]` : '';
      const finalComment = (ratingComment.trim() + tagsString).trim();
      await submitReview(ratingBooking.id, ratingValue, finalComment || 'Rated ' + ratingValue + ' stars');
      setRatingBooking(null);
      showToast('success', 'Thank You!', 'Your rating has been submitted successfully.');
    } catch (err) {
      console.log('Error submitting review:', err);
      showToast('error', 'Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    switch (activeFilter) {
      case 'upcoming': return isUpcomingBooking(b);
      case 'active': return isActiveBooking(b);
      case 'completed': return isCompletedBooking(b);
      case 'cancelled': return isCancelledBooking(b);
      default: return true;
    }
  });

  const loadBookings = useCallback(async () => {
    const currentToken = useAuthStore.getState().token;
    if (currentToken) {
      try {
        await fetchBookings();
      } catch (err) {
        console.log('Error load bookings:', err);
      }
    }
  }, [fetchBookings]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadBookings();
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleCancel = (bookingId) => {
    showDialog({
      icon: 'warning',
      title: 'Cancel Booking',
      description: 'Are you sure you want to cancel this booking?',
      primaryText: 'Cancel Booking',
      secondaryText: 'Keep Booking',
      primaryAccent: colors.primary,
      onConfirm: () => cancelBooking(bookingId),
    });
  };

  const renderBooking = ({ item }) =>
    isActiveBooking(item) ? (
      <ActiveBookingCard item={item} onCancel={handleCancel} onPayNow={handlePayNow} navigation={navigation} colors={colors} />
    ) : (
      <PastBookingCard item={item} navigation={navigation} colors={colors} onRateJob={handleOpenRatingTray} />
    );

  if (!token) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={{ paddingHorizontal: SIZES.padding }}>
          <Text style={styles.header}>My Bookings</Text>
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>Login to check bookings</Text>
            <Text style={styles.authText}>
              Keep track of schedules, live ETA and chat with partners from here.
            </Text>
            <TouchableOpacity
              style={styles.authBtn}
              onPress={() => navigation.getParent()?.getParent()?.navigate('Auth', { screen: 'Login' })}
            >
              <Text style={styles.authBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: SIZES.padding }}>
        <Text style={styles.header}>My Bookings</Text>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <BookingsShimmer colors={colors} />
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id?.toString()}
          contentContainerStyle={[
            styles.list,
            {
              paddingHorizontal: SIZES.padding,
              paddingBottom: insets.bottom + 130,
            },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="calendar-remove" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                No bookings matches this filter status.
              </Text>
              <TouchableOpacity
                style={styles.bookCTA}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.bookCTAText}>Book Service</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={renderBooking}
        />
      )}

      {/* Rating Bottom Sheet Tray */}
      <Modal
        visible={ratingBooking !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setRatingBooking(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setRatingBooking(null)}
          />
          <View style={styles.trayContainer}>
            {/* Smooth Indicator line on top */}
            <View style={styles.dragHandle} />

            <View style={styles.trayHeader}>
              <Text style={styles.trayTitle}>Rate Service</Text>
              <TouchableOpacity onPress={() => setRatingBooking(null)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.trayContent}>
              {/* Partner Details Card */}
              <View style={styles.ratingPartnerCard}>
                <View style={styles.ratingIconCircle}>
                  <MaterialCommunityIcons
                    name={getServiceIcon(ratingBooking?.service_category)}
                    size={28}
                    color={colors.textPrimary}
                  />
                </View>
                <Text style={styles.ratingPartnerName}>{ratingBooking?.service_category}</Text>
                <Text style={styles.ratingBookingSub}>Booking ID: #SRV{ratingBooking?.id}</Text>
              </View>

              {/* Interactive Stars Row */}
              <Text style={styles.starsPrompt}>How was your experience?</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRatingValue(star)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={star <= ratingValue ? 'star' : 'star-outline'}
                      size={40}
                      color={star <= ratingValue ? '#F59E0B' : colors.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Compliments (Uber-style) */}
              <Text style={styles.sectionLabel}>What did you like?</Text>
              <View style={styles.tagsContainer}>
                {COMPLIMENT_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagChip, isSelected && styles.tagChipActive]}
                      onPress={() => handleToggleTag(tag)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Feedback Comment input */}
              <Text style={styles.sectionLabel}>Additional Feedback</Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Tell us what went well or how we can improve..."
                placeholderTextColor={colors.textMuted}
                value={ratingComment}
                onChangeText={setRatingComment}
                multiline
                numberOfLines={3}
              />

              {/* Submit CTA button */}
              <TouchableOpacity
                style={[styles.submitBtn, ratingValue === 0 && styles.submitBtnDisabled]}
                onPress={handleSubmitReview}
                disabled={ratingValue === 0 || isSubmittingReview}
                activeOpacity={0.8}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator size="small" color={colors.accentDark} />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Rating</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { fontSize: 28, fontWeight: '800', marginBottom: 18, color: colors.textPrimary, marginTop: 10 },

    filterRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: colors.surface,
    },
    filterChipActive: { backgroundColor: colors.primary },
    filterChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
    filterChipTextActive: { color: colors.accentDark },

    list: { gap: 16 },

    card: {
      backgroundColor: colors.card,
      borderRadius: 24,
      overflow: 'hidden',
      ...SHADOW,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardTitle: { fontWeight: '800', color: colors.textPrimary, fontSize: 15 },
    cardSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
    cardBody: { padding: 16, paddingTop: 8 },

    badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.primary === '#F5F1E8' ? 'rgba(245, 241, 232, 0.08)' : 'rgba(216, 198, 176, 0.15)' },
    badgeText: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    badgeSuccess: { backgroundColor: 'rgba(34, 197, 94, 0.08)' },
    badgeTextSuccess: { color: colors.success },
    badgeDanger: { backgroundColor: 'rgba(239, 68, 68, 0.08)' },
    badgeTextDanger: { color: colors.error },

    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    detailText: { color: colors.textSecondary, fontSize: 13, flex: 1 },

    timeline: {
      flexDirection: 'row',
      position: 'relative',
      paddingTop: 12,
      marginVertical: 14,
    },
    timelineTrack: {
      position: 'absolute',
      top: 18,
      left: '10%',
      right: '10%',
      height: 1.5,
      backgroundColor: colors.border,
    },
    timelineTrackFill: {
      position: 'absolute',
      top: 18,
      left: '10%',
      height: 1.5,
      backgroundColor: colors.primary,
    },
    timelineStep: { flex: 1, alignItems: 'center', zIndex: 1 },
    timelineLabel: { fontSize: 9, color: colors.textMuted, marginTop: 6, fontWeight: '600' },
    timelineLabelActive: { color: colors.primary, fontWeight: '800' },

    partnerWidget: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 12,
      marginVertical: 14,
    },
    partnerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    partnerAvatarCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    partnerAvatarText: { color: colors.accentDark, fontWeight: '800', fontSize: 14 },
    partnerLabel: { fontSize: 9, color: colors.textSecondary, fontWeight: '700' },
    partnerName: { fontWeight: '800', color: colors.textPrimary, fontSize: 13, marginTop: 1 },
    partnerActions: { flexDirection: 'row', gap: 6 },
    actionBtnCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    broadcastingWidget: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      marginVertical: 14,
      gap: 10,
    },
    broadcastingPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning },
    broadcastingText: { color: colors.textSecondary, fontWeight: '600', fontSize: 12, flex: 1 },

    otpBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.primary === '#F5F1E8' ? 'rgba(245, 241, 232, 0.08)' : 'rgba(216, 198, 176, 0.15)',
      borderRadius: 18,
      padding: 12,
      marginVertical: 10,
    },
    otpTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 13 },
    otpHelp: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
    otpBox: { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
    otpDigits: { fontWeight: '900', fontSize: 15, letterSpacing: 2, color: colors.textPrimary },

    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: 14,
      paddingTop: 14,
    },
    footerLabel: { color: colors.textSecondary, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
    footerValue: { color: colors.textPrimary, fontWeight: '900', fontSize: 18, marginTop: 2 },
    payNowBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#22C55E',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
    },
    payNowText: { fontSize: 13, fontWeight: '800', color: colors.accentDark },
    cancelBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    cancelText: { color: colors.error, fontWeight: '700', fontSize: 12 },

    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    reviewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    reviewBtnText: { color: colors.accentDark, fontWeight: '700', fontSize: 12 },
    ratingOverview: { alignItems: 'flex-end' },
    stars: { color: colors.warning, fontWeight: '800', fontSize: 13 },

    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 30,
      alignItems: 'center',
      marginTop: 20,
    },
    emptyText: { color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginTop: 12, fontSize: 14 },
    bookCTA: {
      marginTop: 20,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    bookCTAText: { color: colors.accentDark, fontWeight: '800', fontSize: 14 },

    authCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 24,
      marginTop: 10,
    },
    authTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
    authText: { color: colors.textSecondary, lineHeight: 20, marginBottom: 20, fontSize: 13 },
    authBtn: { backgroundColor: colors.primary, padding: 14, borderRadius: 14, alignItems: 'center' },
    authBtnText: { fontWeight: '800', color: colors.accentDark },

    errorCard: {
      padding: 12,
      marginBottom: 16,
      borderRadius: 10,
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    errorText: { color: colors.error, fontSize: 13, textAlign: 'center' },

    // Rating Bottom Sheet styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    modalDismissArea: {
      flex: 1,
    },
    trayContainer: {
      height: '70%',
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dragHandle: {
      width: 42,
      height: 5,
      backgroundColor: colors.border,
      borderRadius: 3,
      alignSelf: 'center',
      marginBottom: 16,
    },
    trayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    trayTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    trayContent: {
      paddingBottom: 40,
    },
    ratingPartnerCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      alignItems: 'center',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ratingIconCircle: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ratingPartnerName: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    ratingBookingSub: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    starsPrompt: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 14,
    },
    starsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 28,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 24,
    },
    tagChip: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    tagChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tagText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    tagTextActive: {
      color: colors.accentDark,
      fontWeight: '700',
    },
    feedbackInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.textPrimary,
      height: 80,
      textAlignVertical: 'top',
      marginBottom: 28,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnDisabled: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    submitBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.accentDark,
    },
  });