import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import useAuthStore from '../stores/authStore';
import useBookingStore from '../stores/bookingStore';
import {
  TIME_SLOTS,
  AREA_OPTIONS,
  calculateBookingTotal,
  PLATFORM_FEE,
  GST_RATE,
} from '../constants/booking';
import { useTheme, SIZES, SHADOW } from '../theme';
import { useNotificationStore } from '../stores/notificationStore';

const UPI_HANDLES = {
  // Banks
  '@okicici': 'ICICI Bank',
  '@ibl': 'ICICI Bank',
  '@okaxis': 'Axis Bank',
  '@axisbank': 'Axis Bank',
  '@okhdfcbank': 'HDFC Bank',
  '@oksbi': 'State Bank of India',
  '@sbi': 'State Bank of India',
  '@pnb': 'Punjab National Bank',
  '@unionbank': 'Union Bank of India',
  '@uboi': 'Union Bank of India',
  '@kotak': 'Kotak Mahindra Bank',
  '@kmbl': 'Kotak Mahindra Bank',
  '@indus': 'IndusInd Bank',
  '@aubank': 'AU Small Finance Bank',
  '@idbi': 'IDBI Bank',
  '@boi': 'Bank of India',
  '@bob': 'Bank of Baroda',
  '@barb': 'Bank of Baroda',
  '@cnrb': 'Canara Bank',
  '@cbin': 'Central Bank of India',
  '@federal': 'Federal Bank',
  '@fbl': 'Federal Bank',
  '@hsbc': 'HSBC Bank',
  '@rbl': 'RBL Bank',
  '@yesbank': 'Yes Bank',
  '@yesbankltd': 'Yes Bank',
  '@idfc': 'IDFC First Bank',
  '@idfcbank': 'IDFC First Bank',

  // UPI Apps
  '@ybl': 'PhonePe',
  '@axl': 'PhonePe',
  '@ibl': 'PhonePe',
  '@paytm': 'Paytm',
  '@ptyes': 'Paytm',
  '@pthdfc': 'Paytm',
  '@ptsbi': 'Paytm',
  '@gpay': 'Google Pay',
  '@oksbi': 'Google Pay',
  '@okicici': 'Google Pay / ICICI',
  '@apl': 'Amazon Pay',
  '@yapl': 'Amazon Pay',
  '@rapl': 'Amazon Pay',
  '@freecharge': 'Freecharge',
  '@fc': 'Freecharge',
  '@mojopay': 'Mojo',
  '@ikwik': 'MobiKwik',
  '@ikwikdigi': 'MobiKwik',
  '@upi': 'BHIM UPI',
  '@npci': 'BHIM UPI',
  '@slice': 'Slice',
  '@jupiteraxis': 'Jupiter',
  '@naviaxis': 'Navi',
  '@fifipay': 'Fi Money',
};

export function getUpiHandleInfo(upiId) {
  if (!upiId || !upiId.includes('@')) return null;
  const parts = upiId.split('@');
  if (parts.length !== 2) return null;

  const username = parts[0].trim();
  const handlePart = parts[1].trim();
  if (!username || !handlePart) return null;

  const handle = '@' + handlePart.toLowerCase();
  const bank = UPI_HANDLES[handle];

  return bank ? { handle, bank, valid: true } : { handle, bank: 'Unknown Bank', valid: false };
}

export function isUpiFormed(upiId) {
  if (!upiId || !upiId.includes('@')) return false;
  const parts = upiId.split('@');
  if (parts.length !== 2) return false;
  const username = parts[0].trim();
  const handlePart = parts[1].trim();
  return username.length > 0 && handlePart.length >= 2;
}

export default function BookingScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const { categoryName, basePrice } = route.params || {};
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const createBooking = useBookingStore((s) => s.createBooking);
  const isSubmitting = useBookingStore((s) => s.isSubmitting);
  const showToast = useNotificationStore((s) => s.showToast);
  const showDialog = useNotificationStore((s) => s.showDialog);

  const [step, setStep] = useState(1);
  const [bookingDate, setBookingDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [address, setAddress] = useState(user?.address || '');
  const [areaName, setAreaName] = useState('');
  const [pincode, setPincode] = useState('');
  const [details, setDetails] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [upiId, setUpiId] = useState('');
  const [locating, setLocating] = useState(false);
  const [upiChecking, setUpiChecking] = useState(false);
  const [upiValid, setUpiValid] = useState(false);
  const [upiTimeoutId, setUpiTimeoutId] = useState(null);

  React.useEffect(() => {
    return () => {
      if (upiTimeoutId) {
        clearTimeout(upiTimeoutId);
      }
    };
  }, [upiTimeoutId]);

  const handleUpiChange = (text) => {
    setUpiId(text);
    setUpiValid(false);
    setUpiChecking(false);

    if (upiTimeoutId) {
      clearTimeout(upiTimeoutId);
    }

    if (isUpiFormed(text)) {
      setUpiChecking(true);
      const timeoutId = setTimeout(() => {
        setUpiChecking(false);
        const info = getUpiHandleInfo(text);
        if (info && info.valid) {
          setUpiValid(true);
        }
      }, 1000);
      setUpiTimeoutId(timeoutId);
    }
  };
  const [showDatePickerTray, setShowDatePickerTray] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const base = parseFloat(basePrice) || 0;
  const gstAmount = base * GST_RATE;
  const totalPrice = calculateBookingTotal(base);
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const isPastDate = (day) => {
    const d = new Date(selectedYear, selectedMonth, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handlePrevMonth = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth)) {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    }
  };

  const handleSelectDay = (day) => {
    const formattedMonth = String(selectedMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    setBookingDate(`${selectedYear}-${formattedMonth}-${formattedDay}`);
    setShowDatePickerTray(false);
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const renderCalendarDays = () => {
    const firstDayIndex = getFirstDayOfMonth(selectedYear, selectedMonth);
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const dayCells = [];

    // Fill offset cells
    for (let i = 0; i < firstDayIndex; i++) {
      dayCells.push(<View key={`empty-${i}`} style={styles.dayCellEmpty} />);
    }

    // Fill day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const isPast = isPastDate(day);
      const formattedMonth = String(selectedMonth + 1).padStart(2, '0');
      const formattedDay = String(day).padStart(2, '0');
      const dateString = `${selectedYear}-${formattedMonth}-${formattedDay}`;
      const isSelected = bookingDate === dateString;

      dayCells.push(
        <TouchableOpacity
          key={`day-${day}`}
          style={[
            styles.dayCell,
            isSelected && styles.dayCellSelected,
            isPast && styles.dayCellDisabled
          ]}
          disabled={isPast}
          onPress={() => handleSelectDay(day)}
        >
          <Text
            style={[
              styles.dayCellText,
              isSelected && styles.dayCellTextSelected,
              isPast && styles.dayCellTextDisabled
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }
    return dayCells;
  };

  const getCoordinates = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      }
    } catch (e) {
      console.log('Location error:', e?.message);
    }
    return { latitude: 19.06, longitude: 72.8258 };
  };

  const handleUseLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('warning', 'Permission Needed', 'Location permission is required to auto-fill your address.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (place) {
        const parts = [
          place.name,
          place.name !== place.street && place.street,
          place.district,
          place.city,
          place.region,
          place.postalCode,
        ].filter(Boolean);
        setAddress(parts.join(', '));
        if (place.postalCode) setPincode(place.postalCode);
      }
    } catch (e) {
      showToast('error', 'Location Error', 'Could not retrieve your current location.');
    } finally {
      setLocating(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleContinue = () => {
    if (step === 1) {
      if (!bookingDate || !timeSlot) {
        showToast('warning', 'Missing Info', 'Please select a date and time slot to continue.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!address || address.trim().length < 10 || !areaName || pincode.length !== 6) {
        showToast('warning', 'Missing Info', 'Please provide doorstep address, area, and 6-digit pincode.');
        return;
      }
      if (!pincode.startsWith('400') && !pincode.startsWith('401') && !pincode.startsWith('421')) {
        showToast('error', 'Invalid Region', 'Services are currently active only in Mumbai and metropolitan regions.');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      showDialog({
        icon: 'info',
        title: 'Authentication Required',
        description: 'Please sign in first before booking.',
        primaryText: 'Sign In',
        secondaryText: 'Cancel',
        onConfirm: () => navigation.getParent()?.getParent()?.navigate('Auth', { screen: 'Login' }),
      });
      return;
    }

    if (paymentMethod === 'UPI') {
      const upiInfo = getUpiHandleInfo(upiId);
      if (!upiInfo || !upiInfo.valid) {
        showToast('warning', 'Invalid UPI ID', 'Please enter a supported UPI ID (e.g. name@okaxis).');
        return;
      }
    }

    try {
      const coords = await getCoordinates();
      await createBooking({
        service_category: categoryName,
        booking_date: bookingDate,
        time_slot: timeSlot,
        details: details || null,
        price: totalPrice,
        address,
        payment_method: paymentMethod,
        pincode,
        area_name: areaName,

        latitude: coords.latitude,
        longitude: coords.longitude,
        partner_id: null,
      });

      const showSuccessModal = useNotificationStore.getState().showSuccessModal;
      showSuccessModal(
        'Booking Confirmed!',
        `Your ${categoryName} service booking request has been created. Broadcasting to nearby verified local professionals...`,
        'BROADCAST LIVE',
        () => navigation.navigate('CustomerTabs', { screen: 'Bookings' })
      );

    } catch (error) {
      const message = error?.response?.data?.detail || error.message || 'Booking failed';
      showToast('error', 'Booking Failed', typeof message === 'string' ? message : 'Booking failed');
    }
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <View>
          <Text style={styles.sectionLabel}>Pick Schedule Date</Text>
          <TouchableOpacity
            style={styles.dateSelectorButton}
            onPress={() => setShowDatePickerTray(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="calendar-month" size={20} color={colors.primary} />
            <Text style={[styles.dateSelectorText, !bookingDate && styles.dateSelectorPlaceholder]}>
              {bookingDate ? formatDateDisplay(bookingDate) : 'Select appointment date'}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.sectionLabel}>Pick Time Slot</Text>
          <View style={styles.buttonGrid}>
            {TIME_SLOTS.map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[styles.optionButton, timeSlot === slot && styles.optionButtonActive]}
                onPress={() => setTimeSlot(slot)}
              >
                <Text style={[styles.optionLabel, timeSlot === slot && styles.optionLabelActive]}>
                  {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={handleContinue}>
            <Text style={styles.actionText}>Continue</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 2) {
      return (
        <View>
          <Text style={styles.sectionLabel}>Address Details</Text>
          <TouchableOpacity style={styles.locationButton} onPress={handleUseLocation} disabled={locating}>
            <MaterialCommunityIcons name="gps-fixed" size={16} color={colors.primary} />
            <Text style={styles.locationButtonText}>
              {locating ? 'Retrieving Address...' : 'Auto-fill Doorstep Location'}
            </Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { height: 100 }]}
            value={address}
            onChangeText={setAddress}
            placeholder="Doorstep House No, Building name, Street name"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Text style={styles.fieldHint}>Select Area Zone</Text>
          <View style={styles.areaGrid}>
            {AREA_OPTIONS.map((area) => (
              <TouchableOpacity
                key={area}
                style={[styles.areaChip, areaName === area && styles.areaChipActive]}
                onPress={() => setAreaName(area)}
              >
                <Text style={[styles.areaChipText, areaName === area && styles.areaChipTextActive]}>
                  {area}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={pincode}
            onChangeText={setPincode}
            placeholder="Region Postal Pincode (6 digits)"
            keyboardType="numeric"
            maxLength={6}
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={[styles.input, { height: 100 }]}
            value={details}
            onChangeText={setDetails}
            placeholder="Describe issue details (optional)"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <View style={styles.stepActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
              <Text style={styles.secondaryText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleContinue}>
              <Text style={styles.actionText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const isConfirmDisabled = isSubmitting || (paymentMethod === 'UPI' && (!upiValid || upiChecking));

    return (
      <View>
        <Text style={styles.sectionLabel}>Review Service Request</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>SERVICE CATEGORY</Text>
            <Text style={styles.summaryValue}>{categoryName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>APPOINTMENT SCHEDULE</Text>
            <Text style={styles.summaryValue}>{bookingDate} · {timeSlot}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ADDRESS</Text>
            <Text style={styles.summaryValue}>{address} ({areaName} - {pincode})</Text>
          </View>

          <View style={styles.invoiceDivider} />

          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Base Rate</Text>
            <Text style={styles.invoiceValue}>₹{base.toFixed(2)}</Text>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>GST Taxes (18%)</Text>
            <Text style={[styles.invoiceValue, { color: colors.error }]}>₹{gstAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Trust Platform Fee</Text>
            <Text style={styles.invoiceValue}>₹{PLATFORM_FEE.toFixed(2)}</Text>
          </View>
          <View style={[styles.invoiceRow, styles.invoiceTotal]}>
            <Text style={styles.invoiceTotalLabel}>Grand Total Amount</Text>
            <Text style={[styles.invoiceTotalValue, { color: colors.success }]}>₹{totalPrice.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Payment Selection</Text>
        <View style={styles.paymentToggle}>
          <TouchableOpacity
            style={[styles.paymentButton, paymentMethod === 'UPI' && styles.paymentButtonActive]}
            onPress={() => setPaymentMethod('UPI')}
          >
            <Text style={[styles.paymentLabel, paymentMethod === 'UPI' && styles.paymentLabelActive]}>
              UPI Pay
            </Text>
            <Text style={[styles.paymentDescription, paymentMethod === 'UPI' && styles.paymentDescriptionActive]}>
              Instant secure digital checkout
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.paymentButton, paymentMethod === 'COD' && styles.paymentButtonActive]}
            onPress={() => setPaymentMethod('COD')}
          >
            <Text style={[styles.paymentLabel, paymentMethod === 'COD' && styles.paymentLabelActive]}>
              COD Pay
            </Text>
            <Text style={[styles.paymentDescription, paymentMethod === 'COD' && styles.paymentDescriptionActive]}>
              Cash/UPI after job completes
            </Text>
          </TouchableOpacity>
        </View>

        {paymentMethod === 'UPI' && (
          <View style={styles.upiInputContainer}>
            <TextInput
              style={styles.upiTextInput}
              value={upiId}
              onChangeText={handleUpiChange}
              placeholder="Enter UPI VPA ID (e.g. name@upi)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {upiChecking && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.upiIndicator} />
            )}
            {!upiChecking && upiValid && (
              <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} style={styles.upiIndicator} />
            )}
          </View>
        )}

        <View style={styles.stepActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, isConfirmDisabled && styles.disabledActionButton]}
            onPress={handleSubmit}
            disabled={isConfirmDisabled}
          >
            <Text style={[styles.actionText, isConfirmDisabled && styles.disabledActionText]}>
              {isSubmitting ? 'Booking...' : 'Confirm Checkout'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.8}>
              <MaterialCommunityIcons name="chevron-left" size={26} color={colors.textPrimary} style={{ marginLeft: -6 }} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.exitButton} activeOpacity={0.8}>
              <Text style={styles.exitText}>Exit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Book {categoryName || 'Service'}</Text>
          <Text style={styles.subtitle}>Complete doorstep service booking request.</Text>

          {/* Stepper Timeline indicators */}
          <View style={styles.stepperContainer}>
            {[1, 2, 3].map((val) => (
              <View key={val} style={styles.stepRow}>
                <View
                  style={[styles.stepDot, step >= val && styles.stepDotActive]}
                >
                  <Text style={[styles.stepDotText, step >= val && styles.stepDotTextActive]}>{val}</Text>
                </View>
                {val < 3 && <View style={[styles.stepLine, step > val && styles.stepLineActive]} />}
              </View>
            ))}
          </View>

          {renderStepContent()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Sheet / Bottom Tray */}
      <Modal
        visible={showDatePickerTray}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePickerTray(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackgroundDismiss}
            activeOpacity={1}
            onPress={() => setShowDatePickerTray(false)}
          />
          <View style={styles.modalTray}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Appointment Date</Text>
              <TouchableOpacity onPress={() => setShowDatePickerTray(false)} style={styles.modalCloseBtn}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Month Navigator */}
            <View style={styles.monthSelectorRow}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
                <MaterialCommunityIcons name="chevron-left" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Weekdays Row */}
            <View style={styles.weekdaysRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <Text key={day} style={styles.weekdayLabel}>{day}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {renderCalendarDays()}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: SIZES.padding, paddingTop: 16 },
    backButton: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    backText: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      width: '100%',
    },
    exitButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: 'transparent',
    },
    exitText: {
      color: colors.textSecondary,
      fontWeight: '700',
      fontSize: 14,
    },
    title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
    subtitle: { color: colors.textSecondary, marginBottom: 20 },
    sectionLabel: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
    fieldHint: { color: colors.textSecondary, fontSize: 13, marginBottom: 8, fontWeight: '600' },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      color: colors.textPrimary,
      padding: 16,
      marginBottom: 16,
      fontSize: 14,
    },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary === '#F5F1E8' ? 'rgba(245, 241, 232, 0.08)' : 'rgba(216, 198, 176, 0.15)',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      marginBottom: 16,
      alignSelf: 'flex-start',
    },
    locationButtonText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    buttonGrid: { flexDirection: 'column', gap: 10, marginBottom: 20 },
    optionButton: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 16,
    },
    optionButtonActive: { backgroundColor: colors.primary },
    optionLabel: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
    optionLabelActive: { color: colors.accentDark },
    areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    areaChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.surface,
    },
    areaChipActive: { backgroundColor: colors.primary },
    areaChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
    areaChipTextActive: { color: colors.accentDark },
    actionButton: {
      backgroundColor: colors.success, // Luxury green!
      padding: 16,
      borderRadius: 18,
      alignItems: 'center',
      flex: 2.5, // Larger size!
      ...SHADOW,
    },
    disabledActionButton: {
      backgroundColor: colors.border,
      opacity: 0.5,
    },
    actionText: { color: colors.accentDark, fontWeight: '800', fontSize: 16 },
    disabledActionText: { color: colors.textSecondary },
    upiInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingRight: 16,
      marginBottom: 16,
    },
    upiTextInput: {
      flex: 1,
      color: colors.textPrimary,
      padding: 16,
      fontSize: 14,
    },
    upiIndicator: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      padding: 16,
      borderRadius: 18,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.15)', // Subtle red border
      flex: 1, // Smaller size!
      marginRight: 12,
    },
    secondaryText: { color: colors.error, fontWeight: '800' }, // Red text
    stepActions: { flexDirection: 'row', marginTop: 20 },
    summaryCard: {
      backgroundColor: colors.card,
      borderRadius: 0,
      padding: 18,
      marginBottom: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryRow: {
      gap: 4,
    },
    summaryLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    summaryValue: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
    invoiceDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
    },
    invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    invoiceLabel: { color: colors.textSecondary, fontSize: 13 },
    invoiceValue: { color: colors.textPrimary, fontWeight: '700' },
    invoiceTotal: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 4 },
    invoiceTotalLabel: { color: colors.textPrimary, fontWeight: '800', fontSize: 15 },
    invoiceTotalValue: { color: colors.textPrimary, fontWeight: '900', fontSize: 16 },
 
    paymentToggle: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    paymentButton: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 14,
      gap: 4,
      ...SHADOW,
    },
    paymentButtonActive: {
      backgroundColor: colors.primary,
    },
    paymentLabel: {
      fontWeight: '800',
      fontSize: 14,
      color: colors.textSecondary,
    },
    paymentLabelActive: {
      color: colors.accentDark,
    },
    paymentDescription: {
      color: colors.textSecondary,
      fontSize: 11,
      lineHeight: 14,
      marginTop: 2,
    },
    paymentDescriptionActive: {
      color: colors.accentDark,
      opacity: 0.7,
    },
 
    stepperContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      width: '100%',
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    stepDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepDotActive: {
      backgroundColor: colors.primary,
    },
    stepDotText: {
      color: colors.textSecondary,
      fontWeight: '800',
      fontSize: 13,
    },
    stepDotTextActive: {
      color: colors.accentDark,
    },
    stepLine: {
      width: 80,
      height: 1.5,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      marginHorizontal: 8,
    },
    stepLineActive: {
      backgroundColor: colors.primary,
    },
    dateSelectorButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    dateSelectorText: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 12,
    },
    dateSelectorPlaceholder: {
      color: colors.textMuted,
      fontWeight: '400',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalBackgroundDismiss: {
      flex: 1,
    },
    modalTray: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 32,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    modalCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    monthSelectorRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 4,
    },
    monthLabel: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    monthNavBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    weekdaysRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    weekdayLabel: {
      width: '14.28%',
      textAlign: 'center',
      color: colors.textSecondary,
      fontWeight: '700',
      fontSize: 12,
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 10,
      marginVertical: 2,
    },
    dayCellEmpty: {
      width: '14.28%',
      aspectRatio: 1,
    },
    dayCellSelected: {
      backgroundColor: colors.primary,
    },
    dayCellDisabled: {
      opacity: 0.2,
    },
    dayCellText: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 13,
    },
    dayCellTextSelected: {
      color: colors.accentDark,
      fontWeight: '800',
    },
    dayCellTextDisabled: {
      color: colors.textSecondary,
    },
  });
