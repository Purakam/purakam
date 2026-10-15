import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useServiceStore from '../stores/serviceStore';
import useAuthStore from '../stores/authStore';
import { getServiceIcon } from '../utils/icons';
import { useTheme, SIZES, SHADOW } from '../theme';
import { ServicesShimmer } from '../components/Shimmer';

const FILTER_CHIPS = ['All', 'Electrical', 'Appliances', 'Water', 'Cleaning', 'Installation'];

export default function ServicesScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const user = useAuthStore((s) => s.user);

  const isLoading = useServiceStore((s) => s.isLoading);
  const partnersLoading = useServiceStore((s) => s.partnersLoading);
  const error = useServiceStore((s) => s.error);
  const searchQuery = useServiceStore((s) => s.searchQuery);
  const selectedCategory = useServiceStore((s) => s.selectedCategory);
  const partners = useServiceStore((s) => s.partners);
  const services = useServiceStore((s) => s.services);
  const fetchServices = useServiceStore((s) => s.fetchServices);
  const fetchPartners = useServiceStore((s) => s.fetchPartners);
  const setSearchQuery = useServiceStore((s) => s.setSearchQuery);
  const setSelectedCategory = useServiceStore((s) => s.setSelectedCategory);

  const [activeChip, setActiveChip] = useState('All');

  const filteredPartners = useMemo(() => {
    let result = [...partners];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.partner_profile?.bio && p.partner_profile.bio.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => (b.partner_profile?.rating || 0) - (a.partner_profile?.rating || 0));
    return result;
  }, [partners, searchQuery]);

  const loadData = useCallback(async () => {
    await fetchServices();
    await fetchPartners(selectedCategory || route?.params?.category || '');
  }, [fetchServices, fetchPartners, selectedCategory, route?.params?.category]);

  useEffect(() => {
    if (route?.params?.searchQuery) {
      setSearchQuery(route.params.searchQuery);
    }
    if (route?.params?.category) {
      setSelectedCategory(route.params.category);
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.searchQuery, route?.params?.category]);

  const handleChipPress = (chip) => {
    setActiveChip(chip);
    if (chip === 'All') {
      setSelectedCategory('');
      fetchPartners('');
    } else {
      setSelectedCategory(chip);
      fetchPartners(chip);
    }
  };

  const renderCategoryCard = (item) => (
    <TouchableOpacity
      key={item.id?.toString() || item.name}
      style={styles.categoryCard}
      activeOpacity={0.8}
      onPress={() => {
        if (!user) {
          navigation.getParent()?.getParent()?.navigate('Auth', { screen: 'Login' });
          return;
        }
        if (user.role === 'partner') return;
        navigation.navigate('Booking', { categoryName: item.name, basePrice: item.base_price });
      }}
    >
      <View style={styles.categoryIconCircle}>
        <MaterialCommunityIcons name={getServiceIcon(item.icon_key)} size={26} color={colors.textPrimary} />
      </View>
      <View style={styles.categoryCardDetails}>
        <Text style={styles.categoryCardName}>{item.name}</Text>
        <Text style={styles.categoryCardCount}>24 services</Text>
        <Text style={styles.categoryCardPrice}>From ₹{item.base_price}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPartnerRow = ({ item }) => (
    <View style={styles.providerCard}>
      <View style={styles.providerImageCover}>
        <MaterialCommunityIcons name="account" size={36} color={colors.textSecondary} />
        <View style={styles.providerBadge}>
          <MaterialCommunityIcons name="star" size={12} color={colors.warning} />
          <Text style={styles.providerBadgeText}>{item.partner_profile?.rating || '4.9'}</Text>
        </View>
      </View>
      <View style={styles.providerDetails}>
        <View style={styles.providerNameRow}>
          <Text style={styles.providerName}>{item.name}</Text>
          <MaterialCommunityIcons name="check-decagram" size={15} color={colors.primary} />
        </View>
        <Text style={styles.providerMeta}>
          {item.partner_profile?.service_category} · {item.partner_profile?.experience || '3'} yrs exp
        </Text>
        <Text style={styles.providerBio} numberOfLines={2}>
          {item.partner_profile?.bio || 'Certified specialist dedicated to delivering premium, high-quality home service solutions.'}
        </Text>
        <View style={styles.providerFooter}>
          <Text style={styles.providerPrice}>
            ₹{item.partner_profile?.hourly_rate || '299'}<Text style={styles.providerPriceUnit}>/hr</Text>
          </Text>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => {
              if (!user) {
                navigation.getParent()?.getParent()?.navigate('Auth', { screen: 'Login' });
                return;
              }
              navigation.navigate('Booking', {
                categoryName: item.partner_profile?.service_category || 'Electrician',
                basePrice: 399,
              });
            }}
          >
            <Text style={styles.bookButtonText}>Book Service</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View>
      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Explore Services</Text>
        <Text style={styles.subtitle}>Find top-rated local professionals instantly.</Text>
      </View>

      {/* Modern Search */}
      <View style={styles.searchBox}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search service providers..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {/* Filter Chips Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {FILTER_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip}
            style={[styles.chip, activeChip === chip && styles.chipActive]}
            onPress={() => handleChipPress(chip)}
          >
            <Text style={[styles.chipText, activeChip === chip && styles.chipTextActive]}>
              {chip}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Service Categories Section */}
      <Text style={styles.sectionHeader}>Service Categories</Text>
      <View style={styles.categoriesContainer}>
        {services.map((item) => renderCategoryCard(item))}
      </View>

      {/* Providers Header */}
      <Text style={styles.sectionHeader}>Certified Professionals</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {isLoading && services.length === 0 ? (
        <ServicesShimmer colors={colors} />
      ) : (
        <FlatList
          data={filteredPartners}
          keyExtractor={(item) => item.id?.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 130 }]}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            partnersLoading ? (
              <Text style={styles.emptyText}>Loading experts...</Text>
            ) : (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="account-search" size={32} color={colors.textMuted} />
                <Text style={styles.emptyText}>No service providers available in this category.</Text>
              </View>
            )
          }
          renderItem={renderPartnerRow}
        />
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
    listContent: {
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    titleContainer: {
      marginBottom: 24,
      marginTop: 8,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      marginTop: 4,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 20,
    },
    searchInput: {
      marginLeft: 10,
      flex: 1,
      color: colors.textPrimary,
      fontSize: 15,
    },
    chipsContainer: {
      gap: 8,
      paddingRight: 24,
      marginBottom: 24,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: colors.surface,
    },
    chipActive: {
      backgroundColor: colors.primary,
    },
    chipText: {
      color: colors.textSecondary,
      fontWeight: '600',
      fontSize: 13,
    },
    chipTextActive: {
      color: colors.accentDark,
    },
    sectionHeader: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 16,
      letterSpacing: -0.2,
    },
    categoriesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 28,
    },
    categoryCard: {
      width: '48%',
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      flexDirection: 'column',
      gap: 12,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.02,
      shadowRadius: 6,
      elevation: 1,
    },
    categoryIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    categoryCardDetails: {
      gap: 2,
    },
    categoryCardName: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 14,
    },
    categoryCardCount: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    categoryCardPrice: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    providerCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.02,
      shadowRadius: 6,
      elevation: 1,
    },
    providerImageCover: {
      height: 120,
      backgroundColor: colors.surface,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    providerBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 2,
    },
    providerBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    providerDetails: {
      marginTop: 12,
    },
    providerNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    providerName: {
      fontWeight: '700',
      color: colors.textPrimary,
      fontSize: 16,
    },
    providerMeta: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    providerBio: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 8,
    },
    providerFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    providerPrice: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    providerPriceUnit: {
      fontSize: 12,
      fontWeight: '400',
      color: colors.textSecondary,
    },
    bookButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    bookButtonText: {
      color: colors.accentDark,
      fontWeight: '700',
      fontSize: 12,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      marginTop: 10,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 8,
    },
  });