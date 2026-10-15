import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotificationStore } from '../stores/notificationStore';
import { useTheme } from '../theme';

const { width } = Dimensions.get('window');

export default function GlobalNotificationManager() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const toast = useNotificationStore((s) => s.toast);
  const dismissToast = useNotificationStore((s) => s.dismissToast);

  const dialog = useNotificationStore((s) => s.dialog);
  const dismissDialog = useNotificationStore((s) => s.dismissDialog);

  const successModal = useNotificationStore((s) => s.successModal);
  const dismissSuccessModal = useNotificationStore((s) => s.dismissSuccessModal);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;

  // Handle toast animations
  useEffect(() => {
    if (toast) {
      Animated.spring(toastAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [toast]);

  // Handle success green tick spring scale animation
  useEffect(() => {
    if (successModal) {
      successScaleAnim.setValue(0);
      Animated.spring(successScaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  }, [successModal]);


  // Color & Icon maps for Toast
  const getToastConfig = (type) => {
    switch (type) {
      case 'success':
        return {
          icon: 'check-circle',
          color: '#22C55E',
        };
      case 'warning':
        return {
          icon: 'alert-decagram',
          color: '#F59E0B',
        };
      case 'error':
        return {
          icon: 'alert-circle',
          color: '#EF4444',
        };
      case 'info':
      default:
        return {
          icon: 'information',
          color: colors.primary, // Warm Cream / Accent
        };
    }
  };

  const getDialogIconConfig = (iconName) => {
    switch (iconName) {
      case 'trash':
        return { name: 'trash-can-outline', color: '#EF4444' };
      case 'warning':
        return { name: 'alert-outline', color: '#F59E0B' };
      case 'logout':
        return { name: 'logout', color: colors.primary };
      case 'info':
      default:
        return { name: 'alert-circle-outline', color: colors.primary };
    }
  };

  const styles = getStyles(colors, insets);

  const renderToast = () => {
    if (!toast) return null;

    const config = getToastConfig(toast.type);

    // Animate translateY from top (-120px) to safe area offset
    const translateY = toastAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-120, 0],
    });

    const opacity = toastAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Animated.View style={[styles.toastContainer, { transform: [{ translateY }], opacity }]}>
        <View style={[styles.toastAccentBar, { backgroundColor: config.color }]} />
        <View style={styles.toastContentRow}>
          <View style={[styles.toastIconWrapper, { backgroundColor: `${config.color}15` }]}>
            <MaterialCommunityIcons name={config.icon} size={22} color={config.color} />
          </View>
          <View style={styles.toastTextWrapper}>
            <Text style={styles.toastTitle} numberOfLines={1}>{toast.title}</Text>
            {toast.description ? (
              <Text style={styles.toastDesc} numberOfLines={2}>{toast.description}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={dismissToast} style={styles.toastCloseBtn}>
            <MaterialCommunityIcons name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderDialog = () => {
    if (!dialog) return null;

    const iconConfig = getDialogIconConfig(dialog.icon);
    const accentColor = dialog.primaryAccent || colors.primary;

    return (
      <Modal
        visible={dialog !== null}
        transparent
        animationType="fade"
        onRequestClose={dismissDialog}
      >
        <View style={styles.dialogOverlay}>
          <TouchableOpacity
            style={styles.dialogDismissArea}
            activeOpacity={1}
            onPress={dismissDialog}
          />
          <View style={styles.dialogCard}>
            <View style={[styles.dialogIconContainer, { backgroundColor: `${iconConfig.color}15` }]}>
              <MaterialCommunityIcons name={iconConfig.name} size={32} color={iconConfig.color} />
            </View>
            <Text style={styles.dialogTitle}>{dialog.title}</Text>
            <Text style={styles.dialogDesc}>{dialog.description}</Text>

            <View style={styles.dialogActions}>
              {dialog.secondaryText ? (
                <TouchableOpacity
                  style={styles.dialogSecondaryBtn}
                  onPress={() => {
                    dismissDialog();
                    if (dialog.onCancel) dialog.onCancel();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dialogSecondaryText}>{dialog.secondaryText}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.dialogPrimaryBtn, { backgroundColor: accentColor }]}
                onPress={() => {
                  dismissDialog();
                  if (dialog.onConfirm) dialog.onConfirm();
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dialogPrimaryText,
                    { color: accentColor === '#FFFFFF' || accentColor === colors.primary ? colors.accentDark : '#FFFFFF' }
                  ]}
                >
                  {dialog.primaryText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };


  const renderSuccessModal = () => {

    if (!successModal) return null;

    return (
      <Modal
        visible={successModal !== null}
        transparent
        animationType="fade"
        onRequestClose={dismissSuccessModal}
      >
        <View style={styles.dialogOverlay}>
          <TouchableOpacity
            style={styles.dialogDismissArea}
            activeOpacity={1}
            onPress={dismissSuccessModal}
          />
          <Animated.View
            style={[
              styles.successCard,
              { transform: [{ scale: successScaleAnim }] },
            ]}
          >
            {/* Animated Green Badge */}
            <View style={styles.successBadgeTag}>
              <Text style={styles.successBadgeText}>{successModal.badgeText || 'SUCCESS'}</Text>
            </View>

            {/* Pulsing Green Tick Icon Container */}
            <View style={styles.greenTickCircleOuter}>
              <View style={styles.greenTickCircleInner}>
                <MaterialCommunityIcons name="check-bold" size={44} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.successTitle}>{successModal.title}</Text>
            <Text style={styles.successDesc}>{successModal.description}</Text>

            <TouchableOpacity
              style={styles.successDoneBtn}
              onPress={dismissSuccessModal}
              activeOpacity={0.85}
            >
              <Text style={styles.successDoneBtnText}>Got it</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#111827" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  return (
    <>
      {renderToast()}
      {renderDialog()}
      {renderSuccessModal()}
    </>
  );
}


const getStyles = (colors, insets) =>
  StyleSheet.create({
    toastContainer: {
      position: 'absolute',
      top: insets.top + 12,
      left: 16,
      right: 16,
      height: 76,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 999999,
      overflow: 'hidden',
      elevation: 20,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    toastAccentBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 5,
    },
    toastContentRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 18,
      paddingRight: 12,
    },
    toastIconWrapper: {
      width: 38,
      height: 38,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    toastTextWrapper: {
      flex: 1,
      justifyContent: 'center',
    },
    toastTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    toastDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    toastCloseBtn: {
      padding: 6,
    },
    dialogOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dialogDismissArea: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    dialogCard: {
      backgroundColor: colors.card,
      width: '85%',
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 25,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15,
      shadowRadius: 18,
    },
    dialogIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    dialogTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    dialogDesc: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
      paddingHorizontal: 8,
    },
    dialogActions: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    dialogSecondaryBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dialogSecondaryText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    dialogPrimaryBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dialogPrimaryText: {
      fontSize: 14,
      fontWeight: '800',
    },
    // Green Tick Modal Styles
    successCard: {
      backgroundColor: colors.card,
      width: '85%',
      borderRadius: 28,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.3)',
      elevation: 30,
      shadowColor: '#22C55E',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
    },
    successBadgeTag: {
      backgroundColor: 'rgba(34, 197, 94, 0.12)',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.25)',
    },
    successBadgeText: {
      color: '#22C55E',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
    },
    greenTickCircleOuter: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 2,
      borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    greenTickCircleInner: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: '#22C55E',
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
      shadowColor: '#22C55E',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
    },
    successTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    successDesc: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
      paddingHorizontal: 8,
    },
    successDoneBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#22C55E',
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 16,
      gap: 8,
      width: '100%',
      elevation: 4,
      shadowColor: '#22C55E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    successDoneBtnText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#111827',
    },
  });

