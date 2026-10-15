import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useNotificationStore } from '../stores/notificationStore';
import { useTheme } from '../theme';

export default function ReferralsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const referralCode = 'PURAKAM100';
  const showToast = useNotificationStore((s) => s.showToast);

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(referralCode);
    showToast('success', 'Referral Code Copied', `Copied "${referralCode}" to clipboard.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Referral Program</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {/* Decorative illustration */}
        <View style={styles.promoHeader}>
          <MaterialCommunityIcons name="gift-outline" size={64} color={colors.primary} />
          <Text style={styles.promoTitle}>Invite Friends, Get Credits</Text>
          <Text style={styles.promoDesc}>
            Share Purakam with your friends. When they complete their first service, both of you receive ₹100 credit.
          </Text>
        </View>

        {/* Copy code section */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{referralCode}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
              <MaterialCommunityIcons name="content-copy" size={18} color={colors.accentDark} />
              <Text style={styles.copyBtnText}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats card */}
        <Text style={styles.sectionLabel}>Referral Progress</Text>
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>0</Text>
            <Text style={styles.statLabel}>Invited</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statVal}>₹0</Text>
            <Text style={styles.statLabel}>Credits Earned</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginLeft: -6 },
    headerTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginLeft: 8 },
    content: { padding: 16 },
    promoHeader: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, textAlign: 'center' },
    promoTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 16, marginBottom: 8 },
    promoDesc: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
    codeCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 16,
      alignItems: 'center',
      marginBottom: 24,
    },
    codeLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, marginBottom: 12 },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingLeft: 16,
      paddingRight: 6,
      paddingVertical: 6,
      width: '100%',
    },
    codeText: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      gap: 6,
    },
    copyBtnText: { fontSize: 12, fontWeight: '800', color: colors.accentDark },
    sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    statsCard: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingVertical: 18,
    },
    statCol: { flex: 1, alignItems: 'center' },
    statVal: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
    statDivider: { width: 1, backgroundColor: colors.border },
  });
