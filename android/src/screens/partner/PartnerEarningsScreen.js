import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import usePartnerStore from '../../stores/partnerStore';
import { useTheme, SIZES, SHADOW } from '../../theme';

export default function PartnerEarningsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const isLoading = usePartnerStore((s) => s.isLoading);
  const error = usePartnerStore((s) => s.error);
  const earnings = usePartnerStore((s) => s.earnings);
  const fetchEarnings = usePartnerStore((s) => s.fetchEarnings);

  const loadEarnings = useCallback(async () => {
    try {
      await fetchEarnings();
    } catch (err) {
      console.log('Error loading earnings:', err);
    }
  }, [fetchEarnings]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchEarnings();
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  const earningsData = [
    { key: 'today', label: "Today's Earnings", amount: earnings.today },
    { key: 'weekly', label: 'This week', amount: earnings.weekly },
    { key: 'monthly', label: 'This month', amount: earnings.monthly },
    { key: 'total', label: 'Total earnings', amount: earnings.total },
  ];

  const formatAmount = (amount) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionCard}>
      <View>
        <Text style={styles.transactionTitle}>{item.service_category}</Text>
        <Text style={styles.transactionDate}>
          {item.booking_date} · #{item.id}
        </Text>
      </View>
      <Text style={styles.transactionAmount}>₹{item.price}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Text style={styles.header}>Earnings</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isLoading && earnings.transactions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <>
          <View style={styles.earningsGrid}>
            {earningsData.map((item) => (
              <View key={item.key} style={styles.earningsCard}>
                <Text style={styles.earningsAmount}>{formatAmount(item.amount)}</Text>
                <Text style={styles.earningsLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Transaction history</Text>
          <FlatList
            data={earnings.transactions}
            keyExtractor={(item) => item.id?.toString()}
            renderItem={renderTransaction}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 24 },
            ]}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No completed jobs yet. Earnings will appear here after you complete services.
              </Text>
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: SIZES.padding },
    header: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, marginBottom: 18, marginTop: 10 },
    earningsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 18,
    },
    earningsCard: {
      width: '48%',
      backgroundColor: colors.surface,
      borderRadius: SIZES.radius,
      padding: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
    },
    earningsAmount: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
    earningsLabel: { color: colors.textSecondary },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
    transactionCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: SIZES.radius,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW,
    },
    transactionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
    transactionDate: { color: colors.textSecondary },
    transactionAmount: { fontSize: 16, fontWeight: '700', color: colors.accentDark },
    listContent: { paddingBottom: 24 },
    separator: { height: 12 },
    emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 40, lineHeight: 22 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorBox: {
      backgroundColor: isDark ? '#3b2424' : '#fef2f2',
      borderRadius: SIZES.radius,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    errorText: { color: colors.error },
  });
