import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../stores/authStore';
import useServiceStore from '../stores/serviceStore';
import useBookingStore from '../stores/bookingStore';
import { getServiceIcon } from '../utils/icons';
import { useTheme, SIZES, SHADOW } from '../theme';
import { HomeShimmer } from '../components/Shimmer';
import BroadcastingTimer from '../components/BroadcastingTimer';


const QUICK_SERVICES = [
  { label: 'Electrician', icon: 'flash', query: 'Electrician' },
  { label: 'AC Repair', icon: 'air-conditioner', query: 'AC' },
  { label: 'Plumbing', icon: 'water-pump', query: 'Plumbing' },
  { label: 'Appliance Repair', icon: 'cellphone-link', query: 'Appliance' },
  { label: 'Cleaning', icon: 'broom', query: 'Cleaning' },
  { label: 'Installation', icon: 'tools', query: 'Installation' },
];

const OFFERS = [
  { title: '20% OFF AC Service', desc: 'Beat the heat with premium AC servicing', code: 'BEATHEAT20', color: '#4F46E5' },
  { title: 'First Booking Discount', desc: 'Get flat ₹100 off on your first order', code: 'WELCOME100', color: '#065F46' },
  { title: 'Festival Offers', desc: 'Flat 15% off on home deep cleaning', code: 'CLEANFEST', color: '#701A75' },
];

const TRUST_ITEMS = [
  { icon: 'shield-check-outline', title: 'Verified Pros', desc: '100% background checked professionals.' },
  { icon: 'progress-wrench', title: 'Service Warranty', desc: '30-day post-service warranty cover.' },
  { icon: 'cash-lock', title: 'Transparent Prices', desc: 'No hidden fees. Pay what you see.' },
  { icon: 'face-agent', title: '24x7 Support', desc: 'Dedicated customer resolution team.' },
];

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const services = useServiceStore((s) => s.services);
  const partners = useServiceStore((s) => s.partners);
  const isLoading = useServiceStore((s) => s.isLoading);
  const partnersLoading = useServiceStore((s) => s.partnersLoading);
  const fetchServices = useServiceStore((s) => s.fetchServices);
  const fetchPartners = useServiceStore((s) => s.fetchPartners);

  const bookings = useBookingStore((s) => s.bookings);
  const fetchBookings = useBookingStore((s) => s.fetchBookings);
  const bookingsLoading = useBookingStore((s) => s.isLoading);

  const loadData = useCallback(async () => {
    const currentToken = useAuthStore.getState().token;
    await Promise.all([
      fetchServices(),
      fetchPartners(),
      currentToken ? fetchBookings() : Promise.resolve(),
    ]);
  }, [fetchServices, fetchPartners, fetchBookings]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Find active booking to display immediate tracking card
  const activeBooking = bookings.find((b) =>
    ['requested', 'accepted', 'on_the_way', 'in_progress'].includes(b.status)
  );

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const goToCategory = (categoryName) => {
    if (!token) {
      navigation.getParent()?.getParent()?.navigate('Auth', { screen: 'Login' });
      return;
    }
    if (user?.role === 'partner') return;
    
    // Find service object in state
    const matched = services.find((s) => s.name.toLowerCase().includes(categoryName.toLowerCase()));
    navigation.navigate('Booking', {
      categoryName: matched ? matched.name : categoryName,
      basePrice: matched ? matched.base_price : 399,
    });
  };

  const popularServices = [...services]
    .sort((a, b) => b.base_price - a.base_price)
    .slice(0, 5);

  const loading = isLoading || partnersLoading || (token && bookingsLoading);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {loading && services.length === 0 ? (
        <HomeShimmer colors={colors} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 130 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greetingText}>
                {greeting()}, {user ? user.name.split(' ')[0] : 'Guest'} 👋
              </Text>
              <View style={styles.locationSelector}>
                <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {user?.address || 'Mumbai, Maharashtra'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={14} color={colors.textSecondary} />
              </View>
            </View>
          </View>

          {/* Minimalist Search Banner */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchHeaderTitle}>What service do you need?</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.searchBox}
              onPress={() => navigation.navigate('Explore')}
            >
              <MaterialCommunityIcons name="magnify" size={22} color={colors.textSecondary} />
              <Text style={styles.searchTextPlaceholder}>Search home repairs, cleaning...</Text>
            </TouchableOpacity>
          </View>

          {/* Active Booking Card (Displayed if there is an active job) */}
          {activeBooking && (
            <View style={styles.activeBookingCard}>
              <View style={styles.activeBookingHeader}>
                <View style={styles.statusIndicatorRow}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.activeBookingStatus}>
                    Job Status: {activeBooking.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.activeBookingEta}>Arriving in 15 mins</Text>
              </View>

              <View style={styles.activeBookingBody}>
                {activeBooking.status === 'requested' ? (
                  <BroadcastingTimer
                    createdAt={activeBooking.created_at}
                    onTimeout={() => useBookingStore.getState().cancelBooking(activeBooking.id)}
                  />
                ) : (

                  <View style={styles.activeBookingPartner}>
                    <View style={styles.bookingIconCircle}>
                      <MaterialCommunityIcons
                        name={getServiceIcon(activeBooking.service_category)}
                        size={24}
                        color={colors.accentDark}
                      />
                    </View>
                    <View>
                      <Text style={styles.bookingCategoryName}>{activeBooking.service_category}</Text>
                      <Text style={styles.bookingPartnerName}>
                        {activeBooking.partner?.name || 'Assigning certified partner...'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>


              <View style={styles.activeBookingActions}>
                <TouchableOpacity
                  style={styles.activeChatButton}
                  onPress={() =>
                    navigation.navigate('Chat', {
                      bookingId: activeBooking.id,
                      partnerName: activeBooking.partner?.name || 'Technician',
                    })
                  }
                >
                  <MaterialCommunityIcons name="chat-processing-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.activeChatButtonText}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.activeTrackButton}
                  onPress={() =>
                    navigation.navigate('Tracking', {
                      bookingId: activeBooking.id,
                      partnerName: activeBooking.partner?.name || 'Technician',
                    })
                  }
                >
                  <MaterialCommunityIcons name="navigation-variant-outline" size={18} color={colors.accentDark} />
                  <Text style={styles.activeTrackButtonText}>Track Live</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Quick Services Filter Grid */}
          <Text style={styles.sectionHeaderTitle}>Quick Bookings</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickServicesContainer}
          >
            {QUICK_SERVICES.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.quickChip}
                onPress={() => goToCategory(item.query)}
              >
                <MaterialCommunityIcons name={item.icon} size={18} color={colors.primary} />
                <Text style={styles.quickChipLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Popular Services Carousel */}
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionHeaderTitle}>Popular Services</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Explore')}>
              <Text style={styles.viewAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContainer}
          >
            {popularServices.map((item) => (
              <View key={item.id} style={styles.popularCard}>
                <View style={styles.popularIconWrap}>
                  <MaterialCommunityIcons
                    name={getServiceIcon(item.icon_key)}
                    size={36}
                    color={colors.textPrimary}
                  />
                </View>
                <Text style={styles.popularCardName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.popularCardMeta}>
                  <Text style={styles.popularCardPrice}>From ₹{item.base_price}</Text>
                  <View style={styles.ratingBadge}>
                    <MaterialCommunityIcons name="star" size={12} color={colors.warning} />
                    <Text style={styles.ratingNumber}>4.8</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.bookNowButton}
                  onPress={() =>
                    navigation.navigate('Booking', {
                      categoryName: item.name,
                      basePrice: item.base_price,
                    })
                  }
                >
                  <Text style={styles.bookNowText}>Book Now</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Top Rated Professionals */}
          <Text style={styles.sectionHeaderTitle}>Top Professionals Nearby</Text>
          <View style={styles.proList}>
            {partners.slice(0, 3).map((pro) => (
              <View key={pro.id} style={styles.proCard}>
                <View style={styles.proHeader}>
                  <View style={styles.proAvatarWrap}>
                    <Text style={styles.proAvatarText}>{pro.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.proDetails}>
                    <View style={styles.proNameRow}>
                      <Text style={styles.proName}>{pro.name}</Text>
                      <MaterialCommunityIcons name="check-decagram" size={16} color={colors.primary} />
                    </View>
                    <Text style={styles.proCategory}>
                      {pro.partner_profile?.service_category || 'General Partner'}
                    </Text>
                  </View>
                </View>
                <View style={styles.proStatsRow}>
                  <View style={styles.proStatItem}>
                    <Text style={styles.proStatValue}>{pro.partner_profile?.rating || '4.9'}★</Text>
                    <Text style={styles.proStatLabel}>Rating</Text>
                  </View>
                  <View style={styles.proStatItem}>
                    <Text style={styles.proStatValue}>
                      {pro.partner_profile?.completed_jobs || 140}+
                    </Text>
                    <Text style={styles.proStatLabel}>Jobs</Text>
                  </View>
                  <View style={styles.proStatItem}>
                    <Text style={styles.proStatValue}>
                      ₹{pro.partner_profile?.hourly_rate || '299'}/hr
                    </Text>
                    <Text style={styles.proStatLabel}>Rate</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.proBookButton}
                  onPress={() => goToCategory(pro.partner_profile?.service_category || 'Electrician')}
                >
                  <Text style={styles.proBookButtonText}>Book Partner</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Offers Carousel */}
          <Text style={styles.sectionHeaderTitle}>Special Offers</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.offersContainer}
          >
            {OFFERS.map((offer, idx) => (
              <View key={idx} style={[styles.offerCard, { backgroundColor: offer.color }]}>
                <Text style={styles.offerTitle}>{offer.title}</Text>
                <Text style={styles.offerDesc}>{offer.desc}</Text>
                <View style={styles.offerCodeRow}>
                  <Text style={styles.offerCode}>CODE: {offer.code}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Trust Section */}
          <Text style={styles.sectionHeaderTitle}>Why trust purakam?</Text>

          <View style={styles.trustGrid}>
            {TRUST_ITEMS.map((item, idx) => (
              <View key={idx} style={styles.trustCard}>
                <MaterialCommunityIcons name={item.icon} size={28} color={colors.textPrimary} />
                <Text style={styles.trustCardTitle}>{item.title}</Text>
                <Text style={styles.trustCardDesc}>{item.desc}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 32,
    },
    greetingText: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.4,
    },
    locationSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      gap: 6,
    },
    locationText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '500',
      maxWidth: 220,
    },
    profileAvatarButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      overflow: 'hidden',
    },
    profileAvatar: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileAvatarText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 16,
    },
    searchContainer: {
      marginBottom: 32,
    },
    searchHeaderTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 16,
      letterSpacing: -0.5,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    searchTextPlaceholder: {
      marginLeft: 12,
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: '500',
    },
    activeBookingCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      marginBottom: 32,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.02,
      shadowRadius: 6,
      elevation: 1,
    },
    activeBookingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    statusIndicatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pulseDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.success,
    },
    activeBookingStatus: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.success,
      letterSpacing: 0.8,
    },
    activeBookingEta: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '600',
    },
    activeBookingBody: {
      marginBottom: 20,
    },
    activeBookingPartner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    bookingIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bookingCategoryName: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 16,
    },
    bookingPartnerName: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    activeBookingActions: {
      flexDirection: 'row',
      gap: 12,
    },
    activeChatButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 44,
      borderRadius: 12,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    activeChatButtonText: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
    activeTrackButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    activeTrackButtonText: {
      color: colors.accentDark,
      fontWeight: '700',
      fontSize: 14,
    },
    sectionHeaderTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 16,
      marginTop: 16,
      letterSpacing: -0.2,
    },
    sectionHeadingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      marginTop: 16,
    },
    viewAllText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 14,
    },
    quickServicesContainer: {
      paddingRight: 24,
      marginBottom: 32,
      gap: 10,
    },
    quickChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.surface,
    },
    quickChipLabel: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 13,
    },
    carouselContainer: {
      paddingRight: 24,
      marginBottom: 32,
      gap: 14,
    },
    popularCard: {
      width: 156,
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.02,
      shadowRadius: 6,
      elevation: 1,
    },
    popularIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },
    popularCardName: {
      fontWeight: '700',
      color: colors.textPrimary,
      fontSize: 14,
      marginBottom: 4,
    },
    popularCardMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    popularCardPrice: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '500',
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    ratingNumber: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.warning,
    },
    bookNowButton: {
      width: '100%',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: 'center',
    },
    bookNowText: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 12,
    },
    proList: {
      marginBottom: 32,
      gap: 16,
    },
    proCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 18,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.02,
      shadowRadius: 6,
      elevation: 1,
    },
    proHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    proAvatarWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    proAvatarText: {
      color: colors.accentDark,
      fontWeight: '700',
      fontSize: 16,
    },
    proDetails: {
      flex: 1,
    },
    proNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    proName: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 15,
    },
    proCategory: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    proStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 12,
      marginVertical: 16,
    },
    proStatItem: {
      alignItems: 'center',
    },
    proStatValue: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 14,
    },
    proStatLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    proBookButton: {
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    proBookButtonText: {
      color: colors.accentDark,
      fontWeight: '700',
      fontSize: 14,
    },
    offersContainer: {
      paddingRight: 24,
      marginBottom: 32,
      gap: 14,
    },
    offerCard: {
      width: 240,
      borderRadius: 20,
      padding: 18,
      justifyContent: 'space-between',
      minHeight: 120,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.02,
      shadowRadius: 6,
      elevation: 1,
    },
    offerTitle: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 16,
      letterSpacing: -0.2,
    },
    offerDesc: {
      color: 'rgba(255, 255, 255, 0.85)',
      fontSize: 12,
      marginTop: 4,
      lineHeight: 16,
    },
    offerCodeRow: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginTop: 12,
    },
    offerCode: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 10,
    },
    trustGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 16,
    },
    trustCard: {
      width: '48%',
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
    },
    trustCardTitle: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 13,
      marginTop: 10,
      marginBottom: 4,
    },
    trustCardDesc: {
      color: colors.textSecondary,
      fontSize: 11,
      lineHeight: 15,
    },
  });