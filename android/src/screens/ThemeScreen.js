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
import { useTheme, SIZES, SHADOW } from '../theme';

const ACCENTS = [
  { id: 'gold', label: 'Stone Gold', color: '#D8C6B0', darkColor: '#F5F1E8' },
  { id: 'blue', label: 'Royal Blue', color: '#2563EB', darkColor: '#3B82F6' },
  { id: 'purple', label: 'Indigo Purple', color: '#7C3AED', darkColor: '#8B5CF6' },
  { id: 'green', label: 'Forest Green', color: '#16A34A', darkColor: '#22C55E' },
  { id: 'coral', label: 'Coral Rose', color: '#E11D48', darkColor: '#F43F5E' },
];

export default function ThemeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark, themeMode, accentColor, setThemeMode, setAccentColor } = useTheme();
  const styles = getStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Theme & Appearance</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {/* Live Preview Panel */}
        <Text style={styles.sectionLabel}>Live Interface Preview</Text>
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View style={styles.previewAvatar} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.previewUser}>Purakam Professional</Text>
              <Text style={styles.previewMeta}>Active Now</Text>
            </View>
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>OTP: 4920</Text>
            </View>
          </View>

          <View style={styles.previewBubbleContainer}>
            <View style={styles.previewBubble}>
              <Text style={styles.previewBubbleText}>
                Hello! I am on my way to your address. I will arrive in 10 minutes.
              </Text>
            </View>
          </View>

          {/* Action Button Preview */}
          <TouchableOpacity style={styles.previewActionBtn} activeOpacity={0.8}>
            <Text style={styles.previewActionBtnText}>Track Partner Map</Text>
          </TouchableOpacity>
        </View>

        {/* Theme Mode Selector */}
        <Text style={styles.sectionLabel}>Interface Mode</Text>
        <View style={styles.modeCard}>
          {['light', 'dark', 'system'].map((mode, idx) => {
            const isActive = themeMode === mode;
            let iconName = 'theme-light-dark';
            if (mode === 'light') iconName = 'weather-sunny';
            if (mode === 'dark') iconName = 'weather-night';
            
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.modeRow, idx === 2 && styles.lastRow, isActive && styles.modeRowActive]}
                onPress={() => setThemeMode(mode)}
              >
                <View style={styles.modeRowLeft}>
                  <MaterialCommunityIcons name={iconName} size={22} color={isActive ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                    {mode.toUpperCase()} MODE
                  </Text>
                </View>
                {isActive && (
                  <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Accent Picker Section */}
        <Text style={styles.sectionLabel}>Brand Accent Color</Text>
        <View style={styles.accentCard}>
          {ACCENTS.map((item, idx) => {
            const isActive = accentColor === item.id;
            const swatchColor = isDark ? item.darkColor : item.color;
            
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.accentRow, idx === ACCENTS.length - 1 && styles.lastRow, isActive && styles.accentRowActive]}
                onPress={() => setAccentColor(item.id)}
              >
                <View style={styles.accentRowLeft}>
                  <View style={[styles.colorSwatch, { backgroundColor: swatchColor }]} />
                  <Text style={[styles.accentLabel, isActive && styles.accentLabelActive]}>
                    {item.label}
                  </Text>
                </View>
                {isActive && (
                  <MaterialCommunityIcons name="checkbox-marked-circle" size={22} color={swatchColor} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.infoText}>
          Theme selections sync dynamically and are saved to your device.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
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
    sectionLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
      marginBottom: 10,
      marginTop: 18,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    
    // Preview Styles
    previewCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      ...SHADOW,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
    },
    previewAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.border,
    },
    previewUser: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    previewMeta: { fontSize: 11, color: colors.textMuted },
    previewBadge: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    previewBadgeText: { fontSize: 10, fontWeight: '800', color: colors.textPrimary },
    previewBubbleContainer: {
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    previewBubble: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 12,
      maxWidth: '85%',
    },
    previewBubbleText: { fontSize: 12, color: colors.textPrimary, lineHeight: 18 },
    previewActionBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    previewActionBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.accentDark,
    },

    // Mode Selector Styles
    modeCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 16,
      marginBottom: 12,
      ...SHADOW,
    },
    modeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modeRowActive: {},
    modeRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    modeLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    modeLabelActive: { color: colors.textPrimary },

    // Accent Selector Styles
    accentCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 16,
      marginBottom: 16,
      ...SHADOW,
    },
    accentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    accentRowActive: {},
    accentRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    colorSwatch: {
      width: 22,
      height: 22,
      borderRadius: 11,
    },
    accentLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    accentLabelActive: { color: colors.textPrimary },

    lastRow: { borderBottomWidth: 0 },

    infoText: {
      textAlign: 'center',
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 10,
    },
  });
