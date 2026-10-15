import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme';
import { useNotificationStore } from '../stores/notificationStore';

// Typing indicator dot component
const TypingIndicator = ({ colors }) => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}>
      <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textSecondary, opacity: dot1 }} />
      <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textSecondary, opacity: dot2 }} />
      <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textSecondary, opacity: dot3 }} />
    </View>
  );
};

export default function ChatScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const showToast = useNotificationStore((s) => s.showToast);

  const { partnerName } = route.params || {};
  const activePartnerName = partnerName || 'Rajesh Kumar';

  const [messages, setMessages] = useState([
    {
      id: '1',
      text: `Hi there! I am starting from the branch. I will arrive at your doorstep in about 20 minutes.`,
      sender: 'partner',
      time: '9:40 PM',
    },
    {
      id: '2',
      text: 'Sounds good! I will be home. Let me know if you need help finding the building.',
      sender: 'user',
      time: '9:41 PM',
    },
    {
      id: '3',
      text: 'Thanks! I will call you if I get lost.',
      sender: 'partner',
      time: '9:42 PM',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const flatListRef = useRef(null);

  const QUICK_REPLIES = [
    "I'm at home, please come in.",
    "Let me know when you reach.",
    "Are you nearby?",
    "Okay, got it!",
  ];

  const getMockReply = (userText) => {
    const text = userText.toLowerCase();
    if (text.includes('reach') || text.includes('where') || text.includes('status')) {
      return `I am just 5 minutes away. Turning into your layout now!`;
    }
    if (text.includes('come') || text.includes('in') || text.includes('door') || text.includes('gate')) {
      return `Got it! Coming up to your door now.`;
    }
    if (text.includes('photo') || text.includes('image') || text.includes('look')) {
      return `Got the picture. That helps. I have the tools for this.`;
    }
    if (text.includes('hello') || text.includes('hi')) {
      return `Hello! Ready to help. I am on my way to your location.`;
    }
    return `Alright, received! See you in a few minutes.`;
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    // Scroll to end
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simulate partner typing
    setIsPartnerTyping(true);

    setTimeout(() => {
      setIsPartnerTyping(false);
      const partnerReply = {
        id: (Date.now() + 1).toString(),
        text: getMockReply(userMessage.text),
        sender: 'partner',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, partnerReply]);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 2000);
  };

  const handleQuickReply = (text) => {
    const userMessage = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Scroll to end
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simulate partner typing
    setIsPartnerTyping(true);

    setTimeout(() => {
      setIsPartnerTyping(false);
      const partnerReply = {
        id: (Date.now() + 1).toString(),
        text: getMockReply(text),
        sender: 'partner',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, partnerReply]);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 2000);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('warning', 'Permission Denied', 'We need camera roll permissions to share images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedImage = result.assets[0].uri;
      
      const userMessage = {
        id: Date.now().toString(),
        image: selectedImage,
        sender: 'user',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMessage]);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Simulate typing/replying
      setIsPartnerTyping(true);
      setTimeout(() => {
        setIsPartnerTyping(false);
        const partnerReply = {
          id: (Date.now() + 1).toString(),
          text: 'Got the photo! Heading up with the right tools now.',
          sender: 'partner',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, partnerReply]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }, 2500);
    }
  };

  const renderMessageItem = ({ item }) => {
    const isUser = item.sender === 'user';

    if (item.isTyping) {
      return (
        <View style={[styles.messageRow, styles.messageRowPartner]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{activePartnerName[0]?.toUpperCase()}</Text>
          </View>
          <View style={[styles.bubble, styles.bubblePartner, styles.typingBubble]}>
            <TypingIndicator colors={colors} />
          </View>
        </View>
      );
    }

    if (item.image) {
      return (
        <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowPartner]}>
          {!isUser && (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{activePartnerName[0]?.toUpperCase()}</Text>
            </View>
          )}
          <View style={[styles.bubble, isUser ? styles.bubbleUserImage : styles.bubblePartnerImage]}>
            <Image source={{ uri: item.image }} style={styles.messageImage} />
            <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampPartner, { marginTop: 6 }]}>
              {item.time}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowPartner]}>
        {!isUser && (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{activePartnerName[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubblePartner]}>
          <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextPartner]}>
            {item.text}
          </Text>
          <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampPartner]}>
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  const renderHeaderInfoCard = () => (
    <View style={styles.securityBanner}>
      <MaterialCommunityIcons name="lock-outline" size={14} color={colors.textMuted} />
      <Text style={styles.securityText}>
        Messages are secured. Contact details are kept private to protect your privacy.
      </Text>
    </View>
  );

  const displayMessages = isPartnerTyping 
    ? [...messages, { id: 'typing', sender: 'partner', isTyping: true }]
    : messages;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{activePartnerName}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.activeDot, isPartnerTyping && { backgroundColor: colors.success }]} />
            <Text style={[styles.statusText, isPartnerTyping && { color: colors.success }]}>
              {isPartnerTyping ? 'Typing...' : 'Online'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => showToast('info', 'Calling Partner', `Calling ${activePartnerName}...`)}
        >
          <MaterialCommunityIcons name="phone-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Messages list */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeaderInfoCard}
          contentContainerStyle={[styles.listContent, { paddingBottom: 16 }]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Quick reply templates */}
        <View style={styles.quickRepliesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRepliesScroll}
          >
            {QUICK_REPLIES.map((reply, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickReplyChip}
                onPress={() => handleQuickReply(reply)}
              >
                <Text style={styles.quickReplyText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input box bottom tray */}
        <View style={[styles.inputTray, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage}>
            <MaterialCommunityIcons name="plus" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <MaterialCommunityIcons
              name="send"
              size={20}
              color={inputText.trim() ? colors.accentDark : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: -6,
    },
    headerInfo: {
      flex: 1,
      marginLeft: 8,
    },
    headerName: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.success,
    },
    statusText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    callBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chatArea: {
      flex: 1,
    },
    listContent: {
      padding: 16,
      gap: 16,
    },
    securityBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 0,
      marginBottom: 16,
      gap: 8,
    },
    securityText: {
      fontSize: 11,
      color: colors.textMuted,
      flex: 1,
      lineHeight: 14,
      fontWeight: '500',
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      maxWidth: '85%',
    },
    messageRowPartner: {
      alignSelf: 'flex-start',
      gap: 8,
    },
    messageRowUser: {
      alignSelf: 'flex-end',
    },
    avatarCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: colors.accentDark,
      fontWeight: '800',
      fontSize: 12,
    },
    bubble: {
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    bubblePartner: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    bubbleUser: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    typingBubble: {
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    bubbleUserImage: {
      backgroundColor: colors.primary,
      padding: 4,
      borderRadius: 12,
      borderBottomRightRadius: 4,
    },
    bubblePartnerImage: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
      borderRadius: 12,
      borderBottomLeftRadius: 4,
    },
    messageImage: {
      width: 200,
      height: 150,
      borderRadius: 8,
    },
    messageText: {
      fontSize: 14,
      lineHeight: 19,
    },
    messageTextPartner: {
      color: colors.textPrimary,
    },
    messageTextUser: {
      color: colors.accentDark,
      fontWeight: '600',
    },
    timestamp: {
      fontSize: 9,
      marginTop: 4,
      alignSelf: 'flex-end',
    },
    timestampPartner: {
      color: colors.textSecondary,
    },
    timestampUser: {
      color: colors.accentDark,
      opacity: 0.6,
    },
    quickRepliesContainer: {
      paddingVertical: 8,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    quickRepliesScroll: {
      paddingHorizontal: 16,
      gap: 8,
    },
    quickReplyChip: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    quickReplyText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    inputTray: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 10,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
    },
    attachBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textInput: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      maxHeight: 100,
      color: colors.textPrimary,
      fontSize: 14,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendBtnDisabled: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
