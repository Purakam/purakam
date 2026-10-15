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
import { useNotificationStore } from '../stores/notificationStore';
import { useTheme } from '../theme';

export default function PaymentMethodsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [upiId, setUpiId] = useState('sanket@okaxis');
  const [isEditingUPI, setIsEditingUPI] = useState(false);
  const [inputUPI, setInputUPI] = useState(upiId);

  const [cards, setCards] = useState([
    { id: '1', number: '•••• •••• •••• 4242', brand: 'visa', exp: '12/28' },
  ]);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [showAddCard, setShowAddCard] = useState(false);

  const showToast = useNotificationStore((s) => s.showToast);
  const showDialog = useNotificationStore((s) => s.showDialog);

  const handleSaveUPI = () => {
    if (!inputUPI.includes('@')) {
      showToast('warning', 'Invalid UPI ID', 'Please enter a valid UPI ID (e.g. name@upi).');
      return;
    }
    setUpiId(inputUPI);
    setIsEditingUPI(false);
    showToast('success', 'UPI Updated', 'UPI payment profile saved successfully.');
  };

  const handleAddCard = () => {
    if (cardNumber.replace(/\s/g, '').length !== 16 || cardExp.length !== 5 || cardCvv.length < 3) {
      showToast('warning', 'Invalid Card Info', 'Please fill in all credit card details correctly.');
      return;
    }
    const masked = '•••• •••• •••• ' + cardNumber.slice(-4);
    setCards([...cards, { id: Date.now().toString(), number: masked, brand: 'mastercard', exp: cardExp }]);
    setCardName('');
    setCardNumber('');
    setCardExp('');
    setCardCvv('');
    setShowAddCard(false);
    showToast('success', 'Card Added', 'New payment card has been securely saved.');
  };

  const handleDeleteCard = (cardId) => {
    showDialog({
      icon: 'trash',
      title: 'Remove Card',
      description: 'Are you sure you want to remove this payment card?',
      primaryText: 'Remove',
      secondaryText: 'Cancel',
      primaryAccent: '#EF4444',
      onConfirm: () => {
        setCards(cards.filter(c => c.id !== cardId));
        showToast('success', 'Card Removed', 'Card has been removed from saved payments.');
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {/* UPI Details */}
        <Text style={styles.sectionLabel}>Saved UPI Accounts</Text>
        <View style={styles.card}>
          <View style={styles.upiRow}>
            <View style={styles.upiInfo}>
              <MaterialCommunityIcons name="contactless-payment" size={24} color={colors.primary} />
              {isEditingUPI ? (
                <TextInput
                  style={styles.upiInput}
                  value={inputUPI}
                  onChangeText={setInputUPI}
                  placeholder="UPI ID (e.g. name@bank)"
                  placeholderTextColor={colors.textMuted}
                />
              ) : (
                <View>
                  <Text style={styles.upiTitle}>Google Pay / BHIM UPI</Text>
                  <Text style={styles.upiValue}>{upiId || 'No UPI ID saved'}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.upiAction}
              onPress={isEditingUPI ? handleSaveUPI : () => { setInputUPI(upiId); setIsEditingUPI(true); }}
            >
              <Text style={styles.upiActionText}>{isEditingUPI ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Credit/Debit Cards */}
        <Text style={styles.sectionLabel}>Credit & Debit Cards</Text>
        {cards.map((c) => (
          <View key={c.id} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardInfo}>
                <MaterialCommunityIcons name="credit-card-outline" size={24} color={colors.textSecondary} />
                <View>
                  <Text style={styles.cardNumber}>{c.number}</Text>
                  <Text style={styles.cardExp}>Expires {c.exp}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDeleteCard(c.id)} style={styles.cardDelete}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {showAddCard ? (
          <View style={styles.addCardForm}>
            <Text style={styles.formTitle}>Add Credit/Debit Card</Text>
            <TextInput
              style={styles.input}
              placeholder="Cardholder Name"
              placeholderTextColor={colors.textMuted}
              value={cardName}
              onChangeText={setCardName}
            />
            <TextInput
              style={styles.input}
              placeholder="Card Number (16 digits)"
              placeholderTextColor={colors.textMuted}
              value={cardNumber}
              onChangeText={setCardNumber}
              keyboardType="numeric"
              maxLength={16}
            />
            <View style={styles.formRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="MM/YY"
                placeholderTextColor={colors.textMuted}
                value={cardExp}
                onChangeText={setCardExp}
                maxLength={5}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="CVV"
                placeholderTextColor={colors.textMuted}
                value={cardCvv}
                onChangeText={setCardCvv}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
              />
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddCard(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddCard}>
                <Text style={styles.saveBtnText}>Add Card</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addCardBtn} onPress={() => setShowAddCard(true)}>
            <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
            <Text style={styles.addCardBtnText}>Add New Card</Text>
          </TouchableOpacity>
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
    sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 16 },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
    },
    upiRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    upiInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    upiTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    upiValue: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    upiInput: { flex: 1, color: colors.textPrimary, fontSize: 13, padding: 0 },
    upiAction: { paddingHorizontal: 12, paddingVertical: 6 },
    upiActionText: { fontSize: 12, fontWeight: '800', color: colors.primary },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardNumber: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    cardExp: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    cardDelete: { padding: 4 },
    addCardBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      marginTop: 8,
    },
    addCardBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
    addCardForm: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 16,
      marginTop: 8,
    },
    formTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.textPrimary,
      fontSize: 13,
      marginBottom: 12,
    },
    formRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
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
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveBtnText: { fontSize: 13, fontWeight: '800', color: colors.accentDark },
  });
