import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotificationStore } from '../stores/notificationStore';
import { useTheme } from '../theme';

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(true);

  const showToast = useNotificationStore((s) => s.showToast);

  const handleToggle = (type, value, setter) => {
    setter(value);
    const label = value ? 'Enabled' : 'Disabled';
    showToast('info', `${type} Notifications`, `${type} notifications have been ${label.toLowerCase()}.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Preferences</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Receive live updates on booking status and partner ETA</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={(val) => handleToggle('Push', val, setPushEnabled)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={pushEnabled ? colors.accentDark : colors.textMuted}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>SMS Alerts</Text>
              <Text style={styles.settingDesc}>Backup updates sent to your registered phone number</Text>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={(val) => handleToggle('SMS', val, setSmsEnabled)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={smsEnabled ? colors.accentDark : colors.textMuted}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Email Newsletters</Text>
              <Text style={styles.settingDesc}>Receive invoices and summary receipts via email</Text>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={(val) => handleToggle('Email', val, setEmailEnabled)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={emailEnabled ? colors.accentDark : colors.textMuted}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Promos & Offers</Text>
              <Text style={styles.settingDesc}>Notifications for discounts and special service campaign rates</Text>
            </View>
            <Switch
              value={promoEnabled}
              onValueChange={(val) => handleToggle('Marketing', val, setPromoEnabled)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={promoEnabled ? colors.accentDark : colors.textMuted}
            />
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
    sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 8 },
    settingCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 16,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      gap: 12,
    },
    settingText: { flex: 1 },
    settingTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
    settingDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },
    divider: { height: 1, backgroundColor: colors.border },
  });
