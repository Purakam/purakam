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

const FAQS = [
  {
    q: 'How do I cancel my booking?',
    a: 'You can cancel any upcoming booking directly from the Bookings tab. Tap on the booking card and click the Cancel option before the partner is en route.',
  },
  {
    q: 'How does pricing work?',
    a: 'Purakam uses flat rates for standard tasks and transparent hourly rates for custom work. Bill amounts include base rates, platform fees (₹20), and GST (18%).',
  },
  {
    q: 'Are the service partners verified?',
    a: 'Yes! Every partner undergoes strict government ID verification (Aadhar and PAN checks) and professional background vetting before onboarding.',
  },
];

export default function SupportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [expandedIndex, setExpandedIndex] = useState(null);
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = useNotificationStore((s) => s.showToast);

  const handleToggleFAQ = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleSendTicket = () => {
    if (ticketMessage.trim().length < 10) {
      showToast('warning', 'Message Too Short', 'Please explain your query in detail.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setTicketMessage('');
      showToast('success', 'Ticket Created', 'Support ticket raised. We will reply within 2 hours.');
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Center</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Frequently Asked Questions</Text>

        {FAQS.map((faq, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <View key={index} style={styles.faqCard}>
              <TouchableOpacity style={styles.faqHeader} onPress={() => handleToggleFAQ(index)} activeOpacity={0.8}>
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {isExpanded ? (
                <View style={styles.faqBody}>
                  <Text style={styles.faqAnswer}>{faq.a}</Text>
                </View>
              ) : null}
            </View>
          );
        })}

        <Text style={styles.sectionLabel}>Contact Helpdesk</Text>
        <View style={styles.ticketCard}>
          <Text style={styles.ticketTitle}>Raise Support Ticket</Text>
          <TextInput
            style={styles.input}
            placeholder="Explain what issue you are facing..."
            placeholderTextColor={colors.textMuted}
            value={ticketMessage}
            onChangeText={setTicketMessage}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity style={styles.submitBtn} onPress={handleSendTicket} disabled={isSubmitting}>
            <Text style={styles.submitBtnText}>Submit Message</Text>
          </TouchableOpacity>
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
    sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 16 },
    faqCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 16,
      marginBottom: 10,
      overflow: 'hidden',
    },
    faqHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      gap: 12,
    },
    faqQuestion: { fontSize: 13, fontWeight: '800', color: colors.textPrimary, flex: 1 },
    faqBody: { paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
    faqAnswer: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
    ticketCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 16,
    },
    ticketTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.textPrimary,
      fontSize: 13,
      height: 90,
      textAlignVertical: 'top',
      marginBottom: 14,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    submitBtnText: { fontSize: 13, fontWeight: '800', color: colors.accentDark },
  });
