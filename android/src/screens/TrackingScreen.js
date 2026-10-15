import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, SIZES } from '../theme';
import useBookingStore from '../stores/bookingStore';
import { useNotificationStore } from '../stores/notificationStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TrackingScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const { bookingId, partnerName } = route.params || {};

  // Retrieve service category dynamically from store
  const bookings = useBookingStore((s) => s.bookings);
  const booking = bookings.find((b) => b.id === bookingId);
  const serviceCategory = booking?.service_category || 'Electrician';

  const showToast = useNotificationStore((s) => s.showToast);

  const handleCall = () => {
    showToast('info', 'Calling Partner', `Connecting call to ${partnerName || 'Rajesh Kumar'}...`);
  };

  const handleShareLocation = () => {
    showToast('success', 'Location Shared', 'Your live location has been shared with the partner.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      {/* 60% Map Section */}
      <View style={styles.mapArea}>
        {/* Mock Light Map Background */}
        <View style={styles.mapGrid}>
          {/* Main horizontal streets */}
          <View style={[styles.street, { top: '15%', width: '100%', height: 16 }]} />
          <View style={[styles.street, { top: '35%', width: '100%', height: 16 }]} />
          <View style={[styles.street, { top: '60%', width: '100%', height: 16 }]} />
          {/* Minor horizontal streets */}
          <View style={[styles.streetMinor, { top: '25%', width: '100%', height: 6 }]} />
          <View style={[styles.streetMinor, { top: '48%', width: '100%', height: 6 }]} />

          {/* Main vertical streets */}
          <View style={[styles.street, { left: '30%', height: '100%', width: 16 }]} />
          <View style={[styles.street, { left: '45%', height: '100%', width: 16 }]} />
          <View style={[styles.street, { left: '70%', height: '100%', width: 16 }]} />
          {/* Minor vertical streets */}
          <View style={[styles.streetMinor, { left: '15%', height: '100%', width: 6 }]} />
          <View style={[styles.streetMinor, { left: '85%', height: '100%', width: 6 }]} />

          {/* Route path in gold/accent color connecting partner and customer */}
          {/* Path Down from partner */}
          <View style={[styles.routePath, { top: '15%', left: '68%', width: 6, height: '20%' }]} />
          {/* Path Left */}
          <View style={[styles.routePath, { top: '35%', left: '47%', width: '22%', height: 6 }]} />
          {/* Path Down to customer */}
          <View style={[styles.routePath, { top: '35%', left: '45%', width: 6, height: '25%' }]} />
        </View>

        {/* Customer Pin Marker (Black Pin) */}
        <View style={[styles.markerContainer, { top: '60%', left: '45%' }]}>
          <View style={styles.customerMarkerBg}>
            <MaterialCommunityIcons name="map-marker" size={26} color="#000000" />
          </View>
        </View>

        {/* Floating ETA Speech Bubble */}
        <View style={[styles.etaBubble, { top: '25%', left: '55%' }]}>
          <Text style={styles.etaBubbleTitle}>Arriving in</Text>
          <Text style={styles.etaBubbleValue}>20 mins</Text>
          {/* Tiny pointer under the bubble */}
          <View style={styles.etaBubblePointer} />
        </View>

        {/* Partner Marker (With photo/icon) */}
        <View style={[styles.markerContainer, { top: '15%', left: '70%' }]}>
          <View style={styles.partnerMarkerWrap}>
            <View style={styles.partnerMarkerInner}>
              <MaterialCommunityIcons name="account" size={22} color={colors.accentDark} />
            </View>
          </View>
        </View>

        {/* Floating Back Button */}
        <TouchableOpacity style={styles.circleBackButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Slidable Bottom Sheet (40% Screen height, flat with top border) */}
      <View style={styles.bottomSheet}>
        {/* Drag handle pill */}
        <View style={styles.dragHandle} />

        {/* Partner Info Details Block */}
        <View style={styles.partnerRow}>
          <View style={styles.partnerInfo}>
            <View style={styles.partnerAvatarCircle}>
              <Text style={styles.partnerAvatarText}>
                {partnerName ? partnerName[0]?.toUpperCase() : 'R'}
              </Text>
            </View>
            <View>
              <Text style={styles.partnerName}>{partnerName || 'Rajesh Kumar'}</Text>
              <View style={styles.ratingRow}>
                <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  4.9 <Text style={{ color: colors.textMuted }}>(125) · 10 yrs exp</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Circle Call Button on the right of partner info */}
          <TouchableOpacity style={styles.callCircleBtn} onPress={handleCall} activeOpacity={0.8}>
            <MaterialCommunityIcons name="phone" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Highlighted Service Details Card (Flat with border, no shadow) */}
        <View style={styles.serviceDetailCard}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Service</Text>
            <Text style={styles.detailValue}>{serviceCategory}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Booking ID</Text>
            <Text style={styles.detailValue}>#SRV{bookingId || '27'}</Text>
          </View>
        </View>

        {/* Bottom Actions Row */}
        <View style={styles.bottomActionsRow}>
          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={() =>
              navigation.navigate('Chat', {
                bookingId,
                partnerName: partnerName || 'Rajesh Kumar',
              })
            }
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="chat-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.actionBtnOutlineText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtnOutline} onPress={handleCall} activeOpacity={0.8}>
            <MaterialCommunityIcons name="phone-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.actionBtnOutlineText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtnFilled} onPress={handleShareLocation} activeOpacity={0.8}>
            <MaterialCommunityIcons name="navigation-variant" size={20} color={colors.accentDark} />
            <Text style={styles.actionBtnFilledText}>Share Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    mapArea: {
      height: '60%',
      backgroundColor: '#EFECE6', // Light map background
      position: 'relative',
    },
    mapGrid: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#EFECE6',
    },
    street: {
      position: 'absolute',
      backgroundColor: '#FFFFFF',
      borderWidth: 0.5,
      borderColor: '#E2DACD',
    },
    streetMinor: {
      position: 'absolute',
      backgroundColor: '#F5F2EA',
    },
    routePath: {
      position: 'absolute',
      backgroundColor: colors.primary, // Route drawn in warm accent color
      zIndex: 1,
    },
    markerContainer: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    customerMarkerBg: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: -20,
      marginTop: -20,
    },
    partnerMarkerWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: -18,
      marginTop: -18,
    },
    partnerMarkerInner: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    etaBubble: {
      position: 'absolute',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3,
      marginLeft: -50,
      marginTop: -60,
    },
    etaBubbleTitle: {
      fontSize: 10,
      color: '#767676',
      fontWeight: '600',
    },
    etaBubbleValue: {
      fontSize: 14,
      fontWeight: '800',
      color: '#161616',
      marginTop: 2,
    },
    etaBubblePointer: {
      position: 'absolute',
      bottom: -6,
      width: 10,
      height: 10,
      backgroundColor: '#FFFFFF',
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
      transform: [{ rotate: '45deg' }],
      alignSelf: 'center',
    },
    circleBackButton: {
      position: 'absolute',
      top: 16,
      left: 16,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 5,
    },
    bottomSheet: {
      height: '40%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: SIZES.padding,
      paddingTop: 10,
    },
    dragHandle: {
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 20,
    },
    partnerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    partnerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    partnerAvatarCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    partnerAvatarText: {
      color: colors.accentDark,
      fontWeight: '800',
      fontSize: 18,
    },
    partnerName: {
      color: colors.textPrimary,
      fontWeight: '800',
      fontSize: 16,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    ratingText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    callCircleBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    serviceDetailCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
      marginBottom: 24,
    },
    detailItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    detailValue: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '800',
    },
    detailDivider: {
      height: 0.5,
      backgroundColor: colors.border,
    },
    bottomActionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtnOutline: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    actionBtnOutlineText: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 13,
    },
    actionBtnFilled: {
      flex: 2,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    actionBtnFilledText: {
      color: colors.accentDark,
      fontWeight: '800',
      fontSize: 13,
    },
  });
