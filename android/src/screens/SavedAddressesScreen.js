import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useAuthStore from '../stores/authStore';
import useUserStore from '../stores/userStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useTheme } from '../theme';

export default function SavedAddressesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const user = useAuthStore((s) => s.user);
  const profile = useUserStore((s) => s.profile);
  const displayUser = profile || user;

  const [address, setAddress] = useState(displayUser?.address || '');
  const [isEditing, setIsEditing] = useState(false);
  const [inputAddress, setInputAddress] = useState(address);

  const showToast = useNotificationStore((s) => s.showToast);
  const showDialog = useNotificationStore((s) => s.showDialog);

  const handleSave = () => {
    if (inputAddress.trim().length < 10) {
      showToast('warning', 'Address Too Short', 'Please enter a valid doorstep address.');
      return;
    }
    setAddress(inputAddress);
    setIsEditing(false);
    showToast('success', 'Address Saved', 'Your delivery address has been updated.');
  };

  const handleDelete = () => {
    showDialog({
      icon: 'trash',
      title: 'Delete Address',
      description: 'Are you sure you want to delete this address? This action cannot be undone.',
      primaryText: 'Delete',
      secondaryText: 'Cancel',
      primaryAccent: '#EF4444',
      onConfirm: () => {
        setAddress('');
        setInputAddress('');
        showToast('success', 'Address Removed', 'Your delivery address has been cleared.');
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {address && !isEditing ? (
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <View style={styles.addressHeaderLeft}>
                <MaterialCommunityIcons name="home-outline" size={20} color={colors.primary} />
                <Text style={styles.addressLabel}>Default Home Address</Text>
              </View>
              <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
            <Text style={styles.addressText}>{address}</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => { setInputAddress(address); setIsEditing(true); }}>
              <Text style={styles.editBtnText}>Edit Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{address ? 'Edit Address' : 'Add Address'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter doorstep flat, building, street..."
              placeholderTextColor={colors.textMuted}
              value={inputAddress}
              onChangeText={setInputAddress}
              multiline
              numberOfLines={3}
            />
            <View style={styles.formActions}>
              {address && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Address</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    addressCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
    },
    addressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    addressHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addressLabel: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
    actionBtn: { padding: 4 },
    addressText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 16 },
    editBtn: { alignSelf: 'flex-start' },
    editBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
    formCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 16,
    },
    formTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.textPrimary,
      fontSize: 13,
      height: 80,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    formActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    cancelBtnText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    saveBtn: {
      flex: 2,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveBtnText: { fontSize: 13, fontWeight: '800', color: colors.accentDark },
  });
