import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SIZES, useTheme } from '../theme';

export default function Shimmer({ style, colors }) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const { colors: themeColors } = useTheme();

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const activeColors = colors || themeColors;
  // If activeColors.background is the dark background, we are in dark mode
  const isDark = activeColors?.background === '#0B0B0B';
  const backgroundColor = isDark ? '#222222' : '#E8E5DF';

  return (
    <Animated.View
      style={[
        styles.shimmer,
        {
          opacity: pulseAnim,
          backgroundColor,
        },
        style,
      ]}
    />
  );
}

export function HomeShimmer({ colors }) {
  const { colors: themeColors } = useTheme();
  const activeColors = colors || themeColors;
  const activeStyles = getStyles(activeColors);

  return (
    <View style={activeStyles.shimmerContainer}>
      {/* Header Row */}
      <View style={{ marginBottom: 22, marginTop: 10 }}>
        <Shimmer style={{ width: 120, height: 14, marginBottom: 8 }} colors={activeColors} />
        <Shimmer style={{ width: 220, height: 26, borderRadius: 6 }} colors={activeColors} />
      </View>

      {/* Search Input Box */}
      <Shimmer style={{ height: 48, borderRadius: 16, marginBottom: 20 }} colors={activeColors} />

      {/* Quick Services Title Shimmer */}
      <Shimmer style={{ width: 140, height: 18, marginBottom: 14, marginTop: 10 }} colors={activeColors} />
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
        {[1, 2, 3].map((i) => (
          <Shimmer key={i} style={{ width: 110, height: 44, borderRadius: 14 }} colors={activeColors} />
        ))}
      </View>

      {/* Popular Services Title Shimmer */}
      <Shimmer style={{ width: 160, height: 18, marginBottom: 14 }} colors={activeColors} />
      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 26 }}>
        {[1, 2].map((i) => (
          <View key={i} style={{ width: 156, height: 180, borderRadius: 20, backgroundColor: activeColors.card, padding: 16 }}>
            <Shimmer style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 12 }} colors={activeColors} />
            <Shimmer style={{ width: 100, height: 14, marginBottom: 8 }} colors={activeColors} />
            <Shimmer style={{ width: 60, height: 10, marginBottom: 16 }} colors={activeColors} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
              <Shimmer style={{ width: 50, height: 12 }} colors={activeColors} />
              <Shimmer style={{ width: 40, height: 24, borderRadius: 8 }} colors={activeColors} />
            </View>
          </View>
        ))}
      </View>

      {/* Recommended Partners Title Shimmer */}
      <Shimmer style={{ width: 180, height: 18, marginBottom: 14 }} colors={activeColors} />
      {[1, 2].map((i) => (
        <View key={i} style={activeStyles.providerRow}>
          <Shimmer style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} colors={activeColors} />
          <View style={{ flex: 1 }}>
            <Shimmer style={{ width: 100, height: 14, marginBottom: 6 }} colors={activeColors} />
            <Shimmer style={{ width: 140, height: 10 }} colors={activeColors} />
          </View>
          <Shimmer style={{ width: 48, height: 14 }} colors={activeColors} />
        </View>
      ))}
    </View>
  );
}

export function ServicesShimmer({ colors }) {
  const { colors: themeColors } = useTheme();
  const activeColors = colors || themeColors;
  const activeStyles = getStyles(activeColors);

  return (
    <View style={activeStyles.shimmerContainer}>
      <View style={{ marginBottom: 18, marginTop: 10 }}>
        <Shimmer style={{ width: 180, height: 26, marginBottom: 8 }} colors={activeColors} />
        <Shimmer style={{ width: '90%', height: 14 }} colors={activeColors} />
      </View>

      {/* Grid of Categories (Airbnb/Minimal Style: 2 columns, width 48%) */}
      <View style={activeStyles.gridContainer}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={activeStyles.categoryCardShimmer}>
            <Shimmer style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 12 }} colors={activeColors} />
            <Shimmer style={{ width: 100, height: 14, marginBottom: 6 }} colors={activeColors} />
            <Shimmer style={{ width: 60, height: 10 }} colors={activeColors} />
          </View>
        ))}
      </View>

      <View style={{ borderTopWidth: 1, borderColor: activeColors.border, marginVertical: 12 }} />

      <Shimmer style={{ width: 190, height: 26, marginBottom: 14 }} colors={activeColors} />
      <Shimmer style={{ height: 46, borderRadius: 16, marginBottom: 16 }} colors={activeColors} />

      {/* Provider List Shimmer */}
      {[1, 2].map((i) => (
        <View key={i} style={activeStyles.providerCardShimmer}>
          <Shimmer style={{ height: 120, borderRadius: 16, marginBottom: 12 }} colors={activeColors} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Shimmer style={{ width: 120, height: 16 }} colors={activeColors} />
            <Shimmer style={{ width: 40, height: 12 }} colors={activeColors} />
          </View>
          <Shimmer style={{ width: '85%', height: 12, marginBottom: 12 }} colors={activeColors} />
          <View style={{ borderTopWidth: 1, borderColor: activeColors.border, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Shimmer style={{ width: 60, height: 14 }} colors={activeColors} />
            </View>
            <Shimmer style={{ width: 80, height: 32, borderRadius: 10 }} colors={activeColors} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function BookingsShimmer({ colors }) {
  const { colors: themeColors } = useTheme();
  const activeColors = colors || themeColors;
  const activeStyles = getStyles(activeColors);

  return (
    <View style={activeStyles.shimmerContainer}>
      <Shimmer style={{ width: 150, height: 24, marginBottom: 16, marginTop: 10 }} colors={activeColors} />

      {/* Tab Filter Chips Shimmer */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[1, 2, 3, 4].map((i) => (
          <Shimmer key={i} style={{ width: 80, height: 36, borderRadius: 20 }} colors={activeColors} />
        ))}
      </View>

      {/* Booking Cards Shimmer */}
      {[1, 2].map((i) => (
        <View key={i} style={activeStyles.bookingCardShimmer}>
          {/* Card Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Shimmer style={{ width: 40, height: 40, borderRadius: 14 }} colors={activeColors} />
              <View>
                <Shimmer style={{ width: 100, height: 14, marginBottom: 6 }} colors={activeColors} />
                <Shimmer style={{ width: 60, height: 10 }} colors={activeColors} />
              </View>
            </View>
            <Shimmer style={{ width: 70, height: 24, borderRadius: 10 }} colors={activeColors} />
          </View>

          {/* Card Body */}
          <View style={{ padding: 16, paddingTop: 0 }}>
            {/* Timeline Shimmer */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 }}>
              {[1, 2, 3, 4].map((j) => (
                <View key={j} style={{ alignItems: 'center', flex: 1 }}>
                  <Shimmer style={{ width: 8, height: 8, borderRadius: 4, marginBottom: 6 }} colors={activeColors} />
                  <Shimmer style={{ width: 40, height: 8, borderRadius: 2 }} colors={activeColors} />
                </View>
              ))}
            </View>

            {/* Details Shimmer */}
            <View style={{ gap: 10, marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Shimmer style={{ width: 16, height: 16, borderRadius: 4 }} colors={activeColors} />
                <Shimmer style={{ width: '60%', height: 12 }} colors={activeColors} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Shimmer style={{ width: 16, height: 16, borderRadius: 4 }} colors={activeColors} />
                <Shimmer style={{ width: '80%', height: 12 }} colors={activeColors} />
              </View>
            </View>

            {/* OTP Banner Shimmer */}
            <View style={{ height: 44, borderRadius: 18, backgroundColor: activeColors.background, marginVertical: 14, paddingHorizontal: 12, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Shimmer style={{ width: 120, height: 12 }} colors={activeColors} />
                <Shimmer style={{ width: 50, height: 20, borderRadius: 6 }} colors={activeColors} />
              </View>
            </View>

            <View style={{ borderTopWidth: 1, borderColor: activeColors.border, marginVertical: 12 }} />

            {/* Footer */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Shimmer style={{ width: 60, height: 8, marginBottom: 4 }} colors={activeColors} />
                <Shimmer style={{ width: 80, height: 18 }} colors={activeColors} />
              </View>
              <Shimmer style={{ width: 90, height: 36, borderRadius: 12 }} colors={activeColors} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    shimmerContainer: {
      flex: 1,
      paddingHorizontal: SIZES.padding,
    },
    providerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 20,
    },
    categoryCardShimmer: {
      width: '48%',
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
    },
    providerCardShimmer: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 16,
      marginBottom: 16,
    },
    bookingCardShimmer: {
      backgroundColor: colors.card,
      borderRadius: 24,
      marginBottom: 16,
      overflow: 'hidden',
    },
  });

const styles = StyleSheet.create({
  shimmer: {
    borderRadius: 8,
  },
});
